import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, IslandEvent } from "@agent-hud/protocol";
import {
  askedInFront,
  blocksNotice,
  laneEvents,
  liveQueue,
  newsLanes,
  promoteNewestWaiting,
  sideLanes,
  type LaneCard,
} from "../src/alerts/news-lanes.ts";

const at = (minute: number) =>
  `2026-11-06T09:${String(minute).padStart(2, "0")}:00Z`;
const request = (id: string, source: string, minute: number): Approval =>
  ({ id, source, createdAt: at(minute), kind: "question" }) as Approval;
const event = (
  id: string,
  source: string,
  minute: number,
  kind: IslandEvent["kind"] = "completion",
): IslandEvent => ({ id, kind, at: at(minute), source });
const asked = (approval: Approval): LaneCard => ({
  type: "request",
  id: approval.id,
  at: approval.createdAt,
});
const told = (news: IslandEvent): LaneCard => ({
  type: "news",
  id: news.id,
  at: news.at,
  event: news,
});

const claudeAsk = request("ask-1", "claude", 1);
const claudeAsk2 = request("ask-2", "claude", 2);
const codexAsk = request("ask-3", "codex", 4);
const codexReply = event("reply-1", "codex", 3);
const claudeReply = event("reply-2", "claude", 5);
const requests = [claudeAsk, claudeAsk2, codexAsk];

test("each agent gets a lane of its own, in the order they came", () => {
  const lanes = newsLanes(
    [asked(claudeAsk), told(codexReply), asked(claudeAsk2)],
    requests,
  );
  assert.deepEqual(
    lanes.map((lane) => [lane.vendor, lane.front.id]),
    [
      ["claude", "ask-1"],
      ["codex", "reply-1"],
    ],
  );
  assert.deepEqual(
    lanes[0].cards.map((card) => card.id),
    ["ask-1", "ask-2"],
  );
});

test("the first lane keeps the queue's front; another lane leads with its newest request (#328)", () => {
  const lanes = newsLanes(
    [told(codexReply), asked(claudeAsk), told(claudeReply), asked(codexAsk)],
    requests,
  );
  assert.equal(lanes[0].vendor, "codex");
  assert.equal(lanes[0].front.id, "reply-1");
  const codexAsk2 = request("ask-4", "codex", 6);
  const codex = newsLanes(
    [asked(claudeAsk), told(codexReply), asked(codexAsk), asked(codexAsk2)],
    [...requests, codexAsk2],
  )[1];
  assert.equal(codex.vendor, "codex");
  assert.equal(codex.front.id, "ask-4");
});

test("the newest waiting request comes in front of the notices (#328)", () => {
  assert.deepEqual(
    promoteNewestWaiting([
      told(codexReply),
      asked(claudeAsk),
      asked(codexAsk),
      asked(claudeAsk2),
    ]).map((card) => card.id),
    ["ask-3", "reply-1", "ask-1", "ask-2"],
  );
});

test("a request that arrives comes in front of the requests, not of a notice (#328)", () => {
  // Found on the first look: the newest of them opens.
  assert.deepEqual(
    askedInFront([], [asked(claudeAsk), asked(claudeAsk2)]).map((c) => c.id),
    ["ask-2", "ask-1"],
  );
  const queue = [asked(claudeAsk), asked(claudeAsk2)];
  assert.deepEqual(
    askedInFront(queue, [...queue, asked(codexAsk)]).map((c) => c.id),
    ["ask-3", "ask-1", "ask-2"],
  );
  // Nothing new: an older line the owner opened stays open.
  assert.equal(askedInFront(queue, queue), queue);
  // A reply in front stays there; the request waits behind it.
  const told1 = [told(codexReply), asked(claudeAsk)];
  assert.deepEqual(
    askedInFront(told1, [...told1, asked(codexAsk)]).map((c) => c.id),
    ["reply-1", "ask-1", "ask-3"],
  );
});

test("a lane's replies are its own agent's only", () => {
  const lanes = newsLanes(
    [asked(claudeAsk), told(codexReply), told(claudeReply)],
    requests,
  );
  assert.deepEqual(
    laneEvents(lanes[0], "completion").map((each) => each.id),
    ["reply-2"],
  );
  assert.deepEqual(
    laneEvents(lanes[1], "completion").map((each) => each.id),
    ["reply-1"],
  );
});

test("Codex CLI and Codex share a lane; a request no longer waiting has none", () => {
  const cli = event("reply-cli", "codex-cli", 6);
  const lanes = newsLanes(
    [told(codexReply), told(cli), asked(request("gone", "claude", 0))],
    requests,
  );
  assert.deepEqual(
    lanes.map((lane) => [lane.vendor, lane.cards.length]),
    [["codex", 2]],
  );
});

test("only an agent's own request holds back its notices", () => {
  const quota = event("low", "codex", 7, "quota-exhaustion");
  assert.equal(blocksNotice([asked(claudeAsk)], requests, quota), false);
  assert.equal(blocksNotice([asked(codexAsk)], requests, quota), true);
  assert.equal(blocksNotice([asked(codexAsk)], requests, codexReply), false);
});

test("the lanes beside the first hang by their own marks; one off the strip has no tag", () => {
  const lanes = newsLanes(
    [asked(claudeAsk), told(codexReply), told(event("hermes-1", "hermes", 8))],
    requests,
  );
  assert.deepEqual(
    sideLanes(lanes, ["claude", "codex", "chatgpt"]).map((side) => [
      side.lane.vendor,
      side.mark,
    ]),
    [["codex", 1]],
  );
});

test("an answered request leaves the front at once, the next waiting one taking its place", () => {
  // The snapshot drops an answered request a render before the queue does;
  // read from the queue alone, that render had no card in front, and the
  // open card folded away into the small tag (owner, 2026-11-07).
  const queue = [asked(claudeAsk), told(claudeReply), asked(claudeAsk2)];
  const left = [claudeAsk2, codexAsk];
  assert.deepEqual(
    liveQueue(queue, left).map((card) => card.id),
    ["ask-2", "reply-2"],
  );
});

test("an answered request in front gives way to the newest one waiting (#328)", () => {
  const late = request("ask-9", "claude", 9);
  const queue = [asked(claudeAsk), asked(claudeAsk2), asked(late)];
  assert.deepEqual(
    liveQueue(queue, [claudeAsk2, late]).map((card) => card.id),
    ["ask-9", "ask-2"],
  );
});

test("a queue whose requests all still wait is passed on as it is", () => {
  const queue = [asked(claudeAsk), told(claudeReply)];
  assert.equal(liveQueue(queue, requests), queue);
});

test("the front prefers the newest request answerable here (#331)", () => {
  const gone = request("gone", "claude", 8);
  gone.answersQuestion = false;
  const goneCard: LaneCard = {
    type: "request",
    id: gone.id,
    at: gone.createdAt,
    elsewhere: true,
  };
  assert.deepEqual(
    promoteNewestWaiting([
      told(codexReply),
      asked(claudeAsk),
      goneCard,
      asked(claudeAsk2),
    ]).map((card) => card.id),
    ["ask-2", "reply-1", "ask-1", "gone"],
  );
  // Nothing else waits: the one only Claude can take leads.
  assert.equal(
    promoteNewestWaiting([told(codexReply), goneCard])[0].id,
    "gone",
  );
  // Another agent's tag leads with its newest request answerable here.
  const lane = newsLanes(
    [told(codexReply), asked(claudeAsk), goneCard],
    [claudeAsk, gone],
  )[1];
  assert.equal(lane.front.id, "ask-1");
});
