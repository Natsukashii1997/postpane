import { test } from "node:test";
import assert from "node:assert/strict";
import { BotMotion, type MotionSpec } from "../src/bots/bot-motion.ts";
import {
  botState,
  type BotEvent,
  type BotState,
} from "../src/bots/bot-state.ts";
import { botSpecs, staysAsBot } from "../src/bots/bot-spec.ts";
import {
  flipLength,
  floatSpace,
  ORBIT_SECONDS,
  type FloatCue,
} from "../src/bots/bot-float.ts";
import { ALOFT, GROUNDED } from "../src/bots/bot-float-sky.ts";

const float: MotionSpec = { radius: 0.36, float: true };

function run(
  state: Partial<BotState>,
  seconds: number,
  each?: (motion: BotMotion, t: number) => void,
  spec = float,
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
const cue = (value: Partial<FloatCue>): FloatCue => ({
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
const sweep = (
  from: number,
  to: number,
  make: (t: number) => Partial<FloatCue>,
) => {
  const out = [];
  for (let t = from; t <= to; t += 1 / 24) out.push(floatSpace(cue(make(t))));
  return out;
};

test("Antigravity floats and stays a bot; its look is unchanged; no other bot floats", () => {
  const specs = botSpecs(true);
  assert.equal(specs.antigravity.float, true);
  assert.equal(staysAsBot("antigravity"), true);
  assert.deepEqual(specs.antigravity.shape, {
    kind: "outline",
    keep: 0.5,
    smooth: 16,
  });
  assert.deepEqual(specs.antigravity.face, [0, -0.2]);
  for (const [key, value] of Object.entries(specs))
    if (key !== "antigravity") assert.equal(value.float, undefined, key);
});

test("a bot without the float switch has no sky", () => {
  const motion = run({ look: "thinking" }, 2, undefined, { radius: 0.36 });
  assert.equal(motion.air, null);
});

test("idle hovers above the ground and now and then a pebble drifts up past it", () => {
  const ys: number[] = [];
  let pebbles = 0;
  run({ look: "idle" }, 9, (m, t) => {
    if (t > 11) ys.push(m.pose.y);
    if (m.air?.motes.length) pebbles++;
  });
  assert.ok(Math.max(...ys) < 0, "always off the ground");
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.03, "bobs up and down");
  assert.ok(pebbles > 0, "a pebble drifts up");
});

test("a greeting leans towards the pointer and twinkles stars on that side", () => {
  for (const side of [-1, 1]) {
    let lean = 0,
      stars = 0;
    for (const s of sweep(0.1, 1.3, (g) => ({
      hovered: true,
      greeting: g,
      greetSide: side,
    }))) {
      lean = Math.max(lean, s.rotation * side);
      for (const m of s.sky.motes)
        if (m.star && m.r > 0.01) {
          stars++;
          assert.ok((m.x - 0.5) * side > 0, "on the pointer's side");
        }
      assert.ok(s.y < ALOFT + 0.001, "floats up");
    }
    assert.ok(lean > 10, "leans your way");
    assert.ok(stars > 10, "stars twinkle");
  }
});

test("a new turn crouches, blasts off on flames and floats back", () => {
  let crouch = -1,
    top = 0,
    flames = 0;
  after("start", 1.6, (m) => {
    crouch = Math.max(crouch, m.pose.y);
    top = Math.min(top, m.pose.y);
    if (m.air?.flames.length === 2) flames++;
  });
  assert.ok(crouch > ALOFT, "crouches first");
  assert.ok(top < ALOFT - 0.1, "shoots up");
  assert.ok(flames > 5, "flames under both feet");
});

test("thinking watches three satellites go round over its head, no dots", () => {
  const xs: number[] = [];
  let follows = 0,
    frames = 0;
  run({ look: "thinking" }, 6, (m, t) => {
    if (t < 11) return;
    const motes = m.air?.motes ?? [];
    assert.equal(motes.length, 3, "three satellites");
    assert.notEqual(m.sign, "ellipsis");
    for (const mote of motes) assert.ok(mote.y < 0.2, "over its head");
    const lead = motes[0];
    xs.push(lead.x);
    frames++;
    if (
      Math.abs(lead.x - 0.5) > 0.12 &&
      Math.sign(m.face.look) === Math.sign(lead.x - 0.5)
    )
      follows++;
  });
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.5, "goes right round");
  assert.ok(follows > frames * 0.4, "eyes follow the front one");
});

test("compacting squeezes small while the satellites spiral into it and out", () => {
  const spaces = sweep(0, 1.8, (age) => ({ look: "compacting", age }));
  const squeezed = spaces[Math.round(0.9 * 24)],
    open = spaces[0];
  assert.ok(squeezed.scaleX < 0.9, "squeezes");
  const reach = (s: (typeof spaces)[number]) =>
    Math.max(...s.sky.motes.map((m) => Math.abs(m.x - 0.5)));
  assert.ok(reach(squeezed) < reach(open) / 2, "satellites spiral in");
});

test("editing ticks one way and the other with a spark off its head", () => {
  const turns = new Set<number>();
  let sparks = 0;
  for (const s of sweep(0, 2.9, (beats) => ({ look: "tool-edit", beats }))) {
    turns.add(Math.sign(Math.round(s.rotation)));
    if (s.sky.motes.some((m) => m.star)) sparks++;
  }
  assert.ok(turns.has(1) && turns.has(-1), "tips both ways");
  assert.ok(sparks > 10, "sparks");
});

test("a command fires thrust and climbs in bursts, and rests between", () => {
  const busy = floatSpace(cue({ look: "tool-command", beats: 1 })),
    rest = floatSpace(cue({ look: "tool-command", beats: 3.6 }));
  assert.equal(busy.sky.flames.length, 2);
  assert.ok(busy.y < ALOFT - 0.03, "climbs");
  assert.equal(rest.sky.flames.length, 0);
});

test("reading holds a page beside it, row by row, eyes on the row", () => {
  const rows = new Set<number>();
  for (const s of sweep(0, 3.3, (now) => ({ look: "tool-read", now }))) {
    assert.ok(s.sky.page && s.sky.page.x > 0.8, "a page on its right");
    rows.add(s.sky.page!.line);
    assert.ok(s.gaze && s.gaze[0] > 0.5, "looks at the page");
  }
  assert.deepEqual([...rows].sort(), [0, 1, 2]);
});

test("a long command sends a satellite once round its orbit in six seconds", () => {
  const at = (age: number) =>
    floatSpace(cue({ look: "tool-long-command", age })).sky.orbit!.progress;
  assert.equal(at(0), 0);
  assert.ok(Math.abs(at(ORBIT_SECONDS / 2) - 0.5) < 1e-9);
  assert.ok(at(ORBIT_SECONDS + 1.5) < 0.3, "starts the next lap");
});

test("asking rises high; asking for leave bounces and the planet tag pulses", () => {
  const ys: number[] = [],
    tags: number[] = [];
  for (const s of sweep(0, 2, (now) => ({
    look: "permission",
    now,
    waiting: true,
  }))) {
    ys.push(s.y);
    tags.push(s.sky.tag);
  }
  assert.ok(Math.max(...ys) < ALOFT - 0.04, "up high");
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.03, "bounces");
  assert.ok(Math.max(...tags) > 1.1, "the tag pulses");
  const question = sweep(0, 1.6, (now) => ({
    look: "question",
    now,
    waiting: true,
  })).map((s) => s.rotation);
  assert.ok(Math.min(...question) < -8 && Math.max(...question) > 8, "rocks");
  const facing = floatSpace(cue({ look: "permission", facing: true }));
  assert.equal(facing.sky.live, false, "holds still at an open card");
});

test("the attention signs come out as the planet tag, never as the shared sign", () => {
  const motion = run({ look: "permission" }, 1);
  assert.equal(motion.sign, "exclamation");
  assert.ok(motion.air, "the tag reads its size from the sky");
});

test("done turns a somersault and throws stars; a long turn flips twice, a reset throws a full ring", () => {
  const flips = (card: FloatCue["card"]) => {
    const spaces = sweep(0, flipLength(card), (age) => ({
      look: "done",
      card,
      age,
    }));
    return {
      turned: -Math.min(...spaces.map((s) => s.rotation)),
      stars: Math.max(...spaces.map((s) => s.sky.motes.length)),
    };
  };
  const done = flips("done"),
    long = flips("long-done"),
    reset = flips("reset");
  assert.ok(done.turned > 350 && done.turned <= 360.5, "one flip");
  assert.ok(long.turned > 710, "two flips");
  assert.equal(done.stars, 4);
  assert.equal(reset.stars, 8);
  const later = floatSpace(cue({ look: "done", age: 3 }));
  assert.equal(later.rotation % 360, later.rotation, "settles upright");
});

test("asleep sinks low, tips on its side with curved lids, a dream rising, no z", () => {
  let dreams = 0;
  const motion = run({ look: "asleep" }, 8, (m) => {
    if (m.air?.motes.length) dreams++;
  });
  assert.equal(motion.lids, "curve");
  assert.notEqual(motion.sign, "z");
  assert.ok(motion.pose.rotation < -10, "tipped on its side");
  assert.ok(dreams > 0, "a dream drifts up");
});

test("a failure drops it to the ground in a puff of dust, red cross, and it rises again", () => {
  let lowest = -1,
    dust = 0,
    cross = 0;
  after("failed", 1.4, (m) => {
    lowest = Math.max(lowest, m.pose.y);
    if (m.air?.motes.length) dust++;
    if (m.sign === "cross") cross++;
  });
  assert.ok(lowest > GROUNDED - 0.02, "hits the ground");
  assert.ok(dust > 3, "dust");
  assert.ok(cross > 0, "the cross shows");
  const back = floatSpace(cue({ event: { kind: "failed", time: 1.7 } }));
  assert.ok(back.y < 0, "floats again afterwards");
});

test("out of quota it sinks to the ground and sits there", () => {
  const sinking = floatSpace(
      cue({ badge: "limited", event: { kind: "limit-hit", time: 0.6 } }),
    ),
    sat = floatSpace(cue({ badge: "limited" }));
  assert.ok(sinking.y > ALOFT && sinking.y < GROUNDED);
  assert.equal(sat.y, GROUNDED);
  assert.equal(sat.sky.motes.length, 0, "no pebbles while it is down");
});

test("held on a retry it hangs still in the air", () => {
  const a = floatSpace(cue({ look: "tool-command", holds: true, now: 1 })),
    b = floatSpace(cue({ look: "tool-command", holds: true, now: 2.3 }));
  assert.deepEqual(a, b);
  assert.ok(a.y < 0);
});
