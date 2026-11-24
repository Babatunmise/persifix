# AHUVA-002 — PR #7 Gap Assessment, Revised Implementation Sequence & Data Governance Proposal

**Document ID:** AHUVA-002-GAP-001  
**Prepared by:** Hephaestus — Engineering Office  
**For:** Argus — Executive Office  
**Date:** 25 November 2026  
**Assessment target:** `Babatunmise/persifix`, PR #7  
**Branch:** `feature/ahuva-definitive-realignment`  
**Assessed commit:** `3965cc46967c0e0b6d8e6b93fbb3a5ca35937ecc`  
**Disposition:** Assessment only. No migrations, production changes or AI activation authorised.

## 1. Executive assessment

PR #7 establishes the Ahuva companion-led interaction prototype and several useful deterministic foundations. It does not yet deliver the persistent, context-aware cooking companion defined by the amended acceptance specification.

The current implementation is strongest in the presentation of the intended journey and the isolated Pot Math module. The largest gaps are server-side session persistence, cross-device recovery, structured ingredient and restriction enforcement, consent-aware personalisation, conflict-safe synchronisation, expanded deterministic verification, and the absence of a working conversational reasoning capability.

**Important classification rule:** a schema proposal, UI field, warning message, successful build or passing isolated unit test is not evidence that the corresponding product capability is implemented end-to-end.

### PR status and evidence boundary

- PR #7 is open, draft and unmerged.
- Assessed head commit: `3965cc46967c0e0b6d8e6b93fbb3a5ca35937ecc`.
- Changed scope: 14 files; 37 commits at assessment time.
- Ahuva CI and HEP-002 validation passed on the assessed commit according to the recorded Actions runs.
- The Ahuva workflow runs Pot Math tests, TypeScript, scoped ESLint and a production build.
- Passing CI verifies those checks only. It does not establish authenticated journey acceptance, clinical validity, persistence, privacy, accessibility or cross-device reliability.

## 2. Status definitions

| Status | Meaning |
|---|---|
| **Implemented and verified** | Capability exists in the assessed code and has direct automated or manual evidence appropriate to the requirement |
| **Implemented, not adequately verified** | Relevant code exists, but required test or independent evidence is absent |
| **Partially implemented** | A prototype or limited subset exists; the complete requirement is not met |
| **Not implemented** | No operational implementation exists in the assessed branch |
| **AI-dependent / blocked** | Requires an approved AI capability; external AI is disabled and the requirement cannot be claimed as passed |

No AI-dependent requirement is classified as implemented or passed.

## 3. Consolidated requirement-by-requirement gap assessment

### A. AI-independent requirements

| Requirement | Status | Code area / evidence | Outstanding work |
|---|---|---|---|
| Same-device session recovery | **Partially implemented** | `src/components/AhuvaKitchen.tsx`: browser `localStorage` hydration and write effects using `sanctos.ahuva.cooking-session.v1` | Validate storage corruption, private browsing, quota errors, tab closure, timer expiry, refresh and recovery edge cases. Local storage is not server persistence. |
| Server-side session persistence | **Not implemented** | No Ahuva session API or Supabase CRUD path in the assessed Ahuva routes. Proposed table appears only in `docs/ahuva/AHUVA-001-schema-proposal.sql`. | Approved schema, authenticated server-side CRUD, ownership policies, persistence tests and recovery UI. |
| Cross-device recovery | **Not implemented** | Current session state is browser-local. | User-scoped server persistence, sync protocol, two-device tests and conflict handling. |
| Timer persistence and offline expiry | **Partially implemented** | `AhuvaKitchen.tsx` stores timer end time and remaining milliseconds locally; timer derives remaining time from `Date.now()`. Proposed `ahuva_session_timers` table has timestamp fields. | Server-authoritative timestamps, offline expiry, sleep/resume, clock-skew handling, multi-device timer state and persisted timer tests. |
| Deterministic Pot Math | **Implemented and verified — limited scope only** | `src/lib/ahuva-pot-math.mjs`; `src/lib/ahuva-pot-math.test.mjs`; existing 10 tests cover counts, fractions, mass/volume examples, ambiguous cup, non-linear review, unsupported units and invalid input. | Expand coverage for scaling boundaries, density evidence, rounding, locale units, mixed fractions, malformed/negative/zero/overflow values, parser ambiguity and culinary review. Do not treat current 10 tests as satisfying amended coverage. |
| Structured ingredient data | **Not implemented in runtime** | Current UI stores ingredient and step lists as newline-delimited strings. Proposed `ahuva_foods`, aliases, session ingredients and unit tables exist only in review SQL. | Canonical ingredient identity, locale aliases, quantity/unit parsing, preparation state, provenance and structured editor/API. |
| Structured restrictions | **Not implemented in runtime** | Current `restrictions` field is free text. The UI explicitly warns that it cannot verify allergen safety. Proposed `ahuva_user_constraints` table is design-only. | Typed restriction model, consent-aware persistence, deterministic matching, safe unknown handling and negative tests. |
| Navigation and interaction continuity | **Implemented, not adequately verified** | `AhuvaKitchen.tsx` includes home, conversation, plan, Pot Math, Plate Prep, cooking and completion states. `goHome` records a resume screen. | Browser journey tests proving state continuity across every transition, unexpected changes, browser history and recovery. No active conversational Q&A exists. |
| Authentication | **Partially implemented** | `src/app/ahuva/page.tsx` calls `supabase.auth.getUser()` and redirects unauthenticated users. Kitchen API calls `authenticateRequest`. | Protect every persistence operation server-side; test expired sessions, anonymous access and direct API requests. Page gating alone is not data ownership isolation. |
| Ownership isolation / RLS | **Not implemented and not verified** | Proposed owner-scoped RLS and composite user/session foreign keys in schema SQL. No Ahuva migration exists and no Ahuva RLS test has run. | Approved migration in disposable database; two-user, anonymous, owner-spoofing, child-row cross-link and deletion tests. |
| Deterministic safety validation | **Not implemented** | UI displays a warning for free-text restrictions; no Clinical Guard runtime is present. The kitchen endpoint returns 503 and does not call an AI provider. | Deterministic ingredient/allergen rule engine, source evidence, adaptation rechecks and explicit unsafe-recommendation rejection tests. |
| Accessibility | **Implemented, not adequately verified** | Some labels, status announcements, progress semantics, minimum navigation target sizing and reduced zoom restrictions addressed in component/navigation code. | Keyboard-only, screen-reader, focus order, contrast, zoom, timer announcements and assistive-technology review with evidence. |
| Responsive behaviour | **Implemented, not adequately verified** | Responsive Tailwind layouts and breakpoints in `AhuvaKitchen.tsx`. | Screenshot and interaction review at mobile, tablet and desktop widths; verify overflow, sticky header/nav, timer and long multilingual content. |
| Optional feedback | **Partially implemented** | Completion screen contains an optional note; component says it is not uploaded or saved. | Ensure completion does not require feedback, remove pressure language, verify skip path and decide whether any future feedback is separately consented. |

### B. AI-dependent requirements

| Requirement | Status | Code area / evidence | Outstanding work / gate |
|---|---|---|---|
| Advanced natural-language interpretation | **AI-dependent / blocked** | Conversation screen captures text, but explicitly states that Ahuva does not process messages with AI. `src/app/api/kitchen/route.ts` authenticates, rate-limits and returns 503. | Requires separate Argus approval of provider, privacy, consent, data minimisation, retention, output validation, safety and evaluation design. |
| Contextual conversational reasoning | **AI-dependent / blocked** | No operational conversational processor; the API fails closed. | Approved capability plus context assembly, memory boundaries, tool restrictions, deterministic validation and multi-turn evaluations. |
| Sophisticated recipe adaptation | **AI-dependent / blocked** | User can enter a meal and manually edit ingredients/steps; no reasoning engine adapts recipes. | Approved reasoning capability; preserve source recipe, explain changes, handle missing data and evaluate global recipes. |
| Personalised recommendations requiring external AI | **AI-dependent / blocked** | No recommendations are generated. | Explicit opt-in, approved model/provider and evaluation. No persistent personalisation should be inferred from session text. |
| AI output safety and deterministic override | **AI-dependent / blocked** | No provider integration. The architecture is described in the engineering review only. | Provider adapter must be unable to bypass deterministic restrictions; validate structured output and re-run guard after every adaptation. |

### C. Experience demonstrations

| Acceptance demonstration | Status | Evidence | Gap |
|---|---|---|---|
| Begin with natural-language request | **Partially implemented** | Home and follow-up text inputs capture user text. | No interpretation or response; cannot pass complete journey. |
| Understand existing recipe/meal | **AI-dependent / blocked** | Known-meal shortcut and editable meal/ingredient/step fields. | No interpretation of a supplied recipe or adaptive assistance. |
| Work with available ingredients | **Partially implemented** | Pantry intent shortcut and ingredient entry fields. | No ingredient-based reasoning, pantry inventory or recommendations. |
| Account for preferences/restrictions | **Partially implemented** | Free-text restriction field; proposed preference and constraint tables. | No consent model, structured enforcement or operational persistence. |
| Move planning → preparation → cooking | **Implemented, not adequately verified** | Distinct component states and navigation handlers. | Full browser journey, interruption and regression evidence outstanding. |
| Ask questions during active cooking | **Not implemented** | Cooking workspace has no working conversational question/answer surface. Kitchen API is disabled. | AI-dependent until approved processor exists; independent navigation/context preservation can still be built and tested. |
| Interrupt and recover | **Partially implemented** | Same-device local storage restoration. | Server persistence, offline recovery and cross-device recovery absent. |
| Finish without forced nutrition/feedback | **Partially implemented** | Completion note is optional and no nutrition report is required. | Verify skip path and remove any implication that feedback is expected. |

### D. Privacy, global adaptability and experience thresholds

| Requirement | Status | Evidence | Outstanding work |
|---|---|---|---|
| Explicit consent for persistent personalisation | **Partially implemented at schema-design level** | Proposed preference row includes consent timestamp/version and withdrawal timestamp. | Consent UX, separate consent scope, audit, enforcement and deletion path absent. |
| Session context separate from persistent preferences | **Not implemented** | Current browser session combines task fields and restrictions in one local object. Proposed schema separates some preferences and sessions, but no runtime policy exists. | Explicit context classes, session-only defaults and consent-gated preference writes. |
| Correction and deletion | **Not implemented** | User-owned tables have delete grants/policies in proposal; no application deletion flow or tests. | User-facing correction/deletion controls, transactional cascade, deletion verification and backup expiry policy. |
| Retention policies | **Not implemented** | Timestamps exist; no explicit expiry/retention schedule or purge job. | Argus-approved retention schedule, automated purge, audit and restore policy. |
| Health-related data protection | **Partially implemented at design level** | Proposed constraints distinguish medical restriction and allergy; no external AI calls. | Data minimisation, consent, access controls, no sensitive logging, deletion and security tests. |
| Allergy/restriction handling without optional personalisation | **Not implemented** | Current free-text field is session-local but not enforced. | Session-scoped constraints must still be checked even when long-term personalisation is disabled. |
| Global food/cuisine adaptability | **Partially implemented at design level** | Proposed food aliases include locale, region and language; UI copy acknowledges different food traditions. | Runtime food identity, alias resolution, regional validation and test corpus. |
| Regional measurements | **Partially implemented** | Pot Math has metric and imperial modes and explicitly named US/metric cup definitions. | Locale-aware units, regional household measures, conversion standards and tests. |
| Household sizes and cooking methods | **Partially implemented** | Serving controls and user-entered cooking steps exist. | Broader household tests, method-specific safety and scaling rules. |
| Experience quality ≥4/5 overall and minimum 4/5 for understanding, continuity, trustworthiness and autonomy | **Not verified** | No independent tester scorecards or journey recordings. | Conduct blinded independent evaluation; all four dimensions must independently meet threshold. |
| No mandatory experience failures | **Not verified** | No complete acceptance run exists. | Run all mandatory scenarios and document zero critical experience failures. |

## 4. Pot Math — amended deterministic test programme

The current 10 tests are a useful baseline, not sufficient coverage. Add the following measurable test groups before Pot Math can satisfy the amended gate.

| Test group | Required cases | Expected result |
|---|---|---|
| Scaling | 1×, 0.5×, 1.5×, 2×, 10×; serving count increase/decrease; maximum supported servings | Exact deterministic factor; reject invalid or out-of-bound inputs |
| Mass conversion | g↔kg, g↔oz, kg↔lb, oz↔g, lb↔kg | Dimension-preserving values within defined tolerance |
| Volume conversion | ml↔l, tsp↔ml, tbsp↔ml, US cup↔ml, metric cup↔ml, US fl oz↔ml | Correct standard-specific factor; no silent cup assumption |
| Density | Known ingredient with approved density evidence; missing density; wrong preparation state; stale source | Convert only with applicable sourced density; otherwise refuse and explain |
| Rounding | Values near 0.005, 0.015 and unit-display thresholds; repeated conversion | Documented rounding rule; no hidden cumulative conversion |
| Ambiguous quantities | “1 cup”, “a handful”, “to taste”, “one tin”, mixed/unspecified package sizes | Ask/flag; do not invent a unit or quantity |
| Fractions | 1/2, 3/4, 1 1/2, decimal, zero denominator, multiple slash, negative | Parse only supported syntax; reject malformed values |
| Invalid inputs | NaN, Infinity, negative, zero, huge quantity, zero/negative/huge factor, empty string | Fail closed, preserve source value or return typed error |
| Culinary non-linearity | Salt, spices, leaveners, thickener, gelatin and recipe-specific sensitive ingredients | Flag manual review; never silently apply linear scaling |
| Locale | Decimal comma, localized unit aliases, plural/singular and language-specific names | Locale-aware parse only when explicit locale/alias is available |

### Required numeric assertions

- Unit conversion tests must use a declared tolerance (recommended: absolute error ≤0.01 for displayed values, with calculations retaining higher precision internally).
- Density conversion must compare against a source-backed fixture with recorded food identity, state, density value, unit, source and version.
- Missing density must produce a deterministic refusal, not a guessed value.
- Rounding must occur at presentation boundaries, not after each intermediate conversion.
- Mixed fractions must either parse correctly or be explicitly rejected; they must never be misread as a different quantity.

## 5. Clinical Guard — required negative tests

No Clinical Guard implementation is currently present. The following are acceptance fixtures, not claims of completed tests.

| ID | Unsafe condition | Required result |
|---|---|---|
| CG-N01 | Ingredient directly contains a declared allergen | Reject recommendation; explain conflict |
| CG-N02 | Ingredient is a known derivative of declared allergen | Reject unless clinically reviewed rule explicitly establishes otherwise |
| CG-N03 | Product is marked “may contain” declared allergen | Do not label safe; block or require an explicitly approved risk path |
| CG-N04 | Cross-contact status is unknown | Mark not verified; never state allergen-safe |
| CG-N05 | Local alias resolves to allergen-containing canonical food | Apply same block as canonical name |
| CG-N06 | Ingredient identity is ambiguous | Ask for clarification; do not assume safety |
| CG-N07 | User changes ingredient after initial validation | Re-run all applicable checks |
| CG-N08 | AI output conflicts with deterministic allergy block | Deterministic block wins; no override path |
| CG-N09 | Optional long-term personalisation is disabled, but current session declares an allergy | Apply session-level safety constraint anyway |
| CG-N10 | Restriction is medical rather than allergy-based | Apply the appropriate reviewed rule class; do not conflate it with preference |
| CG-N11 | Nutrient source is missing or nutrient value unreported | Return unknown/incomplete, not zero or fabricated estimate |
| CG-N12 | User asks to alter prescribed medication to accommodate food | Do not recommend medication changes |

Allergy rules require qualified clinical/allergen review and provenance-bearing data before the system can claim clinical verification.

## 6. Global adaptability test matrix

The test corpus must include multiple cuisines and regions rather than one default food culture. At minimum, include:

- West African dishes and ingredients, including regional naming variants and household measures.
- South Asian dishes and ingredients, including spice mixes, rice varieties and regional measures.
- East Asian dishes and ingredients, including fermented foods, sauces and preparation-specific names.
- Middle Eastern and North African dishes and ingredients.
- European and North American recipe examples.
- Latin American dishes and ingredients.
- Indigenous/local foods and mixed dishes where validated reference data exists.

Each regional fixture must record the language/locale, region, ingredient alias, canonical identity (if established), preparation state, measurement system, household measure definition, cooking method and source provenance.

The system must not force an uncertain local ingredient into a foreign canonical match. An unresolved identity remains unresolved and is surfaced to the user.

## 7. Privacy and personalisation — proposed model for Argus review

### 7.1 Separate data classes

| Data class | Default behaviour | Purpose |
|---|---|---|
| Active session context | Used for the current cooking journey; persistence required only to provide recovery | Meal, recipe, ingredients, steps, quantities, current screen, progress and timers |
| Session-declared safety constraints | Apply to the current session even when long-term personalisation is off | Current-session allergy, restriction or safety requirement |
| Persistent personal preferences | Off by default; save only after explicit, versioned opt-in | Cuisine preferences, disliked ingredients, measurement preference and household size |
| Persistent health-related constraints | Separate explicit opt-in and clear purpose; never infer from ordinary conversation | User-declared allergy or medical food restriction for future sessions |
| Optional feedback | No collection required for completion; only save after an explicit user action | User-requested note/rating or feedback |

A session may be persisted to support recovery without granting permission to create a cross-session preference profile. Session persistence and personalisation consent are separate decisions.

### 7.2 Consent requirements

- Persistent personalisation is off by default.
- Consent must be affirmative, specific, versioned and revocable.
- Do not infer consent from using Ahuva, entering a recipe, declaring an allergy or completing a meal.
- Explain what will be saved and why before the user opts in.
- Health-related constraints require a separate, explicit consent scope.
- If consent is disabled or withdrawn, current-session safety constraints remain active for that session but must not be promoted into persistent preferences.
- No health/allergy data is sent to an external AI provider while the AI gate is closed. Any future proposal requires separate Argus approval.

### 7.3 Correction and deletion

Provide controls to:
- inspect saved preferences and constraints;
- correct an ingredient, alias, restriction or preference;
- withdraw personalisation consent;
- delete individual saved preferences/constraints;
- delete a cooking session;
- delete all Ahuva personalisation and session records.

Deletion must be enforced server-side, authenticated, owner-scoped, transactional where possible, and verified by tests. The UI must confirm what is being deleted and distinguish deletion from merely hiding data.

### 7.4 Proposed retention schedule — requires Argus approval

| Record | Proposed retention | Rationale / control |
|---|---|---|
| Active/incomplete cooking session | Retain until completed/deleted; expire after 90 days without activity | Supports interrupted-session recovery while bounding stale records |
| Completed or abandoned session | 30 days after completion/abandonment, then purge or irreversibly de-identify | Short recovery/history window; no indefinite accumulation |
| Session safety constraints | Same lifetime as the associated session unless user explicitly saves them to persistent profile | Current-session safety remains available without long-term profiling |
| Persistent preferences | Until consent withdrawal or user deletion; prompt for review after 12 months of inactivity | User-controlled, consent-based personalisation |
| Persistent health-related constraints | Until consent withdrawal or deletion; periodic confirmation at least every 12 months | Sensitive information may become outdated |
| Saved meals | Until user deletion; offer user-controlled deletion and export | Explicitly saved user content |
| Optional feedback | Off by default; if user elects to save, 12 months then delete or de-identify | Prevents unnecessary feedback retention |
| Operational security logs | 30 days, with no recipe text, ingredient health details or allergy values | Security diagnostics with data minimisation |
| Backups containing deleted records | Expire within a documented maximum of 35 days; inaccessible for normal product use | Defines the deletion completion boundary |

These durations are proposed product defaults, not a statement of legal compliance. Argus must approve them after privacy/legal review and confirm backup, disaster-recovery and provider policies before production.

### 7.5 Schema changes required before migration approval

The current `AHUVA-001-schema-proposal.sql` is a useful starting point but is not ready for migration approval. Amend it to include:

1. Separate consent records/scopes for persistent preferences and health-related constraints, including consent version, timestamp, withdrawal timestamp and purpose.
2. A session-level constraint representation that remains usable when persistent personalisation is disabled.
3. Explicit data lifecycle fields or purge eligibility for sessions, saved meals and optional feedback.
4. A documented deletion operation and auditable deletion outcome without retaining deleted sensitive values.
5. A monotonically increasing session revision/version and update metadata for conflict-safe synchronisation.
6. Timer state based on server timestamps and explicit lifecycle invariants.
7. A data classification and logging policy for health-related fields.
8. An explicit policy for user export, correction and deletion.
9. Constraints ensuring that preference/health rows cannot be created or updated without the relevant consent.
10. Indexes and retention/purge query plans for owner-scoped records.

Do not implement consent enforcement solely in client UI. Enforce it in trusted server-side operations and database policies/constraints where appropriate.

## 8. Synchronisation and recovery design requirements

The current browser-local implementation cannot meet cross-device acceptance. Proposed server-side session design must add:

- `revision` (monotonically increasing integer) to each session;
- server-generated `updated_at`;
- client `base_revision` on every mutation;
- conditional update (compare-and-swap) that succeeds only when the base revision matches;
- idempotency key for retried mutations;
- explicit conflict response containing the latest server revision;
- deterministic merge rules for independent fields and explicit user resolution for conflicting edits;
- no silent last-write-wins overwrite;
- append-only or otherwise auditable mutation metadata sufficient to investigate lost-update reports, without logging sensitive free text unnecessarily.

### Additional recovery tests

| ID | Scenario | Pass condition |
|---|---|---|
| SYNC-01 | Timer expires while device is offline | On reconnect, expiry is derived from persisted target end timestamp; timer is shown elapsed |
| SYNC-02 | User edits session offline | Change is clearly marked unsynchronised and retained locally until acknowledged or safely rejected |
| SYNC-03 | Offline change conflicts with newer server state | User is shown conflict; newer confirmed server state is not silently overwritten |
| SYNC-04 | Device B holds stale session revision | Mutation is rejected or safely rebased; stale state cannot replace newer confirmed progress |
| SYNC-05 | Two devices update different fields | Safe merge preserves both changes and increments revision |
| SYNC-06 | Two devices update the same field | Conflict is surfaced; no silent overwrite |
| SYNC-07 | Network drops after server commit but before response | Retry with same idempotency key does not duplicate or reverse the mutation |
| SYNC-08 | Device clock is wrong | Server time remains authoritative for timer expiry and update ordering |
| SYNC-09 | Browser closes during unsynchronised edit | Local pending state is recoverable and clearly distinguished from server-confirmed state |
| SYNC-10 | Session deleted on another device | Stale device cannot resurrect deleted session |

## 9. Revised AHUVA-002 implementation sequence

The sequence below separates work that can proceed without schema approval from work that requires it.

### Phase 0 — Specification and baseline (authorised now)

1. Record this gap assessment against PR #7.
2. Update the acceptance matrix with AI-independent versus AI-dependent labels.
3. Define Pot Math fixtures and deterministic negative safety test fixtures.
4. Produce the amended schema, consent and retention proposal for Argus review.
5. Keep the PR draft and external AI disabled.

### Phase 1 — Schema and privacy approval (Argus gate)

1. Review session, ingredient, restriction, preference and timer data models.
2. Approve separate session context and persistent personalisation scopes.
3. Approve retention, deletion, export and backup expiry policies.
4. Approve revision/synchronisation design.
5. Approve disposable database validation only.

**No migration is created or applied before this gate.**

### Phase 2 — Isolated database and ownership validation (after schema approval)

1. Create a versioned additive migration.
2. Apply only to a disposable Supabase project.
3. Validate schema constraints and indexes.
4. Test two-user RLS, anonymous denial, owner spoofing and cross-user child-row attachment.
5. Test consent enforcement, correction, deletion and retention purge.
6. Submit evidence for Argus review before any production migration request.

### Phase 3 — AI-independent persistent core

1. Implement authenticated session CRUD.
2. Implement revision-based conflict-safe synchronisation.
3. Implement cross-device recovery.
4. Implement server-authoritative timer state and offline expiry.
5. Implement structured ingredients, quantities, units and preparation steps.
6. Implement consent-aware preferences and session-only safety constraints.
7. Implement deterministic Clinical Guard and fail-closed unknown handling.
8. Expand Pot Math to the amended measurable test programme.

### Phase 4 — Complete AI-independent product verification

1. Test planning, preparation and cooking transitions.
2. Test interruption, refresh, offline, stale state and simultaneous updates.
3. Test the three primary user journeys using manually supplied context and deterministic capabilities.
4. Complete accessibility and responsive reviews.
5. Complete safety negative tests and obtain qualified review.
6. Obtain independent experience scores; require ≥4/5 overall and ≥4/5 for understanding, continuity, trustworthiness and autonomy. Understanding must be evaluated only for capabilities available in the test build; do not imply AI reasoning is present.

### Phase 5 — AI-dependent capability proposal (separate Argus approval)

1. Submit provider, contract, data processing, consent, retention, data residency and cost proposal.
2. Define data minimisation and explicit user confirmation boundaries.
3. Define structured outputs, refusal behaviour and deterministic guard integration.
4. Prepare multilingual, cross-cultural and adversarial evaluation sets.
5. Obtain Argus approval before enabling any external provider or secret.
6. Test the AI-dependent acceptance suite separately; never combine its results with AI-independent pass claims.

### Phase 6 — Final acceptance and release governance

1. Independent tester executes the full acceptance plan.
2. Engineering submits reproducible evidence and defect disposition.
3. Clinical/privacy/security reviewers sign off their respective areas.
4. Argus determines product acceptance.
5. Production migration and release require separate explicit authorisation.

## 10. Governance and release boundaries

- PR #7 remains draft and unmerged.
- No migration has been created or applied.
- No production data changes or deployment are authorised.
- External AI remains disabled; the kitchen API continues to fail closed.
- HEP-002 authentication and rate-limit controls must remain intact.
- The proposed schema and retention durations are submitted for review, not approval by implication.
- AI-dependent requirements remain blocked until a separate Argus decision.
- Product acceptance remains exclusively with Argus.

## 11. Engineering conclusion

PR #7 provides a useful prototype and an initial deterministic calculation module. It does not yet satisfy the amended AHUVA-002 acceptance specification.

The most important architectural correction is to separate three things that must not be conflated:

1. **Session continuity** — data required to resume the current cooking journey.
2. **Persistent personalisation** — cross-session preferences saved only with explicit consent.
3. **Safety constraints** — restrictions that must be enforced for the current session even when optional personalisation is disabled.

The next implementation work should make the AI-independent foundation dependable first. Conversational intelligence remains a separate, explicitly gated capability.

**Current disposition:** PR #7 gap assessment completed; amended schema and retention proposal submitted for Argus review. No implementation or database authority is implied by this document.
