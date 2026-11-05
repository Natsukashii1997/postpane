// How tall the strip's peek bubble is, as AgentPeek lays out its rows;
// `useHUDLayout` sizes the surface by it.
import type { HUDVendor } from "../model";

/** The room under the name for the receipt's tear line, on top of the
 * peek's rows. */
export const PEEK_TEAR = 3;

/** A Hermes bot's line, in px before scale: its name and state over the
 * detail (issue #108). */
export const PEEK_BOT_ROW = 36;

/** The dashed rule between the bots and their tokens, with its room. */
export const PEEK_RULE = PEEK_TEAR * 2 + 2;

/** Whether the peek shows Hermes's bots: an agent with bots and no quota
 * or balance to print. */
export function showsBots(
  vendor: Pick<HUDVendor, "bots" | "quotas" | "balance">,
): boolean {
  return Boolean(
    vendor.bots?.length && !vendor.quotas.length && !vendor.balance,
  );
}

/** The bubble's height: the name over its tear, then either each bot and
 * the last day's tokens under a rule, or each reading, or one "--" row
 * with none. */
export function peekBubbleHeight(
  vendor: Pick<HUDVendor, "bots" | "quotas" | "balance" | "usage">,
  scale: number,
): number {
  if (showsBots(vendor))
    return (
      (20 +
        18 +
        (vendor.bots?.length ?? 0) * PEEK_BOT_ROW +
        (vendor.usage ? 18 : 0)) *
        scale +
      PEEK_TEAR * 2 +
      (vendor.usage ? PEEK_RULE : 0)
    );
  return (
    (20 +
      (1 + Math.max(1, vendor.quotas.length + (vendor.balance ? 1 : 0))) * 18) *
      scale +
    PEEK_TEAR * 2
  );
}
