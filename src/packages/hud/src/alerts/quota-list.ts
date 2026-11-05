import type { IslandEvent } from "@agent-hud/protocol";

/** A quota window's news: running low, used up, or reset. */
export const isQuotaEvent = (event: IslandEvent) =>
  event.kind === "quota-exhaustion" || event.kind === "quota-reset";

/** The quota news waiting in the queue, newest first: one card lists them
 * all. A notice without a readable time goes last. */
export function queuedQuotas(
  queue: readonly (
    { type: "request" } | { type: "news"; event: IslandEvent }
  )[],
): IslandEvent[] {
  const time = (event: IslandEvent) => {
    const at = Date.parse(event.at);
    return Number.isFinite(at) ? at : Number.NEGATIVE_INFINITY;
  };
  return queue
    .flatMap((card) =>
      card.type === "news" && isQuotaEvent(card.event) ? [card.event] : [],
    )
    .sort((a, b) => time(b) - time(a));
}
