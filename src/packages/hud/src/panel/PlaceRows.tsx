// A place's sessions on the panel (ADR-0001 C1, owner chose 甲 on
// 2026-11-14): each row the panel's own `LiveRow`; past three running ones
// they fold into one line 「在跑 n」 that opens to show them all. The board
// lists them under each place's block, the one-agent panel under its own.
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { handoffFor } from "../alerts/handoff-card";
import { agentArtworkKey } from "../agent-artwork";
import { isReview } from "../chatgpt-desk";
import { ApprovalTag } from "../permissions/ApprovalTag";
import type { LiveSession } from "./agent-board";
import { useBoardInks } from "./AgentBoard";
import { placeRows } from "./place-sessions";
import { removedKey, useRemovedSessions } from "./removed-sessions";
import { ReviewRows } from "./ReviewSlip";
import { RunningMark } from "./RunningMark";
import { LiveRow } from "./SessionsSection";
import { noButtonChrome, tabular } from "./theme";

/** The places whose running rows are open: shared, so the panel's hidden
 * measuring copy (HUDScene) opens with the one in view and the panel grows
 * to fit; kept until the app restarts. */
const unfolded = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function useUnfolded(place?: string): [boolean, () => void] {
  const open = useSyncExternalStore(subscribe, () =>
    Boolean(place && unfolded.has(place)),
  );
  const toggle = () => {
    if (!place) return;
    if (!unfolded.delete(place)) unfolded.add(place);
    listeners.forEach((listener) => listener());
  };
  return [open, toggle];
}

/** The rows of one list. With `fold`, the place they belong to, those
 * waiting come first, 「待核对」 last, then the running ones, folded past
 * three; without, as given. */
export function PlaceRows({
  snapshot,
  entries,
  light,
  now,
  onStats,
  fold,
}: {
  snapshot: Snapshot;
  entries: readonly LiveSession[];
  light: boolean;
  now: number;
  onStats?: () => void;
  fold?: string;
}) {
  const zh = useFormat().language === "zh";
  const inks = useBoardInks(light);
  const { remove } = useRemovedSessions();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [open, toggle] = useUnfolded(fold && agentArtworkKey(fold));
  const rows = fold
    ? placeRows(entries, open)
    : { waiting: entries, running: [], folded: 0 };
  const tagWide = entries.some((entry) => entry.status === "waiting");
  const count =
    rows.waiting.length + rows.running.length + (rows.folded ? 1 : 0);
  const row = (entry: LiveSession, index: number) => (
    <LiveRow
      key={removedKey(entry)}
      entry={entry}
      tagWide={tagWide}
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
      last={index === count - 1}
      onStats={onStats}
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
  );
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <>
      {rows.waiting.map((entry, index) => row(entry, index))}
      {rows.folded > 0 && (
        <button
          type="button"
          className="hud-running-fold"
          aria-expanded={open}
          onClick={toggle}
          style={{
            ...noButtonChrome,
            display: "grid",
            width: "100%",
            boxSizing: "border-box",
            gridTemplateColumns: "auto minmax(0, 1fr) 26px",
            columnGap: 10,
            alignItems: "center",
            padding: "8px 6px",
            textAlign: "left",
            cursor: "pointer",
            borderTop: rows.waiting.length
              ? `1px dotted ${inks.divider}`
              : undefined,
          }}
        >
          <span style={{ display: "grid", justifyItems: "start" }}>
            {tagWide && (
              <span
                aria-hidden
                style={{ gridArea: "1 / 1", visibility: "hidden" }}
              >
                <ApprovalTag
                  label={zh ? "等你" : "WAITING"}
                  tone="ask"
                  light={light}
                />
              </span>
            )}
            <span style={{ gridArea: "1 / 1", alignSelf: "center" }}>
              <RunningMark label={zh ? "在跑" : "Running"} color={inks.green} />
            </span>
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: inks.text,
                ...tabular,
              }}
            >
              {zh ? `在跑 ${rows.folded}` : `${rows.folded} running`}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: inks.secondary,
              }}
            >
              {open ? (zh ? "收起" : "Fold") : zh ? "点开看全部" : "Show all"}
            </span>
          </span>
          <Chevron
            aria-hidden
            size={14}
            strokeWidth={1.7}
            style={{ justifySelf: "center", color: inks.secondary }}
          />
        </button>
      )}
      {rows.running.map((entry, index) =>
        row(entry, rows.waiting.length + (rows.folded ? 1 : 0) + index),
      )}
    </>
  );
}

/** A sessions list's head: 「正在进行」 over a rule, with its count. */
export function SessionsHeading({
  light,
  count,
  children,
}: {
  light: boolean;
  count: ReactNode;
  children: ReactNode;
}) {
  const inks = useBoardInks(light);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 6px 4px",
        fontSize: 11.5,
        letterSpacing: "0.06em",
        color: inks.secondary,
      }}
    >
      <span>{children}</span>
      <span
        style={{ flex: 1, borderTop: `1px solid ${inks.divider}`, order: 1 }}
      />
      <span style={{ order: 2, letterSpacing: 0, ...tabular }}>{count}</span>
    </div>
  );
}

/** A place's sessions under its block on the board: its own, then ChatGPT's
 * reviews on their slip (#145), as the one-agent panel lists them. */
export function BlockSessions({
  snapshot,
  source,
  rows,
  light,
  onStats,
}: {
  snapshot: Snapshot;
  /** The place's agent: its running rows fold by it. */
  source: string;
  rows: readonly LiveSession[];
  light: boolean;
  onStats?: () => void;
}) {
  const zh = useFormat().language === "zh";
  if (!rows.length) return null;
  const now = Date.parse(snapshot.generatedAt);
  const handoffs = snapshot.handoffs ?? [];
  const review = (entry: LiveSession) =>
    entry.session.source === "chatgpt" && isReview(entry.session, handoffs);
  const lower = rows.filter(review);
  return (
    <section
      className="hud-block-sessions"
      style={{ display: "grid", gap: 0, fontSize: 12 }}
    >
      <SessionsHeading light={light} count={rows.length}>
        {zh ? "正在进行" : "IN PROGRESS"}
      </SessionsHeading>
      <PlaceRows
        snapshot={snapshot}
        entries={rows.filter((entry) => !review(entry))}
        light={light}
        now={now}
        onStats={onStats}
        fold={source}
      />
      {lower.length > 0 && (
        <ReviewRows zh={zh}>
          <PlaceRows
            snapshot={snapshot}
            entries={lower}
            light
            now={now}
            onStats={onStats}
          />
        </ReviewRows>
      )}
    </section>
  );
}
