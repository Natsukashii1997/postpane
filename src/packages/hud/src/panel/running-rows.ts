import type { Session, Snapshot } from "@agent-hud/protocol";
import type { Language } from "@agent-hud/ui/format";
import { waitedText } from "../permissions/approval-list.ts";
import { workspaceOf } from "../workspace.ts";
import type { LiveSession } from "./agent-board.ts";

/** The sessions at the foot of a mark's news card (#307): while the agent
 * has news its mark shows the card, not the panel with its 「正在进行」, so
 * the card lists them itself. Those whose request card is on it are not
 * repeated; one waiting with no card of its own (「等你回复」, 「待核对」)
 * is, ahead of those running (ADR-0001 B3, #354). */
export function runningForMark(
  snapshot: Pick<Snapshot, "providers" | "sessions" | "approvals">,
  mark: string,
): LiveSession[] {
  const place = workspaceOf({ ...snapshot, handoffs: [] }, mark);
  return [
    ...place.waiting.filter((entry) => !entry.approval),
    ...place.running,
  ];
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
