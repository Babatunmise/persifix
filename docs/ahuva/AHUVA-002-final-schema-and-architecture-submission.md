# AHUVA-002 — Final Schema and Architecture Submission

**Status:** Submitted for Argus architecture review  
**Repository:** Babatunmise/persifix  
**Branch:** feature/ahuva-definitive-realignment  
**Baseline:** docs/ahuva/AHUVA-001-schema-proposal.sql  
**Authority requested:** Architecture approval, followed by a separate authorisation for disposable-environment migration validation only.

---

## 0. Executive architecture decision

Ahuva will use a session-centred, owner-scoped Supabase/Postgres architecture. It stores the minimum structured state required to resume cooking, content explicitly saved by the user, and cross-session personalisation only where the user has granted the relevant consent.

Six data domains are separate and must not be conflated:

1. **Temporary conversation and session context:** short-lived working context for continuity. Raw transcripts are not retained as a default product record.
2. **Persistent cooking preferences:** cuisine, taste, convenience, household and measurement preferences. Off by default; stored only with explicit personalisation consent.
3. **Declared allergies and dietary restrictions:** current-session declarations always apply to that session. Cross-session storage requires separate health-restriction consent.
4. **Active cooking sessions:** owner-scoped, versioned state required to continue planning, preparation and cooking across refreshes and devices.
5. **Completed meal records:** a distinct user-facing history record, with its own retention and deletion lifecycle.
6. **Saved recipes and associated feedback:** deliberate user-owned content, independent of whether a cooking session remains in history.

The database is not an AI memory store. External AI remains disabled. This submission authorises no schema operation, migration, database write, seed ingestion, production change or release.

### Architectural invariants

- Every user-owned row has immutable ownership tied to auth.users.id.
- Child rows carry the same user_id and use composite foreign keys to prevent cross-owner attachment.
- RLS is enabled on every table in an exposed schema. Policies check ownership, not merely role membership.
- Reference catalogue data is read-only to application users.
- Current-session safety declarations remain active even when persistent personalisation is off.
- Persistent preferences and persistent health restrictions have separate, versioned and revocable consent scopes.
- Consent is never inferred from ordinary use, recipe entry, feedback or completion.
- Session writes use monotonically increasing revisions and compare-and-swap semantics. Silent last-write-wins is prohibited.
- Server timestamps, not device clocks, determine timer expiry and mutation ordering.
- Unknown or unverified food/allergen data is never converted into a claim of safety.
- Session completion does not automatically create a saved recipe, persistent preference or feedback record.
- Deletion is enforced server-side and cannot be undone by stale offline clients.
- No client receives a Supabase service-role credential.

---

## 1. Complete proposed schema

The existing AHUVA-001 SQL proposal is the baseline for the food catalogue, unit system, user preferences, constraints, pantry, cooking sessions, session ingredients, steps, timers, saved meals, feedback and nutrition records. This submission retains those entities and specifies the complete target inventory and amendments below. The baseline SQL is not an executable migration and is not approved for application.

### 1.1 Reference catalogue and calculation data

These are platform-owned reference tables, not user-owned records.

| Table | Purpose and principal fields | Access |
|---|---|---|
| ahuva_foods | Canonical identity: id, canonical/scientific name, food group, region, preparation state | Authenticated read; controlled admin write |
| ahuva_food_aliases | food_id, alias, locale, region, language, alias type | Authenticated read; controlled admin write |
| ahuva_allergen_groups | Stable code, display name, description | Authenticated read |
| ahuva_food_allergen_links | Food, allergen group, source, relation type, evidence status | Read only when source approved |
| ahuva_nutrition_sources | Provider, dataset/version, jurisdiction, dates, licence, permissions, review status | Approved metadata read |
| ahuva_nutrients | Stable nutrient code/name and canonical unit | Authenticated read |
| ahuva_food_nutrition | Food, nutrient, source, value/unit, basis, preparation state, availability, confidence | Read only from approved source |
| ahuva_food_portions | Food, source, household portion, quantity/unit, mass, method, confidence | Read only from approved source |
| ahuva_unit_definitions | Unit code/name, dimension, system, base conversion, ambiguity note | Authenticated read |
| ahuva_unit_aliases | Unit, alias and locale | Authenticated read |
| ahuva_unit_conversions | From/to unit, factor, basis and source/standard | Authenticated read |

Reference-data rules: uncertain local ingredient names are not silently mapped to a foreign canonical food. Alias matching preserves locale and preparation state. Density conversions require a source-backed food/state match. Missing density or nutrition data returns unknown/unsupported, never a guessed number or zero. Only controlled administrative ingestion may modify reference data.

### 1.2 Consent and persistent preferences

| Table | Purpose | Required fields |
|---|---|---|
| ahuva_consents | Independent consent records | id, user_id, scope, status, policy_version, purpose, granted_at, withdrawn_at, created_at, updated_at |
| ahuva_user_preferences | One non-sensitive cooking profile per user | id, user_id unique, locale, region_code, measurement_system, household_size, timestamps |
| ahuva_user_preference_items | Persistent taste/cooking preferences | id, user_id, preference_type, optional food_id, display_value, source, timestamps |

Consent scopes:
- personalisation: persistent non-health cooking preferences.
- health_restrictions: persistent allergies, intolerances and medical dietary restrictions.
- feedback_learning: optional use of submitted feedback to update preferences.

All scopes default to not granted. A consent row is valid only when status is granted, policy version and purpose are present, and withdrawn_at is null. Withdrawal records a timestamp and blocks new writes immediately. Consent history must not retain the sensitive values whose use was consented to.

A profile row is not proof of consent. Preference items may be inserted or updated only through a trusted server-side operation that checks active personalisation consent. Feedback learning additionally checks feedback_learning consent. Client-side checks alone are insufficient.

### 1.3 Declared allergies and dietary restrictions

Use two separate entities:

| Table | Purpose | Required fields |
|---|---|---|
| ahuva_session_constraints | Current-session declarations | id, session_id, user_id, constraint_type, optional food_id/allergen_group_code, ingredient_label, optional user-supplied severity/note, declaration status, timestamps |
| ahuva_user_constraints | Persistent cross-session restrictions | id, user_id, constraint_type, optional food_id/allergen_group_code, ingredient_label, only necessary user-supplied details, declaration/verification status, timestamps |

Constraint types distinguish allergy, intolerance, medical_restriction, religious_restriction, dislike and voluntary_preference. An allergy is not a preference; a medical restriction is not automatically an allergy.

A user can declare a restriction for the current session without consenting to long-term storage. It is stored against that session, applied by deterministic safety checks and deleted with that session under its lifecycle.

A restriction enters ahuva_user_constraints only after explicit health_restrictions consent. If consent is absent or withdrawn, no new persistent restriction is created. Existing persistent restrictions must be removed from operational use and deleted under the approved withdrawal workflow. A user declaration is not represented as a clinician-verified diagnosis.

Ambiguous ingredient identity, known allergen derivatives, unverified cross-contact and missing evidence must fail closed. Safety decisions must not be inferred solely from conversational summaries.

### 1.4 Temporary conversation and session context

Add ahuva_session_context with:
- id, user_id, nullable session_id;
- context_version;
- context_payload JSONB;
- expires_at, created_at, updated_at.

This stores a compact working summary: current intent, unresolved questions, user-confirmed assumptions and last interaction checkpoint. It is not a raw transcript archive.

- Owner-only; if attached to a session, composite ownership binding is required.
- Default expiry is 24 hours after last refresh.
- It may be refreshed only while the associated session is active.
- No persistent preference or health restriction may be inferred from context.
- Safety declarations live in ahuva_session_constraints, not only in a conversational summary.
- On session deletion, attached context is deleted in the same transaction.
- If context expires, Ahuva asks the user to clarify rather than inventing continuity.

A compact, versioned plan/progress checkpoint may remain in the active cooking-session record for recovery. This is separate from the expiring conversational context.

### 1.5 Active cooking sessions

Retain and amend ahuva_cooking_sessions.

Required fields:
- Identity: id, user_id, unique pair (id, user_id).
- Lifecycle: status, started_at, last_activity_at, completed_at, abandoned_at, expires_at.
- Journey: task_intent, task_brief, meal_name, servings, base_servings, active_screen, active_step_order.
- Checkpoint: plan_snapshot JSONB and plan_schema_version.
- Synchronisation: revision BIGINT NOT NULL DEFAULT 1, updated_at, last_mutation_id.
- created_at.

Status values: planning, preparing, cooking, paused, completed, abandoned. Server-side transitions are validated. Completed/deleted sessions cannot be reopened by a stale device.

Child entities:
- ahuva_session_ingredients: food identity/display label, quantity, unit, preparation note, prepared flag, order, provenance.
- ahuva_session_steps: ordered instruction, completion timestamp and optional duration.
- ahuva_session_timers: label, duration, status, server start/end timestamps, pause timestamp, remaining duration and completion timestamp.
- ahuva_session_constraints: current-session safety declarations.
- ahuva_session_context: expiring conversational checkpoint.
- ahuva_session_mutations: idempotency and conflict-safe mutation ledger.

Every child row includes user_id and a composite foreign key to parent (session_id, user_id). This prevents attaching one user's child record to another user's session.

Structured child tables are authoritative for ingredients, steps, timers and constraints. plan_snapshot is a versioned checkpoint, not a substitute for child rows. Browser storage is a recovery cache/queue, not the authoritative record.

### 1.6 Mutation ledger and conflict control

Add ahuva_session_mutations with:
- id, session_id, user_id;
- idempotency_key, unique per user/session;
- base_revision, result_revision;
- mutation_type;
- accepted_at server timestamp;
- optional non-sensitive result_digest.

Do not store full free-text payloads or health values in the ledger.

Write protocol:
1. Client reads latest session and revision.
2. Client submits a typed mutation, base_revision and idempotency key.
3. Trusted server endpoint authenticates, verifies owner and validates payload.
4. In one transaction, check whether the idempotency key was already committed; if so, return its original result.
5. Conditionally update only where current revision equals base_revision.
6. If no row matches, return a conflict and latest server revision.
7. On success, update child state, record mutation and increment revision atomically.
8. Client marks the mutation synchronised only after acknowledgement.

Independent field changes may merge only where field-level rules prove they do not conflict. Same-field edits require explicit resolution. Ingredient quantity/identity, safety constraint changes, plan replacement and session deletion are conflict-sensitive. A stale device cannot resurrect a deleted session.

Do not expose unrestricted generic table updates that bypass this protocol. Prefer a narrowly scoped server endpoint/RPC with explicit owner checks. Default to invoker rights. Any privileged function requires a separate security review; no such function is authorised by this submission.

### 1.7 Timer architecture

The server is authoritative. A running timer stores duration_ms, started_at and target_end_at. A paused timer stores paused_at and remaining_ms, with target_end_at cleared. Resume sets a new server started_at and target_end_at = server_now + remaining_ms. Expiry is derived from target_end_at <= server_now(); the client countdown is presentation only.

Offline:
- Client may show an estimated countdown using its last known server offset.
- Offline timer actions are marked pending/unsynchronised.
- On reconnect, server time determines whether the timer elapsed.
- Device clock changes cannot extend or shorten authoritative time.
- Timer transitions and expiry handling are idempotent.
- Timer expiry cannot erase cooking progress.

### 1.8 Completed meal records

Add ahuva_completed_meals, distinct from operational cooking sessions.

Required fields:
- id, user_id, nullable source_session_id;
- title, completed_at;
- meal_snapshot JSONB with schema version, meal name, user-confirmed ingredient/step summary and servings;
- created_at, expires_at, optional deleted_at.

A completed meal record is created only through an explicit completion/history flow. It contains no raw transcript. It is not automatically a saved recipe. The user may delete it independently. If the source session is deleted, the meal record remains only if the user explicitly chose to retain it; otherwise it is deleted with the session. This must be an explicit retention choice, not accidental foreign-key behaviour.

### 1.9 Saved recipes and feedback

Retain ahuva_saved_meals as the saved-recipe entity, or rename it before the first approved migration if Argus prefers ahuva_saved_recipes. Choose one name before migration; do not create duplicate tables.

Required fields:
- id, user_id, title, source_type (user_recipe, adapted_recipe, completed_session);
- optional source_session_id;
- recipe_snapshot JSONB with schema version, ingredients, quantities, units, steps and preparation notes;
- created_at, updated_at, optional archive state.

A saved recipe is created only by an explicit save action. It survives ordinary session expiry and is retained until user deletion. Editing it does not mutate its source session or completed meal.

Retain ahuva_cooking_feedback:
- id, user_id, optional session_id, optional saved recipe id;
- optional rating, repeat intent, note and timestamps.

Feedback is optional and explicitly submitted. It is never required to complete cooking. It is not used to update preferences unless feedback_learning consent is active. Feedback deletion is independent of recipe/session deletion.

### 1.10 Pantry and nutrition records

Retain ahuva_pantry_items as an optional user-owned pantry list. Pantry items represent what the user says they have; session ingredients represent what the current meal requires. They are separate records.

Retain ahuva_nutrition_calculations and ahuva_nutrition_calculation_items only as a future, separate capability. Store source/method snapshots, completeness and confidence. Unknown values remain null with an explicit availability state. Nutrition reporting is not required to complete a meal and does not authorise medical advice or medication changes.

---

## 2. Entity relationships and ownership

### 2.1 Relationship map

auth.users
- ahuva_consents
- ahuva_user_preferences → ahuva_user_preference_items → ahuva_foods
- ahuva_user_constraints → ahuva_foods / ahuva_allergen_groups
- ahuva_pantry_items → ahuva_foods / ahuva_unit_definitions
- ahuva_cooking_sessions
  - ahuva_session_context
  - ahuva_session_constraints → ahuva_foods / ahuva_allergen_groups
  - ahuva_session_ingredients → ahuva_foods / ahuva_unit_definitions
  - ahuva_session_steps
  - ahuva_session_timers
  - ahuva_session_mutations
- ahuva_completed_meals
- ahuva_saved_meals
- ahuva_cooking_feedback
- ahuva_nutrition_calculations → ahuva_nutrition_calculation_items → ahuva_nutrients / ahuva_food_nutrition

Reference relationships:
- ahuva_foods → aliases, allergen links, nutrition and portions.
- ahuva_allergen_groups → food allergen links.
- ahuva_nutrition_sources → allergen links, nutrition and portions.
- ahuva_unit_definitions → unit aliases and conversions.

### 2.2 Ownership rules

auth.users is the authoritative identity source. Do not use editable user_metadata for authorisation. Every user-owned root row references auth.users(id). Every child includes user_id and a composite foreign key to its parent. A child cannot be reassigned by changing only user_id. Reference catalogue rows are platform-owned. Support/admin access is not implied by authenticated access and requires a separately approved, audited operational path.

---

## 3. RLS policies and security boundaries

### 3.1 Access matrix

| Data class | Anonymous | Authenticated owner | Other authenticated user | Trusted backend |
|---|---|---|---|---|
| Reference catalogue | Deny unless explicitly public | Read approved rows | Read approved rows | Controlled write |
| Consent | Deny | Own only | Deny | Validate transitions |
| Preferences | Deny | Own, consent-gated | Deny | Consent-checked operations |
| Persistent restrictions | Deny | Own, health-consent-gated | Deny | Consent-checked operations |
| Session context | Deny | Own active context | Deny | Enforce expiry |
| Active sessions | Deny | Own sessions | Deny | Revision-checked mutations |
| Session children | Deny | Own rows | Deny | Validate parent ownership |
| Completed meals | Deny | Own records | Deny | Lifecycle/purge |
| Saved recipes | Deny | Own records | Deny | No implicit cross-owner access |
| Feedback | Deny | Own records | Deny | Consent-gated learning |
| Nutrition calculations | Deny | Own records | Deny | Controlled writes |

### 3.2 Required policy pattern

Enable RLS on every table in public. Owner-owned tables need explicit SELECT, INSERT, UPDATE and DELETE policies. The owner predicate is:

(user_id = (select auth.uid()))

Use the TO authenticated role clause, but never treat role membership alone as ownership. UPDATE policies require both USING and WITH CHECK. Do not use auth.role() as an authorisation check. Do not use user-editable JWT metadata for privileged access.

For child rows, owner predicates are necessary but insufficient. Enforce composite foreign keys such as FOREIGN KEY (session_id, user_id) REFERENCES ahuva_cooking_sessions(id, user_id).

Reference tables may have authenticated SELECT policies with USING (true) only where all authenticated users may read the data. Do not grant INSERT/UPDATE/DELETE to anon or authenticated. Allergen/nutrition evidence is readable only when its source is approved.

### 3.3 API/database boundary

- Public clients use only publishable/anon key plus authenticated user JWT.
- Service-role/secret credentials remain server-side and never appear in NEXT_PUBLIC variables or client bundles.
- Table grants and RLS are separate controls; all exposed public tables require RLS.
- Compound session mutations, consent transitions, deletion and timer operations use narrow trusted server endpoints.
- Avoid broad SECURITY DEFINER functions. If one is genuinely necessary, put it in a non-exposed schema, set a fixed safe search path, validate auth.uid(), revoke default PUBLIC execute and test its RLS bypass behaviour.
- Views use security_invoker = true where supported, or remain inaccessible to untrusted roles.
- Logs contain opaque IDs, event types, timestamps and error codes, not transcripts, allergy details, reaction descriptions, tokens or raw health fields.
- HEP-002 authentication and rate-limit protections remain unchanged.
- Any future Realtime subscription must be tested with two users; base-table RLS alone is not sufficient evidence.

### 3.4 Mandatory security tests

1. Anonymous SELECT/INSERT/UPDATE/DELETE denied on all private records.
2. User A cannot read, update or delete User B's root rows.
3. User A cannot attach a child row to User B's session by spoofing user_id.
4. User A cannot change their own user_id to User B during UPDATE.
5. Editable user metadata cannot grant ownership.
6. Context cannot be attached to another user's session.
7. Deleted sessions cannot be recreated by replaying stale mutations.
8. Persistent preferences cannot be written without active personalisation consent.
9. Persistent health restrictions cannot be written without active health_restrictions consent.
10. Withdrawal blocks future persistent writes and triggers approved deletion.
11. Ordinary authenticated users cannot write reference catalogue data.
12. Rows linked to unapproved nutrition sources are not readable.
13. Views/functions cannot expose data outside owner scope.
14. Two concurrent same-revision writes cannot both overwrite session state.
15. Idempotent retries do not duplicate mutations or timer transitions.

---

## 4. Privacy, consent, correction and deletion

### 4.1 Consent model

| Consent | Default | Permitted | Not permitted |
|---|---|---|---|
| Session recovery | Explained as part of saving active progress | Persist active task state for recovery | Build a cross-session profile |
| Persistent personalisation | Off | Save non-health cooking preferences | Save allergies/medical restrictions |
| Persistent health restrictions | Off | Retain declared restrictions across sessions | Diagnose, clinically verify or share with AI |
| Feedback learning | Off | Use explicit feedback to update preferences | Treat every rating/note as consent |

Session recovery is a functional choice about saving an active task, not consent to remember the person. Session-level safety declarations remain active regardless of persistent consent.

### 4.2 Lifecycle operations

**Create:** temporary context during a live journey; session when a cooking task begins or user asks to save progress; session constraint when declared; persistent preference/restriction only after corresponding consent; completed meal through explicit completion/history flow; saved recipe through explicit save; feedback through explicit submit.

**Update:** owner-only. Session state uses revision-checked writes. Consent transitions are versioned and withdrawal cannot be overwritten by a stale grant. Ingredient or restriction changes trigger safety re-evaluation.

**Access:** owner-only through authenticated RLS. Context is available only to its owner and trusted server operations needed for that session. No other user, advertiser or external AI provider receives records under this architecture.

**Delete:** users can delete individual preferences, restrictions, context, sessions, completed meals, saved recipes and feedback. Provide a delete-all-Ahuva-data operation. Deletion is authenticated, server-side and idempotent. Propagate to child rows, caches and derived records. Stale offline clients cannot resurrect deleted data. Backup expiry follows the schedule below. Minimal audit metadata may record that deletion occurred, but not the deleted values.

### 4.3 Withdrawal behaviour

1. Record scope, policy version and withdrawal timestamp.
2. Reject new persistent writes under that scope immediately.
3. Stop background learning dependent on that scope.
4. Delete/de-identify existing scope data according to approved policy and user choice.
5. Preserve current-session safety declarations only for that session; do not copy them into persistent profile.
6. Do not infer renewed consent from later app use.

### 4.4 Data minimisation

- No default raw transcript archive.
- No unnecessary reaction descriptions.
- No health information required to use core cooking features.
- No health data sent to external AI while AI remains disabled.
- No feedback gate at meal completion.
- No use of session data for advertising or unrelated profiling.
- Logs contain no sensitive free text.

---

## 5. Data-retention and deletion policy proposal

All durations are proposed defaults requiring Argus approval and privacy/legal review. They are not a claim of regulatory compliance.

| Record | Proposed retention | Expiry/deletion behaviour |
|---|---|---|
| Temporary conversation context | 24 hours after last refresh | Automatic purge; no transcript archive |
| Active/incomplete session | Until completed/deleted; expire after 90 days inactive | Notify before expiry where feasible; purge session and dependent context/children |
| Session constraints | Same lifetime as associated session | Delete with session unless explicitly saved under health consent |
| Completed meal record | 30 days after completion by default | Purge unless user explicitly saves/retains |
| Persistent preferences | Until withdrawal/deletion | Prompt review after 12 months inactivity; no inferred ongoing consent |
| Persistent health restrictions | Until withdrawal/deletion | Confirm at least every 12 months; overdue records marked review-required, not verified |
| Saved recipes | Until user deletion | User-controlled, independent of session expiry |
| Optional feedback | 12 months | Delete/de-identify; no learning without feedback_learning consent |
| Pantry items | Until user deletion or separately approved inactivity expiry | User-visible management and deletion |
| Nutrition calculations | 30 days unless explicitly saved/required for visible history | Purge calculation and child items together |
| Operational security logs | 30 days | No recipe text, health data or allergy values |
| Backups containing deleted records | Maximum 35 days | Expire through documented rotation; inaccessible to normal product APIs |

Deletion ordering: revoke consent and stop writes; mark deletion intent; delete owner-scoped records and dependent rows transactionally where feasible; invalidate caches; prevent stale-client resurrection; record a non-sensitive deletion outcome; allow backup expiry within the approved maximum.

Account deletion must trigger Ahuva data deletion through the account lifecycle process. Cascading foreign keys are a safety net, not the sole deletion workflow. Backup, export, logs, caches and provider-managed copies must be included in production review.

---

## 6. Persistent cooking-session architecture

Logical flow:
1. User authenticates through existing HEP-002/Supabase Auth boundary.
2. Ahuva creates or resumes an owner-scoped session.
3. Conversation context remains in memory and, when needed for recovery, in the expiring context record.
4. Ingredients, steps, quantities, timers and screen state are structured session data.
5. Session-only restrictions are stored separately and applied by deterministic safety checks.
6. Trusted server operation validates and commits changes using revision protocol.
7. Acknowledged state is available to the user's other authenticated devices.
8. On completion, create completed meal record only according to explicit history behaviour.
9. Saving a recipe or feedback is a separate explicit action.

State model: planning → preparing → cooking → paused → cooking → completed. A session may also become abandoned or expire. State transitions are validated server-side. Completed/deleted sessions cannot be reopened by stale devices.

Storage split:
- Structured child tables are authoritative for ingredients, steps, timers and constraints.
- plan_snapshot is a versioned checkpoint, not the sole source of truth.
- Temporary context is a compact expiring summary.
- Browser storage is a recovery queue/cache.
- Server state is authoritative once acknowledged.

---

## 7. Cross-device synchronisation and conflict resolution

Every session has a monotonically increasing revision. Each mutation carries session ID, idempotency key, base revision and a typed operation/payload. Server authenticates caller, verifies owner and active session, validates payload, then conditionally updates.

| Conflict | Resolution |
|---|---|
| One mutation at current revision | Accept and increment |
| Retry of committed idempotency key | Return original result; do not apply twice |
| Independent field changes | Merge only where rules prove independence |
| Same field edited concurrently | Reject stale mutation; request explicit resolution |
| Ingredient quantity/identity changes | Surface conflict; no automatic merge |
| Safety constraint changes | Safety-restrictive state wins pending explicit resolution |
| Plan replacement | Conflict; explicit resolution |
| Independent stable step completion | May merge if no ordering/dependency conflict |
| Session deletion versus stale update | Deletion wins; stale update rejected |
| Network lost after commit | Retry same idempotency key; return original result |

No generic last-write-wins policy is permitted.

---

## 8. Offline recovery and timer handling

### Offline queue

- Keep a protected local cache of last server-confirmed snapshot and pending mutations where platform capability permits.
- Distinguish server-confirmed state from unsynchronised local edits.
- Preserve pending edits until acknowledged or explicitly resolved.
- Never present offline changes as saved across devices.
- Reconnect by submitting pending mutations in dependency order with original idempotency keys/base revisions.
- If server has a newer revision, fetch it and apply explicit conflict rules.
- If session was deleted/expired, do not recreate it automatically.

### Timer reconciliation

- Server target_end_at is authoritative.
- Local countdown is an estimate.
- Offline expiry is reconciled on reconnect using server timestamps.
- Device clock skew does not affect authoritative expiry.
- Start/pause/resume/complete operations are idempotent and revision-controlled.
- Timer expiry cannot roll back cooking progress.

### Required recovery tests

- Browser closes with acknowledged state: restore latest server revision.
- Browser closes with pending mutation: restore it as unsynchronised.
- Timer expires offline: show elapsed after reconnect.
- Device clock changes: server expiry remains unchanged.
- Stale device mutation: reject or safely rebase, never overwrite newer state.
- Independent updates: preserve both only when safe.
- Same-field updates: surface conflict.
- Network drops after commit: retry is idempotent.
- Session deleted elsewhere: stale device cannot resurrect it.
- Consent withdrawn while device offline: queued persistent write rejected on reconnect.

---

## 9. Migration and rollback strategy

### Approval gates

**Gate A — Argus architecture approval:** approve schema, relationships, RLS, ownership, consent, retention/deletion/backups, revision/sync and timer protocol. No database action before this gate.

**Gate B — Disposable validation authorisation:** Argus explicitly authorises isolated migration validation. Engineering uses a disposable Supabase project/environment with synthetic data and no production credentials.

**Gate C — Validation evidence:** apply migration only to disposable environment; run schema, RLS, ownership, consent, deletion, retention and sync tests; run Supabase security advisors; submit reproducible evidence.

**Gate D — Next-stage approval:** Argus decides whether to authorise controlled implementation. Production migration remains a separate decision.

### Migration construction after Gate A and B only

1. Inspect actual disposable database schema and migration history; do not assume proposal equals deployed state.
2. Compare existing objects with approved target.
3. Create a versioned additive migration using the documented Supabase CLI migration workflow.
4. Use explicit constraints, indexes, grants and RLS.
5. Avoid destructive renames/drops in first migration; prefer additive compatibility changes.
6. Verify clean install and ordered application.
7. Seed only synthetic reference/test data.
8. Record migration checksum, environment identifier, CLI/Postgres versions and command output.

### Rollback

- Prefer forward-fix migrations for production data-bearing changes; a down migration cannot be assumed to restore deleted/transformed data.
- In disposable validation, rollback may destroy/recreate the disposable project/database from a clean baseline.
- A reviewed down script may remove additive objects only when no dependent data/code relies on them.
- Any future production migration requires backup/restore rehearsal, compatibility window, feature flag/kill switch and named rollback owner.
- Never roll back by truncating user tables or deleting user records.
- Schema rollback and application rollback are separate plans.
- No rollback command may target production under this directive.

---

## 10. Disposable environment validation plan

### Environment controls

- Isolated Supabase project or disposable local stack, explicitly labelled non-production.
- Synthetic test users A and B; no real user data.
- Separate secrets; no production service-role key or connection string.
- Command guard asserts expected disposable project reference before any schema write.
- Confirm production target is not reachable by migration scripts.
- Capture schema dump, migration checksum and environment metadata.

### Validation suites

| Suite | Required evidence |
|---|---|
| Schema integrity | Tables, columns, types, defaults, checks, FKs, unique constraints and indexes |
| RLS/ownership | Anonymous denial, A/B isolation, child ownership, spoofing and deletion |
| Consent | Default-off, scope separation, versioning, withdrawal, server-side enforcement |
| Lifecycle | Create/update/access/expire/delete for all six domains |
| Session sync | Revision monotonicity, compare-and-swap, idempotency, conflicts, stale-client rejection |
| Offline recovery | Pending mutation persistence, reconnect reconciliation, deleted-session protection |
| Timers | Server timestamp authority, offline expiry, pause/resume, clock skew |
| Retention | Due-record selection, purge idempotency, child cleanup, backup policy evidence |
| Safety data | Allergen evidence gating, alias resolution, unknown handling, session constraints |
| Operational security | Secret isolation, safe logs, views/functions review, unchanged HEP-002 |
| Migration resilience | Clean install, CI repeatability, failure midway, disposable recreation |

### Minimum two-user RLS fixtures

- A creates session A; B creates session B.
- A attempts to read/update/delete B's session.
- A creates child row using B session ID and A user ID.
- A creates child row using B session ID and B user ID.
- A changes own row user_id to B.
- A reads B's recipe, completed meal, feedback, preference and restriction.
- Anonymous client attempts all operations.
- A withdraws consent while queued write exists; reconnect must reject persistent write.
- A deletes a session while B's unrelated session remains intact.

Negative tests assert expected error/zero-row result and absence of unintended database changes.

### Acceptance evidence format

For each suite: test ID and requirement mapping; non-secret environment identifier; migration checksum and commit SHA; exact test invocation; captured pass/fail output; relevant SQL/catalog output; defects/severity; reviewer/date. A successful migration command alone is not acceptance evidence.

---

## 11. Decisions requested from Argus

| ID | Decision | Engineering recommendation |
|---|---|---|
| ARCH-01 | Completed meal history default | 30 days unless explicitly retained |
| ARCH-02 | Saved recipe table naming | Keep ahuva_saved_meals for compatibility or rename before first migration; never duplicate |
| ARCH-03 | Temporary context expiry | 24 hours; no raw transcript archive |
| ARCH-04 | Persistent health restriction consent | Separate opt-in from personalisation |
| ARCH-05 | Withdrawal handling | Block writes immediately; delete existing persistent records under approved flow |
| ARCH-06 | Stale restrictions | Require periodic reconfirmation; mark overdue as review-required |
| ARCH-07 | Offline cache protection | Approve platform-specific protection and expiry before implementation |
| ARCH-08 | Incomplete session expiry | 90 days inactivity, notice where feasible |
| ARCH-09 | Backup deletion boundary | Maximum 35 days, subject to provider verification |
| ARCH-10 | Completed meal retention | Separate from saved recipes; explicit user choice |
| ARCH-11 | Support/admin access | No general support read access by default |
| ARCH-12 | Nutrition calculation storage | Optional, separate and not required for core companion acceptance |

---

## 12. Scope and governance boundaries

This package does not authorise:
- creating or applying a Supabase migration;
- connecting to or modifying the production database;
- running SQL against production;
- changing production RLS, grants, policies, secrets or authentication settings;
- importing production user data;
- enabling external AI or sending user data to an AI provider;
- changing HEP-002 authentication, rate limits or protections;
- merging PR #7 or deploying to production.

PR #7 remains draft and unmerged. External AI remains disabled. The kitchen endpoint remains fail-closed. Schema, architecture and retention durations remain proposals pending Argus approval.

## 13. Engineering submission and requested decision

Hephaestus submits this package and requests:

1. Approval or amendments to schema and entity relationships.
2. Approval or amendments to RLS and ownership boundaries.
3. Approval or amendments to consent scopes and lifecycle enforcement.
4. Approval or amendments to retention, deletion and backup-expiry proposals.
5. Approval or amendments to session, synchronisation, offline recovery and timer architecture.
6. If accepted, separate explicit authorisation for disposable-environment migration validation only.

**Current status:** Architecture submitted. No database modification performed. No migration created or applied. Production untouched. External AI disabled.

— **Hephaestus Engineering Office**
