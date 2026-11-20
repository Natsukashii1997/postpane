// Reads a conversation from the data chatgpt.com loads for itself, beside
// what page.js reads off the drawn page (#488, shadow run: recorded, never
// acted on). Put into the page's own world only while PostPane's shadow
// switch is on. It hears the sign-in the page sends on its own requests and
// keeps it in here: what leaves is a summary, with no words of the answer
// and nothing of the sign-in. Structure: docs/chatgpt-channel.md.
(() => {
  const DONE = "finished_successfully";
  const role = (message) => message.author.role;
  const words = (message) => (message.content?.parts ?? []).filter((part) => typeof part === "string").join("");

  /** The fields read here that `body` lacks: none when it can be read. */
  function missing(body) {
    if (!Array.isArray(body?.messages)) return ["messages"];
    const lacks = new Set();
    if (!body.page_info || typeof body.page_info !== "object") lacks.add("page_info");
    for (const message of body.messages) {
      if (typeof message?.id !== "string") lacks.add("messages[].id");
      if (typeof message?.author?.role !== "string") lacks.add("messages[].author.role");
      if (!message?.metadata || typeof message.metadata !== "object") lacks.add("messages[].metadata");
    }
    return [...lacks];
  }

  /** What `body` holds of the answer to the prompt `promptId`: the messages
   * after it up to the next prompt are its turn, the last one on the `final`
   * channel is the answer, written once all four of its marks say so. With
   * no prompt named, the newest one. `text` is the answer's Markdown. */
  function claim(body, promptId) {
    const lacks = missing(body);
    if (lacks.length) return { outcome: "unreadable", missing: lacks };
    const all = body.messages;
    const named = promptId ? all.findIndex((message) => message.id === promptId) : -1;
    const at = promptId ? named : all.findLastIndex((message) => role(message) === "user");
    const told = {
      outcome: "read",
      messages: all.length,
      more: !!body.page_info.has_previous_page,
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
    const next = all.findIndex((message, index) => index > at && role(message) === "user");
    const turn = all.slice(at + 1, next < 0 ? all.length : next);
    const exchange = all[at].metadata.turn_exchange_id;
    const answer = turn.findLast((message) => role(message) === "assistant" && message.channel === "final");
    const last = turn.at(-1);
    told.after = turn.length;
    told.exchange = turn.every((message) => message.metadata.turn_exchange_id === exchange);
    if (last) told.last = { role: role(last), channel: last.channel ?? null, status: last.status ?? null, type: last.content?.content_type ?? null };
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
    told.written = status === DONE && endTurn === true && complete === true && finish === "stop";
    return told;
  }

  // Bare (the tests): only the reading above. In a page nothing is put on
  // `window` for it to find.
  if (typeof window === "undefined") {
    globalThis.PostPaneData = { claim, missing };
    return;
  }
  const HERE = Symbol.for("postpane.data");
  if (window[HERE]) return;
  window[HERE] = true;

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
  // The page's sign-in, as it last sent it: on reading a conversation
  // (`same`), else on any other request of its own (`other`).
  let same = null;
  let other = null;

  const page = window.fetch;
  window.fetch = function (input, init) {
    try {
      hear(input, init);
    } catch {
      // The page's request is its own business, whatever this made of it.
    }
    return page.apply(this, arguments);
  };

  function hear(input, init) {
    const url = new URL(typeof input === "string" ? input : (input?.url ?? String(input)), location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(API)) return;
    const sent = new Headers(init?.headers ?? input?.headers ?? {});
    if (!sent.has("authorization")) return;
    const method = (init?.method ?? input?.method ?? "GET").toUpperCase();
    if (method === "GET" && CONVERSATION.test(url.pathname)) same = [...sent].filter(([name]) => SIGN_IN.test(name));
    else other = [...sent].filter(([name]) => SEEN.has(name));
  }

  async function fingerprint(text) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }

  /** Reads `conversation` once: its newest two turns, and once more, wider,
   * when the prompt named is further back. Anything but a 200 ends it. */
  async function read(conversation, promptId) {
    const login = same ?? other;
    if (!login) return { outcome: "no-login" };
    const stood = { hidden: document.visibilityState === "hidden", login: same ? "same" : "other" };
    const began = performance.now();
    const took = () => Math.round(performance.now() - began);
    let turns = TURNS;
    let bytes = 0;
    for (let tries = 1; ; tries++) {
      const sized = { turns, tries, bytes, ...stood };
      let response;
      try {
        response = await page.call(window, `${API}conversations/${conversation}?num_turns=${turns}&include_has_versions=true`, { headers: login, credentials: "include" });
      } catch {
        return { outcome: "error", ...sized, ms: took() };
      }
      if (response.status !== 200) return { outcome: "http", status: response.status, ...sized, ms: took() };
      let body = null;
      try {
        const raw = await response.text();
        bytes += raw.length;
        body = JSON.parse(raw);
      } catch {
        return { outcome: "unreadable", missing: ["json"], status: 200, ...sized, bytes, ms: took() };
      }
      const { text, ...found } = claim(body, promptId);
      const further = found.outcome === "read" && promptId && !found.askFound && found.more && turns < WIDE;
      if (further) {
        turns = WIDE;
        continue;
      }
      if (found.final) found.final.sha = await fingerprint(text);
      return { ...found, status: 200, ...sized, bytes, ms: took() };
    }
  }

  window.addEventListener("message", (event) => {
    const ask = event.data;
    if (event.source !== window || ask?.postpane !== "data-read" || !ID.test(ask.conversation ?? "")) return;
    read(ask.conversation, ask.promptId ?? null).then((answer) => window.postMessage({ postpane: "data-answer", id: ask.id, answer }, "/"));
  });
})();
