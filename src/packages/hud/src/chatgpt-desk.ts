// What the ChatGPT mark shows (#145, the owner's 甲 · 一格两栏 · 两联): the
// owner's own chats on the receipt's upper slip, the reviews PostPane opened
// on the old-letter-paper lower slip, and on the stub the one thing that
// matters most.
import type { Handoff, Session } from "@agent-hud/protocol";
import { dateFormat, systemTimeZone } from "@agent-hud/ui/format";
import { handoffFor, round } from "./alerts/handoff-card.ts";
import { liveHandoffs } from "./alerts/handoff-doer.ts";

/** A relay left open with its Claude session gone quiet this long is no
 * longer the owner's business on the sidebar. */
export const STALE_REVIEW = 2 * 60 * 60_000;
/** The upper slip lists at most this many chats. */
export const DESK_CHATS = 3;

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
  reviews: DeskReview[];
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
  const reviews = handoffs
    .filter((h) => h.status === "open" || h.status === "opening")
    .filter(
      (h) =>
        live.has(h.claudeSession) ||
        now - (h.phaseAt || h.updatedAt) <= STALE_REVIEW,
    )
    .sort((a, b) => (b.phaseAt || b.updatedAt) - (a.phaseAt || a.updatedAt))
    .map((h): DeskReview => {
      const r = round(h);
      return {
        id: h.id,
        title: h.title,
        round: `${r.at}/${r.of}`,
        phase: phaseOf(h),
        at: h.phaseAt || h.updatedAt,
      };
    });
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
    reviews,
    pressing: stub.tone === "amber" || stub.tone === "blue",
    stub,
  };
}

/** The open handoffs ChatGPT is not answering now (#288): none of the
 * listed review rows is theirs, so the slip lists them too, newest first,
 * however long they have been quiet and wherever their doer is. */
export function quietRelays(
  handoffs: readonly Handoff[],
  reviewSessions: readonly string[],
): Handoff[] {
  const shown = new Set(
    reviewSessions.flatMap((id) => {
      const handoff = handoffFor(handoffs, "chatgpt", id);
      return handoff ? [handoff.id] : [];
    }),
  );
  return liveHandoffs(handoffs).filter((handoff) => !shown.has(handoff.id));
}
