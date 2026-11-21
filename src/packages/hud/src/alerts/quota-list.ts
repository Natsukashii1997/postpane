import type { IslandEvent, PanelLayout, Quota } from "@agent-hud/protocol";
import { quotaRowShown } from "../quota-rows.ts";

/** A quota window's news: running low, used up, or reset. */
export const isQuotaWindowEvent = (event: IslandEvent) =>
  event.kind === "quota-exhaustion" || event.kind === "quota-reset";

/** Quota news of any kind: a window's, resets added to an account, or an
 * agent signed out or skipping PostPane's hooks. One card lists them all as
 * strips. A Hermes bot down or its task not run is a failure (#498). */
export const isQuotaEvent = (event: IslandEvent) =>
  isQuotaWindowEvent(event) ||
  event.kind === "reset-credits" ||
  event.kind === "sign-in-needed" ||
  event.kind === "hooks-review-needed";

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

/** The news the sidebar tells, as far as the hover panel's rows go: none
 * about a window the panel hides, and no hidden window named among those
 * still used up after a reset. */
export function shownNews(
  events: readonly IslandEvent[],
  quotas: readonly Quota[],
  layout: PanelLayout | undefined,
): IslandEvent[] {
  const hidden = (id: string | undefined) => {
    const row = id ? quotas.find((quota) => quota.id === id) : undefined;
    return Boolean(row && !quotaRowShown(row, layout));
  };
  return events.flatMap((event) => {
    if (hidden(event.quotaId)) return [];
    const others = event.otherExhaustedWindows;
    const shown = others?.filter((window) => !hidden(window?.id));
    return shown && shown.length !== others!.length
      ? [{ ...event, otherExhaustedWindows: shown }]
      : [event];
  });
}
