import type { IslandEvent } from "@agent-hud/protocol";

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

interface QueuedCard {
  type: "request" | "news";
  id: string;
  event?: IslandEvent;
}

/** The queue with a reply that waits to be seen, newly `arrived`, put in
 * front, ahead of a request waiting from another agent: the request's own
 * mark still shows it waits, while the reply would otherwise sit unseen
 * behind it (owner, 2026-11-05). While the pointer rests on the sidebar or
 * a reply is being typed (`held`), the card in front stays (#221). */
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
  if (at <= 0) return queue;
  return [queue[at], ...queue.slice(0, at), ...queue.slice(at + 1)];
}

/** Whether the card in front folds away after 4 seconds now: never a
 * request, not while `held` (the pointer resting on the sidebar, a reply
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
  if (!card || held || card.type === "request") return false;
  return !staysUntilSeen(card.event) || looked.has(card.id);
}

/** The other agents' tags whose 4-second clock runs: a notice hung where it
 * can be seen (`drawn`: not in the notch, while dragged or under the card),
 * not one waiting to be looked at, and none while `held` (#221). */
export function sideClocks(
  sides: readonly { id: string; event?: IslandEvent }[],
  drawn: readonly string[],
  looked: ReadonlySet<string>,
  held: boolean,
): string[] {
  if (held) return [];
  return sides.flatMap((side) =>
    side.event &&
    drawn.includes(side.id) &&
    (!staysUntilSeen(side.event) || looked.has(side.id))
      ? [side.id]
      : [],
  );
}
