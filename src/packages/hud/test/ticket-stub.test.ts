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

test("a waiting agent is sealed", () => {
  const idle = { waiting: 0, used: 30 };
  assert.deepEqual(stubMarks(idle), {
    sealed: false,
    answer: false,
    warn: false,
  });
  const asking = stubMarks({ ...idle, waiting: 1 });
  assert.equal(asking.sealed, true);
});

test("the reading turns red from 80% of the tightest quota", () => {
  const vendor = { waiting: 0 };
  assert.equal(stubMarks({ ...vendor, used: 79.9 }).warn, false);
  assert.equal(stubMarks({ ...vendor, used: 80 }).warn, true);
  assert.equal(stubMarks({ ...vendor, used: null }).warn, false);
});

test("the seal reads 答 only while every waiting request is a question", () => {
  const idle = { used: 30 };
  assert.equal(stubMarks({ ...idle, waiting: 2, questions: 2 }).answer, true);
  assert.equal(stubMarks({ ...idle, waiting: 2, questions: 1 }).answer, false);
  assert.equal(stubMarks({ ...idle, waiting: 1 }).answer, false);
  assert.equal(stubMarks({ ...idle, waiting: 0, questions: 0 }).answer, false);
});
