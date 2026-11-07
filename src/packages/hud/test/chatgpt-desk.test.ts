import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff, Session } from "@agent-hud/protocol";
import { chatgptDesk, isReview } from "../src/chatgpt-desk.ts";

const now = Date.parse("2026-11-06T04:00:00Z"); // 12:00 in Beijing
const iso = (ms: number) => new Date(ms).toISOString();
const min = 60_000;

const chat = (id: string, at: number, state = "idle", review?: boolean) =>
  ({
    id: `chatgpt:${id}`,
    source: "chatgpt",
    title: `对话 ${id}`,
    state,
    lastMessageAt: iso(at),
    updatedAt: iso(at),
    ...(review === undefined ? {} : { review }),
  }) as unknown as Session;

const relay = (over: Partial<Handoff>): Handoff => ({
  id: "h1",
  title: "展开卡定稿",
  claudeSession: "s1",
  chatgptConversation: "r1",
  status: "open",
  createdAt: now - 60 * min,
  updatedAt: now - 10 * min,
  rounds: 1,
  phase: "returned",
  phaseAt: now - 10 * min,
  steps: [{ at: now - 50 * min, kind: "ask" }],
  ...over,
});

const claude = (id: string, state: string) =>
  ({ id, source: "claude", title: id, state }) as unknown as Session;

test("the owner's own chats go on top, reviews below, each once", () => {
  const desk = chatgptDesk(
    {
      sessions: [
        chat("a", now - 20 * min),
        chat("b", now - 2 * min, "running"),
        chat("r1", now - 30 * min, "idle", true),
        chat("c", now - 40 * min),
        chat("d", now - 50 * min),
        // Yesterday's chat is not today's.
        chat("old", now - 20 * 60 * min),
      ],
      handoffs: [relay({})],
    },
    now,
    true,
  );
  // Answering first, then the latest; three at most.
  assert.deepEqual(
    desk.chats.map((c) => [c.id, c.state]),
    [
      ["chatgpt:b", "answering"],
      ["chatgpt:a", "replied"],
      ["chatgpt:c", "replied"],
    ],
  );
  assert.equal(desk.more, 1);
  assert.equal(desk.today, 4);
  assert.deepEqual(
    desk.reviews.map((r) => [r.id, r.phase, r.round]),
    [["h1", "returned", "1/2"]],
  );
  assert.deepEqual(desk.stub, { text: "在答", tone: "blue", review: true });
});

test("a review's conversation is a review even before its session says so", () => {
  const handoffs = [relay({})];
  assert.equal(isReview(chat("r1", now), handoffs), true);
  assert.equal(isReview(chat("x", now), handoffs), false);
  assert.equal(isReview(chat("x", now, "idle", true), []), true);
});

test("the stub says what matters most", () => {
  const stub = (sessions: Session[], handoffs: Handoff[]) =>
    chatgptDesk({ sessions, handoffs }, now, true).stub;
  // A review's reply waits for you over anything answering.
  assert.deepEqual(
    stub(
      [chat("b", now, "running")],
      [relay({ phase: "replied", phaseAt: now - 5 * min })],
    ),
    { text: "待你看", tone: "amber", review: true },
  );
  // ChatGPT answering a review counts as answering.
  assert.deepEqual(stub([], [relay({ phase: "working" })]), {
    text: "在答",
    tone: "blue",
    review: true,
  });
  // Otherwise today's chats, or nothing.
  assert.deepEqual(stub([chat("a", now - min)], []), {
    text: "1 对话",
    tone: "ink",
    review: false,
  });
  assert.deepEqual(stub([], []), { text: "--", tone: "dim", review: false });
  assert.deepEqual(
    chatgptDesk({ sessions: [], handoffs: [] }, now, false).stub,
    {
      text: "--",
      tone: "dim",
      review: false,
    },
  );
});

test("an old open relay nobody is on any more is left out", () => {
  const desk = (handoffs: Handoff[], sessions: Session[] = []) =>
    chatgptDesk({ sessions, handoffs }, now, true).reviews.map((r) => r.id);
  const stale = relay({ phase: "replied", phaseAt: now - 3 * 60 * min });
  // Over two hours still and its Claude session not running: gone.
  assert.deepEqual(desk([stale]), []);
  // Its Claude session still working keeps it.
  assert.deepEqual(desk([stale], [claude("s1", "running")]), ["h1"]);
  // Ended and closed relays are never listed.
  assert.deepEqual(
    desk([relay({ status: "closed", phase: "ended", phaseAt: now })]),
    [],
  );
});

test("answering or a reply to read is more pressing than an overdue review", () => {
  // Owner, #213: the stub's 「未审」 waits while either is up.
  const pressing = (sessions: Session[], handoffs: Handoff[]) =>
    chatgptDesk({ sessions, handoffs }, now, true).pressing;
  assert.equal(pressing([chat("a", now, "running")], []), true);
  assert.equal(
    pressing([], [relay({ phase: "replied", phaseAt: now - 5 * min })]),
    true,
  );
  assert.equal(pressing([chat("a", now - min)], []), false);
  assert.equal(pressing([], []), false);
});
