import { test } from "node:test";
import assert from "node:assert/strict";
import { BotMotion, type MotionSpec } from "../src/bots/bot-motion.ts";
import {
  botState,
  type BotEvent,
  type BotState,
} from "../src/bots/bot-state.ts";
import { botSpecs, staysAsBot } from "../src/bots/bot-spec.ts";
import { whaleSea, type WhaleCue } from "../src/bots/bot-whale.ts";

const finned = [
  { kind: "fins", fins: [{ hand: -1 }, { hand: 1 }, { hand: 0 }] },
] as const;
const whale: MotionSpec = {
  radius: 0.36,
  crossesEyes: true,
  whale: true,
  decor: finned,
};

function run(
  state: Partial<BotState>,
  seconds: number,
  each?: (motion: BotMotion, t: number) => void,
  spec = whale,
) {
  const motion = new BotMotion(1);
  motion.staysBot = true;
  motion.fit(spec);
  motion.set(botState(state), 10);
  for (let t = 10; t <= 10 + seconds; t += 1 / 24) {
    motion.step(t);
    each?.(motion, t);
  }
  return motion;
}
function after(kind: BotEvent, seconds: number, each: (m: BotMotion) => void) {
  const motion = run({ look: "idle" }, 1);
  motion.play(kind, 11);
  for (let t = 11; t <= 11 + seconds; t += 1 / 24) {
    motion.step(t);
    each(motion);
  }
}
const cue = (value: Partial<WhaleCue>): WhaleCue => ({
  look: "idle",
  age: 5,
  now: 20,
  beats: 1,
  holds: false,
  hovered: false,
  badge: null,
  card: "done",
  dozing: false,
  waiting: false,
  facing: false,
  event: null,
  greeting: null,
  greetSide: 1,
  ...value,
});

test("DeepSeek is the whale and stays a bot; no other bot is", () => {
  const specs = botSpecs(true);
  assert.equal(specs.deepseek.whale, true);
  assert.equal(staysAsBot("deepseek"), true);
  for (const key of ["claude", "codex", "openai", "hermes"])
    assert.equal(specs[key]?.whale, undefined, key);
  // Its look is unchanged: a plain round body with its three fins and pale belly.
  assert.deepEqual(specs.deepseek.shape, { kind: "circle" });
  assert.equal(specs.deepseek.paint, undefined);
  const fins = specs.deepseek.decor?.find((item) => item.kind === "fins");
  assert.ok(fins && fins.kind === "fins" && fins.fins.length === 3);
});

test("a bot without the whale switch gets no water", () => {
  const motion = run({ look: "done" }, 2, undefined, {
    radius: 0.36,
    decor: finned,
  });
  assert.equal(motion.water, null);
});

test("idle floats, paddles its fins in turn and now and then lets a bubble rise", () => {
  const ys: number[] = [];
  let opposite = 0,
    bubbles = 0;
  run({ look: "idle" }, 7, (m) => {
    ys.push(m.pose.y);
    if (m.flap.left * m.flap.right < 0) opposite++;
    if (m.water?.bubbles.length) bubbles++;
  });
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.03, "floats");
  assert.ok(opposite > 24, "fins stroke in turn");
  assert.ok(bubbles > 0, "a bubble rises");
});

test("a greeting waves the fin on the pointer's side and blows a ring the other way, no spout", () => {
  for (const side of [-1, 1]) {
    let wave = 0,
      tucked = true,
      rings = 0;
    for (let g = 0.3; g < 1.2; g += 0.05) {
      const sea = whaleSea(
        cue({ hovered: true, greeting: g, greetSide: side }),
      );
      const near = side < 0 ? sea.fins.left : sea.fins.right,
        far = side < 0 ? sea.fins.right : sea.fins.left;
      wave = Math.max(wave, near);
      if (far > 0) tucked = false;
      if (sea.water.ring) {
        rings++;
        assert.ok((sea.water.ring.x - 0.5) * side < 0, "ring on the far side");
      }
      assert.equal(sea.water.jet, null, "the spout is kept for a reply");
      // Past about 45° a side fin hides behind the round body.
      assert.ok(near <= 50, `fin ${near}° stays in sight`);
    }
    assert.ok(wave > 35, "the near fin waves");
    assert.ok(tucked, "the far fin tucks in");
    assert.ok(rings > 5, "a ring of air drifts out");
  }
});

test("thinking watches a little fish swim round its head, eyes after it, no dots", () => {
  const xs: number[] = [];
  let follows = 0,
    frames = 0;
  run({ look: "thinking" }, 6, (m, t) => {
    if (t < 11) return;
    const fish = m.water?.fish;
    assert.ok(fish, "a fish");
    assert.notEqual(m.sign, "ellipsis");
    xs.push(fish.x);
    frames++;
    if (
      Math.abs(fish.x - 0.5) > 0.15 &&
      Math.sign(m.face.look) === Math.sign(fish.x - 0.5)
    )
      follows++;
  });
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.6, "laps right round");
  assert.ok(follows > frames * 0.4, "eyes follow the fish");
});

test("work strokes hard in bursts, fins in turn, waves off the belly, gliding between", () => {
  let strokes = 0,
    waves = 0,
    calm = 0;
  run({ look: "tool-command" }, 9, (m, t) => {
    const into = (t - 10) % 4.5;
    if (into > 0.2 && into < 2.8) {
      if (m.flap.left * m.flap.right < 0 && Math.abs(m.flap.left) > 20)
        strokes++;
      if (m.water?.waves.length) waves++;
    } else if (into > 3.1 && into < 4.4 && !m.water?.waves.length) calm++;
  });
  assert.ok(strokes > 20, "hard alternate strokes");
  assert.ok(waves > 40, "waves off the belly");
  assert.ok(calm > 20, "glides between bursts");
});

test("asking raises both fins and calls with an orange-tagged sign that pulses", () => {
  let raised = 0,
    pulse = 1;
  const motion = run({ look: "permission" }, 6, (m, t) => {
    if (t < 11.5) return;
    if (m.flap.left > 10 && m.flap.right > 10) raised++;
    pulse = Math.max(pulse, m.water?.tag ?? 1);
  });
  assert.equal(motion.sign, "exclamation");
  assert.ok(raised > 60, "fins up");
  assert.ok(pulse > 1.08, "the tag pulses");
  assert.equal(run({ look: "question" }, 2).sign, "question");
});

test("only a finished reply spouts: a column that opens into two leaves, drops falling", () => {
  let jet = 0,
    open = 0,
    drops = 0;
  run({ look: "done" }, 1.8, (m) => {
    if (m.water?.jet) jet = Math.max(jet, m.water.jet.height);
    if (m.water?.jet && m.water.jet.spread > 0.9) open++;
    drops = Math.max(drops, m.water?.drops.length ?? 0);
  });
  assert.ok(jet > 0.25, "a tall spout");
  assert.ok(open > 5, "it opens at the top");
  assert.ok(drops >= 4, "drops fall either side");
  for (const look of [
    "idle",
    "thinking",
    "tool-edit",
    "permission",
    "asleep",
  ] as const)
    run({ look }, 4, (m) => assert.equal(m.water?.jet ?? null, null, look));
});

test("asleep it rolls on its side with curved lids and slow bubbles, no z", () => {
  let bubbles = 0;
  const motion = run({ look: "asleep" }, 6, (m) => {
    if (m.water?.bubbles.length) bubbles++;
  });
  assert.equal(motion.lids, "curve");
  assert.ok(motion.pose.rotation < -6, "on its side");
  assert.notEqual(motion.sign, "z");
  assert.ok(bubbles > 50, "breathes bubbles");
});

test("a new turn dives in under a stream of bubbles", () => {
  let deepest = 0,
    bubbles = 0;
  after("start", 1.2, (m) => {
    deepest = Math.max(deepest, m.pose.y);
    bubbles = Math.max(bubbles, m.water?.bubbles.length ?? 0);
  });
  assert.ok(deepest > 0.05, "dives");
  assert.ok(bubbles >= 3, "bubbles stream up");
});

test("a failure chokes grey water with crossed eyes and a red-tagged cross", () => {
  let choked = 0,
    crossed = 0,
    sign: string | null = null;
  after("failed", 1.2, (m) => {
    if (m.water?.choked && (m.water.jet || m.water.drops.length)) choked++;
    crossed = Math.max(crossed, m.face.crossed);
    sign ??= m.sign;
  });
  assert.ok(choked > 5, "sputters grey");
  assert.ok(crossed > 0.9, "crossed eyes");
  assert.equal(sign, "cross");
});
