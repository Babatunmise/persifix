import test from "node:test";
import assert from "node:assert/strict";
import { isProviderSafetyRefusal } from "../src/lib/ahuva-provider-response.mjs";

test("detects provider content-filter outcomes", () => {
  assert.equal(isProviderSafetyRefusal({ finish_reason: "content_filter", message: { content: null } }), true);
});

test("detects explicit provider refusal text", () => {
  assert.equal(isProviderSafetyRefusal({ finish_reason: "stop", message: { refusal: "I cannot help with that request." } }), true);
});

test("does not classify an ordinary valid completion as a refusal", () => {
  assert.equal(isProviderSafetyRefusal({ finish_reason: "stop", message: { content: "{}" } }), false);
});

test("fails closed on malformed provider choice shapes without throwing", () => {
  for (const value of [null, undefined, "text", [], {}, { message: null }, { message: { refusal: "" } }]) {
    assert.equal(isProviderSafetyRefusal(value), false);
  }
});
