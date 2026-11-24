import test from "node:test";
import assert from "node:assert/strict";
import { calculateIngredient } from "./ahuva-pot-math.mjs";

test("scales unitless ingredient counts", () => {
  assert.equal(calculateIngredient("2 onions", 3, "metric").result, "6 onions");
});

test("scales a fractional quantity", () => {
  assert.equal(calculateIngredient("1/2 kg rice", 2, "metric").result, "1 kg rice");
});

test("converts mass only within the mass dimension", () => {
  assert.equal(calculateIngredient("1 kg flour", 1, "imperial").result, "2.2 lb flour");
});

test("converts volume only within the volume dimension", () => {
  assert.equal(calculateIngredient("1 l water", 1, "metric").result, "1 l water");
});

test("converts explicitly defined US cups to metric volume", () => {
  assert.equal(calculateIngredient("1 us cup rice", 1, "metric").result, "236.59 ml rice");
});

test("does not guess the size of an ambiguous cup", () => {
  const result = calculateIngredient("1 cup rice", 2, "metric");
  assert.equal(result.result, "2 cup rice");
  assert.match(result.note, /conversion is unsupported/i);
});

test("does not blindly scale salt or leavening agents", () => {
  const salt = calculateIngredient("1 tsp salt", 2, "metric");
  assert.equal(salt.result, "1 tsp salt");
  assert.match(salt.note, /manually/i);
  const yeast = calculateIngredient("2 g yeast", 3, "metric");
  assert.equal(yeast.result, "2 g yeast");
  assert.match(yeast.note, /manually/i);
});

test("retains unsupported units and explains the limitation", () => {
  const result = calculateIngredient("2 cans beans", 2, "metric");
  assert.equal(result.result, "4 cans beans");
  assert.match(result.note, /unsupported/i);
});

test("rejects invalid serving ratios and malformed quantities safely", () => {
  assert.equal(calculateIngredient("2 g rice", 0, "metric").result, "2 g rice");
  assert.equal(calculateIngredient("0 g rice", 2, "metric").result, "0 g rice");
  assert.equal(calculateIngredient("some rice", 2, "metric").result, "some rice");
});

test("never converts mass to volume using assumed ingredient density", () => {
  const result = calculateIngredient("100 g flour", 1, "imperial");
  assert.equal(result.result, "3.53 oz flour");
});
