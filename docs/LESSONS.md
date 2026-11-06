# 开发实录与坑

踩过的坑记在这里，Claude 和 Codex 都读。排障、发布、改脚本之前，先搜一遍：`grep -n 关键词 docs/LESSONS.md`；换个项目也成立的坑在全局 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md`（G-xx），也搜一遍。

## 怎么写

- 每轮交接时自问「本轮踩到新坑了吗」：有就在下面追加一条，并在 CURRENT.md 的交接里写「本轮新坑：L-xx」；没有就写「无」。
- 一条一个坑，编号只增不改。写现象、根因、正确做法、证据。证据写到能查的程度（提交号、文件与章节、证据目录）；查不到就写「未核实」，不编。
- 结论被推翻时改条目并注明日期，不删。

## 怎么升级

- 同类坑第 2 次出现：把正确做法写进 AGENTS.md 或 docs/OPERATIONS.md（一句话硬约束进 AGENTS.md，操作细节进 OPERATIONS.md），条目的「升级」改成写到了哪里。
- 能用机器判定的：写成测试或脚本（如 `scripts/check-rules.mjs`），条目注明。
- 换个项目也成立的（不依赖本项目的业务、页面、发布脚本）：提议提升到全局坑 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md`，写成 G-xx；原条目保留，末尾加一行「提升：已提升为全局 G-xx（日期）」。只出提案，用户批准才写。
- 条目超过约 30 条时整理一次：已升级、且之后没再犯的，归档到 `docs/history/`。

---

## L-01 新目录直接跑 cargo test，桌面程序编译失败（2026-11-04）

- 现象：刚 `pnpm install` 完的目录跑 `cargo test --workspace`，报 `failed to run custom build command for agent-hud` 和 ``resource path `resources` doesn't exist``，整套 Rust 测试一项没跑。
- 根因：`src/apps/desktop/src-tauri/tauri.conf.json` 把 `resources/` 打进应用，这个目录由 `src/tooling/package-resources.mjs` 生成，被 `.gitignore` 忽略；新目录里没有它，Tauri 的构建脚本直接失败。打包命令的 `beforeBuildCommand` 会先生成，所以只跑打包时看不出来。
- 正确做法：新目录先跑 `node src/tooling/package-resources.mjs`，再跑 `cargo test` 或 `pnpm test`；已写进 AGENTS.md「运行」。
- 证据：2026-11-04 基线，首轮 `cargo test` 退出码 101；生成资源目录后重跑，退出码 0，662 项通过。
- 升级：已写进 AGENTS.md「运行」。

## L-02 bun 编译出的程序在 macOS 上一运行就被杀（2026-11-04）

- 现象：`pnpm run test:mcp` 6 项全部失败，报 `Tool some_tool not found`、`Cannot read properties of undefined (reading 'description')`；打包出的 `agent-hud-mcp` 也出现过一运行就退出。
- 根因：`bun build --compile` 产出的程序签名无效（`codesign -v` 报 `invalid signature`），macOS 启动即杀，退出码 137。测试里的替身程序起不来，中转程序就拿不到工具列表。
- 正确做法：凡是 bun 编译出的程序，在 macOS 上编译后立刻 `codesign --force --sign - <文件>`。已在 `src/tooling/package-resources.mjs` 和 `src/apps/mcp/test/host-tools.test.mjs` 补上。
- 证据：2026-11-04 实测，未签名的 bun 程序退出码 137，补签后正常输出；补签后 `test:mcp` 由 `ℹ fail 6` 变为 `ℹ pass 6` / `ℹ fail 0`。
- 升级：未升级。换个项目也成立，可提议提升为全局坑。

## L-03 安装时先删旧版，打包路径读错导致应用被删（2026-11-04）

- 现象：脚本从 `tauri build` 输出里取「Finished 1 bundle at:」下一行当 `.app` 路径，先 `rm -rf /Applications/PostPane.app` 再 `ditto`；`ditto` 报 `Cannot get the real path for source '…/PostPane.app (106.23 MiB)'`，`/Applications` 里一度没有应用。
- 根因：那一行末尾带了大小「(106.23 MiB)」，路径不对；删旧版放在复制成功之前。另外 `pgrep -f "/Applications/PostPane.app/Contents/MacOS"` 会匹配到各会话起的 `agent-hud-mcp`、`agent-hud-engine`，不能用来判断应用本体是否已退出。
- 正确做法：打包产物用固定路径 `target/release/bundle/macos/PostPane.app`（在 worktree 根目录下）；不先删，直接 `ditto <新版> /Applications/PostPane.app` 覆盖；判断本体是否退出用 `pgrep -f "Contents/MacOS/PostPane$"`。
- 证据：2026-11-04 本轮安装，补跑 `ditto` 后成功，应用 22:25:58 重新启动；旧版备份在 `evidence/2026-11-04-receipt-quota/PostPane-before.app`。
- 升级：未升级。


## L-04 云端会话列表里也有本机会话，不过滤会重复（2026-11-05）

- 现象：`api.anthropic.com/v1/sessions` 返回的会话里，除了在 Anthropic 服务器上跑的云端会话，还有本机开着远程控制的会话（标题与本机会话相同），直接全取会和本机记录读出的会话重复。
- 根因：远程控制把本机会话也登记到同一个会话服务；两者靠 `environment_kind` 区分：云端是 `anthropic_cloud`，本机远程控制是 `bridge`。另外 `session_status` 只有 `running` / `idle`，等你确认要看 `status_bucket = blocked`；`review_ready` 是已经做完待看。
- 正确做法：只取 `environment_kind = anthropic_cloud`；`running` 算在跑，`idle` 且 `blocked` 算等你，其余不进「正在进行」。核心层再按 (source, id) 跟本机记录去重兜底。
- 证据：2026-11-05 只读实测，30 条里 `bridge` 18 条（含当时本机在跑的 3 个会话）、`anthropic_cloud` 12 条；实现见 `src/crates/agents/src/claude/cloud.rs`，issue #60。
- 升级：已写成测试 `claude::cloud::tests::only_cloud_sessions_at_work_or_waiting_come_back`。

## L-05 两个会话前后脚各自打包安装，后装的覆盖先装的（2026-11-05）

- 现象：#62（额度预警细条）13:13:33 装进 `/Applications`，另一个会话的 #63（正在进行加云端会话）13:14:07 也装了一次；`/Applications/PostPane.app/Contents/MacOS/PostPane` 的 shasum（`409d0283…`）和 #62 打出的包（`c69011a6…`）对不上，实机里没有 #62 的改动，常浩看到的「实物」其实不含 #62。
- 根因：每个 PR 从自己的分支打包，分支各自基于当时的 main，互不包含；并行会话都按 L-03 直接 `ditto` 覆盖，谁后装谁生效，装的人也不知道被覆盖了。
- 正确做法：请常浩看实物前，比一下 `/Applications` 里的二进制和自己打的包是否一致（`shasum …/Contents/MacOS/PostPane`）；不一致就说明被覆盖，先重装再请他看。几个 PR 前后合并后，从最新 main 重新打包安装一次，让实机包含全部改动。
- 证据：2026-11-05 13:29 比对 shasum；`CURRENT.md`「正在进行显示 Claude 云端会话」一节写的安装时间 13:14:07；合并后从 main `cdcb999` 重新打包安装，日志 `~/Library/Application Support/postpane/evidence/2026-11-05-quota-strip/build-main.log`。
- 升级：未升级。

## L-06 新装的包卡在「正在读取本机活动…」，侧栏不出现（2026-11-05）

- 现象：#85 打包装进 `/Applications` 后启动，设置页一直显示「正在读取本机活动…」，屏幕边上的侧栏也没出现；`osascript` 让应用退出也不理。
- 根因：每次打包是临时签名，签名一变，系统把它当新应用，在读 `~/Documents` 下的项目文件时弹「"PostPane"想访问"文稿"文件夹中的文件」；弹窗没点之前，数据线程卡在 `open()` 系统调用里（`sample <pid>` 可见 `agenthud-data` 线程停在 `projects::project_id → read_to_string → open`），出快照的线程都在等它的锁。
- 正确做法：装完新包先截屏看有没有这个权限弹窗，有就请常浩点「允许」（隐私权限只能本人点）；不要误判成改动把数据读取弄坏了，也不要反复重装。
- 证据：2026-11-05 19:32 截屏 `~/Library/Application Support/postpane/evidence/2026-11-05-scroll-gap/d1s.png`，采样 `sample.txt` 同目录。
- 升级：未升级。

## L-07 读取层去掉一个 Claude 额度窗口，旧行还会在侧栏挂 30 天（2026-11-05）

- 现象：#94 让 Claude 读数不再含每周 Fable，测试全过、装机后实机快照里仍有 `claude-weekly-fable` 一行，它的 `observedAt`（13:20:40）早于新读数（13:23:42）。
- 根因：Claude 的 `Provider.keeps_unreported_windows` 为真，`platform/src/accounts/mod.rs` 的 `retain_windows` 让「这次没报的窗口」沿用上次读数最多 30 天，重启副本（`restart_copy`）也会带回来；读取层的测试只看新读数，看不到这条路。
- 正确做法：要让某个窗口彻底不出，除了在读取层不产出，还要在 `Provider.dropped_windows` 里列出它的键，由 `projection()` 出口统一过滤（#96）；改完以实机快照（MCP `hud_snapshot`）里没有这行为准，不只看单测。
- 证据：2026-11-05 21:23 与 21:38 两次 `hud_snapshot`，结果文件在本会话 tool-results；PR #94、#96。
- 升级：未升级。

## L-08 云端 Linux 容器跑 check / test，失败的原因是环境不是代码（2026-11-05）

- 现象：云端会话里 `pnpm run check` 在最后的 `cargo check --workspace` 报 `failed to run custom build command for gdk-sys`（缺 `gdk-3.0`），装上后又缺 `gtk-layer-shell-0`；`pnpm test` 的 DeepSeek 插件测试 `ℹ pass 6` / `ℹ cancelled 8`，报 `Promise resolution is still pending but the event loop has already resolved`。
- 根因：容器默认没装 Tauri 在 Linux 上要的 GTK/WebKit 开发库；默认 Node 是 v22，项目要求 24+（docs/development.md「Run the workspace」），插件测试在 Node 22 下被取消。未改动的 main 上结果相同。
- 正确做法：云端 Linux 先 `apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-layer-shell-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libxdo-dev`；Node 不是 24 时在临时目录 `npm i node@24`，把它的 `node_modules/node/bin` 放到 PATH 最前再跑。
- 证据：PR #57 会话，装库后 `pnpm run check` 退出 0；Node 24.22.2 下插件测试 `ℹ pass 14` / `ℹ fail 0`，`pnpm test` 退出 0。
- 升级：未升级。

## L-09 电脑控制在侧栏悬停面板里点按钮，点击不生效（2026-11-06）

- 现象：#128 装机后用电脑控制复验左滑托盘。悬停能打开面板，两指左划（scroll right）能拉开托盘，鼠标停在色块上说明浮条也会出来；但点「审核」「移除」只会让托盘收起，色块的动作没执行：行内没有提示，行也没被移除。后台点击（app_click）、全屏点击（left_click）、先停半秒再按下松开都一样。点面板底部「统计」时，点击穿到了下面的 Claude 窗口（菜单栏变成 Claude），统计窗口没开；从侧栏拖动会选中面板里的文字，打不开托盘。浏览器预览里同样的组件点击正常。
- 根因：未核实。面板窗口平时让鼠标穿透，只有上报的区域收点击（`host/src/hud/mod.rs` 的 `set_ignore_cursor`），指针靠原生轮询；电脑控制瞬移光标后马上按下，推测与穿透区域、窗口激活或面板重挂载有关。
- 正确做法：侧栏悬停面板里要点的东西（托盘色块、按钮、链接）不靠电脑控制实机验证；逻辑在浏览器预览里用真实组件点，实机这一步请常浩用鼠标或触控板点一次，交接里写明哪些是常浩点的。展开卡、设置窗口这类普通窗口不受影响（#121–#123 在展开卡上点「转回 Claude」「结束接力」都成功了）。
- 证据：2026-11-06 09:37–09:43 本会话电脑控制记录；截图 `~/Library/Application Support/postpane/evidence/2026-11-06-merge-all/screens/`。
- 升级：未升级。
