import {
  McpServer,
  type RegisteredTool,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { EngineClient } from "@agent-hud/engine-client";
import type { Snapshot } from "@agent-hud/protocol";

const engine = new EngineClient(undefined, "app");
const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const localWrite = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const result = (data: unknown) => {
  const object =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : { value: data };
  const { images, ...fields } = object;
  const content: (
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  )[] = [{ type: "text", text: JSON.stringify(fields) }];
  if (Array.isArray(images))
    for (const image of images)
      if (
        image &&
        typeof image.data === "string" &&
        typeof image.mimeType === "string"
      )
        content.push({
          type: "image",
          data: image.data,
          mimeType: image.mimeType,
        });
  return { content, structuredContent: fields };
};
const guarded = async (
  method: string,
  params: Record<string, unknown> = {},
) => {
  try {
    return result(await engine.request(method, params));
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof Error ? error.message : "Engine operation failed.",
        },
      ],
    };
  }
};

/** Advertises `schema` to clients and leaves the checking to the app: it refuses a
 * proposal it cannot draw as asked with Agent HUD's own sentences, every reason at
 * once, and reads null as not given, as agent-hud-native-open's draft_hud does. zod would
 * refuse the same calls first, with generic messages. */
const checkedByTheApp = <S extends z.ZodType>(
  schema: S,
): StandardSchemaWithJSON<z.input<S>, z.output<S>> => ({
  "~standard": {
    ...schema["~standard"],
    validate: (value: unknown) =>
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? { value: value as z.output<S> }
        : { issues: [{ message: "The arguments are a JSON object." }] },
  },
});
/** A tool the host app adds: its own group, which the app's settings switch on and off. */
type HostTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
};
/** The host's groups that are on, or null when the app could not be asked. */
const askHost = () =>
  engine.request<{ tools?: HostTool[] }>("host_tools").then(
    (found) => found.tools ?? [],
    () => null,
  );
/** Asked at start, then again every `hostInterval` while the relay runs:
 * Antigravity and DeepSeek Harness start one relay for all their sessions,
 * so a group switched on later, or an app that was not running yet when the
 * relay started, must still reach their next sessions. Each change goes out
 * as notifications/tools/list_changed. An app that cannot be asked leaves
 * the list as it was. */
let hostTools = (await askHost()) ?? [];
const hostInterval =
  Number(process.env.AGENTHUD_HOST_TOOLS_MS) > 0
    ? Number(process.env.AGENTHUD_HOST_TOOLS_MS)
    : 15_000;
/** A host tool's schema as the host wrote it; the host checks the arguments itself. */
const hostSchema = (
  schema: Record<string, unknown>,
): StandardSchemaWithJSON<Record<string, unknown>> => ({
  "~standard": {
    version: 1,
    vendor: "agent-hud",
    validate: (value: unknown) =>
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? { value: value as Record<string, unknown> }
        : { issues: [{ message: "The arguments are a JSON object." }] },
    jsonSchema: { input: () => schema, output: () => schema },
  },
});
/** The agent session that called, as its client names it and never as an argument the
 * agent writes: Codex and Antigravity in each call's `_meta`, Claude Code in the
 * environment it starts this relay with. DeepSeek Harness names neither: it runs one
 * relay per host for all its sessions. For a call no client names, the relay says which
 * process started it (`parent`), and the app finds the session from what Agent HUD's
 * plugin in that Harness host noted. On Windows the app's `--mcp` launcher stays as
 * this relay's parent, so it names the client in AGENTHUD_MCP_PARENT. */
const launchedBy = (() => {
  const named = Number(process.env.AGENTHUD_MCP_PARENT);
  return Number.isSafeInteger(named) && named > 0 ? named : process.ppid;
})();
const caller = (meta: Record<string, unknown> | undefined) => {
  const turn = meta?.["x-codex-turn-metadata"] as
    Record<string, unknown> | undefined;
  const thread = meta?.threadId ?? turn?.thread_id;
  if (typeof thread === "string" && thread)
    return {
      client: "codex",
      sessionId: thread,
      turnId: typeof turn?.turn_id === "string" ? turn.turn_id : null,
    };
  const cascade = meta?.["antigravity.google/conversation_id"];
  if (typeof cascade === "string" && cascade)
    return { client: "antigravity", sessionId: cascade, turnId: null };
  const session = process.env.CLAUDE_CODE_SESSION_ID;
  return session
    ? { client: "claude", sessionId: session, turnId: null }
    : null;
};
const keys = z.array(z.string().min(1));
const period = z.enum(["day", "week", "month"]);
const measures = z.array(
  z.enum(["quota", "burn", "tokens", "consumed", "cost"]),
);
const block = z
  .object({
    widget: z.enum(["bar", "rings", "segments", "number", "chart"]).optional(),
    measures: measures.optional(),
    hidden: z.boolean().optional(),
    hiddenRows: keys.optional(),
    hiddenAccounts: keys.optional(),
    rows: keys.optional(),
    accounts: keys.optional(),
    countdown: z.boolean().optional(),
    columns: z.number().int().min(2).max(6).optional(),
    ringSize: z.enum(["small", "medium", "large"]).optional(),
    span: z.enum(["full", "half"]).optional(),
    period: period.optional(),
  })
  .strict();
const screen = z
  .string()
  .min(1)
  .optional()
  .describe(
    "An attached screen key from get_hud, or all for the shared layout.",
  );
const hud = z
  .object({
    agents: keys.optional(),
    reset: z.boolean().optional(),
    mode: z.enum(["notch", "dynamic", "simple"]).optional(),
    edge: z.enum(["top", "right", "bottom", "left"]).optional(),
    position: z.number().min(0).max(1).optional(),
    logoSize: z.number().min(20).max(60).optional(),
    logoGap: z.number().min(0.1).max(0.6).optional(),
    edgeDistance: z.number().min(0).max(20).optional(),
    showLogos: z.boolean().optional(),
    simpleSize: z.number().min(20).max(60).optional(),
    simpleGap: z.number().min(0.1).max(0.6).optional(),
    ringWidth: z.number().min(1).max(4).optional(),
    simpleStyle: z.enum(["rings", "segments", "bars", "numbers"]).optional(),
    showNumbers: z.boolean().optional(),
    appearance: z.enum(["dark", "light", "system"]).optional(),
    transparency: z.number().min(0).max(1).optional(),
    glow: z
      .object({
        style: z
          .enum(["blur", "dots", "ascii", "blocks", "braille", "binary"])
          .optional(),
        effect: z
          .enum(["breathe", "flow", "scan", "ripple", "shimmer", "boot"])
          .optional(),
        range: z.number().min(0).max(36).optional(),
        blur: z.number().min(0).max(36).optional(),
        brightness: z.number().min(0.2).max(1).optional(),
        speed: z.number().min(1).max(12).optional(),
        idleSpeed: z.number().min(1).max(24).optional(),
        amplitude: z.number().min(0).max(1).optional(),
        outwardOnly: z.boolean().optional(),
        gridPitch: z.number().min(4).max(12).optional(),
        gridDensity: z.number().min(0.5).max(1.5).optional(),
        gridCore: z.number().min(0).max(8).optional(),
        gridFade: z.number().min(0).max(8).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
const app = z
  .object({
    appearance: z.enum(["dark", "light", "system"]).optional(),
    matchScreen: z.boolean().optional(),
    botLogos: z.boolean().optional(),
    showMenuBarIcon: z.boolean().optional(),
    language: z
      .string()
      .optional()
      .describe("Read only; may repeat the value from get_hud."),
    writtenIn: z.string().optional().describe("Read only; may repeat get_hud."),
    hover: z
      .object({
        pressOptionToOpen: z.boolean().optional(),
        openAtTopEdge: z.boolean().optional(),
        delayMs: z.number().int().min(0).max(1500).multipleOf(50).optional(),
        collapseDelayMs: z
          .number()
          .int()
          .min(0)
          .max(1500)
          .multipleOf(50)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
const proposal = z
  .object({
    screen,
    revision: z.number().int().nonnegative().optional(),
    from: z.enum(["default", "previous", "shared"]).optional(),
    order: keys.optional(),
    sections: z.array(z.enum(["blocks", "tokens", "sessions"])).optional(),
    hiddenSections: z
      .array(z.enum(["blocks", "tokens", "sessions"]))
      .optional(),
    countdown: z.boolean().optional(),
    blocks: z.record(z.string(), block).optional(),
    style: z
      .object({
        spacing: z.enum(["compact", "regular", "roomy"]).optional(),
        separators: z.boolean().optional(),
        width: z.number().int().min(480).max(720).optional(),
      })
      .strict()
      .optional(),
    sessions: z
      .object({
        limit: z.number().int().min(1).max(10).optional(),
        period: z.enum(["day", "week"]).optional(),
        agents: keys.optional(),
        projects: keys.optional(),
      })
      .strict()
      .optional(),
    tokens: z
      .object({
        period: period.optional(),
        agents: keys.optional(),
        models: keys.optional(),
      })
      .strict()
      .optional(),
    hud: hud.optional(),
    app: app.optional(),
  })
  .strict();
serveStdio(() => {
  const server = new McpServer({ name: "agent-hud", version: "0.1.0" });
  server.registerTool(
    "get_hud",
    {
      description:
        "Read the current hover panel, exact block/account/row keys, attached screens, layout, resting HUD and app settings. Includes unsaved drafts. Call before editing; source keys remain valid when their readings temporarily disappear.",
      inputSchema: z.object({ screen }).strict(),
      annotations: readOnly,
    },
    (params) => guarded("get_hud", params),
  );
  server.registerTool(
    "draft_hud",
    {
      description:
        "Propose a complete panel layout or one screen's HUD style. A proposal is shown immediately and is saved only when the user presses Save in the panel; it is discarded on restart. A proposal is whole: omitted layout fields use defaults, omitted HUD style fields keep saved values, and one that draws what is saved leaves no draft. A proposal the panel or the HUD cannot draw as asked is refused whole with every reason, and nothing is changed. from (default, previous or shared) proposes a version instead of a layout. app changes app settings only when explicitly requested by the user. Layout edits hold the panel open for two minutes; finish_hud_edit releases it.",
      inputSchema: checkedByTheApp(proposal),
      annotations: localWrite,
    },
    (params) => guarded("draft_hud", params as Record<string, unknown>),
  );
  server.registerTool(
    "discard_hud_draft",
    {
      description:
        "Discard a screen's layout and HUD style draft. The app-wide draft stays; the user's panel Discard drops all drafts it shows.",
      inputSchema: z.object({ screen }).strict(),
      annotations: localWrite,
    },
    (params) => guarded("discard_hud_draft", params),
  );
  server.registerTool(
    "finish_hud_edit",
    {
      description:
        "End the edit hold so panels collapse unless hovered. Drafts still await the user's Save; this does not save them.",
      inputSchema: z.object({ screen }).strict(),
      annotations: localWrite,
    },
    (params) => guarded("finish_hud_edit", params),
  );
  server.registerTool(
    "get_hud_screenshot",
    {
      description:
        "Render this app's hover panel, an agent's separate panel, or a screen's resting HUD. Accounts are masked and session titles omitted. Captures only the offscreen app WebView, never the desktop.",
      inputSchema: z
        .object({
          screen,
          show: z.enum(["panel", "hud"]).optional(),
          agent: z.string().min(1).optional(),
        })
        .strict(),
      annotations: readOnly,
    },
    (params) => guarded("get_hud_screenshot", params),
  );
  server.registerTool(
    "hud_snapshot",
    {
      description:
        "Read PostPane’s current local snapshot: recent/active display sessions, complete token totals, provider status and capabilities. Historical sessions are paged with hud_sessions. Unavailable data stays unavailable.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    () => guarded("snapshot"),
  );
  server.registerTool(
    "hud_refresh",
    {
      description:
        "Read the latest snapshot already published by the running app. The app owns background refresh; this tool does not start provider reads or another collector.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    () => guarded("refresh"),
  );
  server.registerTool(
    "hud_session",
    {
      description:
        "Read a known session’s recorded usage entries, parent and children by exact ID. Discover recent or historical sessions with hud_sessions; this query does not start ingestion.",
      inputSchema: z.object({
        id: z.string().min(1),
        messageCursor: z.number().int().nonnegative().optional(),
        messageLimit: z.number().int().min(1).max(200).optional(),
      }),
      annotations: readOnly,
    },
    (params) => guarded("session_detail", params),
  );
  server.registerTool(
    "hud_sessions",
    {
      description:
        "Page the running app’s already indexed sessions without refreshing providers or scanning transcripts. Recent is the display scope; active selects current work, all includes retained history. Filters use exact source/project IDs; search matches the recorded session presentation. Return the nextOffset to continue the same filters.",
      inputSchema: z.object({
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(200).default(100),
        scope: z.enum(["recent", "active", "all"]).default("recent"),
        source: z.string().min(1).optional(),
        project: z
          .string()
          .nullable()
          .optional()
          .describe(
            "Exact project ID; null selects sessions without a project.",
          ),
        search: z.string().optional(),
        rootsOnly: z.boolean().default(true),
        parentId: z.string().min(1).optional(),
      }),
      annotations: readOnly,
    },
    (query) => guarded("sessions", query),
  );
  server.registerTool(
    "hud_statistics",
    {
      description:
        "Read interval usage, model/provider breakdowns, list-price estimates and local-calendar activity from the running app’s ledger. The app owns ingestion. Fifteen-minute source buckets count whole when they overlap the requested interval; coverage reports missing or still-indexing data.",
      inputSchema: z.object({
        from: z
          .string()
          .min(1)
          .describe("Interval start as an RFC3339 timestamp."),
        to: z
          .string()
          .min(1)
          .describe("Exclusive interval end as an RFC3339 timestamp."),
        bucketMinutes: z
          .union([z.literal(15), z.literal(30), z.literal(60), z.literal(1440)])
          .default(60),
        tokenKinds: z
          .array(
            z.enum(["cacheWrite", "input", "reasoning", "output", "cacheRead"]),
          )
          .min(1)
          .max(5)
          .optional(),
        providers: z
          .array(z.string().min(1))
          .optional()
          .describe(
            "Exact provider IDs; omitted selects all, an empty list selects none.",
          ),
        models: z
          .array(z.string().min(1))
          .optional()
          .describe(
            "Provider-qualified model IDs returned by this query; omitted selects all.",
          ),
        timeZone: z
          .string()
          .min(1)
          .describe(
            "IANA time zone, for example Asia/Singapore or America/New_York.",
          ),
      }),
      annotations: readOnly,
    },
    (query) => guarded("statistics", query),
  );
  server.registerTool(
    "hud_capabilities",
    {
      description:
        "Read the implemented and unimplemented product capabilities; this does not imply full migration parity.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      try {
        const snapshot = await engine.request<Snapshot>("snapshot");
        return result({
          platform: snapshot.connection.platform,
          platformCapabilities: snapshot.connection.platformCapabilities,
          capabilities: snapshot.capabilities,
        });
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                error instanceof Error ? error.message : "Engine unavailable.",
            },
          ],
        };
      }
    },
  );
  server.registerTool(
    "hud_set_preference",
    {
      description:
        "Save a user-requested presentation preference in PostPane. Does not change client configuration.",
      inputSchema: z.object({
        key: z.enum(["appearance", "animations"]),
        value: z.union([z.enum(["dark", "light", "system"]), z.boolean()]),
      }),
      annotations: localWrite,
    },
    ({ key, value }) => guarded("set_setting", { key, value }),
  );
  server.registerTool(
    "relay_to_chatgpt",
    {
      description: [
        "把这次的工作交给 ChatGPT 审核：驿窗经 Chrome 插件把 brief 送进 chatgpt.com。同一个 Claude Code 或 Codex 会话第一次调用会新开一个 ChatGPT 审核会话（放进驿窗设置里的项目），之后再调用就接着发进同一个会话。调用后立即返回；ChatGPT 的回复出现在驿窗侧栏；回信写「需修改」且审查预算没用完时，驿窗会自动把意见转回这个会话（自动往返），写「通过」时也把回信（含非阻断意见）转回这个会话，写明是终局、不用再送审，然后结束接力；预算用完、没写结论或认不出审查出口时，同样把回信转回这个会话，写明交常浩决定，然后停下。同样的 brief 刚送到、还没回信时不会再送一次。",
        "工程审查按风险级给预算（risk 参数，首次送审时填）：L1 审 1 轮（「需修改」转回你改完，在 PR 写「补改未复审」收口），L2、L3 最多 2 轮，不填按 2 轮；L0 只做机械检查，不送审。同一个 PR 的审查跨会话累计，另开一单也不清零。预算用完后，只有常浩明确要求再审时才能再送，并在 extra 里写明谁授权、为什么。",
        "ChatGPT 读不到本机文件，brief 要自己写全：",
        "1. 第一行写任务名和风险级，然后写任务目标；",
        "2. 改了什么、为什么这样改；",
        "3. 分支名和 PR 链接（ChatGPT 装了 GitHub 连接器，能自己打开 PR）；被审的 PR 链接要是 brief 里第一个出现的 PR 链接；",
        "4. 改动本身：git diff 原文；太长就写摘要 + 关键片段，完整改动让它看 PR；",
        "5. 希望重点看哪里；",
        "6. 请 ChatGPT 按严重程度列问题，回信最后两行依次写「审查出口：通过 / 返修 / 证据不足暂停 / 决策升级」和「结论：通过 / 需修改」（通过配通过，其余配需修改）。",
      ].join("\n"),
      inputSchema: z
        .object({
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
              "工程审查的风险级（首次送审时填）：L1 小范围低风险代码，审 1 轮；L2 标准研发，最多 2 轮；L3 身份、安全、持久状态、正式系统，最多 2 轮并要常浩授权；L0 不改变代码行为的文档会被拒收。思维评审不填。",
            ),
          extra: z
            .string()
            .max(200)
            .optional()
            .describe(
              "只在审查预算用完、常浩明确要求再审一次时填：写明谁授权、为什么，例如「常浩要求再审一次：第 2 轮仍有 P1 未确认」。没有授权不要填。",
            ),
          launch: z
            .string()
            .max(40)
            .optional()
            .describe(
              "驿窗左滑发来的请求里写的编号（「L」开头）；照填，驿窗靠它认出这次左滑已经办了。不是左滑发来的就不填。",
            ),
        })
        .strict(),
      annotations: {
        ...localWrite,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, summary, brief, risk, extra, launch }, context) => {
      const named = caller(
        context.mcpReq._meta as Record<string, unknown> | undefined,
      );
      try {
        return result(
          await engine.request(
            "relay_to_chatgpt",
            {
              title,
              summary,
              brief,
              risk,
              extra,
              launch,
              caller: named,
              cwd: process.cwd(),
              parent: launchedBy,
            },
            // Continuing a review waits for the extension to send (≤ 30 s).
            { timeoutMs: 55_000 },
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Engine operation failed.";
        // The app's own refusals are in Chinese; a transport failure is not.
        const text = /[\u4e00-\u9fff]/.test(message)
          ? message
          : `连不上驿窗的本机工具通道：请确认驿窗在运行，并在设置 → 智能体插件里登记「ChatGPT（Chrome 插件）」。（${message}）`;
        return { isError: true, content: [{ type: "text" as const, text }] };
      }
    },
  );
  const hosted = new Map<
    string,
    { tool: HostTool; registered: RegisteredTool }
  >();
  /** Lists exactly `tools` of the host's, adding, replacing and removing as they changed. */
  const host = (tools: HostTool[]) => {
    const wanted = new Map(tools.map((tool) => [tool.name, tool]));
    for (const [name, entry] of hosted)
      if (JSON.stringify(wanted.get(name)) !== JSON.stringify(entry.tool)) {
        entry.registered.remove();
        hosted.delete(name);
      }
    for (const tool of tools) {
      if (hosted.has(tool.name)) continue;
      try {
        const registered = server.registerTool(
          tool.name,
          {
            description: tool.description,
            inputSchema: hostSchema(tool.inputSchema),
            annotations: tool.readOnly
              ? readOnly
              : { ...localWrite, idempotentHint: false },
          },
          (params, context) => {
            const named = caller(
              context.mcpReq._meta as Record<string, unknown> | undefined,
            );
            return guarded("host_tool", {
              name: tool.name,
              arguments: params,
              caller: named,
              ...(named ? {} : { parent: launchedBy }),
            });
          },
        );
        hosted.set(tool.name, { tool, registered });
      } catch {
        /* A name the relay's own tools already use stays theirs. */
      }
    }
  };
  host(hostTools);
  let asking = false;
  let closed = false;
  const watch = setInterval(async () => {
    if (asking) return;
    asking = true;
    const found = await askHost();
    asking = false;
    if (found && !closed) {
      hostTools = found;
      host(found);
    }
  }, hostInterval);
  watch.unref();
  server.server.onclose = () => {
    closed = true;
    clearInterval(watch);
    engine.close();
  };
  return server;
});

process.once("exit", () => engine.close());
process.once("SIGINT", () => {
  engine.close();
  process.exit(0);
});
process.once("SIGTERM", () => {
  engine.close();
  process.exit(0);
});
