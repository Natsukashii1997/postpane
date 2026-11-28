// ChatGPT's relays on its card (#427, the owner chose 甲 on 2026-11-19): in
// 「等待处理」 those that are the person's, in 「正在进行」 those under way and
// the quiet; each its 「接力 n/m」 tag, task, when it last moved and where it
// stands, the whole row opening its handoff card among the card's relays.
import { useState } from "react";
import { useFormat } from "@agent-hud/ui/format-context";
import { clock, progressLine } from "../alerts/handoff-card";
import { useHandoffCard } from "../alerts/HandoffCard";
import { usePaper } from "../paper";
import { FoldRow, FoldRows } from "../permissions/FoldButton";
import type { GroupedRelay } from "../relay-groups";
import { useBoardInks } from "./AgentBoard";
import { RelayTag } from "./RelayTag";
import { GRID, tabular } from "./theme";

export function RelayRows({
  relays,
  among,
  now,
  light,
  first = true,
  ruleAfter = false,
}: {
  relays: readonly GroupedRelay[];
  /** Every relay on the card, the order its handoff card steps through. */
  among: readonly string[];
  now: number;
  light: boolean;
  /** The section's first rows: no rule above the first. */
  first?: boolean;
  /** Rows follow in the same section: a rule under the last. */
  ruleAfter?: boolean;
}) {
  const zh = useFormat().language === "zh";
  const inks = useBoardInks(light);
  const paper = usePaper();
  const card = useHandoffCard();
  const [hover, setHover] = useState<string | null>(null);
  const tone = {
    need: inks.red,
    move: paper?.blue ?? inks.secondary,
    quiet: inks.tertiary,
  };
  return (
    <>
      <FoldRows>
        {relays.map((entry, index) => {
          const open = card
            ? () => card.open(entry.handoff.id, among)
            : undefined;
          const last = index === relays.length - 1;
          return (
            <FoldRow key={entry.handoff.id}>
              <div
                className="hud-relay-row"
                role={open ? "button" : undefined}
                tabIndex={open ? 0 : undefined}
                title={entry.handoff.halt ?? entry.handoff.title}
                onClick={open}
                onKeyDown={(event) => {
                  if (!open || (event.key !== "Enter" && event.key !== " "))
                    return;
                  event.preventDefault();
                  open();
                }}
                onPointerEnter={() => setHover(entry.handoff.id)}
                onPointerLeave={() => setHover(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0, 1fr) auto",
                  columnGap: GRID.gap,
                  alignItems: "center",
                  padding: "8px 6px 8px 0",
                  cursor: open ? "pointer" : undefined,
                  opacity: hover === entry.handoff.id ? 0.78 : 1,
                  borderTop:
                    first && index === 0
                      ? undefined
                      : `1px dotted ${inks.divider}`,
                  borderBottom:
                    ruleAfter && last
                      ? `1px dotted ${inks.divider}`
                      : undefined,
                }}
              >
                <RelayTag
                  handoff={entry.handoff}
                  zh={zh}
                  color={tone[entry.group]}
                />
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: entry.group === "quiet" ? inks.secondary : inks.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {entry.handoff.title}
                </span>
                <span
                  style={{ ...tabular, fontSize: 11.5, color: inks.tertiary }}
                >
                  {clock(entry.at)}
                </span>
                <span
                  style={{
                    gridColumn: "2 / 4",
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: entry.group === "need" ? 600 : 400,
                    color:
                      entry.group === "need"
                        ? inks.red
                        : entry.group === "quiet"
                          ? inks.tertiary
                          : inks.secondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {entry.group === "quiet"
                    ? `${progressLine(entry.handoff, now, zh)} · ${zh ? "静着" : "quiet"}`
                    : progressLine(entry.handoff, now, zh)}
                </span>
              </div>
            </FoldRow>
          );
        })}
      </FoldRows>
    </>
  );
}
