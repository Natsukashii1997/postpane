// A type tag's tone and its ink: the one place every tag, on the sidebar's
// tag, the open card and the board, takes its colour (owner, 2026-11-28).
import { paperOf, type Paper } from "../paper.ts";

/** What a tag's colour says: the agent asks you (ASK, PLAN), it needs a
 * permission (BASH, EDIT, MCP, READ and the rest), a session replied, a
 * handoff card, or a request in the backlog (WAIT, #563). */
export type TagTone = "ask" | "permission" | "reply" | "start" | "wait";

export const REPLY_BADGE = "REPLY";
/** A backlog line's tag: it has waited 48 hours (owner, 2026-11-28). */
export const WAIT_BADGE = "WAIT";
/** A handoff card's tag: the session proposed moving to a new one (#245). */
export const START_BADGE = "START";

export function tagTone(badge: string): TagTone {
  if (badge === "ASK" || badge === "PLAN") return "ask";
  if (badge === REPLY_BADGE) return "reply";
  if (badge === START_BADGE) return "start";
  if (badge === WAIT_BADGE) return "wait";
  return "permission";
}

/** Each tone's ink on the paper: red to ask, blue a reply, green a handoff
 * card, violet the backlog, ochre a permission (#308). */
const TONE_INK = {
  ask: "red",
  reply: "blue",
  start: "green",
  wait: "violet",
  permission: "ochre",
} as const satisfies Record<TagTone, keyof Paper>;

/** A tag's ink on `paper`, the one place a tone gets its colour: the
 * sidebar's tag, the open card and the board all take it from here
 * (owner, 2026-11-28: one component, one look everywhere). */
export const toneInk = (tone: TagTone, paper: Paper) => paper[TONE_INK[tone]];

/** A tag's ink in the HUD's appearance. */
export const tagColor = (tone: TagTone, light: boolean) =>
  toneInk(tone, paperOf(light));

/** A badge's ink on `paper`, as its tag prints it: a queued request's box
 * beside a notice (#308). */
export const tagInk = (badge: string, paper: Paper) =>
  tagColor(tagTone(badge), paper.light);
