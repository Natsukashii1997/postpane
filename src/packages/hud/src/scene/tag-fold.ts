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

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };
const inside = (rect: Rect, point: Point) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

/** Whose tag the pointer is on: the agent whose mark on the strip it is
 * over, or whose tag or narrow slip it is over. Only that agent's tag opens
 * out whole; every other one stays folded (owner, 2026-11-08, #243). */
export function agentUnder(
  point: Point | null | undefined,
  {
    strip,
    edge,
    marks,
    tags,
  }: {
    strip: Rect;
    edge: Edge;
    /** Each mark's agent and its centre along the strip. */
    marks: readonly { vendor: string; center: number }[];
    /** Each tag's agent and the places it covers: whole, and its slip. */
    tags: readonly { vendor: string; rects: readonly (Rect | null)[] }[];
  },
): string | null {
  if (!point) return null;
  if (inside(strip, point)) {
    const along =
      edge === "top" || edge === "bottom"
        ? point.x - strip.x
        : point.y - strip.y;
    let best: string | null = null,
      distance = Infinity;
    for (const mark of marks) {
      const off = Math.abs(mark.center - along);
      if (off < distance) {
        best = mark.vendor;
        distance = off;
      }
    }
    return best;
  }
  for (const tag of tags)
    if (tag.rects.some((rect) => rect && inside(rect, point)))
      return tag.vendor;
  return null;
}
