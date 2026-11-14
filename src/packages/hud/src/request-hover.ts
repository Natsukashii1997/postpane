// While an agent waits on an answer, hovering the strip opens that agent's
// card only from its own mark; another agent's mark opens that agent's own
// peek (HUDScene shows the agent under the pointer, #243), and the gaps
// between marks leave the strip resting. Where the waiting agent has no mark to point at (the notch, or a
// hidden agent), any hover still opens it, so the request is never out of
// reach. Kept free of the UI so the tests can run it.
import { agentArtworkKey } from "./agent-artwork.ts";

/**
 * Whether a hover may open the HUD now. `pointerKey` is the mark under the
 * pointer: null between marks, undefined where the pointer is not known.
 */
export function hoverMayOpen({
  requestKey,
  markKeys,
  pointerKey,
  notch,
  onPendant = false,
}: {
  requestKey: string | null;
  markKeys: readonly string[];
  pointerKey: string | null | undefined;
  notch: boolean;
  /** The pointer is on the notes pendant: not a mark, so it never opens the
   * panel (owner, 2026-11-06). */
  onPendant?: boolean;
}): boolean {
  if (onPendant) return false;
  if (!requestKey || notch || pointerKey === undefined) return true;
  if (!markKeys.includes(requestKey)) return true;
  // Another agent's mark opens that agent's own peek, never the waiting
  // card (owner, 2026-11-08, #243): every mark answers for its own agent.
  return pointerKey !== null;
}

/** Whether a click on a mark pins the sidebar open on it (#359): not in the
 * notch, nor on the mark whose own news is in front (its card is out); any
 * other agent's mark opens that agent's own, as a hover does (#243). */
export function clickMayPin(
  key: string | undefined,
  frontSource: string | undefined,
  mode: string,
): boolean {
  if (mode === "notch") return false;
  return (
    !frontSource || (key !== undefined && key !== agentArtworkKey(frontSource))
  );
}
