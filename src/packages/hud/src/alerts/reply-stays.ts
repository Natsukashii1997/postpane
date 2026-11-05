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
 * behind it (owner, 2026-11-05). */
export function seenFirst<Card extends QueuedCard>(
  queue: Card[],
  arrived: readonly IslandEvent[],
): Card[] {
  const ids = new Set(
    arrived.filter((event) => staysUntilSeen(event)).map((event) => event.id),
  );
  const at = queue.findIndex(
    (card) => card.type === "news" && ids.has(card.id),
  );
  if (at <= 0) return queue;
  return [queue[at], ...queue.slice(0, at), ...queue.slice(at + 1)];
}
