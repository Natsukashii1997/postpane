import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, Session } from "@agent-hud/protocol";
import { liveSessions } from "../src/panel/agent-board.ts";
import {
  prunedRemovals,
  removedKey,
  shownSessions,
  withRemoval,
} from "../src/panel/removed-sessions.ts";

function session(
  id: string,
  state: Session["state"],
  at: string,
  extra: Partial<Session> = {},
): Session {
  return {
    id,
    title: id,
    source: "claude",
    model: "claude-opus",
    cwd: null,
    updatedAt: at,
    lastMessageAt: at,
    state,
    tokens: 0,
    cost: null,
    contextPercent: null,
    logPath: null,
    parentId: null,
    ...extra,
  };
}

const ask = (sessionId: string, id: string): Approval =>
  ({
    id,
    title: "Bash",
    source: "claude",
    sessionId,
    kind: "permission",
    createdAt: "2026-11-05T12:00:00Z",
    summary: "ls",
  }) as Approval;

const ids = (sessions: Session[], approvals: Approval[], removed = {}) =>
  shownSessions(liveSessions(sessions, approvals), removed).map(
    (entry) => entry.session.id,
  );

const removing = (sessions: Session[], approvals: Approval[], id: string) => {
  const entry = liveSessions(sessions, approvals).find(
    (item) => item.session.id === id,
  );
  assert.ok(entry);
  return withRemoval({}, entry);
};

test("a removed session leaves the list, the others stay", () => {
  const sessions = [
    session("cloud", "waiting", "2026-11-05T10:00:00Z"),
    session("busy", "running", "2026-11-05T11:00:00Z"),
  ];
  const removed = removing(sessions, [], "cloud");
  assert.deepEqual(ids(sessions, [], removed), ["busy"]);
});

test("a removed waiting session comes back with a new message", () => {
  const before = [session("cloud", "waiting", "2026-11-05T10:00:00Z")];
  const removed = removing(before, [], "cloud");
  const after = [session("cloud", "waiting", "2026-11-05T10:05:00Z")];
  assert.deepEqual(ids(after, [], removed), ["cloud"]);
});

test("a removed session comes back with a new request", () => {
  const sessions = [session("s", "running", "2026-11-05T10:00:00Z")];
  const removed = removing(sessions, [ask("s", "req-1")], "s");
  assert.deepEqual(ids(sessions, [ask("s", "req-1")], removed), []);
  assert.deepEqual(ids(sessions, [ask("s", "req-2")], removed), ["s"]);
});

test("a removed running session stays away while it works, back when it waits", () => {
  const removed = removing(
    [session("s", "running", "2026-11-05T10:00:00Z")],
    [],
    "s",
  );
  assert.deepEqual(
    ids([session("s", "running", "2026-11-05T10:09:00Z")], [], removed),
    [],
  );
  assert.deepEqual(
    ids([session("s", "waiting", "2026-11-05T10:09:00Z")], [], removed),
    ["s"],
  );
});

test("a removal ends once its session stops, kept while it is unknown", () => {
  const removed = removing(
    [session("s", "running", "2026-11-05T10:00:00Z")],
    [],
    "s",
  );
  const stopped = [session("s", "idle", "2026-11-05T10:20:00Z")];
  assert.deepEqual(
    prunedRemovals(removed, liveSessions(stopped, []), new Set(["claude:s"])),
    {},
  );
  assert.deepEqual(prunedRemovals(removed, [], new Set()), removed);
});

test("removals keep the latest hundred", () => {
  let removed = {};
  for (let index = 0; index < 120; index += 1) {
    const [entry] = liveSessions(
      [session(`s${index}`, "running", "2026-11-05T10:00:00Z")],
      [],
    );
    removed = withRemoval(removed, entry);
  }
  const keys = Object.keys(removed);
  assert.equal(keys.length, 100);
  assert.equal(keys.at(-1), "claude:s119");
  assert.equal(
    removedKey(
      liveSessions([session("s0", "running", "2026-11-05T10:00:00Z")], [])[0],
    ) in removed,
    false,
  );
});
