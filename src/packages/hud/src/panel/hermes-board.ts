// The hover panel's Hermes block (issue #136, the owner's 丙 · 各管一摊):
// one desk per Feishu bot, by its job. 猛鬼兽 keeps the scheduled tasks, so
// its desk lists them with how often they run, how the last run went and
// when the next is; 亚古兽 is asked by colleagues, so its desk lists the
// latest asks and whether they were answered. Kept free of the UI so the
// tests can run it.
import type { HermesBotStatus } from "@agent-hud/protocol";
import { dateFormat, type Language } from "@agent-hud/ui/format";

const say = (language: Language, zh: string, en: string) =>
  language === "zh" ? zh : en;
const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** What each bot is for, under its name. */
export function deskRole(id: string, language: Language): string | null {
  if (id === "default") return say(language, "私人分身 · 监工", "Personal");
  if (id === "agumon") return say(language, "企业分身 · 带教", "Work");
  return null;
}

/** The stamp on the Hermes heading: 在岗 while every bot is up, 断线 when
 * one is down. */
export function hermesStamp(
  bots: readonly Pick<HermesBotStatus, "down">[],
): "duty" | "down" | null {
  if (!bots.length) return null;
  return bots.some((bot) => bot.down) ? "down" : "duty";
}

/** How long, from `since` to `now`: minutes under an hour, hours under a
 * day, days after. */
function lasted(since: number, now: number, language: Language): string {
  const minutes = Math.max(1, Math.round((now - since) / 60_000));
  if (minutes < 60) return say(language, `${minutes} 分钟`, `${minutes} min`);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return say(language, `${hours} 小时`, `${hours} h`);
  const days = Math.round(hours / 24);
  return say(language, `${days} 天`, `${days} d`);
}

/** The bot's state beside its name. A down gateway outranks a running turn,
 * since it cannot answer. */
export function deskState(
  bot: Pick<HermesBotStatus, "down" | "downSince">,
  replying: boolean,
  now: number,
  language: Language,
): { tone: "ok" | "busy" | "down"; text: string } {
  if (bot.down) {
    const since = bot.downSince ? Date.parse(bot.downSince) : NaN;
    const what =
      bot.down === "feishu"
        ? say(language, "飞书断线", "Feishu down")
        : say(language, "网关停了", "Gateway stopped");
    return {
      tone: "down",
      text: Number.isFinite(since)
        ? `${what} ${lasted(since, now, language)}`
        : what,
    };
  }
  if (replying)
    return { tone: "busy", text: say(language, "正在回复", "Replying") };
  return { tone: "ok", text: say(language, "在线 · 空闲", "Online · idle") };
}

/** A task's name without the note in brackets after it: 日报（新结构·并跑）
 * reads 日报. */
export function shortJobName(name: string): string {
  const short = name.replace(/\s*[（(][^（()）]*[)）]\s*$/, "").trim();
  return short || name.trim();
}

const two = (n: number) => String(n).padStart(2, "0");

/** How often a task runs, from its cron expression: 每天 07:30, 周一 07:45,
 * 工作日 09:00; any other schedule as Hermes wrote it. */
export function cadence(
  schedule: string | null | undefined,
  language: Language,
) {
  const text = (schedule ?? "").trim();
  const fields = text.split(/\s+/);
  if (fields.length !== 5) return text;
  const [minute, hour, day, month, weekday] = fields;
  if (
    !/^\d+$/.test(minute) ||
    !/^\d+$/.test(hour) ||
    day !== "*" ||
    month !== "*"
  )
    return text;
  const time = `${two(Number(hour))}:${two(Number(minute))}`;
  if (weekday === "*") return say(language, `每天 ${time}`, `Daily ${time}`);
  if (weekday === "1-5")
    return say(language, `工作日 ${time}`, `Weekdays ${time}`);
  if (/^[0-7]$/.test(weekday)) {
    const index = Number(weekday) % 7;
    return `${(language === "zh" ? WEEKDAYS_ZH : WEEKDAYS_EN)[index]} ${time}`;
  }
  return text;
}

/** Calendar days from `now` to `at` in `timeZone`: 0 today, 1 tomorrow, -1
 * yesterday. */
function dayOffset(at: number, now: number, timeZone: string): number {
  const day = dateFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const utc = (ms: number) => Date.parse(`${day.format(ms)}T00:00:00Z`);
  return Math.round((utc(at) - utc(now)) / 86_400_000);
}

/** When, short enough for a column: past runs read 今天 / 昨天 / 11/2;
 * coming ones read 11:30 (today) / 明天 / 周一 (this week) / 11/9. */
export function shortWhen(
  at: number,
  now: number,
  timeZone: string,
  language: Language,
): string {
  const offset = dayOffset(at, now, timeZone);
  const parts = Object.fromEntries(
    dateFormat("en-US", {
      timeZone,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.month}/${parts.day}`;
  if (at > now) {
    if (offset === 0) return `${parts.hour}:${parts.minute}`;
    if (offset === 1) return say(language, "明天", "Tomorrow");
    if (offset < 7) {
      const index = WEEKDAYS_EN.indexOf(parts.weekday);
      return language === "zh" && index >= 0
        ? WEEKDAYS_ZH[index]
        : parts.weekday;
    }
    return date;
  }
  if (offset === 0) return say(language, "今天", "Today");
  if (offset === -1) return say(language, "昨天", "Yesterday");
  return date;
}

/** When something was asked: its time today, 昨天 HH:MM, or M/D HH:MM. */
export function askWhen(
  at: number,
  now: number,
  timeZone: string,
  language: Language,
): string {
  const time = dateFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  const offset = dayOffset(at, now, timeZone);
  if (offset === 0) return time;
  if (offset === -1) return say(language, `昨天 ${time}`, `Yesterday ${time}`);
  const date = dateFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
  }).format(at);
  return `${date} ${time}`;
}

export interface JobRow {
  id: string;
  name: string;
  /** The full name, for the tooltip. */
  title: string;
  cadence: string;
  last: { tone: "ok" | "fail" | "none"; text: string };
  next: string;
}

/** The scheduled tasks as the desk's table rows, in Hermes' order. */
export function jobRows(
  jobs: NonNullable<HermesBotStatus["jobs"]>,
  now: number,
  timeZone: string,
  language: Language,
): JobRow[] {
  return jobs.map((job) => {
    const lastAt = job.lastRunAt ? Date.parse(job.lastRunAt) : NaN;
    const nextAt = job.nextRunAt ? Date.parse(job.nextRunAt) : NaN;
    const when = Number.isFinite(lastAt)
      ? shortWhen(lastAt, now, timeZone, language)
      : "";
    return {
      id: job.id,
      name: shortJobName(job.name),
      title: job.name,
      cadence: cadence(job.schedule, language),
      last: !when
        ? { tone: "none", text: say(language, "没跑过", "Never") }
        : job.failed
          ? { tone: "fail", text: `✗ ${when}` }
          : { tone: "ok", text: `✓ ${when}` },
      next: !job.enabled
        ? say(language, "停用", "Off")
        : Number.isFinite(nextAt)
          ? shortWhen(nextAt, now, timeZone, language)
          : "",
    };
  });
}

/** Where an ask came from: a private chat, or a group (topics included). */
export function chatLabel(chat: string | null | undefined, language: Language) {
  return chat === "dm"
    ? say(language, "私", "DM")
    : say(language, "群", "Group");
}

/** The Feishu chat an ask opens in, when Core gave one that is a chat id
 * (`oc_…`); a colleague's private chat with the bot has none. */
export function askChat(ask: { chatId?: string | null }): string | null {
  const id = ask.chatId ?? "";
  return /^oc_[A-Za-z0-9_]{1,61}$/.test(id) ? id : null;
}

/** The tooltip of an ask's arrow: where it goes, or that it did not. */
export function askGoTitle(failed: boolean, language: Language): string {
  return failed
    ? say(language, "飞书没能打开这个聊天", "Feishu could not open this chat")
    : say(language, "在飞书打开这个聊天", "Open this chat in Feishu");
}

/** How many asks a desk shows: one under a task table, three without. */
export function askLimit(jobs: readonly unknown[]): number {
  return jobs.length ? 1 : 3;
}
