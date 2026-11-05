// The Hermes peek (issue #108, the owner's 甲 · 两个机器人): a quota row
// says nothing for Hermes, so its peek shows each Feishu bot instead:
// whether it is online, replying or down, and under it when it last replied
// and how many turns it had today, the question it is answering, or why it
// is down.
import type { HermesBotStatus, Session } from "@agent-hud/protocol";

export type PeekBotState = "online" | "replying" | "down";

export interface PeekBot {
  bot: { id: string; name: string };
  state: PeekBotState;
  /** The state as printed: 在线, 正在回复, 断线. */
  label: string;
  /** The line under the name. */
  detail: string;
}

/** Each bot's line, in Core's order. A bot is replying while one of its
 * sessions runs a turn; a down gateway outranks that, since it cannot. */
export function peekBots(
  bots: readonly HermesBotStatus[],
  sessions: readonly Pick<Session, "bot" | "state" | "title">[],
  zh: boolean,
  time: (at: number) => string,
): PeekBot[] {
  return bots.map((bot) => {
    const running = sessions.find(
      (s) => s.bot?.id === bot.id && s.state === "running",
    );
    if (bot.down)
      return {
        bot,
        state: "down",
        label: zh ? "断线" : "Offline",
        detail:
          bot.down === "feishu"
            ? zh
              ? "飞书没连上"
              : "Feishu not connected"
            : zh
              ? "网关停了"
              : "Gateway stopped",
      };
    if (running)
      return {
        bot,
        state: "replying",
        label: zh ? "正在回复" : "Replying",
        detail: running.title.trim() || (zh ? "正在回复" : "Replying"),
      };
    const turns = zh ? `今天 ${bot.turnsToday} 轮` : `${bot.turnsToday} today`;
    const at = bot.lastReplyAt ? Date.parse(bot.lastReplyAt) : NaN;
    return {
      bot,
      state: "online",
      label: zh ? "在线" : "Online",
      detail: Number.isFinite(at)
        ? `${time(at)} ${zh ? "回复" : "reply"} · ${turns}`
        : turns,
    };
  });
}

/** When a reply was: its time today, its date before. */
export function replyTime(
  at: number,
  now: number,
  format: { time: Intl.DateTimeFormat; date: Intl.DateTimeFormat },
): string {
  const day = (ms: number) => format.date.format(ms);
  return day(at) === day(now) ? format.time.format(at) : day(at);
}
