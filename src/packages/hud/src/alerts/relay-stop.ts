import type { Handoff, HandoffStep } from "@agent-hud/protocol";

/** Ended by PostPane after a day untouched (#368), not by the person: the
 * gate counts such a one at its cap as not settled (guard.rs
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

/** A review begun since it stopped, in its session or folder, settles it,
 * as the gate counts (guard.rs `unsettled_top`). */
export function settledSince(
  handoff: Handoff,
  all: readonly Handoff[],
): boolean {
  const at = handoff.topAt || handoff.updatedAt;
  return all.some(
    (other) =>
      other.id !== handoff.id &&
      (other.claudeSession === handoff.claudeSession ||
        (!!handoff.cwd && other.cwd === handoff.cwd)) &&
      other.createdAt > at,
  );
}

/** The timeline's words for an `end` step: the person's, a pass PostPane
 * ended, or PostPane's for another reason (a day idle, #368), with that
 * reason. Every end by PostPane used to read as a pass (#411). */
export function endWords(
  handoff: Handoff,
  step: HandoffStep,
  zh: boolean,
): { title: string; sub?: string } {
  if (!step.auto) return { title: zh ? "结束接力" : "Handoff ended" };
  const answer = [...(handoff.steps ?? [])]
    .reverse()
    .find((s) => s.kind === "reply" && s.at <= step.at);
  if (answer?.verdict === "pass")
    return {
      title: zh
        ? "审核通过，自动结束接力"
        : "Passed: the handoff ended by itself",
    };
  return {
    title: zh ? "驿窗自动结束接力" : "Ended by PostPane",
    sub: step.text ?? undefined,
  };
}
