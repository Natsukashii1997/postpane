import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pendantChain,
  pendantLayout,
  pendantParts,
} from "../src/app-pendant.ts";

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

test("along the bottom the ring sits level with the stubs' middle", () => {
  const strip = { x: 600, y: 830, width: 200, height: 70 };
  const layout = pendantLayout(strip, "bottom", 28, room);
  assert.equal(layout.frame.y + layout.ring / 2, 865);
  assert.equal(layout.frame.height, layout.ring);
});

test("a second app hangs under the first, the same cord and ring again (#155)", () => {
  const strip = { x: 1392, y: 100, width: 48, height: 300 };
  const [notes, disk] = pendantChain(strip, "right", 28, room, 2);
  assert.ok(notes && disk);
  assert.deepEqual(notes, pendantLayout(strip, "right", 28, room));
  assert.equal(disk.frame.y, notes.frame.y + notes.frame.height);
  assert.equal(disk.frame.x, notes.frame.x);
  assert.deepEqual(
    [disk.frame.width, disk.frame.height, disk.cord, disk.ring, disk.ball],
    [notes.frame.width, notes.frame.height, notes.cord, notes.ring, notes.ball],
  );
});

test("with room for one pendant but not two, the whole chain hangs above the strip", () => {
  const parts = pendantParts(28);
  const along = parts.cord + parts.ring;
  // Room under the strip for exactly one pendant.
  const strip = { x: 1392, y: 900 - 300 - along, width: 48, height: 300 };
  assert.equal(pendantLayout(strip, "right", 28, room).reversed, false);
  const [notes, disk] = pendantChain(strip, "right", 28, room, 2);
  assert.ok(notes && disk);
  assert.equal(notes.reversed, true);
  assert.equal(notes.frame.y + notes.frame.height, strip.y);
  assert.equal(disk.frame.y + disk.frame.height, notes.frame.y);
});

test("along the top the second follows the first sideways", () => {
  const strip = { x: 600, y: 0, width: 200, height: 70 };
  const [notes, disk] = pendantChain(strip, "top", 28, room, 2);
  assert.ok(notes && disk);
  assert.equal(disk.frame.x, notes.frame.x + notes.frame.width);
  assert.equal(disk.frame.y, notes.frame.y);
});

test("with room for the chain on neither side it takes the roomier one", () => {
  const parts = pendantParts(28);
  const along = parts.cord + parts.ring;
  // 80 under the strip, 60 above: one pendant fits under, two nowhere.
  const strip = { x: 1392, y: 60, width: 48, height: 760 };
  const [notes, disk] = pendantChain(strip, "right", 28, room, 2);
  assert.ok(notes && disk);
  assert.equal(notes.reversed, false);
  assert.equal(notes.frame.y, 820);
  assert.equal(disk.frame.y, 820 + along);
});

test("no app hung, no pendant", () => {
  const strip = { x: 1392, y: 100, width: 48, height: 300 };
  assert.deepEqual(pendantChain(strip, "right", 28, room, 0), []);
});
