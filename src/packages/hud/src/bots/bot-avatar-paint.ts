import type { BotForm } from "./bot-form";
import type { BotMotion } from "./bot-motion";
import type { BotSign } from "./bot-state";

/** Hermes' portrait: its glow, standby glint, lids, badge and prop, in mark shares. */
const STICKER_INK = "#ffffff",
  AVATAR_BLUE = "#3370ff",
  AVATAR_GREEN = "#19a974",
  AVATAR_ORANGE = "#ff8a00",
  AVATAR_RED = "#e5484d",
  AVATAR_INDIGO = "#6e56cf",
  AVATAR_YELLOW = "#ffc53d",
  AVATAR_SLATE = "#34373c";
const GLOWS: Record<NonNullable<BotMotion["glow"]>, string> = {
  news: AVATAR_BLUE,
  busy: AVATAR_BLUE,
  ask: AVATAR_ORANGE,
  done: AVATAR_GREEN,
  fail: AVATAR_RED,
};
const tinted = (hex: string, alpha: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;
/** A portrait drawn as itself: lids close over its own eyes, and a prop sits beside it. */
export function drawAvatar(
  context: CanvasRenderingContext2D,
  form: BotForm,
  motion: BotMotion,
) {
  if (motion.glow && motion.glowLevel > 0.02) {
    const color = GLOWS[motion.glow],
      light = context.createRadialGradient(0.5, 0.52, 0.28, 0.5, 0.52, 0.72);
    light.addColorStop(0, tinted(color, 0));
    light.addColorStop(0.35, tinted(color, 0.8 * motion.glowLevel));
    light.addColorStop(1, tinted(color, 0));
    context.fillStyle = light;
    context.beginPath();
    context.arc(0.5, 0.52, 0.72, 0, 2 * Math.PI);
    context.fill();
  }
  context.globalAlpha = motion.shade;
  context.drawImage(form.artwork, 0, 0, 1, 1);
  if (motion.standby) {
    // Standby: every six seconds a glint sweeps diagonally across the ink.
    const sweep = (((motion.clock % 6) + 6) % 6) / 1.3;
    if (sweep < 1) {
      const at = -0.2 + 1.4 * sweep,
        glint = form.light ? "255, 255, 255" : "150, 150, 170",
        sheen = context.createLinearGradient(
          at - 0.2,
          at - 0.2,
          at + 0.2,
          at + 0.2,
        );
      sheen.addColorStop(0, `rgba(${glint}, 0)`);
      sheen.addColorStop(0.5, `rgba(${glint}, 0.8)`);
      sheen.addColorStop(1, `rgba(${glint}, 0)`);
      context.save();
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = sheen;
      context.fillRect(-0.3, -0.3, 1.6, 1.6);
      context.restore();
    }
  }
  const lid = 1 - Math.max(0, Math.min(1, motion.face.open));
  if (lid > 0.04)
    for (const [x, y, rx, ry] of form.spec.avatar!.eyes) {
      const top = y - ry,
        edge = top + 2 * ry * lid;
      context.save();
      context.beginPath();
      context.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
      context.clip();
      context.globalCompositeOperation = "destination-out";
      context.globalAlpha = 1;
      context.fillRect(x - rx, top, 2 * rx, edge - top);
      context.restore();
      const half = rx * Math.sqrt(Math.max(0, 1 - ((edge - y) / ry) ** 2));
      context.strokeStyle = form.ink;
      context.lineWidth = 0.011;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(x - half - 0.006, edge);
      context.quadraticCurveTo(
        x,
        edge + (lid > 0.9 ? 0.012 : 0.003),
        x + half + 0.006,
        edge,
      );
      context.stroke();
    }
  context.globalAlpha = 1;
  if (motion.prop) drawAvatarProp(context, motion.prop, motion.propAge);
  if (motion.sign) drawAvatarBadge(context, motion.sign, motion.clock);
}
/** A sign as a coloured badge on the avatar's top-left corner, big enough to read at strip size. */
function drawAvatarBadge(
  context: CanvasRenderingContext2D,
  sign: BotSign,
  clock: number,
) {
  context.save();
  if (sign === "z") {
    context.fillStyle = AVATAR_INDIGO;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let i = 0; i < 2; i++) {
      const q = ((((clock + i * 1.2) % 2.4) + 2.4) % 2.4) / 2.4;
      context.globalAlpha = Math.sin(Math.PI * q);
      context.font = `800 ${0.24 + 0.12 * q}px -apple-system, "Helvetica Neue", sans-serif`;
      context.fillText("z", 0.12 - 0.14 * q, 0.14 - 0.24 * q);
    }
    context.restore();
    return;
  }
  const asks =
      sign === "exclamation" || sign === "question" || sign === "lines",
    beat = (((clock % 0.8) + 0.8) % 0.8) / 0.8,
    size = asks ? 1 + 0.12 * Math.sin(Math.PI * beat) : 1,
    color =
      sign === "cross"
        ? AVATAR_RED
        : sign === "hourglass"
          ? AVATAR_SLATE
          : sign === "ellipsis"
            ? AVATAR_BLUE
            : AVATAR_ORANGE;
  context.translate(0.04, 0.06);
  context.scale(size, size);
  context.fillStyle = color;
  context.strokeStyle = STICKER_INK;
  context.lineWidth = 0.035;
  context.beginPath();
  context.arc(0, 0, 0.2, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  context.fillStyle = context.strokeStyle = STICKER_INK;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (sign === "exclamation") {
    context.beginPath();
    context.roundRect(-0.03, -0.13, 0.06, 0.15, 0.03);
    context.arc(0, 0.085, 0.035, 0, 2 * Math.PI);
    context.fill();
  } else if (sign === "question") {
    context.font = `900 0.3px -apple-system, "Helvetica Neue", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("?", 0, 0.015);
  } else if (sign === "lines") {
    context.lineWidth = 0.045;
    for (const y of [-0.07, 0, 0.07]) {
      context.beginPath();
      context.moveTo(-0.09, y);
      context.lineTo(0.09, y);
      context.stroke();
    }
  } else if (sign === "cross") {
    context.lineWidth = 0.055;
    context.beginPath();
    context.moveTo(-0.08, -0.08);
    context.lineTo(0.08, 0.08);
    context.moveTo(0.08, -0.08);
    context.lineTo(-0.08, 0.08);
    context.stroke();
  } else if (sign === "hourglass") {
    // Out of quota reads as an empty battery: a white shell, one red bar blinking.
    context.lineWidth = 0.03;
    context.beginPath();
    context.roundRect(-0.12, -0.07, 0.21, 0.14, 0.03);
    context.stroke();
    context.beginPath();
    context.roundRect(0.1, -0.035, 0.035, 0.07, 0.012);
    context.fill();
    if (beat < 0.6) {
      context.fillStyle = AVATAR_RED;
      context.beginPath();
      context.roundRect(-0.095, -0.045, 0.045, 0.09, 0.012);
      context.fill();
    }
  } else
    for (const x of [-0.08, 0, 0.08]) {
      context.beginPath();
      context.arc(x, 0, 0.03, 0, 2 * Math.PI);
      context.fill();
    }
  context.restore();
}
function drawAvatarProp(
  context: CanvasRenderingContext2D,
  prop: NonNullable<BotMotion["prop"]>,
  age: number,
) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v)),
    swing = (v: number) => Math.sin(Math.PI * clamp(v));
  context.save();
  context.fillStyle = prop === "sent" ? AVATAR_GREEN : AVATAR_BLUE;
  context.strokeStyle = STICKER_INK;
  context.lineWidth = 0.03;
  context.lineJoin = context.lineCap = "round";
  if (prop === "hello") {
    const pop = age < 0.3 ? 0.6 + 0.6 * swing(age / 0.6) : 1,
      fade = age > 1.4 ? 1 - (age - 1.4) / 0.4 : 1;
    context.globalAlpha = clamp(fade);
    context.translate(0.04, 0.06);
    context.scale(pop, pop);
    context.fillStyle = AVATAR_YELLOW;
    context.beginPath();
    context.arc(0, 0, 0.2, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 0.035;
    context.stroke();
    context.fillStyle = "#3a2a00";
    context.font = `900 0.19px -apple-system, "Helvetica Neue", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Hi", 0, 0.012);
  } else if (prop === "letter") {
    const pop = 1 + 0.25 * swing(age / 0.5),
      w = 0.4 * pop,
      h = 0.28 * pop,
      x = 0.06 - w / 2,
      y = 0.06 - h / 2 - 0.08 * swing(age / 0.6);
    context.globalAlpha = clamp(age / 0.35);
    context.beginPath();
    context.rect(x, y, w, h);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + w / 2, y + h * 0.58);
    context.lineTo(x + w, y);
    context.stroke();
    context.fillStyle = AVATAR_RED;
    context.beginPath();
    context.arc(x + w, y, 0.06, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
  } else {
    const w = 0.5,
      h = 0.3,
      x = -0.21,
      y = -0.1;
    if (prop === "sent") {
      const q = clamp(age / 1.6),
        rise = q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2;
      context.globalAlpha = 1 - q;
      context.translate(0, -0.18 * rise);
    }
    context.beginPath();
    context.roundRect(x, y, w, h, h * 0.45);
    context.moveTo(x + w * 0.62, y + h);
    context.lineTo(x + w * 0.8, y + h * 1.4);
    context.lineTo(x + w * 0.8, y + h);
    context.fill();
    context.stroke();
    context.fillStyle = STICKER_INK;
    if (prop === "sent") {
      context.lineWidth = 0.05;
      context.beginPath();
      context.moveTo(x + w * 0.32, y + h * 0.52);
      context.lineTo(x + w * 0.46, y + h * 0.7);
      context.lineTo(x + w * 0.7, y + h * 0.3);
      context.stroke();
    } else
      for (let i = 0; i < 3; i++) {
        const beat = (((age * 2.2 - i * 0.18) % 1) + 1) % 1,
          hop = swing(beat / 0.5);
        context.beginPath();
        context.arc(
          x + w * (0.28 + 0.22 * i),
          y + h * 0.5 - hop * h * 0.2,
          0.035,
          0,
          2 * Math.PI,
        );
        context.fill();
      }
  }
  context.restore();
}
