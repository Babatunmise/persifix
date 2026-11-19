# HEP-002 — Verification plan

Status: TEST EXECUTION BLOCKED pending isolated database approval and test runtime access.

## Synthetic test matrix

For each endpoint, use two synthetic authenticated users (A and B) and synthetic patient records only.

| Test | Expected result |
|---|---|
| No Authorization header | 401 |
| Invalid/expired bearer token | 401 |
| User A submits a valid request | Normal authorised workflow succeeds |
| User A attempts to request User B's report | Impossible through request body; report is built from verified User A identity |
| Report queries | Every patient-data query filters by authenticated user_id; profile query filters by authenticated id |
| Missing/invalid JSON | 400 |
| Wrong content type | 415 |
| Body exceeds endpoint limit | 413 |
| Invalid field type, oversized text, invalid reason, invalid BP range | 400 |
| Repeated requests over route limit | 429 with Retry-After |
| DeepSeek timeout/provider error | Generic 502; no provider body or patient content in response/log |
| Report success | PDF contains only authenticated user's synthetic records |
| Journal external request | Journal text absent from outbound payload |
| Medication follow-up external request | No outbound DeepSeek request |
| Narrator external request | Only systolic/diastolic values in outbound payload |
| Kitchen external request | Bounded transcript with direct identifier patterns redacted |

## Current automated verification

The repository has existing lint and build scripts. This branch has not yet produced a CI run or local test output in this execution session. Do not mark any test passed until a run is observed and its result recorded.

## Known coverage gap

The API rate limiter is process-local and does not coordinate across serverless instances. A shared, durable rate-limit backend is required for production-grade abuse protection. Synthetic cross-account database tests also require the isolated Supabase development branch.


## Additional database integrity verification

- Before adding the composite medication ownership foreign key, count any medication_logs rows whose user_id differs from the referenced medications.user_id. The production read-only baseline returned 0.
- After applying to the isolated database, verify the composite foreign key exists and confirm a synthetic User A cannot create a medication log pointing to User B's medication.
- Confirm deleting a synthetic medication still cascades to its own medication logs.
