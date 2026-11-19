-- HEP-002 controlled remediation — REVIEWED DRAFT
-- Apply ONLY to the isolated Supabase development branch after Executive approval.
-- Production has not been modified. Existing RLS policies and patient data are preserved.

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
  SELECT array_agg(t) INTO missing_tables
  FROM unnest(required_tables) AS t
  WHERE to_regclass(format('public.%I', t)) IS NULL;
  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'HEP-002 aborted; expected tables missing: %', missing_tables;
  END IF;

  SELECT array_agg(c.relname) INTO rls_disabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(required_tables)
    AND c.relkind IN ('r','p')
    AND c.relrowsecurity = false;
  IF rls_disabled IS NOT NULL THEN
    RAISE EXCEPTION 'HEP-002 aborted; RLS is disabled on: %', rls_disabled;
  END IF;
END $;

-- Enforce that a medication log can reference only a medication owned by
-- the same user. The baseline contains zero cross-owner rows. The original
-- single-column FK is replaced while preserving ON DELETE CASCADE.
ALTER TABLE public.medications
  ADD CONSTRAINT medications_id_user_id_key UNIQUE (id, user_id);
ALTER TABLE public.medication_logs
  DROP CONSTRAINT medication_logs_medication_id_fkey;
ALTER TABLE public.medication_logs
  ADD CONSTRAINT medication_logs_medication_owner_fkey
  FOREIGN KEY (medication_id, user_id)
  REFERENCES public.medications (id, user_id)
  ON DELETE CASCADE;

-- No direct table privileges for unauthenticated clients.
REVOKE ALL PRIVILEGES ON TABLE
  public.profiles, public.bp_readings, public.meal_logs, public.medications,
  public.medication_logs, public.weight_logs, public.workout_logs, public.sanctuary_logs
FROM anon;

-- Authenticated clients retain ordinary row operations, subject to existing RLS.
REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE
  public.profiles, public.bp_readings, public.meal_logs, public.medications,
  public.medication_logs, public.weight_logs, public.workout_logs, public.sanctuary_logs
FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.bp_readings, public.medications, public.medication_logs
TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE
  public.meal_logs, public.weight_logs, public.workout_logs
TO authenticated;
GRANT SELECT, INSERT ON TABLE public.sanctuary_logs TO authenticated;

-- Remove non-row-operation privileges from the application service role while
-- preserving any existing ordinary DML permissions it may require.
REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE
  public.profiles, public.bp_readings, public.meal_logs, public.medications,
  public.medication_logs, public.weight_logs, public.workout_logs, public.sanctuary_logs
FROM service_role;

-- Sequence access: no anon access; authenticated may use generated IDs but
-- cannot reset sequences with setval().
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE UPDATE ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Supabase has schema defaults owned by both postgres and supabase_admin.
-- Remove all future table privileges for anon/authenticated so each new table
-- must explicitly receive grants and RLS policies in its own reviewed migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- Remove structural/maintenance privileges from future service_role table grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES FROM service_role;

-- Tighten future sequence defaults from supabase_admin.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE UPDATE ON SEQUENCES FROM authenticated, service_role;

COMMIT;

-- Post-apply verification (run separately on the development branch):
-- SELECT has_table_privilege('anon','public.bp_readings','SELECT') AS anon_select,
--        has_table_privilege('anon','public.bp_readings','TRUNCATE') AS anon_truncate,
--        has_table_privilege('authenticated','public.bp_readings','TRUNCATE') AS auth_truncate,
--        has_table_privilege('authenticated','public.bp_readings','MAINTAIN') AS auth_maintain;
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role')
-- ORDER BY table_name, grantee, privilege_type;
