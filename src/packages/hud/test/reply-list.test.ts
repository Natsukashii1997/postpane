import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent, Session } from "@agent-hud/protocol";
import {
  newestReply,
  replyChip,
  replyEntries,
  replyFacts,
  replyGroups,
  replyMessage,
  tookText,
} from "../src/alerts/reply-list.ts";

const session = (id: string, extra: Partial<Session> = {}): Session => ({
  id,
  title: `Session ${id}`,
  source: "claude",
  model: "claude-opus-5-5",
  cwd: "/w/postpane",
  updatedAt: "2026-11-05T00:00:00Z",
  state: "idle",
  tokens: 0,
  cost: null,
  contextPercent: null,
  logPath: null,
  parentId: null,
  ...extra,
});

const reply = (
  id: string,
  at: string,
  extra: Partial<IslandEvent> = {},
): IslandEvent => ({
  id,
  kind: "completion",
  source: "claude",
  at,
  sessionId: id,
  ...extra,
});

test("replies list newest first, grouped by section as they first appear", () => {
  const sessions = [
    session("a", { section: "驿窗 | PostPane" }),
    session("b", { section: "驿窗 | PostPane" }),
    session("c"),
  ];
  const entries = replyEntries(
    [
      reply("c", "2026-11-05T03:20:00Z"),
      reply("a", "2026-11-05T03:42:00Z"),
      reply("b", "2026-11-05T03:38:00Z"),
    ],
    sessions,
  );
  const { groups, hidden, sectioned } = replyGroups(entries);
  assert.deepEqual(
    groups.map((group) => [
      group.section,
      group.entries.map((entry) => entry.id),
    ]),
    [
      ["驿窗 | PostPane", ["a", "b"]],
      [null, ["c"]],
    ],
  );
  assert.equal(hidden, 0);
  assert.equal(sectioned, true);
  assert.equal(newestReply(entries)?.id, "a");
});

test("past the limit the oldest replies fold away, the newest stays open", () => {
  const entries = replyEntries(
    ["1", "2", "3", "4"].map((n) => reply(n, `2026-11-05T03:0${n}:00Z`)),
    [],
  );
  const { groups, hidden, sectioned } = replyGroups(entries, 2);
  assert.deepEqual(
    groups.flatMap((group) => group.entries.map((entry) => entry.id)),
    ["4", "3"],
  );
  assert.equal(hidden, 2);
  assert.equal(sectioned, false);
});

test("a reply without a readable time is listed last and not opened", () => {
  const entries = replyEntries(
    [reply("x", "not a time"), reply("y", "2026-11-05T03:00:00Z")],
    [],
  );
  assert.equal(newestReply(entries)?.id, "y");
});

test("the turn's time runs from its start to the reply", () => {
  const facts = replyFacts(
    reply("a", "2026-11-05T03:42:10Z", {
      startedAt: "2026-11-05T03:38:00Z",
    }),
    session("a", { tokens: 1_300_000 }),
    true,
  );
  assert.deepEqual(facts, { took: "4 分 10 秒", tokens: "1.3M" });
});

test("the turn falls back to the session's start", () => {
  const facts = replyFacts(
    reply("a", "2026-11-05T03:42:10Z"),
    session("a", {
      liveFacts: {
        turnStartedAt: "2026-11-05T03:42:00Z",
      } as Session["liveFacts"],
    }),
    false,
  );
  assert.equal(facts.took, "10s");
});

test("unknown time and tokens are left out", () => {
  assert.deepEqual(
    replyFacts(reply("a", "2026-11-05T03:42:10Z"), undefined, true),
    {
      took: null,
      tokens: null,
    },
  );
  // A start after the reply, or no tokens counted, says nothing either.
  assert.deepEqual(
    replyFacts(
      reply("a", "2026-11-05T03:42:10Z", { startedAt: "2026-11-05T04:00:00Z" }),
      session("a"),
      true,
    ),
    { took: null, tokens: null },
  );
});

test("took reads in minutes and seconds, hours and minutes", () => {
  assert.equal(tookText(35, true), "35 秒");
  assert.equal(tookText(250, true), "4 分 10 秒");
  assert.equal(tookText(3900, true), "1 小时 5 分");
  assert.equal(tookText(3600, true), "1 小时");
  assert.equal(tookText(250, false), "4m 10s");
  assert.equal(tookText(3900, false), "1h 05m");
});

test("the reply's message, else the session's last one", () => {
  const live = session("a", {
    liveFacts: { message: "  from the session  " } as Session["liveFacts"],
  });
  assert.equal(replyMessage(reply("a", "t", { message: "own" }), live), "own");
  assert.equal(replyMessage(reply("a", "t"), live), "from the session");
  assert.equal(
    replyMessage(reply("a", "t", { message: "  " }), undefined),
    null,
  );
});

test("the folded tag names the newest reply's session and counts them all", () => {
  const chip = replyChip(
    [
      reply("a", "2026-11-05T03:20:00Z"),
      reply("b", "2026-11-05T03:42:00Z"),
      reply("z", "2026-11-05T03:30:00Z", {
        source: "codex",
        sessionId: undefined,
      }),
    ],
    [session("a"), session("b", { title: "【交接】侧栏面板" })],
    (event) => `client ${event.source}`,
  );
  assert.equal(chip?.event.id, "b");
  assert.equal(chip?.title, "【交接】侧栏面板");
  assert.equal(chip?.count, 3);
  // Without a session the reply's own title, else the fallback.
  assert.equal(
    replyChip(
      [reply("q", "2026-11-05T03:00:00Z", { title: "Own" })],
      [],
      () => "x",
    )?.title,
    "Own",
  );
  assert.equal(
    replyChip(
      [reply("q", "2026-11-05T03:00:00Z", { sessionId: undefined })],
      [],
      () => "Codex",
    )?.title,
    "Codex",
  );
  assert.equal(
    replyChip([], [], () => "x"),
    undefined,
  );
});
