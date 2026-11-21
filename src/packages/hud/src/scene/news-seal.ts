// The seal a notice's card presses beside its paper plane, and how many it
// counts in 「等待处理」: the replies under a blue 已回 (owner chose 甲,
// 2026-11-14), the failures under a red 出错 (#359, ADR-0001 C6). Any other
// notice keeps its receipt, with no seal.
import type { IslandEvent } from "@agent-hud/protocol";
import type { NewsSeal } from "../permissions/PaperSeal";
import { isFailure } from "../alerts/failure-list.ts";

export function noticeSeal(
  event: IslandEvent | undefined,
  lane: { replies: readonly IslandEvent[]; failures: readonly IslandEvent[] },
  zh: boolean,
): { seal: NewsSeal; count: number } | null {
  if (event?.kind === "completion")
    return {
      seal: { words: zh ? "已回" : "DONE", ink: "blue" },
      count: lane.replies.length,
    };
  if (isFailure(event))
    return {
      seal: { words: zh ? "出错" : "ERROR", ink: "red" },
      count: lane.failures.length,
    };
  return null;
}
