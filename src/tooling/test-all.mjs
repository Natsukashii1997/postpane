#!/usr/bin/env node
// `pnpm test`：Rust、前端、MCP、插件、Chrome 插件、注入页面的脚本六套依次全跑完再汇总，任何一套失败整体非零退出（L-47）。
// 原来用 `&&` 串起来，前面一套一挂后面的根本不跑，报告里容易当成「只挂了这一套」。
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SUITES = [
  ["Rust", "cargo", ["test", "--workspace"]],
  ["前端", "pnpm", ["run", "test:ts"]],
  ["MCP", "pnpm", ["run", "test:mcp"]],
  ["插件", "pnpm", ["run", "test:plugins"]],
  ["Chrome 插件", "pnpm", ["run", "test:extension"]],
  ["注入脚本", "pnpm", ["run", "test:host"]],
];

/** 依次跑每一套，前面失败不影响后面；返回各套的退出码（被信号杀掉、起不来的算 1）。 */
export function runSuites(suites, run = spawnSync, stdio = "inherit") {
  return suites.map(([name, command, args]) => {
    const result = run(command, args, {
      stdio,
      shell: process.platform === "win32",
    });
    return { name, status: result.status ?? 1 };
  });
}

export function summary(results) {
  const failed = results.filter((result) => result.status !== 0).length;
  const lines = results.map(
    ({ name, status }) =>
      `  ${status === 0 ? "通过" : `失败（退出码 ${status}）`}  ${name}`,
  );
  return {
    failed,
    text: `全量测试汇总：${results.length} 套，失败 ${failed} 套\n${lines.join("\n")}`,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { failed, text } = summary(runSuites(SUITES));
  console.log(`\n${text}`);
  process.exitCode = failed ? 1 : 0;
}
