// What closes with the sidebar, folded away with no news card out: the
// handoff card, and any list opened past its first few, so the next card
// opens folded as the owner set (#374, #382, #430).
import { useEffect } from "react";
import { openHandoffCard } from "../alerts/handoff-store";
import { cardFolds } from "../panel/fold-store";

export function useCloseWithSidebar(shown: boolean) {
  useEffect(() => {
    if (shown) return;
    openHandoffCard(null);
    cardFolds.reset();
  }, [shown]);
}
