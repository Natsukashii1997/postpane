import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Session } from "./types";

/** 左滑发起: the sessions panel asks a Claude Code session, or a Codex
 * thread (#282), to relay its work. Moved out of App.tsx for the 300-line
 * ratchet. */
export async function relayLaunch(session: Session, kind: string) {
  if (!isTauri()) throw new Error("只能在驿窗里发起接力");
  return invoke<{ queued: boolean; already: boolean }>("relay_launch", {
    sessionId: session.id,
    kind,
    source: session.source,
  });
}
