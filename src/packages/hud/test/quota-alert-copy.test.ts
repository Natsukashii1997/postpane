import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quotaAlertCopy,
  resetCreditCopy,
  waitText,
} from "../src/alerts/quota-alert-copy.ts";

const en = {
  language: "en" as const,
  calendar: { timeZone: "UTC", firstWeekday: 1 },
};
const zh = {
  language: "zh" as const,
  calendar: { timeZone: "UTC", firstWeekday: 2 },
};
const event = (extra: object) =>
  ({
    id: "e",
    kind: "quota-exhaustion",
    at: "2026-10-21T12:00:00Z",
    source: "codex",
    title: "Weekly",
    ...extra,
  }) as never;

test("the small reminder still says what Open says, measured from the reading", () => {
  const empty = quotaAlertCopy(
    event({ usedPercent: 100, resetAt: "2026-10-23T09:00:00Z" }),
    en,
  );
  assert.equal(empty.compactTitle, "Empty");
  const forecast = quotaAlertCopy(
    event({
      usedPercent: 92,
      timeToExhaustSeconds: 3_000,
      resetAt: "2026-10-21T15:00:00Z",
    }),
    zh,
  );
  assert.equal(forecast.compactTitle, "50m 后耗尽");
  assert.equal(quotaAlertCopy(event({}), en).display, "N/A");
});

// Thursday 5 November 2026, 14:05 in Beijing.
const beijing = {
  language: "zh" as const,
  calendar: { timeZone: "Asia/Shanghai", firstWeekday: 2 },
};
const english = { ...beijing, language: "en" as const };
const at = "2026-11-05T06:05:00Z";

test("a strip running out says when it runs out and when it resets", () => {
  const reading = event({
    at,
    source: "codex",
    title: "5h limit",
    crossing: "forecast",
    usedPercent: 74,
    timeToExhaustSeconds: 2 * 3600 + 15 * 60,
    resetAt: "2026-11-05T09:45:00Z",
  });
  const zhCopy = quotaAlertCopy(reading, beijing);
  assert.deepEqual(
    [zhCopy.tone, zhCopy.status, zhCopy.when, zhCopy.display],
    [
      "warning",
      "5 小时 约 2 小时 15 分后用完",
      "预计用完 16:20，重置 17:45",
      "74%",
    ],
  );
  const enCopy = quotaAlertCopy(reading, english);
  assert.deepEqual(
    [enCopy.status, enCopy.when],
    ["5h limit runs out in about 2h 15m", "Runs out 16:20, resets 17:45"],
  );
  // Past midnight the time carries its weekday.
  const late = quotaAlertCopy(
    event({
      at: "2026-11-05T15:00:00Z",
      title: "Weekly limit · All models",
      crossing: "forecast",
      usedPercent: 80,
      timeToExhaustSeconds: 2 * 3600,
    }),
    beijing,
  );
  assert.equal(late.when, "预计用完 周五 01:00");
});

test("a used-up strip is red and says how long until the reset", () => {
  const reading = event({
    at,
    source: "claude",
    title: "Weekly limit · All models",
    crossing: "exhausted",
    usedPercent: 100,
    resetAt: "2026-11-10T00:40:00Z",
  });
  const zhCopy = quotaAlertCopy(reading, beijing);
  assert.deepEqual(
    [zhCopy.tone, zhCopy.windowName, zhCopy.status, zhCopy.when],
    [
      "critical",
      "每周",
      "每周额度已用完",
      "下周二 08:40 重置（还要 4 天 18 小时）",
    ],
  );
  const enCopy = quotaAlertCopy(reading, english);
  assert.deepEqual(
    [enCopy.status, enCopy.when],
    [
      "Weekly limit · All models is used up",
      "Resets Next Tue 08:40 (4d 18h to go)",
    ],
  );
  // Remaining at or under 0.5% is used up whatever the crossing says.
  assert.equal(
    quotaAlertCopy(
      event({ at, usedPercent: 99.6, crossing: "critical" }),
      beijing,
    ).tone,
    "critical",
  );
});

test("a strip at the threshold without a speed says how much is used and the reset", () => {
  const reading = event({
    at,
    title: "Weekly limit · Fable",
    crossing: "critical",
    usedPercent: 90.4,
    resetAt: "2026-11-05T09:45:00Z",
  });
  const zhCopy = quotaAlertCopy(reading, beijing);
  assert.deepEqual(
    [zhCopy.tone, zhCopy.status, zhCopy.when],
    ["warning", "每周 · Fable 已用到 90%", "17:45 重置（还要 3 小时 40 分）"],
  );
  const enCopy = quotaAlertCopy(reading, english);
  assert.deepEqual(
    [enCopy.status, enCopy.when],
    ["Weekly limit · Fable at 90% used", "Resets 17:45 (3h 40m to go)"],
  );
  assert.equal(quotaAlertCopy(event({ at }), beijing).when, null);
});

test("a reset strip names the next reset and the windows still used up", () => {
  const reading = event({
    at,
    kind: "quota-reset",
    title: "Current session",
    usedPercent: 0,
    resetAt: "2026-11-05T11:05:00Z",
    otherExhaustedWindows: [{ name: "Weekly limit · All models" }, {}],
  });
  const zhCopy = quotaAlertCopy(reading, beijing);
  assert.deepEqual(
    [
      zhCopy.tone,
      zhCopy.status,
      zhCopy.when,
      zhCopy.stillEmpty,
      zhCopy.chipStatus,
    ],
    ["reset", "5 小时额度已重置", "19:05 再重置", "每周仍已用完", "已重置"],
  );
  const enCopy = quotaAlertCopy(reading, english);
  assert.deepEqual(
    [enCopy.status, enCopy.when, enCopy.stillEmpty, enCopy.chipStatus],
    [
      "Current session has reset",
      "Next reset 19:05",
      "Weekly limit · All models still used up",
      "Reset",
    ],
  );
  assert.equal(
    quotaAlertCopy(
      event({
        at,
        kind: "quota-reset",
        usedPercent: 0,
        otherExhaustedWindows: [],
      }),
      beijing,
    ).stillEmpty,
    null,
  );
});

test("without a reading a strip says the quota is unavailable", () => {
  const copy = quotaAlertCopy(event({ at, title: "Weekly" }), beijing);
  assert.deepEqual(
    [copy.tone, copy.status, copy.when, copy.chipStatus],
    ["none", "每周额度暂不可用", null, "—"],
  );
});

test("waits read in days and hours, or hours and minutes", () => {
  assert.equal(waitText(4 * 86400 + 18 * 3600 + 35 * 60, "zh"), "4 天 18 小时");
  assert.equal(waitText(3 * 86400, "en"), "3d");
  assert.equal(waitText(2 * 3600, "zh"), "2 小时");
  assert.equal(waitText(61, "en"), "2m");
  assert.equal(waitText(0, "zh"), "1 分");
});

test("a credit card names the first expiry as a date", () => {
  const copy = resetCreditCopy(
    2,
    ["2026-11-09T08:00:00Z", "2026-11-02T08:00:00Z", null],
    "en",
  );
  assert.deepEqual(
    [copy.compactTitle, copy.title, copy.expiry],
    ["+2 resets", "2 usage resets were added to this account.", "Nov 2"],
  );
});

test("remaining display keeps alert thresholds and forecasts in consumed semantics", () => {
  const reading = event({ usedPercent: 92, timeToExhaustSeconds: 3000 });
  const consumed = quotaAlertCopy(reading, en);
  const remaining = quotaAlertCopy(reading, {
    ...en,
    quotaDisplay: "remaining",
  });
  assert.equal(remaining.display, "8%");
  assert.equal(remaining.displayPct, 8);
  assert.equal(remaining.chipStatus, "8%");
  assert.equal(consumed.display, "92%");
  assert.equal(remaining.status, consumed.status);
  assert.equal(remaining.when, consumed.when);
  assert.equal(remaining.tone, consumed.tone);
  assert.equal(remaining.compactTitle, consumed.compactTitle);
  assert.equal(
    quotaAlertCopy(event({ usedPercent: 100 }), {
      ...en,
      quotaDisplay: "remaining",
    }).display,
    "0%",
  );
  assert.equal(
    quotaAlertCopy(event({ usedPercent: 0, kind: "quota-reset" }), {
      ...en,
      quotaDisplay: "remaining",
    }).display,
    "100%",
  );
  assert.equal(
    quotaAlertCopy(event({}), { ...en, quotaDisplay: "remaining" }).display,
    "N/A",
  );
});
