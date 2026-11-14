import type { Session, SessionLiveFacts } from "@agent-hud/protocol";
import { isStale } from "../stale.ts";

// What the mark director sees of one session (MarkDirector, #354).

export interface Request {
  id: string;
  sessionId: string;
  kind: "permission" | "question" | "plan";
  at: number;
}
export interface Facts {
  id: string;
  phase: Session["state"];
  live: SessionLiveFacts | null;
  observedAt: number;
  lastEventAt: number;
  requests: Request[];
}

export const time = (date: string | null | undefined): number | null => {
  if (!date) return null;
  const value = Date.parse(date) / 1000;
  return Number.isFinite(value) ? value : null;
};

/** A session's phase and the requests it waits on: its log's and the cards'
 * (`cards`, the mark's request cards). One 「待核对」 (ADR-0001) is no call
 * for the bot to come looking: idle, asking nothing, unless a card stands. */
export function factsOf(session: Session, cards: readonly Request[]): Facts {
  const live = session.liveFacts ?? null;
  const own = cards.filter((item) => item.sessionId === session.id);
  const stale = !own.length && isStale(session);
  const requests = stale
    ? []
    : (live?.requests ?? []).map((item) => ({
        ...item,
        at: time(item.at) ?? 0,
      }));
  for (const request of own)
    if (!requests.some((item) => item.id === request.id))
      requests.push(request);
  return {
    id: session.id,
    phase: stale ? "idle" : session.state,
    live,
    observedAt: time(live?.observedAt ?? session.updatedAt) ?? 0,
    lastEventAt: time(live?.lastEventAt ?? session.updatedAt) ?? 0,
    requests,
  };
}
