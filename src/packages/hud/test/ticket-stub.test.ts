import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stubBotTop,
  stubFoot,
  stubFootHeight,
  stubHoleStart,
  stubMarks,
  stubSize,
} from "../src/ticket-stub.ts";

test("a stub is 34 × 44 at the default 20 pt bot and grows with it", () => {
  assert.deepEqual(stubSize(20), { width: 34, height: 44 });
  assert.deepEqual(stubSize(30), { width: 51, height: 66 });
  // Along a top or bottom edge, 3 units taller for the holes across its end.
  assert.deepEqual(stubSize(20, true), { width: 34, height: 47 });
});

test("the holes down a stub's side sit centred, none cut at a corner", () => {
  for (let logo = 20; logo <= 60; logo++) {
    const unit = logo / 20,
      pitch = 10 * unit,
      radius = 2.5 * unit,
      { height } = stubSize(logo),
      start = stubHoleStart(logo);
    const last = start + Math.floor((height - start) / pitch) * pitch;
    // The holes before the first and after the last fall off the paper.
    assert.ok(start - pitch + radius <= 0, `${logo}: one cut at the top`);
    assert.ok(last + pitch - radius >= height, `${logo}: one cut at the foot`);
    assert.ok(start - radius >= 0 && last + radius <= height, `${logo}`);
    assert.ok(Math.abs(start - (height - last)) < 0.001, `${logo}: centred`);
  }
});

test("the bot and the tear-off foot fit the stub, with room between", () => {
  for (const logo of [20, 30, 60]) {
    const unit = logo / 20,
      room = (holes: number, horizontal: boolean) =>
        stubSize(logo, horizontal).height -
        stubFootHeight(logo) -
        holes -
        (stubBotTop(logo) + logo);
    // Down a side; along a top or bottom edge the holes take 3 units.
    assert.ok(room(0, false) >= 2.5 * unit, `${logo} down a side`);
    assert.ok(room(3 * unit, true) >= 2.5 * unit, `${logo} along an edge`);
  }
});

test("a waiting agent is sealed", () => {
  const idle = { waiting: 0, used: 30 };
  assert.deepEqual(stubMarks(idle), {
    sealed: false,
    answer: false,
    handoff: false,
    warn: false,
  });
  const asking = stubMarks({ ...idle, waiting: 1 });
  assert.equal(asking.sealed, true);
});

test("the reading turns red from 80% of the tightest quota", () => {
  const vendor = { waiting: 0 };
  assert.equal(stubMarks({ ...vendor, used: 79.9 }).warn, false);
  assert.equal(stubMarks({ ...vendor, used: 80 }).warn, true);
  assert.equal(stubMarks({ ...vendor, used: null }).warn, false);
});

test("the seal reads 答 only while every waiting request is a question", () => {
  const idle = { used: 30 };
  assert.equal(stubMarks({ ...idle, waiting: 2, questions: 2 }).answer, true);
  assert.equal(stubMarks({ ...idle, waiting: 2, questions: 1 }).answer, false);
  assert.equal(stubMarks({ ...idle, waiting: 1 }).answer, false);
  assert.equal(stubMarks({ ...idle, waiting: 0, questions: 0 }).answer, false);
});

test("the seal reads 换 only while every waiting request is a handoff card (#245)", () => {
  const idle = { used: 30 };
  // A handoff card is a question underneath; the seal still reads 换, not 答.
  const switching = stubMarks({
    ...idle,
    waiting: 1,
    questions: 1,
    handoffs: 1,
  });
  assert.equal(switching.handoff, true);
  assert.equal(switching.answer, false);
  // Beside a real question it is 答, beside a permission 批.
  const asking = stubMarks({ ...idle, waiting: 2, questions: 2, handoffs: 1 });
  assert.equal(asking.handoff, false);
  assert.equal(asking.answer, true);
  const approving = stubMarks({
    ...idle,
    waiting: 2,
    questions: 1,
    handoffs: 1,
  });
  assert.equal(approving.handoff, false);
  assert.equal(approving.answer, false);
  assert.equal(stubMarks({ ...idle, waiting: 0, handoffs: 0 }).handoff, false);
});

test("the relay's two ends print one stamp on one paper (#218)", () => {
  const none = {
    sealed: false,
    deskReview: false,
    review: false,
    replied: false,
  };
  assert.deepEqual(stubFoot(none), { relayPaper: false, shows: "reading" });
  // ChatGPT holding the words: 「审」 on the relay's paper.
  assert.deepEqual(stubFoot({ ...none, deskReview: true, review: true }), {
    relayPaper: true,
    shows: "stamp",
  });
  // An answer back with Claude: 「回」, the same stamp, on the same paper.
  assert.deepEqual(stubFoot({ ...none, replied: true }), {
    relayPaper: true,
    shows: "stamp",
  });
});

test("Claude asking first: its 「答」 takes the foot, the reply's paper stays (#218)", () => {
  assert.deepEqual(
    stubFoot({ sealed: true, deskReview: false, review: false, replied: true }),
    { relayPaper: true, shows: "seal" },
  );
  // ChatGPT's own seal still drops the review paper, as before (#145).
  assert.deepEqual(
    stubFoot({ sealed: true, deskReview: true, review: true, replied: false }),
    { relayPaper: false, shows: "seal" },
  );
});
