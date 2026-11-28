const MEASURE = /\b(?:\d+(?:[./]\d+)?|a|an|one|two|three|four|five|half|quarter)\s*(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|g|kilograms?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|handfuls?|packets?|sachets?|servings?|slices?|pieces?|bowls?|scoops?)\b/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasIngredientMeasure(line, ingredient) {
  const name = escapeRegExp(ingredient);
  const quantity = "(?:\\d+(?:[./]\\d+)?|a|an|one|two|three|four|five|half|quarter)";
  const unit = "(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|grams?|g|kilograms?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|handfuls?|packets?|sachets?|servings?|slices?|pieces?|bowls?|scoops?)";
  return new RegExp(`(?:\\b${quantity}\\s*${unit}\\s*(?:of\\s+)?${name}\\b|${name}\\s*[:=( -]*\\s*${quantity}\\s*${unit})`, "i").test(line);
}

/**
 * Ask for the primary ingredient quantity before giving meal-level nutrition guidance.
 * This is a narrow deterministic guard, not a nutrient calculation.
 */
export function getPrimaryIngredientQuantityClarification(details, conversation = []) {
  if (typeof details !== "string") return null;
  const ingredientLine = details.split(/\r?\n/).find((line) => /^Confirmed main ingredients:/i.test(line.trim()));
  if (!ingredientLine) return null;

  const rawIngredients = ingredientLine.replace(/^Confirmed main ingredients:\s*/i, "").trim();
  const primaryIngredient = rawIngredients.split(/[;,]/)[0]?.trim();
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
