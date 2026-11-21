// A turn that failed or hit a limit gets a receipt of its own (#359,
// ADR-0001 C6; the owner chose 甲 on 2026-11-14): apart from the replies,
// one line per source, session and kind of failure, Core counting the turns
// in a row (×2…). A passing failure stays until 「知道了」 or the session's
// next turn, never on the 4-second clock; a limit hangs until it lifts
// (owner, 2026-11-21).
import type { IslandEvent, Session } from "@agent-hud/protocol";
import {
  dateFormat,
  monthDayTime,
  type Language,
  type WeekCalendar,
} from "@agent-hud/ui/format";
import { findSession } from "../permissions/approval-list.ts";

export const isFailure = (event: IslandEvent | undefined) =>
  event?.kind === "turn-failed";

/** The line a failure is told on: its source, session and kind. */
export const failureKey = (event: IslandEvent) =>
  `${event.source}:${event.sessionId ?? ""}:${event.failure ?? "failed"}`;

const instant = (iso: string | null | undefined) => {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) ? ms : null;
};

const limited = (event: IslandEvent) => event.failure === "limited";

/** A limit whose end is known hangs until then: 「知道了」 leaves it. One
 * whose end is unknown would hang for ever, so it goes with the rest. */
export const dismissable = (event: IslandEvent) =>
  !limited(event) || instant(event.limitedUntil) === null;

/** Whether a failure's line still stands: its session has not started
 * another turn, and a limit has not lifted. */
export function failureStands(
  event: IslandEvent,
  sessions: readonly Session[],
  now: number,
): boolean {
  const until = instant(event.limitedUntil);
  if (limited(event) && until !== null && until <= now) return false;
  const turn = findSession(sessions, event.sessionId, event.source)?.liveFacts
    ?.turnId;
  return !turn || !event.turnId || turn === event.turnId;
}

type Card = { type: "request" | "news"; id: string; event?: IslandEvent };

/** The queue without the failures that no longer stand. */
export function standingQueue<C extends Card>(
  queue: C[],
  sessions: readonly Session[],
  now: number,
): C[] {
  const kept = queue.filter(
    (card) =>
      !isFailure(card.event) || failureStands(card.event!, sessions, now),
  );
  return kept.length === queue.length ? queue : kept;
}

/** The queue without the line `event` is told on: a failure again in the
 * same session takes its place, counted by Core. */
export function withoutLineOf<C extends Card>(
  queue: C[],
  event: IslandEvent,
): C[] {
  if (!isFailure(event)) return queue;
  const key = failureKey(event);
  return queue.filter(
    (card) => !isFailure(card.event) || failureKey(card.event!) !== key,
  );
}

/** The line's red tag: 失败 or 限流, ×n once it failed so again. */
export function failureTag(event: IslandEvent, zh: boolean): string {
  const word = limited(event)
    ? zh
      ? "限流"
      : "Limited"
    : zh
      ? "失败"
      : "Failed";
  return (event.count ?? 1) > 1 ? `${word} ×${event.count}` : word;
}

/** "2 小时 30 分" / "2h 30m": whole minutes, at least one. */
function span(ms: number, zh: boolean): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  if (!h) return zh ? `${m} 分` : `${m}m`;
  if (!m) return zh ? `${h} 小时` : `${h}h`;
  return zh ? `${h} 小时 ${m} 分` : `${h}h ${m}m`;
}

/** What the line says under its title. */
export function failureBody(
  event: IslandEvent,
  now: number,
  zh: boolean,
): string {
  if (!limited(event))
    return zh
      ? "这一轮没跑完，失败了。去会话里看原因。"
      : "This turn did not finish. See why in the session.";
  const until = instant(event.limitedUntil);
  if (until === null)
    return zh
      ? "被限流，恢复时间未知。"
      : "Rate limited; no word on when it lifts.";
  return zh
    ? `被限流，${span(until - now, zh)}后恢复。`
    : `Rate limited; lifts in ${span(until - now, zh)}.`;
}

/** "14:30" in the calendar's time zone, with the date when not today. */
function clock(
  at: number,
  now: number,
  calendar: WeekCalendar,
  language: Language,
): string {
  const day = (ms: number) =>
    dateFormat("en-US", {
      timeZone: calendar.timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(ms);
  return day(at) === day(now)
    ? dateFormat("en-US", {
        timeZone: calendar.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(at)
    : monthDayTime(at, calendar, language);
}

/** The folded tag's words (owner, 2026-11-21): 出错, or 限流至 14:30. */
export function failureChip(
  event: IslandEvent,
  now: number,
  calendar: WeekCalendar,
  zh: boolean,
): string {
  if (!limited(event)) return zh ? "出错" : "Error";
  const until = instant(event.limitedUntil);
  if (until === null) return zh ? "限流" : "Limited";
  const at = clock(until, now, calendar, zh ? "zh" : "en");
  return zh ? `限流至 ${at}` : `Limited till ${at}`;
}
