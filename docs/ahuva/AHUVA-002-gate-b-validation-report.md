# AHUVA-002 Gate B — Disposable Database Validation Report

**Execution date:** 2026-11-25  
**Result:** Execution completed; acceptance NOT achieved  
**Environment:** Supabase disposable project `ahuva-gate-b-disposable`  
**Project ref:** `ebozlidprmsvbcsepzpz`  
**Organisation:** Sanctos (`qlrrksmcwwltftglewun`)  
**Region:** `eu-west-1`  
**Database:** PostgreSQL `17.12.0.000`  
**Quoted recurring cost:** USD 0/month  
**Production impact:** None. The existing `sanctoss` project was not used or modified.

## 1. Authoritative input and execution

- Schema: `docs/ahuva/AHUVA-002-schema-v1.1.0.sql`
- Source branch: `feature/ahuva-definitive-realignment`
- Source blob SHA: `5f07d9247334dd1c8d7f98a5aa088ade372cb7ed`
- Applied as disposable validation migration: `20261125014438_ahuva_schema_v1_1_0_gate_b_validation`
- Migration execution result: successful.

The source file's earlier review-artifact warning was superseded for this disposable execution only by Argus's explicit Gate B authorisation. No production migration was run.

## 2. Schema inventory — PASS

| Item | Observed |
|---|---:|
| Ahuva tables | 31 |
| Tables with RLS enabled | 31 |
| Tables with at least one RLS policy | 31 |
| RLS policies | 31 |
| Indexes | 86 |
| Constraints | 389 |
| Foreign keys | 56 |
| Ahuva functions | 3 |
| Ahuva triggers | 1 |

PostgreSQL version was confirmed as 17.12. All 31 Ahuva tables had RLS enabled and policy coverage. No Ahuva table was found without a policy.

## 3. Access control and ownership — PASS, with server-operation boundary noted

Synthetic users A and B were created in `auth.users`. Each received one synthetic cooking session and one synthetic pantry row.

- User A saw only A's session and pantry row.
- User B saw only B's session and pantry row.
- Authenticated users had no direct INSERT, UPDATE or DELETE privilege on Ahuva session tables.
- The `anon` role had no SELECT or INSERT privilege on Ahuva tables and no execute privilege on consent functions.
- Authenticated users could see approved reference nutrition sources; pending sources were hidden.
- Every Ahuva table had RLS enabled and policy coverage.

The `service_role` has trusted-server write privileges on user-owned tables. This is intentional in the schema, but means consent and ownership safety depend on trusted server operations correctly invoking the consent helpers and validating the authenticated owner. Those operations were not part of the SQL definition and were not available for end-to-end verification in this Gate B run.

## 4. Referential integrity and deterministic constraints — PASS

- Cross-user session child insertion was rejected by the composite `(session_id, user_id)` foreign key.
- Duplicate session idempotency key was rejected.
- Valid running timer state was accepted.
- Invalid running timer state without required timestamps was rejected.
- Deleting a session cascaded its child step rows.
- The session tombstone survived parent-session deletion.
- A stale child insert against the deleted session was rejected by its foreign key.
- Synthetic account deletion was tested inside a rolled-back transaction; dependent session, pantry, consent and tombstone rows cascaded as expected.

## 5. Consent ledger and concurrency — PARTIAL PASS

- Initial consent grant succeeded when `p_expected_revision` was NULL and assigned revision 1.
- Consent validation accepted the current granted revision.
- Withdrawal advanced the scope revision and stale consent validation was rejected.
- A stale grant based on the previous revision was rejected with SQLSTATE `40001`.
- Two concurrent independent SQL requests using the same expected revision produced one successful revision advance and one `consent_revision_conflict` (`40001`). The resulting state was then returned to withdrawn.
- Direct `service_role` INSERT privilege on `ahuva_consent_events` was denied; the service role can execute the consent helper functions.

**Compatibility note:** For a user's first consent event, the function requires `p_expected_revision = NULL`; passing `0` returns `consent_revision_conflict`. This must be explicit in the eventual API contract.

### Failure: pantry-storage withdrawal does not erase existing pantry data

After a synthetic pantry-storage consent withdrawal, the user's existing pantry row remained. The consent function appends the withdrawal event but does not perform scoped data deletion. No pantry withdrawal cleanup function, trigger or trusted server operation was present in the validated SQL.

This is a Gate B failure against the withdrawal/retention requirement. A server operation must atomically serialize withdrawal, prevent stale writes, and delete or otherwise process the affected pantry records according to the approved retention policy.

## 6. Session revision and sync — FAIL / BLOCKED

A synthetic stale mutation with `base_revision = 1` and `result_revision = 3` was accepted while the parent session's current revision remained 1. The mutation row's uniqueness constraints prevent duplicate keys and duplicate result revisions, but no function or trigger compares the mutation's base revision with the current session revision or atomically advances the parent revision.

Only three Ahuva functions exist in the schema, all related to consent revision/validation. No trusted session mutation, parent-child transaction, timer-transition, tombstone-write or deletion operation was supplied for execution testing.

Consequently:
- Idempotency uniqueness: passed.
- Timer state shape constraints: passed.
- Stale session revision conflict enforcement: failed.
- Atomic trusted parent/child mutation operation: not tested; no operation supplied.
- Trusted timer transitions and stale-update rejection: not tested; no operation supplied.
- Restrictive safety-update enforcement: not tested; no operation supplied.

The schema alone does not establish end-to-end server-side session synchronization safety.

## 7. Retention and deletion — PARTIAL PASS

- Account-level foreign-key cascades were verified using synthetic records.
- Session-child cascade and tombstone survival were verified.
- Feedback expiry defaults to 12 months.
- Nutrition calculation expiry defaults to 30 days.
- Session context and tombstone expiry timestamps are explicit required fields.

No Ahuva retention worker, scheduled purge function or deletion-processing operation was included in the SQL. Several expiry fields are nullable or rely on callers to set a value. Automatic expiry enforcement and deletion-request lifecycle therefore remain untested.

## 8. Synthetic-data reset

Both synthetic auth users were deleted after testing. Verification returned:
- Synthetic users remaining: 0
- Synthetic cooking sessions remaining: 0
- Synthetic pantry rows remaining: 0
- Synthetic consent events remaining: 0
- Synthetic tombstones remaining: 0

The disposable project and validated schema remain bootstrapped for review. No production database, production credentials, real user records, production environment variables, or external AI providers were used.

## 9. Gate B disposition

**Gate B is NOT PASSED.** The SQL schema installed successfully and core table, RLS, ownership, foreign-key, idempotency, timer-shape, consent-CAS and deletion-cascade checks produced useful passing evidence. However, two material failures were observed:

1. Pantry data remains after pantry-storage consent withdrawal.
2. A stale session mutation can be accepted without checking the parent session revision.

The absence of trusted session/pantry server operations also prevents verification of the required atomicity, consent enforcement, timer, safety-update and retention behaviours.

## 10. Required Argus decision

Do not promote this schema to production or proceed to Gate C/D on the basis of this report.

Submit the two failures and the missing server-operation test surface to Argus for disposition. Any schema revision or implementation expansion must be separately authorised. After approved remediation, rerun the failed cases and the blocked trusted-operation tests in the disposable environment before requesting Gate B acceptance.

**No production migration, PR merge, production deployment, HEP-002 change or unrelated implementation was performed.**
