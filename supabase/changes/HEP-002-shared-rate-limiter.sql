-- HEP-002 shared API rate limiter (applied to sanctoss production)
-- Backing storage is deliberately outside the exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.api_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL CHECK (length(endpoint) BETWEEN 1 AND 64),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, endpoint)
);
ALTER TABLE private.api_rate_limits DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.api_rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_endpoint text, p_limit integer, p_window_seconds integer DEFAULT 60
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_started timestamptz;
  v_count integer;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF p_endpoint NOT IN ('kitchen','narrator','journal','meds-followup','report')
     OR p_limit NOT BETWEEN 1 AND 1000 OR p_window_seconds NOT BETWEEN 1 AND 3600 THEN
    RAISE EXCEPTION 'invalid rate limit parameters' USING ERRCODE='22023';
  END IF;
  INSERT INTO private.api_rate_limits(user_id,endpoint,window_started_at,request_count)
  VALUES (v_user_id,p_endpoint,v_now,1)
  ON CONFLICT (user_id,endpoint) DO UPDATE
    SET window_started_at = CASE
          WHEN private.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          THEN v_now ELSE private.api_rate_limits.window_started_at END,
        request_count = CASE
          WHEN private.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          THEN 1 ELSE private.api_rate_limits.request_count + 1 END
  RETURNING private.api_rate_limits.window_started_at, private.api_rate_limits.request_count
  INTO v_started,v_count;
  RETURN QUERY SELECT v_count <= p_limit,
    CASE WHEN v_count <= p_limit THEN 0
      ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_started + make_interval(secs => p_window_seconds) - v_now)))::integer)
    END;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text,integer,integer) TO authenticated;

-- SECURITY DEFINER is intentional: authenticated callers invoke this narrow
-- RPC while direct access to the private backing table remains revoked.
-- The function derives user_id from auth.uid(), fixes the endpoint allowlist,
-- validates limits, and uses an empty search_path.
