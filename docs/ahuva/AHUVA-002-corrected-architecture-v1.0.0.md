# AHUVA-002 — Corrected Architecture Package

**Specification:** AHUVA-002  
**Version:** 1.0.0  
**Status:** Corrected submission for Argus Gate A review  
**Repository:** Babatunmise/persifix  
**Branch:** feature/ahuva-definitive-realignment  
**PR:** #7 — open, draft, unmerged  
**Current PR head assessed:** 1f0860085f1795b0ea7ed163c55af45afcbea682  
**Schema definition:** [AHUVA-002-schema-v1.0.0.sql](./AHUVA-002-schema-v1.0.0.sql)  
**Supersedes:** AHUVA-001 schema proposal and the initial AHUVA-002 submission where they conflict.

> This is a review artifact, not a migration. No SQL in this package has been executed. It grants no authority to create, apply, validate or roll back a migration.

---

## 1. Executive decision and architecture boundaries

Ahuva uses a session-centred Supabase/PostgreSQL model. It separates:

1. Current-session task context and safety declarations.
2. Persistent non-health cooking preferences.
3. Persistent health-related restrictions.
4. Persistent religious dietary restrictions.
5. Active cooking sessions and structured child records.
6. Completed meal history.
7. Explicitly saved recipes.
8. Optional feedback and feedback-learning permission.
9. Platform-owned food, allergen, nutrition and unit reference data.

The database is not a raw conversation archive or general AI memory store. External AI remains disabled. Core cooking use must not require health information or persistent personalisation.

### Non-negotiable invariants

- `auth.users.id` is the identity authority. Never authorise from editable user metadata.
- Every user-owned row has a `user_id`; child records are bound to parents by composite (parent_id, user_id) foreign keys.
- Every table in exposed `public` schema has RLS enabled.
- Anonymous users have no Ahuva access. Authenticated clients have owner-scoped SELECT only. All mutations pass through trusted server operations.
- Server operations independently authenticate the caller, derive owner identity from the verified session, validate consent and enforce ownership. A service-role key is server-only and must never be sent to a browser.
- Session declarations are applied in the current session without requiring long-term personalisation consent.
- Persistent consent is affirmative, granular, versioned and revocable. No consent is inferred from ordinary use, task entry, completion or feedback.
- Session mutations are atomic, revision-checked and idempotent. Silent last-write-wins is prohibited.
- Server timestamps determine timer expiry and ordering.
- Unknown ingredient identity, allergen relation, cross-contact or nutrition values never become a positive safety claim or fabricated number.
- Completion does not automatically save a recipe, create a preference or submit feedback.
- Deletion and consent withdrawal are enforced server-side. A stale client cannot recreate deleted records.
- HEP-002 authentication and rate-limiting remain unchanged. External AI remains fail-closed.

## 2. Canonical schema and reconciliation

The complete SQL definition is `AHUVA-002-schema-v1.0.0.sql`. It is the sole authoritative proposed SQL for Gate A. The prior `AHUVA-001-schema-proposal.sql` is retained as historical design evidence only and must not be applied or extended.

### Canonical entities

**Platform reference data**
- `ahuva_foods`
- `ahuva_food_aliases`
- `ahuva_allergen_groups`
- `ahuva_nutrition_sources`
- `ahuva_food_allergen_links`
- `ahuva_nutrients`
- `ahuva_food_nutrition`
- `ahuva_food_portions`
- `ahuva_unit_definitions`
- `ahuva_unit_aliases`
- `ahuva_unit_conversions`

**Consent and persistent profile**
- `ahuva_consent_events` — append-only grant/withdrawal history by scope and policy version.
- `ahuva_user_preferences`
- `ahuva_user_preference_items`
- `ahuva_user_constraints` — only persistent allergy, intolerance, medical and religious restriction records.

**Session and synchronisation**
- `ahuva_cooking_sessions`
- `ahuva_session_context`
- `ahuva_session_constraints`
- `ahuva_session_ingredients`
- `ahuva_session_steps`
- `ahuva_session_timers`
- `ahuva_session_mutations`
- `ahuva_session_tombstones`

**User history**
- `ahuva_completed_meals`
- `ahuva_saved_recipes` — canonical saved-recipe table name.
- `ahuva_cooking_feedback`
- `ahuva_deletion_requests`

**Optional nutrition**
- `ahuva_nutrition_calculations`
- `ahuva_nutrition_calculation_items`

### Important reconciliation decisions

1. `ahuva_saved_meals` is replaced in the proposed target by **`ahuva_saved_recipes`**. Do not create both tables.
2. Completed meals and saved recipes are separate entities with separate retention and deletion behaviour.
3. Session constraints are separate from persistent constraints. Current-session safety works even when all persistent-consent scopes are off.
4. The original single preference consent timestamps are replaced by a versioned, append-only consent event ledger with separate scopes.
5. Session context is compact, structured and expiring; raw transcript retention is not the default.
6. Session children are authoritative structured records. `plan_snapshot` is a versioned checkpoint, not a substitute for structured rows.
7. Session revision, idempotency ledger and deletion tombstones are explicit schema entities.
8. Client-side direct DML is removed. The browser cannot bypass consent or synchronisation rules by writing directly to tables.

### Constraints, relationships, indexes, grants and RLS

The SQL file defines:
- Primary keys and owner foreign keys to `auth.users(id)`.
- Composite unique keys on session roots and composite foreign keys on child records to bind child ownership to parent ownership.
- Enum/check constraints for statuses, constraint types, consent scopes, source states, units, timers and data availability.
- JSON object/array shape checks and positive/range checks for quantities, servings, revisions and timer durations.
- Uniqueness for canonical food identity, aliases, consent-independent reference keys, session step ordering, and idempotency keys.
- Owner/status/expiry/lookup indexes for normal reads and purge jobs.
- RLS on every proposed Ahuva table.
- Authenticated SELECT policies for approved public reference data and owner-only SELECT policies for user data.
- Explicit revocation of anon/authenticated table privileges followed by only the required SELECT grants.
- Server-only `service_role` DML grants. Because this role bypasses RLS, the server contract below is mandatory.

No authenticated client receives INSERT, UPDATE or DELETE table grants. Deletion, consent changes, session mutations and reference-data ingestion must use narrow server operations. No broad client-write policy is approved.

## 3. Consent-to-data-category matrix

All consent scopes default to not granted. Current-session use is distinct from cross-session storage.

| Data category | Current-session treatment | Persistent storage requirement | Scope |
|---|---|---|---|
| Allergies | May be declared and applied to the current session; treated as safety-critical | Separate explicit opt-in before saving across sessions | `health_restrictions` |
| Intolerances | May be declared and applied to the current session | Separate explicit opt-in before saving across sessions | `health_restrictions` |
| Medical dietary restrictions | May be declared and applied to the current session | Separate explicit opt-in before saving across sessions | `health_restrictions` |
| Religious restrictions | May be declared and applied to the current session | Separate explicit opt-in; do not infer or derive religious identity | `religious_restrictions` |
| Dislikes | May guide only the current task | Explicit opt-in for cross-session taste memory | `personalisation` |
| Voluntary preferences | May guide only the current task | Explicit opt-in for cross-session preference memory | `personalisation` |

Feedback has its own `feedback_learning` scope. Submitting feedback is not consent to learn from it. A feedback note may contain sensitive information; do not automatically classify or copy its text into a profile.

### Trusted server enforcement

The browser may display consent choices but is not the enforcement boundary.

For every persistent write, the trusted server must:
1. Authenticate the request and derive the user ID from the verified auth subject.
2. Read the latest consent event for the exact scope.
3. Require the latest event to be `granted`, with a valid policy version and purpose, and no later withdrawal.
4. Validate that the requested data category maps to that scope.
5. Reject the write if consent is missing, stale, withdrawn or mismatched.
6. Write consent event and data mutation atomically where both are required.
7. Prevent an offline queued write from being accepted after withdrawal.
8. Record only non-sensitive operational metadata; never log the underlying allergy, restriction or preference value.

Persistent allergy/intolerance/medical restriction writes require `health_restrictions`. Persistent religious restriction writes require `religious_restrictions`. Dislikes and voluntary preferences are stored as preference items and require `personalisation`. A preference consent cannot authorise health or religious restriction storage.

Withdrawal blocks future writes immediately. Existing records under that scope are removed from operational use and deleted through the approved withdrawal operation. A session-only declaration already made for an active task remains applicable to that task until the session is deleted or the user removes/corrects it.

## 4. Retention, deletion and lifecycle matrix

These are proposed product defaults for Argus review, not legal retention advice. Purge jobs must be idempotent, owner-scoped, observable and tested before production.

| Record | Proposed retention | Expiry and deletion rule |
|---|---|---|
| Active/incomplete cooking session | Until completion/deletion; expire after 90 days without activity | Warn where feasible; purge session children and context; create tombstone to block stale resurrection |
| Abandoned session | 30 days after abandonment | Purge session and children after 30 days; retain a non-sensitive tombstone for 30 additional days |
| Completed session operational state | 30 days after completion | Purge session working state and children; completed-meal record is managed separately |
| Completed meal history | 30 days after completion unless user explicitly retains it | User may delete at any time; explicit retain action removes automatic expiry |
| Saved recipes | Until user deletion | Independent of session expiry and completed-meal history; export and delete controls required |
| Session constraints | Same lifetime as associated session | Delete with session; never silently promote to persistent profile |
| Persistent preferences | Until withdrawal or deletion | Review prompt after 12 months of inactivity; no automatic renewal of consent |
| Persistent health restrictions | Until withdrawal or deletion | Reconfirmation at least every 12 months; overdue becomes `review_required`, not clinically verified |
| Persistent religious restrictions | Until withdrawal or deletion | Review prompt at least every 12 months; do not infer religious identity |
| Optional feedback | 12 months | Delete/de-identify at expiry; learning only under separate feedback consent |
| Temporary session context | 24 hours after last refresh | Purge automatically; no raw transcript archive |
| Pantry items | Until user deletion; inactivity expiry requires separate approval | User-visible edit/export/delete |
| Nutrition calculations | 30 days unless explicitly retained in a supported user-facing history | Purge calculation and child items together |
| Local browser cache | 7 days maximum since last server confirmation | Clear on sign-out/account switch and after deletion acknowledgement; no sensitive health values in cache |
| Pending offline mutations | Retain until acknowledged/resolved, maximum 30 days | Warn before expiry; never silently discard a safety-restrictive update |
| Operational security logs | 30 days proposed | Opaque IDs/event codes only; no transcripts, ingredient health notes, allergy values or tokens |
| Backup copies containing deleted records | Provider-specific; no 35-day promise is currently supportable | Document actual backup source, rotation, expiry, access and restore behaviour before production |

### Individual deletion

Every user-facing record type needs an individual delete operation. The trusted server verifies ownership, records a deletion intent, deletes the target and dependent rows transactionally where possible, invalidates cache entries, and returns an explicit result. Deletion must not rely only on hiding a record in the UI.

### Account deletion

1. Start account-deletion workflow and reject new Ahuva writes.
2. Revoke/terminate active sessions and invalidate pending Ahuva mutations.
3. Delete all Ahuva user-owned records, including preferences, restrictions, sessions, session children, meals, recipes, feedback, nutrition calculations, caches and queued operations.
4. Remove or anonymise linked derived data and exports under the approved provider workflow.
5. Delete the Supabase Auth user through the established account lifecycle operation after dependent Ahuva deletion has completed.
6. Retain only the minimum non-sensitive deletion outcome required to prove completion.
7. Allow inaccessible backup copies to expire according to the verified provider/backup rotation; disclose the actual maximum to the user.

Cascading foreign keys are defence in depth, not the account-deletion workflow itself.

### Backup capability verification — blocking finding

The connected Supabase organisation currently reports the **Free** plan. Supabase's current published backup documentation states that automatic daily backups are provided on Pro, Team and Enterprise plans; Free projects do not receive that automatic daily backup service. Published daily-backup retention is Pro 7 days, Team 14 days and Enterprise up to 30 days. PITR is a separately priced add-on for eligible paid plans and does not create a 35-day guarantee by itself.

Therefore:
- The earlier proposed 35-day backup expiry is **not verified and must not be represented as an available capability**.
- On the current Free plan, no automated provider backup-retention promise can be made.
- Before production, Argus must approve either a paid provider backup arrangement or a separately managed encrypted backup/export service with documented retention, access controls, restore tests and deletion expiry.
- The selected arrangement must prove a maximum deletion-retention boundary. A manual backup process without scheduled expiry is insufficient.
- Backup restoration must be treated as a controlled event: restored deleted records must be re-deleted before the restored system is exposed to users.

Provider evidence: [Supabase database backups](https://supabase.com/docs/guides/platform/backups), [Supabase pricing and backup retention](https://supabase.com/pricing), [PITR usage and retention](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery).

## 5. Offline cache and deletion propagation

### Cache contents

The current prototype writes the entire session object to `window.localStorage`, including free-text restrictions and feedback. This is not acceptable as the future privacy architecture.

Replace that design before persistence implementation:

- Use IndexedDB rather than localStorage for structured cache and queue management.
- Cache only the minimum task checkpoint required for continuity: opaque session ID, last server-confirmed revision, screen/progress state, non-sensitive ingredient/step data and pending typed mutations.
- Do not cache raw conversation transcripts, persistent profile data, reaction descriptions, medical notes, or persistent allergy/religious restriction records.
- Session safety declarations may be retained in protected session memory for the current task only where required for offline safety; mark them as sensitive, never reuse across accounts, and clear them on sign-out/account switch.
- Use browser/platform storage protections and strict XSS/CSP controls. Do not claim that browser storage is protected against a compromised browser or same-origin script.
- Any application-level encryption must document key lifecycle, recovery and XSS threat limitations before implementation. Encryption at rest is not a substitute for minimisation.

### Server-confirmed versus pending state

The UI must label:
- **Saved / server-confirmed:** acknowledged by the server at revision N.
- **Pending / not yet synced:** local mutation not acknowledged.
- **Conflict:** server revision changed and explicit resolution is required.
- **Deleted / unavailable:** server tombstone exists; cached state cannot be reopened.

Offline edits are never described as saved across devices before acknowledgement. Keep pending mutation IDs, idempotency keys and base revisions. Retry the same idempotency key after network loss.

### Sign-out and account switching

- On sign-out, clear cached session snapshots, account-specific keys and pending writes for that account from the active browser profile.
- Before switching accounts, complete cache clearing; namespace any retained cache strictly by authenticated user ID.
- Never render one user's cached data while another account is active.
- A later sign-in by the same user must fetch server state before presenting a cached snapshot as current.
- If offline sign-out cannot contact the server, local state is still cleared and pending changes are not transferred to another account.

### Deletion propagation and stale clients

- Server deletion writes a tombstone with session ID, owner ID, final revision and expiry.
- On reconnect, clients fetch tombstones and clear corresponding cache/queue entries.
- Mutations against deleted/expired sessions are rejected; no upsert may recreate the session.
- Consent withdrawal invalidates queued persistent writes for that scope.
- A queued safety-restrictive update must not be silently discarded. If the target session has changed or been deleted, retain an explicit local conflict notice and require the user to re-enter the restriction in the current/new session before continuing. The system must not report the meal as verified safe while that conflict is unresolved.
- Deletion wins over ordinary stale edits. Safety restrictions are treated as restrictive overlays until explicitly resolved, never as ordinary last-write-wins fields.

## 6. Synchronisation and transaction protocol

All session mutations are performed by a narrow trusted server operation in one database transaction.

### Required mutation envelope

- authenticated owner derived from verified request; never trusted from client-supplied user_id;
- session_id;
- typed mutation type and validated payload;
- UUID idempotency_key;
- base_revision;
- client-generated mutation timestamp for diagnostics only (never ordering authority).

### Atomic protocol

1. Begin transaction.
2. Resolve authenticated owner from trusted request context and verify session ownership.
3. Lock the session row using `SELECT ... FOR UPDATE`.
4. Reject if session is deleted, expired or terminal for the requested operation.
5. Check the unique (user_id, session_id, idempotency_key) ledger entry. If present, return its original result without reapplying.
6. Compare base_revision with the locked current revision. If mismatched, return a conflict and latest server state/revision.
7. Validate the typed mutation, data ranges, consent and safety rules.
8. Apply parent and child changes in the same transaction.
9. Increment session revision exactly once.
10. Insert the mutation ledger row with base_revision, result_revision and a non-sensitive result digest.
11. Update server timestamps and commit.
12. Only after acknowledgement may the client mark the mutation as synchronised.

A failed child write must roll back the parent update, ledger insert and revision increment. A retry after a lost response must return the committed result for the same idempotency key.

### Conflict policy

| Conflict | Required resolution |
|---|---|
| Same idempotency key retry | Return original committed result |
| Current base revision | Accept atomically; increment revision |
| Stale revision, independent non-safety field | Merge only with a documented field-level proof; otherwise surface conflict |
| Same field edited on two devices | Explicit conflict; no silent overwrite |
| Ingredient identity or quantity | Explicit conflict and revalidation |
| Plan replacement | Explicit conflict; no implicit merge |
| Safety-restrictive update | Restrictive union/overlay takes precedence until user resolution; never silently drop |
| Safety-relaxing update or removal | Require explicit user confirmation and deterministic recheck |
| Session deletion versus stale edit | Deletion wins; reject stale edit and preserve tombstone |
| Network lost after commit | Retry same key; do not duplicate |
| Timer transition | Idempotent state transition under session revision lock |

Independent step-completion flags may merge only if stable step IDs and dependency/order rules prove the merge safe.

### Timer authority

- Running: server stores duration, started_at and target_end_at.
- Paused: server stores paused_at and remaining_ms; target_end_at is cleared.
- Resume: server computes new target_end_at from server time plus remaining_ms.
- Expiry: derived from server time and target_end_at; client intervals are display only.
- Offline timer display is an estimate. Reconnect reconciles against server timestamps.
- Device clock changes never alter authoritative expiry.
- Timer expiry cannot roll back or erase cooking progress.

## 7. Global privacy, hosting and cross-border processing

### Verified current infrastructure

| Component | Current evidence | Privacy consequence |
|---|---|---|
| Supabase project `sanctoss` | AWS `eu-west-1` (Ireland); PostgreSQL 17; active/healthy | Primary database is hosted in Ireland, not Nigeria |
| Supabase organisation plan | Free | No automatic daily database backup retention is currently available |
| Vercel project `persifix` | Next.js project; connected preview deployment | Frontend/serverless execution and data-flow region settings have not yet been established from the available project metadata |
| External AI | Disabled; kitchen API authenticates, rate-limits and returns 503 | No external model processor is currently part of the Ahuva request path |

Supabase documents that the selected region determines the primary database, Auth and Storage location. Its data-residency FAQ also describes processing outside the selected region for account/billing data, support, telemetry/logs and global content delivery. Therefore “database in Ireland” does not mean every related processing activity remains in Ireland.

References:
- [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase data residency and transfers FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq)
- [Supabase Data Processing Addendum](https://supabase.com/legal/customer-resources/data-processing-addendum)

### Intended hosting posture

The existing project is currently Ireland-hosted. This package does not authorise a region change or migration. Before production, Argus must decide whether Ireland remains an acceptable primary region for the intended user base and applicable legal obligations. Region choice must consider latency, data residency, support access, disaster recovery and transfer mechanisms, not latency alone.

The product is intended to serve users in Nigeria and potentially other countries. Storing user records in Ireland creates an international transfer/processing arrangement that requires jurisdiction-specific assessment. Do not claim NDPA, GDPR or other compliance solely because the database region is in the EU.

### Required pre-production privacy review

Obtain qualified privacy/legal review for:
- Nigeria Data Protection Act 2023 and current NDPC regulations/guidance, including lawful basis, transparency, data-subject rights, processor terms, cross-border transfer safeguards and any DPIA requirement.
- GDPR/UK GDPR or other regimes where users, controllers or processing activities bring them into scope.
- Whether allergy, intolerance and medical restriction records qualify as health/special-category data under the applicable jurisdiction.
- Whether religious restriction records reveal or infer religious belief and require heightened treatment.
- Supabase DPA, current subprocessor list, support access and incident handling.
- Vercel DPA, hosting/runtime region, logs, preview deployments, CDN and support processing.
- Any future email, analytics, crash-reporting, storage, backup or AI provider.
- Data-subject access/export/correction/deletion handling and response timelines.
- Controller/processor roles, retention schedule, breach response and international transfer documentation.

No legal conclusion or compliance certification is made by this engineering document.

## 8. PR #7 implementation reality and acceptance boundaries

The refreshed code assessment is separately recorded in [AHUVA-002 PR #7 head assessment](./AHUVA-002-PR7-head-assessment-1f086008.md).

The current implementation remains a UI prototype:
- Same-device state is stored in browser localStorage under `sanctos.ahuva.cooking-session.v1`.
- That object includes task, meal, servings, ingredient/step text, free-text restrictions, progress, timer and feedback. It is not a secure server-backed persistence layer.
- The Ahuva page checks authentication, but the cooking UI has no server-authoritative session persistence.
- The kitchen API authenticates and applies the shared HEP-002 rate limit, then returns 503 without calling an external AI provider.
- Pot Math has 10 tests. They are a useful initial baseline, not the expanded deterministic validation suite.
- Structured ingredient persistence, session constraints, Clinical Guard, cross-device recovery and deletion propagation are not implemented.
- Manual authenticated browser, accessibility and responsive evidence remains outstanding.

The architecture is proposed, not implemented. Do not describe the SQL or privacy controls as operational until the required code and tests exist.

## 9. Change log — amendments in response to Argus AHUVA-002 review

| Review requirement | Amendment made |
|---|---|
| One authoritative versioned schema | Created schema v1.0.0 SQL and this consolidated v1.0.0 architecture package |
| Reconcile AHUVA-001 SQL | Mapped all baseline entities; separated session-only and persistent restrictions; added context, consent events, tombstones, deletion requests and mutation ledger |
| Canonical recipe table | Selected `ahuva_saved_recipes`; removed naming ambiguity and duplicate-table option |
| Complete constraints, relationships and indexes | Added owner/composite foreign keys, checks, unique keys and lookup/retention indexes to the SQL definition |
| Grants and RLS | RLS enabled on every Ahuva table; anon denied; authenticated SELECT only; trusted server-only DML |
| Consent matrix | Explicitly classified allergies, intolerances, medical restrictions, religious restrictions, dislikes and voluntary preferences |
| Trusted consent enforcement | Persistent writes require exact-scope checks in trusted server operations; client controls are not authority |
| Retention matrix | Reconciled active, abandoned, completed sessions, completed meals, saved recipes, session constraints, persistent preferences and feedback |
| Account and individual deletion | Defined server-side deletion workflow, dependency cleanup, Auth account lifecycle and deletion outcome |
| Backup expiry verification | Checked live Supabase plan and current provider docs; Free plan has no automatic daily backups; 35-day claim withdrawn |
| Offline protection | Replaced localStorage design target with minimal IndexedDB cache, pending queue, cache expiry and sign-out/account-switch rules |
| Confirmed versus pending state | Defined explicit saved, pending, conflict and deleted states |
| Deletion propagation | Added tombstones and stale-client rejection; safety-restrictive offline updates cannot be silently discarded |
| Global privacy architecture | Recorded current Ireland region, cross-border processing categories, Vercel region unknown and jurisdiction-specific review gates |
| Atomic synchronisation | Specified row locking, compare-and-swap, idempotency ledger, atomic child writes and revision increments |
| Safety conflict precedence | Restrictive updates remain an overlay until explicit resolution; session deletion prevents resurrection |
| PR #7 current-head assessment | Re-fetched PR metadata, changed filenames, source files, commit, CI statuses and workflow runs at the actual current head |

## 10. Approval gates and current disposition

**Gate A — Argus architecture approval:** pending. Covers schema, ownership, grants, RLS, consent, retention, deletion, backups, offline cache, data residency and synchronisation.

**Gate B — Disposable-environment migration validation:** not authorised. Requires separate explicit Argus instruction after Gate A.

**Gate C — Reproducible migration/RLS/security evidence:** not started. No migration has been executed.

**Gate D — Controlled implementation stage:** not authorised. Requires separate Argus decision after evidence review.

No production database access or modification, migration, disposable migration validation, PR merge, production deployment, external AI activation or HEP-002 change has been performed or is authorised by this submission.

— **Hephaestus Engineering Office**
