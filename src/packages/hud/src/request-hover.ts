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
}: {
  requestKey: string | null;
  markKeys: readonly string[];
  pointerKey: string | null | undefined;
  notch: boolean;
}): boolean {
  if (!requestKey || notch || pointerKey === undefined) return true;
  if (!markKeys.includes(requestKey)) return true;
  return pointerKey === requestKey;
}
