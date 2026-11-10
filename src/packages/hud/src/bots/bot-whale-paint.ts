import type { BotSign } from "./bot-state";
import {
  BLOWHOLE,
  leafTip,
  type WhaleFish,
  type WhaleWater,
} from "./bot-whale-water";

/** The whale's water and tag, in mark shares; sized up so they read on a 31 px stub. */
const SEA_INK = "#2f49d8",
  BUBBLE_FILL = "rgba(226, 234, 255, 0.86)",
  SPOUT = "#36aefc",
  SPOUT_EDGE = "#1576d8",
  CHOKED = "#9aa0ad",
  CHOKED_EDGE = "#5d6370",
  WAVE = "#5b74f0",
  FISH = "#ffc21a",
  FISH_EDGE = "#a86b00",
  TAG_ASK = "#ff8a00",
  TAG_FAIL = "#e5484d",
  TAG_LIMIT = "#7b5cd6",
  TAG_INK = "#ffffff";
const hairOf = (context: CanvasRenderingContext2D) => {
  const unit = context.getTransform();
  return 1 / Math.max(1, Math.hypot(unit.a, unit.b));
};
/** Spout, drops, bubbles and wave lines round the body. */
export function paintWater(
  context: CanvasRenderingContext2D,
  water: WhaleWater,
  strength: number,
) {
  const hair = hairOf(context),
    line = Math.max(0.024, 1.3 * hair),
    fill = water.choked ? CHOKED : SPOUT,
    edge = water.choked ? CHOKED_EDGE : SPOUT_EDGE;
  context.save();
  context.lineCap = context.lineJoin = "round";
  context.lineWidth = line;
  if (water.jet && water.jet.height > 0.01) {
    // A column with two leaves curling out of its top, drawn as one thick
    // line twice: the edge colour wide, the water colour inside it.
    const [x, y] = BLOWHOLE,
      { height, spread } = water.jet,
      top = y - height,
      path = new Path2D();
    path.moveTo(x, y + 0.02);
    path.lineTo(x, top);
    if (spread > 0.02)
      for (const side of [-1, 1]) {
        const [tx, ty] = leafTip(height, spread, side);
        path.moveTo(x, top);
        path.quadraticCurveTo(
          x + side * 0.1 * spread,
          top - 0.09 * spread,
          tx,
          ty,
        );
      }
    const thick = Math.max(0.075, 2.6 * hair);
    context.globalAlpha = water.jet.alpha * strength;
    context.strokeStyle = edge;
    context.lineWidth = thick + 2 * line;
    context.stroke(path);
    context.strokeStyle = fill;
    context.lineWidth = thick;
    context.stroke(path);
    context.lineWidth = line;
  }
  for (const drop of water.drops) {
    context.globalAlpha = drop.alpha * strength;
    context.fillStyle = fill;
    context.strokeStyle = edge;
    context.beginPath();
    context.arc(drop.x, drop.y, drop.r, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
  }
  for (const bubble of water.bubbles) {
    context.globalAlpha = bubble.alpha * strength;
    context.fillStyle = BUBBLE_FILL;
    context.strokeStyle = SEA_INK;
    context.beginPath();
    context.arc(bubble.x, bubble.y, bubble.r, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    if (bubble.r > 0.055) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = Math.max(0.016, hair);
      context.beginPath();
      context.arc(bubble.x, bubble.y, bubble.r * 0.6, -2.7, -1.75);
      context.stroke();
      context.lineWidth = line;
    }
  }
  if (water.ring) {
    // A ring of air seen a little from above: a deep edge round a pale band.
    const ring = water.ring;
    context.globalAlpha = ring.alpha * strength;
    context.beginPath();
    context.ellipse(ring.x, ring.y, ring.r, ring.r * 0.5, 0, 0, 2 * Math.PI);
    context.strokeStyle = SEA_INK;
    context.lineWidth = Math.max(0.05, 2.4 * hair) + 2 * line;
    context.stroke();
    context.strokeStyle = BUBBLE_FILL;
    context.lineWidth = Math.max(0.05, 2.4 * hair);
    context.stroke();
    context.lineWidth = line;
  }
  if (water.fish) fish(context, water.fish, line, strength);
  context.strokeStyle = WAVE;
  context.lineWidth = Math.max(0.03, 1.5 * hair);
  for (const wave of water.waves) {
    context.globalAlpha = wave.alpha * strength;
    context.beginPath();
    context.moveTo(wave.x - 0.05 * wave.side, wave.y - 0.025);
    context.quadraticCurveTo(
      wave.x,
      wave.y + 0.03,
      wave.x + 0.06 * wave.side,
      wave.y - 0.01,
    );
    context.stroke();
  }
  context.restore();
}
/** A little yellow fish facing `dir`: an oval body, a forked tail, one dark eye. */
function fish(
  context: CanvasRenderingContext2D,
  at: WhaleFish,
  line: number,
  strength: number,
) {
  context.save();
  context.globalAlpha = strength;
  context.translate(at.x, at.y);
  context.scale(at.dir * at.size, at.size);
  context.fillStyle = FISH;
  context.strokeStyle = FISH_EDGE;
  context.lineWidth = line;
  context.beginPath();
  context.ellipse(0.01, 0, 0.075, 0.048, 0, 0, 2 * Math.PI);
  context.moveTo(-0.055, 0);
  context.lineTo(-0.115, -0.045);
  context.lineTo(-0.1, 0);
  context.lineTo(-0.115, 0.045);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#2a1a00";
  context.beginPath();
  context.arc(0.045, -0.01, Math.max(0.012, line * 0.6), 0, 2 * Math.PI);
  context.fill();
  context.restore();
}
/**
 * A sign as a coloured water droplet on the whale's top left, clear of its
 * face and its top fin: orange when it asks, red on a failure, violet when
 * out of quota.
 */
export function whaleTag(
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
  context.translate(0.02, 0.22);
  context.scale(1.25 * scale, 1.25 * scale);
  context.fillStyle = color;
  context.strokeStyle = TAG_INK;
  context.lineWidth = 0.035;
  context.lineJoin = context.lineCap = "round";
  // A drop: round below, drawn up to a point.
  context.beginPath();
  context.moveTo(0, -0.27);
  context.bezierCurveTo(0.06, -0.17, 0.17, -0.08, 0.17, 0.02);
  context.arc(0, 0.02, 0.17, 0, Math.PI);
  context.bezierCurveTo(-0.17, -0.08, -0.06, -0.17, 0, -0.27);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = context.strokeStyle = TAG_INK;
  const cy = 0.02;
  if (sign === "exclamation") {
    context.beginPath();
    context.roundRect(-0.028, cy - 0.12, 0.056, 0.13, 0.028);
    context.arc(0, cy + 0.075, 0.032, 0, 2 * Math.PI);
    context.fill();
  } else if (sign === "question") {
    context.font = `900 0.26px -apple-system, "Helvetica Neue", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("?", 0, cy + 0.01);
  } else if (sign === "lines") {
    context.lineWidth = 0.04;
    for (const dy of [-0.06, 0, 0.06]) {
      context.beginPath();
      context.moveTo(-0.08, cy + dy);
      context.lineTo(0.08, cy + dy);
      context.stroke();
    }
  } else if (sign === "cross") {
    context.lineWidth = 0.05;
    context.beginPath();
    context.moveTo(-0.07, cy - 0.07);
    context.lineTo(0.07, cy + 0.07);
    context.moveTo(0.07, cy - 0.07);
    context.lineTo(-0.07, cy + 0.07);
    context.stroke();
  } else if (sign === "hourglass") {
    context.lineWidth = 0.032;
    context.beginPath();
    context.moveTo(-0.065, cy - 0.085);
    context.lineTo(0.065, cy - 0.085);
    context.lineTo(-0.065, cy + 0.085);
    context.lineTo(0.065, cy + 0.085);
    context.closePath();
    context.stroke();
  }
  context.restore();
}
