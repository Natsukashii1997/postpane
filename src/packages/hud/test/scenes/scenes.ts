// The workplace scenes (#349, ADR-0001 「验收场景」): each the state one
// acceptance case needs, shared by the contract tests and the scene preview.
import type { Snapshot } from "@agent-hud/protocol";
import { approval, relay, reply, session, snapshot } from "./build.ts";

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
  title: "Claude 在跑 4 个、等你回复 1 个（看在跑收成一行「在跑 4」）",
  snapshot: snapshot({
    sessions: [
      session({
        place: "claude",
        id: "c-ask",
        title: "等你回复：要不要先合并旧分支",
        state: "waiting",
        lastAgo: 2,
      }),
      ...["拆分设置页", "补齐导出测试", "整理依赖清单", "重写启动脚本"].map(
        (title, index) =>
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
];

export function scene(key: string): Scene {
  const found = SCENES.find((s) => s.key === key);
  if (!found) throw new Error(`no scene ${key}`);
  return found;
}
