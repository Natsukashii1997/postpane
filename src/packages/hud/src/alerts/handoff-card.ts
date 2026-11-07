import type { Handoff, HandoffStep, Session } from "@agent-hud/protocol";
import { dateFormat, systemTimeZone } from "@agent-hud/ui/format";

/** The handoff card (relay design 甲, docs/chatgpt-channel.md): a handoff's
 * steps as a timeline, where it stands and what the person may do next. */

/** How many reviews a handoff is meant to take (handoffs.rs `ROUNDS`). */
export const ROUNDS = 2;

const CHATGPT_PREFIX = "chatgpt:";

/** Who a timeline row is about: the two sides, or PostPane passing words. */
export type Who = "claude" | "chatgpt" | "post";

export interface Row {
  who: Who;
  /** Its time ("00:16"), empty for what has not happened yet. */
  time: string;
  title: string;
  sub?: string;
  /** What was sent, quoted. */
  quote?: string;
  points?: string[];
  verdict?: HandoffStep["verdict"];
  /** Done, happening now, waiting on the person, or still to come. */
  state: "done" | "cur" | "await" | "todo";
}

export type Action =
  "end" | "open" | "back" | "again" | "retry" | "close" | "pause" | "resume";

const live = (handoff: Handoff) =>
  handoff.status === "open" || handoff.status === "opening";

/** The live handoff a session belongs to: a Claude Code session by its id,
 * a ChatGPT conversation by `chatgpt:<id>`. */
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

/** How many reviews were asked for. */
export const reviews = (handoff: Handoff) =>
  (handoff.steps ?? []).filter((step) => step.kind === "ask").length;

/** The round it is in, and of how many: 「第 1 / 2 轮」. */
export function round(handoff: Handoff): { at: number; of: number } {
  const at = Math.max(1, reviews(handoff));
  return { at, of: Math.max(ROUNDS, at) };
}

const phaseOf = (handoff: Handoff) =>
  handoff.phase ??
  (handoff.status === "failed"
    ? "failed"
    : handoff.status === "opening"
      ? "sending"
      : "delivered");

/** "16:05", in this Mac's time zone. */
export function clock(at: number): string {
  return dateFormat("en-GB", {
    timeZone: systemTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** "已 9 分钟" since `from`. */
export function since(from: number, now: number, zh: boolean): string {
  const minutes = Math.max(0, Math.floor((now - from) / 60_000));
  if (minutes < 1) return zh ? "刚刚开始" : "just now";
  if (minutes < 60) return zh ? `已 ${minutes} 分钟` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return zh ? `已 ${hours} 小时` : `${hours} h`;
}

const verdictWord = (verdict: HandoffStep["verdict"], zh: boolean) =>
  verdict === "pass"
    ? zh
      ? "通过"
      : "Pass"
    : verdict === "revise"
      ? zh
        ? "需修改"
        : "Changes needed"
      : zh
        ? "未写结论"
        : "No verdict";

/** The newest reply step. */
export const lastReply = (handoff: Handoff) =>
  [...(handoff.steps ?? [])].reverse().find((step) => step.kind === "reply");

/** The stamp in the card's corner, by where it stands. */
export function stamp(
  handoff: Handoff,
  zh: boolean,
): { text: string; tone: "blue" | "red" | "green" | "dim" } {
  switch (phaseOf(handoff)) {
    case "ended":
      return { text: zh ? "已结束" : "ENDED", tone: "dim" };
    case "failed":
      return { text: zh ? "未送" : "UNSENT", tone: "red" };
    case "replied":
      return lastReply(handoff)?.verdict === "revise"
        ? { text: zh ? "需改" : "FIX", tone: "red" }
        : { text: zh ? "回信" : "REPLY", tone: "blue" };
    case "returned":
      return { text: zh ? "修改" : "FIXING", tone: "green" };
    default:
      return { text: zh ? "接力" : "RELAY", tone: "blue" };
  }
}

/** Beside 「接力」: the auto round trip going, or stopped (with a reason to
 * show); nothing for a handoff from before it. */
export function autoLabel(handoff: Handoff, zh: boolean): string | null {
  if (!live(handoff)) return null;
  if (handoff.auto) return zh ? "自动往返" : "AUTO";
  if (handoff.halt) return zh ? "自动已停" : "AUTO OFF";
  return null;
}

/** One line for 「正在进行」, after the 「接力 1/2」 tag. */
export function progressLine(handoff: Handoff, now: number, zh: boolean) {
  const line = progress(handoff, now, zh);
  return handoff.halt && live(handoff)
    ? `${line} · ${zh ? "自动已停" : "auto off"}`
    : line;
}
function progress(handoff: Handoff, now: number, zh: boolean) {
  const at = handoff.phaseAt ?? handoff.updatedAt;
  switch (phaseOf(handoff)) {
    case "sending":
      return zh ? "正在送给 ChatGPT" : "Sending to ChatGPT";
    case "delivered":
      return zh ? "已送到 ChatGPT · 等它审核" : "With ChatGPT · not started";
    case "working":
      return zh
        ? `ChatGPT 审核中 · ${since(at, now, zh)}`
        : `ChatGPT reviewing · ${since(at, now, zh)}`;
    case "replied": {
      const reply = lastReply(handoff);
      const count = reply?.points?.length ?? 0;
      return zh
        ? `回信到了 · ${verdictWord(reply?.verdict, zh)}${count ? ` · ${count} 条意见` : ""}`
        : `Answered · ${verdictWord(reply?.verdict, zh)}`;
    }
    case "returned":
      if (handoff.wakingSince)
        return zh
          ? `驿窗在后台续接 Claude · ${since(handoff.wakingSince, now, zh)}`
          : `Claude runs in the background · ${since(handoff.wakingSince, now, zh)}`;
      if (handoff.queuedAt)
        return zh
          ? "意见已排队 · 会话不在线就在后台续接"
          : "Answer queued · runs in the background if the session stays quiet";
      return zh
        ? `已转回，按意见修改 · ${since(at, now, zh)}`
        : `Back with Claude · ${since(at, now, zh)}`;
    case "failed":
      return zh ? "没送出去 · 可重试" : "Not sent · retry";
    default:
      return zh ? "接力已结束" : "Ended";
  }
}

const cut = (text: string, limit: number) =>
  text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
const oneLine = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim();

/** The timeline: each step done, then where it stands, then what is to come. */
export function timeline(handoff: Handoff, now: number, zh: boolean): Row[] {
  const rows: Row[] = [];
  let asks = 0,
    works = 0;
  for (const step of handoff.steps ?? []) {
    const time = clock(step.at);
    switch (step.kind) {
      case "work":
        works++;
        rows.push({
          who: "claude",
          time,
          title:
            works > 1
              ? zh
                ? "Claude 按意见改完"
                : "Claude made the changes"
              : zh
                ? "Claude 做完本轮改动"
                : "Claude finished this round",
          sub: oneLine(step.text) || undefined,
          state: "done",
        });
        break;
      case "ask":
        asks++;
        rows.push({
          who: "post",
          time,
          title:
            asks > 1
              ? zh
                ? `驿窗送出「第 ${asks} 轮复审」`
                : `PostPane sent round ${asks}`
              : zh
                ? "驿窗送出「请审核」"
                : "PostPane asked for a review",
          sub: zh ? "ChatGPT 已收到" : "ChatGPT has it",
          quote: step.text ? cut(oneLine(step.text), 90) : undefined,
          state: "done",
        });
        break;
      case "reply": {
        const count = step.points?.length ?? 0;
        rows.push({
          who: "chatgpt",
          time,
          title: zh
            ? count
              ? `ChatGPT 审核：${count} 条意见`
              : "ChatGPT 回信了"
            : count
              ? `ChatGPT: ${count} points`
              : "ChatGPT answered",
          sub: count ? undefined : cut(oneLine(step.text), 120) || undefined,
          points: step.points ?? [],
          verdict: step.verdict ?? null,
          state: "done",
        });
        break;
      }
      case "back":
        rows.push({
          who: "post",
          time,
          title: step.auto
            ? zh
              ? "驿窗自动转回 Claude「按意见处理」"
              : "PostPane sent it back to Claude by itself"
            : zh
              ? "驿窗转回 Claude「按意见处理」"
              : "PostPane sent it back to Claude",
          sub: zh ? "附 ChatGPT 的回信全文" : "With ChatGPT's answer in full",
          state: "done",
        });
        break;
      case "again":
        rows.push({
          who: "post",
          time,
          title: zh
            ? "驿窗请 Claude 交回复审"
            : "PostPane asked Claude to hand it over again",
          state: "done",
        });
        break;
      case "fail":
        rows.push({
          who: "post",
          time,
          title: step.auto
            ? zh
              ? "自动往返出错"
              : "The auto round trip ran into trouble"
            : zh
              ? "没送出去"
              : "Not sent",
          sub: oneLine(step.text) || undefined,
          state: "done",
        });
        break;
      case "end":
        rows.push({
          who: "post",
          time,
          title: step.auto
            ? zh
              ? "审核通过，自动结束接力"
              : "Passed: the handoff ended by itself"
            : zh
              ? "结束接力"
              : "Handoff ended",
          state: "done",
        });
        break;
      case "stop":
        rows.push({
          who: "post",
          time,
          title: step.auto
            ? zh
              ? "自动往返停下"
              : "The auto round trip stopped"
            : zh
              ? "你暂停了自动往返"
              : "You paused the auto round trip",
          sub: oneLine(step.text) || undefined,
          state: "done",
        });
        break;
      case "resume":
        rows.push({
          who: "post",
          time,
          title: zh ? "你打开了自动往返" : "You turned the auto round trip on",
          state: "done",
        });
        break;
      case "wake":
        rows.push({
          who: "post",
          time,
          title: zh
            ? "驿窗在后台续接 Claude"
            : "PostPane ran Claude in the background",
          sub: oneLine(step.text) || undefined,
          state: "done",
        });
        break;
    }
  }
  const at = handoff.phaseAt ?? handoff.updatedAt;
  const next = reviews(handoff) + 1;
  const again: Row = {
    who: "chatgpt",
    time: "",
    title: zh
      ? `第 ${next} 轮：ChatGPT 再审核`
      : `Round ${next}: ChatGPT again`,
    sub: zh
      ? `最多 ${ROUNDS} 轮；写「结论：通过」就停`
      : `At most ${ROUNDS} rounds; stops at a pass`,
    state: "todo",
  };
  const passed = lastReply(handoff)?.verdict === "pass";
  const more = next <= ROUNDS && !passed;
  const todoBack: Row = {
    who: "post",
    time: "",
    title: zh ? "驿窗转回 Claude「按意见处理」" : "Back to Claude",
    state: "todo",
  };
  const todoFix: Row = {
    who: "claude",
    time: "",
    title: zh ? "Claude 按意见修改" : "Claude works on it",
    state: "todo",
  };
  switch (phaseOf(handoff)) {
    case "sending":
      rows.push({
        who: "chatgpt",
        time: clock(at),
        title: zh ? "正在打开 ChatGPT 会话" : "Opening a ChatGPT conversation",
        sub: zh ? "已发出，等 ChatGPT 打开" : "Sent, waiting for ChatGPT",
        state: "cur",
      });
      rows.push(todoBack, todoFix);
      break;
    case "delivered":
      rows.push({
        who: "chatgpt",
        time: "",
        title: zh ? "等 ChatGPT 开始审核" : "Waiting for ChatGPT",
        sub: zh ? "信已送到，对方还没开始" : "Delivered, not started",
        state: "cur",
      });
      rows.push(todoBack, todoFix);
      break;
    case "working":
      rows.push({
        who: "chatgpt",
        time: clock(at),
        title: zh ? "ChatGPT 审核中" : "ChatGPT is reviewing",
        sub: since(at, now, zh),
        state: "cur",
      });
      rows.push(todoBack, todoFix);
      break;
    case "replied":
      rows.push({
        ...todoBack,
        title: zh ? "转回 Claude「按意见处理」" : "Send it back to Claude",
        sub: zh ? "等你决定：转回，或结束接力" : "Your call: send back, or end",
        state: "await",
      });
      rows.push(todoFix);
      break;
    case "returned":
      rows.push({
        who: "claude",
        time: clock(at),
        title: zh ? "Claude 按意见修改" : "Claude works on it",
        sub: handoff.wakingSince
          ? zh
            ? `驿窗在后台续接 · ${since(handoff.wakingSince, now, zh)}`
            : `Running in the background · ${since(handoff.wakingSince, now, zh)}`
          : handoff.queuedAt
            ? zh
              ? "意见已排队 · 会话 3 分钟仍不在线就在后台续接"
              : "Answer queued · runs in the background if the session stays quiet for 3 minutes"
            : since(at, now, zh),
        state: "cur",
      });
      if (more) rows.push(again);
      return rows;
    case "failed":
      rows.push({
        who: "post",
        time: "",
        title: zh ? "重新送给 ChatGPT" : "Send it to ChatGPT again",
        sub: zh ? "等你决定：重试，或结束接力" : "Your call: retry, or end",
        state: "await",
      });
      return rows;
    default:
      return rows;
  }
  if (more) rows.push(again);
  return rows;
}

/** The buttons along the card's foot, the main one last. */
export function actions(handoff: Handoff): Action[] {
  const phase = phaseOf(handoff);
  // The auto round trip's switch, after 「结束接力」: pause it while on,
  // turn it back on once it stopped.
  const toggle: Action[] = !live(handoff)
    ? []
    : handoff.auto
      ? ["pause"]
      : handoff.halt
        ? ["resume"]
        : [];
  const open: Action[] = [
    ...toggle,
    ...(handoff.chatgptConversation ? (["open"] as const) : []),
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
        ...(reviews(handoff) < ROUNDS ? (["again"] as const) : []),
      ];
    default:
      return ["end", ...open];
  }
}

/** The Claude Code session a handoff is about, when listed. */
export function claudeSession(
  handoff: Handoff,
  sessions: readonly Session[],
): Session | undefined {
  return sessions.find(
    (session) =>
      session.source === "claude" && session.id === handoff.claudeSession,
  );
}

/** The ChatGPT conversation a handoff is reviewed in, as a session to open. */
export function chatgptSession(
  handoff: Handoff,
  sessions: readonly Session[],
): Session | undefined {
  const conversation = handoff.chatgptConversation;
  if (!conversation) return undefined;
  const id = `${CHATGPT_PREFIX}${conversation}`;
  return sessions.find((session) => session.id === id);
}
