// The panel's sessions section, moved out of SessionsSection.tsx (ADR-0001
// C1): on the one-agent panel its list; on the whole board, whose rows sit
// under each place's block (`split`), only the folded line at the foot.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  PanelLayout,
  SessionsResponse,
  Snapshot,
} from "@agent-hud/protocol";
import { tokensShort } from "@agent-hud/ui/format";
import { useFormat } from "@agent-hud/ui/format-context";
import { vendorKey } from "../model";
import { usePanelQuery } from "../PanelContext";
import { chatgptDesk, isReview, reviewsInDay } from "../chatgpt-desk";
import { liveSessions, stoppedCount } from "./agent-board";
import { DayBars, useBoardInks, useDayTokens } from "./AgentBoard";
import { useListedSessions } from "./listed-sessions";
import { sessionScope } from "./place-sessions";
import { PlaceRows, SessionsHeading } from "./PlaceRows";
import { shownSessions, useRemovedSessions } from "./removed-sessions";
import { ReviewRows } from "./ReviewSlip";
import { RepliedRow } from "./SessionsSection";
import { BoardHeading } from "./BoardHeading";
import { NothingYet, WorkSections } from "./WorkSections";
import { noButtonChrome, type Logo } from "./theme";

/** The panel's sessions (owner, 2026-11-05): those waiting on you, then
 * those at work, each with what it waits on or does and a way back to it;
 * the rest of the last day folded into one line, with its tokens, that opens
 * the Statistics window. On one agent's card they are its 「等待处理」 and
 * 「正在进行」 (owner, 2026-11-14); its relays are behind the paper plane. */
export function SourceSessions({
  snapshot,
  focusVendor,
  light,
  onStats,
  layout = {},
  tokenAgents,
  showTokens = true,
  active = true,
  split = false,
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
  /** The agents whose tokens the folded line counts; every agent without. */
  tokenAgents?: string[];
  /** The folded line's tokens and chart; off where the board above shows them. */
  showTokens?: boolean;
  active?: boolean;
  /** The whole board lists the rows under each place's block (C1). */
  split?: boolean;
  /** The agent has no block above: the card's head goes here. */
  bare?: boolean;
  /** The agent's requests or replies: what waits on you on its card. */
  news?: { count: number; content: ReactNode };
}) {
  const { language } = useFormat();
  const zh = language === "zh";
  const listed = useListedSessions();
  const inks = useBoardInks(light);
  const openList = () =>
    listed ? listed.openStats({ tab: "sessions" }) : onStats?.();
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
  // The last day's sessions, only to count those stopped.
  const query = usePanelQuery<SessionsResponse>(
    "sessions",
    {
      scope: "active",
      limit: 1,
      ...(selectedSources ? { sources: selectedSources } : {}),
      ...(layout.projects?.length ? { projects: layout.projects } : {}),
    },
    snapshot.sessionsRevision,
    active,
  );
  const dayTotal =
    query.data?.total ??
    snapshot.sessions.filter(
      (session) =>
        scope.has(session) &&
        !session.parentId &&
        Date.parse(session.lastMessageAt ?? session.updatedAt) >=
          now - 86_400_000,
    ).length;
  const stopped = stoppedCount(dayTotal, listedLive.length);
  const day = useDayTokens(
    snapshot,
    focusVendor ? selectedSources : tokenAgents,
    active && showTokens,
  );
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
  }, [limit, split, fold]);
  return (
    <section
      className="hud-source-sessions"
      style={{ display: "grid", gap: 0, fontSize: 12 }}
    >
      {!split && bare && focusVendor && Logo && (
        <BoardHeading
          vendor={focusVendor}
          place={selectedSources?.[0]}
          Logo={Logo}
          light={light}
          handoffs={snapshot.handoffs}
        />
      )}
      {!split && fold && (
        <WorkSections
          snapshot={snapshot}
          entries={upper}
          light={light}
          now={now}
          onStats={onStats}
          fold={fold}
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
      {!split && !fold && (
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
      {!split && !(fold ? upper : live).length && !replied.length && !news && (
        <NothingYet light={light} chats={Boolean(desk)} />
      )}
      <button
        type="button"
        className="hud-sessions-more"
        title={zh ? "在统计里看全部会话" : "Show every session in Statistics"}
        disabled={!onStats && !listed}
        onClick={openList}
        style={{
          ...noButtonChrome,
          display: "grid",
          gridTemplateColumns: showTokens ? "minmax(0, 1fr) 150px" : "1fr",
          columnGap: 16,
          alignItems: "end",
          padding: "10px 6px 4px",
          borderTop: `1px dotted ${inks.divider}`,
          cursor: !onStats && !listed ? undefined : "pointer",
        }}
      >
        <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: inks.text, opacity: 0.84 }}>
            {desk
              ? zh
                ? `今天 ${desk.today} 个对话 · 近 24 小时 ${reviewsInDay(snapshot, now)} 个审核`
                : `${desk.today} chats today · ${reviewsInDay(snapshot, now)} reviews in the last 24 hours`
              : showTokens
                ? zh
                  ? `近 24 小时 ${tokensShort(day.total)} Token`
                  : `${tokensShort(day.total)} tokens in the last 24 hours`
                : zh
                  ? `近 24 小时 ${dayTotal} 个会话`
                  : `${dayTotal} sessions in the last 24 hours`}
          </span>
          <span style={{ fontSize: 12, color: inks.secondary }}>
            {desk
              ? zh
                ? "去统计看全部"
                : "See all in Statistics"
              : zh
                ? `另有 ${stopped} 个会话已停 · 去统计看全部`
                : `${stopped} more stopped · see all in Statistics`}
          </span>
        </span>
        {showTokens && (
          <DayBars
            points={day.points}
            from={day.from}
            height={28}
            light={light}
          />
        )}
      </button>
    </section>
  );
}
