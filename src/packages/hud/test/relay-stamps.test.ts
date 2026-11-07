import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff } from "@agent-hud/protocol";
import {
  LETTER_LANDS_MS,
  REPLY_WAIT_MS,
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
/** A clock just after the relays above moved. */
const NOW = 100;

test("ChatGPT's stub is stamped 「审」 while it has the words, rippling while it answers", () => {
  const chatgpt = "chatgpt";
  assert.equal(relayStamps({ handoffs: [] }, chatgpt, NOW), undefined);
  for (const phase of [
    "sending",
    "replied",
    "returned",
    "ended",
    "failed",
  ] as const)
    assert.equal(
      relayStamps({ handoffs: [relay(phase)] }, chatgpt, NOW),
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
    NOW,
  );
  assert.deepEqual(delivered, {
    review: true,
    answering: false,
    replied: false,
    since: 20,
    overdue: false,
    conversation: undefined,
    until: 50 + REPLY_WAIT_MS + 1,
  });
  assert.equal(
    relayStamps({ handoffs: [relay("working")] }, chatgpt, NOW)?.answering,
    true,
  );
  // A relay no longer open prints nothing.
  assert.equal(
    relayStamps({ handoffs: [relay("working", [], "closed")] }, chatgpt, NOW),
    undefined,
  );
  // Claude's stub takes no 「审」.
  assert.equal(
    relayStamps({ handoffs: [relay("working")] }, "claude", NOW),
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
    NOW,
  );
  assert.deepEqual(replied, {
    review: false,
    answering: false,
    replied: true,
    since: 30,
    overdue: false,
    until: null,
  });
  // Sent back to Claude, or ended: the seal comes off.
  for (const phase of ["returned", "ended"] as const)
    assert.equal(
      relayStamps({ handoffs: [relay(phase)] }, "claude", NOW),
      undefined,
      phase,
    );
  assert.equal(
    relayStamps({ handoffs: [relay("replied")] }, "chatgpt", NOW),
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

test("a relay stopped or handed back takes no 「审」; one unanswered past the wait takes 「未审」", () => {
  // Owner, 2026-11-07: 「审」 only while ChatGPT really has the words.
  const halted = { ...relay("delivered"), halt: "驿窗重启，自动往返先暂停" };
  assert.equal(relayStamps({ handoffs: [halted] }, "chatgpt", NOW), undefined);
  // Past the wait, stopped or not, it is 「未审」 and the mark goes there.
  const late = {
    ...relay("delivered", [{ at: 50, kind: "ask" }]),
    chatgptConversation: "c-late",
  };
  const after = 50 + REPLY_WAIT_MS + 1;
  for (const handoff of [late, { ...late, halt: "ChatGPT 30 分钟没回信" }]) {
    const stamps = relayStamps({ handoffs: [handoff] }, "chatgpt", after);
    assert.equal(stamps?.overdue, true);
    assert.equal(stamps?.conversation, "c-late");
    assert.equal(stamps?.answering, false);
  }
  // Up to the wait it is still 「审」, and says when it turns.
  const fresh = relayStamps(
    { handoffs: [late] },
    "chatgpt",
    50 + REPLY_WAIT_MS,
  );
  assert.equal(fresh?.overdue, false);
  assert.equal(fresh?.until, 50 + REPLY_WAIT_MS + 1);
  // One overdue beside one under review: 「未审」 wins, it needs the person.
  const both = relayStamps(
    {
      handoffs: [
        late,
        { ...relay("working"), id: "h-new", phaseAt: after - 10 },
      ],
    },
    "chatgpt",
    after,
  );
  assert.equal(both?.overdue, true);
  assert.equal(both?.answering, false);
});
