// Runs background.js in a sandbox with a stubbed extension API.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { createHash } from "node:crypto";

const source = readFileSync(
  new URL("../background.js", import.meta.url),
  "utf8",
);

// A token as data.js makes one.
const TOKEN = "0123456789abcdef0123456789abcdef";

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
    // The token mark.js kept in a document as it loaded, by document: by
    // default one only in a document loaded again since the test began
    // (`doc-2-…`), none in the first one of each tab, open from before; and
    // what a page's handle answers to prove it (by default, rightly).
    marks = {},
    proofs = {},
    sendGates = [],
    // The reads due 20 s after words went out, held for the test to run.
    held = null,
    // #507: the tabs loaded again, and what a loading again does; tabs
    // whose page says nothing and takes no script in time (frozen, busy:
    // what they are asked stays unanswered); the conversation a page says
    // it shows, when not its address's; what making a tab does.
    reloaded = [],
    onReload = null,
    hung = new Set(),
    shows = {},
    onCreate = null,
    // Waits of these lengths do not end, though `now`: what is waited for
    // comes first, or never.
    parked = [],
    // #542: the tab groups, the tabs closed, and what each tab's page says
    // asked whether it may be closed (unanswered when not named).
    groups = [],
    removed = [],
    closable = {},
    // Round 4, P1-06: what a tab's page says asked whether it shows the
    // words it was opened with; by default, that it does when it shows the
    // conversation asked of.
    opened = {},
  } = {},
) {
  const listeners = {};
  const injected = [];
  const gets = {};
  const event = (name) => ({ addListener: (fn) => (listeners[name] = fn) });
  // As Chrome: a tab made active is told to each listener, with its window.
  const activated = new Set();
  const activate = (tabId) => {
    const tab = tabs.find((tab) => tab.id === tabId);
    for (const other of tabs)
      if (other.windowId === tab?.windowId) other.active = other.id === tabId;
    for (const fn of activated) fn({ tabId, windowId: tab?.windowId });
  };
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
      // #542: what lives as long as the browser does.
      session: (() => {
        const kept = {};
        return {
          get: async () => JSON.parse(JSON.stringify(kept)),
          set: async (values) =>
            Object.assign(kept, JSON.parse(JSON.stringify(values))),
        };
      })(),
      local: {
        get: async (keys) => {
          if (faults.restore && [keys].flat().includes("shadowLedger"))
            throw new Error("storage unavailable");
          // What a switching reads of the switch, held back by the test.
          if (faults.switchGate && [keys].flat().includes("shadowArm"))
            await faults.switchGate();
          return { watched, ...stored };
        },
        set: async (values) => {
          // What a switching writes of the switch, held back by the test.
          if (faults.writeGate && "shadowStops" in values)
            await faults.writeGate();
          Object.assign(stored, JSON.parse(JSON.stringify(values)));
        },
      },
    },
    tabs: {
      query: async () => {
        if (faults.query) throw new Error("No tabs");
        return tabs;
      },
      // As Chrome: a tab that is not there throws.
      get: async (tabId) => {
        // #542 round 3: Chrome failing once to say, for a tab that is there;
        // `getAt`: at that call for the tab, counted from 1.
        gets[tabId] = (gets[tabId] ?? 0) + 1;
        if (
          faults.getOnce?.delete(tabId) ||
          faults.getAt?.[tabId] === gets[tabId]
        )
          throw new Error("Tabs cannot be queried right now.");
        const tab = tabs.find((tab) => tab.id === tabId);
        if (!tab) throw new Error(`No tab with id: ${tabId}.`);
        return tab;
      },
      create: async ({ url }) => {
        const tab = { id: 99, url, active: false, windowId: 1 };
        tabs.push(tab);
        onCreate?.(tab);
        return tab;
      },
      update: async (tabId, { active }) => {
        fronted.push(tabId);
        if (active) activate(tabId);
      },
      remove: async (tabId) => {
        const at = tabs.findIndex((tab) => tab.id === tabId);
        if (at < 0) throw new Error(`No tab with id: ${tabId}.`);
        tabs.splice(at, 1);
        removed.push(tabId);
      },
      onActivated: {
        addListener: (fn) => activated.add(fn),
        removeListener: (fn) => activated.delete(fn),
      },
      // The person making a tab active, for the tests.
      activate,
      reload: async (tabId) => {
        if (!tabs.some((tab) => tab.id === tabId)) throw new Error("No tab");
        reloaded.push(tabId);
        dead.delete(tabId);
        onReload?.(tabId);
      },
      sendMessage: async (tabId, message) => {
        if (message.op === "state") return null;
        if (hung.has(tabId)) return new Promise(() => {});
        // #542: whether the page may be closed; a page that does not know
        // the question (an older script) answers nothing.
        if (message.op === "closable") {
          asked.push([tabId, message.op]);
          if (dead.has(tabId)) throw new Error("Receiving end does not exist.");
          return closable[tabId];
        }
        if (message.op === "opened") {
          asked.push([tabId, message.op]);
          if (tabId in opened) return opened[tabId];
          const tab = tabs.find((tab) => tab.id === tabId);
          const shown = tab?.url?.split("/c/")[1] ?? null;
          return { conversation: shown, ours: shown === message.conversation };
        }
        // #507: whether the page is there, and which conversation it shows.
        if (message.op === "alive") {
          if (dead.has(tabId)) throw new Error("Receiving end does not exist.");
          if (tabId in shows) return { conversation: shows[tabId] };
          const tab = tabs.find((tab) => tab.id === tabId);
          return { conversation: tab?.url?.split("/c/")[1] ?? null };
        }
        asked.push([tabId, message.op]);
        sent.push([tabId, JSON.parse(JSON.stringify(message))]);
        if (dead.has(tabId)) throw new Error("Receiving end does not exist.");
        const answer = answers.shift() ?? { ok: true };
        // #509 round 1 P1-03: a page that says it may loads itself again.
        if (message.op === "reload" && answer === true) {
          reloaded.push(tabId);
          setImmediate(() => onReload?.(tabId));
        }
        // A sending the test holds back answers once let go.
        if (message.op === "submit" && sendGates.length)
          await sendGates.shift()();
        return answer;
      },
      onRemoved: event("removed"),
      onReplaced: event("replaced"),
      onUpdated: event("updated"),
    },
    windows: {
      get: async (id) => windows[id] ?? { state: "normal", focused: true },
    },
    tabGroups: {
      query: async ({ title }) => {
        if (faults.groups) throw new Error("No groups");
        return groups.filter((g) => g.title === title);
      },
    },
    scripting: {
      // As Chrome: a script already registered, or not registered, throws.
      registerContentScripts: async (scripts) => {
        if (faults.register) throw new Error("Could not register");
        if (faults.registerGate) await faults.registerGate();
        if (stored.registered) throw new Error("Duplicate script ID");
        stored.registered = true;
        registered.push(["on", JSON.parse(JSON.stringify(scripts))]);
      },
      unregisterContentScripts: async ({ ids }) => {
        if (faults.unregister) throw new Error("Could not unregister");
        if (faults.unregisterGate) await faults.unregisterGate();
        if (!stored.registered) throw new Error("Nonexistent script ID");
        stored.registered = false;
        registered.push(["off", [...ids]]);
      },
      getRegisteredContentScripts: async () =>
        stored.registered
          ? [{ id: "postpane-data" }, { id: "postpane-mark" }]
          : [],
      executeScript: async ({ target, files, world, func, args }) => {
        // A function run in the page (#488): what the page in that tab
        // answers. `unreachable` tabs take no script at all.
        if (unreachable.has(target.tabId)) throw new Error("Cannot access");
        if (hung.has(target.tabId) && files) return new Promise(() => {});
        const documentId = docs[target.tabId] ?? `doc-${target.tabId}`;
        const tokenOf = (documentId) =>
          documentId in marks
            ? marks[documentId]
            : documentId !== `doc-${target.tabId}`
              ? TOKEN
              : null;
        if (func?.name === "loadedWithData") {
          called.push([
            target.tabId,
            "loadedWithData",
            [...(target.documentIds ?? []), world ?? "ISOLATED"],
          ]);
          const marked = tokenOf(documentId);
          if (faults.noDocumentId) return [{ result: marked }];
          return [{ documentId, result: marked }];
        }
        if (func?.name === "proveInPage") {
          called.push([target.tabId, "proveInPage", [world]]);
          const token = tokenOf(documentId);
          const proof =
            documentId in proofs
              ? proofs[documentId]
              : token &&
                createHash("sha256")
                  .update(`${token}:${args[0]}`)
                  .digest("hex");
          return [{ documentId, result: proof }];
        }
        if (faults.noDocumentId && func?.name === "readInPage") {
          called.push([target.tabId, func.name, [...args]]);
          return [{ result: answers.shift() ?? { outcome: "read" } }];
        }
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
      if (held && ms === 20000) return held.push(fn);
      if (now && !parked.includes(ms)) setImmediate(fn);
      return 0;
    },
    clearTimeout() {},
    crypto: globalThis.crypto,
    TextEncoder,
    URL,
    // `clock`: the time the script reads, moved by the test.
    ...(clock && { Date: { now: () => clock.now } }),
  });
  return { listeners, injected, chrome };
}

test("installing or reloading the extension puts the scripts into chatgpt.com tabs already open", async () => {
  // Chrome gives those tabs no content script of their own (#206); a tab
  // that refuses one does not stop the rest, nor one whose script is not
  // done being put in (a frozen tab's, #507 review P1-02).
  const { listeners, injected } = load([{ id: 3 }, { id: 1 }, { id: 2 }], {
    hung: new Set([3]),
    now: true,
  });
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
  // Asked whether it is there, it says nothing; with the script, it does,
  // and is read.
  assert.deepEqual(asked, [[2, "reread"]]);
  assert.deepEqual(injected, [[2, ["page.js", "content.js"]]]);
  // One not on the watch list is not read.
  await listeners.port({ type: "reread", conversation: "other" });
  assert.equal(asked.length, 1);
});

// #507: 2026-11-21 a discarded tab was read 128 times, two minutes apart,
// each `unreachable`: it takes no script, and nothing loaded it again.
test("reading again loads a tab again that Chrome unloaded", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const asked = [];
  const posted = [];
  const reloaded = [];
  const tabs = [
    {
      id: 2,
      url: `https://chatgpt.com/c/${conversation}`,
      status: "unloaded",
    },
  ];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const { listeners } = load(tabs, {
    asked,
    posted,
    reloaded,
    dead: new Set([2]),
    unreachable: new Set([2]),
    watched: [conversation],
    answers: [{ ok: true, told: true, loaded: true }],
    now: true,
    onReload: (tabId) => listeners.message(page, { tab: { id: tabId } }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.port({ type: "reread", conversation });
  assert.deepEqual(reloaded, [2]);
  const [found] = posted.filter((m) => m.type === "reread");
  assert.equal(found.outcome, "told");
  assert.equal(found.reloaded, true);
  // Loaded again and still nothing: said so, and not loaded a second time.
  const still = load(tabs, {
    posted,
    reloaded,
    dead: new Set([2]),
    unreachable: new Set([2]),
    watched: [conversation],
    now: true,
  });
  posted.length = reloaded.length = 0;
  still.chrome.tabs.reload = async (tabId) => void reloaded.push(tabId);
  await new Promise((resolve) => setImmediate(resolve));
  await still.listeners.port({ type: "reread", conversation });
  assert.deepEqual(reloaded, [2]);
  assert.equal(posted.find((m) => m.type === "reread").outcome, "unreachable");
});

// #507 review P1-01, P1-02: a page that says nothing may be writing the very
// answer waited for; loading it again would end that. It is left as it is,
// and the conversation read in a tab made for it. A script that is not done
// being put in (a frozen tab's) does not hold the read up.
test("reading again leaves an unresponsive tab alone and does not make another", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const posted = [];
  const reloaded = [];
  const asked = [];
  const tabs = [{ id: 2, url: `https://chatgpt.com/c/${conversation}` }];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const { listeners } = load(tabs, {
    posted,
    reloaded,
    asked,
    hung: new Set([2]),
    watched: [conversation],
    answers: [{ ok: true, told: true, loaded: true }],
    now: true,
    onCreate: (tab) => setImmediate(() => listeners.message(page, { tab })),
  });
  await new Promise((resolve) => setImmediate(resolve));
  listeners.message(page, { tab: { id: 2 } });
  await listeners.port({ type: "reread", conversation });
  assert.deepEqual(reloaded, []);
  assert.deepEqual(asked, []);
  assert.equal(tabs.length, 1, "没有另开标签页");
  const [found] = posted.filter((m) => m.type === "reread");
  assert.equal(found.outcome, "unreachable");
  assert.equal("reloaded" in found, false);
});

// #507 review P2-01: the tab loaded again is the one read, and the one asked
// after; a listed tab that is gone is passed over for another showing the
// conversation, which is asked, not loaded again.
test("reading again loads and asks the tab that did not answer, not another showing the conversation", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const url = `https://chatgpt.com/c/${conversation}`;
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const read = async (tabs) => {
    const asked = [];
    const posted = [];
    const reloaded = [];
    const { listeners } = load(tabs, {
      asked,
      posted,
      reloaded,
      dead: new Set([2]),
      unreachable: new Set([2]),
      watched: [conversation],
      answers: [{ ok: true, told: true, loaded: true }],
      now: true,
      onReload: (tabId) => listeners.message(page, { tab: { id: tabId } }),
    });
    await new Promise((resolve) => setImmediate(resolve));
    listeners.message(page, { tab: { id: 2 } });
    await listeners.port({ type: "reread", conversation });
    const [found] = posted.filter((m) => m.type === "reread");
    return { asked, reloaded, outcome: found.outcome };
  };
  const both = await read([
    { id: 5, url },
    { id: 2, url, discarded: true },
  ]);
  assert.deepEqual(both.reloaded, [2]);
  assert.deepEqual(both.asked.at(-1), [2, "reread"]);
  assert.equal(both.outcome, "told");
  const gone = await read([{ id: 5, url }]);
  assert.deepEqual(gone.reloaded, []);
  assert.deepEqual(gone.asked.at(-1), [5, "reread"]);
  assert.equal(gone.outcome, "told");
});

// #507 review P2-01: Chrome may have dropped a tab from the list by the time
// a read finds it gone; and a listed tab may show another conversation by
// now. Either way the read goes on to a tab that does show this one.
test("reading again passes over a tab closed meanwhile, or showing another conversation, for one that shows this", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const url = `https://chatgpt.com/c/${conversation}`;
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const read = async (options, rig) => {
    const asked = [];
    const posted = [];
    const reloaded = [];
    const tabs = [
      { id: 2, url },
      { id: 5, url },
    ];
    const kit = load(tabs, {
      asked,
      posted,
      reloaded,
      watched: [conversation],
      answers: [{ ok: true, told: true, loaded: true }],
      now: true,
      ...options,
    });
    rig?.(kit, tabs);
    await new Promise((resolve) => setImmediate(resolve));
    kit.listeners.message(page, { tab: { id: 2 } });
    await kit.listeners.port({ type: "reread", conversation });
    const [found] = posted.filter((m) => m.type === "reread");
    return { asked, reloaded, outcome: found.outcome };
  };
  // Closed as it is asked whether it is there: `onRemoved` drops it from
  // the list before the read looks for it.
  const closed = await read({}, ({ chrome, listeners }, tabs) => {
    const { sendMessage } = chrome.tabs;
    chrome.tabs.sendMessage = async (tabId, message) => {
      if (tabId !== 2 || message.op !== "alive")
        return sendMessage(tabId, message);
      tabs.splice(
        tabs.findIndex((tab) => tab.id === 2),
        1,
      );
      listeners.removed(2);
      throw new Error("Receiving end does not exist.");
    };
  });
  assert.deepEqual(closed, {
    asked: [[5, "reread"]],
    reloaded: [],
    outcome: "told",
  });
  // Showing another conversation by now, as its page says.
  const moved = await read({ shows: { 2: "another" } });
  assert.deepEqual(moved, {
    asked: [[5, "reread"]],
    reloaded: [],
    outcome: "told",
  });
});

// The same found only as the page is read: not taken for a page still
// waiting on its answer.
test("a page that shows another conversation by the time it is read counts as not reached", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const posted = [];
  const tabs = [{ id: 2, url: `https://chatgpt.com/c/${conversation}` }];
  const { listeners } = load(tabs, {
    posted,
    watched: [conversation],
    answers: [{ ok: false, reason: "other-conversation" }],
    now: true,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await listeners.port({ type: "reread", conversation });
  assert.equal(posted.find((m) => m.type === "reread").outcome, "unreachable");
});

// #509: words never known to have gone in are looked for in a tab of the
// conversation, loaded again so it shows what ChatGPT has; every prompt it
// holds is read: the words begin with a line naming their request. The page
// loads itself again only when it says, at that moment, that it may
// (`stood`: true by default; false when it writes, holds a draft or shows
// another conversation, #509 round 1 P1-03).
const finding = async (
  answers,
  {
    loads = true,
    watched = true,
    stood = true,
    after = "p7",
    // The tab as Chrome has it; its page says nothing and takes no script
    // (`dead`), or neither is done in time (`hung`); a tab made reports.
    tab = {},
    dead = false,
    hung = false,
    makes = false,
  } = {},
) => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const posted = [];
  const reloaded = [];
  const sent = [];
  const tabs = [
    { id: 2, url: `https://chatgpt.com/c/${conversation}`, ...tab },
  ];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const { listeners } = load(tabs, {
    posted,
    reloaded,
    sent,
    answers: [...(dead || hung ? [] : [stood]), ...answers],
    watched: watched ? [conversation] : [],
    dead: new Set(dead ? [2] : []),
    unreachable: new Set(dead ? [2] : []),
    hung: new Set(hung ? [2] : []),
    now: true,
    onReload: (tabId) =>
      loads && listeners.message(page, { tab: { id: tabId } }),
    onCreate: (tab) =>
      makes && setImmediate(() => listeners.message(page, { tab })),
  });
  await new Promise((resolve) => setImmediate(resolve));
  const request = "h1~send5";
  await listeners.port({ type: "find", conversation, request, after });
  const [found] = posted.filter((m) => m.type === "found");
  assert.deepEqual(
    [found.conversation, found.request],
    [conversation, request],
  );
  for (const [, m] of sent.filter(([, m]) => m.op === "asked"))
    assert.deepEqual([m.request, m.after], [request, after]);
  return {
    outcome: found.outcome,
    ...(found.promptId !== undefined && { promptId: found.promptId }),
    reloaded,
    asked: sent
      .filter(([, m]) => ["asked", "reload"].includes(m.op))
      .map(([tabId, m]) => [tabId, m.op]),
  };
};
const shows = (there, more = {}) => ({
  here: true,
  loaded: true,
  there,
  twice: false,
  promptId: there ? "p9" : null,
  anchored: true,
  unreadable: false,
  streaming: false,
  ...more,
});
const RELOAD = [2, "reload"];
const ASKED = [2, "asked"];

test("words looked for are found among the prompts of the tab loaded again, with their prompt's id", async () => {
  const found = await finding([shows(true)]);
  assert.deepEqual(found, {
    outcome: "there",
    promptId: "p9",
    reloaded: [2],
    // The page loads itself again, then is read.
    asked: [RELOAD, ASKED],
  });
});

// #509 round 1 P1-01: Changhao may have asked something after the words.
test("words are absent only when no prompt names them, read twice, past the last prompt known to have gone in", async () => {
  assert.equal((await finding([shows(false), shows(false)])).outcome, "absent");
  // There by the second read: the page was still drawing.
  const late = await finding([shows(false), shows(true)]);
  assert.deepEqual([late.outcome, late.promptId], ["there", "p9"]);
  for (const answers of [
    // An answer being written, at either read.
    [shows(false, { streaming: true }), shows(false)],
    [shows(false), shows(false, { streaming: true })],
    [shows(false), { loaded: false }],
    // The history may not reach back past the words.
    [shows(false, { anchored: false }), shows(false)],
    [shows(false), shows(false, { anchored: false })],
    // A prompt after the last known one shows no words: maybe theirs.
    [shows(false, { unreadable: true }), shows(false)],
    [shows(false), shows(false, { unreadable: true })],
  ])
    assert.equal(
      (await finding(answers)).outcome,
      "unread",
      JSON.stringify(answers),
    );
  // No prompt known to have gone in before them: never absent.
  const unanchored = { after: null };
  assert.equal(
    (await finding([shows(false), shows(false)], unanchored)).outcome,
    "unread",
  );
});

// #509 round 1 P1-02: two prompts naming the request: neither is taken.
test("words named by two prompts are not known", async () => {
  for (const answers of [
    [shows(true, { there: false, twice: true })],
    [shows(false), shows(false, { twice: true })],
  ])
    assert.equal((await finding(answers)).outcome, "unread");
});

test("words looked for in a page that cannot be read are not known", async () => {
  // Its history never drawn, however often asked.
  const undrawn = await finding(Array(8).fill({ loaded: false }));
  assert.equal(undrawn.outcome, "unread");
  // The tab does not load again in time: its page is not asked.
  const unloaded = await finding([shows(false), shows(false)], {
    loads: false,
  });
  assert.deepEqual([unloaded.outcome, unloaded.asked], ["unread", [RELOAD]]);
  // Not a conversation of PostPane's: not read.
  const other = await finding([shows(true)], { watched: false });
  assert.deepEqual([other.outcome, other.reloaded], ["unread", []]);
});

// #507 review P1-01, #509 round 1 P1-03: words not known to have gone in
// often did, and their answer is being written; or Changhao has words in
// hand on the page. Loading the tab again would lose either.
test("words are not looked for by loading again a page that writes, holds a draft, or does not say", async () => {
  // The page says it may not be loaded again (it writes, holds a draft, or
  // shows another conversation by now).
  const refused = await finding([shows(true)], { stood: false });
  assert.deepEqual(refused, {
    outcome: "unread",
    reloaded: [],
    asked: [RELOAD],
  });
  // It says nothing, and takes no script in time: left as it is, and the
  // words looked for in a tab made for the conversation.
  const silent = await finding([shows(true)], { hung: true, makes: true });
  assert.deepEqual(silent, {
    outcome: "there",
    promptId: "p9",
    reloaded: [],
    asked: [[99, "asked"]],
  });
  // A tab Chrome discarded runs no page: loaded again, and read once.
  const discarded = await finding([shows(true)], {
    dead: true,
    tab: { discarded: true },
  });
  assert.deepEqual(discarded, {
    outcome: "there",
    promptId: "p9",
    reloaded: [2],
    asked: [ASKED],
  });
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

// Round 4 review P1-04: PostPane forgets an answer being written when it
// starts again, and so does a worker; each tab writing says so again.
test("a tab writing when PostPane or the worker starts again tells a beginning", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const tabs = [
    { id: 2, url: `https://chatgpt.com/c/${conversation}` },
    {
      id: 3,
      url: "https://chatgpt.com/c/6af7ec47-c0f4-83ee-9b9e-000000000003",
    },
  ];
  const posted = [];
  const { chrome, listeners } = load(tabs, { posted, now: true });
  chrome.tabs.sendMessage = async (tabId, message) =>
    message.op === "state"
      ? {
          conversation: tabs
            .find((tab) => tab.id === tabId)
            .url.split("/c/")[1],
          streaming: tabId === 2,
          hidden: true,
          title: "审核",
          // The newest prompt on the page; the one being answered is
          // `writingFor`, when drawn (round 5 review P1-04).
          promptId: `old${tabId}`,
          writingFor: `p${tabId}`,
        }
      : null;
  for (let ticks = 0; ticks < 10; ticks++) await tick();
  const starts = () =>
    posted.filter((m) => m.type === "turn" && m.phase === "start");
  assert.deepEqual(
    starts().map((m) => [m.conversation, m.promptId, m.again, m.tab]),
    [[conversation, "p2", true, 2]],
  );
  // PostPane starts again: the port is made anew, and each says again.
  posted.length = 0;
  listeners.gone();
  for (let ticks = 0; ticks < 10; ticks++) await tick();
  assert.equal(starts().length, 1);
  // What a tab tells goes on with which tab told it (round 5 review P1-04).
  posted.length = 0;
  listeners.message(
    { type: "turn", phase: "start", conversation, promptId: null },
    { tab: { id: 7 } },
  );
  assert.equal(starts()[0].tab, 7);
});

// Review P2-04: what Chrome says of a tab is not waited on without end.
test("Chrome not saying how a tab stands, or not putting it in front, does not hold a read", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const tabs = [
    { id: 2, url: `https://chatgpt.com/c/${conversation}`, windowId: 1 },
    { id: 3, url: "https://chatgpt.com/", windowId: 1, active: true },
  ];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const read = async (answer, rig) => {
    tabs[0].active = false;
    tabs[1].active = true;
    const posted = [];
    const fronted = [];
    const { listeners, chrome } = load(tabs, {
      posted,
      fronted,
      watched: [conversation],
      answers: Array(5).fill(answer),
      now: true,
    });
    await tick();
    listeners.message(page, { tab: { id: 2 } });
    rig(chrome);
    await listeners.port({ type: "reread", conversation });
    return { found: posted.find((m) => m.type === "reread"), fronted };
  };
  const told = { ok: true, told: true, loaded: true };
  const stood = await read(told, (chrome) => {
    chrome.tabs.get = never;
    chrome.windows.get = never;
  });
  assert.equal(stood.found.outcome, "told");
  assert.equal(stood.found.active, false);
  // Not known to be in front, it is not read as if it were.
  const undrawn = { ok: true, undrawn: true, loaded: true };
  const unasked = await read(undrawn, (chrome) => (chrome.tabs.query = never));
  assert.equal(unasked.found.outcome, "undrawn");
  assert.deepEqual(unasked.fronted, [], "no tab is put in front");
  // Asked to the front with no word back: not known to be in front, so
  // nothing is moved back (round 4 review P2-05): the person may have moved
  // on meanwhile, and a late move to it is not crossed.
  const late = await read(undrawn, (chrome) => {
    const { update } = chrome.tabs;
    chrome.tabs.update = (tabId, to) =>
      tabId === 2 ? never() : update(tabId, to);
  });
  assert.equal(late.found.outcome, "undrawn");
  assert.equal(late.found.fronted, true);
  assert.deepEqual(late.fronted, []);
});

// Round 4 and 5 review P2-05: the person moved to another tab, window or app
// while the answer was read in front, or came to the window: that stays as
// it is. One in another app all along gets the tab back.
test("a tab put in front for a read is moved back from only while it and its window's focus are as they were", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const tabs = [
    { id: 2, url: `https://chatgpt.com/c/${conversation}`, windowId: 1 },
    { id: 3, url: "https://chatgpt.com/", windowId: 1, active: true },
    { id: 4, url: "https://chatgpt.com/", windowId: 1 },
  ];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const read = async (moves, focus = [true, true], rig = () => {}) => {
    const posted = [];
    const fronted = [];
    tabs.forEach((tab) => (tab.active = tab.id === 3));
    const window = { state: "normal", focused: focus[0] };
    const { listeners, chrome } = load(tabs, {
      windows: { 1: window },
      posted,
      fronted,
      watched: [conversation],
      answers: Array(5).fill({ ok: true, undrawn: true, loaded: true }),
      now: true,
    });
    await tick();
    listeners.message(page, { tab: { id: 2 } });
    const { sendMessage } = chrome.tabs;
    let asks = 0;
    chrome.tabs.sendMessage = async (tabId, message) => {
      // Asked again with the tab in front: the person moves to tab 4.
      if (message.op === "reread" && ++asks === 2) {
        if (moves === true) chrome.tabs.activate(4);
        // To another tab and back to the one read: it is in front again,
        // but the person chose (round 6 review P2-05).
        if (moves === "back")
          (chrome.tabs.activate(4), chrome.tabs.activate(2));
        window.focused = focus[1];
        if (focus[1] === "never") chrome.windows.get = never;
      }
      return sendMessage(tabId, message);
    };
    rig(chrome);
    await listeners.port({ type: "reread", conversation });
    return fronted;
  };
  assert.deepEqual(await read(false), [2, 3], "in front still: moved back");
  assert.deepEqual(await read("back"), [2], "went away and back");
  // Round 6 review P2-05: the person chooses a tab while Chrome is asked
  // whether the window has the focus, before the read or after it (the
  // first ask is how the tab stood, before it is put in front).
  const choosing = (at) => (chrome) => {
    const { get } = chrome.windows;
    let asked = 0;
    chrome.windows.get = async (id) => {
      if (++asked === at) chrome.tabs.activate(4);
      return get(id);
    };
  };
  assert.deepEqual(await read(false, [true, true], choosing(2)), [], "before");
  assert.equal(tabs.find((tab) => tab.active).id, 4);
  assert.deepEqual(await read(false, [true, true], choosing(3)), [2], "after");
  assert.equal(tabs.find((tab) => tab.active).id, 4);
  // Round 7 review P2-05: the person chooses a tab while Chrome is first
  // asked how the tab stands, before anything is watched as it was.
  const choosingAsTabIs = (at) => (chrome) => {
    const { get } = chrome.tabs;
    let asked = 0;
    chrome.tabs.get = async (id) => {
      const answer = await get(id);
      if (id === 2 && ++asked === at) chrome.tabs.activate(4);
      return answer;
    };
  };
  assert.deepEqual(await read(false, [true, true], choosingAsTabIs(2)), []);
  assert.equal(tabs.find((tab) => tab.active).id, 4);
  // ...or while it is being put in front, which Chrome does after: nothing
  // is put back, theirs not either, and it is not read (#518: who made the
  // last move is not guessed; the ChatGPT tab may stay in front).
  const late = (chrome) => {
    const { update } = chrome.tabs;
    chrome.tabs.update = async (id, to) => {
      if (id === 2) chrome.tabs.activate(4);
      return update(id, to);
    };
  };
  assert.deepEqual(await read(false, [true, true], late), [2], "late");
  assert.equal(tabs.find((tab) => tab.active).id, 2);
  assert.deepEqual(await read(true), [2], "the person's choice stays");
  assert.equal(tabs.find((tab) => tab.active).id, 4);
  // The tab in front of its window still, but the person went to another
  // window or app: its window is left as it is now.
  assert.deepEqual(await read(false, [true, false]), [2], "moved away");
  // In another app all along: nothing of the person's moved, it goes back.
  assert.deepEqual(await read(false, [false, false]), [2, 3], "never here");
  // Came to the window meanwhile: they see what they came to.
  assert.deepEqual(await read(false, [false, true]), [2], "came to it");
  // Chrome does not say in time whether the window has the focus.
  assert.deepEqual(await read(false, [true, "never"]), [2], "not known");
});

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
  // refuses tab 1 one): left as it is, with no replacement tab made.
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
    // #507, the tab the conversation is listed in: its script cut off
    // (`dead`); `discarded` by Chrome, so it runs no page and takes no
    // script; `refuses` a script though not discarded (an error page);
    // `frozen`: it says nothing, and a script put in is not done in time.
    dead = false,
    discarded = false,
    refuses = false,
    frozen = false,
    // What Chrome says of the tab beside that, and other tabs open.
    tab = true,
    more = [],
    rig,
    clock = null,
    submits = [],
    waits = [],
    reloaded = [],
    asked = [],
    // #507: loaded again, or made, the tab's page reports (`true`), or
    // never does.
    reloads = false,
    makes = false,
    // The scripts put in on the way, and the tabs made.
    scripts = [],
    made = [],
  } = {},
) => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const there = {
    id: 7,
    url: `https://chatgpt.com/c/${conversation}`,
    active: false,
    windowId: 1,
    ...(discarded && { discarded }),
    ...(typeof tab === "object" && tab),
  };
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const silent = dead || discarded || refuses;
  const { listeners, chrome, injected } = load(
    tab ? [there, ...more] : [...more],
    {
      posted,
      waits,
      clock,
      asked,
      watched: watched ? [conversation] : [],
      answers: [...answers],
      dead: new Set(silent ? [7, there.id] : []),
      unreachable: new Set(discarded || refuses ? [7, there.id] : []),
      hung: new Set([
        ...(frozen ? [7] : []),
        ...more.filter((tab) => tab.hung).map((tab) => tab.id),
      ]),
      now: true,
      reloaded,
      onReload: (tabId) =>
        reloads && listeners.message(page, { tab: { id: tabId } }),
      onCreate: (tab) => {
        made.push(tab.url);
        if (makes) setImmediate(() => listeners.message(page, { tab }));
      },
    },
  );
  const { sendMessage } = chrome.tabs;
  chrome.tabs.sendMessage = (tabId, message) => {
    if (message.op === "submit") submits.push(message);
    return sendMessage(tabId, message);
  };
  rig?.(chrome, listeners);
  await new Promise((resolve) => setImmediate(resolve));
  if (tab) listeners.message(page, { tab: { id: 7 } });
  waits.length = 0;
  await listeners.port({
    type: "send",
    requestId: "r1",
    conversation,
    text: "下一轮",
  });
  scripts.push(...injected);
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
  // Gone once the page was found there: it may have pressed.
  const meanwhile = (chrome) => {
    const { sendMessage } = chrome.tabs;
    chrome.tabs.sendMessage = async (tabId, message) => {
      if (message.op === "submit")
        throw new Error("Receiving end does not exist.");
      return sendMessage(tabId, message);
    };
  };
  const gone = await sending([], { rig: meanwhile });
  assert.equal(gone.reason, "tab-closed");
  assert.equal("pressed" in gone, false);
});

// #507: a tab Chrome discarded is still listed, and does not answer.
// 2026-11-21: words to one came back `tab-closed` in 0.3 s, or not at all,
// and were kept as not known to have gone; the handoff took no words since.
test("a tab Chrome discarded is loaded again, and the words go to it", async () => {
  const submits = [];
  const reloaded = [];
  const made = [];
  const sent = await sending([], {
    discarded: true,
    reloads: true,
    submits,
    reloaded,
    made,
  });
  assert.deepEqual(reloaded, [7]);
  assert.deepEqual(made, [], "no other tab is made for it");
  assert.equal(submits.length, 1, "asked to send once, after it loaded");
  assert.equal(sent.ok, true);
});

// As Chromium 156 does it (2026-11-22, `real-chromium/probe-discard.log`):
// a discarded tab has a new id, and the one it had, still listed, is no
// tab's. The tab is found at its address.
test("a discarded tab listed under the id it had is found at its address and loaded again", async () => {
  const reloaded = [];
  const made = [];
  const asked = [];
  const renamed = (chrome) => {
    const { get } = chrome.tabs;
    chrome.tabs.get = async (tabId) => {
      if (tabId === 7) throw new Error("No tab with id: 7.");
      return get(tabId);
    };
  };
  const sent = await sending([], {
    tab: { id: 8 },
    discarded: true,
    reloads: true,
    rig: renamed,
    reloaded,
    made,
    asked,
  });
  assert.deepEqual(reloaded, [8]);
  assert.deepEqual(made, []);
  assert.deepEqual(asked, [[8, "submit"]]);
  assert.equal(sent.ok, true);
});

test("a discarded tab that does not load again in time is told as not pressed", async () => {
  const submits = [];
  const reloaded = [];
  const waits = [];
  const sent = await sending([], {
    discarded: true,
    submits,
    reloaded,
    waits,
  });
  assert.deepEqual(reloaded, [7]);
  assert.deepEqual(submits, [], "the page was never asked to send");
  assert.deepEqual(sent, {
    type: "sent",
    requestId: "r1",
    ...unsent("timeout", false),
  });
  assert.ok(Math.max(...waits) <= hostWait() - 5000, `${waits}`);
});

test("a listed tab that is gone has one made for its conversation, and none loaded again", async () => {
  const submits = [];
  const reloaded = [];
  const made = [];
  const gone = (chrome) => {
    chrome.tabs.get = async (tabId) => {
      throw new Error(`No tab with id: ${tabId}.`);
    };
    chrome.tabs.query = async () => [];
  };
  const sent = await sending([], {
    dead: true,
    rig: gone,
    submits,
    reloaded,
    made,
  });
  // No page loads in the test: the tab made is told as not pressed.
  assert.deepEqual([sent.reason, sent.pressed], ["timeout", false]);
  assert.deepEqual(submits, []);
  assert.deepEqual(reloaded, []);
  assert.equal(made.length, 1);
});

// #507 review P1-01: no answer in two seconds is not a page gone. Loading a
// tab again ends an answer being written in it, and what the page last said
// of that is not gone by (a restarted worker has not heard it): only a tab
// no page of the conversation runs in is loaded again. Any other that says
// nothing is left as it is, and the words go to another.
const SCRIPTS = [[7, ["page.js", "content.js"]]];

test("a tab cut off from the extension gets a script put in and is asked again, not loaded again", async () => {
  const submits = [];
  const reloaded = [];
  const scripts = [];
  const sent = await sending([], { dead: true, submits, reloaded, scripts });
  assert.deepEqual(scripts, SCRIPTS);
  assert.deepEqual(reloaded, []);
  assert.equal(submits.length, 1);
  assert.equal(sent.ok, true);
});

test("a page slow to say it is there is not loaded again", async () => {
  const submits = [];
  const reloaded = [];
  // Its first answer comes after the time it had; asked again, it answers.
  const slow = (chrome) => {
    const { sendMessage } = chrome.tabs;
    let asked = 0;
    chrome.tabs.sendMessage = async (tabId, message) => {
      if (message.op === "alive" && !asked++)
        for (let rounds = 0; rounds < 5; rounds++) await tick();
      return sendMessage(tabId, message);
    };
  };
  const sent = await sending([], { rig: slow, submits, reloaded });
  assert.deepEqual(reloaded, []);
  assert.equal(submits.length, 1);
  assert.equal(sent.ok, true);
});

test("a tab that says nothing, and takes no script in time, is left as it is: the words go to one made for them", async () => {
  const reloaded = [];
  const made = [];
  const asked = [];
  const sent = await sending([], {
    frozen: true,
    reloads: true,
    makes: true,
    reloaded,
    made,
    asked,
  });
  assert.deepEqual(reloaded, [], "it may be writing an answer");
  assert.equal(made.length, 1);
  assert.deepEqual(asked, [[99, "submit"]]);
  assert.equal(sent.ok, true);
  // The same of one Chrome says is frozen, or still loading, that refuses
  // a script: a page is there, or on its way.
  for (const tab of [{ frozen: true }, { status: "loading" }]) {
    const reloaded = [];
    const sent = await sending([], {
      refuses: true,
      tab,
      reloads: true,
      makes: true,
      reloaded,
    });
    assert.deepEqual(reloaded, [], JSON.stringify(tab));
    assert.equal(sent.ok, true, JSON.stringify(tab));
  }
});

// As Chromium 156 has a tab whose page crashed (2026-11-22,
// `real-chromium/probe-crashed.log`): at its address still, not discarded,
// `status: "unloaded"`, and it takes no script.
test("a tab whose page crashed, unloaded as Chrome has it, runs no page of the conversation: it is loaded again", async () => {
  const reloaded = [];
  const made = [];
  const sent = await sending([], {
    refuses: true,
    tab: { status: "unloaded" },
    reloads: true,
    reloaded,
    made,
  });
  assert.deepEqual(reloaded, [7]);
  assert.deepEqual(made, []);
  assert.equal(sent.ok, true);
});

// #507 review round 3, P1-01: Chrome refuses a script as the tab's document
// gives way to another (one prerendered, one back from its cache), and that
// one is alive. A script refused is not "no page": only a tab Chrome itself
// says has nothing loaded is loaded again.
test("a tab that refuses a script, loaded as Chrome has it, is not loaded again", async () => {
  for (const status of ["complete", "loading", undefined]) {
    const reloaded = [];
    const made = [];
    const sent = await sending([], {
      refuses: true,
      tab: { status },
      reloads: true,
      makes: true,
      reloaded,
      made,
    });
    assert.deepEqual(reloaded, [], String(status));
    assert.equal(made.length, 1, "the words go to a tab made for them");
    assert.equal(sent.ok, true, String(status));
  }
});

test("a tab Chrome unloaded since it was first looked at is loaded again", async () => {
  // Its page crashes, or Chrome discards it, as the script is put in.
  for (const gone of [{ status: "unloaded" }, { discarded: true }]) {
    const unloading = (chrome) => {
      const { executeScript } = chrome.scripting;
      chrome.scripting.executeScript = async (details) => {
        if (details.files) Object.assign(await chrome.tabs.get(7), gone);
        return executeScript(details);
      };
    };
    const reloaded = [];
    const made = [];
    const sent = await sending([], {
      refuses: true,
      tab: { status: "complete" },
      rig: unloading,
      reloads: true,
      reloaded,
      made,
    });
    assert.deepEqual([reloaded, made], [[7], []], JSON.stringify(gone));
    assert.equal(sent.ok, true);
  }
});

// Review P2-02: out of time, the one who asked for a tab goes on without
// it, and Chrome may make it all the same. Till Chrome says, it is being
// made: another looking for a tab meanwhile makes none.
test("a tab asked of Chrome and not made in time is still being made: no other is asked for", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const tabs = [];
  const clock = { now: 1_000_000 };
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const { listeners, chrome } = load(tabs, {
    posted,
    clock,
    watched: [conversation],
    answers: [{ ok: true, told: true, loaded: true }],
    now: true,
  });
  let creates = 0;
  let comes;
  chrome.tabs.create = () => {
    creates++;
    return new Promise((resolve) => (comes = resolve));
  };
  // Time goes by once Chrome was asked `patient` times which tabs are open.
  const { query } = chrome.tabs;
  let patient = Infinity;
  chrome.tabs.query = async (asked) => {
    if (--patient < 0) clock.now += 50_000;
    return query(asked);
  };
  await tick();
  await listeners.port({
    type: "send",
    requestId: "r1",
    conversation,
    text: "x",
  });
  assert.equal(creates, 1);
  assert.deepEqual(
    posted.find((m) => m.type === "sent"),
    { type: "sent", requestId: "r1", ...unsent("timeout", false) },
  );
  // A read with time of its own waits for that tab, and makes none: it has
  // time to look for a tab, and to ask for one, before its own runs out.
  patient = 2;
  await listeners.port({ type: "reread", conversation });
  assert.equal(creates, 1, "no second tab asked for");
  assert.equal(posted.find((m) => m.type === "reread").outcome, "unreachable");
  // Chrome made it after all: it is the conversation's tab, found and read.
  patient = Infinity;
  const tab = { id: 99, url: `https://chatgpt.com/c/${conversation}` };
  tabs.push(tab);
  comes(tab);
  await tick();
  listeners.message(page, { tab });
  posted.length = 0;
  await listeners.port({ type: "reread", conversation });
  assert.equal(creates, 1);
  assert.equal(posted.find((m) => m.type === "reread").outcome, "told");
});

// Review P2-02, as Chrome makes a tab: it answers with a tab that has no
// address yet, so it is not found at the conversation's. One still waiting
// for it then waits on, till its page reports, and asks for no other.
test("a tab Chrome makes late has no address yet: the one waiting for it asks for no other", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const tabs = [];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const { listeners, chrome } = load(tabs, {
    posted,
    clock: { now: 1_000_000 },
    watched: [conversation],
    answers: [{ ok: true, told: true, loaded: true }],
    now: true,
    // The wait for a tab made late to show its conversation.
    parked: [15000],
  });
  let creates = 0;
  let comes;
  chrome.tabs.create = () => {
    creates++;
    return new Promise((resolve) => (comes = resolve));
  };
  await tick();
  await listeners.port({
    type: "send",
    requestId: "r1",
    conversation,
    text: "x",
  });
  assert.equal(posted.find((m) => m.type === "sent").reason, "timeout");
  // A read looks for a tab meanwhile, with time of its own.
  const reading = listeners.port({ type: "reread", conversation });
  for (let ticks = 0; ticks < 5; ticks++) await tick();
  // Chrome answers: the tab is made, its address not there yet.
  const tab = { id: 99, url: "" };
  tabs.push(tab);
  comes(tab);
  for (let ticks = 0; ticks < 20; ticks++) await tick();
  assert.equal(creates, 1, "no second tab asked for while it loads");
  // Its page reports: it is the conversation's tab, and is read.
  tab.url = `https://chatgpt.com/c/${conversation}`;
  listeners.message(page, { tab });
  await reading;
  assert.equal(creates, 1);
  assert.equal(posted.find((m) => m.type === "reread").outcome, "told");
});

// Round 4 review P2-02: a tab made that never shows its conversation (its
// page not committed: an address on its way, `pendingUrl`, and none yet) is
// counted past the time it was waited for: no third tab is made.
test("a tab made that never reports is counted by the address it is on its way to", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const url = `https://chatgpt.com/c/${conversation}`;
  const posted = [];
  const made = [];
  // One there that says nothing, and does not take a script in time.
  const tabs = [{ id: 7, url }];
  const { listeners, chrome } = load(tabs, {
    posted,
    hung: new Set([7]),
    watched: [conversation],
    now: true,
  });
  chrome.tabs.create = async ({ url: going }) => {
    const tab = { id: 90 + made.length, url: "", pendingUrl: going };
    made.push(tab.id);
    tabs.push(tab);
    return tab;
  };
  await tick();
  for (const requestId of ["r1", "r2", "r3"])
    await listeners.port({ type: "send", requestId, conversation, text: "x" });
  assert.deepEqual(made, [90], "one made beside it, and no more");
  const sent = posted.filter((m) => m.type === "sent");
  assert.ok(sent.every((m) => m.ok === false && m.pressed === false));
});

// Review P2-02: Chrome not saying which tabs are open is not none open.
test("no tab is made when Chrome does not say which are open", async () => {
  const silent = (chrome) =>
    (chrome.tabs.query = async () => {
      throw new Error("Tabs cannot be queried right now.");
    });
  const made = [];
  const sent = await sending([], {
    tab: false,
    rig: silent,
    makes: true,
    made,
  });
  assert.deepEqual(made, []);
  assert.deepEqual(sent, {
    type: "sent",
    requestId: "r1",
    ...unsent("timeout", false),
  });
});

test("no third tab is made for a conversation two tabs show already", async () => {
  const reloaded = [];
  const made = [];
  const submits = [];
  const other = {
    id: 5,
    url: "https://chatgpt.com/c/6aff2027-bec4-83e8-b12d-2b531c27937f",
    hung: true,
  };
  const sent = await sending([], {
    frozen: true,
    more: [other],
    makes: true,
    reloaded,
    made,
    submits,
  });
  assert.deepEqual([reloaded, made, submits], [[], [], []]);
  assert.deepEqual(sent, {
    type: "sent",
    requestId: "r1",
    ...unsent("timeout", false),
  });
});

// A listed tab that went to another site is still listed: Chrome tells
// this extension no address but chatgpt.com's, so nothing says it left. It
// takes no script, and is not loaded again for that: it is someone's page.
test("a listed tab gone to another site is not loaded again", async () => {
  const reloaded = [];
  const made = [];
  const sent = await sending([], {
    refuses: true,
    tab: { url: undefined },
    reloads: true,
    makes: true,
    reloaded,
    made,
  });
  assert.deepEqual(reloaded, []);
  assert.equal(made.length, 1);
  assert.equal(sent.ok, true);
});

// A sending and a read may look for a tab at once: one is made, and the
// other waits for it.
test("a sending and a read at once make one tab between them", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const made = [];
  const tabs = [{ id: 7, url: `https://chatgpt.com/c/${conversation}` }];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const { listeners } = load(tabs, {
    posted,
    hung: new Set([7]),
    watched: [conversation],
    // Whichever asks first: the same answer does for either.
    answers: Array(2).fill({ ok: true, told: true, loaded: true }),
    now: true,
    onCreate: (tab) => {
      made.push(tab.id);
      // As Chrome: a tab just made has no address till its page is on its
      // way, so counting the tabs at the address does not find it yet.
      const { url } = tab;
      tab.url = "";
      setImmediate(() => {
        tab.url = url;
        listeners.message(page, { tab });
      });
    },
  });
  await tick();
  listeners.message(page, { tab: { id: 7 } });
  await Promise.all([
    listeners.port({ type: "send", requestId: "r1", conversation, text: "x" }),
    listeners.port({ type: "reread", conversation }),
  ]);
  assert.equal(made.length, 1);
  assert.equal(posted.find((m) => m.type === "sent").ok, true);
  assert.equal(posted.find((m) => m.type === "reread").outcome, "told");
});

// A restarted worker may not have heard from a tab (it asks each for two
// seconds): found at its address and there, it is listed again.
test("a tab found at its address that says it is there is listed", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const tabs = [{ id: 7, url: `https://chatgpt.com/c/${conversation}` }];
  const { listeners } = load(tabs, {
    posted,
    watched: [conversation],
    now: true,
  });
  await tick();
  await listeners.port({ type: "reread", conversation });
  await tick();
  await tick();
  const [listed] = posted.filter((m) => m.type === "tabs").at(-1).conversations;
  assert.equal(listed.open, true);
});

// #507 review P2-01: the tab loaded again is the one that did not answer,
// not another showing the same conversation (it may be writing an answer).
test("of two tabs showing the conversation, the one that does not answer is loaded again, not the other", async () => {
  const reloaded = [];
  const other = {
    id: 5,
    url: "https://chatgpt.com/c/6aff2027-bec4-83e8-b12d-2b531c27937f",
  };
  const sent = await sending([], {
    discarded: true,
    reloads: true,
    more: [other],
    reloaded,
  });
  assert.deepEqual(reloaded, [7]);
  assert.equal(sent.ok, true);
});

// #507 review P1-03: between being asked whether it is there and pressing
// send, a tab may be moved to another conversation. The words name theirs,
// and the page presses send only while it shows it.
test("the words name their conversation to the page, and are not sent again into another", async () => {
  const submits = [];
  const elsewhere = unsent("other-conversation", false);
  const sent = await sending([elsewhere], { submits });
  assert.deepEqual(
    submits.map((m) => m.conversation),
    ["6aff2027-bec4-83e8-b12d-2b531c27937f"],
    "asked once, no second try",
  );
  assert.deepEqual(sent, { type: "sent", requestId: "r1", ...elsewhere });
});

// #507, Chromium 156: a discarded tab gets a new id; the one it had is
// dropped from the list.
test("a tab replaced by another is no longer listed", async () => {
  const conversation = "6aff2027-bec4-83e8-b12d-2b531c27937f";
  const posted = [];
  const { listeners } = load([], {
    posted,
    watched: [conversation],
    now: true,
  });
  await tick();
  listeners.message(
    { type: "page", conversation, hidden: true },
    { tab: { id: 7 } },
  );
  await tick();
  await tick();
  const open = () =>
    posted.filter((m) => m.type === "tabs").at(-1).conversations[0].open;
  assert.equal(open(), true);
  listeners.replaced(8, 7);
  await tick();
  await tick();
  assert.equal(open(), false);
});

test("a tab showing another conversation by now is not sent to", async () => {
  const submits = [];
  const moved = (chrome) => {
    const { sendMessage } = chrome.tabs;
    chrome.tabs.sendMessage = async (tabId, message) =>
      message.op === "alive"
        ? { conversation: "another" }
        : sendMessage(tabId, message);
  };
  const sent = await sending([], { rig: moved, submits });
  assert.deepEqual(submits, []);
  assert.deepEqual([sent.reason, sent.pressed], ["timeout", false]);
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
    marks: {},
    proofs: {},
    sendGates: [],
    held: null,
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
        // Its mark, in the same call (review round 4, P1-01).
        {
          id: "postpane-mark",
          js: ["mark.js"],
          matches: ["https://chatgpt.com/*"],
          runAt: "document_start",
          world: "ISOLATED",
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
  assert.deepEqual(kit.registered[1], [
    "off",
    ["postpane-data", "postpane-mark"],
  ]);
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
  assert.deepEqual(off.registered, [
    ["off", ["postpane-data", "postpane-mark"]],
  ]);
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
  await settle();
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

// #488 review round 3 and 4, P1-01: trusted takes evidence that data.js
// went in as the page loaded: mark.js's mark in that very document, asked
// for in the extension's own world. No mark, or no document named: not
// trusted, whatever was or was not kept of the page, whatever the clocks.
test("a page is trusted only on evidence: mark.js's mark in that very document", async () => {
  const kit = await shadowed({
    answers: [{ outcome: "read" }, { outcome: "read" }, { outcome: "read" }],
  });
  await kit.watch(true);
  // What was kept of the pages put in is gone (as when the oldest are let
  // go): the page in tab 2, open from before, has no mark.
  kit.stored.shadowDocs = {};
  const again = await shadowed({
    stored: { ...kit.stored },
    answers: [{ outcome: "read" }, { outcome: "read" }, { outcome: "read" }],
  });
  await again.watch(true);
  again.complete(2, SHADOWED, { promptId: P(1) });
  await settle();
  // Asked of that very document, in the extension's own world.
  assert.deepEqual(
    again.called.filter(([, name]) => name === "loadedWithData").at(-1),
    [2, "loadedWithData", ["doc-2", "ISOLATED"]],
  );
  // A page loaded since data.js was registered: marked, trusted.
  again.docs[2] = "doc-2-new";
  again.complete(2, SHADOWED, { promptId: P(2) });
  await settle();
  // No document named: not trusted.
  again.faults.noDocumentId = true;
  again.complete(2, SHADOWED, { promptId: P(3) });
  await settle();
  assert.deepEqual(
    again.shadows().map((told) => told.trusted),
    [false, true, false],
  );
});

// #488 review round 3, P1-02: switched off while data.js is being
// registered, it ends unregistered, and said so.
test("switched off while data.js is being registered: it ends unregistered", async () => {
  let letGo;
  const held = new Promise((resolve) => (letGo = resolve));
  const kit = await shadowed({ faults: { registerGate: () => held } });
  const on = kit.watch(true);
  await settle();
  const off = kit.watch();
  await settle();
  letGo();
  await on;
  await off;
  await settle();
  assert.equal(kit.stored.registered, false);
  assert.deepEqual(
    kit.registered.map(([what]) => what),
    ["on", "off"],
  );
  assert.equal(kit.stored.shadowDisarm.pending, false);
  assert.equal(kit.shadows().at(-1).outcome, "disarmed");
  // Switched on and off at once: nothing is left put in either.
  const quick = await shadowed();
  const both = [
    quick.watch(true),
    quick.watch(),
    quick.watch(true),
    quick.watch(),
  ];
  await Promise.all(both);
  await settle();
  assert.ok(!quick.stored.registered);
});

// #488 review round 3, P1-03: what was read not known, data.js is not
// registered either, and one registered before is taken out.
test("what was read cannot be restored: data.js is not registered, and one registered before goes", async () => {
  const kit = await shadowed({
    faults: { restore: true },
    stored: { registered: true, shadow: true },
  });
  await kit.watch(true);
  assert.deepEqual(kit.registered, [
    ["off", ["postpane-data", "postpane-mark"]],
  ]);
  assert.equal(kit.stored.registered, false);
  assert.deepEqual(kit.injected, []);
  assert.deepEqual(kit.stopsAsked(), [2, 3]);
  assert.deepEqual(
    [kit.stored.shadowArm.pending, kit.stored.shadowArm.ledger],
    [true, false],
  );
});

// #488 review round 3, P2-08: off, words sent leave nothing in the store.
test("with the switch off, or switched while words went out, nothing of them is kept", async () => {
  const kit = await shadowed({ answers: [{ ok: true, promptId: P(1) }] });
  await kit.listeners.port({
    type: "send",
    requestId: "r1",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  assert.equal(kit.stored.shadowPrompts, undefined);
  assert.equal(kit.stored.shadowLedger, undefined);
  assert.equal(kit.stored.shadowDocs, undefined);
  // On, but switched off and on again while they went out.
  let letGo;
  const held = new Promise((resolve) => (letGo = resolve));
  const later = await shadowed({
    answers: [{ ok: true, promptId: P(2) }],
    sendGates: [() => held],
  });
  await later.watch(true);
  const sending = later.listeners.port({
    type: "send",
    requestId: "r2",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  await later.watch();
  await later.watch(true);
  letGo();
  await sending;
  await settle();
  assert.equal(later.stored.shadowPrompts?.[SHADOWED], undefined);
  assert.ok(!later.shadows().some((told) => told.why === "writing"));
});

// #488 review round 3, P2-09: of words sent twice, the later ones' prompt
// stays the conversation's, whichever came back first.
test("words sent twice that come back out of order: the later words' prompt stays", async () => {
  let first;
  const held = new Promise((resolve) => (first = resolve));
  const kit = await shadowed({
    answers: [
      { ok: true, promptId: P(1) },
      { ok: true, promptId: P(2) },
    ],
    sendGates: [() => held, async () => {}],
  });
  await kit.watch(true);
  const send = (requestId) =>
    kit.listeners.port({
      type: "send",
      requestId,
      conversation: SHADOWED,
      text: "words",
    });
  const one = send("r1");
  await settle();
  const two = send("r2");
  await two;
  await settle();
  assert.equal(kit.stored.shadowPrompts[SHADOWED], P(2));
  first();
  await one;
  await settle();
  assert.equal(kit.stored.shadowPrompts[SHADOWED], P(2));
  // Each is still read 20 s after its own words.
  assert.deepEqual(
    kit
      .shadows()
      .filter((told) => told.why === "writing")
      .map((told) => told.asked)
      .sort(),
    [P(1), P(2)],
  );
});

// #488 review round 4, P1-02: switched off while a switching on still reads
// or writes what was kept of the switch, it ends with nothing registered.
test("switched off while the switch-on reads or writes what was kept: nothing is left registered", async () => {
  for (const gate of ["switchGate", "writeGate"]) {
    let letGo;
    const held = new Promise((resolve) => (letGo = resolve));
    const kit = await shadowed({ faults: { [gate]: () => held } });
    const on = kit.watch(true);
    await settle();
    kit.faults[gate] = null;
    const off = kit.watch();
    await settle();
    letGo();
    await on;
    await off;
    await settle();
    assert.ok(!kit.stored.registered, `${gate}: left registered`);
    assert.notEqual(kit.stored.shadow, true, gate);
    assert.deepEqual(kit.injected, [], `${gate}: put into pages`);
  }
});

test("switched off with data.js registered though nothing kept says so: it is taken out", async () => {
  const kit = await shadowed({ stored: { registered: true } });
  await kit.watch(false);
  assert.equal(kit.stored.registered, false);
  assert.equal(kit.shadows().at(-1).outcome, "disarmed");
});

// #488 review round 4, P1-03: what was read not known, taking data.js out
// that fails is kept as not done, with the tabs, and tried again.
test("what was read not known: taking data.js out that fails stays pending, and is tried again", async () => {
  const kit = await shadowed({
    faults: { restore: true, unregister: true },
    stored: { registered: true, shadow: true },
  });
  kit.unreachable.add(3);
  await kit.watch(true);
  assert.deepEqual(kit.stored.shadowArm, {
    pending: true,
    ledger: false,
    unregistered: false,
    failed: [3],
    at: kit.stored.shadowArm.at,
  });
  assert.equal(kit.stored.registered, true);
  kit.faults.unregister = false;
  kit.unreachable.delete(3);
  await kit.watch(true);
  assert.equal(kit.stored.registered, false);
  assert.deepEqual(
    [kit.stored.shadowArm.unregistered, kit.stored.shadowArm.failed],
    [true, []],
  );
  assert.equal(kit.stored.shadowArm.pending, true, "still not read");
  assert.deepEqual(kit.stopsAsked(), [2, 2, 3]);
});

// #488 review round 4, P2-08: a read due 20 s after words went out does not
// outlive the switch going off and on again.
test("a read due 20 s after words went out is not made once the switch went off, even on again", async () => {
  const held = [];
  const kit = await shadowed({
    held,
    answers: [
      { ok: true, promptId: P(1) },
      { ok: true, promptId: P(2) },
    ],
  });
  await kit.watch(true);
  await kit.listeners.port({
    type: "send",
    requestId: "r1",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  assert.equal(held.length, 1);
  await kit.watch();
  await kit.watch(true);
  held[0]();
  await settle();
  assert.deepEqual(kit.reads(), []);
  assert.ok(!kit.shadows().some((told) => told.why === "writing"));
  // Words sent since are read 20 s on, as before.
  await kit.listeners.port({
    type: "send",
    requestId: "r2",
    conversation: SHADOWED,
    text: "words",
  });
  await settle();
  held[1]();
  await settle();
  assert.deepEqual(kit.reads(), [[2, SHADOWED, P(2)]]);
});

// #488 review round 5, P1-04: a switch-off keeps that it is not done before
// it does anything, whatever started it; a worker stopped midway takes
// data.js out of the pages when it starts again.
test("a switch-off cut short, even of a registering nothing kept, is taken up again by a restarted worker", async () => {
  const kit = await shadowed({
    stored: { registered: true },
    faults: { unregisterGate: () => new Promise(() => {}) },
  });
  // The worker stops while taking the registering out.
  kit.watch(false);
  await settle();
  assert.equal(kit.stored.shadowDisarm.pending, true);
  assert.deepEqual(kit.stopsAsked(), []);
  // Started again; the registering had gone, the pages not stopped.
  const again = await shadowed({
    stored: { ...kit.stored, registered: false },
  });
  await again.watch(false);
  assert.deepEqual(again.stopsAsked(), [2, 3, 2, 3]);
  assert.equal(again.stored.shadowDisarm.pending, false);
  assert.equal(again.shadows().at(-1).outcome, "disarmed");
});

test("a switch-off that cannot list the tabs stays pending, and is tried again", async () => {
  const kit = await shadowed();
  await kit.watch(true);
  kit.faults.query = true;
  await kit.watch(false);
  assert.equal(kit.stored.shadowDisarm.pending, true);
  assert.equal(kit.stored.shadowDisarm.unlisted, true);
  assert.equal(kit.shadows().at(-1).outcome, "disarm-pending");
  kit.faults.query = false;
  await kit.watch(false);
  assert.equal(kit.stored.shadowDisarm.pending, false);
  assert.equal(kit.shadows().at(-1).outcome, "disarmed");
});

// #488 review, new cycle round 2, P1-01: a sign another extension put in
// carries no token a handle of the page can prove: not trusted.
test("a page whose handle cannot prove the sign's token is not trusted", async () => {
  const kit = await shadowed({
    answers: [{ outcome: "read" }, { outcome: "read" }, { outcome: "read" }],
  });
  await kit.watch(true);
  kit.docs[2] = "doc-2-new";
  // Another extension's sign; data.js absent; the page's own handle.
  kit.proofs["doc-2-new"] = "f".repeat(64);
  kit.complete(2, SHADOWED, { promptId: P(1) });
  await settle();
  // No handle at all to prove it.
  kit.proofs["doc-2-new"] = null;
  kit.complete(2, SHADOWED, { promptId: P(2) });
  await settle();
  // A sign with a token of another form.
  delete kit.proofs["doc-2-new"];
  kit.marks["doc-2-new"] = "not a token";
  kit.complete(2, SHADOWED, { promptId: P(3) });
  await settle();
  // data.js's own sign and handle: trusted.
  kit.marks["doc-2-new"] = TOKEN;
  kit.complete(2, SHADOWED, { promptId: P(4) });
  await settle();
  assert.deepEqual(
    kit.shadows().map((told) => told.trusted),
    [false, false, false, true],
  );
  assert.deepEqual(
    kit.called.filter(([, name]) => name === "proveInPage").at(-1),
    [2, "proveInPage", ["MAIN"]],
  );
});

// #518 (owner 2026-11-24): a put in front Chrome answers only after its
// wait is not over: watched a while more, and come with the window as the
// person left it, the tab that was in front comes back; the person having
// moved in the window, nothing. Moves in other windows are not theirs here.
test("a tab put in front late is moved back from only with its window untouched", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const tabs = [
    { id: 2, url: `https://chatgpt.com/c/${conversation}`, windowId: 1 },
    { id: 3, url: "https://chatgpt.com/", windowId: 1, active: true },
    { id: 4, url: "https://chatgpt.com/", windowId: 1 },
    { id: 5, url: "https://example.com/", windowId: 2, active: true },
  ];
  const page = { type: "page", conversation, hidden: true, streaming: false };
  const read = async (meanwhile) => {
    tabs.forEach((tab) => (tab.active = tab.id === 3 || tab.id === 5));
    const posted = [];
    const fronted = [];
    const { listeners, chrome } = load(tabs, {
      posted,
      fronted,
      watched: [conversation],
      answers: Array(5).fill({ ok: true, undrawn: true, loaded: true }),
      now: true,
      parked: [10000],
    });
    await tick();
    listeners.message(page, { tab: { id: 2 } });
    const { update } = chrome.tabs;
    let letGo;
    const landed = new Promise((done) => (letGo = done));
    chrome.tabs.update = (id, to) =>
      id === 2 ? landed.then(() => update(id, to)) : update(id, to);
    const done = listeners.port({ type: "reread", conversation });
    for (let ticks = 0; ticks < 20; ticks++) await tick();
    meanwhile(chrome);
    letGo();
    await done;
    return { fronted, found: posted.find((m) => m.type === "reread") };
  };
  const untouched = await read(() => {});
  assert.deepEqual(untouched.fronted, [2, 3], "come late, put back");
  assert.equal(untouched.found.outcome, "undrawn", "not read as in front");
  const moved = await read((chrome) => chrome.tabs.activate(4));
  assert.deepEqual(moved.fronted, [2], "the person moved: nothing");
  const elsewhere = await read((chrome) => chrome.tabs.activate(5));
  assert.deepEqual(elsewhere.fronted, [2, 3], "another window is not this one");
});

// #433：常浩关掉会话后，自动重读不反复新开标签页。
test("automatic rereads never reopen a closed conversation tab", async () => {
  const conversation = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const posted = [];
  let created = 0;
  const { listeners } = load([], {
    posted,
    watched: [conversation],
    now: true,
    onCreate: () => {
      created++;
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < 3; i++) {
    await listeners.port({ type: "reread", conversation });
  }
  assert.equal(created, 0);
  assert.deepEqual(
    posted.filter((m) => m.type === "reread").map((m) => m.outcome),
    ["unreachable", "unreachable", "unreachable"],
  );
});

// #542: every relay opened a ChatGPT tab and none was ever closed; on
// 2026-11-25 Changhao's swap stood at 21–25 GB. PostPane names the
// conversations every handoff of which has ended; their tabs in the relay
// group are closed, and no other.
const ENDED = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
const LIVE = "7bf8fd58-d1a5-94ff-ac0f-c0a29771878f";
const settleLong = async () => {
  for (let i = 0; i < 30; i++) await tick();
};
/** A tab an opening makes, `more` to it, whose page says at once it is a
 * new chat's: the words go in (round 4, P1-06). `api` is what `load` gave. */
const madeBlank = (api, more) => (tab) => {
  Object.assign(tab, more);
  api.listeners.message(
    { type: "page", conversation: null, hidden: true },
    { tab: { id: tab.id } },
  );
};

test("conversations PostPane says ended have their tabs in the relay group closed, and only those", async () => {
  const at = (id, conversation, more = {}) => ({
    id,
    url: `https://chatgpt.com/c/${conversation}`,
    windowId: 1,
    active: false,
    groupId: 7,
    ...more,
  });
  const tabs = [
    at(2, ENDED),
    // Changhao's own, outside the group.
    at(3, ENDED, { groupId: -1 }),
    // A live handoff's.
    at(4, LIVE),
    // In front of its window: he may be looking at it.
    at(5, ENDED, { active: true, windowId: 2 }),
    // Discarded: no page in it to lose anything.
    at(6, ENDED, { discarded: true }),
    // Its page holds words not sent, or is writing.
    at(8, ENDED),
    // Its page says nothing (an older script, or frozen).
    at(9, ENDED),
    // In another group of the same name's look, but not the relay's.
    at(10, ENDED, { groupId: 11 }),
  ];
  const asked = [];
  const removed = [];
  const { listeners } = load(tabs, {
    asked,
    removed,
    groups: [
      { id: 7, title: "驿窗接力" },
      { id: 11, title: "别的" },
    ],
    closable: { 2: true, 8: false },
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED, LIVE],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(removed.sort(), [2, 6]);
  assert.deepEqual(
    asked
      .filter(([, op]) => op === "closable")
      .map(([id]) => id)
      .sort(),
    [2, 8, 9],
    "a discarded tab is not asked; one in front, outside the group or live is not looked at",
  );
  // A list naming none ended closes nothing more.
  await listeners.port({ type: "watch", conversations: [ENDED, LIVE] });
  await settleLong();
  assert.deepEqual(removed.sort(), [2, 6]);
});

test("an ended conversation's tab left in front is closed once another tab of its window is", async () => {
  const tabs = [
    {
      id: 5,
      url: `https://chatgpt.com/c/${ENDED}`,
      windowId: 1,
      active: true,
      groupId: 7,
    },
    { id: 12, url: "https://example.com/", windowId: 1, active: false },
  ];
  const removed = [];
  const { listeners, chrome } = load(tabs, {
    removed,
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 5: true },
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(removed, [], "not while he may be looking at it");
  chrome.tabs.activate(12);
  await settleLong();
  assert.deepEqual(removed, [5]);
});

test("a tab words are going into is not closed meanwhile, though its conversation ended", async () => {
  // A new handoff may take an ended conversation on (#542): PostPane names
  // it ended no more by its next list, but one sent before may be in hand.
  const tabs = [
    {
      id: 2,
      url: `https://chatgpt.com/c/${ENDED}`,
      windowId: 1,
      active: false,
      groupId: 7,
    },
  ];
  const removed = [];
  let release;
  const { listeners } = load(tabs, {
    removed,
    watched: [ENDED],
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 2: true },
    sendGates: [() => new Promise((resolve) => (release = resolve))],
  });
  await settleLong();
  const sending = listeners.port({
    type: "send",
    requestId: "r1",
    conversation: ENDED,
    text: "第 2 轮",
  });
  await settleLong();
  assert.ok(release, "the words reached the page");
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(removed, []);
  release();
  await sending;
  // Done with it, the tab is looked at again (round 2, P2-10).
  await settleLong();
  assert.deepEqual(removed, [2]);
});

// #542 review P1-01: a handoff whose opening failed knows no conversation
// (the page did not say its address in time); once it ended, the tab it
// opened is closed all the same, by the handoff.
test("the tab a failed opening made is closed once its handoff ended", async () => {
  const tabs = [];
  const removed = [];
  const api = {};
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      removed,
      groups: [{ id: 7, title: "驿窗接力" }],
      closable: { 99: true },
      // The words went in and the address came, but the page never said so;
      // asked, it shows them.
      onCreate: madeBlank(api, {
        url: `https://chatgpt.com/c/${ENDED}`,
        groupId: 7,
      }),
    }),
  );
  await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
  await settleLong();
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h8"],
  });
  await settleLong();
  assert.deepEqual(removed, [], "another handoff's end");
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h7"],
  });
  await settleLong();
  assert.deepEqual(removed, [99]);
});

// #542 review P2-05: only a chatgpt.com conversation's address counts, and
// where a tab is going comes before where it was.
test("only a chatgpt.com conversation address names an ended conversation", async () => {
  const tabs = [
    {
      id: 2,
      url: `https://example.com/redirect?next=/c/${ENDED}`,
      windowId: 1,
      active: false,
      groupId: 7,
    },
    {
      id: 3,
      url: `https://chatgpt.com/c/${ENDED}`,
      pendingUrl: `https://chatgpt.com/c/${LIVE}`,
      windowId: 1,
      active: false,
      groupId: 7,
    },
    {
      id: 4,
      url: `https://chatgpt.com/g/g-p-abc/c/${ENDED}`,
      windowId: 1,
      active: false,
      groupId: 7,
    },
  ];
  const removed = [];
  const { listeners } = load(tabs, {
    removed,
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 2: true, 3: true, 4: true },
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(removed, [4], "a project's conversation counts");
});

// #542 review P2-04: a tab left open as its page was writing is closed once
// the answer is done, with nothing else changed.
test("a tab left open while its page wrote is closed once its answer is done", async () => {
  const tabs = [
    {
      id: 2,
      url: `https://chatgpt.com/c/${ENDED}`,
      windowId: 1,
      active: false,
      groupId: 7,
    },
  ];
  const removed = [];
  const closable = { 2: false };
  const { listeners } = load(tabs, {
    removed,
    groups: [{ id: 7, title: "驿窗接力" }],
    closable,
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(removed, [], "writing");
  closable[2] = true;
  listeners.message(
    { type: "turn", phase: "complete", conversation: ENDED, reply: "好" },
    { tab: { id: 2 } },
  );
  await settleLong();
  assert.deepEqual(removed, [2]);
});

// #542 review round 2, P1-01 path A: the handoff ended while its opening
// was still on; once the opening is over, its tab is looked at again.
test("a tab whose handoff ended while it opened is closed once the opening is over", async () => {
  const tabs = [];
  const removed = [];
  const api = {};
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      removed,
      groups: [{ id: 7, title: "驿窗接力" }],
      closable: { 99: true },
      onCreate: madeBlank(api, {
        url: `https://chatgpt.com/c/${ENDED}`,
        groupId: 7,
      }),
    }),
  );
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h7"],
  });
  await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
  await settleLong();
  assert.deepEqual(removed, [99]);
});

// Round 2, P1-03: no conversation is not an identity. A blank tab a failed
// opening left is closed only while its page says it is still that blank
// page; not once it went to another site, nor unloaded.
test("a blank tab a failed opening left is closed only as the same blank page", async () => {
  const run = async (after) => {
    const tabs = [];
    const removed = [];
    const asked = [];
    const { listeners } = load(tabs, {
      now: true,
      removed,
      asked,
      groups: [{ id: 7, title: "驿窗接力" }],
      closable: { 99: true },
      onCreate: (tab) => Object.assign(tab, { groupId: 7 }),
    });
    await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
    await settleLong();
    after(tabs[0]);
    await listeners.port({
      type: "watch",
      conversations: [],
      endedRelays: ["h7"],
    });
    await settleLong();
    return { removed, asked: asked.filter(([, op]) => op === "closable") };
  };
  const same = await run(() => {});
  assert.deepEqual(same.removed, [99], "still the blank page");
  const away = await run((tab) =>
    Object.assign(tab, { url: "https://example.com/", discarded: true }),
  );
  assert.deepEqual(away.removed, [], "taken to another site");
  const unloadedBlank = await run((tab) =>
    Object.assign(tab, { discarded: true }),
  );
  assert.deepEqual(unloadedBlank.removed, [], "cannot say it is the same");
  assert.deepEqual(unloadedBlank.asked, []);
});

// Round 2, P1-01 path B: the page of a blank tab says its conversation soon
// after: that conversation is the handoff's.
test("a blank tab whose page comes to show a conversation is kept", async () => {
  // Round 3, P1-04: whether the opening or Changhao going to another brought
  // it there cannot be told, so it is not known as the handoff's any more.
  const tabs = [];
  const removed = [];
  const { listeners } = load(tabs, {
    now: true,
    removed,
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 99: true },
    onCreate: (tab) => Object.assign(tab, { groupId: 7 }),
  });
  await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
  await settleLong();
  tabs[0].url = `https://chatgpt.com/c/${ENDED}`;
  listeners.message(
    { type: "page", conversation: ENDED, hidden: true },
    { tab: { id: 99 } },
  );
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h7"],
  });
  await settleLong();
  assert.deepEqual(removed, [], "now at a conversation");
  // Back at the blank page: still not known as the handoff's.
  tabs[0].url = "https://chatgpt.com/";
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h7"],
  });
  await settleLong();
  assert.deepEqual(removed, []);
});

// Round 2, P1-01 path C and P2-09: whose a conversation's tab is outlives the
// browser starting again (new tab ids); a conversation PostPane heard of but
// no handoff took (a try given up on) is no reason to keep it, one a
// handoff not ended has is.
test("a conversation a failed opening came to is closed by its handoff, after a restart too", async () => {
  const at = (id) => ({
    id,
    url: `https://chatgpt.com/c/${ENDED}`,
    windowId: 1,
    active: false,
    groupId: 7,
  });
  const kept = { strays: { [ENDED]: "h7" } };
  const first = [];
  const one = load([at(41)], {
    removed: first,
    stored: { ...kept },
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 41: true },
  });
  await one.listeners.port({
    type: "watch",
    conversations: [ENDED],
    endedRelays: ["h7"],
    live: [ENDED],
  });
  await settleLong();
  assert.deepEqual(first, [], "a handoff not ended has it");
  const removed = [];
  const { listeners } = load([at(41)], {
    removed,
    stored: { ...kept },
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 41: true },
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    endedRelays: ["h7"],
  });
  await settleLong();
  assert.deepEqual(removed, [41]);
});

// Round 2, P2-04: Chrome not saying which groups there are is not "none":
// looked at again later.
test("Chrome not answering for the groups has the tabs looked at again later", async () => {
  const waits = [];
  const { listeners } = load([], {
    waits,
    faults: { groups: true },
    groups: [{ id: 7, title: "驿窗接力" }],
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.ok(waits.includes(5 * 60 * 1000), JSON.stringify(waits));
});

// Round 3, P2-12: Chrome not saying how the tab stood as its opening ended is
// not "no tab": its owner is noted once Chrome says, and it is closed.
test("a tab whose owner Chrome did not let be noted at once is noted later", async () => {
  const tabs = [];
  const removed = [];
  const waits = [];
  // The first ask is the grouping's; the second, as the opening ends, fails.
  const faults = { getAt: { 99: 2 } };
  const api = {};
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      removed,
      waits,
      faults,
      groups: [{ id: 7, title: "驿窗接力" }],
      closable: { 99: true },
      // The page never says its address, so `ready` gives up and Chrome is
      // asked of the tab only as the opening ends.
      onCreate: madeBlank(api, {
        url: `https://chatgpt.com/c/${ENDED}`,
        groupId: 7,
      }),
    }),
  );
  await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
  await settleLong();
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h7"],
  });
  await settleLong();
  assert.deepEqual(removed, [99]);
});

// Round 3, P2-04: Chrome not saying how a tab stands, asked just before it is
// closed, has it looked at again later.
test("Chrome not answering for a tab just before closing it has it looked at again", async () => {
  const tabs = [
    {
      id: 2,
      url: `https://chatgpt.com/c/${ENDED}`,
      windowId: 1,
      active: false,
      groupId: 7,
    },
  ];
  const removed = [];
  const waits = [];
  const { listeners } = load(tabs, {
    removed,
    waits,
    faults: { getOnce: new Set([2]) },
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 2: true },
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(removed, []);
  assert.ok(waits.includes(5 * 60 * 1000), JSON.stringify(waits));
});

// Round 3, P2-11 (owner 2026-11-27, 「不再关」): Changhao went on in an ended
// relay's conversation himself: its tab is his now, and not closed, after a
// restart of the worker too.
test("a conversation Changhao went on with after its relay ended is not closed", async () => {
  const tab = () => ({
    id: 2,
    url: `https://chatgpt.com/c/${ENDED}`,
    windowId: 1,
    active: false,
    groupId: 7,
  });
  const stored = {};
  const removed = [];
  const closable = { 2: false };
  const { listeners } = load([tab()], {
    removed,
    stored,
    groups: [{ id: 7, title: "驿窗接力" }],
    closable,
  });
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  listeners.message(
    {
      type: "turn",
      phase: "start",
      conversation: ENDED,
      prompt: "再问一句",
      promptId: P(41),
    },
    { tab: { id: 2 } },
  );
  await settleLong();
  closable[2] = true;
  listeners.message(
    {
      type: "turn",
      phase: "complete",
      conversation: ENDED,
      promptId: P(41),
      reply: "好",
    },
    { tab: { id: 2 } },
  );
  await settleLong();
  assert.deepEqual(removed, []);
  // A worker started again knows it.
  const again = [];
  const next = load([tab()], {
    removed: again,
    stored,
    groups: [{ id: 7, title: "驿窗接力" }],
    closable: { 2: true },
  });
  await next.listeners.port({
    type: "watch",
    conversations: [ENDED],
    ended: [ENDED],
  });
  await settleLong();
  assert.deepEqual(again, []);
});

// Round 4 and 5, P1-05: whose a prompt is goes by what proves it the
// extension's: its id, as the page that sent it had it, or its words. Not
// by when it is heard of, nor by being the next one heard of: any other is
// Changhao's, and keeps his tab open.
const endedTab = (id = 2) => ({
  id,
  url: `https://chatgpt.com/c/${ENDED}`,
  windowId: 1,
  active: false,
  groupId: 7,
});
const SENT = "【驿窗送审 h7~send1】\n补格式";
const MINE = "我自己再问一句";
/** A turn told by tab `tab` of conversation `ENDED`. */
const turn = (listeners, phase, promptId, more = {}) =>
  listeners.message(
    {
      type: "turn",
      phase,
      conversation: ENDED,
      promptId,
      reply: "好",
      ...more,
    },
    { tab: { id: more.tab ?? 2 } },
  );
/** A relay whose conversation is `ENDED`, its tab 2 (and tab 3, `more`),
 * the words `SENT` sent once: the page answers `answer` once `during` (run
 * while it sends) is done. `clock` moves a millisecond with each turn. */
async function sentOnce(answer, during = async () => {}, more = {}) {
  const removed = [];
  const closable = { 2: false, 3: false };
  const stored = {};
  const clock = { now: 1_000_000 };
  const api = {};
  const tabs = [endedTab(2), ...(more.tab3 ? [endedTab(3)] : [])];
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      clock,
      removed,
      closable,
      stored,
      answers: [answer],
      groups: [{ id: 7, title: "驿窗接力" }],
      sendGates: [
        async () => {
          clock.now += 10;
          await during(api.listeners, clock);
          clock.now += 10;
        },
      ],
    }),
  );
  listeners.message(
    { type: "page", conversation: ENDED, hidden: true },
    { tab: { id: 2 } },
  );
  await listeners.port({
    type: "watch",
    conversations: [ENDED],
    live: [ENDED],
  });
  await (more.before ?? (async () => {}))(listeners, clock);
  clock.now += 10;
  await listeners.port({
    type: "send",
    requestId: "s1",
    conversation: ENDED,
    text: SENT,
  });
  await settleLong();
  const end = async () => {
    await listeners.port({
      type: "watch",
      conversations: [ENDED],
      ended: [ENDED],
    });
    await settleLong();
  };
  // The answer done in each tab: what may be closed now is.
  const done = async (promptId, words) => {
    closable[2] = closable[3] = true;
    turn(listeners, "complete", promptId, { prompt: words });
    await settleLong();
  };
  return { listeners, removed, stored, clock, end, done };
}

test("an answer to the words PostPane sent, begun only after its relay ended, is PostPane's", async () => {
  // Its id, as the page that sent the words had it.
  const known = await sentOnce({ ok: true, promptId: P(51) });
  await known.end();
  turn(known.listeners, "start", P(51), { prompt: SENT });
  await settleLong();
  await known.done(P(51), SENT);
  assert.deepEqual(known.removed, [2], "id seen");
  // Its id not seen: its words show it.
  const unseen = await sentOnce({ ok: true });
  await unseen.end();
  turn(unseen.listeners, "start", P(52), { prompt: SENT });
  await settleLong();
  await unseen.done(P(52), SENT);
  assert.deepEqual(unseen.removed, [2], "words seen");
  // Neither: no proof is his, and kept (a paste ChatGPT made a file).
  const none = await sentOnce({ ok: true });
  await none.end();
  turn(none.listeners, "start", P(53), { prompt: null });
  await settleLong();
  await none.done(P(53), null);
  assert.deepEqual(none.removed, [], "nothing shows whose");
});

test("a prompt of Changhao's heard of before PostPane says its relay ended is his all the same", async () => {
  const sent = await sentOnce({ ok: true, promptId: P(61) });
  turn(sent.listeners, "start", P(62), { prompt: MINE });
  await settleLong();
  await sent.end();
  await sent.done(P(62), MINE);
  assert.deepEqual(sent.removed, []);
});

// Round 5, review tests 1 and 2: a prompt of his heard of while PostPane's
// words go, before the page says what became of them, in the tab sending
// them or in another of the same conversation, is not taken for theirs; nor
// does theirs, known after, make the conversation the relay's again.
test("a prompt of Changhao's heard of while PostPane's words go is his", async () => {
  for (const tab of [2, 3])
    for (const answer of [{ ok: true, promptId: P(63) }, { ok: true }]) {
      const sent = await sentOnce(
        answer,
        async (listeners) => {
          turn(listeners, "start", P(64), { prompt: MINE, tab });
          await settleLong();
        },
        { tab3: true },
      );
      await sent.end();
      await sent.done(P(64), MINE);
      const what = `tab ${tab}, ${JSON.stringify(answer)}`;
      assert.deepEqual(sent.removed, [], what);
      assert.ok(!sent.stored.asks?.[ENDED]?.includes(P(64)), what);
    }
});

test("words PostPane sends after Changhao went on make the conversation the relay's again", async () => {
  const sent = await sentOnce({ ok: true, promptId: P(71) }, async () => {}, {
    before: async (listeners) => {
      turn(listeners, "start", P(72), { prompt: MINE });
      await settleLong();
    },
  });
  await sent.end();
  await sent.done(P(71), SENT);
  assert.deepEqual(sent.removed, [2]);
});

// Round 5, review test 3: words not known to have gone. Gone after all,
// their prompt shows them; not gone, the next prompt is his; and what he
// went on with before is not undone by them.
test("words not known to have gone count only as their prompt shows them", async () => {
  const unknown = { ok: false, reason: "tab-closed" };
  const went = await sentOnce(unknown);
  await went.end();
  turn(went.listeners, "start", P(73), { prompt: SENT });
  await settleLong();
  await went.done(P(73), SENT);
  assert.deepEqual(went.removed, [2], "they went");
  const not = await sentOnce(unknown);
  await not.end();
  turn(not.listeners, "start", P(74), { prompt: MINE });
  await settleLong();
  await not.done(P(74), MINE);
  assert.deepEqual(not.removed, [], "they did not, and he asked");
  const before = await sentOnce(unknown, async () => {}, {
    before: async (listeners) => {
      turn(listeners, "start", P(75), { prompt: MINE });
      await settleLong();
    },
  });
  await before.end();
  await before.done(P(75), MINE);
  assert.deepEqual(before.removed, [], "his from before stands");
  assert.ok(before.stored.taken?.[ENDED]);
});

// Round 5, review test 8: an answer stopped before its prompt was named:
// the newest prompt then tells whose it was.
test("a stopped answer whose beginning named no prompt is told by the newest", async () => {
  const sent = await sentOnce({ ok: true, promptId: P(81) });
  await sent.end();
  turn(sent.listeners, "start", null, { prompt: null });
  await settleLong();
  sent.listeners.message(
    {
      type: "turn",
      phase: "stopped",
      conversation: ENDED,
      promptId: null,
      newest: P(82),
      prompt: MINE,
    },
    { tab: { id: 2 } },
  );
  await settleLong();
  await sent.done(P(81), SENT);
  assert.deepEqual(sent.removed, []);
});

// What PostPane opens a conversation with: its first line names the
// request (round 6, owner 2026-11-27 「甲」).
const OPENING = "【驿窗送审 h7~1】\n第 1 轮";
test("a new conversation's beginning, told again as it has its address, is PostPane's by its words", async () => {
  const tabs = [];
  const removed = [];
  const stored = {};
  const closable = { 99: false };
  const api = {};
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      removed,
      closable,
      groups: [{ id: 7, title: "驿窗接力" }],
      stored,
      onCreate: madeBlank(api, { groupId: 7 }),
      // The words go in, their id not seen; the page has its address.
      sendGates: [
        async () => {
          tabs[0].url = `https://chatgpt.com/c/${ENDED}`;
          listeners.message(
            { type: "page", conversation: ENDED, hidden: true },
            { tab: { id: 99 } },
          );
        },
      ],
    }),
  );
  await listeners.port({ type: "open", requestId: "h7~1", text: OPENING });
  await settleLong();
  await listeners.port({
    type: "watch",
    conversations: [ENDED, LIVE],
    ended: [ENDED],
  });
  await settleLong();
  // Round 6: Changhao asks the same words, no request named, in another
  // relay's conversation: his, and no head is taken away by it.
  listeners.message(
    {
      type: "turn",
      phase: "start",
      conversation: LIVE,
      promptId: P(92),
      prompt: "第 1 轮",
    },
    { tab: { id: 98 } },
  );
  await settleLong();
  assert.equal(stored.taken?.[LIVE]?.id, P(92), "his, words alike");
  // Begun on the new chat's page, told again once it has its address.
  turn(listeners, "start", P(91), { tab: 99, prompt: OPENING });
  await settleLong();
  closable[99] = true;
  turn(listeners, "complete", P(91), { tab: 99, prompt: OPENING });
  await settleLong();
  assert.deepEqual(removed, [99]);
});

test("words with no request named prove no prompt the extension's", async () => {
  // An older PostPane's opening, its words not named; his prompt the same.
  const tabs = [];
  const stored = {};
  const api = {};
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      stored,
      groups: [{ id: 7, title: "驿窗接力" }],
      onCreate: madeBlank(api, { groupId: 7 }),
    }),
  );
  await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
  await settleLong();
  await listeners.port({ type: "watch", conversations: [LIVE], live: [LIVE] });
  listeners.message(
    {
      type: "turn",
      phase: "start",
      conversation: LIVE,
      promptId: P(93),
      prompt: "第 1 轮",
    },
    { tab: { id: 98 } },
  );
  await settleLong();
  assert.equal(stored.taken?.[LIVE]?.id, P(93));
});

// Round 4 and 5, P1-06: Changhao moved the tab an opening made on to a
// conversation of his own: the words do not go there, nor is it the
// handoff's, nor closed with it; a prompt of his there, heard of while it
// opens, is not taken for the extension's (review test 4).
const HIS = "8c09ae69-e2a1-a5aa-bd01-d1b30298898a";
async function movedOn(how) {
  const tabs = [];
  const removed = [];
  const asked = [];
  const posted = [];
  const stored = {};
  const api = {};
  const toHis = () => {
    tabs[0].url = `https://chatgpt.com/c/${HIS}`;
    api.listeners.message(
      { type: "page", conversation: HIS, hidden: true },
      { tab: { id: 99 } },
    );
    api.listeners.message(
      {
        type: "turn",
        phase: "start",
        conversation: HIS,
        promptId: P(95),
        prompt: MINE,
      },
      { tab: { id: 99 } },
    );
  };
  const { listeners } = Object.assign(
    api,
    load(tabs, {
      now: true,
      removed,
      asked,
      posted,
      stored,
      closable: { 99: true },
      groups: [{ id: 7, title: "驿窗接力" }],
      onCreate:
        how === "before"
          ? (tab) => {
              Object.assign(tab, { groupId: 7 });
              api.listeners.message(
                { type: "page", conversation: null, hidden: true },
                { tab: { id: tab.id } },
              );
              toHis();
            }
          : madeBlank(api, { groupId: 7 }),
      // As the words went in, the tab moved on; the page says so.
      sendGates: how === "after" ? [async () => toHis()] : [],
      opened: { 99: { conversation: HIS, ours: false } },
    }),
  );
  await listeners.port({ type: "open", requestId: "h7~1", text: "第 1 轮" });
  await settleLong();
  await listeners.port({
    type: "watch",
    conversations: [],
    endedRelays: ["h7"],
  });
  await settleLong();
  return {
    removed,
    submitted: asked.some(([, op]) => op === "submit"),
    opened: posted.find((m) => m.type === "opened"),
    strays: stored.strays ?? {},
    watched: stored.watched ?? [],
    asks: stored.asks ?? {},
  };
}

test("an opening whose tab was moved on to another conversation before the words went sends nothing there", async () => {
  const before = await movedOn("before");
  assert.equal(before.submitted, false);
  assert.equal(before.opened.ok, false);
  assert.equal(before.opened.reason, "other-conversation");
  assert.deepEqual(before.strays, {});
  assert.deepEqual(before.asks, {});
  assert.deepEqual(before.removed, []);
});

test("a conversation an opening's tab was moved on to, not showing its words, is not the handoff's", async () => {
  const after = await movedOn("after");
  assert.equal(after.submitted, true);
  assert.equal(after.opened.ok, false);
  assert.equal(after.opened.reason, "unconfirmed");
  assert.ok(!after.watched.includes(HIS));
  assert.deepEqual(after.strays, {});
  assert.deepEqual(after.asks, {});
  assert.deepEqual(after.removed, []);
});

// Round 5: the worker is a plain script, where a second function of a name
// stands in for the first without a word (a `sending` of #542 did so).
test("no two functions of the worker share a name", () => {
  const names = [...source.matchAll(/^(?:async )?function (\w+)/gm)].map(
    (match) => match[1],
  );
  const twice = names.filter((name, at) => names.indexOf(name) !== at);
  assert.deepEqual(twice, []);
});

// Round 6, P2-11: a prompt of Changhao's whose hold PostPane's later words
// let go does not take it back, told again late (its answer stopped, from
// another tab); a new prompt of his does.
test("a prompt of Changhao's let go by PostPane's words after it does not take the conversation back when told again", async () => {
  const sent = await sentOnce({ ok: true, promptId: P(77) }, async () => {}, {
    tab3: true,
    before: async (listeners) => {
      turn(listeners, "start", P(76), { prompt: MINE, tab: 3 });
      await settleLong();
    },
  });
  assert.equal(sent.stored.taken?.[ENDED], undefined, "let go");
  sent.listeners.message(
    {
      type: "turn",
      phase: "stopped",
      conversation: ENDED,
      promptId: P(76),
      newest: P(76),
      prompt: MINE,
    },
    { tab: { id: 3 } },
  );
  await settleLong();
  assert.equal(sent.stored.taken?.[ENDED], undefined, "told again");
  await sent.end();
  await sent.done(P(77), SENT);
  assert.ok(sent.removed.includes(2), JSON.stringify(sent.removed));
  // A new one of his takes it.
  turn(sent.listeners, "start", P(78), { prompt: MINE, tab: 3 });
  await settleLong();
  assert.equal(sent.stored.taken?.[ENDED]?.id, P(78));
});

// Round 6, P1-05: words alike are the extension's only in a relay's
// conversation, and only as one of its words: two of them alike prove
// neither; those past their week, kept from before, prove nothing.
test("words alike prove a prompt the extension's only once, in a relay's conversation, within the week", async () => {
  // Two openings of words alike, neither's prompt known.
  const twice = await sentOnce({ ok: true });
  await twice.listeners.port({
    type: "send",
    requestId: "s2",
    conversation: ENDED,
    text: SENT,
  });
  await settleLong();
  await twice.end();
  turn(twice.listeners, "start", P(84), { prompt: SENT });
  await settleLong();
  await twice.done(P(84), SENT);
  assert.deepEqual(twice.removed, [], "two alike");
  // Another conversation, not a relay's, takes no head away.
  const elsewhere = await sentOnce({ ok: true });
  elsewhere.listeners.message(
    {
      type: "turn",
      phase: "start",
      conversation: LIVE,
      promptId: P(85),
      prompt: SENT,
    },
    { tab: { id: 2 } },
  );
  await settleLong();
  await elsewhere.end();
  turn(elsewhere.listeners, "start", P(86), { prompt: SENT });
  await settleLong();
  await elsewhere.done(P(86), SENT);
  assert.deepEqual(elsewhere.removed, [2], "still there");
  // Kept from more than a week ago.
  const clock = { now: 2_000_000_000 };
  const stored = {
    heads: [
      { head: "【驿窗送审h7~old】旧", at: clock.now - 8 * 24 * 3600 * 1000 },
    ],
  };
  const removed = [];
  const closable = { 2: false };
  const again = load([endedTab(2)], {
    now: true,
    clock,
    removed,
    stored,
    closable,
    groups: [{ id: 7, title: "驿窗接力" }],
  });
  const ended = () =>
    again.listeners.port({
      type: "watch",
      conversations: [ENDED],
      ended: [ENDED],
    });
  await ended();
  await settleLong();
  turn(again.listeners, "complete", P(87), {
    prompt: "【驿窗送审 h7~old】\n旧",
  });
  await settleLong();
  closable[2] = true;
  await ended();
  await settleLong();
  assert.deepEqual(removed, [], "a week old");
});
