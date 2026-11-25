// The motion language (@agent-hud/ui/lib/motion) in the forms the windows
// write it in: a transition for an inline style, a fill that grows by
// scaling, and a one-off arrival played on an element.
import type { CSSProperties } from "react";
import {
  EASE_OUT,
  MOTION_MS,
  cssCurve,
  eased,
  systemReducesMotion,
} from "@agent-hud/ui/lib/motion";

export type Pace = keyof typeof MOTION_MS;

/** An inline `transition`: these properties at one of the language's paces,
 * on its one curve. The windows' Reduce Motion rule stills them. */
export function moves(pace: Pace, ...properties: string[]): string {
  return properties
    .map((property) => `${property} var(--motion-${pace}) var(--ease-out)`)
    .join(", ");
}

/** A bar's fill at `share` (0–1) of its track, grown by scaling from the
 * left rather than by width, so a new value moves no layout. Only for a
 * square-ended fill in a track that clips it: scaling would squash a
 * rounded end. */
export function scaledFill(share: number): CSSProperties {
  const clamped = Number.isFinite(share) ? Math.max(0, Math.min(1, share)) : 0;
  return {
    width: "100%",
    transform: `scaleX(${clamped})`,
    transformOrigin: "left",
    transition: moves("data", "transform"),
  };
}

/** How far a `data` move begun at `start` has got at `now` (both from
 * performance.now()): its share of the time, and its share of the way on
 * the language's curve, for values drawn by hand (canvases, counting). */
export function dataProgress(start: number, now: number) {
  const t = Math.min(1, Math.max(0, (now - start) / MOTION_MS.data));
  return { t, share: eased(EASE_OUT, t) };
}

/** Plays an element's arrival from `from` (a small offset) and clear, to
 * where it already is. Reduce Motion leaves it there at once. */
export function arrive(
  element: Element | null,
  from: string,
  pace: Pace = "enter",
) {
  if (!element || systemReducesMotion()) return;
  if (typeof element.animate !== "function") return;
  element.animate(
    [
      { opacity: 0, transform: from },
      { opacity: 1, transform: "none" },
    ],
    { duration: MOTION_MS[pace], easing: cssCurve(EASE_OUT) },
  );
}

/** How long a pointer rests on something before its tooltip shows, in the
 * Settings window. Long enough that running the pointer down a page of rows
 * pops nothing, short enough to feel like an answer once it stops. The
 * Statistics window's charts answer at once instead. */
export const TOOLTIP_DELAY = 400;
