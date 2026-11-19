-- HEP-002 controlled remediation — REVIEWED DRAFT
-- Apply ONLY to the isolated Supabase development branch after Executive approval.
-- Existing RLS policies are intentionally preserved. This script does not alter data.

BEGIN;

DO $$
DECLARE
  required_tables text[] := ARRAY[
    'profiles','bp_readings','meal_logs','medications',
    'medication_logs','weight_logs','workout_logs','sanctuary_logs'
  ];
  missing_tables text[];
  rls_disabled text[];
BEGIN
  SELECT array_agg(t)
    INTO missing_tables
    FROM unnest(required_tables) AS t
   WHERE to_regclass(format('public.%I', t)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'HEP-002 aborted; expected tables missing: %', missing_tables;
  END IF;

  SELECT array_agg(c.relname)
    INTO rls_disabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = ANY(required_tables)
     AND c.relkind = 'r'
     AND c.relrowsecurity = false;

  IF rls_disabled IS NOT NULL THEN
    RAISE EXCEPTION 'HEP-002 aborted; RLS is disabled on: %', rls_disabled;
  END IF;
END $$;

REVOKE ALL PRIVILEGES ON TABLE
  public.profiles,
  public.bp_readings,
  public.meal_logs,
  public.medications,
  public.medication_logs,
  public.weight_logs,
  public.workout_logs,
  public.sanctuary_logs
FROM anon;

REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE
  public.profiles,
  public.bp_readings,
  public.meal_logs,
  public.medications,
  public.medication_logs,
  public.weight_logs,
  public.workout_logs,
  public.sanctuary_logs
FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.bp_readings,
  public.meal_logs,
  public.medications,
  public.medication_logs,
  public.weight_logs,
  public.workout_logs,
  public.sanctuary_logs
TO authenticated;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

COMMIT;

-- Post-apply verification (run separately):
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND grantee IN ('anon','authenticated')
-- ORDER BY table_name, grantee, privilege_type;
-- SELECT relname, relrowsecurity FROM pg_class
-- JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace
-- WHERE nspname='public' AND relkind='r';
