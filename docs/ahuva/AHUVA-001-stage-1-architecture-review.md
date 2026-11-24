# AHUVA-001 — Stage 1 Architecture & UX Review

**Status:** Stage 1 implementation in progress  
**Branch:** `feature/ahuva-stage-1`  
**Base:** `main`  
**Production:** No production deployment authorised or performed  
**Database:** No migration authored for execution or applied  
**External AI:** Approval gate remains closed

## 1. Product and information architecture

**Ahuva is the identity. Kitchen is the environment.** The Kitchen route remains the entry point in the Sanctos application, while its experience is reorganised around Ahuva as the companion.

### Screen-by-screen blueprint

| Screen / state | Purpose | Primary interactions | Stage 1 status |
|---|---|---|---|
| Kitchen / Ahuva home | Establish Ahuva's presence and invite food-first intent | Prompt entry, recipe discovery, cuisine filters | Interactive UI preview |
| Intent entry | Capture ingredients, time, meal goal or request | Text composer, submit, loading/error states | Composer UI; no external request |
| Recommendation list | Let users compare appropriate meal ideas | Open recipe, filter cuisine, inspect time | Illustrative recipe data |
| Recipe detail | Explain the meal and its ingredients | Adjust servings, tick ingredients, review notes | Interactive |
| Cooking workspace | Guide preparation and cooking | Tick steps, view progress, ask for help, timer controls | Interactive preview |
| Completion | Record outcome and collect feedback | Complete, save, rate, make again | UX planned; persistence not active |
| Preferences | Manage food identity and restrictions | Review, correct, consent, withdraw consent | UX/data model planned |
| Nutrition detail | Explain nutrient values and provenance | View per serving, source, method and completeness | Intentionally withheld until validated |

### Navigation principles

- Keep the existing authenticated `/kitchen` route and Sanctos bottom navigation.
- Ahuva is the visible companion identity; Kitchen remains the user's environment.
- Recipe discovery and cooking should be reachable without navigating to a separate product.
- The cooking workspace must preserve a clear return path to the recipe and a persistent progress summary.
- On narrow screens, prioritise the active cooking step and controls; on larger screens, use a two-column companion/workspace layout.

## 2. Component and interaction-state inventory

### Component inventory

| Component | Responsibility |
|---|---|
| `AhuvaKitchen` | Page composition and local preview state |
| Companion header | Ahuva identity and truthful Awake status |
| Intent composer | Capture user intent; currently reports that live AI is not connected |
| Recipe filters | Cuisine-based filtering without a country default |
| Recipe cards | Illustrative meal discovery |
| Recipe detail | Description, servings and ingredients |
| Pot Math controls | Deterministic proportional scaling for the preview's simple ingredient quantities |
| Ingredient checklist | User-controlled preparation state |
| Cooking step list | Ordered steps and completion state |
| Timer | Preview countdown with start, pause and reset |
| Stage/status disclosure | Makes unavailable integrations and non-persistent preview state explicit |
| Existing BottomNav | Retained as the application's navigation component |
| Existing auth guard | Retained through Supabase Auth |

### Interaction states

- **Awake:** Ahuva is available. This is the only companion presence state represented in the Stage 1 interface.
- **Listening:** Not represented until microphone capture is genuinely active and permission is granted.
- **Thinking:** Reserved for a future real request lifecycle; not simulated in this preview.
- **Responding:** Reserved for actual generated or deterministic response delivery.
- **Resting:** May be added as a non-intrusive idle presentation; it must not imply that the service is unavailable.
- **Error / unavailable:** The composer explicitly states that a message was not sent or stored while the external AI gate is closed.
- **Reduced motion:** Transitions should respect `prefers-reduced-motion`; avoid motion as a status substitute.

## 3. Data model proposal

The four approved-in-principle tables are user-facing operational records. They are not sufficient by themselves to serve as the global nutrition and food-reference database. Those reference datasets should be designed as a separate, reviewed layer.

### A. `public.kitchen_preferences`

One row per user, keyed by `user_id` referencing `auth.users(id)`.

| Field | Type | Purpose |
|---|---|---|
| `user_id` | uuid PK/FK | Owner |
| `cuisine_preferences` | jsonb | Preferred cuisines and confidence/source |
| `allergies` | jsonb | Explicit allergens, severity if user supplied, confirmation timestamp |
| `intolerances` | jsonb | Intolerances kept separate from allergies |
| `medical_restrictions` | jsonb | Clinician/user-declared restrictions; provenance and review date |
| `religious_restrictions` | jsonb | User-declared religious food constraints |
| `dislikes` | jsonb | Foods the user does not enjoy; never treated as a clinical warning |
| `voluntary_preferences` | jsonb | Ethical, lifestyle and other voluntary preferences |
| `household_defaults` | jsonb | Typical serving count and measurement preference |
| `personalisation_consent_at` | timestamptz nullable | Explicit consent timestamp |
| `personalisation_consent_version` | text nullable | Consent wording/version |
| `created_at`, `updated_at` | timestamptz | Audit timestamps |

JSON entries must be schema-validated server-side, versioned and editable. A future normalised taxonomy can replace free-text aliases without conflating categories.

### B. `public.cooking_sessions`

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Session |
| `user_id` | uuid FK | Owner |
| `recipe_snapshot` | jsonb | Immutable recipe snapshot for this session |
| `servings` | numeric | Current serving count |
| `ingredient_checklist` | jsonb | Checked ingredient IDs |
| `completed_step_ids` | jsonb | Completed step IDs |
| `active_step_id` | text nullable | Current step |
| `timer_state` | jsonb | Timer ID, target duration, started/paused timestamps, remaining-at-pause, status |
| `status` | text | active, completed, abandoned |
| `started_at`, `completed_at` | timestamptz nullable | Lifecycle |
| `created_at`, `updated_at` | timestamptz | Audit timestamps |

Timer recovery must derive remaining time from persisted timestamps and state. A browser countdown is only a display; it is not the source of truth. Store UTC timestamps and render them in the user's locale.

### C. `public.saved_recipes`

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Saved item |
| `user_id` | uuid FK | Owner |
| `source_recipe_id` | text nullable | Optional catalogue/provider identifier |
| `recipe_snapshot` | jsonb | User-visible recipe version |
| `title` | text | Search/display title |
| `created_at`, `updated_at` | timestamptz | Audit timestamps |

### D. `public.recipe_feedback`

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Feedback |
| `user_id` | uuid FK | Owner |
| `saved_recipe_id` | uuid nullable FK | Saved recipe, if applicable |
| `cooking_session_id` | uuid nullable FK | Session, if applicable |
| `rating` | smallint nullable | Bounded rating |
| `would_make_again` | boolean nullable | Repeat intent |
| `feedback` | text nullable | Optional user comment |
| `created_at` | timestamptz | Audit timestamp |

Add a constraint requiring at least one recipe/session reference and validate that referenced records belong to the same user.

### E. Future reference-data layer (separate review required)

Do not force global food data into the four user tables. Proposed reference structures:

- `nutrition.data_sources`: provider, dataset title, version, jurisdiction, publication date, licence, attribution, retrieval date, terms URL and permitted-use flags.
- `nutrition.foods`: canonical food identity, scientific name where available, processing state, preparation method, region and source record identifier.
- `nutrition.food_aliases`: language, region, local name, transliteration, alias type and canonical food ID.
- `nutrition.food_nutrients`: nutrient identifier, value, unit, basis (normally per 100 g), analytical/derived status, source record and missing-value reason.
- `nutrition.food_portions`: portion descriptor, mass, method, source and applicability.
- `nutrition.recipe_calculations`: input ingredient records, conversion factors, yield/retention method, calculated result, completeness and calculation version.
- `reference.cuisines`, `reference.units`, `reference.unit_conversions`: extensible taxonomies, locale-aware labels and mass/volume conversion metadata.

The exact schema, ownership model, grants and source-specific licence restrictions require a separate review before migration.

## 4. Nutrition data strategy — source assessment

### Source comparison

| Source | Strengths | Constraints / risks | Proposed role |
|---|---|---|---|
| USDA FoodData Central | Foundation Foods includes analytically derived sample data; FNDDS includes foods/portions reported in dietary surveys; branded data is updated monthly; CC0 public-domain licensing | U.S.-centric food supply; data types have different evidence characteristics; branded labels are not laboratory analysis | High-value international reference source, not the sole global source |
| UK CoFID 2021 | National food composition dataset, downloadable with a user guide; useful for UK foods and prepared food entries | Latest published consolidated dataset located is 2021; some legacy foods are separately marked as not reviewed in later updates | Regional/national source with dataset-version and age flags |
| European national datasets / EuroFIR | Access route across many national/specialised datasets; standardised descriptors improve comparison | EuroFIR access may require membership; publication and reuse depend on specific national licences and written approvals | Adapter framework for national datasets; assess each licence independently |
| FAO/INFOODS Western Africa 2019 | Regional food composition resource; supersedes the 2012 West African table | Coverage and nutrient completeness vary by food; validate the actual 2019 records, methods and licence before production use | Priority regional candidate for West African foods |
| Nigeria Food Database 2019 | Nigeria-specific dataset is listed in FAO/INFOODS Africa resources | Need to obtain source documentation, provenance, version and reuse terms before ingestion | Priority Nigerian candidate pending source-owner review |
| Edamam Nutrition Analysis API | Recipe/ingredient NLP, quantity extraction and recipe analysis; documents processing adjustments such as oil absorption and broth solids | Commercial terms, per-recipe licensing, attribution and caching restrictions; returned content cannot simply be copied into an internal reusable food database | Possible runtime analysis service only after contract and privacy review |
| Nutritionix API | Commercial food database API option | Public no-cost trial is no longer offered; access is sales/trial-led; public documentation does not establish sufficient regional coverage or reuse rights | Request a formal proposal and sample coverage before considering |
| Spoonacular | Recipe/food API with nutrition endpoints | Need explicit review of current commercial plan, nutrient provenance, caching, attribution and geographic coverage | Secondary candidate; not selected |

### Findings and source links

1. USDA states that FoodData Central is CC0/public domain. Its data-type documentation distinguishes analytically derived Foundation Foods from FNDDS compiled for foods/portions in dietary surveys and branded foods derived from label information. Foundation Foods is updated in April and October; branded data monthly. This makes USDA useful but not a uniform evidence class.  
   - [USDA API and licence](https://fdc.nal.usda.gov/api-guide/)  
   - [USDA data-type documentation](https://fdc.nal.usda.gov/data-documentation/)  
   - [USDA downloadable datasets](https://fdc.nal.usda.gov/download-datasets/)

2. The official UK publication page identifies CoFID 2021 and its user guide. It notes that some foods from older editions were not reviewed or validated in the 2015, 2019 or 2021 updates and are published separately as “old” foods. Records must retain that status.  
   - [UK CoFID publication and downloads](https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid)

3. EuroFIR describes access to multiple national food composition databases and warns that specific national licence agreements govern publication. EuroFIR membership is an access route, not a blanket licence to republish every national dataset.  
   - [EuroFIR database access](https://www.eurofir.org/food-information/how-to-access-fcdbs/)  
   - [EuroFIR database catalogue](https://www.eurofir.org/food-information/food-composition-databases/)  
   - [FoodEXplorer terms and publication conditions](https://www.eurofir.org/our-tools/foodexplorer/)

4. FAO/INFOODS identifies the 2019 FAO/INFOODS Food Composition Table for Western Africa as the successor to the 2012 West African table. Its Africa resources also list a Nigeria Food Database 2019. Obtain the exact files, technical documentation and reuse conditions before ingesting.  
   - [FAO/INFOODS Africa datasets](https://www.fao.org/infoods/infoods/tables-and-databases/africa/en/)  
   - [FAO/INFOODS West African archive](https://www.fao.org/infoods/infoods/tables-and-databases/west-africa-archives/en/)  
   - [FAO/INFOODS analytical food composition database](https://www.fao.org/infoods/infoods/tables-and-databases/faoinfoods-databases/en)

5. Edamam documents full recipe analysis and cooking-process adjustments. Its terms/pricing pages describe paid commercial plans, attribution, recipe-level licensing and restrictions on caching or storing API content. The exact plan contract must be reviewed; API access is not permission to build a mirror dataset.  
   - [Edamam Nutrition Analysis API](https://developer.edamam.com/edamam-docs-nutrition-api)  
   - [Edamam Nutrition Analysis plans and terms summary](https://developer.edamam.com/edamam-nutrition-api)  
   - [Edamam API Terms](https://developer.edamam.com/signup)

6. Nutritionix's developer portal states that its public free-access tier has ended and directs commercial/research/enterprise users to request a tailored trial. Obtain written confirmation of country/food coverage, pricing, retention and commercial display rights.  
   - [Nutritionix developer portal](https://developer.nutritionix.com/)

7. Spoonacular publishes API documentation, but documentation alone does not settle commercial caching, reuse or regional completeness. Those must be confirmed in the applicable plan and contract.  
   - [Spoonacular API documentation](https://spoonacular.com/food-api/docs)

### Recommended source strategy

**Do not select a single provider as the canonical global nutrition database.**

Use a source registry and source adapters:

1. Match the ingredient to the most specific applicable food record: identity, region, cultivar/type where relevant, processing and preparation state.
2. Prefer an applicable national/regional food composition dataset over a geographically distant generic match.
3. Retain source record IDs, dataset version, publication date, nutrient basis, method and licence metadata.
4. Use USDA Foundation Foods and FAO/INFOODS analytical datasets as strong candidates for analytical reference values where their food identity matches.
5. Use CoFID and national European datasets through individual adapters with their own freshness and licence status.
6. Treat commercial API results as licensed runtime results unless a contract explicitly grants durable storage and derivative-database rights.
7. If no defensible match exists, return “not available” or an incomplete result. Never silently substitute a generic food value.

### Ingredient calculation versus prepared-meal verification

A calculated recipe estimate is not a laboratory measurement of the cooked dish.

**Ingredient-derived calculation** should:
- Convert quantities to mass only when a valid conversion exists for that ingredient and preparation state.
- Sum nutrient contributions from matched ingredient records.
- Apply documented edible-portion, yield, retention and cooking factors only when evidence supports them.
- Record salt, stock, sauces, oils and discarded cooking liquid as explicit ingredients or process inputs.
- Divide by the declared number of portions only after calculating the whole recipe.
- Show completeness and uncertainty; unknown ingredients or unconvertible measures must reduce completeness, not become zero.

**Laboratory-verified prepared meal** should be a separate evidence class, linked to the analysed sample, laboratory/method, sampling conditions and prepared recipe version. It must never be conflated with a computed ingredient sum.

## 5. Clinical and food-identity classification

These categories must remain separate in storage, UI and safety logic:

- Allergy: potential immune-mediated harm; treat as a hard constraint and check ingredient aliases/derivatives.
- Intolerance: distinct from allergy; apply the user's declared avoidance rule without mislabelling it as an allergy.
- Medical dietary restriction: condition- or clinician-related constraint with provenance and review date.
- Religious restriction: user-declared requirement, not a medical diagnosis.
- Dislike: preference only; never generate a clinical warning.
- Voluntary preference: lifestyle/ethical preference; should not be treated as a medical prohibition.

The clinical guard is deterministic and must run after recipe generation and after every recipe adaptation. Unresolved allergen identity or ambiguous derivatives should block a confident “safe for you” claim. Ahuva should ask for clarification or clearly state that safety could not be confirmed.

## 6. Security, ownership and RLS assessment

### Required policies for future tables

- Enable RLS on every user-owned table.
- `SELECT`, `INSERT`, `UPDATE` and `DELETE` must be scoped to `auth.uid() = user_id`.
- Use explicit `WITH CHECK` on inserts and updates to prevent owner spoofing.
- Do not expose nutrition provider credentials or call provider APIs directly from the browser.
- Do not grant broad `service_role` access to the client.
- Validate all JSONB structures and numerical ranges server-side.
- Keep allergy and health-restriction data out of AI payloads unless separately approved, necessary and consented.
- Keep HEP-002's authentication, request bounds, fixed server-side rate limits and fail-closed external AI gate unchanged.
- No new route may call an external model while `SANCTOS_EXTERNAL_AI_APPROVED` is unset.
- Consent withdrawal must stop future preference-based processing and initiate the agreed deletion/retention workflow.

### HEP-002 boundary

The current Kitchen route remains protected by the existing approval gate. Stage 1 does not modify it or its rate-limit contract. The Stage 1 composer is a UI-only preview and must not transmit the entered message.

## 7. Migration and rollback plan

**No migration is included in Stage 1.** Before any database change:

1. Produce a reviewed SQL migration with explicit constraints, indexes, grants and RLS policies.
2. Validate it against a disposable PostgreSQL/Supabase environment.
3. Test two-user read/write isolation, owner spoofing, deletion and policy edge cases.
4. Test JSON schema evolution and session recovery.
5. Capture pre-migration schema state and a recovery/backup plan.
6. Apply additive changes only; do not rename/drop existing Kitchen or meal-log columns in the same release.
7. Verify production catalog state and RLS after a separately authorised release.

Rollback:
- Prefer a forward-fix for any migration that has accepted user data.
- For an additive table migration with no dependent writes, disable the feature path and drop only newly introduced objects after confirming no data needs preservation.
- Never roll back by weakening existing RLS or HEP-002 protections.
- No destructive rollback statement should be run without explicit approval.

## 8. Stage 1 implementation record

### Files changed on `feature/ahuva-stage-1`

- `src/components/AhuvaKitchen.tsx` — new Ahuva home, recipe discovery, recipe detail, serving adjustment, ingredient checklist, cooking steps and preview timer.
- `src/app/kitchen/page.tsx` — retains the authenticated Kitchen route and existing BottomNav, delegates the environment to Ahuva.

### Preserved

- Existing `/kitchen` URL.
- Existing Supabase authentication check and unauthenticated redirect.
- Existing Sanctos typography, colour tokens and bottom navigation component.
- Existing `/api/kitchen` route and HEP-002 protections (not modified).

### Deliberately not activated

- No external AI requests.
- No database writes or migrations.
- No persisted cooking sessions.
- No persistent timer service or background timer notifications.
- No saved recipes or feedback writes.
- No nutrient values in the illustrative recipes.
- No false microphone/listening state.

### Verification still required

- TypeScript and ESLint on the branch.
- Responsive browser checks at mobile, tablet and desktop breakpoints.
- Keyboard and screen-reader checks.
- Regression checks for the authenticated route and bottom navigation.
- Visual review against Sanctos design conventions.

The GitHub connector can commit source changes, but it does not provide a local browser/runtime in this execution context. Therefore, no local build or browser test is claimed as passed. Do not treat the Stage 1 preview as production-ready until CI and manual verification pass.

## 9. Outstanding risks and dependencies

1. **Nutrition data licensing:** FAO/INFOODS and national dataset reuse conditions need source-owner confirmation for commercial product use.
2. **Prepared meal accuracy:** recipe calculations need validated mass conversions, edible portions, yields and retention factors.
3. **Allergen taxonomy:** regional aliases, compound ingredients and derivatives need robust mapping.
4. **Preference consent:** consent wording, purpose limitation, withdrawal and retention need privacy review.
5. **AI provider approval:** remains a separate security, contractual, privacy and consent gate.
6. **Session persistence:** database-backed recovery and timestamp-derived timers are not yet implemented.
7. **Stage 1 runtime verification:** must be completed through CI and a controlled preview/browser test before the checkpoint can be marked passed.

## 10. Stage 1 exit criteria

Stage 1 may be presented to Argus when:
- UX blueprint and interaction inventory are reviewed.
- Schema proposal, migration/rollback plan and RLS design are reviewed.
- Nutrition source assessment and licensing risks are documented.
- The interface builds and passes responsive/accessibility smoke tests.
- Existing authentication and navigation remain intact.
- No production deployment, migration or external AI activation has occurred.

**Current disposition:** Architecture and source-code preview are prepared; runtime verification and Argus checkpoint review remain open.
