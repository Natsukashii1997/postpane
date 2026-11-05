import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent } from "@agent-hud/protocol";
import { staysUntilSeen } from "../src/alerts/reply-stays.ts";

const event = (source: string, kind: IslandEvent["kind"]): IslandEvent => ({
  id: "e",
  kind,
  at: "2026-11-05T12:51:00Z",
  source,
});

test("a Hermes reply waits until it has been looked at", () => {
  assert.equal(staysUntilSeen(event("hermes", "completion")), true);
});

test("other replies and notices fold away as before", () => {
  assert.equal(staysUntilSeen(event("claude", "completion")), false);
  assert.equal(staysUntilSeen(event("hermes", "bot-offline")), false);
  assert.equal(staysUntilSeen(undefined), false);
});
