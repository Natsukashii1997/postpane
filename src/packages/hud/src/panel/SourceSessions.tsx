// The panel's sessions section, moved out of SessionsSection.tsx (ADR-0001
// C1): on the one-agent panel its list. The whole board lists its rows under
// each place's block and has none; nor has any panel the last day's tokens
// and sessions stopped at its foot (owner, 2026-11-15).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PanelLayout, Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { vendorKey } from "../model";
import { chatgptDesk, isReview } from "../chatgpt-desk";
import { liveSessions } from "./agent-board";
import { sessionScope } from "./place-sessions";
import { PlaceRows, SessionsHeading } from "./PlaceRows";
import { shownSessions, useRemovedSessions } from "./removed-sessions";
import { ReviewRows } from "./ReviewSlip";
import { RepliedRow } from "./SessionsSection";
import { BoardHeading } from "./BoardHeading";
import { soleAccount } from "./account-labels";
import { NothingYet, WorkSections } from "./WorkSections";
import type { Logo } from "./theme";

/** The panel's sessions (owner, 2026-11-05): those waiting on you, then
 * those at work, each with what it waits on or does and a way back to it.
 * On one agent's card they are its 「等待处理」 and
 * 「正在进行」 (owner, 2026-11-14); its relays are behind the paper plane. */
export function SourceSessions({
  snapshot,
  focusVendor,
  light,
  onStats,
  layout = {},
  bare = false,
  news,
  Logo,
}: {
  snapshot: Snapshot;
  focusVendor?: string;
  light: boolean;
  Logo?: Logo;
  onStats?: () => void;
  layout?: PanelLayout["sessions"];
  /** The agent has no block above: the card's head goes here. */
  bare?: boolean;
  /** The agent's requests or replies: what waits on you on its card. */
  news?: { count: number; content: ReactNode };
}) {
  const { language } = useFormat();
  const zh = language === "zh";
  const limit = layout.limit ?? 5;
  const scope = sessionScope(snapshot, layout, focusVendor);
  const selectedSources = scope.sources;
  const now = Date.parse(snapshot.generatedAt);
  const listedLive = liveSessions(
    snapshot.sessions.filter(scope.has),
    snapshot.approvals,
  );
  const { removed, prune } = useRemovedSessions();
  const live = shownSessions(listedLive, removed);
  // The owner's own sessions above; ChatGPT reviews on a lower slip of the
  // reviews' paper, always in full (#145).
  const handoffs = snapshot.handoffs ?? [];
  const isReviewRow = (entry: (typeof live)[number]) =>
    entry.session.source === "chatgpt" && isReview(entry.session, handoffs);
  const upper = live.filter((entry) => !isReviewRow(entry));
  const lower = live.filter(isReviewRow);
  // ChatGPT's own panel lists every chat of today, the replied ones under
  // those answering, as many as its stub counts (#219).
  const desk =
    focusVendor && vendorKey(focusVendor) === vendorKey("chatgpt")
      ? chatgptDesk(snapshot, now, zh)
      : null;
  const replied = desk
    ? desk.day.flatMap((chat) => {
        const session =
          chat.state === "replied" &&
          !live.some((entry) => entry.session.id === chat.id)
            ? snapshot.sessions.find((s) => s.id === chat.id)
            : undefined;
        return session ? [{ chat, session }] : [];
      })
    : [];
  // Removals end once their session has something new, or has stopped.
  useEffect(() => {
    prune(
      liveSessions(snapshot.sessions, snapshot.approvals),
      new Set(
        snapshot.sessions.map((session) => `${session.source}:${session.id}`),
      ),
    );
  }, [snapshot.sessions, snapshot.approvals, prune]);
  // One agent's running rows fold past three (C1) in place of the scroll; a
  // list of every agent's still scrolls past `limit`.
  const fold = focusVendor;
  const rows = useRef<HTMLDivElement>(null);
  const [rowsHeight, setRowsHeight] = useState<number>();
  useLayoutEffect(() => {
    const list = rows.current;
    setRowsHeight(undefined);
    if (!list || fold) return;
    const measure = () => {
      const last = list.children[limit - 1] as HTMLElement | undefined;
      setRowsHeight(
        list.children.length > limit && last
          ? last.offsetTop + last.offsetHeight
          : undefined,
      );
    };
    measure();
    const changes = new MutationObserver(measure);
    changes.observe(list, { childList: true });
    return () => changes.disconnect();
  }, [limit, fold]);
  return (
    <section
      className="hud-source-sessions"
      style={{ display: "grid", gap: 0, fontSize: 12 }}
    >
      {bare && focusVendor && Logo && (
        <BoardHeading
          card
          vendor={focusVendor}
          place={selectedSources?.[0]}
          Logo={Logo}
          light={light}
          plan={
            soleAccount(snapshot.quotas, snapshot.accounts, focusVendor)
              ?.planLabel
          }
          handoffs={snapshot.handoffs}
        />
      )}
      {fold && (
        <WorkSections
          snapshot={snapshot}
          entries={upper}
          light={light}
          now={now}
          onStats={onStats}
          card
          news={
            news ??
            (replied.length
              ? {
                  count: replied.length,
                  content: replied.map(({ chat, session }, index) => (
                    <RepliedRow
                      key={chat.id}
                      chat={chat}
                      session={session}
                      now={now}
                      light={light}
                      first={index === 0}
                      onStats={onStats}
                    />
                  )),
                }
              : undefined)
          }
        />
      )}
      {!fold && (
        <>
          <SessionsHeading light={light} count={live.length}>
            {zh ? "正在进行" : "IN PROGRESS"}
          </SessionsHeading>
          <div
            ref={rows}
            style={{
              position: "relative",
              maxHeight: rowsHeight,
              overflowY: rowsHeight ? "auto" : undefined,
            }}
          >
            <PlaceRows
              snapshot={snapshot}
              entries={upper}
              light={light}
              now={now}
              onStats={onStats}
            />
          </div>
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
        </>
      )}
      {!fold && !live.length && <NothingYet light={light} />}
    </section>
  );
}
