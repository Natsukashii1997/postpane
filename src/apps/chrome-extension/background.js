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
      ended = new Set(message.ended || []);
      endedRelays = new Set(message.endedRelays || []);
      live = new Set(message.live || []);
      closeEnded();
      await chrome.storage.local.set({ watched: [...watched] });
      await setShadow(message.shadow === true);
      statusSoon();
      break;
    case "open": {
      const begun = generation;
      const result = await open(
        message.text,
        message.project,
        message.requestId,
      );
      post({ type: "opened", requestId: message.requestId, ...result });
      wrote(result.conversation, result, { begun });
      break;
    }
    case "send": {
      const sent = sending(message.conversation);
      const result = await using(message.conversation, () =>
        send(message.conversation, message.text),
      );
      post({ type: "sent", requestId: message.requestId, ...result });
      wrote(message.conversation, result, sent);
      break;
    }
    case "focus":
      await using(message.conversation, () => focus(message.conversation));
      break;
    case "reread":
      await using(message.conversation, () => reread(message.conversation));
      break;
    case "find": {
      const { conversation, request, after } = message;
      const found = await using(conversation, () =>
        find(conversation, request, after),
      );
      post({ type: "found", conversation, request, ...found });
      break;
    }
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
  // it is there and pressing send. Null: while it shows none, a new chat's
  // page (#542 round 4, P1-06).
  const ask = {
    op: "submit",
    text,
    ...(until && { until }),
    ...(conversation !== undefined && { conversation }),
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

async function open(text, project, request) {
  const tab = await chrome.tabs.create({ url: project || HOME, active: false });
  opening.set(tab.id, true);
  await group(tab.id);
  let result = { ok: false };
  try {
    return (result = await openIn(tab, text));
  } finally {
    opening.delete(tab.id);
    // Whose it is: a handoff whose opening failed knows no conversation, and
    // its tab is closed by this once it ended (#542 review P1-01); a
    // conversation only when the words may have gone into it, and it shows
    // them (round 4, P1-06).
    await own(tab.id, request, {
      conversation: result.ok ? result.conversation : null,
      text: result.ok || result.pressed !== false ? text : null,
    });
  }
}

/** Puts `text` into the new chat in `tab` and waits for its conversation:
 * the page a new chat's still, and the conversation it comes to one that
 * shows the words (#542 review round 4, P1-06), not one Changhao moved the
 * tab on to meanwhile. */
async function openIn(tab, text) {
  const first = await ready(tab.id, 30000);
  if (!first) return { ok: false, reason: "timeout" };
  if (first.conversation)
    return { ok: false, reason: "other-conversation", pressed: false };
  const entry = await goingOut(text);
  const result = await submit(tab.id, text, undefined, null);
  if (result.pressed === false) outOf(entry);
  if (!result.ok) return result;
  // Pressed, and no address in time: the words may be in a new chat all the
  // same, so a retry is not to send them blind (#544, gap 3).
  const page = await ready(tab.id, 60000, (p) => !!p.conversation);
  if (!page) return { ok: false, reason: "timeout", pressed: true };
  const state = await proven(tab.id, page.conversation, text, result.promptId);
  if (!state) return { ok: false, reason: "unconfirmed", pressed: true };
  // Its prompt, as the page that sent it, or the one prompt showing the
  // words, has it (round 4 and 5, P1-05).
  const own = result.promptId ?? state.promptId;
  if (own) outOf(entry);
  await ownPrompt(page.conversation, own, entry.at);
  watched.add(page.conversation);
  await chrome.storage.local.set({ watched: [...watched] });
  statusSoon();
  // The prompt's id ties its answer to it (#410); a new conversation's
  // page may only show it once it has its address.
  const promptId = result.promptId ?? state.promptId ?? null;
  return {
    ok: true,
    conversation: page.conversation,
    title: state.title || "",
    ...(promptId && { promptId }),
  };
}

/** How many times, how far apart, a page just opened is asked whether it
 * shows the words it was opened with: it may not have drawn them yet. */
const PROVE_TRIES = 10;
const PROVE_PAUSE = 500;

/** What `tabId`'s page says as it shows `conversation` holding `text` as
 * its prompt (`promptId` when known): its title and the prompt's id; null
 * when it says otherwise, or nothing, `tries` times asked. */
async function proven(
  tabId,
  conversation,
  text,
  promptId,
  tries = PROVE_TRIES,
) {
  const ask = {
    op: "opened",
    conversation,
    text,
    ...(promptId && { promptId }),
  };
  for (let n = 0; n < tries; n++) {
    if (n) await new Promise((resolve) => setTimeout(resolve, PROVE_PAUSE));
    const said = await pageSays(tabId, ask);
    if (said?.ours === true) return said;
    if (said && said.conversation !== conversation) return null;
  }
  return null;
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
async function reach(conversation, until, makeMissing = true) {
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
  if (!makeMissing) return {};
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
  // A prompt of these words is the extension's (round 4, P1-05).
  const entry = await goingOut(text);
  const result = await submit(tabId, text, until, conversation);
  if (result.promptId || result.pressed === false) outOf(entry);
  await ownPrompt(conversation, result.promptId, entry.at);
  return result;
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
// reloaded) gets one first; a closed one stays closed (#433). What the
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
  const at = await reach(conversation, Date.now() + REACH_BY, false);
  const reloaded = at.reloaded && { reloaded: true };
  if (at.tabId === undefined) {
    if (at.made) return { outcome: "unopened", ...reloaded };
    // No tab shows it and none is being made: it was closed (#544, said so
    // when the wait ends, not "no answer"). One there not answering as this
    // conversation (signed out, an error page) is `unreachable`.
    const open = making.has(conversation)
      ? null
      : await tabsAt(conversation, Date.now() + ASK_BY);
    const shown = [...pages.values()].some(
      (page) => page.conversation === conversation,
    );
    const closed = open?.length === 0 && !shown;
    return { outcome: closed ? "closed" : "unreachable", ...reloaded };
  }
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
  const missing = answer?.missing?.length && { missing: answer.missing };
  return {
    outcome: outcomeOf(answer, told),
    ...stood,
    fronted,
    ...reloaded,
    ...missing,
  };
}
/** How long a read has to get to a tab that shows the conversation. */
const REACH_BY = 45000;
const ASK_BY = 10000;

/** Whether the words sent as `request` are in `conversation` (#509):
 * PostPane heard no word that they went in. A tab that shows the
 * conversation is found as for sending (`reach`), and loaded again unless
 * it just was, or was made, so it shows what ChatGPT has; then every prompt
 * it holds is read, not only the newest (round 1 P1-01): the words begin
 * with a line naming their request.
 * - `{outcome: "there", promptId}`: one prompt begins so, with ChatGPT's id
 *   for it when the page has one (P1-02);
 * - "absent": read twice a moment apart, none does, the page holds prompt
 *   `after` (the last PostPane knows went in, so the history reaches back
 *   past the words), every prompt after it shows its words, and no answer
 *   is being written. Without `after` known, never absent;
 * - "unread": it cannot be told (no tab to read, the page not loaded or
 *   not drawn, two prompts naming the request, an answer on its way).
 * Words not known to have gone in often did, and their answer is being
 * written: a page is loaded again only when it says, at that moment, that
 * it shows the conversation, writes nothing and holds no words of
 * Changhao's in hand (#507 review P1-01, #509 round 1 P1-03). Any other is
 * left as it is: "unread", and PostPane looks again later. */
async function find(conversation, request, after) {
  const unread = { outcome: "unread" };
  if (!watched.has(conversation)) return unread;
  const at = await reach(conversation, Date.now() + REACH_BY);
  if (at.tabId === undefined) return unread;
  const { tabId } = at;
  const ask = () =>
    by(Date.now() + ASK_BY, () =>
      chrome.tabs.sendMessage(tabId, {
        op: "asked",
        conversation,
        request,
        after,
      }),
    ).then((said) => (said === true ? null : said));
  if (!at.reloaded && !at.made) {
    const again = await loadIdle(tabId, conversation, Date.now() + REACH_BY);
    if (!again) return unread;
  }
  const pause = () =>
    new Promise((resolve) => setTimeout(resolve, REREAD_PAUSE));
  let first = await ask();
  for (
    let tries = 0;
    first && first.loaded === false && tries < REREAD_TRIES;
    tries++
  ) {
    await pause();
    first = await ask();
  }
  const there = (said) =>
    said?.loaded && said.there && !said.twice
      ? { outcome: "there", promptId: said.promptId ?? null }
      : null;
  if (!first?.loaded || first.twice) return unread;
  if (there(first)) return there(first);
  await pause();
  const second = await ask();
  if (second?.twice) return unread;
  if (there(second)) return there(second);
  const sure = (said) =>
    !!after &&
    said?.loaded &&
    said.anchored &&
    !said.unreadable &&
    !said.streaming;
  return sure(first) && sure(second) ? { outcome: "absent" } : unread;
}

/** Loads tab `tabId` again to look (#509 round 1 P1-03): its page does it
 * itself, only when it shows `conversation`, writes nothing and holds no
 * draft (`reload`). Whether its new page reported, showing the
 * conversation, by `until`. A page that would not, or says nothing (gone
 * as it loads, or hung), is waited for as one loading. */
async function loadIdle(tabId, conversation, until) {
  pages.delete(tabId);
  const said = await by(until, () =>
    chrome.tabs.sendMessage(tabId, { op: "reload", conversation }),
  );
  if (said === false) return false;
  const loaded = (p) => p.conversation === conversation;
  const page = await ready(tabId, until - Date.now(), loaded);
  return !!page && Date.now() < until;
}

/** What a read's answer comes to: told, or why not. */
function outcomeOf(answer, told) {
  if (!answer) return "unreachable";
  // The page cannot find what PostPane reads (#548): whatever else it said
  // rests on reading it.
  if (answer.missing?.length) return "changed";
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
  // Every tab made active from here on, before anything is asked of Chrome
  // (round 7 review P2-05): those of its window but this one are the
  // person's doing. Its window is known only once Chrome says, so they are
  // kept till then.
  const seen = [];
  const onActivated = (info) => seen.push(info);
  chrome.tabs.onActivated.addListener(onActivated);
  try {
    const tab = await chromeSays(() => chrome.tabs.get(tabId));
    if (!tab || tab.active) return false;
    const chosen = () =>
      seen.filter((i) => i.windowId === tab.windowId && i.tabId !== tabId);
    const moved = () => chosen().length > 0;
    const active = { active: true };
    // Whether its window had the focus: put back only while that is as it was.
    const focused = async () =>
      (await chromeSays(() => chrome.windows.get(tab.windowId)))?.focused;
    const before = await focused();
    const fronts = await chromeSays(() =>
      chrome.tabs.query({ ...active, windowId: tab.windowId }),
    );
    // The person chose a tab meanwhile: this one is not put over it.
    if (!Array.isArray(fronts) || moved()) return false;
    const front = fronts.find((t) => t.active);
    // Not known to be in front in time, it is not read as if it were. The
    // ask is not over for that: Chrome may still put it in front.
    const putting = Promise.resolve()
      .then(() => chrome.tabs.update(tabId, active))
      .catch(() => null);
    const put = await chromeSays(() => putting);
    // The person moved in its window from the start (#518, owner
    // 2026-11-24): nothing is put back, theirs not either, and nothing is
    // read. Who made the last move is not guessed: Chrome does not say, and
    // a guess put tabs over the person's choice (#507 review P2-05). The
    // ChatGPT tab may stay in front; the person moves it.
    if (moved()) return false;
    // Not in front in time: watched `LATE_PUT` more. Come with the window
    // untouched, the tab that was in front comes back (#518).
    if (!put) {
      const late = await by(Date.now() + LATE_PUT, () => putting);
      if (late && front && !moved())
        await chromeSays(() => chrome.tabs.update(front.id, active));
      return false;
    }
    let told = false;
    for (let tries = 0; put && tries < FRONT_TRIES && !told; tries++) {
      await new Promise((resolve) => setTimeout(resolve, FRONT_PAUSE));
      told = !!(await ask().catch(() => null))?.told;
    }
    // Put back only with no other tab of the window made active meanwhile,
    // this tab known to be in front of its window still, and the window's
    // focus known to be as it was: the person may have moved on, to another
    // tab, window or app, or come to this window, and not known, nothing is
    // moved (round 4 to 7 review P2-05). A tab in front of its window is no
    // sign the window is. Asked to the front with no word back, it may come
    // late: then it stays, rather than the two moves crossing. Looked at last,
    // right before the move back: a choice made while Chrome was asked counts.
    const after = await focused();
    const now = await chromeSays(() => chrome.tabs.get(tabId));
    const still = now?.active && !moved();
    if (front && still && typeof before === "boolean" && after === before)
      await chromeSays(() => chrome.tabs.update(front.id, active));
    return told;
  } finally {
    chrome.tabs.onActivated.removeListener(onActivated);
  }
}
const FRONT_TRIES = 3;
const FRONT_PAUSE = 1500;
/** How long a put in front not answered in time is watched (#518). */
const LATE_PUT = 10000;

async function focus(conversation) {
  const tabId = tabFor(conversation);
  if (tabId === null) {
    await chrome.tabs.create({ url: `${HOME}c/${conversation}`, active: true });
    return;
  }
  const tab = await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

// --- Ended relays' tabs (#542) -------------------------------------------------

/** The conversations PostPane says every handoff of which ended: their tabs
 * in the relay group are closed (#542). Every relay opened one and none was
 * closed: on 2026-11-25 Changhao's swap stood at 21–25 GB. */
let ended = new Set();
/** The handoffs PostPane says ended (#542 review P1-01): a tab one of them
 * opened is closed by it too, though its opening failed and no
 * conversation was ever known of it. */
let endedRelays = new Set();
/** The conversations a handoff not ended has: a tab of one is kept,
 * whatever opened it (review round 2, P2-09). */
let live = new Set();
/** The conversations being sent to, looked for, read or brought forward
 * now, by how many: a tab of one is not closed meanwhile. */
const inUse = new Map();

/** Which handoff's opening each conversation came of, as the tab `open`
 * made showed it when the opening was over: a handoff whose opening failed
 * knows none of them (#542 review P1-01). Kept in local storage, past the
 * browser starting again (round 2, P1-01 path C), the newest `STRAYS_MOST`. */
let strays = {};
const STRAYS_MOST = 200;
const straysRead = chrome.storage.local
  .get("strays")
  .then((kept) => (strays = { ...kept?.strays, ...strays }))
  .catch(() => {});
/** The tabs `open` made that showed no conversation when the opening was
 * over, by id: the handoff, the path they were at and when. Session storage,
 * which the browser empties as it starts again, when tab ids begin again
 * too: such a tab is not known then, and is not closed. */
let blank = {};
const blankRead = (chrome.storage.session?.get("blank") ?? Promise.resolve({}))
  .then((kept) => (blank = { ...kept?.blank, ...blank }))
  .catch(() => {});
/** The tabs `open` made whose tab Chrome did not say how it stood when the
 * opening was over, by id, with the request and what shows its
 * conversation is the handoff's: noted as soon as it does (round 3, P2-12). */
const unowned = new Map();

/** The conversations Changhao went on with himself after their relays
 * ended: their tabs are his now, and not closed (round 3, P2-11, owner
 * 2026-11-27). By conversation, each prompt of his not let go by when it
 * began (`{[promptId]: at}`, the newest `ASK_IDS`): one told late does not
 * stand in for another (round 7). Local storage, the newest `STRAYS_MOST`. */
let taken = {};
const takenRead = chrome.storage.local
  .get("taken")
  .then((kept) => (taken = { ...kept?.taken, ...taken }))
  .catch(() => {});

/** The prompts the extension is known to have put into each conversation,
 * by ChatGPT's id, the newest `ASK_IDS` (round 4, P1-05): known by the page
 * that sent them, as it still showed the conversation (`page.js` `press`),
 * or by their words (`heads`). Local storage, the newest `STRAYS_MOST`
 * conversations. */
let asks = {};
const ASK_IDS = 20;
const asksRead = chrome.storage.local
  .get("asks")
  .then((kept) => (asks = { ...kept?.asks, ...asks }))
  .catch(() => {});
/** What the extension sent, whose prompt is not known yet (round 5): the
 * words' first `HEAD` characters, spaces aside, and when they began to go.
 * A prompt beginning so is the extension's, in whichever conversation; no
 * other is, however it came or when (not the next one heard of, nor one in
 * a tab being opened). The newest `HEADS_MOST`, a week at most. */
let heads = [];
const HEAD = 100;
const HEADS_MOST = 50;
const HEADS_FOR = 7 * 24 * 60 * 60 * 1000;
// Those past their week are let go as they are read, too (round 6).
const headsRead = chrome.storage.local
  .get("heads")
  .then(
    (kept) =>
      (heads = [
        ...(kept?.heads ?? []).filter((h) => Date.now() - h.at < HEADS_FOR),
        ...heads,
      ]),
  )
  .catch(() => {});
const bare = (text) => (text ?? "").replace(/\s/g, "");

/** Notes that `text` begins to go; what it was noted as. Only words whose
 * first line names their request (「【驿窗送审 <request>】」, PostPane's
 * `book::tagged`) are noted: others alike are no proof (round 6, owner
 * 2026-11-27 「甲」). */
async function goingOut(text) {
  await headsRead;
  const first = (text ?? "").split("\n", 1)[0];
  const named = /^【驿窗送审 [^】\n]+】$/.test(first);
  const entry = {
    head: named ? bare(text).slice(0, HEAD) : "",
    at: Date.now(),
  };
  if (!entry.head) return entry;
  heads = [...heads.filter((h) => entry.at - h.at < HEADS_FOR), entry].slice(
    -HEADS_MOST,
  );
  chrome.storage.local.set({ heads }).catch(() => {});
  return entry;
}
/** The words noted as `entry` are not waited for any more: they did not
 * go, or their prompt is known. */
function outOf(entry) {
  if (!heads.includes(entry)) return;
  heads = heads.filter((h) => h !== entry);
  chrome.storage.local.set({ heads }).catch(() => {});
}
/** What of `heads` a prompt showing `words` is: the one it begins as; none
 * when two or more do, which of them is not known (round 6). */
function headOf(words) {
  const shown = bare(words);
  if (!shown) return undefined;
  const like = heads.filter((h) => shown.slice(0, h.head.length) === h.head);
  return like.length === 1 ? like[0] : undefined;
}

/** The prompts of Changhao's whose hold on their conversation a prompt of
 * the extension's after them let go (round 6, P2-11), by conversation,
 * the newest `ASK_IDS`: told of again later (its answer done or stopped,
 * from another tab), they do not take it back. Local storage. */
let freed = {};
const freedRead = chrome.storage.local
  .get("freed")
  .then((kept) => (freed = { ...kept?.freed, ...freed }))
  .catch(() => {});
/** By conversation, when the latest words of the extension's known to be in
 * it began to go (round 8, P2-11): a prompt of Changhao's told of first only
 * after that, but begun before it, as its page says, is let go too. One
 * whose beginning is not known still holds it. Local storage, the newest
 * `STRAYS_MOST`. */
let ownedSince = {};
const ownedSinceRead = chrome.storage.local
  .get("ownedSince")
  .then((kept) => (ownedSince = { ...kept?.ownedSince, ...ownedSince }))
  .catch(() => {});

/** Prompt `promptId` in `conversation` is the extension's, its words begun
 * to go at `since`: noted; and a conversation Changhao went on with before
 * then is a relay's again (P2-11). One he went on with since is still his:
 * whose came last is not known (round 5). */
async function ownPrompt(conversation, promptId, since) {
  if (!conversation || !promptId) return;
  await Promise.all([asksRead, takenRead, freedRead, ownedSinceRead]);
  const ids = (asks[conversation] ?? []).filter((id) => id !== promptId);
  delete asks[conversation];
  asks[conversation] = [...ids, promptId].slice(-ASK_IDS);
  const all = Object.keys(asks);
  for (const old of all.slice(0, Math.max(0, all.length - STRAYS_MOST)))
    delete asks[old];
  chrome.storage.local.set({ asks }).catch(() => {});
  if (!(ownedSince[conversation] >= since)) {
    delete ownedSince[conversation];
    ownedSince[conversation] = since;
    const owned = Object.keys(ownedSince);
    for (const old of owned.slice(0, Math.max(0, owned.length - STRAYS_MOST)))
      delete ownedSince[old];
    chrome.storage.local.set({ ownedSince }).catch(() => {});
  }
  // His prompts begun before these words: let go; any begun after stand.
  const his = Object.entries(taken[conversation] ?? {});
  letGo(
    conversation,
    his.filter(([, at]) => at < since).map(([id]) => id),
  );
}

/** Changhao's prompts `ids` in `conversation` hold it no more, and are not
 * his again when told of again, from whichever tab (`freed`, round 9). */
function letGo(conversation, ids) {
  if (!ids.length) return;
  const mine = taken[conversation] ?? {};
  if (ids.some((id) => id in mine)) {
    const left = Object.entries(mine).filter(([id]) => !ids.includes(id));
    if (left.length) taken[conversation] = Object.fromEntries(left);
    else delete taken[conversation];
    chrome.storage.local.set({ taken }).catch(() => {});
  }
  const gone = (freed[conversation] ?? []).filter((id) => !ids.includes(id));
  delete freed[conversation];
  freed[conversation] = [...gone, ...ids].slice(-ASK_IDS);
  const freedAll = Object.keys(freed);
  for (const old of freedAll.slice(
    0,
    Math.max(0, freedAll.length - STRAYS_MOST),
  ))
    delete freed[old];
  chrome.storage.local.set({ freed }).catch(() => {});
}

/** Whether `conversation` is one a relay has, or had. */
const relays = (conversation) =>
  watched.has(conversation) ||
  live.has(conversation) ||
  ended.has(conversation) ||
  conversation in strays;

/** A prompt was begun, answered or stopped in `conversation`: one the
 * extension is not known to have put in is Changhao's own, and the
 * conversation his (round 3, P2-11; round 4 and 5, P1-05). Told by the
 * prompt's id and words, not by when it came: whether its relay ended may
 * be said before or after. A stopped answer whose beginning did not name
 * its prompt names the newest. One with no id tells nothing. */
async function goneOn(message) {
  const { conversation, phase } = message;
  const promptId =
    message.promptId ?? (phase === "stopped" ? message.newest : null);
  if (!["start", "complete", "stopped"].includes(phase)) return;
  if (!conversation || !promptId) return;
  await Promise.all([
    asksRead,
    headsRead,
    straysRead,
    takenRead,
    freedRead,
    ownedSinceRead,
  ]);
  if (asks[conversation]?.includes(promptId)) return;
  // Only a relay's conversation is looked at: words alike elsewhere take no
  // head away (round 6).
  if (!relays(conversation)) return;
  const head = headOf(message.prompt);
  if (head) {
    outOf(head);
    return ownPrompt(conversation, promptId, head.at);
  }
  // One whose hold was let go is not his again by being told again.
  if (freed[conversation]?.includes(promptId)) return;
  // When it began, as its page told it (a start's `at`, an end's
  // `begunAt`); else as heard, later than it was: let go later, not sooner.
  const told = phase === "start" ? message.at : message.begunAt;
  // Begun, as its page says, before words of the extension's since known to
  // be there: let go already, though first told of now (round 8); and so for
  // good, whatever another tab tells of it, before or after (round 9).
  if (Number.isFinite(told) && told < ownedSince[conversation])
    return letGo(conversation, [promptId]);
  const mine = taken[conversation] ?? {};
  const at = Math.min(
    Number.isFinite(told) ? told : Date.now(),
    mine[promptId] ?? Infinity,
  );
  if (mine[promptId] === at) return;
  const prompts = Object.entries({ ...mine, [promptId]: at })
    .sort(([, a], [, b]) => a - b)
    .slice(-ASK_IDS);
  delete taken[conversation];
  taken[conversation] = Object.fromEntries(prompts);
  const all = Object.keys(taken);
  for (const old of all.slice(0, Math.max(0, all.length - STRAYS_MOST)))
    delete taken[old];
  chrome.storage.local.set({ taken }).catch(() => {});
}

function keepStray(conversation, relay) {
  delete strays[conversation];
  strays[conversation] = relay;
  const all = Object.keys(strays);
  for (const old of all.slice(0, Math.max(0, all.length - STRAYS_MOST)))
    delete strays[old];
  chrome.storage.local.set({ strays }).catch(() => {});
}
function keepBlank() {
  chrome.storage.session?.set({ blank }).catch(() => {});
}

/** Notes whose tab `tabId` is, made by `open` under `request` ("<handoff
 * id>~<try>"), and looks at the ended relays' tabs again: it was passed over
 * while it opened (round 2, P1-01 path A). A conversation it shows is the
 * handoff's only as `proof` has it (round 4, P1-06): the one the opening
 * came to; or, `text` that may have gone, one whose page shows them as its
 * prompt. Any other is one Changhao moved the tab on to, and kept. */
async function own(tabId, request, proof = {}) {
  await noteOwner(tabId, request, proof);
  closeEnded();
}

/** Notes whose tab `tabId` is, as it stands now; false when Chrome does not
 * say (round 3, P2-12: not known is not gone), and it is tried again. */
async function noteOwner(tabId, request, proof) {
  const relay = request?.split("~")[0];
  if (!relay) return true;
  const tab = await tabNow(tabId);
  if (tab === undefined) {
    unowned.set(tabId, [request, proof]);
    return false;
  }
  unowned.delete(tabId);
  if (!tab) return true;
  const conversation = conversationOf(tab);
  await Promise.all([straysRead, blankRead]);
  if (conversation) {
    const shown =
      conversation === proof.conversation ||
      (!!proof.text &&
        !!(await proven(tabId, conversation, proof.text, null, 1)));
    if (shown) keepStray(conversation, relay);
  } else if (chatgptPath(tab) !== null) {
    blank[tabId] = { relay, path: chatgptPath(tab) };
    keepBlank();
  }
  return true;
}

/** `tabId` as Chrome has it; null when there is no such tab; undefined
 * when Chrome does not say in `CHROME_BY`, or fails for another reason. */
function tabNow(tabId) {
  return new Promise((done) => {
    const timer = setTimeout(() => done(undefined), CHROME_BY);
    chrome.tabs
      .get(tabId)
      .then(done, (error) =>
        done(/no tab/i.test(String(error?.message)) ? null : undefined),
      )
      .finally(() => clearTimeout(timer));
  });
}

/** A blank tab's page said it shows a conversation: whether that came of
 * the opening or of Changhao going to another cannot be told (round 3,
 * P1-04), so the tab is not known as the handoff's any more, and kept. */
function unblank(tabId, conversation) {
  if (!conversation || !(tabId in blank)) return;
  delete blank[tabId];
  keepBlank();
}

/** Runs `work` on `conversation` with its tabs kept open meanwhile; done,
 * they are looked at again (round 2, P2-10). */
async function using(conversation, work) {
  inUse.set(conversation, (inUse.get(conversation) ?? 0) + 1);
  try {
    return await work();
  } finally {
    const left = inUse.get(conversation) - 1;
    left ? inUse.set(conversation, left) : inUse.delete(conversation);
    if (!left) closeEnded();
  }
}

let closing = null;
let closeAgain = false;
/** How soon tabs that could not be closed are looked at again, while none
 * of the things that may let them be (an answer done, a page back, another
 * tab in front, work on it done) is heard of (#542 review P2-04). */
const CLOSE_AGAIN_MS = 5 * 60 * 1000;
let closeLater = null;
/** Closes the tabs of ended relays that may be closed now; asked again while
 * it runs, it runs once more after. */
function closeEnded() {
  if (!ended.size && !endedRelays.size) return;
  if (closing) {
    closeAgain = true;
    return;
  }
  closing = closeSome()
    .catch(() => true)
    .then((left) => {
      clearTimeout(closeLater);
      closeLater = left ? setTimeout(closeEnded, CLOSE_AGAIN_MS) : null;
    })
    .finally(() => {
      closing = null;
      if (closeAgain) {
        closeAgain = false;
        closeEnded();
      }
    });
}

/** The path of a chatgpt.com address a tab shows or is on its way to; null
 * at any other site. */
function chatgptPath(tab) {
  try {
    const url = new URL(tab.pendingUrl || tab.url || "");
    return url.origin === HOME.slice(0, -1) ? url.pathname : null;
  } catch {
    return null;
  }
}

/** The conversation a tab shows or is on its way to, if it is a chatgpt.com
 * conversation's address, a project's too (#542 review P2-05): where it goes
 * first, then where it is. */
function conversationOf(tab) {
  const path = chatgptPath(tab);
  return path?.match(/^(?:\/g\/[^/]+)?\/c\/([0-9a-f-]+)\/?$/)?.[1] ?? null;
}

/** What `tabId`'s page answers `message` with in `ALIVE_BY`; undefined when
 * it says nothing (an older script that does not know the question answers
 * nothing too). */
function pageSays(tabId, message) {
  return new Promise((done) => {
    const timer = setTimeout(() => done(undefined), ALIVE_BY);
    chrome.tabs
      .sendMessage(tabId, message)
      .then(done, () => done(undefined))
      .finally(() => clearTimeout(timer));
  });
}

/** Whether `tab` is to be closed, as it stands; "page" when only its page
 * saying it is still the blank one opened can tell. In the relay group,
 * not in front, not being opened, its conversation in no work now nor a
 * handoff's not ended; and the tab of a conversation that ended, or of one
 * an ended handoff's opening came to, or a blank tab an ended handoff
 * opened still at the same chatgpt.com path. No conversation is not the
 * same as the one it had none of (round 2, P1-03): another site, or a tab
 * not known as blank, is kept. */
function due(tab, relay) {
  if (!relay.has(tab.groupId) || tab.active || opening.has(tab.id))
    return false;
  const conversation = conversationOf(tab);
  if (conversation) {
    if (inUse.has(conversation) || live.has(conversation)) return false;
    if (taken[conversation]) return false;
    return ended.has(conversation) || endedRelays.has(strays[conversation]);
  }
  const mine = blank[tab.id];
  if (!mine || !endedRelays.has(mine.relay)) return false;
  return chatgptPath(tab) === mine.path && "page";
}

/** Closes each tab `due` says is to be: one Chrome unloaded holds no page,
 * and is closed when its conversation says whose it is; another only when
 * its page says it shows what it did, writes nothing and holds no words not
 * sent. Tabs outside the group, his own, are not looked at. Whether any was
 * left that may be closed later, or Chrome did not say. */
async function closeSome() {
  const groups = await chromeSays(() =>
    chrome.tabGroups.query({ title: GROUP }),
  );
  // Chrome not saying is not "no group" (round 2, P2-04).
  if (!Array.isArray(groups)) return true;
  if (!groups.length) return false;
  const relay = new Set(groups.map((group) => group.id));
  const tabs = await chromeSays(() => chrome.tabs.query({}));
  if (!Array.isArray(tabs)) return true;
  let left = false;
  // Tabs whose owner Chrome did not let be noted yet (round 3, P2-12).
  for (const [tabId, [request, proof]] of [...unowned])
    if (!(await noteOwner(tabId, request, proof))) left = true;
  await Promise.all([straysRead, blankRead, takenRead]);
  const close = async (tab, how) => {
    if (unloaded(tab)) {
      // A blank tab unloaded cannot say it is still the one opened.
      if (how === "page") return;
    } else {
      const said = await pageSays(tab.id, {
        op: "closable",
        conversation: conversationOf(tab),
      });
      if (said !== true) return (left = true);
    }
    // As it stands now: brought forward, or taken on, since it was asked.
    const now = await chromeSays(() => chrome.tabs.get(tab.id));
    if (!now) return (left = true);
    if (!due(now, relay)) return;
    if (!(await chromeSays(() => chrome.tabs.remove(tab.id)))) left = true;
  };
  await Promise.all(
    tabs
      .map((tab) => [tab, due(tab, relay)])
      .filter(([, how]) => how)
      .map(([tab, how]) => close(tab, how)),
  );
  return left;
}

// A tab of an ended relay left in front is closed once Changhao makes
// another of its window active.
chrome.tabs.onActivated.addListener(() => closeEnded());

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
// A read these answer pauses every read (#544, in place of #488's stop for
// good): signed out (401) until the page signs in anew, refused or too many
// (403, 429) for an hour, then one read tries again.
const HALT = [401, 403, 429];
const PAUSE = 60 * 60 * 1000;
// Reads and pages kept at most: the oldest go first.
const KEEP = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v) => typeof v === "string" && UUID.test(v);
const SALT = /^[0-9a-f]{32}$/;
const MARK = /^[0-9a-f]{16}$/;
let shadow = false;
// Reads paused: `{ status, at, until }` (403, 429), `{ status: 401, at,
// mark }` with the mark the page's sign-in left when it was refused; null
// while reading. The marks are made with `salt`, kept with the stops: a mark
// says only whether a sign-in is the same one, nothing of it leaves the
// page. One read tries at a time (`trying`).
let pause = null;
let salt = null;
let trying = false;
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
    pause = pauseKept(kept.shadowStops);
    salt = SALT.test(kept.shadowStops?.salt ?? "")
      ? kept.shadowStops.salt
      : null;
    unread.clear();
    for (const id of kept.shadowStops?.unread ?? []) unread.add(id);
  }
  if (on !== was) {
    pause = null;
    salt = null;
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

const stops = () => ({ paused: pause, unread: [...unread], salt });

/** The pause `kept` holds, if it is one. A worker of before #544 kept only
 * `halted`: paused an hour from now, as a refusal is. */
function pauseKept(kept) {
  const was = kept?.paused;
  const time = (v) => Number.isInteger(v) && v > 0;
  if (was?.status === 401 && time(was.at) && MARK.test(was.mark ?? ""))
    return { status: 401, at: was.at, mark: was.mark };
  if ((was?.status === 403 || was?.status === 429) && time(was.until))
    return { status: was.status, at: was.at, until: was.until };
  if (kept?.halted === true) {
    const at = Date.now();
    return { status: null, at, until: at + PAUSE };
  }
  return null;
}

// Run in the page's own world: the mark its sign-in makes with `salt`.
function markInPage(salt) {
  return window.__postpaneData?.marked?.(salt) ?? null;
}

/** The mark of the sign-in the page in `tabId` holds now, or null. */
async function markOf(tabId) {
  if (tabId === null) return null;
  if (!salt) {
    salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    await chrome.storage.local.set({ shadowStops: stops() });
  }
  const ran = await chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: markInPage,
      args: [salt],
    })
    .catch(() => null);
  const mark = ran?.[0]?.result;
  return typeof mark === "string" && MARK.test(mark) ? mark : null;
}

/** Whether a read of `conversation` may go while paused, as the one that
 * tries again: a refusal's hour is over, or the page shows it signed in
 * anew since it was signed out. */
async function mayTry(conversation) {
  if (pause.status !== 401) return Date.now() >= pause.until;
  const mark = await markOf(await tabShowing(conversation));
  return mark !== null && mark !== pause.mark;
}

/** Reads pause, as `status` says; PostPane is told, and logs it. */
async function paused(status, tabId) {
  const at = Date.now();
  pause =
    status === 401
      ? { status, at, mark: (await markOf(tabId)) ?? "0".repeat(16) }
      : { status, at, until: at + PAUSE };
  await chrome.storage.local.set({ shadowStops: stops() });
  post({
    type: "shadow",
    why: "pause",
    outcome: "paused",
    status,
    at,
    ...(pause.until ? { until: pause.until } : {}),
  });
}

/** A read tried while paused was not refused: reads go on, PostPane is
 * told, and logs it. */
async function resumed() {
  const was = pause;
  pause = null;
  await chrome.storage.local.set({ shadowStops: stops() });
  post({
    type: "shadow",
    why: "pause",
    outcome: "resumed",
    at: Date.now(),
    ...(Number.isInteger(was?.status) ? { status: was.status } : {}),
  });
}

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
 * that failed ends the reads of that conversation; one signed out, refused
 * or over a limit pauses them all (`paused`), till one read tried again is
 * not refused, or the switch goes off and on. With no prompt known, nothing
 * is read. */
function shadowRead(conversation, why, beside = {}, named) {
  return track(readShadow(conversation, why, beside, named));
}

async function readShadow(conversation, why, beside, named) {
  const begun = generation;
  await restored;
  if (!shadow || !port || begun !== generation) return;
  if (!watched.has(conversation) || unread.has(conversation)) return;
  if (!pause) return readOnce(conversation, why, beside, named, begun);
  // Paused: one read at a time tries again, once it may; not refused, the
  // reads go on (#544).
  if (trying) return;
  trying = true;
  try {
    if (!(await mayTry(conversation))) return;
    if (begun !== generation || !shadow) return;
    const answer = await readOnce(conversation, why, beside, named, begun);
    const status = answer?.status;
    if (pause && Number.isInteger(status) && !HALT.includes(status))
      await resumed();
  } finally {
    trying = false;
  }
}

/** One read, as `readShadow` says; what it found, once told. */
async function readOnce(conversation, why, beside, named, begun) {
  const pausedAs = pause;
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
  // Refused: every read pauses, unless a read beside this one paused them
  // first. Any other failure ends the reads of this conversation.
  const refused = answer.outcome === "http" && HALT.includes(answer.status);
  if (!refused && (answer.outcome === "http" || answer.outcome === "error")) {
    unread.add(conversation);
    await chrome.storage.local.set({ shadowStops: stops() });
  }
  post({ ...told, ...answer });
  if (refused && pause === pausedAs) await paused(answer.status, tabId);
  return answer;
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
    // A blank tab showing a conversation is not known as the handoff's (#542).
    unblank(tabId, message.conversation);
    // A page back, or moved on: an ended relay's may be closed now (#542).
    closeEnded();
  } else if (message.type === "turn") {
    // A new chat's first start, before it has an address, says nothing yet.
    if (!message.conversation) return;
    // Which tab told it: a beginning whose prompt is not known yet is ended
    // only by the same tab's end (#507 review round 5, P1-04).
    post({ ...message, tab: tabId });
    // Asked by Changhao, not by PostPane: his tab now (#542); and an answer
    // done, its tab writes no more, and may be closed now, once that is known.
    goneOn(message)
      .catch(() => {})
      .then(() => {
        if (message.phase !== "start") closeEnded();
      });
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
  if (tabId in blank) {
    delete blank[tabId];
    keepBlank();
  }
  unowned.delete(tabId);
  statusSoon();
});

// A tab Chrome discards gets a new id (#507, Chromium 156): the one it had
// is no tab's from then on.
chrome.tabs.onReplaced.addListener((added, removed) => {
  pages.delete(removed);
  // Still the handoff's, under the id Chrome gave it (#542).
  if (removed in blank) {
    blank[added] = blank[removed];
    delete blank[removed];
    keepBlank();
  }
  if (unowned.has(removed)) {
    unowned.set(added, unowned.get(removed));
    unowned.delete(removed);
  }
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
        promptId: state.writingFor ?? null,
        tab: tab.id,
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
