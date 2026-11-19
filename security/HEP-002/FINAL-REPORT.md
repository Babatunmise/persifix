# HEP-002 — Security Remediation Execution Report

**Date:** 2026-11-19  
**Repository:** `Babatunmise/persifix`  
**Working branch:** `hep-002/controlled-remediation`  
**Supabase project:** `sanctoss` (`hvraudfhafyjuhuvyasq`)  
**Disposition:** REMEDIATION IMPLEMENTED — FINAL CLEARANCE BLOCKED BY TWO EXTERNAL CONFIGURATION CONTROLS

## Completed and verified

### Application source (isolated development branch)
- All five API routes require a verified Supabase user.
- Request bodies are bounded and JSON/content-type checked.
- Journal text is not transmitted to the AI provider.
- Medication missed-dose AI advice was removed pending clinical review.
- Narrator retrieves readings under the verified user's JWT and explicit owner predicate; client-supplied BP values are not trusted.
- Report data is fetched server-side under the verified user's JWT; patient identity and report contents are not accepted from the browser.
- Kitchen input is bounded and pattern-redacted. Pattern redaction is not de-identification.
- Kitchen and Narrator external AI calls now fail closed unless `SANCTOS_EXTERNAL_AI_APPROVED=true`. This variable is intentionally absent from the Vercel project configuration. No diet conversation or BP values should be transmitted to DeepSeek by the remediation branch.
- The Journal endpoint sends only a fixed generic prompt, not journal text or patient-specific facts.
- API rate limiting is now shared across serverless instances using an atomic Supabase database function. The function requires `auth.uid()`, accepts only five fixed endpoint names, validates limits, and returns a retry interval. The backing table is in a non-exposed `private` schema with no direct grants. The public RPC is SECURITY DEFINER by design because it writes to a private table on behalf of the authenticated caller; it has an empty search_path, no caller-supplied user ID, a fixed endpoint allowlist, and only authenticated EXECUTE permission.
- A Supabase Security Advisor INFO finding for RLS enabled without policies on the private limiter table is expected: direct table access is revoked and the table is accessed only by the narrow RPC. The Advisor WARN for the SECURITY DEFINER RPC is also intentional and documented as above; it is not a general-purpose data-access function.

### Production database changes — applied
Migrations recorded:
- `hep_002_table_privileges_and_medication_ownership`
- `hep_002_postgres_default_privilege_hardening`
- `hep_002_shared_api_rate_limiting`
- `hep_002_isolate_rate_limit_store`
- `hep_002_publish_scoped_rate_limit_rpc`
- `hep_002_restrict_rate_limit_endpoints`
- `hep_002_lock_private_rate_limit_schema`

Verified:
- RLS remains enabled on all eight application tables.
- `anon` has no direct privileges on the eight application tables.
- `authenticated` retains ordinary row-level DML grants only; structural privilege count (TRUNCATE, TRIGGER, REFERENCES, MAINTAIN) is zero.
- The medication-log foreign key binds `(medication_id, user_id)` to `medications(id, user_id)`, is validated, and preserves `ON DELETE CASCADE`.
- Pre-migration check found zero cross-owner medication-log rows.
- Existing patient rows and RLS policies were preserved.
- Rate-limit table is in the private schema and has no direct grants to PUBLIC, anon, authenticated, or service_role.
- Rate-limit RPC execution is granted to authenticated and denied to anon.

## Remaining external configuration blockers

1. **Supabase-managed default ACL:** Default privileges owned by `postgres` were hardened. The database rejected changes to defaults owned by `supabase_admin` (`permission denied to change default privileges`); the connected role cannot assume that owner. Existing broad `supabase_admin` default table/sequence ACLs remain. Until the owner-level ACL is corrected, any future table/sequence created by that role must receive explicit grants and RLS review before use. Do not treat this as cleared.
2. **Leaked-password protection:** The Supabase organization is on the Free plan. Supabase documents leaked-password protection as Pro and above. It cannot be enabled without changing plan. No plan upgrade was made. The Auth setting is a Dashboard-level configuration and is not available through the connected Supabase project tools. Minimum password length and stronger password rules remain the available Free-plan mitigations; their current values were not accessible for verification.
3. **External AI contractual safeguards:** Kitchen and Narrator calls are fail-closed in the remediation branch until the provider's retention, training-use, regional processing, and healthcare-data terms are approved. DeepSeek's published consumer privacy policy describes processing/storage in China, retention for service and other stated purposes, and use of personal data to improve services; that policy expressly says downstream developer API processing is not covered by that consumer policy. The exact Open Platform contractual treatment for this integration has not been established. See https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html and https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html.
4. **Production application rollout:** Application changes remain on `hep-002/controlled-remediation`. Production source was not deployed. The production database changes were explicitly authorised; production application rollout was not separately authorised.

## Final disposition

The identified live-table privilege and medication ownership findings are remediated. Shared rate limiting and fail-closed AI data handling are implemented on the development branch. The development build must pass after the latest changes before the branch is considered technically ready.

HEP-002 remains **OPEN / NOT CLEARED** until:
- the Supabase-managed `supabase_admin` default ACL is corrected by a role with owner-level authority;
- the Auth password controls are reviewed and the leaked-password protection limitation is formally accepted or the project plan is changed;
- the development branch passes final lint/build and preview deployment verification; and
- the production application rollout is separately authorised and verified.

No paid infrastructure, additional Supabase branch, or new environment was created.
