import { test } from "node:test";
import assert from "node:assert/strict";
import { paperOf, relayPaperOf } from "../src/paper.ts";

test("a handoff is printed on pale airmail paper in either appearance", () => {
  for (const light of [true, false]) {
    const relay = relayPaperOf(light, { left: 22, right: 16 });
    const receipt = paperOf(light);
    // Light paper and dark ink even beside dark receipts.
    assert.equal(relay.light, true);
    assert.notEqual(relay.paper, receipt.paper);
    assert.notEqual(relay.ink, receipt.ink);
    assert.deepEqual(relay.bleed, { left: 22, right: 16 });
    assert.match(relay.text(0.5), /^rgba\(30,40,58,0\.58\)$/);
  }
  // Bluer where the receipts are already light.
  assert.notEqual(relayPaperOf(true).paper, relayPaperOf(false).paper);
});
