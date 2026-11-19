#!/bin/bash
# 新 worktree 备环境，顺序写死：先定构建目录，再装依赖、生成打包资源（L-01、L-34、E-13）。
#
#   bash scripts/setup-worktree.sh                 用本 worktree 自己的 target/（推荐：并行 worktree 各用各的，L-26）
#   bash scripts/setup-worktree.sh <共用构建目录>   磁盘不够、非共用不可时；给绝对路径
#
# 环境里已有 CARGO_TARGET_DIR 也照它用。package-resources 会编译打包用的程序，它用哪个构建目录取决于
# 当时有没有设 CARGO_TARGET_DIR；先跑它、后导出变量，就会在 worktree 里另生成一份 target（L-34）。
# 脚本改不了调用它的 shell：共用构建目录时，之后跑测试、打包的 shell 里也要 export 同一个值（结尾会打印）。
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
if [ $# -gt 0 ]; then
  case "$1" in
    /*) export CARGO_TARGET_DIR="$1" ;;
    *) echo "共用构建目录要给绝对路径：$1" >&2; exit 2 ;;
  esac
fi
if [ -f "$HOME/.cargo/env" ]; then source "$HOME/.cargo/env"; fi
export PATH="$HOME/.bun/bin:$PATH"

if [ -n "${CARGO_TARGET_DIR:-}" ]; then
  echo "构建目录：$CARGO_TARGET_DIR（共用）"
else
  echo "构建目录：$ROOT/target（本 worktree 自己的）"
fi
pnpm install --frozen-lockfile
node src/tooling/package-resources.mjs   # L-01：不生成资源目录，cargo test 一项都跑不起来
echo "环境备好了。"
if [ -n "${CARGO_TARGET_DIR:-}" ]; then
  echo "之后跑测试、打包的 shell 里先：export CARGO_TARGET_DIR=\"$CARGO_TARGET_DIR\"（L-34）"
fi
