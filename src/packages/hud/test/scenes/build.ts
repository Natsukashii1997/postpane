// Builders for the workplace scenes (#349, ADR-0001): synthetic snapshots
// with no private data, at one fixed clock, so the contract tests and the
// scene preview see the same states.
import type {
  Approval,
  BillingAccount,
  Handoff,
  HermesBotStatus,
  IslandEvent,
  Quota,
  Session,
  SessionLiveFacts,
  Snapshot,
} from "@agent-hud/protocol";
import base from "./base.json" with { type: "json" };

/** The scenes' clock: 2026-11-14 14:00 Beijing time. */
export const NOW = Date.parse("2026-11-14T06:00:00.000Z");
export const at = (minutesAgo: number) =>
  new Date(NOW - minutesAgo * 60_000).toISOString();

/** The four workplaces and Hermes, by their source ids. */
export type Place = "claude" | "codex" | "chatgpt" | "deepseek" | "hermes";
export const WORKPLACES: readonly Place[] = [
  "claude",
  "codex",
  "chatgpt",
  "deepseek",
];

const CLIENTS: Record<Place, string> = {
  claude: "Claude Code Desktop",
  codex: "Codex Desktop",
  chatgpt: "",
  deepseek: "",
  hermes: "",
};

export type Live = "running" | "waiting" | "idle";

export interface SessionSpec {
  place: Place;
  id: string;
  title: string;
  state: Live;
  /** Minutes since the turn began, and since the last event. */
  startedAgo?: number;
  lastAgo?: number;
  outcome?: SessionLiveFacts["outcome"];
  /** Waiting on a question or permission the transcript holds. */
  asks?: "question" | "permission" | "plan";
  client?: string;
  origin?: string;
}

export function session(spec: SessionSpec): Session {
  const last = at(spec.lastAgo ?? 1);
  const turnStartedAt = spec.startedAgo == null ? null : at(spec.startedAgo);
  const requests =
    spec.asks && spec.state === "waiting"
      ? [
          {
            id: `ask:${spec.id}`,
            sessionId: spec.id,
            kind: spec.asks,
            at: last,
          },
        ]
      : [];
  return {
    id: spec.id,
    title: spec.title,
    source: spec.place,
    client: spec.client ?? (CLIENTS[spec.place] || null),
    origins: spec.origin
      ? { init: spec.origin, latest: spec.origin }
      : undefined,
    model: "",
    cwd: null,
    updatedAt: last,
    lastMessageAt: last,
    state: spec.state,
    tokens: 0,
    cost: null,
    contextPercent: null,
    logPath: null,
    parentId: null,
    liveFacts: {
      turnId: `turn:${spec.id}`,
      turnStartedAt,
      outcome: spec.state === "idle" ? (spec.outcome ?? "completed") : null,
      endedAt: spec.state === "idle" ? last : null,
      limitedUntil: spec.outcome === "limited" ? at(-60) : null,
      observedAt: at(0),
      lastEventAt: last,
      activity: null,
      requests,
    },
  };
}

export function approval(
  place: Place,
  sessionId: string,
  kind: "permission" | "question" | "plan",
  minutesAgo: number,
  summary: string,
): Approval {
  return {
    id: `${place}-${kind}:${sessionId}`,
    title: summary,
    summary,
    source: place,
    kind,
    toolName: kind === "permission" ? "Bash" : "AskUserQuestion",
    input: summary,
    sessionId,
    createdAt: at(minutesAgo),
    allowsAlways: kind === "permission",
    answersQuestion: kind === "question",
    questions:
      kind === "question"
        ? [
            {
              id: "q1",
              answerKey: "q1",
              header: "下一步",
              question: summary,
              multiSelect: false,
              options: [
                { label: "继续", description: null },
                { label: "先停", description: null },
              ],
            },
          ]
        : undefined,
  } as Approval;
}

export function reply(
  place: Place,
  sessionId: string,
  minutesAgo: number,
  title: string,
): IslandEvent {
  return {
    id: `done:${place}:${sessionId}`,
    kind: "completion",
    at: at(minutesAgo),
    source: place,
    sessionId,
    title,
    message: `${title}：已完成。`,
  };
}

export interface RelaySpec {
  id: string;
  title: string;
  doer: "claude" | "codex";
  session: string;
  chatgpt: string;
  phase: NonNullable<Handoff["phase"]>;
  minutesAgo: number;
}

export function relay(spec: RelaySpec): Handoff {
  const t = NOW - spec.minutesAgo * 60_000;
  return {
    id: spec.id,
    title: spec.title,
    claudeSession: spec.session,
    doer: spec.doer === "codex" ? "codex" : null,
    chatgptConversation: spec.chatgpt,
    status: "open",
    createdAt: t - 600_000,
    updatedAt: t,
    rounds: 1,
    phase: spec.phase,
    phaseAt: t,
    auto: true,
    steps: [
      { at: t - 600_000, kind: "ask", text: "送审：改动摘要" },
      ...(spec.phase === "replied" || spec.phase === "returned"
        ? [
            {
              at: t,
              kind: "reply" as const,
              verdict: "revise" as const,
              points: ["补一条测试"],
            },
          ]
        : []),
    ],
  };
}

function quota(
  vendor: "claude" | "codex",
  short: "5h" | "7d",
  used: number,
): Quota {
  const hours = short === "5h" ? 5 : 168;
  return {
    id: `${vendor}:scene:${short}`,
    vendor,
    accountId: `account:scene-${vendor}`,
    account: "scene",
    name: short === "5h" ? "Current session" : "Current week",
    shortLabel: short,
    usedPercent: used,
    status: "normal",
    resetAt: new Date(NOW + (hours / 2) * 3_600_000).toISOString(),
    windowDurationSeconds: hours * 3600,
    observedAt: at(1),
    metrics: { unavailable: {} },
  } as unknown as Quota;
}

const BALANCE = {
  id: "deepseek:scene:CNY",
  vendor: "deepseek",
  accountId: "account:scene-deepseek",
  label: "API 余额",
  amount: 120.5,
  currency: "CNY",
  available: true,
  level: "normal",
  notice: null,
} as unknown as BillingAccount;

const BOTS: HermesBotStatus[] = [
  {
    id: "default",
    name: "机器人甲",
    down: null,
    turnsToday: 6,
    lastReplyAt: at(20),
    jobs: [],
    asks: [],
  },
];

export interface SceneParts {
  sessions?: Session[];
  approvals?: Approval[];
  handoffs?: Handoff[];
  events?: IslandEvent[];
  bots?: HermesBotStatus[];
}

/** One whole snapshot: the base's providers and settings, readings for
 * every workplace, and the scene's own sessions, requests and relays. */
export function snapshot(parts: SceneParts): Snapshot {
  return {
    ...(base as unknown as Snapshot),
    generatedAt: at(0),
    totals: {
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      total: 0,
      usd: null,
      cny: null,
    } as unknown as Snapshot["totals"],
    timeline: [],
    quotas: [
      quota("claude", "5h", 20),
      quota("claude", "7d", 35),
      quota("codex", "5h", 5),
      quota("codex", "7d", 40),
    ],
    billing: [BALANCE],
    accounts: [],
    sessions: parts.sessions ?? [],
    approvals: parts.approvals ?? [],
    requestDeliveries: [],
    handoffs: parts.handoffs ?? [],
    relayLaunches: [],
    hermesBots: parts.bots ?? BOTS,
    islandEvents: { revision: 1, items: parts.events ?? [] },
  };
}
