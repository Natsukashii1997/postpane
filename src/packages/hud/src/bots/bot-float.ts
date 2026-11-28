import { BotMoves, easeInOut, easeOut } from "./bot-moves.ts";
import {
  ALOFT,
  burst,
  dream,
  dust,
  emptySky,
  GROUNDED,
  pebble,
  satellites,
  spark,
  spiral,
  thrust,
  twinkle,
  type FloatSky,
} from "./bot-float-sky.ts";
import type { WhaleCue } from "./bot-whale.ts";
import { clamp01, swing, TAU, wrap } from "./bot-whale-water.ts";

/**
 * The Antigravity bot's own body language: it hovers over its shadow, lifts
 * off to start, watches satellites while it thinks, fires thrust to work,
 * flips in the air when it is done, and drops to the ground when its
 * gravity fails. It reads the same cue as the whale.
 */
export type FloatCue = WhaleCue;
export interface FloatSpace {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** Closed eyes drawn as soft curves, for sleep. */
  lids: boolean;
  /** Where the eyes look, overriding the shared gaze; null leaves it. */
  gaze: readonly [number, number] | null;
  sky: FloatSky;
}
/** Seconds a long command takes to go once round its orbit. */
export const ORBIT_SECONDS = 6;
/** How long each kind of finished reply plays. */
export const flipLength = (card: FloatCue["card"]) =>
  card === "long-done" ? 2.6 : card === "reset" ? 1.6 : 1.2;

export function floatSpace(cue: FloatCue): FloatSpace {
  const { look, age, now } = cue,
    sky = emptySky(),
    space: FloatSpace = {
      x: 0,
      y: ALOFT,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      lids: false,
      gaze: null,
      sky,
    };
  const hover = (amp: number, period: number, base = ALOFT) => {
      space.y = base - amp * Math.sin((TAU * now) / period);
      space.rotation += 2.5 * Math.sin((TAU * now) / (period * 2));
    },
    working = look.startsWith("tool-") || look === "plain",
    burstOn = BotMoves.inBurst(cue.beats),
    grounded = cue.badge !== null && !cue.dozing;
  if (cue.holds && (working || look === "thinking" || look === "compacting")) {
    // Stuck on a retry: it hangs still in the air, tipped a little, until it moves on.
    space.rotation = -4;
  } else if (cue.dozing) {
    // Asleep: sunk near the ground and tipped on its side, breathing slow;
    // a pale dream drifts up once each breath.
    const breath = (1 - Math.cos((TAU * now) / 4)) / 2;
    space.y = 0.015 - 0.015 * breath;
    space.x = 0.012 * Math.sin((TAU * now) / 12);
    space.rotation = -20 + 3 * breath;
    space.scaleX = 1 + 0.02 * breath;
    space.scaleY = 1 + 0.03 * breath;
    space.lids = true;
    const d = dream(now);
    if (d) sky.motes.push(d);
  } else if (look === "thinking") {
    // Thinking: three satellites circle over its head and it watches the
    // front one go round, eyes and body turning after it.
    const { motes, lead } = satellites(now);
    hover(0.015, 3.6);
    space.rotation += 5 * lead;
    space.gaze = [0.8 * lead, -0.8];
    sky.motes.push(...motes);
    sky.live = true;
  } else if (look === "compacting") {
    // Compacting: it squeezes small and the satellites spiral in and out of it.
    const squeeze = Math.sin((Math.PI * Math.max(0, age)) / 1.8) ** 2;
    hover(0.01, 3.6);
    space.scaleX = space.scaleY = 1 - 0.14 * squeeze;
    sky.motes.push(...spiral(now, squeeze));
    sky.live = true;
  } else if (look === "tool-long-command") {
    // A long command: a satellite goes once round its orbit every six
    // seconds, and its eyes follow it round.
    const progress = wrap(age, ORBIT_SECONDS) / ORBIT_SECONDS,
      a = -Math.PI / 2 + TAU * progress;
    hover(0.015, 3.6);
    sky.orbit = { progress };
    space.gaze = [0.6 * Math.cos(a), 0.5 * Math.sin(a)];
    sky.live = true;
  } else if (look === "tool-read") {
    // Reading: it holds a page up beside it in mid-air and reads it row by
    // row, leaning towards it.
    const time = wrap(now, 3.3),
      line = Math.floor(time / 1.1);
    hover(0.012, 3.6);
    space.rotation += 7;
    sky.page = { x: 0.92, y: 0.5 - 0.012 * Math.sin((TAU * now) / 2.4), line };
    space.gaze = [0.55 + 0.35 * ((time % 1.1) / 1.1), -0.25 + 0.25 * line];
  } else if (working && burstOn) {
    const t = wrap(Math.max(0, cue.beats), 4.5);
    if (look === "tool-edit") {
      // Editing: it ticks over a step at a time, tipping one way and the
      // other, and a spark pops off its head on every tick.
      const tick = wrap(t, 0.5),
        side = Math.floor(t / 0.5) % 2 ? 1 : -1;
      hover(0.008, 3.6);
      space.rotation = side * 7 * easeOut(clamp01(tick / 0.12));
      const s = spark(tick, side);
      if (s) sky.motes.push(s);
    } else if (look === "tool-command") {
      // A command: it fires thrust out of both feet and climbs, shaking.
      space.y = ALOFT - 0.05;
      space.x = 0.012 * Math.sin(now * 90);
      space.rotation = 2 * Math.sin(now * 23);
      sky.flames.push(...thrust(now, 1));
    } else {
      // Other work: a gentler hum of thrust as it bobs along.
      hover(0.02, 1);
      sky.flames.push(...thrust(now, 0.45));
    }
    sky.live = true;
  } else if (working) {
    hover(0.02, 3.2);
  } else if (look === "permission" || look === "question" || look === "plan") {
    // Asking: it rises up high and calls you, a planet tag on its top left.
    const high = ALOFT - 0.05;
    if (cue.facing) space.y = high;
    else if (cue.waiting) {
      if (look === "permission") {
        // Bounces up and down on the spot, stretching as it goes.
        const beat = Math.abs(Math.sin((Math.PI * now) / 0.4));
        space.y = high - 0.045 * beat;
        space.scaleY = 1 + 0.06 * beat;
        space.scaleX = 1 - 0.04 * beat;
        sky.tag = 1 + 0.15 * beat;
      } else if (look === "question") {
        // Rocks from side to side, wondering.
        const rock = Math.sin((TAU * now) / 1.6);
        hover(0.012, 1.6, high);
        space.rotation = 11 * rock;
        sky.tag = 1 + 0.1 * Math.abs(rock);
      } else {
        // Nods slowly, a plan to look over.
        const nod = Math.abs(Math.sin((Math.PI * now) / 1.2));
        space.y = high + 0.025 * nod;
        space.scaleY = 1 - 0.05 * nod;
        sky.tag = 1 + 0.08 * nod;
      }
      sky.live = true;
    } else hover(0.015, 2.4, high);
  } else if (look === "done" && age >= 0 && age < flipLength(cue.card)) {
    // Done: it springs up and turns a somersault in the air, throwing out
    // stars in its four colours; a long turn flips twice, a quota reset
    // throws a full ring of stars.
    const card = cue.card,
      flips = card === "long-done" ? 2 : 1,
      length = flipLength(card),
      each = (length - 0.3) / flips,
      turn = Math.min(flips, Math.max(0, age - 0.1) / each);
    space.y = ALOFT - (card === "reset" ? 0.11 : 0.08) * swing(age / length);
    space.rotation = -360 * (Math.floor(turn) + easeInOut(turn % 1));
    for (let i = 0; i < flips; i++)
      sky.motes.push(
        ...burst(
          age - 0.1 - (i + 0.55) * each,
          card === "reset" ? 8 : 4,
          card === "reset" ? 0.5 : 0.42,
        ),
      );
    sky.live = true;
  } else if (cue.hovered && cue.greeting !== null && cue.greeting < 1.5) {
    // Greeted: it floats up, leans your way and two stars twinkle on your side.
    const g = cue.greeting,
      side = cue.greetSide < 0 ? -1 : 1;
    space.y = ALOFT - 0.05 * swing(g / 1.4);
    space.rotation = side * 13 * swing(g / 1.4);
    sky.motes.push(...twinkle(g, side));
    sky.live = true;
  } else if (grounded) {
    // Out of quota, or failing: its gravity is off and it sits on the ground.
    space.y = GROUNDED;
    space.rotation = cue.badge === "failed" ? 6 : -3;
    space.scaleY = 0.96;
  } else {
    // Idle: it hovers over its shadow, and now and then a pebble drifts up
    // past it, as if gravity were off.
    hover(0.022, 3.6);
    const p = pebble(now);
    if (p) sky.motes.push(p);
  }
  const event = cue.event,
    rest = space.y;
  if (event) {
    const t = event.time;
    if (event.kind === "start" && t < 1.2) {
      // A new turn: it crouches, then blasts off on its thrust and floats back down.
      const crouch = swing(t / 0.3),
        up = easeOut(clamp01((t - 0.2) / 0.35)),
        down = easeInOut(clamp01((t - 0.55) / 0.65));
      space.y += 0.025 * crouch - 0.16 * up * (1 - down);
      space.scaleY *= 1 - 0.1 * crouch + 0.08 * swing((t - 0.2) / 0.5);
      space.scaleX *= 1 + 0.06 * crouch;
      sky.flames.push(...thrust(now, swing((t - 0.15) / 0.55)));
      sky.live = true;
    } else if (event.kind === "failed" && t < 1.6) {
      // A failure: its gravity cuts out and it drops, squashes on the
      // ground in a puff of dust and stays down a moment.
      const fall = clamp01((t - 0.1) / 0.3) ** 2,
        land = swing((t - 0.4) / 0.25),
        lie = 1 - easeInOut(clamp01((t - 1.1) / 0.5));
      space.y =
        (ALOFT + (GROUNDED - ALOFT) * fall) * lie +
        rest * (1 - lie) -
        0.03 * swing(t / 0.1);
      space.scaleY *= 1 - 0.16 * land;
      space.scaleX *= 1 + 0.12 * land;
      space.rotation = 8 * fall * lie;
      sky.motes.push(...dust((t - 0.4) / 0.6));
      sky.live = true;
    } else if (event.kind === "limit-hit" && t < 1.2) {
      // Out of quota: it runs down and sinks slowly to the ground.
      space.y = ALOFT + (GROUNDED - ALOFT) * easeInOut(clamp01(t / 1.2));
      sky.live = true;
    }
  }
  return space;
}
