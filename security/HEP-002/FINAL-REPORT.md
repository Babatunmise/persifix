# HEP-002 — Security Remediation Execution Report

**Date:** 2026-11-19  
**Repository:** `Babatunmise/persifix`  
**Working branch:** `hep-002/controlled-remediation`  
**Supabase project:** `sanctoss` (`hvraudfhafyjuhuvyasq`)  
**Disposition:** PARTIALLY REMEDIATED — NOT CLEARED

## Completed

### Application source (development branch)
- API routes require a verified Supabase user via the request Bearer token.
- Request bodies are bounded and JSON/content-type checked.
- Endpoint-specific best-effort throttles and safe error responses are implemented.
- Journal text is not sent to the external AI provider.
- Medication missed-dose AI advice was removed pending clinical review.
- Narrator retrieves the reading under the verified user's JWT and explicit owner predicate; client-supplied BP values are not trusted.
- Report data is fetched server-side under the verified user's JWT and is not accepted from the browser.
- Kitchen input is bounded and applies pattern-based redaction before external AI transmission. This is not a guarantee that all personal or health information is removed.
- The branch's lint and production build passed on commit `250e2b063987617cb7f496f1ca58a10b60603f78`; Vercel reported its preview deployment READY.
- The SQL remediation source was updated in commit `9dd7aa18105b714abd873dfa411d837eaf377ebd` to reflect the changes actually applied.

### Production database changes — applied
Migrations recorded:
- `hep_002_table_privileges_and_medication_ownership`
- `hep_002_postgres_default_privilege_hardening`

Verified after application:
- RLS remains enabled on all eight application tables.
- `anon` has no direct privileges on the eight application tables.
- `authenticated` retains ordinary row-level DML grants only; verified structural privilege count (TRUNCATE, TRIGGER, REFERENCES, MAINTAIN) is zero.
- The medication-log foreign key now binds `(medication_id, user_id)` to `medications(id, user_id)`, is validated, and preserves `ON DELETE CASCADE`.
- Pre-migration check found zero cross-owner medication-log rows.
- The changes preserved existing patient rows and RLS policies.

## Remaining blockers — HEP-002 is not cleared

1. **Supabase-managed default ACL:** Default privileges owned by `postgres` were hardened. The database rejected attempts to change defaults owned by `supabase_admin` (`permission denied to change default privileges`), and the role cannot be assumed by the connected database session. The existing broad `supabase_admin` default table and sequence ACLs remain. New objects created under that owner therefore need explicit grant/RLS review until an owner-level change is made.
2. **Leaked-password protection:** Supabase Security Advisor still reports `auth_leaked_password_protection`. This is an Auth project setting, not SQL. It requires the Supabase Auth configuration surface / eligible plan and could not be changed through the connected project tools. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
3. **Distributed rate limiting:** The current limiter is in-memory per serverless instance. It is best-effort and is not a global abuse-control boundary. A shared rate-limit store would be required; no new paid infrastructure was introduced.
4. **External AI vendor safeguards:** The repository's DeepSeek integration sends bounded Kitchen conversation text (after pattern-based redaction) and the two BP values needed by Narrator. Contractual retention, training-use, regional processing, and healthcare-data safeguards have not been independently verified. Do not treat pattern redaction as de-identification.
5. **Production application rollout:** Application changes remain on the isolated development branch. The original execution boundary for production source was not overridden; no production source deployment was made.

## Final disposition

The application build blocker and the identified live-table privilege / medication-ownership database findings are remediated and verified. HEP-002 remains **OPEN / NOT CLEARED** until the Supabase-managed default ACL and Auth setting are resolved, rate limiting and external AI data handling are accepted or remediated, and the production application rollout is separately authorised and verified.
