import type { Handoff } from "@agent-hud/protocol";
import {
  budget,
  counted,
  live,
  phaseOf,
  stopped,
  type Action,
} from "./handoff-card.ts";

/** The buttons along the card's foot, the main one last. */
export function actions(handoff: Handoff): Action[] {
  const phase = phaseOf(handoff);
  // The auto round trip's switch, after 「结束接力」: pause it while on,
  // turn it back on once it stopped and a round is left for it (#194).
  const toggle: Action[] = !live(handoff)
    ? []
    : handoff.auto
      ? ["pause"]
      : handoff.halt && counted(handoff) < budget(handoff)
        ? ["resume"]
        : [];
  const open: Action[] = [
    ...toggle,
    ...(handoff.chatgptConversation ? (["open"] as const) : []),
  ];
  if (stopped(handoff))
    // Stopped at its cap (#409): not 「再审一轮」 or 「继续自动」 — a word in the session goes on.
    return [
      "end",
      ...(handoff.chatgptConversation ? (["open"] as const) : []),
      "session",
    ];
  switch (phase) {
    case "ended":
      return ["close"];
    case "failed":
      return ["end", "retry"];
    case "replied":
      return ["end", ...open, "back"];
    case "returned":
      return [
        "end",
        ...open,
        ...(counted(handoff) < budget(handoff) ? (["again"] as const) : []),
      ];
    default:
      return ["end", ...open];
  }
}

/** The width of the review points' number column: 16px holds 「9.」, and
 * each further digit takes one tabular figure more, so 「10.」 no longer
 * presses into its point (#336). */
export function pointMarkColumn(count: number): string {
  const more = String(Math.max(1, count)).length - 1;
  return more > 0 ? `calc(16px + ${more}ch)` : "16px";
}

/** The buttons' words; `D` the doer (Claude, Codex). */
export function actionLabels(zh: boolean, D: string): Record<Action, string> {
  return {
    end: zh ? "结束接力" : "End handoff",
    open: zh ? "查看 ChatGPT 对话" : "Open ChatGPT",
    back: zh ? `转回 ${D}` : `Send back to ${D}`,
    again: zh ? "再审一轮" : "Review again",
    retry: zh ? "重试" : "Retry",
    close: zh ? "知道了" : "Got it",
    pause: zh ? "暂停自动" : "Pause auto",
    resume: zh ? "继续自动" : "Resume auto",
    session: zh ? "去会话里说一句" : "Say it in the session",
  };
}

/** The buttons that take the person elsewhere, with ↗ (#200). */
export const jumps = (action: Action) =>
  action === "open" || action === "session";
