import { test } from "node:test";
import assert from "node:assert/strict";
import { BotMotion, type MotionSpec } from "../src/bots/bot-motion.ts";
import {
  botState,
  type BotEvent,
  type BotState,
} from "../src/bots/bot-state.ts";
import { botSpecs, staysAsBot } from "../src/bots/bot-spec.ts";
import { cloudRadius, cloudShape } from "../src/bots/bot-cloud.ts";

const cloud: MotionSpec = { radius: 0.37, crossesEyes: true, cloud: true };
const flower: MotionSpec = {
  radius: 0.37,
  spin: 7,
  crossesEyes: true,
  petals: true,
};

function run(
  spec: MotionSpec,
  state: Partial<BotState>,
  seconds: number,
  from = 10,
  each?: (motion: BotMotion, t: number) => void,
) {
  const motion = new BotMotion(1);
  motion.staysBot = true;
  motion.fit(spec);
  motion.set(botState(state), from);
  for (let t = from; t <= from + seconds; t += 1 / 24) {
    motion.step(t);
    each?.(motion, t);
  }
  return motion;
}
function event(kind: BotEvent, seconds: number, state = botState()) {
  const motion = run(cloud, state, 1);
  motion.play(kind, 11);
  const frames: { gray: number; drops: unknown[]; bolt: number }[] = [];
  for (let t = 11; t <= 11 + seconds; t += 1 / 24) {
    motion.step(t);
    frames.push({ gray: motion.gray, drops: motion.drops, bolt: motion.bolt });
  }
  return { motion, frames };
}

test("Codex is the cloud, keeps its look, and never turns", () => {
  const specs = botSpecs(true);
  assert.equal(specs.codex.cloud, true);
  assert.equal(specs.codex.spin, undefined);
  assert.equal(specs.codex.petals, undefined);
  assert.deepEqual(specs.codex.shape, {
    kind: "outline",
    keep: 1,
    smooth: 3,
  });
  assert.equal(specs.openai.cloud, undefined);
  assert.equal(staysAsBot("codex"), true);
  for (const look of [
    "idle",
    "thinking",
    "tool-edit",
    "tool-command",
    "tool-read",
    "permission",
    "done",
  ] as const)
    assert.equal(run(cloud, { look }, 3).turn, 0, look);
});

test("an idle cloud wanders across and reshapes as it goes", () => {
  const xs: number[] = [],
    phases = new Set<number>();
  run(cloud, { look: "idle" }, 12, 10, (motion) => {
    xs.push(motion.pose.x);
    if (motion.shape) phases.add(Math.round(motion.shape.morphPhase));
  });
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.15, "wanders");
  const idle = run(cloud, { look: "idle" }, 2);
  assert.ok(idle.shape!.morph > 0.05, `morph ${idle.shape!.morph}`);
  assert.ok(phases.size > 100, "reshaping");
  assert.notEqual(idle.wait, null);
});

test("a dozing cloud breathes full size with a snot bubble and no Z", () => {
  const sizes: number[] = [],
    radii: number[] = [];
  let popped = 0;
  const motion = run(cloud, { look: "asleep" }, 10, 10, (m) => {
    sizes.push(m.pose.scaleX, m.pose.scaleY);
    if (m.snot && m.snot.pop === 0) radii.push(m.snot.r);
    if (m.snot && m.snot.pop > 0) popped++;
  });
  assert.ok(Math.min(...sizes.slice(48)) >= 1, `scale ${Math.min(...sizes)}`);
  assert.ok(motion.opacity > 0.99, `opacity ${motion.opacity}`);
  assert.equal(motion.puffs.length, 0);
  assert.equal(motion.sign, null);
  assert.ok(motion.face.open < 0.05);
  assert.equal(motion.lids, "curve");
  assert.ok(Math.max(...radii) > 0.12, `largest ${Math.max(...radii)}`);
  assert.ok(Math.min(...radii) < 0.04, `smallest ${Math.min(...radii)}`);
  assert.ok(popped > 0, "the bubble pops every third breath");
});

test("a hovered sleeper wakes: no bubble, open eyes", () => {
  const motion = run(cloud, { look: "asleep", hovered: true }, 3);
  assert.equal(motion.snot, null);
  assert.equal(motion.lids, null);
});

test("a thinking cloud wears a thought bubble instead of rising puffs", () => {
  const motion = run(cloud, { look: "thinking" }, 3);
  assert.equal(motion.sign, "ellipsis");
  assert.equal(motion.puffs.length, 0);
});

test("no news is a haze over a solid cloud, not a fade", () => {
  let bands = 0;
  const motion = run(cloud, { look: "no-news" }, 8, 10, (m) => {
    bands = Math.max(bands, m.mist.length);
  });
  assert.ok(motion.opacity > 0.99, `opacity ${motion.opacity}`);
  assert.ok(motion.haze > 0.2, `haze ${motion.haze}`);
  assert.equal(bands, 2);
  assert.ok(motion.face.open < 0.6, `open ${motion.face.open}`);
  assert.ok(motion.shape!.billow <= 0.03);
});

test("a long command grows a ring of sixteen light puffs", () => {
  const motion = run(cloud, { look: "tool-long-command" }, 5.8);
  assert.equal(motion.puffs.length, 16);
  assert.ok(motion.puffs.every((puff) => puff.light));
});

test("editing stamps once every 0.75 s: four stamps a burst", () => {
  let stamps = 0,
    down = false;
  run(cloud, { look: "tool-edit" }, 2.95, 10, (m) => {
    const pressed = m.pose.scaleY < 0.95;
    if (pressed && !down) stamps++;
    down = pressed;
  });
  assert.equal(stamps, 4);
});

test("thinking heaps the top up instead of tilting", () => {
  const motion = run(cloud, { look: "thinking" }, 2);
  assert.ok(motion.shape!.tower > 0.15, `tower ${motion.shape!.tower}`);
  assert.equal(motion.pose.rotation, 0);
  assert.equal(motion.sign, "ellipsis");
});

test("a running command rains in bursts and stops in the rests", () => {
  const raining = run(cloud, { look: "tool-command" }, 1.5);
  assert.ok(raining.drops.length >= 5, `drops ${raining.drops.length}`);
  const resting = run(cloud, { look: "tool-command" }, 4.2);
  assert.equal(resting.drops.length, 0);
  assert.equal(raining.gray, 0);
});

test("asking turns the cloud into a speech bubble with a tail", () => {
  for (const look of ["permission", "question", "plan"] as const) {
    const motion = run(cloud, { look }, 2);
    assert.ok(motion.shape!.tail > 0.3, `${look} tail ${motion.shape!.tail}`);
  }
  const angles = new Set<number>();
  run(cloud, { look: "question" }, 3, 10, (motion) =>
    angles.add(Math.round(motion.shape?.tailAngle ?? 0)),
  );
  assert.ok(Math.max(...angles) - Math.min(...angles) > 60, "tail swings");
  const plan = run(cloud, { look: "plan" }, 2);
  assert.ok(plan.pose.scaleX > plan.pose.scaleY * 1.2, "plan spreads flat");
  assert.equal(run(cloud, { look: "idle" }, 2).shape!.tail, 0);
});

test("the tail sticks out of the outline where it points", () => {
  const shape = { ...cloudShape(), tail: 0.5, tailAngle: 90 };
  assert.ok(cloudRadius(shape, Math.PI / 2) > 1.45);
  assert.ok(Math.abs(cloudRadius(shape, -Math.PI / 2) - 1) < 0.01);
});

test("a failure is a grey storm with rain and lightning that clears", () => {
  const { motion, frames } = event("failed", 1.2);
  assert.ok(Math.max(...frames.map((f) => f.gray)) > 0.9);
  assert.ok(frames.some((f) => f.drops.length > 0));
  assert.ok(frames.some((f) => f.bolt > 0));
  assert.equal(motion.face.crossed > 0.5, true);
  for (let t = 12.2; t <= 15; t += 1 / 24) motion.step(t);
  assert.ok(motion.gray < 0.05, `gray ${motion.gray}`);
  assert.equal(motion.drops.length, 0);
});

test("out of quota the cloud stays grey; a reset clears it", () => {
  const { motion } = event(
    "limit-hit",
    3,
    botState({ look: "idle", badge: "limited" }),
  );
  assert.ok(motion.gray > 0.8, `gray ${motion.gray}`);
  motion.set(botState({ look: "done", card: "reset" }), 14.1);
  for (let t = 14.1; t <= 15.5; t += 1 / 24) motion.step(t);
  assert.ok(motion.gray < 0.05, `gray ${motion.gray}`);
});

test("ChatGPT's flower keeps its petals and none of the weather", () => {
  for (const look of [
    "idle",
    "asleep",
    "tool-command",
    "permission",
  ] as const) {
    const motion = run(flower, { look }, 2);
    assert.equal(motion.shape, null);
    assert.equal(motion.puffs.length, 0);
    assert.equal(motion.drops.length, 0);
    assert.equal(motion.gray, 0);
    assert.equal(motion.snot, null);
    assert.equal(motion.mist.length, 0);
  }
});
