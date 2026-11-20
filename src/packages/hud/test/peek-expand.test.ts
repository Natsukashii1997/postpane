import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardAgent,
  inlineAlertAllowed,
  peekExpandWait,
  peekGrowing,
  PEEK_GROWS_INTO,
} from "../src/peek-expand.ts";

test("a peek left on its mark grows into that agent's own panel, not the board", () => {
  // As a click on the mark does: pinned, the board not out.
  assert.deepEqual(PEEK_GROWS_INTO, { pinned: true, expanded: false });
  assert.equal(
    cardAgent({
      notch: false,
      inUsagePanel: false,
      hovered: "hermes",
      expanded: PEEK_GROWS_INTO.expanded,
    }),
    "hermes",
  );
  assert.equal(inlineAlertAllowed({ notch: false, ...PEEK_GROWS_INTO }), true);
});

test("a peek grows into its panel 1.5 s after it shows, 1.9 s after the mark", () => {
  // Pointer came to the mark at 1000; the peek showed at 1400.
  assert.equal(peekExpandWait(400, 1000, 1400), 1500);
  assert.equal(peekExpandWait(400, 1000, 2800), 100);
  assert.equal(peekExpandWait(400, 1000, 3300), 0);
});

test("moving to another mark counts the whole 1.9 s again from there", () => {
  assert.equal(peekExpandWait(400, 5000, 5000), 1900);
});

test("a peek grows into its panel only while the pointer stays on the sidebar (#480)", () => {
  const base = {
    peek: true,
    pinned: false,
    expanded: false,
    hovered: "deepseek",
    focused: "deepseek",
    pointerInside: true,
  };
  assert.equal(peekGrowing(base), "deepseek");
  // Gone to a pendant, or out of the window, while the peek closes.
  assert.equal(peekGrowing({ ...base, pointerInside: false }), null);
  assert.equal(peekGrowing({ ...base, peek: false }), null);
  assert.equal(peekGrowing({ ...base, pinned: true }), null);
  assert.equal(peekGrowing({ ...base, expanded: true }), null);
  assert.equal(peekGrowing({ ...base, hovered: null }), null);
  assert.equal(peekGrowing({ ...base, focused: "claude" }), null);
});

test("a longer hover delay keeps the 1.5 s between peek and board", () => {
  assert.equal(peekExpandWait(600, 0, 600), 1500);
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
