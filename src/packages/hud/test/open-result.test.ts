import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RETRY_AFTER_MS,
  failureAt,
  failureOf,
  openThenPutAway,
} from "../src/open-result.ts";

test("only true counts as there; anything else says why (#220)", () => {
  assert.equal(failureOf(true, true), null);
  assert.equal(
    failureOf("Claude 桌面里找不到这个会话", true),
    "Claude 桌面里找不到这个会话",
  );
  for (const result of [false, undefined, "", "  "])
    assert.equal(failureOf(result, true), "无法回到这个会话");
  assert.equal(failureOf(false, false), "Couldn't return to this session");
});

test("a failed open may be tried again a few seconds later (#220)", () => {
  const at = 1_000;
  const failures = new Map([
    ["r1", { reason: "找不到", until: at + RETRY_AFTER_MS }],
  ]);
  assert.equal(failureAt(failures, "r1", at), "找不到");
  assert.equal(failureAt(failures, "r1", at + RETRY_AFTER_MS), null);
  assert.equal(failureAt(failures, "r2", at), null);
  assert.ok(RETRY_AFTER_MS >= 2_000 && RETRY_AFTER_MS <= 10_000);
});

test("the panel goes away only once Settings or Statistics opened (#220)", async () => {
  const steps: string[] = [];
  const opened = await openThenPutAway(
    async () => {
      steps.push("open");
      return true;
    },
    () => steps.push("away"),
  );
  assert.equal(opened, null);
  assert.deepEqual(steps, ["open", "away"]);

  steps.length = 0;
  const failed = await openThenPutAway(
    async () => {
      steps.push("open");
      throw new Error("Settings window worker failed");
    },
    () => steps.push("away"),
  );
  assert.equal(failed, "Settings window worker failed");
  assert.deepEqual(steps, ["open"]);

  const refused = await openThenPutAway(
    () => Promise.reject("窗口打不开"),
    () => steps.push("away"),
  );
  assert.equal(refused, "窗口打不开");
  assert.deepEqual(steps, ["open"]);
});
