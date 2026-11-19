# HEP-002 — Read-only database baseline

Project: sanctoss  
Database: PostgreSQL 17.11  
Environment: production, inspected using SELECT-only catalog queries; no production data or schema was changed.

## Ownership policies observed

All eight public application tables have RLS enabled and policies tied to auth.uid():

- profiles: SELECT, INSERT, UPDATE restricted by id = auth.uid().
- bp_readings: SELECT, INSERT, UPDATE, DELETE restricted by user_id = auth.uid(); UPDATE includes WITH CHECK.
- meal_logs: SELECT, INSERT, DELETE restricted by user_id = auth.uid().
- medications: ALL restricted by user_id = auth.uid() in both USING and WITH CHECK.
- medication_logs: ALL restricted by user_id = auth.uid() in both USING and WITH CHECK.
- weight_logs: SELECT, INSERT, DELETE restricted by user_id = auth.uid().
- workout_logs: SELECT, INSERT, DELETE restricted by user_id = auth.uid().
- sanctuary_logs: SELECT, INSERT restricted by user_id = auth.uid().

These are policy-definition observations, not synthetic cross-account runtime proof. Runtime A/B tests remain outstanding.

## Privilege baseline

Catalog ACL inspection identified the following excess table privileges on the eight application tables:

- anon: MAINTAIN, REFERENCES, TRIGGER, TRUNCATE.
- authenticated: MAINTAIN, REFERENCES, TRIGGER, TRUNCATE in addition to ordinary row privileges.
- service_role: MAINTAIN, REFERENCES, TRIGGER, TRUNCATE.

Default table ACLs were present under both object owners:

- postgres: MAINTAIN, REFERENCES, TRIGGER, TRUNCATE defaults for anon, authenticated, and service_role.
- supabase_admin: broad table defaults for anon/authenticated/service_role, including ordinary DML plus MAINTAIN, REFERENCES, TRIGGER, TRUNCATE.

Default sequence ACLs under supabase_admin included SELECT, UPDATE, USAGE for anon, authenticated, and service_role.

## Migration decisions

The draft remediation revokes all table privileges from anon; preserves SELECT/INSERT/UPDATE/DELETE for authenticated subject to existing RLS; removes MAINTAIN/REFERENCES/TRIGGER/TRUNCATE from authenticated and service_role; removes unsafe default table grants for anon/authenticated under both owners; and tightens future sequence defaults.

The rollback script restores the catalog privileges observed in this baseline. Both scripts are drafts and have not been applied.
