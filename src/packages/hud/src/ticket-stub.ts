// A Dynamic (logos) mark is drawn as a paper ticket stub: the bot on top,
// a tear-off foot under a dashed tear line with one reading, and the marks a
// ticket gets. Kept free of the UI so the
// tests can run it; host/src/hud/plans.rs `strip_width` mirrors the width.

/**
 * A stub's width and height for a bot `logo` points tall: 34 × 50 at 20,
 * slim enough for a dozen agents down one laptop edge. The bot is a sticker
 * on its own layer, so Clawd's props may pass over the paper's edges.
 */
export function stubSize(logo: number): { width: number; height: number } {
  return { width: Math.round(logo * 1.7), height: Math.round(logo * 2.5) };
}

/** From the stub's top to its bot's top, in points. */
export const stubBotTop = (logo: number) => Math.round(logo * 0.35);

/** The tear-off foot the reading is printed on, in points tall. */
export const stubFootHeight = (logo: number) => Math.round(logo * 0.7);

/** A reading at or past this share of a quota is printed in red. */
export const STUB_WARN_PERCENT = 80;

export interface StubMarks {
  /** Punched: the agent is working and not waiting on you. */
  punched: boolean;
  /** Sealed: the agent waits for your approval or answer. */
  sealed: boolean;
  /** The seal reads 答, not 批: every request it waits on is a question. */
  answer: boolean;
  /** The reading is printed in red: its tightest quota is nearly spent. */
  warn: boolean;
}

export function stubMarks(vendor: {
  working: number;
  waiting: number;
  /** How many of the `waiting` requests are questions. */
  questions?: number;
  used: number | null;
}): StubMarks {
  const sealed = vendor.waiting > 0;
  return {
    punched: vendor.working > 0 && !sealed,
    sealed,
    answer: sealed && vendor.questions === vendor.waiting,
    warn: vendor.used != null && vendor.used >= STUB_WARN_PERCENT,
  };
}
