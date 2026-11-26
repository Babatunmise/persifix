const isFiniteNonNegative = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * @typedef {{ok: false, reason: string} | {ok: true, status: "insufficient_data", people: number, sources: {name: string, sodiumMg: number, basis: string}[], knownAddedSodiumMg: null, knownAddedSodiumPerShareMg: null} | {ok: true, status: "estimate", people: number, sources: {name: string, sodiumMg: number, basis: string}[], knownAddedSodiumMg: number, knownAddedSodiumPerShareMg: number}} SodiumEstimateResult
 *
 * Estimates only the added sodium sources explicitly entered by the user.
 * Fine table salt is approximated at 2,300 mg sodium per level teaspoon.
 * Packaged sources require label sodium per serving and servings used.
 * This is not a complete meal-sodium or clinical assessment.
 */
/** @param {{tableSaltTeaspoons?: number | null, labelSodiumMgPerServing?: number | null, labelServingsUsed?: number | null, people: number}} input
 * @returns {SodiumEstimateResult}
 */
export function calculateKnownAddedSodium({
  tableSaltTeaspoons = null,
  labelSodiumMgPerServing = null,
  labelServingsUsed = null,
  people,
}) {
  if (!Number.isInteger(people) || people < 1 || people > 100) {
    return { ok: false, reason: "invalid_people_count" };
  }

  const hasSalt = tableSaltTeaspoons !== null && tableSaltTeaspoons !== undefined && tableSaltTeaspoons !== "";
  const hasLabelMg = labelSodiumMgPerServing !== null && labelSodiumMgPerServing !== undefined && labelSodiumMgPerServing !== "";
  const hasLabelServings = labelServingsUsed !== null && labelServingsUsed !== undefined && labelServingsUsed !== "";

  if (hasSalt && !isFiniteNonNegative(tableSaltTeaspoons)) {
    return { ok: false, reason: "invalid_salt_quantity" };
  }
  if (hasLabelMg !== hasLabelServings) {
    return { ok: false, reason: "incomplete_label_source" };
  }
  if (hasLabelMg && (!isFiniteNonNegative(labelSodiumMgPerServing) || !isFiniteNonNegative(labelServingsUsed))) {
    return { ok: false, reason: "invalid_label_source" };
  }

  const sources = [];
  if (hasSalt) {
    sources.push({
      name: "Fine table salt",
      sodiumMg: Math.round(tableSaltTeaspoons * 2300),
      basis: "Approx. 2,300 mg sodium per level teaspoon",
    });
  }
  if (hasLabelMg) {
    sources.push({
      name: "Packaged seasoning / sauce",
      sodiumMg: Math.round(labelSodiumMgPerServing * labelServingsUsed),
      basis: "Nutrition label sodium per serving × servings used",
    });
  }

  if (sources.length === 0) {
    return {
      ok: true,
      status: "insufficient_data",
      people,
      sources,
      knownAddedSodiumMg: null,
      knownAddedSodiumPerShareMg: null,
    };
  }

  const knownAddedSodiumMg = sources.reduce((total, source) => total + source.sodiumMg, 0);
  return {
    ok: true,
    status: "estimate",
    people,
    sources,
    knownAddedSodiumMg,
    knownAddedSodiumPerShareMg: Math.round(knownAddedSodiumMg / people),
  };
}


/**
 * Converts a user's own household measure into an equal share of the pot.
 * The unit is intentionally user-defined (same bowl, ladle or cup throughout).
 */
/** @param {{totalUnits?: number | null, unit: "ladles" | "bowls" | "cups", people: number}} input
 * @returns {{ok: false, reason: string} | {ok: true, status: "not_measured", people: number} | {ok: true, status: "measured", people: number, totalUnits: number, unit: string, unitsPerPerson: number}}
 */
export function calculateHouseholdPotShares({ totalUnits = null, unit, people }) {
  if (!Number.isInteger(people) || people < 1 || people > 100) {
    return { ok: false, reason: "invalid_people_count" };
  }
  if (!["ladles", "bowls", "cups"].includes(unit)) {
    return { ok: false, reason: "invalid_household_unit" };
  }
  if (totalUnits === null || totalUnits === undefined || totalUnits === "") {
    return { ok: true, status: "not_measured", people };
  }
  if (typeof totalUnits !== "number" || !Number.isFinite(totalUnits) || totalUnits <= 0 || totalUnits > 1000) {
    return { ok: false, reason: "invalid_pot_quantity" };
  }
  return {
    ok: true,
    status: "measured",
    people,
    totalUnits,
    unit,
    unitsPerPerson: Math.round((totalUnits / people) * 100) / 100,
  };
}
