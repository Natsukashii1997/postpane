import type { Handoff } from "@agent-hud/protocol";
import type { ApprovalEntry } from "../permissions/approval-list.ts";

/** How far a receipt's time may sit before the answer PostPane recorded:
 * the two clocks note the same turn a moment apart. */
const SLACK_MS = 2 * 60_000;

/** Whether a reply on the receipt is the ChatGPT answer PostPane let pass
 * (#347 `notice: "passed"`): it gets the blue 「过」 stamp (owner
 * 2026-11-19, #409). Only the newest handoff of its conversation counts,
 * and only its passing answer, not the earlier ones that asked for more. */
export function passedReply(
  entry: ApprovalEntry,
  handoffs: readonly Handoff[],
): boolean {
  if (entry.kind !== "reply" || entry.event.source !== "chatgpt") return false;
  const conversation = entry.event.sessionId?.replace(/^chatgpt:/, "");
  if (!conversation) return false;
  const handoff = [...handoffs]
    .reverse()
    .find((h) => h.chatgptConversation === conversation);
  if (handoff?.notice !== "passed") return false;
  const answered = [...(handoff.steps ?? [])]
    .reverse()
    .find((step) => step.kind === "reply")?.at;
  return answered != null && Date.parse(entry.event.at) >= answered - SLACK_MS;
}
