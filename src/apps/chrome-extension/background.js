// Bridges chatgpt.com tabs and PostPane over Chrome Native Messaging.
// Protocol: docs/chatgpt-channel.md. Every conversation's turns are reported
// (#145); only conversations on PostPane's watch list are sent to.
const HOST = "com.postpane.chatgpt";
const HOME = "https://chatgpt.com/";
const GROUP = "驿窗接力";

let port = null;
let retry = 5000;
let watched = new Set();
const pages = new Map(); // tabId -> {conversation, hidden, streaming}
const opening = new Map(); // tabId -> requestId
const waiters = new Map(); // tabId -> [resolve]

// --- Native port -------------------------------------------------------------

function connect() {
  try {
    port = chrome.runtime.connectNative(HOST);
  } catch {
    return reconnect();
  }
  port.onMessage.addListener(onHost);
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    port = null;
    reconnect();
  });
  post({
    type: "hello",
    version: chrome.runtime.getManifest().version,
    extensionId: chrome.runtime.id,
  });
  retry = 5000;
  statusSoon();
}

function reconnect() {
  setTimeout(connect, retry);
  retry = Math.min(retry * 2, 60000);
}

function post(message) {
  try {
    port?.postMessage(message);
  } catch {
    /* reconnect handles it */
  }
}

async function onHost(message) {
  switch (message.type) {
    case "watch":
      watched = new Set(message.conversations || []);
      await chrome.storage.local.set({ watched: [...watched] });
      statusSoon();
      break;
    case "open":
      post({
        type: "opened",
        requestId: message.requestId,
        ...(await open(message.text, message.project)),
      });
      break;
    case "send":
      post({
        type: "sent",
        requestId: message.requestId,
        ...(await send(message.conversation, message.text)),
      });
      break;
    case "focus":
      await focus(message.conversation);
      break;
    case "reread":
      await reread(message.conversation);
      break;
  }
}

// --- Tabs --------------------------------------------------------------------

function tabFor(conversation) {
  for (const [tabId, page] of pages)
    if (page.conversation === conversation) return tabId;
  return null;
}

/** Resolves once the content script in `tabId` reports, or null after `ms`. */
function ready(tabId, ms, test = () => true) {
  const page = pages.get(tabId);
  if (page && test(page)) return Promise.resolve(page);
  return new Promise((resolve) => {
    const done = (value) => {
      clearTimeout(timer);
      const list = (waiters.get(tabId) || []).filter((w) => w !== check);
      list.length ? waiters.set(tabId, list) : waiters.delete(tabId);
      resolve(value);
    };
    const check = (page) => test(page) && done(page);
    const timer = setTimeout(() => done(null), ms);
    waiters.set(tabId, [...(waiters.get(tabId) || []), check]);
  });
}

async function group(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const [existing] = await chrome.tabGroups.query({
      title: GROUP,
      windowId: tab.windowId,
    });
    if (existing)
      await chrome.tabs.group({ tabIds: [tabId], groupId: existing.id });
    else {
      const groupId = await chrome.tabs.group({ tabIds: [tabId] });
      await chrome.tabGroups.update(groupId, {
        title: GROUP,
        color: "yellow",
        collapsed: false,
      });
    }
  } catch {
    /* grouping is cosmetic */
  }
}

/** Has the page put `text` in and press send. Not ok, `pressed` is what the
 * page says of send (#466): false when it was pressed on neither try, true
 * when on either; left out when the tab went away meanwhile, so it is not
 * known. */
async function submit(tabId, text) {
  try {
    let result = await chrome.tabs.sendMessage(tabId, { op: "submit", text });
    if (
      !result.ok &&
      ["send-failed", "composer-mismatch"].includes(result.reason)
    ) {
      // Some pages only accept input while the tab is in front; a draft that
      // came back in the box (#410) is emptied again on the second try.
      await chrome.tabs.update(tabId, { active: true });
      const first = result;
      result = await chrome.tabs.sendMessage(tabId, { op: "submit", text });
      if (!result.ok && first.pressed) result = { ...result, pressed: true };
    }
    return result;
  } catch {
    return { ok: false, reason: "tab-closed" };
  }
}

async function open(text, project) {
  const tab = await chrome.tabs.create({ url: project || HOME, active: false });
  opening.set(tab.id, true);
  await group(tab.id);
  try {
    if (!(await ready(tab.id, 30000))) return { ok: false, reason: "timeout" };
    const result = await submit(tab.id, text);
    if (!result.ok) return result;
    const page = await ready(tab.id, 60000, (p) => !!p.conversation);
    if (!page) return { ok: false, reason: "timeout" };
    watched.add(page.conversation);
    await chrome.storage.local.set({ watched: [...watched] });
    statusSoon();
    const state =
      (await chrome.tabs
        .sendMessage(tab.id, { op: "state" })
        .catch(() => null)) ?? {};
    // The prompt's id ties its answer to it (#410); a new conversation's
    // page may only show it once it has its address.
    const promptId = result.promptId ?? state.promptId ?? null;
    return {
      ok: true,
      conversation: page.conversation,
      title: state.title || "",
      ...(promptId && { promptId }),
    };
  } finally {
    opening.delete(tab.id);
  }
}

async function send(conversation, text) {
  // Not begun: send was not pressed (#466).
  if (!watched.has(conversation))
    return { ok: false, reason: "not-watched", pressed: false };
  let tabId = tabFor(conversation);
  if (tabId === null) {
    const tab = await chrome.tabs.create({
      url: `${HOME}c/${conversation}`,
      active: false,
    });
    tabId = tab.id;
    await group(tabId);
    if (!(await ready(tabId, 30000, (p) => p.conversation === conversation)))
      return { ok: false, reason: "timeout", pressed: false };
  }
  return submit(tabId, text);
}

/** The tab showing `conversation`: as reported, else by its address. */
async function tabShowing(conversation) {
  const known = tabFor(conversation);
  if (known !== null) return known;
  const tabs = await chrome.tabs.query({ url: `${HOME}*` });
  return (
    tabs.find((tab) => tab.url?.includes(`/c/${conversation}`))?.id ?? null
  );
}

// PostPane heard nothing of a turn it waits on (#356): the tab tells its
// newest reply again. A tab whose script was cut off (the extension
// reloaded) gets one first; a closed one is opened, as for sending. What the
// read found, and how the tab stood, goes back to PostPane (#457).
async function reread(conversation) {
  if (!watched.has(conversation)) return;
  post({ type: "reread", conversation, ...(await readAgain(conversation)) });
}

/** What reading `conversation` again found (`outcome`) and how its tab stood. */
async function readAgain(conversation) {
  let tabId = await tabShowing(conversation);
  if (tabId === null) {
    const tab = await chrome.tabs.create({
      url: `${HOME}c/${conversation}`,
      active: false,
    });
    tabId = tab.id;
    await group(tabId);
    if (!(await ready(tabId, 30000, (p) => p.conversation === conversation)))
      return { outcome: "unopened" };
  }
  const stood = await standing(tabId);
  // The tab checks it shows this conversation. One that has not drawn its
  // history yet (just opened) is asked again shortly, a few times.
  const ask = () =>
    chrome.tabs.sendMessage(tabId, { op: "reread", conversation });
  let answer;
  try {
    answer = await ask();
  } catch {
    await chrome.scripting
      .executeScript({ target: { tabId }, files: ["page.js", "content.js"] })
      .catch(() => {});
    answer = await ask().catch(() => null);
  }
  for (
    let tries = 0;
    answer?.loaded === false && tries < REREAD_TRIES;
    tries++
  ) {
    await new Promise((resolve) => setTimeout(resolve, REREAD_PAUSE));
    answer = await ask().catch(() => null);
  }
  const fronted = !!answer?.undrawn && !stood.active;
  const told = answer?.undrawn
    ? await drawnInFront(tabId, ask)
    : !!answer?.told;
  return { outcome: outcomeOf(answer, told), ...stood, fronted };
}

/** What a read's answer comes to: told, or why not. */
function outcomeOf(answer, told) {
  if (!answer) return "unreachable";
  if (told) return "told";
  if (answer.undrawn) return "undrawn";
  if (answer.streaming) return "streaming";
  if (answer.loaded === false) return "unloaded";
  // Not answered yet, or the answer still changing.
  return "waiting";
}

/** How `tabId` stood: hidden as its page last said, in front of its window,
 * its window minimized. */
async function standing(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const window =
    tab && (await chrome.windows.get(tab.windowId).catch(() => null));
  return {
    hidden: !!pages.get(tabId)?.hidden,
    active: !!tab?.active,
    minimized: window?.state === "minimized",
  };
}
const REREAD_TRIES = 5;
const REREAD_PAUSE = 2000;

// ChatGPT draws nothing new in a tab in the background (#410, 2026-11-19: an
// answer stayed undrawn until the tab was shown). One answered but not drawn
// is put in front of its window for a moment and asked again; the tab that
// was in front comes back, unless the person moved on meanwhile. The window
// itself is not raised: one off screen still draws nothing (#457). Whether
// the answer was told.
async function drawnInFront(tabId, ask) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || tab.active) return false;
  const front = (
    await chrome.tabs.query({ active: true, windowId: tab.windowId })
  ).find((t) => t.active);
  await chrome.tabs.update(tabId, { active: true });
  let told = false;
  for (let tries = 0; tries < FRONT_TRIES && !told; tries++) {
    await new Promise((resolve) => setTimeout(resolve, FRONT_PAUSE));
    told = !!(await ask().catch(() => null))?.told;
  }
  const now = await chrome.tabs.get(tabId).catch(() => null);
  if (front && now?.active)
    await chrome.tabs.update(front.id, { active: true }).catch(() => {});
  return told;
}
const FRONT_TRIES = 3;
const FRONT_PAUSE = 1500;

async function focus(conversation) {
  const tabId = tabFor(conversation);
  if (tabId === null) {
    await chrome.tabs.create({ url: `${HOME}c/${conversation}`, active: true });
    return;
  }
  const tab = await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

// --- Status ------------------------------------------------------------------

let statusTimer = null;
function statusSoon() {
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    const conversations = [...watched].map((id) => {
      const tabId = tabFor(id);
      return {
        id,
        open: tabId !== null,
        hidden: tabId !== null && !!pages.get(tabId).hidden,
      };
    });
    post({ type: "tabs", conversations });
  }, 1000);
}

// --- Content scripts ---------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  if (message.type === "page") {
    const page = {
      conversation: message.conversation,
      hidden: message.hidden,
      streaming: message.streaming,
    };
    pages.set(tabId, page);
    for (const check of waiters.get(tabId) || []) check(page);
    statusSoon();
  } else if (message.type === "turn") {
    // A new chat's first start, before it has an address, says nothing yet.
    if (message.conversation) post(message);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pages.delete(tabId);
  statusSoon();
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  // A tab navigating away from chatgpt.com no longer runs our content script.
  if (change.url && !change.url.startsWith(HOME)) {
    pages.delete(tabId);
    statusSoon();
  }
});

// A restarted worker has lost its tab map; ask the tabs already open.
async function resync() {
  for (const tab of await chrome.tabs.query({ url: `${HOME}*` })) {
    const state = await chrome.tabs
      .sendMessage(tab.id, { op: "state" })
      .catch(() => null);
    if (state)
      pages.set(tab.id, {
        conversation: state.conversation,
        hidden: state.hidden,
        streaming: state.streaming,
      });
  }
  statusSoon();
}

// Installing, updating or reloading the extension gives the chatgpt.com tabs
// already open no content script, and cuts the old one off: replies in them
// went unreported until the tab was reloaded (#206). Put one in each; a tab
// that cannot take it (discarded, still loading) gets one when it loads.
chrome.runtime.onInstalled.addListener(async () => {
  for (const tab of await chrome.tabs.query({ url: `${HOME}*` })) {
    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ["page.js", "content.js"],
      })
      .catch(() => {});
  }
  resync();
});

chrome.storage.local.get("watched").then(({ watched: saved }) => {
  if (saved && !watched.size) watched = new Set(saved);
});
resync();
connect();
