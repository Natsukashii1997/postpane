// 积压事项 (owner chose 甲 on 2026-11-27, #563; moved 2026-11-28): a section
// below 「正在进行」, its head of the same form, 「积压事项 · n」 and a rule,
// folded until clicked. Opened, each line as the panel lists it under a
// violet WAIT, how long it has waited beside its title, what it asks whole,
// then 「继续」 (back to its session) and 「停止」, which asks once and then
// tells the session the work is off (规范版, owner 2026-11-28).
import { ArrowUpRight, X } from "lucide-react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { usePanelServices } from "../PanelContext";
import { paperOf, usePaper } from "../paper";
import { CardButton } from "../permissions/CardButton";
import { cardFolds } from "../permissions/FoldButton";
import type { LiveSession } from "./agent-board";
import { backlogWaited, STOP_WORDS, stopDecision } from "./backlog";
import type { BacklogSlot } from "./BacklogLine";
import { backlogAsks } from "./fold-store";
import { PlaceRows, SessionsHeading } from "./PlaceRows";
import { removedKey, useRemovedSessions } from "./removed-sessions";

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
  const services = usePanelServices();
  const { remove } = useRemovedSessions();
  const [asking, ask] = backlogAsks.use();
  const stop = (entry: LiveSession) => {
    const decision = stopDecision(entry.approval);
    if (decision && entry.approval && services?.decide)
      void services.decide(entry.approval.id, decision);
    // Nothing that reaches the session: it only leaves the sidebar.
    else remove(entry);
    ask(null);
  };
  const t = (en: string, cn: string) => (zh ? cn : en);
  const slot = (entry: LiveSession): BacklogSlot => {
    const since = backlogWaited(entry, now, zh);
    if (asking !== removedKey(entry))
      return {
        since,
        actions: (
          <>
            <CardButton
              tone="primary"
              light={light}
              icon={<ArrowUpRight size={9} strokeWidth={2.6} />}
              onClick={() => void services?.openSession?.(entry.session)}
            >
              {t("Carry on", "继续")}
            </CardButton>
            <CardButton
              tone="danger"
              light={light}
              icon={<X size={9} strokeWidth={2.6} />}
              onClick={() => ask(removedKey(entry))}
            >
              {t("Stop", "停止")}
            </CardButton>
          </>
        ),
      };
    return {
      since,
      below: (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            margin: "8px 0 2px",
            fontSize: 12,
            color: paper.red,
          }}
        >
          <span style={{ marginRight: "auto" }}>
            {zh
              ? `确定停止？会替你给这个会话发「${STOP_WORDS}」`
              : "Stop it? The session is told the work is off."}
          </span>
          <CardButton tone="confirm" light={light} onClick={() => stop(entry)}>
            {t("Stop", "停止")}
          </CardButton>
          <CardButton tone="secondary" light={light} onClick={() => ask(null)}>
            {t("Cancel", "取消")}
          </CardButton>
        </div>
      ),
    };
  };
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
      {open && (
        <PlaceRows
          snapshot={snapshot}
          entries={entries}
          light={light}
          now={now}
          onStats={onStats}
          backlog={slot}
        />
      )}
    </div>
  );
}
