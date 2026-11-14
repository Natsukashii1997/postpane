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
