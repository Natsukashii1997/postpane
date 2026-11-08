import type { Approval, IslandEvent, Session } from "@agent-hud/protocol";
import { paperLevel, paperOf } from "../paper.ts";

/** What a tag's colour says: the agent asks you (ASK, PLAN), it needs a
 * permission (BASH, EDIT, MCP, READ and the rest), or a session replied. */
export type TagTone = "ask" | "permission" | "reply" | "start";

export const REPLY_BADGE = "REPLY";
/** A handoff card's tag: the session proposed moving to a new one (#245). */
export const START_BADGE = "START";

/** A request's folded tag beside the dock, boxed as a reply's REPLY is
 * (owner, 2026-11-08, #243): ANSWER for a question, PLAN for a plan,
 * APPROVE for a permission. */
export function requestBadge({
  kind,
  badge,
}: Pick<Approval, "kind" | "badge">): {
  label: string;
  tone: TagTone;
} {
  // A handoff card asks the person to switch sessions (#245).
  if (badge === START_BADGE) return { label: START_BADGE, tone: "start" };
  if (kind === "question") return { label: "ANSWER", tone: "ask" };
  if (kind === "plan") return { label: "PLAN", tone: "ask" };
  return { label: "APPROVE", tone: "permission" };
}

export function tagTone(badge: string): TagTone {
  if (badge === "ASK" || badge === "PLAN") return "ask";
  if (badge === REPLY_BADGE) return "reply";
  if (badge === START_BADGE) return "start";
  return "permission";
}

/** A tag's ink in the HUD's appearance: the paper's red for asking, its
 * warning amber for a permission, its blue for a reply. */
export function tagColor(tone: TagTone, light: boolean): string {
  const paper = paperOf(light);
  return tone === "ask"
    ? paper.red
    : tone === "reply"
      ? paper.blue
      : tone === "start"
        ? paper.green
        : paperLevel("warning", paper);
}

/** One line of the waiting list: a request, or a reply waiting beside them. */
export type ApprovalEntry =
  | {
      kind: "request";
      id: string;
      at: string;
      badge: string;
      request: Approval;
      session?: Session;
    }
  | {
      kind: "reply";
      id: string;
      at: string;
      badge: typeof REPLY_BADGE;
      event: IslandEvent;
      session?: Session;
    };

/** The session a request or reply came from: the same id from the same
 * client, else the only session with that id. */
export function findSession(
  sessions: readonly Session[],
  sessionId: string | null | undefined,
  source: string,
): Session | undefined {
  if (!sessionId) return undefined;
  const same = sessions.filter((session) => session.id === sessionId);
  return (
    same.find((session) => session.source === source) ??
    (same.length === 1 ? same[0] : undefined)
  );
}

/** A request's title as the waiting list writes it: its session's title,
 * else `fallback` (the folder it runs in, or the client). */
export function requestTitle(
  request: Approval,
  sessions: readonly Session[],
  fallback: string,
): string {
  return (
    findSession(sessions, request.sessionId, request.source)?.title?.trim() ||
    fallback
  );
}

/** The session to go back to: the one found, else for a reply the way back
 * it carries; undefined when there is no way back. */
export function sessionToOpen(entry: ApprovalEntry): Session | undefined {
  if (entry.session?.navigationTarget) return entry.session;
  if (entry.kind !== "reply") return undefined;
  const { event } = entry;
  if (!event.sessionId || !event.navigationTarget) return undefined;
  return {
    ...(entry.session ?? {
      id: event.sessionId,
      title: event.title ?? "",
      source: event.source,
      model: event.model ?? "",
      cwd: null,
      updatedAt: event.at,
      state: "idle",
      tokens: 0,
      cost: null,
      contextPercent: null,
      logPath: null,
      parentId: null,
    }),
    navigationTarget: event.navigationTarget,
  };
}

/** The line's title: its session's title, else `fallback` (the project or
 * the client, as the card named it before). */
export function entryTitle(entry: ApprovalEntry, fallback: string): string {
  // A Hermes chat lives for days: its reply is titled by what was asked.
  const own =
    (entry.kind === "reply" ? entry.event.prompt?.trim() : undefined) ||
    entry.session?.title?.trim() ||
    (entry.kind === "reply" ? entry.event.title?.trim() : undefined);
  return own || fallback;
}

/** The open line's model and reasoning effort; null without a model. */
export function modelLine(
  entry: ApprovalEntry,
): { model: string; effort: string | null } | null {
  const model =
    entry.session?.model?.trim() ||
    (entry.kind === "reply" ? entry.event.model?.trim() : undefined);
  if (!model || model === "Unknown") return null;
  return { model, effort: entry.session?.effort?.trim() || null };
}

/** How long a request has waited: "7 秒", "3 分钟", "1 小时 5 分". */
export function waitedText(seconds: number, zh: boolean): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return zh ? `${total} 秒` : `${total}s`;
  const h = Math.floor(total / 3600),
    m = Math.floor((total % 3600) / 60);
  if (h === 0) return zh ? `${m} 分钟` : `${m}m`;
  if (zh) return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`;
  return `${h}h${String(m).padStart(2, "0")}m`;
}

/** The lines in the order they are listed: the requests, longest waiting
 * first, then the replies as they came. */
export function orderEntries(entries: readonly ApprovalEntry[]) {
  const time = (entry: ApprovalEntry) => {
    const at = Date.parse(entry.at);
    return Number.isFinite(at) ? at : Number.POSITIVE_INFINITY;
  };
  return [...entries].sort(
    (a, b) =>
      Number(a.kind === "reply") - Number(b.kind === "reply") ||
      time(a) - time(b),
  );
}

export interface ApprovalGroup {
  /** The Claude sidebar section; null for the lines in none. */
  section: string | null;
  entries: ApprovalEntry[];
}

/** At most this many lines show before the rest fold into one. */
export const SHOWN_ENTRIES = 5;

/**
 * The list as the card prints it: the first `limit` lines in `order` (the
 * open one always among them), grouped by sidebar section in the order the
 * groups first appear, and how many lines are folded away. `sectioned` says
 * whether any line has a section, so a list with none prints no group titles.
 */
export function approvalGroups(
  entries: readonly ApprovalEntry[],
  openId: string | null,
  limit = SHOWN_ENTRIES,
  order: (entries: readonly ApprovalEntry[]) => ApprovalEntry[] = orderEntries,
  sectionOf: (entry: ApprovalEntry) => string | null = (entry) =>
    entry.session?.section?.trim() || null,
): { groups: ApprovalGroup[]; hidden: number; sectioned: boolean } {
  const ordered = order(entries);
  let shown = ordered.length > limit ? ordered.slice(0, limit) : ordered;
  const open = ordered.find((entry) => entry.id === openId);
  if (open && !shown.includes(open))
    shown = [...shown.slice(0, Math.max(0, limit - 1)), open];
  const groups: ApprovalGroup[] = [];
  for (const entry of shown) {
    const section = sectionOf(entry);
    const group = groups.find((group) => group.section === section);
    if (group) group.entries.push(entry);
    else groups.push({ section, entries: [entry] });
  }
  return {
    groups,
    hidden: ordered.length - shown.length,
    sectioned: groups.some((group) => group.section !== null),
  };
}

/** The counts in the card's head: ASK and PLAN first, then each permission
 * as it first appears, REPLY last. */
export function tagCounts(
  entries: readonly ApprovalEntry[],
): { badge: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of orderEntries(entries))
    counts.set(entry.badge, (counts.get(entry.badge) ?? 0) + 1);
  const rank = (badge: string) =>
    badge === "ASK"
      ? 0
      : badge === "PLAN" || badge === START_BADGE
        ? 1
        : badge === REPLY_BADGE
          ? 3
          : 2;
  return [...counts]
    .map(([badge, count]) => ({ badge, count }))
    .sort((a, b) => rank(a.badge) - rank(b.badge));
}
