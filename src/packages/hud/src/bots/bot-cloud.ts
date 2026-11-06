import { BotMoves, easeInOut, easeOut, easeOutBack } from "./bot-moves.ts";
import type { BotBadge, BotCard, BotEvent, BotLook } from "./bot-state.ts";

/**
 * A small cloud beside the body, in mark shares; drawn in the body's own
 * paint. A `mini` one is a little cloud of three lumps, the others round.
 */
export interface CloudPuff {
  x: number;
  y: number;
  r: number;
  alpha: number;
  mini?: boolean;
}
/** A raindrop under the body: a short stroke from (x, y) down `length`. */
export interface CloudDrop {
  x: number;
  y: number;
  length: number;
  alpha: number;
}
/** How the cloud's own outline bends; the body never turns. */
export interface CloudShape {
  /** Five swells rolling round the edge, `phase` degrees on. */
  billow: number;
  phase: number;
  /** A slow two- and three-lobed reshaping, `morphPhase` degrees on. */
  morph: number;
  morphPhase: number;
  /** The top heaping up like a building cumulus, as a share of the radius. */
  tower: number;
  /** A speech-bubble tail, as a share of the radius, pointing `tailAngle` degrees (90 straight down). */
  tail: number;
  tailAngle: number;
}
export const cloudShape = (): CloudShape => ({
  billow: 0,
  phase: 0,
  morph: 0,
  morphPhase: 0,
  tower: 0,
  tail: 0,
  tailAngle: 125,
});
/** Rounded so a cache can tell two outlines apart. */
export const cloudShapeKey = (shape: CloudShape | null) =>
  shape
    ? [
        Math.round(shape.billow * 200),
        shape.billow ? Math.round(shape.phase * 2) : 0,
        Math.round(shape.morph * 200),
        shape.morph ? Math.round(shape.morphPhase * 2) : 0,
        Math.round(shape.tower * 200),
        Math.round(shape.tail * 200),
        shape.tail ? Math.round(shape.tailAngle) : 0,
      ].join(",")
    : "";
/** The radius multiplier a cloud shape gives the outline at angle `a` (radians). */
export function cloudRadius(shape: CloudShape, a: number) {
  const deg = Math.PI / 180,
    up = Math.max(0, -Math.sin(a));
  let k =
    1 +
    shape.billow * Math.sin(5 * a - shape.phase * deg) +
    shape.morph *
      (0.6 * Math.sin(2 * a + shape.morphPhase * deg) +
        0.4 * Math.sin(3 * a - 1.7 * shape.morphPhase * deg)) +
    shape.tower * up * up;
  if (shape.tail > 0) {
    let d = a - shape.tailAngle * deg;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    k +=
      shape.tail *
      (Math.exp(-((d / 0.17) ** 2)) + 0.18 * Math.exp(-((d / 0.45) ** 2)));
  }
  return k;
}
export type CloudActKind = "gust" | "swell" | "bud" | "drift";
export const CLOUD_ACTS: Record<CloudActKind, number> = {
  gust: 1.4,
  swell: 1.2,
  bud: 1.6,
  drift: 2.4,
};
/** What the cloud reacts to on one frame. Every time is in seconds. */
export interface CloudCue {
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
  /** Seconds since the latest attention move began, while one is moving. */
  move: number | null;
  /** The latest event and how long ago it began; kept past the event itself. */
  weather: { kind: BotEvent; time: number } | null;
  /** Seconds since a hover greeting began. */
  greeting: number | null;
  act: { kind: string; progress: number; side: number } | null;
}
/** The cloud's own body language for one frame, on top of the shared pose. */
export interface CloudSky {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  shape: CloudShape;
  /** 0 as drawn, 1 a grey storm cloud. */
  gray: number;
  opacity: number;
  puffs: CloudPuff[];
  drops: CloudDrop[];
  /** A lightning flash under the body, 0–1. */
  bolt: number;
  /** Something moves faster than a slow float, so frames come quickly. */
  live: boolean;
  look: number | null;
  lookY: number | null;
  open: number | null;
}
const TAU = 2 * Math.PI,
  CX = 0.5,
  CY = 0.5,
  R = 0.37;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const swing = (x: number) => Math.sin(Math.PI * clamp01(x));
const wrap = (x: number, period: number) => ((x % period) + period) % period;
const round = (x: number) => Math.round(x * 1000) / 1000;
/** Looks where the cloud talks back as a speech bubble. */
export const asksAsBubble = (look: BotLook) =>
  look === "permission" || look === "question" || look === "plan";
/** Puffs thrown out round the body at once and fading as they go. */
function burst(
  time: number,
  length: number,
  count: number,
  size = 0.085,
  reach = 1.5,
): CloudPuff[] {
  if (time < 0 || time >= length) return [];
  const k = easeOut(time / length),
    puffs: CloudPuff[] = [];
  for (let i = 0; i < count; i++) {
    const a = ((-90 + (360 * i) / count) * Math.PI) / 180,
      d = R * (0.95 + (reach - 0.95) * k);
    puffs.push({
      x: CX + Math.cos(a) * d,
      y: CY + Math.sin(a) * d * 0.85,
      r: size * (1 - 0.55 * k),
      alpha: 1 - k * k,
    });
  }
  return puffs;
}
/** Rain falling in columns under the body. */
function rain(time: number, strength: number, columns = 5): CloudDrop[] {
  const drops: CloudDrop[] = [];
  for (let i = 0; i < columns; i++) {
    const x = 0.32 + (0.36 * i) / (columns - 1),
      t = wrap(time + i * 0.17, 0.45) / 0.45;
    drops.push({
      x,
      y: 0.76 + 0.42 * t,
      length: 0.09,
      alpha: strength * (1 - t * 0.7),
    });
  }
  return drops;
}
export function cloudSky(cue: CloudCue): CloudSky {
  const { look, age, now } = cue;
  const shape = cloudShape();
  shape.billow = 0.04;
  shape.phase = wrap(now * 40, 360);
  const sky: CloudSky = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    shape,
    gray: 0,
    opacity: 1,
    puffs: [],
    drops: [],
    bolt: 0,
    live: false,
    look: null,
    lookY: null,
    open: null,
  };
  const float = (amp: number, period: number) => {
    sky.y -= amp * Math.sin((TAU * now) / period);
    sky.x += amp * 0.4 * Math.sin((TAU * now) / (period * 2.3));
  };
  const working = look.startsWith("tool-") || look === "thinking";
  if (cue.dozing) {
    // Asleep: the cloud comes apart into three small clouds drifting low and pale.
    shape.billow = 0;
    sky.scaleX = sky.scaleY = 0.8 + 0.02 * Math.sin((TAU * now) / 4);
    sky.y = 0.07;
    sky.opacity = 0.6;
    const drift = Math.sin((TAU * now) / 10);
    sky.x = 0.02 * drift;
    sky.puffs.push(
      {
        x: -0.06 - 0.03 * drift,
        y: 0.74 + 0.015 * Math.sin((TAU * now) / 4.6),
        r: 0.12,
        alpha: 1,
        mini: true,
      },
      {
        x: 1.06 + 0.03 * drift,
        y: 0.68 + 0.015 * Math.sin((TAU * now) / 5.2 + 1),
        r: 0.1,
        alpha: 1,
        mini: true,
      },
    );
  } else if (cue.holds && (working || look === "plain")) {
    // Stuck or retrying: overcast and still, sat a little low.
    sky.gray = 0.6;
    sky.y = 0.03;
    shape.billow = 0;
    shape.phase = 0;
  } else if (cue.badge === "limited" && !working && look !== "done") {
    // Out of quota: a grey cloud that barely floats and lets a drop fall now and then.
    sky.gray = 0.85;
    shape.billow = 0;
    float(0.015, 5);
    const t = wrap(now, 2.4) / 0.7;
    if (t < 1)
      sky.drops.push({
        x: 0.46 + 0.08 * (Math.floor(now / 2.4) % 2),
        y: 0.78 + 0.34 * t * t,
        length: 0.08,
        alpha: 1 - t * 0.6,
      });
  } else if (look === "idle" || look === "no-news") {
    // Idle: wandering slowly across, its shape changing as real clouds do.
    sky.x = 0.1 * Math.sin((TAU * now) / 12);
    sky.y = -0.03 * Math.sin((TAU * now) / 3.4);
    shape.morph = 0.09;
    shape.morphPhase = wrap(now * 30, 360);
    if (look === "no-news") {
      // Nothing confirmed yet: a thin mist.
      shape.billow = 0.08;
      sky.opacity = 0.65;
    }
  } else if (look === "plain") {
    // Busy at something unnamed: floating quicker, the edge churning fast.
    float(0.025, 2.4);
    shape.billow = 0.07;
    shape.phase = wrap(now * 120, 360);
  } else if (look === "thinking") {
    // Thinking: the top heaps up like a building cumulus and boils, puffs rising off it.
    shape.tower = 0.3 + 0.12 * Math.sin((TAU * now) / 1.8);
    shape.morph = 0.05;
    shape.morphPhase = wrap(now * 110, 360);
    shape.billow = 0.06;
    shape.phase = wrap(now * 90, 360);
    sky.y = 0.03;
    for (let i = 0; i < 2; i++) {
      const t = wrap(now / 1.8 + i / 2, 1);
      sky.puffs.push({
        x: 0.42 + 0.06 * Math.sin(TAU * (t + i * 0.3)),
        y: 0.02 - 0.2 * t,
        r: 0.035 + 0.035 * t,
        alpha: t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85,
      });
    }
    sky.lookY = -0.6;
    sky.live = true;
  } else if (look === "tool-edit") {
    // Stamping: each beat presses the cloud down and puffs out at its foot.
    if (BotMoves.bob(cue.beats) > 0) {
      sky.scaleX = 1.1;
      sky.scaleY = 0.88;
      for (const side of [-1, 1])
        sky.puffs.push({ x: CX + side * 0.3, y: 0.8, r: 0.05, alpha: 0.9 });
    }
    sky.live = BotMoves.inBurst(cue.beats);
  } else if (look === "tool-command") {
    // Running a command: it rains hard while the command runs, easing off in the rests.
    const burstOn = BotMoves.inBurst(cue.beats),
      inner = wrap(cue.beats, BotMoves.cycle),
      strength = burstOn
        ? clamp01(inner / 0.25)
        : clamp01(1 - (inner - BotMoves.burst) / 0.4);
    if (strength > 0) sky.drops.push(...rain(now, strength, 6));
    sky.scaleY = 1 - 0.05 * strength;
    sky.scaleX = 1 + 0.04 * strength;
    shape.phase = wrap(now * 100, 360);
    sky.lookY = 0.6;
    sky.live = true;
  } else if (look === "tool-long-command") {
    // A ring of puffs fills clockwise every six seconds; the eyes follow the newest.
    float(0.02, 4);
    const share = wrap(age, 6) / 6,
      count = 8,
      fade = share > 0.92 ? 1 - (share - 0.92) / 0.08 : 1;
    for (let i = 0; i < count; i++) {
      const grown = clamp01((share - i / count) * count * 1.6);
      if (grown <= 0) continue;
      const a = ((-90 + (360 * i) / count) * Math.PI) / 180;
      sky.puffs.push({
        x: CX + Math.cos(a) * R * 1.3,
        y: CY + Math.sin(a) * R * 1.2,
        r: 0.055 * easeOut(grown),
        alpha: fade,
      });
    }
    sky.live = true;
  } else if (look === "tool-read") {
    // Reading: the cloud drifts along each line with the eyes, then back.
    const line = wrap(now, 3.3),
      across = wrap(line, 1.1) / 1.1,
      back = across > 0.9 ? 1 - (across - 0.9) / 0.1 : across / 0.9;
    sky.x = -0.05 + 0.1 * back;
    sky.y = -0.02 + 0.02 * Math.floor(line / 1.1);
    sky.live = true;
  } else if (look === "compacting") {
    // Wrung out: squeezed thin and tall, a few drops fall, then it relaxes.
    const squeeze = Math.sin((Math.PI * Math.max(0, age)) / 1.8) ** 2;
    sky.scaleX = 1 - 0.26 * squeeze;
    sky.scaleY = 1 + 0.12 * squeeze;
    shape.billow = 0.02;
    const after = wrap(age - 0.9, 1.8);
    [0.42, 0.5, 0.58].forEach((x, i) => {
      const t = (after - i * 0.1) / 0.5;
      if (t >= 0 && t < 1)
        sky.drops.push({
          x,
          y: 0.8 + 0.4 * t * t,
          length: 0.08,
          alpha: 1 - t * 0.5,
        });
    });
    sky.live = true;
  } else if (asksAsBubble(look)) {
    // Asking: the cloud becomes a speech bubble, a tail growing out underneath.
    const grown = easeOutBack(clamp01(age / 0.4)),
      m = cue.move;
    shape.tail = 0.5 * grown;
    shape.billow = 0.02;
    if (look === "permission") {
      // Waiting for approval: the bubble throbs and its tail jabs at you.
      const jab =
        m !== null && m < 0.55
          ? Math.abs(Math.sin((TAU * 2 * m) / 0.55)) * (1 - m / 0.55)
          : 0;
      const throb = cue.waiting
        ? 0.05 * Math.abs(Math.sin((Math.PI * now) / 0.8))
        : 0;
      shape.tail += 0.3 * jab;
      sky.scaleX = sky.scaleY = 1 + throb + 0.05 * jab;
      sky.y = -0.03 * jab;
      sky.live = cue.waiting || jab > 0;
    } else if (look === "question") {
      // Asking a question: the tail swings from side to side under the bubble.
      const sway = cue.waiting ? Math.sin((TAU * now) / 2.4) : 0;
      shape.tailAngle = 90 + 50 * sway;
      sky.rotation = -4 * sway;
      sky.x = 0.02 * sway;
      sky.live = cue.waiting;
    } else {
      // A plan to confirm: the bubble spreads wide and flat like a sheet; each nod turns a page.
      const turn = m !== null && m < 0.6 ? easeInOut(m / 0.6) : 0;
      shape.tailAngle = 105;
      sky.scaleX = 1.2;
      sky.scaleY = 0.86;
      shape.phase = wrap(72 * turn + 72 * Math.floor(age / 2.6), 360);
      shape.billow = 0.04;
      sky.live = m !== null;
    }
  } else if (look === "done") {
    if (cue.card === "long-done" && age < 2.8) {
      // A bouncing float, a puff popping out on alternate sides each bounce.
      const bounce = Math.abs(Math.sin((Math.PI * age) / 0.7)),
        side = Math.floor(age / 0.7) % 2 ? 1 : -1;
      sky.y = -0.07 * bounce;
      sky.scaleX = 1 + 0.06 * (1 - bounce);
      sky.scaleY = 1 - 0.06 * (1 - bounce);
      sky.puffs.push({
        x: CX + side * R * 1.15,
        y: 0.45,
        r: 0.07 * swing(wrap(age, 0.7) / 0.7),
        alpha: swing(wrap(age, 0.7) / 0.7),
      });
      sky.live = true;
    } else if (cue.card === "reset" && age < 1.2) {
      // Clearing up: the grey lifts and a big ring of puffs flies out.
      sky.gray = 0.85 * (1 - clamp01(age / 0.6));
      const grow = 1 + 0.12 * swing(age / 0.9);
      sky.scaleX = sky.scaleY = grow;
      sky.puffs = burst(age, 1.1, 8, 0.1, 1.7);
      sky.live = true;
    } else if (age < 0.9) {
      sky.puffs = burst(age, 0.9, 6);
      sky.live = true;
    }
  }
  if (cue.act && !cue.dozing) {
    const { kind, progress: p, side } = cue.act,
      s = swing(p);
    if (kind === "gust") {
      sky.scaleX *= 1 + 0.16 * s;
      sky.scaleY *= 1 - 0.08 * s;
      sky.x += side * 0.05 * s;
      sky.rotation += side * 5 * s;
      sky.open = 1 - 0.45 * s;
      for (const [y, lag] of [
        [0.44, 0],
        [0.6, 0.15],
      ] as const)
        sky.puffs.push({
          x: CX - side * (R * 1.05 + 0.25 * clamp01(p - lag)),
          y,
          r: 0.025 + 0.04 * (1 - p),
          alpha: s,
        });
      sky.live = true;
    } else if (kind === "swell") {
      const grow = p < 0.6 ? easeOut(p / 0.6) : 1 - easeInOut((p - 0.6) / 0.4);
      sky.scaleX *= 1 + 0.12 * grow;
      sky.scaleY *= 1 + 0.12 * grow;
      if (p >= 0.6) {
        const t = (p - 0.6) / 0.4;
        sky.puffs.push({
          x: CX,
          y: 0.16 - 0.14 * t,
          r: 0.07 - 0.03 * t,
          alpha: 1 - t,
        });
      }
      sky.live = true;
    } else if (kind === "bud") {
      const a = ((side > 0 ? -40 : -140) * Math.PI) / 180,
        out = p < 0.4 ? 0 : (p - 0.4) / 0.6,
        d = R * (0.98 + 0.6 * out);
      sky.puffs.push({
        x: CX + Math.cos(a) * d,
        y: CY + Math.sin(a) * d - 0.08 * out,
        r: 0.085 * easeOut(clamp01(p / 0.4)) * (1 - 0.4 * out),
        alpha: 1 - out,
      });
      sky.look = Math.cos(a) * 0.8;
      sky.lookY = Math.sin(a) * 0.8;
      sky.live = true;
    } else if (kind === "drift") {
      sky.x += side * 0.07 * s;
      sky.y -= 0.02 * s;
      sky.look = side * 0.6;
      sky.live = true;
    }
  }
  if (cue.greeting !== null && cue.greeting < 0.9) {
    // Hello: floats up, puffs out and waves a puff on each side.
    const g = cue.greeting / 0.9,
      s = swing(g);
    sky.y -= 0.05 * s;
    sky.scaleX *= 1 + 0.06 * s;
    sky.scaleY *= 1 + 0.06 * s;
    for (const side of [-1, 1])
      sky.puffs.push({
        x: CX + side * R * 1.12,
        y: 0.42 + 0.05 * Math.sin((TAU * cue.greeting) / 0.3),
        r: 0.07 * s,
        alpha: s,
      });
    sky.live = true;
  }
  const w = cue.weather;
  if (w) {
    const t = w.time;
    if (w.kind === "start" && t < 0.7) {
      // Starting: a puff of cloud bursts out all round as it springs up.
      sky.puffs.push(...burst(t, 0.7, 6, 0.075, 1.45));
      sky.live = true;
    } else if (w.kind === "failed" && t < 2.4) {
      // Failing: a grey storm cloud, rain and a flash of lightning.
      sky.gray = Math.max(sky.gray, t < 2 ? 1 : 1 - (t - 2) / 0.4);
      sky.drops = t < 2.2 ? rain(t, t < 1.9 ? 1 : (2.2 - t) / 0.3) : [];
      sky.bolt = (t > 0.08 && t < 0.2) || (t > 0.32 && t < 0.42) ? 1 : 0;
      shape.billow = 0;
      sky.live = true;
    } else if (w.kind === "limit-hit" && t < 1.2) {
      // Running dry: the cloud deflates, sinks and goes grey.
      const k = easeInOut(clamp01(t / 0.6));
      sky.y += 0.05 * k;
      sky.scaleX *= 1 - 0.08 * k;
      sky.scaleY *= 1 - 0.12 * k;
      sky.gray = Math.max(sky.gray, 0.85 * k);
      sky.live = true;
    }
  }
  sky.puffs = sky.puffs
    .filter((puff) => puff.alpha > 0.02 && puff.r > 0.004)
    .map((puff) => ({
      ...puff,
      x: round(puff.x),
      y: round(puff.y),
      r: round(puff.r),
      alpha: round(puff.alpha),
    }));
  sky.drops = sky.drops.filter((drop) => drop.alpha > 0.02);
  if (sky.puffs.length || sky.drops.length || sky.bolt) sky.live = true;
  return sky;
}
