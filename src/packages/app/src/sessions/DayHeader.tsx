// A day's header in the Sessions list, split from SessionListSection: its
// look changes with the fold under it, so its two states cross fade.
import type { CSSProperties, ReactNode } from "react";
import { moves } from "../lib/Motion";
import { rowColumns, rowGap } from "./SessionListSection";
import { clipped, numeric, plain, row, type Theme } from "./SessionTheme";

/** Labels laid on one spot of a grid cell, one shown at a time. */
const stacked: CSSProperties = { gridArea: "1 / 1", ...numeric, ...clipped };
const shownIf = (on: boolean): CSSProperties => ({
  opacity: on ? 1 : 0,
  transition: moves("quick", "opacity"),
});

/** A day's header over its rows, on the rows' columns: its name and counts, then what the columns hold or, folded, what its sessions spent. */
export function DayHeader({
  title,
  count,
  open,
  folded,
  theme,
  onToggle,
  chevron,
}: {
  title: string;
  count: number;
  open: boolean;
  /** What the day spent, shown while it is folded. */
  folded: string;
  theme: Theme;
  /** Folds or opens the day; a list without days (Active) has nothing to fold. */
  onToggle?: () => void;
  chevron: ReactNode;
}) {
  const zh = Boolean(theme.zh);
  const Element = onToggle ? "button" : "div";
  return (
    <Element
      {...(onToggle
        ? { type: "button" as const, onClick: onToggle, "aria-expanded": open }
        : {})}
      style={{
        ...plain,
        cursor: onToggle ? "pointer" : "default",
        width: "100%",
        display: "grid",
        gridTemplateColumns: rowColumns,
        columnGap: rowGap,
        alignItems: "baseline",
        padding: open ? "0 15px" : "9px 15px", // at once: the fold moves
        borderRadius: 10,
        border: open ? "1px solid transparent" : `1px solid ${theme.border}`,
        background: open ? "transparent" : theme.card,
        marginBottom: open ? 6 : 8,
        color: theme.secondary,
        transition: moves("quick", "background-color", "border-color"),
      }}
    >
      <span style={{ ...row, gap: 6, alignItems: "baseline" }}>
        {chevron}
        <strong style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
          {title}
        </strong>
        <span style={{ fontSize: 11, ...numeric }}>{count}</span>
      </span>
      <span style={{ fontSize: 11, ...clipped, ...shownIf(open) }}>
        {zh ? "每轮新增 Token" : "New tokens per turn"}
      </span>
      {/* The open day's column names and the folded day's sums lie on one
          spot and cross fade with the middle column, not one after it. */}
      <span
        style={{
          display: "grid",
          minWidth: 0,
          fontSize: 11,
          textAlign: "right",
        }}
      >
        <span style={{ ...stacked, ...shownIf(open) }}>
          {zh ? "Token · 上下文" : "Tokens · context"}
        </span>
        <span style={{ ...stacked, ...shownIf(!open) }}>{folded}</span>
      </span>
    </Element>
  );
}
