import type { Handoff, Snapshot } from "@agent-hud/protocol";
import { STORY } from "./scene/flight-plan.ts";

/** What relays print on the stubs (#171), by the phase they are in rather
 * than by the letter flying: ChatGPT's reading gives way to a blue 「审」
 * stamp while it has the words, rippling while it answers; Claude's stub
 * takes a red 「回」 wax seal in its corner while an answer waits for the
 * person. `since` is when the words moved (the step), so a stamp that comes
 * while its letter is still in the air waits for it to land. */
export interface RelayStamps {
  /** ChatGPT has the words of a relay (delivered or answering). */
  review: boolean;
  /** ChatGPT is answering one now. */
  answering: boolean;
  /** An answer is back with Claude, waiting for the person. */
  replied: boolean;
  /** When the latest of those words moved, in milliseconds. */
  since: number | null;
}

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

/** The stamps for ChatGPT's mark or Claude's (`end`); none for other
 * agents, or when no relay stands where it would print one. */
export function relayStamps(
  snapshot: Pick<Snapshot, "handoffs">,
  end: "chatgpt" | "claude" | null,
): RelayStamps | undefined {
  const open = (snapshot.handoffs ?? []).filter(
    (handoff) => handoff.status === "open",
  );
  if (end === "chatgpt") {
    const reviewing = open.filter(
      (handoff) => handoff.phase === "delivered" || handoff.phase === "working",
    );
    if (!reviewing.length) return undefined;
    return {
      review: true,
      answering: reviewing.some((handoff) => handoff.phase === "working"),
      replied: false,
      since: latest(reviewing.map((handoff) => moved(handoff, "ask"))),
    };
  }
  if (end === "claude") {
    const replied = open.filter((handoff) => handoff.phase === "replied");
    if (!replied.length) return undefined;
    return {
      review: false,
      answering: false,
      replied: true,
      since: latest(replied.map((handoff) => moved(handoff, "reply"))),
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
