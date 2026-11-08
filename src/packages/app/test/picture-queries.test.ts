import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PictureQueries,
  QUERY_DEADLINE_MS,
} from "../src/lib/picture-queries.ts";

test("a picture waits for answers that come in time and names none", async () => {
  const queries = new PictureQueries();
  queries.track("statistics", Promise.resolve({ buckets: [] }));
  queries.track("sessions", Promise.reject(new Error("no index")));
  assert.deepEqual(await queries.settle(1_000), []);
});

test("a picture stops waiting at its deadline and names the sections still loading", async () => {
  const queries = new PictureQueries();
  queries.track("statistics", new Promise(() => {}));
  queries.track("sessions", Promise.resolve({ items: [] }));
  const started = Date.now();
  assert.deepEqual(await queries.settle(20), ["tokens"]);
  assert.ok(Date.now() - started < 1_000);
});

test("a deadline already past takes the picture at once", async () => {
  const queries = new PictureQueries();
  queries.track("sessions", new Promise(() => {}));
  assert.deepEqual(await queries.settle(-5_000), ["sessions"]);
});

test("the data wait leaves WebKit's 15 s inside the host's 25 s", () => {
  assert.ok(QUERY_DEADLINE_MS + 15_000 <= 25_000);
});
