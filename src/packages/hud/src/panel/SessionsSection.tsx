import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  CornerDownRight,
  EyeOff,
  FileSearch,
  FlaskConical,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
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
import { useHandoffCard } from "../alerts/HandoffCard";
import { airmailStripes, relayPaperOf, usePaper } from "../paper";
import { isReview } from "../chatgpt-desk";
import { handoffFor, progressLine, round } from "../alerts/handoff-card";
import type { Handoff, RelayLaunch } from "@agent-hud/protocol";
import {
  removedKey,
  shownSessions,
  useRemovedSessions,
} from "./removed-sessions";
import {
  alreadyQueuedText,
  launchKind,
  launchLine,
  stepBlock,
  TRAY_BLOCK,
  trayKinds,
  trayReady,
  trayText,
  type TrayKind,
} from "./relay-tray";

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
  const listedLive = liveSessions(
    snapshot.sessions.filter(inScope),
    snapshot.approvals,
  );
  const { removed, remove, prune } = useRemovedSessions();
  const live = shownSessions(listedLive, removed);
  // The owner's own sessions above; ChatGPT reviews on a lower slip of the
  // reviews' paper, always in full (#145).
  const handoffs = snapshot.handoffs ?? [];
  const isReviewRow = (entry: (typeof live)[number]) =>
    entry.session.source === "chatgpt" && isReview(entry.session, handoffs);
  const upper = live.filter((entry) => !isReviewRow(entry));
  const lower = live.filter(isReviewRow);
  const [openKey, setOpenKey] = useState<string | null>(null);
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
        inScope(session) &&
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
  // Every session is listed; past `limit` rows the list scrolls in place.
  const rows = useRef<HTMLDivElement>(null);
  const [rowsHeight, setRowsHeight] = useState<number>();
  useLayoutEffect(() => {
    const last = rows.current?.children[limit - 1] as HTMLElement | undefined;
    setRowsHeight(
      upper.length > limit && last
        ? last.offsetTop + last.offsetHeight
        : undefined,
    );
  }, [upper.length, limit]);
  const row = (
    entry: (typeof live)[number],
    index: number,
    list: readonly (typeof live)[number][],
    onPaper = light,
  ) => (
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
      light={onPaper}
      first={index === 0}
      last={index === list.length - 1}
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
        ref={rows}
        style={{
          position: "relative",
          maxHeight: rowsHeight,
          overflowY: rowsHeight ? "auto" : undefined,
        }}
      >
        {upper.map((entry, index) => row(entry, index, upper))}
      </div>
      {lower.length > 0 && (
        <ReviewRows zh={zh}>
          {lower.map((entry, index) => row(entry, index, lower, true))}
        </ReviewRows>
      )}
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

/** How far a row slides to show its Remove button alone. */
const removeWidth = 72;

/** The swipe tray's blocks (relay design 第 2 版, 左滑发起): colour, icon,
 * and the paler colour its name takes in the dark hint. */
const TRAY: Record<
  TrayKind,
  { color?: string; tint: string; Icon: LucideIcon }
> = {
  review: { color: "#366657", tint: "#8fcdb9", Icon: FileSearch },
  test: { color: "#415d7a", tint: "#9cc2ea", Icon: FlaskConical },
  cont: { color: "#6e5635", tint: "#d9b88b", Icon: CornerDownRight },
  disc: { color: "#69506f", tint: "#d2b0da", Icon: MessagesSquare },
  rm: { tint: "#ffb3a8", Icon: EyeOff },
};

/** A listed session: its status tag, title and a way back to it, and under
 * the title what it waits on or does. The row and the arrow both go back;
 * where the way back is missing or fails, the arrow greys and says so, and
 * the row opens the session's page in Statistics instead. Dragged left (or
 * swiped left with two fingers, or ← on the keyboard) it shows a Remove
 * button (owner, 2026-11-05); a Claude Code session on this machine shows
 * a tray of handoffs before it (#124). A click elsewhere, a drag right, →
 * or Esc puts it back. */
/** ChatGPT's reviews in the list (#145): a slip of the reviews' paper under
 * an airmail band, below the owner's own sessions. */
function ReviewRows({ zh, children }: { zh: boolean; children: ReactNode }) {
  const sheet = relayPaperOf(true);
  return (
    <div
      style={{
        position: "relative",
        margin: "10px 0 2px",
        padding: "10px 0 2px",
        background: sheet.paper,
        color: sheet.ink,
        borderRadius: 6,
        overflow: "hidden",
        boxShadow: "inset 0 6px 6px -6px rgba(0,0,0,.35)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 5,
          background: airmailStripes(5),
        }}
      />
      <div
        style={{
          padding: "2px 6px 0",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.3em",
          color: sheet.blue,
        }}
      >
        {zh ? "审核" : "REVIEWS"}
      </div>
      {children}
    </div>
  );
}

function LiveRow({
  entry,
  handoff,
  waits,
  now,
  light,
  first,
  last,
  onStats,
  open,
  onOpen,
  onRemove,
}: {
  entry: LiveSession;
  /** The handoff it is in: its second line says how that goes. */
  handoff?: Handoff;
  /** Its swipe's words not taken up yet: said before any handoff. */
  waits?: RelayLaunch;
  now: number;
  light: boolean;
  first: boolean;
  /** The list's last row: its hint opens upward. */
  last: boolean;
  onStats?: () => void;
  open: boolean;
  onOpen(open: boolean): void;
  onRemove(): void;
}) {
  const { language } = useFormat();
  const zh = language === "zh";
  const services = usePanelServices();
  const listed = useListedSessions();
  const inks = useBoardInks(light);
  const card = useHandoffCard();
  const paper = usePaper();
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
  const slot = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const offset = useRef(0);
  const start = useRef<{
    x: number;
    y: number;
    base: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const dragged = useRef(false);
  const wheelEnd = useRef<ReturnType<typeof setTimeout>>(undefined);
  const kinds = trayKinds(session);
  const solo = kinds.length === 1;
  const trayWidth = solo ? removeWidth : kinds.length * TRAY_BLOCK;
  const x = drag ?? (open ? -trayWidth : 0);
  const slide = (to: number) => {
    offset.current = Math.min(
      0,
      Math.max(solo ? -trayWidth * 1.6 : -trayWidth - 40, to),
    );
    setDrag(offset.current);
  };
  const settle = () => {
    setDrag(null);
    onOpen(offset.current < -trayWidth / 2);
  };
  useEffect(() => () => clearTimeout(wheelEnd.current), []);
  const row = useRef<HTMLDivElement>(null);
  const blocks = useRef<(HTMLButtonElement | null)[]>([]);
  // The block under the pointer or the keyboard: its hint shows.
  const [hot, setHot] = useState<number | null>(null);
  const focusBlock = (index: number) => {
    setHot(index);
    blocks.current[index]?.focus();
  };
  // ← opened the tray: its first block takes the keyboard once it is open,
  // never after it closed again.
  const focusOnOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      setHot(null);
      focusOnOpen.current = false;
    } else if (focusOnOpen.current) {
      focusOnOpen.current = false;
      focusBlock(0);
    }
  }, [open]);
  // What a handoff just asked: said in place of the second line a while.
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  // A handoff asked and not answered yet: another pick waits for it, and
  // only the latest one's answer is said.
  const launching = useRef(false);
  const asked = useRef(0);
  const pick = async (kind: TrayKind) => {
    if (kind === "rm") return onRemove();
    const launch = launchKind(kind);
    if (!launch || launching.current) return;
    launching.current = true;
    const ask = ++asked.current;
    onOpen(false);
    try {
      if (!services?.relayLaunch)
        throw new Error(
          zh ? "只能在驿窗里发起接力" : "Only PostPane can start a handoff",
        );
      const left = await services.relayLaunch(session.id, launch);
      // Words left now show on the second line (`waits`, kept by the host
      // in the snapshot) until the session's handoff takes over.
      if (ask === asked.current)
        setNotice(
          left?.already ? { ok: true, text: alreadyQueuedText(zh) } : null,
        );
    } catch (reason) {
      if (ask === asked.current)
        setNotice({
          ok: false,
          text: reason instanceof Error ? reason.message : String(reason ?? ""),
        });
    } finally {
      launching.current = false;
    }
  };
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!slot.current?.contains(event.target as Node)) onOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onOpen]);
  const hint = open && !solo && hot !== null ? trayText(kinds[hot], zh) : null;
  return (
    <div
      style={{
        position: "relative",
        borderTop: first ? undefined : `1px dotted ${inks.divider}`,
      }}
    >
      <div
        ref={slot}
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden={!open}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: -x,
            overflow: "hidden",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {kinds.map((kind, index) => {
            const text = trayText(kind, zh);
            const ready = trayReady(kind);
            const { color, Icon } = TRAY[kind];
            return (
              <button
                key={kind}
                ref={(element) => {
                  blocks.current[index] = element;
                }}
                type="button"
                tabIndex={open && ready ? 0 : -1}
                aria-disabled={!ready}
                aria-label={text.to ? `${text.label} ${text.to}` : text.label}
                title={solo ? text.line : undefined}
                onClick={() => {
                  if (ready) void pick(kind);
                }}
                onPointerEnter={() => setHot(index)}
                onPointerLeave={() =>
                  setHot((at) => (at === index ? null : at))
                }
                onFocus={() => setHot(index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    focusBlock(
                      stepBlock(
                        kinds,
                        index,
                        event.key === "ArrowLeft" ? -1 : 1,
                      ),
                    );
                  } else if (event.key === "Escape") {
                    onOpen(false);
                    row.current?.focus();
                  }
                }}
                className="hud-tray-block"
                style={{
                  ...noButtonChrome,
                  flex: "none",
                  width: solo ? removeWidth : TRAY_BLOCK,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  background: color ?? inks.red,
                  color: kind === "rm" ? "#fff" : "#f4f0e8",
                  filter:
                    ready && hot === index && !solo
                      ? "brightness(1.1)"
                      : undefined,
                  opacity: ready ? 1 : 0.42,
                  cursor: ready ? "pointer" : "default",
                }}
              >
                {!solo && <Icon size={20} strokeWidth={1.6} aria-hidden />}
                <span
                  style={{
                    fontSize: solo ? 13.5 : 12,
                    fontWeight: 600,
                    letterSpacing: solo ? undefined : "0.06em",
                    lineHeight: 1,
                  }}
                >
                  {text.label}
                </span>
              </button>
            );
          })}
        </div>
        <div
          ref={row}
          className="hud-live-session"
          role="button"
          tabIndex={0}
          title={session.title}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            if (open) return onOpen(false);
            if (canOpen) void goBack();
            else details();
          }}
          onKeyDown={(event) => {
            if ((event.key === "Escape" || event.key === "ArrowRight") && open)
              return onOpen(false);
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              if (solo) onOpen(true);
              else if (open) focusBlock(0);
              else {
                focusOnOpen.current = true;
                onOpen(true);
              }
              return;
            }
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (canOpen) void goBack();
            else details();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            dragged.current = false;
            start.current = {
              x: event.clientX,
              y: event.clientY,
              base: open ? -trayWidth : 0,
              axis: null,
            };
          }}
          onPointerMove={(event) => {
            const from = start.current;
            if (!from) return;
            const dx = event.clientX - from.x;
            const dy = event.clientY - from.y;
            if (!from.axis && Math.hypot(dx, dy) > 6) {
              from.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
              if (from.axis === "x")
                event.currentTarget.setPointerCapture(event.pointerId);
            }
            if (from.axis !== "x") return;
            dragged.current = true;
            slide(from.base + dx);
          }}
          onPointerUp={() => {
            const from = start.current;
            start.current = null;
            if (from?.axis === "x") settle();
          }}
          onPointerCancel={() => {
            start.current = null;
            if (drag !== null) settle();
          }}
          onWheel={(event) => {
            if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
            // One swipe is many wheel events, faster than renders: add them up
            // from where the swipe began until it rests.
            if (wheelEnd.current === undefined)
              offset.current = open ? -trayWidth : 0;
            slide(offset.current - event.deltaX);
            clearTimeout(wheelEnd.current);
            wheelEnd.current = setTimeout(() => {
              wheelEnd.current = undefined;
              settle();
            }, 140);
          }}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: bot
              ? "auto minmax(0, 1fr) auto 26px"
              : "auto minmax(0, 1fr) 26px",
            columnGap: 10,
            alignItems: "center",
            padding: "8px 6px",
            cursor: "pointer",
            opacity: hover && !x ? 0.78 : 1,
            transform: x ? `translateX(${x}px)` : undefined,
            transition: drag === null ? "transform 0.18s ease" : undefined,
          }}
        >
          <ApprovalTag
            label={
              waiting ? (zh ? "等你" : "WAITING") : zh ? "在跑" : "RUNNING"
            }
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
            {session.liveFacts?.prompt?.trim() ||
              session.title?.trim() ||
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
              if (dragged.current) {
                dragged.current = false;
                return;
              }
              if (open) return onOpen(false);
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
          {notice ? (
            <span
              role="status"
              style={{
                gridColumn: "2 / 3",
                marginTop: 2,
                fontSize: 12,
                color: notice.ok ? inks.green : inks.red,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {notice.text}
            </span>
          ) : waits ? (
            <span
              role="status"
              style={{
                gridColumn: "2 / 3",
                marginTop: 2,
                fontSize: 12,
                color: launchLine(waits, zh).ok ? inks.secondary : inks.red,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {launchLine(waits, zh).text}
            </span>
          ) : handoff && card ? (
            <span
              style={{
                gridColumn: "2 / 3",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 7,
                minWidth: 0,
                fontSize: 12,
                color: inks.secondary,
              }}
            >
              <button
                type="button"
                title={zh ? "打开接力卡" : "Open the handoff card"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  if (open) return onOpen(false);
                  card.open(handoff.id);
                }}
                style={{
                  ...noButtonChrome,
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  height: 17,
                  padding: "0 5px",
                  boxSizing: "border-box",
                  border: "1.5px dashed currentColor",
                  borderRadius: 2,
                  color: paper?.blue ?? inks.secondary,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {zh
                  ? `接力 ${round(handoff).at}/${round(handoff).of}`
                  : `Relay ${round(handoff).at}/${round(handoff).of}`}
              </button>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {progressLine(handoff, now, zh)}
              </span>
            </span>
          ) : (
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
          )}
        </div>
      </div>
      {hint && hot !== null && (
        <TrayHint
          hint={hint}
          kind={kinds[hot]}
          caret={hot * TRAY_BLOCK + TRAY_BLOCK / 2}
          width={trayWidth}
          above={last}
          light={light}
        />
      )}
    </div>
  );
}

/** The line under the tray saying where the block under the pointer or the
 * keyboard hands the work, and what it asks. */
function TrayHint({
  hint,
  kind,
  caret,
  width,
  above,
  light,
}: {
  hint: ReturnType<typeof trayText>;
  kind: TrayKind;
  /** The block's middle, from the tray's left. */
  caret: number;
  width: number;
  above: boolean;
  light: boolean;
}) {
  const inks = useBoardInks(light);
  const face = light ? "#fbfaf6" : "#383530";
  const edge = light ? "rgba(42,41,37,0.14)" : "rgba(236,231,220,0.09)";
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        right: 0,
        ...(above
          ? { bottom: "calc(100% + 7px)" }
          : { top: "calc(100% + 7px)" }),
        zIndex: 5,
        width,
        boxSizing: "border-box",
        padding: "9px 12px 10px",
        borderRadius: 3,
        background: face,
        boxShadow: `0 10px 24px rgba(0,0,0,${light ? 0.18 : 0.42}), inset 0 0 0 1px ${edge}`,
        fontSize: 11.5,
        lineHeight: 1.55,
        color: inks.secondary,
        pointerEvents: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: caret - 4,
          ...(above ? { bottom: -4 } : { top: -4 }),
          width: 8,
          height: 8,
          background: face,
          transform: "rotate(45deg)",
          boxShadow: above ? `1px 1px 0 0 ${edge}` : `-1px -1px 0 0 ${edge}`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 3,
          fontSize: 12,
          fontWeight: 600,
          // Pale on the dark hint; on the light one the block's own colour.
          color: light ? (TRAY[kind].color ?? inks.red) : TRAY[kind].tint,
        }}
      >
        {hint.label}
        {hint.to && (
          <span style={{ fontWeight: 400, color: inks.secondary }}>
            {hint.to}
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>{hint.line}</div>
    </div>
  );
}
