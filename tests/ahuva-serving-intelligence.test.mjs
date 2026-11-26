import test from "node:test";
import assert from "node:assert/strict";
import { calculateKnownAddedSodium } from "../src/lib/ahuva-serving-intelligence.mjs";

test("estimates known sodium from fine table salt and divides it across the pot", () => {
  const result = calculateKnownAddedSodium({ tableSaltTeaspoons: 0.5, people: 4 });
  assert.equal(result.ok, true);
  assert.equal(result.knownAddedSodiumMg, 1150);
  assert.equal(result.knownAddedSodiumPerShareMg, 288);
});

test("combines salt and label-based seasoning sodium without guessing", () => {
  const result = calculateKnownAddedSodium({
    tableSaltTeaspoons: 0.25,
    labelSodiumMgPerServing: 450,
    labelServingsUsed: 2,
    people: 3,
  });
  assert.equal(result.knownAddedSodiumMg, 1475);
  assert.equal(result.knownAddedSodiumPerShareMg, 492);
});

test("does not invent a sodium estimate when quantities are unknown", () => {
  const result = calculateKnownAddedSodium({ people: 2 });
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.knownAddedSodiumMg, null);
});

test("rejects an incomplete packaged-food label entry", () => {
  const result = calculateKnownAddedSodium({
    labelSodiumMgPerServing: 300,
    people: 2,
  });
  assert.deepEqual(result, { ok: false, reason: "incomplete_label_source" });
});

test("rejects invalid serving counts and negative quantities", () => {
  assert.equal(calculateKnownAddedSodium({ people: 0 }).reason, "invalid_people_count");
  assert.equal(calculateKnownAddedSodium({ tableSaltTeaspoons: -1, people: 2 }).reason, "invalid_salt_quantity");
});

test("records zero added table salt when the user confirms none was used", () => {
  const result = calculateKnownAddedSodium({ tableSaltTeaspoons: 0, people: 2 });
  assert.equal(result.status, "estimate");
  assert.equal(result.knownAddedSodiumMg, 0);
  assert.equal(result.knownAddedSodiumPerShareMg, 0);
});

test("divides a pot into practical household measures", async () => {
  const { calculateHouseholdPotShares } = await import("../src/lib/ahuva-serving-intelligence.mjs");
  const result = calculateHouseholdPotShares({ totalUnits: 8, unit: "ladles", people: 4 });
  assert.equal(result.ok, true);
  assert.equal(result.status, "measured");
  assert.equal(result.unitsPerPerson, 2);
});

test("supports fractional household measures without converting to grams", async () => {
  const { calculateHouseholdPotShares } = await import("../src/lib/ahuva-serving-intelligence.mjs");
  const result = calculateHouseholdPotShares({ totalUnits: 7, unit: "bowls", people: 4 });
  assert.equal(result.unitsPerPerson, 1.75);
});

test("leaves household distribution unmeasured rather than guessing", async () => {
  const { calculateHouseholdPotShares } = await import("../src/lib/ahuva-serving-intelligence.mjs");
  const result = calculateHouseholdPotShares({ unit: "cups", people: 3 });
  assert.deepEqual(result, { ok: true, status: "not_measured", people: 3 });
});
