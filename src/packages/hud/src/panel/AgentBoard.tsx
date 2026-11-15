// The hover panel's quota board (issue #52, the owner's 甲 · 额度看板): the
// agent's name, plan and a stamp saying whether its quotas last until their
// resets; a sentence under it; and one row per quota with its share, when it
// resets, a bold bar marking where the pace takes it by the reset (hatched)
// and where a steady pace would have it now (amber).
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Quota } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { quotaPercentLabel } from "@agent-hud/ui/format";
import { usePanelServices } from "../PanelContext";
import { PAPER_FIGURES, paperLevel, usePaper } from "../paper";
import { tabular, usePanelPalette } from "./theme";
import {
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
              // The red hatching is toned down so it warns without glaring.
              opacity: outlook.runsOut ? 0.55 : 1,
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
