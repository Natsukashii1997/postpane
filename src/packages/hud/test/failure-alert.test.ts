// The failure receipt (#359, ADR-0001 C6; the owner chose 甲 on 2026-11-14,
// and on 2026-11-21: a passing failure stays until 「知道了」 or the session's
// next turn, a limit until it lifts; the folded tag says 出错 / 限流至 14:30).
// The replies keep their own rules (C5).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent, Session } from "@agent-hud/protocol";
import {
  dismissable,
  failureBody,
  failureChip,
  failureKey,
  failureStands,
  failureTag,
  standingQueue,
} from "../src/alerts/failure-list.ts";
import {
  frontFolds,
  seenFirst,
  sideClocks,
} from "../src/alerts/reply-stays.ts";
import {
  laneEvents,
  newsLanes,
  reconcileIslandCards,
  roomForNews,
  type LaneCard,
} from "../src/alerts/news-lanes.ts";
import { noticeSeal } from "../src/scene/news-seal.ts";
import { glowAlert } from "../src/glow-alert.ts";
import { isQuotaEvent } from "../src/alerts/quota-list.ts";
import { tagWaits } from "../src/scene/tag-fold.ts";

const NOW = Date.parse("2026-11-21T06:00:00Z"); // 14:00 Beijing time
const SHANGHAI = { timeZone: "Asia/Shanghai", firstWeekday: 2 };
const minutes = (n: number) => new Date(NOW + n * 60_000).toISOString();

const failed = (n: number, more: Partial<IslandEvent> = {}): IslandEvent => ({
  id: `event:${n}:f`,
  kind: "turn-failed",
  failure: "failed",
  at: minutes(-n),
  source: "codex",
  sessionId: "x-fail",
  turnId: "t1",
  title: "生成迁移脚本",
  count: 1,
  limitedUntil: null,
  ...more,
});
const limited = (n: number, until: string | null, more = {}) =>
  failed(n, {
    failure: "limited",
    source: "claude",
    sessionId: "c-limit",
    limitedUntil: until,
    ...more,
  });
const reply = (n: number, source = "claude"): IslandEvent => ({
  id: `event:${n}:r`,
  kind: "completion",
  at: minutes(-n),
  source,
  sessionId: `${source}-s`,
});
const told = (event: IslandEvent): LaneCard => ({
  type: "news",
  id: event.id,
  at: event.at,
  event,
});
const ids = (cards: readonly { id: string }[]) => cards.map((card) => card.id);
const session = (id: string, source: string, turnId: string | null) =>
  ({ id, source, liveFacts: { turnId } }) as unknown as Session;

test("出错回执自成一类：不是额度细条，按警示闪", () => {
  assert.equal(isQuotaEvent(failed(1)), false);
  assert.equal(
    glowAlert({ id: "e", kind: "turn-failed", vendor: "codex" }, ["codex"])
      ?.warning,
    true,
  );
});

test("按来源 + 会话 + 错误类型合并：同一行的新事件替换旧卡", () => {
  assert.equal(failureKey(failed(1)), "codex:x-fail:failed");
  assert.equal(failureKey(limited(1, null)), "claude:c-limit:limited");
  const first = reconcileIslandCards([], [], [failed(5)]);
  const again = failed(2, { turnId: "t2", count: 2 });
  const next = reconcileIslandCards(first, [], [again]);
  assert.deepEqual(ids(next), ["event:2:f"]);
  // Another kind in the same session, or another session, is its own line.
  const other = reconcileIslandCards(
    next,
    [],
    [failed(1, { failure: "limited" }), failed(0, { sessionId: "x-other" })],
  );
  assert.equal(other.length, 3);
  // A reply is never merged into a failure's line.
  assert.equal(reconcileIslandCards(next, [], [reply(1, "codex")]).length, 2);
});

test("合并计数在红色小标签上显示 ×n", () => {
  assert.equal(failureTag(failed(1), true), "失败");
  assert.equal(failureTag(failed(1, { count: 2 }), true), "失败 ×2");
  assert.equal(failureTag(limited(1, null, { count: 3 }), true), "限流 ×3");
  assert.equal(failureTag(failed(1), false), "Failed");
});

test("行下正文：失败、限流几小时几分后恢复、恢复时间未知", () => {
  assert.equal(
    failureBody(failed(1), NOW, true),
    "这一轮没跑完，失败了。去会话里看原因。",
  );
  assert.equal(
    failureBody(limited(1, minutes(150)), NOW, true),
    "被限流，2 小时 30 分后恢复。",
  );
  assert.equal(
    failureBody(limited(1, minutes(40)), NOW, true),
    "被限流，40 分后恢复。",
  );
  assert.equal(
    failureBody(limited(1, null), NOW, true),
    "被限流，恢复时间未知。",
  );
});

test("小签用常规说法：出错、限流至 14:30（北京时间）", () => {
  assert.equal(failureChip(failed(1), NOW, SHANGHAI, true), "出错");
  assert.equal(
    failureChip(limited(1, minutes(30)), NOW, SHANGHAI, true),
    "限流至 14:30",
  );
  assert.equal(failureChip(limited(1, null), NOW, SHANGHAI, true), "限流");
  // Past midnight in Beijing it names the day.
  assert.equal(
    failureChip(limited(1, minutes(11 * 60)), NOW, SHANGHAI, true),
    "限流至 11月22日 01:00",
  );
});

test("出错卡不走 4 秒：在前面不收，挂在旁边也不进 sideClocks", () => {
  const looked = new Set<string>();
  for (const event of [failed(1), limited(2, minutes(30))]) {
    assert.equal(
      frontFolds(told(event), { held: false, opened: false, looked }),
      false,
    );
    assert.equal(
      frontFolds(told(event), { held: false, opened: true, looked }),
      false,
      "opening it does not start a clock either",
    );
  }
  const sides = [
    { id: "event:1:f", event: failed(1) },
    { id: "event:2:r", event: reply(2) },
  ];
  assert.deepEqual(
    sideClocks(sides, ids(sides), new Set(["event:1:f"]), false),
    ["event:2:r"],
  );
});

test("新回复的停留规则不变：Claude 4 秒收、Hermes 和 ChatGPT 看过才收", () => {
  const none = new Set<string>();
  assert.equal(
    frontFolds(told(reply(1)), { held: false, opened: false, looked: none }),
    true,
  );
  assert.equal(
    frontFolds(told(reply(1, "hermes")), {
      held: false,
      opened: false,
      looked: none,
    }),
    false,
  );
  assert.equal(
    frontFolds(told(reply(1, "chatgpt")), {
      held: false,
      opened: false,
      looked: new Set(["event:1:r"]),
    }),
    true,
  );
  assert.equal(tagWaits({ id: "f", event: failed(1) }, none), false);
});

test("后到的新回复排到同一家的出错卡前面，照常 4 秒收；出错卡随后回到前面", () => {
  const queue = reconcileIslandCards([], [], [failed(5)]);
  const arrived = [reply(1, "codex")];
  const next = seenFirst(reconcileIslandCards(queue, [], arrived), arrived);
  assert.deepEqual(ids(next), ["event:1:r", "event:5:f"]);
  // Held, the front stays.
  assert.deepEqual(
    ids(seenFirst(reconcileIslandCards(queue, [], arrived), arrived, true)),
    ["event:5:f", "event:1:r"],
  );
  // Another agent's reply does not jump the queue.
  const elsewhere = [reply(1, "claude")];
  assert.deepEqual(
    ids(seenFirst(reconcileIslandCards(queue, [], elsewhere), elsewhere)),
    ["event:5:f", "event:1:r"],
  );
  // A failure arriving behind a reply waits its turn.
  const behind = [failed(0, { sessionId: "x-2" })];
  assert.deepEqual(
    ids(seenFirst(reconcileIslandCards(next, [], behind), behind)),
    ["event:1:r", "event:5:f", "event:0:f"],
  );
});

test("会话下一轮开始、或限流到点，这张卡就不在了", () => {
  const sessions = [
    session("x-fail", "codex", "t1"),
    session("c-limit", "claude", "t1"),
  ];
  assert.equal(failureStands(failed(1), sessions, NOW), true);
  assert.equal(
    failureStands(failed(1), [session("x-fail", "codex", "t2")], NOW),
    false,
  );
  // A session no longer listed keeps its line until 「知道了」.
  assert.equal(failureStands(failed(1), [], NOW), true);
  assert.equal(failureStands(limited(1, minutes(1)), sessions, NOW), true);
  assert.equal(failureStands(limited(1, minutes(0)), sessions, NOW), false);
  assert.equal(failureStands(limited(1, null), sessions, NOW + 9e9), true);
  const queue = [told(failed(1)), told(reply(2)), told(limited(3, minutes(5)))];
  assert.deepEqual(
    ids(standingQueue(queue, [session("x-fail", "codex", "t2")], NOW)),
    ["event:2:r", "event:3:f"],
  );
  assert.equal(standingQueue(queue, sessions, NOW), queue);
});

test("「知道了」只收偶发失败；限流挂到恢复，恢复时间未知的也能收", () => {
  assert.equal(dismissable(failed(1)), true);
  assert.equal(dismissable(limited(1, minutes(30))), false);
  assert.equal(dismissable(limited(1, null)), true);
});

test("挤位置时先挤会自己收的通知，出错卡和看过才收的回复留着", () => {
  const queue = [
    told(reply(9)),
    told(failed(8)),
    told(reply(7, "hermes")),
    told(reply(6)),
    told(reply(1)),
  ];
  assert.deepEqual(ids(roomForNews(queue, 4)), [
    "event:9:r",
    "event:8:f",
    "event:7:r",
    "event:1:r",
  ]);
  // None folds by itself: the oldest goes, as before.
  assert.deepEqual(ids(roomForNews(queue.slice(0, 4), 3)), [
    "event:9:r",
    "event:7:r",
    "event:6:r",
  ]);
});

test("一家的出错行单独成列，卡头盖红色「出错」印章，数的是出错行", () => {
  const queue = [told(failed(3)), told(reply(2, "codex")), told(failed(1))];
  const lane = newsLanes(queue, [])[0];
  const failures = laneEvents(lane, "turn-failed");
  const replies = laneEvents(lane, "completion");
  assert.deepEqual(ids(failures), ["event:3:f", "event:1:f"]);
  assert.deepEqual(noticeSeal(failed(3), { replies, failures }, true), {
    seal: { words: "出错", ink: "red" },
    count: 2,
  });
  assert.deepEqual(noticeSeal(reply(2), { replies, failures }, true), {
    seal: { words: "已回", ink: "blue" },
    count: 1,
  });
  assert.equal(
    noticeSeal(
      { ...reply(1), kind: "quota-reset" },
      { replies, failures },
      true,
    ),
    null,
  );
});
