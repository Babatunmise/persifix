# HEP-002 Security Verification Report

**Status:** OPEN — NOT CLEARED  
**Scope:** Controlled remediation verification and final clearance review  
**Production:** No changes made during this review  
**Development branch:** `hep-002/authenticated-verification`  
**Review date:** 2026-11-19

## Executive summary

The seven-table authenticated cross-account isolation test completed with **28/28 checks passing**. The production security remediation is deployed and its Vercel deployment remains READY. The current Supabase project is ACTIVE_HEALTHY and all eight HEP-002 database migrations are present.

The final clearance review identified an additional issue in the shared rate-limiting control: the existing `public.consume_api_rate_limit` SECURITY DEFINER function is executable by `authenticated` and accepts caller-supplied limit and window parameters. An authenticated caller could therefore weaken their own rate-limit enforcement. A proposed development-only remediation is in draft PR #5: fixed per-endpoint limits and a fixed 60-second window inside the database function, SECURITY INVOKER execution, and RLS-protected access to the private rate-limit table. This proposal has not been built, applied to the database, or runtime-tested. The finding remains OPEN.

No production code or database changes were made during this review.

## Cross-account isolation results

The test used two temporary authenticated accounts and synthetic records only. No real patient or health records were submitted or inspected.

The test covered:
- `bp_readings`
- `meal_logs`
- `weight_logs`
- `workout_logs`
- `sanctuary_logs`
- `medications`
- `medication_logs`

For each table, the second account attempted to read, update and delete the first account's synthetic record, and attempted an insert that claimed the first account's user ID. All attempts were denied or affected zero rows as expected.

| Control | Result |
|---|---:|
| Cross-account read isolation | 7/7 PASS |
| Cross-account update isolation | 7/7 PASS |
| Cross-account delete isolation | 7/7 PASS |
| Spoofed-owner insert rejection | 7/7 PASS |
| **Total** | **28/28 PASS** |

The earlier authenticated two-account test of `bp_readings` also passed its read, update, delete and spoofed-insert checks.

## Test data cleanup

The user-accessible synthetic records were removed through the verification page. The `sanctuary_logs` fixture could not be deleted by the test account because that table intentionally has no user-level DELETE policy. Engineering deleted the single identified synthetic row using its exact primary key and verified that no matching row remained.

No other test records were intentionally retained.

## Production and build verification

The production Vercel deployment was rechecked during this review:
- Deployment ID: `dpl_UQgLpc1AZswj5aZeGZ4mVgXv4CLf`
- Production commit: `e82b2e448190a4b9d7f6c6d17984004077951ded`
- State: `READY`
- Production aliases: `www.getsanctos.com`, `getsanctos.com`

The Supabase project `sanctoss` was rechecked and reported `ACTIVE_HEALTHY`. All eight HEP-002 migrations are present.

The isolated Vercel preview for commit `1dcae676700977765b983c0a1e2fde010061001d` (see deployment record for exact build commit) previously reached READY. The build completed Next.js production compilation, TypeScript validation and static page generation. This confirms the preview build, not full runtime regression coverage.

The user confirmed that the authenticated home page appeared and that the visible experience was working as expected. Detailed screen-by-screen regression is deferred because the product UI is scheduled for a substantial rebuild. The rebuilt UI must undergo complete functional, accessibility, security and regression testing before release.

## Existing remediation evidence

The production remediation was merged as PR #3 (merge commit `e82b2e448190a4b9d7f6c6d17984004077951ded`) and deployed to production. Five protected API routes previously returned HTTP 401 for unauthenticated and invalid-bearer requests. Authenticated empty-body validation checks returned HTTP 400 on all five routes, confirming rejection at the validation stage.

Database verification previously confirmed RLS on the eight reviewed application tables, restrictive direct grants, medication ownership linkage, and a private rate-limit store. Twenty ownership policies were reviewed.

## Findings from the final clearance review

### 1. Rate-limit RPC accepts caller-controlled policy — OPEN

Supabase's current advisor reports that the existing `public.consume_api_rate_limit(p_endpoint text, p_limit integer, p_window_seconds integer)` is a SECURITY DEFINER function executable by `authenticated`.

The function requires `auth.uid()`, uses an empty search_path, restricts endpoint names, bounds its parameters and writes to a private rate-limit table. However, authenticated clients can call the exposed RPC directly and supply their own request limit and window, potentially weakening their own throttling policy.

**Proposed development remediation:** Draft PR #5 changes the RPC to accept only an endpoint name, sets each endpoint's limit and a 60-second window inside the database function, switches the function to SECURITY INVOKER, and enables RLS on the private rate-limit table with an owner-only policy. The private schema remains unexposed through the Supabase API; authenticated access is granted only so the invoker function can operate under RLS.

**Verification still required:** Vercel blocked additional deployments because the project's free daily deployment API quota was exceeded. The current PR has no successful build result. The migration has not been applied to production. Before merge or production rollout, the build must pass; migration SQL must be applied in the authorised sequence; the Supabase advisor must be rerun; and direct RPC validation, cross-account isolation and all five endpoint rate-limit behaviours must be tested. The current production function remains unchanged.

### 2. Leaked-password protection disabled — OPEN

Supabase's current security advisor confirms that leaked-password protection is disabled. It is unavailable on the current Free plan. No upgrade or paid change is authorised.

**Required action:** Executive Office must either approve an upgrade or formally accept and document this limitation.

### 3. Supabase owner-level default ACLs — OPEN

The database catalog confirms that `supabase_admin` has default privileges in exposed schemas that include grants to `anon`, `authenticated` and `service_role` for newly created objects. The current remediation restricted the reviewed application tables, but the project cannot alter certain `supabase_admin`-owned default ACLs using the available database role.

**Required action:** Obtain Supabase owner-level intervention or formally document and accept the residual risk. Until then, every newly created object must have its effective privileges explicitly reviewed before exposure.

### 4. External AI safeguards — OPEN

Contractual, privacy, regional, retention and consent safeguards for the external AI provider remain unresolved. `SANCTOS_EXTERNAL_AI_APPROVED` must remain unset. Kitchen and Narrator must continue to fail closed. Journal requests currently send only a generic supportive prompt, not the journal entry or patient-specific facts; this limited data flow must remain explicit in the privacy review.

**Required action:** Approve the vendor safeguards and product consent model before any patient-specific health information is sent externally.

### 5. Verification scope and assurance limits

The 28 checks verify the seven named tables and tested access paths. They do not certify every table, view, function, storage bucket, future module or future product architecture. The results are not a full independent penetration test and do not guarantee the absence of all vulnerabilities.

## Release position

**HEP-002 remains OPEN — NOT CLEARED.**

The newly identified direct-call rate-limit weakness must be remediated and verified. The owner-level ACL limitation and leaked-password protection must be resolved or formally risk-accepted by the Executive Office. External AI safeguards must remain in place. The UI rebuild is a separate programme; full regression testing is required on the rebuilt application before its release.

The temporary verification page and its branch are test-only. Do not merge PR #4 or deploy this test page to production. Production changes require separate authorisation.

## Forward control

New tables, APIs and user-owned resources must undergo ownership design, least-privilege review, RLS/permission review and cross-account regression testing before release. The reusable Persifix security standard should be adopted as a separate engineering control after HEP-002 is concluded.
