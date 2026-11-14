// Which sessions the board lists and where (ADR-0001 C1, owner chose 甲 on
// 2026-11-14): each place's under its own block, not in one list at the
// foot. Kept free of the UI so the tests can run it.
import type { PanelLayout, Session, Snapshot } from "@agent-hud/protocol";
import { agentArtworkKey as vendorKey } from "../agent-artwork.ts";
import { sourceID, sourcesForMark } from "../resting-agents.ts";
import type { LiveSession } from "./agent-board.ts";

/** Past this many running sessions, a place's fold into one line. */
export const RUNNING_FOLD = 3;

/** The sessions a panel lists: one agent's, or those the layout picks, by
 * agent and by project. `sources` is the agents picked, none for every. */
export function sessionScope(
  snapshot: Pick<Snapshot, "providers">,
  layout: PanelLayout["sessions"] = {},
  focusVendor?: string,
) {
  const sources = focusVendor
    ? sourcesForMark(snapshot, focusVendor)
    : layout.agents?.length
      ? layout.agents.map((source) => sourceID(snapshot as Snapshot, source))
      : undefined;
  const has = (session: Session) =>
    (!sources ||
      sources.includes(sourceID(snapshot as Snapshot, session.source))) &&
    (!layout.projects?.length ||
      layout.projects.includes(session.project ?? session.cwd ?? "unassigned"));
  return { sources, has };
}

/** A place's rows: those waiting on you, 「待核对」 last, then those
 * running; past `RUNNING_FOLD` running ones they fold into one line
 * (`folded`, how many) unless it was opened. Waiting ones never fold. */
export function placeRows(rows: readonly LiveSession[], unfolded: boolean) {
  const waiting = rows.filter((entry) => entry.status === "waiting");
  const running = rows.filter((entry) => entry.status === "running");
  const folds = running.length > RUNNING_FOLD;
  return {
    waiting: [
      ...waiting.filter((entry) => !entry.stale),
      ...waiting.filter((entry) => entry.stale),
    ],
    running: folds && !unfolded ? [] : running,
    folded: folds ? running.length : 0,
  };
}

/** The sessions under one block of the board. */
export interface BoardPlace {
  /** The block's key; `sessions:<source>` for a place with no block of its
   * own (ChatGPT's web channel has no quota, #135), listed after them. */
  key: string;
  /** The agent its block names. */
  source: string;
  rows: LiveSession[];
}

/** The board's sessions by the block they go under: each block's, by its
 * agent's mark, in the blocks' order; then a place for each agent listed
 * with no block. */
export function boardPlaces(
  snapshot: Pick<Snapshot, "providers">,
  blocks: readonly string[],
  live: readonly LiveSession[],
): BoardPlace[] {
  const places: BoardPlace[] = [];
  const byMark = new Map<string, BoardPlace>();
  const add = (key: string, source: string) => {
    const place: BoardPlace = { key, source, rows: [] };
    byMark.set(vendorKey(source), place);
    places.push(place);
    return place;
  };
  for (const key of blocks) {
    const source = key.replace(/^api:/, "");
    if (!byMark.has(vendorKey(source))) add(key, source);
  }
  for (const entry of live) {
    const source = sourceID(snapshot as Snapshot, entry.session.source);
    (
      byMark.get(vendorKey(source)) ?? add(`sessions:${source}`, source)
    ).rows.push(entry);
  }
  return places;
}

/** The board's 「等你」 line: each place with sessions waiting on you, not
 * those 「待核对」, and how many. Hermes waits on no one (ADR-0001). */
export function boardWaiting(places: readonly BoardPlace[]) {
  return places
    .filter((place) => vendorKey(place.source) !== "hermes")
    .map((place) => ({
      key: place.key,
      source: place.source,
      count: place.rows.filter(
        (entry) => entry.status === "waiting" && !entry.stale,
      ).length,
    }))
    .filter((place) => place.count > 0);
}
