// The app's one motion language (owner, 2026-11-25): every change of state
// that moves takes one of these durations and curves, in the side bar and in
// the windows alike. global.css carries the same values as --motion-* and
// --ease-* for CSS; test/motion.test.ts keeps the two in step.
//
//   quick  hover, colour, focus, a selection moving; pressing takes `press`
//   enter  something appears or opens (a row, a section, a popover)
//   exit   it goes away: about two thirds of `enter`, so leaving never lags
//   data   a number, a bar or a chart moving to a new value
//
// A shape that moves in space (the side bar's card, the notch) follows
// GEOMETRY, a spring with no bounce: it keeps its speed when turned back
// halfway, so opening and closing again mid-way joins up instead of jolting.

/** Seconds, as motion/react takes them. */
export const MOTION = {
  press: 0.06,
  quick: 0.12,
  exit: 0.14,
  enter: 0.2,
  data: 0.24,
} as const;

/** Milliseconds, for timers, the Web Animations API and canvases. */
export const MOTION_MS = {
  press: 60,
  quick: 120,
  exit: 140,
  enter: 200,
  data: 240,
} as const;

export type Curve = readonly [number, number, number, number];

/** Arrivals, openings, values settling: fast out, long soft landing. */
export const EASE_OUT: Curve = [0.22, 1, 0.36, 1];
/** Only for a loop that goes there and back in place (a breath, a sway). */
export const EASE_SWING: Curve = [0.65, 0, 0.35, 1];

/** A shape moving in space: no bounce, about a third of a second to look
 * settled, and it carries its speed through an interruption. */
export const GEOMETRY = {
  type: "spring",
  visualDuration: 0.32,
  bounce: 0,
} as const;

/** The notch's shape: smaller and opened far more often than the sidebar's
 * card, so the same spring a little quicker (GPT review, 2026-11-25). */
export const NOTCH_GEOMETRY = { ...GEOMETRY, visualDuration: 0.26 } as const;

/** The spring for a shape grown out of the notch or beside the sidebar. */
export const springFor = (notch: boolean) =>
  notch ? NOTCH_GEOMETRY : GEOMETRY;

/** The CSS form of a curve. */
export function cssCurve([x1, y1, x2, y2]: Curve): string {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

/** The share a curve has reached at time share `t` (0–1), for animations
 * drawn by hand (rings, canvases, counting numbers). */
export function eased(curve: Curve, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const [x1, y1, x2, y2] = curve;
  const bez = (p1: number, p2: number, s: number) =>
    3 * (1 - s) * (1 - s) * s * p1 + 3 * (1 - s) * s * s * p2 + s * s * s;
  let lo = 0,
    hi = 1,
    s = t;
  for (let i = 0; i < 24; i++) {
    s = (lo + hi) / 2;
    if (bez(x1, x2, s) < t) lo = s;
    else hi = s;
  }
  return bez(y1, y2, s);
}

/** Whether the system asks for less motion right now. Read it when an
 * animation starts, not once at load, so a change in System Settings counts
 * from the next one on. */
export function systemReducesMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
