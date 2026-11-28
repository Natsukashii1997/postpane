import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff } from "@agent-hud/protocol";
import {
  LETTER_LANDS_MS,
  LINGERS_MS,
  REPLY_MOST_MS,
  REPLY_WAIT_MS,
  WRITING_FRESH_MS,
  STAMP_INK,
  relayStamps,
  stampInk,
  stampWait,
} from "../src/relay-stamps.ts";

const relay = (
  phase: Handoff["phase"],
  steps: Handoff["steps"] = [],
  status: Handoff["status"] = "open",
): Handoff => ({
  id: `h-${phase}`,
  title: "驿窗｜接力",
  claudeSession: "s1",
  status,
  createdAt: 1,
  updatedAt: 1,
  rounds: 0,
  phase,
  phaseAt: 50,
  steps,
});
/** A clock just after the relays above moved. */
const NOW = 100;

test("ChatGPT's stub is stamped 「审」 while it has the words, rippling while it answers", () => {
  const chatgpt = "chatgpt";
  assert.equal(relayStamps({ handoffs: [] }, chatgpt, NOW), undefined);
  for (const phase of [
    "sending",
    "replied",
    "returned",
    "ended",
    "failed",
  ] as const)
    assert.equal(
      relayStamps({ handoffs: [relay(phase)] }, chatgpt, NOW),
      undefined,
      phase,
    );
  const delivered = relayStamps(
    {
      handoffs: [
        relay("delivered", [
          { at: 10, kind: "work" },
          { at: 20, kind: "ask" },
        ]),
      ],
    },
    chatgpt,
    NOW,
  );
  assert.deepEqual(delivered, {
    review: true,
    answering: false,
    stopped: false,
    replied: false,
    since: 20,
    overdue: false,
    lingering: false,
    conversation: undefined,
    until: 50 + REPLY_WAIT_MS + 1,
  });
  assert.equal(
    relayStamps({ handoffs: [relay("working")] }, chatgpt, NOW)?.answering,
    true,
  );
  // A relay no longer open prints nothing.
  assert.equal(
    relayStamps({ handoffs: [relay("working", [], "closed")] }, chatgpt, NOW),
    undefined,
  );
  // Claude's stub takes no 「审」.
  assert.equal(
    relayStamps({ handoffs: [relay("working")] }, "claude", NOW),
    undefined,
  );
});

test("Claude's stub takes the 「回」 seal while an answer waits for the person", () => {
  const replied = relayStamps(
    {
      handoffs: [
        relay("replied", [
          { at: 20, kind: "ask" },
          { at: 30, kind: "reply" },
        ]),
      ],
    },
    "claude",
    NOW,
  );
  assert.deepEqual(replied, {
    review: false,
    answering: false,
    stopped: false,
    replied: true,
    since: 30,
    overdue: false,
    lingering: false,
    until: null,
  });
  // Sent back to Claude, or ended: the seal comes off.
  for (const phase of ["returned", "ended"] as const)
    assert.equal(
      relayStamps({ handoffs: [relay(phase)] }, "claude", NOW),
      undefined,
      phase,
    );
  assert.equal(
    relayStamps({ handoffs: [relay("replied")] }, "chatgpt", NOW),
    undefined,
  );
});

test("an answer sent back while the round trip is stopped keeps Claude's 「回」 (#410 S1)", () => {
  const steps: Handoff["steps"] = [
    { at: 20, kind: "ask" },
    { at: 30, kind: "reply" },
    { at: 31, kind: "back", auto: true },
  ];
  const held = (halt: string | null, auto = false): Handoff => ({
    ...relay("returned", steps),
    auto,
    halt,
  });
  for (const halt of [
    "ChatGPT 30 分钟没回信，自动往返停下，交还常浩",
    "常浩暂停",
  ]) {
    const stamps = relayStamps({ handoffs: [held(halt)] }, "claude", NOW);
    assert.equal(stamps?.replied, true, halt);
    // The same seal at the same moment as one held on the sidebar.
    assert.deepEqual(
      stamps,
      relayStamps(
        { handoffs: [{ ...relay("replied", steps.slice(0, 2)) }] },
        "claude",
        NOW,
      ),
    );
  }
  // Going on by itself, or never stopped: back with Claude to work on, no seal.
  assert.equal(
    relayStamps({ handoffs: [held(null, true)] }, "claude", NOW),
    undefined,
  );
  assert.equal(
    relayStamps({ handoffs: [held(null)] }, "claude", NOW),
    undefined,
  );
  // Nor on ChatGPT's stub, nor once ended.
  assert.equal(
    relayStamps({ handoffs: [held("常浩暂停")] }, "chatgpt", NOW),
    undefined,
  );
  assert.equal(
    relayStamps(
      { handoffs: [{ ...held("常浩暂停"), status: "closed" }] },
      "claude",
      NOW,
    ),
    undefined,
  );
});

test("a stamp that shows while its letter is in the air waits for it to land", () => {
  assert.equal(stampWait(1000, 1000), LETTER_LANDS_MS);
  assert.equal(stampWait(1000, 1000 + LETTER_LANDS_MS - 400), 400);
  // Landed already, or moved before the mark could see it: at once.
  assert.equal(stampWait(1000, 1000 + LETTER_LANDS_MS + 1), 0);
  assert.equal(stampWait(null, 1000), 0);
  // A clock ahead of the host never waits longer than a flight.
  assert.equal(stampWait(5000, 1000), 0);
  assert.ok(
    LETTER_LANDS_MS > 2600 && LETTER_LANDS_MS < 3100,
    `${LETTER_LANDS_MS}`,
  );
});

test("a relay stopped or handed back takes no 「审」; one unanswered past the wait takes 「未审」", () => {
  // Owner, 2026-11-07: 「审」 only while ChatGPT really has the words.
  const halted = { ...relay("delivered"), halt: "驿窗重启，自动往返先暂停" };
  assert.equal(relayStamps({ handoffs: [halted] }, "chatgpt", NOW), undefined);
  // Past the wait, stopped or not, it is 「未审」 and the mark goes there.
  const late = {
    ...relay("delivered", [{ at: 50, kind: "ask" }]),
    chatgptConversation: "c-late",
  };
  const after = 50 + REPLY_WAIT_MS + 1;
  for (const handoff of [late, { ...late, halt: "ChatGPT 30 分钟没回信" }]) {
    const stamps = relayStamps({ handoffs: [handoff] }, "chatgpt", after);
    assert.equal(stamps?.overdue, true);
    assert.equal(stamps?.conversation, "c-late");
    assert.equal(stamps?.answering, false);
  }
  // Up to the wait it is still 「审」, and says when it turns.
  const fresh = relayStamps(
    { handoffs: [late] },
    "chatgpt",
    50 + REPLY_WAIT_MS,
  );
  assert.equal(fresh?.overdue, false);
  assert.equal(fresh?.until, 50 + REPLY_WAIT_MS + 1);
  // One overdue beside one under review: 「未审」 wins, it needs the person.
  const both = relayStamps(
    {
      handoffs: [
        late,
        { ...relay("working"), id: "h-new", phaseAt: after - 10 },
      ],
    },
    "chatgpt",
    after,
  );
  assert.equal(both?.overdue, true);
  assert.equal(both?.answering, false);
});

test("past the half hour, a review ChatGPT was lately found writing stays 「审」 (#544)", () => {
  // Owner 2026-11-27: writing is waited on; five minutes quiet, or two hours
  // in all, and it is 「未审」 as the host stops it.
  const writing = (streamed: number, epoch = 50): Handoff => ({
    ...relay("working", [{ at: 50, kind: "ask" }]),
    rereading: { epoch, streamed },
  });
  const at = 50 + 40 * 60 * 1000;
  const lately = relayStamps(
    { handoffs: [writing(at - 60_000)] },
    "chatgpt",
    at,
  );
  assert.equal(lately?.overdue, false);
  assert.equal(lately?.answering, true);
  assert.equal(lately?.until, at - 60_000 + WRITING_FRESH_MS + 1);
  const quiet = writing(at - WRITING_FRESH_MS - 1);
  assert.equal(
    relayStamps({ handoffs: [quiet] }, "chatgpt", at)?.overdue,
    true,
  );
  // Found writing in an earlier phase: not this wait's.
  const before = writing(at - 60_000, 49);
  assert.equal(
    relayStamps({ handoffs: [before] }, "chatgpt", at)?.overdue,
    true,
  );
  // Writing still at two hours: 「未审」 all the same.
  const long = 50 + REPLY_MOST_MS + 1;
  const still = relayStamps(
    { handoffs: [writing(long - 1000)] },
    "chatgpt",
    long,
  );
  assert.equal(still?.overdue, true);
});

test("「未审」 gives way while the stub has more to say, and ripples once it lingers", () => {
  // Owner, #213: answering or a reply to read comes first; 「未审」 waits.
  const late = {
    ...relay("delivered", [{ at: 50, kind: "ask" }]),
    chatgptConversation: "c-late",
    halt: "ChatGPT 30 分钟没回信",
  };
  const after = 50 + REPLY_WAIT_MS + 1;
  assert.equal(
    relayStamps({ handoffs: [late] }, "chatgpt", after, true),
    undefined,
  );
  // A review ChatGPT still has keeps its own 「审」 meanwhile.
  const working = { ...relay("working"), id: "h-new", phaseAt: after - 10 };
  const yielded = relayStamps(
    { handoffs: [late, working] },
    "chatgpt",
    after,
    true,
  );
  assert.equal(yielded?.overdue, false);
  assert.equal(yielded?.answering, true);
  // Overdue but young: plain 「未审」, which says when it starts to ripple.
  const young = relayStamps({ handoffs: [late] }, "chatgpt", after);
  assert.equal(young?.overdue, true);
  assert.equal(young?.lingering, false);
  assert.equal(young?.until, 50 + LINGERS_MS + 1);
  // Past two hours (as the panel stops listing it), it ripples until it ends.
  assert.equal(LINGERS_MS, 2 * 60 * 60 * 1000);
  const old = relayStamps(
    { handoffs: [late] },
    "chatgpt",
    50 + 18 * 60 * 60 * 1000,
  );
  assert.equal(old?.overdue, true);
  assert.equal(old?.lingering, true);
  assert.equal(old?.answering, false);
  assert.equal(old?.until, null);
  assert.equal(
    relayStamps(
      { handoffs: [{ ...late, status: "closed" }] },
      "chatgpt",
      50 + 18 * 60 * 60 * 1000,
    ),
    undefined,
  );
});

test("an answer back for Codex stamps Codex's stub, not Claude's (#282)", () => {
  const codexs = {
    ...relay("replied", [{ at: 60, kind: "reply" }]),
    doer: "codex" as const,
  };
  assert.equal(relayStamps({ handoffs: [codexs] }, "claude", NOW), undefined);
  assert.equal(
    relayStamps({ handoffs: [codexs] }, "codex", NOW)?.replied,
    true,
  );
  const claudes = relay("replied", [{ at: 60, kind: "reply" }]);
  assert.equal(relayStamps({ handoffs: [claudes] }, "codex", NOW), undefined);
  assert.equal(
    relayStamps({ handoffs: [claudes] }, "claude", NOW)?.replied,
    true,
  );
});

test("「回」 is inked apart from 「审」, and 「未审」 stays wax red", () => {
  assert.equal(stampInk({ overdue: false, reply: false }), STAMP_INK.review);
  assert.equal(stampInk({ overdue: false, reply: true }), "#99591a");
  assert.notEqual(STAMP_INK.reply, STAMP_INK.review);
  assert.equal(stampInk({ overdue: true, reply: false }), STAMP_INK.overdue);
});

test("a relay stopped at its cap stamps ChatGPT's stub 「停」 in wax red until it is settled (#409, owner 甲)", () => {
  const stopped: Handoff = {
    ...relay("returned"),
    id: "h-stop",
    notice: "top",
    topAt: 60,
    auto: false,
    halt: "已审满 5 轮仍需修改",
  };
  const stamps = relayStamps({ handoffs: [stopped] }, "chatgpt", NOW);
  assert.equal(stamps?.stopped, true);
  assert.equal(stamps?.review, true, "the stub prints a stamp");
  assert.equal(stamps?.answering, false, "it does not ripple");
  assert.equal(stamps?.since, 60);
  assert.equal(stamps?.until, null);
  assert.equal(
    stampInk({ overdue: false, reply: false, stopped: true }),
    STAMP_INK.overdue,
  );
  // Still there long after, while another relay is with ChatGPT, and even
  // when the desk has something more pressing to say.
  const working = { ...relay("working"), id: "h-work" };
  assert.equal(
    relayStamps(
      { handoffs: [stopped, working] },
      "chatgpt",
      NOW + 10 * REPLY_WAIT_MS,
      true,
    )?.stopped,
    true,
  );
  // Settled: ended, or reviewed on (a new leave clears the notice).
  assert.equal(
    relayStamps(
      { handoffs: [{ ...stopped, status: "closed", phase: "ended" }] },
      "chatgpt",
      NOW,
    ),
    undefined,
  );
  assert.equal(
    relayStamps(
      { handoffs: [{ ...stopped, notice: undefined }] },
      "chatgpt",
      NOW,
    ),
    undefined,
  );
  // Only ChatGPT's stub: Claude's stays as it was.
  assert.equal(relayStamps({ handoffs: [stopped] }, "claude", NOW), undefined);
  // Others' stamps say they are not stopped.
  assert.equal(
    relayStamps({ handoffs: [working] }, "chatgpt", NOW)?.stopped,
    false,
  );
});

test("an idle-ended relay still at its cap keeps 「停」 until a review begins there since (#411 L2 P2-02)", () => {
  const idled: Handoff = {
    ...relay(
      "ended",
      [
        { at: 50, kind: "stop", auto: true },
        { at: 90, kind: "end", auto: true },
      ],
      "closed",
    ),
    id: "h-idle",
    notice: "top",
    topAt: 50,
    auto: false,
  };
  assert.equal(
    relayStamps({ handoffs: [idled] }, "chatgpt", NOW)?.stopped,
    true,
  );
  // Ended by the person: settled.
  const byHand = {
    ...idled,
    steps: [
      { at: 50, kind: "stop" as const },
      { at: 90, kind: "end" as const },
    ],
  };
  assert.equal(relayStamps({ handoffs: [byHand] }, "chatgpt", NOW), undefined);
  // A review begun since in the same session settles it, as the gate does.
  const since = { ...relay("working"), id: "h-new", createdAt: 95 };
  assert.equal(
    relayStamps({ handoffs: [idled, since] }, "chatgpt", NOW)?.stopped,
    false,
  );
  // One begun elsewhere does not.
  const elsewhere = { ...since, claudeSession: "s2", cwd: "/other" };
  assert.equal(
    relayStamps({ handoffs: [idled, elsewhere] }, "chatgpt", NOW)?.stopped,
    true,
  );
});

test("only a review of its kind begun since settles a stop: 思维评审 and engineering count apart, as the gate does (#411 L2 P2-02)", () => {
  const engineering: Handoff = {
    ...relay("returned"),
    id: "h-eng",
    cwd: "/w",
    notice: "top",
    topAt: 60,
    auto: false,
  };
  const review: Handoff = {
    ...engineering,
    id: "h-think",
    title: "思维评审｜驿窗｜方向",
  };
  const later = (title: string, id: string): Handoff => ({
    ...relay("working"),
    id,
    title,
    claudeSession: "s2",
    cwd: "/w",
    createdAt: 95,
  });
  const cases: [Handoff, Handoff, boolean][] = [
    // A 思维评审 begun since settles no engineering stop, nor the reverse.
    [engineering, later("思维评审｜驿窗｜方向", "h-t2"), true],
    [review, later("驿窗｜接力", "h-e2"), true],
    // One of its kind does, ASCII bar and leading space too.
    [engineering, later("驿窗｜接力第 2 单", "h-e3"), false],
    [review, later(" 思维评审|驿窗｜再想", "h-t3"), false],
  ];
  for (const [top, next, stopped] of cases)
    assert.equal(
      relayStamps({ handoffs: [top, next] }, "chatgpt", NOW)?.stopped,
      stopped,
      `${top.title} then ${next.title}`,
    );
});
