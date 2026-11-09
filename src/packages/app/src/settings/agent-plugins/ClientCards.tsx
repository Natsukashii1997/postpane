// One folding card per client, printed as a line of the clients table: its
// logo and name, then a status in the Plugin column and one in the HUD tools
// column; inside, the plugin row with its switches and the HUD tools row. A
// card opens by itself only when something in it needs you.
import { Fragment, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { HUDArtwork } from "@agent-hud/hud/HUDArtwork";
import type { Snapshot } from "@agent-hud/protocol";
import {
  chatgptRow,
  mcpRow,
  pluginRow,
  type RowState,
} from "../../lib/agent-plugins";
import {
  Collapsible,
  Notice,
  Pill,
  Row,
  SmallButton,
  type SettingsPaneProps,
  type Text,
} from "../SettingsPrimitives";
import { TextInput } from "../SettingsFields";
import { PluginControl, StatePill, StatusRow } from "./rows";
import type { AgentPluginContext, AgentPluginItem } from "./types";
import {
  useBriefly,
  type ChatGpt,
  type HudTools,
  type McpClients,
  type PluginStatus,
} from "./use-status";
import type { knownClients } from "./services";

type Client = (typeof knownClients)[number];

/** Whether a row waits on the user: something to install or add that can be. */
function needsYou(state: RowState) {
  return (
    state.tone === "off" &&
    state.action !== null &&
    !state.action.unavailable &&
    !state.busy
  );
}

/** The HUD tools row in a client's card. While the app-wide switch is off it
 * says "Off" and points at the Agent tools section, which holds the switch,
 * instead of offering its own. */
function hudToolsState(
  client: Client,
  clients: McpClients,
  tools: HudTools,
  t: Text,
) {
  const entry = clients.status?.clients.find((item) => item.id === client.id);
  const state = mcpRow({
    client: client.name,
    setupReady: clients.status ? clients.status.ready : null,
    clientFound: entry ? entry.available : true,
    added: Boolean(entry?.installed),
    hasCommand: Boolean(entry?.command),
    toolsOn: tools.on,
    toolsUnavailable: tools.state.unavailable,
    listening: tools.listening,
    running: clients.running[client.id] ?? null,
    justAdded: clients.justAdded.includes(client.id),
    copied: clients.copied === client.id,
  });
  if (state.action?.id !== "turn-on") return { state, reason: null };
  return {
    state: {
      ...state,
      tone: "off",
      status: ["Off", "已关闭"],
      action: null,
    } satisfies RowState,
    reason: tools.state.unavailable
      ? t(...tools.state.unavailable)
      : t(
          "Turn on “Let agents arrange the HUD” under Agent tools.",
          "在下方「让智能体调整侧栏」里打开「允许智能体调整侧栏」。",
        ),
  };
}

function ClaudeAnswers({
  snapshot,
  action,
  t,
}: {
  snapshot: Snapshot;
  action: SettingsPaneProps["action"];
  t: Text;
}) {
  const [pending, setPending] = useState(false);
  return (
    <PluginControl
      title={t("Answer questions", "回答提问")}
      checked={snapshot.settings.claudeAnswers !== false}
      pending={pending}
      onChange={(value) => {
        setPending(true);
        // The row has no place for a failure, so it shows as a toast.
        void action("set_setting", { key: "claudeAnswers", value })
          .catch((failure) => toast.error(String(failure)))
          .finally(() => setPending(false));
      }}
    />
  );
}

function ClientCard({
  name,
  logo,
  light,
  missing,
  summary,
  defaultOpen,
  children,
}: {
  name: string;
  logo?: string;
  light: boolean;
  missing: boolean;
  summary: ReactNode;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const muted = { color: "var(--muted-foreground)" };
  return (
    <Collapsible
      icon={
        logo && (
          <span style={{ display: "inline-flex", opacity: missing ? 0.5 : 1 }}>
            <HUDArtwork source={logo} size={18} light={light} />
          </span>
        )
      }
      title={missing ? <span style={muted}>{name}</span> : name}
      summary={summary}
      defaultOpen={defaultOpen}
    >
      {children}
    </Collapsible>
  );
}

/** A known client's card: Agent HUD's plugin for it (with its switches once
 * installed), a product's own rows, and HUD tools. */
export function KnownClientCard({
  client,
  plugin,
  clients,
  tools,
  items,
  snapshot,
  action,
  request,
  active,
  light,
  t,
}: {
  client: Client;
  plugin: PluginStatus | null;
  clients: McpClients;
  tools: HudTools;
  items: AgentPluginItem[];
  snapshot: Snapshot;
  action: SettingsPaneProps["action"];
  request: AgentPluginContext["request"];
  active: boolean;
  light: boolean;
  t: Text;
}) {
  const entry = clients.status?.clients.find((item) => item.id === client.id);
  const found = entry ? entry.available : null;
  const missing = found === false;
  const installed = plugin?.status ? plugin.status.installed : null;
  const context: AgentPluginContext = {
    snapshot,
    request,
    active,
    clientFound: found,
    plugin: { installed },
  };
  const pluginState =
    plugin &&
    pluginRow(
      {
        installed,
        sessions: plugin.status?.sessions ?? 0,
        clientFound: plugin.status ? plugin.status.found : found,
        running: plugin.running,
        justInstalled: plugin.justInstalled,
      },
      client.name,
      client.plugin?.live,
    );
  const hud = hudToolsState(client, clients, tools, t);
  const error = clients.errors[client.id];
  const switches = items.filter((item) => item.place === "plugin");
  const own = items.filter((item) => (item.place ?? "row") === "row");
  // Read once the statuses are in, so the card opens only when it should.
  const loaded =
    clients.status !== null &&
    (!plugin || plugin.status !== null || plugin.error !== null);
  // Answering is off: the HUD's "Open Agent plugins" fix lands here for it,
  // so the card opens on the switch and says so while closed.
  const answersOff =
    client.id === "claudeCode" &&
    installed === true &&
    snapshot.settings.claudeAnswers === false;
  const open =
    !missing &&
    ((pluginState !== null && needsYou(pluginState)) ||
      needsYou(hud.state) ||
      answersOff ||
      Boolean(plugin?.error || error));
  return (
    <ClientCard
      key={loaded ? "loaded" : "reading"}
      name={client.name}
      logo={client.logo}
      light={light}
      missing={missing}
      defaultOpen={loaded && open}
      summary={
        <>
          <span className="plugins-cell">
            {missing ? (
              <Pill tone="gray">{t("Not found", "未发现")}</Pill>
            ) : answersOff ? (
              <Pill tone="orange">{t("Answers off", "回答已关闭")}</Pill>
            ) : pluginState ? (
              <StatePill state={pluginState} t={t} />
            ) : (
              <NoCell />
            )}
          </span>
          <span className="plugins-cell">
            {missing ? <NoCell /> : <StatePill state={hud.state} t={t} />}
          </span>
        </>
      }
    >
      {plugin && pluginState && (
        <StatusRow
          title={t("PostPane plugin", "驿窗插件")}
          subtitle={
            client.id === "claudeCode"
              ? t(
                  "Answer Claude's questions in the HUD.",
                  "在侧栏上回答 Claude 的提问。",
                )
              : t(
                  "Answer its questions and approvals in the HUD.",
                  "在侧栏上回答它的提问和批准请求。",
                )
          }
          column="plugin"
          state={pluginState}
          error={plugin.error}
          t={t}
          onAction={(id) => {
            if (id === "install" || id === "remove") void plugin.change(id);
          }}
        />
      )}
      {installed === true &&
        (client.id === "claudeCode" || switches.length > 0) && (
          // The plugin's own switches, one level in under its row.
          <div className="plugins-sub">
            {client.id === "claudeCode" && (
              <ClaudeAnswers snapshot={snapshot} action={action} t={t} />
            )}
            {switches.map((item) => (
              <Fragment key={item.id}>{item.render(context)}</Fragment>
            ))}
          </div>
        )}
      {own.map((item) => (
        <Fragment key={item.id}>{item.render(context)}</Fragment>
      ))}
      <StatusRow
        title={t("HUD tools", "侧栏工具")}
        tag="MCP"
        column="tools"
        state={hud.state}
        pillReason={hud.reason}
        error={error}
        t={t}
        onAction={(id) => {
          if (id === "add" || id === "remove")
            void clients.change(client.id, id);
          else if (id === "copy" && entry?.command)
            clients.copyCommand(client.id, entry.command);
        }}
      />
    </ClientCard>
  );
}

/** An empty cell of the clients table. */
function NoCell() {
  return <span className="plugins-cell-none">—</span>;
}

/** A card for a client only a product build knows, holding its rows. */
export function ProductClientCard({
  name,
  items,
  context,
  light,
}: {
  name: string;
  items: AgentPluginItem[];
  context: AgentPluginContext;
  light: boolean;
}) {
  return (
    <ClientCard
      name={name}
      light={light}
      missing={false}
      summary={
        <>
          <span className="plugins-cell">
            <NoCell />
          </span>
          <span className="plugins-cell">
            <NoCell />
          </span>
        </>
      }
      defaultOpen={false}
    >
      {items.map((item) => (
        <Fragment key={item.id}>{item.render(context)}</Fragment>
      ))}
    </ClientCard>
  );
}

/** ChatGPT through the PostPane Chrome extension: Chrome's manifest for the
 * app's relay, registered here, and whether the extension is connected. It
 * has no HUD tools. */
export function ChatGptCard({
  chatgpt,
  light,
  t,
}: {
  chatgpt: ChatGpt;
  light: boolean;
  t: Text;
}) {
  const { status } = chatgpt;
  const state = chatgptRow({
    manifestInstalled: status ? status.manifestInstalled : null,
    manifestCurrent: Boolean(status?.manifestCurrent),
    helperFound: Boolean(status?.helperFound),
    supported: Boolean(status?.supported),
    connected: Boolean(status?.connected),
    running: chatgpt.running,
  });
  return (
    <ClientCard
      key={status ? "loaded" : "reading"}
      name={t("ChatGPT (Chrome extension)", "ChatGPT（Chrome 插件）")}
      logo="chatgpt"
      light={light}
      missing={false}
      defaultOpen={
        status !== null && (needsYou(state) || Boolean(chatgpt.error))
      }
      summary={
        <>
          <span className="plugins-cell">
            <StatePill state={state} t={t} />
          </span>
          <span className="plugins-cell">
            <NoCell />
          </span>
        </>
      }
    >
      <StatusRow
        title={t("Chrome extension", "Chrome 插件")}
        subtitle={t(
          "In Chrome, open chrome://extensions, turn on Developer mode and load src/apps/chrome-extension from the repository.",
          "在 Chrome 打开 chrome://extensions，开启开发者模式，加载仓库里的 src/apps/chrome-extension",
        )}
        column="plugin"
        state={state}
        error={chatgpt.error}
        t={t}
        onAction={(id) => {
          if (id === "register" || id === "remove") void chatgpt.change(id);
        }}
      />
      {status?.manifestInstalled && <ProjectRow chatgpt={chatgpt} t={t} />}
    </ClientCard>
  );
}

/** The ChatGPT project new review conversations open in: its page's address,
 * pasted and saved. */
function ProjectRow({ chatgpt, t }: { chatgpt: ChatGpt; t: Text }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useBriefly<true>(1600);
  const text = draft ?? chatgpt.project ?? "";
  const changed = text.trim() !== (chatgpt.project ?? "");
  const save = async () => {
    if (!changed || chatgpt.savingProject) return;
    if (await chatgpt.saveProject(text)) {
      setDraft(null);
      setSaved(true);
    }
  };
  return (
    <Row
      title={t("New reviews go into project", "新会话放进项目")}
      subtitle={t(
        "Paste a ChatGPT project page's address; review conversations PostPane opens go into it.",
        "粘贴 ChatGPT 项目页网址，驿窗新开的审核会话都放进这个项目",
      )}
      below={
        chatgpt.projectError ? (
          <Notice tone="error">{chatgpt.projectError}</Notice>
        ) : undefined
      }
    >
      <TextInput
        label={t("ChatGPT project page", "ChatGPT 项目页网址")}
        value={text}
        change={setDraft}
        placeholder="https://chatgpt.com/g/…/project"
        width={240}
        disabled={chatgpt.savingProject}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void save();
          }
        }}
      />
      <SmallButton
        disabled={!changed || chatgpt.savingProject}
        onClick={() => void save()}
      >
        {saved ? t("Saved", "已保存") : t("Save", "保存")}
      </SmallButton>
    </Row>
  );
}

/** HUD tools for any other agent: the settings to paste by hand. */
export function OtherAgentsCard({
  json,
  icon,
  t,
}: {
  json: unknown;
  icon: ReactNode;
  t: Text;
}) {
  const [copied, setCopied] = useBriefly<true>(2000);
  return (
    <Collapsible
      icon={icon}
      title={t("Other agents", "其他智能体")}
      summary={
        <>
          <span className="plugins-cell">
            <NoCell />
          </span>
          <span className="plugins-cell">
            <NoCell />
          </span>
        </>
      }
    >
      <Row
        title={t("HUD tools", "侧栏工具")}
        tag="MCP"
        subtitle={t(
          "Paste into the agent's MCP settings.",
          "粘贴到智能体的 MCP 设置里。",
        )}
      >
        <SmallButton
          disabled={json == null}
          onClick={() =>
            void navigator.clipboard
              ?.writeText(JSON.stringify(json, null, 2))
              .then(() => setCopied(true))
              .catch(() => {})
          }
        >
          {copied ? (
            <>
              <Check size={13} aria-hidden />
              {t("Copied", "已复制")}
            </>
          ) : (
            t("Copy settings", "复制设置")
          )}
        </SmallButton>
      </Row>
    </Collapsible>
  );
}
