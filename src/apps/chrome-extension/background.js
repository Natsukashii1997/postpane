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
      await setShadow(message.shadow === true);
      statusSoon();
      break;
    case "open": {
      const result = await open(message.text, message.project);
      post({ type: "opened", requestId: message.requestId, ...result });
      wrote(result.conversation, result);
      break;
    }
    case "send": {
      const result = await send(message.conversation, message.text);
      post({ type: "sent", requestId: message.requestId, ...result });
      wrote(message.conversation, result);
      break;
    }
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

/** How long a sending has to get to pressing send. PostPane waits
 * `SEND_TIME` (30 s) for word of it, and what is said after that of words
 * never pressed is not heard: they would be kept as not known to have gone
 * (#466 review P1-01). So less than that, with room for the answer to get
 * back; a test holds the two apart. */
const PRESS_BY = 25000;

/** What `step` comes to, true when to nothing. With `until`, null when
 * there is no time left to begin it, when it fails (thrown, too), or when it
 * is not done by then: nothing on the way to pressing send may outlast the
 * time a sending has, and what is late is not gone on from (#466 review
 * P1-02). Late, the step itself is not undone. */
function by(until, step) {
  if (!until) return step().then((value) => value ?? true);
  return new Promise((done) => {
    const left = until - Date.now();
    if (left <= 0) return done(null);
    const timer = setTimeout(() => done(null), left);
    new Promise((came) => came(step()))
      .then(
        (value) => done(Date.now() >= until ? null : (value ?? true)),
        () => done(null),
      )
      .finally(() => clearTimeout(timer));
  });
}

/** What a second failed try says, with what the two say of send together
 * (#466 review P1-03): pressed when either was; not pressed only when both
 * say so; else left out. A try that does not say (the page threw) may have
 * pressed, and "not pressed" lets the same words go again. */
function both(first, second) {
  const { pressed, ...told } = second;
  if (first.pressed === true || pressed === true)
    return { ...told, pressed: true };
  if (first.pressed === false && pressed === false)
    return { ...told, pressed: false };
  return told;
}

/** Has the page put `text` in and press send, by `until` when given. Not
 * ok, `pressed` is what the page says of send (#466): false when it was
 * pressed on neither try, true when on either; left out when it is not
 * known: a try did not say, or went out and the tab went away meanwhile. */
async function submit(tabId, text, until) {
  const closed = { ok: false, reason: "tab-closed" };
  const ask = { op: "submit", text, ...(until && { until }) };
  let first;
  try {
    first = await chrome.tabs.sendMessage(tabId, ask);
    const again =
      !first.ok && ["send-failed", "composer-mismatch"].includes(first.reason);
    if (!again) return first;
    // Some pages only accept input while the tab is in front; a draft that
    // came back in the box (#410) is emptied again on the second try. Not in
    // front by `until`, the second try is not begun, and what the first said
    // of send stands (#466 review P1-02).
    const front = () => chrome.tabs.update(tabId, { active: true });
    if (!(await by(until, front))) return first;
  } catch {
    return closed;
  }
  try {
    const second = await chrome.tabs.sendMessage(tabId, ask);
    return second.ok ? second : both(first, second);
  } catch {
    // No word back of the second try: it may have pressed.
    return first.pressed === true ? { ...closed, pressed: true } : closed;
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
  const until = Date.now() + PRESS_BY;
  let tabId = tabFor(conversation);
  if (tabId === null) {
    // No tab made, grouped and loaded in time: the page is not asked, so
    // send was not pressed (a page there all the same is not asked late).
    const late = { ok: false, reason: "timeout", pressed: false };
    const url = `${HOME}c/${conversation}`;
    const tab = await by(until, () =>
      chrome.tabs.create({ url, active: false }),
    );
    if (!tab) return late;
    tabId = tab.id;
    if (!(await by(until, () => group(tabId)))) return late;
    const loaded = (p) => p.conversation === conversation;
    if (!(await ready(tabId, until - Date.now(), loaded))) return late;
    if (Date.now() >= until) return late;
  }
  return submit(tabId, text, until);
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
  const found = await readAgain(conversation);
  post({ type: "reread", conversation, ...found });
  shadowRead(conversation, "reread", { pageOutcome: found.outcome });
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

// --- Shadow read of ChatGPT's own data (#488) --------------------------------

// While PostPane's shadow switch is on, a reply is also read from the data
// chatgpt.com loads for itself (data.js, in the page's own world), and what
// that found is told beside what the page drew: recorded, never acted on.
// Each prompt is read at most three times, each on something that happened:
// the page reported its reply, PostPane had it read again, 20 s after it was
// sent; a read is one request, or two when the prompt is further back. Only
// watched conversations, only while PostPane is connected. The page is
// called through chrome.scripting and answers the same way: nothing goes
// over the page's own messages, and what comes back is checked field by
// field before it is told (#488 review P1-01).
const DATA_SCRIPT = {
  id: "postpane-data",
  js: ["data.js"],
  matches: [`${HOME}*`],
  runAt: "document_start",
  world: "MAIN",
};
const WRITING_AFTER = 20000;
// A read these answer ends every read: signed out, refused, too many.
const HALT = [401, 403, 429];
let shadow = false;
let halted = false;
const unread = new Set(); // conversations a read failed on: not read again
// What was read, kept so a restarted worker reads nothing twice (review
// P1-03): conversation -> {promptId, whys}; and the prompt PostPane's
// words, or the page's reply, last named in each conversation.
let ledger = {};
let prompts = {};
const restored = chrome.storage.local
  .get(["shadowLedger", "shadowPrompts"])
  .then((kept) => {
    ledger = kept.shadowLedger ?? {};
    prompts = kept.shadowPrompts ?? {};
  })
  .catch(() => {});

/** Switches the shadow read, as PostPane says with each list. On: data.js
 * goes into chatgpt.com pages as they load, and into the ones open now.
 * Off: it no longer goes in, and every copy in a page is stopped; until
 * each is known stopped, the switch-off is tried again with each list
 * (review P1-02). What was switched is what this extension kept. */
async function setShadow(on) {
  await restored;
  const kept = await chrome.storage.local.get([
    "shadow",
    "shadowStops",
    "shadowDisarm",
  ]);
  const was = kept.shadow === true;
  shadow = on;
  // On since before (a restarted worker told again): its stops still hold.
  if (on && was) {
    halted = !!kept.shadowStops?.halted;
    unread.clear();
    for (const id of kept.shadowStops?.unread ?? []) unread.add(id);
  }
  if (on !== was) {
    halted = false;
    unread.clear();
    await chrome.storage.local.set({
      shadow,
      shadowStops: stops(),
      ...(on ? {} : { shadowDisarm: { pending: true } }),
    });
  }
  if (on) {
    await chrome.scripting
      .getRegisteredContentScripts({ ids: [DATA_SCRIPT.id] })
      .then((there) =>
        there.length
          ? null
          : chrome.scripting.registerContentScripts([DATA_SCRIPT]),
      )
      .catch(() => {});
    if (!was) await everyPage({ files: DATA_SCRIPT.js });
  } else if (!was ? kept.shadowDisarm?.pending : true) await disarm();
}

/** Runs `what` in the page's own world of every chatgpt.com tab: the
 * results, by tab, and the tabs it could not run in. */
async function everyPage(what) {
  const done = {};
  const failed = [];
  for (const tab of await chrome.tabs.query({ url: `${HOME}*` })) {
    const ran = await chrome.scripting
      .executeScript({ target: { tabId: tab.id }, world: "MAIN", ...what })
      .catch(() => null);
    if (ran) done[tab.id] = ran[0]?.result ?? null;
    else failed.push(tab);
  }
  return { done, failed };
}

/** Takes data.js out: no longer put into pages, and stopped in each one
 * open now. A tab it could not reach that is discarded has no page
 * running, and loads without it; any other is tried again later. */
async function disarm() {
  let unregistered = false;
  try {
    const there = await chrome.scripting.getRegisteredContentScripts({
      ids: [DATA_SCRIPT.id],
    });
    if (there.length)
      await chrome.scripting.unregisterContentScripts({
        ids: [DATA_SCRIPT.id],
      });
    unregistered = !(
      await chrome.scripting.getRegisteredContentScripts({
        ids: [DATA_SCRIPT.id],
      })
    ).length;
  } catch {
    // Left registered: tried again.
  }
  const { done, failed } = await everyPage({ func: stopInPage });
  const live = failed.filter((tab) => !tab.discarded).map((tab) => tab.id);
  const pending = !unregistered || live.length > 0;
  await chrome.storage.local.set({
    shadowDisarm: { pending, unregistered, failed: live, at: Date.now() },
  });
  const stopped = Object.values(done).filter((r) => r?.stopped).length;
  post({
    type: "shadow",
    why: "off",
    at: Date.now(),
    outcome: pending ? "disarm-pending" : "disarmed",
    tabs: Object.keys(done).length,
    stopped,
    failed: live.length,
    unregistered,
  });
}

// Run in the page's own world: no closure, only what is passed.
function stopInPage() {
  return window[Symbol.for("postpane.data")]?.stop() ?? { absent: true };
}
function readInPage(conversation, promptId) {
  const there = window[Symbol.for("postpane.data")];
  return there ? there.read(conversation, promptId) : { outcome: "no-script" };
}

const stops = () => ({ halted, unread: [...unread] });

/** Words went out to `conversation`: the prompt they became is the one its
 * reads look for, and the data is read once while the answer is written.
 * Words whose prompt is not known leave none, and that read says so. */
async function wrote(conversation, result) {
  if (!result.ok || !conversation) return;
  await restored;
  if (result.promptId) prompts[conversation] = result.promptId;
  else delete prompts[conversation];
  await chrome.storage.local.set({ shadowPrompts: prompts });
  if (shadow)
    setTimeout(() => shadowRead(conversation, "writing"), WRITING_AFTER);
}

/** Reads `conversation` from the data, once per prompt for each `why`, and
 * tells PostPane what that found, with `beside` (what the page made of it).
 * It is marked read before it is read. A read that failed ends the reads
 * of that conversation; one refused or over a limit ends them all, until
 * the switch goes off and on. With no prompt known, nothing is read. */
async function shadowRead(conversation, why, beside = {}) {
  await restored;
  if (!shadow || !port || halted) return;
  if (!watched.has(conversation) || unread.has(conversation)) return;
  // The prompt a reply answers is the one the page says; it is the one the
  // conversation's later reads look for too (review P2-01).
  if (beside.pagePromptId) prompts[conversation] = beside.pagePromptId;
  const promptId = prompts[conversation] ?? null;
  const round = ledger[conversation];
  const whys = round?.promptId === promptId ? round.whys : [];
  if (whys.includes(why)) return;
  ledger[conversation] = { promptId, whys: [...whys, why] };
  await chrome.storage.local.set({
    shadowLedger: ledger,
    shadowPrompts: prompts,
  });
  const told = {
    type: "shadow",
    conversation,
    why,
    at: Date.now(),
    asked: promptId,
    ...beside,
  };
  if (!promptId) return post({ ...told, outcome: "no-prompt" });
  const tabId = await tabShowing(conversation);
  if (tabId === null) return post({ ...told, outcome: "no-tab" });
  const ran = await chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: readInPage,
      args: [conversation, promptId],
    })
    .catch(() => null);
  const answer = ran ? summary(ran[0]?.result) : { outcome: "unreachable" };
  // A page open since before the switch went on, missed when it was turned
  // on: data.js is put in now, and hears the page's sign-in on its next
  // request.
  if (answer.outcome === "no-script")
    await chrome.scripting
      .executeScript({
        target: { tabId },
        files: DATA_SCRIPT.js,
        world: "MAIN",
      })
      .catch(() => {});
  if (answer.outcome === "http" || answer.outcome === "error") {
    if (HALT.includes(answer.status)) halted = true;
    else unread.add(conversation);
    await chrome.storage.local.set({ shadowStops: stops() });
  }
  post({ ...told, ...answer });
}

// What a page may say of a read: these fields, of these kinds, and nothing
// else. Anything else makes it `invalid`, naming the fields (review P1-01).
const WORD = /^[a-z][a-z0-9_-]{0,39}$/i;
const ANY_ID = /^[0-9a-z][0-9a-z_-]{0,63}$/i;
const count = (v) => Number.isInteger(v) && v >= 0 && v <= 1e9;
const word = (v) => v === null || (typeof v === "string" && WORD.test(v));
const anId = (v) => v === null || (typeof v === "string" && ANY_ID.test(v));
const flag = (v) => typeof v === "boolean";
const maybe = (test) => (v) => v === null || test(v);
const OUTCOMES = [
  "read",
  "http",
  "error",
  "unreadable",
  "no-login",
  "other-conversation",
  "stopped",
  "limited",
  "no-script",
];
const SUMMARY = {
  outcome: (v) => OUTCOMES.includes(v),
  status: (v) => Number.isInteger(v) && v >= 100 && v <= 599,
  turns: (v) => v === 2 || v === 10,
  tries: (v) => v === 1 || v === 2,
  bytes: count,
  ms: count,
  hidden: flag,
  login: (v) => v === "same" || v === "other",
  messages: count,
  more: flag,
  asyncStatus: word,
  asked: anId,
  askFound: flag,
  prompt: anId,
  after: count,
  exchange: maybe(flag),
  written: flag,
  missing: (v) =>
    Array.isArray(v) &&
    v.length <= 8 &&
    v.every((m) => typeof m === "string" && /^[a-z_.[\]]{1,48}$/i.test(m)),
  last: maybe((v) =>
    fits(v, { role: word, channel: word, status: word, type: word }),
  ),
  final: maybe((v) =>
    fits(v, {
      id: (x) => typeof x === "string" && ANY_ID.test(x),
      status: word,
      endTurn: maybe(flag),
      complete: maybe(flag),
      finish: word,
      chars: count,
      sha: (x) => typeof x === "string" && /^[0-9a-f]{16}$/.test(x),
    }),
  ),
};
const fits = (value, shape) =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.entries(value).every(([key, v]) => shape[key]?.(v));

/** What a page said of a read, if it is a summary and only that. */
function summary(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { outcome: "invalid", fields: [] };
  const bad = Object.entries(raw)
    .filter(([key, v]) => !SUMMARY[key]?.(v))
    .map(([key]) => (WORD.test(key) ? key : "?"));
  if (bad.length || !("outcome" in raw))
    return { outcome: "invalid", fields: [...new Set(bad)].slice(0, 8) };
  return JSON.parse(JSON.stringify(raw));
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
    if (!message.conversation) return;
    post(message);
    if (message.phase === "complete")
      shadowRead(message.conversation, "complete", {
        pagePromptId: message.promptId ?? null,
        pageMessageId: message.messageId ?? null,
        pageChars: (message.reply ?? "").length,
      });
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
