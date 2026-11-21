// 影子读取对账脚本（#488）：按 shadow.jsonl 的各行算出两路差多少、够不够切换门槛。
import assert from "node:assert/strict";
import { test } from "node:test";
import { BAR, lines, summarize } from "../scripts/relay-shadow-report.mjs";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 20, 2);
const reply = (n, more = {}) => ({
  conversation: "c1",
  why: "complete",
  heardAt: START + n * (DAY / 8),
  pageMessageId: `m${n}`,
  outcome: "read",
  asked: `p${n}`,
  askFound: true,
  prompt: `p${n}`,
  final: { id: `m${n}`, status: "finished_successfully" },
  written: true,
  trusted: true,
  hidden: n % 3 === 0,
  login: "same",
  ...more,
});
// 驿窗重读时那一次可信的读取，读的是 `prompt` 这条，认到回信 `final`。
const reread = (n, prompt, final, more = {}) => ({
  conversation: "c1",
  why: "reread",
  heardAt: START + n * (DAY / 8),
  asked: prompt,
  askFound: true,
  prompt,
  outcome: "read",
  final: { id: final },
  written: true,
  trusted: true,
  ...more,
});

test("对账：两路编号一致、够数、跨天、有隐藏时读到的，才算达到门槛", () => {
  const records = Array.from({ length: 24 }, (_, n) => reply(n));
  const handoffs = [
    {
      chatgptConversation: "c1",
      steps: [
        ...Array.from({ length: 24 }, (_, n) => ({
          kind: "ask",
          askedId: `p${n}`,
        })),
        { kind: "reply" },
      ],
    },
  ];
  const result = summarize(records, handoffs);
  assert.equal(result.compared, 24);
  assert.equal(result.sameId, 24);
  assert.equal(result.promptInHandoffs, 24);
  assert.equal(result.hidden, 8);
  // 每 3 小时一封，北京时间 11-20 10:00 起：跨 20、21、22、23 四天。
  assert.equal(result.days, 4);
  assert.deepEqual(result.bar, {
    replies: true,
    days: true,
    hidden: true,
    sameId: true,
    noMiss: true,
    promptKnown: true,
    noLimit: true,
  });
  assert.equal(result.reached, true);
  // 认到的提问有一条不是驿窗记下的，就不算达到（#488 审查 P2-02）。
  const stray = summarize(
    [...records.slice(1), reply(0, { prompt: "the-persons-own" })],
    handoffs,
  );
  assert.equal(stray.bar.promptKnown, false);
  assert.equal(stray.reached, false);
  // 补证补上的那次，要找的提问也要是驿窗记下的。
  const patched = summarize(
    [
      ...records,
      reply(40, {
        outcome: "no-script",
        final: undefined,
        written: undefined,
        pagePromptId: "p40",
      }),
      reread(41, "p40", "m40"),
    ],
    handoffs,
  );
  assert.equal(patched.recovered, 1);
  assert.equal(patched.bar.promptKnown, false);
  // 不可信的读取不算数，再多也不够。
  assert.equal(
    summarize(
      records.map((record) => ({ ...record, trusted: false })),
      handoffs,
    ).bar.replies,
    false,
  );
  // 少一封就不够。
  assert.equal(summarize(records.slice(0, BAR.replies - 1)).reached, false);
});

test("对账：编号不一致、漏读、限流，各自单独算出来，都算没达到", () => {
  const records = [
    ...Array.from({ length: 24 }, (_, n) => reply(n)),
    reply(24, { final: { id: "other" } }),
    reply(25, { final: null, written: false }),
    reply(26, {
      outcome: "http",
      status: 429,
      final: undefined,
      written: undefined,
    }),
    // 页面里还没有 data.js：之后同一条提问没再读成，算漏读（#488 审查 P2-02）。
    reply(27, {
      outcome: "no-script",
      final: undefined,
      written: undefined,
      pagePromptId: "p27",
    }),
    // 之后驿窗重读时读成、写完了，就补上了，不算漏读。
    reply(28, {
      outcome: "no-script",
      final: undefined,
      written: undefined,
      pagePromptId: "p28",
    }),
    reread(29, "p28", "m28"),
    // 同一条要找的提问，实际找到的是另一条、回信也是另一封：没补上（P2-02）。
    reply(30, {
      outcome: "no-script",
      final: undefined,
      written: undefined,
      pagePromptId: "p30",
    }),
    reread(31, "p31", "m31", { asked: "p30" }),
    // 回信编号对不上的：也没补上。
    reply(32, {
      outcome: "no-script",
      final: undefined,
      written: undefined,
      pagePromptId: "p32",
    }),
    reread(33, "p32", "m99"),
    // 不可信的那次补证不算。
    reply(34, {
      outcome: "no-script",
      final: undefined,
      written: undefined,
      pagePromptId: "p34",
    }),
    reread(35, "p34", "m34", { trusted: false }),
    // 同一毫秒、但在文件里排在前面的那次读取，不算之后的补证（第 3 轮 P2-02）。
    reread(36, "p38", "m38", { heardAt: START + 38 * (DAY / 8) }),
    reply(38, {
      outcome: "no-script",
      final: undefined,
      written: undefined,
      pagePromptId: "p38",
    }),
    // 不可信页面读到的、句柄被占的：不进门槛，也不算漏读，单独数（P1-01）。
    reply(36, { trusted: false }),
    reply(37, { outcome: "conflict", final: undefined, written: undefined }),
  ];
  const result = summarize(records);
  assert.equal(result.differentId, 1);
  assert.deepEqual(
    result.missed.map((miss) => miss.pageMessageId),
    ["m25", "m26", "m27", "m30", "m32", "m34", "m38"],
  );
  assert.equal(result.recovered, 1);
  assert.equal(result.untrusted, 2);
  assert.equal(result.compared, 25);
  assert.equal(result.refused, 1);
  assert.equal(result.limited, 1);
  assert.deepEqual(
    [result.bar.sameId, result.bar.noMiss, result.bar.noLimit],
    [false, false, false],
  );
  assert.equal(result.reached, false);
});

test("对账：重读时数据一路本可救回的、生成中读到的状态，各自数出来", () => {
  const result = summarize([
    {
      conversation: "c1",
      why: "reread",
      pageOutcome: "undrawn",
      outcome: "read",
      written: true,
      trusted: true,
      final: { id: "m1" },
    },
    // 不可信页面读到的，不算救回。
    {
      conversation: "c1",
      why: "reread",
      pageOutcome: "undrawn",
      outcome: "read",
      written: true,
      trusted: false,
      final: { id: "m1" },
    },
    {
      conversation: "c1",
      why: "reread",
      pageOutcome: "told",
      outcome: "read",
      written: true,
      final: { id: "m1" },
    },
    {
      conversation: "c1",
      why: "reread",
      pageOutcome: "waiting",
      outcome: "read",
      written: false,
      final: null,
    },
    {
      conversation: "c1",
      why: "writing",
      outcome: "read",
      written: false,
      final: null,
      last: { status: "in_progress" },
    },
    {
      conversation: "c1",
      why: "writing",
      outcome: "read",
      written: false,
      final: { id: "m2", status: "in_progress" },
      last: { status: "in_progress" },
    },
    {
      conversation: "c1",
      why: "writing",
      outcome: "read",
      written: true,
      final: { id: "m3", status: "finished_successfully" },
      last: { status: "finished_successfully" },
    },
    { conversation: "c1", why: "writing", outcome: "no-login" },
  ]);
  assert.equal(result.rereads, 4);
  assert.equal(result.rescued, 1);
  assert.deepEqual(result.writing, {
    reads: 3,
    alreadyWritten: 1,
    finalStatus: { 还没有回信: 1, in_progress: 1, finished_successfully: 1 },
    lastStatus: { in_progress: 2, finished_successfully: 1 },
  });
  assert.equal(result.reached, false);
  assert.deepEqual(lines('{"a":1}\n\n{"a":2}\n'), [{ a: 1 }, { a: 2 }]);
});
