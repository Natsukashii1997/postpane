import type { Approval, Handoff, Session, Snapshot } from "@agent-hud/protocol";
import { doerOf, liveHandoffs } from "./alerts/handoff-doer.ts";
import { liveSessions, type LiveSession } from "./panel/agent-board.ts";
import { sourceID, sourcesForMark } from "./resting-agents.ts";

export { isStale } from "./stale.ts";

// One workplace's work, the same shape for Claude, Codex, ChatGPT and
// DeepSeek (ADR-0001 「工作场所契约」, #354): the sidebar's card foot, its
// way into relays and the panel read a place's work from here, not each from
// its own branch by the agent's name.

/** The relays a place takes part in: the doer's (Claude Code or Codex), and
 * every one ChatGPT reviews; none for a place with no part in relays. */
export function relaysOf(
  handoffs: readonly Handoff[] | undefined,
  place: string,
): Handoff[] {
  const live = liveHandoffs(handoffs ?? []);
  if (place === "chatgpt") return live;
  return live.filter((handoff) => doerOf(handoff) === place);
}

/** The relays a request card leads into (ADR-0001 C2): those its places take
 * part in, never another agent's. */
export function cardRelays(
  handoffs: readonly Handoff[] | undefined,
  requests: readonly Pick<Approval, "source">[],
): Handoff[] {
  const places = new Set(requests.map((request) => request.source));
  const seen = new Set<string>();
  return [...places]
    .flatMap((place) => relaysOf(handoffs, place))
    .filter(
      (handoff) => !seen.has(handoff.id) && Boolean(seen.add(handoff.id)),
    );
}

export interface Workspace {
  /** Waiting on you, those stale (「待核对」) last; each with its card, if any. */
  waiting: LiveSession[];
  running: LiveSession[];
  /** Whose last turn failed or hit a limit: not idle work (ADR-0001 「出错」). */
  failed: Session[];
  relays: Handoff[];
}

/** The work of the place behind a mark, by the mark's key. */
export function workspaceOf(
  snapshot: Pick<Snapshot, "providers" | "sessions" | "approvals" | "handoffs">,
  mark: string,
): Workspace {
  const sources = sourcesForMark(snapshot, mark);
  const own = snapshot.sessions.filter((session) =>
    sources.includes(sourceID(snapshot as Snapshot, session.source)),
  );
  const live = liveSessions(own, snapshot.approvals);
  const waiting = live.filter((entry) => entry.status === "waiting");
  return {
    waiting: [
      ...waiting.filter((entry) => !entry.stale),
      ...waiting.filter((entry) => entry.stale),
    ],
    running: live.filter((entry) => entry.status === "running"),
    failed: own.filter(
      (session) =>
        session.state === "idle" &&
        (session.liveFacts?.outcome === "failed" ||
          session.liveFacts?.outcome === "limited"),
    ),
    relays: [...new Set(sources)].flatMap((source) =>
      relaysOf(snapshot.handoffs, source),
    ),
  };
}
