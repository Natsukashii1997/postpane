import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, Session } from "@agent-hud/protocol";
import {
  BACKLOG_MS,
  STOP_WORDS,
  currentRequests,
  inBacklog,
  stopDecision,
} from "../src/panel/backlog.ts";
import { splitWork } from "../src/panel/place-sessions.ts";

const NOW = Date.parse("2026-11-27T15:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ask = (id: string, waited: number, extra: Partial<Approval> = {}) =>
  ({
    id,
    kind: "question",
    createdAt: ago(waited),
    questions: [
      {
        id,
        answerKey: id,
        question: "合并吗？",
        header: null,
        options: [],
        multiSelect: false,
      },
    ],
    ...extra,
  }) as Approval;
const row = (id: string, approval: Approval | null, waited = 0) => ({
  session: {
    id,
    lastMessageAt: ago(waited),
    updatedAt: ago(waited),
  } as Session,
  status: "waiting" as const,
  approval,
});

test("whatever has waited 48 hours sinks to the backlog, of any kind (#563)", () => {
  const fresh = ask("a", BACKLOG_MS - 60_000);
  const old = ask("b", BACKLOG_MS);
  assert.deepEqual(currentRequests([fresh, old], NOW), [fresh]);
  assert.equal(inBacklog(row("s1", old), NOW), true);
  assert.equal(inBacklog(row("s2", fresh), NOW), false);
  // A session waiting with no card: since it last said something.
  assert.equal(inBacklog(row("s3", null, BACKLOG_MS + 1), NOW), true);
  const { waiting, backlog } = splitWork(
    [row("s1", old), row("s2", fresh)],
    NOW,
  );
  assert.deepEqual(
    waiting.map((e) => e.session.id),
    ["s2"],
  );
  assert.deepEqual(
    backlog.map((e) => e.session.id),
    ["s1"],
  );
});

test("不做了 answers a question with the words, denies a permission, else only leaves (#563)", () => {
  assert.deepEqual(stopDecision(ask("q", 0)), {
    kind: "answer",
    answers: { q: { selected: [], custom: STOP_WORDS } },
  });
  assert.deepEqual(stopDecision(ask("p", 0, { kind: "permission" })), {
    kind: "deny",
  });
  assert.equal(stopDecision(ask("x", 0, { answersQuestion: false })), null);
  assert.equal(stopDecision(null), null);
});
