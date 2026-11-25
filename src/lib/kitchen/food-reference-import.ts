import type {
  FoodAliasType,
  FoodReferenceAlias,
  FoodReferenceRecord,
  FoodReferenceSource,
} from "@/lib/kitchen/food-reference";

export type FoodOnSynonymScope = "exact" | "broad" | "narrow" | "related" | "unknown";

export type FoodOnSynonymInput = {
  value: string;
  scope: FoodOnSynonymScope;
};

export type FoodOnTermInput = {
  id: string;
  label: string;
  definition?: string;
  synonyms?: readonly FoodOnSynonymInput[];
  isFoodMaterial?: boolean;
  isFoodProduct?: boolean;
};

export type FoodOnImportCandidate = {
  food: FoodReferenceRecord;
  aliases: FoodReferenceAlias[];
  sourceNotes: {
    ontologyTermId: string;
    definition?: string;
    sourceLabel: string;
    importedAt: string;
    reviewRequired: true;
  };
};

export type FoodImportIssueCode =
  | "source_not_registered"
  | "source_not_approved"
  | "missing_dataset_version"
  | "missing_licence"
  | "missing_attribution"
  | "invalid_source_record"
  | "invalid_food_id"
  | "invalid_canonical_name"
  | "invalid_alias"
  | "invalid_language_tag"
  | "duplicate_food_id"
  | "duplicate_alias_id"
  | "orphan_alias"
  | "unreviewed_food_marked_verified"
  | "unreviewed_alias_marked_verified"
  | "non_exact_synonym_marked_verified"
  | "canonical_name_collision"
  | "alias_collision";

export type FoodImportIssue = {
  severity: "error" | "warning";
  code: FoodImportIssueCode;
  recordId?: string;
  message: string;
};

export type FoodImportBatch = {
  sourceId: string;
  foods: readonly FoodReferenceRecord[];
  aliases: readonly FoodReferenceAlias[];
};

export type FoodImportValidation = {
  ok: boolean;
  errors: FoodImportIssue[];
  warnings: FoodImportIssue[];
};

const FOODON_ID_PATTERN = /^https?:\/\/purl\.obolibrary\.org\/obo\/FOODON_\d{7,}$/;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validLanguageTag(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Maps a FoodOn term into a review-only candidate.
 * A source parser must preserve synonym scope; flattened synonym exports
 * cannot safely be promoted to exact aliases.
 */
export function mapFoodOnTermToCandidate(
  term: FoodOnTermInput,
  source: FoodReferenceSource,
  internalFoodId: string,
  importedAt: string,
): FoodOnImportCandidate {
  if (!FOODON_ID_PATTERN.test(term.id)) {
    throw new Error("FoodOn term must use a stable FOODON ontology identifier.");
  }
  if (!nonEmpty(internalFoodId)) {
    throw new Error("An internal food identifier is required.");
  }

  const aliases: FoodReferenceAlias[] = (term.synonyms ?? []).map((synonym, index) => ({
    id: `${internalFoodId}:foodon-synonym:${index + 1}`,
    foodId: internalFoodId,
    value: synonym.value,
    languageTag: "en",
    aliasType: "common_name" satisfies FoodAliasType,
    sourceId: source.id,
    sourceRecordId: term.id,
    synonymScope: synonym.scope,
    status: "pending_review",
  }));

  return {
    food: {
      id: internalFoodId,
      canonicalName: term.label,
      sourceRecords: [{ sourceId: source.id, sourceRecordId: term.id }],
      status: "pending_review",
    },
    aliases,
    sourceNotes: {
      ontologyTermId: term.id,
      ...(term.definition ? { definition: term.definition } : {}),
      sourceLabel: term.label,
      importedAt,
      reviewRequired: true,
    },
  };
}

/**
 * Validates a staged import before any record can enter the searchable index.
 * Imported records must remain pending review until independently verified.
 */
export function validateFoodImportBatch(
  batch: FoodImportBatch,
  sources: readonly FoodReferenceSource[],
): FoodImportValidation {
  const errors: FoodImportIssue[] = [];
  const warnings: FoodImportIssue[] = [];
  const source = sources.find((item) => item.id === batch.sourceId);

  if (!source) {
    errors.push({ severity: "error", code: "source_not_registered", message: "The import source is not registered." });
  } else {
    if (source.useStatus !== "approved") {
      errors.push({ severity: "error", code: "source_not_approved", message: "Source rights must be approved before import publication." });
    }
    if (!nonEmpty(source.datasetVersion)) {
      errors.push({ severity: "error", code: "missing_dataset_version", message: "The source dataset version is required." });
    }
    if (!nonEmpty(source.licence)) {
      errors.push({ severity: "error", code: "missing_licence", message: "The source licence is required." });
    }
    if (!nonEmpty(source.attribution)) {
      errors.push({ severity: "error", code: "missing_attribution", message: "Source attribution text is required." });
    }
  }

  const foodIds = new Set<string>();
  const foodNames = new Map<string, string>();
  for (const food of batch.foods) {
    if (!nonEmpty(food.id)) {
      errors.push({ severity: "error", code: "invalid_food_id", message: "Food ID is required." });
    } else if (foodIds.has(food.id)) {
      errors.push({ severity: "error", code: "duplicate_food_id", recordId: food.id, message: "Food IDs must be unique within an import batch." });
    }
    if (nonEmpty(food.id)) foodIds.add(food.id);

    if (!nonEmpty(food.canonicalName)) {
      errors.push({ severity: "error", code: "invalid_canonical_name", recordId: food.id, message: "Canonical food name is required." });
    } else {
      const normalized = normalize(food.canonicalName);
      const priorId = foodNames.get(normalized);
      if (priorId && priorId !== food.id) {
        warnings.push({ severity: "warning", code: "canonical_name_collision", recordId: food.id, message: `Canonical name collides with food record ${priorId}; review identity before publication.` });
      } else {
        foodNames.set(normalized, food.id);
      }
    }

    const sourceRecords = Array.isArray(food.sourceRecords) ? food.sourceRecords : [];
    if (!sourceRecords.some((record) =>
      record?.sourceId === batch.sourceId && nonEmpty(record?.sourceRecordId)
    )) {
      errors.push({ severity: "error", code: "invalid_source_record", recordId: food.id, message: "Food must retain a source record identifier for this import." });
    }
    if (food.status === "verified") {
      errors.push({ severity: "error", code: "unreviewed_food_marked_verified", recordId: food.id, message: "Imported foods must remain pending review until independently verified." });
    }
  }

  const aliasIds = new Set<string>();
  const aliasNames = new Map<string, string>();
  for (const alias of batch.aliases) {
    if (!nonEmpty(alias.id)) {
      errors.push({ severity: "error", code: "invalid_alias", message: "Alias ID is required." });
    } else if (aliasIds.has(alias.id)) {
      errors.push({ severity: "error", code: "duplicate_alias_id", recordId: alias.id, message: "Alias IDs must be unique within an import batch." });
    }
    if (nonEmpty(alias.id)) aliasIds.add(alias.id);

    if (!foodIds.has(alias.foodId)) {
      errors.push({ severity: "error", code: "orphan_alias", recordId: alias.id, message: "Alias points to a food record outside this import batch." });
    }
    if (!nonEmpty(alias.value) || !nonEmpty(alias.sourceRecordId) || alias.sourceId !== batch.sourceId) {
      errors.push({ severity: "error", code: "invalid_alias", recordId: alias.id, message: "Alias text and matching source provenance are required." });
    } else {
      const normalized = normalize(alias.value);
      const priorFoodId = aliasNames.get(normalized);
      if (priorFoodId && priorFoodId !== alias.foodId) {
        warnings.push({ severity: "warning", code: "alias_collision", recordId: alias.id, message: `Alias collides across food identities ${priorFoodId} and ${alias.foodId}; retain ambiguity for review.` });
      } else {
        aliasNames.set(normalized, alias.foodId);
      }
    }
    if (alias.languageTag && !validLanguageTag(alias.languageTag)) {
      errors.push({ severity: "error", code: "invalid_language_tag", recordId: alias.id, message: "Alias language tag must be a valid BCP 47 language tag." });
    }
    if (!alias.languageTag) {
      warnings.push({ severity: "warning", code: "invalid_language_tag", recordId: alias.id, message: "Alias language is unspecified; do not infer it from a user's location." });
    }
    if (alias.status === "verified") {
      errors.push({ severity: "error", code: "unreviewed_alias_marked_verified", recordId: alias.id, message: "Imported aliases must remain pending review until independently verified." });
      if (alias.synonymScope !== undefined && alias.synonymScope !== "exact") {
        errors.push({ severity: "error", code: "non_exact_synonym_marked_verified", recordId: alias.id, message: "Only explicitly exact synonyms may be considered for later alias verification." });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
