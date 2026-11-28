import type { BotPose } from "./bot-motion-parts";
import type { BotSign } from "./bot-state";
import { GROUNDED, MIDDLE, SKY, type FloatSky } from "./bot-float-sky";

/** Antigravity's sky and tag, in mark shares; sized up so they read on a 31 px stub. */
const SHADOW = "rgba(40, 44, 60, 0.32)",
  PAGE = "#ffffff",
  PAGE_EDGE = "#8a93a6",
  PAGE_INK = "#c3c9d6",
  ORBIT = "rgba(66, 133, 244, 0.45)",
  FLAME = "#f26b2a",
  TAG_ASK = "#ff8a00",
  TAG_FAIL = "#e5484d",
  TAG_LIMIT = "#7b5cd6",
  TAG_INK = "#ffffff",
  /** Where the ground is: just under its feet when it sits. */
  GROUND = 0.94;
const hairOf = (context: CanvasRenderingContext2D) => {
  const unit = context.getTransform();
  return 1 / Math.max(1, Math.hypot(unit.a, unit.b));
};
/**
 * Its shadow on the ground, laid behind everything already drawn. The pose
 * moves the whole canvas, so the shadow undoes it to stay put while the body
 * rises over it: the higher it floats, the smaller and fainter the shadow.
 */
export function groundShadow(
  context: CanvasRenderingContext2D,
  pose: BotPose,
  strength: number,
) {
  const lift = Math.max(0, GROUNDED - pose.y),
    near = Math.max(0.35, Math.min(1, 1 - 3.5 * lift)),
    turn = (pose.rotation * Math.PI) / 180;
  context.save();
  context.globalCompositeOperation = "destination-over";
  context.translate(0.5, 0.5 + pose.footing);
  context.scale(1 / (pose.scaleX || 1), 1 / (pose.scaleY || 1));
  context.rotate(-turn);
  context.translate(-0.5 - pose.x, -0.5 - pose.y - pose.footing);
  context.globalAlpha = strength * (0.35 + 0.65 * near);
  context.fillStyle = SHADOW;
  context.beginPath();
  context.ellipse(0.5, GROUND, 0.25 * near, 0.04 * near, 0, 0, 2 * Math.PI);
  context.fill();
  context.restore();
}
function star(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  context.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2,
      d = i % 2 ? r * 0.38 : r;
    context.lineTo(x + d * Math.cos(a), y + d * Math.sin(a));
  }
  context.closePath();
  context.fill();
}
/**
 * The orbit of a long command round its middle, with the satellite on it:
 * the half behind the body goes behind it, the part already gone round is
 * solid.
 */
function orbit(
  context: CanvasRenderingContext2D,
  progress: number,
  strength: number,
  line: number,
) {
  const [cx, cy] = MIDDLE,
    a = -Math.PI / 2 + 2 * Math.PI * progress,
    rx = 0.47,
    ry = 0.17,
    arc = (from: number, to: number, solid: boolean) => {
      if (to <= from) return;
      context.strokeStyle = solid ? SKY.blue : ORBIT;
      context.setLineDash(solid ? [] : [0.05, 0.045]);
      context.beginPath();
      context.ellipse(cx, cy, rx, ry, 0, from, to);
      context.stroke();
    },
    dot = () => {
      const front = Math.sin(a) >= 0;
      context.setLineDash([]);
      context.fillStyle = SKY.blue;
      context.strokeStyle = TAG_INK;
      context.beginPath();
      context.arc(
        cx + rx * Math.cos(a),
        cy + ry * Math.sin(a),
        front ? 0.058 : 0.045,
        0,
        2 * Math.PI,
      );
      context.fill();
      context.stroke();
    };
  context.save();
  context.globalAlpha = strength;
  context.lineWidth = line;
  // Behind first, each piece laid under what is already there.
  context.globalCompositeOperation = "destination-over";
  if (Math.sin(a) < 0) dot();
  arc(-Math.PI / 2, Math.min(a, 0), true);
  arc(-Math.PI, a - 2 * Math.PI, true);
  arc(-Math.PI, 0, false);
  context.globalCompositeOperation = "source-over";
  arc(0, Math.PI, false);
  arc(0, Math.min(a, Math.PI), true);
  if (Math.sin(a) >= 0) dot();
  context.restore();
}
/** Satellites, stars, dust, thrust, the page it reads and the orbit of a long command. */
export function paintSky(
  context: CanvasRenderingContext2D,
  sky: FloatSky,
  strength: number,
) {
  const hair = hairOf(context),
    line = Math.max(0.024, 1.3 * hair);
  context.save();
  context.lineCap = context.lineJoin = "round";
  if (sky.orbit) orbit(context, sky.orbit.progress, strength, line);
  for (const f of sky.flames) {
    // Two teardrops, the hot yellow core inside an orange-red flame.
    context.globalAlpha = f.alpha * strength;
    for (const [color, width, share] of [
      [FLAME, 0.055, 1],
      [SKY.yellow, 0.03, 0.62],
    ] as const) {
      const tip = f.y + f.length * share;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(f.x - width, f.y);
      context.quadraticCurveTo(f.x - width, tip - 0.02, f.x, tip);
      context.quadraticCurveTo(f.x + width, tip - 0.02, f.x + width, f.y);
      context.closePath();
      context.fill();
    }
  }
  if (sky.page) {
    const { x, y, line: row } = sky.page,
      w = 0.2,
      h = 0.26;
    context.globalAlpha = strength;
    context.fillStyle = PAGE;
    context.strokeStyle = PAGE_EDGE;
    context.lineWidth = line;
    context.beginPath();
    context.roundRect(x - w / 2, y - h / 2, w, h, 0.03);
    context.fill();
    context.stroke();
    context.lineWidth = Math.max(0.03, 1.6 * hair);
    for (let i = 0; i < 3; i++) {
      context.strokeStyle = i === row ? SKY.blue : PAGE_INK;
      context.beginPath();
      context.moveTo(x - 0.06, y - 0.07 + 0.07 * i);
      context.lineTo(x + 0.06, y - 0.07 + 0.07 * i);
      context.stroke();
    }
  }
  for (const m of sky.motes) {
    if (m.r <= 0.002) continue;
    context.globalAlpha = m.alpha * strength;
    context.fillStyle = m.color;
    if (m.star) star(context, m.x, m.y, m.r);
    else {
      context.beginPath();
      context.arc(m.x, m.y, m.r, 0, 2 * Math.PI);
      context.fill();
    }
  }
  context.restore();
}
/**
 * A sign as a small planet with a ring on its top left, clear of its face:
 * orange when it asks, red on a failure, violet when out of quota.
 */
export function floatTag(
  context: CanvasRenderingContext2D,
  sign: BotSign,
  scale: number,
  alpha: number,
) {
  if (sign === "ellipsis" || sign === "z") return;
  const color =
    sign === "cross" ? TAG_FAIL : sign === "hourglass" ? TAG_LIMIT : TAG_ASK;
  context.save();
  context.globalAlpha = alpha;
  context.translate(0.07, 0.19);
  context.scale(1.1 * scale, 1.1 * scale);
  context.lineJoin = context.lineCap = "round";
  const ring = (back: boolean) => {
    context.strokeStyle = color;
    context.lineWidth = 0.035;
    context.beginPath();
    context.ellipse(
      0,
      0,
      0.25,
      0.07,
      -0.35,
      back ? Math.PI : 0,
      back ? 2 * Math.PI : Math.PI,
    );
    context.stroke();
  };
  ring(true);
  context.fillStyle = color;
  context.strokeStyle = TAG_INK;
  context.lineWidth = 0.03;
  context.beginPath();
  context.arc(0, 0, 0.16, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  ring(false);
  context.fillStyle = context.strokeStyle = TAG_INK;
  if (sign === "exclamation") {
    context.beginPath();
    context.roundRect(-0.026, -0.11, 0.052, 0.12, 0.026);
    context.arc(0, 0.065, 0.03, 0, 2 * Math.PI);
    context.fill();
  } else if (sign === "question") {
    context.font = `900 0.24px -apple-system, "Helvetica Neue", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("?", 0, 0.01);
  } else if (sign === "lines") {
    context.lineWidth = 0.036;
    for (const dy of [-0.055, 0, 0.055]) {
      context.beginPath();
      context.moveTo(-0.075, dy);
      context.lineTo(0.075, dy);
      context.stroke();
    }
  } else if (sign === "cross") {
    context.lineWidth = 0.045;
    context.beginPath();
    context.moveTo(-0.065, -0.065);
    context.lineTo(0.065, 0.065);
    context.moveTo(0.065, -0.065);
    context.lineTo(-0.065, 0.065);
    context.stroke();
  } else if (sign === "hourglass") {
    context.lineWidth = 0.03;
    context.beginPath();
    context.moveTo(-0.06, -0.08);
    context.lineTo(0.06, -0.08);
    context.lineTo(-0.06, 0.08);
    context.lineTo(0.06, 0.08);
    context.closePath();
    context.stroke();
  }
  context.restore();
}
/** Its sky over the body and its shadow behind it. */
export function paintFloat(
  context: CanvasRenderingContext2D,
  sky: FloatSky,
  pose: BotPose,
  strength: number,
) {
  paintSky(context, sky, strength);
  groundShadow(context, pose, strength);
}
