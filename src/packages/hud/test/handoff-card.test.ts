import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff, HandoffStep } from "@agent-hud/protocol";
import {
  actions,
  handoffFor,
  progressLine,
  round,
  stamp,
  timeline,
} from "../src/alerts/handoff-card.ts";

const T = Date.UTC(2026, 10, 6, 8, 15);
const minute = 60_000;

const step = (
  kind: HandoffStep["kind"],
  at: number,
  extra: Partial<HandoffStep> = {},
): HandoffStep => ({ at, kind, ...extra });

const handoff = (extra: Partial<Handoff> = {}): Handoff => ({
  id: "h1",
  title: "驿窗｜侧栏应用与多agent接力",
  claudeSession: "s1",
  cwd: "/w",
  chatgptConversation: "c1",
  status: "open",
  createdAt: T,
  updatedAt: T,
  rounds: 0,
  phase: "delivered",
  phaseAt: T + minute,
  steps: [
    step("work", T, { text: "改了 6 个文件 · 测试全过" }),
    step("ask", T + minute, { text: "请审核本轮改动：逐条列出问题" }),
  ],
  ...extra,
});

const reply = step("reply", T + 11 * minute, {
  text: "1. 会话认不准时不该猜\n2. opening 要超时\n3. 区分送到和审完\n结论：需修改",
  points: ["会话认不准时不该猜", "opening 要超时", "区分送到和审完"],
  verdict: "revise",
});

test("a handoff is found by its Claude session or its ChatGPT conversation, while live", () => {
  const list = [handoff()];
  assert.equal(handoffFor(list, "claude", "s1")?.id, "h1");
  assert.equal(handoffFor(list, "chatgpt", "chatgpt:c1")?.id, "h1");
  assert.equal(handoffFor(list, "chatgpt", "c1"), undefined);
  assert.equal(handoffFor(list, "codex", "s1"), undefined);
  assert.equal(
    handoffFor([handoff({ status: "closed", phase: "ended" })], "claude", "s1"),
    undefined,
  );
});

test("delivered: the steps so far, ChatGPT about to start, then what is to come", () => {
  const rows = timeline(handoff(), T + 2 * minute, true);
  assert.deepEqual(
    rows.map((row) => [row.who, row.title, row.state]),
    [
      ["claude", "Claude 做完本轮改动", "done"],
      ["post", "驿窗送出「请审核」", "done"],
      ["chatgpt", "等 ChatGPT 开始审核", "cur"],
      ["post", "驿窗转回 Claude「按意见处理」", "todo"],
      ["claude", "Claude 按意见修改", "todo"],
      ["chatgpt", "第 2 轮：ChatGPT 再审核", "todo"],
    ],
  );
  assert.equal(rows[0].sub, "改了 6 个文件 · 测试全过");
  assert.equal(rows[1].quote, "请审核本轮改动：逐条列出问题");
  assert.match(rows[0].time, /^\d\d:\d\d$/);
  assert.equal(rows[2].time, "");
  assert.deepEqual(actions(handoff()), ["end", "open"]);
  assert.deepEqual(stamp(handoff(), true), { text: "接力", tone: "blue" });
  assert.equal(progressLine(handoff(), T, true), "已送到 ChatGPT · 等它审核");
});

test("working: how long ChatGPT has been at it", () => {
  const working = handoff({ phase: "working", phaseAt: T + 2 * minute });
  const rows = timeline(working, T + 11 * minute, true);
  assert.equal(rows[2].title, "ChatGPT 审核中");
  assert.equal(rows[2].sub, "已 9 分钟");
  assert.equal(
    progressLine(working, T + 11 * minute, true),
    "ChatGPT 审核中 · 已 9 分钟",
  );
});

test("replied: the points and verdict, and the person decides", () => {
  const replied = handoff({
    phase: "replied",
    phaseAt: T + 11 * minute,
    steps: [...handoff().steps!, reply],
  });
  const rows = timeline(replied, T + 12 * minute, true);
  assert.equal(rows[2].title, "ChatGPT 审核：3 条意见");
  assert.deepEqual(rows[2].points, reply.points);
  assert.equal(rows[2].verdict, "revise");
  assert.equal(rows[3].state, "await");
  assert.equal(rows[3].sub, "等你决定：转回，或结束接力");
  assert.deepEqual(actions(replied), ["end", "open", "back"]);
  assert.deepEqual(stamp(replied, true), { text: "需改", tone: "red" });
  assert.equal(progressLine(replied, T, true), "回信到了 · 需修改 · 3 条意见");
  // A pass: no second round to come.
  const passed = handoff({
    phase: "replied",
    steps: [...handoff().steps!, { ...reply, verdict: "pass" }],
  });
  assert.equal(stamp(passed, true).text, "回信");
  assert.ok(
    !timeline(passed, T, true).some((row) => row.title.startsWith("第 2 轮")),
  );
});

test("returned: Claude works on it; a second review is offered once", () => {
  const returned = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    steps: [...handoff().steps!, reply, step("back", T + 12 * minute)],
  });
  const rows = timeline(returned, T + 14 * minute, true);
  assert.deepEqual(
    rows.slice(3).map((row) => [row.title, row.state]),
    [
      ["驿窗转回 Claude「按意见处理」", "done"],
      ["Claude 按意见修改", "cur"],
      ["第 2 轮：ChatGPT 再审核", "todo"],
    ],
  );
  assert.deepEqual(actions(returned), ["end", "open", "again"]);
  assert.deepEqual(stamp(returned, true), { text: "修改", tone: "green" });
  // Round 2 asked: 2 / 2, and no third offered.
  const second = handoff({
    phase: "returned",
    steps: [
      ...returned.steps!,
      step("work", T + 20 * minute, { text: "按意见改完" }),
      step("ask", T + 20 * minute),
      { ...reply, at: T + 25 * minute },
      step("back", T + 26 * minute),
    ],
  });
  assert.deepEqual(round(second), { at: 2, of: 2 });
  assert.deepEqual(actions(second), ["end", "open"]);
  const titles = timeline(second, T + 30 * minute, true).map(
    (row) => row.title,
  );
  assert.ok(titles.includes("Claude 按意见改完"));
  assert.ok(titles.includes("驿窗送出「第 2 轮复审」"));
});

test("failed and ended handoffs offer what is left", () => {
  const failed = handoff({
    status: "failed",
    phase: "failed",
    chatgptConversation: null,
    error: "ChatGPT 新会话两分钟没打开",
    steps: [
      handoff().steps![0],
      step("fail", T + 2 * minute, { text: "timeout" }),
    ],
  });
  assert.deepEqual(actions(failed), ["end", "retry"]);
  const rows = timeline(failed, T, true);
  assert.equal(rows.at(-1)?.state, "await");
  assert.equal(rows.at(-1)?.sub, "等你决定：重试，或结束接力");
  assert.equal(rows.at(-2)?.sub, "timeout", "the step says why");
  assert.deepEqual(stamp(failed, true), { text: "未送", tone: "red" });
  const ended = handoff({
    status: "closed",
    phase: "ended",
    steps: [...handoff().steps!, step("end", T + 3 * minute)],
  });
  assert.deepEqual(actions(ended), ["close"]);
  assert.equal(timeline(ended, T, true).at(-1)?.title, "结束接力");
  // Before phases were kept: an open handoff reads as delivered.
  assert.deepEqual(round(handoff({ phase: undefined, steps: undefined })), {
    at: 1,
    of: 2,
  });
});
