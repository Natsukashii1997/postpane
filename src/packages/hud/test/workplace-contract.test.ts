// The workplace contract (ADR-0001), run against the fixed scenes (#349).
// A case the sidebar does not meet yet is a `todo` naming its defect in the
// audit (docs/design/驿窗结构审核-2026-11-14.html); the batch that fixes it
// turns the todo into a plain test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { liveSessions } from "../src/panel/agent-board.ts";
import { runningForMark } from "../src/panel/running-rows.ts";
import { handoffFor } from "../src/alerts/handoff-doer.ts";
import {
  REPLY_STAY,
  frontFolds,
  staysUntilSeen,
} from "../src/alerts/reply-stays.ts";
import {
  laneEvents,
  laneFailures,
  newsLanes,
  reconcileIslandCards,
} from "../src/alerts/news-lanes.ts";
import {
  dismissable,
  failureStands,
  standingQueue,
} from "../src/alerts/failure-list.ts";
import { noticeSeal } from "../src/scene/news-seal.ts";
import { cardRelays, relaysOf, workspaceOf } from "../src/workspace.ts";
import { NOW, WORKPLACES, type Place } from "./scenes/build.ts";
import { SCENES, scene } from "./scenes/scenes.ts";

const ids = (rows: { session: { id: string } }[]) =>
  rows.map((row) => row.session.id);

const listed = (key: string, place: Place) => {
  const { snapshot } = scene(key);
  return liveSessions(
    snapshot.sessions.filter((s) => s.source === place),
    snapshot.approvals,
  );
};

test("每个场景只用合成数据：没有本机路径和邮箱", () => {
  for (const { key, snapshot } of SCENES) {
    const text = JSON.stringify(snapshot);
    assert.doesNotMatch(text, /\/Users\/|@[a-z0-9-]+\./i, key);
  }
});

test("在跑：四家各自的卡底都能找到本家在跑的会话", () => {
  const { snapshot } = scene("all-running");
  for (const place of WORKPLACES) {
    const rows = runningForMark(snapshot, place);
    assert.equal(rows.length, 1, place);
    assert.equal(rows[0].session.source, place);
  }
});

test("在跑：没有审批卡的「等你回复」会话也能在本家卡上找到（B3）", () => {
  const { snapshot } = scene("waiting-no-card");
  for (const [place, id] of [
    ["claude", "c-idlewait"],
    ["deepseek", "d-idlewait"],
  ] as const)
    assert.ok(ids(runningForMark(snapshot, place)).includes(id), place);
});

test("等你：旧提问不按天数丢，新旧都在、都算等你", () => {
  const rows = listed("claude-old-ask", "claude");
  assert.deepEqual(ids(rows).sort(), ["c-new", "c-old"]);
  assert.ok(rows.every((row) => row.status === "waiting"));
});

test("等你：Codex 等审批 45 分钟仍在本家等你里", () => {
  const rows = listed("codex-approval-long", "codex");
  assert.equal(rows[0]?.status, "waiting");
  assert.equal(rows[0]?.approval?.source, "codex");
});

test("等你：会话记录半小时没动静的提问仍算等你，标「待核对」、排在后面（B1）", () => {
  const { snapshot } = scene("codex-stale");
  const { waiting, running } = workspaceOf(snapshot, "codex");
  assert.deepEqual(ids(waiting), ["x-fresh", "x-stale"]);
  assert.deepEqual(
    waiting.map((row) => row.stale),
    [false, true],
  );
  assert.equal(running.length, 0);
});

test("接力：Claude、Codex 的会话各自只关联到本家那一单", () => {
  const { handoffs } = scene("two-relays").snapshot;
  assert.equal(handoffFor(handoffs, "claude", "c-relay")?.id, "h-claude");
  assert.equal(handoffFor(handoffs, "codex", "x-relay")?.id, "h-codex");
  assert.equal(handoffFor(handoffs, "claude", "x-relay"), undefined);
});

test("接力：ChatGPT 审核会话能找到它审的那一单，不用伪造审批", () => {
  const { handoffs, approvals } = scene("two-relays").snapshot;
  assert.equal(handoffFor(handoffs, "chatgpt", "chatgpt:g-x")?.id, "h-codex");
  assert.ok(approvals.every((a) => a.source !== "chatgpt"));
});

test("接力：不参与接力的一家，卡上进不了任何接力（B4）", () => {
  const { handoffs, approvals } = scene("two-relays").snapshot;
  const own = (place: string) =>
    cardRelays(
      handoffs,
      approvals.filter((a) => a.source === place),
    ).map((h) => h.id);
  assert.deepEqual(own("deepseek"), []);
  assert.deepEqual(
    cardRelays(handoffs, [{ source: "claude" }]).map((h) => h.id),
    ["h-claude"],
  );
});

test("接力：回复卡、单家面板也只进本家参与的接力（C2，#359）", () => {
  const { handoffs } = scene("two-relays").snapshot;
  const ids = (place: string) => relaysOf(handoffs, place).map((h) => h.id);
  assert.deepEqual(ids("claude"), ["h-claude"]);
  assert.deepEqual(ids("codex"), ["h-codex"]);
  assert.deepEqual(ids("deepseek"), []);
  assert.deepEqual(ids("hermes"), []);
});

test("回执停留：Claude、Codex、DeepSeek 自动收起，ChatGPT 看过才收（D2）", () => {
  const events = scene("replies").snapshot.islandEvents?.items ?? [];
  const stays = Object.fromEntries(
    events.map((event) => [event.source, staysUntilSeen(event)]),
  );
  assert.deepEqual(stays, {
    claude: false,
    codex: false,
    chatgpt: true,
    deepseek: false,
  });
});

test("出错：失败或限流的一轮在本家能看到，不当成空闲（B9）", () => {
  const { snapshot } = scene("failed");
  const failed = (place: Place) =>
    workspaceOf(snapshot, place).failed.map((s) => s.id);
  assert.deepEqual(failed("codex"), ["x-fail"]);
  assert.deepEqual(failed("claude"), ["c-limit"]);
  assert.deepEqual(failed("deepseek"), []);
});

test("出错回执：失败、限流各家一张，不走 4 秒，限流挂到恢复（C6）", () => {
  const { snapshot } = scene("failed");
  const events = snapshot.islandEvents?.items ?? [];
  const queue = reconcileIslandCards([], [], events);
  assert.deepEqual(
    newsLanes(queue, []).map((lane) => [
      lane.vendor,
      laneEvents(lane, "turn-failed").map((event) => event.failure),
    ]),
    [
      ["claude", ["limited"]],
      ["codex", ["failed"]],
    ],
  );
  for (const card of queue) {
    assert.equal(
      frontFolds(card, { held: false, opened: true, looked: new Set() }),
      false,
    );
    assert.equal(
      card.type === "news" && failureStands(card.event, snapshot.sessions, NOW),
      true,
    );
  }
  // 「知道了」 puts away the failure only; the limit lifts in an hour.
  assert.deepEqual(events.map(dismissable), [false, true]);
  assert.equal(
    failureStands(events[0], snapshot.sessions, NOW + 61 * 60_000),
    false,
  );
});

test("混合场景里四家的在跑、等你互不串家", () => {
  const { snapshot } = scene("mixed");
  for (const place of WORKPLACES)
    for (const row of runningForMark(snapshot, place))
      assert.equal(row.session.source, place);
});

test("回执停留是每家一项配置：Hermes、ChatGPT 看过才收，其余 4 秒（ADR 第 7 条）", () => {
  assert.deepEqual(REPLY_STAY, {
    claude: "clock",
    codex: "clock",
    chatgpt: "seen",
    deepseek: "clock",
    hermes: "seen",
  });
});

test("Hermes 断线、没跑成和四家共用出错回执：本家一张卡、红色「出错」印章，不进等你（第 4 批，#498）", () => {
  const { snapshot } = scene("hermes-trouble");
  const queue = reconcileIslandCards(
    [],
    [],
    snapshot.islandEvents?.items ?? [],
  );
  const lanes = newsLanes(queue, []);
  assert.deepEqual(
    lanes.map((lane) => [lane.vendor, laneFailures(lane).map((e) => e.kind)]),
    [["hermes", ["cron-failed", "bot-offline"]]],
  );
  const failures = laneFailures(lanes[0]);
  assert.deepEqual(noticeSeal(failures[0], { replies: [], failures }, true), {
    seal: { words: "出错", ink: "red" },
    count: 2,
  });
  // Neither folds on the 4-second clock.
  for (const card of queue)
    assert.equal(
      frontFolds(card, { held: false, opened: true, looked: new Set() }),
      false,
    );
  // Down hangs while the bot is down, and only 「知道了」 puts away the task.
  const bots = snapshot.hermesBots ?? [];
  assert.equal(standingQueue(queue, snapshot.sessions, NOW, bots), queue);
  assert.deepEqual(
    failures.map((e) => dismissable(e)),
    [true, false],
  );
  // Hermes waits on no one: no work line for it.
  assert.equal(workspaceOf(snapshot, "hermes").waiting.length, 0);
});
