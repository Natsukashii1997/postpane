import { test } from "node:test";
import assert from "node:assert/strict";
import {
  askChat,
  askGoTitle,
  askLimit,
  askWhen,
  cadence,
  chatLabel,
  deskRole,
  deskState,
  hermesStamp,
  jobRows,
  shortJobName,
  shortWhen,
} from "../src/panel/hermes-board.ts";

// Thursday 2026-11-06 10:30 in Beijing.
const now = Date.parse("2026-11-06T10:30:00+08:00");
const tz = "Asia/Shanghai";
const at = (iso: string) => Date.parse(iso);

test("the heading stamps 在岗 while both bots are up and 断线 when one is down", () => {
  assert.equal(hermesStamp([{ down: null }, { down: null }]), "duty");
  assert.equal(hermesStamp([{ down: null }, { down: "feishu" }]), "down");
  assert.equal(hermesStamp([]), null);
});

test("each bot's desk says what it is for", () => {
  assert.equal(deskRole("default", "zh"), "私人分身 · 监工");
  assert.equal(deskRole("agumon", "zh"), "企业分身 · 带教");
  assert.equal(deskRole("other", "zh"), null);
});

test("a desk's state: idle, replying, or down and for how long", () => {
  const up = { down: null, downSince: null };
  assert.deepEqual(deskState(up, false, now, "zh"), {
    tone: "ok",
    text: "在线 · 空闲",
  });
  assert.deepEqual(deskState(up, true, now, "zh"), {
    tone: "busy",
    text: "正在回复",
  });
  const feishu = {
    down: "feishu" as const,
    downSince: new Date(now - 12 * 60_000).toISOString(),
  };
  assert.deepEqual(deskState(feishu, true, now, "zh"), {
    tone: "down",
    text: "飞书断线 12 分钟",
  });
  assert.equal(
    deskState(
      {
        down: "stopped",
        downSince: new Date(now - 3 * 3_600_000).toISOString(),
      },
      false,
      now,
      "zh",
    ).text,
    "网关停了 3 小时",
  );
  assert.equal(
    deskState({ down: "feishu", downSince: null }, false, now, "zh").text,
    "飞书断线",
  );
});

test("a task reads by its name without the bracketed note", () => {
  assert.equal(shortJobName("日报（新结构·并跑）"), "日报");
  assert.equal(shortJobName("工程自检（每天 09:50，有问题才说）"), "工程自检");
  assert.equal(
    shortJobName("Tidings 周报卡片（每周一 11:30，发到私聊）"),
    "Tidings 周报卡片",
  );
  assert.equal(shortJobName("（全在括号里）"), "（全在括号里）");
});

test("how often a task runs reads in words (#384)", () => {
  const zh = (schedule: string | null) => cadence(schedule, "zh");
  assert.equal(zh("30 7 * * *"), "每天 07:30");
  assert.equal(zh("45 7 * * 1"), "每周一 07:45");
  assert.equal(zh("0 9 * * 0"), "每周日 09:00");
  assert.equal(zh("0 9 * * 1-5"), "工作日 09:00");
  assert.equal(zh("30 10 1 * *"), "每月 1 日 10:30");
  assert.equal(zh("0 8 */5 * *"), "每 5 天 08:00");
  assert.equal(zh("*/15 * * * *"), "每 15 分钟");
  assert.equal(zh("*/30 9-23 * * *"), "每 30 分钟（9–23 点）");
  assert.equal(zh("0 */2 * * *"), "每 2 小时");
  assert.equal(zh("0 * * * *"), "每小时");
  assert.equal(zh("0 9-18 * * 1-5"), "工作日每小时（9–18 点）");
  assert.equal(zh("every 5m"), "每 5 分钟");
  assert.equal(zh("every 2h"), "每 2 小时");
  assert.equal(zh("every 1d"), "每天");
  // What it cannot say plainer reads as Hermes wrote it.
  assert.equal(zh("0 9 * 6 *"), "0 9 * 6 *");
  assert.equal(zh("0 9 1 * 1"), "0 9 1 * 1");
  assert.equal(zh("*/5 */2 * * *"), "*/5 */2 * * *");
  assert.equal(zh("2026-12-01T09:00"), "2026-12-01T09:00");
  assert.equal(zh(null), "");
  assert.equal(cadence("45 7 * * 1", "en"), "Every Mon 07:45");
  assert.equal(cadence("*/15 * * * *", "en"), "Every 15 min");
  assert.equal(
    cadence("*/30 9-18 * * 1-5", "en"),
    "Weekdays, every 30 min (9–18h)",
  );
});

test("runs read short: 今天 / 昨天 / date", () => {
  const when = (iso: string) => shortWhen(at(iso), now, tz, "zh");
  assert.equal(when("2026-11-06T07:35:51+08:00"), "今天");
  assert.equal(when("2026-11-05T09:50:00+08:00"), "昨天");
  assert.equal(when("2026-11-02T09:14:01+08:00"), "11/2");
});

test("an ask reads its time today, 昨天 HH:MM, or its date", () => {
  assert.equal(
    askWhen(at("2026-11-06T10:26:00+08:00"), now, tz, "zh"),
    "10:26",
  );
  assert.equal(
    askWhen(at("2026-11-05T21:55:22+08:00"), now, tz, "zh"),
    "昨天 21:55",
  );
  assert.equal(
    askWhen(at("2026-11-02T18:33:07+08:00"), now, tz, "zh"),
    "11/2 18:33",
  );
});

test("the task table: last run ✓ / ✗ / never, 已暂停, no next run (#384)", () => {
  const rows = jobRows(
    [
      {
        id: "d",
        name: "日报（新结构·并跑）",
        enabled: true,
        failed: false,
        schedule: "30 7 * * *",
        lastRunAt: "2026-11-06T07:35:51+08:00",
        nextRunAt: "2026-11-07T07:30:00+08:00",
      },
      {
        id: "w",
        name: "周报（新结构·并跑）",
        enabled: true,
        failed: true,
        schedule: "45 7 * * 1",
        lastRunAt: "2026-11-02T09:14:01+08:00",
        nextRunAt: "2026-11-09T07:45:00+08:00",
      },
      {
        id: "c",
        name: "AI 前沿群学习报告",
        enabled: true,
        failed: false,
        schedule: "45 10 * * *",
        lastRunAt: null,
        nextRunAt: "2026-11-06T10:45:00+08:00",
      },
      {
        id: "t",
        name: "Tidings 周报卡片（每周一 11:30，发到私聊）",
        enabled: false,
        failed: false,
        schedule: "30 11 * * 1",
        lastRunAt: "2026-11-02T11:30:00+08:00",
        nextRunAt: null,
        pausedReason: "等 Tidings 新版上线",
      },
    ],
    now,
    tz,
    "zh",
  );
  assert.deepEqual(
    rows.map((row) => [row.name, row.cadence, row.last.tone, row.last.text]),
    [
      ["日报", "每天 07:30", "ok", "✓ 今天"],
      ["周报", "每周一 07:45", "fail", "✗ 11/2"],
      ["AI 前沿群学习报告", "每天 10:45", "none", "没跑过"],
      ["Tidings 周报卡片", "每周一 11:30", "paused", "已暂停"],
    ],
  );
  assert.equal(rows[0].title, "日报（新结构·并跑）");
  assert.equal(
    rows[3].title,
    "Tidings 周报卡片（每周一 11:30，发到私聊）\n暂停原因：等 Tidings 新版上线",
  );
  assert.ok(rows.every((row) => !("next" in row)));
});

test("a task turned off without a stated reason does not show (#384)", () => {
  const off = (id: string, pausedReason?: string | null) => ({
    id,
    name: `任务${id}`,
    enabled: false,
    failed: false,
    schedule: "50 9 * * *",
    lastRunAt: "2026-11-05T09:50:00+08:00",
    nextRunAt: null,
    pausedReason,
  });
  const names = (jobs: Parameters<typeof jobRows>[0]) =>
    jobRows(jobs, now, tz, "zh").map((row) => row.name);
  assert.deepEqual(names([off("a"), off("b", null), off("c", "  ")]), []);
  assert.deepEqual(names([off("a"), off("d", "先停一周")]), ["任务d"]);
});

// The steps of one job, as 猛鬼兽 runs 个人项目日报 (digital-twin #159).
const step = (
  id: string,
  name: string,
  schedule: string,
  over: Partial<NonNullable<Parameters<typeof jobRows>[0]>[number]> = {},
) => ({
  id,
  name,
  enabled: true,
  failed: false,
  schedule,
  lastRunAt: "2026-11-05T10:00:35+08:00",
  nextRunAt: "2026-11-07T10:00:00+08:00",
  ...over,
});
const table = (jobs: Parameters<typeof jobRows>[0]) =>
  jobRows(jobs, now, tz, "zh").map((row) => [
    row.name,
    row.cadence,
    row.last.text,
  ]);

test("the steps of one job (名字·步骤) read as one row by the job's name (#326)", () => {
  const send = step(
    "s",
    "个人项目日报·发送（每天 10:00 发甲版卡片到私聊；#155、#159）",
    "0 10 * * *",
  );
  const write = step(
    "w",
    "个人项目日报·写稿（每天 09:15，10:00 发送；#155、#159）",
    "15 9 * * *",
    {
      lastRunAt: "2026-11-05T09:38:45+08:00",
      nextRunAt: "2026-11-07T09:15:00+08:00",
    },
  );
  const before = step("t", "Tidings 周报卡片", "*/15 * * * *");
  const after = step("a", "AI HOT 热点榜", "45 9 * * 1-5");
  // Listed send first: the last step is the latest in the day, not the last listed.
  const rows = jobRows([before, send, write, after], now, tz, "zh");
  assert.deepEqual(
    rows.map((row) => [row.name, row.cadence, row.last.text]),
    [
      ["Tidings 周报卡片", "每 15 分钟", "✓ 昨天"],
      ["个人项目日报", "每天 10:00", "✓ 昨天"],
      ["AI HOT 热点榜", "工作日 09:45", "✓ 昨天"],
    ],
  );
  assert.equal(rows[1].id, "s+w");
  assert.equal(
    rows[1].title,
    [
      "个人项目日报·写稿（每天 09:15，10:00 发送；#155、#159）：每天 09:15 · ✓ 昨天",
      "个人项目日报·发送（每天 10:00 发甲版卡片到私聊；#155、#159）：每天 10:00 · ✓ 昨天",
    ].join("\n"),
  );
});

test("a job's row fails when any step failed, is paused when any step is (#326, #384)", () => {
  const write = (over = {}) =>
    step("w", "个人项目日报·写稿", "15 9 * * *", over);
  const send = (over = {}) =>
    step("s", "个人项目日报·发送", "0 10 * * *", over);
  assert.deepEqual(
    table([
      write({ failed: true, lastRunAt: "2026-11-04T09:15:00+08:00" }),
      send(),
    ]),
    [["个人项目日报", "每天 10:00", "✗ 11/4"]],
  );
  assert.deepEqual(
    table([write(), send({ enabled: false, pausedReason: "换模板" })]),
    [["个人项目日报", "每天 10:00", "已暂停"]],
  );
  // A step turned off for no reason drops; the rest of the job still shows.
  assert.deepEqual(table([write(), send({ enabled: false })]), [
    ["个人项目日报·写稿", "每天 09:15", "✓ 昨天"],
  ]);
  assert.deepEqual(table([write(), send({ lastRunAt: null })]), [
    ["个人项目日报", "每天 10:00", "没跑过"],
  ]);
});

test("one task named 名字·步骤 alone keeps its own row (#326)", () => {
  assert.deepEqual(
    table([
      step("w", "个人项目日报·写稿", "15 9 * * *"),
      step("d", "日报（新结构·并跑）", "30 7 * * *"),
    ]),
    [
      ["个人项目日报·写稿", "每天 09:15", "✓ 昨天"],
      ["日报", "每天 07:30", "✓ 昨天"],
    ],
  );
});

test("asks read 私 or 群; a desk with tasks shows one ask, without three", () => {
  assert.equal(chatLabel("dm", "zh"), "私");
  assert.equal(chatLabel("group", "zh"), "群");
  assert.equal(chatLabel("thread", "zh"), "群");
  assert.equal(askLimit([{}]), 1);
  assert.equal(askLimit([]), 3);
});

test("an ask opens its Feishu chat only by a chat id Core gave", () => {
  assert.equal(askChat({ chatId: "oc_08a1_B2" }), "oc_08a1_B2");
  for (const chatId of [
    undefined,
    null,
    "",
    "oc_",
    "ou_08a1",
    "oc_a&x=1",
    "oc_a/b",
    `oc_${"a".repeat(62)}`,
  ])
    assert.equal(askChat({ chatId }), null, String(chatId));
  assert.equal(askGoTitle(false, "zh"), "在飞书打开这个聊天");
  assert.equal(askGoTitle(true, "zh"), "飞书没能打开这个聊天");
});
