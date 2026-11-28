const TASK = "Task: enter Ahuva Step 2. Review the confirmed meal brief and ask only the most useful missing clarification about ingredient form, quantities, seasonings or preparation where it materially changes nutritional understanding. Ask one question at a time. If enough is known, explain the relevant nutritional composition and heart-health considerations, then offer optional adjustments. Never teach cooking steps.";

function makeBrief({ meal, ingredients, seasonings, peopleEating, personalServings }) {
  const totalServings = Math.max(1, peopleEating - 1 + personalServings);
  return [
    `Meal the user intends to prepare: ${meal}`,
    `Confirmed main ingredients: ${ingredients.join("; ")}`,
    `Confirmed seasonings, sauces, herbs and spices: ${seasonings.length ? seasonings.join("; ") : "Not specified"}`,
    `People eating at this meal, including the user: ${peopleEating}`,
    `Personal servings the user expects to consume across meals: ${personalServings}`,
    `Total portions to prepare, assuming one portion for each other diner: ${totalServings}`,
    TASK,
  ].join("\n");
}

// These are the only meal briefs that the Preview synthetic test gate accepts.
// Keep the set finite, fictional, and free of personal or health information.
export const SYNTHETIC_TEST_FIXTURES = [
  {
    id: "oats",
    label: "Oats and cinnamon",
    meal: "Synthetic oats test",
    ingredients: ["Oats"],
    seasonings: ["Cinnamon"],
    peopleEating: 1,
    personalServings: 1,
    followup: "One cup.",
  },
  {
    id: "mixed-bowl",
    label: "Rice, lentils and greens",
    meal: "Synthetic rice, lentil and greens bowl",
    ingredients: ["Rice", "Red lentils", "Spinach"],
    seasonings: ["Cumin", "Lemon"],
    peopleEating: 2,
    personalServings: 1,
    followup: "One cup.",
  },
  {
    id: "packaged-sauce",
    label: "Pasta and packaged sauce",
    meal: "Synthetic pasta with packaged tomato sauce",
    ingredients: ["2 cups cooked pasta"],
    seasonings: ["Packaged tomato sauce"],
    peopleEating: 1,
    personalServings: 1,
    followup: null,
  },
  {
    id: "takeaway",
    label: "Fish and chips",
    meal: "Synthetic fish and chips",
    ingredients: ["1 serving battered fish", "1 serving potatoes"],
    seasonings: ["Vinegar"],
    peopleEating: 1,
    personalServings: 1,
    followup: null,
  },
  {
    id: "tofu-stir-fry",
    label: "Tofu and vegetables",
    meal: "Synthetic tofu and vegetable stir-fry",
    ingredients: ["200 grams tofu", "1 cup broccoli", "1 carrot"],
    seasonings: ["Soy sauce", "Ginger"],
    peopleEating: 2,
    personalServings: 1,
    followup: null,
  },
].map((fixture) => ({
  ...fixture,
  details: makeBrief(fixture),
}));

export const SYNTHETIC_TEST_BRIEF = SYNTHETIC_TEST_FIXTURES[0].details;
export const SYNTHETIC_TEST_FOLLOWUP = SYNTHETIC_TEST_FIXTURES[0].followup;

export function getApprovedSyntheticTestFixture(details) {
  if (typeof details !== "string") return null;
  return SYNTHETIC_TEST_FIXTURES.find((fixture) => fixture.details === details) ?? null;
}

export function isApprovedSyntheticTestBrief(details) {
  return Boolean(getApprovedSyntheticTestFixture(details));
}

// Follow-up answers are fixture-specific and exact. No free-form follow-up data
// is accepted by the synthetic Preview gate.
export function isApprovedSyntheticTestFollowup(value, fixture = SYNTHETIC_TEST_FIXTURES[0]) {
  if (typeof value !== "string" || !fixture?.followup) return false;
  return value.trim().toLocaleLowerCase().replace(/[.!?]+$/, "") ===
    fixture.followup.trim().toLocaleLowerCase().replace(/[.!?]+$/, "");
}

/**
 * Validate only the fixed, finite synthetic conversations.
 * Briefs requiring a deterministic quantity clarification accept exactly
 * the initial turn and one fixed follow-up. Pre-quantified fixtures accept
 * only their single initial turn.
 */
export function isSyntheticAhuvaTestRequest(details, conversation) {
  const fixture = getApprovedSyntheticTestFixture(details);
  if (!fixture || !Array.isArray(conversation)) return false;

  if (conversation.length === 1 &&
      conversation[0]?.role === "user" &&
      conversation[0]?.content === fixture.details) {
    return true;
  }

  if (!fixture.followup || conversation.length !== 3 ||
      conversation[0]?.role !== "user" ||
      conversation[0]?.content !== fixture.details ||
      conversation[1]?.role !== "assistant" ||
      conversation[2]?.role !== "user" ||
      !isApprovedSyntheticTestFollowup(conversation[2]?.content, fixture)) {
    return false;
  }

  const expected = getPrimaryIngredientQuantityClarification(fixture.details, [conversation[0]]);
  return Boolean(expected) &&
    conversation[1].content === expected.assistantMessage + "\n" + expected.question;
}

const MEASURE = /\b(?:\d+(?:[./]\d+)?|a|an|one|two|three|four|five|half|quarter)\s*(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|g|kilograms?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|handfuls?|packets?|sachets?|servings?|slices?|pieces?|bowls?|scoops?|eggs?|cloves?|tomatoes?|onions?|potatoes?|whole|large|medium|small)\b/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasIngredientMeasure(line, ingredient) {
  const name = escapeRegExp(ingredient);
  const quantity = "(?:\\d+(?:[./]\\d+)?|a|an|one|two|three|four|five|half|quarter)";
  const unit = "(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|g|kilograms?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|handfuls?|packets?|sachets?|servings?|slices?|pieces?|bowls?|scoops?|eggs?|cloves?|tomatoes?|onions?|potatoes?|whole|large|medium|small)";
  return new RegExp(`(?:\\b${quantity}\\s*(?:${unit}\\s*)?(?:of\\s+)?${name}\\b|${name}\\s*[:=( -]*\\s*${quantity}\\s*${unit})`, "i").test(line);
}

/**
 * Ask for the primary ingredient quantity before giving meal-level nutrition guidance.
 * This is a narrow deterministic clarification, not a nutrient calculation.
 */
export function getPrimaryIngredientQuantityClarification(details, conversation = []) {
  if (typeof details !== "string") return null;
  const ingredientLine = details.split(/\r?\n/).find((line) => /^Confirmed main ingredients:/i.test(line.trim()));
  if (!ingredientLine) return null;

  const rawIngredients = ingredientLine.replace(/^Confirmed main ingredients:\s*/i, "").trim();
  const rawPrimaryIngredient = rawIngredients.split(/[;,]/)[0]?.trim();
  const leadingQuantity = /^(?:\d+(?:[./]\d+)?|a|an|one|two|three|four|five|half|quarter)\s*(?:(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|g|kilograms?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|handfuls?|packets?|sachets?|servings?|slices?|pieces?|bowls?|scoops?|eggs?|cloves?|tomatoes?|onions?|potatoes?|whole|large|medium|small)\s*)?(?:of\s+)?/i;
  const primaryIngredient = rawPrimaryIngredient?.replace(leadingQuantity, "").trim();
  if (!primaryIngredient || /^(?:none|not specified)$/i.test(primaryIngredient)) return null;

  if (hasIngredientMeasure(ingredientLine, primaryIngredient)) return null;

  const turns = Array.isArray(conversation) ? conversation : [];
  const priorAssistantAsked = turns.some((turn) =>
    turn?.role === "assistant" &&
    typeof turn.content === "string" &&
    /(?:how much|what amount|quantity of)/i.test(turn.content) &&
    turn.content.toLowerCase().includes(primaryIngredient.toLowerCase()),
  );
  if (priorAssistantAsked) return null;

  const laterUserTurns = turns.filter((turn, index) => index > 0 && turn?.role === "user" && typeof turn.content === "string");
  if (laterUserTurns.some((turn) => MEASURE.test(turn.content))) return null;

  const ingredientLabel = primaryIngredient.charAt(0).toLocaleLowerCase() + primaryIngredient.slice(1);
  return {
    ingredient: primaryIngredient,
    assistantMessage: `I have the meal and ingredient list. Before I assess its nutritional composition, I need to understand the amount of ${ingredientLabel} you plan to use.`,
    question: `About how much ${ingredientLabel} will you use? A household measure, such as one cup, is fine.`,
  };
}
