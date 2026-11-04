import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stubBotTop,
  stubFootHeight,
  stubMarks,
  stubSize,
} from "../src/ticket-stub.ts";

test("a stub is 34 × 50 at the default 20 pt bot and grows with it", () => {
  assert.deepEqual(stubSize(20), { width: 34, height: 50 });
  assert.deepEqual(stubSize(30), { width: 51, height: 75 });
});

test("the bot and the tear-off foot fit the stub", () => {
  for (const logo of [20, 30, 60]) {
    const { height } = stubSize(logo);
    assert.ok(stubBotTop(logo) + logo <= height - stubFootHeight(logo));
  }
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
