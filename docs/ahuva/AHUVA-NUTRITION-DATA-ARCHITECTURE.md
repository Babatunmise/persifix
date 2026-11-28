# Ahuva Nutrition Data Architecture — Discovery and Proposed Standard

**Status:** Research-backed proposal; not an implementation or clinical approval  
**Scope:** Establish the data and calculation foundations required before Ahuva may display quantitative meal nutrition.

## Executive finding

There is no single comprehensive global food-composition database that can safely represent every food, variety, preparation state and packaged product used by a global audience. FAO explains that food-composition data should be developed at country or regional level and maintains a directory of national, regional and international tables. FAO/INFOODS explicitly recommends evaluating the quality of each table for its intended use.

Therefore, Ahuva should not treat one country's database as universally representative.

## Proposed source strategy

### 1. Global reference baseline

Evaluate USDA FoodData Central as one high-quality reference source for generic foods and branded products:
- Its data are public domain under CC0 1.0, with source attribution requested.
- Its API supports search and food-detail retrieval.
- It is a US-maintained source. It must not be treated as a universal substitute for regionally relevant foods, varieties or preparation methods.
- Prefer controlled, versioned ingestion of reviewed records over depending on a live third-party API call for every meal analysis.

### 2. Regional and national sources

Use the FAO/INFOODS global directory to identify appropriate national/regional tables for foods not adequately represented in the baseline. Each source requires an individual review of:
- Scientific and sampling quality, date and geographic relevance.
- Food naming, species/variety, edible portion and preparation state.
- Nutrient coverage, analytical method, units and missing-value conventions.
- Reuse, redistribution, derivative database and commercial licensing permissions.
- Required attribution and any share-alike obligations.

The FAO/INFOODS directory is a discovery catalogue, not a blanket data licence or endorsement. Do not import a table until its underlying rights and source quality are checked.

### 3. Packaged foods

For packaged products, prefer the actual product nutrition label supplied or confirmed by the user, including serving size and declared sodium, saturated fat, fibre, sugars and other available nutrients. Keep label-derived data distinct from analytical composition data. Product names alone are not enough to infer a formulation.

## Canonical data model requirements

Every food record must retain:
- Stable internal food ID and canonical name.
- User-facing aliases and language variants.
- Food group, species/variety where relevant, and processing state.
- Raw/cooked/dried/canned/smoked/fortified form as appropriate.
- Edible portion and preparation/retention factors where validated.
- Nutrient values per 100 g edible portion, with units.
- Source organisation, source record ID, table edition/version, publication date and retrieval date.
- Original analytical/label/derived status and method.
- Missing-value reason; a missing nutrient must never be silently converted to zero.
- Licence identifier, attribution text and redistribution restrictions.
- Quality/review status and reviewer/version history.

## Deterministic calculation requirements

1. Convert a confirmed ingredient quantity to grams only when a validated density, household-measure or edible-portion conversion exists. Otherwise ask for a better quantity or mark the calculation unavailable.
2. Resolve each ingredient to a sufficiently specific canonical food record. If multiple materially different matches remain, ask the user to clarify.
3. Calculate nutrient contribution from the selected record and confirmed edible quantity using deterministic arithmetic.
4. Apply only reviewed and sourced cooking-yield or nutrient-retention factors. Never assume all cooking methods preserve nutrients identically.
5. Sum compatible nutrient contributions across the meal.
6. Divide by actual prepared portions, then calculate the user's intake only after the user confirms how much they consumed. Intended servings are not proof of consumption.
7. Keep measured, label-derived, database-derived and estimated values distinguishable.
8. Do not show a complete meal total if a material ingredient or quantity remains unresolved. Show a partial, explicitly scoped result only where it cannot mislead.
9. Store calculation provenance so a displayed value can be reproduced from source records, quantities, factors and engine version.

## Initial nutrient scope

Prioritise:
- Energy
- Protein
- Total carbohydrate
- Dietary fibre
- Total fat
- Saturated fat
- Sodium

Add sugars, potassium and micronutrients only where source coverage and clinical use are sufficiently reliable. Avoid individual potassium, fluid or protein targets without appropriate health context and clinical safeguards.

## User experience rules

- Ahuva asks for quantities in familiar household measures first; it should not demand grams as the default.
- Ask only one clarification at a time when the answer materially changes the estimate.
- If a quantity or food match cannot be resolved, explain exactly what is unknown.
- Never imply that a database average is the user's exact meal.
- Distinguish the meal prepared, the portion served and the amount consumed.
- No guilt, food blocking or moral labels.

## Validation gates

Before quantitative meal analysis is approved:
- A nutrition professional reviews source selection, food mappings and nutrient scope.
- Data licensing is documented for every source and derivative dataset.
- Unit conversions, portion logic and missing-data handling have automated tests.
- Representative foods and meals are checked against independent source calculations.
- Edge cases include branded labels, composite foods, oils, seasonings, cooking yield, recipe leftovers and unequal portions.
- A versioned evidence record and audit trail are available.
- UI language has been reviewed to avoid presenting estimates as measurements or individual clinical predictions.

## Current recommendation

Build the data model and calculation engine around a **source-neutral, versioned food-composition layer**, with USDA FoodData Central as one possible CC0 reference and FAO/INFOODS-discovered regional tables added only after rights and quality review. Do not commit to a single global database or launch quantitative nutrition claims until the coverage and validation gates are met.

## Research references

- FAO Food Composition: https://www.fao.org/food-composition
- FAO/INFOODS tables and databases directory: https://www.fao.org/food-composition/tables-and-databases/
- FAO/INFOODS evaluation framework, linked from the FAO Food Composition resources page.
- USDA FoodData Central API guide and CC0 licensing: https://fdc.nal.usda.gov/api-guide/

