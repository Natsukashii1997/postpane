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
import { NOW } from "./scenes/build.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("等待处理在前、正在进行在后，待核对排在等待处理最后", () => {
  const { snapshot } = scene("claude-busy");
  const live = liveSessions(snapshot.sessions, snapshot.approvals).filter(
    (entry) => entry.session.source === "claude",
  );
  const { waiting, running } = splitWork(live, NOW);
  assert.deepEqual(
    waiting.map((entry) => entry.session.id),
    ["c-ask"],
  );
  assert.equal(running.length, 8);
  const stale = { ...waiting[0], stale: true };
  const fresh = { ...waiting[0], session: { ...waiting[0].session, id: "x" } };
  assert.deepEqual(
    splitWork([stale, fresh], NOW).waiting.map((entry) => entry.session.id),
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
  // 乙 (#382): a small line on the text line, no dotted rule and no block
  // of space round it.
  assert.match(fold, /`展开其余 \$\{hidden\} 条`/);
  assert.match(fold, /padding: `2px 0 10px \$\{GRID\.text\}px`/);
  assert.doesNotMatch(fold, /borderTop:|1px dotted|"12px 0 12px/);
  for (const card of [
    "permissions/ApprovalContent.tsx",
    "alerts/CompletionAlertView.tsx",
  ])
    // Toggled in the store both copies of the card read (#430).
    assert.match(read(card), /onToggle=\{toggleFold\}/);
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
  // No tear; the bot on the grid's marks, the name on its words (#380).
  assert.match(head, /\.\.\.\(onCard\s*\? \{ paddingRight: 6 \}/);
  // The board keeps its marks and tears: only one agent's card is OnCard.
  assert.match(
    read("panel/board-blocks.tsx"),
    /<OnCard\.Provider value=\{Boolean\(focusVendor\)\}>/,
  );
  const work = read("panel/WorkSections.tsx");
  assert.match(work, /\(card \|\| waitingCount > 0\) &&/);
  // Running counts ChatGPT's relays under way too (#427).
  assert.match(work, /\(card \|\| runningCount > 0\) &&/);
  assert.match(work, /暂无等待处理的事/);
  assert.match(work, /暂无在跑的会话/);
  // Each section folds its relays and rows together past its few (#427).
  assert.match(work, /<Folded\s+items=\{items\}\s+shown=\{shown\}/);
  assert.match(work, /"waiting",\s*relaysWaiting,\s*waiting,\s*SHOWN_ENTRIES,/);
  assert.match(work, /"running",\s*relaysRunning,\s*running,\s*RUNNING_SHOWN,/);
  // The card no longer folds its running rows into 「在跑 n」.
  assert.doesNotMatch(read("panel/SourceSessions.tsx"), /fold=\{fold\}/);
});

test("面板底部只留设置和统计；有待处理的卡的「设置」也能点（#378）", () => {
  const sessions = read("panel/SourceSessions.tsx");
  assert.doesNotMatch(sessions, /hud-sessions-more|近 24 小时|已停/);
  // The card's panel gets Settings as well as Statistics.
  assert.match(read("scene/NewsCard.tsx"), /\{\.\.\.links\}/);
  assert.match(
    read("HUDScene.tsx"),
    /links=\{\{ onStats: showPanelStats, onConfigure: configurePanel \}\}/,
  );
});

test("卡片整体一套左对齐线：图标线 0、文字线 30，各块都引用 GRID（#380）", () => {
  assert.match(
    read("panel/theme.ts"),
    /export const GRID = \{ mark: 18, gap: 12, text: 30 \} as const;/,
  );
  // The news list already sits on it: an 18px mark column, a 12px gap.
  assert.match(
    read("permissions/ListCard.tsx"),
    /`\$\{seal \? SEAL_COLUMN : 18\}px minmax\(0, 1fr\) auto 26px`,\s*columnGap: 12,/,
  );
  // Session rows and the fold line: the mark column, then the words.
  const live = read("panel/SessionsSection.tsx");
  // A backlog line keeps the mark column for its own mark (owner, 2026-11-28).
  assert.match(
    live,
    /\$\{waiting && !backlog \? "auto" : `\$\{GRID\.mark\}px`\}/,
  );
  assert.equal(live.match(/padding: "8px 6px 8px 0"/g)?.length, 2);
  const place = read("panel/PlaceRows.tsx");
  assert.match(place, /`\$\{GRID\.mark\}px minmax\(0, 1fr\) 26px`/);
  assert.match(place, /padding: "6px 6px 4px 0"/);
  assert.doesNotMatch(place + live, /tagWide/);
  // Words on the words' line; heads, quota and balances on the marks'.
  assert.match(
    read("panel/WorkSections.tsx"),
    /`6px 6px 8px \$\{GRID\.text\}px`/,
  );
  assert.match(
    read("panel/BoardHeading.tsx"),
    /const MARK_COLUMN = GRID\.text - 10;/,
  );
  assert.match(read("panel/AgentBoard.tsx"), /padding: "6px 6px 6px 0"/);
  assert.match(
    read("panel/SourceBalances.tsx"),
    /paddingLeft: headed \? 0 : GRID\.text/,
  );
});
