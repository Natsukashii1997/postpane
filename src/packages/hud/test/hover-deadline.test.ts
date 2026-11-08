import { test } from "node:test";
import assert from "node:assert/strict";
import { hoverTimer, reduceHover, type HoverState } from "../src/hover.ts";

const timing = { hoverDelayMs: 200, collapseDelayMs: 300 };

/** A browser timer waits whole milliseconds, cut down; `early` is how much
 * sooner than that it may still fire. */
function fire(state: HoverState, now: number, early = 0): HoverState {
  assert.ok(state.phase === "opening" || state.phase === "closing");
  const { delayMs, firedAt } = hoverTimer(state.deadline, now);
  const at = now + Math.trunc(delayMs) - early;
  return reduceHover(state, { type: "timer", now: firedAt(at) }, timing);
}

test("the hover timer opens the panel when it fires, not a moment short of it (#259 A2)", () => {
  // The pointer came in at 100.4: the deadline is 300.4, not a whole millisecond.
  const opening = reduceHover(
    { phase: "collapsed" },
    { type: "enter", now: 100.4 },
    timing,
  );
  assert.deepEqual(fire(opening, 100.4), { phase: "open" });
  // Asked 0.6 ms after the pointer, the wait is 199.8 ms, cut to 199.
  assert.deepEqual(fire(opening, 101), { phase: "open" });
});

test("the hover timer closes the panel even when the clock fires it a little early", () => {
  const closing = reduceHover(
    { phase: "open" },
    { type: "leave", now: 1000 },
    timing,
  );
  assert.deepEqual(fire(closing, 1000, 0.5), { phase: "collapsed" });
});
