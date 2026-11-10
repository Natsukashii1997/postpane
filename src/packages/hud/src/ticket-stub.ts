// A Dynamic (logos) mark is drawn as a paper ticket stub: the bot on top,
// a tear-off foot under a dashed tear line with one reading, and the marks a
// ticket gets. Kept free of the UI so the
// tests can run it; host/src/hud/plans.rs `strip_width` mirrors the width.

/**
 * A stub's width and height for a bot `logo` points tall: 34 × 44 at 20,
 * short enough for five agents and more down one laptop edge (owner
 * 2026-11-10: lower, the bot unchanged). Along a top or bottom edge the
 * holes run across its end and take 3 units of its height, so it is that
 * much taller and the bot keeps the same room above the foot. The bot is a
 * sticker on its own layer, so Clawd's props may pass over the paper's edges.
 */
export function stubSize(
  logo: number,
  horizontal = false,
): { width: number; height: number } {
  return {
    width: Math.round(logo * 1.7),
    height: Math.round(logo * (horizontal ? 2.35 : 2.2)),
  };
}

/** The holes down a stub's side, one every 10 units: how far the first one's
 * centre sits from the stub's top, so the row is centred on the side and no
 * hole is cut at a corner. */
export function stubHoleStart(logo: number): number {
  const unit = logo / 20,
    pitch = 10 * unit;
  return (stubSize(logo).height % pitch) / 2 + pitch / 2;
}

/** From the stub's top to its bot's top, in points. */
export const stubBotTop = (logo: number) => Math.round(logo * 0.35);

/** The tear-off foot the reading is printed on, in points tall. */
export const stubFootHeight = (logo: number) => Math.round(logo * 0.7);

/** A reading at or past this share of a quota is printed in red. */
export const STUB_WARN_PERCENT = 80;

export interface StubMarks {
  /** Sealed: the agent waits for your approval or answer. */
  sealed: boolean;
  /** The seal reads 答, not 批: every request it waits on is a question. */
  answer: boolean;
  /** The seal reads 换 in green: every request it waits on is a handoff
   * card asking you to switch sessions (#245). */
  handoff: boolean;
  /** The reading is printed in red: its tightest quota is nearly spent. */
  warn: boolean;
}

export function stubMarks(vendor: {
  waiting: number;
  /** How many of the `waiting` requests are questions. */
  questions?: number;
  /** How many of the `waiting` requests are handoff cards (#245). */
  handoffs?: number;
  used: number | null;
}): StubMarks {
  const sealed = vendor.waiting > 0;
  const handoff = sealed && vendor.handoffs === vendor.waiting;
  return {
    sealed,
    answer: sealed && !handoff && vendor.questions === vendor.waiting,
    handoff,
    warn: vendor.used != null && vendor.used >= STUB_WARN_PERCENT,
  };
}

/** What the tear-off foot prints, and on which paper. The agent's own seal
 * (「答」/「批」) comes first; then a relay's stamp, 「审」 on ChatGPT or 「回」
 * on Claude, over the reading. The relay's paper and airmail band go under
 * ChatGPT's foot while it holds a review, and under Claude's while an answer
 * waits — still under its seal, so the reply is not lost (owner, #218). */
export function stubFoot(stub: {
  sealed: boolean;
  /** ChatGPT's desk holds a review. */
  deskReview: boolean;
  /** ChatGPT has a relay's words (「审」). */
  review: boolean;
  /** An answer is back with Claude (「回」). */
  replied: boolean;
}): { relayPaper: boolean; shows: "seal" | "stamp" | "reading" } {
  return {
    relayPaper: (stub.deskReview && !stub.sealed) || stub.replied,
    shows: stub.sealed
      ? "seal"
      : stub.review || stub.replied
        ? "stamp"
        : "reading",
  };
}
