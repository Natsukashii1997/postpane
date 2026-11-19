import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Handoff, HandoffStep } from "@agent-hud/protocol";
import {
  actionLabels,
  actionOff,
  actionTitle,
  actions,
  endedNote,
  pointMarkColumn,
} from "../src/alerts/handoff-actions.ts";
import { relayLegend, relayLegendInks } from "../src/alerts/relay-legend.ts";
import {
  autoLabel,
  handoffFor,
  progressLine,
  round,
  stamp,
  timeline,
} from "../src/alerts/handoff-card.ts";
import { paperOf } from "../src/paper.ts";

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
  // The cap these tests were written for: two reviews (#347 made it a setting).
  limit: 2,
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
  assert.equal(timeline(ended, T, true).at(-1)?.sub, undefined);
  // Ended by an agent at the person's word (#439): who and why, under it.
  const byAgent = handoff({
    status: "closed",
    phase: "ended",
    steps: [
      ...handoff().steps!,
      step("end", T + 3 * minute, {
        text: "Claude Code 会话 s9 按常浩授权结束：PR 已合并",
      }),
    ],
  });
  assert.deepEqual(
    [
      timeline(byAgent, T, true).at(-1)?.title,
      timeline(byAgent, T, true).at(-1)?.sub,
    ],
    ["结束接力", "Claude Code 会话 s9 按常浩授权结束：PR 已合并"],
  );
  // Before phases were kept: an open handoff reads as delivered.
  assert.deepEqual(round(handoff({ phase: undefined, steps: undefined })), {
    at: 1,
    of: 2,
  });
});

test("the auto round trip: its own steps, why it stopped, and a button to pause or resume it", () => {
  const steps = [
    ...handoff().steps!,
    reply,
    step("fail", T + 12 * minute, {
      text: "自动转回 Claude 失败：写不进；马上重试一次",
      auto: true,
    }),
    step("back", T + 12 * minute, { auto: true }),
  ];
  const going = handoff({ phase: "returned", auto: true, steps });
  const titles = timeline(going, T + 13 * minute, true).map((row) => [
    row.title,
    row.sub,
  ]);
  assert.deepEqual(titles.slice(3, 5), [
    ["自动往返出错", "自动转回 Claude 失败：写不进；马上重试一次"],
    ["驿窗自动转回 Claude「按意见处理」", "附 ChatGPT 的回信全文"],
  ]);
  assert.deepEqual(actions(going), ["end", "pause", "open", "again"]);
  assert.equal(autoLabel(going, true), "自动往返");
  // Stopped by itself at the last round: why, and a way to turn it back on.
  const stopped = handoff({
    phase: "replied",
    auto: false,
    halt: "已审 2 轮仍需修改，自动往返停下，交还常浩",
    steps: [
      ...steps,
      step("ask", T + 20 * minute),
      { ...reply, at: T + 25 * minute },
      step("stop", T + 25 * minute, {
        text: "已审 2 轮仍需修改，自动往返停下，交还常浩",
        auto: true,
      }),
    ],
  });
  const last = timeline(stopped, T + 26 * minute, true).filter(
    (row) => row.state === "done",
  );
  assert.deepEqual(
    [last.at(-1)?.title, last.at(-1)?.sub],
    ["自动往返停下", "已审 2 轮仍需修改，自动往返停下，交还常浩"],
  );
  // Every round used: nothing left for it to do, so no 「继续自动」 (#194).
  assert.deepEqual(actions(stopped), ["end", "open", "back"]);
  // Stopped short of a pass for another reason: 「未完暂停」 (owner 2026-11-19, #409).
  assert.equal(autoLabel(stopped, true), "未完暂停");
  assert.equal(autoLabel(stopped, false), "PAUSED");
  assert.equal(
    progressLine(stopped, T, true),
    "回信到了 · 需修改 · 3 条意见 · 未完暂停",
  );
  // Paused by the person, then turned back on.
  const paused = timeline(
    handoff({
      steps: [
        ...handoff().steps!,
        step("stop", T + 2 * minute, { text: "常浩暂停" }),
        step("resume", T + 3 * minute),
      ],
    }),
    T + 4 * minute,
    true,
  ).map((row) => row.title);
  assert.ok(paused.includes("你暂停了自动往返"));
  assert.ok(paused.includes("你打开了自动往返"));
  // A pass ended it by itself.
  const passed = timeline(
    handoff({
      status: "closed",
      phase: "ended",
      notice: "passed",
      steps: [
        ...handoff().steps!,
        step("reply", T + 8 * minute, { verdict: "pass" }),
        step("end", T + 9 * minute, { auto: true }),
      ],
    }),
    T + 10 * minute,
    true,
  );
  assert.equal(passed.at(-1)?.title, "审核通过，自动结束接力");
  // Handoffs from before the auto round trip offer no switch.
  assert.deepEqual(actions(handoff()), ["end", "open"]);
  assert.equal(autoLabel(handoff(), true), null);
});

test("「继续自动」 only while a round is left, and the card says what it waits for (#194)", () => {
  // Round 1 sent back, then stopped: turning it back on still has work.
  const back = [
    ...handoff().steps!,
    reply,
    step("back", T + 12 * minute),
    step("stop", T + 13 * minute, { text: "常浩暂停" }),
  ];
  const stopped = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    auto: false,
    halt: "常浩暂停",
    steps: back,
  });
  assert.deepEqual(actions(stopped), ["end", "resume", "open", "again"]);
  // Turned back on: the row says what it waits for now.
  const resumed = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    auto: true,
    steps: [...back, step("resume", T + 14 * minute)],
  });
  const rows = timeline(resumed, T + 15 * minute, true);
  const on = rows.find((row) => row.title === "你打开了自动往返");
  assert.equal(on?.sub, "等 Claude 改完送审，回信需修改就自动转回");
  // Round 2 of 2 back with Claude (DT-ORC, 2026-11-07): no 「继续自动」.
  const last = handoff({
    phase: "returned",
    phaseAt: T + 30 * minute,
    auto: false,
    halt: "已审 2 轮仍需修改，自动往返停下，交还常浩",
    steps: [
      ...handoff().steps!,
      reply,
      step("ask", T + 20 * minute),
      { ...reply, at: T + 25 * minute },
      step("stop", T + 25 * minute, { text: "已审 2 轮仍需修改", auto: true }),
      step("back", T + 30 * minute),
    ],
  });
  assert.deepEqual(actions(last), ["end", "open"]);
});

test("where it stands keeps the timeline in order: no earlier clock after later steps (#194)", () => {
  const steps = [
    ...handoff().steps!,
    reply,
    step("back", T + 12 * minute),
    step("resume", T + 70 * minute),
    step("stop", T + 72 * minute, { text: "常浩暂停" }),
  ];
  const rows = timeline(
    handoff({ phase: "returned", phaseAt: T + 12 * minute, steps }),
    T + 80 * minute,
    true,
  );
  const cur = rows.find((row) => row.state === "cur")!;
  assert.equal(cur.title, "Claude 按意见修改");
  assert.equal(cur.time, "");
  assert.match(cur.sub ?? "", /^\d\d:\d\d 起 · 已 1 小时$/);
  // With nothing after it, it keeps its own clock.
  const plain = timeline(
    handoff({
      phase: "returned",
      phaseAt: T + 12 * minute,
      steps: steps.slice(0, 4),
    }),
    T + 20 * minute,
    true,
  ).find((row) => row.state === "cur")!;
  assert.match(plain.time, /^\d\d:\d\d$/);
  assert.equal(plain.sub, "已 8 分钟");
});

test("an answer queued for a quiet Claude session says it runs in the background if need be", () => {
  const queued = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    auto: true,
    queuedAt: T + 12 * minute,
    steps: [
      ...handoff().steps!,
      reply,
      step("back", T + 12 * minute, { auto: true }),
    ],
  });
  const now = timeline(queued, T + 14 * minute, true).find(
    (row) => row.state === "cur",
  );
  assert.equal(now?.title, "Claude 按意见修改");
  assert.equal(now?.sub, "意见已排队 · 会话 3 分钟仍不在线就在后台续接");
  assert.equal(
    progressLine(queued, T + 14 * minute, true),
    "意见已排队 · 会话不在线就在后台续接",
  );
});

test("a session run in the background shows the run and why", () => {
  const woke = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    auto: true,
    wakingSince: T + 12 * minute,
    steps: [
      ...handoff().steps!,
      reply,
      step("back", T + 12 * minute, { auto: true }),
      step("wake", T + 12 * minute, {
        auto: true,
        text: "直接送话没送到。这个会话的 Claude 进程已被桌面版停掉",
      }),
    ],
  });
  const rows = timeline(woke, T + 15 * minute, true);
  const ran = rows.find((row) => row.title === "驿窗在后台续接 Claude");
  assert.equal(
    ran?.sub,
    "直接送话没送到。这个会话的 Claude 进程已被桌面版停掉",
  );
  const now = rows.find((row) => row.state === "cur");
  assert.equal(now?.title, "Claude 按意见修改");
  assert.match(now?.sub ?? "", /^驿窗在后台续接 · /);
  assert.match(
    progressLine(woke, T + 15 * minute, true),
    /^驿窗在后台续接 Claude · /,
  );
});

test("a relay's reply is framed with its round and ChatGPT's verdict", () => {
  // Owner, 2026-11-07 (甲 · 航空虚线框): the frame's label says which
  // round it is and what ChatGPT said, and nothing more.
  assert.deepEqual(relayLegend(handoff(), true), {
    trip: "Claude ⇄ ChatGPT · 第 1 / 2 轮",
    verdict: undefined,
    missing: false,
  });
  const answered = handoff({
    phase: "replied",
    steps: [
      step("ask", T + minute),
      step("reply", T + 2 * minute, { verdict: "revise" }),
      step("back", T + 3 * minute),
      step("ask", T + 4 * minute),
      step("reply", T + 5 * minute, { verdict: "pass" }),
    ],
  });
  assert.deepEqual(relayLegend(answered, true), {
    trip: "Claude ⇄ ChatGPT · 第 2 / 2 轮",
    verdict: "通过",
    missing: false,
  });
  assert.deepEqual(relayLegend(answered, false), {
    trip: "Claude ⇄ ChatGPT · round 2 / 2",
    verdict: "Pass",
    missing: false,
  });
  const silent = handoff({
    phase: "replied",
    steps: [step("ask", T + minute), step("reply", T + 2 * minute)],
  });
  assert.equal(relayLegend(silent, true).verdict, "未写结论");
  assert.equal(relayLegend(silent, true).missing, true);
});

test("the relay legend writes in the word ink, a missing verdict in red (#308)", () => {
  // Owner 2026-11-11 (乙): words written out take one ink; one saying
  // something went wrong keeps the red. In the notch (#190) the card has no
  // paper: the dark paper's inks, not plain white.
  const dark = paperOf(false);
  assert.deepEqual(relayLegendInks(null, false), {
    relay: dark.word,
    verdict: dark.word,
  });
  const light = paperOf(true);
  assert.deepEqual(relayLegendInks(light, true), {
    relay: light.word,
    verdict: light.word,
  });
  assert.equal(relayLegendInks(light, true, true).verdict, light.red);
});

test("the review cap, not the risk level, sets the rounds (#217, #347)", () => {
  const answered = (extra: Partial<Handoff>) =>
    handoff({
      phase: "returned",
      steps: [
        ...handoff().steps!,
        step("reply", T + 5 * minute),
        step("back", T + 6 * minute),
      ],
      ...extra,
    });
  // Unset, the cap is five, whatever the level.
  const l1 = answered({ risk: "L1", limit: undefined });
  assert.deepEqual(round(l1), { at: 1, of: 5 });
  assert.ok(actions(l1).includes("again"));
  // A follow-up from another session carries the first one's review.
  const carried = answered({ risk: "L2", carried: 1 });
  assert.deepEqual(round(carried), { at: 2, of: 2 });
  assert.ok(!actions(carried).includes("again"));
  // An answer only mending the last lines is no review of its own.
  const mended = answered({
    steps: [
      ...handoff().steps!,
      step("reply", T + 5 * minute),
      step("format", T + 6 * minute),
      step("reply", T + 7 * minute),
    ],
  });
  assert.deepEqual(round(mended), { at: 1, of: 2 });
  assert.equal(
    timeline(mended, T + 8 * minute, true).find((row) =>
      row.title.includes("补写"),
    )?.who,
    "post",
  );
  // Asked and not answered yet: the round it is in.
  assert.deepEqual(round(handoff()), { at: 1, of: 2 });
});

test("words back to Claude say how its plugin has them: queued, taken, started (#257)", () => {
  const back = (delivery: HandoffStep["delivery"]) =>
    handoff({
      phase: "returned",
      phaseAt: T + 12 * minute,
      steps: [
        ...handoff().steps!,
        reply,
        step("back", T + 12 * minute, { auto: true, delivery }),
      ],
    });
  const sub = (delivery: HandoffStep["delivery"], zh: boolean) =>
    timeline(back(delivery), T + 14 * minute, zh).find(
      (row) =>
        row.state === "done" &&
        (row.title.includes("转回 Claude") ||
          row.title.includes("back to Claude")),
    )?.sub;
  assert.equal(sub("waiting", true), "附 ChatGPT 的回信全文 · 排队中");
  assert.equal(sub("taken", true), "附 ChatGPT 的回信全文 · 已领取");
  assert.equal(sub("started", true), "附 ChatGPT 的回信全文 · 已开始");
  assert.equal(sub("expired", true), "附 ChatGPT 的回信全文 · 过期没领");
  assert.equal(
    sub("started", false),
    "With ChatGPT's answer in full · started",
  );
  // Kept before receipts: as before.
  assert.equal(sub(undefined, true), "附 ChatGPT 的回信全文");
  // The ask to hand over again says so too.
  const again = handoff({
    phase: "returned",
    steps: [
      ...handoff().steps!,
      reply,
      step("back", T + 12 * minute),
      step("again", T + 13 * minute, { delivery: "taken" }),
    ],
  });
  const row = timeline(again, T + 14 * minute, true).find(
    (row) => row.title === "驿窗请 Claude 交回复审",
  );
  assert.equal(row?.sub, "已领取");
});

test("rounds count from one once the person spoke up in Claude (#258)", () => {
  const spoke = handoff({
    phase: "delivered",
    carried: 1,
    roundsFrom: 4,
    steps: [
      ...handoff().steps!,
      reply,
      step("back", T + 12 * minute),
      step("work", T + 20 * minute, { text: "按常浩说的改完" }),
      step("ask", T + 20 * minute),
    ],
  });
  assert.deepEqual(round(spoke), { at: 1, of: 2 });
  const rows = timeline(spoke, T + 21 * minute, true);
  const asked = rows.filter((row) => row.title.startsWith("驿窗送出"));
  assert.equal(asked.at(-1)?.title, "驿窗送出「请审核」");
  assert.equal(asked.at(-1)?.sub, "ChatGPT 已收到 · 你插话后轮数从 1 重算");
  assert.equal(
    timeline(spoke, T + 21 * minute, false)
      .filter((row) => row.title.startsWith("PostPane asked"))
      .at(-1)?.sub,
    "ChatGPT has it · rounds count from 1 again after you spoke up",
  );
  assert.ok(
    rows.some((row) => row.title === "第 2 轮：ChatGPT 再审核"),
    "one round is left",
  );
});

test("a review Codex handed over is found by its thread and speaks of Codex (#282)", () => {
  const codexs = handoff({
    doer: "codex",
    claudeSession: "t1",
    phase: "replied",
    phaseAt: T + 11 * minute,
    steps: [...handoff().steps!, reply],
  });
  assert.equal(handoffFor([codexs], "codex", "t1")?.id, "h1");
  assert.equal(handoffFor([codexs], "claude", "t1"), undefined);
  const rows = timeline(codexs, T + 12 * minute, true);
  assert.equal(rows[0].who, "codex");
  assert.equal(rows[0].title, "Codex 做完本轮改动");
  assert.ok(rows.some((row) => row.title === "转回 Codex「按意见处理」"));
  assert.ok(!rows.some((row) => row.title.includes("Claude")));
  assert.equal(relayLegend(codexs, true).trip, "Codex ⇄ ChatGPT · 第 1 / 2 轮");
  // A Claude review reads as before.
  assert.equal(
    timeline(handoff(), T + 2 * minute, true)[0].title,
    "Claude 做完本轮改动",
  );
});

test("the review points' numbers get room for every digit (#336)", () => {
  // One digit keeps the 16px it always had; 「10.」 used to press into the
  // point's text.
  assert.equal(pointMarkColumn(1), "16px");
  assert.equal(pointMarkColumn(9), "16px");
  assert.equal(pointMarkColumn(10), "calc(16px + 1ch)");
  assert.equal(pointMarkColumn(12), "calc(16px + 1ch)");
  assert.equal(pointMarkColumn(100), "calc(16px + 2ch)");
});

test("the points list sizes its number column by its count (#336)", () => {
  const list = readFileSync(
    new URL("../src/alerts/HandoffPoints.tsx", import.meta.url),
    "utf8",
  );
  assert.match(list, /const marks = pointMarkColumn\(points\.length\);/);
  assert.match(list, /gridTemplateColumns: `\$\{marks\} 1fr`/);
  assert.doesNotMatch(list, /"16px 1fr"/);
});

test("stopped at its cap: a red 「停」, the person's call, and the way on is the session (#409)", () => {
  const steps = [
    ...handoff().steps!,
    reply,
    step("back", T + 12 * minute),
    step("stop", T + 12 * minute, {
      text: "已审满 2 轮仍需修改，自动往返停下，交常浩决定",
      auto: true,
    }),
  ];
  const stopped = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    auto: false,
    halt: "已审满 2 轮仍需修改",
    notice: "top",
    topAt: T + 12 * minute,
    steps,
  });
  assert.deepEqual(stamp(stopped, true), { text: "停", tone: "red" });
  assert.deepEqual(stamp(stopped, false), { text: "STOP", tone: "red" });
  // The stamp says it: nothing more beside 「接力」.
  assert.equal(autoLabel(stopped, true), null);
  assert.equal(
    progressLine(stopped, T + 13 * minute, true),
    "已停 · 审满 2 轮 · 等你决定",
  );
  const rows = timeline(stopped, T + 13 * minute, true);
  const last = rows.at(-1)!;
  assert.deepEqual(
    [last.who, last.title, last.sub, last.state],
    [
      "post",
      "已停：审满 2 轮",
      "等你决定：在会话里说一句再续审，或结束接力",
      "await",
    ],
  );
  assert.ok(
    !rows.some((row) => row.state === "todo"),
    "no next review offered",
  );
  // No 「再审一轮」 or 「继续自动」: the session is where it goes on.
  assert.deepEqual(actions(stopped), ["end", "open", "session"]);
  assert.deepEqual(actions({ ...stopped, chatgptConversation: null }), [
    "end",
    "session",
  ]);
  // Ended, it is only ended.
  const ended = {
    ...stopped,
    status: "closed" as const,
    phase: "ended" as const,
  };
  assert.deepEqual(stamp(ended, true), { text: "已结束", tone: "dim" });
  assert.deepEqual(actions(ended), ["close"]);
});

test("reviewed on past its cap, it is no longer stopped; stopped again only at the new cap (#409)", () => {
  const top = T + 12 * minute;
  const base = handoff({
    phase: "returned",
    auto: false,
    halt: "已审满 2 轮仍需修改",
    notice: "top",
    topAt: top,
    steps: [
      ...handoff().steps!,
      reply,
      step("back", top),
      step("stop", top, { auto: true }),
    ],
  });
  assert.deepEqual(stamp(base, true), { text: "停", tone: "red" });
  // The person's leave (`extra`): the auto round trip is on again, a 「专项续审」 step.
  const going = {
    ...base,
    auto: true,
    halt: null,
    phase: "working" as const,
    steps: [
      ...base.steps!,
      step("work", top + minute, { text: "专项续审：常浩：再审" }),
      step("ask", top + minute),
    ],
  };
  assert.notDeepEqual(stamp(going, true).text, "停");
  // Stopped there for another reason: 「未完暂停」, not 「停」.
  const paused = {
    ...going,
    auto: false,
    halt: "回信末尾认不出",
    phase: "replied" as const,
  };
  assert.notEqual(stamp(paused, true).text, "停");
  assert.equal(autoLabel(paused, true), "未完暂停");
  // At the new cap: stopped again.
  const again = { ...paused, halt: "又审满了", topAt: top + 20 * minute };
  assert.deepEqual(stamp(again, true), { text: "停", tone: "red" });
});

test("「去会话里说一句」 says so when its session is gone, and cannot be pressed (#411 L2 P2-04)", () => {
  assert.equal(actionLabels(true, "Claude", true).session, "去会话里说一句");
  assert.equal(actionLabels(true, "Claude", false).session, "原会话已不在");
  assert.equal(actionOff("session", false), true);
  assert.equal(actionOff("session", true), false);
  assert.equal(
    actionOff("end", false),
    false,
    "only the jump needs the session",
  );
  assert.match(
    actionTitle("session", true, "Claude", { at: 2, of: 2 }, false) ?? "",
    /找不到发起这单的 Claude 会话/,
  );
  assert.equal(
    actionTitle("session", true, "Claude", { at: 2, of: 2 }, true),
    undefined,
  );
  assert.equal(
    actionTitle("again", true, "Claude", { at: 1, of: 2 }, true),
    "Claude 改完后送 ChatGPT，第 2 / 2 轮",
  );
});

test("stopped at its cap and ended by PostPane after a day idle, it is still stopped; ended by the person, it is not (#411 L2 P2-02)", () => {
  const top = T + 12 * minute;
  const idle = top + 25 * 60 * minute;
  const stoppedOne = handoff({
    phase: "returned",
    auto: false,
    halt: "已审满 2 轮仍需修改",
    notice: "top",
    topAt: top,
    steps: [
      ...handoff().steps!,
      reply,
      step("back", top),
      step("stop", top, { auto: true }),
    ],
  });
  const idled = {
    ...stoppedOne,
    status: "closed" as const,
    phase: "ended" as const,
    steps: [
      ...stoppedOne.steps!,
      step("end", idle, { text: "闲置一天自动结束", auto: true }),
    ],
  };
  assert.deepEqual(stamp(idled, true), { text: "停", tone: "red" });
  assert.equal(
    timeline(idled, idle + minute, true).at(-1)?.title,
    "已停：审满 2 轮",
  );
  assert.deepEqual(actions(idled), ["close", "session"]);
  assert.equal(endedNote(idled, true), "闲置一天已自动收起，还没了结");
  // Ended by the person: only ended.
  const ended = { ...idled, steps: [...stoppedOne.steps!, step("end", idle)] };
  assert.deepEqual(stamp(ended, true), { text: "已结束", tone: "dim" });
  assert.deepEqual(actions(ended), ["close"]);
  assert.equal(endedNote(ended, true), "接力已结束");
});

test("an end by PostPane reads as a pass only when the gate let a pass through (#411, L2 P2-05)", () => {
  const passed = handoff({
    status: "closed",
    phase: "ended",
    notice: "passed",
    steps: [
      ...handoff().steps!,
      { ...reply, verdict: "pass" },
      step("end", T + 12 * minute, { auto: true }),
    ],
  });
  assert.equal(
    timeline(passed, T + 13 * minute, true).at(-1)?.title,
    "审核通过，自动结束接力",
  );
  // A pass on another commit than the one under review is sent back, not
  // let through (gate.rs `Next::Stale`): ended after a day idle, it is no pass.
  const stale = handoff({
    status: "closed",
    phase: "ended",
    steps: [
      ...handoff().steps!,
      { ...reply, verdict: "pass" },
      step("back", T + 12 * minute),
      step("end", T + 25 * 60 * minute, {
        auto: true,
        text: "闲置一天，驿窗自动结束",
      }),
    ],
  });
  assert.deepEqual(
    (({ title, sub }) => [title, sub])(
      timeline(stale, T + 26 * 60 * minute, true).at(-1)!,
    ),
    ["驿窗自动结束接力", "闲置一天，驿窗自动结束"],
  );
  // A 思维评审 settled reads as settled, not as a pass.
  const settled = handoff({
    title: "思维评审｜驿窗｜方向",
    status: "closed",
    phase: "ended",
    notice: "passed",
    steps: [
      ...handoff().steps!,
      { ...reply, verdict: "pass" },
      step("end", T + 12 * minute, { auto: true }),
    ],
  });
  assert.equal(
    timeline(settled, T + 13 * minute, true).at(-1)?.title,
    "思维评审收口，自动结束接力",
  );
  const idle = handoff({
    status: "closed",
    phase: "ended",
    steps: [
      ...handoff().steps!,
      reply,
      step("end", T + 25 * 60 * minute, {
        auto: true,
        text: "闲置一天，驿窗自动结束",
      }),
    ],
  });
  const last = timeline(idle, T + 26 * 60 * minute, true).at(-1);
  assert.deepEqual(
    [last?.title, last?.sub],
    ["驿窗自动结束接力", "闲置一天，驿窗自动结束"],
  );
  const byHand = handoff({
    status: "closed",
    phase: "ended",
    steps: [...handoff().steps!, step("end", T + 2 * minute)],
  });
  assert.equal(
    timeline(byHand, T + 3 * minute, true).at(-1)?.title,
    "结束接力",
  );
});

test("a pass sent back unpassed (another commit) still shows the round to come; one just in does not (#411 L2 P2-06)", () => {
  const pass = { ...reply, verdict: "pass" as const };
  const again = (h: Handoff) =>
    timeline(h, T + 13 * minute, true).some(
      (row) => row.title === "第 2 轮：ChatGPT 再审核",
    );
  // Sent back by the gate without a pass (gate.rs `Next::Stale`).
  const stale = handoff({
    phase: "returned",
    phaseAt: T + 12 * minute,
    steps: [...handoff().steps!, pass, step("back", T + 12 * minute)],
  });
  assert.ok(again(stale), "a round more is to come");
  // Just in, PostPane yet to act on it: no round to come.
  const fresh = handoff({
    phase: "replied",
    phaseAt: T + 11 * minute,
    steps: [...handoff().steps!, pass],
  });
  assert.ok(!again(fresh));
  // Passed by the gate: none either.
  assert.ok(!again({ ...stale, notice: "passed" }));
});
