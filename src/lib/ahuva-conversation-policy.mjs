export const SYNTHETIC_TEST_BRIEF = [
  "Meal the user intends to prepare: Synthetic oats test",
  "Confirmed main ingredients: Oats",
  "Confirmed seasonings, sauces, herbs and spices: Cinnamon",
  "People eating at this meal, including the user: 1",
  "Personal servings the user expects to consume across meals: 1",
  "Total portions to prepare, assuming one portion for each other diner: 1",
  "Task: enter Ahuva Step 2. Review the confirmed meal brief and ask only the most useful missing clarification about ingredient form, quantities, seasonings or preparation where it materially changes nutritional understanding. Ask one question at a time. If enough is known, explain the relevant nutritional composition and heart-health considerations, then offer optional adjustments. Never teach cooking steps.",
].join("\n");

export const SYNTHETIC_TEST_FOLLOWUP = "One cup.";


/**
 * Validate the only Preview-safe synthetic conversation.
 * Derive the expected assistant turn from the same policy used by the route.
 */
export function isSyntheticAhuvaTestRequest(details, conversation) {
  if (details !== SYNTHETIC_TEST_BRIEF || !Array.isArray(conversation)) return false;

  if (
    conversation.length === 1 &&
    conversation[0]?.role === "user" &&
    conversation[0]?.content === SYNTHETIC_TEST_BRIEF
  ) return true;

  if (
    conversation.length !== 3 ||
    conversation[0]?.role !== "user" ||
    conversation[0]?.content !== SYNTHETIC_TEST_BRIEF ||
    conversation[1]?.role !== "assistant" ||
    conversation[2]?.role !== "user" ||
    conversation[2]?.content !== SYNTHETIC_TEST_FOLLOWUP
  ) return false;

  const expected = getPrimaryIngredientQuantityClarification(SYNTHETIC_TEST_BRIEF, [conversation[0]]);
  return Boolean(expected) &&
    conversation[1].content === `${expected.assistantMessage}\n${expected.question}`;
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
