import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SETTLE_MS,
  refusesClick,
  sendThenForget,
} from "../src/permissions/answer-gate.ts";

test("a draft is forgotten only once its answer went", async () => {
  let forgotten = 0;
  const forget = () => forgotten++;
  await sendThenForget(async () => false, { kind: "leave" }, forget);
  assert.equal(forgotten, 0, "a failed send keeps what was written");
  await sendThenForget(async () => true, { kind: "leave" }, forget);
  assert.equal(forgotten, 1);
});

test("the card that takes an answered one's place refuses clicks at first", () => {
  const answeredAt = 1_000;
  const shownAt = 1_120;
  assert.equal(refusesClick({ answeredAt, shownAt, now: shownAt + 150 }), true);
  assert.equal(
    refusesClick({ answeredAt, shownAt, now: shownAt + SETTLE_MS }),
    false,
  );
  assert.ok(SETTLE_MS >= 300 && SETTLE_MS <= 500, "about 400 ms");
});

test("a card no answer came before takes clicks at once", () => {
  assert.equal(
    refusesClick({ answeredAt: null, shownAt: 1_000, now: 1_010 }),
    false,
  );
  // The answer was given on this very card, after it showed.
  assert.equal(
    refusesClick({ answeredAt: 1_500, shownAt: 1_000, now: 1_510 }),
    false,
  );
});
