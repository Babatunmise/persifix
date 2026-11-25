import test from "node:test";
import assert from "node:assert/strict";
import { extractConfirmedIngredientText, isIngredientConfirmed } from "../src/lib/ingredient-confirmation.mjs";

test("recognises every item in a comma-separated confirmed list", () => {
  const turns = [{ role: "user", content: "Jollof rice" }, { role: "user", content: "I have chicken, rice, onions and tomatoes." }];
  const list = extractConfirmedIngredientText("meal", "Jollof rice", turns);
  const all = turns.map((turn) => turn.content).join(" ");
  for (const item of ["chicken", "rice", "onions", "tomatoes"]) assert.equal(isIngredientConfirmed(item, list, all), true, item);
});

test("does not infer inventory from a meal description alone", () => {
  const turns = [{ role: "user", content: "Chicken curry with rice" }];
  const list = extractConfirmedIngredientText("meal", "Chicken curry with rice", turns);
  assert.equal(isIngredientConfirmed("chicken", list, "Chicken curry with rice"), false);
  assert.equal(isIngredientConfirmed("rice", list, "Chicken curry with rice"), false);
});

test("negative availability overrides a positive list", () => {
  const turns = [{ role: "user", content: "Chicken curry" }, { role: "user", content: "I have chicken, rice and onions, but I don't have tomatoes." }];
  const list = extractConfirmedIngredientText("meal", "Chicken curry", turns);
  const all = turns.map((turn) => turn.content).join(" ");
  for (const item of ["chicken", "rice", "onions"]) assert.equal(isIngredientConfirmed(item, list, all), true, item);
  assert.equal(isIngredientConfirmed("tomatoes", list, all), false);
});

test("seasoning mentions do not count as ingredient inventory", () => {
  const turns = [{ role: "user", content: "Rice" }, { role: "user", content: "I season with salt, stock cubes and curry powder." }];
  const list = extractConfirmedIngredientText("meal", "Rice", turns);
  const all = turns.map((turn) => turn.content).join(" ");
  assert.equal(isIngredientConfirmed("salt", list, all), false);
  assert.equal(isIngredientConfirmed("chicken", list, all), false);
});

test("ingredients-first entry treats the submitted list as explicitly available", () => {
  const list = extractConfirmedIngredientText("ingredients", "Chicken, rice, onions", [{ role: "user", content: "Chicken, rice, onions" }]);
  for (const item of ["chicken", "rice", "onions"]) assert.equal(isIngredientConfirmed(item, list, list), true, item);
  assert.equal(isIngredientConfirmed("tomatoes", list, list), false);
});
