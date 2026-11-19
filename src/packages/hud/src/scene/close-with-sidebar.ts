// What closes as the sidebar settles, so the next card opens as the owner
// set (#374, #382, #430): any list opened past its first few folds back once
// the card closes, even with a tag still out (#448); the handoff card waits
// until the sidebar folds away with no news card out.
import { useEffect } from "react";
import { openHandoffCard } from "../alerts/handoff-store.ts";
import { cardFolds } from "../panel/fold-store.ts";

export function closesWith(open: boolean, news: boolean) {
  return { handoff: !open && !news, folds: !open };
}

export function useCloseWithSidebar(open: boolean, news: boolean) {
  const { handoff, folds } = closesWith(open, news);
  useEffect(() => {
    if (handoff) openHandoffCard(null);
  }, [handoff]);
  useEffect(() => {
    if (folds) cardFolds.reset();
  }, [folds]);
}
