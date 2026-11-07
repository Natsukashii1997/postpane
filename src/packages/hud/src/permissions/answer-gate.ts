import type { RequestDecision } from "@agent-hud/protocol";

/** Sends `decision`, and forgets the card's draft only once it went: a send
 * that failed leaves the card up with what the user wrote (#222). */
export async function sendThenForget(
  send: (decision: RequestDecision) => Promise<boolean>,
  decision: RequestDecision,
  forget: () => void,
): Promise<void> {
  if (await send(decision)) forget();
}

/** How long the card that takes the place of one just answered refuses
 * clicks: the second click of a double click would answer it unseen (#222). */
export const SETTLE_MS = 400;

/** How soon after an answer a card counts as the one that took its place;
 * a card shown later came on its own and takes clicks at once. */
export const FOLLOWS_MS = 2000;

/** Whether a click on a card shown at `shownAt` is refused at `now`, the last
 * answer having been sent at `answeredAt`. */
export function refusesClick({
  answeredAt,
  shownAt,
  now,
}: {
  answeredAt: number | null;
  shownAt: number;
  now: number;
}): boolean {
  return (
    answeredAt !== null &&
    answeredAt <= shownAt &&
    shownAt - answeredAt < FOLLOWS_MS &&
    now - shownAt < SETTLE_MS
  );
}
