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
    // The cap unset: five (#347).
    [["h1", "returned", "1/5"]],
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

test("every open relay is listed, the person's first and the quiet last; the stub skips the quiet", () => {
  // #427 (owner chose 甲): the receipt counts what the paper plane counts.
  const desk = (handoffs: Handoff[], sessions: Session[] = []) =>
    chatgptDesk({ sessions, handoffs }, now, true);
  const quiet = relay({
    id: "q",
    phase: "replied",
    auto: true,
    phaseAt: now - 3 * 60 * min,
  });
  const working = relay({ id: "w", phase: "working", phaseAt: now - 5 * min });
  const unsent = relay({ id: "u", phase: "failed", phaseAt: now - 20 * min });
  const listed = desk([quiet, working, unsent]);
  assert.deepEqual(
    listed.reviews.map((r) => [r.id, r.group]),
    [
      ["u", "need"],
      ["w", "move"],
      ["q", "quiet"],
    ],
  );
  assert.equal(listed.open, 3);
  assert.equal(listed.need, 1);
  assert.equal(listed.reviewsMore, 0);
  // Over two hours still and its Claude session not running: listed, but
  // its 「回信」 no longer turns the stub to 「待你看」 (#213 unchanged).
  assert.equal(desk([quiet]).stub.text, "--");
  // Ended and closed relays are never listed.
  assert.deepEqual(
    desk([relay({ status: "closed", phase: "ended", phaseAt: now })]).reviews,
    [],
  );
});

test("the receipt lists four relays and counts the rest", () => {
  const many = Array.from({ length: 6 }, (_, index) =>
    relay({
      id: `h${index}`,
      chatgptConversation: `r${index}`,
      phaseAt: now - index * min,
    }),
  );
  const desk = chatgptDesk({ sessions: [], handoffs: many }, now, true);
  assert.deepEqual(
    desk.reviews.map((r) => r.id),
    ["h0", "h1", "h2", "h3"],
  );
  assert.equal(desk.open, 6);
  assert.equal(desk.reviewsMore, 2);
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

test("the panel lists every chat of today, as many as the stub counts", () => {
  // #219: the stub said 「5 对话」 and the panel listed none.
  const desk = chatgptDesk(
    {
      sessions: [
        chat("a", now - 20 * min),
        chat("b", now - 2 * min, "running"),
        chat("c", now - 40 * min),
        chat("d", now - 50 * min),
        chat("e", now - 60 * min),
        chat("r1", now - 30 * min, "idle", true),
        chat("old", now - 20 * 60 * min),
      ],
      handoffs: [relay({})],
    },
    now,
    true,
  );
  assert.deepEqual(
    desk.day.map((c) => [c.id, c.state]),
    [
      ["chatgpt:b", "answering"],
      ["chatgpt:a", "replied"],
      ["chatgpt:c", "replied"],
      ["chatgpt:d", "replied"],
      ["chatgpt:e", "replied"],
    ],
  );
  assert.equal(desk.day.length, desk.today);
  // The receipt still lists three of them.
  assert.deepEqual(desk.chats, desk.day.slice(0, 3));
  // Nothing answering: the stub's count is the panel's list.
  const quiet = chatgptDesk(
    { sessions: [chat("a", now - 20 * min), chat("c", now - 40 * min)] },
    now,
    true,
  );
  assert.equal(quiet.stub.text, `${quiet.day.length} 对话`);
});
