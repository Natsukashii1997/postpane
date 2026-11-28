// 积压事项 (owner, 2026-11-27, #563): whatever waits on you, of any kind,
// once it has waited 48 hours, moves to its own folded section below
// 「正在进行」 (owner, 2026-11-28). It no longer counts as waiting on you nor lights the sidebar's
// tag; opened, each line can be carried on or stopped.
import { useMemo } from "react";
import type { Approval, RequestDecision } from "@agent-hud/protocol";
import type { PanelServices } from "../PanelContext";
import { waitedText } from "../permissions/approval-list.ts";
import type { LiveSession } from "./agent-board";

export const BACKLOG_MS = 48 * 3_600_000;

/** What 「停止」 sends into the session: the work is off. */
export const STOP_WORDS = "这件事不做了，停掉";

const time = (iso: string | null | undefined) => {
  const at = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(at) ? at : null;
};

/** Whether a request has waited 48 hours or more by `now`. */
export function overdue(request: Pick<Approval, "createdAt">, now: number) {
  const at = time(request.createdAt);
  return at !== null && now - at >= BACKLOG_MS;
}

/** The requests still waiting on you: those not yet in the backlog. */
export const currentRequests = <T extends Pick<Approval, "createdAt">>(
  requests: readonly T[],
  now: number,
): T[] => requests.filter((request) => !overdue(request, now));

/** The requests the tag tells, oldest first: those not in the backlog,
 * which stay off it (#563). */
export const waitingRequests = <T extends Pick<Approval, "createdAt">>(
  requests: readonly T[],
  now: number,
): T[] =>
  currentRequests(requests, now).sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

/** Since when a waiting row has waited: its oldest request, else its
 * session's last word; null with no time. */
const waitingSince = (entry: LiveSession) =>
  entry.approval
    ? time(entry.approval.createdAt)
    : time(entry.session.lastMessageAt ?? entry.session.updatedAt);

/** Whether a waiting row has waited 48 hours: since its oldest request, else
 * since its session last said something. */
export function inBacklog(entry: LiveSession, now: number): boolean {
  if (entry.status !== "waiting") return false;
  const at = waitingSince(entry);
  return at !== null && now - at >= BACKLOG_MS;
}

/** How long a backlog line has waited, beside its title as the waiting list
 * writes it (「52 小时 10 分」, owner 2026-11-28); null with no time. */
export function backlogWaited(entry: LiveSession, now: number, zh: boolean) {
  const at = waitingSince(entry);
  return at === null ? null : waitedText((now - at) / 1000, zh);
}

/** What 「停止」 does to a row's request: a question it can answer gets
 * the words; a permission is denied; anything else only leaves the
 * sidebar (null: the row is removed instead). */
export function stopDecision(request: Approval | null): RequestDecision | null {
  if (!request) return null;
  if (request.kind === "permission") return { kind: "deny" };
  const question = request.questions?.[0];
  if (request.answersQuestion === false || !question) return null;
  return {
    kind: "answer",
    answers: {
      [question.answerKey]: { selected: [], custom: STOP_WORDS },
    },
  };
}

/** The panel's services with the cards' own answer, for 「停止」. */
export function useDecide(
  services: PanelServices | null,
  decide: PanelServices["decide"],
): PanelServices | null {
  return useMemo(
    () => services && { ...services, decide: services.decide ?? decide },
    [services, decide],
  );
}
