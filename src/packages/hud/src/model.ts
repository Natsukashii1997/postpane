import hudDefaults from "@agent-hud/protocol/hud-defaults.json";
import { chatgptDesk, type ChatGPTDesk } from "./chatgpt-desk.ts";
import type {
  PanelLayout,
  RequestDecision,
  Snapshot,
} from "@agent-hud/protocol";
import { agentArtworkKey, agentVendorName } from "./agent-artwork";
import { layoutMarks, restingAgents } from "./resting-agents.ts";
import { recentLabel, recentUsage } from "./recent-usage.ts";
import {
  balanceLevel,
  balanceText,
  stubBalance,
  visibleBalances,
} from "./balance-rows.ts";
import { heldUsed } from "./held-reading.ts";
import { START_BADGE } from "./permissions/approval-list.ts";
import { relaysAnswering } from "./relays-answering.ts";
import { relayStamps, type RelayStamps } from "./relay-stamps.ts";
import { quotaRowShown, leadingWindow } from "./quota-rows.ts";
import type { GlowEffect, GlowStyle } from "./HUDGlow";
import type { UsageStyle } from "./usage-meter/arcs";
import { isBusy } from "./stale.ts";
import { peekWork, type PeekWork } from "./workspace.ts";
import {
  moneyAmount,
  snapshotLanguage,
  quotaPercentLabel,
  type QuotaDisplay,
} from "@agent-hud/ui/format";
export { agentVendorName } from "./agent-artwork";

export type HUDMode = "notch" | "logos" | "simple";
export type HUDEdge = "top" | "right" | "bottom" | "left";
export type HUDDecision = RequestDecision;

/** Per-screen placement, with the same defaults and limits as ScreenPlacement.swift. */
export interface HUDConfig {
  panelLayout: PanelLayout;
  mode: HUDMode;
  glowStyle: GlowStyle;
  glowEffect: GlowEffect;
  breathSeconds: number;
  idleBreathSeconds: number;
  breathAmplitude: number;
  glowRange: number;
  glowBlur: number;
  glowBrightness: number;
  glowOutwardOnly: boolean;
  glowGridPitch: number;
  glowGridCore: number;
  glowGridFade: number;
  glowGridDensity: number;
  edge: HUDEdge;
  offset: number;
  /** Native runtime display index; this is not a persistent hardware identity. */
  monitorIndex: number;
  logoSize: number;
  logoEdgeDistance: number;
  gapScale: number;
  showsLogos: boolean;
  simpleSize: number;
  simpleGapScale: number;
  ringWidth: number;
  /** How a Simple mark draws its usage: rings, a segmented ring, bars, or the number alone. */
  simpleStyle: UsageStyle;
  showsNumbers: boolean;
  appearance: "dark" | "light" | "system";
  solidTransparency: number;
  hoverDelayMs: number;
  collapseDelayMs: number;
  requiresOptionToOpen: boolean;
  openImmediatelyAtTop: boolean;
  sessionList: boolean;
  quotaDetails: boolean;
  resetCountdown: boolean;
  tokenUsage: boolean;
  botLogos: boolean;
  panelWidth: number;
  layoutDensity: "comfortable" | "normal" | "compact";
  panelSections: ("blocks" | "tokens" | "sessions")[];
  panelOrder: string[];
  /** Native host measurements; the defaults are a non-notched display's stand-in. */
  hasNotch: boolean;
  notchWidth: number;
  notchHeight: number;
  animations: boolean;
}

export const defaultHUDConfig: HUDConfig = hudDefaults as HUDConfig;

export const HUD_METRICS = {
  // The card's settle time for what waits on it; it moves by lib/motion GEOMETRY.
  duration: 0.4,
  entryDistance: 5,
  collapsedFlare: 8,
  expandedFlare: 16,
  notchRadius: 12,
  fallbackRadius: 10,
  panelRadius: 26,
  defaultPanelHeight: 326,
  cardGap: 6,
  cardRadius: 22,
  bubbleWidth: 196,
  bubbleRadius: 14,
  dockHeight: 26,
  dockTextSize: 9,
  edgeMargin: 3,
  alertWidth: 470,
  alertWing: 112,
  alertPadding: 16,
} as const;

export interface HUDVendor {
  key: string;
  name: string;
  used: number | null;
  /** The last reading's tightest window while every window waits on a failed read; null while `used` stands (`heldUsed`). */
  heldUsed: number | null;
  level: "normal" | "warning" | "critical" | "stale";
  working: number;
  waiting: number;
  /** How many of the `waiting` requests are questions. */
  questions: number;
  /** How many of the `waiting` requests are handoff cards (#245). */
  handoffs: number;
  balance: string | null;
  /** What an agent with no window shows on the strip instead: its last 24 hours in tokens (`recentLabel`); DeepSeek its balance in whole units (`stubBalance`, owner 2026-11-11), the exact one staying in the peek and the panel. */
  usage: string | null;
  quotas: Snapshot["quotas"];
  sessions: Snapshot["sessions"];
  /** Hermes's Feishu bots, which its peek shows instead of a quota. */
  bots?: NonNullable<Snapshot["hermesBots"]>;
  /** ChatGPT's chats and reviews, which its stub and peek show (#145). */
  desk?: ChatGPTDesk;
  /** The 「审」 or 「回」 stamp relays print on this stub (#171, #218). */
  relay?: RelayStamps;
  /** Its peek's 「等你 · 在跑 · 接力」 line (ADR-0001 C3); none for Hermes. */
  work?: PeekWork;
}

/** Artwork identity is authoritative: ChatGPT is the OpenAI mark, Codex its own. */
export function vendorKey(source: string): string {
  return agentArtworkKey(source);
}

export { restingAgents, sourceID, sourcesForMark } from "./resting-agents.ts";

const vendorProjections = new WeakMap<
  Snapshot,
  Map<HUDMode, { value: HUDVendor[]; observedAt: number; expiresAt: number }>
>();

export function vendorsFromSnapshot(
  snapshot: Snapshot,
  mode: HUDMode,
): HUDVendor[] {
  const now = Date.now();
  let byMode = vendorProjections.get(snapshot);
  const cached = byMode?.get(mode);
  if (cached && now >= cached.observedAt && now <= cached.expiresAt)
    return cached.value;
  const resting = restingAgents(snapshot, mode, now);
  const sources = resting.order;
  let expiresAt = resting.expiresAt;
  const value = sources.map((name) => {
    const key = vendorKey(name);
    const quotas = snapshot.quotas.filter((q) => vendorKey(q.vendor) === key);
    const tightest = leadingWindow(quotas);
    const sessions = snapshot.sessions.filter(
      (s) => vendorKey(s.source) === key,
    );
    const balance = quotas.length
      ? undefined
      : snapshot.billing.find((b) => vendorKey(b.vendor) === key);
    const desk =
      key === vendorKey("chatgpt") && !quotas.length
        ? chatgptDesk(snapshot, now, snapshotLanguage(snapshot) === "zh")
        : undefined;
    const relay = relayStamps(
      snapshot,
      key === vendorKey("chatgpt")
        ? "chatgpt"
        : key === "claude" || key === "codex"
          ? key
          : null,
      now,
      desk?.pressing,
    );
    // A review falling overdue changes the stamp with no new snapshot.
    if (relay?.until != null) expiresAt = Math.min(expiresAt, relay.until);
    const deepseekBalances =
      key === "deepseek" && !quotas.length
        ? snapshot.billing.filter((b) => vendorKey(b.vendor) === key)
        : [];
    return {
      key,
      name: agentVendorName(name),
      used: tightest?.usedPercent ?? null,
      heldUsed: heldUsed(quotas, now),
      // An agent billed by balance alone takes its balance's level.
      level:
        tightest?.status ??
        balanceLevel(deepseekBalances) ??
        balance?.level ??
        "stale",
      // In flight, as Open counts working: running or waiting on a request;
      // ChatGPT's mark also counts the relays it is answering, whose
      // conversations may be running sessions themselves.
      working: Math.max(
        sessions.filter(isBusy).length,
        key === vendorKey("chatgpt") ? relaysAnswering(snapshot) : 0,
      ),
      waiting: snapshot.approvals.filter((a) => vendorKey(a.source) === key)
        .length,
      questions: snapshot.approvals.filter(
        (a) =>
          vendorKey(a.source) === key &&
          (a.kind === "question" || Boolean(a.questions?.length)),
      ).length,
      handoffs: snapshot.approvals.filter(
        (a) => vendorKey(a.source) === key && a.badge === START_BADGE,
      ).length,
      balance: deepseekBalances.length
        ? balanceText(deepseekBalances, snapshotLanguage(snapshot))
        : balance
          ? moneyAmount(
              balance.amount,
              balance.currency,
              snapshotLanguage(snapshot),
            )
          : null,
      usage: desk
        ? desk.stub.text
        : quotas.length
          ? null
          : recentLabel(recentUsage(snapshot, key)),
      quotas,
      sessions,
      bots: key === "hermes" ? (snapshot.hermesBots ?? []) : [],
      ...(desk ? { desk } : {}),
      ...(relay ? { relay } : {}),
      work: peekWork(snapshot, key),
    };
  });
  if (!byMode) vendorProjections.set(snapshot, (byMode = new Map()));
  byMode.set(mode, { value, observedAt: now, expiresAt });
  return value;
}

/** A window's short name, as Core names it (the Swift `shortName`). */
export function quotaShortName(quota: {
  name: string;
  shortLabel?: string;
}): string {
  return quota.shortLabel || quota.name;
}

/** The share a Simple mark's ring and number show: its tightest live window, else the one its last reading holds, drawn grey since its level is then "stale". */
export function markUsed(vendor: HUDVendor): number | null {
  return vendor.used ?? vendor.heldUsed;
}

/** The number a Simple HUD writes beside a mark: its tightest window (`markUsed`), else its last 24 hours in tokens, never money (vendors.rs `meter_label`). */
export function meterLabel(vendor: HUDVendor, display?: QuotaDisplay): string {
  const used = markUsed(vendor);
  return used == null
    ? (vendor.usage ?? "--")
    : quotaPercentLabel(used, display);
}

export function statusColor(level: HUDVendor["level"]): string {
  return level === "critical"
    ? "#ff453a"
    : level === "warning"
      ? "#ffd23f"
      : level === "normal"
        ? "#3ddc84"
        : "#8e8e93";
}

/** HUDAgentOrder.swift: named marks in order; an unavailable list never empties a HUD. */
export function configuredVendors(
  snapshot: Snapshot,
  config: HUDConfig,
): HUDVendor[] {
  const available = vendorsFromSnapshot(snapshot, config.mode).map((vendor) => {
    if (vendor.quotas.length) return withShownRows(vendor, config.panelLayout);
    if (vendor.key !== "deepseek") return vendor;
    const rows = snapshot.billing.filter(
      (row) => vendorKey(row.vendor) === vendor.key,
    );
    if (!rows.length) return vendor;
    const block = config.panelLayout.blocks?.[`api:${rows[0].vendor}`] ?? {};
    const visible = visibleBalances(rows, block);
    return {
      ...vendor,
      balance: balanceText(visible, snapshotLanguage(snapshot)),
      level: balanceLevel(visible) ?? "stale",
      usage: stubBalance(visible, snapshotLanguage(snapshot)),
    };
  });
  return layoutMarks(available, config.panelLayout);
}

/** An agent without the rows the hover panel hides: its peek lists, and its
 * mark leads with, only the windows the panel shows. */
function withShownRows(vendor: HUDVendor, layout: PanelLayout): HUDVendor {
  const quotas = vendor.quotas.filter((row) => quotaRowShown(row, layout));
  if (quotas.length === vendor.quotas.length) return vendor;
  const tightest = leadingWindow(quotas);
  return {
    ...vendor,
    quotas,
    used: tightest?.usedPercent ?? null,
    heldUsed: heldUsed(quotas, Date.now()),
    level: tightest?.status ?? "stale",
  };
}

export {
  blockRows,
  inRowOrder,
  quotaAccountKey,
  quotaRowHidden,
  quotaRowKey,
  quotaRowMatches,
  withRowShown,
} from "./quota-rows.ts";
