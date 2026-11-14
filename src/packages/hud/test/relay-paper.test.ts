import { test } from "node:test";
import assert from "node:assert/strict";
import {
  airmailSides,
  airmailStripes,
  paperOf,
  perforatedSide,
  relayPaperOf,
} from "../src/paper.ts";

test("a handoff is printed on the same old letter paper in either appearance", () => {
  for (const light of [true, false]) {
    const relay = relayPaperOf(light, { left: 22, right: 16 });
    const receipt = paperOf(light);
    // Light paper and dark ink even beside dark receipts.
    assert.equal(relay.light, true);
    assert.notEqual(relay.paper, receipt.paper);
    assert.notEqual(relay.ink, receipt.ink);
    assert.deepEqual(relay.bleed, { left: 22, right: 16 });
    assert.match(relay.text(0.5), /^rgba\(38,48,63,0\.58\)$/);
  }
  // One paper for every review (owner, #145): dimmed grey-blue, not the cold
  // bright blue that glared under a dark receipt.
  assert.equal(relayPaperOf(true).paper, "#cdd4dc");
  assert.equal(relayPaperOf(false).paper, "#cdd4dc");
});

test("airmail stripes are toned down to sit with the receipt ink", () => {
  const stripes = airmailStripes(6);
  assert.match(stripes, /#b0574b/);
  assert.match(stripes, /#46679f/);
});

test("the airmail stripes never fall on the hole side, docked to any edge", () => {
  for (const edge of ["left", "right", "top", "bottom"] as const) {
    const sides = airmailSides(edge, true);
    assert.equal(sides.length, 1, edge);
    assert.notEqual(sides[0], perforatedSide(edge), edge);
  }
  // The open card keeps its top band, unless docked to the bottom edge,
  // where the holes take the top.
  assert.deepEqual(airmailSides("right", true), ["top"]);
  assert.deepEqual(airmailSides("left", true), ["top"]);
  assert.deepEqual(airmailSides("top", true), ["top"]);
  assert.deepEqual(airmailSides("bottom", true), ["bottom"]);
});

test("a folded handoff tag has no airmail band, like the others (owner, 2026-11-14)", () => {
  // Folded into its tag or narrow slip, the handoff's paper drops the side
  // band so it stands as the same slip as every other agent's.
  for (const edge of ["left", "right", "top", "bottom"] as const)
    assert.deepEqual(airmailSides(edge, false), [], edge);
});
