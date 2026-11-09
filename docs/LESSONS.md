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
- 根治（2026-11-06，#134）：`tauri.macos.conf.json` 改用登录钥匙串里的本机自用证书 `PostPane Local Signing` 签名，系统改按「标识 `app.postpane.mac` + 证书」认应用（`codesign -d -r- /Applications/PostPane.app` 应显示 `certificate leaf = H"b773068e…"`，不再是 `cdhash`）。换签名后第一次装还要点一次「允许」，之后重装不再弹。证书没信任设置，`security find-identity -v` 不列它属正常，签名照样可用。换电脑或证书丢了打包会报找不到身份：用 openssl 生成带 `extendedKeyUsage = critical,codeSigning` 的自签证书，`security import <p12> -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign` 导入，名字仍叫 `PostPane Local Signing`；证书一换，要再点一次「允许」。
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

## L-10 往别人的页面注入脚本：浏览器里测过，驿窗的 WebKit 窗口里卡死或空白（2026-11-06）

- 现象：#154 给随手记窗口注入脚本接住页面的「收起」。脚本在浏览器面板（Chromium）里对真实页面测过没问题，装机后实测连续三版失败：第一版点收起后窗口隐藏，再打开是一片深色空白；第二版网页进程 CPU 85%、页面卡死；第三版（隐藏后再恢复）仍是空白。
- 根因：两处，都靠标题通道诊断（页面把状态写进 `document.title`，壳用 `on_document_title_changed` 落盘）和 `sample` 网页进程查实。一、WebKit 把 MutationObserver 的记录一轮轮投递到没有新记录才去跑别的微任务；回调里点按钮、改标题这类会改 DOM 的事，会让回调无限重入，React 排在微任务里的重绘永远轮不到（Chromium 是普通微任务排队，测不出来）。二、页面的收起页和面板是同一个 `<main>`，React 只换类名和子节点；脚本写在元素上的 `visibility:hidden` 留到了面板上，面板在、但看不见，无障碍树也是空的。
- 正确做法：注入脚本只观察、不在 MutationObserver 回调里改 DOM（也不改 `document.title`）；要藏页面元素用按类名生效的样式表（`document.adoptedStyleSheets`），不写元素的行内样式；需要页面做事时由壳在回调之外 `eval` 页面自带的接口。验证顺序：先用 `swiftc` 写个最小 WKWebView 探针跑一遍（同一套 WebKit，几秒出结果），再打包装机；装机诊断用标题通道，页面有 `connect-src 'self'` 时往本机端口上报会被拦。
- 证据：2026-11-06 14:41–15:16 本会话；诊断日志 `~/Library/Application Support/postpane/evidence/2026-11-06-notes-collapse/diag.log`、`diag2.log`。
- 升级：未升级（跨项目也成立，可提议提升为全局坑）。

## L-11 真屏点击测试中途锁屏或换了显示器，坐标点到别的应用（2026-11-06）

- 现象：#155 用 CGEvent 发真实点击测挂件。第一轮点开后屏幕锁了，后面几步 `screencapture` 报 `could not create image from rect`，状态回读前后矛盾；解锁后外接屏已拔，接着按外接屏坐标点「面板外」和按 Esc，点到了笔记本屏上的 Chrome 窗口、Esc 也发给了 Chrome。
- 根因：坐标和截图区域是按开测前那块屏写死的；常浩远程控制、人不在电脑前，屏幕会自动锁，也可能随时插拔显示器。CGEvent 不管屏幕状态，照样发到当时光标下的应用。
- 正确做法：每一组真实点击前回读两件事，任一不符就停：锁屏 `Quartz.CGSessionCopyCurrentDictionary().get('CGSSessionScreenIsLocked')` 为空；显示器 `CGGetActiveDisplayList` 的尺寸和窗口位置（`CGWindowListCopyWindowInfo`）与写坐标时一致。「面板外」的点击点到菜单栏空白处（如 `(1100, 10)`），不点别的应用窗口；动鼠标前先问常浩能否接管约 1 分钟。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-06-disk-pendant/`（`screens/`、`windows.swift`、`click.swift`）；本会话 2026-11-06 16:0x–16:45。
- 升级：未升级（与 disk-slim L-11 同属「真屏点击」一类，可一起提议提升为全局坑）。

## L-12 全量测试偶发一条 core 演示测试失败，不是本次改动造成的（2026-11-07）

- 现象：PR #170 第一次跑 `pnpm test` 退出 101，Rust 只有 `agent-hud-core` 的 `demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes` 失败，断言在 `src/crates/core/src/demo/mod.rs` 1198 行。本 PR 没改 core；同一份代码单独跑这条 3 次都过，第二次全量也是 0 失败。
- 根因：未核实。这条测试用 `Utc::now()` 起演示数据，再连做两次 `request_snapshot`，断言第二次是 `{"unchanged": true}`；推测两次之间演示数据里跟时间有关的内容变了（比如「已 N 分钟」跨过一格）。全量并行跑、机器忙的时候更容易碰上。
- 正确做法：全量只失败这一条、改动又不碰 core 时，先单独重跑它（`cargo test -p agent-hud-core a_pass_with_nothing_new_renders_nothing_until_something_changes`），过了再重跑一次全量，以第二次全量为准；交接里两次的结果都照实写。再出现就把这条测试的时间固定下来，另开一单修。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-launch-attribution/test.log`（第一次，失败）、`test2.log`（第二次，Rust 734 passed / 0 failed）；PR #170 描述。
- 升级：未升级。

## L-13 不提交的自查页放在 `src/` 下，`pnpm run check` 卡在格式检查（2026-11-07）

- 现象：#171 收尾跑 `pnpm run check` 退出 1，只报 `src/apps/desktop/relay-real/main.tsx`、`vite.config.ts` 两个文件格式不对；这两个是不提交的真实组件自查页，本 PR 的改动全都格式化过。
- 根因：`format:check` 跑的是 `prettier --check "src/**/*.{ts,tsx,mjs,css}"`，按路径扫，不管文件是否被 git 跟踪；自查时临时改了自查页又没格式化，就把整条 check 拦下。E-07 的「先格式化」只格式化了改动文件，覆盖不到未跟踪的。
- 正确做法：跑全量前先 `git status --short` 看 `src/` 下有没有未跟踪的文件；自查页用完先备份到证据目录再删，或在跑测试前对它也 `prettier --write`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-relay-toss/check-2.log`（删页后重跑的那次覆盖了失败那次，失败输出见本条现象）；自查页备份在同目录 `relay-real-page/`。
- 升级：未升级。

## L-14 自动转回 Claude 时，会话一轮做完就被桌面版结束了，直接送话必败（2026-11-07）

- 现象：L5 第一批真实任务里，ChatGPT 回信「需修改」，驿窗自动转回 Claude，两单都是重试一次仍失败，按规则停下交还常浩。
  - C（github-center #3，接力 `h1a1b1e9404a00`）01:34:42 失败，原因写「这个会话有一阵没回应 Agent HUD 插件了，可能被 Claude 暂停了」；
  - D（my-skills PR #16，接力 `h1a1b1f62cc701`）01:49:42 失败，原因写「这个会话还没加载 Agent HUD 插件」。
- 根因：直接送话（`reaches` + `reply`）要求会话 20 秒内签到过（`CHECK_IN_LIFETIME`）。桌面版会话一轮做完后不久，进程就结束了：D 的签到文件 01:46:37 被写成 `{"ended": …}`，它的那一轮 01:45 做完；C 的签到也停了，01:58 会话再被打开时才又签到。ChatGPT 审一轮要几分钟，回信到的时候，做事的会话几乎总是已经结束。D 的提示说「还没加载插件」不准确：`last_check_in` 遇到已结束的会话返回空，`unreachable` 就落到了「没加载」这一支。
- 正确做法：自动转回两次失败后，不直接停，改为把同一段话排进该会话的待发送队列（`Lines::leave`，与左滑发起同一机制），记 `queuedAt`，卡上提示「打开 Claude 会话继续」；排队也失败、或排了 1 小时没人领，才交还常浩。插件在会话再次运行时会领走排队的话。
- 证据：`~/Library/Application Support/app.postpane.mac/chatgpt/handoffs.json` 里上面两条接力的 `fail` / `stop` 步；`~/Library/Application Support/app.postpane.mac/claude-channel/sessions/7c4b4704-….json` 的 `ended`；修复 PR 见本条之后的交接。
- 升级：已写成测试 `handoff::tests::words_back_to_claude_that_fail_are_tried_once_more_then_left_to_the_person`（改为排队，排队失败或 1 小时没人领才交还）。
- 补正（2026-11-07，#175，查桌面版日志与三次实验后）：
  - 根因要分两单看。D 不是「一轮做完就结束」：`~/Library/Logs/Claude/main.log` 01:46:35 记着 `[CliGovernor] pressure evicting local_9118b1a8… (idle 86s)` 和 `Pausing session … (governor_evict)`，桌面版在内存紧张时回收空闲会话的进程；内存不紧张时空闲会话一直在跑（对照会话 6 小时仍在签到）。C 没被回收：01:34 前后桌面版主进程每一两秒卡 0.5–1 秒，插件签到晚了 20 秒以上，驿窗同一毫秒内连试两次就放弃了，之后它又恢复签到。
  - 「打开会话就继续」不成立：打开会话链接或在侧栏点开，桌面版只记 `Warming session`，不重启 Claude 进程，插件不签到，排队的话领不走；要有一条消息发进去，桌面版才重启进程（`evidence/2026-11-07-link-wake/`）。会话跑后台任务时桌面版照样按空闲计时，后台等待防不住回收（`evidence/2026-11-07-bg-wait/`）。
  - 正确做法：会话进程已停（签到写着 `ended`，或 3 分钟没签到）就用 `claude -p --resume <CLI 会话号> --permission-mode <会话自己的模式>` 在后台续接，桌面版之后续接同一个会话号、接得上这一轮（`evidence/2026-11-07-headless-resume/`）；只是暂时卡顿的先排队，3 分钟还没领、会话也没恢复，撤回排队再续接。CLI 会话号对应的工作目录、模型、权限模式在桌面版会话记录 `~/Library/Application Support/Claude/claude-code-sessions/**/local_*.json`（`cliSessionId`）里。
  - 升级：已写成测试 `handoff::tests::a_session_whose_process_stopped_is_run_in_the_background_with_the_answer`、`queued_words_for_a_session_that_stays_quiet_are_taken_back_and_run_in_the_background`、`a_background_run_that_cannot_start_or_ends_without_a_handover_is_left_to_the_person`。
- 补充（#255，2026-11-09）：上面的「正确做法」当时没做成。`Lines::leave` 底下是 `ClaudeChannel::hand`，它和直接送话一样先查 20 秒内的签到，会话结束后排队也被拒，三次尝试被同一道检查挡下；测试替身的 `leave` 不查签到，所以测试一直是绿的（见 L-30）。现在排队改走不查签到的 `Lines::queue`（`ClaudeChannel::queue`），左滑发起仍走 `leave`。
- 提升：已提升为全局 G-24（2026-11-09，agent-kit PR #48）：Claude 桌面版回收空闲会话的进程，打开会话也不会重新跑起来。

## L-15 侧栏审批「看不到」：10 分钟就撤回，驿窗一重装也丢（2026-11-07）

- 现象：常浩反映真实任务里要批的命令，侧栏没弹出带「允许 / 拒绝」的卡，只在 Claude 窗口里看到。会话 `5f107a09` 凌晨 02:28 发出一条命中 `ask` 规则的命令（`git branch -D`、`git push --delete`），Claude 窗口一直挂到 08:35 才批；同一会话 08:37 的另一条审批驿窗收到了。
- 根因：两处。① 设置「等待回答」默认 10 分钟（`approvalWaitMinutes`），到点驿窗撤掉卡片、交还客户端自己问，02:28 那条 02:38 就从侧栏消失了，人不在电脑前必然错过。② 审批钩子连接挂在驿窗进程上；装新版会重启驿窗（07:29 另一会话装 #173），旧连接一断，钩子就当「没结论」退出，新进程不知道这条请求。钩子这条链路本身没坏，排查时别先怀疑插件和钩子配置。
- 正确做法：「等待回答」加「一直等」（值 0，不设截止，客户端窗口里批了侧栏自动收起），常浩本机用它。驿窗主动结束请求时给钩子回 `{}`；连接无声断开说明驿窗退出了，钩子等最多 2 分钟，新进程起来后重新挂上同一条请求。查「侧栏没弹审批」先看两件事：当时设置的等待时长，以及那段时间驿窗有没有被重启（`ps -o lstart= -p $(pgrep -x PostPane)`、各会话的 `install.sh` 记录）。
- 证据：会话记录 `~/.claude/projects/-Users-nat-Documents-ChatGPT----work-postpane/5f107a09-….jsonl` 18:28:12Z 的 tool_use 与 00:35:13Z 的 tool_result；`93636e9f-….jsonl` 23:29:06Z 的 `install.sh auto-back-queue`；`settings.json` 的 `approvalWaitMinutes: 10`。
- 升级：已写成测试 `hooks::transport::tests::a_request_open_when_postpane_restarts_is_put_to_the_new_one`、`a_request_postpane_ends_itself_goes_back_to_the_client_once`、`waiting_until_answered_never_runs_out`。

## L-16 Chrome 扩展测试 8 条全挂：Playwright 浏览器缓存被本机清理删掉了（2026-11-07）

- 现象：同一 worktree 一小时内跑两次 `pnpm test`，第一次 `test:extension` 是 `ℹ pass 8`，第二次变成 `ℹ pass 0` / `ℹ fail 8`，每条都报 `browserType.launch: Executable doesn't exist at ~/Library/Caches/ms-playwright/chromium_headless_shell-1248/...`。
- 根因：`~/Library/Caches/ms-playwright/` 整个目录被本机某个清理删掉了（不是驿窗的代码，仓库里搜不到这个路径），项目依赖的 Playwright 版本（1.64.1）没变。和代码改动无关。
- 正确做法：看到这条报错先 `ls ~/Library/Caches/ms-playwright/`；目录没了就在 `src/apps/chrome-extension` 下跑 `pnpm exec playwright install chromium-headless-shell` 补回，再重跑 `pnpm run test:extension`。不要为这个去改测试或代码。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-expanded-card-stays/test.log`（通过）、`test-2.log`（全挂）、`playwright-install.log`、`test-extension-3.log`（补装后 `ℹ pass 8`）。
- 升级：无（环境问题，测试本身的报错已经说清楚了）。可提议提升为全局坑：别的项目用 Playwright 也会被同样清掉。

## L-17 机器负载很高时，`core` 的 Grok 计时测试稳定失败（2026-11-07）

- 现象：`pnpm test` 里 `source_db::tests::grok_bot_session_works_while_a_message_has_no_reply_and_idles_once_answered` 在 `tests.rs:608` 的 `assert!(!backend.look())` 失败，单独重跑三次都失败，每次 12–19 秒；同一份代码一小时前、以及负载降下来后的全量都通过。
- 根因：这条测试要求刷新完之后 10 秒内再看一次「不该到点」；当时 `uptime` 负载均值 64–71（多个会话同时编译），一次刷新本身就超过 10 秒，轮询已经到点。与改动无关。
- 正确做法：这条失败先看 `uptime`；负载均值远高于核数时等别的编译跑完再重跑全量，不要为它改代码或改测试。交接里写明当时的负载和重跑结果。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-reply-dismiss-all/test.log`（失败）、`test-2.log`、`test-3.log`（负载 14–17 时通过，Rust 合计 742、743 passed / 0 failed）。
- 升级：未升级。

## L-18 ChatGPT 实际回了，驿窗没收到：插件把空占位块报成了「答完」（2026-11-07）

- 现象：接力 `h1a1b1fed89e00` 01:54:18 送达，ChatGPT 很快答完（「……结论：通过」），驿窗一直停在 `delivered`，连 `turn start` 也没有，30 分钟后按「没回信」停下。
- 根因：ChatGPT 先出一个空的回复占位块，答案随后写进同一个块、同一个 `messageId`。插件发完话后 `expecting` 为真，采样时没看到停止按钮（回复短、后台标签页采样慢，整段生成落在两次采样之间），就把空占位块当成新回复，600 毫秒后报了空的 `turn complete`，同时把这个 `messageId` 记为已报、`expecting` 清掉。宿主拿到空回复不算回信；真回复写进来后，插件因为 `messageId` 相同（或 `expecting` 已清）不再报。
- 正确做法：插件只在回复不为空、而且 600 毫秒内没再变化时才报 `turn complete`（`content.js` 的 `settle`）。查「回信丢了」先看 `<数据目录>/chatgpt/turns.jsonl`，再看 `hooks/inbox` 里该会话的 completion 记录（`message` 为空就是这一类）。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-reply-lost/`（`inbox-completion-empty.json`：01:54:19.827 收到的空回复，turnId `e6c1acb9…`；`dom-probe.md`：页面上真回复的 messageId 也是 `e6c1acb9…`）；复现测试 `src/apps/chrome-extension/test/content.test.mjs`「an empty placeholder is not the reply that fills it later」修复前报 `[['m5', '']]`。
- 升级：已写成测试（上面那条，以及「a reply still being written without a stop button waits until it stops changing」）。

## L-19 「一直等」没生效：同一个允许值列表抄了三份，漏改了每次请求都跑的那份（2026-11-07）

- 现象：#181 加了「等待回答：一直等」（值 0），常浩本机设成它、设置文件回读是 0，可忘了处理的审批照样 10 分钟就从侧栏消失；常浩问「一直等真的打开了吗」。另有 Claude 每轮末尾的「下一步」提问框，超过 30 分钟就不在侧栏显示。
- 根因：允许的分钟数在 `lib.rs`（启动）、`settings.rs` 校验、`settings.rs` 的 `reload_preferences` 各写了一份；#181 只改了前两份。`reload_preferences` 在每次请求开头都跑，不认 0 就退回 10 分钟，所以启动那一刻是一直等，第一次请求后就变回 10 分钟。#181 的测试直接操作 `Requests`，没经过重读设置这条路，所以全过。下一步框另有两处写死的 30 分钟（`sessions.rs` 选卡、`clients/claude_desktop.rs` 重读措辞），沿用上游，不看设置。
- 正确做法：同一组取值只定义一次（`settings::APPROVAL_WAIT_MINUTES`），各处引用它；改设置相关功能时，测试要走「写设置文件 → 新建 core → 发一次请求 → 再看效果」这条真实路径。查「设置改了没生效」先 `grep -rn` 旧取值列表，看有没有漏网的副本。
- 证据：`git show 2fe2329 -- src/crates/core/src/settings.rs`（只改了校验）；回滚修复时 `settings::tests::waiting_until_answered_survives_every_reload_of_the_settings_file` 在「after a request reloads the file」处失败；日志 `~/Library/Application Support/postpane/evidence/2026-11-07-keep-waiting/`。
- 升级：已写成测试 `waiting_until_answered_survives_every_reload_of_the_settings_file`、`a_next_step_box_left_for_hours_stays_in_the_sidebar_while_approvals_wait_until_answered`、`a_request_waits_for_postpane_past_two_minutes_only_when_set_to_wait_until_answered`。可提议提升为全局坑：「同一组取值抄多份，加新值漏改一份」换个项目也成立。

## L-20 审批卡说「没加载插件，执行 /reload-plugins」，其实是 Claude 重启后会话停了（2026-11-07）

- 现象：数字分身会话的提问卡提示「这个会话还没加载 Agent HUD 插件。在会话里执行 /reload-plugins…」，可这个会话此前收过 40 多条驿窗转进去的消息，插件明明在跑。
- 根因：14:12:27 Claude 桌面应用重启（`ps -o lstart` 看主进程），退出时每个会话的插件都跑 `session.end`，约 50 个签到文件在 14:12:23 同一秒被写成 `{"ended":…}`。重启后桌面应用只给打开的会话起进程，没打开的会话没有进程，也不会再签到。`unreachable()` 只分「没装 / 被暂停 / 没加载」三种，`last_check_in` 遇到 `ended` 返回空，于是落到「没加载」，给了一个无处可执行的命令。
- 正确做法：签到文件标了 `ended` 就说「会话已停，在 Claude 里打开它」，不给 `/reload-plugins`。排查「会话为什么连不上」先看 `~/Library/Application Support/app.postpane.mac/claude-channel/sessions/<会话 id>.json` 的内容与修改时间，再用 `ps -axo lstart,command | grep "MacOS/claude "` 看这个会话有没有进程。
- 证据：`stat -f "%m %Sm %N" claude-channel/sessions/*.json | sort -rn`（大批文件同一秒写成 ended）；会话记录 `be0e22ad-….jsonl` 里有 43 处 `agent-hud`；日志 `~/Library/Application Support/postpane/evidence/2026-11-07-188-ended-session/`。
- 升级：已写成测试 `an_unreached_session_names_the_step_that_lets_the_hud_answer` 的 ended 一段（#188）；签到文件一天后被 `sweep` 清掉、停久了又退回旧提示，#191 让标了 ended 的记录留 7 天，测试 `an_ended_session_is_remembered_for_a_week`。

## L-21 「继续自动」点了没反应：开关按钮只看「停了」就显示，没看打开后还有没有事可做（2026-11-07）

- 现象：数字分身 DT-ORC 那单接力卡显示「自动已停 · 第 2 / 2 轮」，常浩点「继续自动」，卡上没有任何变化，也没有真的继续。
- 根因：`actions()` 只要 `halt` 有值就给「继续自动」，后台 `resume` 也照收。可这单已审满 `ROUNDS` 轮，到上限后自动往返对任何回信都只会再停下，打开它没有任何效果；卡片又停在「转回 Claude」阶段（等 Claude 送审），时间线上只多一行「你打开了自动往返」。这单的 PR 其实早已合并，Claude 13:51 就回了「不用再做事」。
- 正确做法：开关类按钮按「打开后会不会有可见效果」决定显示，不只看状态字段；后台同样拒绝无效的打开，并说明原因。打开之后，在时间线上写明它接下来在等什么。查「点了没反应」先看 `~/Library/Application Support/app.postpane.mac/chatgpt/handoffs.json` 里这单的 `steps`：有没有记下这一下、当时在什么阶段、审了几轮。
- 证据：`handoffs.json` 中 `h1a1b344630400` 的 `resume` 14:53:08、`stop` 14:55:19，`phase` 为 `returned`，`ask` 两次；日志与截图在 `~/Library/Application Support/postpane/evidence/2026-11-07-194-resume-limit/`。
- 升级：已写成测试：前端「「继续自动」 only while a round is left」，后端 `the_auto_round_trip_stops_at_the_last_round_or_without_a_verdict` 末段（#194）。

## L-22 跳去别的应用用 https applink，进了默认浏览器后台，目标应用不出来（2026-11-07）

- 现象：#196 侧栏 Hermes 提问行加了箭头，常浩实点说「点不动跳转键」。自查页里点击都送出了对的 chat id，实机快照也带 `chatId`。
- 根因：外壳用 `open https://applink.feishu.cn/client/chat/open?openChatId=…` 打开飞书。本机 https 默认交给 Chrome，Chrome 在后台接走这条链接，飞书根本没被叫起来；前台还是原来的应用，看起来就是「没反应」。`lark://` 同样没把飞书叫到前台；`feishu://applink.feishu.cn/…` 会，而且常浩确认打开的就是那个群。只在浏览器自查页里点、只看「送出了什么」，验不出这一层。
- 正确做法：跳去本机应用，优先用它自己注册的协议（看 `Info.plist` 的 `CFBundleURLSchemes`），用 `registered_url` 确认有人认领，没装才退回 https。验收「跳转」要看目标应用有没有到前台、打开到哪里：`osascript -e 'tell application "System Events" to get frontmost of (first process whose bundle identifier is "…")'`，内容要么请常浩看，要么拿到该应用的截图授权。
- 证据：本会话 17:2x 三次实测：`open https://…` 与 `open lark://…` 后前台仍为 `com.anthropic.claudefordesktop`；`open feishu://…` 后飞书 `frontmost` 为 `true`，常浩确认是亚古兽所在的群。
- 升级：已写成测试 `a_feishu_chat_opens_in_feishu_and_only_without_it_in_the_browser`（#198）。
- 提升：已提升为全局 G-21（2026-11-07，agent-kit#34）。

## L-23 自己开的 ChatGPT 对话侧栏一条都收不到：插件重载后，已开标签页里的脚本断了（2026-11-07）

- 现象：常浩在 Chrome 里和 ChatGPT 聊了好几个对话，侧栏 ChatGPT 格一直「正在进行 0」，也没有新回复回执；接力会话却一直正常。
- 根因：Chrome 装上、更新或重新加载插件时，不给已经开着的标签页装新的内容脚本，旧脚本跟插件断开，`chrome.runtime.sendMessage` 同步抛错，被吞掉。ChatGPT 是单页应用，在同一个标签页里新建对话也不会重装脚本，于是这个标签页永远不报。接力会话每次由插件新开标签页，脚本是新的，所以只有接力能收到，看起来像「只读得到名单里的会话」。
- 正确做法：插件后台在 `runtime.onInstalled` 里用 `chrome.scripting.executeScript` 给已开的目标标签页补装脚本；内容脚本要能被重复装（旧的一份让位）、断开后自己停下。查「插件那边没报」先比两组：插件自己开的标签页能报、用户自己的标签页不能报，就是这一类；让用户刷新标签页再试一句，能报就坐实。
- 证据：`<数据目录>/hooks/inbox` 里 ChatGPT 的 17 条回复全在 `chatgpt/watched.json` 名单内，`chatgpt/turns.jsonl` 最后一行 14:29；常浩刷新标签页后发「测试」，19:05:08 start、19:05:12 complete 立即进来。修复见 #206。
- 升级：已写成测试 `injected again into an open tab, the page reports each turn once`、`a copy cut off by an extension reload stops instead of throwing on every change`、`installing or reloading the extension puts the scripts into chatgpt.com tabs already open`。

## L-24 ChatGPT「在答」从没显示过：开始回合的记录被收件箱拒收（2026-11-07）

- 现象：L-23 修好后，常浩的对话回复已经能进驿窗，但他正在和 ChatGPT 聊时，侧栏 ChatGPT 格仍是「正在进行 0」，快照里那个会话是 `idle`。
- 根因：插件报的 `turn start` 被平台层写成 `session-observation` 存进 `hooks/inbox`，但 `hooks/inbox.rs` 的 `valid()` 只认 attention、compaction、completion、account、origin、delivery，写入时返回「Unsupported」，只打一行 stderr。核心层（`core/src/hook_events.rs`）其实为 ChatGPT 准备好了 15 分钟的「在答」规则。别的客户端的开始回合还有钩子通道直连应用，只有 ChatGPT 全靠收件箱，所以只有它坏。#145 的测试只测了 `started()` 造出的事件对不对、核心收到后怎么算，没测「经通道进来 → 落到收件箱」这一段。
- 正确做法：新加一种事件经收件箱传递时，测试要从入口一路走到收件箱读取，不能只测造事件的函数和消费方；查「事件没生效」先看收件箱目录里有没有那个文件。
- 证据：`chatgpt/turns.jsonl` 20:01:28–20:02:06 有三条 `start`，`hooks/inbox` 里没有任何 chatgpt 的 `session-observation`；`hud_sessions` 里 `chatgpt:6aeed449…` 为 `idle`。
- 升级：已写成测试 `a_chatgpt_turn_start_is_kept_so_the_sidebar_shows_it_answering`（收件箱写入与读取）与 `the_extension_opens_a_conversation_and_reports_its_reply` 里的收件箱断言（通道一路到收件箱）。

## L-25 点了跳转没跳过去，回复却被收起：「成功」只看请求发出去了，没看用户到了那里（2026-11-07）

- 现象：常浩在侧栏「新回复」上多次点 ↗，Claude 没切到那个会话，回复却一条条消失。
- 根因：后台把 Claude 会话的 CLI id 换成桌面标签时，找不到标签（`claude -p` 子进程误带 `claude-desktop` 目标；标签换过 CLI 会话后旧 id 只在 `priorCliSessionIds` 里，解析器不读）就只叫起 Claude、返回成功；前端只要没收到失败就收起回复。本机最近 100 个 Claude 会话里 57 个会走这条路。同一类问题审核里还查出好几处：后台任务跳转先报成功再在后台线程里打开；审批钩子对驿窗不处理的请求无声断开，客户端当成「驿窗退出」反复重连到 24 小时；送话超时后插件迟到的「已送达」被丢掉。侧栏窗口没挂 `<Toaster>`，失败提示一律看不见，更难发现。
- 正确做法：任何「做完就改界面状态」的动作，成功判定要对准用户可见的结果（目标到了前台、回答到了客户端、话进了对话），只确认了请求发出的一律按未成功处理，前端保留状态、在原地写明原因、几秒后可重试。对外连接要么给回应、要么只在自己真退出时才无声断开。验收跳转照 L-22 看目标应用和打开到哪里。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-ops-audit/`（`汇总.md`、`nav/` 本机会话统计脚本）；Claude 日志 `~/Library/Logs/Claude/main.log` 23:16:42 实测 `claude://claude.ai/epitaxy/local_…` 能切会话。
- 升级：已写成测试 `a_claude_desktop_session_without_its_tab_is_not_reported_open`、`a_tab_that_moved_to_a_new_claude_code_session_is_found_by_the_old_id`、`a_print_run_under_the_desktop_app_has_no_tab_to_go_back_to`、`starting_the_move_is_not_reported_as_the_session_open`、`a_request_postpane_leaves_alone_goes_straight_back_to_the_client`、`words_sent_after_the_wait_gave_up_still_count`，前端 `open-result.test.ts`（#227、#228、#230）。可提议提升为全局坑：「把请求发出当成功」换个项目也成立，与 G-21 同源但更宽。
- 提升：已提升为全局 G-22（2026-11-08，agent-kit#40）。

## L-26 几个 worktree 共用 CARGO_TARGET_DIR，测试跑的是别的 worktree 编出的代码（2026-11-08）

- 现象：5 个子 agent 并行修 #220–#224，为省磁盘共用 `~/Library/Caches/postpane-shared-target`。#227 报「Rust 761 passed」，可它新增了 4 条 Rust 测试，应是 765；#222 一次红测试报「running 0 tests」；#223 改 l10n 时报「找不到函数」。
- 根因：同名 crate 在不同目录编出的产物文件名哈希相同（main 与共享目录里 `agent_hud_core-16f50467…` 一模一样），cargo 判断要不要重编只看 dep-info 里记的源文件路径与修改时间，记的是上一次编译它的那个 worktree 的路径。于是一个 worktree 的改动被当成「已编」，测试跑的是别人的代码，结果照样是绿的。
- 正确做法：并行 worktree 各用各的构建目录；磁盘不够非共用不可时，每次跑测试前把本 worktree 的 `.rs` 和 `Cargo.toml` 修改时间改到未来（`find src/crates src/apps/desktop/src-tauri \( -name '*.rs' -o -name Cargo.toml \) -exec touch -t <未来时间> {} +`），并核对三件事：输出里有本 worktree 路径的 `Compiling` 行、新测试名出现且通过、Rust 通过总数等于基线加新增条数。合并前在主目录用 main 自己的构建目录再跑一次全量。
- 证据：`evidence/2026-11-07-fix-220/main-f441f73-cargo-test.log`（主目录补验 765 passed，含 #227 的 4 条新测试）；`evidence/2026-11-07-fix-224/core-host-after-rebase.log`（core 176 = 174 + 2）；`evidence/2026-11-08-ops-fixes/test.log`（合完 5 批后 774 = 761 + 13）。
- 升级：未写成测试（构建环境问题）；写进驿窗一轮 SKILL.md 第 1、2 步（E-11）。
- 提升：已提升为全局 G-23（2026-11-08，agent-kit#40）。
- 补充（2026-11-09，#249 批量 7 个子 agent 共用主目录 `target`）：
  - 共用时每次测试前把本 worktree **全部** `.rs`、`Cargo.toml`、`build.rs` 的修改时间改到未来，比只改动过的文件更稳：每次都从本路径重编，代价是多编几分钟。
  - 基线还在后台编译时不要改源码，否则改动会混进基线，只能存补丁、还原、重跑（#261）。
  - 文档测试可能报 `extern location for agent_hud_l10n does not exist`：别的 agent 同时编译换掉了 rlib 的文件名。先重跑一次再判断，交接里把单元测试数和文档测试结果分开写（#265，`evidence/2026-11-09-265-upstream-small/baseline-cargo-test.txt` 第 880–891 行）。

## L-27 鼠标停着不动，侧栏小签却来回跳：悬停触发换位，换位又带位移动画（2026-11-08）

- 现象：常浩录屏（`~/Downloads/iShot_2026-11-08_10.49.10.mp4`）：鼠标停在侧栏左侧小签那一列，Claude「待回答」和 ChatGPT「REPLY 2」两张不停上下跳、互相叠住，在别家小人那一行也出现过 Claude 的签。
- 根因：两件事叠在一起。① 鼠标一进入别家小签（`SideTags` 的 `onPointerEnter`）就把那家换到最前；② 最前那张卡（`HUDExpandedSurface`）换家时用 0.4 秒从旧位置滑到新位置，别家小签却瞬间换位。滑动中的卡、刚冒出来的小签经过鼠标下，WebKit 在布局变化后会补发鼠标移动，于是又进入另一张小签、又换位，循环下去。鼠标只是路过一列小签，也会连换好几次。
- 正确做法：悬停能改变布局时，变化后的东西不能再从鼠标下经过——换家时前卡直接出现在那家原来小签的位置（不滑），小签要停留 250ms 才置前，路过不算。凡是「悬停 → 改排序 / 改位置」的交互，都要想一遍「改完以后鼠标下面是什么」。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-08-238-side-tag-jump/`（录屏抽帧、测试日志）。
- 升级：已写成测试 `side-tag-stack.test.ts` 的「the front tag handed to another agent jumps to its place (#238)」等 3 条；动画与停留只能实机看，留给常浩实测。

## L-28 挂件「悬停就动」，第二个挂件却要停 2.7 秒才晃：单独覆盖了共用动画的负延迟（2026-11-08）

- 现象：常浩说鼠标移到磁盘瘦身挂件上，挂绳不像随手记猫球那样晃，只有扫帚在动。代码里两者都写了悬停摇晃。
- 根因：摇晃关键帧 7 秒一周、62% 处才开始摆，靠负延迟让悬停一开始就落在摆动前一刻。猫球用共用规则 `-4.2s`（约 0.14 秒后摆）；#155 给磁盘瘦身单写了一条 `-1.6s` 想错开节奏，结果悬停后约 2.74 秒才摆，鼠标停一下就移走的人根本看不到。两个挂件不会同时被悬停，错开节奏没有意义。
- 正确做法：「只在悬停时动、间歇触发」的动画，负延迟决定第一下何时出现，必须落在悬停后半秒内；同款挂件共用同一条规则，不单写时间。改关键帧百分比或时长时，一起核对各处延迟。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-08-240-disk-sway/`（浏览器实测：猫球 270ms、磁盘瘦身 283ms 开始摆，最大 4.5°）。
- 升级：已写成测试 `src/packages/ui/test/pendant-sway.test.ts`：每条悬停摇晃规则的第一下必须在 0.5 秒内，磁盘瘦身不得再单写摇晃时间。

## L-29 内置浏览器面板隐藏时截到「卡在半路」的侧栏，误以为布局错乱（2026-11-08）

- 现象：#243 用真实 `HUDScene` 在内置浏览器里自查竖签，两次截到前卡停在 Codex 那一行、宽度是整条小签、里面却是竖签内容，像是位置和尺寸算错了。用 JS 读 `.hud-expanded-surface` 的实际位置，是正确的 28×53、贴在 Hermes 票根上。
- 根因：`tabs_context` 显示浏览器面板是隐藏的（会话没在窗口里打开，常浩在手机上）。隐藏的页面按后台页处理，`requestAnimationFrame` 被节流，前卡的位移、尺寸动画停在中途，截图拍到的是半路帧。面板可见的那一轮截图完全正常。
- 正确做法：截图前先看 `tabs_context` 是否「hidden」。隐藏时不用截图判断位置、尺寸和动画结果，改用 `javascript_tool` 读元素的 `getBoundingClientRect()` 确认最终几何；截图只用来看样式。能把面板显示出来就先显示（`show_pane` 只在会话开在窗口里时有效）。
- 补充（#247）：隐藏面板里按截图坐标点击也不可靠。截图的坐标框架在 800×600 和 800×622 之间来回变，和模拟视口 900×700 对不上，点「去开始」落在按钮外，看着像按钮没反应。用 JS 读元素位置确认按钮在、命中检测（`elementFromPoint`）也落在按钮上之后，改用 `find` 拿到 ref，再用 `computer` 按 ref 点击（同样是真实输入事件），一次就点中了。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-08-narrow-tag/`（预览脚手架 `preview-243/`）。；#247 的记录在 `evidence/2026-11-08-go-start/preview-check.md`。
- 补充（2026-11-09）：面板隐藏时 `requestAnimationFrame` 完全暂停。脚本里等 rAF 会让 `javascript_tool` 45 秒超时（#259）；`PerformanceObserver` 的 longtask 也不报，测到的性能数不算（#264）。读几何不等帧，`getBoundingClientRect` 本身会强制排版，要等用 `setTimeout`。性能测量改用无头 Chrome（独立临时配置目录、调试协议发真实鼠标、每轮重新加载），并固定好指针历史（测量副本会停在最后悬停的那家）。注意它是 Chromium，不是驿窗的 WKWebView（`evidence/2026-11-09-264-deferred-measure/measure.md`）。
- 可提议提升为全局坑（和 G-11「截图要等画完」同一类：截图拍到的不一定是最终状态）。

## L-30 测试替身比真实实现宽松，兜底路径一直是绿的却从没生效过（2026-11-09）

- 现象：#173 给「自动转回 Claude」加了排队兜底，测试全绿，交接写「已装机」；实机从没走通过（CURRENT 记「实机还没走过排队这条路」）。2026-11-09 对照上游 Agent HUD 的投递代码时读出来：排队那一步在 L-14 的场景里必被拒。
- 根因：测试替身 `Fake` 的 `reaches` 能设「不在线」，但它的 `leave` 不管在不在线都成功；真实的 `AppLines::leave` 走 `ClaudeChannel::hand`，会话没签到就返回 `NotLoaded`。兜底测试又是用「写入失败」（`reply_fails`）而不是「会话不在线」去模拟「会话暂停」，于是替身放行了真实实现会拒的那条路。
- 正确做法：给兜底、重试这类「第一条路失败后走的路」写测试时，先列出真实实现在这个场景下每一步会做的检查，替身逐条照做（同一个开关同时影响 `reaches`、`reply`、`leave`）；模拟场景用真实的失败原因（会话不在线），不用一个方便的替代原因（写入失败）。再加一条用真实组件（临时目录里的 `ClaudeChannel`）的测试，确认兜底那一步在该场景下真的能成。
- 证据：`handoff::tests::words_back_to_a_claude_session_that_ended_wait_in_its_queue`、`words_back_by_hand_that_cannot_go_in_wait_in_the_queue` 在替身改成照真实规则拒收后先红（前者 `left: 0, right: 1`，即一句也没排进去；红色输出只在本轮会话记录里，没另存文件），改走 `queue` 后变绿（全量日志 `evidence/2026-11-09-queue-back/test.log`）；`claude_plugin::tests::words_queued_for_a_session_that_ended_wait_for_it_to_open` 用真实通道验证。
- 可提议提升为全局坑：换个项目也成立（测试替身比真实实现宽松，掩盖兜底失效）。

## L-31 照搬上游的 CSS 修复，去掉 `position: fixed` 后小票打印槽横跨整个窗口（2026-11-09）

- 现象：#259 移植上游「设置页滚到底不再整页回弹」（`2e094e4`）时，按上游去掉设置侧栏的 `position: fixed`，小票顶上那条打印槽宽度从 184 变成 952，横跨整个窗口。
- 根因：fixed 的侧栏原本是打印槽这类 `position: absolute` 子元素的定位容器。上游没有小票样式，所以去掉 fixed 没出问题。驿窗分叉后加的视觉依赖它。
- 正确做法：移植上游的样式改动前，先查被改元素里有没有依赖它定位的 absolute 子元素；改完在预览里逐页比对每个元素的位置尺寸（#259 比对 5 个设置页，差异为 0）。这次保留 `position: relative` 当定位容器。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-259-upstream-fixes/a4-preview-check.md`。

## L-32 「临时改源码 → 跑测试 → 还原」写在一条前台命令里，被超时打断后文件留在改过的状态（2026-11-09）

- 现象：#257 为补「先红」证据，临时去掉新行为再跑测试。命令在等共用构建目录的锁时超过 2 分钟，被切走（exit 144），后面的还原步骤没执行。
- 根因：共用 `target` 时等锁的时间不可控，前台命令有超时；三步写在一条命令里，中间断了，最后一步就丢了。
- 正确做法：临时改文件前先备份；测试放后台跑；还原单独一步做，并用 `cmp` 核对已还原。更好的办法是一开始就先写测试、跑出红，再写实现，不用事后补红。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-257-relay-receipts/red-host.log`。

- 补充（2026-11-09，#251）：验红时先 `cp` 了改前副本，还原却用了 `git checkout -- <文件>`，把这个文件里本轮还没提交的改动也一起丢了，靠副本才找回。临时改源码验红，要么先提交，要么只用自己留的副本还原，不用 `git checkout`。

## L-33 并行子 agent 共用一台机器，宽泛的 `pkill -f` 把别人正在跑的测试也杀了（2026-11-09）

- 现象：#261 为停掉自己的基线测试，执行 `pkill -f 'pnpm test'; pkill -f 'cargo test'`。同时在跑的 #264、#265 的全量测试被中断，以 143 / 144 退出，只能重跑。
- 根因：`-f` 匹配所有进程的完整命令行，不分是谁开的。
- 正确做法：只停自己的后台任务（用任务 ID，或按本 worktree 的绝对路径精确匹配），不按命令名广撒。
- 证据：#261、#265 的子 agent 报告（2026-11-09），#265 第一次基线以 144 退出。
- 可提议提升为全局坑：换个项目也成立（多个会话或子 agent 并行时都会碰上）。

## L-34 共用 `CARGO_TARGET_DIR` 时，`package-resources` 先于导出变量跑，又在 worktree 里生成了自己的 `target`（2026-11-09）

- 现象：#260 的新 worktree 按顺序先跑 `node src/tooling/package-resources.mjs`、再导出 `CARGO_TARGET_DIR`，结果 worktree 里生成了 387 MB 的 `target`。磁盘只剩约 18 GB。
- 根因：这个脚本会编译打包用的程序，它用哪个构建目录取决于当时有没有设 `CARGO_TARGET_DIR`。主会话写给子 agent 的共用规矩把两步顺序写反了。
- 正确做法：共用构建目录时，先 `export CARGO_TARGET_DIR=…`，再跑 `package-resources` 和其他任何会编译的命令。
- 证据：#260 子 agent 报告（已删掉那 387 MB）；共用规矩已在第二批改过来。

## L-35 移植上游的性能优化后，驿窗侧栏的小人全变成静态图标（2026-11-09）

- 现象：#264 照上游 `e07cd7e` 把侧栏面板的隐藏测量副本改成 `useDeferredValue` 延后重画（PR #273）。合并装机后，侧栏 Claude 像素螃蟹、Codex 云朵、ChatGPT 小人全部变成静态 logo。常浩第二天早上发现。
- 根因：按提交二分装机定位（`768250f`、`ff6282b`、`285d8d8` 都正常，加上 `3c7addd` 就坏），撤回 #273 后恢复。具体机制没查清：只在驿窗的 WKWebView 里出现，Chromium 和 Safari 加载同一份前端、同一份实时快照都正常。测量阶段也是用无头 Chrome 做的，所以没发现。
- 正确做法：
  - 动侧栏渲染的改动（HUDScene、BotMark、测量与重画），合并前必须装机，在真实侧栏里隔 2 秒截两张图，确认小人在动，并和改前对比。浏览器预览不能代替。
  - 移植上游时，先确认驿窗自己的东西（小人、票根、挂件）没被改动波及。
  - 装机后的截图不能只看「有没有权限弹窗」。
  - 已加守护测试 `hud/test/measuring-copy-sync.test.ts`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-bots-static/`：`now-side.png` 坏、`old-70ad-side.png`、`b768-side.png`、`bff6-side.png`、`b285-side.png` 好、`fix-side.png` 修好；`motion-1/2-side.png` 两张不同，说明小人在动。

## L-36 Claude 进程被直接杀掉，驿窗的审批钩子被 launchd 收养继续等，审批卡挂满 10 分钟（2026-11-09）

- 现象：终端里的 Claude Code 停在审批上时被 `kill -9`，侧栏 Claude 那格的「1」和「批」印 15 秒后还在，要等 `approvalWaitMinutes`（默认 10 分钟）期满才交还。
- 根因：审批卡由 `PostPane --permission-hook` 子进程连着驿窗的 socket 撑着，连接断开才撤卡。父进程被直接杀掉时子进程不会跟着死，被 launchd（pid 1）收养后继续等。另外，终端版 Claude 2.1.319 停在第一轮审批时，既没写 `~/.claude/sessions/<pid>.json`，也没写会话记录，所以只靠进程登记撤不掉这张卡。
- 正确做法：钩子在等待时检查父进程，换了就结束等待（`hooks/client_unix.rs`），由连接断开走原有撤卡逻辑。进程登记只用来结束「登记过、进程已死」的会话；从没登记过的会话不能当作已结束，因为终端会话第一次回复前可能还没登记。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-251-process-gone/`：`after-kill-15s.png` 改前卡还挂着，`after-hook-exit-3s-side.png` 孤儿钩子退出后撤卡；`accept/1-card-side.png`、`accept/2-after-kill-side.png` 装机后 kill 约 1.5 秒撤卡。
- 升级：已写成测试 `hooks::transport::client::tests` 两条、`claude::processes::tests` 六条、`presentation::tests::a_session_whose_process_was_killed_is_no_longer_running`。
