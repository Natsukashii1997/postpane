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

test("a sending gives up getting to send before PostPane stops waiting for word", async () => {
  const [, pressBy] = source.match(/const PRESS_BY = (\d+);/) ?? [];
  assert.ok(pressBy, "the time a sending has to press send");
  assert.ok(Number(pressBy) <= hostWait() - 5000, `${pressBy} ms`);
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
      if (message.op === "submit") clock.now += hostWait();
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
      clock.now += hostWait();
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
