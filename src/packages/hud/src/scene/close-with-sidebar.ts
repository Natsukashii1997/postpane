// What closes as the sidebar settles, so the next card opens as the owner
// set (#374, #382, #430): any list opened past its first few folds back once
// the card closes, even with a tag still out (#448), and the line picked
// gives way to the first again (owner, 2026-11-28); the handoff card waits
// until the sidebar folds away with no news card out.
import { useEffect } from "react";
import { openHandoffCard } from "../alerts/handoff-store.ts";
import { backlogAsks, cardFolds, cardPicks } from "../panel/fold-store.ts";

export function closesWith(open: boolean, news: boolean) {
  return { handoff: !open && !news, folds: !open };
}

export function useCloseWithSidebar(open: boolean, news: boolean) {
  const { handoff, folds } = closesWith(open, news);
  useEffect(() => {
    if (handoff) openHandoffCard(null);
  }, [handoff]);
  useEffect(() => {
    if (!folds) return;
    cardFolds.reset();
    cardPicks.reset();
    backlogAsks.reset();
  }, [folds]);
}
