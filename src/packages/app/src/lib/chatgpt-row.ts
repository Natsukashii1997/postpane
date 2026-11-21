// Settings → Agent plugins, the ChatGPT row: Chrome's native host manifest
// for this app's relay, and the extension's connection and version (#493).
// Moved out of agent-plugins.ts, which the 300-line ratchet holds.
import type { ChatGptStatus } from "../settings/agent-plugins/services";
import { checking, type RowState, type Words } from "./agent-plugins.ts";

export type VersionFit = "same" | "older" | "newer" | "unknown";

export interface ChatGptInput {
  /** null while it is being read. */
  manifestInstalled: boolean | null;
  /** The manifest names this app's relay. */
  manifestCurrent: boolean;
  /** This is the installed app, with a relay Chrome may start. */
  helperFound: boolean;
  /** This system has a place for Chrome's native host manifests. */
  supported: boolean;
  /** The extension is connected now. */
  connected: boolean;
  running: "register" | "remove" | null;
  /** The version the extension last said it is (#493); none before it says. */
  extensionVersion?: string | null;
  /** The extension version this app was built with. */
  expectedVersion?: string | null;
  /** How the two stand: older, reload the extension; newer, reinstall the app. */
  versionFit?: VersionFit;
}

/** The row's input from what native_chatgpt_extension answered. */
export function chatgptInput(
  status: ChatGptStatus | null,
  running: ChatGptInput["running"],
): ChatGptInput {
  return {
    manifestInstalled: status ? status.manifestInstalled : null,
    manifestCurrent: Boolean(status?.manifestCurrent),
    helperFound: Boolean(status?.helperFound),
    supported: Boolean(status?.supported),
    connected: Boolean(status?.connected),
    running,
    extensionVersion: status?.extensionVersion ?? null,
    expectedVersion: status?.expectedVersion ?? null,
    versionFit: status?.versionFit ?? "unknown",
  };
}

/** The ChatGPT Chrome extension: Chrome's manifest for PostPane's relay,
 * registered from here, and whether the extension is connected. */
export function chatgptRow(input: ChatGptInput): RowState {
  const busy: Words | null =
    input.running === "register"
      ? ["Registering…", "正在登记…"]
      : input.running === "remove"
        ? ["Removing…", "正在移除…"]
        : null;
  if (input.manifestInstalled === null && !busy)
    return {
      tone: "off",
      status: checking,
      action: null,
      busy: null,
      menu: [],
      next: null,
    };
  const unavailable: Words | undefined = !input.supported
    ? ["This system can't register it yet.", "这个系统暂时不能登记。"]
    : !input.helperFound
      ? [
          "Registering needs PostPane at its approved installation location.",
          "需要从指定安装位置运行驿窗才能登记。",
        ]
      : undefined;
  if (!input.manifestInstalled)
    return {
      tone: "off",
      status: ["Not registered", "未登记"],
      action: { id: "register", label: ["Register", "登记"], unavailable },
      busy,
      menu: [],
      next: null,
    };
  const menu: RowState["menu"] = [
    { id: "remove", label: ["Remove", "移除"], destructive: true },
  ];
  if (!input.manifestCurrent)
    return {
      tone: "attention",
      status: ["Register again", "需要重新登记"],
      action: { id: "register", label: ["Register", "登记"], unavailable },
      busy,
      menu,
      next: null,
    };
  const [found, wanted] = [input.extensionVersion, input.expectedVersion];
  if (input.connected && found && wanted && input.versionFit === "older")
    return {
      tone: "attention",
      status: ["Reload the extension", "需要重新加载插件"],
      action: null,
      busy,
      menu,
      next: {
        words: [
          `Chrome runs extension ${found}; this PostPane expects ${wanted}. In chrome://extensions, press the PostPane extension's reload button.`,
          `Chrome 里的插件是 ${found}，这版驿窗要的是 ${wanted}。在 chrome://extensions 点驿窗插件的重新加载按钮。`,
        ],
      },
    };
  if (input.connected && found && wanted && input.versionFit === "newer")
    return {
      tone: "attention",
      status: ["Reinstall PostPane", "需要重装驿窗"],
      action: null,
      busy,
      menu,
      next: {
        words: [
          `Chrome runs extension ${found}, newer than this PostPane (${wanted}). Rebuild PostPane from the latest main and install it.`,
          `Chrome 里的插件 ${found} 比这版驿窗（${wanted}）新。从最新 main 重新打包、重装驿窗。`,
        ],
      },
    };
  const version = input.versionFit === "same" && found ? ` · ${found}` : "";
  return {
    tone: input.connected ? "working" : "installed",
    status: input.connected
      ? [`Connected${version}`, `已连接${version}`]
      : ["Not connected", "未连接"],
    action: null,
    busy,
    menu,
    next: null,
  };
}
