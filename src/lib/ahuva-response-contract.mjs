const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const isTextArray = (value, maxItems, maxLength) =>
  Array.isArray(value) && value.length <= maxItems && value.every((item) => isText(item, maxLength));

/**
 * @typedef {{status: "ready" | "needs_clarification", assistantMessage: string, interpretation: string, questions: string[], recommendations: {title: string, detail: string}[], plan: null | {servings: string, preparation: string[], ingredients: {name: string, amount: string, availability: "available" | "missing" | "optional"}[]}, safetyNotes: string[]}} NormalizedAhuvaResult
 *
 * Converts a provider response into Ahuva's stable UI contract.
 * Essential fields fail closed. Malformed optional recommendations are discarded
 * as a group so formatting drift cannot erase an otherwise valid meal review.
 * The caller must still apply serving-count and confirmed-inventory safeguards.
 *
 * @param {unknown} value
 * @param {{requirePlan?: boolean}} [options]
 * @returns {{ok: true, value: NormalizedAhuvaResult} | {ok: false, reason: string}}
 */
export function normalizeAhuvaResult(value, options = {}) {
  if (!isRecord(value)) return { ok: false, reason: "root_not_object" };
  if (value.status !== "ready" && value.status !== "needs_clarification") {
    return { ok: false, reason: "invalid_status" };
  }
  if (!isText(value.assistantMessage, 1200)) {
    return { ok: false, reason: "invalid_assistant_message" };
  }

  const interpretation = value.interpretation === undefined ? "" : value.interpretation;
  if (typeof interpretation !== "string" || interpretation.length > 1200) {
    return { ok: false, reason: "invalid_interpretation" };
  }

  const questions = value.questions === undefined ? [] : value.questions;
  if (!isTextArray(questions, 1, 300)) return { ok: false, reason: "invalid_questions" };
  if (value.status === "needs_clarification" && questions.length !== 1) {
    return { ok: false, reason: "clarification_question_required" };
  }

  const rawRecommendations = value.recommendations === undefined ? [] : value.recommendations;
  const recommendationsAreValid =
    Array.isArray(rawRecommendations) &&
    rawRecommendations.length <= 3 &&
    rawRecommendations.every((item) =>
      isRecord(item) && isText(item.title, 120) && isText(item.detail, 400)
    );
  const recommendations = recommendationsAreValid
    ? rawRecommendations.map((item) => ({ title: item.title.trim(), detail: item.detail.trim() }))
    : [];

  const safetyNotes = value.safetyNotes === undefined ? [] : value.safetyNotes;
  if (!isTextArray(safetyNotes, 4, 400)) return { ok: false, reason: "invalid_safety_notes" };

  let plan = value.plan === undefined ? null : value.plan;
  if (plan !== null) {
    if (!isRecord(plan)) return { ok: false, reason: "invalid_plan" };

    const preparation = plan.preparation === undefined ? [] : plan.preparation;
    if (!isTextArray(preparation, 8, 500)) return { ok: false, reason: "invalid_plan_preparation" };

    const rawIngredients = plan.ingredients === undefined ? [] : plan.ingredients;
    if (!Array.isArray(rawIngredients) || rawIngredients.length > 30) {
      return { ok: false, reason: "invalid_plan_ingredients" };
    }
    const ingredients = [];
    for (const item of rawIngredients) {
      if (!isRecord(item) || !isText(item.name, 100)) {
        return { ok: false, reason: "invalid_plan_ingredient" };
      }
      if (item.amount !== undefined && (typeof item.amount !== "string" || item.amount.length > 60)) {
        return { ok: false, reason: "invalid_plan_ingredient_amount" };
      }
      const availability = ["available", "missing", "optional"].includes(item.availability)
        ? item.availability
        : "missing";
      ingredients.push({
        name: item.name.trim(),
        amount: typeof item.amount === "string" ? item.amount.trim() : "",
        availability,
      });
    }

    const servings = plan.servings === undefined || plan.servings === null
      ? ""
      : typeof plan.servings === "string" || typeof plan.servings === "number"
        ? String(plan.servings)
        : null;
    if (servings === null || servings.length > 20) {
      return { ok: false, reason: "invalid_plan_servings" };
    }
    plan = { servings, preparation: preparation.map((step) => step.trim()), ingredients };
  }

  if (value.status === "ready" && questions.length > 0) {
    return { ok: false, reason: "ready_response_has_questions" };
  }
  if (value.status === "needs_clarification" && plan !== null) {
    return { ok: false, reason: "clarification_response_has_plan" };
  }
  if (value.status === "ready" && options.requirePlan === true && plan === null) {
    return { ok: false, reason: "guided_cooking_plan_missing" };
  }

  return {
    ok: true,
    value: {
      status: value.status,
      assistantMessage: value.assistantMessage.trim(),
      interpretation: interpretation.trim(),
      questions: questions.map((question) => question.trim()),
      recommendations,
      plan,
      safetyNotes: safetyNotes.map((note) => note.trim()),
    },
  };
}
