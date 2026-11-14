// The board split by place (ADR-0001 C1, owner chose 甲) and the peek's
// work line (C3), run against the fixed scenes (#349).
import { test } from "node:test";
import assert from "node:assert/strict";
import { liveSessions } from "../src/panel/agent-board.ts";
import {
  boardPlaces,
  boardWaiting,
  placeRows,
  RUNNING_FOLD,
} from "../src/panel/place-sessions.ts";
import { peekWork, workspaceOf } from "../src/workspace.ts";
import { peekBubbleHeight } from "../src/scene/peek-size.ts";
import { agentArtworkKey } from "../src/agent-artwork.ts";
import { scene } from "./scenes/scenes.ts";

const ids = (rows: { session: { id: string } }[]) =>
  rows.map((row) => row.session.id);

/** The blocks the scenes' whole board shows: the two quota agents, Hermes
 * with its bots and DeepSeek's balance. */
const BLOCKS = ["claude", "codex", "hermes", "api:deepseek"];

const board = (key: string) => {
  const { snapshot } = scene(key);
  const live = liveSessions(snapshot.sessions, snapshot.approvals);
  return { live, places: boardPlaces(snapshot, BLOCKS, live) };
};

test("整张看板：每家的会话只出现在本家区块（C1）", () => {
  const { live, places } = board("mixed");
  // Every listed session is under exactly one block, its own place's.
  const placed = places.flatMap((place) => ids(place.rows));
  assert.deepEqual([...placed].sort(), ids(live).sort());
  for (const place of places)
    for (const row of place.rows)
      assert.equal(
        agentArtworkKey(row.session.source),
        agentArtworkKey(place.source),
        `${row.session.id} under ${place.key}`,
      );
  const under = (key: string) =>
    ids(places.find((place) => place.key === key)?.rows ?? []);
  assert.deepEqual(under("claude"), ["c-run"]);
  assert.deepEqual(under("codex").sort(), ["x-relay", "x-wait"]);
  assert.deepEqual(under("api:deepseek").sort(), ["d-ask", "d-run"]);
  assert.deepEqual(under("hermes"), []);
  // ChatGPT has no quota block (#135): its sessions get a block of their
  // own, after the others.
  assert.deepEqual(under("sessions:chatgpt"), ["chatgpt:g-x"]);
  assert.equal(places.at(-1)?.key, "sessions:chatgpt");
});

test("整张看板：顶部「等你」汇总按家计数，待核对不算，没有等你就没有这一行", () => {
  assert.deepEqual(
    boardWaiting(board("mixed").places).map(({ source, count }) => [
      source,
      count,
    ]),
    [
      ["codex", 1],
      ["deepseek", 1],
    ],
  );
  assert.deepEqual(
    boardWaiting(board("codex-stale").places).map((w) => w.count),
    [1],
  );
  assert.deepEqual(boardWaiting(board("all-running").places), []);
});

test("某家在跑超过 3 条时收成一行，展开后都在；等你不收", () => {
  const claude = board("claude-busy").places.find((p) => p.key === "claude")!;
  assert.equal(RUNNING_FOLD, 3);
  const folded = placeRows(claude.rows, false);
  assert.deepEqual(ids(folded.waiting), ["c-ask"]);
  assert.deepEqual(folded.running, []);
  assert.equal(folded.folded, 4);
  const open = placeRows(claude.rows, true);
  assert.deepEqual(ids(open.running).sort(), [
    "c-busy-1",
    "c-busy-2",
    "c-busy-3",
    "c-busy-4",
  ]);
  assert.equal(open.folded, 4);
  // Three or fewer stay listed, with no fold line.
  const few = placeRows(claude.rows.slice(0, 4), false);
  assert.equal(few.running.length, 3);
  assert.equal(few.folded, 0);
});

test("一家的等你里，待核对排在后面", () => {
  const codex = board("codex-stale").places.find((p) => p.key === "codex")!;
  const rows = placeRows([...codex.rows].reverse(), false);
  assert.deepEqual(ids(rows.waiting), ["x-fresh", "x-stale"]);
});

test("小收据：等你 · 在跑 · 接力的计数来自本家工作区，Hermes 不出（C3）", () => {
  const { snapshot } = scene("mixed");
  const work = (mark: string) => peekWork(snapshot, mark);
  assert.deepEqual(work("claude"), { waiting: 0, running: 1, relays: 1 });
  assert.deepEqual(work("codex"), { waiting: 1, running: 1, relays: 1 });
  assert.deepEqual(work(agentArtworkKey("chatgpt")), {
    waiting: 0,
    running: 1,
    relays: 2,
  });
  assert.deepEqual(work("deepseek"), { waiting: 1, running: 1, relays: 0 });
  assert.equal(work("hermes"), undefined);
  // 「待核对」 is not counted as waiting on you.
  const stale = scene("codex-stale").snapshot;
  assert.equal(workspaceOf(stale, "codex").waiting.length, 2);
  assert.deepEqual(peekWork(stale, "codex"), {
    waiting: 1,
    running: 0,
    relays: 0,
  });
});

test("小收据多一行，三种形态的高度都加上这一行", () => {
  const work = { waiting: 1, running: 2, relays: 0 };
  const quota = {
    bots: [],
    quotas: [{}, {}] as never,
    balance: null,
    usage: null,
  };
  assert.equal(
    peekBubbleHeight({ ...quota, work }, 2) - peekBubbleHeight(quota, 2),
    18 * 2,
  );
  const desk = {
    ...quota,
    quotas: [],
    desk: { chats: [], more: 0, reviews: [{}] } as never,
  };
  assert.equal(
    peekBubbleHeight({ ...desk, work }, 1) - peekBubbleHeight(desk, 1),
    18,
  );
  const bots = { ...quota, quotas: [], bots: [{}] as never };
  assert.equal(
    peekBubbleHeight({ ...bots, work }, 1) - peekBubbleHeight(bots, 1),
    18,
  );
});
