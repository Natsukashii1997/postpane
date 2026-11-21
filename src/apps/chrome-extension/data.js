// Reads a conversation from the data chatgpt.com loads for itself, beside
// what page.js reads off the drawn page (#488, shadow run: recorded, never
// acted on). Put into the page's own world only while PostPane's shadow
// switch is on. It hears the sign-in the page sends on its own requests and
// keeps it in here. Nothing listens on the page for asks: the extension's
// background calls `read` and `stop` through chrome.scripting, and what a
// read found comes back that way, a summary with no words of the answer and
// nothing of the sign-in. Structure: docs/chatgpt-channel.md.
(() => {
  const DONE = "finished_successfully";
  const role = (message) => message.author.role;
  const words = (message) =>
    (message.content?.parts ?? [])
      .filter((part) => typeof part === "string")
      .join("");

  /** The fields read here that `body` lacks: none when it can be read. */
  function missing(body) {
    if (!Array.isArray(body?.messages)) return ["messages"];
    const lacks = new Set();
    if (typeof body.page_info?.has_previous_page !== "boolean")
      lacks.add("page_info.has_previous_page");
    for (const message of body.messages) {
      if (typeof message?.id !== "string") lacks.add("messages[].id");
      if (typeof message?.author?.role !== "string")
        lacks.add("messages[].author.role");
      if (!message?.metadata || typeof message.metadata !== "object")
        lacks.add("messages[].metadata");
    }
    return [...lacks];
  }

  /** What `body` holds of the answer to the prompt `promptId`: a message
   * the person sent (`user`); after it, up to the next one, its turn; the
   * answer is the turn's last message on the `final` channel that shares
   * the prompt's `turn_exchange_id`, written once all four of its marks say
   * so. With no prompt named, the newest one. `text` is the answer's
   * Markdown. A prompt without an exchange id cannot be read. */
  function claim(body, promptId) {
    const lacks = missing(body);
    if (lacks.length) return { outcome: "unreadable", missing: lacks };
    const all = body.messages;
    const asks = (message) => role(message) === "user";
    const named = promptId
      ? all.findIndex((message) => message.id === promptId && asks(message))
      : -1;
    const at = promptId ? named : all.findLastIndex(asks);
    const told = {
      outcome: "read",
      messages: all.length,
      more: body.page_info.has_previous_page,
      asyncStatus: body.async_status ?? null,
      asked: promptId ?? null,
      askFound: named >= 0,
      prompt: at >= 0 ? all[at].id : null,
      after: 0,
      exchange: null,
      last: null,
      final: null,
      written: false,
      text: "",
    };
    if (at < 0) return told;
    const exchange = all[at].metadata.turn_exchange_id;
    if (typeof exchange !== "string" || !exchange)
      return {
        outcome: "unreadable",
        missing: ["messages[].metadata.turn_exchange_id"],
      };
    const next = all.findIndex((message, index) => index > at && asks(message));
    const turn = all.slice(at + 1, next < 0 ? all.length : next);
    const answer = turn.findLast(
      (message) =>
        role(message) === "assistant" &&
        message.channel === "final" &&
        message.metadata.turn_exchange_id === exchange,
    );
    const last = turn.at(-1);
    told.after = turn.length;
    told.exchange = turn.every(
      (message) => message.metadata.turn_exchange_id === exchange,
    );
    if (last)
      told.last = {
        role: role(last),
        channel: last.channel ?? null,
        status: last.status ?? null,
        type: last.content?.content_type ?? null,
      };
    if (!answer) return told;
    told.text = words(answer);
    told.final = {
      id: answer.id,
      status: answer.status ?? null,
      endTurn: answer.end_turn ?? null,
      complete: answer.metadata.is_complete ?? null,
      finish: answer.metadata.finish_details?.type ?? null,
      chars: told.text.length,
    };
    const { status, endTurn, complete, finish } = told.final;
    told.written =
      status === DONE &&
      endTurn === true &&
      complete === true &&
      finish === "stop";
    return told;
  }

  // Bare (the tests): only the reading above.
  if (typeof window === "undefined") {
    globalThis.PostPaneData = { claim, missing };
    return;
  }
  // The one handle the extension calls. Put in again (the switch turned on
  // again, or a page that had it put in once more): the copy there starts
  // hearing again, and this one steps aside.
  const KEY = Symbol.for("postpane.data");
  if (window[KEY]) {
    window[KEY].start();
    return;
  }

  const API = "/backend-api/";
  const CONVERSATION = /^\/backend-api\/conversations\/[0-9a-f-]{36}$/;
  const ID = /^[0-9a-f]{8}-[0-9a-f-]{8,40}$/i;
  // What signs a request in, of all its headers: of the page's read of a
  // conversation, these kinds; of any other request, only the names that
  // read was seen to carry (2026-11-20).
  const SIGN_IN = /^(authorization$|originator$|chatgpt-|oai-|x-openai-)/;
  const SEEN = new Set([
    "authorization",
    "chatgpt-account-id",
    "chatgpt-project-id",
    "oai-device-id",
    "oai-did",
    "oai-language",
    "originator",
    "x-openai-codex-window-type",
    "x-openai-rate-limit-join-workspace",
    "x-openai-rejoin-pro-cta",
    "x-openai-web-frontend",
  ]);
  const TURNS = 2;
  const WIDE = 10;
  // At most this many requests in this long, whoever calls: a prompt is read
  // three times at most, each read twice at most (#488 review P1-01).
  const LIMIT = 12;
  const SPAN = 10 * 60 * 1000;
  const sent = [];
  // The page's sign-in, as it last sent it: on reading a conversation
  // (`same`), else on any other request of its own (`other`).
  let same = null;
  let other = null;
  let alive = true;

  const page = window.fetch;
  const listening = function (input, init) {
    if (alive) {
      try {
        hear(input, init);
      } catch {
        // The page's request is its own business, whatever this made of it.
      }
    }
    return page.apply(this, arguments);
  };
  window.fetch = listening;

  function hear(input, init) {
    const url = new URL(
      typeof input === "string" ? input : (input?.url ?? String(input)),
      location.href,
    );
    if (url.origin !== location.origin || !url.pathname.startsWith(API)) return;
    const headers = new Headers(init?.headers ?? input?.headers ?? {});
    if (!headers.has("authorization")) return;
    const method = (init?.method ?? input?.method ?? "GET").toUpperCase();
    if (method === "GET" && CONVERSATION.test(url.pathname))
      same = [...headers].filter(([name]) => SIGN_IN.test(name));
    else other = [...headers].filter(([name]) => SEEN.has(name));
  }

  /** The conversation this page shows: `/c/<id>` or `/g/<project>/c/<id>`. */
  function showing() {
    return (
      /\/c\/([0-9a-f]{8}-[0-9a-f-]{8,})/i.exec(location.pathname)?.[1] ?? null
    );
  }

  async function fingerprint(text) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text),
    );
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }

  /** Whether one more request may go now; counts it when it may. */
  function allowed() {
    const now = Date.now();
    while (sent.length && now - sent[0] > SPAN) sent.shift();
    if (sent.length >= LIMIT) return false;
    sent.push(now);
    return true;
  }

  /** Reads `conversation`, the one this page shows, once: its newest two
   * turns, and once more, wider, when the prompt named is further back.
   * Anything but a 200 ends it. */
  async function read(conversation, promptId) {
    if (!alive) return { outcome: "stopped" };
    if (
      typeof conversation !== "string" ||
      !ID.test(conversation) ||
      showing() !== conversation
    )
      return { outcome: "other-conversation" };
    if (
      promptId !== null &&
      (typeof promptId !== "string" || !ID.test(promptId))
    )
      return { outcome: "other-conversation" };
    const login = same ?? other;
    if (!login) return { outcome: "no-login" };
    const stood = {
      hidden: document.visibilityState === "hidden",
      login: same ? "same" : "other",
    };
    const began = performance.now();
    const took = () => Math.round(performance.now() - began);
    let turns = TURNS;
    let bytes = 0;
    for (let tries = 1; ; tries++) {
      const sized = { turns, tries, bytes, ...stood };
      if (!allowed()) return { outcome: "limited", ...sized, ms: took() };
      let response;
      try {
        response = await page.call(
          window,
          `${API}conversations/${conversation}?num_turns=${turns}&include_has_versions=true`,
          { headers: login, credentials: "include" },
        );
      } catch {
        return { outcome: "error", ...sized, ms: took() };
      }
      if (response.status !== 200)
        return {
          outcome: "http",
          status: response.status,
          ...sized,
          ms: took(),
        };
      let body = null;
      try {
        const raw = await response.text();
        bytes += raw.length;
        body = JSON.parse(raw);
      } catch {
        return {
          outcome: "unreadable",
          missing: ["json"],
          status: 200,
          ...sized,
          bytes,
          ms: took(),
        };
      }
      const { text, ...found } = claim(body, promptId);
      const further =
        found.outcome === "read" &&
        promptId &&
        !found.askFound &&
        found.more &&
        turns < WIDE;
      if (further) {
        turns = WIDE;
        continue;
      }
      if (found.final) found.final.sha = await fingerprint(text);
      return { ...found, status: 200, ...sized, bytes, ms: took() };
    }
  }

  /** The switch went off: hears and reads nothing more, forgets the sign-in,
   * and gives the page its own fetch back unless someone wrapped it since
   * (then this wrapper only passes requests on). */
  function stop() {
    alive = false;
    same = null;
    other = null;
    sent.length = 0;
    if (window.fetch === listening) window.fetch = page;
    return { stopped: true, restored: window.fetch === page };
  }

  /** The switch went on again: hears again, from the next request. */
  function start() {
    if (alive) return;
    alive = true;
    if (window.fetch === page) window.fetch = listening;
  }

  // Not writable, not configurable: once here, nothing in the page swaps it.
  Object.defineProperty(window, KEY, {
    value: Object.freeze({ read, stop, start }),
  });
})();
