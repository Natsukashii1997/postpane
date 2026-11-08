import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, IslandEvent, Session } from "@agent-hud/protocol";
import {
  approvalGroups,
  entryTitle,
  findSession,
  modelLine,
  requestBadge,
  requestTitle,
  sessionToOpen,
  tagColor,
  tagCounts,
  tagTone,
  waitedText,
  type ApprovalEntry,
} from "../src/permissions/approval-list.ts";
import { paperLevel, paperOf } from "../src/paper.ts";

const session = (id: string, extra: Partial<Session> = {}): Session => ({
  id,
  title: `Session ${id}`,
  source: "claude",
  model: "claude-opus-5-5",
  cwd: "/w/postpane",
  updatedAt: "2026-11-05T00:00:00Z",
  state: "waiting",
  tokens: 0,
  cost: null,
  contextPercent: null,
  logPath: null,
  parentId: null,
  ...extra,
});

const request = (
  id: string,
  at: string,
  extra: Partial<Approval> = {},
): Approval => ({
  id,
  title: "Run tests",
  source: "claude",
  toolName: "Bash",
  input: "pnpm test",
  sessionId: null,
  createdAt: at,
  allowsAlways: true,
  ...extra,
});

const asked = (
  id: string,
  at: string,
  section?: string,
  badge = "ASK",
): ApprovalEntry => ({
  kind: "request",
  id,
  at,
  badge,
  request: request(id, at),
  session: section === undefined ? undefined : session(id, { section }),
});

const reply = (
  id: string,
  at: string,
  event: IslandEvent = { id, kind: "completion", at, source: "claude" },
): ApprovalEntry => ({ kind: "reply", id, at, badge: "REPLY", event });

test("ASK and PLAN are red, permissions amber, a reply blue", () => {
  assert.equal(tagTone("ASK"), "ask");
  assert.equal(tagTone("PLAN"), "ask");
  for (const badge of ["BASH", "EDIT", "MCP", "READ", "WEB", "AGENT", "TOOL"])
    assert.equal(tagTone(badge), "permission");
  assert.equal(tagTone("REPLY"), "reply");
  for (const light of [true, false]) {
    const paper = paperOf(light);
    assert.equal(tagColor("ask", light), paper.red);
    assert.equal(tagColor("permission", light), paperLevel("warning", paper));
    assert.equal(tagColor("reply", light), paper.blue);
  }
});

test("the longest-waiting request leads; replies follow the requests", () => {
  const { groups, hidden } = approvalGroups(
    [
      reply("r1", "2026-11-05T00:00:00Z"),
      asked("new", "2026-11-05T00:03:00Z"),
      asked("old", "2026-11-05T00:01:00Z"),
    ],
    "old",
  );
  assert.equal(hidden, 0);
  assert.deepEqual(
    groups.flatMap((group) => group.entries.map((entry) => entry.id)),
    ["old", "new", "r1"],
  );
});

test("lines group by sidebar section, in the order the groups first appear", () => {
  const { groups, sectioned } = approvalGroups(
    [
      asked("a", "2026-11-05T00:01:00Z", "驿窗 | PostPane"),
      asked("b", "2026-11-05T00:02:00Z"),
      asked("c", "2026-11-05T00:03:00Z", "驿窗 | PostPane"),
    ],
    "a",
  );
  assert.equal(sectioned, true);
  assert.deepEqual(
    groups.map((group) => [group.section, group.entries.map((e) => e.id)]),
    [
      ["驿窗 | PostPane", ["a", "c"]],
      [null, ["b"]],
    ],
  );
  const none = approvalGroups([asked("a", "2026-11-05T00:01:00Z")], "a");
  assert.equal(none.sectioned, false, "no section anywhere: no group titles");
});

test("past five lines the rest fold away, the open one always shown", () => {
  const entries = Array.from({ length: 8 }, (_, n) =>
    asked(`q${n}`, `2026-11-05T00:0${n}:00Z`),
  );
  const folded = approvalGroups(entries, "q0");
  assert.equal(folded.hidden, 3);
  assert.deepEqual(
    folded.groups[0].entries.map((entry) => entry.id),
    ["q0", "q1", "q2", "q3", "q4"],
  );
  const late = approvalGroups(entries, "q7");
  assert.equal(late.hidden, 3);
  assert.ok(late.groups[0].entries.some((entry) => entry.id === "q7"));
  assert.equal(late.groups[0].entries.length, 5);
  assert.equal(approvalGroups(entries, "q0", Infinity).hidden, 0);
  assert.equal(approvalGroups(entries.slice(0, 5), "q0").hidden, 0);
});

test("the head counts ASK first, permissions next, REPLY last", () => {
  assert.deepEqual(
    tagCounts([
      reply("r", "2026-11-05T00:00:00Z"),
      asked("b", "2026-11-05T00:01:00Z", undefined, "BASH"),
      asked("a1", "2026-11-05T00:02:00Z"),
      asked("a2", "2026-11-05T00:03:00Z"),
    ]),
    [
      { badge: "ASK", count: 2 },
      { badge: "BASH", count: 1 },
      { badge: "REPLY", count: 1 },
    ],
  );
});

test("a request finds its session by id, preferring the same client", () => {
  const sessions = [
    session("s1", { source: "codex" }),
    session("s1"),
    session("s2", { source: "codex" }),
  ];
  assert.equal(findSession(sessions, "s1", "claude"), sessions[1]);
  assert.equal(findSession(sessions, "s2", "claude"), sessions[2]);
  assert.equal(findSession(sessions, "s3", "claude"), undefined);
  assert.equal(findSession(sessions, null, "claude"), undefined);
});

test("the title is the session's, else the name the card used before", () => {
  const entry = asked("a", "2026-11-05T00:00:00Z", "");
  assert.equal(entryTitle(entry, "postpane"), "Session a");
  assert.equal(
    entryTitle({ ...entry, session: undefined }, "postpane"),
    "postpane",
  );
  const event: IslandEvent = {
    id: "r",
    kind: "completion",
    at: "2026-11-05T00:00:00Z",
    source: "claude",
    title: "侧栏聚合",
  };
  assert.equal(entryTitle(reply("r", event.at, event), "Claude"), "侧栏聚合");
});

test("the open line shows the model and effort, or the model alone", () => {
  const entry = asked("a", "2026-11-05T00:00:00Z", "");
  assert.deepEqual(modelLine(entry), {
    model: "claude-opus-5-5",
    effort: null,
  });
  assert.deepEqual(
    modelLine({ ...entry, session: session("a", { effort: "high" }) }),
    { model: "claude-opus-5-5", effort: "high" },
  );
  assert.equal(
    modelLine({ ...entry, session: session("a", { model: "Unknown" }) }),
    null,
  );
  assert.equal(modelLine({ ...entry, session: undefined }), null);
});

test("a line goes back only where its session has a way back", () => {
  const entry = asked("a", "2026-11-05T00:00:00Z", "");
  assert.equal(sessionToOpen(entry), undefined, "no navigation target");
  const reachable = session("a", {
    navigationTarget: { kind: "claude-desktop", id: "local_a" },
  });
  assert.equal(sessionToOpen({ ...entry, session: reachable }), reachable);
  assert.equal(sessionToOpen({ ...entry, session: undefined }), undefined);
  const event: IslandEvent = {
    id: "r",
    kind: "completion",
    at: "2026-11-05T00:00:00Z",
    source: "codex",
    sessionId: "t1",
    navigationTarget: { kind: "codex-thread", id: "t1" },
  };
  const back = sessionToOpen(reply("r", event.at, event));
  assert.equal(back?.id, "t1");
  assert.deepEqual(back?.navigationTarget, event.navigationTarget);
});

test("waiting reads in seconds, minutes, then hours", () => {
  assert.equal(waitedText(7.9, true), "7 秒");
  assert.equal(waitedText(7, false), "7s");
  assert.equal(waitedText(61, true), "1 分钟");
  assert.equal(waitedText(61, false), "1m");
  assert.equal(waitedText(3600, true), "1 小时");
  assert.equal(waitedText(3900, true), "1 小时 5 分");
  assert.equal(waitedText(3900, false), "1h05m");
  assert.equal(waitedText(-3, true), "0 秒");
});

test("a request's folded tag names its session's title, else the folder", () => {
  const sessions = [
    session("s1", { title: "侧栏重置到账细条" }),
    session("s2", { title: "  " }),
  ];
  const at = "2026-11-05T00:00:00Z";
  assert.equal(
    requestTitle(
      request("a", at, { sessionId: "s1" }),
      sessions,
      "scratch-2026-11-05-e0d0b1",
    ),
    "侧栏重置到账细条",
  );
  // No session, or one without a title: the folder the tag used before.
  assert.equal(
    requestTitle(
      request("b", at, { sessionId: "s9" }),
      sessions,
      "scratch-2026-11-05-e0d0b1",
    ),
    "scratch-2026-11-05-e0d0b1",
  );
  assert.equal(
    requestTitle(request("c", at, { sessionId: "s2" }), sessions, "postpane"),
    "postpane",
  );
  assert.equal(requestTitle(request("d", at), sessions, "Claude"), "Claude");
});

test("a request's folded tag is boxed as REPLY is: ANSWER, PLAN or APPROVE (#243)", () => {
  assert.deepEqual(requestBadge("question"), { label: "ANSWER", tone: "ask" });
  assert.deepEqual(requestBadge("plan"), { label: "PLAN", tone: "ask" });
  assert.deepEqual(requestBadge("permission"), {
    label: "APPROVE",
    tone: "permission",
  });
});
