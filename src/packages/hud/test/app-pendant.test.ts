import { test } from "node:test";
import assert from "node:assert/strict";
import { pendantLayout, pendantParts } from "../src/app-pendant.ts";

const room = { width: 1440, height: 900 };

test("the pendant's ring is as wide as a stub less its margin, the ball inside it", () => {
  const parts = pendantParts(28);
  assert.equal(parts.stub, 48);
  assert.equal(parts.ring, 44);
  assert.ok(parts.ball < parts.ring && parts.ball >= parts.ring - 10);
});

test("down a right edge it hangs under the strip, centred across it", () => {
  const strip = { x: 1392, y: 100, width: 48, height: 300 };
  const { frame, reversed, horizontal } = pendantLayout(
    strip,
    "right",
    28,
    room,
  );
  assert.equal(horizontal, false);
  assert.equal(reversed, false);
  assert.equal(frame.y, 400);
  assert.equal(frame.x + frame.width / 2, strip.x + strip.width / 2);
});

test("with no room under the strip it hangs above it", () => {
  const strip = { x: 1392, y: 560, width: 48, height: 300 };
  const { frame, reversed } = pendantLayout(strip, "right", 28, room);
  assert.equal(reversed, true);
  assert.equal(frame.y + frame.height, 560);
});

test("along the top it follows the strip sideways, the ring level with the stubs' middle", () => {
  const strip = { x: 600, y: 0, width: 200, height: 70 };
  const layout = pendantLayout(strip, "top", 28, room);
  assert.equal(layout.horizontal, true);
  assert.equal(layout.frame.x, 800);
  assert.equal(layout.frame.y + layout.ring / 2, 35);
});

test("along the bottom its tag sits above the ring, inside the screen", () => {
  const strip = { x: 600, y: 830, width: 200, height: 70 };
  const layout = pendantLayout(strip, "bottom", 28, room);
  assert.equal(layout.frame.y + layout.frame.height - layout.ring / 2, 865);
  assert.ok(layout.frame.y + layout.frame.height <= room.height);
});
