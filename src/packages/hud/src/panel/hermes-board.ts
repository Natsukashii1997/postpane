// The hover panel's Hermes block (issue #136, the owner's 丙 · 各管一摊):
// one desk per Feishu bot, by its job. 猛鬼兽 keeps the scheduled tasks, so
// its desk lists them with how often they run and how the last run went
// (#384 dropped the next run); 亚古兽 is asked by colleagues, so its desk lists the
// latest asks and whether they were answered. Kept free of the UI so the
// tests can run it.
import type { HermesBotStatus } from "@agent-hud/protocol";
import { dateFormat, type Language } from "@agent-hud/ui/format";
import { say } from "../say.ts";
import { cadence } from "./hermes-cadence.ts";

export { cadence };

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

/** When a run was, short enough for a column: 今天 / 昨天 / 11/2. */
export function shortWhen(
  at: number,
  now: number,
  timeZone: string,
  language: Language,
): string {
  const offset = dayOffset(at, now, timeZone);
  if (offset === 0) return say(language, "今天", "Today");
  if (offset === -1) return say(language, "昨天", "Yesterday");
  return dateFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
  }).format(at);
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
  /** How it is going: its last run, or 已暂停. */
  last: { tone: "ok" | "fail" | "none" | "paused"; text: string };
}

type Job = NonNullable<HermesBotStatus["jobs"]>[number];

/** The job a task is a step of: 个人项目日报·写稿 is a step of 个人项目日报. */
const jobOf = (job: Job) => shortJobName(job.name).split("·")[0].trim();

/** Minutes into the day a daily-style cron runs at; -1 when it has no fixed
 * time, so a step with one counts as later. */
function dayMinute(schedule: string | null | undefined): number {
  const [minute, hour] = (schedule ?? "").trim().split(/\s+/);
  return /^\d+$/.test(minute ?? "") && /^\d+$/.test(hour ?? "")
    ? Number(hour) * 60 + Number(minute)
    : -1;
}

/** Hermes' tasks, steps of one job (名字·写稿, 名字·发送) together where its
 * first step is listed; a 名字·步骤 alone stays its own. */
function groupSteps(jobs: readonly Job[]): Job[][] {
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = shortJobName(job.name).includes("·")
      ? `·${jobOf(job)}`
      : `#${job.id}`;
    groups.set(key, [...(groups.get(key) ?? []), job]);
  }
  return [...groups.values()];
}

/** Whether a task shows on the desk: one turned off shows only when whoever
 * paused it said why, so it reads as paused on purpose (owner, 2026-11-18). */
const shown = (job: Job) => job.enabled || Boolean(job.pausedReason?.trim());

/** The scheduled tasks as the desk's table rows, in Hermes' order, without
 * the ones turned off for no stated reason. The steps of one job read as one
 * row (#326): how often from its last step in the day, failed if any step
 * failed, 已暂停 if any step is paused. */
export function jobRows(
  jobs: NonNullable<HermesBotStatus["jobs"]>,
  now: number,
  timeZone: string,
  language: Language,
): JobRow[] {
  const status = (job: Job): JobRow["last"] => {
    if (!job.enabled)
      return { tone: "paused", text: say(language, "已暂停", "Paused") };
    const at = job.lastRunAt ? Date.parse(job.lastRunAt) : NaN;
    if (!Number.isFinite(at))
      return { tone: "none", text: say(language, "没跑过", "Never") };
    const when = shortWhen(at, now, timeZone, language);
    return job.failed
      ? { tone: "fail", text: `✗ ${when}` }
      : { tone: "ok", text: `✓ ${when}` };
  };
  const reason = (job: Job) =>
    job.enabled
      ? ""
      : `\n${say(language, "暂停原因", "Paused for")}：${job.pausedReason?.trim()}`;
  return groupSteps(jobs.filter(shown)).map((steps) => {
    const ordered = steps
      .map((job, index) => ({ job, index }))
      .sort(
        (a, b) =>
          dayMinute(a.job.schedule) - dayMinute(b.job.schedule) ||
          a.index - b.index,
      )
      .map(({ job }) => job);
    const final = ordered[ordered.length - 1];
    const paused = ordered.find((job) => !job.enabled);
    const failed = ordered.find((job) => job.failed && job.lastRunAt);
    const single = steps.length === 1;
    return {
      id: steps.map((job) => job.id).join("+"),
      name: single ? shortJobName(final.name) : jobOf(final),
      title: single
        ? final.name + reason(final)
        : ordered
            .map(
              (job) =>
                `${job.name}：${cadence(job.schedule, language)} · ${status(job).text}${reason(job)}`,
            )
            .join("\n"),
      cadence: cadence(final.schedule, language),
      last: status(paused ?? failed ?? final),
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
