-- HEP-002 controlled remediation — EMERGENCY ROLLBACK DRAFT
-- Apply ONLY to the isolated development branch with Executive approval.
-- This restores the excessive grants observed during HEP-002. It intentionally
-- reintroduces risk and must never be used on production.

BEGIN;

GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE
  public.profiles,
  public.bp_readings,
  public.meal_logs,
  public.medications,
  public.medication_logs,
  public.weight_logs,
  public.workout_logs,
  public.sanctuary_logs
TO anon;

GRANT TRUNCATE ON TABLE
  public.profiles,
  public.bp_readings,
  public.meal_logs,
  public.medications,
  public.medication_logs,
  public.weight_logs,
  public.workout_logs,
  public.sanctuary_logs
TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated;

COMMIT;

-- This restores the excessive grants recorded in the HEP-002 baseline.
-- Reconcile any additional grants from a pre-apply ACL snapshot before rollback.
