import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import type { Approval, IslandEvent } from "@agent-hud/protocol";
import {
  blocksNotice,
  dismissIslandCard,
  newsLanes,
  promoteNewestWaiting,
  requestCard,
  roomForNews,
  sideLanes,
  type LaneCard,
} from "../src/alerts/news-lanes.ts";
import {
  frontFolds,
  seenFirst,
  sideClocks,
} from "../src/alerts/reply-stays.ts";

// #221: a reply the owner has not seen is not put away on a clock. Taken
// from the 2026-11-07 audit (evidence/2026-11-07-ops-audit/replies/).

// IslandNews.tsx cannot be imported under node --test (TSX); take the pure
// queue functions out of it verbatim, as the audit did.
const source = readFileSync(
  new URL("../src/IslandNews.tsx", import.meta.url),
  "utf8",
);
const start = source.indexOf("export function reconcileIslandCards");
const end = source.indexOf("export type SideNews");
const body = stripTypeScriptTypes(
  source.slice(start, end).replaceAll("export function", "function"),
);
const { reconcileIslandCards } = new Function(
  "promoteNewestWaiting",
  "blocksNotice",
  "roomForNews",
  "requestCard",
  `${body}; return { reconcileIslandCards };`,
)(promoteNewestWaiting, blocksNotice, roomForNews, requestCard) as {
  reconcileIslandCards: (
    previous: LaneCard[],
    requests: Approval[],
    visible: IslandEvent[],
  ) => LaneCard[];
};

const reply = (n: number, src = "hermes", kind = "completion"): IslandEvent =>
  ({
    id: `event:${n}:r`,
    kind,
    at: new Date(Date.UTC(2026, 10, 7, 9, 0, n)).toISOString(),
    source: src,
  }) as IslandEvent;
const told = (news: IslandEvent): LaneCard => ({
  type: "news",
  id: news.id,
  at: news.at,
  event: news,
});
const asked: LaneCard = { type: "request", id: "ask", at: reply(0).at };
const ids = (cards: readonly { id: string }[]) => cards.map((card) => card.id);

test("a new reply arriving when 32 notices already wait is kept", () => {
  let queue: LaneCard[] = [];
  for (let n = 1; n <= 32; n += 1)
    queue = reconcileIslandCards(queue, [], [reply(n)]);
  assert.equal(queue.length, 32);
  const next = ids(reconcileIslandCards(queue, [], [reply(33)]));
  assert.equal(next.length, 32);
  assert.ok(
    next.includes("event:33:r"),
    `newest reply missing; queue still ends at ${next.at(-1)}`,
  );
  // The card in front stays; the oldest one behind it makes room.
  assert.equal(next[0], "event:1:r");
  assert.ok(!next.includes("event:2:r"));
});

test("the oldest notice that folds away by itself makes room first", () => {
  const queue = [
    told(reply(1)),
    told(reply(2)),
    told(reply(3, "claude")),
    told(reply(4, "codex", "quota-reset")),
    told(reply(5)),
  ];
  const kept = ids(roomForNews(queue, 3));
  // Hermes replies wait to be seen; the Claude reply and the quota notice
  // fold away on their own, so they go first, oldest first.
  assert.deepEqual(kept, ["event:1:r", "event:2:r", "event:5:r"]);
  // The one just come stays even when it would fold away by itself.
  assert.deepEqual(
    ids(
      roomForNews(
        [told(reply(1)), told(reply(2)), told(reply(3, "claude"))],
        2,
      ),
    ),
    ["event:1:r", "event:3:r"],
  );
  // Requests never count against the notices.
  assert.deepEqual(ids(roomForNews([asked, ...queue], 5)), [
    "ask",
    ...ids(queue),
  ]);
});

test("a reply arriving while the card is held does not take the front", () => {
  const queue = reconcileIslandCards([], [], [reply(1, "claude")]);
  const arrived = [reply(2, "hermes")];
  const next = reconcileIslandCards(queue, [], arrived);
  assert.deepEqual(ids(seenFirst(next, arrived, true)), [
    "event:1:r",
    "event:2:r",
  ]);
  // Let go, it comes in front as before (owner, 2026-11-05).
  assert.deepEqual(ids(seenFirst(next, arrived)), ["event:2:r", "event:1:r"]);
});

test("a Claude reply being read is not handed to the 4-second side clock when a Hermes reply arrives", () => {
  const queue = reconcileIslandCards([], [], [reply(1, "claude")]);
  // The owner rests the pointer on the Claude reply card (main clock paused).
  const arrived = [reply(2, "hermes")];
  const next = seenFirst(
    reconcileIslandCards(queue, [], arrived),
    arrived,
    true,
  );
  const sides = sideLanes(newsLanes(next, []), ["hermes", "claude"]).map(
    ({ lane }) => ({
      id: lane.front.id,
      event: lane.front.type === "news" ? lane.front.event : undefined,
    }),
  );
  const timed = sideClocks(
    sides,
    sides.map((side) => side.id),
    new Set(),
    false,
  );
  assert.deepEqual(timed, [], `side clock starts for ${timed.join(", ")}`);
});

test("a side tag's clock runs only while it is drawn and not held", () => {
  const sides = [
    { id: "event:1:r", event: reply(1, "claude") },
    { id: "event:2:r", event: reply(2, "codex", "quota-reset") },
    { id: "event:3:r", event: reply(3, "hermes") },
    { id: "ask" },
  ];
  const drawn = ["event:1:r", "event:2:r", "event:3:r", "ask"];
  assert.deepEqual(sideClocks(sides, drawn, new Set(), false), [
    "event:1:r",
    "event:2:r",
  ]);
  // In the notch, while dragged or under the card: not drawn, no clock.
  assert.deepEqual(sideClocks(sides, [], new Set(), false), []);
  assert.deepEqual(sideClocks(sides, ["event:2:r"], new Set(), false), [
    "event:2:r",
  ]);
  // The pointer resting on the sidebar, or a reply being typed, holds them.
  assert.deepEqual(sideClocks(sides, drawn, new Set(), true), []);
  // A Hermes reply already opened folds away as the others do.
  assert.deepEqual(sideClocks(sides, drawn, new Set(["event:3:r"]), false), [
    "event:1:r",
    "event:2:r",
    "event:3:r",
  ]);
});

test("a Hermes reply counts as seen only once its card has opened", () => {
  const card = told(reply(1, "hermes"));
  const looked = new Set<string>();
  // The pointer passes over the tag on its way elsewhere.
  assert.equal(frontFolds(card, { held: true, opened: false, looked }), false);
  assert.equal(frontFolds(card, { held: false, opened: false, looked }), false);
  // The card opens under the pointer, then the pointer leaves.
  assert.equal(frontFolds(card, { held: true, opened: true, looked }), false);
  assert.equal(frontFolds(card, { held: false, opened: false, looked }), true);
  // Other notices fold away unless held; a request never does.
  const claude = told(reply(2, "claude"));
  assert.equal(
    frontFolds(claude, { held: false, opened: false, looked: new Set() }),
    true,
  );
  assert.equal(
    frontFolds(claude, { held: true, opened: false, looked: new Set() }),
    false,
  );
  assert.equal(
    frontFolds(asked, { held: false, opened: false, looked: new Set() }),
    false,
  );
  assert.equal(
    frontFolds(undefined, { held: false, opened: false, looked }),
    false,
  );
});

test("put away, the card in front gives way to the newest request (#328)", () => {
  const ask = (n: number): LaneCard => ({
    type: "request",
    id: `ask-${n}`,
    at: reply(n).at,
  });
  assert.deepEqual(
    ids(dismissIslandCard([ask(3), told(reply(4)), ask(1), ask(2)])),
    ["ask-2", "event:4:r", "ask-1"],
  );
});

test("a question only its client can take is queued as such (#331)", () => {
  const gone = {
    id: "gone",
    source: "claude",
    createdAt: reply(1).at,
    kind: "question",
    answersQuestion: false,
  } as Approval;
  const here = { ...gone, id: "here", answersQuestion: true } as Approval;
  const queue = reconcileIslandCards([], [gone, here], []);
  assert.deepEqual(
    queue.map((card) => [card.id, card.type === "request" && card.elsewhere]),
    [
      ["gone", true],
      ["here", false],
    ],
  );
});
