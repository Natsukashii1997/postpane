import { createContext, useContext, type CSSProperties } from "react";
import type { HUDEdge } from "./model";

// The paper the Dynamic stubs and a request's tag and card are printed on:
// a faint grain, tiled.
export const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .19 0 0 0 0 .17 0 0 0 .14 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>',
)}")`;

/** Narrow figures, as the stubs print their readings. */
export const PAPER_FIGURES = `"Avenir Next Condensed", "DIN Condensed", "Arial Narrow", sans-serif`;
/** The seals' and stamps' face. */
export const PAPER_SEAL = `"Songti SC", "STSong", serif`;

/** A request's paper in the HUD's appearance: light paper and dark ink, or
 * dark paper and light ink. */
export interface Paper {
  light: boolean;
  paper: string;
  ink: string;
  /** Captions, paths, times. */
  dim: string;
  /** Tear lines and separators. */
  line: string;
  red: string;
  /** A reply's mark: the one note of colour a reply's tag and card carry. */
  blue: string;
  /** Work going on: the hover panel's "在跑" tag and "够用" stamp. */
  green: string;
  /** A wash of ink under a command or a picked answer. */
  fill: string;
  /** Ink at `alpha`. */
  text: (alpha: number) => string;
  /** How far the card's content sits in from its sides, for tear lines
   * drawn edge to edge. */
  bleed: { left: number; right: number };
}

export function paperOf(
  light: boolean,
  bleed: Paper["bleed"] = { left: 0, right: 0 },
): Paper {
  const ink = light ? "42,41,37" : "236,231,220";
  return {
    light,
    paper: light ? "#f3f1eb" : "#2b2925",
    ink: `rgb(${ink})`,
    dim: light ? "#77736a" : "#a39d90",
    line: `rgba(${ink},${light ? 0.3 : 0.26})`,
    red: light ? "#c4261e" : "#ff6a57",
    blue: light ? "#2f5fb3" : "#8fb0ec",
    green: light ? "#2f7d4f" : "#6cc59a",
    fill: `rgba(${ink},${light ? 0.07 : 0.08})`,
    text: (alpha) => `rgba(${ink},${Math.min(1, alpha + 0.08)})`,
    bleed,
  };
}

/** The paper a request is printed on; null where it keeps the HUD's own
 * ground (the notch). */
export const PaperContext = createContext<Paper | null>(null);
export const usePaper = () => useContext(PaperContext);

/** The paper's face: its colour under the grain. */
export function paperFace(paper: Paper): CSSProperties {
  return {
    background: `${PAPER_GRAIN} 0 0 / 160px 160px, ${paper.paper}`,
    // The grain is dark; on dark paper it lightens instead.
    backgroundBlendMode: paper.light ? undefined : "screen",
  };
}

/** The paper's perforated side: the one facing into the screen. */
export const perforatedSide = (edge: HUDEdge) =>
  edge === "right"
    ? "left"
    : edge === "left"
      ? "right"
      : edge === "top"
        ? "bottom"
        : "top";

/** A mask punching a row of holes `hole` across, every `pitch`, down a
 * side of the paper: its perforation. */
export function perforation(
  side: "left" | "right" | "top" | "bottom",
  pitch: number,
  hole: number,
): string {
  const half = pitch / 2,
    edge = `transparent ${hole}px, #000 ${hole + 0.4}px`;
  return side === "left" || side === "right"
    ? `radial-gradient(circle at ${side === "left" ? "0" : "100%"} ${half}px, ${edge}) 0 0 / 100% ${pitch}px repeat-y`
    : `radial-gradient(circle at ${half}px ${side === "top" ? "0" : "100%"}, ${edge}) 0 0 / ${pitch}px 100% repeat-x`;
}

/** A level printed on the receipt: ink, amber for a warning, red for a
 * critical one, and the dim ink with no reading. */
export function paperLevel(
  level: "normal" | "warning" | "critical" | "stale",
  paper: Paper,
): string {
  return level === "critical"
    ? paper.red
    : level === "warning"
      ? paper.light
        ? "#b7791f"
        : "#e0a948"
      : level === "normal"
        ? paper.ink
        : paper.dim;
}
