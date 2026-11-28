import type { Handoff, HandoffStep } from "@agent-hud/protocol";

/** Ended by PostPane after a day untouched (#368), not by the person: the
 * gate counts such a one at its cap as not settled (host handoff/gate/book_guard.rs
 * `unsettled_top`), so it still shows 「停」 (#411 L2 P2-02). */
export function idleEnded(handoff: Handoff): boolean {
  const last = handoff.steps?.at(-1);
  return handoff.status === "closed" && last?.kind === "end" && !!last.auto;
}

/** Stopped at its cap, the person's to decide (#347, #409): 「停」. Open, or
 * ended only by PostPane after a day idle. The gate keeps `notice: "top"`
 * after a leave to review on; the auto round trip back on, or a review asked
 * since, means it is under way again. */
export function stopped(handoff: Handoff): boolean {
  const open = handoff.status === "open" || handoff.status === "opening";
  const at = handoff.topAt ?? 0;
  return (
    (open || idleEnded(handoff)) &&
    handoff.notice === "top" &&
    !handoff.auto &&
    !handoff.steps?.some(
      (s) => s.at > at && ["work", "ask", "resume"].includes(s.kind),
    )
  );
}

/** A 思维评审 (#209), as the gate tells it (host/src/handoff/book.rs `thinking`). */
export function thinking(handoff: Handoff): boolean {
  const title = handoff.title.trimStart();
  return title.startsWith("思维评审｜") || title.startsWith("思维评审|");
}

/** A review of its kind begun since it stopped, in its session or folder,
 * settles it, as the gate counts (host handoff/gate/book_guard.rs `unsettled_top`): a 思维评审
 * settles no engineering review, nor the other way round (#411 L2 P2-02). */
export function settledSince(
  handoff: Handoff,
  all: readonly Handoff[],
): boolean {
  const at = handoff.topAt || handoff.updatedAt;
  const kind = thinking(handoff);
  return all.some(
    (other) =>
      other.id !== handoff.id &&
      thinking(other) === kind &&
      (other.claudeSession === handoff.claudeSession ||
        (!!handoff.cwd && other.cwd === handoff.cwd)) &&
      other.createdAt > at,
  );
}

/** The timeline's words for an `end` step: the person's, a pass PostPane
 * ended, or PostPane's for another reason (a day idle, #368), with that
 * reason. Every end by PostPane used to read as a pass (#411). A pass is
 * the gate's, `notice: "passed"`, not the answer's verdict: a pass on
 * another commit than the one under review is not let through (#411 L2
 * P2-05). */
export function endWords(
  handoff: Handoff,
  step: HandoffStep,
  zh: boolean,
): { title: string; sub?: string } {
  // Ended by an agent at the person's word (#439): who and why.
  if (!step.auto)
    return {
      title: zh ? "结束接力" : "Handoff ended",
      sub: step.text ?? undefined,
    };
  if (handoff.notice === "passed")
    return thinking(handoff)
      ? {
          title: zh
            ? "思维评审收口，自动结束接力"
            : "Thinking review settled: the handoff ended by itself",
        }
      : {
          title: zh
            ? "审核通过，自动结束接力"
            : "Passed: the handoff ended by itself",
        };
  return {
    title: zh ? "驿窗自动结束接力" : "Ended by PostPane",
    sub: step.text ?? undefined,
  };
}
