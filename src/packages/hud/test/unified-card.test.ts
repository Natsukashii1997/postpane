// Every agent's card is one card (owner chose 甲 on 2026-11-14): one width,
// its head with the plane, 「等待处理」 then 「正在进行」, one list newest
// first that folds back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liveSessions } from "../src/panel/agent-board.ts";
import { splitWork } from "../src/panel/place-sessions.ts";
import { approvalGroups } from "../src/permissions/approval-list.ts";
import { scene } from "./scenes/scenes.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("等待处理在前、正在进行在后，待核对排在等待处理最后", () => {
  const { snapshot } = scene("claude-busy");
  const live = liveSessions(snapshot.sessions, snapshot.approvals).filter(
    (entry) => entry.session.source === "claude",
  );
  const { waiting, running } = splitWork(live);
  assert.deepEqual(
    waiting.map((entry) => entry.session.id),
    ["c-ask"],
  );
  assert.equal(running.length, 4);
  const stale = { ...waiting[0], stale: true };
  const fresh = { ...waiting[0], session: { ...waiting[0].session, id: "x" } };
  assert.deepEqual(
    splitWork([stale, fresh]).waiting.map((entry) => entry.session.id),
    ["x", "c-ask"],
  );
});

test("等待处理不再按项目分区，一条列表、最新在上", () => {
  const { snapshot } = scene("claude-many-asks");
  const entries = snapshot.approvals.map((request) => ({
    kind: "request" as const,
    id: request.id,
    at: request.createdAt,
    badge: "ASK",
    request,
    session: { ...snapshot.sessions[0], section: "管培生工作台" },
  }));
  const { groups, hidden, sectioned } = approvalGroups(
    entries,
    null,
    5,
    undefined,
    () => null,
  );
  assert.equal(groups.length, 1);
  assert.equal(sectioned, false);
  assert.equal(groups[0].entries.length, 5);
  assert.equal(hidden, 3);
  const times = groups[0].entries.map((entry) => Date.parse(entry.at));
  assert.deepEqual(
    times,
    [...times].sort((a, b) => b - a),
  );
  // The cards ask for one list: no sections passed in.
  assert.match(read("permissions/ApprovalContent.tsx"), /\(\) => null,\s*\);/);
});

test("「还有 n 条」展开后变成「收起」，能折回去", () => {
  const fold = read("permissions/FoldButton.tsx");
  assert.match(fold, /onClick=\{onToggle\}/);
  assert.match(fold, /unfolded\s*\? zh\s*\? "收起"/);
  for (const card of [
    "permissions/ApprovalContent.tsx",
    "alerts/CompletionAlertView.tsx",
  ])
    assert.match(
      read(card),
      /onToggle=\{\(\) => setUnfolded\(\(open\) => !open\)\}/,
    );
});

test("单家面板和消息卡一样宽", () => {
  const layout = read("scene/useHUDLayout.ts");
  assert.match(
    layout,
    /standaloneAlert \|\| focusedVendor\s*\? HUD_METRICS\.alertWidth/,
  );
});
