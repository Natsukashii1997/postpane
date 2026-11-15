// Every agent's card is one card (owner chose 甲 on 2026-11-14): one width,
// its head with the plane, 「等待处理」 then 「正在进行」, one list newest
// first that folds back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liveSessions } from "../src/panel/agent-board.ts";
import { RUNNING_SHOWN, splitWork } from "../src/panel/place-sessions.ts";
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
  assert.equal(running.length, 8);
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

test("有待处理时的卡不画额度区块，卡头照样带套餐（2026-11-15）", () => {
  const panel = read("HoverPanel.tsx");
  assert.match(
    panel,
    /content: !news && config\.quotaDetails && blocks\.length/,
  );
  assert.match(panel, /content: !news && config\.tokenUsage && customTokens/);
  assert.match(
    panel,
    /bare=\{Boolean\(focusVendor\) && \(!blocks\.length \|\| Boolean\(news\)\)\}/,
  );
  // The bare head reads the plan itself, as the quota block's head does.
  const sessions = read("panel/SourceSessions.tsx");
  assert.match(
    sessions,
    /plan=\{\s*soleAccount\(snapshot\.quotas, snapshot\.accounts, focusVendor\)/,
  );
  // The week's mark under the card stays (#319).
  assert.match(read("scene/NewsCard.tsx"), /WeeklyMark/);
});

test("单家卡：卡头是小签小人、没有撕线；等待处理 4 条、正在进行 6 条后折叠；两段常驻（2026-11-15）", () => {
  assert.equal(RUNNING_SHOWN, 6);
  const head = read("panel/BoardHeading.tsx");
  assert.match(head, /onCard \?\s*\(\s*<BotMark source=\{vendor\}/);
  assert.match(
    head,
    /\.\.\.\(onCard\s*\? \{ paddingLeft: 6, paddingRight: 6 \}/,
  );
  // The board keeps its marks and tears: only one agent's card is OnCard.
  assert.match(
    read("panel/board-blocks.tsx"),
    /<OnCard\.Provider value=\{Boolean\(focusVendor\)\}>/,
  );
  const work = read("panel/WorkSections.tsx");
  assert.match(work, /\(card \|\| waitingCount > 0\) &&/);
  assert.match(work, /\(card \|\| running\.length > 0\) &&/);
  assert.match(work, /暂无等待处理的事/);
  assert.match(work, /暂无在跑的会话/);
  assert.match(work, /shown=\{SHOWN_ENTRIES\}/);
  assert.match(work, /shown=\{RUNNING_SHOWN\}/);
  // The card no longer folds its running rows into 「在跑 n」.
  assert.doesNotMatch(read("panel/SourceSessions.tsx"), /fold=\{fold\}/);
});
