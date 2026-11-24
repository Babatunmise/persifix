-- HEP-002 isolated PostgreSQL integration test.
-- Runs only in the disposable GitHub Actions PostgreSQL service.
\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE SCHEMA private;

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TABLE private.api_rate_limits (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL,
  PRIMARY KEY (user_id, endpoint)
);

-- Apply the exact migration under test.
\i supabase/migrations/20261119174222_hep_002_server_controlled_rate_limits.sql

-- Verify function security modes, search_path, RLS and effective grants.
DO $$
DECLARE
  v_definer boolean;
  v_config text[];
  v_rls boolean;
BEGIN
  SELECT prosecdef, proconfig INTO v_definer, v_config
  FROM pg_proc
  WHERE oid = 'public.consume_api_rate_limit(text)'::regprocedure;
  IF v_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'one-argument public wrapper must be SECURITY INVOKER';
  END IF;

  SELECT prosecdef INTO v_definer
  FROM pg_proc
  WHERE oid = 'public.consume_api_rate_limit(text,integer,integer)'::regprocedure;
  IF v_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'legacy public wrapper must be SECURITY INVOKER';
  END IF;

  SELECT prosecdef, proconfig INTO v_definer, v_config
  FROM pg_proc
  WHERE oid = 'private.consume_api_rate_limit(text)'::regprocedure;
  IF v_definer IS DISTINCT FROM true OR NOT (v_config @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'private helper must be SECURITY DEFINER with empty search_path';
  END IF;

  SELECT relrowsecurity INTO v_rls
  FROM pg_class
  WHERE oid = 'private.api_rate_limits'::regclass;
  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RLS must be enabled on private rate-limit table';
  END IF;

  IF has_table_privilege('anon', 'private.api_rate_limits', 'SELECT')
     OR has_table_privilege('authenticated', 'private.api_rate_limits', 'SELECT')
     OR has_table_privilege('service_role', 'private.api_rate_limits', 'SELECT') THEN
    RAISE EXCEPTION 'API roles must not have direct table SELECT';
  END IF;

  IF has_table_privilege('authenticated', 'private.api_rate_limits', 'INSERT')
     OR has_table_privilege('authenticated', 'private.api_rate_limits', 'UPDATE')
     OR has_table_privilege('authenticated', 'private.api_rate_limits', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated must not have direct table write privileges';
  END IF;

  IF has_function_privilege('anon', 'public.consume_api_rate_limit(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.consume_api_rate_limit(text,integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute either public RPC signature';
  END IF;
END;
$$;

-- Anonymous execution of both public RPC signatures must be denied.
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.consume_api_rate_limit('journal');
    RAISE EXCEPTION 'anon unexpectedly executed one-argument RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    PERFORM * FROM public.consume_api_rate_limit('journal', 999999, 999999);
    RAISE EXCEPTION 'anon unexpectedly executed legacy RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- User A: verify every fixed endpoint limit using the new one-argument RPC.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
DO $$
DECLARE
  v_endpoint text;
  v_limit integer;
  v_result record;
  i integer;
BEGIN
  FOR v_endpoint, v_limit IN
    SELECT * FROM (VALUES
      ('kitchen', 12),
      ('narrator', 10),
      ('journal', 8),
      ('meds-followup', 6),
      ('report', 3)
    ) AS limits(endpoint, request_limit)
  LOOP
    FOR i IN 1..v_limit LOOP
      SELECT * INTO v_result FROM public.consume_api_rate_limit(v_endpoint);
      IF NOT v_result.allowed THEN
        RAISE EXCEPTION '% blocked before fixed limit %', v_endpoint, v_limit;
      END IF;
    END LOOP;

    SELECT * INTO v_result FROM public.consume_api_rate_limit(v_endpoint);
    IF v_result.allowed OR v_result.retry_after_seconds < 1 THEN
      RAISE EXCEPTION '% did not enforce limit % with positive retry', v_endpoint, v_limit;
    END IF;
  END LOOP;

  BEGIN
    PERFORM * FROM public.consume_api_rate_limit('unknown-endpoint');
    RAISE EXCEPTION 'invalid endpoint unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$$;

-- Direct reads and all direct write operations must fail for authenticated users.
DO $$
BEGIN
  BEGIN
    PERFORM * FROM private.api_rate_limits;
    RAISE EXCEPTION 'authenticated unexpectedly read private counters';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO private.api_rate_limits(user_id, endpoint, window_started_at, request_count)
    VALUES ('10000000-0000-4000-8000-000000000001', 'direct-write', now(), 1);
    RAISE EXCEPTION 'authenticated unexpectedly inserted private counters';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE private.api_rate_limits SET request_count = 0 WHERE endpoint = 'kitchen';
    RAISE EXCEPTION 'authenticated unexpectedly updated private counters';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    DELETE FROM private.api_rate_limits WHERE endpoint = 'kitchen';
    RAISE EXCEPTION 'authenticated unexpectedly deleted private counters';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- User B has an independent counter and cannot weaken the legacy signature.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
DO $$
DECLARE
  v_result record;
  i integer;
BEGIN
  SELECT * INTO v_result FROM public.consume_api_rate_limit('kitchen');
  IF NOT v_result.allowed THEN
    RAISE EXCEPTION 'User B inherited User A rate-limit counter';
  END IF;

  -- Caller-supplied low limit/window cannot weaken the fixed journal policy.
  FOR i IN 1..8 LOOP
    SELECT * INTO v_result FROM public.consume_api_rate_limit('journal', 1, 1);
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'legacy RPC honoured caller-supplied low journal limit';
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.consume_api_rate_limit('journal', 999999, 999999);
  IF v_result.allowed OR v_result.retry_after_seconds < 1 THEN
    RAISE EXCEPTION 'legacy RPC allowed caller to weaken journal limit';
  END IF;

  -- Caller-supplied enormous limit/window cannot weaken the fixed report policy.
  FOR i IN 1..3 LOOP
    SELECT * INTO v_result FROM public.consume_api_rate_limit('report', 999999, 999999);
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'report blocked before fixed limit 3';
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.consume_api_rate_limit('report', 999999, 999999);
  IF v_result.allowed OR v_result.retry_after_seconds < 1 THEN
    RAISE EXCEPTION 'legacy RPC allowed caller to weaken report limit';
  END IF;
END;
$$;
RESET ROLE;

-- Confirm a stale window resets instead of carrying an exhausted counter forward.
UPDATE private.api_rate_limits
SET window_started_at = now() - interval '61 seconds'
WHERE user_id = '10000000-0000-4000-8000-000000000001'
  AND endpoint = 'kitchen';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM public.consume_api_rate_limit('kitchen');
  IF NOT v_result.allowed THEN
    RAISE EXCEPTION 'expired rate-limit window did not reset';
  END IF;
END;
$$;
RESET ROLE;

-- Privileged fixture inspection proves separate counters exist for both users.
DO $$
DECLARE
  v_rows integer;
BEGIN
  SELECT count(*) INTO v_rows
  FROM private.api_rate_limits
  WHERE endpoint = 'kitchen'
    AND user_id IN (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002'
    );
  IF v_rows <> 2 THEN
    RAISE EXCEPTION 'expected isolated counters for two users; found %', v_rows;
  END IF;
END;
$$;

\echo 'HEP-002 rate-limit migration integration tests passed.'
