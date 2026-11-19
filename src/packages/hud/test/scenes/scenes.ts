// The workplace scenes (#349, ADR-0001 「验收场景」): each the state one
// acceptance case needs, shared by the contract tests and the scene preview.
import type { HermesCronJob, Snapshot } from "@agent-hud/protocol";
import { approval, at, relay, reply, session, snapshot } from "./build.ts";
import {
  relayIdleStopped,
  relayStaleIdle,
  relayStopOtherKind,
  relayPassed,
  relayPaused,
  relayStopped,
} from "./relay-gate.ts";

export interface Scene {
  key: string;
  /** What the owner should be able to see in it. */
  title: string;
  snapshot: Snapshot;
}

const running = [
  session({
    place: "claude",
    id: "c-run",
    title: "整理周报模板",
    state: "running",
    startedAgo: 6,
  }),
  session({
    place: "codex",
    id: "x-run",
    title: "补齐解析器测试",
    state: "running",
    startedAgo: 12,
  }),
  session({
    place: "chatgpt",
    id: "chatgpt:g-run",
    title: "比较两种排期写法",
    state: "running",
    startedAgo: 1,
  }),
  session({
    place: "deepseek",
    id: "d-run",
    title: "翻译接口文档",
    state: "running",
    startedAgo: 3,
  }),
];

const allRunning: Scene = {
  key: "all-running",
  title: "四家各有一个在跑，没有任何审批",
  snapshot: snapshot({ sessions: running }),
};

const codexApproval: Scene = {
  key: "codex-approval-long",
  title: "Codex 等审批 45 分钟（超过原来的 30 分钟放弃线）",
  snapshot: snapshot({
    sessions: [
      session({
        place: "codex",
        id: "x-wait",
        title: "迁移配置文件",
        state: "waiting",
        startedAgo: 50,
        lastAgo: 45,
        asks: "permission",
      }),
    ],
    approvals: [
      approval("codex", "x-wait", "permission", 45, "运行 pnpm install"),
    ],
  }),
};

const codexStale: Scene = {
  key: "codex-stale",
  title: "Codex 45 分钟前提了问、没有审批卡，会话记录一直没动静（待核对）",
  snapshot: snapshot({
    sessions: [
      session({
        place: "codex",
        id: "x-stale",
        title: "清理旧的构建缓存",
        state: "waiting",
        startedAgo: 50,
        lastAgo: 45,
        asks: "question",
        stale: true,
      }),
      session({
        place: "codex",
        id: "x-fresh",
        title: "改日志格式",
        state: "waiting",
        startedAgo: 12,
        lastAgo: 10,
        asks: "question",
      }),
    ],
  }),
};

const claudeOldAsk: Scene = {
  key: "claude-old-ask",
  title: "Claude 有一条 3 天前的提问和一条刚问的提问",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-old",
        title: "旧提问：要不要装采样任务",
        state: "waiting",
        lastAgo: 3 * 1440,
        asks: "question",
      }),
      session({
        place: "claude",
        id: "c-new",
        title: "新提问：先修哪一处",
        state: "waiting",
        lastAgo: 2,
        asks: "question",
      }),
    ],
    approvals: [
      approval(
        "claude",
        "c-old",
        "question",
        3 * 1440,
        "要不要装一个采样任务？",
      ),
      approval("claude", "c-new", "question", 2, "先修哪一处？"),
    ],
  }),
};

const waitingNoCard: Scene = {
  key: "waiting-no-card",
  title: "Claude、DeepSeek 各有一个「等你回复」但没有审批卡",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-idlewait",
        title: "等你回复：方案选哪个",
        state: "waiting",
        lastAgo: 4,
      }),
      session({
        place: "deepseek",
        id: "d-idlewait",
        title: "等你回复：继续翻译吗",
        state: "waiting",
        lastAgo: 8,
      }),
      running[0],
    ],
  }),
};

const twoRelays: Scene = {
  key: "two-relays",
  title: "Claude 和 Codex 各有一单接力；DeepSeek 有一张审批卡",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-relay",
        title: "接力：整理导入流程",
        state: "idle",
        lastAgo: 5,
      }),
      session({
        place: "codex",
        id: "x-relay",
        title: "接力：重写缓存层",
        state: "running",
        startedAgo: 4,
      }),
      session({
        place: "chatgpt",
        id: "chatgpt:g-c",
        title: "审核：整理导入流程",
        state: "idle",
        lastAgo: 5,
      }),
      session({
        place: "chatgpt",
        id: "chatgpt:g-x",
        title: "审核：重写缓存层",
        state: "running",
        startedAgo: 2,
      }),
      session({
        place: "deepseek",
        id: "d-ask",
        title: "清理临时目录",
        state: "waiting",
        lastAgo: 3,
        asks: "permission",
      }),
    ],
    approvals: [
      approval("deepseek", "d-ask", "permission", 3, "删除 build 目录"),
    ],
    handoffs: [
      relay({
        id: "h-claude",
        title: "整理导入流程",
        doer: "claude",
        session: "c-relay",
        chatgpt: "g-c",
        phase: "replied",
        minutesAgo: 5,
      }),
      relay({
        id: "h-codex",
        title: "重写缓存层",
        doer: "codex",
        session: "x-relay",
        chatgpt: "g-x",
        phase: "working",
        minutesAgo: 2,
      }),
    ],
  }),
};

const reviews: Scene = {
  key: "chatgpt-reviews",
  title: "ChatGPT 有自己的对话和两单审核，没有审批卡（看审核纸条）",
  snapshot: snapshot({
    sessions: [
      ...twoRelays.snapshot.sessions.filter((s) => s.source !== "deepseek"),
      session({
        place: "chatgpt",
        id: "chatgpt:g-own",
        title: "自己问的：排期怎么写",
        state: "idle",
        lastAgo: 30,
      }),
    ],
    handoffs: twoRelays.snapshot.handoffs,
  }),
};

const failed: Scene = {
  key: "failed",
  title: "Codex 一轮失败、Claude 被限流",
  snapshot: snapshot({
    sessions: [
      session({
        place: "codex",
        id: "x-fail",
        title: "生成迁移脚本",
        state: "idle",
        lastAgo: 3,
        outcome: "failed",
      }),
      session({
        place: "claude",
        id: "c-limit",
        title: "批量改测试",
        state: "idle",
        lastAgo: 10,
        outcome: "limited",
      }),
    ],
  }),
};

const replies: Scene = {
  key: "replies",
  title: "四家都刚回复完",
  snapshot: snapshot({
    sessions: running.map((s) => ({ ...s, state: "idle" as const })),
    events: [
      reply("claude", "c-run", 1, "整理周报模板"),
      reply("codex", "x-run", 2, "补齐解析器测试"),
      reply("chatgpt", "chatgpt:g-run", 3, "比较两种排期写法"),
      reply("deepseek", "d-run", 4, "翻译接口文档"),
    ],
  }),
};

const claudeBusy: Scene = {
  key: "claude-busy",
  title:
    "Claude 在跑 8 个、等你回复 1 个（单家卡列 6 个加「展开其余 2 条」，看板收成「在跑 8」）",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-ask",
        title: "等你回复：要不要先合并旧分支",
        state: "waiting",
        lastAgo: 2,
      }),
      ...[
        "拆分设置页",
        "补齐导出测试",
        "整理依赖清单",
        "重写启动脚本",
        "清理旧日志",
        "对齐图标尺寸",
        "补交接文档",
        "核对快捷键",
      ].map((title, index) =>
        session({
          place: "claude",
          id: `c-busy-${index + 1}`,
          title,
          state: "running",
          startedAgo: 3 + index * 4,
          lastAgo: 1 + index,
        }),
      ),
      running[1],
    ],
  }),
};

const claudeManyAsks: Scene = {
  key: "claude-many-asks",
  title: "Claude 有 8 个提问在等你（看「展开其余 n 条」展开后能「收起」）",
  snapshot: snapshot({
    sessions: [
      ...[
        "首页 B′ 优化可以定下来吗",
        "要不要先合并旧分支",
        "导出按钮放哪",
        "测试先补哪块",
        "要不要升级依赖",
        "日志放哪个目录",
        "旧接口删不删",
        "发布放今晚还是明早",
      ].map((title, index) =>
        session({
          place: "claude",
          id: `c-ask-${index + 1}`,
          title,
          state: "waiting",
          lastAgo: 2 + index * 7,
          asks: "question",
        }),
      ),
      running[0],
    ],
    approvals: Array.from({ length: 8 }, (_, index) =>
      approval(
        "claude",
        `c-ask-${index + 1}`,
        "question",
        2 + index * 7,
        "选哪个？",
      ),
    ),
  }),
};

const everything: Scene = {
  key: "mixed",
  title: "混合：等你、在跑、接力、出错、刚回复同时存在",
  snapshot: snapshot({
    sessions: [
      ...twoRelays.snapshot.sessions,
      ...codexApproval.snapshot.sessions,
      running[0],
      running[3],
      ...failed.snapshot.sessions.slice(0, 1),
    ],
    approvals: [
      ...twoRelays.snapshot.approvals,
      ...codexApproval.snapshot.approvals,
    ],
    handoffs: twoRelays.snapshot.handoffs,
    events: [reply("chatgpt", "chatgpt:g-c", 5, "审核：整理导入流程")],
  }),
};

const job = (
  id: string,
  name: string,
  schedule: string,
  lastAgo: number | null,
  over: Partial<HermesCronJob> = {},
): HermesCronJob => ({
  id,
  name,
  enabled: true,
  failed: false,
  schedule,
  lastRunAt: lastAgo === null ? null : at(lastAgo),
  nextRunAt: null,
  ...over,
});

const hermesDesks: Scene = {
  key: "hermes-desks",
  title:
    "Hermes 两个机器人的定时任务：任务表装框，只有多久一次和执行情况；没写原因就关掉的任务不显示（#384）",
  snapshot: snapshot({
    bots: [
      {
        id: "default",
        name: "机器人甲",
        down: null,
        turnsToday: 6,
        lastReplyAt: at(20),
        jobs: [
          job("check", "工程自检（每天 09:50）", "50 9 * * *", 4320, {
            enabled: false,
          }),
          job("cards", "周报卡片（每 15 分钟看一次）", "*/15 * * * *", 6),
          job("merge", "合并巡查", "*/30 9-23 * * *", 6000, {
            enabled: false,
          }),
          job("night", "夜跑主控", "every 5m", 9000, { enabled: false }),
          job("monthly", "月度体检（每月 1 号）", "30 10 1 * *", 4300),
          job("daily-write", "项目日报·写稿", "15 9 * * *", 285),
          job("daily-send", "项目日报·发送", "0 10 * * *", 240),
          job("hot", "热点榜（工作日）", "45 9 * * 1-5", 255),
          job("patrol", "仓库巡检", "*/30 9-23 * * *", 20),
          job("weekly", "周会纪要（每周一）", "45 7 * * 1", 7400, {
            failed: true,
          }),
          job("learn", "学习报告", "every 2h", null, {
            enabled: false,
            pausedReason: "等新数据源接好",
          }),
        ],
        asks: [
          {
            chat: "dm",
            chatId: "oc_scene_dm",
            title: "问一下回答为什么变慢",
            at: at(1660),
            answer: "answered",
          },
        ],
      },
      {
        id: "agumon",
        name: "机器人乙",
        down: null,
        turnsToday: 2,
        lastReplyAt: at(90),
        jobs: [job("memo", "记忆日报", "30 7 * * *", 390)],
        asks: [
          {
            chat: "group",
            chatId: "oc_scene_grp",
            title: "整理调研方法",
            at: at(1500),
            answer: "answered",
          },
        ],
      },
    ],
  }),
};

export const SCENES: readonly Scene[] = [
  allRunning,
  codexApproval,
  codexStale,
  claudeOldAsk,
  waitingNoCard,
  twoRelays,
  reviews,
  failed,
  replies,
  everything,
  claudeBusy,
  claudeManyAsks,
  hermesDesks,
  relayStopped,
  relayPassed,
  relayPaused,
  relayIdleStopped,
  relayStaleIdle,
  relayStopOtherKind,
];

export function scene(key: string): Scene {
  const found = SCENES.find((s) => s.key === key);
  if (!found) throw new Error(`no scene ${key}`);
  return found;
}
