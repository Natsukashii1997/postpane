// The handoff tools (#347, the review gate of
// agent-kit 协同/审查契约.md):
// relay_to_chatgpt, and relay_list / relay_end (#439), moved out of index.ts
// for the 300-line ratchet. None is a HUD tool: the hudTools switch does not
// hold them back.
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const relayDescription = [
  "把这次的工作交给 ChatGPT 审核：驿窗经 Chrome 插件把 brief 送进 chatgpt.com。同一个 Claude Code 或 Codex 会话第一次调用会新开一个 ChatGPT 审核会话（放进驿窗设置里的项目），之后再调用就接着发进同一个会话。调用后立即返回；回信出现在驿窗侧栏，并由驿窗自动转回这个会话：返修转回让你改完再送；通过也转回（写明是终局、不用再送审），驿窗结束接力；PR 送审后又有新提交时，转回请你用当前提交重送；到顶、决策升级、认不出末尾几行时转回并写明交常浩决定；新会话打不开或 ChatGPT 30 分钟没回信，也会通知这个会话一次。同样的 brief 刚送到、还没回信时不会再送一次。",
  "审几轮由 ChatGPT 按问题台账判断，驿窗只执行硬规则：本次授权周期默认最多 5 轮（常浩可在驿窗设置「智能体插件」的「审核轮数上限」里调，1–9 轮），常浩插话或授权后从第 1 轮重计；审查链总轮数和台账按验收目标累计，换会话、换 PR、拆单都不清零；ChatGPT 实质回过一次就算一轮（证据不足暂停也算），驿窗请它补写末尾格式那一次不算；到上限仍不通过就停下请常浩介入。驿窗把上一轮回信里的「问题台账」原样附在下一轮 brief 后面。L0 只做机械检查，不送审。",
  "ChatGPT 读不到本机文件，brief 要自己写全：",
  "1. 第一行写任务名和风险级，然后写任务目标；第 2 轮起写本轮目的（这轮修了什么、要验证什么），并逐条写上一轮台账的处理（已修并附证据 / 提议判定不成立并附反证 / 提议转单并附已建好的 issue）；",
  "2. 改了什么、为什么这样改；",
  "3. 分支名、PR 链接和受审的完整提交（head 参数）；被审的 PR 链接要是 brief 里第一个出现的 PR 链接；拆单或换 PR 续审时填 chain；",
  "4. 改动本身：git diff 原文；太长就写摘要 + 关键片段，完整改动让它看 PR；",
  "5. 希望重点看哪里；",
  "6. 请 ChatGPT 按严重程度列问题并给出问题台账（「## 问题台账」一节，每个问题永久编号、状态六选一：待修复 / 待复核 / 已验证关闭 / 判定不成立 / 待决策 / 范围外转单），P0/P1 写失败路径或违反的约束；回信最后四行依次写「受审版本：<SHA>」「未决：P0 n，P1 n」「审查出口：通过 / 返修 / 证据不足暂停 / 决策升级」「结论：通过 / 需修改」（通过配通过，其余配需修改）。",
].join("\n");

const relayInput = {
  title: z
    .string()
    .min(1)
    .describe("任务名，驿窗用它标记这次接力，例如「驿窗｜接力 1c」。"),
  summary: z
    .string()
    .max(120)
    .optional()
    .describe(
      "一句话写这一轮做了什么，显示在驿窗接力卡的时间线上，例如「改了 6 个文件 · 测试全过」。",
    ),
  brief: z
    .string()
    .min(1)
    .describe("发给 ChatGPT 的完整交代，按工具说明的六项写。"),
  risk: z
    .enum(["L0", "L1", "L2", "L3"])
    .optional()
    .describe(
      "工程审查的风险级（首次送审时填），定审查要求、不定轮数：L1 小范围低风险代码；L2 标准研发；L3 身份、安全、持久状态、正式系统，要常浩授权；L0 不改变代码行为的文档会被拒收。思维评审不填。",
    ),
  head: z
    .string()
    .max(64)
    .optional()
    .describe(
      "受审的提交（完整 SHA）。不填时驿窗从 brief 里写 head 的那一行认。回信「受审版本」对不上，或通过时 PR 已有新提交，驿窗不按通过结束。",
    ),
  chain: z
    .string()
    .max(40)
    .optional()
    .describe(
      "审查链标识（「r」开头，驿窗在第一次送审的返回里给出）。同一验收目标拆单、换 PR 或换会话续审时填，轮数和台账接着算；驿窗不认得的会拒收。新的验收目标不填；但这个会话或工作目录里有审到顶还没了结的审查链时，不管填不填都要常浩先在会话里说一句。",
    ),
  extra: z
    .string()
    .max(200)
    .optional()
    .describe(
      "只在到顶（本次授权周期审满上限）后、常浩明确授权继续时填：写明谁授权、为什么，例如「常浩授权继续：P1-03 换了修法」；授权后从第 1 轮重计。驿窗会核实这一轮是常浩开的头（他在会话里打的字、侧栏回复，或以他身份发来的智能体消息），核实不了就拒收。没有授权不要填。",
    ),
  launch: z
    .string()
    .max(40)
    .optional()
    .describe(
      "驿窗左滑发来的请求里写的编号（「L」开头）；照填，驿窗靠它认出这次左滑已经办了。不是左滑发来的就不填。",
    ),
};

const listDescription =
  "列出驿窗里还没结束的 ChatGPT 接力（进行中、暂停、打开失败的），最新动静的在前。每条有编号 id、任务名 title、发起它的会话 session（client 是 claude 或 codex）、工作目录 cwd、PR、阶段 phase、自动往返停下的原因 halt、已审轮数 counted / 上限 budget、多久没动静 quietMinutes。处理卡住或不再需要的接力时，先用它对上是哪几张、各属哪个会话，再按情况办；要结束的用 relay_end，不用请常浩去侧栏点。";

const endDescription =
  "结束驿窗里的 ChatGPT 接力，效果和在侧栏点「结束接力」一样：一次可结束多张，逐张返回结果（ended 结束了的，refused 没结束的和原因，byPerson 是否算常浩授权）。卡住的（回信空着、打开失败、等不到回信、挡着用新提交重送）和不再需要的（PR 已合并、换了做法）都可以直接结束，不用请常浩去侧栏点（常浩 2026-11-28 定，#587）。驿窗会看调用的这一轮是不是常浩开的头（他在会话里打的字，或经驿窗插件送进来、不带智能体来源标签的话：侧栏回复、手机上说的、以他身份发来的智能体消息）：是，时间线记「〈你的会话〉按常浩授权结束：原因」，到上限还没了结的审查链也算了结；不是（别的智能体转达、驿窗转回、你自己接着跑），照样结束，记「〈你的会话〉自行结束：原因」，但到上限的审查链不算了结，那里再送审仍要常浩在会话里开口。正在送话的那张会拒收，稍后再试；不是常浩授权时，ChatGPT 还在正常答、驿窗还没等到头的那张也拒收（回信会丢），等它答完或驿窗停下再结束。";

const endInput = {
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(20)
    .describe("要结束的接力编号（relay_list 里的 id）。"),
  reason: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "一句话写为什么结束，显示在接力卡时间线上，例如「PR #211 已合并，常浩让收掉」。",
    ),
};

/** The calling session as its client names it (index.ts `caller`). */
type Caller = {
  client: string;
  sessionId: string;
  turnId: string | null;
} | null;
type Deps = {
  request: (
    method: string,
    params: Record<string, unknown>,
    options?: { timeoutMs?: number },
  ) => Promise<unknown>;
  result: (data: unknown) => {
    content: (
      | { type: "text"; text: string }
      | { type: "image"; data: string; mimeType: string }
    )[];
    structuredContent: Record<string, unknown>;
  };
  caller: (meta: Record<string, unknown> | undefined) => Caller;
  launchedBy: number;
};
const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function registerRelayTools(
  server: McpServer,
  { request, result, caller, launchedBy }: Deps,
) {
  const ask = async (
    method: string,
    params: Record<string, unknown>,
    options?: { timeoutMs?: number },
  ) => {
    try {
      return result(await request(method, params, options));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Engine operation failed.";
      // The app's own refusals are in Chinese; a transport failure is not.
      const text = /[\u4e00-\u9fff]/.test(message)
        ? message
        : `连不上驿窗的本机工具通道：请确认驿窗在运行，并在设置 → 智能体插件里登记「ChatGPT（Chrome 插件）」。（${message}）`;
      return { isError: true, content: [{ type: "text" as const, text }] };
    }
  };
  const callerOf = (context: { mcpReq: { _meta?: unknown } }) =>
    caller(context.mcpReq._meta as Record<string, unknown> | undefined);
  server.registerTool(
    "relay_to_chatgpt",
    {
      description: relayDescription,
      inputSchema: z.object(relayInput).strict(),
      annotations: {
        ...readOnly,
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    ({ title, summary, brief, risk, head, chain, extra, launch }, context) =>
      ask(
        "relay_to_chatgpt",
        {
          title,
          summary,
          brief,
          risk,
          head,
          chain,
          extra,
          launch,
          caller: callerOf(context),
          cwd: process.cwd(),
          parent: launchedBy,
        },
        // Continuing a review waits for the extension to send (≤ 30 s).
        { timeoutMs: 55_000 },
      ),
  );
  server.registerTool(
    "relay_list",
    {
      description: listDescription,
      inputSchema: z.object({}).strict(),
      annotations: readOnly,
    },
    () => ask("relay_list", {}),
  );
  server.registerTool(
    "relay_end",
    {
      description: endDescription,
      inputSchema: z.object(endInput).strict(),
      annotations: {
        ...readOnly,
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
    ({ ids, reason }, context) =>
      ask("relay_end", { ids, reason, caller: callerOf(context) }),
  );
}
