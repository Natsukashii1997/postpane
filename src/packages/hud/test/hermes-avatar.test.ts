import { test } from "node:test";
import assert from "node:assert/strict";
import { BotMotion, type MotionSpec } from "../src/bots/bot-motion.ts";
import {
  botState,
  type BotLook,
  type BotState,
} from "../src/bots/bot-state.ts";

const hermes: MotionSpec = { radius: 0.35, crossesEyes: true, avatar: {} };

function run(
  state: Partial<BotState>,
  seconds: number,
  stays = true,
  from = 10,
) {
  const motion = new BotMotion(1);
  motion.staysBot = stays;
  motion.fit(hermes);
  motion.set(botState(state), from);
  for (let t = from; t <= from + seconds; t += 1 / 24) motion.step(t);
  return motion;
}
const look = (value: BotLook) => ({ look: value });

test("an avatar never shows the thinking dots sign; it holds a typing bubble instead", () => {
  const working = run(look("thinking"), 2);
  assert.equal(working.prop, "typing");
  assert.notEqual(working.sign, "ellipsis");
  assert.ok(working.face.open < 0.8, `open ${working.face.open}`);
  assert.equal(run(look("tool-edit"), 2).prop, "typing");
});

test("a dozing avatar closes its eyes and shows z", () => {
  const dozing = run(look("asleep"), 3);
  assert.ok(dozing.face.open < 0.05, `open ${dozing.face.open}`);
  assert.equal(dozing.sign, "z");
});

test("asking leans towards the card and shows the sign", () => {
  const asking = run({ look: "permission", facing: "left" }, 2);
  assert.ok(asking.pose.rotation < -2, `rotation ${asking.pose.rotation}`);
  assert.equal(asking.sign, "exclamation");
});

test("a new turn brings a letter; a finished reply sends its bubble away", () => {
  const motion = run(look("idle"), 1);
  motion.play("start", 11);
  let letter = false;
  for (let t = 11; t <= 11.6; t += 1 / 24) {
    motion.step(t);
    letter ||= motion.prop === "letter";
  }
  assert.ok(letter);
  const done = run(look("done"), 0.5);
  assert.equal(done.prop, "sent");
});

test("a failure keeps the avatar's eyes rather than crossing them", () => {
  const motion = run(look("idle"), 1);
  motion.play("failed", 11);
  for (let t = 11; t <= 11.4; t += 1 / 24) motion.step(t);
  assert.equal(motion.face.crossed, 0);
  assert.equal(motion.sign, "cross");
});

test("a limit fades the avatar", () => {
  const limited = run({ look: "idle", badge: "limited" }, 2);
  assert.ok(limited.opacity < 0.6, `opacity ${limited.opacity}`);
  assert.ok(run(look("idle"), 2).opacity > 0.99);
});

test("an avatar that rests as its artwork stays still", () => {
  const resting = run(look("idle"), 3, false);
  assert.equal(resting.morph, 0);
  assert.equal(resting.pose.rotation, 0);
  assert.equal(resting.pose.x, 0);
  assert.equal(resting.prop, null);
});
