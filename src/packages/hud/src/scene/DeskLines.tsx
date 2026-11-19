// ChatGPT's peek (#145, the owner's 一格两栏 · 两联 · 旧信纸): the owner's own
// chats on the receipt, then, when there are any, the reviews on a lower
// slip of the reviews' paper under an airmail band, with no perforation
// where the two meet.
import type { ReactNode } from "react";
import { useFormat } from "@agent-hud/ui/format-context";
import { dateFormat } from "@agent-hud/ui/format";
import type { ChatGPTDesk, DeskReview } from "../chatgpt-desk";
import { airmailStripes, relayPaperOf } from "../paper";
import { replyTime } from "./hermes-peek";
import {
  DESK_CHAT,
  DESK_LABEL,
  DESK_NOTE,
  DESK_REVIEW,
  DESK_SLIP_PAD,
} from "./peek-size";

export interface DeskInks {
  ink: string;
  dim: string;
  line: string;
  dimOpacity?: number;
  answering: string;
  replied: string;
}

/** What a review's phase reads as on the slip, and in which ink. */
export function reviewPhase(
  phase: DeskReview["phase"],
  zh: boolean,
): { text: string; tone: "amber" | "blue" | "red" | "dim" } {
  switch (phase) {
    case "replied":
      return { text: zh ? "待你看" : "Your call", tone: "amber" };
    case "working":
      return { text: zh ? "审核中" : "Reviewing", tone: "blue" };
    case "sending":
      return { text: zh ? "送出中" : "Sending", tone: "dim" };
    case "delivered":
      return { text: zh ? "已送到" : "Delivered", tone: "dim" };
    case "returned":
      return { text: zh ? "返修中" : "With Claude", tone: "dim" };
    case "failed":
      return { text: zh ? "没送出" : "Not sent", tone: "red" };
    default:
      return { text: zh ? "已结束" : "Ended", tone: "dim" };
  }
}

/** A listed relay's word (#427): 「停」 and 「未完暂停」 over its phase; a
 * quiet one's in grey. */
export function reviewWord(
  review: DeskReview,
  zh: boolean,
): ReturnType<typeof reviewPhase> {
  if (review.stopped) return { text: zh ? "停" : "Stopped", tone: "red" };
  if (review.paused) return { text: zh ? "未完暂停" : "Paused", tone: "amber" };
  const word = reviewPhase(review.phase, zh);
  return review.group === "quiet" ? { ...word, tone: "dim" } : word;
}

export function DeskLines({
  desk,
  scale,
  zh,
  inks,
  /** How far the lower slip bleeds to the bubble's edges: its padding. */
  bleed,
  children,
}: {
  desk: ChatGPTDesk;
  scale: number;
  zh: boolean;
  inks: DeskInks;
  bleed: { left: number; right: number; bottom: number };
  /** The peek's work line: on the upper slip, over the reviews' one. */
  children?: ReactNode;
}) {
  const { calendar } = useFormat();
  const locale = zh ? "zh-CN" : "en-US";
  const now = Date.now();
  const format = {
    time: dateFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: calendar.timeZone,
    }),
    date: dateFormat(locale, {
      month: zh ? "long" : "short",
      day: "numeric",
      timeZone: calendar.timeZone,
    }),
  };
  const time = (at: number) => replyTime(at, now, format);
  const paper = relayPaperOf(false);
  // A phase is a status written out: the word ink, but red when it went
  // wrong (#308).
  const tone = {
    amber: paper.word,
    blue: paper.word,
    red: paper.red,
    dim: paper.word,
  };
  const label = (text: string, color: string, rule: string, extra?: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6 * scale,
        height: DESK_LABEL * scale,
        fontSize: 10.5 * scale,
        letterSpacing: "0.14em",
        color,
      }}
    >
      <span style={{ whiteSpace: "nowrap" }}>{text}</span>
      <span
        aria-hidden="true"
        style={{ flex: "1 1 auto", borderTop: `1px solid ${rule}` }}
      />
      {extra && (
        <span style={{ letterSpacing: 0, whiteSpace: "nowrap" }}>{extra}</span>
      )}
    </div>
  );
  const dim = { color: inks.dim, opacity: inks.dimOpacity };
  return (
    <>
      {label(zh ? "对 话" : "CHATS", inks.dim, inks.line)}
      {desk.chats.map((chat) => (
        <div
          key={chat.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6 * scale,
            height: DESK_CHAT * scale,
            fontWeight: 600,
            color: inks.ink,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              flex: "none",
              width: 6 * scale,
              height: 6 * scale,
              borderRadius: "50%",
              background:
                chat.state === "answering" ? inks.answering : inks.replied,
            }}
          />
          <span
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {chat.title}
          </span>
          <span
            style={{
              ...dim,
              fontWeight: 400,
              fontSize: 10.5 * scale,
              whiteSpace: "nowrap",
            }}
          >
            {time(chat.at)}{" "}
            {chat.state === "answering"
              ? zh
                ? "起"
                : "on"
              : zh
                ? "回"
                : "reply"}
          </span>
        </div>
      ))}
      {(desk.chats.length === 0 || desk.more > 0) && (
        <div
          style={{
            ...dim,
            height: DESK_NOTE * scale,
            lineHeight: `${DESK_NOTE * scale}px`,
            fontSize: 10.5 * scale,
          }}
        >
          {desk.chats.length === 0
            ? zh
              ? "今天还没有对话"
              : "No chats today"
            : zh
              ? `另有 ${desk.more} 个对话`
              : `${desk.more} more today`}
        </div>
      )}
      {children}
      {desk.reviews.length > 0 && (
        <div
          style={{
            position: "relative",
            margin: `0 ${-bleed.right}px ${-bleed.bottom}px ${-bleed.left}px`,
            padding: `${DESK_SLIP_PAD * scale}px ${bleed.right}px ${DESK_SLIP_PAD * scale}px ${bleed.left}px`,
            background: paper.paper,
            color: paper.ink,
            // The upper slip's shadow falls on it; no perforation (owner).
            boxShadow: `inset 0 ${6 * scale}px ${6 * scale}px ${-6 * scale}px rgba(0,0,0,.35)`,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 4 * scale,
              background: airmailStripes(4 * scale),
            }}
          />
          {label(
            zh ? "审 核" : "REVIEWS",
            paper.word,
            paper.line,
            zh
              ? `开着 ${desk.open} 条${desk.need ? ` · 要你管 ${desk.need}` : ""}`
              : `${desk.open} open${desk.need ? ` · ${desk.need} yours` : ""}`,
          )}
          {desk.reviews.map((review) => {
            const phase = reviewWord(review, zh);
            const ring =
              review.group === "need"
                ? paper.red
                : review.group === "quiet"
                  ? paper.dim
                  : paper.blue;
            return (
              <div
                key={review.id}
                style={{
                  height: DESK_REVIEW * scale,
                  display: "grid",
                  alignContent: "center",
                  lineHeight: `${16 * scale}px`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5 * scale,
                    fontWeight: 600,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      border: `${1.2 * scale}px solid ${ring}`,
                      color: ring,
                      borderRadius: 8 * scale,
                      padding: `0 ${4 * scale}px`,
                      fontSize: 10 * scale,
                      lineHeight: `${13 * scale}px`,
                    }}
                  >
                    {review.round}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {review.title}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10.5 * scale,
                    color: paper.dim,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span style={{ color: tone[phase.tone], fontWeight: 600 }}>
                    {phase.text}
                  </span>
                  {` · ${time(review.at)}`}
                </div>
              </div>
            );
          })}
          {desk.reviewsMore > 0 && (
            <div
              style={{
                height: DESK_NOTE * scale,
                lineHeight: `${DESK_NOTE * scale}px`,
                fontSize: 10.5 * scale,
                color: paper.dim,
              }}
            >
              {zh
                ? `另 ${desk.reviewsMore} 条，展开看全`
                : `${desk.reviewsMore} more on the card`}
            </div>
          )}
        </div>
      )}
    </>
  );
}
