// The paper a flight is made of: a plain white envelope that folds along its
// middle into a paper plane, both drawn in the same thin ink line as the
// relay button's white plane (#570). Shapes are clip paths and drawings in
// percent of the craft's box; the rest are small pure helpers the story
// samples into keyframes (the roll, the shadow, the letter slipping behind
// the envelope's front, the tumble of a refused one).

/** The paper's colours: the same on light and dark screens, as real paper. */
export const PAPER = {
  sheet: "#ffffff",
  /** The envelope's inside, seen while it is open. */
  inside: "#e8eaee",
  /** The flap's inner face. */
  flap: "#f1f2f5",
  /** The plane's lower wing, folded under. */
  under: "#e9e9ee",
  keel: "#cfd0d6",
  /** The letter's edge and its lines. */
  letter: "#8e8f98",
  writing: "#c2c3ca",
} as const;

/** The plane, nose to the right, in percent of the craft's box: a dart seen
 * from above. The upper wing runs from its tail to the nose and back to the
 * fold; the lower wing from the fold to the nose and to its own tail; the
 * keel peeks out under the fold. */
const TAIL_TOP = [0, 0] as const;
const NOSE = [100, 52.6] as const;
const TAIL_LOW = [0, 100] as const;
const FOLD = [21.4, 52.6] as const;
const KEEL = [10.7, 78.9] as const;
const polygon = (points: readonly (readonly [number, number])[]) =>
  `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
const svg = (points: readonly (readonly [number, number])[]) =>
  points.map(([x, y]) => `${x},${y}`).join(" ");

/** The envelope and the plane as clip paths with the same six points, so one
 * folds into the other: the top corners go to the upper wing's tail and the
 * nose, the right side closes onto the nose, the bottom left corner is the
 * lower wing's tail and the middle of the left side the fold. */
export const ENVELOPE =
  "polygon(0% 0%, 100% 0%, 100% 50%, 100% 100%, 0% 100%, 0% 50%)";
export const PLANE = polygon([
  TAIL_TOP,
  [100, 50.5],
  NOSE,
  [100, 54.7],
  TAIL_LOW,
  FOLD,
]);
/** The envelope's lower half, which folds under into the lower wing. */
export const ENVELOPE_LOW = "polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%)";
export const PLANE_LOW = polygon([FOLD, NOSE, [100, 54.7], TAIL_LOW]);
/** The plane as a drawing in a 100 by 100 box, faces back to front. */
export const PLANE_FACES = {
  keel: svg([FOLD, NOSE, KEEL]),
  lower: svg([FOLD, NOSE, TAIL_LOW]),
  upper: svg([TAIL_TOP, NOSE, FOLD]),
  outline: svg([TAIL_TOP, NOSE, TAIL_LOW, FOLD]),
  crease: `M${FOLD[0]} ${FOLD[1]}L${NOSE[0]} ${NOSE[1]}`,
} as const;

/** The lower half's keyframes, from the paper's: it follows the fold into the
 * lower wing and greys as it goes under. */
export function lowFace(shape: readonly Keyframe[]): Keyframe[] {
  return shape.map((frame) => {
    const plane = frame.clipPath === PLANE;
    return {
      ...frame,
      clipPath: plane ? PLANE_LOW : ENVELOPE_LOW,
      opacity: plane ? 1 : 0,
    };
  });
}

const round = (value: number, places = 1) =>
  Math.round(value * 10 ** places) / 10 ** places + 0;

/** How the plane is turned about its length, `fraction` of the way along: as a
 * vertical scale of its drawing. One that would land upside down (round a
 * loop) rolls over on the way, edge on halfway; one that lands the right way
 * up only banks, thinnest halfway. */
export function rollAt(fraction: number, flips: boolean): number {
  if (!flips) return round(1 - 0.5 * Math.sin(Math.PI * fraction), 3);
  const c = Math.cos(Math.PI * fraction);
  return round((c < 0 ? -1 : 1) * Math.max(0.24, Math.abs(c)), 3);
}

/** The shadow on the ground at a height `altitude` (0 on the ground, 1 at the
 * top of the flight), for a craft `scale` times the 22-point envelope it was
 * drawn for: it lies a little below, drifts off and fades as the plane climbs. */
export function shadowAt(altitude: number, scale: number) {
  return {
    dx: round((3 + 10 * altitude) * scale),
    dy: round((10 + 14 * altitude) * scale),
    width: round(1 - 0.25 * altitude, 2),
    opacity: round(0.16 - 0.08 * altitude, 3),
  };
}

/** The letter clipped where it has gone behind the envelope's front edge
 * (`edge`): how much of its height `height`, from `top` down, is hidden. */
export function letterClip(top: number, height: number, edge: number): string {
  const shown = Math.min(1, Math.max(0, (edge - top) / height));
  return `inset(0px 0px ${round((1 - shown) * 100, 0)}% 0px)`;
}

/** Where a refused plane has tumbled `share` of the way down its fall, in
 * points for the 22-point envelope: drifting back and swaying, dropping ever
 * faster, spinning over. */
export function tumble(share: number) {
  return {
    dx: round(-14 * share + 7 * Math.sin(11 * share)),
    dy: round(100 * share * share),
    spin: round(520 * share),
  };
}

/** The envelope's packing, in milliseconds from its entrance: it pops up open,
 * the letter flies out of the sender and over it, drops in, and the flap
 * closes and is pressed shut. */
export const PACK = {
  popped: 160,
  settled: 260,
  out: 150,
  over: 420,
  in: 560,
  shut: 760,
} as const;

/** The letter's size, as shares of the craft's box. */
export const LETTER = { width: 0.6, height: 0.62 } as const;
