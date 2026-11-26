import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAhuvaResult } from "../src/lib/ahuva-response-contract.mjs";

const base = {
  status: "ready",
  assistantMessage: "Suya fish and beef can stay the centre of this meal.",
  interpretation: "Suya-seasoned fish and beef for four.",
  questions: [],
  recommendations: [],
  plan: null,
  safetyNotes: [],
};

test("normalizes a complete Your way response without a cooking plan", () => {
  const result = normalizeAhuvaResult(base);
  assert.equal(result.ok, true);
  assert.equal(result.value.plan, null);
  assert.deepEqual(result.value.questions, []);
  assert.deepEqual(result.value.recommendations, []);
});

test("supplies safe defaults when optional response fields are omitted", () => {
  const result = normalizeAhuvaResult({
    status: "ready",
    assistantMessage: "I understand the meal you want to make.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.interpretation, "");
  assert.deepEqual(result.value.questions, []);
  assert.deepEqual(result.value.recommendations, []);
  assert.deepEqual(result.value.safetyNotes, []);
  assert.equal(result.value.plan, null);
});

test("normalizes an Ahuva's way plan and defaults unknown ingredient availability to missing", () => {
  const result = normalizeAhuvaResult({
    ...base,
    plan: {
      servings: 4,
      preparation: ["Season the fish and beef."],
      ingredients: [
        { name: "fish", amount: "as listed", availability: "available" },
        { name: "onion", amount: "1", availability: "unexpected-value" },
        { name: "pepper", availability: "optional" },
      ],
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.plan.servings, "4");
  assert.deepEqual(result.value.plan.ingredients.map((item) => item.availability), [
    "available", "missing", "optional",
  ]);
  assert.equal(result.value.plan.ingredients[2].amount, "");
});

test("accepts one clarification question without a preparation plan", () => {
  const result = normalizeAhuvaResult({
    status: "needs_clarification",
    assistantMessage: "I can work with the ingredients you listed.",
    questions: ["Do you want the fish grilled or pan-cooked?"],
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.questions.length, 1);
  assert.equal(result.value.plan, null);
});

test("rejects clarification without its required question", () => {
  const result = normalizeAhuvaResult({
    status: "needs_clarification",
    assistantMessage: "I need one detail before proceeding.",
  });
  assert.deepEqual(result, { ok: false, reason: "clarification_question_required" });
});

test("rejects ready responses that contain clarification questions", () => {
  const result = normalizeAhuvaResult({
    ...base,
    questions: ["How would you like to cook it?"],
  });
  assert.deepEqual(result, { ok: false, reason: "ready_response_has_questions" });
});

test("rejects a clarification response that also supplies a full plan", () => {
  const result = normalizeAhuvaResult({
    status: "needs_clarification",
    assistantMessage: "One detail will help.",
    questions: ["Which cooking method do you prefer?"],
    plan: { preparation: [] },
  });
  assert.deepEqual(result, { ok: false, reason: "clarification_response_has_plan" });
});

test("rejects malformed required fields with a field-level reason", () => {
  const result = normalizeAhuvaResult({ ...base, assistantMessage: "" });
  assert.deepEqual(result, { ok: false, reason: "invalid_assistant_message" });
});

test("rejects malformed recommendation objects rather than silently displaying them", () => {
  const result = normalizeAhuvaResult({
    ...base,
    recommendations: [{ title: "Use less salt" }],
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_recommendation_item" });
});

test("rejects excessive or malformed preparation steps", () => {
  const result = normalizeAhuvaResult({
    ...base,
    plan: { preparation: Array(9).fill("Cook carefully.") },
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_plan_preparation" });
});
