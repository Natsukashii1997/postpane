import { useEffect, useRef, useState } from "react";
import { GoButton } from "../GoButton";
import { RunningMark } from "./RunningMark";
import { runningSince } from "./running-rows";
import { TRAY, TrayHint } from "./TrayHint";
import { OpenNotice, useOpenFailures } from "../OpenNotice";
import { failureOf } from "../open-result";
import type { Snapshot } from "@agent-hud/protocol";
import { usePanelServices } from "../PanelContext";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { WAIT_BADGE } from "../permissions/approval-list";
import { BacklogLine, type BacklogSlot } from "./BacklogLine";
import { clipped, GRID, noButtonChrome, tabular } from "./theme";
import { useFormat } from "@agent-hud/ui/format-context";
import { useListedSessions } from "./listed-sessions";
import type { LiveSession } from "./agent-board";
import { liveSessionLine } from "./live-line";
import { useBoardInks } from "./AgentBoard";
import { BotSeal } from "./BotStamp";
import { useHandoffCard } from "../alerts/HandoffCard";
import { usePaper } from "../paper";
import type { DeskChat } from "../chatgpt-desk";
import { replyTime } from "../scene/hermes-peek";
import { dateFormat } from "@agent-hud/ui/format";
import { progressLine } from "../alerts/handoff-card";
import { RelayTag } from "./RelayTag";
import type { Handoff, RelayLaunch } from "@agent-hud/protocol";
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

// A listed session's row (`LiveRow`) and a replied chat's (`RepliedRow`);
// the sessions section that lists them is SourceSessions.tsx (ADR-0001 C1).

/** How far a row slides to show its Remove button alone. */
const removeWidth = 72;

/** A chat of today ChatGPT has answered (#219): its tag, title and a way
 * back to it, and under the title when it replied. Nothing to swipe: there
 * is nothing waiting on it to put away. */
export function RepliedRow({
  chat,
  session,
  now,
  light,
  first,
  onStats,
}: {
  chat: DeskChat;
  session: Snapshot["sessions"][number];
  now: number;
  light: boolean;
  first: boolean;
  onStats?: () => void;
}) {
  const { language, calendar } = useFormat();
  const zh = language === "zh";
  const services = usePanelServices();
  const listed = useListedSessions();
  const inks = useBoardInks(light);
  const { failure, fail } = useOpenFailures();
  const [hover, setHover] = useState(false);
  const failed = failure(session.id);
  const canOpen =
    Boolean(session.navigationTarget && services?.openSession) && !failed;
  // As a live row (#220): where it could not get there, the second line
  // says why a few seconds.
  const goBack = async () => {
    if (!canOpen) return;
    const reason = failureOf(await services?.openSession?.(session), zh);
    if (reason) fail(session.id, reason);
  };
  const open = () => {
    if (canOpen) return void goBack();
    if (listed) listed.openStats({ tab: "sessions", sessionId: session.id });
    else if (services?.selectSession) services.selectSession(session);
    else onStats?.();
  };
  const locale = zh ? "zh-CN" : "en-US";
  const timeZone = calendar.timeZone;
  const time = replyTime(chat.at, now, {
    time: dateFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }),
    date: dateFormat(locale, {
      month: zh ? "long" : "short",
      day: "numeric",
      timeZone,
    }),
  });
  return (
    <div
      className="hud-live-session"
      role="button"
      tabIndex={0}
      title={session.title}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) 26px",
        columnGap: GRID.gap,
        alignItems: "center",
        padding: "8px 6px 8px 0",
        cursor: "pointer",
        opacity: hover ? 0.78 : 1,
        borderTop: first ? undefined : `1px dotted ${inks.divider}`,
      }}
    >
      <ApprovalTag label={zh ? "已回" : "REPLIED"} tone="reply" light={light} />
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: inks.text,
          ...clipped,
        }}
      >
        {chat.title?.trim() || (zh ? "（未命名会话）" : "(untitled session)")}
      </span>
      <GoButton
        label={
          canOpen
            ? zh
              ? "回到会话"
              : "Return to session"
            : zh
              ? "暂时无法回到原会话"
              : "Session return unavailable"
        }
        enabled={canOpen}
        inks={{
          line: inks.divider,
          ink: inks.secondary,
          faint: inks.tertiary,
          strong: inks.text,
        }}
        onClick={(event) => {
          event.stopPropagation();
          void goBack();
        }}
      />
      {failed ? (
        <OpenNotice
          text={failed}
          light={light}
          style={{ gridColumn: "2 / 3" }}
        />
      ) : (
        <span
          style={{
            gridColumn: "2 / 3",
            marginTop: 2,
            fontSize: 12,
            color: inks.secondary,
          }}
        >
          {zh ? `${time} 回复` : `Replied ${time}`}
        </span>
      )}
    </div>
  );
}

/** A listed session: its status tag, title and a way back to it, and under
 * the title what it waits on or does. The row and the arrow both go back;
 * where the way back is missing or fails, the arrow greys and says so, and
 * the row opens the session's page in Statistics instead. Dragged left (or
 * swiped left with two fingers, or ← on the keyboard) it shows a Remove
 * button (owner, 2026-11-05); a Claude Code session on this machine shows
 * a tray of handoffs before it (#124). A click elsewhere, a drag right, →
 * or Esc puts it back. */
export function LiveRow({
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
  backlog,
}: {
  entry: LiveSession;
  /** A backlog line: WAIT, how long it has waited, its question whole and
   * its buttons (owner, 2026-11-28). */
  backlog?: BacklogSlot;
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
  const { failure, fail } = useOpenFailures();
  const [hover, setHover] = useState(false);
  const { session } = entry;
  const failed = failure(session.id);
  const canOpen =
    Boolean(session.navigationTarget && services?.openSession) && !failed;
  // Where it could not get there, the second line says why a few seconds,
  // then ↗ may be tried again (#220).
  const goBack = async () => {
    if (!canOpen) return;
    const reason = failureOf(await services?.openSession?.(session), zh);
    if (reason) fail(session.id, reason);
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
  const since = backlog
    ? backlog.since
    : waiting
      ? null
      : runningSince(session, now, language);
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
      const left = await services.relayLaunch(session, launch);
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
            gridTemplateColumns: `${waiting ? "auto" : `${GRID.mark}px`} minmax(0, 1fr)${bot ? " auto" : ""} 26px`,
            columnGap: GRID.gap,
            alignItems: "center",
            padding: "8px 6px 8px 0",
            cursor: "pointer",
            opacity: hover && !x ? 0.78 : 1,
            transform: x ? `translateX(${x}px)` : undefined,
            transition: drag === null ? "transform 0.18s ease" : undefined,
          }}
        >
          {waiting ? (
            <ApprovalTag
              label={backlog ? WAIT_BADGE : zh ? "等你" : "WAITING"}
              tone={backlog ? "wait" : "ask"}
              light={light}
              color={backlog ? undefined : inks.red}
            />
          ) : (
            <RunningMark label={zh ? "在跑" : "Running"} color={inks.green} />
          )}
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
                ...clipped,
              }}
            >
              {session.liveFacts?.prompt?.trim() ||
                session.title?.trim() ||
                (zh ? "（未命名会话）" : "(untitled session)")}
            </span>
            {since && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: inks.secondary,
                  whiteSpace: "nowrap",
                  ...tabular,
                }}
              >
                {since}
              </span>
            )}
          </span>
          {bot && (
            <span style={{ gridRow: "1 / 3", gridColumn: "3 / 4" }}>
              <BotSeal bot={bot} light={light} color={inks.secondary} />
            </span>
          )}
          <GoButton
            label={goTitle}
            enabled={canOpen}
            inks={{
              line: inks.divider,
              ink: inks.secondary,
              faint: inks.tertiary,
              strong: inks.text,
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (dragged.current) {
                dragged.current = false;
                return;
              }
              if (open) return onOpen(false);
              void goBack();
            }}
          />
          {failed ? (
            <OpenNotice
              text={failed}
              light={light}
              style={{ gridColumn: "2 / 3" }}
            />
          ) : notice ? (
            <span
              role="status"
              style={{
                gridColumn: "2 / 3",
                marginTop: 2,
                fontSize: 12,
                color: notice.ok ? inks.green : inks.red,
                ...clipped,
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
                ...clipped,
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
              <RelayTag
                handoff={handoff}
                zh={zh}
                color={paper?.blue ?? inks.secondary}
                onClick={() => (open ? onOpen(false) : card.open(handoff.id))}
              />
              <span
                style={{
                  ...clipped,
                }}
              >
                {progressLine(handoff, now, zh)}
              </span>
            </span>
          ) : backlog ? (
            <BacklogLine
              text={liveSessionLine(entry, language)}
              slot={backlog}
              inks={inks}
            />
          ) : (
            <span
              style={{
                gridColumn: "2 / 3",
                marginTop: 2,
                fontSize: 12,
                color: inks.secondary,
                ...clipped,
              }}
            >
              {session.client === "claude-cloud"
                ? `${zh ? "云端" : "Cloud"} · ${liveSessionLine(entry, language)}`
                : liveSessionLine(entry, language)}
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
