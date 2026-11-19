-- HEP-002 controlled remediation — EMERGENCY ROLLBACK DRAFT
-- Apply ONLY to the isolated development branch with Executive approval.
-- This restores the excessive grants observed in the read-only baseline.
-- It intentionally reintroduces risk and must never be used on production.

BEGIN;

-- Restore the original medication foreign-key shape.
ALTER TABLE public.medication_logs
  DROP CONSTRAINT IF EXISTS medication_logs_medication_owner_fkey;
ALTER TABLE public.medications
  DROP CONSTRAINT IF EXISTS medications_id_user_id_key;
ALTER TABLE public.medication_logs
  ADD CONSTRAINT medication_logs_medication_id_fkey
  FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE
  public.profiles, public.bp_readings, public.meal_logs, public.medications,
  public.medication_logs, public.weight_logs, public.workout_logs, public.sanctuary_logs
TO anon, authenticated, service_role;

-- Baseline authenticated grants also included ordinary row operations.
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.bp_readings, public.meal_logs, public.medications,
  public.medication_logs, public.weight_logs, public.workout_logs, public.sanctuary_logs
TO authenticated;

-- Restore the exact broad default table grants observed for both object owners.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLES TO anon, authenticated, service_role;

-- Restore sequence defaults observed under supabase_admin.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO anon, authenticated, service_role;

COMMIT;

-- This restores the observed baseline defaults. Reconcile any additional ACL
-- differences from a fresh pre-apply ACL snapshot before using rollback.
