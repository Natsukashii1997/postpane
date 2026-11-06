import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardAgent,
  inlineAlertAllowed,
  peekExpandWait,
} from "../src/peek-expand.ts";

test("a peek grows into the board 0.8 s after it shows, 1.2 s after the mark", () => {
  // Pointer came to the mark at 1000; the peek showed at 1400.
  assert.equal(peekExpandWait(400, 1000, 1400), 800);
  assert.equal(peekExpandWait(400, 1000, 2100), 100);
  assert.equal(peekExpandWait(400, 1000, 2600), 0);
});

test("moving to another mark counts the whole 1.2 s again from there", () => {
  assert.equal(peekExpandWait(400, 5000, 5000), 1200);
});

test("a longer hover delay keeps the 0.8 s between peek and board", () => {
  assert.equal(peekExpandWait(600, 0, 600), 800);
});

test("the open sidebar shows the hovered agent's peek, or the board once grown", () => {
  const base = { notch: false, inUsagePanel: false, hovered: "claude" };
  assert.equal(cardAgent({ ...base, expanded: false }), "claude");
  assert.equal(cardAgent({ ...base, expanded: true }), undefined);
  assert.equal(
    cardAgent({ ...base, expanded: false, hovered: null }),
    undefined,
  );
});

test("an alert's sender comes first; the notch always shows the board", () => {
  assert.equal(
    cardAgent({
      notch: false,
      sender: "hermes",
      inUsagePanel: false,
      expanded: true,
      hovered: "claude",
    }),
    "hermes",
  );
  assert.equal(
    cardAgent({
      notch: true,
      sender: "hermes",
      inUsagePanel: false,
      expanded: false,
      hovered: "claude",
    }),
    undefined,
  );
});

test("an event sits in the panel only where a panel is out, not on a peek", () => {
  assert.equal(
    inlineAlertAllowed({ notch: false, expanded: false, pinned: false }),
    false,
  );
  assert.equal(
    inlineAlertAllowed({ notch: false, expanded: true, pinned: false }),
    true,
  );
  assert.equal(
    inlineAlertAllowed({ notch: false, expanded: false, pinned: true }),
    true,
  );
  assert.equal(
    inlineAlertAllowed({ notch: true, expanded: false, pinned: false }),
    true,
  );
});
