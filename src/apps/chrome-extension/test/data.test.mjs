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
    "page_info",
  ]);
});

/** A stubbed page: `window.fetch` answers from `served`, and the file's
 * answers to "data-read" asks are collected. */
function page({ served = [], hidden = false } = {}) {
  const calls = [];
  const answers = [];
  const listeners = [];
  const window = {
    location: {
      origin: "https://chatgpt.com",
      href: `https://chatgpt.com/c/${CONVERSATION}`,
    },
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
    addEventListener: (name, fn) => name === "message" && listeners.push(fn),
    postMessage: (data) =>
      data.postpane === "data-answer" && answers.push(data),
  };
  const context = {
    window,
    location: window.location,
    document: { visibilityState: hidden ? "hidden" : "visible" },
    Headers,
    URL,
    TextEncoder,
    crypto: globalThis.crypto,
    performance,
  };
  vm.runInNewContext(source, context);
  const ask = async (conversation = CONVERSATION, promptId = "ask") => {
    const id = `id-${answers.length}`;
    for (const fn of listeners)
      fn({
        source: window,
        data: { postpane: "data-read", id, conversation, promptId },
      });
    for (let i = 0; i < 50 && !answers.some((a) => a.id === id); i++)
      await new Promise((resolve) => setImmediate(resolve));
    return JSON.parse(
      JSON.stringify(answers.find((a) => a.id === id)?.answer ?? null),
    );
  };
  return { window, calls, answers, listeners, ask, context };
}

const pageHeaders = {
  Authorization: SECRET,
  "OAI-Device-Id": "device",
  "OAI-Language": "zh-CN",
  "Content-Type": "application/json",
  "X-Other": "no",
};

test("nothing is read before the page's own sign-in was heard", async () => {
  const { ask, calls, context } = page();
  assert.equal(
    context.PostPaneData,
    undefined,
    "the page gets no global of ours",
  );
  assert.deepEqual(await ask(), { outcome: "no-login" });
  assert.equal(calls.length, 0);
});

test("a read reuses the sign-in the page sent, asks for two turns, and tells no words and no sign-in", async () => {
  const reply = "the full answer, not to leave the page";
  const { window, ask, calls, answers } = page({
    hidden: true,
    served: [
      { status: 200, body: {} },
      {
        status: 200,
        body: body([user("ask", "x"), final("final", "x", reply)]),
      },
    ],
  });
  // The page's own request: answered as before, its sign-in heard.
  const own = await window.fetch(
    `/backend-api/conversations/${CONVERSATION}?num_turns=10`,
    { headers: pageHeaders },
  );
  assert.equal(own.status, 200);
  const answer = await ask();
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
  const told = JSON.stringify(answers);
  assert.ok(
    !told.includes(reply) &&
      !told.includes("secret-token") &&
      !("text" in answer),
  );
});

test("sign-in heard on another request of the page serves when the conversation's was not seen", async () => {
  const { window, ask, calls } = page({
    served: [
      { status: 200, body: {} },
      { status: 200, body: {} },
      { status: 200, body: body([user("ask", "x")]) },
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
  const answer = await ask();
  assert.equal(answer.outcome, "read");
  assert.equal(answer.login, "other");
  // Of another request, only the names the page's own read was seen to carry.
  assert.deepEqual(calls[2].headers.map(([name]) => name).sort(), [
    "authorization",
    "oai-device-id",
    "oai-language",
  ]);
  assert.deepEqual(
    calls[2].headers.find(([name]) => name === "authorization"),
    ["authorization", SECRET],
  );
});

test("a read that is refused says so and reads nothing more", async () => {
  const { window, ask, calls } = page({
    served: [
      { status: 200, body: {} },
      { status: 429, body: {} },
    ],
  });
  await window.fetch(`/backend-api/conversations/${CONVERSATION}`, {
    headers: pageHeaders,
  });
  const answer = await ask();
  assert.equal(answer.outcome, "http");
  assert.equal(answer.status, 429);
  assert.equal(calls.length, 2);
  // A read that could not be made at all.
  const down = page({ served: [{ status: 200, body: {} }, { throws: true }] });
  await down.window.fetch(`/backend-api/conversations/${CONVERSATION}`, {
    headers: pageHeaders,
  });
  assert.equal((await down.ask()).outcome, "error");
});

test("a prompt further back than two turns is looked for once more, wider", async () => {
  const { window, ask, calls } = page({
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
        body: body([user("ask", "x"), final("final", "x", "answer")]),
      },
    ],
  });
  await window.fetch(`/backend-api/conversations/${CONVERSATION}`, {
    headers: pageHeaders,
  });
  const answer = await ask();
  assert.match(calls[2].url, /num_turns=10&/);
  assert.equal(answer.tries, 2);
  assert.equal(answer.turns, 10);
  assert.equal(answer.askFound, true);
});

test("an ask from elsewhere, or naming something that is no conversation, is not answered", async () => {
  const { window, answers, calls, listeners } = page({
    served: [{ status: 200, body: {} }],
  });
  await window.fetch(`/backend-api/conversations/${CONVERSATION}`, {
    headers: pageHeaders,
  });
  for (const fn of listeners) {
    fn({
      source: {},
      data: { postpane: "data-read", id: "a", conversation: CONVERSATION },
    });
    fn({
      source: window,
      data: { postpane: "data-read", id: "b", conversation: "../../me" },
    });
    fn({
      source: window,
      data: { postpane: "other", id: "c", conversation: CONVERSATION },
    });
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(answers.length, 0);
  assert.equal(calls.length, 1);
});

test("put into a page a second time, the file steps aside", () => {
  const { window, listeners, context } = page();
  const fetched = window.fetch;
  vm.runInNewContext(source, context);
  assert.equal(window.fetch, fetched);
  assert.equal(listeners.length, 1);
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
