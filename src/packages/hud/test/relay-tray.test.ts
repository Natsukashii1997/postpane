import { test } from "node:test";
import assert from "node:assert/strict";
import type { Session } from "@agent-hud/protocol";
import {
  launchKind,
  stepBlock,
  trayKinds,
  trayReady,
  trayText,
} from "../src/panel/relay-tray.ts";

const session = (extra: Partial<Session>): Session =>
  ({
    id: "s1",
    title: "s1",
    source: "claude",
    model: "claude-opus",
    cwd: null,
    updatedAt: "2026-11-06T00:00:00Z",
    lastMessageAt: null,
    state: "running",
    tokens: 0,
    cost: null,
    contextPercent: null,
    logPath: null,
    ...extra,
  }) as Session;

test("only a Claude Code session on this machine can hand its work over", () => {
  assert.deepEqual(trayKinds(session({})), [
    "review",
    "test",
    "cont",
    "disc",
    "rm",
  ]);
  assert.deepEqual(trayKinds(session({ client: "claude-cloud" })), ["rm"]);
  assert.deepEqual(trayKinds(session({ source: "codex" })), ["rm"]);
  assert.deepEqual(trayKinds(session({ source: "hermes" })), ["rm"]);
});

test("testing and carrying on wait for Codex; review and discussion start", () => {
  assert.equal(trayReady("test"), false);
  assert.equal(trayReady("cont"), false);
  assert.equal(launchKind("review"), "review");
  assert.equal(launchKind("disc"), "discuss");
  assert.equal(launchKind("test"), null);
  assert.equal(launchKind("rm"), null);
});

test("arrow keys step over the blocks that do not work yet", () => {
  const kinds = trayKinds(session({}));
  assert.equal(stepBlock(kinds, 0, 1), 3);
  assert.equal(stepBlock(kinds, 3, 1), 4);
  assert.equal(stepBlock(kinds, 4, 1), 4);
  assert.equal(stepBlock(kinds, 3, -1), 0);
  assert.equal(stepBlock(kinds, 0, -1), 0);
});

test("every block names itself and says what it does", () => {
  for (const kind of trayKinds(session({}))) {
    for (const zh of [true, false]) {
      const text = trayText(kind, zh);
      assert.ok(text.label && text.line);
    }
  }
  assert.equal(trayText("rm", true).to, null);
});
