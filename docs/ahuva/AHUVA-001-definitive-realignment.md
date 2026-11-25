# AHUVA-001 — Definitive Product Realignment

**Specification authority:** Argus — Product Development  
**Implementation branch:** feature/ahuva-definitive-realignment  
**Status:** UI realignment committed; backend, AI and database work remain gated  
**Production:** No deployment performed or authorised by this change  
**External AI:** Approval gate remains closed  
**Database:** No migration applied

## 1. Product definition

Ahuva is Sanctos's personal food and cooking companion. The product journey is:

**User expresses a need → Ahuva understands → collaborates → prepares an actionable solution → helps execute → learns from feedback.**

The experience must refine foods users enjoy rather than unnecessarily replacing them; support autonomy; account for culture, family, finances, convenience, pleasure and health; and use health context only when relevant.

Ahuva is not a recipe marketplace, recipe-discovery application, calorie tracker, conventional nutrition chatbot or restrictive medical diet application.

## 2. Screen-by-screen UX blueprint

| Screen | Primary job | Main elements | State / exit |
|---|---|---|---|
| 1. Ahuva Home | Welcoming entry to Kitchen | Ahuva presence; natural text entry; four optional shortcuts; resume session | Starts a task or resumes an active session |
| 2. Companion Interaction | Understand the user's real request | Conversation thread; task context; only necessary follow-up questions; relevant authorised context | Produces an agreed task brief |
| 3. Food Preparation Plan | Turn the task into an actionable plan | Meal/recipe; ingredients and quantities; servings; preparation requirements; substitutions; verified nutrition when available; restrictions | Proceed to Pot Math, Plate Prep or Cooking Workspace |
| 4. Pot Math | Deterministic quantity and serving intelligence | Serving scaling; supported unit conversions; proportion calculations; explicit non-linear cooking adjustments | Returns validated quantities to the plan |
| 5. Plate Prep | Organise the meal before cooking | Ingredient checklist; washing/chopping/measuring; meal composition; relevant verified nutrition | Prepared ingredients feed the cooking workspace |
| 6. Cooking Workspace | Guide execution without losing context | Structured steps; ingredient and prep checklists; active step; contextual questions; timestamp-backed timers; progress | Complete or interrupt/resume |
| 7. Completion | Close the task naturally | Completion confirmation; optional feedback; save meal/recipe; consent-based preference learning | Return home; optional memory update |
| 8. Returning Experience | Resume without repeated onboarding | Recover active session; relevant authorised preferences; clear session status | Continue existing work |

Shortcuts are optional entry points, not mandatory workflows. Recipe suggestions are permitted only when the user asks for suggestions or when they are genuinely useful to the expressed task. A standalone discovery feed is excluded.

## 3. Component and state inventory

### Current branch implementation

| Component / state | Responsibility | Current maturity |
|---|---|---|
| Ahuva home | Companion identity, text entry and four optional task shortcuts | UI implemented |
| Task brief | Captures user-provided intent and task description | Local preview only |
| Food preparation plan | Meal name, serving count, user-entered ingredients, steps and restrictions | UI implemented |
| Pot Math | Deterministic numeric ingredient scaling | Same-unit numeric quantities only; no mass/volume conversion |
| Plate Prep | Ingredient preparation checklist | UI implemented |
| Cooking Workspace | Steps, checklists, progress, timer controls | UI implemented |
| Timer recovery | Timestamp-derived countdown stored in browser local storage | Same-device prototype only |
| Completion | Completion confirmation and optional feedback entry | UI implemented; feedback not persisted |
| Returning experience | Restore unfinished session from browser local storage | Same-device prototype only |

### Not yet active

- Natural-language AI understanding, follow-up reasoning and recipe adaptation.
- Pantry interpretation and grocery-list organisation beyond user-entered ingredients.
- Validated unit conversion tables and non-linear recipe adjustment rules.
- Clinical Guard and allergen/derivative validation.
- Verified nutritional aggregation and source attribution.
- Server-side session persistence and cross-device recovery.
- Saved meals, feedback records and consent-based preference memory.

These are not to be simulated with fabricated responses or guessed values. The AI-dependent work remains blocked until the external AI gate is approved. Deterministic and database work must be implemented only after its validation and schema reviews.

## 4. Data architecture proposal — not a migration

All user-owned records use UUID primary keys, user_id foreign keys to auth.users, UTC timestamps and owner-scoped RLS. Global food reference data is separately owned and read-only to application users.

### User-owned tables

**ahuva_user_preferences**
- id, user_id
- preferred_cuisines and ingredient_preferences (versioned JSONB or normalised child tables)
- measurement_system, locale
- household_defaults
- consent_at, consent_version, consent_withdrawn_at
- created_at, updated_at

**ahuva_user_constraints**
- id, user_id
- constraint_type: allergy, intolerance, medical_restriction, religious_restriction, dislike, voluntary_preference
- ingredient_or_rule_id, user-entered label and aliases
- severity / reaction detail only where appropriate and voluntarily supplied
- source (user-declared or approved source), reviewed_at
- created_at, updated_at

Allergy records must be distinguishable from every other category in storage, UI and validation. A dislike or voluntary preference must never be interpreted as a clinical restriction.

**ahuva_pantry_items**
- id, user_id, canonical ingredient reference where matched
- user-entered name, quantity, unit, storage/location, optional expiry
- provenance (user_entered), created_at, updated_at

**ahuva_cooking_sessions**
- id, user_id, status
- task intent and user-provided task brief
- immutable recipe/plan snapshot and schema version
- servings, ingredient checklist, preparation checklist, completed step IDs, active step
- timer state: duration, started-at, paused-at, remaining-at-pause, target-end timestamp and status
- started_at, last_activity_at, completed_at, created_at, updated_at

Timer remaining time must be derived from persisted timestamps, never from a browser interval as source of truth.

**ahuva_saved_meals**
- id, user_id, title, immutable meal/recipe snapshot, source and version
- nutrition result reference where available
- created_at, updated_at

**ahuva_cooking_feedback**
- id, user_id, cooking_session_id / saved_meal_id
- optional rating, repeat intent and free-text note
- explicit permission flag if any feedback is eligible for preference learning
- created_at

### Global reference data

- nutrition_data_sources: provider, dataset, version, jurisdiction, publication date, licence, attribution, retrieval date and permitted-use flags.
- nutrition_foods: canonical food identity, regional identity, preparation/processing state and source record ID.
- nutrition_food_aliases: language, locale, region, local name, transliteration, alias type and canonical food ID.
- nutrition_food_nutrients: nutrient ID, value, unit, basis, evidence/method class, source record and missing-value reason.
- nutrition_food_portions: portion descriptor, mass, measurement method, source and applicability.
- nutrition_recipe_calculations: ingredient inputs, conversions, edible-portion/yield/retention factors, method/version, result, completeness and uncertainty.
- reference_units, reference_unit_conversions, reference_cuisines: locale-aware labels and explicitly supported conversions.

Global reference tables must not contain user health or preference records. Source licensing must be evaluated per dataset; no provider's API terms imply blanket permission to mirror its data.

## 5. Security and RLS requirements

1. Enable RLS on every user-owned table.
2. Restrict SELECT, INSERT, UPDATE and DELETE to auth.uid() = user_id; use explicit WITH CHECK on writes.
3. Validate JSONB shape, numeric ranges, enum values and referenced-record ownership server-side.
4. Keep provider credentials server-side; never expose service-role keys to the browser.
5. Do not send allergies, health restrictions, profile information or medication records to an external model unless separately approved, necessary and consented.
6. Do not use medication records to generate interaction advice in this release.
7. Preserve HEP-002 authentication, request bounds, fixed server-side rate limits and fail-closed external AI approval gate.
8. Consent withdrawal must stop future preference-based processing and follow an approved retention/deletion process.
9. Allergy validation must be deterministic and run after initial plan creation and every adaptation. Ambiguous ingredients or derivatives must not receive a positive safety claim.

## 6. Nutrition source and calculation policy

Use a multi-source adapter architecture rather than one global provider. Candidate datasets include USDA FoodData Central, FAO/INFOODS Western Africa and Nigeria datasets, UK CoFID and national European datasets. Commercial providers such as Edamam, Nutritionix or Spoonacular require separate contract, licence, caching, attribution, privacy and regional-coverage review.

Every nutrition result must retain:
- ingredient identity and preparation state;
- source record, dataset and version;
- quantity, measure and serving basis;
- conversion, edible-portion, yield and retention methodology;
- evidence class and confidence/completeness;
- explicit unknown/missing nutrient values.

Ingredient-derived calculations are estimates, not laboratory analyses of the cooked meal. Laboratory-verified prepared meals require a separate evidence class and sample/method provenance. If no defensible food match or quantity conversion exists, the value remains unknown. No silent generic substitution and no treating missing data as zero.

For hypertension-related guidance, use verified sodium information where available and relevant to the user. Do not assume every meal requires a warning or that all people with hypertension have identical needs. Never advise medication changes.

## 7. Migration, validation and rollback plan

**No migration has been created or applied by this branch.**

Before migration:
1. Argus reviews the schema and data-retention proposal.
2. Engineering produces additive SQL with constraints, indexes, grants and RLS policies.
3. Validate against a disposable Supabase/PostgreSQL environment.
4. Test two-user isolation, owner spoofing, deletion, consent withdrawal, malformed JSON and timer/session recovery.
5. Capture pre-migration schema state and a recovery plan.
6. Review provider licensing and any personal-data processing separately.
7. Obtain explicit release authorisation before production execution.

Rollback:
- Prefer forward-fixes after user data has been written.
- For unused additive objects, disable the feature path first; remove only after confirming no dependent records need preservation.
- Never weaken RLS or HEP-002 controls as a rollback mechanism.
- No destructive SQL should run without explicit approval.

## 8. Implementation changes in this branch

- Replaced the static three-recipe discovery feed with a companion-led Ahuva home and optional task shortcuts.
- Added a user-directed preparation plan, deterministic serving scaling, ingredient preparation checklist, guided cooking steps, timestamp-based timer and completion feedback UI.
- Added same-device local recovery for an interrupted cooking preview. This is not server persistence or cross-device recovery.
- Removed the misleading daily calorie target and calorie/sodium summary from the Ahuva experience.
- Did not call any external AI provider or change the external AI approval gate.
- Did not add or execute a database migration.
- Did not alter HEP-002 API security controls or deploy to production.

The current prototype does not claim live conversational understanding, clinical allergy verification, verified nutrition, saved-meal persistence or cross-device session recovery. Those require the approved AI, deterministic reference-data and backend workstreams above.

## 9. Verification and release gates

Required before a Stage 1 release:
- TypeScript, ESLint and production build pass on the branch.
- Mobile, tablet and desktop UX review.
- Keyboard and screen-reader checks.
- Authenticated route and navigation regression tests.
- Timer recovery test across refresh, pause/resume and elapsed state.
- Two-user RLS isolation tests after approved schema implementation.
- Nutrition completeness/provenance tests, including unknown values.
- Allergy/derivative negative tests.
- HEP-002 security regression tests.
- Argus product acceptance.

**Current status:** Companion-led UI prototype committed. Database design, AI-dependent intelligence, clinical validation, runtime verification and production release remain gated.
