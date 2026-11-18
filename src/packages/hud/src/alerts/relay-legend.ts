import type { Handoff } from "@agent-hud/protocol";
import { paperOf, type Paper } from "../paper.ts";
import { lastReply, round, verdictWord } from "./handoff-card.ts";
import { doerName } from "./handoff-doer.ts";

/** What the frame round a relay's reply says (owner, 2026-11-07, 甲 ·
 * 航空虚线框): the round it is in and ChatGPT's verdict, once there is one. */
export function relayLegend(
  handoff: Handoff,
  zh: boolean,
): { trip: string; verdict?: string; missing: boolean } {
  const D = doerName(handoff);
  const { at, of } = round(handoff);
  const reply = lastReply(handoff);
  return {
    trip: zh
      ? `${D} ⇄ ChatGPT · 第 ${at} / ${of} 轮`
      : `${D} ⇄ ChatGPT · round ${at} / ${of}`,
    verdict: reply ? verdictWord(reply.verdict, zh) : undefined,
    missing: !!reply && reply.verdict !== "pass" && reply.verdict !== "revise",
  };
}

/** The legend's inks: the paper's own, and where there is none (the notch,
 * #190) the paper's of that appearance, not plain ink. Words written out take
 * the word ink; a missing verdict, something gone wrong, stays red (#308). */
export function relayLegendInks(
  paper: Paper | null,
  light: boolean,
  missing = false,
): { relay: string; verdict: string } {
  const inks = paper ?? paperOf(light);
  return { relay: inks.word, verdict: missing ? inks.red : inks.word };
}
