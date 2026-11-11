import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, Session, Snapshot } from "@agent-hud/protocol";
import { runningForMark } from "../src/panel/card-running.ts";

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

const providers = [
  { id: "claude", name: "Claude Code" },
  { id: "codex", name: "Codex" },
] as Snapshot["providers"];

test("a news card lists its own agent's sessions at work, newest first (#307)", () => {
  const sessions = [
    session("old-run", "running", "2026-11-11T03:30:00Z"),
    session("new-run", "running", "2026-11-11T03:40:00Z"),
    session("idle", "idle", "2026-11-11T03:41:00Z"),
    session("asks", "waiting", "2026-11-11T03:20:00Z"),
    session("codex-run", "running", "2026-11-11T03:42:00Z", {
      source: "codex",
    }),
  ];
  const listed = runningForMark(
    { providers, sessions, approvals: [] },
    "claude",
  );
  assert.deepEqual(
    listed.map((entry) => entry.session.id),
    ["new-run", "old-run"],
  );
  assert.ok(listed.every((entry) => entry.status === "running"));
});

test("a running session with a question open is on the card already, not listed again", () => {
  const sessions = [
    session("run", "running", "2026-11-11T03:40:00Z"),
    session("run-asking", "running", "2026-11-11T03:41:00Z"),
  ];
  const approvals = [
    {
      id: "req-1",
      title: "Bash",
      source: "claude",
      toolName: "Bash",
      input: "",
      sessionId: "run-asking",
      createdAt: "2026-11-11T03:41:00Z",
      allowsAlways: false,
    } as Approval,
  ];
  assert.deepEqual(
    runningForMark({ providers, sessions, approvals }, "claude").map(
      (entry) => entry.session.id,
    ),
    ["run"],
  );
});

test("an agent with nothing running gets no rows", () => {
  const sessions = [session("idle", "idle", "2026-11-11T03:41:00Z")];
  assert.deepEqual(
    runningForMark({ providers, sessions, approvals: [] }, "claude"),
    [],
  );
  assert.deepEqual(
    runningForMark({ providers, sessions, approvals: [] }, "codex"),
    [],
  );
});
