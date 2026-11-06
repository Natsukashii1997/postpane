// While an agent waits on an answer, hovering the strip opens that agent's
// card only from its own mark: pointing at another agent leaves the strip
// resting. Where the waiting agent has no mark to point at (the notch, or a
// hidden agent), any hover still opens it, so the request is never out of
// reach. Kept free of the UI so the tests can run it.

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
  return pointerKey === requestKey;
}
