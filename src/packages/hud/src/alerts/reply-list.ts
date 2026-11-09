import type { Handoff, IslandEvent, Session } from "@agent-hud/protocol";
import { isReview } from "../chatgpt-desk.ts";
import { tokensShort } from "@agent-hud/ui/format";
import {
  REPLY_BADGE,
  approvalGroups,
  entryTitle,
  findSession,
  type ApprovalEntry,
} from "../permissions/approval-list.ts";

/** The reply card's lines: one per reply waiting, with its session. */
export function replyEntries(
  replies: readonly IslandEvent[],
  sessions: readonly Session[],
): ApprovalEntry[] {
  return replies.map((event) => ({
    kind: "reply",
    id: event.id,
    at: event.at,
    badge: REPLY_BADGE,
    event,
    session: findSession(sessions, event.sessionId, event.source),
  }));
}

/** The replies newest first; a reply without a readable time goes last. */
export function newestFirst(entries: readonly ApprovalEntry[]) {
  const time = (entry: ApprovalEntry) => {
    const at = Date.parse(entry.at);
    return Number.isFinite(at) ? at : Number.NEGATIVE_INFINITY;
  };
  return [...entries].sort((a, b) => time(b) - time(a));
}

/** The newest reply: the one the card opens. */
export function newestReply(
  entries: readonly ApprovalEntry[],
): ApprovalEntry | undefined {
  return newestFirst(entries)[0];
}

/** The reply the card shows open: the one its row was clicked on while it
 * waits, else the newest (#220). */
export function openReplyId(
  entries: readonly ApprovalEntry[],
  chosen: string | null,
): string | undefined {
  return chosen && entries.some((entry) => entry.id === chosen)
    ? chosen
    : newestReply(entries)?.id;
}

/** What going back to a reply's session puts away: every reply waiting from
 * that session (#220). */
export function sessionReplies(
  entries: readonly ApprovalEntry[],
  entry: ApprovalEntry,
): string[] {
  if (entry.kind !== "reply" || !entry.event.sessionId) return [entry.id];
  const { source, sessionId } = entry.event;
  return entries
    .filter(
      (each) =>
        each.kind === "reply" &&
        each.event.source === source &&
        each.event.sessionId === sessionId,
    )
    .map((each) => each.id);
}

/** The card's list: newest first, grouped by sidebar section as the waiting
 * list is, the newest open; the owner's own ChatGPT chats under their own
 * heading (#145). */
export function replyGroups(
  entries: readonly ApprovalEntry[],
  limit?: number,
  zh = true,
) {
  return approvalGroups(
    entries,
    newestReply(entries)?.id ?? null,
    limit,
    newestFirst,
    (entry) =>
      entry.kind === "reply" && entry.event.source === "chatgpt"
        ? zh
          ? "ChatGPT 对话"
          : "ChatGPT chats"
        : entry.session?.section?.trim() || null,
  );
}

/** Whether a reply is a review's (#145): a ChatGPT reply in a relay, or in a
 * conversation PostPane opened. Those go on the card's lower slip. */
export function isReviewReply(
  entry: ApprovalEntry,
  handoffs: readonly Handoff[],
): boolean {
  if (entry.kind !== "reply" || entry.event.source !== "chatgpt") return false;
  const id = entry.event.sessionId ?? entry.session?.id;
  return Boolean(
    id && isReview({ id, review: entry.session?.review }, handoffs),
  );
}

/** What the reply said: its own message, else the session's last one. */
export function replyMessage(
  event: IslandEvent,
  session: Session | undefined,
): string | null {
  return (event.message ?? session?.liveFacts?.message)?.trim() || null;
}

/** How long a turn took: "4 分 10 秒", "35 秒", "1 小时 5 分". */
export function tookText(seconds: number, zh: boolean): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600),
    m = Math.floor((total % 3600) / 60),
    s = total % 60;
  if (h > 0)
    return zh
      ? m > 0
        ? `${h} 小时 ${m} 分`
        : `${h} 小时`
      : `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return zh ? `${m} 分 ${s} 秒` : `${m}m ${s}s`;
  return zh ? `${s} 秒` : `${s}s`;
}

/** The open reply's facts: how long its turn took (from the turn's start to
 * the reply) and the session's tokens so far; each null when unknown. */
export function replyFacts(
  event: IslandEvent,
  session: Session | undefined,
  zh: boolean,
): { took: string | null; tokens: string | null } {
  const started = Date.parse(
    event.startedAt ?? session?.liveFacts?.turnStartedAt ?? "",
  );
  const ended = Date.parse(event.at);
  const took =
    Number.isFinite(started) && Number.isFinite(ended) && ended > started
      ? tookText((ended - started) / 1000, zh)
      : null;
  const tokens =
    session && session.tokens > 0 ? tokensShort(session.tokens) : null;
  return { took, tokens };
}

/** The folded tag for the replies: the newest one's reply, its title (its
 * session's, else `fallback`) and how many replies wait. */
export interface ReplyChip {
  event: IslandEvent;
  title: string;
  count: number;
  /** The Hermes bot whose session the newest reply is, for its seal. */
  bot: { id: string; name: string } | null;
}

export function replyChip(
  replies: readonly IslandEvent[],
  sessions: readonly Session[],
  fallback: (event: IslandEvent) => string,
): ReplyChip | undefined {
  const newest = newestReply(replyEntries(replies, sessions));
  if (!newest || newest.kind !== "reply") return undefined;
  return {
    event: newest.event,
    title: entryTitle(newest, fallback(newest.event)),
    count: replies.length,
    bot: newest.session?.bot ?? null,
  };
}
