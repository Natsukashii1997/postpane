import { easeOut } from "./bot-moves.ts";
import { clamp01, round, TAU, wrap } from "./bot-whale-water.ts";

/**
 * What floats round the Antigravity bot, in mark shares (y down): the
 * satellites it watches while thinking, the sparks of a flip, flames under
 * its feet, a page it reads, the orbit of a long command. Its shadow is not
 * here: the painter keeps it on the ground under the posed body.
 */
/** A dot round the body; a star when `star`, dimmer and smaller behind it. */
export interface FloatMote {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
  star: boolean;
}
/** A flame of thrust under a foot: a teardrop hanging `length` down from (x, y). */
export interface FloatFlame {
  x: number;
  y: number;
  length: number;
  alpha: number;
}
/** A page held up beside the body; `line` is the row being read (0–2). */
export interface FloatPage {
  x: number;
  y: number;
  line: number;
}
/** The orbit of a long command: an ellipse round the body, `progress` 0–1 of the way. */
export interface FloatOrbit {
  progress: number;
}
export interface FloatSky {
  motes: FloatMote[];
  flames: FloatFlame[];
  page: FloatPage | null;
  orbit: FloatOrbit | null;
  /** The planet tag's size: above 1 while it calls for you. */
  tag: number;
  /** Something moves faster than a slow float, so frames come quickly. */
  live: boolean;
}
/** Antigravity's own four colours. */
export const SKY = {
  blue: "#4285f4",
  red: "#ea4335",
  yellow: "#fbbc04",
  green: "#34a853",
  dust: "#a3a6ad",
  dream: "#7aa7f7",
} as const;
const RAINBOW = [SKY.red, SKY.yellow, SKY.green, SKY.blue];
/** Its feet, where thrust comes out, and its middle. */
export const FEET = [
  [0.31, 0.9],
  [0.69, 0.9],
] as const;
export const MIDDLE = [0.5, 0.55] as const;
/** How high it hovers at rest, and where it sits when it lands. */
export const ALOFT = -0.035;
export const GROUNDED = 0.035;
export const emptySky = (): FloatSky => ({
  motes: [],
  flames: [],
  page: null,
  orbit: null,
  tag: 1,
  live: false,
});
const mote = (
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
  star = false,
): FloatMote => ({
  x: round(x),
  y: round(y),
  r: round(r),
  color,
  alpha: round(clamp01(alpha)),
  star,
});
/**
 * Three satellites on a tilted ring over its head, a third of a turn apart;
 * the one in front is the first. Returns them and where the lead one is.
 */
export function satellites(now: number, period = 2.4) {
  const motes: FloatMote[] = [];
  let lead = 0;
  for (let i = 0; i < 3; i++) {
    const a = (TAU * now) / period + (i * TAU) / 3,
      front = Math.sin(a);
    if (i === 0) lead = Math.cos(a);
    motes.push(
      mote(
        0.5 + 0.31 * Math.cos(a),
        0.06 + 0.06 * front,
        0.034 + 0.012 * front,
        RAINBOW[i],
        front < 0 ? 0.55 : 1,
      ),
    );
  }
  return { motes, lead };
}
/** Satellites spiralling into the body as it squeezes (`squeeze` 0–1) and out again. */
export function spiral(now: number, squeeze: number) {
  const reach = 0.06 + 0.36 * (1 - squeeze);
  return RAINBOW.slice(0, 3).map((color, i) => {
    const a = (TAU * now) / 1.2 + (i * TAU) / 3;
    return mote(
      MIDDLE[0] + reach * Math.cos(a),
      MIDDLE[1] + 0.7 * reach * Math.sin(a),
      0.03,
      color,
      1 - 0.9 * squeeze ** 3,
    );
  });
}
/** Stars thrown out from its middle `t` seconds into a burst; `count` 4 or 8. */
export function burst(t: number, count = 4, reach = 0.42): FloatMote[] {
  if (t < 0 || t > 0.9) return [];
  const q = easeOut(t / 0.9);
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i * TAU) / count + Math.PI / count;
    return mote(
      0.5 + (0.1 + reach * q) * Math.cos(a),
      0.45 + (0.1 + reach * q) * Math.sin(a),
      0.075 * (1 - 0.3 * q),
      RAINBOW[i % 4],
      1 - q ** 3,
      true,
    );
  });
}
/** Two stars twinkling on the side it greets. */
export function twinkle(g: number, side: number): FloatMote[] {
  return [
    [0.43, 0.16, 0],
    [0.52, 0.42, 0.25],
  ].map(([dx, y, delay], i) => {
    const q = clamp01((g - 0.15 - delay) / 0.9);
    return mote(
      0.5 + side * dx,
      y,
      0.05 * Math.sin(Math.PI * q),
      i ? SKY.blue : SKY.yellow,
      Math.sin(Math.PI * q),
      true,
    );
  });
}
/** Thrust under both feet, flickering; `power` 0–1. */
export function thrust(now: number, power: number): FloatFlame[] {
  if (power <= 0.02) return [];
  return FEET.map(([x, y], i) => ({
    x,
    y: round(y - 0.015),
    length: round(
      (0.07 + 0.09 * power) * (0.8 + 0.2 * Math.sin(now * 47 + i * 2.1)),
    ),
    alpha: round(Math.min(1, 1.6 * power)),
  }));
}
/** Grey dust kicked out either side as it hits the ground, `q` 0–1. */
export function dust(q: number): FloatMote[] {
  if (q <= 0 || q >= 1) return [];
  return [-1, -0.5, 0.5, 1].map((s) =>
    mote(
      0.5 + s * (0.3 + 0.16 * easeOut(q)),
      0.93 - 0.06 * Math.sin(Math.PI * q) * Math.abs(s),
      0.032 * (1 - 0.5 * q),
      SKY.dust,
      1 - q,
    ),
  );
}
/** A pebble drifting up past it every `every` seconds, as if gravity were off. */
export function pebble(now: number, every = 8): FloatMote | null {
  const q = wrap(now, every) / 3;
  if (q >= 1) return null;
  return mote(
    0.13 + 0.03 * Math.sin(q * TAU),
    0.92 - 0.6 * easeOut(q),
    0.024,
    SKY.yellow,
    q < 0.15 ? q / 0.15 : 1 - q,
  );
}
/** A pale dream drifting up once each breath while it sleeps. */
export function dream(now: number): FloatMote | null {
  const q = wrap(now, 4) / 2.6;
  if (q >= 1) return null;
  return mote(
    0.72 + 0.03 * Math.sin(q * TAU),
    0.22 - 0.2 * easeOut(q),
    0.03 + 0.025 * q,
    SKY.dream,
    q < 0.2 ? q / 0.2 : 1 - q,
  );
}
/** A spark popping off its head on each tick of an edit. */
export function spark(tick: number, side: number): FloatMote | null {
  if (tick < 0 || tick > 0.35) return null;
  const q = tick / 0.35;
  return mote(
    0.5 + side * (0.1 + 0.12 * q),
    0.16 - 0.1 * easeOut(q),
    0.065 * (1 - 0.4 * q),
    side < 0 ? SKY.green : SKY.yellow,
    1 - q,
    true,
  );
}
