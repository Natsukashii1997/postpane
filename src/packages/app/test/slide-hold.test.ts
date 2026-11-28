import { test } from "node:test";
import assert from "node:assert/strict";
import {
  idleSlide,
  shownValue,
  slideHold,
  type SlideEvent,
} from "../src/settings/slide-hold.ts";

const run = (events: SlideEvent[]) => events.reduce(slideHold, idleSlide);

// A Settings slider is drawn from the saved value, which comes back only
// after the save's round trip: the knob lagged the pointer and jumped back
// to a value from earlier in the drag when an older save answered late.
test("while dragging, the knob follows the pointer, not the saved value", () => {
  const state = run([
    { type: "move", value: 10 },
    { type: "move", value: 20 },
  ]);
  assert.equal(shownValue(state, 0), 20, "the pointer's value, at once");
  const late = slideHold(state, { type: "stored", value: 10 });
  assert.equal(shownValue(late, 10), 20, "an older save does not pull it back");
});

test("after letting go it waits for its own value, then follows the store", () => {
  const released = run([
    { type: "move", value: 20 },
    { type: "move", value: 30 },
    { type: "commit", value: 30 },
    { type: "stored", value: 20 },
  ]);
  assert.equal(shownValue(released, 20), 30, "a stale answer is not shown");
  const settled = slideHold(released, { type: "stored", value: 30 });
  assert.deepEqual(settled, idleSlide);
  assert.equal(shownValue(settled, 45), 45, "then it is the store again");
});

test("a save that never comes back lets go of the knob after a while", () => {
  const released = run([
    { type: "move", value: 30 },
    { type: "commit", value: 30 },
  ]);
  assert.deepEqual(slideHold(released, { type: "timeout" }), idleSlide);
  const dragging = run([{ type: "move", value: 30 }]);
  assert.equal(
    shownValue(slideHold(dragging, { type: "timeout" }), 0),
    30,
    "never while the pointer still holds it",
  );
});
