import { test } from "node:test";
import assert from "node:assert/strict";
import { chatgptInput, chatgptRow } from "../src/lib/chatgpt-row.ts";
import {
  mcpRow,
  pluginRow,
  toolsSwitch,
  type McpInput,
} from "../src/lib/agent-plugins.ts";
import { reviewLimitOptions } from "../src/lib/review-limit.ts";

const plugin = {
  installed: false,
  sessions: 0,
  clientFound: true,
  running: null,
  justInstalled: false,
} as const;
const mcp: McpInput = {
  client: "Codex",
  setupReady: true,
  clientFound: true,
  added: false,
  hasCommand: true,
  toolsOn: false,
  toolsUnavailable: null,
  listening: false,
  running: null,
  justAdded: false,
  copied: false,
};

test("the plugin row offers Install until it is in, then says how many sessions run it", () => {
  const reading = pluginRow({ ...plugin, installed: null });
  assert.deepEqual([reading.status[0], reading.action], ["Checking…", null]);

  const missing = pluginRow(plugin);
  assert.deepEqual(
    [
      missing.tone,
      missing.status,
      missing.action?.id,
      missing.action?.unavailable,
    ],
    ["off", ["Not installed", "未安装"], "install", undefined],
  );
  assert.deepEqual(missing.menu, []);

  const noClient = pluginRow({ ...plugin, clientFound: false });
  assert.deepEqual(noClient.action?.unavailable, [
    "Install Claude Code first.",
    "请先安装 Claude Code。",
  ]);

  const installing = pluginRow({ ...plugin, running: "install" });
  assert.deepEqual(installing.busy, ["Installing…", "正在安装…"]);

  // In place but no session has loaded it: blue, no button, and the step that loads it.
  const idle = pluginRow({ ...plugin, installed: true });
  assert.deepEqual(
    [idle.tone, idle.status[0], idle.action],
    ["installed", "Installed", null],
  );
  assert.equal(idle.next?.command, "/reload-plugins");
  assert.match(
    idle.next!.words[1],
    /已经打开的会话，在其中运行 \/reload-plugins/,
  );
  assert.deepEqual(
    idle.menu.map((item) => [item.id, item.destructive]),
    [["remove", true]],
  );

  const loaded = pluginRow({ ...plugin, installed: true, sessions: 2 });
  assert.deepEqual(
    [loaded.tone, loaded.status],
    ["working", ["Loaded in 2 sessions", "已在 2 个会话中加载"]],
  );
  assert.equal(loaded.next, null);
  assert.equal(
    pluginRow({ ...plugin, installed: true, sessions: 1 }).status[0],
    "Loaded in 1 session",
  );
  // Right after installing, the reload step stays even once a session loaded it.
  assert.ok(
    pluginRow({ ...plugin, installed: true, sessions: 1, justInstalled: true })
      .next,
  );

  assert.deepEqual(
    pluginRow({ ...plugin, installed: true, sessions: 2, running: "remove" })
      .busy,
    ["Removing…", "正在移除…"],
  );
});

test("a plugin the client loads by itself only asks to open the client, never to reload", () => {
  const client = "DeepSeek Harness";
  assert.equal(
    pluginRow({ ...plugin, clientFound: false }, client, true).action
      ?.unavailable?.[0],
    "Install DeepSeek Harness first.",
  );
  const idle = pluginRow({ ...plugin, installed: true }, client, true);
  assert.equal(idle.status[0], "Installed");
  assert.equal(idle.next?.command, undefined);
  assert.match(
    idle.next?.words[0] ?? "",
    /^DeepSeek Harness loads it by itself/,
  );
  assert.match(idle.next?.words[1] ?? "", /打开 DeepSeek Harness/);
  const loaded = pluginRow(
    { ...plugin, installed: true, sessions: 2, justInstalled: true },
    client,
    true,
  );
  assert.deepEqual([loaded.tone, loaded.next], ["working", null]);
  assert.equal(loaded.menu[0]?.id, "remove");
});

test("the MCP row asks for the one step left, and never removes from its main button", () => {
  assert.equal(mcpRow({ ...mcp, setupReady: null }).status[0], "Checking…");

  const notAdded = mcpRow(mcp);
  assert.deepEqual(
    [
      notAdded.tone,
      notAdded.status[0],
      notAdded.action?.id,
      notAdded.action?.unavailable,
    ],
    ["off", "Not added", "add", undefined],
  );
  assert.deepEqual(
    notAdded.menu.map((item) => item.id),
    ["copy"],
  );

  const noClient = mcpRow({ ...mcp, clientFound: false });
  assert.deepEqual(noClient.action?.unavailable, [
    "Install Codex first.",
    "请先安装 Codex。",
  ]);

  const notInstalledApp = mcpRow({
    ...mcp,
    setupReady: false,
    hasCommand: false,
  });
  assert.deepEqual(
    [
      notInstalledApp.status[0],
      notInstalledApp.action?.unavailable?.[0],
      notInstalledApp.menu,
    ],
    [
      "Unavailable",
      "Adding HUD tools requires PostPane at its approved installation location and its MCP components.",
      [],
    ],
  );

  // Added while the app-side switch is off: amber, and the row turns it on.
  const off = mcpRow({ ...mcp, added: true });
  assert.deepEqual(
    [off.tone, off.status, off.action?.id],
    ["attention", ["Tools off", "工具已关闭"], "turn-on"],
  );
  assert.deepEqual(
    off.menu.map((item) => item.id),
    ["copy", "remove"],
  );
  assert.deepEqual(off.menu[1].label, ["Remove from Codex", "从 Codex 移除"]);
  // In the demo the switch cannot change, and Turn on says why.
  const demo = toolsSwitch({
    supported: true,
    enabled: false,
    listening: false,
    notice: null,
    demo: true,
  }).unavailable;
  assert.deepEqual(
    mcpRow({ ...mcp, added: true, toolsUnavailable: demo }).action?.unavailable,
    ["Not available in the demo.", "演示模式下不可用。"],
  );

  const failed = mcpRow({ ...mcp, added: true, toolsOn: true });
  assert.deepEqual(
    [failed.tone, failed.status[0], failed.action],
    ["failed", "Not running", null],
  );

  const ready = mcpRow({ ...mcp, added: true, toolsOn: true, listening: true });
  assert.deepEqual(
    [ready.tone, ready.status, ready.action, ready.next],
    ["working", ["Ready", "可以使用"], null, null],
  );
  const justAdded = mcpRow({
    ...mcp,
    client: "Claude Code",
    added: true,
    toolsOn: true,
    listening: true,
    justAdded: true,
  });
  assert.deepEqual(justAdded.next?.words, [
    "Start a new Claude Code session and ask it to change the HUD.",
    "在 Claude Code 里新开一个会话，说“把侧栏改成……”。",
  ]);
  // A copy confirms in place of any other next step.
  assert.equal(
    mcpRow({
      ...mcp,
      added: true,
      toolsOn: true,
      listening: true,
      justAdded: true,
      copied: true,
    }).next?.words[0],
    "Command copied. Paste it into Terminal.",
  );

  assert.deepEqual(mcpRow({ ...mcp, running: "add" }).busy, [
    "Adding…",
    "正在添加…",
  ]);
  assert.deepEqual(
    mcpRow({
      ...mcp,
      added: true,
      toolsOn: true,
      listening: true,
      running: "remove",
    }).busy,
    ["Removing…", "正在移除…"],
  );
});

test("the switch explains itself only when it cannot change or the channel broke", () => {
  const healthy = {
    supported: true,
    enabled: true,
    listening: true,
    notice: null,
    demo: false,
  };
  assert.deepEqual(toolsSwitch(healthy), { unavailable: null, problem: null });
  assert.deepEqual(
    toolsSwitch({ ...healthy, enabled: false, listening: false }),
    { unavailable: null, problem: null },
  );
  assert.deepEqual(
    toolsSwitch({ ...healthy, listening: false, notice: "socket in use" })
      .problem,
    ["Not running: socket in use", "未运行：socket in use"],
  );
  assert.deepEqual(toolsSwitch({ ...healthy, demo: true }).unavailable, [
    "Not available in the demo.",
    "演示模式下不可用。",
  ]);
  const unsupported = toolsSwitch({
    ...healthy,
    supported: false,
    enabled: false,
    listening: false,
  });
  assert.deepEqual(unsupported.unavailable, unsupported.problem);
});

test("the ChatGPT row registers Chrome's manifest, then says whether the extension is connected", () => {
  const input = {
    manifestInstalled: false,
    manifestCurrent: false,
    helperFound: true,
    supported: true,
    connected: false,
    running: null,
  } as const;
  const reading = chatgptRow({ ...input, manifestInstalled: null });
  assert.deepEqual([reading.status[1], reading.action], ["正在检查…", null]);

  const missing = chatgptRow(input);
  assert.deepEqual(
    [missing.tone, missing.status[1], missing.action?.label[1], missing.menu],
    ["off", "未登记", "登记", []],
  );
  assert.equal(missing.action?.unavailable, undefined);
  // A development build has no relay Chrome may start.
  assert.equal(
    chatgptRow({ ...input, helperFound: false }).action?.unavailable?.[1],
    "需要从指定安装位置运行驿窗才能登记。",
  );
  const registering = chatgptRow({ ...input, running: "register" });
  assert.equal(registering.busy?.[1], "正在登记…");

  const elsewhere = chatgptRow({ ...input, manifestInstalled: true });
  assert.deepEqual(
    [elsewhere.tone, elsewhere.action?.id, elsewhere.menu[0]?.label[1]],
    ["attention", "register", "移除"],
  );
  const waiting = chatgptRow({
    ...input,
    manifestInstalled: true,
    manifestCurrent: true,
  });
  assert.deepEqual(
    [waiting.tone, waiting.status[1], waiting.action],
    ["installed", "未连接", null],
  );
  const connected = chatgptRow({
    ...input,
    manifestInstalled: true,
    manifestCurrent: true,
    connected: true,
  });
  assert.deepEqual(
    [connected.tone, connected.status[1], connected.menu[0]?.id],
    ["working", "已连接", "remove"],
  );
});

test("a connected extension says its version, and which side to bring up to date when it is not this app's (#493)", () => {
  const input = {
    manifestInstalled: true,
    manifestCurrent: true,
    helperFound: true,
    supported: true,
    connected: true,
    running: null,
    extensionVersion: "0.2.5",
    expectedVersion: "0.2.5",
    versionFit: "same",
  } as const;
  const same = chatgptRow(input);
  assert.deepEqual(
    [same.tone, same.status[1], same.action, same.next],
    ["working", "已连接 · 0.2.5", null, null],
  );
  const older = chatgptRow({
    ...input,
    extensionVersion: "0.2.4",
    versionFit: "older",
  });
  assert.deepEqual(
    [older.tone, older.status[1], older.menu[0]?.id],
    ["attention", "需要重新加载插件", "remove"],
  );
  assert.match(older.next?.words[1] ?? "", /0\.2\.4.*0\.2\.5/);
  assert.match(older.next?.words[1] ?? "", /chrome:\/\/extensions/);
  const newer = chatgptRow({
    ...input,
    extensionVersion: "0.2.6",
    versionFit: "newer",
  });
  assert.deepEqual(
    [newer.tone, newer.status[1]],
    ["attention", "需要重装驿窗"],
  );
  assert.match(newer.next?.words[1] ?? "", /0\.2\.6.*0\.2\.5/);
  // Away, the version it last said does not matter.
  assert.equal(
    chatgptRow({ ...input, connected: false, versionFit: "older" }).status[1],
    "未连接",
  );
  // A version it did not say is not held against it.
  assert.equal(
    chatgptRow({ ...input, extensionVersion: null, versionFit: "unknown" })
      .status[1],
    "已连接",
  );
});

test("the ChatGPT row's input reads the status, and nothing yet while it is being read (#493)", () => {
  const reading = chatgptInput(null, null);
  assert.equal(reading.manifestInstalled, null);
  assert.equal(reading.connected, false);
  assert.equal(reading.extensionVersion, null);
  assert.equal(reading.versionFit, "unknown");
  assert.equal(chatgptRow(reading).status[1], "正在检查…");
  const status = {
    supported: true,
    manifestInstalled: true,
    manifestCurrent: true,
    helperFound: true,
    connected: true,
    extensionVersion: "0.2.5",
    expectedVersion: "0.2.5",
    versionFit: "same" as const,
    lastSeen: 5,
    watched: [],
  };
  const read = chatgptInput(status, "remove");
  assert.deepEqual(read, {
    manifestInstalled: true,
    manifestCurrent: true,
    helperFound: true,
    supported: true,
    connected: true,
    running: "remove",
    extensionVersion: "0.2.5",
    expectedVersion: "0.2.5",
    versionFit: "same",
  });
  assert.equal(
    chatgptRow({ ...read, running: null }).status[1],
    "已连接 · 0.2.5",
  );
  // An app older than #493 names no expected version and no fit.
  const older = chatgptInput(
    { ...status, expectedVersion: undefined, versionFit: undefined },
    null,
  );
  assert.equal(older.expectedVersion, null);
  assert.equal(older.versionFit, "unknown");
  assert.equal(chatgptRow(older).status[1], "已连接");
});

test("the review cap offers 1 to 9 rounds with five marked as the default (#409)", () => {
  const zh = reviewLimitOptions(9, 5, true);
  assert.equal(zh.length, 9);
  assert.deepEqual(zh[0], ["1", "1 轮"]);
  assert.deepEqual(zh[4], ["5", "5 轮（默认）"]);
  assert.deepEqual(zh[8], ["9", "9 轮"]);
  assert.deepEqual(reviewLimitOptions(9, 5, false)[4], ["5", "5 (default)"]);
});
