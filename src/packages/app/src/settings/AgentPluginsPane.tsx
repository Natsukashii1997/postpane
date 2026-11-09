// Settings → Agent plugins: what Agent HUD adds to the agents on this computer.
// Top to bottom: client hooks; the clients as a table, one folding line per
// client (Agent HUD's plugin for it with its switches, and HUD tools), then the
// settings to add HUD tools to any other agent by hand; the app-wide Agent
// tools switches, with Details folded under them. A product build adds switches, rows and tool groups through
// `AgentPluginItem`, drawn with `PluginControl` and `ToolSwitchRow`, so both
// builds read the same. The pieces live in ./agent-plugins/.
import { Braces } from "lucide-react";
import type { Snapshot } from "@agent-hud/protocol";
import { TooltipProvider } from "@agent-hud/ui/components/tooltip";
import {
  Page,
  Section,
  useText,
  type SettingsPaneProps,
  type Text,
} from "./SettingsPrimitives";
import {
  ChatGptCard,
  KnownClientCard,
  OtherAgentsCard,
  ProductClientCard,
} from "./agent-plugins/ClientCards";
import { DetailsSection } from "./agent-plugins/DetailsSection";
import { HooksSection } from "./agent-plugins/HooksSection";
import { ToolsSection } from "./agent-plugins/ToolsSection";
import {
  knownClients,
  nativeChatGpt,
  nativeChatGptProject,
  nativeClients,
  nativeDeepSeekPlugin,
  nativePlugin,
  type ChatGptProjectService,
  type ChatGptService,
  type ClaudePluginService,
  type MCPClientsService,
} from "./agent-plugins/services";
import type {
  AgentPluginContext,
  AgentPluginItem,
} from "./agent-plugins/types";
import {
  useChatGpt,
  useHudTools,
  useLightTheme,
  useMcpClients,
  usePlugin,
} from "./agent-plugins/use-status";

export type {
  AgentPluginContext,
  AgentPluginItem,
} from "./agent-plugins/types";
export type {
  ChatGptService,
  ChatGptStatus,
  ClaudePluginService,
  ClaudePluginStatus,
  MCPClientsService,
  MCPClientsStatus,
} from "./agent-plugins/services";
export { PluginControl, ToolSwitchRow } from "./agent-plugins/rows";

/** Why no client can be given HUD tools here, under the client cards. */
function setupNote(snapshot: Snapshot, t: Text) {
  const platform =
    snapshot.connection.platformCapabilities?.os ??
    snapshot.connection.platform;
  return platform === "windows"
    ? t(
        "Adding HUD tools needs PostPane in its standard Windows location.",
        "需要从 Windows 标准安装位置运行驿窗，才能添加侧栏工具。",
      )
    : platform === "macos"
      ? t(
          "Adding HUD tools needs PostPane in an approved macOS location.",
          "需要从 macOS 指定安装位置运行驿窗，才能添加侧栏工具。",
        )
      : t("This build can't add HUD tools.", "当前版本无法添加侧栏工具。");
}

/** Clients only a product build knows: those its rows name, once each. */
function productClients(items: AgentPluginItem[]) {
  return items
    .filter((item) => item.place !== "tools")
    .filter((item) => !knownClients.some((client) => client.id === item.client))
    .filter(
      (item, index, all) =>
        all.findIndex((other) => other.client === item.client) === index,
    )
    .map((item) => ({ id: item.client, name: item.clientName ?? item.client }));
}

export function AgentPluginsPane({
  snapshot,
  action,
  active = true,
  items = [],
  request,
  clients = nativeClients,
  plugin = nativePlugin,
  deepseekPlugin = nativeDeepSeekPlugin,
  chatgpt = nativeChatGpt,
  chatgptProject = nativeChatGptProject,
}: {
  snapshot: Snapshot;
  action: SettingsPaneProps["action"];
  active?: boolean;
  items?: AgentPluginItem[];
  request: AgentPluginContext["request"];
  /** The MCP setup service; a fake in pictures and tests. */
  clients?: MCPClientsService;
  /** The Claude Code plugin's service; a fake in pictures and tests. */
  plugin?: ClaudePluginService;
  /** The DeepSeek Harness plugin's service; a fake in pictures and tests. */
  deepseekPlugin?: ClaudePluginService;
  /** The ChatGPT extension's service; a fake in pictures and tests. */
  chatgpt?: ChatGptService;
  /** The ChatGPT review project's service; a fake in pictures and tests. */
  chatgptProject?: ChatGptProjectService;
}) {
  const t = useText(snapshot);
  const light = useLightTheme();
  const mcp = useMcpClients(clients, active, t);
  const plugins: Record<string, ReturnType<typeof usePlugin>> = {
    claudeCode: usePlugin("claudeCode", plugin, active, t),
    deepseek: usePlugin("deepseek", deepseekPlugin, active, t),
  };
  const chatgptExtension = useChatGpt(chatgpt, active, t, chatgptProject);
  const tools = useHudTools(snapshot, action);
  const forClient = (id: string) =>
    items.filter((item) => item.client === id && item.place !== "tools");
  const extraClients = productClients(items);
  // ChatGPT's own card follows the clients with HUD tools.
  const clientCount = knownClients.length + extraClients.length + 1;
  const pluginsMissing = knownClients.filter(
    (client) =>
      client.plugin && plugins[client.id]?.status?.installed === false,
  ).length;
  return (
    <TooltipProvider delayDuration={300}>
      <Page>
        <HooksSection snapshot={snapshot} action={action} t={t} />
        <Section
          title={t("Clients", "各客户端")}
          action={[
            t(`${clientCount} clients`, `${clientCount} 个`),
            pluginsMissing
              ? t(
                  `${pluginsMissing} plugin${pluginsMissing === 1 ? "" : "s"} not installed`,
                  `${pluginsMissing} 个插件未安装`,
                )
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          footer={mcp.status?.ready === false ? setupNote(snapshot, t) : null}
        >
          <div className="plugins-table-head" aria-hidden="true">
            <span>{t("Client", "客户端")}</span>
            <span>{t("Plugin", "插件")}</span>
            <span>{t("HUD tools", "侧栏工具")}</span>
          </div>
          {knownClients.map((client) => (
            <KnownClientCard
              key={client.id}
              client={client}
              plugin={client.plugin ? (plugins[client.id] ?? null) : null}
              clients={mcp}
              tools={tools}
              items={forClient(client.id)}
              snapshot={snapshot}
              action={action}
              request={request}
              active={active}
              light={light}
              t={t}
            />
          ))}
          {extraClients.map((client) => (
            <ProductClientCard
              key={client.id}
              name={client.name}
              light={light}
              items={forClient(client.id).filter(
                (item) => (item.place ?? "row") === "row",
              )}
              context={{
                snapshot,
                request,
                active,
                clientFound:
                  mcp.status?.clients.find((entry) => entry.id === client.id)
                    ?.available ?? null,
                plugin: { installed: null },
              }}
            />
          ))}
          <ChatGptCard chatgpt={chatgptExtension} light={light} t={t} />
          <OtherAgentsCard
            json={mcp.status?.json}
            icon={<Braces size={16} strokeWidth={1.8} />}
            t={t}
          />
        </Section>
        <ToolsSection
          tools={tools}
          groups={items.filter((item) => item.place === "tools")}
          snapshot={snapshot}
          action={action}
          request={request}
          active={active}
          t={t}
        >
          <DetailsSection
            snapshot={snapshot}
            clients={mcp.status}
            tools={tools}
            t={t}
          />
        </ToolsSection>
      </Page>
    </TooltipProvider>
  );
}
