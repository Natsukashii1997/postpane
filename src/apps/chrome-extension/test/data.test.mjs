// Runs data.js two ways: bare, for what it makes of a conversation's data,
// and with a stubbed page, for how it hears the page's sign-in and reads.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

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
const KEY = Symbol.for("postpane.data");

/** A stubbed page showing `CONVERSATION`: `window.fetch` answers from
 * `served`. The file is called as the extension does, by its handle. */
function page({
  served = [],
  hidden = false,
  path = `/g/g-p-x/c/${CONVERSATION}`,
} = {}) {
  const calls = [];
  const listeners = [];
  const window = {
    fetch: async (input, init) => {
      calls.push({
        url: String(input?.url ?? input),
        headers: [...new Headers(init?.headers ?? input?.headers ?? {})],
      });
      const next = served.shift() ?? { status: 200, body: {} };
      if (next.throws) throw new TypeError("Failed to fetch");
      return {
        status: next.status,
        ok: next.status >= 200 && next.status < 300,
        text: async () => JSON.stringify(next.body),
      };
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
    TextEncoder,
    crypto: globalThis.crypto,
    performance,
    Date,
  };
  vm.runInNewContext(source, context);
  const handle = () => window[KEY];
  const read = async (conversation = CONVERSATION, promptId = ASK) =>
    JSON.parse(JSON.stringify(await handle().read(conversation, promptId)));
  return { window, calls, listeners, read, handle, context, location };
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
  const { window, listeners, handle, context } = page();
  assert.deepEqual(listeners, []);
  assert.equal(context.PostPaneData, undefined);
  const descriptor = Object.getOwnPropertyDescriptor(window, KEY);
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert.ok(Object.isFrozen(handle()));
  assert.deepEqual(Object.keys(handle()).sort(), ["read", "start", "stop"]);
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
  const theirs = window.fetch;
  await own(window);
  assert.deepEqual(JSON.parse(JSON.stringify(handle().stop())), {
    stopped: true,
    restored: true,
  });
  assert.notEqual(window.fetch, theirs);
  assert.deepEqual(await read(), { outcome: "stopped" });
  assert.equal(calls.length, 1);
  // Put in again (the switch on again): the copy there hears again, and the
  // sign-in it forgot must be heard anew.
  vm.runInNewContext(source, context);
  assert.deepEqual(await read(), { outcome: "no-login" });
  await own(window);
  assert.equal((await read()).outcome, "read");
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
