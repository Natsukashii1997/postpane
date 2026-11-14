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

test("how often a task runs reads from its cron expression", () => {
  assert.equal(cadence("30 7 * * *", "zh"), "每天 07:30");
  assert.equal(cadence("45 7 * * 1", "zh"), "周一 07:45");
  assert.equal(cadence("0 9 * * 1-5", "zh"), "工作日 09:00");
  assert.equal(cadence("*/30 * * * *", "zh"), "*/30 * * * *");
  assert.equal(cadence("every 30m", "zh"), "every 30m");
  assert.equal(cadence(null, "zh"), "");
});

test("runs read short: 今天 / 昨天 / date behind, time / 明天 / weekday ahead", () => {
  const when = (iso: string) => shortWhen(at(iso), now, tz, "zh");
  assert.equal(when("2026-11-06T07:35:51+08:00"), "今天");
  assert.equal(when("2026-11-05T09:50:00+08:00"), "昨天");
  assert.equal(when("2026-11-02T09:14:01+08:00"), "11/2");
  assert.equal(when("2026-11-06T11:30:00+08:00"), "11:30");
  assert.equal(when("2026-11-07T07:30:00+08:00"), "明天");
  assert.equal(when("2026-11-09T07:45:00+08:00"), "周一");
  assert.equal(when("2026-11-20T07:45:00+08:00"), "11/20");
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

test("the task table: last run ✓ / ✗ / never, next run, or off", () => {
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
        id: "t",
        name: "Tidings 周报卡片（每周一 11:30，发到私聊）",
        enabled: false,
        failed: false,
        schedule: "30 11 * * 1",
        lastRunAt: null,
        nextRunAt: "2026-11-09T11:30:00+08:00",
      },
    ],
    now,
    tz,
    "zh",
  );
  assert.deepEqual(
    rows.map((row) => [
      row.name,
      row.cadence,
      row.last.tone,
      row.last.text,
      row.next,
    ]),
    [
      ["日报", "每天 07:30", "ok", "✓ 今天", "明天"],
      ["周报", "周一 07:45", "fail", "✗ 11/2", "周一"],
      ["Tidings 周报卡片", "周一 11:30", "none", "没跑过", "停用"],
    ],
  );
  assert.equal(rows[0].title, "日报（新结构·并跑）");
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
    row.next,
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
    rows.map((row) => [row.name, row.cadence, row.last.text, row.next]),
    [
      ["Tidings 周报卡片", "*/15 * * * *", "✓ 昨天", "明天"],
      ["个人项目日报", "每天 10:00", "✓ 昨天", "明天"],
      ["AI HOT 热点榜", "工作日 09:45", "✓ 昨天", "明天"],
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

test("a job's row fails when any step failed, is off when any step is off (#326)", () => {
  const write = (over = {}) =>
    step("w", "个人项目日报·写稿", "15 9 * * *", over);
  const send = (over = {}) =>
    step("s", "个人项目日报·发送", "0 10 * * *", over);
  assert.deepEqual(
    table([
      write({ failed: true, lastRunAt: "2026-11-04T09:15:00+08:00" }),
      send(),
    ]),
    [["个人项目日报", "每天 10:00", "✗ 11/4", "明天"]],
  );
  assert.deepEqual(table([write(), send({ enabled: false })]), [
    ["个人项目日报", "每天 10:00", "✓ 昨天", "停用"],
  ]);
  assert.deepEqual(table([write(), send({ lastRunAt: null })]), [
    ["个人项目日报", "每天 10:00", "没跑过", "明天"],
  ]);
});

test("one task named 名字·步骤 alone keeps its own row (#326)", () => {
  assert.deepEqual(
    table([
      step("w", "个人项目日报·写稿", "15 9 * * *"),
      step("d", "日报（新结构·并跑）", "30 7 * * *"),
    ]),
    [
      ["个人项目日报·写稿", "每天 09:15", "✓ 昨天", "明天"],
      ["日报", "每天 07:30", "✓ 昨天", "明天"],
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
