# HEP-002 Security Verification Report

**Status:** OPEN — NOT CLEARED  
**Review date:** 2026-11-19  
**Production:** No changes made by the follow-up review or PR #5  
**Development branch:** `hep-002/rate-limit-hardening`

## Executive summary

The original HEP-002 remediation is deployed to production. The authenticated cross-account isolation exercise passed **28/28 checks** across seven user-owned tables, using two temporary accounts and synthetic records only. The temporary fixtures were removed and cleanup was verified.

The final review identified an additional rate-limit weakness: the production `public.consume_api_rate_limit` SECURITY DEFINER RPC accepts caller-supplied limits and a caller-supplied window. An authenticated caller can therefore weaken their own throttling.

PR #5 contains a proposed correction. The revised migration design keeps the rate-limit table inaccessible to API roles, uses a narrowly scoped SECURITY DEFINER helper in the private schema, and exposes only SECURITY INVOKER wrappers. It also retains the old three-argument RPC signature as a compatibility wrapper that ignores caller-supplied limits. This permits the database migration to be applied before the application deployment without breaking currently deployed API routes.

**The revised migration has not been applied or runtime-tested. The PR has no successful build result. HEP-002 remains open.**

## Completed work

### Production remediation

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

Five routes returned HTTP 401 for unauthenticated and invalid-bearer requests. Authenticated empty-body validation checks returned HTTP 400 at the validation stage.

### Cross-account isolation

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

All **28/28 checks passed**. The synthetic `sanctuary_logs` fixture required engineering cleanup because the user role correctly had no DELETE policy; deletion by exact fixture ID was followed by a query confirming no matching row remained. Other temporary test data was also removed.

### Database review

The eight HEP-002 migrations are present in the production project. Earlier catalog review confirmed RLS and restrictive grants on the eight reviewed application tables, medication ownership linkage, and review of 20 ownership policies.

The rate-limit store is in the `private` schema. Current production catalog inspection found that API roles have no direct table grants. The existing rate-limit RPC is owned by `postgres`, is SECURITY DEFINER, and is executable by `authenticated`.

## Open finding: rate-limit policy can be weakened

The current production function signature is:

`public.consume_api_rate_limit(p_endpoint text, p_limit integer, p_window_seconds integer DEFAULT 60)`

Although it checks `auth.uid()`, restricts endpoint names, validates parameter ranges, uses an empty search path and writes to the private table, authenticated callers can choose their own limit and window within those ranges.

### Proposed correction in PR #5

The revised migration:
1. Keeps the backing table inaccessible to `PUBLIC`, `anon`, `authenticated` and `service_role`.
2. Enables RLS on the private rate-limit table as defense in depth.
3. Adds a private helper that derives the user from `auth.uid()`, accepts only a known endpoint, and fixes the per-endpoint limits and 60-second window internally.
4. Uses a tightly scoped SECURITY DEFINER helper in the private schema, with an empty search path and no dynamic SQL.
5. Exposes SECURITY INVOKER wrappers in `public`.
6. Preserves the existing three-argument function signature for compatibility, but ignores the supplied limit and window values. The new application code uses the one-argument signature.

This is intended to avoid both direct counter tampering and a deployment-order outage. The private schema must be confirmed absent from Supabase's Exposed schemas setting before applying the migration.

### Required verification before merge or production rollout

- Confirm `private` is not in the Supabase API's Exposed schemas.
- Apply and test the migration in an isolated database before production. No development branch was created because Supabase branch compute can incur additional charges and no cost was authorised.
- Confirm the old three-argument RPC and new one-argument RPC both enforce the same fixed server-side limits.
- Confirm unauthenticated/anonymous RPC calls are rejected.
- Confirm invalid endpoint values are rejected.
- Confirm API roles cannot SELECT, INSERT, UPDATE or DELETE rate-limit rows directly.
- Confirm a user cannot inspect or alter another user's counter.
- Verify all five endpoint limits, the fixed 60-second window, HTTP 429 and `Retry-After`.
- Confirm the public wrappers are SECURITY INVOKER and the private helper is in an unexposed schema with narrowly scoped execution grants.
- Rerun Supabase security advisors.
- Complete a successful build and API runtime regression test before merge.

The migration has not been applied to production. The current production function remains unchanged.

## Other outstanding findings and executive decisions

### 1. Leaked-password protection — OPEN

Supabase's security advisor reports that leaked-password protection is disabled. The feature is unavailable on the current Free plan.

**Decision required:** approve a plan upgrade or formally accept and document this residual risk. No upgrade or paid change has been made.

### 2. Supabase owner-level default ACLs — OPEN

The reviewed database catalog indicates that `supabase_admin` has default privileges for newly created objects in exposed schemas that include grants to API roles. The current database role cannot change certain owner-level defaults.

**Decision required:** obtain owner-level intervention or formally accept and document the residual risk. Until resolved, every new database object must receive an explicit effective-privilege review before exposure.

### 3. External AI safeguards — OPEN

Contractual, privacy, regional, retention and consent safeguards for the external AI provider remain unresolved. `SANCTOS_EXTERNAL_AI_APPROVED` must remain unset. Kitchen and Narrator must continue to fail closed. Journal text and patient-specific facts must not be transmitted to the external provider.

**Decision required:** approve the vendor safeguards and consent model before any patient-specific health information is sent externally.

### 4. Verification scope

The 28 checks cover seven named tables and the tested access paths only. They do not certify every table, view, function, storage bucket, future module or future product architecture. This work is not a full independent penetration test.

### 5. Product regression

The user confirmed that the authenticated home page appeared and that the visible experience was satisfactory. Detailed screen-by-screen regression is deferred until the planned UI rebuild. The rebuilt application must receive full functional, accessibility, security and regression testing before release.

## Deployment and change-control position

PR #5 is development-only and remains unmerged. No production source or database changes have been made by this follow-up work.

Vercel's Git integration automatically creates preview builds for pushes to non-production branches. To avoid repeated builds while work is being batched, the HEP-002 branch now contains a branch-specific `git.deploymentEnabled: false` rule in `vercel.json`. This does not disable deployments from `main`. The rule must be deliberately re-enabled for the single final preview build after the batch has passed static review.

The last automatic preview build for this branch was cancelled. No further Vercel build is intended until the complete batch is ready and the deployment quota is available.

## Release position

**HEP-002 remains OPEN — NOT CLEARED.**

The rate-limit correction must pass build, migration and runtime verification. The leaked-password and owner-level ACL findings require resolution or formal risk acceptance. External AI safeguards must remain in place. The UI rebuild is a separate programme and requires its own complete regression cycle before release.
