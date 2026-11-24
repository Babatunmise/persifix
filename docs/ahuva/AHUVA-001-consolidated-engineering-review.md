# AHUVA-001 — Consolidated Engineering Review (Interim)

**Specification owner:** Argus — Product Development  
**Engineering owner:** Hephaestus  
**Branch:** `feature/ahuva-definitive-realignment`  
**PR:** #7 — draft, not merged  
**Production:** No deployment performed  
**Database:** No migration applied  
**External AI:** Hard-disabled; no external AI calls  
**HEP-002:** Existing controls retained; HEP-002 validation workflow is being run against the branch.

This is a truthful interim report. The requested complete acceptance package is not yet complete. The remaining gaps and release gates are explicit below.

## A. Completed implementation

1. Removed the three static recipe examples and the discovery-feed entry point. Ahuva opens as a companion-led Kitchen experience.
2. Added four optional user-intent shortcuts: known meal, use available ingredients, improve an existing meal, and prepare something.
3. Added a user-directed preparation plan, Plate Prep checklist, guided cooking steps, progress, timer controls and completion feedback.
4. Added same-device recovery of an unfinished task. This is still a browser-local preview, not server persistence or cross-device recovery.
5. Extracted Pot Math into a deterministic, independently testable module.
6. Added supported mass/volume conversions, decimal and simple fraction quantities, unitless counts, bounded positive serving ratios, and safe handling of malformed/unsupported quantities.
7. Avoided mass-to-volume conversion without a food-specific density record. Generic “cup” is deliberately treated as ambiguous; explicit US cup and metric cup units are supported.
8. Flagged salt, seasoning, spices, leaveners and thickeners for manual review instead of blindly scaling them.
9. Removed the old kitchen API's sodium dictionary and its fabricated 100 mg fallback. The endpoint now authenticates and applies the existing shared HEP-002 rate limit, then returns 503 without transmitting the request to an AI provider, regardless of environment-variable state.
10. Added an Ahuva verification workflow for Pot Math tests, TypeScript, ESLint and production build.
11. Added the proposed schema/RLS SQL as a review document only. It is not under the executable Supabase migrations directory.

## B. Primary screens and demonstration

The branch contains the following routes and component states:

- Home: `/ahuva`
- Companion interaction preview
- Food preparation plan
- Pot Math
- Plate Prep
- Cooking Workspace
- Completion
- Returning experience / same-device recovery

The current demonstration is an interaction prototype. The companion does not yet understand or answer natural-language requests. The interface states this clearly and does not invent responses. The primary screen states are implemented in `src/components/AhuvaKitchen.tsx`.

Screenshots and authenticated browser-based demonstrations have **not** yet been captured. A branch preview deployment is READY for commit 41b4857; the newest navigation correction is building in a newer preview. The preview requires the project's normal access controls. No production URL should be used as evidence of this branch's runtime.

## C. Database schema and migration plan

The live database was inspected. It currently has the existing Sanctos tables (including profiles, meal_logs, workout_logs, medications and BP readings), but no Ahuva-specific cooking-session, preference, pantry, constraint or nutrition-reference tables. The live migration history contains HEP-002 migrations only.

Proposed schema file:
`docs/ahuva/AHUVA-001-schema-proposal.sql`

It defines:
- global food identities, locale/region aliases and sourced allergen-group/derivative/cross-contact links;
- versioned nutrition sources, nutrient definitions, food nutrient records and portion evidence;
- explicit unit definitions, aliases and conversion factors;
- user preferences and preference items;
- distinct user constraints for allergy, intolerance, medical restriction, religious restriction, dislike and voluntary preference;
- pantry items;
- cooking sessions, structured ingredients, steps and timestamp-backed timers;
- saved meals and optional cooking feedback;
- nutrition calculation records and provenance-bearing calculation items.

The design uses owner UUIDs, composite session/user foreign keys, RLS on every table, owner checks on every user-owned operation, and read-only authenticated access to approved global reference data.

**Migration state:** no migration has been created in `supabase/migrations`, and no DDL has been applied. The SQL file is a review proposal. After Argus approves it, engineering must create versioned migrations using the Supabase CLI, apply first to a disposable/staging environment, validate schema and RLS, obtain explicit production migration approval, and only then schedule production execution.

**Rollback:** disable the Ahuva persistence path first; use forward-fixes once user records exist. Drop only unused additive objects after confirming no dependent data. Never remove or weaken HEP-002 controls.

## D. RLS and security

### Design controls in the proposal
- User-owned tables: `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE.
- UPDATE policies include both `USING` and `WITH CHECK`.
- Child rows carry `user_id` and use composite foreign keys to prevent cross-user session attachment.
- Global food/nutrition/unit tables: RLS enabled, authenticated SELECT only; write paths remain privileged ingestion operations.
- Nutrition calculation items are owner-readable through their parent calculation; client-side inserts are not granted.
- Provider credentials remain server-side.
- Allergy and health data are not sent to an external AI provider.
- Medication records are not used for interaction advice.
- Legacy kitchen endpoint now fails closed while preserving request authentication and shared rate limiting.

### Test status
Two-user isolation, owner spoofing, child-row cross-linking, anonymous access, and deletion/consent-withdrawal tests cannot run before the schema is approved and applied to an isolated test database. They are not claimed as passed.

HEP-002 validation run #66 completed successfully: isolated PostgreSQL migration/RPC tests, atomic rate-limit concurrency tests, changed-file TypeScript and production build all passed. A separate Ahuva workflow run passed all 10 Pot Math tests and TypeScript, then failed at its first whole-repository ESLint step. The output identified pre-existing lint errors in unrelated Gym/Home pages and two Ahuva-specific React rules (impure Date.now initial state and synchronous hydration setState). The Ahuva hydration/clock code has since been corrected and the workflow now scopes ESLint to changed Ahuva surfaces; that scoped workflow result is still pending. Vercel preview deployment for commit 41b4857 is READY after compilation, TypeScript and static page generation; the latest navigation correction is building in a newer preview deployment.

## E. Nutrition-source evaluation

| Source | Coverage/value | Reuse/licensing position | Proposed role |
|---|---|---|---|
| FAO/INFOODS WAFCT 2019 | Regional table covering West African countries including Nigeria; improved food/component coverage, with many values analytical and Africa-focused | Publicly downloadable files; dataset-specific reuse/redistribution terms still need confirmation before ingestion | Primary regional candidate |
| Nigeria Food Database 2019 / Nigeria Food Composition Table 2017 | Nationally relevant sources listed by FAO/INFOODS; the 2017 table is also referenced in published Nigerian dietary-assessment work | Direct availability, source ownership and commercial redistribution terms need confirmation | Preferred national source after permission and data-quality review |
| USDA FoodData Central | Broad international generic-food coverage; Foundation Foods, FNDDS, Branded Foods and legacy records have different evidence types | CC0 public domain; API key required, published rate limit applies | Strong global fallback, not a substitute for regional food matching |
| UK CoFID 2021 | Consolidated UK food composition dataset; some older foods were not re-reviewed in later updates | GOV.UK page states OGL v3.0 except where otherwise stated; attribution required | UK-specific regional adapter |
| EuroFIR / national tables | Access to multiple national food composition databases and harmonised descriptors | Membership and individual dataset licensing vary | Later country-specific expansion |
| FAO/INFOODS Density Database v2 | Evidence base for food-specific volume-to-mass conversions | Use only with record-level provenance and applicability checks | Conversion evidence; never a generic density guess |

FAO/INFOODS lists WAFCT 2019 and explains its improved West African coverage and analytical emphasis. It also publishes a separate density database for volume/weight conversion. The Nigeria Food Database 2019 is listed in FAO/INFOODS' Africa directory, but a directory listing is not sufficient evidence of commercial reuse rights. A published myfood24 West Africa study reports 924 Nigerian food/drink items sourced from WAFCT 2019, packaged-food labels, Nigeria's 2017 food composition table, mixed dishes and literature; this supports the value of regional data, but does not itself grant Sanctos a licence to reuse the assembled database.


### Source references and licensing checks

- USDA FoodData Central data types, downloads and CC0 statement: https://fdc.nal.usda.gov/data-documentation/ and https://fdc.nal.usda.gov/download-datasets/ and https://fdc.nal.usda.gov/api-guide/
- FAO/INFOODS WAFCT 2019, density database and analytical database catalogue: https://www.fao.org/infoods/infoods/tables-and-databases/faoinfoods-databases/en
- FAO/INFOODS Africa directory listing Nigeria Food Database 2019: https://www.fao.org/infoods/infoods/tables-and-databases/africa/en
- Nigeria dietary assessment study describing the myfood24 West Africa database and its mixed source composition: https://pmc.ncbi.nlm.nih.gov/articles/PMC11509910/
- UK CoFID 2021 publication and Open Government Licence notice: https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
- EuroFIR database access and membership information: https://www.eurofir.org/food-information/how-to-access-fcdbs/
- FAO dataset terms, attribution and third-party exceptions: https://www.fao.org/contact-us/terms/db-terms-of-use/en

FAO's general database terms must not be treated as a blanket licence for every source file hosted or indexed by FAO. Confirm the licence and reuse rights of each underlying dataset and third-party contribution before copying or redistributing it.

### Deterministic nutrition method

1. Resolve the food to a canonical identity using exact name, locale/region aliases, variety and preparation state. Do not silently map a local food to a superficially similar foreign food.
2. Require a source record with dataset version, nutrient definition, basis and source-specific method.
3. Convert recipe quantities to edible mass only where a direct mass unit or a validated food-specific portion/density conversion exists.
4. Apply edible-portion, yield and nutrient-retention factors only when supported for that food and preparation method.
5. Calculate ingredient nutrient contribution on a consistent basis, aggregate compatible values, then divide by the declared number of servings.
6. Keep unavailable nutrients unknown. Do not convert missing values to zero, use a generic fallback, or claim a laboratory measurement of the cooked meal.
7. Return per-nutrient source provenance, quantity basis, method version, completeness and categorical evidence/confidence.
8. If the food match, unit conversion, preparation state or recipe yield is not defensible, mark the result incomplete/unknown rather than fabricate a total.

No provider has been integrated or licensed. No nutrition calculations are active in Ahuva.

## Clinical Guard design

The schema now distinguishes user-declared allergy, intolerance, medical restriction, religious restriction, dislike and voluntary preference records. It also models allergen groups and sourced ingredient relationships including contains, derived-from, may-contain and cross-contact-risk evidence.

Clinical Guard must:
- Treat an allergy as a hard constraint, never as a preference.
- Check canonical food identity, regional aliases, derivatives and approved allergen evidence after plan creation and after every adaptation.
- Treat missing or ambiguous ingredient identity, incomplete source coverage and unknown cross-contact status as **not verified**, never as safe.
- Keep intolerance, medical restrictions, religious restrictions, dislikes and voluntary preferences as separate rule classes with different messaging and decision logic.
- Never let an AI response override a deterministic allergy block.
- Avoid using medication records for interaction advice and never recommend changes to prescribed medication.
- Avoid sending health/allergy records to external AI while the approval gate remains closed.

This is the approved design direction, not a completed clinical validation engine. Clinical and nutrition review is still required before the safeguards can be called clinically verified.

## AI integration architecture (prepared, not enabled)

The intended adapter boundary is server-side only: authenticated task context → data-minimised request builder → provider adapter → strict structured-output parser → deterministic schema and safety validation → user-confirmed plan. Provider selection, contract, retention, privacy, consent, data residency, logging and output validation remain approval gates. No provider is called, no provider secret is required by this branch, and the existing external AI gate remains disabled.

## F. Functional and accessibility verification

### Pot Math tests
A local Node test run of the exact extracted Pot Math module passed **10/10** test cases:
- unitless counts;
- fractional quantities;
- mass conversion;
- volume conversion;
- explicitly identified US cup conversion;
- ambiguous cup rejection;
- non-linear ingredient review flags;
- unsupported unit handling;
- invalid ratio/quantity handling;
- no mass-to-volume conversion by assumed density.

The committed test file is `src/lib/ahuva-pot-math.test.mjs`; command: `npm run test:ahuva`.

### CI
A GitHub Actions workflow has been added to run:
- `npm ci`
- Pot Math tests
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

The Ahuva workflow and HEP-002 validation were observed running after the workflow commit. Their final outcomes must be added after completion.

### Not yet verified
- Full authenticated browser journey;
- Cross-device session recovery after the approved schema and API implementation;
- Clinical Guard rule tests against sourced derivatives, may-contain and cross-contact records;
- small-screen/tablet/desktop visual review;
- keyboard-only navigation and focus visibility;
- screen-reader announcement order and control names;
- timer recovery after refresh, device sleep and cross-device resume;
- server-side persistence, RLS isolation and deletion tests;
- clinical/allergen negative tests.

No screenshots or accessibility pass are claimed.

## G. Remaining blockers

1. Argus review of the schema proposal and RLS model.
2. Disposable Supabase test environment and approved migration.
3. Server-side session CRUD and cross-device recovery.
4. Structured ingredient editor and complete locale-aware unit catalog.
5. Expanded Pot Math rules and culinary review for non-linear ingredients.
6. Ingredient ontology, aliases, derivatives, cross-contact and structured allergy/restriction rules.
7. Nutrition source permissions, ingestion plan and regional data quality review.
8. Deterministic nutrition calculation engine and provenance display.
9. Clinical Guard validation by qualified clinical/nutrition reviewers.
10. AI provider, privacy, contract, consent, retention and output-validation review; external AI remains disabled.
11. Responsive browser screenshots, functional and accessibility results.
12. Argus product acceptance and separate production release approval.

## H. Recommended next milestone

**AHUVA-002 — Persistent Core & Safety Foundation**

Sequence:
1. Argus reviews and approves the proposed schema and retention model.
2. Create a versioned migration; validate it in a disposable Supabase environment only.
3. Run RLS tests with two distinct authenticated users and an anonymous role.
4. Implement authenticated server-side cooking-session CRUD and timer recovery using user-scoped Supabase access.
5. Add structured ingredient and constraint records with deterministic Clinical Guard checks.
6. Expand Pot Math tests with locale-specific units and cooking edge cases.
7. Complete responsive/browser/accessibility verification and attach screenshots.
8. Submit the final consolidated report before any production migration or deployment request.

**Release decision:** Not ready for merge or production. Continue on the feature branch; keep external AI disabled, database unchanged and HEP-002 protections intact.
