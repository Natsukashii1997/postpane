import { test } from "node:test";
import assert from "node:assert/strict";
import type { Approval, Quota, Session } from "@agent-hud/protocol";
import { quotaWindowLabel } from "../src/panel/window-labels.ts";
import {
  boardShowsTokens,
  boardVerdict,
  liveSessionLine,
  liveSessions,
  quotaNote,
  quotaOutlook,
  resetText,
  showsAccountNames,
  stoppedCount,
} from "../src/panel/agent-board.ts";

const now = Date.parse("2026-11-05T12:32:00Z");
const utc = { timeZone: "UTC", firstWeekday: 1 };

function quota(
  name: string,
  used: number | null,
  outlook?: NonNullable<Quota["metrics"]>["outlook"],
  expected?: number,
  extra: Partial<Quota> = {},
): Quota {
  return {
    id: name,
    vendor: "claude",
    name,
    usedPercent: used,
    resetAt: "2026-11-07T18:00:00Z",
    status: "normal",
    account: null,
    metrics: {
      burnRatePctPerHour: null,
      tokensPerHour: null,
      replyRate: null,
      consumed: null,
      cost: null,
      sampling: null,
      outlook: outlook ?? null,
      budget:
        expected == null
          ? null
          : { expectedUsedPercent: expected, paceDelta: 0, status: "onTrack" },
    },
    ...extra,
  };
}

const lasts = (projected: number) =>
  ({
    kind: "exhausts",
    beforeReset: false,
    projectedUsedPercent: projected,
  }) as const;

test("window names read in Chinese in a Chinese panel and stay English otherwise", () => {
  const zh = (name: string) => quotaWindowLabel({ name }, "zh");
  assert.equal(zh("Current session"), "5 小时");
  assert.equal(zh("Weekly limit · All models"), "每周");
  assert.equal(zh("Weekly limit · Fable"), "每周 · Fable");
  assert.equal(zh("Weekly"), "每周");
  assert.equal(zh("5h limit"), "5 小时");
  assert.equal(zh("Daily limit"), "每天");
  assert.equal(zh("Monthly quota"), "每月");
  assert.equal(zh("3h limit"), "3 小时");
  assert.equal(
    zh("GPT-5.3-Codex-Spark · 5h limit"),
    "GPT-5.3-Codex-Spark · 5 小时",
  );
  assert.equal(
    zh("Premium requests"),
    "Premium requests",
    "unknown words pass",
  );
  assert.equal(
    quotaWindowLabel({ name: "Weekly limit · Fable" }, "en"),
    "Weekly limit · Fable",
  );
});

test("the stamp says enough while every forecast lasts, and tight once one runs out", () => {
  const enough = boardVerdict(
    [
      quota("Current session", 13, lasts(19), 71),
      quota("Weekly limit · All models", 41, lasts(68), 82),
      quota("Weekly limit · Fable", 0, { kind: "no-usage" }, 82),
    ],
    now,
    "zh",
  );
  assert.equal(enough.stamp, "enough");
  assert.equal(
    enough.words!.map((w) => w.text).join(""),
    "照现在的速度，三个额度在重置前都用不完。",
  );
  const tight = boardVerdict(
    [
      quota("Current session", 13, lasts(19)),
      quota("Weekly limit · All models", 80, {
        kind: "exhausts",
        beforeReset: true,
        exhaustsAt: "2026-11-05T14:32:00Z",
      }),
    ],
    now,
    "zh",
  );
  assert.equal(tight.stamp, "tight");
  assert.deepEqual(
    tight.words!.filter((w) => w.strong).map((w) => w.text),
    ["每周"],
  );
  assert.match(
    tight.words!.map((w) => w.text).join(""),
    /每周约 2小时后用完，早于重置。$/,
  );
  const used = boardVerdict(
    [quota("Current session", 100, { kind: "exhausted" })],
    now,
    "en",
  );
  assert.equal(used.stamp, "tight");
  assert.equal(
    used.words!.map((w) => w.text).join(""),
    "Current session is used up.",
  );
  // No forecast at all: the unknown stamp, and the sentence says so.
  const unknown = boardVerdict(
    [quota("Weekly", 20, { kind: "insufficient-data" })],
    now,
    "zh",
  );
  assert.equal(unknown.stamp, "unknown");
  assert.equal(unknown.words![0].text, "读数还不够，暂时没法预测。");
  // Stale readings stamp unknown and say nothing; no quotas, no stamp.
  assert.deepEqual(
    boardVerdict(
      [quota("Weekly", 20, lasts(40), 50, { status: "stale" })],
      now,
      "zh",
    ),
    { stamp: "unknown", words: null },
  );
  assert.deepEqual(boardVerdict([], now, "zh"), { stamp: null, words: null });
});

test("a bar draws the pace and the steady mark only with a forecast", () => {
  assert.deepEqual(quotaOutlook(quota("Weekly", 41, lasts(68), 82)), {
    live: true,
    used: 41,
    projected: 68,
    expected: 82,
    exhausted: false,
    runsOut: false,
    exhaustsAt: null,
  });
  const bare = quotaOutlook(quota("Weekly", 41, { kind: "no-estimate" }, 82));
  assert.equal(bare.projected, null);
  assert.equal(bare.expected, null, "no amber mark without a forecast");
  assert.equal(
    quotaNote(quota("Weekly", 41, lasts(68)), now, "zh")?.text,
    "照现在的速度，重置时约 68%",
  );
  assert.equal(
    quotaNote(
      quota("Weekly", 0, { kind: "no-usage" }, 82, {
        windowDurationSeconds: 604_800,
      }),
      now,
      "zh",
    )?.text,
    "这周还没用过",
  );
  assert.equal(
    quotaNote(quota("Weekly", 41, { kind: "untimed" }), now, "zh"),
    null,
  );
});

test("resets read as a countdown within a day, else as a weekday", () => {
  assert.equal(
    resetText("2026-11-05T14:00:00Z", now, utc, "zh"),
    "1 小时 28 分后重置",
  );
  assert.equal(
    resetText("2026-11-05T12:50:00Z", now, utc, "zh"),
    "18 分钟后重置",
  );
  assert.equal(
    resetText("2026-11-07T02:00:00Z", now, utc, "zh"),
    "周六 02:00 重置",
  );
  assert.equal(
    resetText("2026-11-05T14:00:00Z", now, utc, "en"),
    "Resets in 1h 28m",
  );
  assert.equal(resetText(null, now, utc, "zh"), null);
});

function session(
  id: string,
  state: Session["state"],
  at: string,
  extra: Partial<Session> = {},
): Session {
  return {
    id,
    title: id,
    source: "claude",
    model: "claude-opus",
    cwd: null,
    updatedAt: at,
    lastMessageAt: at,
    state,
    tokens: 0,
    cost: null,
    contextPercent: null,
    logPath: null,
    parentId: null,
    ...extra,
  };
}

const approval = (
  sessionId: string,
  extra: Partial<Approval> = {},
): Approval => ({
  id: `req-${sessionId}`,
  title: "Bash",
  source: "claude",
  toolName: "Bash",
  input: "",
  sessionId,
  createdAt: "2026-11-05T12:30:00Z",
  allowsAlways: false,
  ...extra,
});

test("the panel lists sessions waiting on you first, then those at work, and no others", () => {
  const sessions = [
    session("ran", "running", "2026-11-05T12:31:00Z"),
    session("idle", "idle", "2026-11-05T12:31:30Z"),
    session("asked", "waiting", "2026-11-05T12:00:00Z"),
    session("newer-run", "running", "2026-11-05T12:31:50Z"),
    // A request open on a session Core still calls running: it waits.
    session("held", "running", "2026-11-05T11:00:00Z"),
    // A sub-agent stands behind its session.
    session("child", "running", "2026-11-05T12:32:00Z", { parentId: "ran" }),
    session("unverified", "unverified", "2026-11-05T12:32:00Z"),
  ];
  const listed = liveSessions(sessions, [approval("held")]);
  assert.deepEqual(
    listed.map((entry) => [entry.session.id, entry.status]),
    [
      ["asked", "waiting"],
      ["held", "waiting"],
      ["newer-run", "running"],
      ["ran", "running"],
    ],
  );
  assert.equal(listed[1].approval?.id, "req-held");
  assert.equal(stoppedCount(9, listed.length), 5);
  assert.equal(stoppedCount(2, listed.length), 0, "never below none");
});

test("a listed session says what it waits on or what it does", () => {
  const waiting = (request: Approval | null) =>
    liveSessionLine(
      {
        session: session("a", "waiting", "2026-11-05T12:00:00Z"),
        status: "waiting",
        approval: request,
      },
      now,
      "zh",
    );
  assert.equal(
    waiting(
      approval("a", {
        kind: "question",
        questions: [
          {
            id: null,
            answerKey: "q",
            question: "要把 #50 合并进 main 吗？",
            header: null,
            options: [],
            multiSelect: false,
          },
        ],
      }),
    ),
    "问你：要把 #50 合并进 main 吗？",
  );
  assert.equal(
    waiting(approval("a", { summary: "git push origin main" })),
    "等你批准：git push origin main",
  );
  assert.equal(waiting(null), "等你回复");
  const running = session("b", "running", "2026-11-05T12:31:00Z", {
    liveFacts: {
      turnId: "t",
      turnStartedAt: "2026-11-05T12:28:00Z",
      outcome: null,
      endedAt: null,
      limitedUntil: null,
      observedAt: "2026-11-05T12:32:00Z",
      lastEventAt: "2026-11-05T12:32:00Z",
      activity: {
        work: "shell",
        openCall: null,
        toolAt: null,
        delegating: false,
        awaitsModel: false,
        retrying: false,
        compactingSince: null,
      },
      requests: [],
    },
  });
  assert.equal(
    liveSessionLine(
      { session: running, status: "running", approval: null },
      now,
      "zh",
    ),
    "正在跑命令 · 已 4 分钟",
  );
});

test("one account's header names no account; several do", () => {
  assert.equal(showsAccountNames([{ account: { id: "a" } }]), false);
  assert.equal(
    showsAccountNames([{ account: { id: "a" } }, { account: null }]),
    false,
  );
  assert.equal(
    showsAccountNames([{ account: { id: "a" } }, { account: { id: "b" } }]),
    true,
  );
});

test("an agent with no quota window shows its day's tokens instead", () => {
  const quotas = [{ vendor: "claude" }];
  assert.equal(boardShowsTokens(quotas, "hermes"), true);
  assert.equal(boardShowsTokens(quotas, "claude"), false);
  assert.equal(
    boardShowsTokens(quotas, "hermes", "chart"),
    false,
    "a layout that sets up the chart keeps it",
  );
});
