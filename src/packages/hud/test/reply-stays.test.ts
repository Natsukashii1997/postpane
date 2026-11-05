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

test("a Hermes or ChatGPT reply waits until it has been looked at", () => {
  assert.equal(staysUntilSeen(event("hermes", "completion")), true);
  assert.equal(staysUntilSeen(event("chatgpt", "completion")), true);
});

test("other replies and notices fold away as before", () => {
  assert.equal(staysUntilSeen(event("claude", "completion")), false);
  assert.equal(staysUntilSeen(event("hermes", "bot-offline")), false);
  assert.equal(staysUntilSeen(undefined), false);
});

test("a Hermes reply that arrives goes ahead of a waiting question", async () => {
  const { seenFirst } = await import("../src/alerts/reply-stays.ts");
  const reply = event("hermes", "completion");
  const queue = [
    { type: "request" as const, id: "ask" },
    { type: "news" as const, id: reply.id, event: reply },
  ];
  assert.deepEqual(
    seenFirst(queue, [reply]).map((card) => card.id),
    ["e", "ask"],
  );
  const claude = { ...event("claude", "completion"), id: "c" };
  const other = [
    { type: "request" as const, id: "ask" },
    { type: "news" as const, id: "c", event: claude },
  ];
  assert.deepEqual(
    seenFirst(other, [claude]).map((card) => card.id),
    ["ask", "c"],
  );
});
