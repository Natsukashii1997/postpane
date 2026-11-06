import { test } from "node:test";
import assert from "node:assert/strict";
import { airmailStripes, paperOf, relayPaperOf } from "../src/paper.ts";

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
