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
