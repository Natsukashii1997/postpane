// Reads a conversation from the data chatgpt.com loads for itself, beside
// what page.js reads off the drawn page (#488, shadow run: recorded, never
// acted on). Put into the page's own world only while PostPane's shadow
// switch is on. It hears the sign-in the page sends on its own requests and
// keeps it in here. Nothing listens on the page for asks: the extension's
// background calls `read` and `stop` through chrome.scripting, and what a
// read found comes back that way, a summary with no words of the answer and
// nothing of the sign-in. The script's last value says whether it went in
// (`installed`) or found a handle there already (`present`). Structure:
// docs/chatgpt-channel.md.
(() => {
  const DONE = "finished_successfully";
  // What a summary may say of a message's kind: these, or `other` (#488
  // review: words, not free text). background.js and shadow.rs take only
  // these.
  const KINDS = {
    role: ["user", "assistant", "system", "tool"],
    channel: ["final", "analysis", "commentary"],
    status: [DONE, "in_progress", "finished_partial_completion"],
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
  const kind = (value, known) =>
    value === undefined || value === null
      ? null
      : known.includes(value)
        ? value
        : "other";
  const role = (message) => message.author.role;
  const unreadable = (...lacks) => ({ outcome: "unreadable", missing: lacks });

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

  /** The answer's words, when it says them as text parts; else what it
   * lacks (#488 review P2-06). */
  function wordsOf(answer) {
    if (answer.content?.content_type !== "text")
      return { lacks: "final.content.content_type" };
    const parts = answer.content.parts;
    if (
      !Array.isArray(parts) ||
      !parts.length ||
      !parts.every((part) => typeof part === "string")
    )
      return { lacks: "final.content.parts" };
    return { text: parts.join("") };
  }

  /** What `body` holds of the answer to the prompt `promptId`: a message
   * the person sent (`user`); after it, up to the next one, its turn; the
   * answer is the turn's last message on the `final` channel that shares
   * the prompt's `turn_exchange_id`, written once all four of its marks say
   * so. With no prompt named, the newest one. `text` is the answer's
   * Markdown. A prompt without an exchange id, or an answer not in text
   * parts, cannot be read. */
  function claim(body, promptId) {
    const lacks = missing(body);
    if (lacks.length) return unreadable(...lacks);
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
      // Its values are not known yet: whether there is one is said.
      asyncStatus:
        body.async_status === undefined || body.async_status === null
          ? null
          : "other",
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
      return unreadable("messages[].metadata.turn_exchange_id");
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
        role: kind(role(last), KINDS.role),
        channel: kind(last.channel, KINDS.channel),
        status: kind(last.status, KINDS.status),
        type: kind(last.content?.content_type, KINDS.type),
      };
    if (!answer) return told;
    const words = wordsOf(answer);
    if (words.lacks) return unreadable(words.lacks);
    told.text = words.text;
    told.final = {
      id: answer.id,
      status: kind(answer.status, KINDS.status),
      endTurn: answer.end_turn ?? null,
      complete: answer.metadata.is_complete ?? null,
      finish: kind(answer.metadata.finish_details?.type, KINDS.finish),
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
    globalThis.PostPaneData = { claim, missing, KINDS };
    return;
  }

  // What reading uses of the page's world, taken now: put in as the page
  // loads (document_start), before any script of the page runs, so what
  // the page changes later of these does not reach a read (#488 review
  // P1-01). Array and the like stay the page's: docs/chatgpt-channel.md.
  const apply = Reflect.apply;
  const getter = (of, name) => {
    for (let at = of; at; at = Object.getPrototypeOf(at)) {
      const found = Object.getOwnPropertyDescriptor(at, name);
      if (found) return found.get;
    }
    return undefined;
  };
  const page = window.fetch;
  const textOf = Response.prototype.text;
  const statusOf = getter(Response.prototype, "status");
  const parse = JSON.parse;
  const subtle = crypto.subtle;
  const digest = subtle.digest;
  const encoder = new TextEncoder();
  const encode = TextEncoder.prototype.encode;
  const byteLength = getter(Uint8Array.prototype, "byteLength");
  const NativeHeaders = Headers;
  const NativeURL = URL;
  const Abort = AbortController;
  const abort = AbortController.prototype.abort;
  const bytesOf = (text) =>
    apply(byteLength, apply(encode, encoder, [text]), []);

  // One handle, this file's own. One there already is not taken for it:
  // the copy put in before (stopped, it stays so; a page loaded again gets
  // a new one) or the page's. Either way this one does nothing, and says so:
  // the extension reads nothing from that page (#488 review P1-01, P1-02).
  const KEY = Symbol.for("postpane.data");
  if (KEY in window) return "present";

  const API = "/backend-api/";
  const CONVERSATION = /^\/backend-api\/conversations\/[0-9a-f-]{36}$/;
  const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  // The reads on their way, each cut short when stopped (review P1-02).
  const reading = new Set();

  const listening = function () {
    if (alive) {
      try {
        hear(arguments[0], arguments[1]);
      } catch {
        // The page's request is its own business, whatever this made of it.
      }
    }
    return apply(page, this, arguments);
  };
  window.fetch = listening;

  function hear(input, init) {
    const url = new NativeURL(
      typeof input === "string" ? input : (input?.url ?? String(input)),
      location.href,
    );
    if (url.origin !== location.origin || !url.pathname.startsWith(API)) return;
    const headers = new NativeHeaders(init?.headers ?? input?.headers ?? {});
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
    const hash = await apply(digest, subtle, [
      "SHA-256",
      apply(encode, encoder, [text]),
    ]);
    return [...new Uint8Array(hash)]
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
   * Anything but a 200 ends it; so does being stopped, at any step. */
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
    if (!(same ?? other)) return { outcome: "no-login" };
    const controller = new Abort();
    reading.add(controller);
    try {
      return await readTurns(conversation, promptId, controller.signal);
    } finally {
      reading.delete(controller);
    }
  }

  async function readTurns(conversation, promptId, signal) {
    const stood = {
      hidden: document.visibilityState === "hidden",
      login: same ? "same" : "other",
    };
    const began = performance.now();
    const took = () => Math.round(performance.now() - began);
    let turns = TURNS;
    let bytes = 0;
    for (let tries = 1; ; tries++) {
      // The sign-in as it is now: none once stopped.
      const login = alive ? (same ?? other) : null;
      if (!login) return { outcome: "stopped" };
      const sized = { turns, tries, bytes, ...stood };
      if (!allowed()) return { outcome: "limited", ...sized, ms: took() };
      let response;
      try {
        response = await apply(page, window, [
          `${API}conversations/${conversation}?num_turns=${turns}&include_has_versions=true`,
          { headers: login, credentials: "include", signal },
        ]);
      } catch {
        if (!alive) return { outcome: "stopped" };
        return { outcome: "error", ...sized, ms: took() };
      }
      if (!alive) return { outcome: "stopped" };
      const status = apply(statusOf, response, []);
      if (status !== 200)
        return { outcome: "http", status, ...sized, ms: took() };
      let body = null;
      try {
        const raw = await apply(textOf, response, []);
        if (!alive) return { outcome: "stopped" };
        bytes += bytesOf(raw);
        body = parse(raw);
      } catch {
        if (!alive) return { outcome: "stopped" };
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
      if (found.final) {
        found.final.sha = await fingerprint(text);
        if (!alive) return { outcome: "stopped" };
      }
      return { ...found, status: 200, ...sized, bytes, ms: took() };
    }
  }

  /** The switch went off: hears and reads nothing more, cuts short the
   * reads on their way, forgets the sign-in, and gives the page its own
   * fetch back unless someone wrapped it since (then this wrapper only
   * passes requests on). Stopped for good: nothing starts it again. */
  function stop() {
    alive = false;
    for (const controller of reading) apply(abort, controller, []);
    reading.clear();
    same = null;
    other = null;
    sent.length = 0;
    if (window.fetch === listening) window.fetch = page;
    return { stopped: true, restored: window.fetch === page };
  }

  // Not writable, not configurable: once here, nothing in the page swaps it.
  try {
    Object.defineProperty(window, KEY, {
      value: Object.freeze({ read, stop }),
    });
  } catch {
    stop();
    return "present";
  }
  return "installed";
})();
