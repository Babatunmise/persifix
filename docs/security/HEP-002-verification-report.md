# HEP-002 Security Verification Report

**Status:** OPEN — DATABASE MIGRATION APPLIED; APPLICATION ROLLOUT AND RUNTIME VERIFICATION PENDING  
**Review date:** 2026-11-19  
**Production:** HEP-002 rate-limit database migration applied 2026-11-19; application deployment not yet made  
**Development branch:** `hep-002/rate-limit-hardening`  
**Current PR:** [#5 — HEP-002: harden server-controlled API rate limits](https://github.com/Babatunmise/persifix/pull/5)

## Executive summary

The original HEP-002 remediation is deployed to production. The authenticated cross-account isolation exercise passed **28/28 checks** across seven user-owned tables, using two temporary accounts and synthetic records only. The temporary fixtures were removed and cleanup was verified.

The final clearance review identified an additional rate-limit weakness: the production `public.consume_api_rate_limit` SECURITY DEFINER RPC accepts caller-supplied limits and a caller-supplied window. An authenticated caller can therefore weaken their own throttling.

PR #5 contains a correction. The proposed migration keeps the rate-limit table inaccessible to API roles, enables RLS, uses a narrowly scoped SECURITY DEFINER helper in the private schema, and exposes SECURITY INVOKER wrappers. It retains the old three-argument RPC signature as a compatibility wrapper that ignores caller-supplied limits. The application routes move to the one-argument RPC.

**The migration and application changes passed isolated automated validation. Following explicit Executive approval and confirmation that `private` was unchecked (not exposed) in the Exposed schemas setting, the reviewed migration was applied to production on 2026-11-19.** The live database now has RLS enabled on the limiter table, private helper + SECURITY INVOKER wrappers, and no direct API-role table privileges. Application rollout and runtime verification remain pending.

## Completed production remediation

PR #3 was merged and deployed:
- Merge commit: `e82b2e448190a4b9d7f6c6d17984004077951ded`
- Production deployment: `dpl_UQgLpc1AZswj5aZeGZ4mVgXv4CLf`
- Production state at last verification: `READY`
- Production domains: `www.getsanctos.com`, `getsanctos.com`

Five protected API routes were remediated:
- `/api/journal`
- `/api/kitchen`
- `/api/meds-followup`
- `/api/narrator`
- `/api/report`

The changes include verified Supabase authentication, bounded JSON request bodies, ownership-scoped queries, server-side report data retrieval, safer missed-medication guidance, removal of journal text from AI transmission, and fail-closed controls for external AI features.

Five routes returned HTTP 401 for unauthenticated and invalid-bearer requests. Authenticated empty-body validation checks reached route validation and returned HTTP 400.

## Cross-account isolation

Two temporary authenticated accounts and synthetic fixtures were used. No real patient or health records were submitted or inspected.

| Table | Read isolation | Update isolation | Delete isolation | Spoofed-owner insert |
|---|---:|---:|---:|---:|
| `bp_readings` | PASS | PASS | PASS | PASS |
| `meal_logs` | PASS | PASS | PASS | PASS |
| `weight_logs` | PASS | PASS | PASS | PASS |
| `workout_logs` | PASS | PASS | PASS | PASS |
| `sanctuary_logs` | PASS | PASS | PASS | PASS |
| `medications` | PASS | PASS | PASS | PASS |
| `medication_logs` | PASS | PASS | PASS | PASS |
| **Total** | **7/7** | **7/7** | **7/7** | **7/7** |

All **28/28 checks passed**. Temporary fixtures were removed and cleanup was verified.

## PR #5 — isolated validation results

The latest GitHub Actions run is [45458152027](https://github.com/Babatunmise/persifix/actions/runs/45458152027), on commit `6899d272d6e7e51674462daaaf905f35f8b8bf80`.

**PASS** **Isolated PostgreSQL 17 migration and RPC tests**
- Applied the exact proposed migration to a disposable PostgreSQL service.
- Verified both public wrappers are SECURITY INVOKER.
- Verified the private helper is SECURITY DEFINER with an empty search path.
- Verified RLS is enabled on the rate-limit table.
- Verified anon cannot execute either public RPC signature.
- Verified authenticated requests can use the new RPC.
- Verified all five fixed endpoint limits: kitchen 12, narrator 10, journal 8, meds-followup 6, report 3 per 60-second window.
- Verified the legacy three-argument RPC ignores caller-supplied limits and windows.
- Verified invalid endpoints are rejected.
- Verified API roles cannot directly SELECT, INSERT, UPDATE or DELETE the backing table.
- Verified exhausted limits return a positive retry interval.
- Verified expired windows reset and two synthetic users receive independent counters.
- Verified atomic counter updates under 24 concurrent PostgreSQL sessions: exactly 12 requests were allowed and 12 were rejected for the fixed kitchen limit.
- Added an explicit `SANCTOS_EXTERNAL_AI_APPROVED` gate to Journal so no external AI request is made while approval is withheld.

<badge>PASS</badge> **Application validation**
- `npm ci`
- ESLint on all six HEP-002 API/security files
- `npx tsc --noEmit`
- `npm run build`

All four steps passed on the latest commit.

**Scope note:** A full-repository `npm run lint` initially found 10 JSX-escaping errors in the existing Gym and Home UI pages. Those are outside the six API/security files changed by PR #5, so the HEP-002 workflow now lints the remediation files directly rather than expanding this security patch into unrelated UI cleanup. TypeScript and the full production build pass.

## Live production database findings

The production migration `20261119174222` (`hep_002_server_controlled_rate_limits`) is recorded in Supabase migration history.

Post-migration catalog verification confirms:
- Both public `consume_api_rate_limit` wrappers are SECURITY INVOKER, use an empty search path, and are executable by `authenticated` only (not `anon` or `service_role`).
- The private helper is SECURITY DEFINER, owned by `postgres`, uses an empty search path, and is executable by `authenticated` only.
- RLS is enabled on `private.api_rate_limits`; no client-facing policies exist, so RLS denies direct row access. This is intentional: the private helper is the controlled write path.
- `anon`, `authenticated` and `service_role` have no direct SELECT privilege on the backing table. `authenticated` has USAGE on `private` solely so the SECURITY INVOKER wrapper can resolve and call the private helper; `anon` and `service_role` do not.
- The Supabase security advisor no longer reports the public SECURITY DEFINER rate-limit RPC. It reports an INFO notice for RLS enabled with no policy (expected for this inaccessible internal table) and a WARN for leaked-password protection disabled.

The user confirmed `private` was unchecked while the other two schemas were checked in Project Settings → API → Exposed schemas. The setting was not changed. The isolated PostgreSQL test remains complementary to, not a substitute for, production runtime verification.

## Remaining release gates

### 1. Private schema exposure — VERIFIED

The user confirmed that `private` was unchecked while the other two schemas were checked in Project Settings → API → Exposed schemas. No setting was changed. `private` therefore remains absent from the API-exposed schema list.

### 2. Private limiter RLS/access model — APPROVED AND APPLIED

The Executive Office approved the reviewed migration. RLS is enabled on `private.api_rate_limits` with no client-facing policy; direct API-role table privileges remain revoked. The private SECURITY DEFINER helper is the controlled write path, and public wrappers are SECURITY INVOKER. Production catalog checks passed after application.

### 3. Leaked-password protection — DEFERRED / OPEN

The user elected to defer leaked-password protection. Supabase's security advisor continues to report this warning. No plan upgrade or paid change has been made. This remains an open security risk and is not treated as resolved.

### 4. Supabase owner-level default ACLs — INVESTIGATED; NO CURRENT HEP-002 EXPOSURE FOUND

Catalog review confirms that `supabase_admin` has platform-managed default privileges in `public`, `graphql` and `graphql_public`. The active database role is `postgres`, is not a member of `supabase_admin`, and cannot alter those defaults. No ACL changes were made, consistent with the investigation-only instruction.

The live object audit found:
- All eight existing application tables in `public` have RLS enabled; `anon` has no SELECT privilege and `authenticated` access remains subject to the existing RLS policies.
- No application tables or views exist in `graphql` or `graphql_public`.
- The only current object owned by `supabase_admin` in those exposed schemas is Supabase's `graphql_public.graphql` entry-point function.
- No current application table in `public` is owned by `supabase_admin`.

**Disposition:** this is a platform-managed default-privilege configuration, not evidence of current cross-account access or an active HEP-002 exposure. Leave it unchanged. Treat it as a standing platform-level residual: review effective grants and RLS for any future object created by `supabase_admin` before it becomes reachable. It is not a blocker to the HEP-002 API remediation or its release.

### 5. External AI safeguards — DISABLED BY DEFAULT; NOT A RELEASE BLOCKER FOR NON-AI ROUTES

Contractual, privacy, regional, retention and consent safeguards for the external AI provider remain unresolved. `SANCTOS_EXTERNAL_AI_APPROVED` remains unset. Kitchen, Narrator and Journal now all fail closed with HTTP 503 before making an external AI request. Journal text and patient-specific facts are not transmitted to the provider. The production environment does not currently contain the approval flag; the DeepSeek credential is not configured with a usable value.

**Disposition:** do not enable the external AI integration as part of HEP-002. Keep these features unavailable until a separate explicit approval follows vendor due diligence and a consent decision. This does not block release of the non-AI API security remediation.

### 6. Runtime verification and rollout

The isolated database tests and full application build have passed, and the production database migration is applied. Live route-level checks for the new one-argument RPC, HTTP 429 and `Retry-After` behaviour still require the coordinated application deployment/preview window.

The branch-specific Vercel Git deployment rule remains disabled for `hep-002/rate-limit-hardening`. This avoids intermediate preview deployments and does not disable `main`. No new Vercel deployment was triggered by these GitHub Actions checks.

## Change-control position

- PR #5 remains a draft and is not merged.
- PR #4, the temporary authenticated verification utility, has been closed without merging.
- The approved production database migration has been applied and verified; no production application deployment has been made for PR #5.
- The old three-argument wrapper remains in place for compatibility until the updated application is deployed.
- The final application deployment should be one consolidated Vercel run after the quota is available. The branch-specific preview deployment remains disabled.

## Release position

**HEP-002 remains OPEN — NOT CLEARED.**

The rate-limit correction has passed isolated SQL/RPC tests, targeted lint, type checking and the production build. Production clearance still depends on coordinated runtime verification after the consolidated application rollout, owner-level default-ACL investigation, the deferred leaked-password control decision, external AI safeguards, and final review of the remaining risk register.
