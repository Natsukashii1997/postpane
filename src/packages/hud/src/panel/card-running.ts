import type { Snapshot } from "@agent-hud/protocol";
import { sourceID, sourcesForMark } from "../resting-agents.ts";
import { liveSessions, type LiveSession } from "./agent-board.ts";

/** The sessions of a mark's agent at work now, for the foot of its news card
 * (#307): while the agent has news, its mark shows the card, not the panel
 * with its 「正在进行」. Only those running; those waiting are on the card. */
export function runningForMark(
  snapshot: Pick<Snapshot, "providers" | "sessions" | "approvals">,
  mark: string,
): LiveSession[] {
  const shape = snapshot as Snapshot;
  const sources = sourcesForMark(snapshot, mark);
  return liveSessions(
    snapshot.sessions.filter((session) =>
      sources.includes(sourceID(shape, session.source)),
    ),
    snapshot.approvals,
  ).filter((entry) => entry.status === "running");
}
