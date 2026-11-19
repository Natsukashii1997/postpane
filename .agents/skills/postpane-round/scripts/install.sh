#!/bin/bash
# 驿窗装机回读：拿锁 → 查归属 → 备份旧版 → 截装前侧栏 → 退出 → ditto 覆盖 → 启动 → shasum 与签名回读 → 记归属 → 装后冒烟。
# 由 2026-11-04 至 11-06 十来轮手敲的同一串命令收成脚本；每一步对应的坑见 SKILL.md「3. 装机回读」。
#
#   bash install.sh <证据目录短名> [产物 .app 路径]   装机，证据放 evidence/<今天>-<短名>/（短名不带日期，如 341-relay-toggle）
#   bash install.sh check [产物 .app 路径]            只比对：/Applications 里的是不是自己打的这份（L-05），并说现在装的是谁的；
#                                                    不给产物路径就按归属记录比（E-15、E-20），见 install-guard.sh 的 check_record
#   加 --force（放在哪都行）：有回信正在转回的接力也照装（L-44，先问过常浩才加）
#   加 --takeover（放在哪都行）：现在装着的是别的会话的包也照装（L-05，先确认对方的包不再需要才加）
#
# 退出码：1 出错 / 回读不一致；2 用法；3 有接力正在转回；4 别的会话正在装；5 装着的是别的会话的包；6 装上了但冒烟没过。
# 产物默认取当前 worktree 根目录下的固定路径（L-03：不从构建输出里截路径）。
# 锁和归属记录在 ~/Library/Application Support/postpane/install/（见 install-guard.sh）。
# POSTPANE_INSTALL_APP 仅供测试：把安装位换成临时目录（测试同时把 HOME 换成临时目录、用替身命令，不碰真应用）。
set -euo pipefail

APP=${POSTPANE_INSTALL_APP:-/Applications/PostPane.app}
BIN=Contents/MacOS/PostPane
ROOT=$(git rev-parse --show-toplevel)
HERE=$(cd "$(dirname "$0")" && pwd)
STATE="$HOME/Library/Application Support/postpane/install"
FORCE=0
TAKEOVER=0
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --takeover) TAKEOVER=1 ;;
    *) ARGS+=("$arg") ;;
  esac
done
MODE=${ARGS[0]:-}
NEW=${ARGS[1]:-$ROOT/target/release/bundle/macos/PostPane.app}

hash12() { shasum "$1/$BIN" | cut -c1-12; }
# shellcheck source=install-guard.sh
source "$HERE/install-guard.sh"

if [ -z "$MODE" ]; then
  echo "用法：bash install.sh <证据目录短名> [产物路径] | bash install.sh check [产物路径]" >&2
  exit 2
fi
if [ "$MODE" = check ] && [ ${#ARGS[@]} -lt 2 ]; then
  check_record
fi
# E-17：脚本自己加日期；短名再带日期，备份会落进日期重复的目录、回滚命令也跟着错。
if [[ "$MODE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}- ]]; then
  echo "短名不带日期（脚本自己加）：用 ${MODE:11}，不用 ${MODE}。没有装。" >&2
  exit 2
fi
if [ ! -x "$NEW/$BIN" ]; then
  echo "找不到产物：$NEW/$BIN（先 pnpm --filter @agent-hud/desktop exec tauri build --bundles app）" >&2
  exit 1
fi

if [ "$MODE" = check ]; then
  built=$(hash12 "$NEW"); installed=$(hash12 "$APP")
  echo "产物 $built / 已装 $installed"
  if [ "$installed" = "$(field "$RECORD" hash)" ]; then echo "已装的是 $(describe_record)"; else echo "已装的包不在归属记录里"; fi
  if [ "$built" = "$installed" ]; then echo "一致"; exit 0; fi
  echo "不一致：已被别的会话覆盖，或还没装（L-05）。先重装再请常浩看。" >&2
  exit 1
fi

# L-05：同一时刻只许一个会话装机；后到的直接失败，不排队（排到了也会被下面的归属检查拦下）。
acquire_lock
trap release_lock EXIT
check_owner

# L-44：装机会重启驿窗。重启不再暂停自动往返，但回信刚到、正在转回 Claude 时重启，转回可能送了一半。装前查，有就拒装。
LIVE=$(node "$HERE/live-auto-relays.mjs") || {
  echo "读不了接力记录，停在这里，没有装。看清楚再决定要不要加 --force。" >&2
  exit 3
}
if [ -n "$LIVE" ] && [ "$FORCE" != 1 ]; then
  echo "这些接力的回信刚到、正在转回 Claude，现在重启可能送一半，停在这里，没有装（L-44）：" >&2
  echo "$LIVE" | sed 's/^/  /' >&2
  echo "过一两分钟等它们转回完再装；急的话问常浩，他同意后加 --force 照装。" >&2
  exit 3
fi
if [ -n "$LIVE" ]; then
  echo "照装（--force）：这些接力的回信正在转回，重启后由驿窗接着转："
  echo "$LIVE" | sed 's/^/  /'
fi

E="$HOME/Library/Application Support/postpane/evidence/$(date +%F)-$MODE"   # G-01：证据不放 /tmp
mkdir -p "$E"
OLD=$(hash12 "$APP")
BACKUP="$E/PostPane-$OLD.app"
[ -d "$BACKUP" ] || ditto "$APP" "$BACKUP"
echo "装前 $OLD，已备份到 $BACKUP"
# L-35：装前截一张侧栏，装后对比。截不到不拦装机，装后照样查小人在不在动。
node "$HERE/smoke.mjs" shot "$E/smoke-before" || echo "装前没截到侧栏（旧应用没在跑、锁屏或没有屏幕录制权限），装后只查小人在不在动。"

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
record_owner
echo "回滚：osascript -e 'quit app \"PostPane\"'; ditto \"$BACKUP\" $APP; open $APP"

# L-35：隔 2 秒截侧栏，小人必须在动；再和装前对比，差异图放证据目录。
if ! node "$HERE/smoke.mjs" after "$E"; then
  echo "装上了，但冒烟没过（见上面一行）。先看证据目录里的截图，确认是改坏了就照上面的回滚命令撤回，再报告（AGENTS.md「已定内容」）。" >&2
  exit 6
fi
echo "下一步：截屏看有没有「想访问文稿」弹窗（L-06）；请常浩看实物前再跑一次 install.sh check（L-05）。"
