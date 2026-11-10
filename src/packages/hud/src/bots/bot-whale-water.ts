import { easeInOut, easeOut } from "./bot-moves.ts";

/**
 * The DeepSeek whale's own body language: it floats, paddles its fins,
 * blows bubbles, spouts and sinks to sleep. Everything here is in mark
 * shares (the body is a circle of radius 0.36 round (0.5, 0.5)), with y
 * running down. Nothing borrows the avatar's halo or the cloud's puffs.
 */
export interface WhaleBubble {
  x: number;
  y: number;
  r: number;
  alpha: number;
}
/** A drop of the spout: grey when the whale chokes. */
export interface WhaleDrop {
  x: number;
  y: number;
  r: number;
  alpha: number;
}
/**
 * The spout: a column of water `height` up out of the blowhole that opens
 * at its top into two leaves curling out and down, `spread` 0–1 open.
 */
export interface WhaleJet {
  height: number;
  spread: number;
  alpha: number;
}
/** A short wave line beside the belly, swept outward by a stroke. */
export interface WhaleWave {
  x: number;
  y: number;
  side: number;
  alpha: number;
}
/** A ring of air blown out sideways to say hello, an ellipse `r` across. */
export interface WhaleRing {
  x: number;
  y: number;
  r: number;
  alpha: number;
}
/** The little fish a thinking whale watches swim round its head; `dir` is the way it faces. */
export interface WhaleFish {
  x: number;
  y: number;
  dir: number;
  size: number;
}
export interface WhaleWater {
  bubbles: WhaleBubble[];
  ring: WhaleRing | null;
  fish: WhaleFish | null;
  drops: WhaleDrop[];
  jet: WhaleJet | null;
  waves: WhaleWave[];
  /** The spout chokes grey instead of blue. */
  choked: boolean;
  /** The droplet tag's size: above 1 while it calls for you. */
  tag: number;
  /** Something moves faster than a slow float, so frames come quickly. */
  live: boolean;
}
export const TAU = 2 * Math.PI;
/** The blowhole: right of the top fin, on the body's edge. */
export const BLOWHOLE = [0.62, 0.16] as const;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const swing = (x: number) => Math.sin(Math.PI * clamp01(x));
export const wrap = (x: number, period: number) =>
  ((x % period) + period) % period;
export const round = (x: number) => Math.round(x * 1000) / 1000;
/** A bubble `q` (0–1) of the way up from the blowhole, swaying as it rises. */
export function rising(
  q: number,
  height: number,
  from: number,
  to: number,
  sway = 0,
) {
  return {
    x: round(BLOWHOLE[0] + 0.03 + sway * Math.sin(q * TAU)),
    y: round(BLOWHOLE[1] - 0.04 - height * easeOut(q)),
    r: round(from + (to - from) * q),
    alpha: round(q < 0.12 ? q / 0.12 : q > 0.85 ? (1 - q) / 0.15 : 1),
  };
}
/** Where a spout `height` tall ends its leaf on `side`, `spread` open. */
export const leafTip = (height: number, spread: number, side: number) =>
  [
    BLOWHOLE[0] + side * 0.17 * spread,
    BLOWHOLE[1] - height + 0.07 * spread,
  ] as const;
/** Drops falling off both leaf tips of a spout, out and down, fading as they go. */
export function spray(
  time: number,
  length: number,
  height: number,
  pairs: number,
) {
  const drops: WhaleDrop[] = [];
  for (let i = 0; i < pairs; i++) {
    const k = (time - i * 0.14) / length;
    if (k < 0 || k >= 1) continue;
    for (const side of [-1, 1]) {
      const [x, y] = leafTip(height, 1, side);
      drops.push({
        x: round(x + side * (0.05 + 0.04 * i) * easeOut(k)),
        y: round(y + 0.34 * k * k),
        r: round(0.04 * (1 - 0.35 * k)),
        alpha: round(1 - k * k),
      });
    }
  }
  return drops;
}
/** A spout `top` tall at its height, shooting up, opening and sinking over `length` seconds. */
export function spout(
  time: number,
  top: number,
  length: number,
): WhaleJet | null {
  if (time < 0 || time >= length) return null;
  const up = easeOut(clamp01(time / 0.22)),
    open = easeOut(clamp01((time - 0.12) / 0.3)),
    fall = easeInOut(clamp01((time - length * 0.62) / (length * 0.38)));
  return {
    height: round(top * up * (1 - 0.6 * fall)),
    spread: round(open),
    alpha: round(1 - fall),
  };
}
/** Greeting: a ring of air blown out on `side`, drifting up and out as it widens. */
export function blownRing(g: number, side: number): WhaleRing | null {
  const q = (g - 0.15) / 1.3;
  if (q < 0 || q >= 1) return null;
  const k = easeOut(q);
  return {
    x: round(0.5 + side * (0.4 + 0.2 * k)),
    y: round(0.44 - 0.36 * k),
    r: round(0.05 + 0.08 * k),
    alpha: round(q > 0.7 ? (1 - q) / 0.3 : 1),
  };
}
/**
 * Thinking: a little fish swims an ellipse over the whale's head, smaller
 * on the far side, hopping every other lap as it passes the top.
 */
export function circlingFish(now: number): WhaleFish {
  const lap = 2.6,
    a = (TAU * now) / lap,
    near = Math.sin(a),
    hop =
      Math.floor(now / lap) % 2 === 1 ? swing((wrap(now, lap) - 1.6) / 0.5) : 0;
  return {
    x: round(0.5 + 0.38 * Math.cos(a)),
    y: round(0.0 + 0.07 * near - 0.07 * hop),
    dir: -Math.sin(a) >= 0 ? 1 : -1,
    size: round(1.3 * (0.88 + 0.12 * near)),
  };
}
