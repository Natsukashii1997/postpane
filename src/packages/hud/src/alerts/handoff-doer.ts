import type { Handoff, Session } from "@agent-hud/protocol";

/** Who does a handoff's work and where its words go back (#280, #282):
 * a Codex thread when the host says so, else a Claude Code session. Moved
 * out of handoff-card.ts for the 300-line ratchet. */
export type Doer = "claude" | "codex";

const CHATGPT_PREFIX = "chatgpt:";

export const doerOf = (handoff: Pick<Handoff, "doer">): Doer =>
  handoff.doer === "codex" ? "codex" : "claude";

/** The doer's name as the card writes it. */
export const doerName = (handoff: Pick<Handoff, "doer">) =>
  doerOf(handoff) === "codex" ? "Codex" : "Claude";

const live = (handoff: Handoff) =>
  handoff.status === "open" || handoff.status === "opening";

/** The open handoffs, the one that moved last first: the sidebar's way in
 * opens the first (#341), the review slip lists them in this order (#288). */
export function liveHandoffs(handoffs: readonly Handoff[]): Handoff[] {
  const at = (handoff: Handoff) => handoff.phaseAt || handoff.updatedAt;
  return handoffs.filter(live).sort((a, b) => at(b) - at(a));
}

/** The live handoff a session belongs to: the doer's session (Claude
 * Code's, or a Codex thread) by its id, a ChatGPT conversation by
 * `chatgpt:<id>`. */
export function handoffFor(
  handoffs: readonly Handoff[] | undefined,
  source: string,
  sessionId: string | null | undefined,
): Handoff | undefined {
  if (!sessionId || !handoffs) return undefined;
  const newest = [...handoffs].reverse();
  if (source === "claude" || source === "codex")
    return newest.find(
      (handoff) =>
        live(handoff) &&
        doerOf(handoff) === source &&
        handoff.claudeSession === sessionId,
    );
  if (source === "chatgpt" && sessionId.startsWith(CHATGPT_PREFIX)) {
    const conversation = sessionId.slice(CHATGPT_PREFIX.length);
    return newest.find(
      (handoff) =>
        live(handoff) && handoff.chatgptConversation === conversation,
    );
  }
  return undefined;
}

/** The doer's session a handoff is about, when listed. */
export function doerSession(
  handoff: Handoff,
  sessions: readonly Session[],
): Session | undefined {
  return sessions.find(
    (session) =>
      session.source === doerOf(handoff) &&
      session.id === handoff.claudeSession,
  );
}

/** The ChatGPT conversation a handoff is reviewed in, as a session to open. */
export function chatgptSession(
  handoff: Handoff,
  sessions: readonly Session[],
): Session | undefined {
  const conversation = handoff.chatgptConversation;
  if (!conversation) return undefined;
  const id = `${CHATGPT_PREFIX}${conversation}`;
  return sessions.find((session) => session.id === id);
}

/** Where the card's 「查看 ChatGPT 对话」 goes: the review conversation's
 * session when listed, else a way to its chatgpt.com page. Moved out of
 * HandoffCard.tsx for the 300-line ratchet (#427). */
export function chatgptTarget(
  handoff: Handoff,
  sessions: readonly Session[],
): Session | undefined {
  const listed = chatgptSession(handoff, sessions);
  if (listed || !handoff.chatgptConversation) return listed;
  return {
    id: `${CHATGPT_PREFIX}${handoff.chatgptConversation}`,
    source: "chatgpt",
    navigationTarget: {
      kind: "chatgpt-conversation",
      id: handoff.chatgptConversation,
    },
  } as unknown as Session;
}
