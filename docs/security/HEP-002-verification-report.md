# HEP-002 Security Verification Report

**Status:** OPEN — REMEDIATION VALIDATED IN ISOLATION; PRODUCTION ROLLOUT PENDING  
**Review date:** 2026-11-19  
**Production:** No changes made by PR #5 or this follow-up validation  
**Development branch:** `hep-002/rate-limit-hardening`  
**Current PR:** [#5 — HEP-002: harden server-controlled API rate limits](https://github.com/Babatunmise/persifix/pull/5)

## Executive summary

The original HEP-002 remediation is deployed to production. The authenticated cross-account isolation exercise passed **28/28 checks** across seven user-owned tables, using two temporary accounts and synthetic records only. The temporary fixtures were removed and cleanup was verified.

The final clearance review identified an additional rate-limit weakness: the production `public.consume_api_rate_limit` SECURITY DEFINER RPC accepts caller-supplied limits and a caller-supplied window. An authenticated caller can therefore weaken their own throttling.

PR #5 contains a correction. The proposed migration keeps the rate-limit table inaccessible to API roles, enables RLS, uses a narrowly scoped SECURITY DEFINER helper in the private schema, and exposes SECURITY INVOKER wrappers. It retains the old three-argument RPC signature as a compatibility wrapper that ignores caller-supplied limits. The application routes move to the one-argument RPC.

**The migration and application changes have now passed isolated automated validation. The migration has not been applied to production, and the live Supabase advisor finding therefore remains.** Production rollout is deliberately held until the private-schema exposure setting and the remaining executive risk decisions are resolved.

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

The latest GitHub Actions run is [44569188702](https://github.com/Babatunmise/persifix/actions/runs/44569188702), on commit `c783e8e3f190b72dccbe5a4bd1ca3a0014c35dbc`.

<badge>PASS</badge> **Isolated PostgreSQL 17 migration and RPC tests**
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

<badge>PASS</badge> **Application validation**
- `npm ci`
- ESLint on all six HEP-002 API/security files
- `npx tsc --noEmit`
- `npm run build`

All four steps passed on the latest commit.

**Scope note:** A full-repository `npm run lint` initially found 10 JSX-escaping errors in the existing Gym and Home UI pages. Those are outside the six API/security files changed by PR #5, so the HEP-002 workflow now lints the remediation files directly rather than expanding this security patch into unrelated UI cleanup. TypeScript and the full production build pass.

## Live production database findings

The production database has not been changed by PR #5.

Catalog inspection confirms:
- The live public three-argument `consume_api_rate_limit` function is still SECURITY DEFINER and executable by `authenticated`.
- API roles currently have no direct table privileges on `private.api_rate_limits`.
- The `private` schema currently grants no USAGE to anon, authenticated or service_role.
- RLS is currently disabled on `private.api_rate_limits`; Supabase's advisor flags this. The proposed migration enables RLS while preserving the private helper's narrowly scoped write path.
- Supabase's security advisor still reports the live public SECURITY DEFINER rate-limit function and leaked-password protection disabled. These findings cannot clear until the production configuration is remediated and rechecked.

The local isolated PostgreSQL test validates the migration's SQL and privilege behaviour. It does not substitute for checking Supabase's API Exposed schemas setting or the production advisor after rollout.

## Remaining release gates

### 1. Confirm the private schema is not API-exposed

The Supabase connector does not expose the project's API Exposed schemas setting. Before migration, confirm in Supabase Dashboard → Project Settings → API → Exposed schemas that `private` is absent.

### 2. RLS decision for the private limiter table

Supabase currently reports RLS disabled on `private.api_rate_limits`. The proposed migration enables RLS and deliberately defines no client-facing table policy; direct API-role table privileges remain revoked. The SECURITY DEFINER helper is the sole intended write path.

Do not apply the RLS change outside the reviewed migration. The Executive Office must approve this access model before the production migration is applied.

### 3. Leaked-password protection — OPEN

Supabase's security advisor reports leaked-password protection disabled. The Sanctos organization is on the Free plan.

**Decision required:** approve a plan upgrade if this control is required now, or formally accept and record the residual risk. No upgrade or paid change has been made.

### 4. Supabase owner-level default ACLs — OPEN

Catalog review confirms that `supabase_admin` has default privileges in the `public` schema that grant object access to `anon`, `authenticated` and `service_role`. The active database role is `postgres`, is not a member of `supabase_admin`, and cannot change that role's default privileges.

**Decision required:** obtain Supabase owner-level intervention or formally accept and document the residual risk. Until resolved, every new database object must receive an explicit effective-privilege review before exposure.

### 5. External AI safeguards — OPEN

Contractual, privacy, regional, retention and consent safeguards for the external AI provider remain unresolved. `SANCTOS_EXTERNAL_AI_APPROVED` must remain unset. Kitchen and Narrator must continue to fail closed. Journal text and patient-specific facts must not be transmitted to the external provider.

**Decision required:** approve vendor safeguards and the consent model before any patient-specific health information is sent externally.

### 6. Runtime verification and rollout

The isolated database tests and full application build have passed. Live route-level checks for the new one-argument RPC, HTTP 429 and `Retry-After` behaviour still require the coordinated deployment/preview window.

The branch-specific Vercel Git deployment rule remains disabled for `hep-002/rate-limit-hardening`. This avoids intermediate preview deployments and does not disable `main`. No new Vercel deployment was triggered by these GitHub Actions checks.

## Change-control position

- PR #5 remains a draft and is not merged.
- PR #4, the temporary authenticated verification utility, has been closed without merging.
- No production database migration or production application deployment has been performed by this follow-up.
- The rate-limit migration must be applied before the updated application is deployed, preserving the old three-argument wrapper during the transition.
- The final preview/deployment should be one consolidated Vercel run after the quota is available and the remaining release gates are approved.

## Release position

**HEP-002 remains OPEN — NOT CLEARED.**

The rate-limit correction has passed isolated SQL/RPC tests, targeted lint, type checking and the production build. Production clearance still depends on the private-schema exposure confirmation, approval of the RLS access model, the remaining executive risk decisions, and one coordinated runtime verification after rollout.
