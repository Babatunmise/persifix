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
  assert.equal(result.knownAddedSodiumMg, 2050);
  assert.equal(result.knownAddedSodiumPerShareMg, 683);
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
