import type { ComponentType, CSSProperties } from "react";
import { DollarSign, Flame, Gauge, Percent, Sigma } from "lucide-react";
import type { QuotaMeasure } from "@agent-hud/protocol";
import { hudPalette, type Ground } from "../tokens";

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

/** A receipt section's small, letter-spaced title (#22), in the dim ink. */
export const receiptTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  lineHeight: "13px",
  letterSpacing: "0.2em",
};

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

/** The receipt the hover panel is printed on (#22): light paper with dark
 * ink, or dark paper with light ink, as the stubs beside it. */
const PAPER = {
  light: {
    paper: "#f3f1eb",
    ink: "#2a2925",
    dim: "#77736a",
    faint: "rgba(42,41,37,.45)",
    line: "rgba(42,41,37,.3)",
    fill: "rgba(42,41,37,.08)",
    red: "#c4261e",
  },
  dark: {
    paper: "#2b2925",
    ink: "#ece7dc",
    dim: "#a39d90",
    faint: "rgba(236,231,220,.42)",
    line: "rgba(236,231,220,.26)",
    fill: "rgba(236,231,220,.08)",
    red: "#ff6a57",
  },
} as const;
export function paperColors(light: boolean) {
  return PAPER[light ? "light" : "dark"];
}

/** The stubs' condensed face, for the figures a receipt prints. */
export const condensed =
  '"Avenir Next Condensed", "DIN Condensed", "Arial Narrow", sans-serif';

/** The panel's tokens on `ground`: the light or dark HUD's, opaque or on a
 * ground the desktop shows through (`hud/tokens.ts`, Open's Theme.under);
 * on the receipt, its greys and hairlines are the paper's ink. */
export function palette(ground: Ground) {
  const colors = hudPalette(ground);
  if (!ground.paper) return colors;
  const paper = paperColors(ground.light);
  return {
    ...colors,
    text: paper.ink,
    secondary: paper.dim,
    tertiary: paper.faint,
    divider: paper.line,
    track: paper.fill,
    selected: paper.fill,
  };
}
