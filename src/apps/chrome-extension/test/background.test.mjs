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
    waits = [],
    clock = null,
    registered = [],
    sent = [],
    stored = {},
    called = [],
    unreachable = new Set(),
    // #488: each tab's document, what data.js says when put in a tab
    // (`installed` unless named), a read the test lets go of (`gate`), and
    // what fails on purpose.
    docs = {},
    installs = {},
    gate = null,
    faults = {},
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
      local: {
        get: async (keys) => {
          if (faults.restore && [keys].flat().includes("shadowLedger"))
            throw new Error("storage unavailable");
          return { watched, ...stored };
        },
        set: async (values) =>
          void Object.assign(stored, JSON.parse(JSON.stringify(values))),
      },
    },
    tabs: {
      query: async () => tabs,
      get: async (tabId) => tabs.find((tab) => tab.id === tabId),
      create: async ({ url }) => {
        const tab = { id: 99, url, active: false, windowId: 1 };
        tabs.push(tab);
        return tab;
      },
      update: async (tabId, { active }) => {
        fronted.push(tabId);
        for (const tab of tabs) tab.active = tab.id === tabId ? active : false;
      },
      sendMessage: async (tabId, message) => {
        if (message.op === "state") return null;
        asked.push([tabId, message.op]);
        sent.push([tabId, JSON.parse(JSON.stringify(message))]);
        if (dead.has(tabId)) throw new Error("Receiving end does not exist.");
        return answers.shift() ?? { ok: true };
      },
      onRemoved: event("removed"),
      onUpdated: event("updated"),
    },
    windows: { get: async (id) => windows[id] ?? { state: "normal" } },
    scripting: {
      // As Chrome: a script already registered, or not registered, throws.
      registerContentScripts: async (scripts) => {
        if (faults.register) throw new Error("Could not register");
        if (stored.registered) throw new Error("Duplicate script ID");
        stored.registered = true;
        registered.push(["on", JSON.parse(JSON.stringify(scripts))]);
      },
      unregisterContentScripts: async ({ ids }) => {
        if (!stored.registered) throw new Error("Nonexistent script ID");
        stored.registered = false;
        registered.push(["off", [...ids]]);
      },
      getRegisteredContentScripts: async () =>
        stored.registered ? [{ id: "postpane-data" }] : [],
      executeScript: async ({ target, files, world, func, args }) => {
        // A function run in the page (#488): what the page in that tab
        // answers. `unreachable` tabs take no script at all.
        if (unreachable.has(target.tabId)) throw new Error("Cannot access");
        const documentId = docs[target.tabId] ?? `doc-${target.tabId}`;
        if (func) {
          called.push([
            target.tabId,
            func.name,
            JSON.parse(JSON.stringify(args ?? [])),
          ]);
          if (func.name === "stopInPage")
            return [{ documentId, result: { stopped: true, restored: true } }];
          if (gate) await gate();
          return [
            { documentId, result: answers.shift() ?? { outcome: "read" } },
          ];
        }
        // Copied out of the sandbox's realm, so deepEqual compares values.
        injected.push(
          world
            ? [target.tabId, [...files], world]
            : [target.tabId, [...files]],
        );
        if (target.tabId === 1) throw new Error("Frame with ID 0 was removed.");
        dead.delete(target.tabId);
        return [{ documentId, result: installs[target.tabId] ?? "installed" }];
      },
    },
  };
  vm.runInNewContext(source, {
    chrome,
    // `now`: a pause ends at once, so waits that are counted run through;
    // as a timer does, after what is already on its way.
    setTimeout: (fn, ms) => {
      waits.push(ms);
      if (now) setImmediate(fn);
      return 0;
    },
    clearTimeout() {},
    // `clock`: the time the script reads, moved by the test.
    ...(clock && { Date: { now: () => clock.now } }),
  });
  return { listeners, injected, chrome };
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

// #466: words send was never pressed for did not go, and PostPane lets them
// go again; pressed on either try, or the tab gone meanwhile, it cannot
// know, and stays unsure of them. What the extension tells of each sending.
/** What PostPane is told of a sending to a tab that is there (`tab: false`:
 * to none). `rig` changes the browser first; `submits` takes what the page
 * was asked, `waits` the pauses of the sending alone. */
const sending = async (
  answers,
  {
    watched = true,
    dead = false,
    tab = true,
    rig,
    clock = null,
    submits = [],
    waits = [],
  } = {},
) => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const there = {
    id: 7,
    url: `https://chatgpt.com/c/${conversation}`,
    active: false,
    windowId: 1,
  };
  const { listeners, chrome } = load(tab ? [there] : [], {
    posted,
    waits,
    clock,
    watched: watched ? [conversation] : [],
    answers: [...answers],
    dead: new Set(dead ? [7] : []),
    now: true,
  });
  const { sendMessage } = chrome.tabs;
  chrome.tabs.sendMessage = (tabId, message) => {
    if (message.op === "submit") submits.push(message);
    return sendMessage(tabId, message);
  };
  rig?.(chrome, listeners);
  await new Promise((resolve) => setImmediate(resolve));
  if (tab)
    listeners.message(
      { type: "page", conversation, hidden: true, streaming: false },
      { tab: { id: 7 } },
    );
  waits.length = 0;
  await listeners.port({
    type: "send",
    requestId: "r1",
    conversation,
    text: "下一轮",
  });
  const [sent] = posted.filter((m) => m.type === "sent");
  return sent;
};
const unsent = (reason, pressed) => ({ ok: false, reason, pressed });

test("a sending says whether send was pressed, on either try", async () => {
  assert.deepEqual(await sending([unsent("busy", false)]), {
    type: "sent",
    requestId: "r1",
    ...unsent("busy", false),
  });
  const twice = [
    unsent("composer-mismatch", false),
    unsent("composer-mismatch", false),
  ];
  assert.equal((await sending(twice)).pressed, false);
  // Pressed the first time: whatever the second try says, it may have gone.
  const pressedFirst = await sending([
    unsent("send-failed", true),
    unsent("busy", false),
  ]);
  assert.deepEqual(
    [pressedFirst.ok, pressedFirst.reason, pressedFirst.pressed],
    [false, "busy", true],
  );
  const wentSecond = await sending([unsent("send-failed", true), { ok: true }]);
  assert.equal(wentSecond.ok, true);
});

test("a sending never begun is told as not pressed, a tab gone meanwhile as not known", async () => {
  assert.deepEqual(await sending([], { watched: false }), {
    type: "sent",
    requestId: "r1",
    ...unsent("not-watched", false),
  });
  const gone = await sending([], { dead: true });
  assert.equal(gone.reason, "tab-closed");
  assert.equal("pressed" in gone, false);
});

// #466 review P1-01: PostPane waits `SEND_TIME` for word of a sending, and
// what the extension says after that of words never pressed is not heard:
// they would be kept as not known to have gone. So a sending has less than
// that to get to pressing send; out of it, it says so and does not press.
const hostWait = () => {
  const host = readFileSync(
    new URL(
      "../../../crates/platform/src/clients/chatgpt/mod.rs",
      import.meta.url,
    ),
    "utf8",
  );
  const [, seconds] = host.match(
    /pub const SEND_TIME: Duration = Duration::from_secs\((\d+)\);/,
  );
  return seconds * 1000;
};

// The time a sending has to press send. Moved on by just that, the clock
// stands at the very moment it is up: none left (#466 review P2-03).
const pressBy = () => Number(source.match(/const PRESS_BY = (\d+);/)[1]);

test("a sending gives up getting to send before PostPane stops waiting for word", async () => {
  assert.ok(pressBy() <= hostWait() - 5000, `${pressBy()} ms`);
});

test("a tab that does not load in time is told as not pressed, before PostPane stops waiting", async () => {
  const submits = [];
  const waits = [];
  assert.deepEqual(await sending([], { tab: false, submits, waits }), {
    type: "sent",
    requestId: "r1",
    ...unsent("timeout", false),
  });
  assert.deepEqual(submits, [], "the page was never asked to send");
  assert.ok(Math.max(...waits) <= hostWait() - 5000, `${waits}`);
});

const never = () => new Promise(() => {});
const notPressed = unsent("composer-mismatch", false);
const stands = { type: "sent", requestId: "r1", ...notPressed };

test("a sending tells the page by when send must be pressed, and tries no second time past it", async () => {
  // The first try comes back not pressed, out of time: no second one.
  const clock = { now: 1000 };
  const submits = [];
  let fronted = 0;
  const slow = (chrome) => {
    const { sendMessage } = chrome.tabs;
    chrome.tabs.sendMessage = async (tabId, message) => {
      if (message.op === "submit") clock.now += pressBy();
      return sendMessage(tabId, message);
    };
    chrome.tabs.update = async () => void fronted++;
  };
  const sent = await sending([notPressed], { rig: slow, clock, submits });
  assert.deepEqual(sent, stands);
  assert.equal(submits.length, 1);
  assert.equal(fronted, 0, "nor is the tab brought to the front for one");
  const [{ until }] = submits;
  assert.ok(until > 1000 && until <= 1000 + hostWait() - 5000, until);
});

// #466 review P1-02: between the two tries the tab is brought to the front.
// That failing, or taking the time left, the second try is not begun, and
// what the first said of send stands: said as a tab gone, words known not
// to be pressed were kept as not known to have gone.
test("what the first try said of send stands while the second is not begun", async () => {
  // The tab cannot be brought to the front: closed meanwhile.
  const closed = (chrome) => {
    chrome.tabs.update = async () => {
      throw new Error("No tab with id: 7.");
    };
  };
  let submits = [];
  assert.deepEqual(
    await sending([notPressed], { rig: closed, submits }),
    stands,
  );
  assert.equal(submits.length, 1);
  // Pressed the first time: that stands as well.
  const pressed = await sending([unsent("send-failed", true)], { rig: closed });
  assert.deepEqual([pressed.reason, pressed.pressed], ["send-failed", true]);
  // The browser refuses outright, not by a promise.
  const refused = (chrome) => {
    chrome.tabs.update = () => {
      throw new Error("Tabs cannot be edited right now.");
    };
  };
  submits = [];
  assert.deepEqual(
    await sending([notPressed], { rig: refused, submits }),
    stands,
  );
  assert.equal(submits.length, 1);
  // Bringing it to the front takes longer than the sending has.
  const hung = (chrome) => {
    chrome.tabs.update = never;
  };
  submits = [];
  const waits = [];
  assert.deepEqual(
    await sending([notPressed], { rig: hung, submits, waits }),
    stands,
  );
  assert.equal(submits.length, 1);
  assert.ok(Math.max(...waits) <= hostWait() - 5000, `${waits}`);
  // In front, but out of time by then.
  const clock = { now: 1000 };
  const slow = (chrome) => {
    chrome.tabs.update = async () => {
      clock.now += pressBy();
    };
  };
  submits = [];
  assert.deepEqual(
    await sending([notPressed], { rig: slow, clock, submits }),
    stands,
  );
  assert.equal(submits.length, 1);
});

test("a second try gone out with no word back is not known to have pressed", async () => {
  const lost = (chrome) => {
    const { sendMessage } = chrome.tabs;
    let submits = 0;
    chrome.tabs.sendMessage = async (tabId, message) => {
      if (message.op === "submit" && ++submits === 2)
        throw new Error(
          "The message port closed before a response was received.",
        );
      return sendMessage(tabId, message);
    };
  };
  const sent = await sending([notPressed], { rig: lost });
  assert.equal(sent.reason, "tab-closed");
  assert.equal("pressed" in sent, false);
});

test("a tab that is not made, or not put in its group, in time is told as not pressed", async () => {
  const none = { type: "sent", requestId: "r1", ...unsent("timeout", false) };
  for (const rig of [
    (chrome) => (chrome.tabs.create = never),
    (chrome) =>
      (chrome.tabs.create = async () => {
        throw new Error("Tabs cannot be edited right now.");
      }),
    (chrome) =>
      (chrome.tabs.create = () => {
        throw new Error("Tabs cannot be edited right now.");
      }),
    // Grouping asks for the tab first.
    (chrome) => (chrome.tabs.get = never),
    // Not grouped in time, with the page there by then: still not asked.
    (chrome, listeners) => {
      chrome.tabs.get = never;
      const { create } = chrome.tabs;
      chrome.tabs.create = async (options) => {
        const made = await create(options);
        const conversation = options.url.split("/c/")[1];
        listeners.message(
          { type: "page", conversation, hidden: true, streaming: false },
          { tab: { id: made.id } },
        );
        return made;
      };
    },
  ]) {
    const submits = [];
    const waits = [];
    assert.deepEqual(
      await sending([], { tab: false, rig, submits, waits }),
      none,
    );
    assert.deepEqual(submits, [], "the page was never asked to send");
    assert.ok(Math.max(...waits) <= hostWait() - 5000, `${waits}`);
  }
});

// #466 review P1-03: what two failed tries say of send is put together.
// Not pressed only when both say so; a try that does not say (the page threw,
// or no word came back) may have pressed, and one "not pressed" beside it
// would let the same words go a second time.
test("two failed tries say not pressed only when both do", async () => {
  const threw = { ok: false, reason: "send-failed", detail: "Error: x" };
  const unknownFirst = await sending([threw, unsent("busy", false)]);
  assert.equal(unknownFirst.reason, "busy");
  assert.equal("pressed" in unknownFirst, false);
  const unknownSecond = await sending([notPressed, threw]);
  assert.equal(unknownSecond.reason, "send-failed");
  assert.equal("pressed" in unknownSecond, false);
  const both = await sending([notPressed, unsent("busy", false)]);
  assert.equal(both.pressed, false);
  // Pressed on the second: pressed, whatever the first said.
  for (const first of [notPressed, threw]) {
    const pressedSecond = await sending([first, unsent("send-failed", true)]);
    assert.equal(pressedSecond.pressed, true);
  }
  // Pressed the first time, no word back of the second: pressed all the same.
  const lost = (chrome) => {
    const { sendMessage } = chrome.tabs;
    let submits = 0;
    chrome.tabs.sendMessage = async (tabId, message) => {
      if (message.op === "submit" && ++submits === 2)
        throw new Error(
          "The message port closed before a response was received.",
        );
      return sendMessage(tabId, message);
    };
  };
  const pressedThenLost = await sending([unsent("send-failed", true)], {
    rig: lost,
  });
  assert.deepEqual(
    [pressedThenLost.reason, pressedThenLost.pressed],
    ["tab-closed", true],
  );
});

// --- #488: the shadow read of ChatGPT's own data ------------------------------

const SHADOWED = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
// Prompts and replies are named by UUIDs, as ChatGPT's are.
const P = (n) => `0b1c2d3e-0000-4000-8000-${String(n).padStart(12, "0")}`;
const M = (n) => `0b1c2d3e-0000-4000-9000-${String(n).padStart(12, "0")}`;
const OTHER = "6af7ec47-c0f4-83ee-9b9e-bf518660aaaa";
const tick = () => new Promise((resolve) => setImmediate(resolve));
const settle = async () => {
  for (let i = 0; i < 10; i++) await tick();
};

/** Background with tabs 2 and 3 showing two watched conversations. */
async function shadowed(options = {}) {
  const tabs = [
    { id: 2, url: `https://chatgpt.com/c/${SHADOWED}`, windowId: 1 },
    { id: 3, url: `https://chatgpt.com/c/${OTHER}`, windowId: 1 },
    ...(options.more ?? []),
  ];
  const kit = {
    asked: [],
    sent: [],
    posted: [],
    registered: [],
    waits: [],
    stored: {},
    called: [],
    unreachable: new Set(),
    docs: {},
    faults: {},
    ...options,
  };
  delete kit.more;
  const loaded = load(tabs, { watched: [SHADOWED, OTHER], now: true, ...kit });
  for (const [tabId, conversation] of [
    [2, SHADOWED],
    [3, OTHER],
  ])
    loaded.listeners.message(
      { type: "page", conversation, hidden: tabId === 3, streaming: false },
      { tab: { id: tabId } },
    );
  await settle();
  const reads = () =>
    kit.called
      .filter(([, name]) => name === "readInPage")
      .map(([tabId, , args]) => [tabId, ...args]);
  const stopsAsked = () =>
    kit.called
      .filter(([, name]) => name === "stopInPage")
      .map(([tabId]) => tabId);
  const shadows = () =>
    kit.posted.filter((message) => message.type === "shadow");
  const complete = (tabId, conversation, more = {}) =>
    loaded.listeners.message(
      {
        type: "turn",
        phase: "complete",
        conversation,
        promptId: P(1),
        messageId: M(1),
        reply: "abc",
        ...more,
      },
      { tab: { id: tabId } },
    );
  const watch = async (shadow) => {
    await loaded.listeners.port({
      type: "watch",
      conversations: [SHADOWED, OTHER],
      ...(shadow === undefined ? {} : { shadow }),
    });
    await settle();
  };
  return {
    ...loaded,
    ...kit,
    tabs,
    reads,
    stopsAsked,
    shadows,
    complete,
    watch,
  };
}

test("with the shadow switch off, no script is put in pages and nothing is read from the data", async () => {
  const kit = await shadowed();
  await kit.watch();
  kit.complete(2, SHADOWED);
  await kit.listeners.port({ type: "reread", conversation: SHADOWED });
  await settle();
  assert.deepEqual(kit.registered, []);
  assert.deepEqual(kit.injected, []);
  assert.deepEqual(kit.called, []);
  assert.deepEqual(kit.shadows(), []);
  assert.ok(!kit.waits.includes(20000));
});

// #488 review P2-03: on, every chatgpt.com page gets it, the ones open now too.
test("the shadow switch puts data.js in chatgpt.com pages' own world, the ones open now as well", async () => {
  const kit = await shadowed({
    more: [{ id: 4, url: "https://chatgpt.com/c/the-persons-own" }],
  });
  await kit.watch(true);
  await kit.watch(true);
  assert.deepEqual(kit.registered, [
    [
      "on",
      [
        {
          id: "postpane-data",
          js: ["data.js"],
          matches: ["https://chatgpt.com/*"],
          runAt: "document_start",
          world: "MAIN",
        },
      ],
    ],
  ]);
  assert.deepEqual(kit.injected, [
    [2, ["data.js"], "MAIN"],
    [3, ["data.js"], "MAIN"],
    [4, ["data.js"], "MAIN"],
  ]);
  assert.equal(kit.stored.shadow, true);
});

// #488 review P1-02: off, every copy in a page is stopped, and until each is
// known stopped the switch-off is tried again.
test("switched off, data.js is taken out of the pages it is in, and said so", async () => {
  const kit = await shadowed();
  await kit.watch(true);
  await kit.watch();
  assert.deepEqual(kit.registered[1], ["off", ["postpane-data"]]);
  // Stopped, then once what was on its way has ended, stopped again.
  assert.deepEqual(kit.stopsAsked(), [2, 3, 2, 3]);
  assert.equal(kit.stored.shadow, false);
  assert.deepEqual(kit.stored.shadowDisarm.pending, false);
  const said = kit.shadows().at(-1);
  assert.deepEqual(
    [
      said.why,
      said.outcome,
      said.tabs,
      said.stopped,
      said.failed,
      said.unregistered,
    ],
    ["off", "disarmed", 2, 2, 0, true],
  );
  // Off and done: the next lists ask nothing of the pages.
  await kit.watch();
  assert.deepEqual(kit.stopsAsked(), [2, 3, 2, 3]);
});

test("a page it could not reach keeps the switch-off pending, and it is tried again; a discarded one does not", async () => {
  const kit = await shadowed({
    more: [{ id: 5, url: "https://chatgpt.com/", discarded: true }],
  });
  await kit.watch(true);
  kit.unreachable.add(3);
  kit.unreachable.add(5);
  await kit.watch();
  assert.equal(kit.stored.shadowDisarm.pending, true);
  assert.deepEqual(kit.stored.shadowDisarm.failed, [3]);
  assert.equal(kit.shadows().at(-1).outcome, "disarm-pending");
  kit.unreachable.delete(3);
  await kit.watch();
  assert.equal(kit.stored.shadowDisarm.pending, false);
  assert.deepEqual(kit.stopsAsked(), [2, 2, 2, 3, 2, 3]);
  assert.equal(kit.shadows().at(-1).outcome, "disarmed");
});

test("a reply the page reports is read from the data too, once, and told beside the page's", async () => {
  const kit = await shadowed({
    answers: [
      {
        outcome: "read",
        written: true,
        final: { id: M(1), chars: 3, sha: "0123456789abcdef" },
      },
    ],
  });
  await kit.watch(true);
  kit.complete(2, SHADOWED);
  await settle();
  kit.complete(2, SHADOWED);
  // One PostPane does not watch is the person's own chat: never read.
  kit.complete(4, "6af7ec47-c0f4-83ee-9b9e-bf518660bbbb");
  await settle();
  assert.deepEqual(kit.reads(), [[2, SHADOWED, P(1)]]);
  const [told, ...rest] = kit.shadows();
  assert.deepEqual(rest, []);
  const { at, ...record } = told;
  assert.equal(typeof at, "number");
  assert.deepEqual(record, {
    type: "shadow",
    conversation: SHADOWED,
    why: "complete",
    asked: P(1),
    pagePromptId: P(1),
    pageMessageId: M(1),
    pageChars: 3,
    outcome: "read",
    written: true,
    final: { id: M(1), chars: 3, sha: "0123456789abcdef" },
    // Put into this page when switched on, after it loaded: not trusted.
    trusted: false,
  });
  // The next prompt's reply is read again.
  kit.complete(2, SHADOWED, { promptId: P(2), messageId: M(2) });
  await settle();
  assert.equal(kit.reads().length, 2);
});

// #488 review P1-01: what the page says is a summary of known fields, or it
// is not taken: words, other fields or other kinds make it invalid.
test("what a page answers is told only as a summary of known fields", async () => {
  const kit = await shadowed({
    answers: [
      { outcome: "read", written: true, text: "the reply's words" },
      { outcome: "read", final: { id: M(1), sha: "not a sha" } },
      { outcome: "made up" },
      "a string",
    ],
  });
  await kit.watch(true);
  for (const prompt of [P(1), P(2), P(3), P(4)]) {
    kit.complete(2, SHADOWED, { promptId: prompt });
    await settle();
  }
  assert.deepEqual(
    kit
      .shadows()
      .map((told) => [
        told.outcome,
        told.fields,
        "text" in told,
        "final" in told,
      ]),
    [
      ["invalid", ["text"], false, false],
      ["invalid", ["final"], false, false],
      ["invalid", ["outcome"], false, false],
      ["invalid", [], false, false],
    ],
  );
});

test("a read that failed ends the reads of that conversation; a limit or a refusal ends them all", async () => {
  const kit = await shadowed({
    answers: [
      { outcome: "http", status: 500 },
      { outcome: "read" },
      { outcome: "http", status: 429 },
    ],
  });
  await kit.watch(true);
  kit.complete(2, SHADOWED);
  await settle();
  kit.complete(2, SHADOWED, { promptId: P(2) });
  await settle();
  assert.equal(kit.reads().length, 1, "the conversation is not read again");
  kit.complete(3, OTHER);
  await settle();
  kit.complete(3, OTHER, { promptId: P(2) });
  await settle();
  assert.equal(kit.reads().length, 3);
  kit.complete(3, OTHER, { promptId: P(3) });
  await settle();
  assert.equal(kit.reads().length, 3, "after a limit no conversation is read");
  assert.deepEqual(kit.stored.shadowStops, {
    halted: true,
    unread: [SHADOWED],
  });
  assert.deepEqual(
    kit.shadows().map((told) => [told.outcome, told.status ?? null]),
    [
      ["http", 500],
      ["read", null],
      ["http", 429],
    ],
  );
  // Switched off and on again by the person: reads start over.
  await kit.watch();
  await kit.watch(true);
  kit.complete(2, SHADOWED, { promptId: P(4) });
  await settle();
  assert.equal(kit.reads().length, 4);
});

test("a restarted worker goes by what the extension kept: stops still hold, and a switch off still takes data.js out", async () => {
  const kept = {
    shadow: true,
    registered: true,
    shadowStops: { halted: false, unread: [SHADOWED] },
  };
  const off = await shadowed({ stored: { ...kept } });
  await off.watch();
  assert.deepEqual(off.registered, [["off", ["postpane-data"]]]);
  assert.equal(off.stored.shadow, false);
  assert.deepEqual(off.stopsAsked(), [2, 3, 2, 3]);
  const kit = await shadowed({ stored: { ...kept } });
  // Not told the switch yet (PostPane not connected again): nothing is read.
  kit.complete(3, OTHER, { promptId: P(0) });
  await settle();
  assert.deepEqual(kit.reads(), []);
  await kit.watch(true);
  assert.deepEqual(kit.registered, []);
  kit.complete(2, SHADOWED);
  kit.complete(3, OTHER);
  await settle();
  assert.deepEqual(
    kit.reads().map(([tabId]) => tabId),
    [3],
  );
});

// #488 review P1-03: what was read is kept, so a restarted worker hearing the
// same events again reads nothing twice.
test("a restarted worker reads nothing it read before", async () => {
  const first = await shadowed();
  await first.watch(true);
  first.complete(2, SHADOWED);
  await settle();
  assert.equal(first.reads().length, 1);
  const again = await shadowed({
    stored: JSON.parse(JSON.stringify(first.stored)),
  });
  await again.watch(true);
  again.complete(2, SHADOWED);
  await settle();
  assert.deepEqual(again.reads(), []);
  // A new prompt is read.
  again.complete(2, SHADOWED, { promptId: P(2) });
  await settle();
  assert.equal(again.reads().length, 1);
});

test("reading again, and words sent, are read from the data too: once the page was asked, and 20 s after sending", async () => {
  const kit = await shadowed({
    answers: [
      { ok: true, streaming: false, told: false, loaded: true },
      { ok: true, promptId: P(9) },
      { outcome: "read", written: false },
      { outcome: "read", written: true },
    ],
  });
  await kit.watch(true);
  // Before any prompt is known, reading again reads nothing and says so.
  await kit.listeners.port({ type: "reread", conversation: SHADOWED });
  await settle();
  assert.deepEqual(kit.reads(), []);
  const first = kit.shadows()[0];
  assert.deepEqual(
    [first.why, first.outcome, first.pageOutcome],
    ["reread", "no-prompt", "waiting"],
  );
  await kit.listeners.port({
    type: "send",
    requestId: "r1",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  assert.ok(kit.waits.includes(20000));
  assert.deepEqual(kit.reads().at(-1), [2, SHADOWED, P(9)]);
  assert.equal(kit.shadows().at(-1).why, "writing");
  // Read again later for the same prompt: read, once.
  kit.asked.length = 0;
  kit.answers?.push?.({ ok: true, streaming: false, told: true, loaded: true });
  await kit.listeners.port({ type: "reread", conversation: SHADOWED });
  await settle();
  assert.equal(kit.reads().length, 2);
  assert.deepEqual(kit.reads().at(-1), [2, SHADOWED, P(9)]);
  // A reply the page reports names its own prompt: that one is read, not the
  // one PostPane's words became before it (the person asked on by hand).
  kit.complete(2, SHADOWED, { promptId: P(10), messageId: M(10) });
  await settle();
  assert.deepEqual(kit.reads().at(-1), [2, SHADOWED, P(10)]);
});

test("words whose prompt is not known are not read 20 s later, and that is said", async () => {
  const kit = await shadowed({ answers: [{ ok: true }] });
  await kit.watch(true);
  await kit.listeners.port({
    type: "send",
    requestId: "r1",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  assert.deepEqual(kit.reads(), []);
  assert.deepEqual(
    [kit.shadows().at(-1).why, kit.shadows().at(-1).outcome],
    ["writing", "no-prompt"],
  );
});

test("a page open from before data.js came gets it put in, and says it had none", async () => {
  const kit = await shadowed({ answers: [{ outcome: "no-script" }] });
  await kit.watch(true);
  kit.injected.length = 0;
  kit.complete(2, SHADOWED);
  await settle();
  assert.deepEqual(kit.injected, [[2, ["data.js"], "MAIN"]]);
  assert.equal(kit.reads().length, 1);
  assert.equal(kit.shadows()[0].outcome, "no-script");
});

// #488 review P1-01: only a page data.js went into as it loaded is trusted;
// one it was put into after it loaded is not, and from one that held the
// handle already nothing is taken.
test("what a page read says is trusted only of a page data.js went into as it loaded", async () => {
  const kit = await shadowed({
    installs: { 3: "present" },
    answers: [
      { outcome: "read", written: true },
      { outcome: "read", written: true, asked: P(1) },
      { outcome: "read", written: true },
    ],
  });
  await kit.watch(true);
  assert.deepEqual(kit.stored.shadowDocs, {
    "doc-2": "late",
    "doc-3": "conflict",
  });
  kit.complete(2, SHADOWED);
  kit.complete(3, OTHER);
  await settle();
  // The page in tab 2 loads again: data.js goes in as it loads.
  kit.docs[2] = "doc-2-again";
  kit.complete(2, SHADOWED, { promptId: P(2) });
  await settle();
  assert.deepEqual(
    kit
      .shadows()
      .map((told) => [told.conversation, told.outcome, told.trusted]),
    [
      [SHADOWED, "read", false],
      [OTHER, "conflict", undefined],
      [SHADOWED, "read", true],
    ],
  );
  // A worker started again still knows which pages are not trusted.
  const again = await shadowed({
    stored: { ...kit.stored },
    docs: { 2: "doc-2-again" },
  });
  await again.watch(true);
  again.complete(2, SHADOWED, { promptId: P(5) });
  await settle();
  assert.equal(again.shadows()[0].trusted, true);
  again.docs[2] = "doc-2";
  again.complete(2, SHADOWED, { promptId: P(6) });
  await settle();
  assert.equal(again.shadows()[1].trusted, false);
});

// #488 review P1-02: switched off while a read is on its way, the switch-off
// waits for it, nothing is put in after, and what it found is not told.
test("switched off while a read is on its way: it is waited for, superseded, and puts nothing in", async () => {
  let letGo;
  const held = new Promise((resolve) => (letGo = resolve));
  const kit = await shadowed({
    gate: () => held,
    answers: [{ outcome: "no-script" }],
  });
  await kit.watch(true);
  kit.injected.length = 0;
  kit.complete(2, SHADOWED);
  await settle();
  assert.equal(kit.reads().length, 1);
  const off = kit.watch();
  await settle();
  // The switch-off stopped the pages once and waits for the read.
  assert.deepEqual(kit.stopsAsked(), [2, 3]);
  assert.ok(!kit.shadows().some((told) => told.why === "off"));
  letGo();
  await off;
  await settle();
  assert.deepEqual(kit.injected, [], "nothing put in after the switch-off");
  assert.deepEqual(kit.stopsAsked(), [2, 3, 2, 3]);
  assert.deepEqual(
    kit.shadows().map((told) => [told.why, told.outcome]),
    [
      ["complete", "superseded"],
      ["off", "disarmed"],
    ],
  );
});

// #488 review P1-03: what was read not known, nothing is read.
test("what was read cannot be restored: nothing is read, and nothing kept is written over", async () => {
  const kit = await shadowed({
    faults: { restore: true },
    stored: { shadowLedger: { kept: ["complete"] } },
  });
  await kit.watch(true);
  assert.deepEqual(kit.injected, [], "nothing put into pages either");
  kit.complete(2, SHADOWED);
  await kit.listeners.port({
    type: "send",
    requestId: "r1",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  assert.deepEqual(kit.reads(), []);
  assert.deepEqual(
    kit.shadows().map((told) => told.outcome),
    ["ledger-unavailable"],
  );
  assert.deepEqual(kit.stored.shadowLedger, { kept: ["complete"] });
  assert.equal(kit.stored.shadowArm.pending, true);
});

test("the same event twice at once reads once; a late reply of an earlier prompt has its own reads and changes nothing", async () => {
  const kit = await shadowed({
    answers: [{ outcome: "read" }, { ok: true, promptId: P(2) }],
  });
  await kit.watch(true);
  kit.complete(2, SHADOWED);
  kit.complete(2, SHADOWED);
  await settle();
  assert.deepEqual(kit.reads(), [[2, SHADOWED, P(1)]]);
  // Words went out, and became P(2); P(1)'s reply is told again, late.
  await kit.listeners.port({
    type: "send",
    requestId: "r1",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  kit.complete(2, SHADOWED, { promptId: P(1) });
  await kit.listeners.port({ type: "reread", conversation: SHADOWED });
  await settle();
  assert.deepEqual(
    kit
      .shadows()
      .map((told) => [told.why, told.asked])
      .filter(([why]) => why !== "writing"),
    [
      ["complete", P(1)],
      ["reread", P(2)],
    ],
  );
});

// #488 review P2-05: the read 20 s after words went out is of their prompt.
test("words sent twice within 20 s: each prompt is read 20 s after its own words", async () => {
  const kit = await shadowed({
    answers: [
      { ok: true, promptId: P(1) },
      { ok: true, promptId: P(2) },
    ],
  });
  await kit.watch(true);
  const send = (requestId) =>
    kit.listeners.port({
      type: "send",
      requestId,
      conversation: SHADOWED,
      text: "words",
    });
  await send("r1");
  await send("r2");
  await settle();
  assert.deepEqual(
    kit
      .shadows()
      .filter((told) => told.why === "writing")
      .map((told) => told.asked),
    [P(1), P(2)],
  );
  assert.deepEqual(
    kit.reads().map(([, , promptId]) => promptId),
    [P(1), P(2)],
  );
});

// #488 review P2-03: a page data.js could not go into, or a registering that
// failed, is tried again with each list, after a restart as well.
test("switched on, a page it could not go into and a failed registering are tried again", async () => {
  const kit = await shadowed({
    more: [{ id: 5, url: "https://chatgpt.com/", discarded: true }],
    faults: { register: true },
  });
  kit.unreachable.add(3);
  kit.unreachable.add(5);
  await kit.watch(true);
  assert.deepEqual(kit.stored.shadowArm.failed, [3]);
  assert.equal(kit.stored.shadowArm.registered, false);
  assert.equal(kit.stored.shadowArm.pending, true);
  kit.unreachable.delete(3);
  kit.faults.register = false;
  kit.injected.length = 0;
  const again = await shadowed({
    stored: { ...kit.stored },
    more: [{ id: 5, url: "https://chatgpt.com/", discarded: true }],
  });
  await again.watch(true);
  assert.deepEqual(again.injected, [[3, ["data.js"], "MAIN"]]);
  assert.equal(again.stored.shadowArm.pending, false);
  assert.equal(again.registered.length, 1);
  await again.watch(true);
  assert.equal(again.injected.length, 1, "nothing left to put in");
});

// #488 review: ids are UUIDs, kinds are data.js's words, and a prompt found
// is the one asked for.
test("a summary takes UUIDs, data.js's words for a message's kinds, and only the prompt asked", async () => {
  const data = {};
  vm.runInNewContext(
    readFileSync(new URL("../data.js", import.meta.url), "utf8"),
    data,
  );
  const { KINDS } = data.PostPaneData;
  const lastOf = (field, value) => ({
    outcome: "read",
    last: { [field]: value },
  });
  const known = Object.entries(KINDS)
    .filter(([field]) => field !== "finish")
    .flatMap(([field, words]) =>
      [...words, "other"].map((word) => lastOf(field, word)),
    );
  const finishes = [...KINDS.finish, "other"].map((finish) => ({
    outcome: "read",
    final: { id: M(1), finish },
  }));
  const wrong = [
    lastOf("status", "token_abc"),
    { outcome: "read", final: { id: "m1" } },
    { outcome: "read", asked: P(9) },
    { outcome: "read", askFound: true, prompt: P(2) },
    { outcome: "read", asyncStatus: "token_abc" },
  ];
  const all = [...known, ...finishes, ...wrong];
  const kit = await shadowed({ answers: [...all] });
  await kit.watch(true);
  for (let n = 0; n < all.length; n++) {
    kit.complete(2, SHADOWED, { promptId: P(1000 + n) });
    await settle();
  }
  const outcomes = kit.shadows().map((told) => told.outcome);
  assert.deepEqual(
    outcomes,
    all.map((_, n) => (n < all.length - wrong.length ? "read" : "invalid")),
  );
  assert.deepEqual(
    kit
      .shadows()
      .slice(-wrong.length)
      .map((told) => told.fields),
    [["last"], ["final"], ["asked"], ["askFound"], ["asyncStatus"]],
  );
});
