#!/usr/bin/env node
// 源文件 300 行棘轮：文件自己的代码不许超过 300 行。超长的文件按接缝拆（组件、
// hook、impl 块、分系统的部分），不靠挤行。
//
// 计入：src/ 下的 .rs、.ts、.tsx、.mjs。不计入：测试文件（tests.rs、*_tests.rs、
// tests/、test/、*.test.ts、*.test.mjs）、.d.ts、fixtures/ 里的测试数据，以及
// Rust 文件自带的测试模块（从 `#[cfg(test)]` 下一行的 `mod … {` 起）。
//
// 已经超长的文件记在 file-size-baseline.json（文件 → 行数），只许变短；变短后跑
// --update 把基线收紧。新文件不许超过 300 行。确有理由要超的，写进
// file-size-allowlist.json：{ "路径": { "max": 行数上限, "reason": "一句理由" } }，
// 名单里的文件按 max 查，不进基线。
//
//   node src/tooling/check-file-size.mjs           检查
//   node src/tooling/check-file-size.mjs --update  按当前行数重写基线
//   --root <目录>                                  换一个仓库根目录（测试用）
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const LIMIT = 300;
const BASELINE = "src/tooling/file-size-baseline.json";
const ALLOWLIST = "src/tooling/file-size-allowlist.json";
const skipped = new Set([
  "node_modules",
  "target",
  "dist",
  "gen",
  "vendor",
  "tests",
  "test",
  "fixtures",
]);
const source = /\.(rs|ts|tsx|mjs)$/;
const testFile = /(^|_)tests?(_\w+)?\.rs$|\.test\.(ts|tsx|mjs)$|\.d\.ts$/;

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (source.test(entry.name) && !testFile.test(entry.name)) yield path;
  }
}

// 文件自己的行数：Rust 文件在自带测试模块开始处截止。
export function ownLines(text, rust) {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (!rust) return lines.length;
  for (let index = 0; index < lines.length - 1; index++) {
    if (
      lines[index].trim() === "#[cfg(test)]" &&
      /^mod \w+ \{/.test(lines[index + 1])
    )
      return index;
  }
  return lines.length;
}

const readJson = (path) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};

// 返回 { errors, notes, sizes }；update 为真时按当前行数重写基线。
export function checkFileSizes(root, { update = false } = {}) {
  const sizes = {};
  for (const path of sourceFiles(join(root, "src"))) {
    const size = ownLines(readFileSync(path, "utf8"), path.endsWith(".rs"));
    if (size > LIMIT) sizes[relative(root, path).split(sep).join("/")] = size;
  }
  const allowlist = readJson(join(root, ALLOWLIST));
  const errors = [];
  const notes = [];
  for (const [file, entry] of Object.entries(allowlist)) {
    if (
      !Number.isInteger(entry?.max) ||
      entry.max <= LIMIT ||
      typeof entry.reason !== "string" ||
      !entry.reason.trim()
    )
      errors.push(
        `${ALLOWLIST} 里 ${file} 要写成 { "max": 大于 ${LIMIT} 的整数, "reason": "一句理由" }。`,
      );
  }

  if (update) {
    const baseline = Object.fromEntries(
      Object.entries(sizes)
        .filter(([file]) => !(file in allowlist))
        .sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    writeFileSync(
      join(root, BASELINE),
      `${JSON.stringify(baseline, null, 2)}\n`,
    );
    notes.push(
      `已写入 ${BASELINE}：${Object.keys(baseline).length} 个文件超过 ${LIMIT} 行。`,
    );
    return { errors, notes, sizes };
  }

  const baseline = readJson(join(root, BASELINE));
  for (const [file, size] of Object.entries(sizes)) {
    if (file in allowlist) {
      if (size > allowlist[file].max)
        errors.push(
          `${file} 有 ${size} 行，超过允许名单的上限 ${allowlist[file].max}。拆分它，或改名单里的 max 并更新理由。`,
        );
    } else if (file in baseline) {
      if (size > baseline[file])
        errors.push(
          `${file} 有 ${size} 行，比基线 ${baseline[file]} 行长了。基线里的文件只许变短，拆分它而不是加长它。`,
        );
    } else {
      errors.push(
        `${file} 有 ${size} 行，超过 ${LIMIT} 行。按接缝拆开；确有理由要超，写进 ${ALLOWLIST} 并附一句理由。`,
      );
    }
  }
  const shrunk = Object.entries(baseline)
    .filter(([file, size]) => (sizes[file] ?? 0) < size)
    .map(([file]) => file);
  if (shrunk.length)
    notes.push(
      `${shrunk.join("、")} 比基线短了：跑 node src/tooling/check-file-size.mjs --update 收紧基线。`,
    );
  return { errors, notes, sizes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--root");
  const root =
    at > 0
      ? resolve(process.argv[at + 1])
      : join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
  const { errors, notes } = checkFileSizes(root, {
    update: process.argv.includes("--update"),
  });
  for (const error of errors) console.error(error);
  for (const note of notes) console.log(note);
  if (errors.length) process.exit(1);
  if (!process.argv.includes("--update"))
    console.log(`没有源文件超出 ${LIMIT} 行的棘轮。`);
}
