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
  /** A status written out (待你看, 正在回复, ✓ 今天): one ink for every such
   * word, so the colour stays with what is pressed on — the stamps, tags and
   * dots (owner 2026-11-11, 乙, #308). A word saying something went wrong
   * keeps the red. */
  word: string;
  /** The one ochre: a permission's tag, 「回」, a warning, a halted relay
   * (#308: the four ambers made one, the 赭金 picked for 「回」 in #304). */
  ochre: string;
  /** A wash of ink under a command or a picked answer. */
  fill: string;
  /** Ink at `alpha`. */
  text: (alpha: number) => string;
  /** How far the card's content sits in from its sides, for tear lines
   * drawn edge to edge. */
  bleed: { left: number; right: number };
  /** Airmail stripes along the sides without holes: a handoff's paper. */
  airmail?: boolean;
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
    word: light ? "#46566e" : "#b2bdcf",
    ochre: light ? "#99591a" : "#dba15a",
    fill: `rgba(${ink},${light ? 0.07 : 0.08})`,
    text: (alpha) => `rgba(${ink},${Math.min(1, alpha + 0.08)})`,
    bleed,
  };
}

/** A handoff's paper (relay card, owner 2026-11-06): old letter paper, a
 * dimmed grey-blue with dark ink in either appearance, so a review reads
 * apart from the receipts of one's own work without glaring beside them
 * (#145: every review, the ChatGPT peek's lower slip included). */
export function relayPaperOf(
  _light: boolean,
  bleed: Paper["bleed"] = { left: 0, right: 0 },
): Paper {
  const ink = "38,48,63";
  return {
    light: true,
    paper: "#cdd4dc",
    ink: `rgb(${ink})`,
    dim: "#566273",
    line: `rgba(${ink},0.26)`,
    red: "#c4261e",
    blue: "#3a5c96",
    green: "#2a7a4c",
    word: "#3b4a61",
    ochre: "#8a4f14",
    fill: `rgba(${ink},0.07)`,
    text: (alpha) => `rgba(${ink},${Math.min(1, alpha + 0.08)})`,
    bleed,
    airmail: true,
  };
}

/** Airmail stripes, red and blue, for a band `width` wide. */
/** The airmail red and blue, toned down for the receipts. */
export const AIRMAIL_RED = "#b0574b";
export const AIRMAIL_BLUE = "#46679f";

export function airmailStripes(width: number): string {
  const red = AIRMAIL_RED,
    blue = AIRMAIL_BLUE;
  // Each stripe as long as the band is wide again, as on an envelope.
  const a = width * 1.33,
    b = a * 1.5;
  return `repeating-linear-gradient(-45deg, ${red} 0 ${a}px, transparent ${a}px ${b}px, ${blue} ${b}px ${a + b}px, transparent ${a + b}px ${2 * b}px)`;
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

/** Where a handoff's airmail stripes go (owner, 2026-11-06): the open card
 * along its top, or its bottom when the holes take the top (docked to the
 * screen's bottom edge); the closed tag along the side facing away from the
 * holes. Never the hole side. */
export function airmailSides(
  edge: HUDEdge,
  open: boolean,
): ("left" | "right" | "top" | "bottom")[] {
  const holes = perforatedSide(edge);
  if (open) return [holes === "top" ? "bottom" : "top"];
  return [
    holes === "left"
      ? "right"
      : holes === "right"
        ? "left"
        : holes === "top"
          ? "bottom"
          : "top",
  ];
}

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
