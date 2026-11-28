import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENVELOPE,
  ENVELOPE_LOW,
  letterClip,
  lowFace,
  PLANE,
  PLANE_LOW,
  rollAt,
  shadowAt,
  tumble,
} from "../src/scene/flight-paper.ts";

const corners = (clip: string) =>
  clip
    .replace(/^polygon\(|\)$/g, "")
    .split(",")
    .map((pair) => pair.trim().split(/\s+/).map(parseFloat));

test("the envelope folds into the plane point for point, and its lower half into the lower wing", () => {
  assert.equal(corners(ENVELOPE).length, corners(PLANE).length);
  assert.equal(corners(ENVELOPE_LOW).length, corners(PLANE_LOW).length);
  for (const clip of [ENVELOPE, PLANE, ENVELOPE_LOW, PLANE_LOW])
    for (const [x, y] of corners(clip))
      assert.ok(
        x >= 0 && x <= 100 && y >= 0 && y <= 100,
        `${clip} stays in its box`,
      );
  // The lower half of the envelope is its bottom half, and greys as it folds under.
  assert.ok(corners(ENVELOPE_LOW).every(([, y]) => y >= 50));
  const frames = lowFace([
    { offset: 0, clipPath: ENVELOPE },
    { offset: 0.4, clipPath: PLANE },
    { offset: 1, clipPath: ENVELOPE },
  ]);
  assert.deepEqual(
    frames.map((frame) => [frame.offset, frame.clipPath, frame.opacity]),
    [
      [0, ENVELOPE_LOW, 0],
      [0.4, PLANE_LOW, 1],
      [1, ENVELOPE_LOW, 0],
    ],
  );
});

test("the plane rolls over through the loop when it lands the other way up, else only banks", () => {
  assert.equal(rollAt(0, true), 1);
  assert.equal(rollAt(1, true), -1);
  assert.ok(
    Math.abs(rollAt(0.5, true)) <= 0.3,
    "edge on halfway through the roll",
  );
  assert.equal(rollAt(0, false), 1);
  assert.equal(rollAt(1, false), 1);
  assert.ok(Math.abs(rollAt(0.5, false) - 0.5) < 1e-9, "banked halfway");
});

test("its shadow lies close under it on the ground and drifts off, fainter, as it climbs", () => {
  const ground = shadowAt(0, 1);
  const high = shadowAt(1, 1);
  assert.deepEqual(ground, { dx: 3, dy: 10, width: 1, opacity: 0.16 });
  assert.ok(high.dx > ground.dx && high.dy > ground.dy);
  assert.ok(high.width < ground.width && high.opacity < ground.opacity);
  // A bigger craft casts its shadow further.
  assert.equal(shadowAt(0, 1.5).dy, 15);
});

test("the letter slips behind the envelope's front edge as it drops in", () => {
  assert.equal(letterClip(-20, 10, -8), "inset(0px 0px 0% 0px)");
  assert.equal(letterClip(-13, 10, -8), "inset(0px 0px 50% 0px)");
  assert.equal(letterClip(-6, 10, -8), "inset(0px 0px 100% 0px)");
});

test("a refused plane tumbles: it drops faster and faster, spinning more than a turn", () => {
  assert.deepEqual(tumble(0), { dx: 0, dy: 0, spin: 0 });
  const end = tumble(1);
  assert.ok(end.dy >= 90, `${end.dy} drops far`);
  assert.ok(end.spin >= 360, `${end.spin} spins over`);
  assert.ok(tumble(0.5).dy < end.dy / 2, "it speeds up");
});
