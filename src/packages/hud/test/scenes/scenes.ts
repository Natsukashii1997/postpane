// The workplace scenes (#349, ADR-0001 「验收场景」): each the state one
// acceptance case needs, shared by the contract tests and the scene preview.
import type { HermesCronJob, Snapshot } from "@agent-hud/protocol";
import {
  approval,
  at,
  failure,
  relay,
  reply,
  session,
  snapshot,
} from "./build.ts";
import {
  relayIdleStopped,
  relayStaleBack,
  relayStaleIdle,
  relayStopOtherKind,
  relayPassed,
  relayPaused,
  relayHeldBack,
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

const failedSessions = [
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
];
const failed: Scene = {
  key: "failed",
  title:
    "Codex 一轮失败（连着第 2 次）、Claude 被限流：各弹一张「出错」回执（C6）",
  snapshot: snapshot({
    sessions: failedSessions,
    events: [failure(failedSessions[1]), failure(failedSessions[0], 2)],
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

const repliesAgain: Scene = {
  key: "replies-again",
  title: "Claude 同一个会话连着回了 3 次、另一个会话回 1 次：每个会话只一行",
  snapshot: snapshot({
    sessions: running.map((s) => ({ ...s, state: "idle" as const })),
    events: [
      { ...reply("claude", "c-run", 6, "整理周报模板"), id: "done:c-run:1" },
      reply("codex", "x-run", 5, "补齐解析器测试"),
      { ...reply("claude", "c-run", 3, "整理周报模板"), id: "done:c-run:2" },
      { ...reply("claude", "c-run", 1, "整理周报模板"), id: "done:c-run:3" },
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

// #498 (ADR-0001 第 4 批, the owner answered 「改」 on 2026-11-21): a Hermes
// bot down (told twice) and a task that did not run, each a red 出错 line on
// Hermes' own card; the Hermes desk itself unchanged.
const hermesTrouble: Scene = {
  key: "hermes-trouble",
  title:
    "Hermes 机器人乙飞书断线（报了 2 次）、机器人甲的定时任务没跑成：各一行「出错」回执",
  snapshot: snapshot({
    bots: [
      {
        id: "default",
        name: "机器人甲",
        down: null,
        turnsToday: 6,
        lastReplyAt: at(20),
        jobs: [
          job("weekly", "周会纪要（每周一）", "45 7 * * 1", 400, {
            failed: true,
          }),
        ],
        asks: [],
      },
      {
        id: "agumon",
        name: "机器人乙",
        down: "feishu",
        downSince: at(40),
        turnsToday: 2,
        lastReplyAt: at(90),
        jobs: [],
        asks: [],
      },
    ],
    events: [
      {
        id: "hermes:default:cron:weekly:scene",
        kind: "cron-failed",
        islandAlert: true,
        at: at(5),
        source: "hermes",
        accountId: "default",
        title: "周会纪要（每周一）",
        message: "没跑成",
        failedAt: at(400),
        nextRunAt: at(-60 * 24 * 2),
        bot: { id: "default", name: "机器人甲" },
      },
      {
        id: "hermes:agumon:offline:scene",
        kind: "bot-offline",
        islandAlert: true,
        at: at(2),
        source: "hermes",
        accountId: "agumon",
        title: "机器人乙",
        message: "飞书断线",
        count: 2,
        bot: { id: "agumon", name: "机器人乙" },
      },
    ],
  }),
};

// #427 (owner chose 甲): nine open relays, five the person's, three under
// way, one quiet, and ChatGPT's own two chats replied; for the peek's
// 「审核」, the card's 「等待处理 / 正在进行」 and the handoff card's
// 上一单 / 下一单.
const nineRelays: Scene = {
  key: "chatgpt-nine-relays",
  title: "ChatGPT 开着 9 单接力：要你管 5、在动 3、静着 1，外加两条已回对话",
  snapshot: snapshot({
    sessions: [
      session({
        place: "chatgpt",
        id: "chatgpt:g-a",
        title: "生成工作台首页预览图",
        state: "idle",
        lastAgo: 30,
      }),
      session({
        place: "chatgpt",
        id: "chatgpt:g-b",
        title: "生成工作台首页预览",
        state: "idle",
        lastAgo: 31,
      }),
    ],
    handoffs: [
      relay({
        id: "n-silent",
        title: "数字分身｜0B-4c-2 秘书侧巡视",
        doer: "claude",
        session: "c-n1",
        chatgpt: "g-n1",
        phase: "working",
        minutesAgo: 125,
        auto: false,
        halt: "30 分钟没回信",
      }),
      relay({
        id: "n-top",
        title: "数字分身｜#131 托管状态底座",
        doer: "claude",
        session: "c-n2",
        chatgpt: "g-n2",
        phase: "replied",
        minutesAgo: 350,
        reviews: 5,
        auto: false,
        notice: "top",
      }),
      relay({
        id: "n-paused",
        title: "驿窗｜S1 回信送回发起会话",
        doer: "claude",
        session: "c-n3",
        chatgpt: "g-n3",
        phase: "returned",
        minutesAgo: 378,
        reviews: 2,
        auto: false,
        halt: "你暂停了自动往返",
      }),
      relay({
        id: "n-replied",
        title: "数码世界｜知识库可靠接入",
        doer: "codex",
        session: "x-n4",
        chatgpt: "g-n4",
        phase: "replied",
        minutesAgo: 450,
        reviews: 2,
        auto: false,
      }),
      relay({
        id: "n-unsent",
        title: "数字分身｜0B-4c-1 控制面",
        doer: "claude",
        session: "c-n5",
        chatgpt: "g-n5",
        phase: "failed",
        minutesAgo: 492,
      }),
      relay({
        id: "n-working",
        title: "驿窗｜#348 解冲突定向复核",
        doer: "claude",
        session: "c-n6",
        chatgpt: "g-n6",
        phase: "working",
        minutesAgo: 25,
      }),
      relay({
        id: "n-fix-a",
        title: "数字分身｜0B-4b 秘书开关",
        doer: "claude",
        session: "c-n7",
        chatgpt: "g-n7",
        phase: "returned",
        minutesAgo: 92,
        reviews: 3,
      }),
      relay({
        id: "n-fix-b",
        title: "驿窗｜接力审核门第 3 批",
        doer: "codex",
        session: "x-n8",
        chatgpt: "g-n8",
        phase: "returned",
        minutesAgo: 93,
        reviews: 2,
      }),
      relay({
        id: "n-quiet",
        title: "驿窗｜#424 Hermes 跳回飞书",
        doer: "claude",
        session: "c-n9",
        chatgpt: "g-n9",
        phase: "returned",
        minutesAgo: 300,
        reviews: 3,
      }),
    ],
  }),
};

/** A handoff card as Claude's sidebar sends it: the START tag, no heading
 * beside it (#559); one the sidebar can start, one only Claude can. */
function handoffCard(
  sessionId: string,
  minutesAgo: number,
  title: string,
  startsHere: boolean,
) {
  const card = approval("claude", sessionId, "question", minutesAgo, title);
  return {
    ...card,
    badge: "START",
    answersQuestion: startsHere,
    answerNote: startsHere
      ? null
      : "这个会话的 Claude 进程已经停了（Claude 重启、关掉或回收过它）。在 Claude 里给它发一句话让它重新运行，就能在 Agent HUD 里回答。",
    questions: card.questions?.map((q) => ({
      ...q,
      header: null,
      options: [],
    })),
  };
}

const claudeHandoff: Scene = {
  key: "claude-handoff",
  title:
    "Claude 两张交接卡：一张能在侧栏开始，一张只能到 Claude 里开始；都只挂 START，不另挂「切换会话」",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-hand",
        title: "驿窗｜交接卡标识",
        state: "waiting",
        lastAgo: 3,
        asks: "question",
      }),
      session({
        place: "claude",
        id: "c-hand-off",
        title: "大学业务｜2027 增长 T 型拆解",
        state: "waiting",
        lastAgo: 21 * 60,
        asks: "question",
      }),
    ],
    approvals: [
      handoffCard("c-hand", 3, "【交接】驿窗｜交接卡只挂一个标识", true),
      handoffCard(
        "c-hand-off",
        21 * 60,
        "【交接】大学增长战略｜荧光笔完整版自查与发布",
        false,
      ),
    ],
  }),
};

/** A reply waiting on you, as the ASK card is laid out (#562): REPLY, what
 * it did small, its next step large, the replies it names as choices. */
const claudeReplyCard: Scene = {
  key: "claude-reply-card",
  title:
    "Claude 回复等你决定：REPLY 签、小字内容、白字下一步、选项、跳过 / 提交",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-reply",
        title: "驿窗交接卡｜只挂一个标识",
        state: "waiting",
        lastAgo: 2,
        asks: "question",
      }),
    ],
    approvals: [
      (() => {
        const card = approval(
          "claude",
          "c-reply",
          "question",
          2,
          "#558 做完后回「做完了，装机合并」；还没做完回『先等等』。",
        );
        return {
          ...card,
          badge: "REPLY",
          detail:
            "去掉三种虚线签，PR #561 已推送。\n〔等你决定〕代码和测试都好了，差装机实测。",
          questions: card.questions?.map((q) => ({
            ...q,
            header: null,
            options: [
              { label: "做完了，装机合并", description: null },
              { label: "先等等", description: null },
            ],
          })),
        };
      })(),
    ],
  }),
};

/** 积压事项 (#563): two asks from today, two waited on past 48 hours, sunk
 * to one folded line at the foot of 「等待处理」. */
const claudeBacklog: Scene = {
  key: "claude-backlog",
  title:
    "Claude 两条新的等你、两条超过 48 小时：沉到「积压事项」一行，展开有继续 / 不做了",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-new1",
        title: "大学业务｜2027 增长 T 型拆解",
        state: "waiting",
        lastAgo: 21 * 60,
        asks: "question",
      }),
      session({
        place: "claude",
        id: "c-new2",
        title: "侧边栏｜双端需求上新通知",
        state: "waiting",
        lastAgo: 28 * 60,
        asks: "question",
      }),
      session({
        place: "claude",
        id: "c-old1",
        title: "月度用户策略｜Skill 批1上线进度",
        state: "waiting",
        lastAgo: 431 * 60,
        asks: "question",
      }),
      session({
        place: "claude",
        id: "c-old2",
        title: "Mac 合盖｜防休眠核查",
        state: "waiting",
        lastAgo: 398 * 60,
        asks: "question",
      }),
    ],
    approvals: [
      approval(
        "claude",
        "c-new1",
        "question",
        21 * 60,
        "【交接】大学增长战略｜荧光笔完整版自查与发布",
      ),
      approval(
        "claude",
        "c-new2",
        "question",
        28 * 60,
        "「模块整合」下掉了哪些模块？",
      ),
      approval("claude", "c-old1", "question", 431 * 60, "合并 PR #44 吗？"),
      approval(
        "claude",
        "c-old2",
        "question",
        398 * 60,
        "设置好 Amphetamine 后，要我现在开始测试吗？",
      ),
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
  repliesAgain,
  everything,
  claudeBusy,
  claudeManyAsks,
  claudeHandoff,
  claudeReplyCard,
  claudeBacklog,
  hermesDesks,
  hermesTrouble,
  relayStopped,
  relayPassed,
  relayPaused,
  relayHeldBack,
  relayIdleStopped,
  relayStaleBack,
  relayStaleIdle,
  relayStopOtherKind,
  nineRelays,
];

export function scene(key: string): Scene {
  const found = SCENES.find((s) => s.key === key);
  if (!found) throw new Error(`no scene ${key}`);
  return found;
}
