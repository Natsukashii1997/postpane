// The words a relay's row on ChatGPT's peek prints (#145, #427): moved out
// of DeskLines.tsx for the 300-line ratchet.
import type { DeskReview } from "../chatgpt-desk";

/** What a review's phase reads as on the slip, and in which ink. */
export function reviewPhase(
  phase: DeskReview["phase"],
  zh: boolean,
): { text: string; tone: "amber" | "blue" | "red" | "dim" } {
  switch (phase) {
    case "replied":
      return { text: zh ? "待你看" : "Your call", tone: "amber" };
    case "working":
      return { text: zh ? "审核中" : "Reviewing", tone: "blue" };
    case "sending":
      return { text: zh ? "送出中" : "Sending", tone: "dim" };
    case "delivered":
      return { text: zh ? "已送到" : "Delivered", tone: "dim" };
    case "returned":
      return { text: zh ? "返修中" : "With Claude", tone: "dim" };
    case "failed":
      return { text: zh ? "没送出" : "Not sent", tone: "red" };
    default:
      return { text: zh ? "已结束" : "Ended", tone: "dim" };
  }
}

/** A listed relay's word (#427): 「停」 and 「未完暂停」 over its phase; a
 * quiet one's in grey. */
export function reviewWord(
  review: DeskReview,
  zh: boolean,
): ReturnType<typeof reviewPhase> {
  if (review.stopped) return { text: zh ? "停" : "Stopped", tone: "red" };
  if (review.paused) return { text: zh ? "未完暂停" : "Paused", tone: "amber" };
  const word = reviewPhase(review.phase, zh);
  return review.group === "quiet" ? { ...word, tone: "dim" } : word;
}
