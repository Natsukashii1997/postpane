import { BotMoves, easeOut } from "./bot-moves.ts";

/** The shapes every bot performer shares: face, pose, limbs, flaps, pacing and the seeded random. */
export interface BotFace {
  open: number;
  look: number;
  lookY: number;
  wide: number;
  happy: number;
  lean: number;
  crossed: number;
}
export interface BotPose {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  footing: number;
}
export interface BotLimbs {
  left: number;
  right: number;
  lifted: number;
  x: number;
  y: number;
  spinner: number;
}
export interface BotFlap {
  left: number;
  right: number;
}
export const botFace = (): BotFace => ({
  open: 1,
  look: 0,
  lookY: 0,
  wide: 1,
  happy: 0,
  lean: 0,
  crossed: 0,
});
export const botPose = (): BotPose => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  footing: 0,
});
export const botLimbs = (): BotLimbs => ({
  left: 0,
  right: 0,
  lifted: 0,
  x: 0,
  y: 0,
  spinner: 0,
});
export function mixPose(a: BotPose, b: BotPose, t: number): BotPose {
  return Object.fromEntries(
    Object.keys(a).map((key) => [
      key,
      a[key as keyof BotPose] +
        (b[key as keyof BotPose] - a[key as keyof BotPose]) * t,
    ]),
  ) as unknown as BotPose;
}
export const BotPace = {
  lively: 1 / 24,
  following: 1 / 12,
  calm: 1 / 6,
  slack: 0.004,
  next: (now: number, pace: number) =>
    (Math.floor((now + 0.004) / pace) + 1) * pace,
  frame(time: number, now: number) {
    return Math.max(
      this.next(now, this.lively),
      Math.ceil((time - this.slack) / this.lively) * this.lively,
    );
  },
  onFrame(now: number) {
    const frame = Math.round(now / this.lively) * this.lively;
    return Math.abs(frame - now) <= this.slack ? frame : now;
  },
};
export class SplitMix {
  state: bigint;
  constructor(
    seed: bigint | number = BigInt(
      Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    ),
  ) {
    this.state = BigInt.asUintN(64, BigInt(seed));
  }
  next() {
    this.state = BigInt.asUintN(64, this.state + 0x9e3779b97f4a7c15n);
    let z = this.state;
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
    return z ^ (z >> 31n);
  }
  unit() {
    return Number(this.next() >> 11n) / 2 ** 53;
  }
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Degrees an editing bot has clicked round by `time`: 30° a tick, ten ticks a burst. */
export function petalRatchet(time: number) {
  time = Math.max(0, time);
  const cycles = Math.floor(time / BotMoves.cycle + 1e-9),
    inner = time - cycles * BotMoves.cycle,
    ticks = BotMoves.burst / 0.3,
    done = Math.min(ticks, Math.floor(inner / 0.3 + 1e-9)),
    part = done < ticks ? easeOut(clamp01((inner - done * 0.3) / 0.1)) : 0;
  return 30 * (cycles * ticks + done + part);
}
