import { BotMoves, easeInOut, easeOut } from "./bot-moves.ts";
import type { BotBadge, BotCard, BotEvent, BotLook } from "./bot-state.ts";

/**
 * The DeepSeek whale's own body language: it floats, paddles its fins,
 * blows bubbles, spouts and sinks to sleep. Everything here is in mark
 * shares (the body is a circle of radius 0.36 round (0.5, 0.5)), with y
 * running down. Nothing borrows the avatar's halo or the cloud's puffs.
 */
export interface WhaleBubble {
  x: number;
  y: number;
  r: number;
  alpha: number;
}
/** A drop of the spout: grey when the whale chokes. */
export interface WhaleDrop {
  x: number;
  y: number;
  r: number;
  alpha: number;
}
/**
 * The spout: a column of water `height` up out of the blowhole that opens
 * at its top into two leaves curling out and down, `spread` 0–1 open.
 */
export interface WhaleJet {
  height: number;
  spread: number;
  alpha: number;
}
/** A short wave line beside the belly, swept outward by a stroke. */
export interface WhaleWave {
  x: number;
  y: number;
  side: number;
  alpha: number;
}
export interface WhaleWater {
  bubbles: WhaleBubble[];
  drops: WhaleDrop[];
  jet: WhaleJet | null;
  waves: WhaleWave[];
  /** The spout chokes grey instead of blue. */
  choked: boolean;
  /** The droplet tag's size: above 1 while it calls for you. */
  tag: number;
  /** Something moves faster than a slow float, so frames come quickly. */
  live: boolean;
}
/** What the whale reacts to on one frame. Every time is in seconds. */
export interface WhaleCue {
  look: BotLook;
  age: number;
  now: number;
  /** Seconds into the work rhythm (bursts of 3 s, rests of 1.5 s). */
  beats: number;
  holds: boolean;
  hovered: boolean;
  badge: BotBadge | null;
  card: BotCard;
  dozing: boolean;
  /** An attention look still in its first eight seconds of asking. */
  waiting: boolean;
  /** Faces an open card instead of calling out. */
  facing: boolean;
  /** The latest event and how long ago it began; kept past the event itself. */
  event: { kind: BotEvent; time: number } | null;
  /** Seconds since a hover greeting began. */
  greeting: number | null;
}
export interface WhaleSea {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** Fin lift in degrees, up positive, down tucked. */
  fins: { left: number; right: number };
  /** Closed eyes drawn as soft curves, for sleep. */
  lids: boolean;
  water: WhaleWater;
}
const TAU = 2 * Math.PI;
/** The blowhole: right of the top fin, on the body's edge. */
export const BLOWHOLE = [0.62, 0.16] as const;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const swing = (x: number) => Math.sin(Math.PI * clamp01(x));
const wrap = (x: number, period: number) => ((x % period) + period) % period;
const round = (x: number) => Math.round(x * 1000) / 1000;
/** A bubble `q` (0–1) of the way up from the blowhole, swaying as it rises. */
function rising(q: number, height: number, from: number, to: number, sway = 0) {
  return {
    x: round(BLOWHOLE[0] + 0.03 + sway * Math.sin(q * TAU)),
    y: round(BLOWHOLE[1] - 0.04 - height * easeOut(q)),
    r: round(from + (to - from) * q),
    alpha: round(q < 0.12 ? q / 0.12 : q > 0.85 ? (1 - q) / 0.15 : 1),
  };
}
/** Where a spout `height` tall ends its leaf on `side`, `spread` open. */
export const leafTip = (height: number, spread: number, side: number) =>
  [
    BLOWHOLE[0] + side * 0.17 * spread,
    BLOWHOLE[1] - height + 0.07 * spread,
  ] as const;
/** Drops falling off both leaf tips of a spout, out and down, fading as they go. */
function spray(time: number, length: number, height: number, pairs: number) {
  const drops: WhaleDrop[] = [];
  for (let i = 0; i < pairs; i++) {
    const k = (time - i * 0.14) / length;
    if (k < 0 || k >= 1) continue;
    for (const side of [-1, 1]) {
      const [x, y] = leafTip(height, 1, side);
      drops.push({
        x: round(x + side * (0.05 + 0.04 * i) * easeOut(k)),
        y: round(y + 0.34 * k * k),
        r: round(0.04 * (1 - 0.35 * k)),
        alpha: round(1 - k * k),
      });
    }
  }
  return drops;
}
/** A spout `top` tall at its height, shooting up, opening and sinking over `length` seconds. */
function spout(time: number, top: number, length: number): WhaleJet | null {
  if (time < 0 || time >= length) return null;
  const up = easeOut(clamp01(time / 0.22)),
    open = easeOut(clamp01((time - 0.12) / 0.3)),
    fall = easeInOut(clamp01((time - length * 0.62) / (length * 0.38)));
  return {
    height: round(top * up * (1 - 0.6 * fall)),
    spread: round(open),
    alpha: round(1 - fall),
  };
}
export function whaleSea(cue: WhaleCue): WhaleSea {
  const { look, age, now } = cue,
    water: WhaleWater = {
      bubbles: [],
      drops: [],
      jet: null,
      waves: [],
      choked: false,
      tag: 1,
      live: false,
    },
    sea: WhaleSea = {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fins: { left: 0, right: 0 },
      lids: false,
      water,
    };
  const float = (amp: number, period: number) => {
      sea.y -= amp * Math.sin((TAU * now) / period);
      sea.rotation += 2.5 * Math.sin((TAU * now) / (period * 2));
    },
    paddle = (amp: number, period: number) => {
      const stroke = Math.sin((TAU * now) / period);
      sea.fins = { left: amp * stroke, right: -amp * stroke };
    },
    working = look.startsWith("tool-") || look === "plain";
  const event = cue.event;
  if (cue.holds && (working || look === "thinking" || look === "compacting")) {
    // Stuck on a retry: it hangs still in the water, fins down, until it moves on.
    sea.fins = { left: -8, right: -8 };
  } else if (cue.dozing) {
    // Asleep: sunk low and rolled on its side, breathing slow; a bubble
    // drifts up out of the blowhole with every breath.
    const breath = (1 - Math.cos((TAU * now) / 3.6)) / 2;
    sea.y = 0.07 - 0.015 * breath;
    sea.rotation = -12 + 2 * breath;
    sea.scaleX = 1 + 0.015 * breath;
    sea.scaleY = 1 + 0.03 * breath;
    sea.fins = { left: -14 + 4 * breath, right: -14 + 4 * breath };
    sea.lids = true;
    water.bubbles.push(rising(wrap(now, 3.6) / 3.6, 0.36, 0.035, 0.085, 0.02));
  } else if (look === "thinking" || look === "compacting") {
    // Thinking: it blows bubbles, three rising up past its head in turn.
    float(0.015, 3.6);
    paddle(8, 3.6);
    for (let i = 0; i < 3; i++) {
      const q = wrap(now - i * 0.6, 1.8) / 1.8,
        bubble = rising(q, 0.32, 0.035, 0.095);
      bubble.x = round(bubble.x + 0.14 * q);
      water.bubbles.push(bubble);
    }
    water.live = true;
  } else if (working) {
    // Work: bursts of hard strokes, fins beating in turn, the body surging
    // with each and waves swept off its belly; it glides between bursts.
    if (BotMoves.inBurst(cue.beats)) {
      const t = Math.max(0, cue.beats) % 4.5,
        stroke = Math.sin((TAU * t) / 0.5);
      sea.fins = { left: 36 * stroke, right: -36 * stroke };
      sea.y = -0.025 * Math.abs(stroke);
      sea.rotation = 6 * Math.sin((TAU * t) / 1);
      for (let i = 0; i < 2; i++) {
        const q = wrap(t - i * 0.25, 0.5) / 0.5;
        for (const side of [-1, 1])
          water.waves.push({
            x: round(0.5 + side * (0.36 + 0.14 * q)),
            y: round(0.8 - 0.04 * q),
            side,
            alpha: round(1 - q),
          });
      }
      water.live = true;
    } else {
      float(0.02, 3.2);
      sea.fins = { left: -6, right: -6 };
    }
  } else if (look === "permission" || look === "question" || look === "plan") {
    // Asking: up at the surface, both fins raised and beating to call you,
    // an orange droplet tag on its top left.
    if (cue.facing) sea.fins = { left: 26, right: 26 };
    else if (cue.waiting) {
      const beat = Math.abs(Math.sin((Math.PI * now) / 0.4));
      sea.fins = { left: 14 + 30 * beat, right: 14 + 30 * beat };
      sea.y = -0.03 * beat;
      water.tag = 1 + 0.12 * beat;
      water.live = true;
    } else {
      float(0.015, 2.4);
      sea.fins = { left: 26, right: 26 };
    }
  } else if (look === "done" && age >= 0) {
    // Done: a spout of water out of the blowhole, spraying drops either
    // side; a long turn blows twice.
    const twice = cue.card === "long-done",
      length = twice ? 3 : 1.8,
      time = twice ? age % 1.5 : age;
    if (age < length) {
      water.jet = spout(time, 0.3, 1.3);
      water.drops = spray(time - 0.35, 0.8, 0.3, 3);
      sea.fins = {
        left: 30 * Math.abs(Math.sin((Math.PI * age) / 0.45)),
        right: 30 * Math.abs(Math.sin((Math.PI * age) / 0.45)),
      };
      water.live = true;
    } else {
      float(0.025, 3.2);
      paddle(12, 3.2);
    }
  } else if (cue.hovered) {
    // Greeted: it breaches up, fins waving, and puffs a little spout.
    const g = cue.greeting;
    if (g !== null && g < 1) {
      const wave = 22 + 18 * Math.sin((TAU * g) / 0.45);
      sea.y = -0.07 * swing(g / 0.9);
      sea.rotation = -4 * swing(g / 0.9);
      sea.fins = { left: wave, right: wave };
      water.jet = spout(g - 0.1, 0.18, 0.8);
      water.live = true;
    } else {
      float(0.02, 2.6);
      paddle(14, 2.6);
    }
  } else {
    // Idle: it floats up and down, fins paddling in turn, and every few
    // seconds lets a bubble rise.
    float(0.03, 3.2);
    paddle(14, 3.2);
    const q = wrap(now, 6) / 2.2;
    if (q < 1 && cue.badge !== "limited")
      water.bubbles.push(rising(q, 0.34, 0.035, 0.075, 0.02));
  }
  if (event) {
    const t = event.time;
    if (event.kind === "start" && t < 1.2) {
      // A new turn: a deep breath, then it dives in, bubbles streaming up.
      const breath = swing(t / 0.3),
        dive = swing((t - 0.25) / 0.9);
      sea.scaleY *= 1 + 0.08 * breath - 0.05 * dive;
      sea.scaleX *= 1 - 0.04 * breath + 0.04 * dive;
      sea.y += -0.04 * breath + 0.09 * dive;
      sea.fins = { left: -22 * dive, right: -22 * dive };
      for (let i = 0; i < 4; i++) {
        const q = (t - 0.3 - i * 0.12) / 0.7;
        if (q > 0 && q < 1) water.bubbles.push(rising(q, 0.42, 0.03, 0.07));
      }
      water.live = true;
    } else if (event.kind === "failed" && t < 1.5) {
      // A failure: it chokes, sputtering grey water, fins dropped.
      water.choked = true;
      // Two weak coughs of grey water that barely clear the head.
      water.jet = spout(t % 0.55, 0.13, 0.5);
      if (t > 1.1) water.jet = null;
      water.drops = spray(t - 0.25, 0.7, 0.13, 2);
      sea.fins = { left: -16, right: -16 };
      water.live = true;
    }
  }
  if (cue.badge === "limited" && !cue.dozing)
    sea.fins = { left: -18, right: -18 };
  return sea;
}
