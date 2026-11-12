import type { Handoff, PanelLayout, Snapshot } from "@agent-hud/protocol";
import { agentArtworkKey as vendorKey } from "./agent-artwork.ts";
import { quotaCredits, quotaRowShown, weeklyWindow } from "./quota-rows.ts";

/** The weekly figure pressed faintly behind a card that covers the panel
 * (#319, owner chose 甲 on 2026-11-12, the number alone). */
export interface CardWeekly {
  percent: number;
  critical: boolean;
}

/** Whose card is out: an opened handoff answers for its doer, else the news
 * in front. That agent's live weekly window the panel shows, the fullest of
 * its accounts; none for an agent without one, or with a stale reading. */
export function weeklyFor(
  snapshot: Snapshot,
  config: { panelLayout?: PanelLayout },
  handoff: Handoff | undefined,
  front: { source: string } | undefined,
): CardWeekly | undefined {
  const source = handoff ? (handoff.doer ?? "claude") : front?.source;
  if (!source) return undefined;
  const key = vendorKey(source);
  const row = snapshot.quotas
    .filter(
      (q) =>
        vendorKey(q.vendor) === key &&
        weeklyWindow(q) &&
        q.usedPercent != null &&
        q.status !== "stale" &&
        !quotaCredits(q) &&
        quotaRowShown(q, config.panelLayout),
    )
    .reduce<Snapshot["quotas"][number] | undefined>(
      (a, b) => (!a || b.usedPercent! > a.usedPercent! ? b : a),
      undefined,
    );
  return row
    ? {
        percent: Math.round(row.usedPercent!),
        critical: row.status === "critical",
      }
    : undefined;
}
