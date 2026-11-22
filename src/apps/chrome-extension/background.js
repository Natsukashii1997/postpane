// Bridges chatgpt.com tabs and PostPane over Chrome Native Messaging.
// Protocol: docs/chatgpt-channel.md. Every conversation's turns are reported
// (#145); only conversations on PostPane's watch list are sent to.
const HOST = "com.postpane.chatgpt";
const HOME = "https://chatgpt.com/";
const GROUP = "驿窗接力";

let port = null;
let retry = 5000;
let watched = new Set();
const pages = new Map(); // tabId -> {conversation, hidden}
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
  // PostPane (started again) knows of no tab yet, nor of any answer being
  // written: each says again.
  resync();
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
      const begun = generation;
      const result = await open(message.text, message.project);
      post({ type: "opened", requestId: message.requestId, ...result });
      wrote(result.conversation, result, { begun });
      break;
    }
    case "send": {
      const sent = sending(message.conversation);
      const result = await send(message.conversation, message.text);
      post({ type: "sent", requestId: message.requestId, ...result });
      wrote(message.conversation, result, sent);
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
async function submit(tabId, text, until, conversation) {
  const closed = { ok: false, reason: "tab-closed" };
  // With `conversation`, the page presses send only while it shows it (#507
  // review P1-03): a tab may be moved to another between being asked whether
  // it is there and pressing send.
  const ask = {
    op: "submit",
    text,
    ...(until && { until }),
    ...(conversation && { conversation }),
  };
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

/** How long a page has to say it is there (#507); and, when it did not, to
 * take a script and say so asked a second time. */
const ALIVE_BY = 2000;
const ALIVE_AGAIN_BY = 8000;

/** How many tabs may show one conversation before no more is made for it:
 * the one that says nothing, and one in its place. */
const TABS_MOST = 2;

/** How long a tab Chrome made late (past the time of the one who asked for
 * it) is waited for to show its conversation, while none other is made. */
const MADE_BY = 15000;

/** What the page in `tabId` says of itself, asked by `until`: the
 * conversation it shows (null: none) and whether it is hidden; undefined
 * when it says nothing by then. */
async function shown(tabId, until) {
  const said = await by(until, () =>
    chrome.tabs.sendMessage(tabId, { op: "alive" }),
  );
  return said && said !== true
    ? { conversation: said.conversation ?? null, hidden: !!said.hidden }
    : undefined;
}

/** Puts the content scripts in `tabId` by `until`: "in", "refused" when
 * Chrome will not, and null when it is not done by then. Refused is not the
 * same as not done in time: a frozen page takes the script once it runs
 * again, and till then nothing comes back. */
function scripted(tabId, until) {
  return by(until, () =>
    chrome.scripting
      .executeScript({ target: { tabId }, files: ["page.js", "content.js"] })
      .then(
        () => "in",
        () => "refused",
      ),
  );
}

/** Whether Chrome says no page is loaded in `tab`: it discarded it, or it
 * has no live main frame (`status: "unloaded"`: its page crashed, or its
 * loading was put off as a session was restored; Chromium's
 * `ExtensionTabUtil::GetLoadingStatus`, round 4 review). */
const unloaded = (tab) => !!tab && (tab.discarded || tab.status === "unloaded");

/** How a tab that may show `conversation` stands, asked whether it is there
 * (#507). A tab Chrome discarded says nothing (and has a new id: the one it
 * had is listed still, and is no tab's): words to one came back
 * `tab-closed`, or not at all, and were kept as not known to have gone.
 * - "there": its page answers, and shows the conversation;
 * - "stale": no page of the conversation runs in it, so loading it again
 *   ends nothing: it is at the conversation's address, and Chrome itself
 *   says nothing is loaded in it (`unloaded`: discarded, or its page
 *   crashed). A script refused is not that (review round 3, P1-01): Chrome
 *   refuses one as the tab's document gives way to another, which is alive;
 *   and why it refused is not gone by;
 * - "away": anything else, and it is left as it is (review P1-01): no such
 *   tab, another conversation (it is listed for that one, then) or another
 *   site by now, or a page that says nothing even asked a second time with
 *   a script put in, or that takes none (frozen, busy, on its way in). That
 *   page may be writing an answer, which loading it again would
 *   end; what it last said of that is not gone by, since a restarted worker
 *   has not heard it. A page cut off from the extension (reloaded) answers
 *   once it has the script, and so does one that was only slow. */
async function stands(tabId, conversation, until) {
  // Chrome tells a tab's address only at chatgpt.com: a listed tab that
  // went to another site (nothing says so) has none, and is not this
  // extension's to load again.
  const tab = async () => {
    const tab = await by(until, () => chrome.tabs.get(tabId));
    return tab?.url?.includes(`/c/${conversation}`) ? tab : null;
  };
  let said = await shown(tabId, Math.min(until, Date.now() + ALIVE_BY));
  if (said === undefined) {
    const before = await tab();
    if (!before) return "away";
    if (unloaded(before)) return "stale";
    const again = Math.min(until, Date.now() + ALIVE_AGAIN_BY);
    // Refused, as Chrome has the tab now: it may have unloaded it since.
    if ((await scripted(tabId, again)) === "refused")
      return unloaded(await tab()) ? "stale" : "away";
    said = await shown(tabId, again);
  }
  if (!said) return "away";
  // Listed as it says, if it was not: a worker that restarted may not have
  // heard from it, and one that moved on says so only as its page changes.
  if (pages.get(tabId)?.conversation !== said.conversation) {
    pages.set(tabId, said);
    statusSoon();
  }
  return said.conversation === conversation ? "there" : "away";
}

/** Loads `tabId` again (#507), that tab and no other showing the same
 * conversation (review P2-01): true once its page reports showing
 * `conversation`, by `until`; false when it does not by then (begun or
 * not: out of time it may load again all the same); null when it cannot be
 * loaded again (no such tab). */
async function loadAgain(tabId, conversation, until) {
  pages.delete(tabId);
  const begun = await by(until, () =>
    chrome.tabs.reload(tabId).then(
      () => "begun",
      () => "refused",
    ),
  );
  if (begun === "refused") return null;
  const loaded = (p) => p.conversation === conversation;
  const page = begun && (await ready(tabId, until - Date.now(), loaded));
  return !!page && Date.now() < until;
}

/** The tabs open at chatgpt.com that show `conversation` by their address,
 * or are on their way to it (`pendingUrl`: a tab just made has no address
 * till its page commits, and Chrome finds none by a query for one; round 4
 * review P2-02); null when Chrome does not say by `until`: not none. */
async function tabsAt(conversation, until) {
  const tabs = await by(until, () => chrome.tabs.query({}));
  const at = (tab) =>
    [tab.url, tab.pendingUrl].some((url) =>
      url?.includes(`/c/${conversation}`),
    );
  return Array.isArray(tabs) ? tabs.filter(at) : null;
}

/** The tab being made for each conversation: two looking for a tab at once
 * (a sending and a read) do not each make one. Till its page reports or the
 * time for it is up, and till Chrome has said what came of the tab asked
 * for, however long that takes (review P2-02): out of time, the one who
 * asked goes on without it, and Chrome may make it all the same. */
const making = new Map();

/** A tab whose page says, by `until`, that it shows `conversation` (#507):
 * `tabId`, with `reloaded` when it was loaded again and `made` when it was
 * made for it. None by then: no `tabId`.
 *
 * Each tab that may show it is asked, the listed ones first, then the ones
 * at its address (a discarded tab is listed under the id it had). A stale
 * one is loaded again; any other that is not there is passed over and left
 * as it is, and dropped from the list (its page reports again when it can).
 * With none left one is made, unless `TABS_MOST` show the conversation
 * already: then PostPane hears the words did not go, or the read reached
 * nothing, and asks again later. */
async function reach(conversation, until) {
  const passed = new Set();
  const next = async () => {
    for (const [tabId, page] of pages)
      if (page.conversation === conversation && !passed.has(tabId))
        return tabId;
    // Chrome not saying which are open: not known whether one is there.
    const open = await tabsAt(conversation, until);
    if (!open) return undefined;
    return open.find((tab) => !passed.has(tab.id))?.id ?? null;
  };
  for (;;) {
    const tabId = await next();
    if (tabId === undefined || Date.now() >= until) return {};
    if (tabId === null) {
      // One being made for it is waited for, and asked like any other.
      const other = making.get(conversation);
      if (!other) break;
      await by(until, () => other);
      continue;
    }
    const how = await stands(tabId, conversation, until);
    if (Date.now() >= until) return {};
    if (how === "there") return { tabId };
    passed.add(tabId);
    // One that answered is listed by now as showing what it does.
    if (pages.get(tabId)?.conversation === conversation) pages.delete(tabId);
    if (how !== "stale") continue;
    const again = await loadAgain(tabId, conversation, until);
    if (again) return { tabId, reloaded: true };
    if (again === false) return { reloaded: true };
  }
  // Said at once, before anything is waited for: another looking for a tab
  // meanwhile waits for this one.
  const asked = {};
  const made = make(conversation, until, asked);
  const done = made.then(() => asked.till).catch(() => {});
  making.set(conversation, done);
  done.then(
    () => making.get(conversation) === done && making.delete(conversation),
  );
  return made;
}

/** Makes a tab for `conversation`, in its group, unless `TABS_MOST` show it
 * already, or Chrome does not say how many do: `{tabId, made}` once its
 * page reports, by `until`; `{made}` when it does not by then; `{}` when
 * none was made. `asked.till`: till Chrome has answered for the tab, and
 * the tab it made, if any, shows the conversation or `MADE_BY` is up, to
 * wait on past `until`: a tab just made has no address yet, and is not
 * found at the conversation's (review P2-02). */
async function make(conversation, until, asked = {}) {
  const open = await tabsAt(conversation, until);
  if (!open || open.length >= TABS_MOST) return {};
  if (Date.now() >= until) return {};
  const url = `${HOME}c/${conversation}`;
  const loaded = (p) => p.conversation === conversation;
  const answered = new Promise((came) =>
    came(chrome.tabs.create({ url, active: false })),
  ).then(
    (tab) => tab,
    () => false,
  );
  asked.till = answered.then((tab) => tab && ready(tab.id, MADE_BY, loaded));
  const tab = await by(until, () => answered);
  // Out of time, Chrome may make it all the same.
  if (tab === false) return {};
  const made = { made: true };
  if (!tab) return made;
  if (!(await by(until, () => group(tab.id)))) return made;
  if (!(await ready(tab.id, until - Date.now(), loaded))) return made;
  return Date.now() < until ? { tabId: tab.id, ...made } : made;
}

async function send(conversation, text) {
  // Not begun: send was not pressed (#466).
  if (!watched.has(conversation))
    return { ok: false, reason: "not-watched", pressed: false };
  const until = Date.now() + PRESS_BY;
  // No tab that says it shows the conversation, made, grouped and loaded in
  // time: the page is not asked, so send was not pressed (a page there all
  // the same is not asked late).
  const { tabId } = await reach(conversation, until);
  if (tabId === undefined)
    return { ok: false, reason: "timeout", pressed: false };
  return submit(tabId, text, until, conversation);
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

/** What reading `conversation` again found (`outcome`) and how its tab
 * stood. The tab is one that says it shows the conversation (`reach`: a
 * script put in one cut off, a discarded one loaded again, one made when
 * none is there), so the read is of this conversation and no other (#507
 * review P2-01). */
async function readAgain(conversation) {
  const at = await reach(conversation, Date.now() + REACH_BY);
  const reloaded = at.reloaded && { reloaded: true };
  if (at.tabId === undefined)
    return { outcome: at.made ? "unopened" : "unreachable", ...reloaded };
  const { tabId } = at;
  const stood = await standing(tabId);
  // One that has not drawn its history yet (just opened) is asked again
  // shortly, a few times. A page that says nothing in `ASK_BY`, or shows
  // another conversation by now, counts as not answering.
  const ask = () =>
    by(Date.now() + ASK_BY, () =>
      chrome.tabs.sendMessage(tabId, { op: "reread", conversation }),
    ).then((said) => (said === true || said?.ok === false ? null : said));
  let answer = await ask();
  for (
    let tries = 0;
    answer?.loaded === false && tries < REREAD_TRIES;
    tries++
  ) {
    await new Promise((resolve) => setTimeout(resolve, REREAD_PAUSE));
    answer = await ask();
  }
  const fronted = !!answer?.undrawn && !stood.active;
  const told = answer?.undrawn
    ? await drawnInFront(tabId, ask)
    : !!answer?.told;
  return { outcome: outcomeOf(answer, told), ...stood, fronted, ...reloaded };
}
/** How long a read has to get to a tab that shows the conversation. */
const REACH_BY = 45000;
const ASK_BY = 10000;

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

/** How long Chrome has to say how a tab stands, or to put one in front,
 * when a read is on its way (review P2-04): past it the read goes on
 * without. */
const CHROME_BY = 3000;
/** What Chrome answers `ask` of its tabs or windows; null when it fails or
 * does not by `CHROME_BY`. */
const chromeSays = (ask) => by(Date.now() + CHROME_BY, ask);

/** How `tabId` stood: hidden as its page last said, in front of its window,
 * its window minimized; what Chrome does not say in time counts as not. */
async function standing(tabId) {
  const tab = await chromeSays(() => chrome.tabs.get(tabId));
  const window =
    tab && (await chromeSays(() => chrome.windows.get(tab.windowId)));
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
  const tab = await chromeSays(() => chrome.tabs.get(tabId));
  if (!tab || tab.active) return false;
  const active = { active: true };
  const fronts = await chromeSays(() =>
    chrome.tabs.query({ ...active, windowId: tab.windowId }),
  );
  if (!Array.isArray(fronts)) return false;
  const front = fronts.find((t) => t.active);
  // Not known to be in front in time, it is not read as if it were; the
  // tab that was in front is put back all the same, in case it came late.
  const put = await chromeSays(() => chrome.tabs.update(tabId, active));
  let told = false;
  for (let tries = 0; put && tries < FRONT_TRIES && !told; tries++) {
    await new Promise((resolve) => setTimeout(resolve, FRONT_PAUSE));
    told = !!(await ask().catch(() => null))?.told;
  }
  // Put back only from this tab, known to be in front still: the person may
  // have moved on meanwhile, and not known, nothing is moved (round 4 review
  // P2-05). Asked to the front with no word back, it may come late: then it
  // stays, rather than the two moves crossing.
  const now = await chromeSays(() => chrome.tabs.get(tabId));
  if (front && now?.active)
    await chromeSays(() => chrome.tabs.update(front.id, active));
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
// Registered with it, in the same call: leaves a mark in the extension's own
// world of each page loaded with data.js, the evidence a read is trusted on
// (review round 4, P1-01).
const MARK_SCRIPT = {
  id: "postpane-mark",
  js: ["mark.js"],
  matches: [`${HOME}*`],
  runAt: "document_start",
  world: "ISOLATED",
};
const SCRIPTS = [DATA_SCRIPT, MARK_SCRIPT];
const IDS = SCRIPTS.map((script) => script.id);
const WRITING_AFTER = 20000;
// A read these answer ends every read: signed out, refused, too many.
const HALT = [401, 403, 429];
// Reads and pages kept at most: the oldest go first.
const KEEP = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v) => typeof v === "string" && UUID.test(v);
let shadow = false;
let halted = false;
const unread = new Set(); // conversations a read failed on: not read again
// Moved on by every switching: work begun before stops at its next step,
// and a switch-off waits for all of it (review P1-02).
let generation = 0;
const inflight = new Set();
// Kept so a restarted worker reads nothing twice (review P1-03, P2-05):
// what was read, `conversation:prompt` -> the whys; the prompt PostPane's
// words became in each conversation; and the pages data.js was put into
// after they loaded (`late`) or found a handle in already (`conflict`). Not
// restored, nothing is registered, put in or read, and none of it is
// written over.
let ledger = {};
let prompts = {};
let docs = {};
let ledgerOk = false;
const plain = (v) =>
  v === undefined || (!!v && typeof v === "object" && !Array.isArray(v));
const restored = chrome.storage.local
  .get(["shadowLedger", "shadowPrompts", "shadowDocs"])
  .then((kept) => {
    if (![kept.shadowLedger, kept.shadowPrompts, kept.shadowDocs].every(plain))
      return;
    ledger = kept.shadowLedger ?? {};
    prompts = kept.shadowPrompts ?? {};
    docs = kept.shadowDocs ?? {};
    ledgerOk = true;
  })
  .catch(() => {});
// The reads due 20 s after words went out: none outlives a switching
// (review round 4, P2-08).
const timers = new Set();
// Words sent, by conversation: only the latest one's prompt is kept as the
// conversation's (review P2-09).
const sends = new Map();

/** Keeps `work` among what a switch-off waits for. */
function track(work) {
  inflight.add(work);
  const done = () => inflight.delete(work);
  work.then(done, done);
  return work;
}

/** Drops the oldest of `kept` beyond KEEP. */
function trim(kept) {
  const names = Object.keys(kept);
  for (const name of names.slice(0, Math.max(0, names.length - KEEP)))
    delete kept[name];
}

/** Switches the shadow read, as PostPane says with each list. On: data.js
 * goes into chatgpt.com pages as they load, and into the ones open now;
 * until it is in all it could be, the switch-on is tried again with each
 * list (review P2-03). Off: it no longer goes in, and every copy in a page
 * is stopped; until each is known stopped, the switch-off is tried again
 * with each list (review P1-02). What was switched is what this extension
 * kept. */
function setShadow(on) {
  // What was begun before stops at once; the switching itself waits its turn,
  // so a switch-off never runs beside a switch-on (review P1-02).
  if (on !== shadow) {
    generation++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  }
  shadow = on;
  const gen = generation;
  const next = switching.then(() => applyShadow(on, gen));
  switching = next.catch(() => {});
  return next;
}
let switching = Promise.resolve();

/** Does what `setShadow(on)` asked, as of switching `gen`. Switched again
 * since, at any step, it stops there: the later switching does it (review
 * round 4, P1-02). A switch-off takes data.js out whenever anything of it
 * may be registered, whatever was kept. */
async function applyShadow(on, gen) {
  const stale = () => gen !== generation;
  await restored;
  if (stale()) return;
  const kept = await chrome.storage.local.get([
    "shadow",
    "shadowStops",
    "shadowDisarm",
    "shadowArm",
  ]);
  if (stale()) return;
  const was = kept.shadow === true;
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
      shadow: on,
      shadowStops: stops(),
      ...(on
        ? { shadowArm: { pending: true, all: true } }
        : { shadowDisarm: { pending: true } }),
    });
    if (stale()) return;
  }
  // Registered again with each list; pages only as many as are left.
  if (on) {
    const left = !was
      ? { all: true }
      : kept.shadowArm?.pending
        ? kept.shadowArm
        : { failed: [] };
    await track(arm(left, gen));
  } else if (was || kept.shadowDisarm?.pending || (await registeredAny()))
    await disarm();
}

/** Whether anything of data.js is registered; not known counts as yes. */
async function registeredAny() {
  try {
    return (
      (await chrome.scripting.getRegisteredContentScripts({ ids: IDS }))
        .length > 0
    );
  } catch {
    return true;
  }
}

/** Registers data.js, and puts it into the pages `left` names (all, or the
 * ones it could not go into before). A discarded tab runs no page, and
 * loads with it registered. */
async function arm(left, gen) {
  const begun = gen;
  const stale = () => begun !== generation || !shadow;
  if (stale()) return;
  // What was read not known: nothing goes into any page, not even as it
  // loads; one registered before is taken out, and each copy in a page
  // stopped. Until both are known done, it is tried again with each list
  // (review P1-03, round 4).
  if (!ledgerOk) {
    const unregistered = await unregister();
    const { failed, unlisted } = await everyPage({ func: stopInPage });
    const live = failed.filter((tab) => !tab.discarded).map((tab) => tab.id);
    await chrome.storage.local.set({
      shadowArm: {
        pending: true,
        ledger: false,
        unregistered,
        failed: live,
        ...(unlisted && { unlisted: true }),
        at: Date.now(),
      },
    });
    return;
  }
  let registered = false;
  try {
    const there = await chrome.scripting.getRegisteredContentScripts({
      ids: IDS,
    });
    if (stale()) return;
    // Both or neither: data.js is not registered without its mark.
    if (there.length !== IDS.length) {
      if (there.length)
        await chrome.scripting.unregisterContentScripts({
          ids: there.map((script) => script.id),
        });
      if (stale()) return;
      await chrome.scripting.registerContentScripts(SCRIPTS);
    }
    registered = true;
  } catch {
    // Not registered: tried again.
  }
  if (stale()) return;
  const only = left?.all ? null : new Set(left?.failed ?? []);
  const failed = [];
  for (const tab of await chrome.tabs.query({ url: `${HOME}*` })) {
    if (stale()) return;
    if (only && !only.has(tab.id)) continue;
    if (!(await putIn(tab.id, begun)) && !tab.discarded) failed.push(tab.id);
  }
  if (stale()) return;
  await chrome.storage.local.set({
    shadowArm: {
      pending: !registered || failed.length > 0,
      registered,
      failed,
      at: Date.now(),
    },
  });
}

/** Puts data.js into the page in `tabId` now, after it loaded: what it reads
 * there is not trusted, and from a page that had a handle already nothing
 * is taken (review P1-01). Not once switched since `begun`, nor while what
 * was kept is not known. Whether it went in. */
async function putIn(tabId, begun) {
  if (begun !== generation || !shadow || !ledgerOk) return false;
  const ran = await chrome.scripting
    .executeScript({ target: { tabId }, files: DATA_SCRIPT.js, world: "MAIN" })
    .catch(() => null);
  const there = ran?.[0];
  if (!there) return false;
  if (there.documentId) {
    delete docs[there.documentId];
    docs[there.documentId] = there.result === "installed" ? "late" : "conflict";
    trim(docs);
    await chrome.storage.local.set({ shadowDocs: docs });
  }
  return true;
}

/** Runs `what` in the page's own world of every chatgpt.com tab: the
 * results, by tab, and the tabs it could not run in. */
async function everyPage(what) {
  const done = {};
  const failed = [];
  // Tabs not known: as if none could be reached (review round 5, P1-04).
  let tabs;
  try {
    tabs = await chrome.tabs.query({ url: `${HOME}*` });
  } catch {
    return { done, failed, unlisted: true };
  }
  for (const tab of tabs) {
    const ran = await chrome.scripting
      .executeScript({ target: { tabId: tab.id }, world: "MAIN", ...what })
      .catch(() => null);
    if (ran) done[tab.id] = ran[0]?.result ?? null;
    else failed.push(tab);
  }
  return { done, failed };
}

/** Takes data.js out: no longer put into pages, and stopped in each one
 * open now. Stopping cuts short the reads on their way; once every read and
 * putting-in begun before the switch went off has ended, each page is
 * stopped again, for any copy those put in. A tab it could not reach that
 * is discarded has no page running, and loads without it; any other is
 * tried again later. */
async function disarm() {
  // Kept first, whatever started it: a worker stopped from here on takes
  // data.js out again when it starts (review round 5, P1-04).
  await chrome.storage.local.set({
    shadowDisarm: { pending: true, at: Date.now() },
  });
  await unregister();
  await everyPage({ func: stopInPage });
  await Promise.allSettled([...inflight]);
  // Whatever those registered or put in meanwhile is taken out too.
  const unregistered = await unregister();
  const { done, failed, unlisted } = await everyPage({ func: stopInPage });
  const live = failed.filter((tab) => !tab.discarded).map((tab) => tab.id);
  const pending = !unregistered || live.length > 0 || !!unlisted;
  await chrome.storage.local.set({
    shadowDisarm: {
      pending,
      unregistered,
      failed: live,
      ...(unlisted && { unlisted: true }),
      at: Date.now(),
    },
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

/** Takes data.js's registering (and its mark's) out: whether it is known
 * gone. */
async function unregister() {
  try {
    const there = await chrome.scripting.getRegisteredContentScripts({
      ids: IDS,
    });
    if (there.length)
      await chrome.scripting.unregisterContentScripts({
        ids: there.map((script) => script.id),
      });
    return !(await chrome.scripting.getRegisteredContentScripts({ ids: IDS }))
      .length;
  } catch {
    return false; // Left registered: tried again.
  }
}

// Run in the page's own world: no closure, only what is passed. The handle
// is found by its name, a property of the window nothing in the page can
// change once there; not through anything the page could swap, such as
// Symbol.for (review P1-01).
function stopInPage() {
  return window.__postpaneData?.stop() ?? { absent: true };
}
function readInPage(conversation, promptId) {
  const there = window.__postpaneData;
  return there ? there.read(conversation, promptId) : { outcome: "no-script" };
}
// Run in the extension's own world in the page, out of the page's reach:
// the token of data.js's sign mark.js kept as this page loaded, if any.
function loadedWithData() {
  const token = globalThis.postpaneDataToken;
  return typeof token === "string" ? token : null;
}
// Run in the page's own world: the handle's proof for `nonce`.
function proveInPage(nonce) {
  return window.__postpaneData?.prove?.(nonce) ?? null;
}
const TOKEN = /^[0-9a-f]{32}$/;
const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/** Whether what the page in `tabId`, document `documentId`, said can be
 * trusted (review P1-01, new cycle round 2): mark.js kept the token of
 * data.js's sign in that very document as it loaded, data.js was not put in
 * after, and the page's handle proves it knows that token, for a nonce made
 * now. A sign another extension put in comes with no token a handle of the
 * page could prove. Not known, not trusted. */
async function trustedPage(tabId, documentId) {
  if (!documentId || docs[documentId]) return false;
  const target = { tabId, documentIds: [documentId] };
  const marked = await chrome.scripting
    .executeScript({ target, func: loadedWithData })
    .catch(() => null);
  const token =
    marked?.[0]?.documentId === documentId ? marked[0].result : null;
  if (typeof token !== "string" || !TOKEN.test(token)) return false;
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  const proved = await chrome.scripting
    .executeScript({ target, world: "MAIN", func: proveInPage, args: [nonce] })
    .catch(() => null);
  if (proved?.[0]?.documentId !== documentId) return false;
  const expected = hex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${token}:${nonce}`),
    ),
  );
  return proved[0].result === expected;
}

const stops = () => ({ halted, unread: [...unread] });

/** Words went out to `conversation`: the prompt they became is the one its
 * reads look for, and the data is read once while the answer is written,
 * for that prompt, whatever was sent after (review P2-05). Words whose
 * prompt is not known leave none, and that read says so. */
async function wrote(conversation, result, sent = {}) {
  if (!result.ok || !conversation) return;
  await restored;
  // Off, or switched while the words went out: nothing is kept (review
  // P2-08); nor what the store holds not known.
  if (!shadow || !ledgerOk || sent.begun !== generation) return;
  const promptId = isId(result.promptId) ? result.promptId : null;
  // Words sent later came back first: theirs stays the conversation's.
  if (sent.ticket === undefined || sends.get(conversation) === sent.ticket) {
    if (promptId) prompts[conversation] = promptId;
    else delete prompts[conversation];
    trim(prompts);
    await chrome.storage.local.set({ shadowPrompts: prompts });
  }
  if (!shadow || sent.begun !== generation) return;
  // Read 20 s on only if not switched meanwhile (review round 4, P2-08).
  const timer = setTimeout(() => {
    timers.delete(timer);
    if (shadow && sent.begun === generation)
      shadowRead(conversation, "writing", {}, promptId);
  }, WRITING_AFTER);
  timers.add(timer);
}

/** What words going out to `conversation` now are, for `wrote`. */
function sending(conversation) {
  const ticket = (sends.get(conversation) ?? 0) + 1;
  if (conversation) sends.set(conversation, ticket);
  return { ticket: conversation ? ticket : undefined, begun: generation };
}

/** Reads `conversation` from the data, once per prompt for each `why`, and
 * tells PostPane what that found, with `beside` (what the page made of it).
 * The prompt is `named`, else the one the page's reply answers, else the
 * one PostPane's words became. It is marked read before it is read. A read
 * that failed ends the reads of that conversation; one refused or over a
 * limit ends them all, until the switch goes off and on. With no prompt
 * known, nothing is read. */
function shadowRead(conversation, why, beside = {}, named) {
  return track(readShadow(conversation, why, beside, named));
}

async function readShadow(conversation, why, beside, named) {
  const begun = generation;
  await restored;
  if (!shadow || !port || halted || begun !== generation) return;
  if (!watched.has(conversation) || unread.has(conversation)) return;
  const told = { type: "shadow", conversation, why, at: Date.now(), ...beside };
  // What was read is not known: nothing is read (review P1-03).
  if (!ledgerOk) return post({ ...told, outcome: "ledger-unavailable" });
  const fromPage = isId(beside.pagePromptId) ? beside.pagePromptId : null;
  // Of a conversation with no prompt known yet, the page's is kept for its
  // later reads; a late reply of an earlier prompt changes nothing.
  if (fromPage && !prompts[conversation]) prompts[conversation] = fromPage;
  const promptId =
    named !== undefined ? named : (fromPage ?? prompts[conversation] ?? null);
  const key = `${conversation}:${promptId ?? "none"}`;
  const whys = ledger[key] ?? [];
  if (whys.includes(why)) return;
  delete ledger[key];
  ledger[key] = [...whys, why];
  trim(ledger);
  await chrome.storage.local.set({
    shadowLedger: ledger,
    shadowPrompts: prompts,
  });
  told.asked = promptId;
  const gone = () => begun !== generation || !shadow;
  const superseded = () => post({ ...told, outcome: "superseded" });
  if (gone()) return superseded();
  if (!promptId) return post({ ...told, outcome: "no-prompt" });
  const tabId = await tabShowing(conversation);
  if (gone()) return superseded();
  if (tabId === null) return post({ ...told, outcome: "no-tab" });
  const ran = await chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: readInPage,
      args: [conversation, promptId],
    })
    .catch(() => null);
  if (gone()) return superseded();
  const there = ran?.[0];
  let answer = there
    ? summary(there.result, promptId)
    : { outcome: "unreachable" };
  // What a page with a handle not this file's own says is not taken.
  // A page with no data.js said nothing of its own.
  if (there && docs[there.documentId] === "conflict")
    answer = { outcome: "conflict" };
  else if (there && answer.outcome !== "no-script") {
    answer.trusted = await trustedPage(tabId, there.documentId);
    if (gone()) return superseded();
  }
  // A page open since before the switch went on, missed when it was turned
  // on: data.js is put in now, and hears the page's sign-in on its next
  // request. What it reads there is not trusted.
  if (answer.outcome === "no-script") await putIn(tabId, begun);
  if (answer.outcome === "http" || answer.outcome === "error") {
    if (HALT.includes(answer.status)) halted = true;
    else unread.add(conversation);
    await chrome.storage.local.set({ shadowStops: stops() });
  }
  post({ ...told, ...answer });
}

// What a page may say of a read: these fields, of these kinds, and nothing
// else. Anything else makes it `invalid`, naming the fields (review P1-01).
// Kinds of a message are the words data.js names, or `other`.
const KINDS = {
  role: ["user", "assistant", "system", "tool"],
  channel: ["final", "analysis", "commentary"],
  status: [
    "finished_successfully",
    "in_progress",
    "finished_partial_completion",
  ],
  type: [
    "text",
    "thoughts",
    "reasoning_recap",
    "code",
    "multimodal_text",
    "execution_output",
  ],
  finish: ["stop", "max_tokens", "interrupted"],
};
const WORD = /^[a-z][a-z0-9_-]{0,39}$/i;
const count = (v) => Number.isInteger(v) && v >= 0 && v <= 1e9;
const flag = (v) => typeof v === "boolean";
const maybe = (test) => (v) => v === null || test(v);
const oneOf = (known) => maybe((v) => known.includes(v) || v === "other");
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
  "failed",
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
  asyncStatus: (v) => v === null || v === "other",
  asked: maybe(isId),
  askFound: flag,
  prompt: maybe(isId),
  after: count,
  exchange: maybe(flag),
  written: flag,
  missing: (v) =>
    Array.isArray(v) &&
    v.length <= 8 &&
    v.every((m) => typeof m === "string" && /^[a-z_.[\]]{1,48}$/i.test(m)),
  last: maybe((v) =>
    fits(v, {
      role: oneOf(KINDS.role),
      channel: oneOf(KINDS.channel),
      status: oneOf(KINDS.status),
      type: oneOf(KINDS.type),
    }),
  ),
  final: maybe((v) =>
    fits(v, {
      id: isId,
      status: oneOf(KINDS.status),
      endTurn: maybe(flag),
      complete: maybe(flag),
      finish: oneOf(KINDS.finish),
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

/** What a page said of a read of `promptId`, if it is a summary and only
 * that: of the prompt asked, and found only as that one. */
function summary(raw, promptId) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { outcome: "invalid", fields: [] };
  const bad = Object.entries(raw)
    .filter(([key, v]) => !SUMMARY[key]?.(v))
    .map(([key]) => (WORD.test(key) ? key : "?"));
  if ("asked" in raw && raw.asked !== promptId) bad.push("asked");
  if (raw.askFound === true && raw.prompt !== promptId) bad.push("askFound");
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

// A tab Chrome discards gets a new id (#507, Chromium 156): the one it had
// is no tab's from then on.
chrome.tabs.onReplaced.addListener((_added, removed) => {
  pages.delete(removed);
  statusSoon();
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  // A tab navigating away from chatgpt.com no longer runs our content script.
  if (change.url && !change.url.startsWith(HOME)) {
    pages.delete(tabId);
    statusSoon();
  }
});

// A restarted worker has lost its tab map; ask the tabs already open, all at
// once and each for `ALIVE_BY`: one that says nothing (frozen) does not keep
// the rest from being listed (#507 review P1-01).
async function resync() {
  const tabs = await chrome.tabs.query({ url: `${HOME}*` });
  const ask = async (tab) => {
    const state = await by(Date.now() + ALIVE_BY, () =>
      chrome.tabs.sendMessage(tab.id, { op: "state" }),
    );
    if (!state || state === true) return;
    pages.set(tab.id, {
      conversation: state.conversation,
      hidden: state.hidden,
    });
    // Writing as this worker or PostPane starts again: PostPane forgot, and
    // holds words back by it (#507 review round 4, P1-04).
    if (state.streaming && state.conversation)
      post({
        type: "turn",
        phase: "start",
        conversation: state.conversation,
        title: state.title ?? "",
        promptId: state.promptId ?? null,
        at: Date.now(),
        again: true,
      });
  };
  await Promise.all(tabs.map(ask));
  statusSoon();
}

// Installing, updating or reloading the extension gives the chatgpt.com tabs
// already open no content script, and cuts the old one off: replies in them
// went unreported until the tab was reloaded (#206). Put one in each; a tab
// that cannot take it (discarded, still loading) gets one when it loads.
chrome.runtime.onInstalled.addListener(async () => {
  // All at once, and each for so long: a frozen tab's is not done till it
  // runs again, and does not keep the rest waiting (#507 review P1-02).
  const tabs = await chrome.tabs.query({ url: `${HOME}*` });
  const until = Date.now() + ALIVE_AGAIN_BY;
  await Promise.all(tabs.map((tab) => scripted(tab.id, until)));
  resync();
});

chrome.storage.local.get("watched").then(({ watched: saved }) => {
  if (saved && !watched.size) watched = new Set(saved);
});
connect();
