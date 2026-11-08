import type { IslandEvent } from "@agent-hud/protocol";
import { staysUntilSeen } from "../alerts/reply-stays.ts";

type Edge = "top" | "bottom" | "left" | "right";

/** How long a tag that waits hangs whole before it folds into its narrow
 * slip: its seal and its count (owner, 2026-11-08, #243). */
export const TAG_NARROW_MS = 5000;

/** Whether a tag waits on the sidebar rather than folding away on its
 * 4-second clock: a request until it is answered, a Hermes or ChatGPT reply
 * until its card has been opened. Only these fold into a narrow slip. */
export function tagWaits(
  tag: { id: string; request?: unknown; event?: IslandEvent },
  looked: ReadonlySet<string>,
): boolean {
  if (tag.request) return true;
  return staysUntilSeen(tag.event) && !looked.has(tag.id);
}

/** What a tag's age is counted from: its agent, what it shows in front and
 * how many. A new request or reply makes a new key, so the tag hangs whole
 * again; the same tag moving to the front keeps its age. */
export const tagFoldKey = (vendor: string, id: string, count: number) =>
  `${vendor}\u0000${id}\u0000${count}`;

/** The keys hung for TAG_NARROW_MS or longer by `now`. */
export function agedTags(
  since: ReadonlyMap<string, number>,
  now: number,
): Set<string> {
  const aged = new Set<string>();
  for (const [key, at] of since) if (now - at >= TAG_NARROW_MS) aged.add(key);
  return aged;
}

/** The narrow slip: standing beside the stub on a side edge, lying under it
 * on the top or bottom edge. */
export function narrowTagSize(
  scale: number,
  edge: Edge,
): { width: number; height: number } {
  const across = Math.round(24 * scale),
    along = Math.round(46 * scale);
  return edge === "top" || edge === "bottom"
    ? { width: along, height: across }
    : { width: across, height: along };
}

/** The gap between a tag and the stubs: a whole tag keeps 6pt, the narrow
 * slip stands against the stub. */
export const tagGap = (narrow: boolean) => (narrow ? 0 : 6);
