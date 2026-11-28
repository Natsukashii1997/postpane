import type { Handoff, Snapshot } from "@agent-hud/protocol";
import { STALE_REVIEW } from "./chatgpt-desk.ts";
import { doerOf, type Doer } from "./alerts/handoff-doer.ts";
import { settledSince, stopped as atCap } from "./alerts/relay-stop.ts";
import { STORY } from "./scene/flight-plan.ts";

/** What relays print on the stubs (#171), by the phase they are in rather
 * than by the letter flying: ChatGPT's reading gives way to a blue 「审」
 * stamp while it has the words, rippling while it answers; the doer's stub
 * (Claude's, or Codex's for a review Codex handed over, #282) takes the same
 * stamp as 「回」 over its reading while an answer waits for the person. `since` is when the words moved (the step), so a stamp that comes
 * while its letter is still in the air waits for it to land. */
export interface RelayStamps {
  /** ChatGPT has the words of a relay (delivered or answering). */
  review: boolean;
  /** ChatGPT is answering one now. */
  answering: boolean;
  /** A relay stopped at its cap waits for the person: 「停」 in wax red on
   * ChatGPT's stub until it is ended or reviewed on (owner 2026-11-19, 甲,
   * #409). Before every other stamp there, and it never yields. */
  stopped: boolean;
  /** An answer is back with the doer, waiting for the person. */
  replied: boolean;
  /** When the latest of those words moved, in milliseconds. */
  since: number | null;
  /** A relay's words have sat with ChatGPT past the wait ({@link waitEnds})
   * with no answer: 「未审」 in red, and the mark goes to that conversation. */
  overdue: boolean;
  /** An overdue one has sat past {@link LINGERS_MS}: its 「未审」 ripples
   * as 「审」 does while ChatGPT answers, until the relay ends (#213). */
  lingering: boolean;
  /** The ChatGPT conversation the mark goes to while one is overdue. */
  conversation?: string;
  /** When the stamps next change on their own (a review falls overdue, or
   * an overdue one starts to linger). */
  until: number | null;
}

/** How long ChatGPT has to answer before the review counts as overdue; the
 * host hands the relay back at the same mark (REPLY_WAIT_MS in host/src/handoff/book.rs). */
export const REPLY_WAIT_MS = 30 * 60 * 1000;
/** Past that, a reread that found it writing this recently keeps the wait
 * on, up to {@link REPLY_MOST_MS} (owner 2026-11-27, #544; the host's
 * `WRITING_FRESH_MS` and `REPLY_MOST_MS` in handoff/answers/book_reread.rs). */
export const WRITING_FRESH_MS = 5 * 60 * 1000;
export const REPLY_MOST_MS = 2 * 60 * 60 * 1000;

/** When the wait for ChatGPT's answer runs out, as things stand: the host
 * stops the round trip then, and the stub turns 「未审」. */
export function waitEnds(handoff: Handoff, since: number): number {
  const read = handoff.rereading;
  const writing =
    read && read.epoch === handoff.phaseAt && read.streamed
      ? read.streamed
      : null;
  const ends =
    writing == null
      ? since + REPLY_WAIT_MS
      : Math.max(since + REPLY_WAIT_MS, writing + WRITING_FRESH_MS);
  return Math.min(ends, since + REPLY_MOST_MS);
}

/** How long an overdue review sits before its 「未审」 ripples (owner,
 * 2026-11-07, #213): when the panel stops listing the review. */
export const LINGERS_MS = STALE_REVIEW;

/** How long after the words move the letter lands in the receiver: the
 * flight's story up to the letter sliding in. */
export const LETTER_LANDS_MS =
  STORY.pack + STORY.fold + STORY.fly + STORY.unfold + STORY.handIn;

const moved = (handoff: Handoff, kind: "ask" | "reply") =>
  [...(handoff.steps ?? [])].reverse().find((step) => step.kind === kind)?.at ??
  handoff.phaseAt ??
  null;

const latest = (times: (number | null)[]) =>
  times.reduce<number | null>(
    (most, time) =>
      time != null && (most == null || time > most) ? time : most,
    null,
  );

/** The stamps for ChatGPT's mark or a doer's (`end`: Claude, Codex); none
 * for other agents, or when no relay stands where it would print one. `yields`: the
 * ChatGPT stub has something more pressing to say (answering, a reply to
 * read), so an overdue review prints nothing meanwhile (owner, #213). */
export function relayStamps(
  snapshot: Pick<Snapshot, "handoffs">,
  end: "chatgpt" | Doer | null,
  now = Date.now(),
  yields = false,
): RelayStamps | undefined {
  const open = (snapshot.handoffs ?? []).filter(
    (handoff) => handoff.status === "open",
  );
  if (end === "chatgpt") {
    const all = snapshot.handoffs ?? [];
    const top = all.filter((h) => atCap(h) && !settledSince(h, all));
    if (top.length)
      return {
        review: true,
        answering: false,
        stopped: true,
        replied: false,
        since: latest(top.map((handoff) => handoff.topAt ?? null)),
        overdue: false,
        lingering: false,
        until: null,
      };
    const waiting = open.filter(
      (handoff) => handoff.phase === "delivered" || handoff.phase === "working",
    );
    const since = (handoff: Handoff) =>
      handoff.phaseAt ?? moved(handoff, "ask") ?? now;
    // Owner, 2026-11-07: 「审」 only while ChatGPT really has it; a relay
    // stopped or handed back prints nothing, and one left unanswered past
    // the wait prints 「未审」 so it is seen and taken to ChatGPT.
    const ends = (handoff: Handoff) => waitEnds(handoff, since(handoff));
    const overdue = waiting
      .filter((handoff) => !yields && now > ends(handoff))
      .sort((a, b) => since(b) - since(a));
    const lingering = overdue.some(
      (handoff) => now - since(handoff) > LINGERS_MS,
    );
    const reviewing = waiting.filter(
      (handoff) => !handoff.halt && now <= ends(handoff),
    );
    if (!overdue.length && !reviewing.length) return undefined;
    // A review falling overdue, or an overdue one starting to linger.
    const turns = [
      ...reviewing.map((handoff) => ends(handoff) + 1),
      ...(lingering
        ? []
        : overdue.map((handoff) => since(handoff) + LINGERS_MS + 1)),
    ];
    return {
      review: true,
      answering:
        !overdue.length &&
        reviewing.some((handoff) => handoff.phase === "working"),
      stopped: false,
      replied: false,
      since: latest(
        (overdue.length ? overdue : reviewing).map((handoff) =>
          moved(handoff, "ask"),
        ),
      ),
      overdue: overdue.length > 0,
      lingering,
      conversation: overdue[0]?.chatgptConversation ?? undefined,
      until: turns.length ? Math.min(...turns) : null,
    };
  }
  if (end) {
    // An answer back with the doer while the auto round trip is stopped
    // waits for the person as one held on the sidebar did (#410 S1: those
    // go back all the same now), so it keeps the same 「回」. Not one at its
    // cap: that is ChatGPT's 「停」, and Claude's stub stays as it was (#409).
    const waitsForPerson = (handoff: Handoff) =>
      handoff.phase === "replied" ||
      (handoff.phase === "returned" &&
        !handoff.auto &&
        !!handoff.halt &&
        !atCap(handoff));
    const replied = open.filter(
      (handoff) => waitsForPerson(handoff) && doerOf(handoff) === end,
    );
    if (!replied.length) return undefined;
    return {
      review: false,
      answering: false,
      stopped: false,
      replied: true,
      since: latest(replied.map((handoff) => moved(handoff, "reply"))),
      overdue: false,
      lingering: false,
      until: null,
    };
  }
  return undefined;
}

/** How long a stamp that shows up now waits for its letter to land: none
 * once it has, or for words that moved before this mark could see them. */
export function stampWait(since: number | null, now: number): number {
  if (since == null) return 0;
  const left = since + LETTER_LANDS_MS - now;
  return left > 0 && left <= LETTER_LANDS_MS ? left : 0;
}

/** The relays' stamp inks (owner 2026-11-11, 甲 · 赭金): 「审」 in the relay
 * paper's blue, 「回」 in ochre so the relay's two ends read apart at a
 * glance, and 「未审」 in the wax red. */
export const STAMP_INK = {
  review: "#3a5c96",
  reply: "#99591a",
  overdue: "#b3261e",
} as const;

export function stampInk(stamp: {
  overdue: boolean;
  reply: boolean;
  stopped?: boolean;
}): string {
  return stamp.overdue || stamp.stopped
    ? STAMP_INK.overdue
    : stamp.reply
      ? STAMP_INK.reply
      : STAMP_INK.review;
}
