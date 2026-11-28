#!/usr/bin/env node
// 卡片版式机检（docs/design/卡片版式规范.md「机器查的几条」）：侧栏代码里查三条
// 写法，规范只写成文字时 AI 读过照样犯（2026-11-28 WAIT 放进图标列、REPLY 签
// 小签黄面板蓝），所以改成机器拦。
//
//   icon-column  一行用网格排、第一列是图标列时，第一格放了类型签（不是章）
//   grid-literal 这种行的图标列宽、列间隔，或文字线缩进 30，直接写了数字，没从 GRID 取
//   tag-color    类型签自己传 color，或在取色入口外按签的种类挑颜色
//
// 改动前就有的旧问题记在 card-layout-baseline.json（「规则 文件」→ 处数），只许变少；
// 修掉后跑 --update 收紧。新文件、新写法一处都不许有。
//
//   node src/tooling/check-card-layout.mjs           检查
//   node src/tooling/check-card-layout.mjs --update  按当前处数重写基线
//   --root <目录>                                    换一个仓库根目录（测试用）
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFile, RULES } from "./card-layout-rules.mjs";

export { checkFile, RULES, STAMPS } from "./card-layout-rules.mjs";

const SCAN = "src/packages/hud/src";
const BASELINE = "src/tooling/card-layout-baseline.json";

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
      yield path;
  }
}

export function scan(root) {
  const dir = join(root, SCAN);
  if (!existsSync(dir)) return [];
  return [...sourceFiles(dir)].flatMap((path) =>
    checkFile(
      relative(root, path).split(sep).join("/"),
      readFileSync(path, "utf8"),
    ),
  );
}

const keyFor = (f) => `${f.rule} ${f.file}`;
const counts = (found) =>
  found.reduce(
    (all, f) => ({ ...all, [keyFor(f)]: (all[keyFor(f)] ?? 0) + 1 }),
    {},
  );

// 返回 { errors, notes, found }；update 为真时按当前处数重写基线。
export function checkCardLayout(root, { update = false } = {}) {
  const found = scan(root);
  const now = counts(found);
  const path = join(root, BASELINE);
  if (update) {
    const sorted = Object.fromEntries(
      Object.entries(now).sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
    return {
      errors: [],
      notes: [`已写入 ${BASELINE}：${found.length} 处旧问题。`],
      found,
    };
  }
  const baseline = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : {};
  const errors = [];
  for (const [key, count] of Object.entries(now)) {
    const allowed = baseline[key] ?? 0;
    if (count <= allowed) continue;
    const [rule] = key.split(" ");
    const list = found
      .filter((f) => keyFor(f) === key)
      .map((f) => `    ${f.file}:${f.line}  ${f.detail}`)
      .join("\n");
    errors.push(
      `${RULES[rule]}（${key.slice(rule.length + 1)}：${count} 处，基线允许 ${allowed}）\n${list}`,
    );
  }
  const notes = Object.entries(baseline)
    .filter(([key, count]) => (now[key] ?? 0) < count)
    .map(
      ([key]) =>
        `${key} 比基线少了：跑 node src/tooling/check-card-layout.mjs --update 收紧基线。`,
    );
  return { errors, notes, found };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--root");
  const root =
    at > 0
      ? resolve(process.argv[at + 1])
      : join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
  const { errors, notes } = checkCardLayout(root, {
    update: process.argv.includes("--update"),
  });
  for (const error of errors) console.error(error);
  for (const note of notes) console.log(note);
  if (errors.length) {
    console.error(
      "规范：docs/design/卡片版式规范.md「每种元素放在哪」「机器查的几条」。",
    );
    process.exit(1);
  }
  if (!process.argv.includes("--update"))
    console.log(
      "卡片版式机检通过：类型签不在图标列，缩进和签的颜色都从一处取。",
    );
}
