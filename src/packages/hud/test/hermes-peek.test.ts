import { test } from "node:test";
import assert from "node:assert/strict";
import type { HermesBotStatus } from "@agent-hud/protocol";
import { peekBots, peekTones, replyTime } from "../src/scene/hermes-peek.ts";
import { peekBubbleHeight, showsBots } from "../src/scene/peek-size.ts";

const ogre: HermesBotStatus = {
  id: "default",
  name: "猛鬼兽",
  down: null,
  turnsToday: 10,
  lastReplyAt: "2026-11-05T13:51:00Z",
};
const agumon: HermesBotStatus = {
  id: "agumon",
  name: "亚古兽",
  down: null,
  turnsToday: 0,
  lastReplyAt: null,
};
const clock = (at: number) => `@${at}`;

test("an online bot shows when it last replied and its turns today", () => {
  const [line, quiet] = peekBots([ogre, agumon], [], true, clock);
  assert.equal(line.state, "online");
  assert.equal(line.label, "在线");
  assert.equal(
    line.detail,
    `@${Date.parse("2026-11-05T13:51:00Z")} 回复 · 今天 10 轮`,
  );
  assert.equal(quiet.detail, "今天 0 轮");
});

test("a bot running a turn is replying, with its question", () => {
  const [line, other] = peekBots(
    [ogre, agumon],
    [
      {
        bot: { id: "default", name: "猛鬼兽" },
        state: "running",
        title: "周报为什么没发",
      },
      { bot: { id: "agumon", name: "亚古兽" }, state: "idle", title: "旧问题" },
    ],
    true,
    clock,
  );
  assert.equal(line.state, "replying");
  assert.equal(line.detail, "周报为什么没发");
  assert.equal(other.state, "online");
});

test("a down gateway outranks a running turn and says why", () => {
  const [feishu, stopped] = peekBots(
    [
      { ...ogre, down: "feishu" },
      { ...agumon, down: "stopped" },
    ],
    [{ bot: { id: "default", name: "猛鬼兽" }, state: "running", title: "x" }],
    true,
    clock,
  );
  assert.deepEqual(
    [feishu.state, feishu.label, feishu.detail],
    ["down", "断线", "飞书没连上"],
  );
  assert.equal(stopped.detail, "网关停了");
});

test("a reply today shows its time, an older one its date", () => {
  const format = {
    time: new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Shanghai",
    }),
    date: new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      timeZone: "Asia/Shanghai",
    }),
  };
  const now = Date.parse("2026-11-05T14:45:00Z");
  assert.equal(
    replyTime(Date.parse("2026-11-05T13:51:00Z"), now, format),
    "21:51",
  );
  assert.equal(
    replyTime(Date.parse("2026-11-04T13:51:00Z"), now, format),
    "11月4日",
  );
});

test("the peek grows by a row per bot and the tokens under them", () => {
  const hermes = {
    bots: [ogre, agumon],
    quotas: [],
    balance: null,
    usage: "1.2M",
  };
  assert.equal(showsBots(hermes), true);
  assert.equal(peekBubbleHeight(hermes, 1), 20 + 18 + 2 * 36 + 18 + 6 + 8);
  assert.equal(
    peekBubbleHeight({ ...hermes, usage: null }, 1),
    20 + 18 + 72 + 6,
  );
  // Without bots, the old "--" row stays.
  const bare = { bots: [], quotas: [], balance: null, usage: "1.2M" };
  assert.equal(showsBots(bare), false);
  assert.equal(peekBubbleHeight(bare, 1), 20 + 2 * 18 + 6);
});

test("on paper a bot's state is written in the word ink, down in red (#308)", () => {
  const inks = { online: "green", replying: "blue", down: "red" };
  assert.deepEqual(peekTones({ ...inks, word: "slate" }), {
    dot: inks,
    word: { online: "slate", replying: "slate", down: "red" },
  });
  // Off the paper the word keeps the dot's colour.
  assert.deepEqual(peekTones(inks).word, inks);
});
