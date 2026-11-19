// What the ChatGPT mark shows (#145, the owner's 甲 · 一格两栏 · 两联): the
// owner's own chats on the receipt's upper slip, the reviews PostPane opened
// on the old-letter-paper lower slip, and on the stub the one thing that
// matters most.
import type { Handoff, Session } from "@agent-hud/protocol";
import { dateFormat, systemTimeZone } from "@agent-hud/ui/format";
import { round } from "./alerts/handoff-card.ts";
import { stopped } from "./alerts/relay-stop.ts";
import {
  busySessions,
  groupRelays,
  STALE_REVIEW,
  type RelayGroup,
} from "./relay-groups.ts";

export { STALE_REVIEW };
/** The upper slip lists at most this many chats. */
export const DESK_CHATS = 3;
/** The lower slip lists at most this many relays; the card lists them all
 * (#427). */
export const DESK_REVIEWS = 4;

export interface DeskChat {
  id: string;
  title: string;
  state: "answering" | "replied";
  /** Milliseconds: the turn's start while answering, else its reply. */
  at: number;
}

export interface DeskReview {
  id: string;
  title: string;
  /** 「1/2」: the round it is in, of how many. */
  round: string;
  phase: NonNullable<Handoff["phase"]>;
  at: number;
  /** 要你管, 在动 or 静着 (#427). */
  group: RelayGroup;
  /** Stopped at its cap (「停」), or its auto round trip paused. */
  stopped: boolean;
  paused: boolean;
}

export interface ChatGPTDesk {
  /** The receipt's chats: the first `DESK_CHATS` of `day`. */
  chats: DeskChat[];
  /** Every chat of today, answering first: ChatGPT's own panel lists them
   * all, as many as the stub counts (#219). */
  day: DeskChat[];
  /** Today's chats past the ones listed. */
  more: number;
  /** How many chats had a turn today. */
  today: number;
  /** The relays the lower slip lists: the first `DESK_REVIEWS` of the
   * open ones, in their groups (#427). */
  reviews: DeskReview[];
  /** How many relays are open, how many of them are the person's, and how
   * many the slip leaves unlisted. */
  open: number;
  need: number;
  reviewsMore: number;
  /** The stub says something more pressing than an overdue review: ChatGPT
   * answering, or a reply to read. 「未审」 waits meanwhile (owner, #213). */
  pressing: boolean;
  stub: {
    text: string;
    tone: "amber" | "blue" | "ink" | "dim";
    /** The stub's foot is printed on the reviews' paper. */
    review: boolean;
  };
}

/** Whether a ChatGPT session is a review PostPane opened: Core says so, or a
 * relay names its conversation. */
export function isReview(
  session: Pick<Session, "id" | "review">,
  handoffs: readonly Handoff[],
): boolean {
  if (session.review) return true;
  const conversation = session.id.replace(/^chatgpt:/, "");
  return handoffs.some((h) => h.chatgptConversation === conversation);
}

const phaseOf = (h: Handoff): NonNullable<Handoff["phase"]> =>
  h.phase ??
  (h.status === "failed"
    ? "failed"
    : h.status === "opening"
      ? "sending"
      : "delivered");

const at = (s: Pick<Session, "lastMessageAt" | "updatedAt">) =>
  Date.parse(s.lastMessageAt ?? s.updatedAt ?? "") || 0;

export function chatgptDesk(
  snapshot: {
    sessions: readonly Session[];
    handoffs?: readonly Handoff[] | null;
  },
  now: number,
  zh: boolean,
): ChatGPTDesk {
  const handoffs = snapshot.handoffs ?? [];
  const day = (ms: number) =>
    dateFormat("en-CA", { timeZone: systemTimeZone() }).format(ms);
  const today = day(now);
  const live = new Set(
    snapshot.sessions
      .filter((s) => s.state === "running" || s.state === "waiting")
      .map((s) => s.id),
  );
  const own = snapshot.sessions.filter(
    (s) => s.source === "chatgpt" && !isReview(s, handoffs),
  );
  const todays = own
    .filter((s) => live.has(s.id) || day(at(s)) === today)
    .sort(
      (a, b) =>
        Number(live.has(b.id)) - Number(live.has(a.id)) || at(b) - at(a),
    );
  const listed = todays.map((s): DeskChat => ({
    id: s.id,
    title: s.title,
    state: live.has(s.id) ? "answering" : "replied",
    at:
      (live.has(s.id) && Date.parse(s.liveFacts?.turnStartedAt ?? "")) || at(s),
  }));
  const chats = listed.slice(0, DESK_CHATS);
  const grouped = groupRelays(handoffs, snapshot.sessions, now);
  const listedReviews = grouped.map(({ handoff: h, group, at }): DeskReview => {
    const r = round(h);
    return {
      id: h.id,
      title: h.title,
      round: `${r.at}/${r.of}`,
      phase: phaseOf(h),
      at,
      group,
      stopped: stopped(h),
      paused: Boolean(h.halt) && !h.auto,
    };
  });
  // The stub and 「在答」 go by the relays moved in the last two hours or
  // whose doer is at work, as before #427 (owner, #213).
  const busy = busySessions(snapshot.sessions);
  const reviews = listedReviews.filter(
    (r, index) =>
      now - r.at <= STALE_REVIEW ||
      busy.has(grouped[index].handoff.claudeSession),
  );
  const answering =
    chats.some((c) => c.state === "answering") ||
    reviews.some((r) => r.phase === "working") ||
    snapshot.sessions.some(
      (s) => s.source === "chatgpt" && live.has(s.id) && isReview(s, handoffs),
    );
  const review = reviews.length > 0;
  const stub: ChatGPTDesk["stub"] = reviews.some((r) => r.phase === "replied")
    ? { text: zh ? "待你看" : "Review", tone: "amber", review }
    : answering
      ? { text: zh ? "在答" : "Live", tone: "blue", review }
      : todays.length
        ? {
            text: zh ? `${todays.length} 对话` : `${todays.length} chats`,
            tone: "ink",
            review,
          }
        : { text: "--", tone: "dim", review };
  return {
    chats,
    day: listed,
    more: Math.max(0, todays.length - chats.length),
    today: todays.length,
    reviews: listedReviews.slice(0, DESK_REVIEWS),
    open: listedReviews.length,
    need: listedReviews.filter((r) => r.group === "need").length,
    reviewsMore: Math.max(0, listedReviews.length - DESK_REVIEWS),
    pressing: stub.tone === "amber" || stub.tone === "blue",
    stub,
  };
}
