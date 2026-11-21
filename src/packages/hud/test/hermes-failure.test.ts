// Hermes shares the failure receipt (ADR-0001 第 4 批, #498; the owner
// answered 「改」 on 2026-11-21): a bot down or a scheduled task that did
// not run is a red 出错 line, one per bot and kind (×n), no longer a strip
// folding after four seconds. Down hangs until the bot is back; a task that
// did not run stays until 「知道了」. The Hermes card itself is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { HermesBotStatus, IslandEvent } from "@agent-hud/protocol";
import {
  dismissable,
  failureBody,
  failureChip,
  failureKey,
  failureStands,
  failureTag,
  isFailure,
  standingQueue,
} from "../src/alerts/failure-list.ts";
import { isQuotaEvent, queuedQuotas } from "../src/alerts/quota-list.ts";
import { frontFolds, sideClocks } from "../src/alerts/reply-stays.ts";
import {
  laneFailures,
  newsLanes,
  reconcileIslandCards,
  roomForNews,
  type LaneCard,
} from "../src/alerts/news-lanes.ts";
import { noticeSeal } from "../src/scene/news-seal.ts";
import { tagWaits } from "../src/scene/tag-fold.ts";

const NOW = Date.parse("2026-11-21T06:00:00Z"); // 14:00 Beijing time
const SHANGHAI = { timeZone: "Asia/Shanghai", firstWeekday: 2 };

const offline = (n: number, more: Partial<IslandEvent> = {}): IslandEvent => ({
  id: `hermes:agumon:offline:${n}`,
  kind: "bot-offline",
  islandAlert: true,
  at: new Date(NOW - n * 60_000).toISOString(),
  source: "hermes",
  accountId: "agumon",
  title: "亚古兽",
  message: "飞书断线",
  bot: { id: "agumon", name: "亚古兽" },
  ...more,
});
const cron = (n: number, more: Partial<IslandEvent> = {}): IslandEvent => ({
  id: `hermes:default:cron:weekly:${n}`,
  kind: "cron-failed",
  islandAlert: true,
  at: new Date(NOW - n * 60_000).toISOString(),
  source: "hermes",
  accountId: "default",
  title: "周报（新结构·并跑）",
  message: "没跑成",
  failedAt: "2026-11-21T01:14:00Z",
  nextRunAt: "2026-11-23T23:45:00Z",
  bot: { id: "default", name: "猛鬼兽" },
  ...more,
});
const bot = (id: string, down: HermesBotStatus["down"]): HermesBotStatus => ({
  id,
  name: id,
  down,
  turnsToday: 0,
  lastReplyAt: null,
});
const told = (event: IslandEvent): LaneCard => ({
  type: "news",
  id: event.id,
  at: event.at,
  event,
});
const ids = (cards: readonly { id: string }[]) => cards.map((card) => card.id);

test("Hermes 的断线、没跑成是出错回执，不再是额度细条", () => {
  for (const event of [offline(1), cron(1)]) {
    assert.equal(isFailure(event), true);
    assert.equal(isQuotaEvent(event), false);
  }
  assert.deepEqual(queuedQuotas([told(offline(1)), told(cron(2))]), []);
});

test("按机器人 + 错误类型合并成一行，再出一次就 ×2", () => {
  assert.equal(failureKey(offline(1)), "hermes:agumon:bot-offline");
  assert.equal(failureKey(cron(1)), "hermes:default:cron-failed");
  const first = reconcileIslandCards([], [], [offline(9)]);
  const again = reconcileIslandCards(first, [], [offline(2)]);
  assert.deepEqual(ids(again), ["hermes:agumon:offline:2"]);
  const line = (again[0] as Extract<LaneCard, { type: "news" }>).event;
  assert.equal(line.count, 2);
  assert.equal(failureTag(line, true), "断线 ×2");
  // Another task of the same bot that did not run joins its line too.
  const tasks = reconcileIslandCards(
    reconcileIslandCards([], [], [cron(5)]),
    [],
    [cron(1, { id: "hermes:default:cron:daily:1", title: "日报" })],
  );
  assert.equal(tasks.length, 1);
  assert.equal(
    failureTag((tasks[0] as { event: IslandEvent }).event, true),
    "没跑成 ×2",
  );
  // Another bot, or the other kind, is a line of its own.
  const other = reconcileIslandCards(
    again,
    [],
    [
      offline(1, {
        id: "hermes:default:offline:1",
        accountId: "default",
        bot: { id: "default", name: "猛鬼兽" },
      }),
      cron(0),
    ],
  );
  assert.equal(other.length, 3);
});

test("红色小标签与小签文字：断线、没跑成", () => {
  assert.equal(failureTag(offline(1), true), "断线");
  assert.equal(failureTag(cron(1), true), "没跑成");
  assert.equal(failureTag(offline(1), false), "Offline");
  assert.equal(failureChip(offline(1), NOW, SHANGHAI, true), "断线");
  assert.equal(failureChip(cron(1), NOW, SHANGHAI, true), "没跑成");
});

test("行下正文：断线写原因，没跑成写失败和下次时间（原细条那一行）", () => {
  assert.equal(
    failureBody(offline(1), NOW, true, SHANGHAI),
    "飞书断线，重新连上后自动收起。",
  );
  assert.equal(
    failureBody(offline(1, { message: "网关没有运行" }), NOW, true, SHANGHAI),
    "网关没有运行，重新连上后自动收起。",
  );
  assert.equal(
    failureBody(cron(1), NOW, true, SHANGHAI),
    "定时任务没跑成：11月21日 周六 09:14 失败 · 下次 11月24日 07:45。",
  );
  assert.equal(
    failureBody(
      cron(1, { failedAt: null, nextRunAt: null }),
      NOW,
      true,
      SHANGHAI,
    ),
    "定时任务没跑成，去飞书看原因。",
  );
});

test("断线挂到重新连上；没跑成留到「知道了」", () => {
  assert.equal(dismissable(offline(1)), false);
  assert.equal(dismissable(cron(1)), true);
  const down = [bot("agumon", "feishu"), bot("default", null)];
  assert.equal(failureStands(offline(1), [], NOW, down), true);
  assert.equal(
    failureStands(offline(1), [], NOW, [bot("agumon", null)]),
    false,
  );
  // A bot no longer read has nothing left to hang on.
  assert.equal(failureStands(offline(1), [], NOW, []), false);
  assert.equal(failureStands(cron(1), [], NOW, []), true);
  const queue = [told(offline(1)), told(cron(2))];
  assert.deepEqual(ids(standingQueue(queue, [], NOW, down)), ids(queue));
  assert.deepEqual(ids(standingQueue(queue, [], NOW, [bot("agumon", null)])), [
    "hermes:default:cron:weekly:2",
  ]);
});

test("不走 4 秒：在前面不收、挂在旁边不计时，小签 5 秒后收成窄条", () => {
  const looked = new Set<string>();
  for (const event of [offline(1), cron(1)]) {
    assert.equal(
      frontFolds(told(event), { held: false, opened: true, looked }),
      false,
    );
    assert.deepEqual(
      sideClocks([{ id: event.id, event }], [event.id], looked, false),
      [],
    );
    assert.equal(tagWaits({ id: event.id, event }, looked), true);
  }
});

test("挤位置时出错回执留着；卡头盖红色「出错」印章，数的是出错行", () => {
  const reply: IslandEvent = {
    id: "r",
    kind: "completion",
    at: new Date(NOW).toISOString(),
    source: "claude",
  };
  const queue = [told(offline(3)), told(reply), told({ ...reply, id: "r2" })];
  assert.deepEqual(ids(roomForNews(queue, 2)), [
    "hermes:agumon:offline:3",
    "r2",
  ]);
  const lane = newsLanes([told(offline(3)), told(cron(2))], [])[0];
  const failures = laneFailures(lane);
  assert.equal(failures.length, 2);
  assert.deepEqual(noticeSeal(offline(3), { replies: [], failures }, true), {
    seal: { words: "出错", ink: "red" },
    count: 2,
  });
});
