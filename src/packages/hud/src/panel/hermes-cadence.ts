// How often a Hermes task runs, in words (owner, 2026-11-18, #384), from
// its cron expression or Hermes' own `every 5m`. Kept free of the UI so the
// tests can run it.
import type { Language } from "@agent-hud/ui/format";
import { say } from "../say.ts";

const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const two = (n: number) => String(n).padStart(2, "0");

/** The days a cron runs on, as a prefix: "" every day, 工作日, 每周一, 每月 1
 * 日, 每 5 天; null when it reads no plainer than the cron itself. */
function cronDays(day: string, month: string, weekday: string, zh: boolean) {
  if (month !== "*") return null;
  if (day === "*") {
    if (weekday === "*") return "";
    if (weekday === "1-5") return zh ? "工作日" : "Weekdays";
    if (!/^[0-7]$/.test(weekday)) return null;
    const index = Number(weekday) % 7;
    return zh ? `每${WEEKDAYS_ZH[index]}` : `Every ${WEEKDAYS_EN[index]}`;
  }
  if (weekday !== "*") return null;
  if (/^\d+$/.test(day)) return zh ? `每月 ${day} 日` : `Monthly, day ${day}`;
  const every = /^\*\/(\d+)$/.exec(day);
  return every ? (zh ? `每 ${every[1]} 天` : `Every ${every[1]} days`) : null;
}

/** How often within a day a cron without a fixed time runs: 每 15 分钟, 每
 * 30 分钟（9–23 点）, 每 2 小时, 每小时; null for anything else. */
function cronRepeat(minute: string, hour: string, zh: boolean) {
  const range = /^(\d+)-(\d+)$/.exec(hour);
  const hours = range
    ? zh
      ? `（${range[1]}–${range[2]} 点）`
      : ` (${range[1]}–${range[2]}h)`
    : "";
  const minutes = /^\*\/(\d+)$/.exec(minute);
  if (minutes && (hour === "*" || range))
    return (zh ? `每 ${minutes[1]} 分钟` : `Every ${minutes[1]} min`) + hours;
  if (!/^\d+$/.test(minute)) return null;
  const every = /^\*\/(\d+)$/.exec(hour);
  if (every) return zh ? `每 ${every[1]} 小时` : `Every ${every[1]} h`;
  if (hour === "*" || range) return (zh ? "每小时" : "Hourly") + hours;
  return null;
}

/** How often a task runs, in words (owner, 2026-11-18, #384): 每天 07:30,
 * 工作日 09:45, 每周一 07:45, 每月 1 日 10:30, 每 15 分钟, 每 30 分钟（9–23
 * 点）, 每 2 小时; Hermes' own `every 5m` reads 每 5 分钟. Any other schedule
 * reads as Hermes wrote it. */
export function cadence(
  schedule: string | null | undefined,
  language: Language,
) {
  const zh = language === "zh";
  const text = (schedule ?? "").trim();
  const interval = /^every\s+(\d+)\s*([mhd])$/i.exec(text);
  if (interval) {
    const [, count, unit] = interval;
    const one = count === "1";
    if (unit.toLowerCase() === "m")
      return zh ? `每 ${count} 分钟` : `Every ${count} min`;
    if (unit.toLowerCase() === "h")
      return one
        ? say(language, "每小时", "Hourly")
        : zh
          ? `每 ${count} 小时`
          : `Every ${count} h`;
    return one
      ? say(language, "每天", "Daily")
      : zh
        ? `每 ${count} 天`
        : `Every ${count} days`;
  }
  const fields = text.split(/\s+/);
  if (fields.length !== 5) return text;
  const [minute, hour, day, month, weekday] = fields;
  const days = cronDays(day, month, weekday, zh);
  if (days === null) return text;
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const time = `${two(Number(hour))}:${two(Number(minute))}`;
    return `${days || say(language, "每天", "Daily")} ${time}`;
  }
  const repeat = cronRepeat(minute, hour, zh);
  if (repeat === null) return text;
  return days
    ? zh
      ? `${days}${repeat}`
      : `${days}, ${repeat.toLowerCase()}`
    : repeat;
}
