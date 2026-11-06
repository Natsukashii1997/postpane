import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff } from "@agent-hud/protocol";
import {
  LETTER_LANDS_MS,
  relayStamps,
  stampWait,
} from "../src/relay-stamps.ts";

const relay = (
  phase: Handoff["phase"],
  steps: Handoff["steps"] = [],
  status: Handoff["status"] = "open",
): Handoff => ({
  id: `h-${phase}`,
  title: "驿窗｜接力",
  claudeSession: "s1",
  status,
  createdAt: 1,
  updatedAt: 1,
  rounds: 0,
  phase,
  phaseAt: 50,
  steps,
});

test("ChatGPT's stub is stamped 「审」 while it has the words, rippling while it answers", () => {
  const chatgpt = "chatgpt";
  assert.equal(relayStamps({ handoffs: [] }, chatgpt), undefined);
  for (const phase of [
    "sending",
    "replied",
    "returned",
    "ended",
    "failed",
  ] as const)
    assert.equal(
      relayStamps({ handoffs: [relay(phase)] }, chatgpt),
      undefined,
      phase,
    );
  const delivered = relayStamps(
    {
      handoffs: [
        relay("delivered", [
          { at: 10, kind: "work" },
          { at: 20, kind: "ask" },
        ]),
      ],
    },
    chatgpt,
  );
  assert.deepEqual(delivered, {
    review: true,
    answering: false,
    replied: false,
    since: 20,
  });
  assert.equal(
    relayStamps({ handoffs: [relay("working")] }, chatgpt)?.answering,
    true,
  );
  // A relay no longer open prints nothing.
  assert.equal(
    relayStamps({ handoffs: [relay("working", [], "closed")] }, chatgpt),
    undefined,
  );
  // Claude's stub takes no 「审」.
  assert.equal(
    relayStamps({ handoffs: [relay("working")] }, "claude"),
    undefined,
  );
});

test("Claude's stub takes the 「回」 seal while an answer waits for the person", () => {
  const replied = relayStamps(
    {
      handoffs: [
        relay("replied", [
          { at: 20, kind: "ask" },
          { at: 30, kind: "reply" },
        ]),
      ],
    },
    "claude",
  );
  assert.deepEqual(replied, {
    review: false,
    answering: false,
    replied: true,
    since: 30,
  });
  // Sent back to Claude, or ended: the seal comes off.
  for (const phase of ["returned", "ended"] as const)
    assert.equal(
      relayStamps({ handoffs: [relay(phase)] }, "claude"),
      undefined,
      phase,
    );
  assert.equal(
    relayStamps({ handoffs: [relay("replied")] }, "chatgpt"),
    undefined,
  );
});

test("a stamp that shows while its letter is in the air waits for it to land", () => {
  assert.equal(stampWait(1000, 1000), LETTER_LANDS_MS);
  assert.equal(stampWait(1000, 1000 + LETTER_LANDS_MS - 400), 400);
  // Landed already, or moved before the mark could see it: at once.
  assert.equal(stampWait(1000, 1000 + LETTER_LANDS_MS + 1), 0);
  assert.equal(stampWait(null, 1000), 0);
  // A clock ahead of the host never waits longer than a flight.
  assert.equal(stampWait(5000, 1000), 0);
  assert.ok(
    LETTER_LANDS_MS > 2000 && LETTER_LANDS_MS < 2600,
    `${LETTER_LANDS_MS}`,
  );
});
