import type { RelayLaunch, Session } from "@agent-hud/protocol";

/** What a row's swipe tray offers (relay batch B, #124): hand the session's
 * work to another agent, or remove the row. */
export type TrayKind = "review" | "test" | "cont" | "disc" | "rm";

/** Each block's width; the tray is as wide as its blocks. */
export const TRAY_BLOCK = 62;

/** A flick this fast (points a millisecond) opens or closes the tray
 * whichever way it went, however short; slower, the tray goes the way the
 * row was let go past half its width (owner chose 改, 2026-11-25). */
export const FLICK_SPEED = 0.35;
/** A let-go row slides to rest on the shared move. */
export const TRAY_SETTLE = "transform var(--motion-enter) var(--ease-out)";
/** How far back a let-go looks for the flick's speed. */
const FLICK_WINDOW_MS = 80;
/** And how far the row must have moved in this gesture before speed counts:
 * a quick twitch is not a swipe (GPT review, 2026-11-25). */
export const FLICK_TRAVEL = 12;

/** Where a dragged or swiped row has been lately, to tell a flick. */
export function trayFlick(clock: () => number = () => performance.now()) {
  let samples: { x: number; at: number }[] = [];
  let from: number | null = null;
  return {
    /** The row is now at `x`; a pause starts a new gesture. */
    note(x: number) {
      const at = clock();
      const last = samples[samples.length - 1];
      if (last && at - last.at > 2 * FLICK_WINDOW_MS) {
        samples = [];
        from = null;
      }
      from ??= x;
      samples.push({ x, at });
      samples = samples.filter((one) => at - one.at <= FLICK_WINDOW_MS * 2);
    },
    /** Let go at `x`, `width` the open tray's: does it end open? */
    opens(x: number, width: number): boolean {
      const last = samples[samples.length - 1];
      const first = samples.find(
        (one) => last && last.at - one.at <= FLICK_WINDOW_MS,
      );
      const travel = from === null ? 0 : Math.abs(x - from);
      samples = [];
      from = null;
      if (last && first && last.at > first.at && travel >= FLICK_TRAVEL) {
        const speed = (last.x - first.x) / (last.at - first.at);
        if (Math.abs(speed) >= FLICK_SPEED) return speed < 0;
      }
      return x < -width / 2;
    },
  };
}

/** The blocks a row's tray shows: a Claude Code session on this machine,
 * or a Codex thread (#282), can hand its work over (it calls
 * `relay_to_chatgpt` itself); any other only leaves the sidebar. */
export function trayKinds(session: Session): TrayKind[] {
  const local =
    (session.source === "claude" && session.client !== "claude-cloud") ||
    session.source === "codex";
  return local ? ["review", "test", "cont", "disc", "rm"] : ["rm"];
}

/** Whether a block works yet: testing and carrying on wait for Codex. */
export function trayReady(kind: TrayKind): boolean {
  return kind !== "test" && kind !== "cont";
}

/** What the host is asked to start for a block, if anything. */
export function launchKind(kind: TrayKind): "review" | "discuss" | null {
  return kind === "review" ? "review" : kind === "disc" ? "discuss" : null;
}

/** The block a key moves to: ←/→ step through the ready blocks and stop at
 * the ends. */
export function stepBlock(
  kinds: readonly TrayKind[],
  at: number,
  step: -1 | 1,
): number {
  for (let next = at + step; next >= 0 && next < kinds.length; next += step) {
    if (trayReady(kinds[next])) return next;
  }
  return at;
}

/** A block's name, whom it hands to, and the one line its hint says. */
export function trayText(
  kind: TrayKind,
  zh: boolean,
): { label: string; to: string | null; line: string } {
  switch (kind) {
    case "review":
      return zh
        ? {
            label: "审核",
            to: "交给 ChatGPT",
            line: "请这个会话自己整理改动和背景，交给 ChatGPT 审核；回信出现在侧栏。",
          }
        : {
            label: "Review",
            to: "to ChatGPT",
            line: "This session writes up its changes and hands them to ChatGPT for review; the answer shows here.",
          };
    case "test":
      return zh
        ? {
            label: "测试",
            to: "交给 Codex",
            line: "还不能用：以后请 Codex 跑全部测试、补缺的用例。",
          }
        : {
            label: "Test",
            to: "to Codex",
            line: "Not yet: Codex will run every test and add the missing ones.",
          };
    case "cont":
      return zh
        ? {
            label: "续做",
            to: "交给 Codex",
            line: "还不能用：以后请 Codex 读交接，接着做没完成的部分。",
          }
        : {
            label: "Carry on",
            to: "to Codex",
            line: "Not yet: Codex will read the handoff and finish what is left.",
          };
    case "disc":
      return zh
        ? {
            label: "讨论",
            to: "交给 ChatGPT",
            line: "只聊方案、不改代码：请这个会话整理思路，交给 ChatGPT 比较做法、给出推荐。",
          }
        : {
            label: "Discuss",
            to: "to ChatGPT",
            line: "Plans only, no code: this session writes up its options for ChatGPT to compare and recommend.",
          };
    case "rm":
      return zh
        ? { label: "移除", to: null, line: "从侧栏移除，有新内容时再出现。" }
        : {
            label: "Remove",
            to: null,
            line: "Remove from the sidebar until something new.",
          };
  }
}

/** What a row says of its swipe's words until the session takes them up:
 * waiting (`ok`), or why they never reached it. */
export function launchLine(
  launch: Pick<RelayLaunch, "kind" | "state" | "reason">,
  zh: boolean,
): { ok: boolean; text: string } {
  const what = zh
    ? launch.kind === "review"
      ? "审核请求"
      : "讨论请求"
    : launch.kind === "review"
      ? "Review request"
      : "Discussion request";
  switch (launch.state) {
    case "queued":
      return {
        ok: true,
        text: zh
          ? `${what}排队中，会话空下来就处理`
          : `${what} queued; the session takes it up once idle`,
      };
    case "started":
      return {
        ok: true,
        text: zh
          ? `${what}已送进会话，正在整理`
          : `${what} is in the session, being written up`,
      };
    case "stalled":
      return {
        ok: false,
        text: zh
          ? `会话领了${what}，但一小时没发起接力`
          : `The session took the ${what.toLowerCase()} but started no handoff in an hour`,
      };
    case "unknown":
      return {
        ok: true,
        text: zh
          ? `${what}状态不明，可能还在处理`
          : `${what} unaccounted for; may still be in hand`,
      };
    case "lost":
      return {
        ok: false,
        text: zh
          ? `${what}状态不明，一小时没等到接力`
          : `${what} unaccounted for; no handoff in an hour`,
      };
    case "refused":
      return {
        ok: false,
        text: launch.reason
          ? zh
            ? `${what}被拒绝：${launch.reason}`
            : `${what} refused: ${launch.reason}`
          : zh
            ? `${what}被会话拒绝`
            : `${what} refused by the session`,
      };
    case "expired":
      return {
        ok: false,
        text: zh
          ? `${what}过期了，没送进会话`
          : `${what} expired before the session took it`,
      };
  }
}

/** What a swipe says when words for the session were already waiting. */
export function alreadyQueuedText(zh: boolean): string {
  return zh ? "已在排队，不再重复发" : "Already queued; nothing sent again";
}
