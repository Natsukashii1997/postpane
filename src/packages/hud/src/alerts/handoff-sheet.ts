import type { Handoff, IslandEvent, Session } from "@agent-hud/protocol";
import { findSession } from "../permissions/approval-list.ts";

/** Relay 1c's handoff sheet (转交单) on a reply: where the reply can go, what
 * for, and the words it goes with. */

/** What the reply is sent for; each opens the message with its own words. */
export type Purpose = "review" | "apply" | "plain";

export const PURPOSES: readonly Purpose[] = ["review", "apply", "plain"];

export const PURPOSE_LABELS: Record<Purpose, string> = {
  review: "请审核",
  apply: "按意见处理",
  plain: "原样转",
};

export const OPENERS: Record<Purpose, string> = {
  review:
    "请审核下面这次改动，按严重程度列出问题，最后一行写「结论：通过」或「结论：需修改」。\n\n",
  apply: "以下是 ChatGPT 的审核意见，请逐条处理，改完说明每条怎么处理的：\n\n",
  plain: "",
};

/** Where a reply can go: the Claude Code session of its handoff, the
 * ChatGPT conversation of its handoff, or a new ChatGPT review. */
export type SheetTarget =
  | { kind: "claude"; session: string; label: string; handoffId: string }
  | {
      kind: "chatgpt";
      conversation: string;
      label: string;
      handoffId: string;
    }
  | {
      kind: "new-review";
      session: string;
      cwd: string | null;
      title: string;
    };

const CHATGPT_PREFIX = "chatgpt:";

const live = (handoff: Handoff) =>
  handoff.status === "open" || handoff.status === "opening";

/** The live handoff a reply's session belongs to: a Claude Code session by
 * its id, a ChatGPT conversation by `chatgpt:<id>`. */
export function handoffFor(
  handoffs: readonly Handoff[] | undefined,
  source: string,
  sessionId: string | null | undefined,
): Handoff | undefined {
  if (!sessionId || !handoffs) return undefined;
  const newest = [...handoffs].reverse();
  if (source === "claude")
    return newest.find(
      (handoff) => live(handoff) && handoff.claudeSession === sessionId,
    );
  if (source === "chatgpt" && sessionId.startsWith(CHATGPT_PREFIX)) {
    const conversation = sessionId.slice(CHATGPT_PREFIX.length);
    return newest.find(
      (handoff) =>
        live(handoff) && handoff.chatgptConversation === conversation,
    );
  }
  return undefined;
}

/** The sheet's 「到」 list, the default first: a ChatGPT reply goes back to its
 * handoff's Claude session; a Claude reply goes to its handoff's review
 * conversation, or to a new review. Empty where it can go nowhere. */
export function sheetTargets(
  event: IslandEvent,
  handoffs: readonly Handoff[] | undefined,
  sessions: readonly Session[],
): SheetTarget[] {
  const handoff = handoffFor(handoffs, event.source, event.sessionId);
  if (event.source === "chatgpt") {
    if (!handoff) return [];
    const claude = findSession(sessions, handoff.claudeSession, "claude");
    return [
      {
        kind: "claude",
        session: handoff.claudeSession,
        label: claude?.title?.trim() || handoff.title,
        handoffId: handoff.id,
      },
    ];
  }
  if (event.source !== "claude" || !event.sessionId) return [];
  const targets: SheetTarget[] = [];
  if (handoff?.status === "open" && handoff.chatgptConversation)
    targets.push({
      kind: "chatgpt",
      conversation: handoff.chatgptConversation,
      label: handoff.title,
      handoffId: handoff.id,
    });
  const session = findSession(sessions, event.sessionId, "claude");
  targets.push({
    kind: "new-review",
    session: event.sessionId,
    cwd: session?.cwd ?? null,
    title: session?.title?.trim() || event.title?.trim() || "",
  });
  return targets;
}

/** Words for Claude are opinions to act on; words for ChatGPT ask a review. */
export function defaultPurpose(target: SheetTarget): Purpose {
  return target.kind === "claude" ? "apply" : "review";
}

/** The message as the sheet first writes it. */
export function composeMessage(purpose: Purpose, reply: string): string {
  return OPENERS[purpose] + reply;
}

/** The message after the purpose changes: the old opener, where it is still
 * at the start, gives way to the new one; whatever else was edited stays. */
export function switchPurpose(
  text: string,
  from: Purpose,
  to: Purpose,
): string {
  const opener = OPENERS[from];
  const rest =
    opener && text.startsWith(opener) ? text.slice(opener.length) : text;
  return OPENERS[to] + rest;
}

/** The sheet's 「送达方式」 line: how the words travel, or why they would not. */
export function deliveryHint(
  target: SheetTarget,
  route: { reachable: boolean; reason?: string | null } | null,
): string {
  if (route && !route.reachable && route.reason) return route.reason;
  return target.kind === "claude"
    ? "消息排进 Claude 会话，空闲时自动发出"
    : "经 Chrome 插件送进 ChatGPT 会话";
}

/** The primary button's words. */
export function sendLabel(target: SheetTarget): string {
  return target.kind === "new-review" ? "新建并送出" : "送进会话";
}

/** What the status line says once the words are on their way. */
export function sentNote(target: SheetTarget): string {
  return target.kind === "claude"
    ? "已排进 Claude 会话，空闲时发出"
    : target.kind === "chatgpt"
      ? "已送进 ChatGPT 会话"
      : "已交给 ChatGPT，新会话正在打开";
}

/** The sheet's serial: NO. and the last four of the handoff's id, else of
 * the reply's. */
export function serial(handoffId: string | undefined, eventId: string): string {
  const source = (handoffId || eventId).replace(/[^0-9a-z]/gi, "");
  return `NO.${source.slice(-4).toUpperCase().padStart(4, "0")}`;
}

/** The key a target is picked by. */
export function targetKey(target: SheetTarget): string {
  return target.kind === "chatgpt"
    ? `chatgpt:${target.conversation}`
    : `${target.kind}:${target.session}`;
}
