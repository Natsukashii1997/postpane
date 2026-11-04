import { test } from "node:test";
import assert from "node:assert/strict";
import { stubMarks, stubSize } from "../src/ticket-stub.ts";

test("a stub is 42 × 62 at the default 20 pt bot and grows with it", () => {
  assert.deepEqual(stubSize(20), { width: 42, height: 62 });
  assert.deepEqual(stubSize(30), { width: 63, height: 93 });
});

test("a working agent is punched, a waiting one sealed instead", () => {
  const idle = { working: 0, waiting: 0, used: 30 };
  assert.deepEqual(stubMarks(idle), {
    punched: false,
    sealed: false,
    warn: false,
  });
  assert.equal(stubMarks({ ...idle, working: 1 }).punched, true);
  const asking = stubMarks({ ...idle, working: 1, waiting: 1 });
  assert.equal(asking.sealed, true);
  assert.equal(asking.punched, false);
});

test("the reading turns red from 80% of the tightest quota", () => {
  const vendor = { working: 0, waiting: 0 };
  assert.equal(stubMarks({ ...vendor, used: 79.9 }).warn, false);
  assert.equal(stubMarks({ ...vendor, used: 80 }).warn, true);
  assert.equal(stubMarks({ ...vendor, used: null }).warn, false);
});
