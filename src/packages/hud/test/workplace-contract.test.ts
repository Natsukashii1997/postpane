// The workplace contract (ADR-0001), run against the fixed scenes (#349).
// A case the sidebar does not meet yet is a `todo` naming its defect in the
// audit (docs/design/驿窗结构审核-2026-11-14.html); the batch that fixes it
// turns the todo into a plain test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { liveSessions } from "../src/panel/agent-board.ts";
import { runningForMark } from "../src/panel/running-rows.ts";
import { handoffFor, liveHandoffs } from "../src/alerts/handoff-doer.ts";
import { staysUntilSeen } from "../src/alerts/reply-stays.ts";
import { WORKPLACES, type Place } from "./scenes/build.ts";
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

test(
  "在跑：没有审批卡的「等你回复」会话也能在本家卡上找到",
  { todo: "B3：卡底只收在跑（running-rows.ts），第 2 批随状态统一修" },
  () => {
    const { snapshot } = scene("waiting-no-card");
    for (const [place, id] of [
      ["claude", "c-idlewait"],
      ["deepseek", "d-idlewait"],
    ] as const)
      assert.ok(ids(runningForMark(snapshot, place)).includes(id), place);
  },
);

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

test(
  "接力：不参与接力的一家，卡上进不了任何接力",
  { todo: "B4：纸飞机取全局 liveHandoffs（RelayToggle.tsx），第 3 批按 C2 修" },
  () => {
    // The way in a DeepSeek card offers today: every live handoff.
    const offered = liveHandoffs(scene("two-relays").snapshot.handoffs ?? []);
    assert.equal(offered.length, 0);
  },
);

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

test(
  "出错：失败或限流的一轮在本家能看到，不当成空闲",
  { todo: "B9：失败、限流只变空闲、没有回执，第 2 批按 C6 修" },
  () => {
    const rows = [...listed("failed", "codex"), ...listed("failed", "claude")];
    assert.deepEqual(ids(rows).sort(), ["c-limit", "x-fail"]);
  },
);

test("混合场景里四家的在跑、等你互不串家", () => {
  const { snapshot } = scene("mixed");
  for (const place of WORKPLACES)
    for (const row of runningForMark(snapshot, place))
      assert.equal(row.session.source, place);
});
