-- HEP-002 production remediation — APPLIED AND VERIFIED
-- Project: hvraudfhafyjuhuvyasq (sanctoss)
-- Applied migrations:
--   hep_002_table_privileges_and_medication_ownership
--   hep_002_postgres_default_privilege_hardening
-- The Supabase-managed supabase_admin default ACL could not be altered by the
-- available database role; see HEP-002 final report for this residual control.
-- Existing RLS policies and patient rows were preserved.

BEGIN;

DO $$
DECLARE
  required_tables text[] := ARRAY['profiles','bp_readings','meal_logs','medications','medication_logs','weight_logs','workout_logs','sanctuary_logs'];
  missing_tables text[];
  rls_disabled text[];
  cross_owner_rows bigint;
BEGIN
  SELECT array_agg(t) INTO missing_tables FROM unnest(required_tables) AS t
  WHERE to_regclass(format('public.%I', t)) IS NULL;
  IF missing_tables IS NOT NULL THEN RAISE EXCEPTION 'HEP-002 aborted; missing tables: %', missing_tables; END IF;
  SELECT array_agg(c.relname) INTO rls_disabled
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname=ANY(required_tables)
    AND c.relkind IN ('r','p') AND c.relrowsecurity=false;
  IF rls_disabled IS NOT NULL THEN RAISE EXCEPTION 'HEP-002 aborted; RLS disabled: %', rls_disabled; END IF;
  SELECT count(*) INTO cross_owner_rows
  FROM public.medication_logs ml JOIN public.medications m ON m.id=ml.medication_id
  WHERE ml.user_id IS DISTINCT FROM m.user_id;
  IF cross_owner_rows>0 THEN RAISE EXCEPTION 'HEP-002 aborted; % cross-owner rows require manual review',cross_owner_rows; END IF;
END $$;

ALTER TABLE public.medications ADD CONSTRAINT medications_id_user_id_key UNIQUE (id,user_id);
ALTER TABLE public.medication_logs DROP CONSTRAINT medication_logs_medication_id_fkey;
ALTER TABLE public.medication_logs ADD CONSTRAINT medication_logs_medication_owner_fkey
  FOREIGN KEY (medication_id,user_id) REFERENCES public.medications(id,user_id) ON DELETE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE public.profiles,public.bp_readings,public.meal_logs,public.medications,
  public.medication_logs,public.weight_logs,public.workout_logs,public.sanctuary_logs FROM anon;
REVOKE MAINTAIN,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.profiles,public.bp_readings,public.meal_logs,
  public.medications,public.medication_logs,public.weight_logs,public.workout_logs,public.sanctuary_logs
  FROM authenticated,service_role;

GRANT SELECT,INSERT,UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.bp_readings,public.medications,public.medication_logs TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.meal_logs,public.weight_logs,public.workout_logs,public.sanctuary_logs TO authenticated;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE UPDATE ON ALL SEQUENCES IN SCHEMA public FROM authenticated,service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated,service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN,REFERENCES,TRIGGER,TRUNCATE ON TABLES FROM service_role;

COMMIT;

-- Verified on production after application:
-- medication_logs_medication_owner_fkey is VALIDATED and binds
-- (medication_id,user_id) to medications(id,user_id).
-- anon has no direct privileges on the eight application tables.
-- authenticated retains ordinary DML only; structural privilege count is zero.
-- RLS remains enabled on all eight application tables.
-- Supabase-managed supabase_admin default ACL still needs owner-level adjustment.
