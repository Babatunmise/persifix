-- HEP-002: keep rate-limit policy server-controlled without exposing the
-- backing store to authenticated users.
--
-- The public RPC is SECURITY INVOKER and accepts only an endpoint name.
-- It delegates to a narrowly scoped SECURITY DEFINER helper in the private
-- schema. That helper derives the caller from auth.uid(), fixes every limit
-- and the window internally, and performs one atomic upsert. Authenticated
-- users receive no direct privileges on the backing table.

DROP FUNCTION IF EXISTS public.consume_api_rate_limit(text, integer, integer);
DROP FUNCTION IF EXISTS public.consume_api_rate_limit(text);
DROP FUNCTION IF EXISTS private.consume_api_rate_limit(text);

ALTER TABLE private.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- The table remains inaccessible to API roles. Only the private helper's
-- owner can read or mutate the counters.
REVOKE ALL ON TABLE private.api_rate_limits FROM PUBLIC, anon, authenticated;

-- The invoker wrapper must be able to resolve and execute the private helper.
-- This does not expose the schema through PostgREST; that is controlled by the
-- project's separate Exposed schemas setting.
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE FUNCTION private.consume_api_rate_limit(p_endpoint text)
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

REVOKE ALL ON FUNCTION private.consume_api_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.consume_api_rate_limit(text) TO authenticated;

-- PostgREST exposes this public, invoker-rights wrapper to the app. The
-- wrapper has no access to the counter table and cannot choose limits.
CREATE FUNCTION public.consume_api_rate_limit(p_endpoint text)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT result.allowed, result.retry_after_seconds
  FROM private.consume_api_rate_limit(p_endpoint) AS result;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text) TO authenticated;
