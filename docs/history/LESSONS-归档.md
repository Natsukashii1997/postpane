# LESSONS 归档

从 `docs/LESSONS.md` 原样移来的条目：已升级或已关闭，之后没再犯（2026-11-22 第一次整理，规则见 LESSONS「怎么升级」）。排障时和 `docs/LESSONS.md`、全局 LESSONS 一起搜。

---

## L-01 新目录直接跑 cargo test，桌面程序编译失败（2026-11-04）

- 现象：刚 `pnpm install` 完的目录跑 `cargo test --workspace`，报 `failed to run custom build command for agent-hud` 和 ``resource path `resources` doesn't exist``，整套 Rust 测试一项没跑。
- 根因：`src/apps/desktop/src-tauri/tauri.conf.json` 把 `resources/` 打进应用，这个目录由 `src/tooling/package-resources.mjs` 生成，被 `.gitignore` 忽略；新目录里没有它，Tauri 的构建脚本直接失败。打包命令的 `beforeBuildCommand` 会先生成，所以只跑打包时看不出来。
- 正确做法：新目录先跑 `node src/tooling/package-resources.mjs`，再跑 `cargo test` 或 `pnpm test`；已写进 AGENTS.md「运行」。
- 证据：2026-11-04 基线，首轮 `cargo test` 退出码 101；生成资源目录后重跑，退出码 0，662 项通过。
- 升级：〔文字〕已升级（2026-11-19 补层级：AGENTS.md「运行」）。原记录：已写进 AGENTS.md「运行」。

## L-02 bun 编译出的程序在 macOS 上一运行就被杀（2026-11-04）

- 现象：`pnpm run test:mcp` 6 项全部失败，报 `Tool some_tool not found`、`Cannot read properties of undefined (reading 'description')`；打包出的 `agent-hud-mcp` 也出现过一运行就退出。
- 根因：`bun build --compile` 产出的程序签名无效（`codesign -v` 报 `invalid signature`），macOS 启动即杀，退出码 137。测试里的替身程序起不来，中转程序就拿不到工具列表。
- 正确做法：凡是 bun 编译出的程序，在 macOS 上编译后立刻 `codesign --force --sign - <文件>`。已在 `src/tooling/package-resources.mjs` 和 `src/apps/mcp/test/host-tools.test.mjs` 补上。
- 证据：2026-11-04 实测，未签名的 bun 程序退出码 137，补签后正常输出；补签后 `test:mcp` 由 `ℹ fail 6` 变为 `ℹ pass 6` / `ℹ fail 0`。
- 升级：〔结构〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：本仓库只有两处 bun 编译，都编完立即补签：打包 `src/tooling/package-resources.mjs` 第 54～68 行（`--compile` 后在 macOS 上 `codesign --force --sign -`），MCP 测试替身 `src/apps/mcp/test/host-tools.test.mjs` 第 54～60 行；2026-11-19 `git grep -- --compile` 核实没有第三处。本机只有驿窗用 bun 编译，暂不提升。不覆盖：以后在别处新加的 bun 编译。 原记录：未升级。换个项目也成立，可提议提升为全局坑。 原写法：「〔结构〕已升级，关闭」（2026-11-19 统一写法）。

## L-03 安装时先删旧版，打包路径读错导致应用被删（2026-11-04）

- 现象：脚本从 `tauri build` 输出里取「Finished 1 bundle at:」下一行当 `.app` 路径，先 `rm -rf /Applications/PostPane.app` 再 `ditto`；`ditto` 报 `Cannot get the real path for source '…/PostPane.app (106.23 MiB)'`，`/Applications` 里一度没有应用。
- 根因：那一行末尾带了大小「(106.23 MiB)」，路径不对；删旧版放在复制成功之前。另外 `pgrep -f "/Applications/PostPane.app/Contents/MacOS"` 会匹配到各会话起的 `agent-hud-mcp`、`agent-hud-engine`，不能用来判断应用本体是否已退出。
- 正确做法：打包产物用固定路径 `target/release/bundle/macos/PostPane.app`（在 worktree 根目录下）；不先删，直接 `ditto <新版> /Applications/PostPane.app` 覆盖；判断本体是否退出用 `pgrep -f "Contents/MacOS/PostPane$"`。
- 证据：2026-11-04 本轮安装，补跑 `ditto` 后成功，应用 22:25:58 重新启动；旧版备份在 `evidence/2026-11-04-receipt-quota/PostPane-before.app`。
- 升级：〔结构〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：装机只留 `.agents/skills/postpane-round/scripts/install.sh` 一种做法：产物用固定路径 `target/release/bundle/macos/PostPane.app`（第 33 行），`ditto` 直接覆盖、不先删（第 104 行），退出判断只认主程序本体 `Contents/MacOS/PostPane$`（第 18、97 行）（E-02）。不覆盖：不走脚本手敲命令。 原记录：未升级。 原写法：「〔结构〕已升级，关闭」（2026-11-19 统一写法）。

## L-06 新装的包卡在「正在读取本机活动…」，侧栏不出现（2026-11-05）

- 现象：#85 打包装进 `/Applications` 后启动，设置页一直显示「正在读取本机活动…」，屏幕边上的侧栏也没出现；`osascript` 让应用退出也不理。
- 根因：每次打包是临时签名，签名一变，系统把它当新应用，在读 `~/Documents` 下的项目文件时弹「"PostPane"想访问"文稿"文件夹中的文件」；弹窗没点之前，数据线程卡在 `open()` 系统调用里（`sample <pid>` 可见 `agenthud-data` 线程停在 `projects::project_id → read_to_string → open`），出快照的线程都在等它的锁。
- 正确做法：装完新包先截屏看有没有这个权限弹窗，有就请常浩点「允许」（隐私权限只能本人点）；不要误判成改动把数据读取弄坏了，也不要反复重装。
- 根治（2026-11-06，#134）：`tauri.macos.conf.json` 改用登录钥匙串里的本机自用证书 `PostPane Local Signing` 签名，系统改按「标识 `app.postpane.mac` + 证书」认应用（`codesign -d -r- /Applications/PostPane.app` 应显示 `certificate leaf = H"b773068e…"`，不再是 `cdhash`）。换签名后第一次装还要点一次「允许」，之后重装不再弹。证书没信任设置，`security find-identity -v` 不列它属正常，签名照样可用。换电脑或证书丢了打包会报找不到身份：用 openssl 生成带 `extendedKeyUsage = critical,codeSigning` 的自签证书，`security import <p12> -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign` 导入，名字仍叫 `PostPane Local Signing`；证书一换，要再点一次「允许」。
- 证据：2026-11-05 19:32 截屏 `~/Library/Application Support/postpane/evidence/2026-11-05-scroll-gap/d1s.png`，采样 `sample.txt` 同目录。
- 升级：〔结构〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：`src/apps/desktop/src-tauri/tauri.macos.conf.json` 第 5 行固定用 `PostPane Local Signing` 签名（E-05 `9f9d7a5`），重装不再换签名、不再重弹文稿权限；`install.sh` 第 109 行装后回读证书。 原记录：未升级。 原写法：「〔结构〕已升级，关闭」（2026-11-19 统一写法）。

## L-12 全量测试偶发一条 core 演示测试失败，不是本次改动造成的（2026-11-07）

- 现象：PR #170 第一次跑 `pnpm test` 退出 101，Rust 只有 `agent-hud-core` 的 `demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes` 失败，断言在 `src/crates/core/src/demo/mod.rs` 1198 行。本 PR 没改 core；同一份代码单独跑这条 3 次都过，第二次全量也是 0 失败。
- 根因：未核实。这条测试用 `Utc::now()` 起演示数据，再连做两次 `request_snapshot`，断言第二次是 `{"unchanged": true}`；推测两次之间演示数据里跟时间有关的内容变了（比如「已 N 分钟」跨过一格）。全量并行跑、机器忙的时候更容易碰上。
- 正确做法：全量只失败这一条、改动又不碰 core 时，先单独重跑它（`cargo test -p agent-hud-core a_pass_with_nothing_new_renders_nothing_until_something_changes`），过了再重跑一次全量，以第二次全量为准；交接里两次的结果都照实写。再出现就把这条测试的时间固定下来，另开一单修。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-launch-attribution/test.log`（第一次，失败）、`test2.log`（第二次，Rust 734 passed / 0 failed）；PR #170 描述。
- 升级：〔结构〕已升级（2026-11-19，#415：这条测试改用固定时钟 `snapshot::PINNED_CLOCK`，两次 pass 之间真实时间走多久都不影响；在两次 pass 之间注入「停到下一个时限之后」的延时，旧代码失败、新代码通过，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`；积压清单组 1。不覆盖：别的测试里直接读 `Utc::now()` 的写法）。原记录：未升级。

## L-17 机器负载很高时，`core` 的 Grok 计时测试稳定失败（2026-11-07）

- 现象：`pnpm test` 里 `source_db::tests::grok_bot_session_works_while_a_message_has_no_reply_and_idles_once_answered` 在 `tests.rs:608` 的 `assert!(!backend.look())` 失败，单独重跑三次都失败，每次 12–19 秒；同一份代码一小时前、以及负载降下来后的全量都通过。
- 根因：这条测试要求刷新完之后 10 秒内再看一次「不该到点」；当时 `uptime` 负载均值 64–71（多个会话同时编译），一次刷新本身就超过 10 秒，轮询已经到点。与改动无关。
- 正确做法：这条失败先看 `uptime`；负载均值远高于核数时等别的编译跑完再重跑全量，不要为它改代码或改测试。交接里写明当时的负载和重跑结果。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-reply-dismiss-all/test.log`（失败）、`test-2.log`、`test-3.log`（负载 14–17 时通过，Rust 合计 742、743 passed / 0 failed）。
- 升级：〔结构〕已升级（2026-11-19，#415：Grok 轮询的「到点」改读 `snapshot::wall_clock_ms()`（`lib.rs` 的 `look`、`source_db.rs` 记下次轮询时间），测试固定时钟，验「差 1 毫秒不到点、满 10 秒到点」，不再按真实 10 秒计时；注入「一次刷新超过 10 秒」的延时，旧代码失败、新代码通过，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`；积压清单组 1。正式运行时两处读的仍是真实时间，行为不变）。原记录：未升级。

## L-26 几个 worktree 共用 CARGO_TARGET_DIR，测试跑的是别的 worktree 编出的代码（2026-11-08）

- 现象：5 个子 agent 并行修 #220–#224，为省磁盘共用 `~/Library/Caches/postpane-shared-target`。#227 报「Rust 761 passed」，可它新增了 4 条 Rust 测试，应是 765；#222 一次红测试报「running 0 tests」；#223 改 l10n 时报「找不到函数」。
- 根因：同名 crate 在不同目录编出的产物文件名哈希相同（main 与共享目录里 `agent_hud_core-16f50467…` 一模一样），cargo 判断要不要重编只看 dep-info 里记的源文件路径与修改时间，记的是上一次编译它的那个 worktree 的路径。于是一个 worktree 的改动被当成「已编」，测试跑的是别人的代码，结果照样是绿的。
- 正确做法：并行 worktree 各用各的构建目录；磁盘不够非共用不可时，每次跑测试前把本 worktree 的 `.rs` 和 `Cargo.toml` 修改时间改到未来（`find src/crates src/apps/desktop/src-tauri \( -name '*.rs' -o -name Cargo.toml \) -exec touch -t <未来时间> {} +`），并核对三件事：输出里有本 worktree 路径的 `Compiling` 行、新测试名出现且通过、Rust 通过总数等于基线加新增条数。合并前在主目录用 main 自己的构建目录再跑一次全量。
- 证据：`evidence/2026-11-07-fix-220/main-f441f73-cargo-test.log`（主目录补验 765 passed，含 #227 的 4 条新测试）；`evidence/2026-11-07-fix-224/core-host-after-rebase.log`（core 176 = 174 + 2）；`evidence/2026-11-08-ops-fixes/test.log`（合完 5 批后 774 = 761 + 13）。
- 升级：〔文字〕已升级（2026-11-19 补层级：驿窗一轮 SKILL.md 第 1、2 步（E-11））。原记录：未写成测试（构建环境问题）；写进驿窗一轮 SKILL.md 第 1、2 步（E-11）。
- 提升：已提升为全局 G-23（2026-11-08，agent-kit#40）。
- 补充（2026-11-09，#249 批量 7 个子 agent 共用主目录 `target`）：
  - 共用时每次测试前把本 worktree **全部** `.rs`、`Cargo.toml`、`build.rs` 的修改时间改到未来，比只改动过的文件更稳：每次都从本路径重编，代价是多编几分钟。
  - 基线还在后台编译时不要改源码，否则改动会混进基线，只能存补丁、还原、重跑（#261）。
  - 文档测试可能报 `extern location for agent_hud_l10n does not exist`：别的 agent 同时编译换掉了 rlib 的文件名。先重跑一次再判断，交接里把单元测试数和文档测试结果分开写（#265，`evidence/2026-11-09-265-upstream-small/baseline-cargo-test.txt` 第 880–891 行）。

## L-33 并行子 agent 共用一台机器，宽泛的 `pkill -f` 把别人正在跑的测试也杀了（2026-11-09）

- 现象：#261 为停掉自己的基线测试，执行 `pkill -f 'pnpm test'; pkill -f 'cargo test'`。同时在跑的 #264、#265 的全量测试被中断，以 143 / 144 退出，只能重跑。
- 根因：`-f` 匹配所有进程的完整命令行，不分是谁开的。
- 正确做法：只停自己的后台任务（用任务 ID，或按本 worktree 的绝对路径精确匹配），不按命令名广撒。
- 证据：#261、#265 的子 agent 报告（2026-11-09），#265 第一次基线以 144 退出。
- 可提议提升为全局坑：换个项目也成立（多个会话或子 agent 并行时都会碰上）。
- 升级：〔机检〕已升级（2026-11-19 补写升级行；agent-kit#82：本机 Claude Code 的 Bash 预检钩子 `hooks/bash-precheck.mjs` 的 `kill-pkill-broad` 规则，执行前拒绝宽泛的 `pkill -f` 并给出改写；不覆盖：Codex、终端里手敲的命令）。
- 提升：已提升为全局 G-32（2026-11-19，agent-kit#82）。

## L-34 共用 `CARGO_TARGET_DIR` 时，`package-resources` 先于导出变量跑，又在 worktree 里生成了自己的 `target`（2026-11-09）

- 现象：#260 的新 worktree 按顺序先跑 `node src/tooling/package-resources.mjs`、再导出 `CARGO_TARGET_DIR`，结果 worktree 里生成了 387 MB 的 `target`。磁盘只剩约 18 GB。
- 根因：这个脚本会编译打包用的程序，它用哪个构建目录取决于当时有没有设 `CARGO_TARGET_DIR`。主会话写给子 agent 的共用规矩把两步顺序写反了。
- 正确做法：共用构建目录时，先 `export CARGO_TARGET_DIR=…`，再跑 `package-resources` 和其他任何会编译的命令。
- 证据：#260 子 agent 报告（已删掉那 387 MB）；共用规矩已在第二批改过来。
- 升级：〔结构〕已升级（2026-11-19，#415：备环境收成 `scripts/setup-worktree.sh`，顺序写死：先定构建目录（参数或已有的 `CARGO_TARGET_DIR`），再 `pnpm install --frozen-lockfile`、生成打包资源；AGENTS.md「运行」和驿窗一轮 SKILL.md 第 1 步指向它，测试 `tests/setup-worktree.test.mjs`；积压清单组 5，与 E-13 合并。不覆盖：不用脚本、手敲命令）。

## L-41 bypass 模式下 Bash 仍要批准，批准卡只挂在驿窗侧栏，没人点，16 分钟后桌面版判「Claude Code stopped responding」（2026-11-09）

- 现象：CarvoMOTO 会话（`708f52e0`，bypass）13:50 发起一条 heredoc 里带「两个美元符加左括号」的 Bash，侧栏挂出 BASH 卡；Claude 窗口里没有任何提示，常浩以为不用管。本会话 14:04 一条双引号里带「反斜杠加美元符加左括号」的 grep 同样一直不返回，14:20 桌面版判「stopped responding」。之后本会话 15:0x 用 Python heredoc 写这一条坑，正文里带了同样的字符，又被拦、又被掐断一次。
- 根因：
  - Claude Code 对它不能确定 shell 会怎么解析的命令有一条内置安全检查，bypass 模式也强制要人批准。在不挂驿窗钩子的 `claude -p --permission-mode bypassPermissions` 里复现，两条命令都回「This command could not be checked for dangerous rm operations: the shell may read it differently than it was parsed. This requires explicit approval.」，普通 `echo` 不受影响。
  - 本机配了驿窗的 PermissionRequest 钩子（超时 86400 秒）。钩子挂着时 Claude Code 不去问桌面版：`main.log` 的超时行写着 `host_requests_in_flight=0, outstanding_host_request=none`，桌面窗口不弹。
  - 驿窗等满「等待回答」时长（默认 10 分钟）把请求交回，Claude Code 对这类安全检查直接拒绝：CarvoMOTO 那条 06:02:33（UTC）收到「denied by a built-in Claude Code safety check, not by the user」。钩子 16 分钟内没回时，桌面版先按 960 秒左右无动静掐掉这一轮。
- 正确做法：
  - Bash 命令里不在 heredoc 或引号中放命令替换的写法（美元符加左括号）；要嵌代码或长文本，先用 Write / Edit 写成文件再执行。
  - 侧栏 BASH 卡是这类请求唯一的批准入口；#292 起卡上写明「Claude 桌面窗口里不会弹这条，请在这里批」。
  - 会话弹「stopped responding」时，在 `main.log` 搜 `timed out after`；`last_tool_name=Bash` 且 `outstanding_host_request=none` 时，先看侧栏有没有挂着的权限卡。
- 证据：`~/Library/Logs/Claude/main.log` 第 64221、65243 行；复现输出与预览截图在 `~/Library/Application Support/postpane/evidence/2026-11-09-292-start-bash/`。
- 升级：〔机检〕已升级（2026-11-19 补层级：见下方补正，agent-kit#49 的 Bash 预检钩子 `hooks/bash-precheck.mjs` 执行前拒绝这几类写法；不覆盖：Codex）。原记录：可提议提升为全局坑（任何项目在 Claude 桌面版里写这类命令都会碰上），等常浩批。终端里的 Claude Code 是否同时弹窗未核实。
- 补正（2026-11-09，agent-kit#49）：
  - 触发写法不止「解析不了」一类。rm 目标拿不准也会要批准：变量加通配符（`"$O"/*.zip`、`$L/*.log`）、整目录通配（`shots/*`）、`$TMPDIR` 下的通配。当天 6 次里有 3 次是这类（10:10、12:02、12:25）。同样的写法在先 `cd` 到工作目录外、或有 `source` 时才被拦，其他时候能过，所以容易误以为没事。
  - 解析类比上面写的窄：单独的「美元符加左括号」、heredoc 里的命令替换都不会出事；出事的是「两个美元符加左括号」（前面带点的 Playwright 写法除外）和「两个反斜杠加美元符加左括号」。上面「正确做法」第一条可以照旧遵守，只是范围比实际宽。
  - 实测能过的改写：`"${O:?}"/*.zip`、`shots/*.png`、要嵌的代码先写成文件。
  - 升级：agent-kit#49（PR #50）加了 Bash 预检钩子 `hooks/bash-precheck.mjs`，已装进本机，执行前当场拒绝这几类写法并给出改写。证据 `~/Library/Application Support/agent-kit/evidence/2026-11-09-49-bash-precheck/`。
- 提升：已提升为全局 G-25（2026-11-09）。

## L-44 装机前查自动往返接力，查出有也照装了：查和装写在同一条命令里，中间没停（2026-11-14）

- 现象：#336 装机时把「查有没有开着自动往返的接力」和 `install.sh` 写进同一条命令。查出 `h1a1d7a90d8e00`（digital-twin｜PR #175 专项复审，10:39:33 刚把请审核送给 ChatGPT）开着自动往返，脚本照样往下装；10:39:58 重启后这单记「驿窗重启，自动往返先暂停」，ChatGPT 的回信不再自动转回 Claude，要常浩在卡上手动点。
- 根因：装机必然重启驿窗，重启会暂停所有 `auto` 且 opening / open 的接力（`handoffs.rs`，7a 批 2 起在 `host/src/handoff/book.rs`，的 `restarted`）。「装前先查」只是写在交接和习惯里，脚本不管，查的结果要人看了才算数，一串命令里看不到。
- 正确做法：`install.sh` 在备份、退出旧应用之前调 `live-auto-relays.mjs`，有这样的接力就列出来并 `exit 3`，什么都不动；先问常浩，等它们结束再装，或他同意后加 `--force` 照装。别为了绕开它自己加 `--force`。
- 2026-11-14 收窄（常浩选甲）：同一天驿窗改成重启后自动往返接着跑，重启不再暂停，上面的根因只剩「回信刚到、正在转回」这一刻（`phase` 为 `replied`）；`live-auto-relays.mjs` 只查这一种，平时开着自动往返也照装。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-14-336-point-numbers/install.log`（照装那次）、`2026-11-14-install-auto-guard/guard-run.log`（加保护后拒装）。
- 升级：〔机检〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：`install.sh` 每次装机必经，第 71～79 行在备份（第 90 行）、退出旧应用之前调 `live-auto-relays.mjs`，有回信正在转回的接力就 exit 3、什么都不动，问过常浩才加 `--force`；脚本的判断由 `tests/postpane-round.test.mjs`「live-auto-relays 只列…」两条守住，`install.sh` 里 exit 3 这条路没有端到端测试。不覆盖：不走 `install.sh` 手动装。上一版：〔机检〕已升级（2026-11-19 补写升级行）。 原写法：「〔机检〕已升级，关闭」（2026-11-19 统一写法）。

## L-45 预览脚手架的 `?still` 用展开复制伪造 `matchMedia`，小人全退成静态图（2026-11-14）

- 现象：#349 搭场景预览台，照抄 #331–#341 脚手架的 `?still`（报告减少动效，防截到半路帧，L-29）。控制台连报 `Bot artwork unavailable TypeError: media.addEventListener is not a function`，侧栏小人不画动态画布、退回静态图。之前几轮带 `?still` 截的预览图里，小人很可能都是静态的。
- 根因：`{ ...real(q), matches: true }` 只复制自有属性，`MediaQueryList` 的 `addEventListener` 等方法在原型上，展开后就没了；`BotMark.tsx` 订阅减少动效变化时抛错，被兜底成静态图。
- 正确做法：用 `Proxy` 包住真实的 `MediaQueryList`，只改 `matches`，方法照原对象绑定（`src/packages/hud/preview/main.tsx`）。以后预览一律用常设的场景预览台（`pnpm --filter @agent-hud/hud run scenes`），不再另抄脚手架；截图前用 `document.querySelectorAll("canvas").length` 确认小人画布在。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-14-349-workplace-scenes/`。
- 升级：〔结构〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：常设场景预览台 `src/packages/hud/preview/main.tsx` 第 36～49 行的 `?still` 用 `Proxy` 包住真实的 `MediaQueryList`，只改 `matches`；仓库里已没有 `{ ...real(q) }` 那种展开复制（2026-11-19 `git grep` 核实），旧脚手架只留在证据目录里。不覆盖：从证据目录把旧脚手架抄回来用（组 12 另在 `pnpm run check` 开头拦 `src/` 下没提交的文件）。上一版：〔提醒〕未升级（2026-11-19 补层级：常设场景预览台已改用 `Proxy`，但仍可另抄脚手架）。 原写法：「〔结构〕已升级，关闭」（2026-11-19 统一写法）。

## L-46 Claude 会话挂着后台命令等通知，侧栏却出 REPLY（2026-11-14）

- 现象：Claude Code 会话用 `run_in_background` 跑全量测试，说完「测试在后台跑，结果出来再补数字」就停下；侧栏立刻出 REPLY 回执，当成回复完成、等常浩回复。实际它还在干活，测试结束会被唤醒接着做（#353）。
- 根因：`claude/transcript.rs` 看到 `stop_reason: end_turn` 就把回合记为 completed。一轮结束不等于会话停下：Claude Code 会在后台命令结束（完成、失败、被杀、停止）时送一条 `<task-notification>`（空闲时是 `origin.kind = task-notification` 的用户消息，忙时是 `queued_command` 附件）唤醒它。原来只有「子 agent 还在写记录」会压住 completed，后台 Bash 不算。
- 正确做法：判断 Claude 会话「做完了没有」，除了回合结束，还要看有没有没收到通知的后台命令（`toolUseResult.backgroundTaskId` 记入，通知里的 `<task-id>` 或 `TaskStop` 移除），在 `src/crates/agents/src/claude/background.rs`；兜底同子 agent，启动 30 分钟（`ABANDONED_MS`）仍没通知就照常算完成。
- 证据：`claude::background::tests` 4 项；去掉修复后其中 2 项变红。
- 升级：〔提醒〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：`src/crates/agents/src/claude/background.rs` 记下没收到通知的后台命令，`src/crates/agents/src/transcript/live.rs` 第 524、567、625 行判断「做完没有」时都经 `with_background`；靠测试 `claude::background::tests` 4 条守住（去掉修复后其中 2 条变红，见上方证据），测试未接进必经检查。 原记录：未升级。 原写法：「〔提醒〕部分升级，关闭」（2026-11-19 统一写法）。
