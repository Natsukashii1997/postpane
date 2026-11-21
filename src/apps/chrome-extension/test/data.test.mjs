// Runs data.js two ways: bare, for what it makes of a conversation's data,
// and with a stubbed page, for how it hears the page's sign-in and reads.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { createHash } from "node:crypto";

const source = readFileSync(new URL("../data.js", import.meta.url), "utf8");
const CONVERSATION = "6affe42f-aeb8-83ec-91b5-928f5f8228f6";
const SECRET = "Bearer secret-token";

/** Bare: no page, only what the file makes of a body. */
function bare() {
  const context = {};
  vm.runInNewContext(source, context);
  return context.PostPaneData;
}

const user = (id, exchange) => ({
  id,
  author: { role: "user" },
  status: "finished_successfully",
  content: { content_type: "text", parts: ["the words sent"] },
  metadata: { turn_exchange_id: exchange },
});
const step = (id, exchange, more = {}) => ({
  id,
  author: { role: "assistant" },
  status: "finished_successfully",
  end_turn: false,
  channel: null,
  content: { content_type: "thoughts", thoughts: [] },
  metadata: { turn_exchange_id: exchange },
  ...more,
});
const final = (id, exchange, text, more = {}) => ({
  id,
  author: { role: "assistant" },
  status: "finished_successfully",
  end_turn: true,
  channel: "final",
  content: { content_type: "text", parts: [text] },
  metadata: {
    turn_exchange_id: exchange,
    is_complete: true,
    finish_details: { type: "stop" },
  },
  ...more,
});
const body = (messages, more = {}) => ({
  conversation_id: CONVERSATION,
  current_node: messages.at(-1)?.id ?? null,
  async_status: null,
  page_info: { has_previous_page: false, has_next_page: false },
  messages,
  ...more,
});

test("the answer to a prompt is the final message of its exchange, with whether it is written", () => {
  const { claim } = bare();
  const found = claim(
    body([
      user("ask-1", "x1"),
      step("think-1", "x1"),
      final("final-1", "x1", "first answer"),
      user("ask-2", "x2"),
      // A thought left "in progress" in a finished turn is not the answer.
      step("think-2", "x2", { status: "in_progress" }),
      final("final-2", "x2", "# Second\n\nanswer"),
    ]),
    "ask-2",
  );
  assert.equal(found.outcome, "read");
  assert.equal(found.askFound, true);
  assert.equal(found.prompt, "ask-2");
  assert.equal(found.after, 2);
  assert.equal(found.exchange, true);
  assert.deepEqual(JSON.parse(JSON.stringify(found.final)), {
    id: "final-2",
    status: "finished_successfully",
    endTurn: true,
    complete: true,
    finish: "stop",
    chars: 16,
  });
  assert.equal(found.written, true);
  assert.equal(found.text, "# Second\n\nanswer");
  // The earlier prompt's answer is its own, not the newest.
  const earlier = claim(
    body([
      user("ask-1", "x1"),
      final("final-1", "x1", "first"),
      user("ask-2", "x2"),
      final("final-2", "x2", "second"),
    ]),
    "ask-1",
  );
  assert.equal(earlier.final.id, "final-1");
  assert.equal(earlier.after, 1);
});

test("an answer still being written is not written, and says how far it got", () => {
  const { claim } = bare();
  const none = claim(
    body([user("ask", "x"), step("think", "x", { status: "in_progress" })]),
    "ask",
  );
  assert.equal(none.final, null);
  assert.equal(none.written, false);
  assert.deepEqual(JSON.parse(JSON.stringify(none.last)), {
    role: "assistant",
    channel: null,
    status: "in_progress",
    type: "thoughts",
  });
  const half = claim(
    body([
      user("ask", "x"),
      final("final", "x", "half an ans", {
        status: "in_progress",
        end_turn: null,
        metadata: { turn_exchange_id: "x" },
      }),
    ]),
    "ask",
  );
  assert.equal(half.final.id, "final");
  assert.equal(half.final.status, "in_progress");
  assert.equal(half.written, false);
});

test("a prompt the data does not hold is said so, with whether there is more before", () => {
  const { claim } = bare();
  const found = claim(
    body([step("think", "x"), final("final", "x", "answer")], {
      page_info: { has_previous_page: true },
    }),
    "ask",
  );
  assert.equal(found.outcome, "read");
  assert.equal(found.askFound, false);
  assert.equal(found.more, true);
  assert.equal(found.final, null);
  assert.equal(found.written, false);
});

test("with no prompt named, the newest one is read and marked as not named", () => {
  const { claim } = bare();
  const found = claim(
    body([
      user("ask-1", "x1"),
      final("final-1", "x1", "a"),
      user("ask-2", "x2"),
      final("final-2", "x2", "bb"),
    ]),
    null,
  );
  assert.equal(found.asked, null);
  assert.equal(found.askFound, false);
  assert.equal(found.prompt, "ask-2");
  assert.equal(found.final.id, "final-2");
});

test("data without the fields read here is unreadable, naming what is missing", () => {
  const { claim } = bare();
  assert.deepEqual(JSON.parse(JSON.stringify(claim({ mapping: {} }, "ask"))), {
    outcome: "unreadable",
    missing: ["messages"],
  });
  const found = claim(
    body([{ id: "ask", author: {}, metadata: {} }], { page_info: null }),
    "ask",
  );
  assert.equal(found.outcome, "unreadable");
  assert.deepEqual([...found.missing].sort(), [
    "messages[].author.role",
    "page_info.has_previous_page",
  ]);
  // Whether there is more before must be said, as a boolean (#488 review P2-01).
  assert.equal(
    claim(
      body([user("ask", "x")], { page_info: { has_previous_page: "yes" } }),
      "ask",
    ).outcome,
    "unreadable",
  );
});

// #488 review P2-01: the answer is the prompt's own, by its exchange id.
test("the answer must share the prompt's exchange id, and a prompt without one cannot be read", () => {
  const { claim } = bare();
  // A final of another exchange in the turn is not the answer; the last of
  // its own is.
  const mixed = claim(
    body([
      user("ask", "x"),
      final("mine", "x", "mine"),
      step("other-step", "y"),
      final("theirs", "y", "theirs"),
    ]),
    "ask",
  );
  assert.equal(mixed.final.id, "mine");
  assert.equal(mixed.exchange, false);
  assert.equal(mixed.written, true);
  const none = claim(
    body([user("ask", "x"), final("theirs", "y", "theirs")]),
    "ask",
  );
  assert.equal(none.final, null);
  assert.equal(none.written, false);
  const two = claim(
    body([
      user("ask", "x"),
      final("first", "x", "a"),
      final("second", "x", "bb"),
    ]),
    "ask",
  );
  assert.equal(two.final.id, "second");
  const unnamed = claim(
    body([{ ...user("ask", "x"), metadata: {} }, final("f", "x", "a")]),
    "ask",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(unnamed)), {
    outcome: "unreadable",
    missing: ["messages[].metadata.turn_exchange_id"],
  });
});

test("a prompt is a message the person sent: an id of another kind is not taken for it", () => {
  const { claim } = bare();
  const found = claim(
    body([user("ask", "x"), final("final", "x", "answer")]),
    "final",
  );
  assert.equal(found.askFound, false);
  assert.equal(found.prompt, null);
  assert.equal(found.final, null);
});

const ASK = "0b1c2d3e-0000-4000-8000-000000000001";
const KEY = "__postpaneData";

/** A stubbed page showing `CONVERSATION`: `window.fetch` answers from
 * `served` with real responses (of the page's own `Response`, which a test
 * may change). A served `{ held: true }` answers once `release()` is called,
 * or fails once the request is cut short. The file is called as the
 * extension does, by its handle. `before` runs in the page first. */
function page({
  served = [],
  hidden = false,
  path = `/g/g-p-x/c/${CONVERSATION}`,
  before,
} = {}) {
  const calls = [];
  const listeners = [];
  const held = [];
  // The page's own: changing it reaches nothing outside this page.
  const PageResponse = class extends Response {};
  const window = {
    fetch: async (input, init) => {
      calls.push({
        url: String(input?.url ?? input),
        headers: [...new Headers(init?.headers ?? input?.headers ?? {})],
        signal: init?.signal ?? null,
      });
      const next = served.shift() ?? { status: 200, body: {} };
      if (next.throws) throw new TypeError("Failed to fetch");
      const answer = () =>
        new PageResponse(next.raw ?? JSON.stringify(next.body), {
          status: next.status,
        });
      if (!next.held) return answer();
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
        held.push(() => resolve(answer()));
      });
    },
    addEventListener: (name, fn) => listeners.push([name, fn]),
    postMessage: () => {
      throw new Error("nothing goes over the page's messages");
    },
  };
  const location = {
    origin: "https://chatgpt.com",
    href: `https://chatgpt.com${path}`,
    pathname: path,
  };
  const context = {
    window,
    location,
    document: { visibilityState: hidden ? "hidden" : "visible" },
    Headers,
    URL,
    Response: PageResponse,
    AbortController,
    TextEncoder,
    crypto: globalThis.crypto,
    performance,
    // The page's own: swapping its Date.now reaches nothing outside.
    Date: class PageDate extends Date {},
  };
  vm.createContext(context);
  before?.(context);
  const installed = vm.runInContext(source, context);
  const handle = () => window[KEY];
  const read = async (conversation = CONVERSATION, promptId = ASK) =>
    JSON.parse(JSON.stringify(await handle().read(conversation, promptId)));
  const release = () => held.shift()?.();
  return {
    window,
    calls,
    listeners,
    read,
    handle,
    context,
    location,
    installed,
    release,
  };
}

const pageHeaders = {
  Authorization: SECRET,
  "OAI-Device-Id": "device",
  "OAI-Language": "zh-CN",
  "Content-Type": "application/json",
  "X-Other": "no",
};
const own = (window) =>
  window.fetch(`/backend-api/conversations/${CONVERSATION}?num_turns=10`, {
    headers: pageHeaders,
  });

test("the page gets one handle, fixed in place, and no listener", () => {
  const { window, listeners, handle, context, installed } = page();
  assert.equal(installed, "installed");
  assert.deepEqual(listeners, []);
  assert.equal(context.PostPaneData, undefined);
  const descriptor = Object.getOwnPropertyDescriptor(window, KEY);
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert.ok(Object.isFrozen(handle()));
  assert.deepEqual(Object.keys(handle()).sort(), ["prove", "read", "stop"]);
});

test("nothing is read before the page's own sign-in was heard", async () => {
  const { read, calls } = page();
  assert.deepEqual(await read(), { outcome: "no-login" });
  assert.equal(calls.length, 0);
});

test("a read reuses the sign-in the page sent, asks for two turns, and tells no words and no sign-in", async () => {
  const reply = "the full answer, not to leave the page";
  const { window, read, calls } = page({
    hidden: true,
    served: [
      { status: 200, body: {} },
      { status: 200, body: body([user(ASK, "x"), final("final", "x", reply)]) },
    ],
  });
  assert.equal((await own(window)).status, 200);
  const answer = await read();
  assert.equal(
    calls[1].url,
    `/backend-api/conversations/${CONVERSATION}?num_turns=2&include_has_versions=true`,
  );
  // Only the sign-in headers go again, not every header of that request.
  assert.deepEqual(calls[1].headers.map(([name]) => name).sort(), [
    "authorization",
    "oai-device-id",
    "oai-language",
  ]);
  assert.equal(answer.outcome, "read");
  assert.equal(answer.status, 200);
  assert.equal(answer.turns, 2);
  assert.equal(answer.tries, 1);
  assert.equal(answer.hidden, true);
  assert.equal(answer.login, "same");
  assert.equal(answer.written, true);
  assert.equal(answer.final.chars, reply.length);
  assert.match(answer.final.sha, /^[0-9a-f]{16}$/);
  const told = JSON.stringify(answer);
  assert.ok(
    !told.includes(reply) &&
      !told.includes("secret-token") &&
      !("text" in answer),
  );
});

test("sign-in heard on another request of the page serves when the conversation's was not seen", async () => {
  const { window, read, calls } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: {} },
      { status: 200, body: body([user(ASK, "x")]) },
    ],
  });
  await window.fetch(
    new Request("https://chatgpt.com/backend-api/settings/user", {
      headers: { ...pageHeaders, "OAI-Echo-Logs": "not seen on a read" },
    }),
  );
  // Elsewhere, or without sign-in: not heard.
  await window.fetch("https://example.com/backend-api/x", {
    headers: { Authorization: "Bearer elsewhere" },
  });
  const answer = await read();
  assert.equal(answer.outcome, "read");
  assert.equal(answer.login, "other");
  assert.deepEqual(
    calls[2].headers.find(([name]) => name === "authorization"),
    ["authorization", SECRET],
  );
  // Of another request, only the names the page's own read was seen to carry.
  assert.deepEqual(calls[2].headers.map(([name]) => name).sort(), [
    "authorization",
    "oai-device-id",
    "oai-language",
  ]);
});

// #488 review P1-01: whoever calls the handle, it reads the conversation the
// page shows and nothing else, and not more often than a prompt needs.
test("only the conversation the page shows is read, with ids that are ids", async () => {
  const other = "6affe42f-aeb8-83ec-91b5-928f5f8228aa";
  const { window, read, calls } = page();
  await own(window);
  assert.deepEqual(await read(other), { outcome: "other-conversation" });
  assert.deepEqual(await read("../../me"), { outcome: "other-conversation" });
  assert.deepEqual(await read(CONVERSATION, "x&num_turns=999"), {
    outcome: "other-conversation",
  });
  assert.equal(calls.length, 1);
  const home = page({ path: "/" });
  await own(home.window);
  assert.deepEqual(await home.read(), { outcome: "other-conversation" });
});

test("reads are capped: twelve requests in ten minutes, whoever asks", async () => {
  const { window, read, calls } = page({
    served: Array.from({ length: 20 }, () => ({
      status: 200,
      body: body([user(ASK, "x")]),
    })),
  });
  await own(window);
  for (let i = 0; i < 12; i++) assert.equal((await read()).outcome, "read");
  const limited = await read();
  assert.equal(limited.outcome, "limited");
  assert.equal(calls.length, 13);
});

test("a read that is refused says so and reads nothing more", async () => {
  const { window, read, calls } = page({
    served: [
      { status: 200, body: {} },
      { status: 429, body: {} },
    ],
  });
  await own(window);
  const answer = await read();
  assert.equal(answer.outcome, "http");
  assert.equal(answer.status, 429);
  assert.equal(calls.length, 2);
  const down = page({ served: [{ status: 200, body: {} }, { throws: true }] });
  await own(down.window);
  assert.equal((await down.read()).outcome, "error");
});

test("a prompt further back than two turns is looked for once more, wider", async () => {
  const { window, read, calls } = page({
    served: [
      { status: 200, body: {} },
      {
        status: 200,
        body: body([final("final", "x", "answer")], {
          page_info: { has_previous_page: true },
        }),
      },
      {
        status: 200,
        body: body([user(ASK, "x"), final("final", "x", "answer")]),
      },
    ],
  });
  await own(window);
  const answer = await read();
  assert.match(calls[2].url, /num_turns=10&/);
  assert.equal(answer.tries, 2);
  assert.equal(answer.turns, 10);
  assert.equal(answer.askFound, true);
});

// #488 review P1-02: switched off, a copy in a page keeps nothing and does
// nothing; switched on again, it hears again.
test("stopped, the page gets its fetch back, the sign-in is forgotten and nothing is read", async () => {
  const { window, read, handle, calls, context } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: {} },
      { status: 200, body: body([user(ASK, "x")]) },
    ],
  });
  const ours = window.fetch;
  await own(window);
  assert.deepEqual(JSON.parse(JSON.stringify(handle().stop())), {
    stopped: true,
    restored: true,
  });
  assert.notEqual(window.fetch, ours);
  const theirs = window.fetch;
  assert.deepEqual(await read(), { outcome: "stopped" });
  assert.equal(calls.length, 1);
  // Stopped for good (#488 review P1-02): put in again (the switch on
  // again), the new copy finds the handle there and steps aside; nothing in
  // the page can start the old one, and it hears nothing.
  assert.equal(vm.runInContext(source, context), "present");
  assert.equal(window.fetch, theirs);
  assert.equal(handle().start, undefined);
  await own(window);
  assert.deepEqual(await read(), { outcome: "stopped" });
  assert.equal(calls.length, 2);
});

test("stopped after the page wrapped fetch itself, it only passes requests on", async () => {
  const { window, read, handle, calls } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: {} },
    ],
  });
  const ours = window.fetch;
  const wrapped = function (...args) {
    return ours.apply(this, args);
  };
  window.fetch = wrapped;
  assert.deepEqual(JSON.parse(JSON.stringify(handle().stop())), {
    stopped: true,
    restored: false,
  });
  assert.equal(window.fetch, wrapped);
  await own(window);
  assert.equal(calls.length, 1);
  assert.deepEqual(await read(), { outcome: "stopped" });
});

test("the page's own requests go through untouched, whatever they are", async () => {
  const { window, calls } = page({
    served: [
      { status: 201, body: { ok: 1 } },
      { status: 200, body: {} },
    ],
  });
  const response = await window.fetch("/backend-api/conversation/init", {
    method: "POST",
    headers: pageHeaders,
    body: "{}",
  });
  assert.equal(response.status, 201);
  // An address this file cannot make sense of is the page's business alone.
  assert.equal((await window.fetch("http://[bad")).status, 200);
  assert.deepEqual(
    calls.map((call) => call.url),
    ["/backend-api/conversation/init", "http://[bad"],
  );
});

// #488 review P2-06: an answer is read only from text parts.
test("an answer not said in text parts cannot be read, and is not taken as written", () => {
  const { claim } = bare();
  const shaped = (content) =>
    claim(body([user("ask", "x"), final("f", "x", "a", { content })]), "ask");
  for (const [content, lacks] of [
    [undefined, "final.content.content_type"],
    [
      { content_type: "multimodal_text", parts: ["a"] },
      "final.content.content_type",
    ],
    [{ content_type: "text" }, "final.content.parts"],
    [{ content_type: "text", parts: [] }, "final.content.parts"],
    [
      { content_type: "text", parts: ["a", { asset: 1 }] },
      "final.content.parts",
    ],
  ])
    assert.deepEqual(JSON.parse(JSON.stringify(shaped(content))), {
      outcome: "unreadable",
      missing: [lacks],
    });
});

// #488 review: a message's kinds are known words, or `other`.
test("a message's role, channel, status, type and finish are known words, else other", () => {
  const { claim, KINDS } = bare();
  const found = claim(
    body([
      user("ask", "x"),
      final("f", "x", "a", {
        status: "token-like-abc",
        metadata: {
          turn_exchange_id: "x",
          is_complete: true,
          finish_details: { type: "free text here" },
        },
      }),
      step("s", "x", { channel: "secret", status: "in_progress" }),
    ]),
    "ask",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(found.last)), {
    role: "assistant",
    channel: "other",
    status: "in_progress",
    type: "thoughts",
  });
  assert.equal(found.final.status, "other");
  assert.equal(found.final.finish, "other");
  assert.equal(found.written, false);
  assert.equal(
    claim(body([user("ask", "x")], { async_status: 4 }), "ask").asyncStatus,
    "other",
  );
  assert.deepEqual(Object.keys(KINDS).sort(), [
    "channel",
    "finish",
    "role",
    "status",
    "type",
  ]);
});

// #488 review P2-07: what came back is counted in UTF-8 bytes.
test("bytes are the UTF-8 bytes of what came back", async () => {
  const served = body([user(ASK, "x"), final("f", "x", "中文的回信")]);
  const { window, read } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: served },
    ],
  });
  await own(window);
  const answer = await read();
  assert.equal(answer.bytes, Buffer.byteLength(JSON.stringify(served)));
  assert.ok(answer.bytes > JSON.stringify(served).length);
});

// #488 review P1-01: a handle there before the file is not taken for its own.
test("a page that holds the handle first keeps it: the file steps aside and says so", async () => {
  const fake = Object.freeze({
    read: () => ({ outcome: "read", written: true }),
    stop: () => ({ stopped: true }),
  });
  let theirs;
  const { window, installed, handle } = page({
    before: (context) => {
      Object.defineProperty(context.window, KEY, { value: fake });
      theirs = context.window.fetch;
    },
  });
  assert.equal(installed, "present");
  assert.equal(handle(), fake);
  // It does not hear the page: fetch is the page's own.
  assert.equal(window.fetch, theirs);
});

// #488 review P1-01: what reading uses of the page is taken when the file
// goes in; the page changing it later reaches no read.
test("a page changing Response, JSON or digest after the file went in changes no read", async () => {
  const reply = "the real answer";
  const { window, read, context } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: body([user(ASK, "x"), final("f", "x", reply)]) },
    ],
  });
  await own(window);
  const fakeBody = JSON.stringify(
    body([user(ASK, "x"), final("f", "x", "made up")]),
  );
  context.Response.prototype.text = async () => fakeBody;
  Object.defineProperty(context.Response.prototype, "status", {
    get: () => 200,
  });
  vm.runInContext(
    "JSON.parse = () => ({}); crypto = { subtle: { digest: async () => new ArrayBuffer(32) } };",
    context,
  );
  const answer = await read();
  assert.equal(answer.outcome, "read");
  assert.equal(answer.final.chars, reply.length);
  assert.notEqual(answer.final.sha, "0000000000000000");
});

// #488 review P1-02: stopped while a read is on its way, it is cut short and
// asks for nothing more.
test("stopped while a read is on its way, the read is cut short and no wider read goes", async () => {
  const further = body([final("f", "x", "answer")], {
    page_info: { has_previous_page: true },
  });
  const { window, read, handle, calls, release } = page({
    served: [
      { status: 200, body: {} },
      { held: true, status: 200, body: further },
    ],
  });
  await own(window);
  const reading = read();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2);
  handle().stop();
  assert.equal(calls[1].signal.aborted, true);
  release();
  assert.deepEqual(await reading, { outcome: "stopped" });
  assert.equal(calls.length, 2);
});

// #488 review round 3, P1-01: the extension finds the handle by its name;
// a page swapping Symbol.for (or anything else) cannot point it at another.
test("the extension's calls find this file's handle, whatever the page swaps", async () => {
  const background = readFileSync(
    new URL("../background.js", import.meta.url),
    "utf8",
  );
  const pick = (name) =>
    background.match(
      new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`),
    )[0];
  const { window, context, calls } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: body([user(ASK, "x"), final("f", "x", "real")]) },
    ],
  });
  await own(window);
  vm.runInContext(
    `${pick("readInPage")}\n${pick("stopInPage")}
     const fake = Symbol("fake");
     Symbol.for = () => fake;
     window[fake] = { read: () => ({ outcome: "read", written: true }), stop: () => ({ stopped: true }) };
     Object.defineProperty(Object.prototype, "__postpaneData", { get: () => window[fake] });`,
    context,
  );
  const read = JSON.parse(
    JSON.stringify(
      await vm.runInContext(
        `readInPage(${JSON.stringify(CONVERSATION)}, ${JSON.stringify(ASK)})`,
        context,
      ),
    ),
  );
  assert.equal(read.outcome, "read");
  assert.equal(read.final.chars, "real".length);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(vm.runInContext("stopInPage()", context))),
    { stopped: true, restored: true },
  );
});

// #488 review round 5, P1-01: the handle goes in before anything else; set
// up failing after, it only says so, and the page cannot put one of its own
// in its place.
test("set up failing after the handle went in, a read only says it failed, and the handle stays this file's", async () => {
  const context = {
    window: { fetch: async () => ({}) },
    location: {
      origin: "https://chatgpt.com",
      href: "https://chatgpt.com/",
      pathname: "/",
    },
    document: { visibilityState: "visible" },
    // No Response: taking what reading uses throws.
    Headers,
    URL,
    TextEncoder,
    crypto: globalThis.crypto,
  };
  vm.createContext(context);
  assert.throws(() => vm.runInContext(source, context));
  const handle = context.window[KEY];
  assert.ok(handle);
  assert.deepEqual(
    JSON.parse(JSON.stringify(await handle.read(CONVERSATION, ASK))),
    { outcome: "failed" },
  );
  // The page cannot swap it for one of its own.
  vm.runInContext(
    `try { Object.defineProperty(window, "${KEY}", { value: { read: () => ({ outcome: "read" }) } }); } catch {}
     window["${KEY}"] = { read: () => ({ outcome: "read" }) };`,
    context,
  );
  assert.equal(context.window[KEY], handle);
  assert.deepEqual(JSON.parse(JSON.stringify(handle.stop())), {
    stopped: true,
    restored: false,
  });
});

// #488 review, new cycle rounds 1-2, P1-01: mark.js keeps a token only from
// data.js's sign, left once its handle is in, and only that handle can prove
// it knows the token. data.js not running, its handle not going in, mark.js
// running first, or a sign another extension put in: nothing to prove.
const markSource = readFileSync(new URL("../mark.js", import.meta.url), "utf8");

/** A page as it loads: an empty document, its page world and the
 * extension's own world (`isolated`) sharing it. */
function loading({ taken = false } = {}) {
  const children = [];
  const document = {
    readyState: "loading",
    visibilityState: "visible",
    createElement: (localName) => {
      const attributes = {};
      const element = {
        localName,
        setAttribute: (name, value) => (attributes[name] = String(value)),
        getAttribute: (name) => attributes[name] ?? null,
        remove: () => children.splice(children.indexOf(element), 1),
      };
      return element;
    },
    documentElement: {
      appendChild: (element) => children.push(element),
      querySelectorAll: (name) =>
        children.filter((element) => element.localName === name),
    },
  };
  const window = { fetch: async () => new Response("{}") };
  if (taken)
    Object.defineProperty(window, KEY, { value: { read: () => ({}) } });
  const main = vm.createContext({
    window,
    document,
    location: {
      origin: "https://chatgpt.com",
      href: "https://chatgpt.com/",
      pathname: "/",
    },
    Headers,
    URL,
    Response,
    AbortController,
    TextEncoder,
    crypto: globalThis.crypto,
    performance,
    Date,
  });
  const isolated = vm.createContext({ document });
  return {
    window,
    children,
    data: () => vm.runInContext(source, main),
    mark: () => {
      vm.runInContext(markSource, isolated);
      return isolated.postpaneDataToken;
    },
    // Another extension, at document_start: a sign of its own.
    otherSign: (token) => {
      const sign = document.createElement("postpane-installed");
      if (token) sign.setAttribute("data-token", token);
      document.documentElement.appendChild(sign);
    },
    // The page, after: its own handle, if it can put one in.
    forge: () =>
      vm.runInContext(
        `window.${KEY} = { read: () => ({ outcome: "read", written: true }), prove: async () => "${"f".repeat(64)}" };`,
        main,
      ),
  };
}

const NONCE = "fedcba9876543210fedcba9876543210";
const proofOf = (token) =>
  createHash("sha256").update(`${token}:${NONCE}`).digest("hex");

test("mark.js keeps the token of data.js's sign, and only data.js's handle proves it", async () => {
  const both = loading();
  assert.equal(both.data(), "installed");
  const token = both.mark();
  assert.match(token, /^[0-9a-f]{32}$/);
  assert.deepEqual(both.children, [], "the sign is taken away");
  assert.equal(await both.window[KEY].prove(NONCE), proofOf(token));
  assert.equal(await both.window[KEY].prove("not a nonce"), null);
  // data.js never ran: no token.
  const alone = loading();
  assert.equal(alone.mark(), null);
  // mark.js ran first: no token either.
  const early = loading();
  assert.equal(early.mark(), null);
  assert.equal(early.data(), "installed");
  // data.js's handle could not go in: no sign.
  const taken = loading({ taken: true });
  assert.equal(taken.data(), "present");
  assert.equal(taken.mark(), null);
});

test("a sign another extension put in proves nothing: the page's handle cannot answer for its token", async () => {
  // data.js absent; another extension's sign, with a token of its own.
  const page = loading();
  page.otherSign("0123456789abcdef0123456789abcdef");
  const token = page.mark();
  page.forge();
  assert.notEqual(await page.window[KEY].prove(NONCE), proofOf(token));
  // Without a token, or beside data.js's own: none kept.
  const bare = loading();
  bare.otherSign();
  assert.equal(bare.mark(), null);
  const two = loading();
  two.otherSign("0123456789abcdef0123456789abcdef");
  assert.equal(two.data(), "installed");
  assert.equal(two.mark(), null);
  assert.deepEqual(two.children, [], "every sign is taken away");
});

test("a handle that cannot be put in is not taken for one there already, and leaves no sign", () => {
  const page = loading();
  Object.preventExtensions(page.window);
  assert.equal(page.data(), "unavailable");
  assert.equal(page.mark(), null);
  assert.deepEqual(page.children, []);
});

// #488 review P2-13: the cap counts by the clock taken when the file went in;
// the page swapping Date.now after does not lift it.
test("a page swapping Date.now after the file went in does not lift the request cap", async () => {
  const { window, read, calls, context } = page({
    served: Array.from({ length: 20 }, () => ({
      status: 200,
      body: body([user(ASK, "x")]),
    })),
  });
  await own(window);
  let at = Date.now();
  // Every call ten minutes and more on: every count would look stale.
  context.Date.now = () => (at += 11 * 60 * 1000);
  for (let i = 0; i < 12; i++) assert.equal((await read()).outcome, "read");
  assert.equal((await read()).outcome, "limited");
  assert.equal(calls.length, 13);
});
