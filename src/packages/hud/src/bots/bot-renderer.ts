import { formOutline, type BotForm } from "./bot-form";
import type { BotSpec, Box, Point, Paint, Decor } from "./bot-spec";
import {
  BotMotion,
  botFace,
  botLimbs,
  type BotFace,
  type BotLimbs,
  type BotFlap,
  type BotPose,
} from "./bot-motion";
import { easeInOut } from "./bot-moves";
import type { BotSign } from "./bot-state";
import { finPath, finSilhouette } from "./bot-fins";
import { paintSign, signBox } from "./bot-signs";
import { layHairline } from "./bot-hairline";
import { BotStill } from "./bot-still";
import {
  cloudShapeKey,
  type CloudMist,
  type CloudShape,
  type CloudSnot,
} from "./bot-cloud";
import { borrowCanvas, giveBack, reuseCanvas } from "./scratch";
const margin = 0.3,
  ink = "#0d0d0f",
  box: Box = [0, 0, 1, 1];
const cut = (form: BotForm) => (form.light ? "#f5f5f7" : ink);
const rectWidth = (b: Box) => b[2] - b[0],
  rectHeight = (b: Box) => b[3] - b[1];
function roundBox(path: Path2D, b: Box, round: number) {
  path.roundRect(
    b[0],
    b[1],
    rectWidth(b),
    rectHeight(b),
    (Math.min(rectWidth(b), rectHeight(b)) / 2) * round,
  );
}
function boxesPath(boxes: readonly Box[], round = 0) {
  const path = new Path2D();
  for (const box of boxes) roundBox(path, box, round);
  return path;
}
function group(
  context: CanvasRenderingContext2D,
  alpha: number,
  draw: (c: CanvasRenderingContext2D) => void,
  operation: GlobalCompositeOperation = "source-over",
) {
  const { canvas, context: c } = borrowCanvas(
    context.canvas.width,
    context.canvas.height,
  );
  try {
    c.setTransform(context.getTransform());
    draw(c);
    context.save();
    context.resetTransform();
    context.globalAlpha = alpha;
    context.globalCompositeOperation = operation;
    context.drawImage(canvas, 0, 0);
    context.restore();
  } finally {
    giveBack(canvas);
  }
}
export function applyBotPose(
  context: CanvasRenderingContext2D,
  pose: BotPose,
  side = 1,
) {
  const foot = pose.footing * side;
  context.translate(pose.x * side, pose.y * side + foot);
  context.rotate((pose.rotation * Math.PI) / 180);
  context.scale(pose.scaleX, pose.scaleY);
  context.translate(0, -foot);
}
export function botRenderLook(motion: BotMotion) {
  const f = motion.face,
    s = (v: number, steps: number) => Math.round(v * steps);
  return JSON.stringify([
    s(motion.morph, 60),
    s(motion.turn, 0.5),
    s(f.open, 40),
    s(f.look, 50),
    s(f.lookY, 50),
    s(f.wide, 50),
    s(f.happy, 30),
    s(f.lean, 30),
    s(f.crossed, 30),
    s(motion.kept.lift, 300),
    s(motion.kept.scale, 60),
    s(motion.petal, 60),
    s(motion.dim, 20),
    s(motion.gray, 40),
    cloudShapeKey(motion.shape),
    motion.puffs,
    motion.drops.map((d) => [s(d.x, 200), s(d.y, 200), s(d.alpha, 20)]),
    motion.bolt,
    motion.snot,
    motion.lids,
    s(motion.haze, 40),
    motion.mist.map((band) => [s(band.x, 200), s(band.alpha, 20)]),
    motion.signUpright ? s(motion.pose.rotation, 2) : 0,
    motion.ring === null ? -1 : s(motion.ring, 120),
    motion.prop,
    motion.prop ? s(motion.propAge, 24) : 0,
    motion.glow,
    s(motion.glowLevel, 30),
    motion.avatar ? s(motion.clock, 12) : 0,
    motion.standby,
    s(motion.shade, 40),
    motion.limbs,
    motion.flap,
    motion.sign,
    motion.lit,
    motion.helper,
  ]);
}
function fillPaint(
  context: CanvasRenderingContext2D,
  form: BotForm,
  paint?: Paint,
  origin: Point = [0, 0],
) {
  const s = form.spec,
    at = (point: Point): Point => [
      origin[0] + s.center[0] + (point[0] - 0.5) * 2 * s.radius,
      origin[1] + s.center[1] + (point[1] - 0.5) * 2 * s.radius,
    ];
  if (!paint) {
    if (form.field)
      context.drawImage(
        form.field,
        origin[0] - 0.25,
        origin[1] - 0.25,
        1.5,
        1.5,
      );
    else {
      context.fillStyle = form.ink;
      context.fillRect(origin[0] - 0.3, origin[1] - 0.3, 1.6, 1.6);
    }
    return;
  }
  if (typeof paint === "string") context.fillStyle = paint;
  else {
    const gradient =
      "center" in paint
        ? context.createRadialGradient(
            ...at(paint.center),
            paint.inner * 2 * s.radius,
            ...at(paint.center),
            paint.outer * 2 * s.radius,
          )
        : context.createLinearGradient(...at(paint.from), ...at(paint.to));
    if (paint.colors.length < 2) return;
    paint.colors.forEach((color, i) =>
      gradient.addColorStop(i / (paint.colors.length - 1), color),
    );
    context.fillStyle = gradient;
  }
  context.fillRect(origin[0] - 0.3, origin[1] - 0.3, 1.6, 1.6);
}
function decorate(
  context: CanvasRenderingContext2D,
  item: Decor,
  s: BotSpec,
  offset: Point,
  strength: number,
) {
  context.save();
  context.translate(s.center[0] + offset[0], s.center[1] + offset[1]);
  context.scale(s.radius, s.radius);
  context.globalAlpha = strength;
  if (item.kind === "blocks") {
    context.fillStyle = item.color;
    context.fill(boxesPath(item.boxes));
  } else if (item.kind === "cut") {
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "#000";
    context.fill(boxesPath(item.boxes));
  } else if (item.kind === "notch" || item.kind === "line") {
    const p = new Path2D();
    item.points.forEach((point, i) =>
      i ? p.lineTo(...point) : p.moveTo(...point),
    );
    if (item.kind === "notch") {
      p.closePath();
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "#000";
      context.fill(p);
    } else {
      context.strokeStyle = ink;
      context.lineWidth = item.width;
      context.lineJoin = context.lineCap = "round";
      context.stroke(p);
    }
  }
  context.restore();
}
function wear(
  context: CanvasRenderingContext2D,
  s: BotSpec,
  outline: Path2D,
  strength: number,
) {
  for (const item of s.decor ?? [])
    if (item.kind === "soft") {
      context.save();
      context.clip(outline);
      context.translate(...s.center);
      context.scale(s.radius, s.radius);
      context.globalAlpha = strength;
      context.fillStyle = item.color;
      context.fill(boxesPath(item.boxes, item.round ?? 0));
      context.restore();
    }
}
function ringPath(s: BotSpec, grown: number, near: boolean) {
  const ring = s.ring!,
    p = new Path2D(),
    r = s.radius,
    size = 0.5 + 0.5 * grown,
    tilt = (ring.tilt * Math.PI) / 180,
    sweep = near ? Math.PI : 2 * Math.PI;
  for (let step = 0; step <= 48; step++) {
    const a = (sweep * step) / 48,
      x = ring.radiusX * r * size * Math.cos(a),
      y = ring.radiusY * r * size * Math.sin(a),
      point: Point = [
        s.center[0] + x * Math.cos(tilt) - y * Math.sin(tilt),
        s.center[1] + ring.drop * r + x * Math.sin(tilt) + y * Math.cos(tilt),
      ];
    if (step) p.lineTo(...point);
    else p.moveTo(...point);
  }
  if (!near) p.closePath();
  return p;
}
function spinner(path: Path2D, frame: number, center: Point, size: number) {
  const [spokes, length, width] = [
    [0, 0.24, 0.24],
    [4, 0.55, 0.2],
    [4, 0.85, 0.22],
    [6, 0.9, 0.2],
    [8, 1, 0.2],
    [8, 1, 0.28],
  ][Math.max(0, Math.min(5, frame - 1))];
  if (!spokes) {
    path.rect(
      center[0] - (length * size) / 2,
      center[1] - (length * size) / 2,
      length * size,
      length * size,
    );
    return;
  }
  for (let i = 0; i < spokes; i++) {
    const p = new Path2D(),
      w = width * size;
    p.roundRect(-w / 2, -w / 2, length * size + w, w, w / 2);
    path.addPath(
      p,
      new DOMMatrix().translate(...center).rotate(-90 + (i * 360) / spokes),
    );
  }
}
function drawLimbs(
  context: CanvasRenderingContext2D,
  form: BotForm,
  stance: BotLimbs,
  strength: number,
) {
  const s = form.spec,
    limbs = s.limbs;
  if (!limbs) return;
  const pieces: Box[] = [],
    step = limbs.pixel;
  for (const arm of limbs.arms) {
    const out = (arm[0] + arm[2]) / 2 < 0 ? -1 : 1,
      raised = out < 0 ? stance.left : stance.right,
      y = raised > 0 ? -step : 0;
    pieces.push([arm[0], arm[1] + y, arm[2], arm[3] + y]);
    if (raised > 1)
      pieces.push([
        arm[0] + out * rectWidth(arm),
        arm[1] - 2 * step,
        arm[2] + out * rectWidth(arm),
        arm[3] - 2 * step,
      ]);
  }
  limbs.legs.forEach((leg, i) => {
    const lifted =
        stance.lifted === 3 ||
        (stance.lifted > 0 && i % 2 === stance.lifted - 1),
      y = lifted ? -step / 2 : 0;
    pieces.push([leg[0], leg[1] + y, leg[2], leg[3] + y]);
  });
  const local = boxesPath(pieces);
  if (stance.spinner > 0)
    spinner(local, stance.spinner, [2.2 * step, -1 - 1.5 * step], 0.75 * step);
  const p = new Path2D();
  p.addPath(local, new DOMMatrix().translate(...s.center).scale(s.radius));
  context.save();
  context.clip(p);
  context.globalAlpha = strength;
  fillPaint(context, form, s.paint);
  context.restore();
}
function smile(
  context: CanvasRenderingContext2D,
  half: number,
  stroke: number,
  paint: string,
  strength: number,
) {
  const rise = half * 0.95;
  context.globalAlpha = strength;
  context.strokeStyle = paint;
  context.lineWidth = stroke;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-half, rise * 0.45);
  context.quadraticCurveTo(0, -rise * 1.1, half, rise * 0.45);
  context.stroke();
}
function pill(width: number, height: number, round: number) {
  const p = new Path2D(),
    corner = (Math.min(width, height) / 2) * round;
  if (corner > 0.0005)
    p.roundRect(-width / 2, -height / 2, width, height, corner);
  else p.rect(-width / 2, -height / 2, width, height);
  return p;
}
function eyes(
  context: CanvasRenderingContext2D,
  s: BotSpec,
  face: BotFace,
  yaw: number,
  pitch: number,
  awake: number,
  lids: "curve" | "bar" | null = null,
) {
  const unit = context.getTransform(),
    hair = 1 / Math.max(1, Math.hypot(unit.a, unit.b));
  const r = s.radius,
    size = 0.78,
    spread = s.eye.spread,
    flat = s.eye.across,
    grain = s.limbs ? s.limbs.pixel / 2 : null,
    snapped = (v: number) =>
      grain && grain > 0 ? Math.round(v / grain) * grain : v,
    paint = s.eyeColor ?? ink,
    apart =
      flat !== undefined
        ? 2 * flat * r
        : (Math.sin(yaw + spread) - Math.sin(yaw - spread)) * r * 0.76;
  for (const side of [-1, 1]) {
    const angle = flat === undefined ? yaw + side * spread : 0,
      x =
        s.center[0] +
        s.face[0] * r +
        (flat !== undefined
          ? side * flat * r + snapped(Math.sin(yaw) * 0.76) * r
          : Math.sin(angle) * r * 0.76),
      y =
        s.center[1] +
        s.face[1] * r +
        (flat === undefined
          ? Math.sin(pitch) * 0.62
          : snapped(Math.sin(pitch) * 0.62)) *
          r,
      narrow = Math.max(0.25, Math.cos(angle)) ** 1.4,
      tall = (0.72 + 0.28 * Math.cos(angle)) * Math.sqrt(Math.cos(pitch)),
      big =
        (1 + 0.26 * side * face.lean) * face.wide * (0.6 + 0.4 * awake) * size,
      width = s.eye.width * r * big * narrow,
      height =
        s.eye.height * r * big * tall * Math.max(0.08, face.open) * awake;
    context.save();
    context.translate(x, y);
    if (lids && face.open < 0.3) {
      // Asleep: closed eyes a little wider than the open ones, so the face
      // stays as full as when awake; a cloud's curve down, a flower's bar.
      const eye = s.eye.width * r * size;
      context.globalAlpha = awake;
      context.strokeStyle = paint;
      context.lineCap = "round";
      context.beginPath();
      if (lids === "curve") {
        const w = 0.92 * eye,
          d = 0.7 * eye;
        context.lineWidth = Math.max(0.5 * eye, 1.25 * hair);
        context.moveTo(-w, -d * 0.35);
        context.quadraticCurveTo(0, d * 1.25, w, -d * 0.35);
      } else {
        context.lineWidth = Math.max(0.55 * eye, 1.3 * hair);
        context.moveTo(-0.85 * eye, 0.01);
        context.lineTo(0.85 * eye, 0.01);
      }
      context.stroke();
      context.restore();
      continue;
    }
    if (face.happy < 0.98 && face.crossed < 0.98) {
      context.globalAlpha = (1 - face.happy) * (1 - face.crossed);
      context.fillStyle = paint;
      context.fill(pill(width, Math.max(height, width * 0.16), s.eye.round));
      if (s.pupil && height > width * 0.45) {
        context.fillStyle = s.pupil;
        const across = width * 0.21,
          down = Math.min(height, width) * 0.21;
        context.beginPath();
        context.ellipse(
          face.look * width * 0.2,
          face.lookY * height * 0.2 - height * 0.06,
          across,
          down,
          0,
          0,
          2 * Math.PI,
        );
        context.fill();
      }
    }
    if (face.crossed > 0.02) {
      const reach = s.eye.height * r * size * 0.32 * (0.6 + 0.4 * awake);
      context.globalAlpha = face.crossed;
      context.strokeStyle = paint;
      context.lineWidth = s.eye.width * r * size * 0.55;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(-reach, -reach);
      context.lineTo(reach, reach);
      context.moveTo(-reach, reach);
      context.lineTo(reach, -reach);
      context.stroke();
    }
    if (face.happy > 0.02) {
      const stroke = Math.min(s.eye.width * r * 0.58 * size, apart * 0.2),
        half =
          Math.max(
            stroke * 0.7,
            Math.min(s.eye.width * r * 0.8 * size, apart / 2 - stroke * 1.05),
          ) * Math.max(0.6, narrow);
      smile(context, half, stroke, paint, face.happy);
    }
    context.restore();
  }
}
function ownEyes(
  context: CanvasRenderingContext2D,
  boxes: Box[],
  face: BotFace,
  ink: string,
) {
  if (!boxes.length) return;
  const center = (b: Box) => (b[0] + b[2]) / 2,
    middle = (center(boxes[0]) + center(boxes.at(-1)!)) / 2,
    apart = Math.abs(center(boxes.at(-1)!) - center(boxes[0]));
  for (const b of boxes) {
    const side = center(b) > middle ? 1 : -1,
      big = (1 + 0.26 * side * face.lean) * face.wide,
      width = rectWidth(b) * big,
      height = rectHeight(b) * big * Math.max(0.06, face.open);
    context.save();
    context.translate(
      center(b) + Math.min(0.04, rectWidth(b) * 0.45) * face.look,
      (b[1] + b[3]) / 2 + Math.min(0.03, rectHeight(b) * 0.14) * face.lookY,
    );
    if (face.happy < 0.98) {
      context.globalAlpha = 1 - face.happy;
      context.fillStyle = ink;
      context.fill(pill(width, Math.max(height, width * 0.16), 1));
    }
    if (face.happy > 0.02)
      smile(
        context,
        Math.min(rectWidth(b) * 0.95, apart * 0.3),
        Math.min(rectWidth(b) * 0.6, apart * 0.2),
        ink,
        face.happy,
      );
    context.restore();
  }
}
interface Morph {
  share: number;
  eased: number;
  solid: number;
  dressed: number;
}
const morph = (share: number): Morph => ({
  share,
  eased: easeInOut(share),
  solid: Math.min(1, share / 0.22),
  dressed: Math.max(0, Math.min(1, (share - 0.45) / 0.45)),
});
function stillPart(
  context: CanvasRenderingContext2D,
  form: BotForm,
  m: Morph,
  turn: number,
  decor: number,
  helper = false,
  flap: BotFlap = { left: 0, right: 0 },
  petal = 1,
  dim = 0,
  gray = 0,
  cloud: CloudShape | null = null,
) {
  const s = form.spec,
    [cx, cy] = s.center,
    r = s.radius,
    artwork = 1 - Math.min(1, m.share / 0.4);
  if (artwork > 0) {
    context.globalAlpha = artwork;
    context.drawImage(form.artwork, 0, 0, 1, 1);
  }
  context.translate(0, (s.settle ?? 0) * m.eased);
  const path = formOutline(form, m.eased, turn, petal, cloud),
    ringShare = s.ring ? Math.max(0, Math.min(1, (m.share - 0.5) / 0.5)) : 0;
  if (s.ring && ringShare > 0) {
    context.globalAlpha = ringShare;
    context.strokeStyle = form.ink;
    context.lineWidth = s.ring.width * r;
    context.lineCap = "round";
    context.stroke(ringPath(s, ringShare, false));
  }
  for (const item of s.decor ?? [])
    if (m.dressed > 0 && (item.kind === "feelers" || item.kind === "fins")) {
      context.save();
      context.translate(cx, cy);
      context.scale(r, r);
      context.globalAlpha = m.dressed;
      if (item.kind === "feelers") {
        context.strokeStyle = item.color;
        context.lineWidth = item.width;
        context.lineJoin = context.lineCap = "round";
        context.beginPath();
        for (const line of item.lines)
          line.forEach((p, i) =>
            i ? context.lineTo(...p) : context.moveTo(...p),
          );
        context.stroke();
      } else {
        context.fillStyle = item.color;
        const p = new Path2D(),
          grown = 0.3 + 0.7 * m.dressed;
        for (const fin of item.fins)
          p.addPath(
            finPath(
              fin,
              grown,
              fin.hand < 0 ? flap.left : fin.hand > 0 ? flap.right : 0,
            ),
          );
        context.fill(p);
      }
      context.restore();
    }
  context.globalAlpha = m.solid;
  context.save();
  context.clip(path);
  fillPaint(context, form, s.paint);
  if (s.patch) {
    const b = s.patch.box,
      width = rectWidth(b) * r,
      height = rectHeight(b) * r,
      corner = Math.min(s.patch.round * r, Math.min(width, height) / 2),
      px = cx + ((b[0] + b[2]) / 2) * r,
      py = cy + ((b[1] + b[3]) / 2) * r;
    context.save();
    context.translate(px, py);
    context.scale(0.4 + 0.6 * m.eased, 0.4 + 0.6 * m.eased);
    context.globalAlpha =
      m.solid * Math.max(0, Math.min(1, (m.share - 0.2) / 0.4));
    const p = new Path2D();
    p.roundRect(-width / 2, -height / 2, width, height, corner);
    context.clip(p);
    fillPaint(context, form, s.patch.paint, [-px, -py]);
    context.restore();
  }
  if (s.stroke) {
    context.strokeStyle = s.stroke;
    context.lineWidth = 0.07;
    context.lineJoin = "round";
    context.stroke(path);
  }
  if (dim > 0) {
    context.fillStyle = `rgba(0, 0, 0, ${0.38 * dim})`;
    context.fillRect(-0.3, -0.3, 1.6, 1.6);
  }
  if (gray > 0) overcast(context, gray);
  context.restore();
  if (s.ring && ringShare > 0) {
    context.save();
    context.clip(path);
    context.globalAlpha = ringShare;
    context.strokeStyle = cut(form);
    context.lineWidth = s.ring.width * r;
    context.lineCap = "butt";
    context.stroke(ringPath(s, ringShare, true));
    context.restore();
  }
  if (!s.keeps && m.dressed > 0) {
    wear(context, s, path, m.dressed);
    for (const item of (s.decor ?? []).slice(0, decor))
      decorate(context, item, s, [0, 0], m.dressed);
  }
  if (helper && m.dressed > 0) drawHelper(context, form, m.dressed);
}
function drawHelper(
  context: CanvasRenderingContext2D,
  form: BotForm,
  strength: number,
) {
  const s = form.spec,
    scale = 0.4;
  context.save();
  context.translate(s.center[0] + 0.42, s.center[1] + 0.18);
  context.scale(scale, scale);
  context.translate(-s.center[0], -s.center[1]);
  context.globalAlpha = strength;
  if (s.ownEyes) {
    context.save();
    context.translate(0.5, 0.5);
    context.scale(1 + (0.035 * 2) / scale, 1 + (0.035 * 2) / scale);
    context.translate(-0.5, -0.5);
    context.globalCompositeOperation = "destination-out";
    context.drawImage(form.artwork, 0, 0, 1, 1);
    context.restore();
    context.drawImage(form.artwork, 0, 0, 1, 1);
  } else {
    const path = formOutline(form, 1, 0);
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = "#000";
    context.lineWidth = (0.035 * 2) / scale;
    context.lineJoin = "round";
    const gap = new Path2D();
    gap.addPath(path);
    const fins = finSilhouette(s);
    if (fins) gap.addPath(fins);
    context.stroke(gap);
    context.restore();
    group(context, strength, (c) => {
      c.save();
      stillPart(c, form, morph(1), 0, (s.decor ?? []).length);
      c.restore();
      drawLimbs(c, form, botLimbs(), 1);
      eyes(c, s, botFace(), 0, 0, 1);
    });
  }
  context.restore();
}
/** A storm cloud: the paint loses its colour and darkens a little. */
function overcast(context: CanvasRenderingContext2D, gray: number) {
  context.save();
  context.globalCompositeOperation = "saturation";
  context.fillStyle = `rgba(128, 128, 128, ${Math.min(1, gray)})`;
  context.fillRect(-0.3, -0.3, 1.6, 1.6);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = `rgba(30, 32, 44, ${0.3 * gray})`;
  context.fillRect(-0.3, -0.3, 1.6, 1.6);
  context.restore();
}
/** Rain, lightning and small puffs around a cloud bot, puffs in its own paint. */
function weather(
  context: CanvasRenderingContext2D,
  form: BotForm,
  motion: BotMotion,
  strength: number,
) {
  if (motion.drops.length) {
    context.save();
    context.strokeStyle = form.light ? "#4f5fe8" : "#9aa8ff";
    context.lineWidth = 0.03;
    context.lineCap = "round";
    for (const drop of motion.drops) {
      context.globalAlpha = drop.alpha * strength;
      context.beginPath();
      context.moveTo(drop.x, drop.y);
      context.lineTo(drop.x - 0.012, drop.y + drop.length);
      context.stroke();
    }
    context.restore();
  }
  if (motion.bolt > 0) {
    context.save();
    context.globalAlpha = motion.bolt * strength;
    context.fillStyle = "#ffcc33";
    context.beginPath();
    for (const [x, y] of [
      [0.53, 0.74],
      [0.44, 0.9],
      [0.5, 0.9],
      [0.45, 1.06],
      [0.6, 0.86],
      [0.53, 0.86],
      [0.58, 0.74],
    ])
      context.lineTo(x, y);
    context.closePath();
    context.fill();
    context.restore();
  }
  for (const puff of motion.puffs) {
    const p = new Path2D();
    if (puff.mini)
      for (const [dx, dy, k] of [
        [-0.75, 0.25, 0.62],
        [0, -0.1, 0.85],
        [0.75, 0.25, 0.62],
        [0, 0.35, 0.6],
      ]) {
        p.moveTo(puff.x + dx * puff.r + k * puff.r, puff.y + dy * puff.r);
        p.arc(
          puff.x + dx * puff.r,
          puff.y + dy * puff.r,
          k * puff.r,
          0,
          2 * Math.PI,
        );
      }
    else p.arc(puff.x, puff.y, puff.r, 0, 2 * Math.PI);
    context.save();
    context.globalAlpha = puff.alpha * strength;
    if (puff.light) {
      context.fillStyle = form.light ? CLOUD_RING : CLOUD_RING_DARK;
      context.fill(p);
    } else {
      context.clip(p);
      fillPaint(context, form, form.spec.paint);
    }
    if (motion.gray > 0) overcast(context, motion.gray);
    context.restore();
  }
}
/** A ring around the body that fills clockwise from the top, in the body's own paint. */
function progressRing(
  context: CanvasRenderingContext2D,
  form: BotForm,
  share: number,
  strength: number,
) {
  const s = form.spec,
    [cx, cy] = s.center,
    outer = s.radius * 1.4,
    inner = s.radius * 1.2,
    from = -Math.PI / 2,
    band = (to: number) => {
      const p = new Path2D();
      p.arc(cx, cy, outer, from, to);
      p.arc(cx, cy, inner, to, from, true);
      p.closePath();
      return p;
    };
  for (const [to, alpha] of [
    [from + 2 * Math.PI, 0.22],
    [from + 2 * Math.PI * share, 1],
  ] as const) {
    if (to <= from) continue;
    context.save();
    context.globalAlpha = alpha * strength;
    context.clip(band(to));
    fillPaint(context, form, s.paint);
    context.restore();
  }
}
function drawBody(
  context: CanvasRenderingContext2D,
  form: BotForm,
  motion: BotMotion,
  cache: boolean,
) {
  const s = form.spec,
    m = morph(motion.morph),
    decor = s.decor ?? [],
    first = decor.findIndex((item) => item.kind === "blocks" && item.follows),
    settled = s.keeps ? 0 : first < 0 ? decor.length : first,
    still = cache
      ? new BotStill(
          form,
          m.share,
          motion.turn,
          motion.helper,
          motion.flap,
          context,
          motion.petal,
          motion.dim,
          motion.gray,
          cloudShapeKey(motion.shape),
        )
      : null;
  if (!still?.restore()) {
    context.save();
    stillPart(
      context,
      form,
      m,
      motion.turn,
      settled,
      motion.helper,
      motion.flap,
      motion.petal,
      motion.dim,
      motion.gray,
      motion.shape,
    );
    context.restore();
    still?.keep();
  }
  if (s.cloud) {
    if (motion.haze > 0 && m.dressed > 0) {
      context.save();
      context.clip(
        formOutline(form, m.eased, motion.turn, motion.petal, motion.shape),
      );
      context.fillStyle = `rgba(255, 255, 255, ${motion.haze * m.dressed})`;
      context.fillRect(-0.3, -0.3, 1.6, 1.6);
      context.restore();
    }
    if (m.dressed > 0) weather(context, form, motion, m.dressed);
  } else if (motion.ring !== null && m.dressed > 0)
    progressRing(context, form, motion.ring, m.dressed);
  context.translate(0, (s.settle ?? 0) * m.eased);
  if (s.keeps) {
    const b = s.keeps,
      cx = (b[0] + b[2]) / 2,
      cy = (b[1] + b[3]) / 2;
    context.save();
    context.globalAlpha = m.solid;
    context.translate(cx, cy - motion.kept.lift);
    context.scale(motion.kept.scale, motion.kept.scale);
    context.translate(-cx, -cy);
    const p = new Path2D();
    p.rect(b[0] - 0.01, b[1] - 0.01, rectWidth(b) + 0.02, rectHeight(b) + 0.02);
    context.clip(p);
    context.drawImage(form.artwork, 0, 0, 1, 1);
    context.restore();
  }
  if (m.dressed <= 0) return;
  drawLimbs(context, form, motion.limbs, m.dressed);
  const face = motion.face,
    turn = s.reach * 0.72,
    yaw = Math.max(-1.15, Math.min(1.15, face.look)) * turn,
    pitch = Math.max(-1.15, Math.min(1.15, face.lookY)) * turn,
    glance: Point = [
      Math.sin(yaw) * s.radius * 0.72,
      Math.sin(pitch) * s.radius * 0.62,
    ];
  if (s.keeps)
    wear(
      context,
      s,
      formOutline(form, m.eased, motion.turn, motion.petal, motion.shape),
      m.dressed,
    );
  for (const item of decor.slice(settled))
    decorate(
      context,
      item,
      s,
      item.kind === "blocks" && item.follows ? glance : [0, 0],
      m.dressed,
    );
  eyes(context, s, face, yaw, pitch, m.dressed, motion.lids);
  if (motion.snot) snotBubble(context, motion.snot, m.dressed);
  if (motion.mist.length) mistBands(context, motion.mist, m.dressed);
}
/** White bands of mist drifting across a hazy cloud. */
function mistBands(
  context: CanvasRenderingContext2D,
  mist: readonly CloudMist[],
  strength: number,
) {
  const unit = context.getTransform(),
    hair = 1 / Math.max(1, Math.hypot(unit.a, unit.b));
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
  context.lineCap = "round";
  context.lineWidth = Math.max(0.045, 1.6 * hair);
  for (const band of mist) {
    context.globalAlpha = band.alpha * strength;
    context.beginPath();
    context.moveTo(band.x - band.length / 2, band.y);
    context.lineTo(band.x + band.length / 2, band.y);
    context.stroke();
  }
  context.restore();
}
/** A small cloud of the given colour, three lumps over a fourth, centred on (x, y). */
function signCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  context.beginPath();
  for (const [dx, dy, k] of [
    [-0.72, 0.18, 0.62],
    [0, -0.12, 0.86],
    [0.72, 0.18, 0.62],
    [0, 0.3, 0.66],
  ]) {
    context.moveTo(x + dx * r + k * r, y + dy * r);
    context.arc(x + dx * r, y + dy * r, k * r, 0, 2 * Math.PI);
  }
  context.fill();
}
/**
 * A cloud bot's own signs, in mark shares: a white glyph on a small deep
 * indigo cloud at the top right, or for thinking a thought bubble whose three
 * dots light in turn. They grey with the body.
 */
function cloudSign(
  context: CanvasRenderingContext2D,
  motion: BotMotion,
  sign: BotSign,
  alpha: number,
) {
  const unit = context.getTransform(),
    hair = 1 / Math.max(1, Math.hypot(unit.a, unit.b)),
    stroke = Math.max(0.034, 1.4 * hair),
    fill = motion.gray > 0.3 ? CLOUD_SIGN_GRAY : CLOUD_SIGN;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = fill;
  if (sign === "ellipsis") {
    for (const [x, y, r] of [
      [0.7, 0.13, 0.026],
      [0.77, 0.04, 0.036],
    ]) {
      context.beginPath();
      context.arc(x, y, Math.max(r, 1.2 * hair), 0, 2 * Math.PI);
      context.fill();
    }
    signCloud(context, 0.9, -0.09, 0.15);
    context.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      context.globalAlpha = alpha * (i === motion.lit ? 1 : 0.45);
      context.beginPath();
      context.arc(
        0.84 + 0.06 * i,
        -0.08,
        Math.max(0.018, 1.2 * hair),
        0,
        2 * Math.PI,
      );
      context.fill();
    }
    context.restore();
    return;
  }
  const x = 0.82,
    y = 0.08;
  signCloud(context, x, y, 0.15);
  context.strokeStyle = context.fillStyle = "#ffffff";
  context.lineWidth = stroke;
  context.lineCap = context.lineJoin = "round";
  const cy = y + 0.01,
    dot = () => {
      context.stroke();
      context.beginPath();
      context.arc(x, cy + 0.06, stroke * 0.62, 0, 2 * Math.PI);
      context.fill();
    };
  context.beginPath();
  if (sign === "exclamation") {
    context.moveTo(x, cy - 0.075);
    context.lineTo(x, cy + 0.015);
    dot();
  } else if (sign === "question") {
    context.arc(x, cy - 0.04, 0.038, Math.PI * 1.05, Math.PI * 2.35);
    context.lineTo(x, cy + 0.015);
    dot();
  } else if (sign === "lines") {
    for (const dy of [-0.045, 0, 0.045]) {
      context.moveTo(x - 0.06, cy + dy);
      context.lineTo(x + 0.06, cy + dy);
    }
    context.stroke();
  } else if (sign === "cross") {
    context.moveTo(x - 0.045, cy - 0.045);
    context.lineTo(x + 0.045, cy + 0.045);
    context.moveTo(x - 0.045, cy + 0.045);
    context.lineTo(x + 0.045, cy - 0.045);
    context.stroke();
  } else if (sign === "hourglass") {
    context.lineWidth = stroke * 0.8;
    context.moveTo(x - 0.045, cy - 0.06);
    context.lineTo(x + 0.045, cy - 0.06);
    context.lineTo(x - 0.045, cy + 0.06);
    context.lineTo(x + 0.045, cy + 0.06);
    context.closePath();
    context.stroke();
  } else if (sign === "z") {
    context.moveTo(x - 0.045, cy - 0.05);
    context.lineTo(x + 0.045, cy - 0.05);
    context.lineTo(x - 0.045, cy + 0.05);
    context.lineTo(x + 0.045, cy + 0.05);
    context.stroke();
  }
  context.restore();
}
/** A sleeping cloud's snot bubble, pale with a deep outline so it reads on the body and on paper. */
function snotBubble(
  context: CanvasRenderingContext2D,
  snot: CloudSnot,
  strength: number,
) {
  const unit = context.getTransform(),
    hair = 1 / Math.max(1, Math.hypot(unit.a, unit.b)),
    stroke = Math.max(0.022, 1.25 * hair);
  context.save();
  context.globalAlpha = strength;
  context.strokeStyle = SNOT_INK;
  context.lineWidth = stroke;
  context.lineCap = "round";
  if (snot.pop === 0) {
    context.fillStyle = "rgba(236, 242, 255, 0.78)";
    context.beginPath();
    context.arc(snot.x, snot.y, snot.r, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    if (snot.r > 0.06) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = Math.max(0.018, hair);
      context.beginPath();
      context.arc(snot.x, snot.y, snot.r * 0.6, -2.7, -1.75);
      context.stroke();
    }
  } else {
    context.globalAlpha = strength * (1 - snot.pop);
    for (let i = 0; i < 6; i++) {
      const a = (2 * Math.PI * i) / 6 + 0.3,
        from = snot.r + 0.08 * snot.pop,
        to = from + 0.05;
      context.beginPath();
      context.moveTo(snot.x + Math.cos(a) * from, snot.y + Math.sin(a) * from);
      context.lineTo(snot.x + Math.cos(a) * to, snot.y + Math.sin(a) * to);
      context.stroke();
    }
  }
  context.restore();
}
const SNOT_INK = "#2e31b8",
  CLOUD_SIGN = "#4b4ee6",
  CLOUD_SIGN_GRAY = "#5f6275",
  CLOUD_RING = "#aaa6ff",
  CLOUD_RING_DARK = "#8d89f5";
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
function drawAvatar(
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
function bare(
  context: CanvasRenderingContext2D,
  form: BotForm,
  motion: BotMotion,
  cache = false,
) {
  if (form.spec.avatar) {
    drawAvatar(context, form, motion);
    return;
  }
  if (form.spec.ownEyes) {
    context.globalAlpha = 1 - motion.morph;
    context.drawImage(form.artwork, ...box);
    if (motion.morph > 0) {
      group(
        context,
        motion.morph,
        (c) => {
          c.drawImage(form.stripped ?? form.artwork, ...box);
          ownEyes(c, form.spec.ownEyes!, motion.face, form.ink);
        },
        "lighter",
      );
      if (motion.helper) drawHelper(context, form, motion.morph);
    }
  } else drawBody(context, form, motion, cache);
}
/** Draw in normalized mark coordinates. A cached image stays upright; its host applies pose independently. */
export function drawBot(
  context: CanvasRenderingContext2D,
  form: BotForm,
  motion: BotMotion,
  options: { pose?: boolean; signs?: boolean } = {},
) {
  context.save();
  if (options.pose !== false) {
    context.translate(0.5, 0.5);
    applyBotPose(context, motion.pose);
    context.translate(-0.5, -0.5);
  }
  context.save();
  bare(context, form, motion);
  context.restore();
  if (options.signs !== false && motion.sign && form.spec.cloud)
    cloudSign(context, motion, motion.sign, signAlpha(motion));
  else if (options.signs !== false && motion.sign && !form.spec.avatar) {
    const t = context.getTransform(),
      side = Math.hypot(t.a, t.b),
      place = signBox(form, side),
      unit = Math.ceil(side * 1.6) / 1.6;
    paintSign(
      context,
      motion.sign,
      {
        x: (place.x - 0.3 * unit) / unit,
        y: (place.y - 0.3 * unit) / unit,
        width: place.width / unit,
        height: place.height / unit,
      },
      form.light,
      motion.lit,
      motion.sign === "ellipsis" || motion.sign === "z"
        ? morph(motion.morph).dressed
        : 1,
    );
  }
  context.restore();
}
const signAlpha = (motion: BotMotion) =>
  motion.sign === "ellipsis" || motion.sign === "z"
    ? morph(motion.morph).dressed
    : 1;
function canvasFor(side: number, outline: number, into?: HTMLCanvasElement) {
  const inner = Math.ceil(side * 1.6),
    canvas = reuseCanvas(into, inner + outline * 2, inner + outline * 2);
  const context = canvas.getContext("2d")!,
    unit = inner / 1.6;
  context.translate(outline + 0.3 * unit, outline + 0.3 * unit);
  context.scale(unit, unit);
  context.imageSmoothingEnabled = true;
  return { canvas, context };
}
/** Draws into `into` when given: a mark redraws the same canvas each frame. */
export function renderBot(
  form: BotForm,
  motion: BotMotion,
  side: number,
  outline = 0,
  into?: HTMLCanvasElement,
) {
  const { canvas, context } = canvasFor(side, outline, into);
  context.save();
  bare(context, form, motion, true);
  context.restore();
  if (motion.sign && form.spec.cloud)
    cloudSign(context, motion, motion.sign, signAlpha(motion));
  context.resetTransform();
  if (motion.sign && !form.spec.avatar && !form.spec.cloud) {
    const place = signBox(form, side, outline);
    if (motion.signUpright && Math.abs(motion.pose.rotation) > 0.5) {
      // The host tilts this canvas by the pose; turn the sign back so it
      // stays upright while it follows the head.
      const { canvas: sign, context: c } = borrowCanvas(
        place.width + 4,
        place.height + 4,
      );
      try {
        paintSign(
          c,
          motion.sign,
          { x: 2, y: 2, width: place.width, height: place.height },
          form.light,
          motion.lit,
          signAlpha(motion),
        );
        context.save();
        context.translate(
          place.x + place.width / 2,
          place.y + place.height / 2,
        );
        context.rotate((-motion.pose.rotation * Math.PI) / 180);
        context.drawImage(sign, -place.width / 2 - 2, -place.height / 2 - 2);
        context.restore();
      } finally {
        giveBack(sign);
      }
    } else
      paintSign(
        context,
        motion.sign,
        place,
        form.light,
        motion.lit,
        signAlpha(motion),
      );
  }
  if (outline > 0) layHairline(context, outline, form.light);
  return canvas;
}
export function renderLogo(
  form: BotForm,
  sign: BotSign | null,
  side: number,
  outline = 0,
) {
  const { canvas, context } = canvasFor(side, outline);
  context.drawImage(form.artwork, 0, 0, 1, 1);
  context.resetTransform();
  if (sign) paintSign(context, sign, signBox(form, side, outline), form.light);
  if (outline > 0) layHairline(context, outline, form.light);
  return canvas;
}
export const BotRenderer = {
  margin,
  image: renderBot,
  logo: renderLogo,
  look: botRenderLook,
};
