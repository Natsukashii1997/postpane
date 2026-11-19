// 备环境脚本（L-34、E-13）：先定构建目录，再装依赖、生成打包资源，两步看到的是同一个 CARGO_TARGET_DIR。
// 在临时 git 仓库里跑：pnpm 和 package-resources 都是替身，只记下自己什么时候被调、看到的构建目录。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SH = fileURLToPath(new URL("../scripts/setup-worktree.sh", import.meta.url));

function box(t) {
  const dir = mkdtempSync(join(tmpdir(), "setup-worktree-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, "repo"), bin = join(dir, "bin"), log = join(dir, "calls.log");
  mkdirSync(join(repo, "scripts"), { recursive: true });
  mkdirSync(join(repo, "src/tooling"), { recursive: true });
  mkdirSync(bin);
  execFileSync("git", ["init", "-q", repo]);
  copyFileSync(SH, join(repo, "scripts/setup-worktree.sh"));
  writeFileSync(
    join(repo, "src/tooling/package-resources.mjs"),
    `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(log)}, "resources " + (process.env.CARGO_TARGET_DIR ?? "-") + "\\n");\n`,
  );
  writeFileSync(
    join(bin, "pnpm"),
    `#!/bin/sh\necho "pnpm $* \${CARGO_TARGET_DIR:--}" >> ${JSON.stringify(log)}\n`,
  );
  chmodSync(join(bin, "pnpm"), 0o755);
  const { CARGO_TARGET_DIR: _, ...env } = process.env;
  const run = (args, extra = {}) =>
    spawnSync("bash", ["scripts/setup-worktree.sh", ...args], {
      cwd: repo,
      encoding: "utf8",
      env: { ...env, HOME: dir, PATH: `${bin}:${process.env.PATH}`, ...extra },
    });
  const calls = () => readFileSync(log, "utf8").trim().split("\n");
  return { run, calls };
}

test("给了共用构建目录：先导出，再装依赖、生成资源，两步都用它", (t) => {
  const { run, calls } = box(t);
  const res = run(["/shared/target"]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(calls(), [
    "pnpm install --frozen-lockfile /shared/target",
    "resources /shared/target",
  ]);
  assert.match(res.stdout, /export CARGO_TARGET_DIR="\/shared\/target"/);
});

test("不给就用本 worktree 自己的 target；环境里已有 CARGO_TARGET_DIR 就照它用", (t) => {
  const own = box(t);
  assert.equal(own.run([]).status, 0);
  assert.deepEqual(own.calls(), ["pnpm install --frozen-lockfile -", "resources -"]);
  const inherited = box(t);
  assert.equal(inherited.run([], { CARGO_TARGET_DIR: "/from/env" }).status, 0);
  assert.deepEqual(inherited.calls(), [
    "pnpm install --frozen-lockfile /from/env",
    "resources /from/env",
  ]);
});

test("共用构建目录给了相对路径就拒绝，什么都不跑", (t) => {
  const { run } = box(t);
  const res = run(["target-shared"]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /绝对路径/);
});
