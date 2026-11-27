/** The pieces a BotSpec is built from; coordinates are in body radii. */
export interface Fin {
  root: Point;
  angle: number;
  length: number;
  base: number;
  tip: number;
  sweep: number;
  hand: number;
}
export type Box = [number, number, number, number]; // x0, y0, x1, y1, in body radii
export type Point = [number, number];
export type Shape =
  | { kind: "circle" }
  | { kind: "outline"; keep: number; smooth: number }
  | { kind: "polygon"; sides: number; rotation: number; round: number }
  | {
      kind: "rect";
      width: number;
      height: number;
      round: number;
      skew?: number;
    }
  | { kind: "cat" }
  | { kind: "bob" };
export type Paint =
  | string
  | { colors: string[]; from: Point; to: Point }
  | { colors: string[]; center: Point; inner: number; outer: number };
export type Decor =
  | {
      kind: "blocks" | "soft";
      boxes: Box[];
      color: string;
      round?: number;
      follows?: boolean;
    }
  | { kind: "notch"; points: Point[] }
  | { kind: "cut"; boxes: Box[] }
  | { kind: "line"; points: Point[]; width: number }
  | { kind: "fins"; fins: Fin[]; color: string }
  | { kind: "feelers"; lines: Point[][]; color: string; width: number };

/** Complete BotSpec.swift dimensions; coordinates are x0,y0,x1,y1 in body radii. */
export interface BotSpec {
  radius: number;
  center: Point;
  reach: number;
  shape: Shape;
  paint?: Paint;
  face: Point;
  eye: {
    height: number;
    width: number;
    round: number;
    spread: number;
    across?: number;
  };
  eyeColor?: string;
  spin?: number;
  settle?: number;
  decor?: Decor[];
  ring?: {
    radiusX: number;
    radiusY: number;
    drop: number;
    tilt: number;
    width: number;
  };
  patch?: { box: Box; round: number; paint: Paint };
  stroke?: string;
  pupil?: string;
  signAt?: Point;
  unpainted?: Box[];
  crossesEyes?: boolean;
  /** Stays a bot in the side strip instead of resting as its logo. */
  stays?: boolean;
  /** Petals open, close and turn with the work. */
  petals?: boolean;
  /** Floats, rolls its edge, puffs, rains and greys with the work, never turning. */
  cloud?: boolean;
  /** Floats, paddles its fins, blows bubbles and spouts: the DeepSeek whale. */
  whale?: boolean;
  /** Hovers over its shadow, flips and drops when its gravity fails: Antigravity. */
  float?: boolean;
  /**
   * Acts as its own artwork instead of a drawn bot: the portrait tilts, nods
   * and closes its eyes. Eyes are ellipses [x, y, rx, ry] in artwork shares.
   */
  avatar?: { eyes: [number, number, number, number][] };
  keeps?: Box;
  ownEyes?: Box[];
  limbs?: { arms: Box[]; legs: Box[]; pixel: number };
}
