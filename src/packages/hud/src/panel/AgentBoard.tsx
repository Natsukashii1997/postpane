// The hover panel's quota board (issue #52, the owner's 甲 · 额度看板): the
// agent's name, plan and a stamp saying whether its quotas last until their
// resets; a sentence under it; and one row per quota with its share, when it
// resets, a bold bar marking where the pace takes it by the reset (hatched)
// and where a steady pace would have it now (amber).
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Quota, Snapshot, StatisticsResponse } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import {
  dateFormat,
  quotaPercentLabel,
  systemTimeZone,
} from "@agent-hud/ui/format";
import { usePanelQuery, usePanelServices } from "../PanelContext";
import { PAPER_FIGURES, PAPER_SEAL, paperLevel, usePaper } from "../paper";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { agentArtworkKey, agentVendorName } from "../agent-artwork";
import { tabular, usePanelPalette, type Logo } from "./theme";
import {
  type BoardStamp,
  boardVerdict,
  quotaLevel,
  quotaNote,
  quotaOutlook,
  resetText,
  type Words,
} from "./agent-board";
import { quotaWindowLabel } from "./window-labels";
import { quotaCredits } from "../quota-rows";

/** The board's inks where it is drawn: on the receipt's paper, or on the
 * HUD's own ground. */
export function useBoardInks(light: boolean) {
  const colors = usePanelPalette(light);
  const paper = usePaper();
  return useMemo(
    () =>
      paper
        ? {
            ...colors,
            green: paper.green,
            red: paper.red,
            amber: paperLevel("warning", paper),
            fill: paper.ink,
            hatch: paper.text(0.42),
            field: paper.fill,
            bar: paper.text(0.55),
            figures: PAPER_FIGURES as string | undefined,
          }
        : {
            ...colors,
            green: colors.okText,
            red: colors.criticalText,
            amber: colors.warning,
            fill: colors.text,
            hatch: colors.tertiary,
            field: colors.track,
            bar: colors.secondary,
            figures: undefined as string | undefined,
          },
    [colors, paper],
  );
}

/** The resting strip's stub paper on a dark screen (HUDMarkStrip). */
const STUB_PAPER = "#e9e6de";

const STAMP_WORDS = {
  enough: {
    zh: "够用",
    en: "OK",
    zhAria: "额度够用",
    enAria: "Quota is enough",
  },
  tight: {
    zh: "吃紧",
    en: "TIGHT",
    zhAria: "额度吃紧",
    enAria: "Quota is tight",
  },
  unknown: {
    zh: "未知",
    en: "N/A",
    zhAria: "额度情况未知",
    enAria: "Quota outlook unknown",
  },
} as const;

/** The 够用 / 吃紧 / 未知 stamp: a ring tilted like a rubber stamp. */
function Stamp({ kind, light }: { kind: BoardStamp; light: boolean }) {
  const inks = useBoardInks(light);
  const zh = useFormat().language === "zh";
  const color =
    kind === "tight" ? inks.red : kind === "enough" ? inks.green : inks.hatch;
  const words = STAMP_WORDS[kind];
  const label = zh ? words.zh : words.en;
  return (
    <span
      role="img"
      aria-label={zh ? words.zhAria : words.enAria}
      style={{
        width: 44,
        height: 44,
        flex: "none",
        boxSizing: "border-box",
        border: `2px solid ${color}`,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        color,
        fontFamily: zh ? PAPER_SEAL : undefined,
        fontSize: zh ? 13 : 10.5,
        fontWeight: 700,
        letterSpacing: zh ? 0 : "0.06em",
        transform: "rotate(-14deg)",
      }}
    >
      {label}
    </span>
  );
}

/** The board's head: the agent's mark and name, its plan, and the stamp. */
export function BoardHeading({
  vendor,
  Logo,
  light,
  plan,
  stamp,
}: {
  vendor: string;
  Logo: Logo;
  light: boolean;
  plan?: string | null;
  stamp?: BoardStamp | null;
}) {
  const inks = useBoardInks(light);
  const paper = usePaper();
  const portraitChip =
    agentArtworkKey(vendor) === "hermes" && !(paper ? paper.light : light);
  return (
    <div
      className="hud-source-provider-heading"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        paddingBottom: 6,
        // A tear under the head, from one side of the paper to the other.
        ...(paper
          ? {
              borderBottom: `1.2px dashed ${paper.line}`,
              marginLeft: -paper.bleed.left,
              marginRight: -paper.bleed.right,
              paddingLeft: paper.bleed.left + 6,
              paddingRight: paper.bleed.right + 6,
            }
          : {
              boxShadow: `inset 0 -1px 0 ${inks.divider}`,
              paddingLeft: 6,
              paddingRight: 6,
            }),
      }}
    >
      {portraitChip ? (
        // Hermes is a black-haired girl drawn in ink: on dark paper she sits
        // on a slip of the strip's light stub paper (owner, 2026-11-06).
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            flex: "none",
            width: 24,
            height: 24,
            borderRadius: 5,
            background: STUB_PAPER,
          }}
        >
          <Logo source={vendor} size={20} light />
        </span>
      ) : (
        <span style={{ display: "inline-flex", flex: "none" }}>
          <Logo source={vendor} size={20} light={light} />
        </span>
      )}
      <strong style={{ fontSize: 15, fontWeight: 600, color: inks.text }}>
        {agentVendorName(vendor)}
      </strong>
      {plan && (
        <ApprovalTag
          label={plan.toUpperCase()}
          tone="permission"
          light={light}
          color={inks.secondary}
        />
      )}
      <span style={{ flex: 1 }} />
      {stamp && <Stamp kind={stamp} light={light} />}
    </div>
  );
}

function Sentence({ words, light }: { words: Words; light: boolean }) {
  const inks = useBoardInks(light);
  return (
    <div
      className="hud-board-verdict"
      style={{
        padding: "2px 6px 0",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: inks.secondary,
      }}
    >
      {words.map((word, index) =>
        word.strong ? (
          <b key={index} style={{ fontWeight: 600, color: inks.text }}>
            {word.text}
          </b>
        ) : (
          <span key={index}>{word.text}</span>
        ),
      )}
    </div>
  );
}

/** The verdict for these rows, for the heading's stamp. */
export function useBoardVerdict(rows: readonly Quota[], now: number) {
  const { language } = useFormat();
  return useMemo(
    () => boardVerdict(rows, now, language),
    [rows, now, language],
  );
}

/** One quota: its name, share and reset, the bar, and the line under it. */
function QuotaLine({
  row,
  now,
  light,
  countdown,
  onStats,
}: {
  row: Quota;
  now: number;
  light: boolean;
  countdown: boolean;
  onStats?: () => void;
}) {
  const inks = useBoardInks(light);
  const format = useFormat();
  const services = usePanelServices();
  const [hovered, setHovered] = useState(false);
  const clickable = Boolean(services?.selectProvider || onStats);
  const activate = () => {
    services?.selectProvider?.(row.vendor);
    onStats?.();
  };
  const outlook = quotaOutlook(row);
  const note = quotaNote(row, now, format.language, format.quotaDisplay);
  const reset = countdown
    ? resetText(
        row.resetAt,
        now,
        format.calendar,
        format.language,
        quotaCredits(row) != null,
      )
    : null;
  const name = quotaWindowLabel(row, format.language);
  const ink = quotaLevel(row);
  const level =
    ink === "critical"
      ? inks.criticalText
      : ink === "warning"
        ? inks.warningText
        : outlook.live
          ? inks.text
          : inks.secondary;
  const used = outlook.used ?? 0;
  return (
    <div
      className="hud-source-quota-row"
      title={row.name}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={clickable ? activate : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 64px 150px",
        columnGap: 12,
        alignItems: "baseline",
        padding: "6px 6px",
        borderRadius: 4,
        cursor: clickable ? "pointer" : undefined,
        background: hovered && clickable ? inks.selected : "transparent",
        transition: "background 0.12s ease",
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: inks.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {name}
      </span>
      <span
        style={{
          ...tabular,
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1,
          textAlign: "right",
          whiteSpace: "nowrap",
          color: level,
          ...(inks.figures && {
            fontFamily: inks.figures,
            fontSize: 22,
            fontWeight: 700,
          }),
        }}
      >
        {outlook.live || row.usedPercent != null
          ? quotaPercentLabel(row.usedPercent, format.quotaDisplay)
          : "--"}
      </span>
      <span
        style={{
          ...tabular,
          fontSize: 12,
          color: inks.secondary,
          textAlign: "right",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {reset ?? ""}
      </span>
      <span
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={outlook.used ?? undefined}
        style={{
          gridColumn: "1 / 4",
          position: "relative",
          height: 6,
          marginTop: 9,
          background: inks.field,
          borderRadius: 1,
        }}
      >
        {outlook.projected != null && outlook.projected > used && (
          // Where the current pace takes it by the reset.
          <i
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${used}%`,
              width: `${outlook.projected - used}%`,
              display: "block",
              background: `repeating-linear-gradient(135deg, ${
                outlook.runsOut ? inks.red : inks.hatch
              } 0 2px, transparent 2px 4px)`,
            }}
          />
        )}
        <i
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${used}%`,
            display: "block",
            borderRadius: 1,
            background: outlook.live
              ? outlook.exhausted
                ? inks.red
                : inks.fill
              : inks.secondary,
          }}
        />
        {outlook.expected != null && (
          // Where a steady pace through the cycle would have it now.
          <i
            aria-hidden
            style={{
              position: "absolute",
              top: -4,
              bottom: -4,
              left: `calc(${outlook.expected}% - 1px)`,
              width: 2,
              display: "block",
              background: inks.amber,
            }}
          />
        )}
      </span>
      {note && (
        <span
          style={{
            gridColumn: "1 / 4",
            marginTop: 7,
            fontSize: 12,
            color: note.warn ? inks.red : inks.secondary,
            ...tabular,
          }}
        >
          {note.text}
        </span>
      )}
    </div>
  );
}

/** The sentence under the head: whether the quotas last until their resets. */
export function BoardSentence({
  rows,
  now,
  light,
}: {
  rows: readonly Quota[];
  now: number;
  light: boolean;
}) {
  const { words } = useBoardVerdict(rows, now);
  return words ? <Sentence words={words} light={light} /> : null;
}

/** One line per quota. */
export function BoardRows({
  rows,
  now,
  light,
  countdown,
  onStats,
}: {
  rows: Quota[];
  now: number;
  light: boolean;
  countdown: boolean;
  onStats?: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {rows.map((row) => (
        <QuotaLine
          key={row.id}
          row={row}
          now={now}
          light={light}
          countdown={countdown}
          onStats={onStats}
        />
      ))}
    </div>
  );
}

/** What the bars' marks mean, where a bar draws them. */
export function BoardKey({
  rows,
  light,
}: {
  rows: readonly Quota[];
  light: boolean;
}) {
  const inks = useBoardInks(light);
  const zh = useFormat().language === "zh";
  if (!rows.some((row) => quotaOutlook(row).projected != null)) return null;
  return (
    <div
      className="hud-board-key"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 14px",
        padding: "2px 6px 0",
        fontSize: 11,
        color: inks.tertiary,
      }}
    >
      <Key swatch={{ background: inks.fill }}>{zh ? "已用" : "Used"}</Key>
      <Key
        swatch={{
          background: `repeating-linear-gradient(135deg, ${inks.hatch} 0 2px, transparent 2px 4px)`,
        }}
      >
        {zh ? "照速度到重置" : "At this pace by reset"}
      </Key>
      <Key swatch={{ width: 2, height: 10, background: inks.amber }}>
        {zh ? "平均用到现在该到的位置" : "Steady pace so far"}
      </Key>
    </div>
  );
}

function Key({
  swatch,
  children,
}: {
  swatch: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <i style={{ display: "inline-block", width: 12, height: 6, ...swatch }} />
      {children}
    </span>
  );
}

/** The last 24 hours of tokens, an hour a bar, for the agents `providers`
 * names (every agent without). */
export function useDayTokens(
  snapshot: Snapshot,
  providers: string[] | undefined,
  active: boolean,
) {
  const now = Date.parse(snapshot.generatedAt);
  const to = Math.ceil(now / 3_600_000) * 3_600_000;
  const from = to - 86_400_000;
  const query = usePanelQuery<StatisticsResponse>(
    "statistics",
    {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      bucketMinutes: 60,
      timeZone: systemTimeZone(),
      tokenKinds: ["input", "output", "cacheRead", "cacheWrite", "reasoning"],
      ...(providers ? { providers } : {}),
    },
    snapshot.statisticsRevision,
    active,
  );
  const points = query.data
    ? query.data.buckets.map((bucket) => bucket.selectedTokens)
    : providers
      ? []
      : snapshot.timeline
          .filter((point) => {
            const at = Date.parse(point.timestamp);
            return at >= from && at < to;
          })
          .map((point) => point.tokens);
  // Until the answer comes, the providers' own last 24 hours.
  const recent = snapshot.providers
    .filter((provider) => !providers || providers.includes(provider.id))
    .reduce((sum, provider) => sum + (provider.recent?.tokens ?? 0), 0);
  const total = query.data?.totals.selectedTokens ?? recent;
  return { from, to, points, total };
}

/** The day's tokens as bars, the current hour's in red; with `axis`, the
 * hours under them. */
export function DayBars({
  points,
  from,
  height,
  light,
  axis = false,
}: {
  points: number[];
  from: number;
  height: number;
  light: boolean;
  axis?: boolean;
}) {
  const inks = useBoardInks(light);
  const { language, calendar } = useFormat();
  const peak = Math.max(1, ...points);
  const time = dateFormat(language === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: calendar.timeZone,
  });
  const ticks = [0, 6, 12, 18].map((hours, index) => {
    const label = time.format(from + hours * 3_600_000);
    return index === 0 ? (language === "zh" ? `昨天 ${label}` : label) : label;
  });
  return (
    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <div
        aria-hidden
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height,
        }}
      >
        {(points.length ? points : Array(24).fill(0)).map((tokens, index) => (
          <span
            key={index}
            style={{
              flex: 1,
              minHeight: 1,
              height: `${(tokens / peak) * 100}%`,
              borderRadius: "1px 1px 0 0",
              background:
                index === points.length - 1 && tokens > 0 ? inks.red : inks.bar,
              opacity: tokens > 0 ? 0.9 : 0.35,
            }}
          />
        ))}
      </div>
      {axis && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10.5,
            color: inks.tertiary,
            ...tabular,
          }}
        >
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
          <span>{language === "zh" ? "现在" : "Now"}</span>
        </div>
      )}
    </div>
  );
}
