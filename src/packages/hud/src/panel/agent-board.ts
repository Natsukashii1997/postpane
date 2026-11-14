// The hover panel's quota board and live sessions (issue #52): whether the
// quotas last until their resets, what each bar draws, and which sessions
// the panel lists. Kept free of the UI so the tests can run it.
import type { Approval, Quota, Session } from "@agent-hud/protocol";
import {
  countdown,
  forecast,
  quotaPercent,
  relativeWeekdayTime,
  type Language,
  type QuotaDisplay,
  type WeekCalendar,
} from "@agent-hud/ui/format";
import { quotaCredits } from "../quota-rows.ts";
import { quotaWindowLabel } from "./window-labels.ts";
import { isStale } from "../stale.ts";

const finite = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const say = (language: Language, zh: string, en: string) =>
  language === "zh" ? zh : en;

/** What one quota bar draws: the used share, where the current pace takes
 * it by the reset (hatched) and where a steady pace would have it now (the
 * amber mark). A row without a forecast draws neither. */
export interface QuotaOutlook {
  /** A current reading: not stale, with a used share. */
  live: boolean;
  used: number | null;
  projected: number | null;
  expected: number | null;
  /** Already used up. */
  exhausted: boolean;
  /** Used up before the reset at the current pace, or already. */
  runsOut: boolean;
  /** When the pace uses it up, for a row that runs out before its reset. */
  exhaustsAt: number | null;
}

export function quotaOutlook(row: Quota): QuotaOutlook {
  const live = row.status !== "stale" && finite(row.usedPercent);
  const used = live ? clamp(row.usedPercent!) : null;
  const outlook = live ? row.metrics?.outlook : null;
  const exhausted = live && (outlook?.kind === "exhausted" || used! >= 100);
  const runsOut =
    exhausted || (outlook?.kind === "exhausts" && outlook.beforeReset === true);
  const projected = !live
    ? null
    : runsOut
      ? 100
      : outlook?.kind === "no-usage"
        ? used
        : finite(outlook?.projectedUsedPercent)
          ? Math.max(used!, clamp(outlook.projectedUsedPercent))
          : null;
  const budget = row.metrics?.budget;
  const exhaustsAt =
    runsOut && !exhausted && outlook?.exhaustsAt
      ? Date.parse(outlook.exhaustsAt)
      : NaN;
  return {
    live,
    used,
    projected,
    expected:
      projected != null && finite(budget?.expectedUsedPercent)
        ? clamp(budget.expectedUsedPercent)
        : null,
    exhausted,
    runsOut,
    exhaustsAt: Number.isFinite(exhaustsAt) ? exhaustsAt : null,
  };
}

/** What the board's stamp says. */
/** The heading's stamp: whether the quotas last (够用 / 吃紧 / 未知), or for
 * Hermes whether its bots are up (在岗 / 断线). */
export type BoardStamp = "enough" | "tight" | "unknown" | "duty" | "down";

/** A piece of the verdict line; `strong` pieces are set bold. */
export type Words = { text: string; strong?: boolean }[];

/** The stamp in the board's corner and the sentence under it: "tight" when
 * a quota runs out before its reset at the current pace, "enough" when every
 * quota with a forecast lasts, "unknown" while no quota has one (owner,
 * 2026-11-05), none without quotas. */
export function boardVerdict(
  rows: readonly Quota[],
  now: number,
  language: Language,
): { stamp: BoardStamp | null; words: Words | null } {
  const read = rows.map((row) => ({ row, outlook: quotaOutlook(row) }));
  const live = read.filter(({ outlook }) => outlook.live);
  if (!live.length)
    return { stamp: read.length ? "unknown" : null, words: null };
  const name = (row: Quota) => quotaWindowLabel(row, language);
  const list = (items: typeof read) =>
    items.map(({ row }) => name(row)).join(say(language, "、", ", "));
  const exhausted = live.filter(({ outlook }) => outlook.exhausted);
  const short = live.filter(
    ({ outlook }) => outlook.runsOut && !outlook.exhausted,
  );
  if (exhausted.length || short.length) {
    const words: Words = [];
    if (exhausted.length)
      words.push(
        { text: list(exhausted), strong: true },
        { text: say(language, "已经用完", " is used up") },
      );
    if (short.length) {
      if (exhausted.length) words.push({ text: say(language, "；", "; ") });
      words.push({
        text: say(language, "照现在的速度，", "at the current pace, "),
      });
      const when = short.length === 1 ? short[0].outlook.exhaustsAt : null;
      words.push({ text: list(short), strong: true });
      words.push({
        text:
          when != null
            ? say(
                language,
                `约 ${forecast((when - now) / 1000, language)}后用完，早于重置`,
                ` runs out in about ${forecast((when - now) / 1000, language)}, before its reset`,
              )
            : say(language, "会在重置前用完", " runs out before its reset"),
      });
    }
    words.push({ text: say(language, "。", ".") });
    if (language === "en") words[0].text = capitalize(words[0].text);
    return { stamp: "tight", words };
  }
  // A credit grant has no cycle to forecast: it is left out of the count.
  const paced = live.filter(({ row }) => !quotaCredits(row));
  const judged = paced.filter(({ outlook }) => outlook.projected != null);
  if (!judged.length)
    return {
      stamp: "unknown",
      words: [
        {
          text: say(
            language,
            "读数还不够，暂时没法预测。",
            "Not enough readings to forecast yet.",
          ),
        },
      ],
    };
  const count = judged.length;
  const rest = paced.length - count;
  return {
    stamp: "enough",
    words: [
      { text: say(language, "照现在的速度，", "At the current pace, ") },
      {
        text:
          count === 1
            ? say(
                language,
                paced.length === 1
                  ? "这个额度在重置前用不完"
                  : `${name(judged[0].row)}在重置前用不完`,
                paced.length === 1
                  ? "this quota lasts until its reset"
                  : `${name(judged[0].row)} lasts until its reset`,
              )
            : say(
                language,
                `${chineseCount(count)}个额度在重置前都用不完`,
                `all ${count} quotas last until their resets`,
              ),
        strong: true,
      },
      {
        text:
          rest > 0
            ? say(
                language,
                "，其余读数还不够预测。",
                "; the rest need more readings.",
              )
            : say(language, "。", "."),
      },
    ],
  };
}

const capitalize = (text: string) =>
  text ? text[0].toUpperCase() + text.slice(1) : text;

function chineseCount(count: number) {
  return count === 2
    ? "两"
    : (["", "一", "", "三", "四", "五", "六", "七", "八", "九", "十"][count] ??
        String(count));
}

/** The line under a bar: where the pace takes it, or why it says nothing. */
export function quotaNote(
  row: Quota,
  now: number,
  language: Language,
  display: QuotaDisplay = "consumed",
): { text: string; warn: boolean } | null {
  const outlook = quotaOutlook(row);
  if (!outlook.live) return null;
  const credits = quotaCredits(row);
  if (credits) {
    const capacity = Math.round(credits.capacity);
    const used = Math.round(Math.min(credits.used, credits.capacity));
    return {
      text:
        display === "remaining"
          ? say(
              language,
              `剩 $${capacity - used} / $${capacity}`,
              `$${capacity - used} of $${capacity} left`,
            )
          : say(
              language,
              `已用 $${used} / $${capacity}`,
              `$${used} of $${capacity} used`,
            ),
      warn: outlook.exhausted,
    };
  }
  if (outlook.exhausted)
    return {
      text: say(language, "已经用完，等重置", "Used up until its reset"),
      warn: true,
    };
  if (outlook.runsOut)
    return {
      text:
        outlook.exhaustsAt != null
          ? say(
              language,
              `照现在的速度，约 ${forecast((outlook.exhaustsAt - now) / 1000, language)}后用完，早于重置`,
              `At the current pace, runs out in about ${forecast((outlook.exhaustsAt - now) / 1000, language)}, before its reset`,
            )
          : say(
              language,
              "照现在的速度，会在重置前用完",
              "At the current pace, runs out before its reset",
            ),
      warn: true,
    };
  if (outlook.used === 0) {
    const weekly =
      finite(row.windowDurationSeconds) &&
      Math.abs(row.windowDurationSeconds - 604_800) < 604_800 * 0.05;
    return {
      text: weekly
        ? say(language, "这周还没用过", "Not used this week")
        : say(language, "这个周期还没用过", "Not used this cycle"),
      warn: false,
    };
  }
  if (outlook.projected != null) {
    const value = Math.round(quotaPercent(outlook.projected, display)!);
    return {
      text:
        display === "remaining"
          ? say(
              language,
              `照现在的速度，重置时约剩 ${value}%`,
              `At the current pace, about ${value}% left by reset`,
            )
          : say(
              language,
              `照现在的速度，重置时约 ${value}%`,
              `At the current pace, about ${value}% by reset`,
            ),
      warn: false,
    };
  }
  if (row.metrics?.outlook?.kind === "insufficient-data")
    return {
      text: say(language, "读数还不够，暂不预测", "Not enough readings yet"),
      warn: false,
    };
  return null;
}

/** When the window resets: "1 小时 28 分后重置", "周六 02:00 重置"; for a
 * credit grant, when it expires: "3 小时 25 分后到期". */
export function resetText(
  resetAt: string | null,
  now: number,
  calendar: WeekCalendar,
  language: Language,
  expires = false,
): string | null {
  const instant = resetAt ? Date.parse(resetAt) : NaN;
  if (!Number.isFinite(instant)) return null;
  const seconds = (instant - now) / 1000;
  if (seconds <= 0) return say(language, "等待更新", "Pending update");
  const [zh, en] = expires ? ["到期", "Expires"] : ["重置", "Resets"];
  if (seconds < 86_400) {
    if (language === "en") return `${en} in ${countdown(seconds)}`;
    const minutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(minutes / 60);
    return hours > 0
      ? `${hours} 小时${minutes % 60 ? ` ${minutes % 60} 分` : ""}后${zh}`
      : `${minutes} 分钟后${zh}`;
  }
  const when = relativeWeekdayTime(instant, now, calendar, language);
  return say(language, `${when} ${zh}`, `${en} ${when}`);
}

/** A session the panel lists: one waiting on you, or one at work. */
export interface LiveSession {
  session: Session;
  status: "waiting" | "running";
  /** The oldest request it waits on, when there is one. */
  approval: Approval | null;
  /** Waiting on a request heard nothing of for a while: 「待核对」. */
  stale?: boolean;
}

/** The sessions the panel lists (owner, 2026-11-05): those waiting on you,
 * then those at work, each newest message first; a session with a request
 * open waits whatever its state says. Sub-agents stand behind their session. */
export function liveSessions(
  sessions: readonly Session[],
  approvals: readonly Approval[],
): LiveSession[] {
  const ids = new Set(sessions.map((session) => session.id));
  const time = (session: Session) => {
    const at = Date.parse(session.lastMessageAt ?? session.updatedAt);
    return Number.isFinite(at) ? at : 0;
  };
  return sessions
    .filter((session) => !session.parentId || !ids.has(session.parentId))
    .map((session): LiveSession | null => {
      const asks = approvals
        .filter(
          (approval) =>
            approval.sessionId === session.id &&
            (approval.source === session.source ||
              sessions.filter((other) => other.id === session.id).length === 1),
        )
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      if (asks.length || session.state === "waiting")
        return {
          session,
          status: "waiting",
          approval: asks[0] ?? null,
          stale: !asks.length && isStale(session),
        };
      if (session.state === "running")
        return { session, status: "running", approval: null };
      return null;
    })
    .filter((entry): entry is LiveSession => entry !== null)
    .sort(
      (a, b) =>
        Number(a.status === "running") - Number(b.status === "running") ||
        time(b.session) - time(a.session),
    );
}

/** The line under a listed session: what it waits on, or what it does. */
export function liveSessionLine(
  entry: LiveSession,
  language: Language,
): string {
  const { approval, session } = entry;
  if (entry.status === "waiting") {
    if (entry.stale)
      return say(
        language,
        "待核对：很久没有新动静",
        "Unconfirmed: quiet for a while",
      );
    if (!approval) return say(language, "等你回复", "Waiting for you");
    const question = approval.questions?.[0]?.question?.trim();
    if (approval.kind === "question" || question)
      return `${say(language, "问你：", "Asks: ")}${question || approval.summary || approval.title}`;
    if (approval.kind === "plan")
      return say(language, "等你批准计划", "Plan waiting for approval");
    return `${say(language, "等你批准：", "Needs approval: ")}${approval.summary || approval.title}`;
  }
  const activity = session.liveFacts?.activity;
  const work = activity?.openCall?.work ?? activity?.work ?? null;
  const doing = activity?.compactingSince
    ? say(language, "正在压缩上下文", "Compacting context")
    : activity?.retrying
      ? say(language, "正在重试", "Retrying")
      : activity?.delegating || work === "agents"
        ? say(language, "子任务在跑", "Sub-agents at work")
        : work === "shell" || work === "command"
          ? say(language, "正在跑命令", "Running a command")
          : work === "edit"
            ? say(language, "正在改文件", "Editing files")
            : work === "read"
              ? say(language, "正在读文件", "Reading files")
              : work === "question"
                ? say(language, "正在提问", "Asking a question")
                : activity?.awaitsModel
                  ? say(language, "正在思考", "Thinking")
                  : say(language, "正在干活", "Working");
  // How long it has run sits beside the title (runningSince, #312).
  return doing;
}

/** How many of the last day's sessions are not listed: those stopped. */
export function stoppedCount(dayTotal: number, listed: number): number {
  return Math.max(0, dayTotal - listed);
}

/** An account's header, with its address, shows only where the agent has
 * more than one account's windows; one account needs no name. */
export function showsAccountNames(
  sections: readonly { account: unknown | null }[],
): boolean {
  return sections.filter((section) => section.account).length > 1;
}

/** Whether a panel on this agent leaves tokens out: it has no quota window
 * (Hermes, DeepSeek without a balance), and its layout does not ask for the
 * chart with its periods. */
export function panelHidesTokens(
  quotas: readonly Pick<Quota, "vendor">[],
  vendor: string,
  widget?: string,
): boolean {
  return widget !== "chart" && !quotas.some((row) => row.vendor === vendor);
}

/** Whether an agent gets a block on the board: one with quota windows, a
 * chart layout or a notice to show, and Hermes with its bots. An agent with
 * none of these (ChatGPT's web channel, which shares OpenAI's mark) has
 * nothing to say there (owner, 2026-11-06: no "last 24 hours" tokens). */
export function blockListed(
  quotas: readonly Pick<Quota, "vendor">[],
  vendor: string,
  widget?: string,
  notice?: string | null,
): boolean {
  return (
    widget === "chart" ||
    Boolean(notice) ||
    vendor === "hermes" ||
    quotas.some((row) => row.vendor === vendor)
  );
}

/** How a quota's share is inked: by its status, and a reading waiting for an
 * update by its last share, so a stale 97% still reads critical. */
export function quotaLevel(
  row: Pick<Quota, "status" | "usedPercent">,
): "normal" | "warning" | "critical" | "stale" {
  if (row.status === "warning" || row.status === "critical") return row.status;
  if (row.status !== "stale") return "normal";
  const used = row.usedPercent;
  if (!finite(used)) return "stale";
  return used >= 90 ? "critical" : used >= 70 ? "warning" : "stale";
}
