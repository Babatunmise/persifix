/**
 * Global food-reference identity and exact-match layer.
 *
 * This module contains no seeded foods, regional defaults, fuzzy matching,
 * nutrition calculations, substitutions, or allergy-safety conclusions.
 * Only verified records with approved source-use status are eligible to match.
 */
export type FoodSourceUseStatus = "approved" | "review_required" | "excluded";
export type FoodRecordStatus = "verified" | "pending_review" | "retired";
export type FoodAliasType =
  | "common_name"
  | "regional_name"
  | "transliteration"
  | "spelling_variant"
  | "scientific_name"
  | "former_name";

export type FoodSourceQualityStatus = "approved" | "review_required" | "excluded";
export type FoodSourceType = "ontology" | "food_composition_database" | "directory" | "curated_alias";

export type FoodReferenceSource = {
  id: string;
  name: string;
  datasetVersion: string;
  licence: string;
  sourceType?: FoodSourceType;
  qualityStatus?: FoodSourceQualityStatus;
  useStatus: FoodSourceUseStatus;
  attribution?: string;
  termsUrl?: string;
};

export type FoodSourceRecord = {
  sourceId: string;
  sourceRecordId: string;
};

export type FoodReferenceRecord = {
  id: string;
  canonicalName: string;
  scientificName?: string;
  foodGroup?: string;
  foodForm?: string;
  processingState?: string;
  preparationState?: string;
  sourceRecords: FoodSourceRecord[];
  status: FoodRecordStatus;
};

export type FoodReferenceAlias = {
  id: string;
  foodId: string;
  value: string;
  languageTag?: string;
  geographicScope?: string;
  aliasType: FoodAliasType;
  sourceId: string;
  sourceRecordId: string;
  synonymScope?: "exact" | "broad" | "narrow" | "related" | "unknown";
  status: FoodRecordStatus;
};

export type FoodReferenceIndex = {
  sources: readonly FoodReferenceSource[];
  foods: readonly FoodReferenceRecord[];
  aliases: readonly FoodReferenceAlias[];
};

export type FoodMatchCandidate = {
  food: FoodReferenceRecord;
  matchType: "canonical_name" | "alias";
  alias?: Pick<FoodReferenceAlias, "value" | "languageTag" | "geographicScope" | "aliasType" | "synonymScope">;
};

export type FoodMatchResult =
  | { status: "matched"; food: FoodReferenceRecord; match: FoodMatchCandidate }
  | { status: "ambiguous"; candidates: FoodMatchCandidate[] }
  | { status: "not_found" };

/**
 * Normalises Unicode compatibility forms, case and whitespace only.
 * Accents, punctuation and script are preserved to avoid unsafe collisions.
 */
export function normalizeFoodTerm(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function hasApprovedSource(
  sourceRecords: readonly FoodSourceRecord[],
  sourcesById: ReadonlyMap<string, FoodReferenceSource>,
): boolean {
  return sourceRecords.some(
    (record) => sourcesById.get(record.sourceId)?.useStatus === "approved",
  );
}

function isEligibleFood(
  food: FoodReferenceRecord,
  sourcesById: ReadonlyMap<string, FoodReferenceSource>,
): boolean {
  return food.status === "verified" && hasApprovedSource(food.sourceRecords, sourcesById);
}

/**
 * Resolves exact canonical names and explicitly curated aliases.
 *
 * Language and geographic metadata are returned for disambiguation; they
 * never create a hidden default or silently select one food over another.
 * Multiple food identities always produce an ambiguous result.
 */
export function resolveFoodTerm(
  query: string,
  index: FoodReferenceIndex,
): FoodMatchResult {
  const normalizedQuery = normalizeFoodTerm(query);
  if (!normalizedQuery) return { status: "not_found" };

  const sourcesById = new Map(index.sources.map((source) => [source.id, source]));
  const foodsById = new Map(index.foods.map((food) => [food.id, food]));
  const candidatesByFoodId = new Map<string, FoodMatchCandidate>();

  for (const food of index.foods) {
    if (
      normalizeFoodTerm(food.canonicalName) === normalizedQuery &&
      isEligibleFood(food, sourcesById)
    ) {
      candidatesByFoodId.set(food.id, { food, matchType: "canonical_name" });
    }
  }

  for (const alias of index.aliases) {
    if (
      alias.status !== "verified" ||
      (alias.synonymScope !== undefined && alias.synonymScope !== "exact") ||
      normalizeFoodTerm(alias.value) !== normalizedQuery ||
      sourcesById.get(alias.sourceId)?.useStatus !== "approved"
    ) {
      continue;
    }

    const food = foodsById.get(alias.foodId);
    if (!food || !isEligibleFood(food, sourcesById)) continue;

    if (!candidatesByFoodId.has(food.id)) {
      candidatesByFoodId.set(food.id, {
        food,
        matchType: "alias",
        alias: {
          value: alias.value,
          languageTag: alias.languageTag,
          geographicScope: alias.geographicScope,
          aliasType: alias.aliasType,
          synonymScope: alias.synonymScope,
        },
      });
    }
  }

  const candidates = [...candidatesByFoodId.values()];
  if (candidates.length === 0) return { status: "not_found" };
  if (candidates.length > 1) return { status: "ambiguous", candidates };

  const match = candidates[0];
  return { status: "matched", food: match.food, match };
}
