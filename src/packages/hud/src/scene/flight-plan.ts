// A host's flight between two agents' marks, planned without a DOM: which one
// is in the air and how many ride along, the route it takes, and every
// keyframe of its story (an envelope packed beside the sender, folded into a
// paper plane, flown, unfolded beside the receiver and delivered), handed to
// Web Animations whole. Nothing here runs per frame.
import {
  ENVELOPE,
  LETTER,
  letterClip,
  PACK,
  PAPER,
  PLANE,
  rollAt,
  shadowAt,
  tumble,
} from "./flight-paper.ts";
import {
  easeInOut,
  easeInOutInverse,
  measure,
  type Cubic,
  type Point,
} from "./flight-route.ts";

export {
  dockRoute,
  easeInOut,
  easeInOutInverse,
  heading,
  inward,
  measure,
  notchRoute,
} from "./flight-route.ts";
export type { Cubic, Measured, Point } from "./flight-route.ts";

/** One flight the host asked for (the host's `Flight`). */
export interface HUDFlight {
  /** Flights between the same two ends share a lane. */
  lane: string;
  from: string;
  to: string;
  /** Around the notch, the sender stands on the left; otherwise on the right. */
  fromLeft: boolean;
  /** The receiver appears first, then catches it. */
  arrives: boolean;
  /** It falls halfway and the sender is left puzzled. */
  falls: boolean;
}
/** What the host sends each HUD: a flight, its arrival order and when it
 * came (`performance.now()`): a scene that mounts later does not replay it. */
export interface HUDFlightCommand {
  flight: HUDFlight;
  sequence: number;
  at: number;
}
/** How old a flight may be when its scene first sees it. */
export const FLIGHT_FRESHNESS_MS = 2000;
/** The flight in the air and how many it carries (one, or more that came meanwhile). */
export interface Ride {
  flight: HUDFlight;
  count: number;
  id: number;
}

const sameRide = (a: HUDFlight, b: HUDFlight) =>
  a.lane === b.lane &&
  a.from === b.from &&
  a.to === b.to &&
  a.falls === b.falls &&
  a.arrives === b.arrives;

/** One flight in the air at a time. A flight like the one in the air (same
 * lane, same way, same ending) rides along as its count; another waits its
 * turn, and more like it ride along with the one waiting. */
export class FlightQueue {
  private next = 1;
  current: Ride | null = null;
  readonly waiting: Ride[] = [];
  /** Takes a flight; true when what is drawn changed (a start or a count). */
  add(flight: HUDFlight): boolean {
    if (this.current && sameRide(this.current.flight, flight)) {
      this.current = { ...this.current, count: this.current.count + 1 };
      return true;
    }
    const waiting = this.waiting.find((ride) => sameRide(ride.flight, flight));
    if (waiting) {
      waiting.count += 1;
      return false;
    }
    const ride = { flight, count: 1, id: this.next++ };
    if (this.current) {
      this.waiting.push(ride);
      return false;
    }
    this.current = ride;
    return true;
  }
  /** The flight in the air landed: the next waiting one takes off. */
  finish(id: number): boolean {
    if (this.current?.id !== id) return false;
    this.current = this.waiting.shift() ?? null;
    return true;
  }
}

/** The story's steps, in milliseconds. */
export const STORY = {
  /** Around the notch, the robots come out first. */
  enter: 320,
  /** An open envelope pops up beside the sender; a letter flies over from
   * the sender and drops in; the flap closes and is pressed shut. */
  pack: 820,
  /** The envelope folds along its middle into a paper plane. */
  fold: 360,
  /** In the air, rolling or banking, its shadow below and puffs behind. */
  fly: 1000,
  /** Beside the receiver it unfolds into the envelope. */
  unfold: 320,
  /** The flap opens, the letter rises out and into the receiver; the envelope fades. */
  deliver: 400,
  /** Into `deliver`, when the letter reaches the receiver. */
  handIn: 380,
  /** A refused one stalls halfway, tumbles down and bursts open. */
  fall: 1050,
  /** Around the notch, the robots go back in. */
  leave: 300,
  /** Reduced motion: an envelope fades in by each side in turn. */
  still: 1800,
} as const;

/** On a dock the robots themselves throw and catch the letter (#171), one
 * move each whatever the edge: `n` points into the screen, `u` along the
 * dock from the sender towards the receiver. The throw lets go `release` of
 * the way in; the catch takes the hit `impact` of the way in. */
export const THROW = { duration: 560, release: 0.52 } as const;
export const CATCH = { duration: 700, impact: 0.48 } as const;
const shift = (x: number, y: number) =>
  `${Math.round(x * 100) / 100}px ${Math.round(y * 100) / 100}px`;
/** Which way the robot leans to face the letter's way out. */
const lean = (n: Point, u: Point) => (u.x * n.y - u.y * n.x >= 0 ? 1 : -1);
/** Squashed across the way the letter travels. */
const squash = (u: Point, wide: number, tall: number) =>
  Math.abs(u.y) >= Math.abs(u.x) ? `${wide} ${tall}` : `${tall} ${wide}`;
/** Wind up away from the screen and back along the dock, then fling. */
export function throwFrames(n: Point, u: Point): Keyframe[] {
  const s = lean(n, u);
  return [
    { translate: "0px 0px", rotate: "0deg", scale: "1 1" },
    {
      translate: shift(-n.x * 1 - u.x * 2, -n.y * 1 - u.y * 2),
      rotate: `${10 * s}deg`,
      scale: squash(u, 0.95, 1.05),
      offset: 0.38,
    },
    {
      translate: shift(n.x * 2 + u.x * 1.5, n.y * 2 + u.y * 1.5),
      rotate: `${-13 * s}deg`,
      scale: squash(u, 1.07, 0.93),
      offset: THROW.release,
    },
    { translate: "0px 0px", rotate: `${4 * s}deg`, scale: "1 1", offset: 0.76 },
    { translate: "0px 0px", rotate: "0deg", scale: "1 1" },
  ];
}
/** Look towards the letter, take it with a squash, bounce back. */
export function catchFrames(n: Point, u: Point): Keyframe[] {
  const s = lean(n, u);
  return [
    { translate: "0px 0px", rotate: "0deg", scale: "1 1" },
    {
      translate: shift(n.x * 1.5 - u.x * 1.5, n.y * 1.5 - u.y * 1.5),
      rotate: `${-7 * s}deg`,
      scale: "1 1",
      offset: 0.36,
    },
    {
      translate: shift(u.x * 2, u.y * 2),
      rotate: "0deg",
      scale: squash(u, 1.15, 0.84),
      offset: CATCH.impact,
    },
    {
      translate: shift(-u.x * 3, -u.y * 3),
      rotate: "0deg",
      scale: squash(u, 0.94, 1.08),
      offset: 0.66,
    },
    {
      translate: "0px 0px",
      rotate: "0deg",
      scale: squash(u, 1.02, 0.98),
      offset: 0.84,
    },
    { translate: "0px 0px", rotate: "0deg", scale: "1 1" },
  ];
}

const round = (value: number) => Math.round(value * 10) / 10;
const fix = (value: number) => Math.round(value * 10000) / 10000;
const px = (point: Point) => `${round(point.x)}px ${round(point.y)}px`;
/** An angle turned by whole turns to be nearest `near`, so a rotation never
 * takes the long way round. */
const unwrap = (angle: number, near: number) =>
  angle + 360 * Math.round((near - angle) / 360);

/** Every keyframe list of one flight's story, all on one clock (`length` ms). */
export interface Story {
  length: number;
  /** When the plane takes off, lands or falls, and the letter reaches the receiver. */
  takeoff: number;
  landing: number;
  delivered: number;
  /** The craft: where it is, which way it points, its outline, size and opacity. */
  move: Keyframe[];
  turn: Keyframe[];
  /** Drawn mirrored (setting off leftwards) or not, for the whole flight. */
  mirror: Keyframe[];
  /** Turned about its length: banking, or rolling over round a loop. */
  roll: Keyframe[];
  shape: Keyframe[];
  pop: Keyframe[];
  /** The envelope's flap: open above showing its inner face, or closed over it. */
  flap: Keyframe[];
  /** The plane's drawing, shown while it flies; the folding paper under it
   * shows the rest of the time (one is the other's opposite). */
  folds: Keyframe[];
  /** The envelope's seams and inside, gone while it folds into a plane and back. */
  pocket: Keyframe[];
  /** The letter: into the envelope beside the sender, out into the receiver. */
  letter: Keyframe[];
  /** The craft's shadow on the ground. */
  shadow: Keyframe[];
  /** The trail: faint puffs along the route, each shown as the plane passes. */
  puffs: { translate: string; frames: Keyframe[] }[];
  routeLength: number;
}

/** A flight's whole story. `start` and `end` are beside the sender's and the
 * receiver's marks (where the envelope sits), `from` and `to` the marks
 * themselves (where the letter comes from and goes to). */
export function story({
  route,
  from,
  to,
  falls,
  delay = 0,
  samples = 28,
  craft = 22,
}: {
  route: readonly Cubic[];
  from: Point;
  to: Point;
  falls: boolean;
  /** The robots' entrance around the notch. */
  delay?: number;
  samples?: number;
  /** The envelope's width in points. */
  craft?: number;
}): Story {
  const measured = measure(route);
  const start = measured.at(0);
  const finish = measured.at(1);
  const scale = craft / 22;
  const packed = delay + STORY.pack;
  const takeoff = packed + STORY.fold;
  const flown = falls ? STORY.fly * 0.55 : STORY.fly;
  const landing = takeoff + flown;
  const unfolded = landing + STORY.unfold;
  const delivered = unfolded + STORY.handIn;
  const length = falls ? landing + STORY.fall : unfolded + STORY.deliver;
  const o = (time: number) => fix(time / length);
  const at = (point: Point, dx: number, dy: number) => ({
    x: point.x + dx,
    y: point.y + dy,
  });
  const takeoffAngle = unwrap(start.angle, 0);
  // A plane setting off leftwards is drawn mirrored, so the envelope folds
  // straight into it instead of spinning round first.
  const leftward = (angle: number) => Math.cos((angle * Math.PI) / 180) < 0;
  const mirrored = leftward(takeoffAngle);
  // How far the drawing is turned for a heading: the heading itself, or half
  // a turn less when mirrored, kept nearest to no turn at take-off.
  const lift = unwrap(takeoffAngle - (mirrored ? 180 : 0), 0) - takeoffAngle;
  const shown = (angle: number) => angle + lift;
  // Round a loop the drawing would land upside down: it rolls over on the way.
  const flips = leftward(shown(finish.angle));

  // In the air: time-even samples eased in and out, so the speed follows the
  // easing while every sample is placed by length along the route.
  const air: { offset: number; point: Point; angle: number; share: number }[] =
    [];
  let last = takeoffAngle;
  const reach = falls ? 0.5 : 1;
  for (let index = 0; index <= samples; index++) {
    const time = index / samples;
    const share = easeInOut(time) * reach;
    const { point, angle } = measured.at(share);
    last = unwrap(angle, last);
    air.push({ offset: o(takeoff + flown * time), point, angle: last, share });
  }
  const rest = air[air.length - 1];
  const flying = air.slice(1);
  const move: Keyframe[] = [
    { offset: 0, translate: px(start.point) },
    { offset: o(takeoff), translate: px(start.point) },
    ...flying.map(({ offset, point }) => ({ offset, translate: px(point) })),
  ];
  const turn: Keyframe[] = [
    { offset: 0, rotate: "0deg" },
    { offset: o(packed), rotate: "0deg" },
    { offset: o(takeoff), rotate: `${round(shown(takeoffAngle))}deg` },
    ...flying.map(({ offset, angle }) => ({
      offset,
      rotate: `${round(shown(angle))}deg`,
    })),
  ];
  const flip = mirrored ? "-1 1" : "1 1";
  const mirror: Keyframe[] = [
    { offset: 0, scale: flip },
    { offset: 1, scale: flip },
  ];
  const roll: Keyframe[] = [
    { offset: 0, scale: "1 1" },
    { offset: o(takeoff), scale: "1 1" },
    ...flying.map(({ offset, share }) => ({
      offset,
      scale: `1 ${rollAt(share, flips)}`,
    })),
  ];
  const ground = (point: Point, altitude: number, shown = 1) => {
    const lies = shadowAt(altitude, scale);
    return {
      translate: px(at(point, lies.dx, lies.dy)),
      scale: `${lies.width} 1`,
      opacity: Math.round(lies.opacity * shown * 1000) / 1000,
    };
  };
  const shadow: Keyframe[] = [
    { offset: 0, ...ground(start.point, 0, 0) },
    { offset: o(delay + PACK.popped), ...ground(start.point, 0) },
    { offset: o(takeoff), ...ground(start.point, 0) },
    ...flying.map(({ offset, point, share }) => ({
      offset,
      ...ground(point, Math.sin(Math.PI * share)),
    })),
  ];
  const shape: Keyframe[] = [
    { offset: 0, clipPath: ENVELOPE },
    { offset: o(packed), clipPath: ENVELOPE, easing: "ease-in-out" },
    { offset: o(takeoff), clipPath: PLANE },
  ];
  // The flap turns from one face to the other halfway through its swing.
  const swing = (time: number, opening: boolean, span = 200): Keyframe[] => {
    const [before, after] = opening
      ? [PAPER.sheet, PAPER.flap]
      : [PAPER.flap, PAPER.sheet];
    const way = opening ? -1 : 1;
    return [
      { offset: o(time), scale: `1 ${-way}`, color: before, opacity: 1 },
      {
        offset: o(time + span / 2 - 1),
        scale: `1 ${-way * 0.01}`,
        color: before,
        opacity: 1,
      },
      {
        offset: o(time + span / 2 + 1),
        scale: `1 ${way * 0.01}`,
        color: after,
        opacity: 1,
      },
      { offset: o(time + span), scale: `1 ${way}`, color: after, opacity: 1 },
    ];
  };
  const flap: Keyframe[] = [
    { offset: 0, scale: "1 -1", color: PAPER.flap, opacity: 1 },
    ...swing(delay + PACK.in, false),
    {
      offset: o(packed + STORY.fold * 0.4),
      scale: "1 1",
      color: PAPER.sheet,
      opacity: 0,
    },
  ];
  // The folding paper and the drawn plane hand over in 0.1 s once the paper
  // has the plane's outline, and back again before it unfolds.
  const handover = 100;
  const folds: Keyframe[] = [
    { offset: 0, opacity: 0 },
    { offset: o(takeoff - handover), opacity: 0 },
    { offset: o(takeoff), opacity: 1 },
  ];
  const pocket: Keyframe[] = [
    { offset: 0, opacity: 1 },
    { offset: o(packed), opacity: 1 },
    { offset: o(packed + STORY.fold * 0.35), opacity: 0 },
  ];
  const pop: Keyframe[] = [
    { offset: 0, scale: "0.3", opacity: 0 },
    { offset: o(delay + PACK.popped), scale: "1.1", opacity: 1 },
    { offset: o(delay + PACK.settled), scale: "1", opacity: 1 },
    { offset: o(delay + PACK.shut), scale: "1 1", opacity: 1 },
    { offset: o(delay + PACK.shut + 25), scale: "1 0.92", opacity: 1 },
    { offset: o(delay + PACK.shut + 70), scale: "1 1", opacity: 1 },
  ];
  // The letter, over the open envelope (15 points up) or in it (1 point up),
  // hidden where it has gone behind the envelope's front edge.
  const tall = craft * 0.72;
  const sheet = tall * LETTER.height;
  const whole = "inset(0px 0px 0% 0px)";
  const touch = -(tall + sheet) / 2 / scale;
  const sheetAt = (time: number, point: Point, depth: number): Keyframe => ({
    offset: o(time),
    translate: px(at(point, 0, depth * scale)),
    scale: "1",
    opacity: 1,
    clipPath: letterClip(
      point.y + depth * scale - sheet / 2,
      sheet,
      point.y - tall / 2,
    ),
  });
  const between = (from: number, until: number, a: number, b: number) =>
    from + ((until - from) * (touch - a)) / (b - a);
  const letter: Keyframe[] = [
    {
      offset: 0,
      translate: px(from),
      scale: "0.4",
      opacity: 0,
      clipPath: whole,
    },
    {
      offset: o(delay + PACK.out),
      translate: px(from),
      scale: "0.5",
      opacity: 1,
      clipPath: whole,
    },
    sheetAt(delay + PACK.over, start.point, -15),
    sheetAt(
      between(delay + PACK.over, delay + PACK.in, -15, -1),
      start.point,
      touch,
    ),
    sheetAt(delay + PACK.in, start.point, -1),
    { ...sheetAt(delay + PACK.in + 1, start.point, -1), opacity: 0 },
  ];
  // A puff every 10 points of the way flown, behind the plane: shown as it
  // passes (the easing inverted: when the plane is there), gone soon after.
  const puffs: Story["puffs"] = [];
  const count = Math.min(40, Math.floor((measured.length * reach) / 10));
  for (let index = 1; index < count; index++) {
    const share = (index / count) * reach;
    const passes = takeoff + flown * easeInOutInverse(share / reach);
    puffs.push({
      translate: px(measured.at(share).point),
      frames: [
        { offset: 0, opacity: 0 },
        { offset: o(passes), opacity: 0 },
        { offset: o(Math.min(length, passes + 40)), opacity: 0.5 },
        { offset: o(Math.min(length, passes + 420)), opacity: 0 },
        { offset: 1, opacity: 0 },
      ],
    });
  }
  if (falls) {
    // It stalls nose up, then tumbles down, unfolding into an envelope that
    // bursts open on the way, and fades.
    const stall = 180;
    const tumbling = landing + stall;
    const when = (share: number) => tumbling + (STORY.fall - stall) * share;
    const noseUp = shown(rest.angle) + (leftward(rest.angle) ? 40 : -40);
    const aloft = at(rest.point, 0, -3 * scale);
    move.push({ offset: o(tumbling), translate: px(aloft) });
    turn.push({ offset: o(tumbling), rotate: `${round(noseUp)}deg` });
    roll.push({ offset: o(tumbling), scale: roll[roll.length - 1].scale });
    shadow.push({ offset: o(tumbling), ...ground(rest.point, 1) });
    for (let step = 1; step <= 16; step++) {
      const share = step / 16;
      const fall = tumble(share);
      const c = Math.cos(15 * share);
      const flutter = (c < 0 ? -1 : 1) * Math.max(0.3, Math.abs(c));
      const offset = o(when(share));
      move.push({
        offset,
        translate: px(at(aloft, fall.dx * scale, fall.dy * scale)),
      });
      turn.push({ offset, rotate: `${round(noseUp + fall.spin)}deg` });
      roll.push({ offset, scale: `1 ${Math.round(flutter * 1000) / 1000}` });
      shadow.push({
        offset,
        ...ground(rest.point, 1 - share, Math.min(1, (1 - share) / 0.3)),
      });
    }
    shape.push(
      { offset: o(when(0.31)), clipPath: PLANE, easing: "ease-in-out" },
      { offset: o(when(0.62)), clipPath: ENVELOPE },
      { offset: 1, clipPath: ENVELOPE },
    );
    folds.push(
      { offset: o(when(0.31)), opacity: 1 },
      { offset: o(when(0.31) + handover), opacity: 0 },
      { offset: 1, opacity: 0 },
    );
    pocket.push(
      { offset: o(when(0.5)), opacity: 0 },
      { offset: o(when(0.65)), opacity: 1 },
      { offset: 1, opacity: 1 },
    );
    flap.push(
      { offset: o(when(0.5)), scale: "1 1", color: PAPER.sheet, opacity: 0 },
      { offset: o(when(0.6)), scale: "1 1", color: PAPER.sheet, opacity: 1 },
      ...swing(when(0.62), true),
      { offset: 1, scale: "1 -1", color: PAPER.flap, opacity: 1 },
    );
    pop.push(
      { offset: o(when(0.7)), scale: "1", opacity: 1 },
      { offset: 1, scale: "0.9", opacity: 0 },
    );
    letter.push({
      offset: 1,
      translate: px(start.point),
      scale: "1",
      opacity: 0,
      clipPath: whole,
    });
  } else {
    // It lands the right way up and level, and unfolds into an upright
    // envelope: the flap opens, the letter rises out and into the receiver.
    const level = unwrap(flips ? 180 : 0, shown(rest.angle));
    move.push({ offset: 1, translate: px(finish.point) });
    turn.push(
      { offset: o(landing + STORY.unfold * 0.5), rotate: `${round(level)}deg` },
      { offset: 1, rotate: `${round(level)}deg` },
    );
    roll.push({ offset: 1, scale: roll[roll.length - 1].scale });
    shadow.push(
      { offset: o(unfolded + STORY.deliver * 0.6), ...ground(finish.point, 0) },
      { offset: 1, ...ground(finish.point, 0, 0) },
    );
    shape.push(
      { offset: o(landing + handover), clipPath: PLANE, easing: "ease-in-out" },
      { offset: o(landing + STORY.unfold * 0.8), clipPath: ENVELOPE },
      { offset: 1, clipPath: ENVELOPE },
    );
    flap.push(
      {
        offset: o(landing + STORY.unfold * 0.45),
        scale: "1 1",
        color: PAPER.sheet,
        opacity: 0,
      },
      {
        offset: o(landing + STORY.unfold * 0.75),
        scale: "1 1",
        color: PAPER.sheet,
        opacity: 1,
      },
      ...swing(unfolded, true, 140),
      { offset: 1, scale: "1 -1", color: PAPER.flap, opacity: 1 },
    );
    folds.push(
      { offset: o(landing), opacity: 1 },
      { offset: o(landing + handover), opacity: 0 },
      { offset: 1, opacity: 0 },
    );
    pocket.push(
      { offset: o(landing + STORY.unfold * 0.5), opacity: 0 },
      { offset: o(landing + STORY.unfold * 0.85), opacity: 1 },
      { offset: 1, opacity: 1 },
    );
    pop.push(
      { offset: o(unfolded + STORY.deliver * 0.6), scale: "1", opacity: 1 },
      { offset: 1, scale: "0.85", opacity: 0 },
    );
    letter.push(
      { ...sheetAt(unfolded, finish.point, -1), opacity: 0 },
      sheetAt(unfolded + 100, finish.point, -1),
      sheetAt(
        between(unfolded + 100, unfolded + 200, -1, -15),
        finish.point,
        touch,
      ),
      sheetAt(unfolded + 200, finish.point, -15),
      {
        offset: o(delivered),
        translate: px(to),
        scale: "0.45",
        opacity: 1,
        clipPath: whole,
      },
      {
        offset: 1,
        translate: px(to),
        scale: "0.3",
        opacity: 0,
        clipPath: whole,
      },
    );
  }
  return {
    length,
    takeoff,
    landing,
    delivered,
    move,
    turn,
    mirror,
    roll,
    shape,
    pop,
    flap,
    folds,
    pocket,
    letter,
    shadow,
    puffs,
    routeLength: measured.length,
  };
}
/** Reduced motion: no flight. A closed envelope fades in beside the sender and
 * out again, then an open one beside the receiver; a refused one only shows
 * the sender's, open. Keyframes for the craft's two showings (`first`, `second`). */
export function stillStory(falls: boolean): {
  first: Keyframe[];
  second: Keyframe[];
} {
  const show = (from: number, to: number): Keyframe[] => [
    { offset: 0, opacity: 0 },
    { offset: from, opacity: 0 },
    { offset: from + 0.08, opacity: 1 },
    { offset: to - 0.08, opacity: 1 },
    { offset: to, opacity: 0 },
    { offset: 1, opacity: 0 },
  ];
  return falls
    ? { first: show(0, 0.6), second: [{ opacity: 0 }, { opacity: 0 }] }
    : { first: show(0, 0.5), second: show(0.45, 0.95) };
}

/** Where a flight around the notch happens: robots peeking out of small wings
 * at the notch's sides, and the path dipping under the notch's lower edge. */
export interface NotchStage {
  left: Point;
  right: Point;
  /** Each wing: x and width; it grows out from under the notch. A wing is
   * drawn as its side of a wider notch (the same flare at the top, the same
   * rounded corner below) and reaches far enough under the notch to cover
   * the notch's own rounded corner. */
  wings: {
    left: { x: number; width: number };
    right: { x: number; width: number };
  };
  /** The resting notch's flare at the top and its corner radius below. */
  flare: number;
  radius: number;
  top: number;
  height: number;
  bot: number;
  /** The lowest point of the path. */
  dip: number;
}
export function notchStage(notch: {
  x: number;
  y: number;
  width: number;
  height: number;
}): NotchStage {
  const height = Math.max(24, notch.height);
  const bot = Math.round(Math.min(22, height - 6));
  const wing = bot + 18;
  // The resting notch's shape (HUDMarkStrip's silhouette).
  const flare = 8;
  const radius = 12;
  const under = flare + radius * 2 + 4;
  return {
    left: { x: notch.x - wing / 2, y: notch.y + height / 2 },
    right: { x: notch.x + notch.width + wing / 2, y: notch.y + height / 2 },
    wings: {
      left: { x: notch.x - wing - flare, width: flare + wing + under },
      right: { x: notch.x + notch.width - under, width: under + wing + flare },
    },
    flare,
    radius,
    top: notch.y,
    height,
    bot,
    dip: notch.y + height + Math.max(30, height * 1.2),
  };
}
