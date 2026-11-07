import { test } from "node:test";
import assert from "node:assert/strict";
import { settingSaves } from "../src/lib/setting-saves.ts";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("a switch clicked while another setting saves is saved after it, not dropped (#224)", async () => {
  const calls: string[] = [];
  const first = deferred();
  const save = settingSaves(async (key) => {
    calls.push(key);
    if (key === "appearance") await first.promise;
  });
  const appearance = save("appearance", "dark");
  const menuBar = save("showMenuBarIcon", true);
  await Promise.resolve();
  assert.deepEqual(calls, ["appearance"], "one save at a time");
  first.resolve();
  await Promise.all([appearance, menuBar]);
  assert.deepEqual(calls, ["appearance", "showMenuBarIcon"]);
});

test("a failed save still lets the queued one run, and its caller sees the failure", async () => {
  const calls: string[] = [];
  const first = deferred();
  const save = settingSaves(async (key) => {
    calls.push(key);
    if (key === "language") await first.promise;
  });
  const language = save("language", "en");
  const quota = save("quotaDisplay", "remaining");
  first.reject(new Error("disk full"));
  await assert.rejects(language, /disk full/);
  await quota;
  assert.deepEqual(calls, ["language", "quotaDisplay"]);
});
