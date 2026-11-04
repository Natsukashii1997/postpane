// A Dynamic (logos) mark is drawn as a paper ticket stub: the bot, one
// reading under it, and the marks a ticket gets. Kept free of the UI so the
// tests can run it; host/src/hud/plans.rs `strip_width` mirrors the width.

/**
 * A stub's width and height for a bot `logo` points tall: 42 × 62 at 20,
 * tall enough that Clawd's props (reaching 0.6 of a logo past its frame,
 * BotMark's canvas pad) clear the reading at the stub's foot.
 */
export function stubSize(logo: number): { width: number; height: number } {
  return { width: Math.round(logo * 2.1), height: Math.round(logo * 3.1) };
}

/** From the stub's top to its bot's top, in points. */
export const stubBotTop = (logo: number) => Math.round(logo * 0.5);

/** A reading at or past this share of a quota is printed in red. */
export const STUB_WARN_PERCENT = 80;

export interface StubMarks {
  /** Punched: the agent is working and not waiting on you. */
  punched: boolean;
  /** Sealed: the agent waits for your approval or answer. */
  sealed: boolean;
  /** The reading is printed in red: its tightest quota is nearly spent. */
  warn: boolean;
}

export function stubMarks(vendor: {
  working: number;
  waiting: number;
  used: number | null;
}): StubMarks {
  const sealed = vendor.waiting > 0;
  return {
    punched: vendor.working > 0 && !sealed,
    sealed,
    warn: vendor.used != null && vendor.used >= STUB_WARN_PERCENT,
  };
}
