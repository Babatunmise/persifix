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
\i supabase/migrations/20261119140000_hep_002_server_controlled_rate_limits.sql

-- Verify function security modes and grants before exercising the RPCs.
DO $$
DECLARE
  v_definer boolean;
BEGIN
  SELECT prosecdef INTO v_definer
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

  SELECT prosecdef INTO v_definer
  FROM pg_proc
  WHERE oid = 'private.consume_api_rate_limit(text)'::regprocedure;
  IF v_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'private helper must be SECURITY DEFINER';
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
END;
$$;

-- Anonymous callers must not be able to execute either public RPC.
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.consume_api_rate_limit('journal');
    RAISE EXCEPTION 'anon unexpectedly executed one-argument RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- User A: prove limits are server-controlled through both signatures.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);

DO $$
DECLARE
  v_result record;
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    SELECT * INTO v_result FROM public.consume_api_rate_limit('kitchen');
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'kitchen was blocked before fixed limit 12';
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.consume_api_rate_limit('kitchen');
  IF v_result.allowed OR v_result.retry_after_seconds < 1 THEN
    RAISE EXCEPTION 'kitchen did not enforce limit 12 with positive retry';
  END IF;

  -- Caller requests limit=1/window=1; both calls must still pass fixed journal limit=8.
  FOR i IN 1..2 LOOP
    SELECT * INTO v_result
    FROM public.consume_api_rate_limit('journal', 1, 1);
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'legacy RPC honoured caller-supplied weak limit';
    END IF;
  END LOOP;

  -- Caller requests an enormous limit; fixed report limit=3 must still apply.
  FOR i IN 1..3 LOOP
    SELECT * INTO v_result
    FROM public.consume_api_rate_limit('report', 999999, 999999);
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'report blocked before fixed limit 3';
    END IF;
  END LOOP;
  SELECT * INTO v_result
  FROM public.consume_api_rate_limit('report', 999999, 999999);
  IF v_result.allowed OR v_result.retry_after_seconds < 1 THEN
    RAISE EXCEPTION 'legacy RPC allowed caller to weaken report limit';
  END IF;

  BEGIN
    PERFORM * FROM public.consume_api_rate_limit('unknown-endpoint');
    RAISE EXCEPTION 'invalid endpoint unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$$;

-- Direct reads and writes must fail even for authenticated users.
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
    RAISE EXCEPTION 'authenticated unexpectedly wrote private counters';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- User B receives an independent counter, not User A's accumulated count.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM public.consume_api_rate_limit('kitchen');
  IF NOT v_result.allowed THEN
    RAISE EXCEPTION 'User B inherited User A rate-limit counter';
  END IF;
END;
$$;
RESET ROLE;

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
