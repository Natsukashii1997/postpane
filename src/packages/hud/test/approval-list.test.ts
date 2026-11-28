import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, IslandEvent, Session } from "@agent-hud/protocol";
import {
  answersElsewhere,
  approvalGroups,
  SHOWN_ENTRIES,
  entryTitle,
  findSession,
  asksOnlyHere,
  goesToStart,
  startDecision,
  startsHere,
  modelLine,
  requestBadge,
  requestTitle,
  sessionToOpen,
  tagColor,
  tagTone,
  waitedText,
  type ApprovalEntry,
} from "../src/permissions/approval-list.ts";
import { paperOf, relayPaperOf } from "../src/paper.ts";

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

test("ASK and PLAN are red, permissions ochre, a reply blue (#308)", () => {
  assert.equal(tagTone("ASK"), "ask");
  assert.equal(tagTone("PLAN"), "ask");
  for (const badge of ["BASH", "EDIT", "MCP", "READ", "WEB", "AGENT", "TOOL"])
    assert.equal(tagTone(badge), "permission");
  assert.equal(tagTone("REPLY"), "reply");
  for (const light of [true, false]) {
    const paper = paperOf(light);
    assert.equal(tagColor("ask", light), paper.red);
    assert.equal(tagColor("permission", light), paper.ochre);
    assert.equal(tagColor("reply", light), paper.blue);
  }
});

test("the newest request leads; replies follow the requests, newest first (#325)", () => {
  const { groups, hidden } = approvalGroups(
    [
      reply("r1", "2026-11-05T00:00:00Z"),
      asked("new", "2026-11-05T00:03:00Z"),
      asked("old", "2026-11-05T00:01:00Z"),
      reply("r2", "2026-11-05T00:04:00Z"),
      asked("timeless", "not a time"),
    ],
    "old",
    Infinity,
  );
  assert.equal(hidden, 0);
  assert.deepEqual(
    groups.flatMap((group) => group.entries.map((entry) => entry.id)),
    ["new", "old", "timeless", "r2", "r1"],
  );
});

test("lines group by sidebar section, the group with the newest line first (#325)", () => {
  const { groups, sectioned } = approvalGroups(
    [
      asked("a", "2026-11-05T00:01:00Z", "驿窗 | PostPane"),
      asked("b", "2026-11-05T00:02:00Z"),
      asked("c", "2026-11-05T00:03:00Z", "驿窗 | PostPane"),
      asked("d", "2026-11-05T00:04:00Z", "数字分身"),
    ],
    "a",
  );
  assert.equal(sectioned, true);
  assert.deepEqual(
    groups.map((group) => [group.section, group.entries.map((e) => e.id)]),
    [
      ["数字分身", ["d"]],
      ["驿窗 | PostPane", ["c", "a"]],
      [null, ["b"]],
    ],
  );
  const none = approvalGroups([asked("a", "2026-11-05T00:01:00Z")], "a");
  assert.equal(none.sectioned, false, "no section anywhere: no group titles");
});

test("past four lines the oldest fold away, the open one always shown (#325; four since 2026-11-15)", () => {
  const entries = Array.from({ length: 8 }, (_, n) =>
    asked(`q${n}`, `2026-11-05T00:0${n}:00Z`),
  );
  const newest = approvalGroups(entries, "q7");
  assert.equal(SHOWN_ENTRIES, 4);
  assert.equal(newest.hidden, 4);
  assert.deepEqual(
    newest.groups[0].entries.map((entry) => entry.id),
    ["q7", "q6", "q5", "q4"],
  );
  // The open one is the oldest (the queue's front): the three newest, then it.
  const oldest = approvalGroups(entries, "q0");
  assert.equal(oldest.hidden, 4);
  assert.deepEqual(
    oldest.groups[0].entries.map((entry) => entry.id),
    ["q7", "q6", "q5", "q0"],
  );
  assert.equal(approvalGroups(entries, "q0", Infinity).hidden, 0);
  assert.equal(approvalGroups(entries.slice(0, 4), "q0").hidden, 0);
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
  assert.deepEqual(requestBadge({ kind: "question" }), {
    label: "ANSWER",
    tone: "ask",
  });
  assert.deepEqual(requestBadge({ kind: "plan" }), {
    label: "PLAN",
    tone: "ask",
  });
  assert.deepEqual(requestBadge({ kind: "permission" }), {
    label: "APPROVE",
    tone: "permission",
  });
});

test("a handoff card's tag reads START, in green (#245)", () => {
  assert.deepEqual(requestBadge({ kind: "question", badge: "START" }), {
    label: "START",
    tone: "start",
  });
  assert.equal(tagTone("START"), "start");
  assert.equal(tagColor("start", true), "#2f7d4f");
});

test("a handoff card goes back to start, where its session has a way back (#247)", () => {
  const reachable = session("a", {
    navigationTarget: { kind: "claude-desktop", id: "local_a" },
  });
  const handoff: ApprovalEntry = {
    kind: "request",
    id: "a",
    at: "2026-11-08T00:00:00Z",
    badge: "START",
    request: request("a", "2026-11-08T00:00:00Z", { badge: "START" }),
    session: reachable,
  };
  assert.equal(goesToStart(handoff, true), true);
  // No way back, or the way back just failed: it is only put away.
  assert.equal(goesToStart(handoff, false), false);
  assert.equal(goesToStart({ ...handoff, session: undefined }, true), false);
  // Any other question keeps its own buttons.
  const question = {
    ...asked("q", "2026-11-08T00:00:00Z", ""),
    session: reachable,
  };
  assert.equal(goesToStart(question, true), false);
  assert.equal(goesToStart(reply("r", "2026-11-08T00:00:00Z"), true), false);
});

test("a handoff card its client can answer starts from the sidebar with 「开始」 (#292)", () => {
  const question = {
    id: "toolu_hand",
    answerKey: "toolu_hand",
    question: "【交接】驿窗｜下一步",
    header: null,
    options: [],
    multiSelect: false,
  };
  const handoff = request(
    "claude-desktop-ask:reply:x",
    "2026-11-09T00:00:00Z",
    {
      kind: "question",
      badge: "START",
      questions: [question],
      answersQuestion: true,
    },
  );
  assert.equal(startsHere(handoff), true);
  assert.deepEqual(startDecision(handoff), {
    kind: "answer",
    answers: { toolu_hand: { selected: [], custom: "开始" } },
  });
  // One its client cannot answer keeps 去开始; another question keeps its own card.
  assert.equal(startsHere({ ...handoff, answersQuestion: false }), false);
  assert.equal(startsHere({ ...handoff, badge: null }), false);
});

test("a permission Claude Code asks through the hook waits only on the sidebar (#292)", () => {
  const asked = request("hook:claude:1:1", "2026-11-09T00:00:00Z", {
    kind: "permission",
  });
  assert.equal(asksOnlyHere(asked), true);
  // Codex's own approvals, and anything that is not a permission, say nothing.
  assert.equal(asksOnlyHere({ ...asked, source: "codex" }), false);
  assert.equal(asksOnlyHere({ ...asked, kind: "question" }), false);
  assert.equal(
    asksOnlyHere({ ...asked, id: "claude-desktop-ask:reply:y" }),
    false,
  );
});

test("one ochre and one word ink on every paper (#308)", () => {
  // Owner 2026-11-11 (乙): the four ambers made the 赭金 picked for 「回」,
  // and a status written out takes one ink of its own.
  assert.equal(paperOf(true).ochre, "#99591a");
  assert.equal(paperOf(false).ochre, "#dba15a");
  assert.equal(paperOf(true).word, "#46566e");
  assert.equal(paperOf(false).word, "#b2bdcf");
  assert.equal(relayPaperOf(true).word, "#3b4a61");
  assert.equal(relayPaperOf(false).ochre, "#8a4f14");
});

const elsewhere = (id: string, at: string): ApprovalEntry => ({
  kind: "request",
  id,
  at,
  badge: "ASK",
  request: request(id, at, { kind: "question", answersQuestion: false }),
});

test("a question only its client can take is answered elsewhere; a handoff card is not (#331)", () => {
  assert.equal(
    answersElsewhere(request("a", "x", { answersQuestion: false })),
    true,
  );
  assert.equal(answersElsewhere(request("a", "x")), false);
  assert.equal(
    answersElsewhere(request("a", "x", { answersQuestion: true })),
    false,
  );
  assert.equal(
    answersElsewhere(
      request("a", "x", { answersQuestion: false, badge: "START" }),
    ),
    false,
  );
});

test("questions only Claude can take sink below the replies and fold away (#331)", () => {
  const entries = [
    elsewhere("gone-new", "2026-11-05T00:09:00Z"),
    asked("old", "2026-11-05T00:01:00Z"),
    reply("r", "2026-11-05T00:05:00Z"),
    elsewhere("gone-old", "2026-11-05T00:00:00Z"),
    asked("new", "2026-11-05T00:03:00Z"),
  ];
  const folded = approvalGroups(entries, "new");
  assert.deepEqual(
    folded.groups.flatMap((group) => group.entries.map((entry) => entry.id)),
    ["new", "old", "r"],
  );
  assert.equal(folded.hidden, 2, "folded even with five lines or fewer");
  const open = approvalGroups(entries, "new", Infinity);
  assert.equal(open.hidden, 0);
  assert.deepEqual(
    open.groups.flatMap((group) => group.entries.map((entry) => entry.id)),
    ["new", "old", "r", "gone-new", "gone-old"],
  );
});

test("when every line can be answered only in Claude, they show as usual (#331)", () => {
  const entries = [
    elsewhere("a", "2026-11-05T00:01:00Z"),
    elsewhere("b", "2026-11-05T00:02:00Z"),
  ];
  const { groups, hidden } = approvalGroups(entries, "b");
  assert.equal(hidden, 0);
  assert.deepEqual(
    groups.flatMap((group) => group.entries.map((entry) => entry.id)),
    ["b", "a"],
  );
});

test("a reply waiting on you hangs REPLY on its card and its folded tag (#562)", async () => {
  const { permissionToolBadge } = await import("../src/alerts/tool-badge.ts");
  const reply = {
    kind: "question",
    badge: "REPLY",
    toolName: "mcp__ccd_turn__wrap_up",
  } as never;
  assert.equal(permissionToolBadge(reply).badge, "REPLY");
  assert.deepEqual(requestBadge(reply), { label: "REPLY", tone: "reply" });
});
