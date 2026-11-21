import { test } from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "@agent-hud/protocol";
import { dataObjects, executorState, mcpReach } from "../src/lib/ai-access.ts";

const chatgpt = {
  supported: true,
  manifestInstalled: true,
  manifestCurrent: true,
  helperFound: true,
  connected: true,
  extensionVersion: "0.2.2",
  expectedVersion: "0.2.2",
  versionFit: "same" as const,
  lastSeen: 1,
  watched: [],
};

test("an extension that is not this app's version still serves, and says so (#493)", () => {
  const older = executorState({ ...chatgpt, versionFit: "older" });
  assert.deepEqual(
    [older.tone, older.words[1]],
    ["orange", "可用 · 插件要重新加载"],
  );
  const newer = executorState({ ...chatgpt, versionFit: "newer" });
  assert.deepEqual(
    [newer.tone, newer.words[1]],
    ["orange", "可用 · 驿窗要重装"],
  );
  assert.equal(
    executorState({ ...chatgpt, versionFit: "unknown" }).tone,
    "green",
  );
});

test("the executor reads available only while the extension is connected", () => {
  assert.equal(executorState(null).words[1], "正在检查…");
  assert.equal(executorState(chatgpt).tone, "green");
  assert.equal(executorState(chatgpt).words[1], "可用 · 插件已连上");
  const away = executorState({ ...chatgpt, connected: false });
  assert.equal(away.tone, "orange");
  assert.equal(away.words[1], "不可用 · 插件没连上");
  assert.equal(
    executorState({ ...chatgpt, manifestInstalled: false }).words[1],
    "不可用 · 插件未登记",
  );
  assert.equal(
    executorState({ ...chatgpt, supported: false }).words[1],
    "这个系统不支持",
  );
});

test("MCP reach names the clients with and without the server", () => {
  assert.equal(mcpReach(null), "reading");
  assert.equal(
    mcpReach({ ready: false, notice: "x", json: null, clients: [] }),
    "unknown",
  );
  const client = (name: string, installed: boolean) => ({
    id: name,
    name,
    available: true,
    installed,
    command: null,
  });
  assert.deepEqual(
    mcpReach({
      ready: true,
      notice: null,
      json: null,
      clients: [
        client("Claude Code", true),
        client("Codex", true),
        client("Cursor", false),
      ],
    }),
    { installed: ["Claude Code", "Codex"], missing: ["Cursor"] },
  );
});

test("data objects split into read, switched off and not here", () => {
  const provider = (
    id: string,
    name: string,
    detected: boolean,
    enabled: boolean,
  ) =>
    ({
      id,
      name,
      detected,
      enabled,
      notice: null,
      sessions: 0,
    }) as Provider;
  const data = dataObjects([
    provider("claude", "Claude Code", true, true),
    provider("hermes", "Hermes", true, true),
    provider("deepseek", "DeepSeek", true, false),
    provider("kimi", "Kimi", false, true),
    provider("someday", "Someday", true, true),
  ]);
  assert.deepEqual(
    data.reading.map((row) => row.id),
    ["claude", "hermes", "someday"],
  );
  assert.equal(data.reading[0]!.sessions[1], "~/.claude/projects");
  assert.match(data.reading[1]!.quota[1], /不联网/);
  // A client added later still gets a row, with plain words for its source.
  assert.equal(data.reading[2]!.sessions[1], "它的本机日志");
  assert.deepEqual(data.off, ["DeepSeek"]);
  assert.deepEqual(data.absent, ["Kimi"]);
});
