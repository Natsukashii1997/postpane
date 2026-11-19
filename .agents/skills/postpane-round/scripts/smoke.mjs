#!/usr/bin/env node
// 装后冒烟（L-35）：截真实侧栏窗口，看小人在不在动，并和装前对比。install.sh 装机前后各调一次。
// 截图沿用手工做法的 screencapture，但按窗口截（-l），只截驿窗的侧栏窗口，不混进后面别的窗口；
// 窗口号用系统窗口表找：属于 PostPane、层级高于普通窗口（设置、统计窗口是 0 层）。
// 驿窗自己的 MCP 截图画的是静态帧，不能判断动没动（#395），所以不用它。
//
//   node smoke.mjs shot <前缀>            截现在的侧栏，存 <前缀>-<n>.png（装前用）
//   node smoke.mjs after <证据目录>        等新应用的侧栏出来，查小人在动，并和 smoke-before-<n>.png 对比
//   node smoke.mjs compare <前.png> <后.png> [差异图.png]   单独比两张图
//
// 退出码：0 通过；1 小人没在动（compare：两张一样）；2 截不到图（没窗口、锁屏、没有屏幕录制权限）。
// POSTPANE_SMOKE_FAST=1 仅供测试：不等应用加载、截图间隔缩到 0.05 秒。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  compare,
  contentBox,
  decodePng,
  diffImage,
  encodePng,
} from "./png-diff.mjs";

const FAST = process.env.POSTPANE_SMOKE_FAST === "1";
const INTERVAL = FAST ? 50 : 2000; // AGENTS.md「已定内容」：隔 2 秒截
const SHOTS = 5; // 第一张之后最多再截 5 张（约 10 秒），任一张和第一张不同就算在动
const SETTLE = FAST ? 0 : 8000; // 窗口出来后等前端加载、第一批数据到齐，免得把「加载出来」当成「在动」
const WAIT_WINDOW = FAST ? 1000 : 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const box = (b) => (b ? `[${b.join(", ")}]` : "无");

const JXA = `ObjC.import("CoreGraphics");
const all = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0)));
JSON.stringify(all.filter(w => w.kCGWindowOwnerName === "PostPane" && w.kCGWindowLayer > 0 && w.kCGWindowAlpha > 0)
  .map(w => ({ id: w.kCGWindowNumber, x: w.kCGWindowBounds.X, y: w.kCGWindowBounds.Y })));`;

function hudWindows() {
  try {
    const out = execFileSync("osascript", ["-l", "JavaScript", "-e", JXA], {
      encoding: "utf8",
    });
    return JSON.parse(out).sort((a, b) => a.y - b.y || a.x - b.x);
  } catch {
    return [];
  }
}

function capture(id, file) {
  try {
    execFileSync("screencapture", ["-x", "-o", "-l", String(id), file], {
      stdio: "ignore",
    });
    const img = decodePng(readFileSync(file));
    return contentBox(img) ? img : null; // 全透明：没有屏幕录制权限或锁屏时会这样
  } catch {
    return null;
  }
}

function shotAll(prefix) {
  return hudWindows().map((w, i) => {
    const file = `${prefix}-${i + 1}.png`;
    return { file, img: capture(w.id, file), id: w.id };
  });
}

async function waitForWindows() {
  const until = Date.now() + WAIT_WINDOW;
  for (;;) {
    const list = hudWindows();
    if (list.length || Date.now() >= until) return list;
    await sleep(500);
  }
}

function writeDiff(a, b, file) {
  writeFileSync(file, encodePng(diffImage(a, b)));
}

async function after(dir) {
  if (!(await waitForWindows()).length) {
    console.error("冒烟：等了 30 秒没看到驿窗的侧栏窗口，新应用可能没起来。");
    return 2;
  }
  await sleep(SETTLE);
  const first = shotAll(join(dir, "smoke-after-1"));
  if (!first.length || first.some((s) => !s.img)) {
    console.error(
      "冒烟：截不到侧栏（锁屏、显示器休眠，或这个终端没有屏幕录制权限）。没法判断小人动没动，请人看一眼。",
    );
    return 2;
  }
  const bases = first.map((s) => ({ img: s.img, k: 1 }));
  let moved = null;
  for (let k = 2; k <= SHOTS + 1 && !moved; k++) {
    await sleep(INTERVAL);
    const next = shotAll(join(dir, `smoke-after-${k}`));
    for (const [i, s] of next.entries()) {
      const base = bases[i];
      if (!base || !s.img) continue;
      // 布局变了（还在加载、有人在操作侧栏）：这一对不算，免得把「票根出来了」当成「小人在动」，以新的这张为准往下比
      if (box(contentBox(base.img)) !== box(contentBox(s.img))) {
        bases[i] = { img: s.img, k };
        continue;
      }
      const r = compare(base.img, s.img);
      if (r.differs) {
        moved = {
          from: base.k,
          k,
          r,
          file: join(dir, `smoke-motion-${i + 1}.png`),
        };
        writeDiff(base.img, s.img, moved.file);
        break;
      }
    }
  }
  if (moved)
    console.log(
      `冒烟：侧栏在动，第 ${moved.from} 张和第 ${moved.k} 张（隔 ${((moved.k - moved.from) * INTERVAL) / 1000} 秒）有 ${moved.r.changed} 个像素不同，范围 ${box(moved.r.box)}；差异图 ${moved.file}`,
    );
  else
    console.error(
      `冒烟没过：侧栏 ${(SHOTS * INTERVAL) / 1000} 秒里截了 ${SHOTS + 1} 张，小人一直没动（L-35：可能退成了静态图标）。截图在 ${dir}/smoke-after-*.png。`,
    );

  for (const [i, s] of first.entries()) {
    const before = join(dir, `smoke-before-${i + 1}.png`);
    if (!existsSync(before)) {
      console.log(`装前没有第 ${i + 1} 个侧栏窗口的截图，跳过前后对比。`);
      continue;
    }
    const old = decodePng(readFileSync(before));
    const r = compare(old, s.img);
    const file = join(dir, `smoke-before-after-${i + 1}.png`);
    writeDiff(old, s.img, file);
    const size = r.sizeChanged
      ? `，窗口尺寸 ${old.width}×${old.height} → ${s.img.width}×${s.img.height}`
      : "";
    console.log(
      `装前装后：${r.changed} 个像素不同（${(r.ratio * 100).toFixed(2)}%），范围 ${box(r.box)}${size}；差异图 ${file}（红色是变了的地方，小人本来就在动，要看红色是不是只落在小人上）`,
    );
  }
  return moved ? 0 : 1;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "shot" && args[0]) {
  const shots = shotAll(args[0]).filter((s) => s.img);
  for (const s of shots) console.log(`装前侧栏：${s.file}`);
  process.exit(shots.length ? 0 : 2);
} else if (cmd === "after" && args[0]) {
  process.exit(await after(args[0]));
} else if (cmd === "compare" && args[1]) {
  const [a, b] = args.slice(0, 2).map((f) => decodePng(readFileSync(f)));
  const r = compare(a, b);
  if (args[2]) writeDiff(a, b, args[2]);
  console.log(
    `${r.changed} 个像素不同（${(r.ratio * 100).toFixed(2)}%），范围 ${box(r.box)}${r.sizeChanged ? "，尺寸不同" : ""}：${r.differs ? "不同" : "一样"}`,
  );
  process.exit(r.differs ? 0 : 1);
} else {
  console.error(
    "用法：node smoke.mjs shot <前缀> | after <证据目录> | compare <前.png> <后.png> [差异图.png]",
  );
  process.exit(2);
}
