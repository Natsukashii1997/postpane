import { useState } from "react";
import {
  ArrowUpRight,
  ChartNoAxesColumn,
  MessageSquareText,
  RotateCcw,
  X,
} from "lucide-react";
import type { IslandEvent, Session, Snapshot } from "@agent-hud/protocol";
import { usePanelServices } from "../PanelContext";
import { clientDisplayName, compactDuration, newsTitle } from "../IslandNews";
import { ReminderMark } from "./ReminderMark";
import { dateFormat, snapshotLanguage } from "@agent-hud/ui/format";
import { useAlertPalette } from "./alert-palette";
import { cardColumn } from "../card-column";
import { PAPER_FIGURES, type Paper } from "../paper";

export function CompletionAlertView({
  event,
  snapshot,
  dismiss,
  onStats,
  handoff,
  light = false,
  botLogos = true,
}: {
  event: IslandEvent;
  snapshot: Snapshot;
  dismiss: () => void;
  onStats?: () => void;
  handoff?: (callback?: () => void) => void;
  light?: boolean;
  botLogos?: boolean;
}) {
  const services = usePanelServices(),
    zh = snapshotLanguage(snapshot) === "zh",
    [failed, setFailed] = useState(false),
    [closeHover, setCloseHover] = useState(false);
  const session = snapshot.sessions.find((s) => s.id === event.sessionId);
  const hasSession = Boolean(
    session?.navigationTarget || event.navigationTarget,
  );
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  const paper = colors.paper;
  const turnAccent = colors.fill("turn");
  const turnText = colors.text("turn");
  const onTurnAccent = colors.onFill;

  const startedRaw = event.startedAt ?? session?.liveFacts?.turnStartedAt;
  const started = startedRaw ? Date.parse(startedRaw) : NaN;
  const ended = Date.parse(event.at);
  const message = event.message ?? session?.liveFacts?.message;

  const openUsage = () => {
    dismiss();
    const run = () => {
      if (session && services?.selectSession) services.selectSession(session);
      else onStats?.();
    };
    if (handoff) handoff(run);
    else run();
  };
  const openSession = async () => {
    if (!hasSession) return;
    const target: Session | undefined =
      session ??
      (event.sessionId
        ? {
            id: event.sessionId,
            title: event.title ?? "",
            source: event.source,
            model: event.model ?? "",
            cwd: null,
            updatedAt: event.at,
            state: "idle",
            tokens: 0,
            cost: null,
            contextPercent: null,
            logPath: null,
            parentId: null,
            navigationTarget: event.navigationTarget,
          }
        : undefined);
    if (!target) return;
    setFailed(false);
    const opened = await services?.openSession?.(target);
    if (opened === false) setFailed(true);
    else {
      dismiss();
      handoff?.();
    }
  };

  return (
    <article style={{ ...cardColumn(18), fontSize: 12, color: "inherit" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ReminderMark
          event={event}
          size={24}
          light={light}
          botLogos={botLogos}
        />
        <div style={{ flex: 1, ...cardColumn(3), minWidth: 0 }}>
          <strong
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: ink(0.94),
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {clientDisplayName(event.source)}
          </strong>
          {event.model && event.model !== "Unknown" && (
            <span
              style={{
                fontSize: 11,
                color: ink(0.45),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {event.model}
            </span>
          )}
        </div>
        {!paper && (
          <MessageSquareText size={12} strokeWidth={2.2} color={turnText} />
        )}
        <span
          style={{
            color: turnText,
            fontSize: 12,
            fontWeight: paper ? 600 : 500,
            ...(paper && {
              border: `1.2px solid ${turnText}`,
              borderRadius: 2,
              padding: "1px 7px",
              letterSpacing: "0.06em",
            }),
          }}
        >
          {zh ? "有新回复" : "New reply"}
        </span>
        <button
          type="button"
          aria-label={zh ? "关闭回复提醒" : "Dismiss reply"}
          title={zh ? "关闭回复提醒" : "Dismiss reply"}
          onClick={dismiss}
          onPointerEnter={() => setCloseHover(true)}
          onPointerLeave={() => setCloseHover(false)}
          style={{
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            border: 0,
            borderRadius: 6,
            background: closeHover ? ink(0.08) : "transparent",
            color: ink(closeHover ? 0.92 : 0.65),
            cursor: "pointer",
          }}
        >
          <X size={10} strokeWidth={2.4} />
        </button>
      </header>
      {paper && <ReceiptTear paper={paper} />}
      <div style={cardColumn(8)}>
        <strong
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: ink(0.95),
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {event.title ?? newsTitle(event, zh)}
        </strong>
        {message && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: "15px",
              color: ink(0.68),
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 6,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          color: ink(0.5),
          ...(paper && {
            fontFamily: PAPER_FIGURES,
            fontSize: 14,
            fontWeight: 700,
            color: paper.ink,
          }),
        }}
      >
        <time>
          {dateFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
            new Date(event.at),
          )}
        </time>
        {paper && (
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              borderBottom: `1px dotted ${paper.line}`,
              transform: "translateY(-3px)",
            }}
          />
        )}
        {Number.isFinite(started) && ended > started && (
          <span>{compactDuration((ended - started) / 1000)}</span>
        )}
      </div>
      {paper && <ReceiptTear paper={paper} />}
      <div style={cardColumn(8)}>
        {failed && hasSession ? (
          <span style={{ fontSize: 11, color: ink(0.65) }}>
            {zh
              ? "无法回到会话，请重试或查看 Token 用量"
              : "Couldn't return to session. Retry or view token usage."}
          </span>
        ) : (
          !hasSession && (
            <span style={{ fontSize: 11, color: ink(0.5) }}>
              {zh ? "暂时无法回到原会话" : "Session return unavailable"}
            </span>
          )
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={openUsage}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 22,
              padding: "0 9px",
              borderRadius: paper ? 2 : 6,
              border: `1px solid ${paper ? paper.ink : ink(0.18)}`,
              background: "transparent",
              color: paper ? paper.ink : ink(0.6),
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            <ChartNoAxesColumn size={9} strokeWidth={2.6} />
            {zh ? "查看 Token 用量" : "View token usage"}
          </button>
          <span style={{ flex: 1, minWidth: 8 }} />
          {hasSession && (
            <button
              type="button"
              onClick={openSession}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 22,
                padding: "0 9px",
                borderRadius: paper ? 2 : 6,
                border: 0,
                background: turnAccent,
                color: onTurnAccent,
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {failed ? (
                <RotateCcw size={9} strokeWidth={2.6} />
              ) : (
                <ArrowUpRight size={9} strokeWidth={2.6} />
              )}
              {failed
                ? zh
                  ? "重试会话跳转"
                  : "Retry session"
                : zh
                  ? "回到会话"
                  : "Return to session"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** A tear line across the whole receipt, past the card's margins. */
function ReceiptTear({ paper }: { paper: Paper }) {
  return (
    <div
      aria-hidden="true"
      style={{
        borderTop: `1.2px dashed ${paper.line}`,
        marginLeft: -paper.bleed.left,
        marginRight: -paper.bleed.right,
      }}
    />
  );
}
