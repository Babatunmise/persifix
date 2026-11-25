# AHUVA-001 — Experience and Functional Verification Plan

**Branch:** `feature/ahuva-definitive-realignment`  
**Status:** Test plan; execution evidence pending  
**Release boundary:** Preview only. No production deployment or migration.

## 1. Journey acceptance matrix

| Stage | Required behaviour | Evidence |
|---|---|---|
| Ahuva Home | Clear entry point, no recipe-discovery feed, accessible loading/auth state, shortcuts and user-defined prompt | Desktop/mobile screenshots; route and keyboard checks |
| Companion Interaction | Intent is retained; user prompt is captured; no fabricated assistant response while AI is disabled | Reproducible prompt/intent test |
| Food Preparation Plan | User can enter meal, servings, ingredients, steps and optional requirements; validation prevents an incomplete cooking session | Form validation and state-transition results |
| Pot Math | Deterministic scaling and supported conversions; unsupported/ambiguous units remain explicit; non-linear ingredients require review | Automated unit tests and manual examples |
| Plate Prep | Ingredient checklist updates reliably and is retained in the active session | Toggle, refresh and resume results |
| Cooking Workspace | Steps, progress, ingredient completion and timer controls remain coherent | Start/pause/resume/reset/elapsed tests |
| Completion | Completion requires all required steps; completion is distinct from an active session | Positive and negative completion tests |
| Returning Experience | A user can resume the correct active session and state after interruption | Refresh and authenticated second-device tests |

## 2. Functional test cases

### Home and companion
- Open `/ahuva` while authenticated and unauthenticated.
- Verify the loading state is visible and announced to assistive technology.
- Submit a user-defined home prompt; confirm it enters Companion Interaction before the preparation plan.
- Select each intent shortcut; confirm the selected intent is preserved through subsequent stages.
- Submit an empty prompt; confirm no state transition occurs.
- Confirm the UI clearly states that live conversational processing is unavailable and does not invent an answer.

### Preparation plan and Pot Math
- Validate missing meal name, empty ingredients, empty steps and invalid serving counts.
- Test integer, decimal and simple fraction quantities.
- Test mass-to-mass and volume-to-volume conversions only.
- Test US cup and metric cup as distinct units; reject ambiguous cup conversions.
- Confirm no mass-to-volume conversion occurs without food-specific density evidence.
- Confirm salt, seasoning, spices, leaveners and thickeners are flagged for manual review.
- Test unsupported units, malformed quantities, zero/negative quantities and upper bounds.
- Confirm displayed quantities, selected measurement system and serving ratio remain consistent when navigating between stages.

### Plate Prep and Cooking Workspace
- Toggle every ingredient prepared/unprepared.
- Complete steps out of order and verify progress reflects the number of completed steps.
- Verify the active step is not silently marked complete by navigation.
- Start, pause, resume and reset a timer.
- Verify elapsed timer state after browser refresh, device sleep/wake and a delayed return.
- Verify timer timestamps are interpreted using server-authoritative time once persistence is implemented.
- Confirm the completion action remains unavailable until all required steps are complete.
- Confirm completion does not create an active session or write to `meal_logs` prematurely.

### Returning experience and failure states
- Refresh on each stage and confirm the expected state is restored.
- Test expired authentication, sign-out, network loss, Supabase outage and malformed stored state.
- Test browser storage unavailable, denied or full.
- Confirm errors are visible, recoverable and do not silently discard user work.
- Verify completed sessions do not reappear as active sessions.
- Verify a second authenticated device can recover the same active session after server persistence is implemented.

## 3. Responsive and accessibility matrix

Test at minimum:
- 360 × 800
- 390 × 844
- 768 × 1024
- 1280 × 800

Verify:
- No horizontal overflow, clipped controls or overlapping sticky navigation.
- Touch targets and form controls remain usable on narrow screens.
- User zoom is not disabled; test browser zoom at 200%.
- Keyboard-only navigation, visible focus, logical focus order and Escape/back behaviour.
- Labels, accessible names, heading order, status announcements and progress semantics.
- Contrast for body text, helper text, disabled controls and warning states.
- Reduced-motion preference and timer announcements that do not overwhelm screen readers.

## 4. Data, ownership and RLS test matrix

Run only after the schema is approved and applied to an isolated test database.

Use two independent authenticated users (A and B) plus an anonymous client:
- A can create, read, update and delete A's own session.
- B cannot select, update, delete or attach children to A's session.
- A cannot spoof `user_id` to create or reassign a row to B.
- Child ingredient, step and timer rows cannot reference a session owned by another user.
- Anonymous access cannot read or mutate private sessions, preferences, pantry items, constraints or feedback.
- Authenticated users can read only approved global reference records.
- Unapproved nutrition sources and their food/nutrient/allergen records remain inaccessible.
- Nutrition calculation items are readable only through an owned parent calculation; clients cannot insert or mutate calculation evidence.
- User deletion and consent withdrawal follow the approved retention and deletion policy.

Capture SQL test output and policy definitions. Do not claim RLS verification from static SQL review alone.

## 5. Session persistence acceptance

The persisted session must include:
- Recipe/plan and ingredient snapshots, not references to mutable external recipes.
- Serving quantities and base serving quantities.
- Completed and pending ingredient/step state.
- Active stage and active step.
- Timer duration, status, start/end timestamps, paused timestamp and remaining duration.
- Session status, created/updated/last-activity timestamps and schema version.

A successful demonstration must show:
1. User A starts and updates a session.
2. The browser refreshes without losing state.
3. User A signs in on a second device and recovers the same state.
4. Timer remaining time is reconstructed from timestamps, not a stale client countdown.
5. User B cannot retrieve that session.
6. Completion writes a completed-meal record separately; active sessions remain distinct from `meal_logs`.

## 6.1 Completed-meal log compatibility gate

The live `public.meal_logs` table currently requires non-null `meal_type`, `description`, `calories` and `sodium_mg`. The current AHUVA proposal does not yet define a completion-time meal-type capture or an explicit relationship between a completed cooking session and its meal log.

This creates a safety/data-integrity blocker: unknown calories or sodium values cannot be written as zero or an arbitrary estimate. Before implementing completion writes, approve a compatibility design that preserves existing consumers and supports genuinely unknown nutrition values. Options for review include a carefully staged nullable/provenance change to the existing nutrition columns, or an explicit completion record linked to `meal_logs` with a migration-safe ownership relationship.

Acceptance requirements:
- Active sessions remain in AHUVA session tables and never appear in `meal_logs` before completion.
- Completion captures a valid meal type rather than inferring it from time of day.
- Unknown calories and sodium remain unknown; no zero or fallback substitution.
- The completed record links back to its source session without permitting cross-user references.
- Existing meal-log readers and writers remain compatible.
- Migration and rollback plans are reviewed before any schema execution.

## 6. Evidence package

For each test, record:
- Test ID and exact steps.
- Expected result and observed result.
- Pass/fail/blocked status.
- Browser, OS, viewport and commit SHA.
- Screenshot or screen recording where visual behaviour is relevant.
- Console/network error details with secrets and personal data removed.

Required screenshot set:
- Desktop and mobile for Home, Companion, Preparation Plan, Pot Math, Plate Prep, Cooking Workspace, Completion and Returning Experience.
- Include at least one loading state, validation error, recoverable failure and timer state.

## 7. Execution restrictions and blockers

- No production deployment, domain changes or production environment changes.
- No external AI calls or approval-gate changes.
- No unapproved database migrations.
- Do not run authenticated preview tests against production user data. Provision an isolated Supabase test project or approved development branch first; confirm any associated cost before provisioning.
- Do not modify or weaken HEP-002 protections.
- Clinical Guard and nutrition recommendations remain disabled until source coverage, licensing, deterministic rules and qualified review are complete.

## 8. Current status

The test plan is prepared. Full browser execution, screenshots, RLS isolation evidence, server persistence and cross-device recovery remain pending. Existing Pot Math/TypeScript/lint/build CI results are not substitutes for these acceptance tests.
