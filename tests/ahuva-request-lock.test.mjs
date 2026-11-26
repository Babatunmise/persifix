import test from "node:test";
import assert from "node:assert/strict";
import { createAhuvaRequestLock } from "../src/lib/ahuva-request-lock.mjs";

test("blocks a second request immediately, before a UI re-render", () => {
  const lock = createAhuvaRequestLock();
  assert.equal(lock.acquire(), true);
  assert.equal(lock.acquire(), false);
  assert.equal(lock.isLocked(), true);
});

test("releases after a failed request so the same request can be retried", () => {
  const lock = createAhuvaRequestLock();
  assert.equal(lock.acquire(), true);
  lock.release();
  assert.equal(lock.isLocked(), false);
  assert.equal(lock.acquire(), true);
});

test("release is safe to call after a completed request", () => {
  const lock = createAhuvaRequestLock();
  lock.release();
  assert.equal(lock.acquire(), true);
});
