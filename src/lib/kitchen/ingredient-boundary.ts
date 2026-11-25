/**
 * Ingredient provenance boundary for Cooking.
 *
 * Exact normalized matching only: this module does not infer aliases,
 * quantities, substitutions, nutrition, allergy safety, or pantry contents.
 * It is shared by Your Way and Ahuva's Way.
 */

export type IngredientDisposition = "available" | "needs_confirmation";

export type IngredientBoundaryItem = {
  name: string;
  disposition: IngredientDisposition;
};

function normalizeIngredientName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\\s+/g, " ");
}

/**
 * Classifies each proposed ingredient against the user's explicitly supplied
 * inventory. Anything not present in that inventory requires user approval.
 */
export function classifyIngredientsAgainstInventory(
  availableIngredients: readonly string[],
  proposedIngredients: readonly string[],
): IngredientBoundaryItem[] {
  const available = new Set(
    availableIngredients
      .filter((name) => typeof name === "string" && name.trim().length > 0)
      .map(normalizeIngredientName),
  );

  const seen = new Set<string>();
  const result: IngredientBoundaryItem[] = [];

  for (const rawName of proposedIngredients) {
    if (typeof rawName !== "string") continue;
    const name = rawName.trim().replace(/\\s+/g, " ");
    const normalized = normalizeIngredientName(name);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push({
      name,
      disposition: available.has(normalized) ? "available" : "needs_confirmation",
    });
  }

  return result;
}

/**
 * True only when every proposed ingredient is explicitly present in the
 * supplied inventory. Empty proposals are not considered a valid match.
 */
export function allIngredientsAvailable(
  availableIngredients: readonly string[],
  proposedIngredients: readonly string[],
): boolean {
  if (proposedIngredients.length === 0) return false;
  return classifyIngredientsAgainstInventory(availableIngredients, proposedIngredients)
    .every((item) => item.disposition === "available");
}
