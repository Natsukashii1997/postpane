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

/** The work line's room, px before scale: 「等你 · 在跑 · 接力」 (ADR-0001
 * C3), one row under the rest on every peek with one. */
export const PEEK_WORK = 18;

/** ChatGPT's peek (#145), px before scale: the 对话 label, a chat's row,
 * the line for none or for the rest of today's, and on the lower slip its
 * padding, the 审核 label and a review's two lines. */
export const DESK_LABEL = 18;
export const DESK_CHAT = 20;
export const DESK_NOTE = 18;
export const DESK_SLIP_PAD = 10;
export const DESK_REVIEW = 36;

/** How tall ChatGPT's desk is under the peek's name. */
export function deskHeight(
  desk: NonNullable<HUDVendor["desk"]>,
  scale: number,
): number {
  const upper =
    DESK_LABEL +
    desk.chats.length * DESK_CHAT +
    (desk.chats.length === 0 || desk.more > 0 ? DESK_NOTE : 0);
  const lower = desk.reviews.length
    ? DESK_SLIP_PAD * 2 +
      DESK_LABEL +
      desk.reviews.length * DESK_REVIEW +
      (desk.reviewsMore > 0 ? DESK_NOTE : 0)
    : 0;
  return (upper + lower) * scale;
}

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
 * with none; and the work line where the agent has one. */
export function peekBubbleHeight(
  vendor: Pick<
    HUDVendor,
    "bots" | "quotas" | "balance" | "usage" | "desk" | "work"
  >,
  scale: number,
): number {
  return rowsHeight(vendor, scale) + (vendor.work ? PEEK_WORK * scale : 0);
}

function rowsHeight(
  vendor: Pick<HUDVendor, "bots" | "quotas" | "balance" | "usage" | "desk">,
  scale: number,
): number {
  if (vendor.desk)
    // The padding and the name over its tear, then the desk; a lower slip
    // runs to the foot over the bottom padding.
    return (
      38 * scale +
      PEEK_TEAR * 2 +
      deskHeight(vendor.desk, scale) -
      (vendor.desk.reviews.length ? 10 * scale : 0)
    );
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
