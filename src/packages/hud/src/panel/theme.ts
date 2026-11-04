import { useMemo, type ComponentType, type CSSProperties } from "react";
import { DollarSign, Flame, Gauge, Percent, Sigma } from "lucide-react";
import type { QuotaMeasure } from "@agent-hud/protocol";
import { useGround } from "../ground";
import { usePaper, type Paper } from "../paper";
import { hudPalette, type Ground, type HUDPalette } from "../tokens";

export type Logo = ComponentType<{
  source: string;
  size?: number;
  light?: boolean;
}>;
export type Measure = QuotaMeasure;
export type Period = "24h" | "7d" | "30d";

/** Source: IslandRowLayout, PanelSpacingMetrics(.regular), HoverPanelView. */
export const SOURCE_PANEL = {
  inset: 6,
  marker: 8,
  rowGap: 12,
  nameWidth: 152,
  valueWidth: 62,
  detailWidth: 96,
  sections: 10,
  blocks: 10,
  divided: 8,
  blockParts: 8,
  rowPadding: 4,
  sessionRows: 6,
  headingSize: 13,
  accountSize: 11,
  rowSize: 13,
  detailSize: 12,
  headingHeight: 18,
  headingVerticalPadding: 1,
  footerSpacing: 10,
  footerTop: 6,
  footerButton: 28,
  compactChartHeight: 40,
} as const;

export const measures: { key: Measure; title: string; icon: typeof Percent }[] =
  [
    { key: "quota", title: "Quota", icon: Percent },
    { key: "burn", title: "Burn rate", icon: Flame },
    { key: "tokens", title: "Reply rate", icon: Gauge },
    { key: "consumed", title: "Consumed", icon: Sigma },
    { key: "cost", title: "Est. cost", icon: DollarSign },
  ];

export const noButtonChrome: CSSProperties = {
  border: 0,
  background: "none",
  color: "inherit",
  font: "inherit",
  padding: 0,
  borderRadius: 0,
  boxShadow: "none",
  textAlign: "left",
};

export const tabular: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/** Unknown or newly discovered blocks retain their source order after saved ones. */
export function inPanelOrder<T extends { key: string }>(
  items: T[],
  order: readonly string[],
) {
  const positions = new Map(order.map((key, index) => [key, index]));
  return [...items].sort(
    (a, b) =>
      (positions.get(a.key) ?? Infinity) - (positions.get(b.key) ?? Infinity),
  );
}

export const densityMetrics = {
  // PanelSpacingMetrics.swift: roomy / regular / compact. Fonts and chart stay fixed.
  comfortable: { section: 14, block: 11, divided: 11, row: 6, session: 8 },
  normal: { section: 10, block: 8, divided: 8, row: 4, session: 6 },
  compact: { section: 6, block: 5, divided: 5, row: 2, session: 4 },
} as const;

/** One agent's colour by its palette index (Open's AgentPalette): the
 * statistics palette on a dark HUD, each hue's deeper shade on a light one,
 * which stands at least 3:1 there as a dot or a bar must. */
const AGENT_DARK = [
  "#c084fc",
  "#60a5fa",
  "#2dd4bf",
  "#fb923c",
  "#f472b6",
  "#a3e635",
];
const AGENT_LIGHT = [
  "#9333ea",
  "#2563eb",
  "#0d9488",
  "#ea580c",
  "#db2777",
  "#4d7c0f",
];
export function agentColor(index: number, light: boolean) {
  const colors = light ? AGENT_LIGHT : AGENT_DARK;
  return colors[((index % colors.length) + colors.length) % colors.length];
}

/** The panel's tokens on `ground`: the light or dark HUD's, opaque or on a
 * ground the desktop shows through (`hud/tokens.ts`, Open's Theme.under). */
export function palette(ground: Ground) {
  return hudPalette(ground);
}

/** The panel's tokens printed on `paper`, the receipt: ink for the text and
 * an ordinary level, amber for a warning, red for a critical one. */
export function paperPalette(paper: Paper): HUDPalette {
  const warning = paper.light ? "#b7791f" : "#e0a948";
  return {
    text: paper.ink,
    secondary: paper.dim,
    tertiary: paper.text(0.42),
    divider: paper.line,
    track: paper.fill,
    selected: paper.fill,
    accent: paper.red,
    ok: paper.ink,
    warning,
    critical: paper.red,
    okText: paper.ink,
    warningText: warning,
    criticalText: paper.red,
  };
}

/** The panel's tokens where it is drawn: on the receipt's paper beside the
 * dock, or on the HUD's own ground (the notch, the settings' preview). */
export function usePanelPalette(light: boolean): HUDPalette {
  const paper = usePaper();
  const ground = useGround(light);
  return useMemo(
    () => (paper ? paperPalette(paper) : palette(ground)),
    [paper, ground],
  );
}

/** A status dot on the receipt: punched through, not glowing. */
export const RECEIPT_PUNCH = "inset 0 1px 1.2px rgba(0,0,0,.5)";

/** A meter on the receipt: a small ruled box instead of a rounded track. */
export function receiptMeterBox(paper: Paper): CSSProperties {
  return {
    height: 7,
    background: "transparent",
    border: `1px solid ${paper.ink}`,
    borderRadius: 1,
    boxSizing: "border-box",
  };
}

/** A meter's reading on the receipt, printed in hatching of `color`. */
export function receiptMeterFill(color: string): CSSProperties {
  return {
    height: "100%",
    borderRadius: 0,
    background: `repeating-linear-gradient(-45deg, ${color} 0 1.5px, transparent 1.5px 3.5px)`,
  };
}

/** A tear line across the receipt, from one side of the paper to the
 * other: a dashed rule bled past the content's margins. */
export function receiptTear(paper: Paper): CSSProperties {
  return {
    borderTop: `1.2px dashed ${paper.line}`,
    marginLeft: -paper.bleed.left,
    marginRight: -paper.bleed.right,
    paddingLeft: paper.bleed.left,
    paddingRight: paper.bleed.right,
  };
}

/** One agent's shade of ink on the receipt: the Token chart's slots, darkest
 * first, told apart by depth rather than hue. */
export function paperAgentColor(index: number, paper: Paper) {
  const depths = [0.88, 0.58, 0.36, 0.2];
  return paper.text(depths[Math.max(0, index) % depths.length] - 0.08);
}
