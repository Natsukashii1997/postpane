import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type {
  PanelLayout,
  SessionsResponse,
  Snapshot,
} from "@agent-hud/protocol";
import { tokensShort } from "@agent-hud/ui/format";
import { sourceID, sourcesForMark } from "../model";
import { usePanelQuery, usePanelServices } from "../PanelContext";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { noButtonChrome, tabular, type Logo } from "./theme";
import { useFormat } from "@agent-hud/ui/format-context";
import { useListedSessions } from "./listed-sessions";
import {
  liveSessionLine,
  liveSessions,
  stoppedCount,
  type LiveSession,
} from "./agent-board";
import { DayBars, useBoardInks, useDayTokens } from "./AgentBoard";
import { BotSeal } from "./BotStamp";

/** The panel's sessions (owner, 2026-11-05): those waiting on you, then
 * those at work, each with what it waits on or does and a way back to it;
 * the rest of the last day folded into one line, with its tokens, that opens
 * the Statistics window. The Sessions page lists every session as before. */
export function SourceSessions({
  snapshot,
  focusVendor,
  light,
  onStats,
  layout = {},
  tokenAgents,
  showTokens = true,
  active = true,
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
}) {
  const { language } = useFormat();
  const zh = language === "zh";
  const listed = useListedSessions();
  const inks = useBoardInks(light);
  const openList = () =>
    listed ? listed.openStats({ tab: "sessions" }) : onStats?.();
  const limit = layout.limit ?? 5;
  const selectedSources = focusVendor
    ? sourcesForMark(snapshot, focusVendor)
    : layout.agents?.length
      ? layout.agents.map((source) => sourceID(snapshot, source))
      : undefined;
  const inScope = (session: Snapshot["sessions"][number]) =>
    (!selectedSources ||
      selectedSources.includes(sourceID(snapshot, session.source))) &&
    (!layout.projects?.length ||
      layout.projects.includes(session.project ?? session.cwd ?? "unassigned"));
  const now = Date.parse(snapshot.generatedAt);
  const live = liveSessions(
    snapshot.sessions.filter(inScope),
    snapshot.approvals,
  );
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
        inScope(session) &&
        !session.parentId &&
        Date.parse(session.lastMessageAt ?? session.updatedAt) >=
          now - 86_400_000,
    ).length;
  const stopped = stoppedCount(dayTotal, live.length);
  const day = useDayTokens(
    snapshot,
    focusVendor ? selectedSources : tokenAgents,
    active && showTokens,
  );
  // Every session is listed; past `limit` rows the list scrolls in place.
  const rows = useRef<HTMLDivElement>(null);
  const [rowsHeight, setRowsHeight] = useState<number>();
  useLayoutEffect(() => {
    const last = rows.current?.children[limit - 1] as HTMLElement | undefined;
    setRowsHeight(
      live.length > limit && last
        ? last.offsetTop + last.offsetHeight
        : undefined,
    );
  }, [live.length, limit]);
  // The list's own thumb: shown while it scrolls, faint under the pointer,
  // and faded out a second after it stops.
  const [thumb, setThumb] = useState({
    size: 1,
    at: 0,
    scrolling: false,
    hover: false,
  });
  const stopTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const measureThumb = (scrolling: boolean) => {
    const list = rows.current;
    if (!list) return;
    const room = list.scrollHeight - list.clientHeight;
    setThumb((was) => ({
      ...was,
      size: list.scrollHeight ? list.clientHeight / list.scrollHeight : 1,
      at: room > 0 ? list.scrollTop / room : 0,
      scrolling,
    }));
  };
  const showThumb = () => {
    measureThumb(true);
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => measureThumb(false), 1000);
  };
  useLayoutEffect(() => measureThumb(false), [rowsHeight, live.length]);
  useEffect(() => () => clearTimeout(stopTimer.current), []);
  return (
    <section
      className="hud-source-sessions"
      style={{ display: "grid", gap: 0, fontSize: 12 }}
    >
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
        <span>{zh ? "正在进行" : "IN PROGRESS"}</span>
        <span
          style={{ flex: 1, borderTop: `1px solid ${inks.divider}`, order: 1 }}
        />
        <span style={{ order: 2, letterSpacing: 0, ...tabular }}>
          {live.length}
        </span>
      </div>
      <div
        style={{ position: "relative" }}
        onPointerEnter={() => setThumb((was) => ({ ...was, hover: true }))}
        onPointerLeave={() => setThumb((was) => ({ ...was, hover: false }))}
      >
        <div
          ref={rows}
          className="hud-live-sessions"
          onScroll={showThumb}
          style={{
            position: "relative",
            maxHeight: rowsHeight,
            overflowY: rowsHeight ? "auto" : undefined,
            scrollbarWidth: "none",
          }}
        >
          {live.map((entry, index) => (
            <LiveRow
              key={`${entry.session.source}:${entry.session.id}`}
              entry={entry}
              now={now}
              light={light}
              first={index === 0}
              onStats={onStats}
            />
          ))}
        </div>
        {rowsHeight && thumb.size < 1 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 1,
              top: `${thumb.at * (1 - thumb.size) * 100}%`,
              height: `${thumb.size * 100}%`,
              width: 4,
              borderRadius: 2,
              background: inks.secondary,
              opacity: thumb.scrolling ? 0.55 : thumb.hover ? 0.25 : 0,
              transition: `opacity ${thumb.scrolling ? 0.15 : 0.6}s ease`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      {!live.length && (
        <span
          style={{
            padding: "6px 6px 8px",
            fontSize: 12.5,
            color: inks.tertiary,
          }}
        >
          {zh
            ? "没有会话在跑，也没有在等你的"
            : "Nothing running, and nothing waiting on you"}
        </span>
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
            {showTokens
              ? zh
                ? `近 24 小时 ${tokensShort(day.total)} Token`
                : `${tokensShort(day.total)} tokens in the last 24 hours`
              : zh
                ? `近 24 小时 ${dayTotal} 个会话`
                : `${dayTotal} sessions in the last 24 hours`}
          </span>
          <span style={{ fontSize: 12, color: inks.secondary }}>
            {zh
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

/** A listed session: its status tag, title and a way back to it, and under
 * the title what it waits on or does. The row and the arrow both go back;
 * where the way back is missing or fails, the arrow greys and says so, and
 * the row opens the session's page in Statistics instead. */
function LiveRow({
  entry,
  now,
  light,
  first,
  onStats,
}: {
  entry: LiveSession;
  now: number;
  light: boolean;
  first: boolean;
  onStats?: () => void;
}) {
  const { language } = useFormat();
  const zh = language === "zh";
  const services = usePanelServices();
  const listed = useListedSessions();
  const inks = useBoardInks(light);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState(false);
  const { session } = entry;
  const canOpen =
    Boolean(session.navigationTarget && services?.openSession) && !failed;
  const goBack = async () => {
    if (!canOpen) return;
    const opened = await services?.openSession?.(session);
    if (opened === false) setFailed(true);
  };
  const details = () =>
    listed
      ? listed.openStats({ tab: "sessions", sessionId: session.id })
      : services?.selectSession
        ? services.selectSession(session)
        : onStats?.();
  const goTitle = canOpen
    ? zh
      ? "回到会话"
      : "Return to session"
    : zh
      ? "暂时无法回到原会话"
      : "Session return unavailable";
  const waiting = entry.status === "waiting";
  const bot = session.bot ?? null;
  return (
    <div
      className="hud-live-session"
      role="button"
      tabIndex={0}
      title={session.title}
      onClick={() => (canOpen ? void goBack() : details())}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (canOpen) void goBack();
        else details();
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: bot
          ? "auto minmax(0, 1fr) auto 26px"
          : "auto minmax(0, 1fr) 26px",
        columnGap: 10,
        alignItems: "center",
        padding: "8px 6px",
        borderTop: first ? undefined : `1px dotted ${inks.divider}`,
        cursor: "pointer",
        opacity: hover ? 0.78 : 1,
      }}
    >
      <ApprovalTag
        label={waiting ? (zh ? "等你" : "WAITING") : zh ? "在跑" : "RUNNING"}
        tone="ask"
        light={light}
        color={waiting ? inks.red : inks.green}
      />
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: inks.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {session.title?.trim() ||
          (zh ? "（未命名会话）" : "(untitled session)")}
      </span>
      {bot && (
        <span style={{ gridRow: "1 / 3", gridColumn: "3 / 4" }}>
          <BotSeal bot={bot} light={light} color={inks.secondary} />
        </span>
      )}
      <button
        type="button"
        aria-label={goTitle}
        title={goTitle}
        aria-disabled={!canOpen}
        onClick={(event) => {
          event.stopPropagation();
          void goBack();
        }}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 26,
          height: 26,
          boxSizing: "border-box",
          padding: 0,
          border: `1.5px solid ${inks.divider}`,
          borderRadius: 3,
          background: "transparent",
          color: canOpen ? inks.secondary : inks.tertiary,
          opacity: canOpen ? 1 : 0.6,
          cursor: canOpen ? "pointer" : "default",
        }}
      >
        <ArrowUpRight size={13} strokeWidth={2} />
      </button>
      <span
        style={{
          gridColumn: "2 / 3",
          marginTop: 2,
          fontSize: 12,
          color: inks.secondary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {session.client === "claude-cloud"
          ? `${zh ? "云端" : "Cloud"} · ${liveSessionLine(entry, now, language)}`
          : liveSessionLine(entry, now, language)}
      </span>
    </div>
  );
}
