import type { Session, Snapshot } from "@agent-hud/protocol";
import type { Language } from "@agent-hud/ui/format";
import { waitedText } from "../permissions/approval-list.ts";
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

/** How long a running session's turn has gone, beside its title (#312,
 * owner chose 乙 on 2026-11-11): 「已 4 分钟」; none without a turn start. */
export function runningSince(
  session: Pick<Session, "liveFacts">,
  now: number,
  language: Language,
): string | null {
  const started = Date.parse(session.liveFacts?.turnStartedAt ?? "");
  if (!Number.isFinite(started)) return null;
  const span = waitedText((now - started) / 1000, language === "zh");
  return language === "zh" ? `已 ${span}` : span;
}
