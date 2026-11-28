import test from "node:test";
import assert from "node:assert/strict";
import {
  getApprovedSyntheticTestFixture,
  getPrimaryIngredientQuantityClarification,
  isApprovedSyntheticTestBrief,
  isApprovedSyntheticTestFollowup,
  isSyntheticAhuvaTestRequest,
  SYNTHETIC_TEST_BRIEF,
  SYNTHETIC_TEST_FIXTURES,
  SYNTHETIC_TEST_FOLLOWUP,
} from "../src/lib/ahuva-conversation-policy.mjs";

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

test("the approved synthetic fixture list is finite and contains distinct meals", () => {
  assert.equal(SYNTHETIC_TEST_FIXTURES.length, 5);
  assert.equal(new Set(SYNTHETIC_TEST_FIXTURES.map((fixture) => fixture.id)).size, 5);
  assert.equal(new Set(SYNTHETIC_TEST_FIXTURES.map((fixture) => fixture.details)).size, 5);
  for (const fixture of SYNTHETIC_TEST_FIXTURES) {
    assert.equal(isApprovedSyntheticTestBrief(fixture.details), true);
    assert.equal(getApprovedSyntheticTestFixture(fixture.details)?.id, fixture.id);
  }
});

test("allows the exact initial oats synthetic fixture", () => {
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
  ]), true);
});

test("allows the exact two-turn oats synthetic clarification follow-up", () => {
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

test("accepts only the fixture's fixed follow-up answer", () => {
  const fixture = getApprovedSyntheticTestFixture(SYNTHETIC_TEST_BRIEF);
  assert.ok(fixture);
  for (const reply of ["one cup", "ONE CUP.", "One cup!", "  One cup?  "]) {
    assert.equal(isApprovedSyntheticTestFollowup(reply, fixture), true);
  }
  for (const reply of ["two cups", "one cup of oats", "a cup", "one bowl"]) {
    assert.equal(isApprovedSyntheticTestFollowup(reply, fixture), false);
  }
});

test("allows only a single initial turn for pre-quantified fixtures", () => {
  for (const fixture of SYNTHETIC_TEST_FIXTURES.filter((item) => !item.followup)) {
    assert.equal(getPrimaryIngredientQuantityClarification(fixture.details, [
      { role: "user", content: fixture.details },
    ]), null);
    assert.equal(isSyntheticAhuvaTestRequest(fixture.details, [
      { role: "user", content: fixture.details },
    ]), true);
    assert.equal(isSyntheticAhuvaTestRequest(fixture.details, [
      { role: "user", content: fixture.details },
      { role: "assistant", content: "Anything at all" },
      { role: "user", content: "A real free-form reply" },
    ]), false);
  }
});

test("rejects unknown briefs, altered details, conversation tampering and unapproved follow-ups", () => {
  const clarification = getPrimaryIngredientQuantityClarification(SYNTHETIC_TEST_BRIEF, [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
  ]);
  assert.ok(clarification);
  const valid = [
    { role: "user", content: SYNTHETIC_TEST_BRIEF },
    { role: "assistant", content: `${clarification.assistantMessage}\n${clarification.question}` },
    { role: "user", content: SYNTHETIC_TEST_FOLLOWUP },
  ];
  assert.equal(isApprovedSyntheticTestBrief(SYNTHETIC_TEST_BRIEF + "\nextra"), false);
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF + "\nextra", valid), false);
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    valid[0], { ...valid[1], content: valid[1].content + " " }, valid[2],
  ]), false);
  assert.equal(isSyntheticAhuvaTestRequest(SYNTHETIC_TEST_BRIEF, [
    valid[0], valid[1], { role: "user", content: "Two cups." },
  ]), false);
  assert.equal(isSyntheticAhuvaTestRequest("Real meal: personal lunch", [
    { role: "user", content: "Real meal: personal lunch" },
  ]), false);
});
