// Runs background.js in a sandbox with a stubbed extension API.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../background.js", import.meta.url),
  "utf8",
);

function load(tabs) {
  const listeners = {};
  const injected = [];
  const event = (name) => ({ addListener: (fn) => (listeners[name] = fn) });
  const chrome = {
    runtime: {
      id: "test",
      getManifest: () => ({ version: "0" }),
      connectNative: () => ({
        onMessage: event("port"),
        onDisconnect: event("gone"),
        postMessage() {},
      }),
      onInstalled: event("installed"),
      onMessage: event("message"),
    },
    storage: { local: { get: async () => ({}), set: async () => {} } },
    tabs: {
      query: async () => tabs,
      sendMessage: async () => null,
      onRemoved: event("removed"),
      onUpdated: event("updated"),
    },
    scripting: {
      executeScript: async ({ target, files }) => {
        // Copied out of the sandbox's realm, so deepEqual compares values.
        injected.push([target.tabId, [...files]]);
        if (target.tabId === 1) throw new Error("Frame with ID 0 was removed.");
      },
    },
  };
  vm.runInNewContext(source, {
    chrome,
    setTimeout: () => 0,
    clearTimeout() {},
  });
  return { listeners, injected };
}

test("installing or reloading the extension puts the scripts into chatgpt.com tabs already open", async () => {
  // Chrome gives those tabs no content script of their own (#206); a tab
  // that refuses one does not stop the rest.
  const { listeners, injected } = load([{ id: 1 }, { id: 2 }]);
  await listeners.installed({ reason: "update" });
  assert.deepEqual(injected, [
    [1, ["page.js", "content.js"]],
    [2, ["page.js", "content.js"]],
  ]);
});
