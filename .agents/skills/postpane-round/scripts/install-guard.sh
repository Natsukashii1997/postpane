# 装机锁与归属记录，由 install.sh source（L-05：并行会话前后脚装机，后装的覆盖先装的，装的人不知道）。
# 用到 install.sh 里的 APP、BIN、ROOT、STATE、TAKEOVER 和 hash12。
#
#   $STATE/lock/           装机锁：mkdir 成功即拿到（原子），lock/owner 记谁拿的；装完或脚本退出时删掉
#   $STATE/takeover/       接管死锁时的小锁，保证同一时刻只有一个会话在接管
#   $STATE/installed.txt   上次装成功的包来自哪个 worktree、分支、提交
#
# 死锁：持锁进程已经不在，或锁超过 30 分钟（一次装机连冒烟不到 2 分钟，超时多半是进程号被复用）。

LOCK="$STATE/lock"
RECORD="$STATE/installed.txt"
LOCK_STALE=1800

field() { sed -n "s/^$2=//p" "$1" 2>/dev/null | head -1; }

who_am_i() {
  echo "worktree=$ROOT"
  echo "branch=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
  echo "commit=$(git -C "$ROOT" rev-parse HEAD)"
  # 只看已跟踪文件：主目录常有没提交的设计稿，算进来 main 的包就都成了「不是 main 构建的」
  if git -C "$ROOT" diff --quiet HEAD --; then echo "dirty=no"; else echo "dirty=yes"; fi
}

take_lock() {
  mkdir "$LOCK" 2>/dev/null || return 1
  { who_am_i; echo "pid=$$"; echo "time=$(date '+%F %T')"; } > "$LOCK/owner"
}

lock_is_stale() {
  [ -d "$LOCK" ] || return 0 # 刚被放掉：当成可以拿
  local pid age
  pid=$(field "$LOCK/owner" pid)
  age=$(( $(date +%s) - $(stat -f %m "$LOCK") ))
  [ "$age" -ge "$LOCK_STALE" ] && return 0
  # 还没写 owner：可能是别的会话刚 mkdir、正在写，给它一分钟
  [ -z "$pid" ] && { [ "$age" -ge 60 ]; return; }
  ! kill -0 "$pid" 2>/dev/null
}

lock_busy() {
  echo "另一个会话正在装机，停在这里，没有装（L-05）：" >&2
  sed 's/^/  /' "$LOCK/owner" >&2 2>/dev/null || echo "  （它刚拿锁，还没写下是谁）" >&2
  echo "等它装完，看它装的是什么（bash install.sh check）再决定要不要装；一般它装完你会被归属检查拦下，按那条提示办。" >&2
  exit 4
}

acquire_lock() {
  mkdir -p "$STATE"
  take_lock && return 0
  lock_is_stale || lock_busy
  # 接管死锁：takeover 小锁让同一时刻只有一个会话接管；拿到后再看一次，确认还是死锁才删
  local t="$STATE/takeover"
  if [ -d "$t" ] && [ $(( $(date +%s) - $(stat -f %m "$t") )) -ge 60 ]; then rmdir "$t" 2>/dev/null || true; fi
  mkdir "$t" 2>/dev/null || lock_busy
  if lock_is_stale; then
    if [ -d "$LOCK" ]; then
      echo "接管上次装机异常退出留下的锁（持锁进程已不在或超过 30 分钟）："
      sed 's/^/  /' "$LOCK/owner" 2>/dev/null || echo "  （锁里没有记录）"
      rm -rf "${LOCK:?}"
    fi
    take_lock && { rmdir "$t"; return 0; }
  fi
  rmdir "$t"
  lock_busy
}

release_lock() {
  [ "$(field "$LOCK/owner" pid)" = "$$" ] && rm -rf "${LOCK:?}"
  return 0
}

# 记录里的包是不是 main 构建的：从没改动的工作区打的，而且提交已经在 origin/main 里，
# 或者它的分支已经 squash 合进 main（整支改动在 main 里有一模一样的补丁）。后一条让「分支装机验收 → 合并 →
# 从 main 重装」（SKILL.md 第 5 步）不用每次都 --takeover。
from_main() {
  local c base squashed
  c=$(field "$RECORD" commit)
  [ "$(field "$RECORD" dirty)" = no ] || return 1
  git -C "$ROOT" merge-base --is-ancestor "$c" origin/main 2>/dev/null && return 0
  base=$(git -C "$ROOT" merge-base origin/main "$c" 2>/dev/null) || return 1
  squashed=$(git -C "$ROOT" commit-tree "$c^{tree}" -p "$base" -m squash-check) || return 1
  [ "$(git -C "$ROOT" cherry origin/main "$squashed" | cut -c1)" = "-" ]
}

describe_record() {
  echo "$(field "$RECORD" worktree)（分支 $(field "$RECORD" branch)，提交 $(field "$RECORD" commit | cut -c1-12)$( [ "$(field "$RECORD" dirty)" = yes ] && echo "，带没提交的改动")）$(field "$RECORD" time) 装的 $(field "$RECORD" hash)"
}

# 装前：现在装着的包如果既不是 main 构建的、也不是本 worktree 上次装的，就拒装（exit 5），--takeover 才装
check_owner() {
  [ -x "$APP/$BIN" ] || return 0
  if [ ! -f "$RECORD" ]; then
    echo "还没有归属记录（第一次用带记录的 install.sh），照装。"
    return 0
  fi
  local installed reason
  installed=$(hash12 "$APP")
  if [ "$installed" = "$(field "$RECORD" hash)" ]; then
    [ "$(field "$RECORD" worktree)" = "$ROOT" ] && return 0
    from_main && return 0
    reason="现在装着的是 $(describe_record)，不是 main 构建的，也不是本 worktree 装的。"
  else
    reason="现在装着的 $installed 不在归属记录里（记录里最后一次是 $(describe_record)）：可能是用旧版 install.sh 的会话装的，或有人手动 ditto、回滚过。"
  fi
  if [ "$TAKEOVER" = 1 ]; then
    echo "接管（--takeover）：$reason"
    return 0
  fi
  echo "$reason 停在这里，没有装（L-05）。" >&2
  echo "要继续：先确认对方的包不再需要（它的 PR 已合并或关闭、交接里写了已验完，或问过常浩），再加 --takeover 重跑。装前的包照常备份，脚本会打印回滚命令。" >&2
  exit 5
}

record_owner() {
  { who_am_i; echo "hash=$(hash12 "$APP")"; echo "artifact=$NEW"; echo "time=$(date '+%F %T')"; echo "evidence=$E"; } > "$RECORD.tmp"
  mv "$RECORD.tmp" "$RECORD"
}
