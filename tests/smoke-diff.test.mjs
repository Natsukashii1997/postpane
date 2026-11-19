// 装后冒烟（L-35）：图片比较工具，以及 smoke.mjs 在替身截图上的判断。不截真屏幕。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";
import {
  blank,
  compare,
  contentBox,
  decodePng,
  diffImage,
  encodePng,
  MIN_CHANGED,
} from "../.agents/skills/postpane-round/scripts/png-diff.mjs";
import { frame, frames, sandbox } from "./install-stubs.mjs";

const SMOKE = fileURLToPath(
  new URL(
    "../.agents/skills/postpane-round/scripts/smoke.mjs",
    import.meta.url,
  ),
);

// 独立写一份带五种行过滤的 PNG 编码，验解码器（screencapture 出的图各行过滤不同）
function pngWithFilters(img, channels) {
  const { width, height } = img;
  const stride = width * channels;
  const px = Buffer.alloc(stride * height);
  for (let p = 0; p < width * height; p++)
    for (let k = 0; k < channels; k++)
      px[p * channels + k] = img.data[p * 4 + k];
  const raw = [];
  for (let y = 0; y < height; y++) {
    const f = y % 5;
    raw.push(f);
    for (let i = 0; i < stride; i++) {
      const v = px[y * stride + i];
      const a = i >= channels ? px[y * stride + i - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + i] : 0;
      const c =
        y > 0 && i >= channels ? px[(y - 1) * stride + i - channels] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const pred = [
        0,
        a,
        b,
        (a + b) >> 1,
        pa <= pb && pa <= pc ? a : pb <= pc ? b : c,
      ][f];
      raw.push((v - pred) & 0xff);
    }
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type, "latin1"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(tb) >>> 0);
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, channels === 4 ? 6 : 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("iCCP", Buffer.from("profile\0\0x")), // 不认的块要跳过
    chunk("IDAT", deflateSync(Buffer.from(raw))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function noisy(w, h) {
  const img = blank(w, h);
  for (let i = 0; i < img.data.length; i++)
    img.data[i] = (i * 37 + (i >> 3) * 11) & 0xff;
  return img;
}

test("PNG 解码认五种行过滤和 RGB / RGBA，编码再解码不走样", () => {
  const img = noisy(13, 11);
  const rgba = decodePng(pngWithFilters(img, 4));
  assert.deepEqual([rgba.width, rgba.height], [13, 11]);
  assert.ok(rgba.data.equals(img.data));
  const rgb = decodePng(pngWithFilters(img, 3));
  for (let p = 0; p < 13 * 11; p++) {
    assert.deepEqual(
      [...rgb.data.subarray(p * 4, p * 4 + 3)],
      [...img.data.subarray(p * 4, p * 4 + 3)],
    );
    assert.equal(rgb.data[p * 4 + 3], 255);
  }
  assert.ok(decodePng(encodePng(img)).data.equals(img.data));
  assert.throws(() => decodePng(Buffer.from("not a png")), /不是 PNG/);
});

test("比较：一样的两张不算不同；小人挪了位置算不同，范围落在小人上", () => {
  const a = frame(10);
  assert.deepEqual(compare(a, frame(10)), {
    changed: 0,
    ratio: 0,
    box: null,
    sizeChanged: false,
    differs: false,
  });
  const r = compare(a, frame(20));
  assert.equal(r.differs, true);
  assert.ok(r.changed >= MIN_CHANGED);
  assert.deepEqual(r.box, [10, 10, 30, 20]);
});

test("比较：1 像素的抗锯齿抖动、两边都透明的像素不算不同", () => {
  const jitter = compare(frame(10), frame(11));
  assert.ok(jitter.changed > 0 && jitter.changed < MIN_CHANGED);
  assert.equal(jitter.differs, false);
  const a = blank(4, 4, [255, 0, 0, 0]);
  const b = blank(4, 4, [0, 255, 0, 0]);
  assert.equal(compare(a, b).changed, 0);
  const faint = frame(10);
  faint.data[(12 * 60 + 12) * 4] += 10; // 差 10，低于容差
  assert.equal(compare(frame(10), faint).changed, 0);
});

test("比较：尺寸不同只比重叠部分并标出来；内容范围找不透明像素，全透明是 null", () => {
  const r = compare(frame(10), frame(10, { width: 70 }));
  assert.equal(r.sizeChanged, true);
  assert.equal(r.changed, 0);
  assert.equal(contentBox(blank(5, 5)), null);
  assert.deepEqual(contentBox(frame(10)), [5, 5, 55, 35]);
});

test("差异图：前、后、标红三联，变了的像素涂红", () => {
  const img = diffImage(frame(10), frame(20));
  assert.deepEqual([img.width, img.height], [60 * 3 + 16, 40]);
  const at = (x, y) => [
    ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
  ];
  const ox = (60 + 8) * 2;
  assert.deepEqual(at(ox + 25, 15), [230, 30, 30, 255], "小人新位置标红");
  assert.notDeepEqual(at(ox + 45, 30), [230, 30, 30, 255], "没变的票根不标红");
});

test("smoke.mjs compare：两张不同退出 0 并写差异图，一样退出 1", () => {
  const { dir } = sandbox();
  const a = join(dir, "a.png");
  const b = join(dir, "b.png");
  writeFileSync(a, encodePng(frame(10)));
  writeFileSync(b, encodePng(frame(20)));
  const out = join(dir, "d.png");
  const diff = spawnSync(process.execPath, [SMOKE, "compare", a, b, out], {
    encoding: "utf8",
  });
  assert.equal(diff.status, 0, diff.stderr);
  assert.match(diff.stdout, /不同$/m);
  assert.equal(decodePng(readFileSync(out)).width, 196);
  const same = spawnSync(process.execPath, [SMOKE, "compare", a, a], {
    encoding: "utf8",
  });
  assert.equal(same.status, 1);
  assert.match(same.stdout, /一样/);
});

function smoke(box, args, list) {
  const env = { ...box.env };
  if (list)
    env.STUB_FRAMES = frames(
      join(box.dir, `frames-${args[0]}-${Math.random()}`),
      list,
    );
  return spawnSync(process.execPath, [SMOKE, ...args], {
    env,
    encoding: "utf8",
  });
}

test("smoke.mjs after：小人在动就通过，写动作差异图，并和装前截图对比", () => {
  const box = sandbox();
  const before = smoke(
    box,
    ["shot", join(box.dir, "smoke-before")],
    [frame(30)],
  );
  assert.equal(before.status, 0, before.stderr);
  assert.ok(existsSync(join(box.dir, "smoke-before-1.png")));
  const r = smoke(box, ["after", box.dir], [frame(10), frame(10), frame(20)]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /侧栏在动，第 1 张和第 3 张/);
  assert.match(r.stdout, /装前装后：\d+ 个像素不同/);
  assert.ok(existsSync(join(box.dir, "smoke-motion-1.png")));
  assert.ok(existsSync(join(box.dir, "smoke-before-after-1.png")));
  assert.match(readFileSync(box.log, "utf8"), /screencapture -x -o -l 7 /);
});

test("smoke.mjs after：小人一直不动（L-35 静态图标）退出 1；只有抖动或布局在变也不算在动", () => {
  const box = sandbox();
  const still = smoke(box, ["after", box.dir], [frame(10)]);
  assert.equal(still.status, 1);
  assert.match(still.stderr, /小人一直没动/);
  assert.match(still.stdout, /装前没有第 1 个侧栏窗口的截图/);
  const jitter = smoke(box, ["after", box.dir], [frame(10), frame(11)]);
  assert.equal(jitter.status, 1);
  // 第一张票根还没长全（在加载）：和第二张布局不同，这一对不算，以第二张为准往下比；之后一直不动就不过
  const loading = smoke(
    box,
    ["after", box.dir],
    [frame(10, { ticket: [5, 5, 55, 25] }), frame(20), frame(20)],
  );
  assert.equal(loading.status, 1);
  const loaded = smoke(
    box,
    ["after", box.dir],
    [frame(10, { ticket: [5, 5, 55, 25] }), frame(20), frame(30)],
  );
  assert.equal(loaded.status, 0, loaded.stderr);
  assert.match(loaded.stdout, /第 2 张和第 3 张/);
});

test("smoke.mjs：找不到侧栏窗口、截图失败或截到全透明，退出 2，不当成「没动」", () => {
  const box = sandbox();
  const none = smoke(
    { ...box, env: { ...box.env, STUB_WINDOWS: "[]" } },
    ["after", box.dir],
    [frame(10)],
  );
  assert.equal(none.status, 2);
  assert.match(none.stderr, /没看到驿窗的侧栏窗口/);
  const fail = smoke(box, ["after", box.dir]);
  assert.equal(fail.status, 2);
  assert.match(fail.stderr, /截不到侧栏/);
  const empty = smoke(box, ["after", box.dir], [blank(60, 40)]);
  assert.equal(empty.status, 2);
  const shot = smoke(box, ["shot", join(box.dir, "x")]);
  assert.equal(shot.status, 2);
});
