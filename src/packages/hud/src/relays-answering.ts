import type { Snapshot } from "@agent-hud/protocol";

/** Relays (docs/chatgpt-channel.md) ChatGPT is answering right now. ChatGPT on
 * the web has no session to count, so the mark it shares with Codex counts
 * these as its work (vendors.rs `relays_answering`). */
export function relaysAnswering(snapshot: Pick<Snapshot, "handoffs">): number {
  return (snapshot.handoffs ?? []).filter(
    (handoff) => handoff.phase === "working",
  ).length;
}
