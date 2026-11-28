// A button's word that turns into its receipt for a moment ("Copy" to
// "Copied", "Save" to "Saved") and back. Every receipt in Settings lasts as
// long; both words lie on one spot, so the button keeps its width while
// they cross fade.
import type { ReactNode } from "react";
import { Swap } from "../../lib/Motion";
import { useBriefly } from "./use-status";

const receiptMs = 1600;

/** The label to draw (the word, or its receipt while one is showing) and
 * the call that shows the receipt. */
export function useReceipt() {
  const [shown, setShown] = useBriefly<true>(receiptMs);
  const label = (idle: ReactNode, done: ReactNode) => (
    <Swap flipped={shown === true} idle={idle} done={done} />
  );
  return [label, () => setShown(true)] as const;
}
