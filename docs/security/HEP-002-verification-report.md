# HEP-002 Security Verification Report

**Status:** OPEN — NOT CLEARED  
**Scope:** Controlled remediation verification  
**Production:** No changes made during this verification cycle  
**Development branch:** `hep-002/authenticated-verification`

## Executive summary

The seven-table authenticated cross-account isolation test completed with **28/28 checks passing**. The test used two temporary authenticated accounts and synthetic records only. No real patient or health records were submitted or inspected.

The test covered:
- `bp_readings`
- `meal_logs`
- `weight_logs`
- `workout_logs`
- `sanctuary_logs`
- `medications`
- `medication_logs`

For each table, the second account attempted to read, update and delete the first account's synthetic record, and attempted an insert that claimed the first account's user ID. All attempts were denied or affected zero rows as expected.

## Results

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

## Build verification

The isolated Vercel preview for commit `1dcae676700977765b983c0a1e2fde010061001d` reached READY. The build completed:
- Next.js production compilation
- TypeScript validation
- Static page generation

This confirms the preview build, not full runtime regression coverage.

## Existing remediation evidence

The production remediation was previously merged as PR #3 (merge commit `e82b2e448190a4b9d7f6c6d17984004077951ded`) and deployed to production. Five protected API routes returned HTTP 401 for unauthenticated and invalid-bearer requests. Authenticated empty-body validation checks returned HTTP 400 on all five routes, confirming rejection at the validation stage.

Database verification previously confirmed RLS on the eight reviewed application tables, restrictive direct grants, medication ownership linkage, and a private scoped rate-limit store/RPC. Twenty ownership policies were reviewed.

## Outstanding work and limitations

1. **Application regression:** The preview build passed compilation and TypeScript checks, but interactive application regression across core user journeys has not yet been completed.
2. **Supabase owner-level default ACLs:** The project cannot alter certain `supabase_admin` default privileges. This requires Supabase owner-level support or an authorised owner-level change.
3. **Leaked-password protection:** The feature is unavailable on the current Free plan. No upgrade or paid change is authorised.
4. **External AI safeguards:** Contractual/privacy safeguards for the external AI provider remain unresolved. `SANCTOS_EXTERNAL_AI_APPROVED` must remain unset; affected AI routes must fail closed.
5. **RLS scope:** These results verify the seven named tables and the previously reviewed controls only. They do not certify future tables or unfinished product architecture.
6. **Security assurance:** Passing these tests is evidence for the tested access paths, not a full independent penetration test or a guarantee against all vulnerabilities.

## Release position

**HEP-002 remains OPEN — NOT CLEARED** until application regression is completed and the outstanding limitations are accepted, resolved or formally risk-accepted by the Executive Office.

The temporary verification page and its branch are test-only. Do not merge PR #4 or deploy this test page to production. Production changes require separate authorisation.

## Forward control

New tables, APIs and user-owned resources must undergo ownership design, least-privilege review, RLS/permission review and cross-account regression testing before release. The detailed reusable Persifix security standard should be adopted as a separate engineering control after HEP-002 is concluded.
