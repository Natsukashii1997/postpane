import type { Approval, IslandEvent } from "@agent-hud/protocol";
import { agentArtworkKey } from "../agent-artwork.ts";

/** One card of the sidebar's news queue (IslandNews keeps the queue). */
export type LaneCard =
  | { type: "request"; id: string; at: string }
  | {
      type: "news";
      id: string;
      at: string;
      event: IslandEvent;
      inUsagePanel?: boolean;
    };

/** One agent's share of the queue: its tag and its card show only these (#162). */
export interface NewsLane {
  /** The agent's mark on the strip (vendorKey). */
  vendor: string;
  /** What its tag shows: the queue's front for the first lane, else the
   * agent's oldest waiting request, else its first card. */
  front: LaneCard;
  cards: LaneCard[];
}

/** The queue with the request waiting longest in front (IslandAlertQueue.
 * dismiss(): requests wait since they were asked and come before notices,
 * which keep their order). */
export function promoteOldestWaiting(pending: LaneCard[]): LaneCard[] {
  if (pending.length < 2) return pending;
  const best = pending.reduce((at, card, index) => {
    const waiting = card.type === "request";
    const prior = pending[at],
      priorWaiting = prior.type === "request";
    return waiting &&
      (!priorWaiting || Date.parse(card.at) < Date.parse(prior.at))
      ? index
      : at;
  }, 0);
  return [pending[best], ...pending.filter((_, index) => index !== best)];
}

/** The queue without the requests no longer waiting, settled as the queue
 * itself will be a render later. The snapshot drops an answered request
 * first; read from the queue alone, that render had no card in front, and
 * the open card folded away into the small tag (owner, 2026-11-07). */
export function liveQueue(
  queue: LaneCard[],
  requests: readonly Approval[],
): LaneCard[] {
  const waiting = (card: LaneCard) =>
    card.type !== "request" || requests.some((each) => each.id === card.id);
  if (queue.every(waiting)) return queue;
  const kept = queue.filter(waiting);
  return waiting(queue[0]) ? kept : promoteOldestWaiting(kept);
}

/** The agent a card is about; a request no longer waiting has none. */
export function cardVendor(
  card: LaneCard,
  requests: readonly Approval[],
): string | undefined {
  if (card.type === "news") return agentArtworkKey(card.event.source);
  const request = requests.find((each) => each.id === card.id);
  return request ? agentArtworkKey(request.source) : undefined;
}

/** The queue split by agent, in the order the agents first appear. */
export function newsLanes(
  queue: readonly LaneCard[],
  requests: readonly Approval[],
): NewsLane[] {
  const lanes = new Map<string, LaneCard[]>();
  for (const card of queue) {
    const vendor = cardVendor(card, requests);
    if (!vendor) continue;
    const cards = lanes.get(vendor);
    if (cards) cards.push(card);
    else lanes.set(vendor, [card]);
  }
  return [...lanes].map(([vendor, cards], index) => {
    if (index === 0 && cards[0] === queue[0])
      return { vendor, front: cards[0], cards };
    const waiting = cards
      .filter((card) => card.type === "request")
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
    return { vendor, front: waiting ?? cards[0], cards };
  });
}

/** A lane's notices of one kind, as they came. */
export function laneEvents(
  lane: NewsLane | undefined,
  kind: IslandEvent["kind"],
): IslandEvent[] {
  return (lane?.cards ?? []).flatMap((card) =>
    card.type === "news" && card.event.kind === kind ? [card.event] : [],
  );
}

/** A notice other than a reply waits out its own agent's request: another
 * agent's request no longer holds it back. */
export function blocksNotice(
  queue: readonly LaneCard[],
  requests: readonly Approval[],
  event: IslandEvent,
): boolean {
  if (event.kind === "completion") return false;
  const vendor = agentArtworkKey(event.source);
  return queue.some(
    (card) => card.type === "request" && cardVendor(card, requests) === vendor,
  );
}

/** The lanes after the first, each by its mark on the strip (its index in
 * `marks`); an agent without a mark there hangs no tag. */
export function sideLanes(
  lanes: readonly NewsLane[],
  marks: readonly string[],
): { lane: NewsLane; mark: number }[] {
  return lanes.slice(1).flatMap((lane) => {
    const mark = marks.indexOf(lane.vendor);
    return mark < 0 ? [] : [{ lane, mark }];
  });
}
