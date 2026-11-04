// The hover panel printed as one receipt (阶段 4「甲 整张票据」, #22): what
// it lists by default. Kept free of the UI so the tests can run it.
import type { PanelBlockLayout, Quota } from "@agent-hud/protocol";

/** How many windows an account lists while Settings chose none: its tightest. */
export const RECEIPT_ROWS = 2;

/** The windows an account's rows print on the receipt. While the block's
 * layout hides no rows by name (Settings never chose), only the `count` most
 * used, in their own order, a stale or unread one last; once Settings chose,
 * every row it left shown. */
export function receiptRows<T extends Quota>(
  rows: readonly T[],
  layout: PanelBlockLayout | undefined,
  count = RECEIPT_ROWS,
): T[] {
  if (layout?.hiddenRows !== undefined || rows.length <= count)
    return [...rows];
  const tightest = new Set(
    rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => used(b.row) - used(a.row) || a.index - b.index)
      .slice(0, count)
      .map(({ row }) => row),
  );
  return rows.filter((row) => tightest.has(row));
}

const used = (row: Quota) =>
  row.status === "stale" || row.usedPercent == null ? -1 : row.usedPercent;
