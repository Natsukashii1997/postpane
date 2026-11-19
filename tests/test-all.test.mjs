// `pnpm test` 每套都跑完再汇总（L-47）：原来 `&&` 串联，前面一套挂了后面的不跑，容易当成「只挂了这一套」。
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SUITES, runSuites, summary } from "../src/tooling/test-all.mjs";

test("pnpm test 走汇总脚本，原来 && 串的五套加上注入脚本（#419）", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts.test, "node src/tooling/test-all.mjs");
  assert.deepEqual(
    SUITES.map(([, command, args]) => [command, ...args].join(" ")),
    [
      "cargo test --workspace",
      "pnpm run test:ts",
      "pnpm run test:mcp",
      "pnpm run test:plugins",
      "pnpm run test:extension",
      "pnpm run test:host",
    ],
  );
  for (const [, command, args] of SUITES)
    if (command === "pnpm") assert.ok(pkg.scripts[args[1]], args[1]);
});

test("前面一套失败，后面的照跑；汇总写清哪套挂了，整体算失败", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "test-all-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ran = join(dir, "ran");
  const results = runSuites(
    [
      ["甲", process.execPath, ["-e", "process.exit(3)"]],
      [
        "乙",
        process.execPath,
        ["-e", `require("fs").writeFileSync(${JSON.stringify(ran)}, "")`],
      ],
    ],
    undefined,
    "ignore",
  );
  assert.deepEqual(results, [
    { name: "甲", status: 3 },
    { name: "乙", status: 0 },
  ]);
  assert.ok(existsSync(ran), "第一套失败后第二套也跑了");
  const { failed, text } = summary(results);
  assert.equal(failed, 1);
  assert.match(text, /失败（退出码 3）\s+甲/);
  assert.match(text, /通过\s+乙/);
  assert.equal(summary([{ name: "丙", status: 0 }]).failed, 0);
});
