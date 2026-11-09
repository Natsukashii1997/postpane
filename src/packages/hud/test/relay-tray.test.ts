import { test } from "node:test";
import assert from "node:assert/strict";
import type { Session } from "@agent-hud/protocol";
import {
  alreadyQueuedText,
  launchKind,
  launchLine,
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

test("a Claude Code session on this machine or a Codex thread can hand its work over", () => {
  assert.deepEqual(trayKinds(session({})), [
    "review",
    "test",
    "cont",
    "disc",
    "rm",
  ]);
  assert.deepEqual(trayKinds(session({ client: "claude-cloud" })), ["rm"]);
  // #282: Codex threads hand their work over too.
  assert.deepEqual(trayKinds(session({ source: "codex" })), [
    "review",
    "test",
    "cont",
    "disc",
    "rm",
  ]);
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

test("a row says how its swipe's words stand until the session takes them", () => {
  assert.deepEqual(
    launchLine({ kind: "review", state: "queued", reason: null }, true),
    { ok: true, text: "审核请求排队中，会话空下来就处理" },
  );
  assert.deepEqual(
    launchLine({ kind: "discuss", state: "expired", reason: null }, true),
    { ok: false, text: "讨论请求过期了，没送进会话" },
  );
  assert.deepEqual(
    launchLine({ kind: "review", state: "refused", reason: "busy" }, true),
    { ok: false, text: "审核请求被拒绝：busy" },
  );
  assert.equal(
    launchLine({ kind: "review", state: "refused", reason: null }, false).text,
    "Review request refused by the session",
  );
  assert.equal(alreadyQueuedText(true), "已在排队，不再重复发");
});

test("words in the session are not yet a handoff; an hour with none says so", () => {
  assert.deepEqual(
    launchLine({ kind: "review", state: "started", reason: null }, true),
    { ok: true, text: "审核请求已送进会话，正在整理" },
  );
  assert.deepEqual(
    launchLine({ kind: "discuss", state: "stalled", reason: null }, true),
    { ok: false, text: "会话领了讨论请求，但一小时没发起接力" },
  );
  assert.equal(
    launchLine({ kind: "review", state: "stalled", reason: null }, false).text,
    "The session took the review request but started no handoff in an hour",
  );
});

test("words gone before they were seen taken are not said to be taken", () => {
  assert.deepEqual(
    launchLine({ kind: "review", state: "unknown", reason: null }, true),
    { ok: true, text: "审核请求状态不明，可能还在处理" },
  );
  assert.deepEqual(
    launchLine({ kind: "discuss", state: "lost", reason: null }, true),
    { ok: false, text: "讨论请求状态不明，一小时没等到接力" },
  );
  assert.equal(
    launchLine({ kind: "review", state: "lost", reason: null }, false).text,
    "Review request unaccounted for; no handoff in an hour",
  );
});
