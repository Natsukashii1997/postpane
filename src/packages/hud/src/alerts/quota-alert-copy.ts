// What a quota or reset-credit reminder says (Open's QuotaAlertCopy and
// ResetCreditAlertCopy), kept apart from the cards so the tests can run it.
import type { IslandEvent, ResetCredits } from "@agent-hud/protocol";
import {
  countdownCompact,
  dateFormat,
  percent,
  quotaPercent,
  relativeWeekdayTime,
  type FormatSettings,
  type Language,
  type WeekCalendar,
} from "@agent-hud/ui/format";
import { quotaWindowLabel } from "../panel/window-labels.ts";

const say = (language: Language, zh: string, en: string) =>
  language === "zh" ? zh : en;

/** Remaining % at or below which a window is empty (Open's AlertPolicy.exhaustedRemaining). */
const exhaustedRemaining = 0.5;

/** The window's share left, from the share used the event carries; none without a reading. */
function remainingOf(event: IslandEvent) {
  return event.usedPercent == null || !Number.isFinite(event.usedPercent)
    ? null
    : Math.max(0, Math.min(100, 100 - event.usedPercent));
}

/** A quota strip's colour: running low, used up, reset, or no reading. */
export type QuotaTone = "warning" | "critical" | "reset" | "none";

/** A wait in words, minutes rounded up: "4 天 18 小时", "2 小时 15 分",
 * "45 分" / "4d 18h", "2h 15m", "45m". */
export function waitText(seconds: number, language: Language) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const [d, h, m] =
    language === "zh" ? [" 天", " 小时", " 分"] : ["d", "h", "m"];
  const parts =
    days > 0
      ? [`${days}${d}`, hours > 0 ? `${hours}${h}` : ""]
      : hours > 0
        ? [`${hours}${h}`, rest > 0 ? `${rest}${m}` : ""]
        : [`${rest}${m}`];
  return parts.filter(Boolean).join(" ");
}

/** An instant as a clock time: "16:20" on the reading's day, else with its
 * weekday as the reset labels write it ("周五 16:20", "下周二 08:40"). */
function clockText(
  instant: number,
  now: number,
  calendar: WeekCalendar,
  language: Language,
) {
  const day = dateFormat("en-CA", {
    timeZone: calendar.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  if (day.format(instant) !== day.format(now))
    return relativeWeekdayTime(instant, now, calendar, language);
  return dateFormat("en-GB", {
    timeZone: calendar.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** "每周" + "额度": no space after a Chinese name, one after a Latin one. */
const joined = (name: string, word: string) =>
  /[\u4e00-\u9fff]$/.test(name) ? `${name}${word}` : `${name} ${word}`;

export function quotaAlertCopy(event: IslandEvent, settings: FormatSettings) {
  const { language, calendar } = settings;
  const remaining = remainingOf(event);
  const displayPct = quotaPercent(event.usedPercent, settings.quotaDisplay);
  const isReset = event.kind === "quota-reset";
  const forecast = event.timeToExhaustSeconds;
  const forecastSeconds =
    remaining != null && forecast != null && Number.isFinite(forecast)
      ? Math.max(60, Math.ceil(forecast / 60) * 60)
      : null;
  const exhaustion =
    forecastSeconds == null ? null : countdownCompact(forecastSeconds);
  const empty =
    remaining != null &&
    (event.crossing === "exhausted" || remaining <= exhaustedRemaining);
  // Times are measured from when the window was read, as Open measures them.
  const parsedReset = event.resetAt ? Date.parse(event.resetAt) : NaN;
  const resetAt = Number.isFinite(parsedReset) ? parsedReset : null;
  const parsedRead = Date.parse(event.at);
  const readAt = Number.isFinite(parsedRead) ? parsedRead : Date.now();
  const clock = (instant: number) =>
    clockText(instant, readAt, calendar, language);
  const name = quotaWindowLabel({ name: event.title ?? "" }, language);
  const others = (event.otherExhaustedWindows ?? [])
    .map((window) => window?.name)
    .filter((other): other is string => Boolean(other))
    .map((other) => quotaWindowLabel({ name: other }, language));
  const tone: QuotaTone =
    remaining == null
      ? "none"
      : isReset
        ? "reset"
        : empty
          ? "critical"
          : "warning";
  const usedNow = remaining == null ? 0 : Math.round(100 - remaining);
  /** When the window resets and how long until then. */
  const resetWait =
    resetAt == null
      ? null
      : say(
          language,
          `${clock(resetAt)} 重置（还要 ${waitText((resetAt - readAt) / 1000, language)}）`,
          `Resets ${clock(resetAt)} (${waitText((resetAt - readAt) / 1000, language)} to go)`,
        );
  return {
    displayPct,
    display: displayPct == null ? "N/A" : percent(displayPct),
    tone,
    /** The window's name in the interface's language. */
    windowName: name,
    /** Beside the agent in the small reminder. */
    compactTitle:
      remaining == null
        ? say(language, "额度不可用", "Quota unavailable")
        : isReset
          ? say(language, "已重置", "Reset")
          : remaining <= exhaustedRemaining
            ? say(language, "已耗尽", "Empty")
            : exhaustion
              ? say(language, `${exhaustion} 后耗尽`, `${exhaustion} left`)
              : say(language, "即将耗尽", "Running low"),
    /** The folded tag's figure: the share shown, or that the window reset. */
    chipStatus: isReset
      ? say(language, "已重置", "Reset")
      : displayPct == null
        ? "—"
        : percent(displayPct),
    /** The strip's sentence after the agent: the window and what happened. */
    status:
      remaining == null
        ? say(
            language,
            joined(name, "额度暂不可用"),
            `${name} quota is unavailable`,
          )
        : isReset
          ? say(language, joined(name, "额度已重置"), `${name} has reset`)
          : empty
            ? say(language, joined(name, "额度已用完"), `${name} is used up`)
            : forecastSeconds != null
              ? say(
                  language,
                  `${name} 约 ${waitText(forecastSeconds, language)}后用完`,
                  `${name} runs out in about ${waitText(forecastSeconds, language)}`,
                )
              : say(
                  language,
                  `${name} 已用到 ${usedNow}%`,
                  `${name} at ${usedNow}% used`,
                ),
    /** The strip's time line; null with nothing to tell. */
    when:
      remaining == null
        ? null
        : isReset
          ? resetAt == null
            ? null
            : say(
                language,
                `${clock(resetAt)} 再重置`,
                `Next reset ${clock(resetAt)}`,
              )
          : !empty && forecastSeconds != null
            ? say(
                language,
                `预计用完 ${clock(readAt + forecastSeconds * 1000)}`,
                `Runs out ${clock(readAt + forecastSeconds * 1000)}`,
              ) +
              (resetAt == null
                ? ""
                : say(
                    language,
                    `，重置 ${clock(resetAt)}`,
                    `, resets ${clock(resetAt)}`,
                  ))
            : resetWait,
    /** After a reset, the account's windows still used up, in red. */
    stillEmpty:
      isReset && others.length
        ? say(
            language,
            `${others.join("、")}仍已用完`,
            `${others.join(", ")} still used up`,
          )
        : null,
  };
}

/** A date in the settings' time zone: "12 月 1 日" / "Dec 1". */
function dayText(instant: number, calendar: WeekCalendar, language: Language) {
  const parts = Object.fromEntries(
    dateFormat("en-US", {
      timeZone: calendar.timeZone,
      month: language === "zh" ? "numeric" : "short",
      day: "numeric",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return say(
    language,
    `${parts.month} 月 ${parts.day} 日`,
    `${parts.month} ${parts.day}`,
  );
}

/** A past instant as a clock time, with its date when it fell on another day
 * than `now`: "09:12", "11 月 4 日 09:12" / "Nov 4, 09:12". */
function pastClockText(
  instant: number,
  now: number,
  calendar: WeekCalendar,
  language: Language,
) {
  const time = dateFormat("en-GB", {
    timeZone: calendar.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  const day = (at: number) => dayText(at, calendar, language);
  if (day(instant) === day(now)) return time;
  return say(language, `${day(instant)} ${time}`, `${day(instant)}, ${time}`);
}

/** A reset-credit strip's words: resets added to an account, how many it
 * holds (the account's count, else the event's), and its first expiry with
 * the account's name. `account` is the account the event names, if known. */
export function resetCreditCopy(
  event: IslandEvent,
  account:
    { name?: string | null; resetCredits?: ResetCredits | null } | undefined,
  settings: FormatSettings,
) {
  const { language, calendar } = settings;
  const added = event.added ?? 1;
  const available =
    account?.resetCredits?.availableCount ?? event.availableCount ?? added;
  // Every reset the account holds, as the usage panel lists them; else the new ones.
  const expiries =
    account?.resetCredits?.credits?.map((credit) => credit.expiresAt) ??
    (Array.isArray(event.newCredits)
      ? event.newCredits.map((credit) => credit?.expiresAt)
      : []);
  const first = expiries
    .map((at) => (at ? Date.parse(at) : NaN))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const name = (account?.name ?? event.title)?.trim() || null;
  const expiry =
    first === undefined
      ? null
      : say(
          language,
          `最早 ${dayText(first, calendar, language)}到期`,
          `First expires ${dayText(first, calendar, language)}`,
        );
  return {
    /** The strip's sentence after the agent. */
    status: say(
      language,
      `新增 ${added} 次额度重置`,
      added === 1 ? "1 usage reset added" : `${added} usage resets added`,
    ),
    /** The strip's figure, in blue. */
    display: say(language, `共 ${available} 次`, `${available} total`),
    /** The line under it: the first expiry and the account; null with neither. */
    when: [expiry, name].filter(Boolean).join(" · ") || null,
    /** The folded tag: the word in dim ink, the count added in blue. */
    chipLabel: say(language, "重置", "Reset"),
    chipValue: `+${added}`,
  };
}

/** A signed-out strip's words: what the account reading says, and that the
 * quota stays at its last reading, timed by the latest of `readAt` (when the
 * agent's windows were last read). */
export function signInCopy(
  event: IslandEvent,
  readAt: readonly (string | null | undefined)[],
  settings: FormatSettings,
) {
  const { language, calendar } = settings;
  const latest = readAt
    .map((at) => (at ? Date.parse(at) : NaN))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const parsedAt = Date.parse(event.at);
  const now = Number.isFinite(parsedAt) ? parsedAt : Date.now();
  const time =
    latest === undefined
      ? null
      : pastClockText(latest, now, calendar, language);
  return {
    status: say(language, "需要重新登录", "Sign in again"),
    /** The framed red tag on the right. */
    tag: say(language, "登出", "Signed out"),
    /** The account reading's reason; null without one. */
    message: event.message?.trim() || null,
    /** The faint line under it. */
    note:
      time == null
        ? say(
            language,
            "登回去之前，额度显示上次的读数",
            "Until you sign back in, quota shows the last reading",
          )
        : say(
            language,
            `登回去之前，额度停在 ${time} 的读数`,
            `Until you sign back in, quota stays at the ${time} reading`,
          ),
    /** The folded tag, in red. */
    chip: say(language, "需要登录", "Sign in"),
  };
}
