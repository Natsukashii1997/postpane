import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Handoff, Session, Snapshot } from "@agent-hud/protocol";
import { snapshotLanguage } from "@agent-hud/ui/format";
import { usePanelServices } from "../PanelContext";
import { failureOf } from "../open-result";
import { usePaper, PAPER_SEAL } from "../paper";
import { cardColumn } from "../card-column";
import { Avatar } from "./HandoffAvatar";
import { HandoffPoints } from "./HandoffPoints";
import { HandoffTitleRow } from "./HandoffTitleRow";
import { doerName, doerOf } from "./handoff-doer";
import { ListTear, cardInks, type Inks } from "../permissions/ListCard";
import { buttonFace } from "./button-face";
import {
  actions,
  autoLabel,
  chatgptSession,
  doerSession,
  clock,
  round,
  stamp,
  timeline,
  type Action,
  type Row,
} from "./handoff-card";

/** The handoff card opened in the sidebar (HUDScene shows it): from a reply,
 * or from 「正在进行」's 「接力 1/2」 tag. One per window, as card-hold's. */
let opened: string | null = null;
let hosts = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const openedNow = () => opened;
const hostedNow = () => hosts > 0;
const opener = { open: (id: string) => openHandoffCard(id) };

/** Opens `id`'s card, or closes it (null). */
export function openHandoffCard(id: string | null) {
  if (opened === id) return;
  opened = id;
  changed();
}

/** A way to open a handoff's card, where a sidebar shows it (none in a
 * preview without one). */
export function useHandoffCard(): { open(id: string): void } | null {
  return useSyncExternalStore(subscribe, hostedNow, hostedNow) ? opener : null;
}

/** For the sidebar that shows the card: the one opened now. */
export function useOpenedHandoffCard(): string | null {
  useEffect(() => {
    hosts++;
    changed();
    return () => {
      hosts--;
      if (hosts === 0) opened = null;
      changed();
    };
  }, []);
  return useSyncExternalStore(subscribe, openedNow, openedNow);
}

/** The handoff card (relay design 甲): the steps as a timeline, where it
 * stands, and the next moves along its foot. */
export function HandoffCard({
  handoff,
  snapshot,
  light = false,
  onClose,
  handover,
}: {
  handoff: Handoff;
  snapshot: Snapshot;
  light?: boolean;
  /** Back to what the sidebar showed before. */
  onClose: () => void;
  /** Collapses the sidebar, then does `callback` (going to a session). */
  handover?: (callback?: () => void) => void;
}) {
  const zh = snapshotLanguage(snapshot) === "zh";
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const tones = {
    red: paper?.red ?? "#ff6a57",
    green: paper?.green ?? "#6cc59a",
    blue: paper?.blue ?? "#8fb0ec",
    amber: paper ? paper.ochre : "#e0a948",
    dim: inks.dim,
  };
  const services = usePanelServices();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Escape goes back to what the sidebar showed.
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const rows = timeline(handoff, now, zh);
  const { at, of } = round(handoff);
  const mark = stamp(handoff, zh);
  const autoMark = autoLabel(handoff, zh);
  const claude = doerSession(handoff, snapshot.sessions);
  const D = doerName(handoff);
  const chatgpt: Session | undefined =
    chatgptSession(handoff, snapshot.sessions) ??
    (handoff.chatgptConversation
      ? ({
          id: `chatgpt:${handoff.chatgptConversation}`,
          source: "chatgpt",
          navigationTarget: {
            kind: "chatgpt-conversation",
            id: handoff.chatgptConversation,
          },
        } as unknown as Session)
      : undefined);

  const go = async (session: Session | undefined) => {
    if (!session || !services?.openSession) return;
    const reason = failureOf(await services.openSession(session), zh);
    if (reason) {
      setError(reason);
      return;
    }
    handover?.();
  };
  const act = async (action: Action) => {
    setError(null);
    if (action === "close") return onClose();
    if (action === "open") return void go(chatgpt);
    if (!services?.handoffAct) return;
    setBusy(action);
    try {
      await services.handoffAct(handoff.id, action);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason ?? ""));
    } finally {
      setBusy(null);
    }
  };

  const started = handoff.steps?.[0]?.at ?? handoff.createdAt;
  return (
    <div
      className="hud-handoff-card"
      style={{ ...cardColumn(0), position: "relative" }}
    >
      {/* 接力 · 第 1 / 2 轮 · stamp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
          // Clear of the airmail stripe along the top.
          padding: `${paper?.airmail ? 6 : 0}px 2px 8px 0`,
        }}
      >
        <span
          style={{
            fontSize: 12.5,
            letterSpacing: zh ? "0.32em" : "0.12em",
            color: inks.dim,
            whiteSpace: "nowrap",
          }}
        >
          {zh ? "接力" : "HANDOFF"}
        </span>
        {autoMark && (
          <span
            title={handoff.halt ?? undefined}
            style={{
              fontSize: 11.5,
              color: handoff.auto ? inks.ink : tones.amber,
              border: `1.2px solid ${handoff.auto ? inks.faint : tones.amber}`,
              borderRadius: 3,
              padding: "1px 6px",
              whiteSpace: "nowrap",
            }}
          >
            {autoMark}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            color: inks.dim,
            whiteSpace: "nowrap",
          }}
        >
          {zh ? `第 ${at} / ${of} 轮` : `Round ${at} / ${of}`}
          <span style={{ display: "inline-flex", gap: 3 }} aria-hidden="true">
            {Array.from({ length: of }, (_, index) => (
              <i
                key={index}
                style={{
                  width: 6,
                  height: 6,
                  boxSizing: "border-box",
                  border: `1.2px solid ${index < at ? inks.ink : inks.dim}`,
                  background: index < at ? inks.ink : "transparent",
                }}
              />
            ))}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            boxSizing: "border-box",
            display: "grid",
            placeItems: "center",
            flex: "none",
            border: `2px solid ${tones[mark.tone]}`,
            borderRadius: "50%",
            color: tones[mark.tone],
            font: `900 ${zh ? (mark.text.length > 2 ? 10.5 : 12) : 8.5}px/1 ${PAPER_SEAL}`,
            opacity: 0.88,
            pointerEvents: "none",
          }}
        >
          {mark.text}
        </span>
      </div>
      <ListTear paper={paper} inks={inks} />
      {/* The task, ↗ back to the doer's session, × back out (#334) */}
      <HandoffTitleRow
        title={handoff.title}
        doer={D}
        zh={zh}
        inks={inks}
        canGo={Boolean(claude)}
        onGo={() => void go(claude)}
        onClose={onClose}
      />
      <div
        style={{
          marginTop: 5,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: inks.dim,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: inks.mid,
          }}
        >
          <Avatar who={doerOf(handoff)} size={16} light={light} inks={inks} />
          {D}
        </span>
        <span>⇄</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: inks.mid,
          }}
        >
          <Avatar who="chatgpt" size={16} light={light} inks={inks} />
          ChatGPT
        </span>
        <span>
          · {zh ? "审核" : "Review"} · {clock(started)}{" "}
          {zh ? "发起" : "started"}
        </span>
      </div>
      <div style={{ marginTop: 14 }}>
        <ListTear paper={paper} inks={inks} />
      </div>
      {/* A long review scrolls here; the head and the buttons stay. */}
      <ol
        className="hud-handoff-steps"
        style={{
          position: "relative",
          margin: "4px 0 0",
          padding: 0,
          listStyle: "none",
          maxHeight: "max(240px, calc(100vh - 300px))",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        {rows.map((row, index) => (
          <TimelineRow
            key={index}
            row={row}
            first={index === 0}
            last={index === rows.length - 1}
            inks={inks}
            tones={tones}
            boxFill={
              paper
                ? paper.text(-0.035)
                : light
                  ? "rgba(0,0,0,0.045)"
                  : "rgba(255,255,255,0.045)"
            }
            light={light}
            zh={zh}
          />
        ))}
      </ol>
      <div style={{ marginTop: 4 }}>
        <ListTear paper={paper} inks={inks} />
      </div>
      <div style={{ height: 12 }} />
      <Foot
        handoff={handoff}
        inks={inks}
        paperColor={
          paper ? paper.paper : light ? "#ffffff" : "rgba(0,0,0,0.88)"
        }
        busy={busy}
        zh={zh}
        act={(action) => void act(action)}
      />
      {error && (
        <p
          role="status"
          style={{
            margin: "8px 0 0",
            fontSize: 11.5,
            lineHeight: 1.5,
            color: tones.red,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </p>
      )}
      <div style={{ height: 16 }} />
    </div>
  );
}

type Tones = Record<"red" | "green" | "blue" | "amber" | "dim", string>;

function TimelineRow({
  row,
  first,
  last,
  inks,
  tones,
  boxFill,
  light,
  zh,
}: {
  row: Row;
  first: boolean;
  last: boolean;
  inks: Inks;
  tones: Tones;
  boxFill: string;
  light: boolean;
  zh: boolean;
}) {
  const todo = row.state === "todo";
  return (
    <li
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "40px 26px minmax(0, 1fr)",
        columnGap: 10,
        padding: "10px 0",
      }}
    >
      {/* The line through the avatars, broken around each one so the
          paper's grain shows behind it. */}
      {!first && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 62,
            top: 0,
            height: 7,
            borderLeft: `1.5px ${todo ? "dashed" : "solid"} ${inks.line}`,
          }}
        />
      )}
      {!last && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 62,
            top: 35,
            bottom: 0,
            borderLeft: `1.5px ${todo ? "dashed" : "solid"} ${inks.line}`,
          }}
        />
      )}
      <span
        style={{
          fontSize: 12,
          color: inks.dim,
          fontVariantNumeric: "tabular-nums",
          paddingTop: 3,
          textAlign: "right",
        }}
      >
        {row.time}
      </span>
      <span
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          placeItems: "center",
          width: 26,
          height: 22,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            opacity: todo ? 0.4 : 1,
          }}
        >
          <Avatar who={row.who} size={20} light={light} inks={inks} />
        </span>
      </span>
      <div style={{ minWidth: 0 }}>
        <b
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: todo ? 500 : 600,
            color: todo ? inks.faint : inks.ink,
          }}
        >
          {row.title}
        </b>
        {row.state === "await" && row.sub ? (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: tones.amber,
            }}
          >
            <span
              style={{
                flex: "none",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: tones.amber,
              }}
            />
            {row.sub}
          </div>
        ) : row.state === "cur" && row.sub ? (
          <small
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
              fontSize: 12,
              color: inks.dim,
            }}
          >
            <span
              className="hud-handoff-live"
              style={{
                flex: "none",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: tones.green,
              }}
            />
            {row.sub}
          </small>
        ) : row.sub ? (
          <small
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 12,
              color: inks.dim,
              overflowWrap: "anywhere",
            }}
          >
            {row.sub}
          </small>
        ) : null}
        {row.quote && (
          <small
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginTop: 2,
              fontSize: 12,
              color: inks.dim,
              overflowWrap: "anywhere",
            }}
          >
            {zh ? "送出原话：" : "Sent: "}
            {row.quote}
          </small>
        )}
        {row.points && (row.points.length > 0 || row.verdict) && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: boxFill,
              borderRadius: 3,
            }}
          >
            {row.points.length > 0 && (
              <HandoffPoints points={row.points} inks={inks} />
            )}
            <div
              style={{
                marginTop: row.points.length > 0 ? 8 : 0,
                paddingTop: row.points.length > 0 ? 8 : 0,
                borderTop:
                  row.points.length > 0 ? `1px dotted ${inks.line}` : undefined,
                fontSize: 12.5,
                color: inks.mid,
              }}
            >
              {zh ? "结论：" : "Verdict: "}
              <b
                style={{
                  fontWeight: 600,
                  color:
                    row.verdict === "pass"
                      ? tones.green
                      : row.verdict === "revise"
                        ? tones.red
                        : inks.ink,
                }}
              >
                {row.verdict === "pass"
                  ? zh
                    ? "通过"
                    : "Pass"
                  : row.verdict === "revise"
                    ? zh
                      ? "需修改"
                      : "Changes needed"
                    : zh
                      ? "没写结论"
                      : "None given"}
              </b>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function Foot({
  handoff,
  inks,
  paperColor,
  busy,
  zh,
  act,
}: {
  handoff: Handoff;
  inks: Inks;
  paperColor: string;
  busy: Action | null;
  zh: boolean;
  act: (action: Action) => void;
}) {
  const list = actions(handoff);
  const D = doerName(handoff);
  const label: Record<Action, string> = {
    end: zh ? "结束接力" : "End handoff",
    open: zh ? "查看 ChatGPT 对话" : "Open ChatGPT",
    back: zh ? `转回 ${D}` : `Send back to ${D}`,
    again: zh ? "再审一轮" : "Review again",
    retry: zh ? "重试" : "Retry",
    close: zh ? "知道了" : "Got it",
    pause: zh ? "暂停自动" : "Pause auto",
    resume: zh ? "继续自动" : "Resume auto",
  };
  const main = list.length > 1 ? list[list.length - 1] : null;
  const { at, of } = round(handoff);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {list.includes("close") && (
        <span style={{ fontSize: 12, color: inks.dim }}>
          {zh ? "接力已结束" : "This handoff has ended"}
        </span>
      )}
      {list.map((action, index) => {
        const ghost =
          action === "end" || action === "pause" || action === "resume";
        const primary = action === main && action !== "open";
        return (
          <span key={action} style={{ display: "contents" }}>
            {(index === 1 || action === "close") && (
              <span style={{ flex: 1 }} />
            )}
            <button
              type="button"
              // The jump to ChatGPT gives under the pointer as every ↗ does
              // (#200); global.css.
              className={action === "open" ? "hud-press" : undefined}
              disabled={busy !== null}
              aria-disabled={busy !== null}
              title={
                action === "again"
                  ? zh
                    ? `${D} 改完后送 ChatGPT，第 ${at + 1} / ${Math.max(of, at + 1)} 轮`
                    : `${D} hands its changes to ChatGPT, round ${at + 1}`
                  : undefined
              }
              onClick={() => act(action)}
              style={{
                ...buttonFace,
                border: `1.5px solid ${
                  ghost ? "transparent" : primary ? inks.ink : inks.faint
                }`,
                background: primary ? inks.ink : "transparent",
                color: primary ? paperColor : ghost ? inks.dim : inks.ink,
                fontWeight: primary ? 600 : 400,
                ...(ghost ? { padding: "0 6px", marginLeft: -6 } : {}),
                opacity: busy && busy !== action ? 0.5 : 1,
                cursor: busy ? "default" : "pointer",
              }}
            >
              {busy === action ? (zh ? "处理中…" : "Working…") : label[action]}
              {action === "open" && (
                <ArrowUpRight size={12} strokeWidth={2.4} />
              )}
            </button>
          </span>
        );
      })}
    </div>
  );
}
