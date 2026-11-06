import { test } from "node:test";
import assert from "node:assert/strict";
import {
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

test("asks read 私聊 or 群; a desk with tasks shows one ask, without three", () => {
  assert.equal(chatLabel("dm", "zh"), "私聊");
  assert.equal(chatLabel("group", "zh"), "群");
  assert.equal(chatLabel("thread", "zh"), "群");
  assert.equal(askLimit([{}]), 1);
  assert.equal(askLimit([]), 3);
});
