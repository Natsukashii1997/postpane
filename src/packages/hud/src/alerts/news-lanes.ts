import type { Approval, IslandEvent } from "@agent-hud/protocol";
import { agentArtworkKey } from "../agent-artwork.ts";
import { staysUntilSeen } from "./reply-stays.ts";

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
   * agent's newest waiting request (#328), else its first card. */
  front: LaneCard;
  cards: LaneCard[];
}

/** The queue with the newest waiting request in front (owner, 2026-11-14,
 * #328; it was the one waiting longest, after IslandAlertQueue.dismiss()):
 * requests come before notices, which keep their order. */
export function promoteNewestWaiting(pending: LaneCard[]): LaneCard[] {
  if (pending.length < 2) return pending;
  const best = pending.reduce((at, card, index) => {
    const waiting = card.type === "request";
    const prior = pending[at],
      priorWaiting = prior.type === "request";
    return waiting &&
      (!priorWaiting || Date.parse(card.at) > Date.parse(prior.at))
      ? index
      : at;
  }, 0);
  return [pending[best], ...pending.filter((_, index) => index !== best)];
}

/** The queue with the newest request in front, unless a notice is (#328). */
export const newestAskFirst = (queue: LaneCard[]) =>
  queue[0]?.type === "request" ? promoteNewestWaiting(queue) : queue;

/** `next` with the newest request in front when a request arrived since
 * `previous`: a new question opens at once. A notice in front keeps its
 * place; nothing new keeps a line the owner opened (#328). */
export function askedInFront(
  previous: readonly LaneCard[],
  next: LaneCard[],
): LaneCard[] {
  const arrived = next.some(
    (card) =>
      card.type === "request" && !previous.some((each) => each.id === card.id),
  );
  return arrived ? newestAskFirst(next) : next;
}

/** The queue once its front card is put away: the newest request next (#328). */
export function dismissIslandCard(previous: LaneCard[]): LaneCard[] {
  return promoteNewestWaiting(previous.slice(1));
}

/** The queue without the cards `ids` (replies put away from the reply
 * card, quota notices from the quota card); a request left in front is the
 * newest (#328). */
export function dropIslandCards(
  previous: LaneCard[],
  ids: readonly string[],
): LaneCard[] {
  const next = previous.filter((card) => !ids.includes(card.id));
  return next[0]?.id === previous[0]?.id ? next : promoteNewestWaiting(next);
}

/** The waiting requests of one agent's lane, in the order given. */
export function laneRequests(
  lane: NewsLane | undefined,
  requests: readonly Approval[],
): Approval[] {
  return lane
    ? requests.filter(
        (request) => agentArtworkKey(request.source) === lane.vendor,
      )
    : [];
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
  return waiting(queue[0]) ? kept : promoteNewestWaiting(kept);
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
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
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

/** The queue with at most `limit` notices: past that, the oldest notice that
 * folds away by itself makes room, else the oldest one, never the card in
 * front nor the one just come; requests are never put away (#221). */
export function roomForNews(queue: LaneCard[], limit = 32): LaneCard[] {
  const next = [...queue];
  let news = next.filter((card) => card.type === "news").length;
  while (news > limit) {
    const notices = next.flatMap((card, index) =>
      index > 0 && index < next.length - 1 && card.type === "news"
        ? [{ card, index }]
        : [],
    );
    const out =
      notices.find(({ card }) => !staysUntilSeen(card.event)) ?? notices[0];
    next.splice(out.index, 1);
    news -= 1;
  }
  return next;
}
