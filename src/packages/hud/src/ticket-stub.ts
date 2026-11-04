// A Dynamic (logos) mark is drawn as a paper ticket stub: the bot on top,
// a tear-off foot under a dashed tear line with one reading, and the marks a
// ticket gets. Kept free of the UI so the
// tests can run it; host/src/hud/plans.rs `strip_width` mirrors the width.

/**
 * A stub's width and height for a bot `logo` points tall: 34 × 50 at 20,
 * slim enough for a dozen agents down one laptop edge. The bot is a sticker
 * on its own layer, so Clawd's props may pass over the paper's edges.
 */
export function stubSize(logo: number): { width: number; height: number } {
  return { width: Math.round(logo * 1.7), height: Math.round(logo * 2.5) };
}

/** From the stub's top to its bot's top, in points. */
export const stubBotTop = (logo: number) => Math.round(logo * 0.35);

/** The tear-off foot the reading is printed on, in points tall. */
export const stubFootHeight = (logo: number) => Math.round(logo * 0.7);

/** A reading at or past this share of a quota is printed in red. */
export const STUB_WARN_PERCENT = 80;

export interface StubMarks {
  /** Punched: the agent is working and not waiting on you. */
  punched: boolean;
  /** Sealed: the agent waits for your approval or answer. */
  sealed: boolean;
  /** The reading is printed in red: its tightest quota is nearly spent. */
  warn: boolean;
}

export function stubMarks(vendor: {
  working: number;
  waiting: number;
  used: number | null;
}): StubMarks {
  const sealed = vendor.waiting > 0;
  return {
    punched: vendor.working > 0 && !sealed,
    sealed,
    warn: vendor.used != null && vendor.used >= STUB_WARN_PERCENT,
  };
}

/** A faint paper grain for the stubs and the panel's receipt, tiled. */
export const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .19 0 0 0 0 .17 0 0 0 .14 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>',
)}")`;

export type PaperSide = "top" | "right" | "bottom" | "left";

/** A stub's perforated side: the one facing into the screen. */
export const perforatedSide = (
  edge: "top" | "right" | "bottom" | "left",
): PaperSide =>
  edge === "right"
    ? "left"
    : edge === "left"
      ? "right"
      : edge === "top"
        ? "bottom"
        : "top";

/** The CSS mask that punches a row of holes along `side`, one every
 * 10 × `unit` points: a stub's at its bot's scale, the receipt's at 1.4. */
export function perforationMask(side: PaperSide, unit: number): string {
  return side === "top" || side === "bottom"
    ? `radial-gradient(circle at ${5 * unit}px ${side === "top" ? "0" : "100%"}, transparent ${2.1 * unit}px, #000 ${2.5 * unit}px) 0 0 / ${10 * unit}px 100% repeat-x`
    : `radial-gradient(circle at ${side === "left" ? "0" : "100%"} ${5 * unit}px, transparent ${2.1 * unit}px, #000 ${2.5 * unit}px) 0 0 / 100% ${10 * unit}px repeat-y`;
}
