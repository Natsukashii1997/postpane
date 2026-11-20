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
    fronted = [],
    posted = [],
    windows = {},
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
        postMessage: (message) =>
          posted.push(JSON.parse(JSON.stringify(message))),
      }),
      onInstalled: event("installed"),
      onMessage: event("message"),
    },
    storage: {
      local: { get: async () => ({ watched }), set: async () => {} },
    },
    tabs: {
      query: async () => tabs,
      get: async (tabId) => tabs.find((tab) => tab.id === tabId),
      update: async (tabId, { active }) => {
        fronted.push(tabId);
        for (const tab of tabs) tab.active = tab.id === tabId ? active : false;
      },
      sendMessage: async (tabId, message) => {
        if (message.op === "state") return null;
        asked.push([tabId, message.op]);
        if (dead.has(tabId)) throw new Error("Receiving end does not exist.");
        return answers.shift() ?? { ok: true };
      },
      onRemoved: event("removed"),
      onUpdated: event("updated"),
    },
    windows: { get: async (id) => windows[id] ?? { state: "normal" } },
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

// #410: ChatGPT draws nothing new in a tab in the background. An answer the
// tab holds but has not drawn gets the tab put in front for a moment; the tab
// that was in front comes back. One already in front is left as it is.
test("an answer not drawn in a background tab is read with the tab in front, then the front tab comes back", async () => {
  const conversation = "6afd1d01-7f94-83ee-9a56-242c44a95051";
  const asked = [];
  const fronted = [];
  const tabs = [
    {
      id: 2,
      url: `https://chatgpt.com/c/${conversation}`,
      active: false,
      windowId: 9,
    },
    { id: 5, url: "https://chatgpt.com/c/other", active: true, windowId: 9 },
  ];
  const undrawn = {
    ok: true,
    streaming: false,
    told: false,
    loaded: true,
    undrawn: true,
  };
  const { listeners } = load(tabs, {
    asked,
    fronted,
    watched: [conversation],
    answers: [undrawn, undrawn, { ok: true, told: true, loaded: true }],
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.port({ type: "reread", conversation });
  assert.equal(asked.length, 3, "asked in front until told");
  assert.deepEqual(fronted, [2, 5]);
  // Already in front: nothing is moved.
  const still = [];
  tabs[0].active = true;
  tabs[1].active = false;
  const again = load(tabs, {
    fronted: still,
    watched: [conversation],
    answers: [undrawn],
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await again.listeners.port({ type: "reread", conversation });
  assert.deepEqual(still, []);
});

// #457: #439's answer stayed undrawn in a tab whose window was not on screen,
// and nothing said so. Each read again tells PostPane what it found and how
// the tab stood: hidden, in front of its window, its window minimized, put
// in front for the read.
const readsOf = (posted) => posted.filter((m) => m.type === "reread");

test("reading again tells PostPane what it found and how the tab stood", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const tabs = [
    {
      id: 2,
      url: `https://chatgpt.com/c/${conversation}`,
      active: true,
      windowId: 9,
    },
  ];
  const undrawn = {
    ok: true,
    streaming: false,
    told: false,
    loaded: true,
    undrawn: true,
  };
  const posted = [];
  const { listeners } = load(tabs, {
    posted,
    watched: [conversation],
    answers: [undrawn],
    windows: { 9: { state: "minimized" } },
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.message(
    { type: "page", conversation, hidden: true, streaming: false },
    { tab: { id: 2 } },
  );
  await listeners.port({ type: "reread", conversation });
  assert.deepEqual(readsOf(posted), [
    {
      type: "reread",
      conversation,
      outcome: "undrawn",
      hidden: true,
      active: true,
      minimized: true,
      fronted: false,
    },
  ]);
});

test("a read again says whether it was told, in front or not, still written, or found nothing yet", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const tabs = () => [
    {
      id: 2,
      url: `https://chatgpt.com/c/${conversation}`,
      active: false,
      windowId: 9,
    },
    { id: 5, url: "https://chatgpt.com/c/other", active: true, windowId: 9 },
  ];
  const undrawn = {
    ok: true,
    streaming: false,
    told: false,
    loaded: true,
    undrawn: true,
  };
  const told = { ok: true, streaming: false, told: true, loaded: true };
  const cases = [
    [[told], "told", false],
    [[undrawn, undrawn, told], "told", true],
    [[undrawn, undrawn, undrawn, undrawn], "undrawn", true],
    [
      [{ ok: true, streaming: true, told: false, loaded: true }],
      "streaming",
      false,
    ],
    [
      [{ ok: true, streaming: false, told: false, loaded: true }],
      "waiting",
      false,
    ],
    [
      Array(10).fill({
        ok: true,
        streaming: false,
        told: false,
        loaded: false,
      }),
      "unloaded",
      false,
    ],
  ];
  for (const [answers, outcome, fronted] of cases) {
    const posted = [];
    const { listeners } = load(tabs(), {
      posted,
      watched: [conversation],
      answers: [...answers],
      now: true,
    });
    await new Promise((resolve) => setImmediate(resolve));
    await listeners.port({ type: "reread", conversation });
    const [read] = readsOf(posted);
    assert.equal(read?.outcome, outcome, JSON.stringify(answers[0]));
    assert.equal(read.fronted, fronted, outcome);
    assert.equal(read.active, false);
    assert.equal(read.minimized, false);
  }
  // A tab that cannot be reached even with a script put in (the stub
  // refuses tab 1 one).
  const posted = [];
  const { listeners } = load(
    [
      {
        id: 1,
        url: `https://chatgpt.com/c/${conversation}`,
        active: true,
        windowId: 9,
      },
    ],
    { posted, watched: [conversation], dead: new Set([1]), now: true },
  );
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.port({ type: "reread", conversation });
  assert.equal(readsOf(posted)[0]?.outcome, "unreachable");
  // One not on the watch list says nothing.
  const none = [];
  const other = load(tabs(), {
    posted: none,
    watched: [conversation],
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await other.listeners.port({ type: "reread", conversation: "other" });
  assert.deepEqual(readsOf(none), []);
});
