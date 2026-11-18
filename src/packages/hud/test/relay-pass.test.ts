import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff, IslandEvent } from "@agent-hud/protocol";
import { passedReply } from "../src/alerts/relay-pass.ts";
import type { ApprovalEntry } from "../src/permissions/approval-list.ts";

const T = Date.UTC(2026, 10, 19, 6, 0);
const minute = 60_000;

const entry = (at: number, session = "chatgpt:g1"): ApprovalEntry =>
  ({
    kind: "reply",
    id: `done:${at}`,
    at: new Date(at).toISOString(),
    event: {
      id: `done:${at}`,
      kind: "completion",
      at: new Date(at).toISOString(),
      source: "chatgpt",
      sessionId: session,
    } as IslandEvent,
  }) as ApprovalEntry;

const relay = (extra: Partial<Handoff> = {}): Handoff => ({
  id: "h1",
  title: "接力审核门第 3 批",
  claudeSession: "s1",
  cwd: "/w",
  chatgptConversation: "g1",
  status: "closed",
  createdAt: T - 30 * minute,
  updatedAt: T + minute,
  rounds: 2,
  phase: "ended",
  notice: "passed",
  steps: [
    { at: T - 30 * minute, kind: "ask" },
    { at: T - 20 * minute, kind: "reply", verdict: "revise" },
    { at: T - 10 * minute, kind: "ask" },
    { at: T, kind: "reply", verdict: "pass" },
  ],
  ...extra,
});

test("the reply PostPane let pass gets 「过」 on the receipt, and only that one (#409)", () => {
  assert.equal(passedReply(entry(T), [relay()]), true);
  // The earlier answer of the same conversation asked for changes.
  assert.equal(passedReply(entry(T - 20 * minute), [relay()]), false);
  // Not let through (held back by the commit check): no notice, no 「过」.
  assert.equal(passedReply(entry(T), [relay({ notice: undefined })]), false);
  assert.equal(passedReply(entry(T), [relay({ notice: "top" })]), false);
  // Another conversation, or a reply that is not ChatGPT's.
  assert.equal(passedReply(entry(T, "chatgpt:g2"), [relay()]), false);
  const claude = entry(T, "s1") as Extract<ApprovalEntry, { kind: "reply" }>;
  assert.equal(
    passedReply({ ...claude, event: { ...claude.event, source: "claude" } }, [
      relay(),
    ]),
    false,
  );
  // The newest handoff of the conversation is the one that counts.
  const again = relay({
    id: "h2",
    notice: undefined,
    status: "open",
    phase: "working",
  });
  assert.equal(passedReply(entry(T), [relay(), again]), false);
});
