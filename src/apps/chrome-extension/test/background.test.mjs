// Runs background.js in a sandbox with a stubbed extension API.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../background.js", import.meta.url),
  "utf8",
);

function load(
  tabs,
  {
    asked = [],
    dead = new Set(),
    watched = [],
    answers = [],
    now = false,
  } = {},
) {
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
    storage: {
      local: { get: async () => ({ watched }), set: async () => {} },
    },
    tabs: {
      query: async () => tabs,
      sendMessage: async (tabId, message) => {
        if (message.op === "state") return null;
        asked.push([tabId, message.op]);
        if (dead.has(tabId)) throw new Error("Receiving end does not exist.");
        return answers.shift() ?? { ok: true };
      },
      onRemoved: event("removed"),
      onUpdated: event("updated"),
    },
    scripting: {
      executeScript: async ({ target, files }) => {
        // Copied out of the sandbox's realm, so deepEqual compares values.
        injected.push([target.tabId, [...files]]);
        if (target.tabId === 1) throw new Error("Frame with ID 0 was removed.");
        dead.delete(target.tabId);
      },
    },
  };
  vm.runInNewContext(source, {
    chrome,
    // `now`: a pause ends at once, so waits that are counted run through.
    setTimeout: now ? (fn) => (Promise.resolve().then(fn), 0) : () => 0,
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

// #356: PostPane heard nothing of a turn it waits on. The tab showing the
// conversation is asked to tell its newest reply again; one whose script
// was cut off gets one first.
test("reading again asks the conversation's tab, putting a script in first if it has none", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const asked = [];
  const tabs = [{ id: 2, url: `https://chatgpt.com/g/p/c/${conversation}` }];
  const { listeners, injected } = load(tabs, {
    asked,
    dead: new Set([2]),
    watched: [conversation],
  });
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.port({ type: "reread", conversation });
  assert.deepEqual(asked, [
    [2, "reread"],
    [2, "reread"],
  ]);
  assert.deepEqual(injected, [[2, ["page.js", "content.js"]]]);
  // One not on the watch list is not read.
  await listeners.port({ type: "reread", conversation: "other" });
  assert.equal(asked.length, 2);
});

// #356 P2-02: a tab that has not drawn its history yet (just opened) is asked
// again shortly, a few times, until it has or gives up; not every two minutes.
test("reading again asks a tab without its history again, a few times", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const asked = [];
  const tabs = [{ id: 2, url: `https://chatgpt.com/c/${conversation}` }];
  const unloaded = { ok: true, streaming: false, told: false, loaded: false };
  const { listeners } = load(tabs, {
    asked,
    watched: [conversation],
    answers: [unloaded, unloaded, { ok: true, told: true, loaded: true }],
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.port({ type: "reread", conversation });
  assert.equal(asked.length, 3, "asked until the history was there");
  const never = [];
  const again = load(tabs, {
    asked: never,
    watched: [conversation],
    answers: Array(10).fill(unloaded),
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await again.listeners.port({ type: "reread", conversation });
  assert.equal(never.length, 6, "once and five more, then left to PostPane");
});
