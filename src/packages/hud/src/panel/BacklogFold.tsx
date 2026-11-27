// 积压事项 (owner chose 甲 on 2026-11-27, #563; moved 2026-11-28): a section
// below 「正在进行」, its head of the same form, 「积压事项 · n」 and a rule,
// folded until clicked; opened, each line as the panel lists it, then 「继续」
// (back to its session) and 「不做了」, which asks once and then tells the
// session the work is off.
import { useState, type CSSProperties } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { usePanelServices } from "../PanelContext";
import { paperOf, usePaper } from "../paper";
import { cardFolds } from "../permissions/FoldButton";
import { cardInks } from "../permissions/ListCard";
import type { LiveSession } from "./agent-board";
import { STOP_WORDS, stopDecision } from "./backlog";
import { PlaceRows, SessionsHeading } from "./PlaceRows";
import { removedKey, useRemovedSessions } from "./removed-sessions";
import { GRID } from "./theme";

export function BacklogFold({
  snapshot,
  entries,
  light,
  now,
  place,
  onStats,
}: {
  snapshot: Snapshot;
  entries: readonly LiveSession[];
  light: boolean;
  now: number;
  place?: string;
  onStats?: () => void;
}) {
  const zh = useFormat().language === "zh";
  const [open, toggle] = cardFolds.use(`${place ?? "card"}:backlog`);
  const paper = usePaper() ?? paperOf(light);
  const inks = cardInks(paper, light);
  const services = usePanelServices();
  const { remove } = useRemovedSessions();
  const [asking, setAsking] = useState<string | null>(null);
  const stop = (entry: LiveSession) => {
    const decision = stopDecision(entry.approval);
    if (decision && entry.approval && services?.decide)
      void services.decide(entry.approval.id, decision);
    // Nothing that reaches the session: it only leaves the sidebar.
    else remove(entry);
    setAsking(null);
  };
  const button = (color: string, edge: string): CSSProperties => ({
    height: 22,
    padding: "0 9px",
    borderRadius: 4,
    border: `1px solid ${edge}`,
    background: "transparent",
    color,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  });
  if (!entries.length) return null;
  return (
    <div className="hud-backlog">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        style={{
          display: "block",
          width: "100%",
          padding: "8px 0 0",
          border: 0,
          background: "transparent",
          textAlign: "left",
          font: "inherit",
          cursor: "pointer",
        }}
      >
        <SessionsHeading light={light} count={entries.length}>
          {zh ? "积压事项" : "BACKLOG"}
        </SessionsHeading>
      </button>
      {open &&
        entries.map((entry) => {
          const key = removedKey(entry);
          return (
            <div key={key} style={{ borderTop: `1px dotted ${inks.line}` }}>
              <PlaceRows
                snapshot={snapshot}
                entries={[entry]}
                light={light}
                now={now}
                onStats={onStats}
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                  padding: `0 0 10px ${GRID.text}px`,
                  fontSize: 11,
                }}
              >
                {asking === key ? (
                  <>
                    <span style={{ color: paper.red }}>
                      {zh
                        ? `确定不做了？会替你给这个会话发「${STOP_WORDS}」`
                        : "Stop it? The session is told the work is off."}
                    </span>
                    <button
                      type="button"
                      onClick={() => stop(entry)}
                      style={button(paper.red, paper.red)}
                    >
                      {zh ? "确定不做了" : "Stop it"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsking(null)}
                      style={button(inks.dim, inks.line)}
                    >
                      {zh ? "取消" : "Cancel"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void services?.openSession?.(entry.session)
                      }
                      style={button(inks.ink, inks.faint)}
                    >
                      {zh ? "继续" : "Carry on"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsking(key)}
                      style={button(paper.red, paper.red)}
                    >
                      {zh ? "不做了" : "Stop"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
