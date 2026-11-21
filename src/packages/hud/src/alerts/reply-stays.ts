import type { IslandEvent } from "@agent-hud/protocol";
import { agentArtworkKey } from "../agent-artwork.ts";
import { isFailure } from "./failure-list.ts";

/** Whether a notice waits on the sidebar until it has been looked at,
 * rather than folding away after a few seconds (owner, 2026-11-05): a
 * Hermes bot answers in Feishu within seconds, while the person is reading
 * Feishu, not the sidebar, so its reply would be gone before they turn.
 * ChatGPT answers in a browser tab the same way. */
export function staysUntilSeen(event: IslandEvent | undefined): boolean {
  return (
    event?.kind === "completion" &&
    (event.source === "hermes" || event.source === "chatgpt")
  );
}

/** Whether a notice folds away on the 4-second clock: not a reply that
 * waits to be seen, nor a failure, which stays until 「知道了」, its
 * session's next turn or its limit lifting (owner, 2026-11-21). */
export const foldsByItself = (event: IslandEvent | undefined) =>
  !staysUntilSeen(event) && !isFailure(event);

interface QueuedCard {
  type: "request" | "news";
  id: string;
  event?: IslandEvent;
}

/** The queue with a reply that waits to be seen, newly `arrived`, put in
 * front, ahead of a request waiting from another agent: the request's own
 * mark still shows it waits, while the reply would otherwise sit unseen
 * behind it (owner, 2026-11-05). Any other notice newly arrived goes ahead
 * of its own agent's failures, which do not fold away, so it is told as
 * before (#359). While the pointer rests on the sidebar or a reply is being
 * typed (`held`), the card in front stays (#221). */
export function seenFirst<Card extends QueuedCard>(
  queue: Card[],
  arrived: readonly IslandEvent[],
  held = false,
): Card[] {
  if (held) return queue;
  const ids = new Set(
    arrived.filter((event) => staysUntilSeen(event)).map((event) => event.id),
  );
  const at = queue.findIndex(
    (card) => card.type === "news" && ids.has(card.id),
  );
  if (at > 0) return [queue[at], ...queue.slice(0, at), ...queue.slice(at + 1)];
  return arrived.reduce(aheadOfFailures, queue);
}

/** The queue with the notice `event`, if queued behind a failure of its own
 * agent, moved to just ahead of the first one. */
function aheadOfFailures<Card extends QueuedCard>(
  queue: Card[],
  event: IslandEvent,
): Card[] {
  if (isFailure(event)) return queue;
  const vendor = agentArtworkKey(event.source);
  const at = queue.findIndex((card) => card.id === event.id);
  const failure = queue.findIndex(
    (card) =>
      isFailure(card.event) && agentArtworkKey(card.event!.source) === vendor,
  );
  if (at < 0 || failure < 0 || failure > at) return queue;
  const rest = queue.filter((_, index) => index !== at);
  return [...rest.slice(0, failure), queue[at], ...rest.slice(failure)];
}

/** Whether the card in front folds away after 4 seconds now: never a
 * request nor a failure, not while `held` (the pointer resting on the sidebar, a reply
 * being typed), and a reply that waits to be seen only once its card has
 * opened. An open card is recorded in `looked`; the pointer passing over
 * the tag on its way elsewhere is not a look (#221). */
export function frontFolds(
  card: QueuedCard | undefined,
  {
    held,
    opened,
    looked,
  }: { held: boolean; opened: boolean; looked: Set<string> },
): boolean {
  if (card && opened) looked.add(card.id);
  if (!card || held || card.type === "request" || isFailure(card.event))
    return false;
  return !staysUntilSeen(card.event) || looked.has(card.id);
}

/** The other agents' tags whose 4-second clock runs: a notice hung where it
 * can be seen (`drawn`: not in the notch, while dragged or under the card),
 * not one waiting to be looked at nor a failure, and none while `held`
 * (#221). */
export function sideClocks(
  sides: readonly { id: string; event?: IslandEvent }[],
  drawn: readonly string[],
  looked: ReadonlySet<string>,
  held: boolean,
): string[] {
  if (held) return [];
  return sides.flatMap((side) =>
    side.event &&
    !isFailure(side.event) &&
    drawn.includes(side.id) &&
    (!staysUntilSeen(side.event) || looked.has(side.id))
      ? [side.id]
      : [],
  );
}
