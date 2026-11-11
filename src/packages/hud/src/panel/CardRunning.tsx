import { useState } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { handoffFor } from "../alerts/handoff-card";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import { SectionTitle, cardInks } from "../permissions/ListCard";
import { runningForMark } from "./running-rows";
import {
  removedKey,
  shownSessions,
  useRemovedSessions,
} from "./removed-sessions";
import { LiveRow } from "./SessionsSection";

/** 「正在进行」at the foot of an agent's news card (#307, owner chose 甲 on
 * 2026-11-11): while it has news its mark shows the card, not its panel, so
 * its sessions at work are listed here, each row as the panel's own. */
export function CardRunning({
  snapshot,
  mark,
  light,
}: {
  snapshot: Snapshot;
  /** The source of the news in front: whose sessions to list. */
  mark: string;
  light: boolean;
}) {
  const { language } = useFormat();
  const inks = cardInks(usePaper(), light);
  const { removed, remove } = useRemovedSessions();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const live = shownSessions(runningForMark(snapshot, mark), removed);
  if (!live.length) return null;
  const now = Date.parse(snapshot.generatedAt);
  return (
    <div className="hud-card-running" style={cardColumn(0)}>
      <SectionTitle inks={inks}>
        {language === "zh" ? "正在进行" : "In progress"} · {live.length}
      </SectionTitle>
      {live.map((entry, index) => (
        <LiveRow
          key={removedKey(entry)}
          entry={entry}
          handoff={handoffFor(
            snapshot.handoffs,
            entry.session.source,
            entry.session.id,
          )}
          waits={
            entry.session.source === "claude"
              ? snapshot.relayLaunches?.find(
                  (launch) => launch.session === entry.session.id,
                )
              : undefined
          }
          now={now}
          light={light}
          first={index === 0}
          last={index === live.length - 1}
          open={openKey === removedKey(entry)}
          onOpen={(open) =>
            setOpenKey((key) =>
              open ? removedKey(entry) : key === removedKey(entry) ? null : key,
            )
          }
          onRemove={() => {
            setOpenKey(null);
            remove(entry);
          }}
        />
      ))}
      <div style={{ height: 6 }} />
    </div>
  );
}
