// install.sh / smoke.mjs 测试用的替身命令：osascript、pgrep、open、codesign、screencapture 都换成只记日志的脚本，
// HOME 换成临时目录，安装位指到临时目录。测试绝不能碰正在用的驿窗：sandbox() 先核对这几条命令确实解析到替身。
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  blank,
  encodePng,
} from "../.agents/skills/postpane-round/scripts/png-diff.mjs";

const STUBS = {
  // 带 -l JavaScript 是冒烟在找侧栏窗口：回 $STUB_WINDOWS；其余（quit app）只记一笔
  osascript: `if [ "$1" = -l ]; then echo "\${STUB_WINDOWS:-[]}"; else echo "osascript $*" >> "$STUB_LOG"; [ -n "\${STUB_QUIT_SLEEP:-}" ] && sleep "$STUB_QUIT_SLEEP"; fi; exit 0`,
  pgrep: `exit 1`,
  open: `echo "open $*" >> "$STUB_LOG"`,
  codesign: `echo 'certificate leaf = H"b773068e' >&2`,
  // 依次吐 $STUB_FRAMES/1.png、2.png……，用完了一直吐最后一张；没设 STUB_FRAMES 就当截图失败
  screencapture: `[ -n "\${STUB_FRAMES:-}" ] || exit 1
for out; do :; done
n=$(( $(cat "$STUB_FRAMES/.n" 2>/dev/null || echo 0) + 1 )); echo $n > "$STUB_FRAMES/.n"
f="$STUB_FRAMES/$n.png"; [ -f "$f" ] || f="$STUB_FRAMES/$(ls "$STUB_FRAMES" | grep -c '\\.png$').png"
cp "$f" "$out"; echo "screencapture $*" >> "$STUB_LOG"`,
};

export function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "postpane-install-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  for (const [name, body] of Object.entries(STUBS)) {
    writeFileSync(join(bin, name), `#!/bin/bash\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  }
  mkdirSync(join(dir, "home"));
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    HOME: join(dir, "home"),
    POSTPANE_INSTALL_APP: join(dir, "Applications/PostPane.app"),
    POSTPANE_SMOKE_FAST: "1",
    STUB_LOG: join(dir, "calls.log"),
    STUB_WINDOWS: '[{"id":7,"x":0,"y":0}]',
  };
  delete env.STUB_FRAMES;
  const resolved = execFileSync(
    "bash",
    [
      "-c",
      "for c in osascript pgrep open codesign screencapture; do command -v $c; done",
    ],
    {
      env,
      encoding: "utf8",
    },
  )
    .trim()
    .split("\n");
  for (const path of resolved)
    if (!path.startsWith(bin))
      throw new Error(`替身没生效：${path}，测试会碰到真应用，停`);
  return { dir, bin, env, app: env.POSTPANE_INSTALL_APP, log: env.STUB_LOG };
}

// 侧栏替身画面：一张票根（灰底）上一个小人（深色方块），小人的位置 x 不同就算「在动」。
export function frame(
  x,
  { width = 60, height = 40, ticket = [5, 5, 55, 35] } = {},
) {
  const img = blank(width, height);
  for (let yy = ticket[1]; yy < ticket[3]; yy++)
    for (let xx = ticket[0]; xx < ticket[2]; xx++)
      img.data.set([220, 220, 215, 255], (yy * width + xx) * 4);
  for (let yy = 10; yy < 20; yy++)
    for (let xx = x; xx < x + 10; xx++)
      img.data.set([200, 90, 70, 255], (yy * width + xx) * 4);
  return img;
}

export function frames(dir, list) {
  mkdirSync(dir, { recursive: true });
  list.forEach((img, i) =>
    writeFileSync(join(dir, `${i + 1}.png`), encodePng(img)),
  );
  return dir;
}
