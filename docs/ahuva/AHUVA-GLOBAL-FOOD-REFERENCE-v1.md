# Ahuva Global Food Reference & Matching — v1

**Status:** Engineering specification  
**Scope:** Global food identity and ingredient matching for Sanctos Kitchen  
**Authority:** This specification supersedes any region-first prioritisation in earlier Ahuva architecture notes.  
**External AI:** Not required; approval gate remains closed.  
**Database:** No schema changes authorised.  
**Nutrition / clinical claims:** Not enabled by this specification.

## 1. Product requirement

Ahuva is a global product for people across countries, cultures, languages and food traditions. The food-reference system must not assume a home country, default cuisine, dominant language or regional food supply.

Every cuisine and food tradition is supported through the same data model and quality requirements. Coverage may vary according to verified source availability, but the architecture must not privilege one geography as the product's baseline.

The founder's location must never be used to choose default foods, examples, aliases, datasets, terminology or product behaviour.

## 2. Core identity model

Keep these concepts distinct:

- **Food identity:** the underlying food or ingredient.
- **Canonical name:** the stable display/reference name selected for one food record.
- **Alias:** a verified alternate name, spelling, transliteration or language-specific name that refers to the same food identity.
- **Food form:** a meaningful physical form such as whole, ground, flour, paste or extract.
- **Processing state:** a meaningful state such as fresh, dried, frozen, canned or fermented.
- **Preparation state:** a state such as raw, boiled, roasted or baked when it changes the reference needed.
- **Dish / recipe:** a preparation composed of ingredients; it is not an ingredient identity.
- **Branded product:** a manufacturer-specific item; it must not be conflated with a generic food.

A different name does not automatically mean a different food. Conversely, similar names do not prove two foods are identical. Identity decisions require source-backed evidence.

## 3. Reference record requirements

### Food record

Each canonical food record should support:

- Stable internal ID.
- Canonical display name.
- Scientific name or taxonomic identifier where applicable.
- Food group / classification.
- Food form, processing state and preparation state where relevant.
- One or more source references.
- Verification status and review history.

### Alias record

Each alias should support:

- Stable alias ID and canonical food ID.
- Alias text exactly as sourced.
- Language tag using BCP 47 where known.
- Geographic or community scope where evidenced; never inferred from the user's location.
- Alias type: common name, regional name, transliteration, spelling variant, scientific name or former name.
- Source ID and source-record identifier.
- Verification status.

Do not use an alias without provenance. Do not automatically translate a food name and treat the translation as a verified synonym.

### Source registry

Each source must retain:

- Publisher / provider and dataset title.
- Dataset version and source record ID.
- Licence and terms URL.
- Attribution requirements.
- Permitted use: internal matching, user display, commercial use, derivative works and caching/storage.
- Review status, retrieval date and update history.

A source that is awaiting licence review must not be used as a production data source. API availability is not permission to copy or republish a provider's database.

## 4. Matching contract

The first resolver is deliberately deterministic:

1. Normalise Unicode compatibility forms, case and repeated whitespace.
2. Match exact canonical names and explicitly verified aliases only.
3. Exclude unverified, retired or unlicensed records.
4. If exactly one canonical food identity matches, return it.
5. If more than one identity matches, return an ambiguous result and request clarification.
6. If no identity matches, return not found; do not guess or silently substitute.

Language and geographic metadata may help explain candidates to a user. They must not silently resolve collisions or establish a default cuisine.

Fuzzy matching, transliteration generation, spelling correction, semantic search and AI-assisted entity resolution are future capabilities. Each requires confidence thresholds, evaluation data, collision handling and user confirmation rules before production use.

## 5. Ingredient inventory boundary

Food identity matching may help recognise two verified names for the same ingredient. It must not infer that the user owns a different form, quantity or preparation state.

A match between two names does not establish that fresh, dried, powdered, canned or prepared forms are interchangeable. Inventory confirmation remains explicit. Ahuva's Way and Your Way must use the same confirmed inventory; additions remain clearly labelled and require user approval.

Substitution is a separate decision. It requires evidence about culinary function, form, quantity, preparation and user constraints. A name match alone is never substitution evidence.

## 6. Global coverage and data governance

- Design for all languages, scripts, cuisines and food traditions from the beginning.
- Add coverage based on verified datasets and transparent evidence, not founder geography or assumed market priority.
- Use adapters for independent national, regional, scientific and commercial sources; do not let any one source define the global ontology.
- Preserve original source names and language metadata alongside canonical display names.
- Support multiple aliases for one food and collisions where one alias maps to multiple foods.
- Record gaps explicitly. No claim of comprehensive global coverage until measured against a published coverage evaluation.
- Review source rights before ingestion, caching, display or commercial reuse.
- Keep food identity, nutrition composition, portions, recipe calculations and clinical safety as separate data domains.

No food records or aliases are seeded by this specification. Starter data may be added only when the source, record identity, version, licence and attribution have been reviewed.

## 7. Safety boundaries

This layer does not:
- Calculate nutrients.
- Infer allergen absence or declare a meal safe.
- Diagnose or interpret medical dietary restrictions.
- Treat dislikes, voluntary preferences, religious restrictions, intolerances and allergies as equivalent.
- Recommend substitutions without a separate evidence-backed function.
- Call an external AI provider.

Allergy and derivative checks require a separately reviewed taxonomy and deterministic guard. Unknown or ambiguous identity must remain unknown.

## 8. Source evaluation and initial adapter

### FoodOn evaluation

FoodOn is selected as a candidate global identity/classification backbone, not as a complete food database or a sole source of truth. Its stated scope covers generic raw and processed food materials, and its repository describes integration of food material, taxonomy, processing and related concepts. The ontology repository declares CC BY 4.0. The current release and dependency-level provenance must still be pinned and reviewed before publication; imported ontology dependencies and third-party cross-references must not be assumed to share the same licence.

FoodOn's table tooling can expose term IDs, English labels, taxonomy, characteristics, cross-references, synonyms and definitions. Its documented synonym export combines `hasSynonym` and `hasExactSynonym`; therefore, a flattened synonym list does not prove exact identity. Only scope-aware, explicitly exact synonyms can be considered for later alias verification. Broad, narrow, related or unknown synonyms remain non-matchable pending review.

FoodOn's curation guidance notes that labels are generally singular and English-oriented; plural recognition is expected to be handled by external resources. Ahuva must not treat FoodOn as multilingual coverage. Language-tagged aliases must come from sources that explicitly provide language metadata or from separately reviewed curation.

### Source separation

- FoodOn: candidate identity, classification and food-form concepts.
- FAO/INFOODS directory: discovery of food-composition datasets, not a dataset itself and not an endorsement of listed resources.
- Food-composition adapters: independently evaluated sources with nutrient values, units, analytical methods, food identifiers, portions and publication/update metadata.
- A dataset may be useful for identity mapping without being licensed or sufficiently documented for nutrition calculations.

Every food-composition source must be assessed using the FAO/INFOODS Evaluation Framework: documentation, food coverage, food identification, component/value coverage and expression, data quality and compilation checks, public access, and publication/update frequency. This is a source-quality gate, not a clinical validation by itself.

### Import pipeline

1. Pin a source release/version and retain its licence, attribution, terms and provenance.
2. Parse source terms into a staging format; retain source term IDs and original labels.
3. Map terms to internal stable food IDs without changing the source identifier.
4. Stage all imported food records and aliases as `pending_review`.
5. Validate source rights, required provenance, unique IDs, language tags, orphan aliases and ambiguous name collisions.
6. Keep non-exact or scope-unknown synonyms non-matchable. Do not infer language from geography.
7. Independently review identity, form, processing state and alias semantics before marking records verified.
8. Publish only reviewed records from approved sources; preserve attribution and source-version history.

No bulk import is authorised by this specification. The first implementation is a review-only adapter and validation pipeline.

## 9. Initial implementation

The new food-reference module provides:
- Global, region-neutral types for sources, foods and aliases.
- Exact canonical-name and verified-alias matching.
- Licence-aware eligibility.
- Explicit ambiguous and not-found results.
- No seeded food catalogue and no regional defaults.\n\n`src/lib/kitchen/food-reference-import.ts` adds a review-only FoodOn mapping adapter and import validator. Imported terms remain pending review; unapproved source rights, missing provenance, invalid language tags, orphan aliases and unreviewed verified records are rejected. The adapter does not ingest or publish FoodOn data.

This is a foundation, not a complete food database or production nutrition engine.

## 9. Acceptance criteria

- No country or cuisine is assumed as the default.
- All aliases have language / scope metadata where known and source provenance.
- Unverified or unlicensed records cannot resolve.
- Multiple food identities produce ambiguity, never an arbitrary winner.
- Unknown terms remain not found.
- Ingredient identity is not confused with inventory, substitution or nutrition.
- No external AI, database migration or clinical claim is introduced.
- The user interface uses globally neutral prompts rather than country-specific sample meals.\n- FoodOn is treated as an identity backbone candidate, not as multilingual or nutrient-complete coverage.\n- Import candidates remain pending review and cannot resolve until source rights and record identity are approved.\n- Only explicitly exact, reviewed synonyms can later become matchable aliases.
