// The relay's handoffs (relay 1c, docs/chatgpt-channel.md): PostPane's own,
// not upstream's, so kept apart from index.ts and its upstream layout (#282).

/** One step of a handoff: `work` is Claude's, `reply` ChatGPT's, the rest
 * PostPane's (`ask` sent to ChatGPT and confirmed, `back` ChatGPT's answer
 * sent to Claude, `again` Claude asked to hand over again, `fail` not sent,
 * `end` ended by the person). */
export interface HandoffStep {
  /** Milliseconds since the epoch. */
  at: number;
  kind:
    | "work"
    | "ask"
    | "reply"
    | "back"
    | "again"
    | "fail"
    | "end"
    | "stop"
    | "resume"
    | "wake"
    | "format";
  /** What was said, cut to a few hundred characters. */
  text?: string | null;
  /** A reply's numbered points. */
  points?: string[];
  verdict?: "pass" | "revise" | null;
  /** A `reply`'s ChatGPT message id: its receipt's `turnId` (#411 L2 P2-01).
   * The snapshot carries no other step's key. */
  key?: string | null;
  /** Done by the auto round trip, not by the person (#72). */
  auto?: boolean;
  /** Words back to Claude (`back`, `again`, #257): the id they were left
   * under for the session's plugin. */
  prompt?: string;
  /** How those words stand with the plugin: left, taken, its turn on them
   * started, or given up. */
  delivery?:
    "waiting" | "taken" | "started" | "refused" | "expired" | "cancelled";
}
/** A Claude Code session and the ChatGPT conversation reviewing its work
 * (relay 1c, docs/chatgpt-channel.md). From the host: the live ones and those
 * that failed or ended in the last day. */
export interface Handoff {
  id: string;
  /** The task's name. */
  title: string;
  /** The doer's session: Claude Code's, or the Codex thread (`doer`). */
  claudeSession: string;
  /** `codex` when Codex does the work (#280); none is Claude Code. */
  doer?: "codex" | null;
  cwd?: string | null;
  /** The review conversation's chatgpt.com id, once open. */
  chatgptConversation?: string | null;
  status: "opening" | "open" | "failed" | "closed";
  /** Why the conversation could not be opened. */
  error?: string | null;
  /** Milliseconds since the epoch. */
  createdAt: number;
  updatedAt: number;
  /** How many times words went either way after the first. */
  rounds: number;
  /** Where it stands: words on their way to ChatGPT, arrived, being
   * answered, answered (the person decides), back with Claude, ended, or
   * not sent. */
  phase?:
    | "sending"
    | "delivered"
    | "working"
    | "replied"
    | "returned"
    | "ended"
    | "failed";
  /** When the phase began, in milliseconds. */
  phaseAt?: number;
  steps?: HandoffStep[];
  /** The auto round trip is on (#72): 「需修改」 goes back to Claude by
   * itself, a pass goes back and ends it, at most two reviews. */
  auto?: boolean;
  /** Why the auto round trip stopped, while it is off. */
  halt?: string | null;
  /** An engineering review's risk level (#217): what the review asks
   * for, not how many it gets (#347). */
  risk?: "L1" | "L2" | "L3";
  /** The pull request under review, 「owner/repo#n」 (#217). */
  pr?: string;
  /** Reviews of the same pull request in earlier handoffs (#217). */
  carried?: number;
  /** Reviews past the budget the person allowed (#217). */
  extra?: number;
  /** When ChatGPT's answer was queued for a Claude session that could not
   * take it then; a session that stays quiet is run in the background. */
  queuedAt?: number | null;
  /** Since when PostPane runs Claude Code in the background for a session
   * whose process stopped, with ChatGPT's answer (L-14). */
  wakingSince?: number | null;
  /** The step its rounds count from (#258): the person spoke up in the
   * Claude session and it handed over again. Earlier reviews, carried ones
   * too, no longer count. */
  roundsFrom?: number;
  /** The review gate's own (#347): the cap as set when it last asked, its
   * review chain and that chain's reviews before it, the commit under
   * review, and what the person is to hear of. */
  limit?: number;
  chain?: string;
  chainCarried?: number;
  head?: string;
  notice?: "passed" | "top";
  /** When it reached its cap (L3 P2-07). */
  topAt?: number;
  /** A review sent and not yet known to have gone in (L3 P1-10): its
   * answer counts and cannot pass. */
  pending?: HandoffPending;
  /** PostPane's ask to mend an answer's last lines, sent and not yet known
   * to have gone in (round 4 P1-10). The snapshot carries neither its words
   * nor theirs (#409). */
  mending?: HandoffPending;
  /** The rereads of a quiet conversation (#433): `epoch` is the phase they
   * count in (its `phaseAt`), `streamed` when one last found ChatGPT
   * writing there (#544), 0 if none did. */
  rereading?: { epoch: number; streamed?: number };
}

/** A review, or an ask to mend, on its way to ChatGPT. */
export interface HandoffPending {
  request: string;
  pr?: string;
  head?: string;
  limit: number;
  booked?: boolean;
  answered?: boolean;
  noted?: boolean;
}
