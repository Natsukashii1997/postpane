#!/bin/bash
# 驿窗装机回读：备份旧版 → 退出 → ditto 覆盖 → 启动 → shasum 与签名回读。
# 由 2026-11-04 至 11-06 十来轮手敲的同一串命令收成脚本；每一步对应的坑见 SKILL.md「3. 装机回读」。
#
#   bash install.sh <证据目录短名> [产物 .app 路径]   装机，证据放 evidence/<今天>-<短名>/
#   bash install.sh check [产物 .app 路径]            只比对：/Applications 里的是不是自己打的这份（L-05）
#   加 --force（放在哪都行）：有开着的自动往返接力也照装（L-44，先问过常浩才加）
#
# 产物默认取当前 worktree 根目录下的固定路径（L-03：不从构建输出里截路径）。
set -euo pipefail

APP=/Applications/PostPane.app
BIN=Contents/MacOS/PostPane
ROOT=$(git rev-parse --show-toplevel)
FORCE=0
ARGS=()
for arg in "$@"; do
  if [ "$arg" = --force ]; then FORCE=1; else ARGS+=("$arg"); fi
done
MODE=${ARGS[0]:-}
NEW=${ARGS[1]:-$ROOT/target/release/bundle/macos/PostPane.app}

hash12() { shasum "$1/$BIN" | cut -c1-12; }

if [ -z "$MODE" ]; then
  echo "用法：bash install.sh <证据目录短名> [产物路径] | bash install.sh check [产物路径]" >&2
  exit 2
fi
if [ ! -x "$NEW/$BIN" ]; then
  echo "找不到产物：$NEW/$BIN（先 pnpm --filter @agent-hud/desktop exec tauri build --bundles app）" >&2
  exit 1
fi

if [ "$MODE" = check ]; then
  built=$(hash12 "$NEW"); installed=$(hash12 "$APP")
  echo "产物 $built / 已装 $installed"
  if [ "$built" = "$installed" ]; then echo "一致"; exit 0; fi
  echo "不一致：已被别的会话覆盖，或还没装（L-05）。先重装再请常浩看。" >&2
  exit 1
fi

# L-44：装机会重启驿窗，重启把开着的自动往返全部暂停（回信不再自动转回）。装前查，有就拒装。
LIVE=$(node "$(dirname "$0")/live-auto-relays.mjs") || {
  echo "读不了接力记录，停在这里，没有装。看清楚再决定要不要加 --force。" >&2
  exit 3
}
if [ -n "$LIVE" ] && [ "$FORCE" != 1 ]; then
  echo "这些接力开着自动往返，装机重启会把它们暂停，停在这里，没有装（L-44）：" >&2
  echo "$LIVE" | sed 's/^/  /' >&2
  echo "先问常浩：等它们结束再装，或者他同意后加 --force 照装。" >&2
  exit 3
fi
if [ -n "$LIVE" ]; then
  echo "照装（--force）：这些接力的自动往返会被暂停："
  echo "$LIVE" | sed 's/^/  /'
fi

E="$HOME/Library/Application Support/postpane/evidence/$(date +%F)-$MODE"   # G-01：证据不放 /tmp
mkdir -p "$E"
OLD=$(hash12 "$APP")
BACKUP="$E/PostPane-$OLD.app"
[ -d "$BACKUP" ] || ditto "$APP" "$BACKUP"
echo "装前 $OLD，已备份到 $BACKUP"

osascript -e 'quit app "PostPane"' || true
# L-03：只认主程序本体，不用 Contents/MacOS 前缀，否则会匹配到各会话起的 agent-hud-mcp / engine。
for _ in $(seq 1 20); do pgrep -f "$BIN\$" >/dev/null || break; sleep 0.5; done
if pgrep -f "$BIN\$" >/dev/null; then
  echo "旧应用 10 秒内没退出，停在这里，没有覆盖。看是不是卡在权限弹窗（L-06）。" >&2
  exit 1
fi
echo "退出于 $(date +%T)"

ditto "$NEW" "$APP"   # L-03：不先删旧版，直接覆盖
open "$APP"
echo "启动于 $(date +%T)"

built=$(hash12 "$NEW"); installed=$(hash12 "$APP")
leaf=$(codesign -d -r- "$APP" 2>&1 | grep -o 'certificate leaf = H"[0-9a-f]\{8\}' || echo "没有固定证书（L-06）")
echo "产物 $built / 已装 $installed / 签名 $leaf"
[ "$built" = "$installed" ] || { echo "回读不一致" >&2; exit 1; }
echo "回滚：osascript -e 'quit app \"PostPane\"'; ditto \"$BACKUP\" $APP; open $APP"
echo "下一步：截屏看有没有「想访问文稿」弹窗（L-06）；请常浩看实物前再跑一次 install.sh check（L-05）。"
