// Settings → AI access (global rule P-13): which AI writes what PostPane
// shows, who connects in, and whose data PostPane only reads. The words for
// each part live here so the page and its tests read one list; AGENTS.md
// 「AI 接入」 says the same and changes with it.
import type { Provider } from "@agent-hud/protocol";
import type {
  ChatGptStatus,
  MCPClientsStatus,
} from "../settings/agent-plugins/services";
import type { Words } from "./agent-plugins";

export type AccessTone = "green" | "orange" | "gray";
export interface AccessState {
  tone: AccessTone;
  words: Words;
}

/** The one executor: ChatGPT on the web, through the Chrome extension. */
export function executorState(status: ChatGptStatus | null): AccessState {
  if (!status) return { tone: "gray", words: ["Checking…", "正在检查…"] };
  if (!status.supported)
    return { tone: "gray", words: ["Not on this system", "这个系统不支持"] };
  if (!status.manifestInstalled)
    return {
      tone: "gray",
      words: ["Unavailable · not registered", "不可用 · 插件未登记"],
    };
  if (!status.connected)
    return {
      tone: "orange",
      words: ["Unavailable · open Chrome", "不可用 · 插件没连上"],
    };
  // Still serving, but not the extension this app was built with (#493).
  if (status.versionFit === "older")
    return {
      tone: "orange",
      words: ["Available · reload the extension", "可用 · 插件要重新加载"],
    };
  if (status.versionFit === "newer")
    return {
      tone: "orange",
      words: ["Available · reinstall PostPane", "可用 · 驿窗要重装"],
    };
  return {
    tone: "green",
    words: ["Available · extension connected", "可用 · 插件已连上"],
  };
}

/** Which clients list PostPane's MCP server, and which do not; "reading"
 * before the first answer, "unknown" when the host could not tell. */
export function mcpReach(
  status: MCPClientsStatus | null,
): "reading" | "unknown" | { installed: string[]; missing: string[] } {
  if (!status) return "reading";
  if (!status.ready) return "unknown";
  return {
    installed: status.clients.filter((c) => c.installed).map((c) => c.name),
    missing: status.clients.filter((c) => !c.installed).map((c) => c.name),
  };
}

/** Where PostPane reads each client: its sessions, and its quota. */
const sources: Record<string, { sessions: Words; quota: Words }> = {
  claude: {
    sessions: ["~/.claude/projects", "~/.claude/projects"],
    quota: [
      "Local claude sign-in (if the first read after a restart fails, Claude Code's own record in ~/.claude.json, same account only); cloud sessions from api.anthropic.com",
      "本机 claude 登录查额度（重启后第一次就读失败时，退回 ~/.claude.json 里 Claude Code 自己记下的读数，只认同一账号）；云端会话经 api.anthropic.com",
    ],
  },
  codex: {
    sessions: ["~/.codex/sessions", "~/.codex/sessions"],
    quota: [
      "Local codex app-server; also whether PostPane's hooks are allowed",
      "本机 codex app-server；顺带查驿窗钩子是否已允许",
    ],
  },
  antigravity: {
    sessions: ["~/.gemini/antigravity*/brain", "~/.gemini/antigravity*/brain"],
    quota: ["Local language server", "本机 language server"],
  },
  hermes: {
    sessions: [
      "~/.hermes/state.db, profiles/*/state.db",
      "~/.hermes/state.db、profiles/*/state.db",
    ],
    quota: ["Offline, no quota", "不联网，没有额度"],
  },
  chatgpt: {
    sessions: [
      "Turns the Chrome extension reports; no files",
      "Chrome 插件报的回合，不读文件",
    ],
    quota: ["No quota", "没有额度"],
  },
  deepseek: {
    sessions: ["~/.dsh/sessions", "~/.dsh/sessions"],
    quota: ["api.deepseek.com with an API key", "api.deepseek.com，用 API Key"],
  },
  cursor: {
    sessions: ["Cursor state.vscdb", "Cursor 的 state.vscdb"],
    quota: [
      "api2.cursor.sh with Cursor's sign-in",
      "api2.cursor.sh，用 Cursor 的登录",
    ],
  },
  "grok-cli": {
    sessions: ["~/.grok/sessions", "~/.grok/sessions"],
    quota: ["cli-chat-proxy.grok.com", "cli-chat-proxy.grok.com"],
  },
  "grok-bot": {
    sessions: ["Grok Bot's local data", "Grok Bot 本机数据"],
    quota: ["Through Cursor's sign-in", "借 Cursor 的登录"],
  },
  copilot: {
    sessions: ["~/.copilot/session-state", "~/.copilot/session-state"],
    quota: [
      "api.github.com, only with your consent",
      "api.github.com，要你同意才读",
    ],
  },
  devin: {
    sessions: [
      "~/.local/share/devin/cli/sessions.db",
      "~/.local/share/devin/cli/sessions.db",
    ],
    quota: ["Local cache, offline", "本机缓存，不联网"],
  },
  kimi: {
    sessions: ["~/.kimi-code/sessions", "~/.kimi-code/sessions"],
    quota: ["api.kimi.com with an API key", "api.kimi.com，用 API Key"],
  },
  glm: {
    sessions: ["Only checks it is in use", "只检测在不在用"],
    quota: [
      "api.z.ai or open.bigmodel.cn with an API key",
      "api.z.ai 或 open.bigmodel.cn，用 API Key",
    ],
  },
  opencode: {
    sessions: ["~/.local/share/opencode", "~/.local/share/opencode"],
    quota: ["opencode.ai with an API key", "opencode.ai，用 API Key"],
  },
  pi: {
    sessions: ["~/.pi/agent/sessions", "~/.pi/agent/sessions"],
    quota: ["No quota", "没有额度"],
  },
  openclaw: {
    sessions: ["~/.openclaw/agents", "~/.openclaw/agents"],
    quota: ["No quota", "没有额度"],
  },
  zcode: {
    sessions: ["~/.zcode/cli/db/db.sqlite", "~/.zcode/cli/db/db.sqlite"],
    quota: ["No quota", "没有额度"],
  },
  codebuddy: {
    sessions: ["~/.codebuddy/projects", "~/.codebuddy/projects"],
    quota: ["No quota", "没有额度"],
  },
  workbuddy: {
    sessions: ["~/.workbuddy/projects", "~/.workbuddy/projects"],
    quota: ["No quota", "没有额度"],
  },
  qwen: {
    sessions: ["~/.qwen/projects", "~/.qwen/projects"],
    quota: ["No quota", "没有额度"],
  },
  qoder: {
    sessions: ["Only checks ~/.qoder", "只检测 ~/.qoder"],
    quota: ["No quota", "没有额度"],
  },
  "qoder-cn": {
    sessions: ["Only checks ~/.qoder-cn", "只检测 ~/.qoder-cn"],
    quota: ["No quota", "没有额度"],
  },
  "qoder-work": {
    sessions: ["Only checks ~/.qoderwork", "只检测 ~/.qoderwork"],
    quota: ["No quota", "没有额度"],
  },
};
const unknown = {
  sessions: ["Its local logs", "它的本机日志"],
  quota: ["—", "—"],
} as const satisfies { sessions: Words; quota: Words };

export interface DataObjectRow {
  id: string;
  name: string;
  sessions: Words;
  quota: Words;
}

/** The clients PostPane reads now (found here and switched on), with where
 * it reads them; the ones switched off; the ones not on this computer. */
export function dataObjects(providers: Provider[]): {
  reading: DataObjectRow[];
  off: string[];
  absent: string[];
} {
  const row = (provider: Provider): DataObjectRow => ({
    id: provider.id,
    name: provider.name,
    ...(sources[provider.id] ?? unknown),
  });
  return {
    reading: providers.filter((p) => p.detected && p.enabled).map(row),
    off: providers.filter((p) => p.detected && !p.enabled).map((p) => p.name),
    absent: providers.filter((p) => !p.detected).map((p) => p.name),
  };
}
