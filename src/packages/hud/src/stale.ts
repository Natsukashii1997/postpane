import type { Session } from "@agent-hud/protocol";

/** A session waiting on a request the transcript still holds open, but heard
 * nothing from for a while (ADR-0001 「待核对」): neither news to answer nor
 * an idle session. A request card from a hook is evidence enough, so a
 * session with one is never stale. */
export function isStale(
  session: Pick<Session, "state" | "liveFacts">,
): boolean {
  const requests = session.liveFacts?.requests ?? [];
  return (
    session.state === "waiting" &&
    requests.length > 0 &&
    requests.every((request) => request.stale === true)
  );
}

/** Running, or waiting on a request not 「待核对」: work in flight. */
export const isBusy = (session: Pick<Session, "state" | "liveFacts">) =>
  session.state === "running" ||
  (session.state === "waiting" && !isStale(session));
