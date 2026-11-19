-- HEP-002: make rate-limit policy server-controlled without exposing the
-- backing store to authenticated users or breaking currently deployed routes.
--
-- The public RPCs are SECURITY INVOKER wrappers. The legacy three-argument
-- signature is retained for compatibility with the currently deployed API
-- routes, but its caller-supplied limit/window values are deliberately ignored.
-- Both signatures delegate to one private helper that derives auth.uid(),
-- fixes endpoint limits and the 60-second window, and performs an atomic upsert.

ALTER TABLE private.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- API roles must not be able to inspect or alter counters directly.
REVOKE ALL ON TABLE private.api_rate_limits FROM PUBLIC, anon, authenticated, service_role;

-- The invoker wrappers need permission to resolve and execute the private helper.
-- This does not expose the schema through PostgREST; that is controlled by the
-- project's separate Exposed schemas setting.
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.consume_api_rate_limit(p_endpoint text)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer := 60;
  v_started timestamptz;
  v_count integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  v_limit := CASE p_endpoint
    WHEN 'kitchen' THEN 12
    WHEN 'narrator' THEN 10
    WHEN 'journal' THEN 8
    WHEN 'meds-followup' THEN 6
    WHEN 'report' THEN 3
    ELSE NULL
  END;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'invalid rate limit endpoint' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.api_rate_limits(user_id, endpoint, window_started_at, request_count)
  VALUES (v_user_id, p_endpoint, v_now, 1)
  ON CONFLICT (user_id, endpoint) DO UPDATE
    SET window_started_at = CASE
          WHEN private.api_rate_limits.window_started_at + pg_catalog.make_interval(secs => v_window_seconds) <= v_now
          THEN v_now ELSE private.api_rate_limits.window_started_at END,
        request_count = CASE
          WHEN private.api_rate_limits.window_started_at + pg_catalog.make_interval(secs => v_window_seconds) <= v_now
          THEN 1 ELSE private.api_rate_limits.request_count + 1 END
  RETURNING private.api_rate_limits.window_started_at, private.api_rate_limits.request_count
  INTO v_started, v_count;

  RETURN QUERY
    SELECT v_count <= v_limit,
      CASE WHEN v_count <= v_limit THEN 0
        ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
          v_started + pg_catalog.make_interval(secs => v_window_seconds) - v_now
        )))::integer)
      END;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_api_rate_limit(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.consume_api_rate_limit(text) TO authenticated;

-- Compatibility wrapper: old production API code supplies three arguments.
-- Keep the signature, but ignore p_limit and p_window_seconds so callers cannot
-- weaken policy while the application deployment is being rolled forward.
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_endpoint text,
  p_limit integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT result.allowed, result.retry_after_seconds
  FROM private.consume_api_rate_limit(p_endpoint) AS result;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text, integer, integer) TO authenticated;

-- New wrapper used by the updated API code.
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(p_endpoint text)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT result.allowed, result.retry_after_seconds
  FROM private.consume_api_rate_limit(p_endpoint) AS result;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text) TO authenticated;
