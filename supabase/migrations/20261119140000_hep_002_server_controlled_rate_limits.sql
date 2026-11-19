-- HEP-002: make rate-limit policy server-controlled.
-- Authenticated clients may call this RPC only for their own auth.uid() bucket.
-- They cannot supply limits or window lengths and therefore cannot reset or
-- weaken the API route's configured throttling policy.

DROP FUNCTION IF EXISTS public.consume_api_rate_limit(text, integer, integer);

CREATE FUNCTION public.consume_api_rate_limit(p_endpoint text)
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
  v_now timestamptz := clock_timestamp();
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
          WHEN private.api_rate_limits.window_started_at + make_interval(secs => v_window_seconds) <= v_now
          THEN v_now ELSE private.api_rate_limits.window_started_at END,
        request_count = CASE
          WHEN private.api_rate_limits.window_started_at + make_interval(secs => v_window_seconds) <= v_now
          THEN 1 ELSE private.api_rate_limits.request_count + 1 END
  RETURNING private.api_rate_limits.window_started_at, private.api_rate_limits.request_count
  INTO v_started, v_count;

  RETURN QUERY
    SELECT v_count <= v_limit,
      CASE WHEN v_count <= v_limit THEN 0
        ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
          v_started + make_interval(secs => v_window_seconds) - v_now
        )))::integer)
      END;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text) TO authenticated;
