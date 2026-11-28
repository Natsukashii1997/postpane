import type { Handoff } from "@agent-hud/protocol";
import { budget, counted, live, phaseOf, type Action } from "./handoff-card.ts";
import { idleEnded, stopped } from "./relay-stop.ts";

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
  // Stopped at its cap (#409): not 「再审一轮」 or 「继续自动」 — a word in
  // the session goes on. Ended by PostPane after a day idle, it cannot be
  // ended again (#411 L2 P2-02).
  if (stopped(handoff))
    return idleEnded(handoff)
      ? ["close", "session"]
      : [
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

/** The buttons' words; `D` the doer (Claude, Codex). `reachable`: the doer's
 * session is there to go back to (#411 L2 P2-04). */
export function actionLabels(
  zh: boolean,
  D: string,
  reachable = true,
): Record<Action, string> {
  return {
    end: zh ? "结束接力" : "End handoff",
    open: zh ? "查看 ChatGPT 对话" : "Open ChatGPT",
    back: zh ? `转回 ${D}` : `Send back to ${D}`,
    again: zh ? "再审一轮" : "Review again",
    retry: zh ? "重试" : "Retry",
    close: zh ? "知道了" : "Got it",
    pause: zh ? "暂停自动" : "Pause auto",
    resume: zh ? "继续自动" : "Resume auto",
    session: reachable
      ? zh
        ? "去会话里说一句"
        : "Say it in the session"
      : zh
        ? "原会话已不在"
        : "Session gone",
  };
}

/** The buttons that take the person elsewhere, with ↗ (#200). */
export const jumps = (action: Action) =>
  action === "open" || action === "session";

/** A button that cannot do its job: the jump back with no session to go to. */
export const actionOff = (action: Action, reachable: boolean) =>
  action === "session" && !reachable;

/** A button's hover words: what 「再审一轮」 asks for (`round` as now), or
 * why 「去会话里说一句」 cannot go. */
export function actionTitle(
  action: Action,
  zh: boolean,
  D: string,
  { at, of }: { at: number; of: number },
  reachable: boolean,
): string | undefined {
  if (action === "again")
    return zh
      ? `${D} 改完后送 ChatGPT，第 ${at + 1} / ${Math.max(of, at + 1)} 轮`
      : `${D} hands its changes to ChatGPT, round ${at + 1}`;
  if (actionOff(action, reachable))
    return zh
      ? `找不到发起这单的 ${D} 会话（可能已关掉或不在列表里），去那边说一句再续审，或结束接力`
      : `The ${D} session that started this is not listed; review on from it, or end`;
  return undefined;
}

/** Beside 「知道了」 on an ended card: ended, or put away while still stopped
 * at its cap — by PostPane after a day idle (#411 L2 P2-02), or by an agent
 * on its own (#587). */
export const endedNote = (handoff: Handoff, zh: boolean) =>
  !stopped(handoff)
    ? zh
      ? "接力已结束"
      : "This handoff has ended"
    : handoff.steps?.at(-1)?.agent
      ? zh
        ? "智能体已自行结束，还没了结"
        : "Ended by an agent on its own, not settled"
      : zh
        ? "闲置一天已自动收起，还没了结"
        : "Put away after a day idle, not settled";
