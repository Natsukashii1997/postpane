import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BotMotion,
  petalRatchet,
  type MotionSpec,
} from "../src/bots/bot-motion.ts";
import { botState, type BotLook } from "../src/bots/bot-state.ts";
import { staysAsBot } from "../src/bots/bot-spec.ts";

const codex = {
  radius: 0.37,
  spin: 7,
  crossesEyes: true,
  petals: true,
};
const plain = { radius: 0.37, spin: 7, crossesEyes: true };

function run(spec: MotionSpec, look: BotLook, seconds: number, from = 10) {
  const motion = new BotMotion(1);
  motion.staysBot = true;
  motion.fit(spec);
  motion.set(botState({ look }), from);
  for (let t = from; t <= from + seconds; t += 1 / 24) motion.step(t);
  return motion;
}

test("editing clicks round 30° a tick, ten ticks a burst, then rests", () => {
  assert.equal(petalRatchet(0), 0);
  assert.equal(petalRatchet(0.1), 30);
  assert.equal(petalRatchet(0.29), 30);
  assert.equal(petalRatchet(3.2), 300);
  assert.equal(petalRatchet(4.4), 300);
  assert.equal(petalRatchet(4.6), 330);
});

test("only Codex and Hermes stay awake in the side strip", () => {
  assert.equal(staysAsBot("openai"), true);
  assert.equal(staysAsBot("hermes"), true);
  assert.equal(staysAsBot("claude"), false);
});

test("a dozing flower half-closes its petals; a bot without petals keeps its shape", () => {
  const closed = run(codex, "asleep", 3);
  assert.ok(closed.petal > 0.6 && closed.petal < 0.8, `petal ${closed.petal}`);
  assert.equal(closed.sign, "z");
  assert.equal(closed.signUpright, true);
  assert.equal(closed.lids, "bar");
  const other = run(plain, "asleep", 3);
  assert.equal(other.petal, 1);
  assert.equal(other.ring, null);
});

test("a long command draws a progress ring; other work does not", () => {
  const long = run(codex, "tool-long-command", 2);
  assert.ok(long.ring !== null && long.ring > 0.2 && long.ring < 0.5);
  assert.equal(run(codex, "tool-read", 2).ring, null);
});

test("reading turns the petals backwards, editing turns them forwards", () => {
  const read = run(codex, "tool-read", 2),
    edit = run(codex, "tool-edit", 2);
  assert.ok(read.turn < 0, `read turn ${read.turn}`);
  assert.ok(edit.turn > 100, `edit turn ${edit.turn}`);
});

test("a failed call jams the petals and darkens the body", () => {
  const motion = run(codex, "idle", 1);
  motion.play("failed", 11);
  for (let t = 11; t <= 11.5; t += 1 / 24) motion.step(t);
  assert.ok(motion.dim > 0.5, `dim ${motion.dim}`);
  assert.ok(motion.petal < 1);
  for (let t = 11.5; t <= 14; t += 1 / 24) motion.step(t);
  assert.ok(motion.dim < 0.05, `dim ${motion.dim}`);
});

test("an idle Codex stays a bot and keeps moving", () => {
  const motion = run(codex, "idle", 2);
  assert.equal(motion.morph, 1);
  assert.notEqual(motion.wait, null);
});

test("a dozing flower droops its head and sways, full size and full colour", () => {
  const motion = new BotMotion(1);
  motion.staysBot = true;
  motion.fit(codex);
  motion.set(botState({ look: "asleep" }), 10);
  const tilts: number[] = [],
    sizes: number[] = [];
  for (let t = 10; t <= 17; t += 1 / 24) {
    motion.step(t);
    if (t >= 11) {
      tilts.push(motion.pose.rotation);
      sizes.push(motion.pose.scaleX, motion.pose.scaleY);
    }
  }
  assert.ok(Math.min(...tilts) > 3, `least tilt ${Math.min(...tilts)}`);
  assert.ok(Math.max(...tilts) < 15, `most tilt ${Math.max(...tilts)}`);
  assert.ok(Math.max(...tilts) - Math.min(...tilts) > 6, "it sways");
  assert.ok(Math.min(...sizes) >= 1, `smallest ${Math.min(...sizes)}`);
  assert.ok(motion.dim < 0.1, `dim ${motion.dim}`);
  assert.notEqual(motion.wait, null);
});
