import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent } from "@agent-hud/protocol";
import { glowAlert } from "../src/glow-alert.ts";
import { isQuotaEvent } from "../src/alerts/quota-list.ts";
import { isFailure } from "../src/alerts/failure-list.ts";
import {
  cronFailedWhen,
  cronShortName,
} from "../src/alerts/quota-alert-copy.ts";

const failed: IslandEvent = {
  id: "event:1:hermes-default-cron-a",
  kind: "cron-failed",
  at: "2026-11-05T15:00:00Z",
  source: "hermes",
  title: "周报（新结构·并跑）",
  message: "没跑成",
  failedAt: "2026-11-02T01:14:01.841Z",
  nextRunAt: "2026-11-08T23:45:00Z",
  bot: { id: "default", name: "猛鬼兽" },
};

const zh = {
  language: "zh" as const,
  calendar: { timeZone: "Asia/Shanghai", firstWeekday: 2 },
};

// Since #498 a failed task is a failure line, not a strip (owner, 2026-11-21).
test("a failed Hermes task is a failure line and glows as a warning", () => {
  assert.equal(isQuotaEvent(failed), false);
  assert.equal(isFailure(failed), true);
  assert.equal(
    glowAlert({ id: failed.id, kind: "cron-failed", vendor: "hermes" }, [
      "hermes",
    ])?.color,
    "#e9a16d",
  );
});

test("its line says when it failed and when it runs next", () => {
  assert.equal(
    cronFailedWhen(failed, zh),
    "11月2日 周一 09:14 失败 · 下次 11月9日 07:45",
  );
  assert.equal(
    cronFailedWhen({ ...failed, failedAt: null, nextRunAt: null }, zh),
    null,
  );
});

test("the folded tag drops the note in brackets", () => {
  assert.equal(cronShortName("周报（新结构·并跑）"), "周报");
  assert.equal(cronShortName("工程自检（每天 09:50，有问题才说）"), "工程自检");
  assert.equal(cronShortName("Tidings 周报卡片"), "Tidings 周报卡片");
});
