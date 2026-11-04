import type { HUDRect } from "../geometry";
import type { HUDEdge } from "../model";

// The usage panel's receipt (Stage 4): where its sheet sits in the HUD's
// frame, apart from the dock's stubs.

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

/** The room a receipt grown from the dock adds on the dock's side: the gap
 * from the stubs, and its margin inside the paper. */
export const RECEIPT_EXTRA = 16;
/** The gap between the dock's stubs and the receipt's sheet. */
const RECEIPT_GAP = 10;

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The receipt's sheet in `frame`: the whole frame for a card apart from the
 * dock; for a panel grown from it, short of the dock's stubs by RECEIPT_GAP
 * and of the flare on the two sides along the edge. */
export function receiptSheetInset(
  grown: boolean,
  edge: HUDEdge,
  frame: HUDRect,
  strip: HUDRect,
  flare: number,
): Insets {
  if (!grown) return { top: 0, right: 0, bottom: 0, left: 0 };
  const across = horizontal(edge) ? flare : 0,
    along = horizontal(edge) ? 0 : flare;
  return {
    top:
      edge === "top"
        ? Math.max(0, strip.y + strip.height - frame.y) + RECEIPT_GAP
        : along,
    bottom:
      edge === "bottom"
        ? Math.max(0, frame.y + frame.height - strip.y) + RECEIPT_GAP
        : along,
    left:
      edge === "left"
        ? Math.max(0, strip.x + strip.width - frame.x) + RECEIPT_GAP
        : across,
    right:
      edge === "right"
        ? Math.max(0, frame.x + frame.width - strip.x) + RECEIPT_GAP
        : across,
  };
}
