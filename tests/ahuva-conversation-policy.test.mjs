import test from "node:test";
import assert from "node:assert/strict";
import { getPrimaryIngredientQuantityClarification, isSyntheticAhuvaTestRequest, SYNTHETIC_TEST_BRIEF, SYNTHETIC_TEST_FOLLOWUP } from "../src/lib/ahuva-conversation-policy.mjs";

const details = [
  "Meal the user intends to prepare: Synthetic oats test",
  "Confirmed main ingredients: Oats",
  "Confirmed seasonings, sauces, herbs and spices: Cinnamon",
  "People eating at this meal, including the user: 1",
].join("\n");

test("asks for the primary ingredient amount when none is supplied", () => {
  const result = getPrimaryIngredientQuantityClarification(details, [{ role: "user", content: details }]);
  assert.equal(result.ingredient, "Oats");
  assert.match(result.question, /how much oats/i);
});

test("does not ask again when the ingredient line includes a measured quantity", () => {
  const measured = details.replace("Confirmed main ingredients: Oats", "Confirmed main ingredients: 1 cup oats");
  assert.equal(getPrimaryIngredientQuantityClarification(measured, []), null);
});

test("recognises a counted main ingredient such as two eggs", () => {
  const counted = details.replace("Confirmed main ingredients: Oats", "Confirmed main ingredients: 2 eggs");
  assert.equal(getPrimaryIngredientQuantityClarification(counted, []), null);
});

test("accepts a household-measure answer in a later user turn", () => {
  const conversation = [
    { role: "user", content: details },
    { role: "assistant", content: "About how much oats will you use?" },
    { role: "user", content: "One cup." },
  ];
  assert.equal(getPrimaryIngredientQuantityClarification(details, conversation), null);
});

test("does not repeat a quantity question after the user cannot provide an amount", () => {
  const conversation = [
    { role: "user", content: details },
    { role: "assistant", content: "About how much oats will you use?" },
    { role: "user", content: "I'm not sure." },
  ];
  assert.equal(getPrimaryIngredientQuantityClarification(details, conversation), null);
});

test("does not infer a quantity from household serving counts", () => {
  assert.notEqual(getPrimaryIngredientQuantityClarification(details, []), null);
});

test("returns no clarification when the meal brief has no confirmed ingredient line", () => {
  assert.equal(getPrimaryIngredientQuantityClarification("Meal: oats", []), null);
});

test("allows the exact initial synthetic connection fixture", () => {
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
  ]), true);
});

test("allows the exact two-turn synthetic clarification follow-up", () => {
  const clarification = getPrimaryIngredientQuantityClarification(SYNTHETIC_TEST_BRIEF, [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
  ]);
  assert.ok(clarification);
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
    { role: "assistant", content: `${clarification.assistantMessage}\n${clarification.question}` },
    { role: "user", content: SYNTHETIC_TEST_FOLLOWUP },
  ]), true);
});

test("rejects altered synthetic details, assistant turns and user follow-ups", () => {
  const clarification = getPrimaryIngredientQuantityClarification(SYNTHETIC_TEST_BRIEF, [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
  ]);
  assert.ok(clarification);
  const base = [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
    { role: "assistant", content: `${clarification.assistantMessage}\n${clarification.question}` },
    { role: "user", content: SYNTHETIC_TEST_FOLLOWUP },
  ];
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF + "\\nextra", base), false);
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    base[0], { ...base[1], content: base[1].content + " " }, base[2],
  ]), false);
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    base[0], base[1], { role: "user", content: "Two cups." },
  ]), false);
});
