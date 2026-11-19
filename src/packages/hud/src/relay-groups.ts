// One list of the open relays for every place that shows them (#427, the
// owner chose 甲 on 2026-11-19): ChatGPT's peek, its card's 「等待处理 /
// 正在进行」 and the handoff card's 上一单 / 下一单 all read it, so they count
// and order the same relays the same way.
import type { Handoff, Session } from "@agent-hud/protocol";
import { doerOf, liveHandoffs } from "./alerts/handoff-doer.ts";
import { stopped } from "./alerts/relay-stop.ts";

/** A relay still this long, its doer's session not at work, is quiet. */
export const STALE_REVIEW = 2 * 60 * 60_000;

/** 要你管: the person's to act on; 在动: under way; 静着: open, nothing moving. */
export type RelayGroup = "need" | "move" | "quiet";

const RANK: Record<RelayGroup, number> = { need: 0, move: 1, quiet: 2 };

export interface GroupedRelay {
  handoff: Handoff;
  group: RelayGroup;
  /** When it last moved, in milliseconds. */
  at: number;
}

export const movedAt = (handoff: Handoff) =>
  handoff.phaseAt || handoff.updatedAt;

/** The ids of the sessions at work or waiting: a relay whose doer is one is
 * not quiet, however long it has been still. */
export function busySessions(sessions: readonly Session[]): Set<string> {
  return new Set(
    sessions
      .filter((s) => s.state === "running" || s.state === "waiting")
      .map((s) => s.id),
  );
}

/** Where one open relay stands: stopped at its cap, paused (the auto round
 * trip halted, as after 30 minutes with no answer), not sent, or an answer
 * the person is to pass on (no auto round trip) are the person's; one still
 * past two hours with its doer not at work is quiet; any other is under way. */
export function relayGroup(
  handoff: Handoff,
  busy: ReadonlySet<string>,
  now: number,
): RelayGroup {
  const phase = handoff.phase;
  if (
    stopped(handoff) ||
    (handoff.halt && !handoff.auto) ||
    phase === "failed" ||
    (phase === "replied" && !handoff.auto)
  )
    return "need";
  if (now - movedAt(handoff) > STALE_REVIEW && !busy.has(handoff.claudeSession))
    return "quiet";
  return "move";
}

/** The open relays in their groups, the person's first, the latest moved
 * first in each. */
export function groupRelays(
  handoffs: readonly Handoff[] | null | undefined,
  sessions: readonly Session[],
  now: number,
): GroupedRelay[] {
  const busy = busySessions(sessions);
  return liveHandoffs(handoffs ?? [])
    .map((handoff) => ({
      handoff,
      group: relayGroup(handoff, busy, now),
      at: movedAt(handoff),
    }))
    .sort((a, b) => RANK[a.group] - RANK[b.group] || b.at - a.at);
}

/** What the handoff card steps through: the list it was opened from, or,
 * opened with none (a session's 「接力」 tag), its doer's relays. */
export function relaySiblings(
  handoffs: readonly Handoff[] | null | undefined,
  sessions: readonly Session[],
  now: number,
  current: Handoff,
  among?: readonly string[] | null,
): GroupedRelay[] {
  const ids = among ? new Set([...among, current.id]) : null;
  return groupRelays(handoffs, sessions, now).filter((entry) =>
    ids ? ids.has(entry.handoff.id) : doerOf(entry.handoff) === doerOf(current),
  );
}

/** ChatGPT's card (#427): the person's relays wait on you; those under way
 * and the quiet are in progress; all of them, in order, are what a row's
 * handoff card steps through. */
export function splitRelays(grouped: readonly GroupedRelay[]): {
  waiting: GroupedRelay[];
  running: GroupedRelay[];
  among: string[];
} {
  return {
    waiting: grouped.filter((entry) => entry.group === "need"),
    running: grouped.filter((entry) => entry.group !== "need"),
    among: grouped.map((entry) => entry.handoff.id),
  };
}
