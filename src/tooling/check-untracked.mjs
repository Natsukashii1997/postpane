#!/usr/bin/env node
// `pnpm run check` 的第一步：src/ 下有没提交（未跟踪、也没被 .gitignore 忽略）的文件就报错。
// 后面的格式检查、包边界检查按路径扫 src/，不管文件提没提交：留在 src/ 里的自查页、预览脚手架
// 会在几分钟后的某一步把整条 check 拦下，报的还是格式或越界，看不出是它（L-13、L-43）。
//
//   node src/tooling/check-untracked.mjs                 查本仓库
//   node src/tooling/check-untracked.mjs --root <目录>   换一个仓库根目录（测试用）
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function untrackedInSrc(root) {
  const out = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z", "--", "src"],
    { cwd: root, encoding: "utf8" },
  );
  return out.split("\0").filter(Boolean);
}

export function message(files) {
  return [
    `src/ 下有 ${files.length} 个没提交的文件，check 先停在这里：`,
    ...files.map((file) => `  ${file}`),
    "后面的格式检查、包边界检查按路径扫 src/，不管提没提交，会被它们拦住（L-13、L-43）。",
    "正确做法：",
    "  - 界面预览用常设的场景预览台：pnpm --filter @agent-hud/hud run scenes（127.0.0.1:1480）；",
    "    缺场景就在 src/packages/hud/test/scenes/scenes.ts 补一个，不另搭 preview-xxx 脚手架（E-18）。",
    "  - 一次性的自查页、截图脚本放 src/ 外，如证据目录 ~/Library/Application Support/postpane/evidence/<日期>-<短名>/。",
    "  - 是本轮要提交的新文件：先 git add，再跑 check。",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--root");
  const root =
    at > 0
      ? resolve(process.argv[at + 1])
      : join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
  const files = untrackedInSrc(root);
  if (files.length > 0) {
    console.error(message(files));
    process.exit(1);
  }
  console.log("src/ 下没有未提交的文件。");
}
