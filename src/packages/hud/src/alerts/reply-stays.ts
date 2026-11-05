import type { IslandEvent } from "@agent-hud/protocol";

/** Whether a notice waits on the sidebar until it has been looked at,
 * rather than folding away after a few seconds (owner, 2026-11-05): a
 * Hermes bot answers in Feishu within seconds, while the person is reading
 * Feishu, not the sidebar, so its reply would be gone before they turn. */
export function staysUntilSeen(event: IslandEvent | undefined): boolean {
  return event?.kind === "completion" && event.source === "hermes";
}
