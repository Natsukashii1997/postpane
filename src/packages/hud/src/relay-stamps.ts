import type { Handoff, Snapshot } from "@agent-hud/protocol";
import { STALE_REVIEW } from "./chatgpt-desk.ts";
import { doerOf, type Doer } from "./alerts/handoff-doer.ts";
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
  /** An answer is back with the doer, waiting for the person. */
  replied: boolean;
  /** When the latest of those words moved, in milliseconds. */
  since: number | null;
  /** A relay's words have sat with ChatGPT past {@link REPLY_WAIT_MS} with no
   * answer: 「未审」 in red, and the mark goes to that conversation. */
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
 * host hands the relay back at the same mark (REPLY_WAIT_MS in handoffs.rs). */
export const REPLY_WAIT_MS = 30 * 60 * 1000;

/** How long an overdue review sits before its 「未审」 ripples (owner,
 * 2026-11-07, #213): when the panel stops listing the review. */
export const LINGERS_MS = STALE_REVIEW;

/** How long after the words move the letter lands in the receiver: the
 * flight's story up to the letter sliding in. */
export const LETTER_LANDS_MS =
  STORY.pack +
  STORY.fold +
  STORY.fly +
  STORY.unfold +
  Math.round(STORY.deliver * 0.7);

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
    const waiting = open.filter(
      (handoff) => handoff.phase === "delivered" || handoff.phase === "working",
    );
    const since = (handoff: Handoff) =>
      handoff.phaseAt ?? moved(handoff, "ask") ?? now;
    // Owner, 2026-11-07: 「审」 only while ChatGPT really has it; a relay
    // stopped or handed back prints nothing, and one left unanswered past
    // the wait prints 「未审」 so it is seen and taken to ChatGPT.
    const overdue = waiting
      .filter((handoff) => !yields && now - since(handoff) > REPLY_WAIT_MS)
      .sort((a, b) => since(b) - since(a));
    const lingering = overdue.some(
      (handoff) => now - since(handoff) > LINGERS_MS,
    );
    const reviewing = waiting.filter(
      (handoff) => !handoff.halt && now - since(handoff) <= REPLY_WAIT_MS,
    );
    if (!overdue.length && !reviewing.length) return undefined;
    // A review falling overdue, or an overdue one starting to linger.
    const turns = [
      ...reviewing.map((handoff) => since(handoff) + REPLY_WAIT_MS + 1),
      ...(lingering
        ? []
        : overdue.map((handoff) => since(handoff) + LINGERS_MS + 1)),
    ];
    return {
      review: true,
      answering:
        !overdue.length &&
        reviewing.some((handoff) => handoff.phase === "working"),
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
    const replied = open.filter(
      (handoff) => handoff.phase === "replied" && doerOf(handoff) === end,
    );
    if (!replied.length) return undefined;
    return {
      review: false,
      answering: false,
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

export function stampInk(stamp: { overdue: boolean; reply: boolean }): string {
  return stamp.overdue
    ? STAMP_INK.overdue
    : stamp.reply
      ? STAMP_INK.reply
      : STAMP_INK.review;
}
