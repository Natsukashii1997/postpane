// The host calls behind Agent plugins: which clients have Agent HUD's MCP
// server, and the state of Agent HUD's Claude Code and DeepSeek Harness
// plugins. Pictures and tests pass fakes with the same shapes.
import { invoke, isTauri } from "@tauri-apps/api/core";

/** native_mcp_clients: which clients have Agent HUD's MCP server, and the
 * command and settings to add it by hand. */
export interface MCPClientsStatus {
  ready: boolean;
  notice: string | null;
  json: unknown;
  clients: {
    id: string;
    name: string;
    available: boolean;
    installed: boolean;
    /** The client's own command that adds the server; null when Agent HUD edits its settings file. */
    command: string | null;
  }[];
}
export type MCPClientsService = (
  action: "status" | "install" | "remove",
  client?: string,
) => Promise<MCPClientsStatus>;

export const nativeClients: MCPClientsService = async (action, client) => {
  if (!isTauri())
    return { ready: false, notice: null, json: null, clients: [] };
  return invoke<MCPClientsStatus>("native_mcp_clients", {
    action,
    client: client ?? null,
  });
};

/** native_claude_plugin: whether Claude Code is here, whether it lists Agent
 * HUD's plugin, and how many sessions run it now. */
export interface ClaudePluginStatus {
  found: boolean;
  installed: boolean;
  sessions: number;
}
export type ClaudePluginService = (
  action: "status" | "install" | "remove",
) => Promise<ClaudePluginStatus>;

export const nativePlugin: ClaudePluginService = async (action) => {
  if (!isTauri()) return { found: false, installed: false, sessions: 0 };
  return invoke<ClaudePluginStatus>("native_claude_plugin", { action });
};

/** native_deepseek_plugin: whether DeepSeek Harness is here, whether its home
 * patch loads Agent HUD's plugin, and how many sessions run it now. */
export const nativeDeepSeekPlugin: ClaudePluginService = async (action) => {
  if (!isTauri()) return { found: false, installed: false, sessions: 0 };
  return invoke<ClaudePluginStatus>("native_deepseek_plugin", { action });
};

/** native_chatgpt_extension: whether Chrome's native host manifest names
 * this app's relay, and whether the ChatGPT extension is connected. */
export interface ChatGptStatus {
  supported: boolean;
  manifestInstalled: boolean;
  manifestCurrent: boolean;
  helperFound: boolean;
  connected: boolean;
  extensionVersion: string | null;
  /** The extension version this app was built with (#493). */
  expectedVersion?: string | null;
  /** The connected extension against it: older, reload the extension; newer, reinstall the app. */
  versionFit?: "same" | "older" | "newer" | "unknown";
  lastSeen: number | null;
  watched: { id: string; title: string; openedAt: number }[];
}
export type ChatGptService = (
  action: "status" | "install" | "remove",
) => Promise<ChatGptStatus>;

export const nativeChatGpt: ChatGptService = async (action) => {
  if (!isTauri())
    return {
      supported: false,
      manifestInstalled: false,
      manifestCurrent: false,
      helperFound: false,
      connected: false,
      extensionVersion: null,
      lastSeen: null,
      watched: [],
    };
  return invoke<ChatGptStatus>("native_chatgpt_extension", { action });
};

/** chatgpt_project: the ChatGPT project page new review conversations open
 * in, read (no argument) or set (an empty text clears it). */
export type ChatGptProjectService = (
  project?: string,
) => Promise<{ project: string | null }>;

export const nativeChatGptProject: ChatGptProjectService = async (project) => {
  if (!isTauri()) return { project: null };
  return invoke<{ project: string | null }>("chatgpt_project", {
    project: project ?? null,
  });
};

/** chatgpt_review_limit: the relay's review cap (#409), read (no argument)
 * or set, with the range it takes and its default. */
export type ChatGptReviewLimitService = (
  limit?: number,
) => Promise<{ limit: number; max: number; default: number }>;

export const nativeChatGptReviewLimit: ChatGptReviewLimitService = async (
  limit,
) => {
  if (!isTauri()) return { limit: 5, max: 9, default: 5 };
  return invoke("chatgpt_review_limit", { limit: limit ?? null });
};

/** The clients the host can give HUD tools to (hud_tools::CLIENTS), in page
 * order. `plugin`: the client has an Agent HUD plugin of its own; `live`:
 * it loads the plugin into open sessions by itself. */
export const knownClients: {
  id: string;
  name: string;
  logo: string;
  plugin?: { live: boolean };
}[] = [
  {
    id: "claudeCode",
    name: "Claude Code",
    logo: "claude",
    plugin: { live: false },
  },
  { id: "codex", name: "Codex", logo: "codex" },
  { id: "cursor", name: "Cursor", logo: "cursor" },
  {
    id: "deepseek",
    name: "DeepSeek Harness",
    logo: "deepseek",
    plugin: { live: true },
  },
  { id: "antigravity", name: "Antigravity", logo: "antigravity" },
];

/** The last statuses read, so the page opens without a blank. */
export const cache: {
  clients: MCPClientsStatus | null;
  plugins: Record<string, ClaudePluginStatus | null>;
  chatgpt: ChatGptStatus | null;
  chatgptProject: string | null;
} = { clients: null, plugins: {}, chatgpt: null, chatgptProject: null };
