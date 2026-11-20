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
- 「升级」一行每条都要有，开头写层级词〔结构〕〔机检〕〔体检〕〔文字〕〔提醒〕之一，再写状态（未升级 / 不升级 / 部分升级 / 已升级 / 关闭）、日期、编号和去处；还没升级的写「〔提醒〕未升级。」。层级变了就改标签，原来的记录保留。层级的含义和怎么选，以全局 LESSONS「怎么升级」为准。`scripts/check-rules.mjs` 的 `lessons` 规则会查。
- 本项目没有 CI（GitHub Actions 已停用）；提交、推送前钩子 2026-11-20 起有了（`scripts/hooks/`，每个克隆要自己 `git config core.hooksPath scripts/hooks` 装一次），只查修复类提交有没有「同类：」一行，推送前跑 `check-rules` 和根目录 `tests/`，不跑 `pnpm run check` 和 `pnpm test`；`tauri build` 的 `beforeBuildCommand` 只生成资源、构建前端，不跑测试（2026-11-19 核实）：只写成测试的条目标〔提醒〕部分升级，不算〔机检〕。算〔机检〕的只有每次都必经、自动报错的检查：装机脚本 `install.sh` 里的步骤（装机锁、归属检查、接力检查、装后冒烟），以及本机 Claude Code 的 Bash 预检钩子（agent-kit `hooks/bash-precheck.mjs`）。
- 坑本身已被代码消除、不再需要升级的，状态写「关闭」：「〔层级〕关闭（日期，依据）：证据」，层级写现在靠什么守住，不和其他状态叠写（不写「已升级，关闭」）；靠测试守住、测试未接进必经检查的标〔提醒〕，写明测试名和「未接进必经检查」（2026-11-19 统一写法，同全局 LESSONS「怎么升级」，agent-kit#84）。确认不升级的写「〔提醒〕不升级（理由）」。（2026-11-19，积压清单组 15、16）

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

## L-04 云端会话列表里也有本机会话，不过滤会重复（2026-11-05）

- 现象：`api.anthropic.com/v1/sessions` 返回的会话里，除了在 Anthropic 服务器上跑的云端会话，还有本机开着远程控制的会话（标题与本机会话相同），直接全取会和本机记录读出的会话重复。
- 根因：远程控制把本机会话也登记到同一个会话服务；两者靠 `environment_kind` 区分：云端是 `anthropic_cloud`，本机远程控制是 `bridge`。另外 `session_status` 只有 `running` / `idle`，等你确认要看 `status_bucket = blocked`；`review_ready` 是已经做完待看。
- 正确做法：只取 `environment_kind = anthropic_cloud`；`running` 算在跑，`idle` 且 `blocked` 算等你，其余不进「正在进行」。核心层再按 (source, id) 跟本机记录去重兜底。
- 证据：2026-11-05 只读实测，30 条里 `bridge` 18 条（含当时本机在跑的 3 个会话）、`anthropic_cloud` 12 条；实现见 `src/crates/agents/src/claude/cloud.rs`，issue #60。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」；积压清单未列这条）。原记录：已写成测试 `claude::cloud::tests::only_cloud_sessions_at_work_or_waiting_come_back`。

## L-05 两个会话前后脚各自打包安装，后装的覆盖先装的（2026-11-05）

- 现象：#62（额度预警细条）13:13:33 装进 `/Applications`，另一个会话的 #63（正在进行加云端会话）13:14:07 也装了一次；`/Applications/PostPane.app/Contents/MacOS/PostPane` 的 shasum（`409d0283…`）和 #62 打出的包（`c69011a6…`）对不上，实机里没有 #62 的改动，常浩看到的「实物」其实不含 #62。
- 根因：每个 PR 从自己的分支打包，分支各自基于当时的 main，互不包含；并行会话都按 L-03 直接 `ditto` 覆盖，谁后装谁生效，装的人也不知道被覆盖了。
- 正确做法：请常浩看实物前，比一下 `/Applications` 里的二进制和自己打的包是否一致（`shasum …/Contents/MacOS/PostPane`）；不一致就说明被覆盖，先重装再请他看。几个 PR 前后合并后，从最新 main 重新打包安装一次，让实机包含全部改动。
- 证据：2026-11-05 13:29 比对 shasum；`CURRENT.md`「正在进行显示 Claude 云端会话」一节写的安装时间 13:14:07；合并后从 main `cdcb999` 重新打包安装，日志 `~/Library/Application Support/postpane/evidence/2026-11-05-quota-strip/build-main.log`。
- 升级：〔机检〕部分升级（2026-11-19 补层级：#405 `a342c1c`，每次装机都经 `install.sh` 里的 `install-guard.sh`：别的会话正在装就 exit 4；装着的包既不是 main 构建的、也不是本 worktree 上次装的就 exit 5，测试 `tests/install-guard.test.mjs`；#415 起 `install.sh check` 不给产物路径时按归属记录比，不再拿主目录的旧产物比（E-15、E-20）。缺口：不走 `install.sh` 手动 `ditto` 拦不住；还没在真实装机上跑过；积压清单组 4）。原记录：未升级。

## L-06 新装的包卡在「正在读取本机活动…」，侧栏不出现（2026-11-05）

- 现象：#85 打包装进 `/Applications` 后启动，设置页一直显示「正在读取本机活动…」，屏幕边上的侧栏也没出现；`osascript` 让应用退出也不理。
- 根因：每次打包是临时签名，签名一变，系统把它当新应用，在读 `~/Documents` 下的项目文件时弹「"PostPane"想访问"文稿"文件夹中的文件」；弹窗没点之前，数据线程卡在 `open()` 系统调用里（`sample <pid>` 可见 `agenthud-data` 线程停在 `projects::project_id → read_to_string → open`），出快照的线程都在等它的锁。
- 正确做法：装完新包先截屏看有没有这个权限弹窗，有就请常浩点「允许」（隐私权限只能本人点）；不要误判成改动把数据读取弄坏了，也不要反复重装。
- 根治（2026-11-06，#134）：`tauri.macos.conf.json` 改用登录钥匙串里的本机自用证书 `PostPane Local Signing` 签名，系统改按「标识 `app.postpane.mac` + 证书」认应用（`codesign -d -r- /Applications/PostPane.app` 应显示 `certificate leaf = H"b773068e…"`，不再是 `cdhash`）。换签名后第一次装还要点一次「允许」，之后重装不再弹。证书没信任设置，`security find-identity -v` 不列它属正常，签名照样可用。换电脑或证书丢了打包会报找不到身份：用 openssl 生成带 `extendedKeyUsage = critical,codeSigning` 的自签证书，`security import <p12> -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign` 导入，名字仍叫 `PostPane Local Signing`；证书一换，要再点一次「允许」。
- 证据：2026-11-05 19:32 截屏 `~/Library/Application Support/postpane/evidence/2026-11-05-scroll-gap/d1s.png`，采样 `sample.txt` 同目录。
- 升级：〔结构〕关闭（2026-11-19，积压清单组 15：坑本身已被代码消除）：`src/apps/desktop/src-tauri/tauri.macos.conf.json` 第 5 行固定用 `PostPane Local Signing` 签名（E-05 `9f9d7a5`），重装不再换签名、不再重弹文稿权限；`install.sh` 第 109 行装后回读证书。 原记录：未升级。 原写法：「〔结构〕已升级，关闭」（2026-11-19 统一写法）。

## L-07 读取层去掉一个 Claude 额度窗口，旧行还会在侧栏挂 30 天（2026-11-05）

- 现象：#94 让 Claude 读数不再含每周 Fable，测试全过、装机后实机快照里仍有 `claude-weekly-fable` 一行，它的 `observedAt`（13:20:40）早于新读数（13:23:42）。
- 根因：Claude 的 `Provider.keeps_unreported_windows` 为真，`platform/src/accounts/mod.rs` 的 `retain_windows` 让「这次没报的窗口」沿用上次读数最多 30 天，重启副本（`restart_copy`）也会带回来；读取层的测试只看新读数，看不到这条路。
- 正确做法：要让某个窗口彻底不出，除了在读取层不产出，还要在 `Provider.dropped_windows` 里列出它的键，由 `projection()` 出口统一过滤（#96）；改完以实机快照（MCP `hud_snapshot`）里没有这行为准，不只看单测。
- 证据：2026-11-05 21:23 与 21:38 两次 `hud_snapshot`，结果文件在本会话 tool-results；PR #94、#96。
- 升级：〔提醒〕不升级（2026-11-19，积压清单组 16）：已有统一过滤出口 `Provider.dropped_windows`（`src/crates/agents/src/account.rs` 第 216 行），只碰到一次。也可以从结构上消除：把「沿用上次读数」改成只对登记过的窗口生效，改动面没评估，这次没做（积压清单第 4 节第 2 点）。

- 补充（2026-11-20，#464）：服务端自己不再返回的窗口也一样。claude.ai 的云端赠额（Cloud session credits）11-05 07:59 到期后接口不再给，驿窗沿用最后读数挂了 15 天，侧栏一直「云端 97%」「等待更新」，没人察觉是过期数。看到某行长期「等待更新」，先查它的 `observedAt` 是不是早就停了；不再跟的窗口照本条进 `dropped_windows`。

## L-08 云端 Linux 容器跑 check / test，失败的原因是环境不是代码（2026-11-05）

- 现象：云端会话里 `pnpm run check` 在最后的 `cargo check --workspace` 报 `failed to run custom build command for gdk-sys`（缺 `gdk-3.0`），装上后又缺 `gtk-layer-shell-0`；`pnpm test` 的 DeepSeek 插件测试 `ℹ pass 6` / `ℹ cancelled 8`，报 `Promise resolution is still pending but the event loop has already resolved`。
- 根因：容器默认没装 Tauri 在 Linux 上要的 GTK/WebKit 开发库；默认 Node 是 v22，项目要求 24+（docs/development.md「Run the workspace」），插件测试在 Node 22 下被取消。未改动的 main 上结果相同。
- 正确做法：云端 Linux 先 `apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-layer-shell-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libxdo-dev`；Node 不是 24 时在临时目录 `npm i node@24`，把它的 `node_modules/node/bin` 放到 PATH 最前再跑。
- 证据：PR #57 会话，装库后 `pnpm run check` 退出 0；Node 24.22.2 下插件测试 `ℹ pass 14` / `ℹ fail 0`，`pnpm test` 退出 0。
- 升级：〔提醒〕不升级（2026-11-19，积压清单组 16）：只在云端 Linux 容器里成立，本机 macOS 用不上；正确做法留在条目里备查。

## L-09 电脑控制在侧栏悬停面板里点按钮，点击不生效（2026-11-06）

- 现象：#128 装机后用电脑控制复验左滑托盘。悬停能打开面板，两指左划（scroll right）能拉开托盘，鼠标停在色块上说明浮条也会出来；但点「审核」「移除」只会让托盘收起，色块的动作没执行：行内没有提示，行也没被移除。后台点击（app_click）、全屏点击（left_click）、先停半秒再按下松开都一样。点面板底部「统计」时，点击穿到了下面的 Claude 窗口（菜单栏变成 Claude），统计窗口没开；从侧栏拖动会选中面板里的文字，打不开托盘。浏览器预览里同样的组件点击正常。
- 根因：未核实。面板窗口平时让鼠标穿透，只有上报的区域收点击（`host/src/hud/mod.rs` 的 `set_ignore_cursor`），指针靠原生轮询；电脑控制瞬移光标后马上按下，推测与穿透区域、窗口激活或面板重挂载有关。
- 正确做法：侧栏悬停面板里要点的东西（托盘色块、按钮、链接）不靠电脑控制实机验证；逻辑在浏览器预览里用真实组件点（2026-11-19 起只用常设场景预览台 `pnpm --filter @agent-hud/hud run scenes`，E-18），实机这一步请常浩用鼠标或触控板点一次，交接里写明哪些是常浩点的。展开卡、设置窗口这类普通窗口不受影响（#121–#123 在展开卡上点「转回 Claude」「结束接力」都成功了）。
- 证据：2026-11-06 09:37–09:43 本会话电脑控制记录；截图 `~/Library/Application Support/postpane/evidence/2026-11-06-merge-all/screens/`。
- 升级：〔提醒〕未升级。（2026-11-19 补层级；积压清单组 9 已批：与 L-11 合并提升为全局 G-37，见下方「提升」）
- 提升：已提升为全局 G-37（2026-11-19，agent-kit#83），与 L-11 合成一条。

## L-10 往别人的页面注入脚本：浏览器里测过，驿窗的 WebKit 窗口里卡死或空白（2026-11-06）

- 现象：#154 给随手记窗口注入脚本接住页面的「收起」。脚本在浏览器面板（Chromium）里对真实页面测过没问题，装机后实测连续三版失败：第一版点收起后窗口隐藏，再打开是一片深色空白；第二版网页进程 CPU 85%、页面卡死；第三版（隐藏后再恢复）仍是空白。
- 根因：两处，都靠标题通道诊断（页面把状态写进 `document.title`，壳用 `on_document_title_changed` 落盘）和 `sample` 网页进程查实。一、WebKit 把 MutationObserver 的记录一轮轮投递到没有新记录才去跑别的微任务；回调里点按钮、改标题这类会改 DOM 的事，会让回调无限重入，React 排在微任务里的重绘永远轮不到（Chromium 是普通微任务排队，测不出来）。二、页面的收起页和面板是同一个 `<main>`，React 只换类名和子节点；脚本写在元素上的 `visibility:hidden` 留到了面板上，面板在、但看不见，无障碍树也是空的。
- 正确做法：注入脚本只观察、不在 MutationObserver 回调里改 DOM（也不改 `document.title`）；要藏页面元素用按类名生效的样式表（`document.adoptedStyleSheets`），不写元素的行内样式；需要页面做事时由壳在回调之外 `eval` 页面自带的接口。验证顺序：先用 `swiftc` 写个最小 WKWebView 探针跑一遍（同一套 WebKit，几秒出结果），再打包装机；装机诊断用标题通道，页面有 `connect-src 'self'` 时往本机端口上报会被拦。
- 证据：2026-11-06 14:41–15:16 本会话；诊断日志 `~/Library/Application Support/postpane/evidence/2026-11-06-notes-collapse/diag.log`、`diag2.log`。
- 升级：〔提醒〕未升级（跨项目也成立，可提议提升为全局坑）。（2026-11-19 补层级；积压清单组 3 已批：提升为全局 G-33，见下方「提升」；L-35 是同类第二例）
- 提升：已提升为全局 G-33（2026-11-19，agent-kit#83）。

## L-11 真屏点击测试中途锁屏或换了显示器，坐标点到别的应用（2026-11-06）

- 现象：#155 用 CGEvent 发真实点击测挂件。第一轮点开后屏幕锁了，后面几步 `screencapture` 报 `could not create image from rect`，状态回读前后矛盾；解锁后外接屏已拔，接着按外接屏坐标点「面板外」和按 Esc，点到了笔记本屏上的 Chrome 窗口、Esc 也发给了 Chrome。
- 根因：坐标和截图区域是按开测前那块屏写死的；常浩远程控制、人不在电脑前，屏幕会自动锁，也可能随时插拔显示器。CGEvent 不管屏幕状态，照样发到当时光标下的应用。
- 正确做法：每一组真实点击前回读两件事，任一不符就停：锁屏 `Quartz.CGSessionCopyCurrentDictionary().get('CGSSessionScreenIsLocked')` 为空；显示器 `CGGetActiveDisplayList` 的尺寸和窗口位置（`CGWindowListCopyWindowInfo`）与写坐标时一致。「面板外」的点击点到菜单栏空白处（如 `(1100, 10)`），不点别的应用窗口；动鼠标前先问常浩能否接管约 1 分钟。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-06-disk-pendant/`（`screens/`、`windows.swift`、`click.swift`）；本会话 2026-11-06 16:0x–16:45。
- 升级：〔提醒〕未升级（与 disk-slim L-11 同属「真屏点击」一类，可一起提议提升为全局坑）。（2026-11-19 补层级；积压清单组 9 已批：与 L-09 合并提升为全局 G-37，见下方「提升」）
- 提升：已提升为全局 G-37（2026-11-19，agent-kit#83），与 L-09 合成一条。

## L-12 全量测试偶发一条 core 演示测试失败，不是本次改动造成的（2026-11-07）

- 现象：PR #170 第一次跑 `pnpm test` 退出 101，Rust 只有 `agent-hud-core` 的 `demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes` 失败，断言在 `src/crates/core/src/demo/mod.rs` 1198 行。本 PR 没改 core；同一份代码单独跑这条 3 次都过，第二次全量也是 0 失败。
- 根因：未核实。这条测试用 `Utc::now()` 起演示数据，再连做两次 `request_snapshot`，断言第二次是 `{"unchanged": true}`；推测两次之间演示数据里跟时间有关的内容变了（比如「已 N 分钟」跨过一格）。全量并行跑、机器忙的时候更容易碰上。
- 正确做法：全量只失败这一条、改动又不碰 core 时，先单独重跑它（`cargo test -p agent-hud-core a_pass_with_nothing_new_renders_nothing_until_something_changes`），过了再重跑一次全量，以第二次全量为准；交接里两次的结果都照实写。再出现就把这条测试的时间固定下来，另开一单修。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-launch-attribution/test.log`（第一次，失败）、`test2.log`（第二次，Rust 734 passed / 0 failed）；PR #170 描述。
- 升级：〔结构〕已升级（2026-11-19，#415：这条测试改用固定时钟 `snapshot::PINNED_CLOCK`，两次 pass 之间真实时间走多久都不影响；在两次 pass 之间注入「停到下一个时限之后」的延时，旧代码失败、新代码通过，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`；积压清单组 1。不覆盖：别的测试里直接读 `Utc::now()` 的写法）。原记录：未升级。

## L-13 不提交的自查页放在 `src/` 下，`pnpm run check` 卡在格式检查（2026-11-07）

- 现象：#171 收尾跑 `pnpm run check` 退出 1，只报 `src/apps/desktop/relay-real/main.tsx`、`vite.config.ts` 两个文件格式不对；这两个是不提交的真实组件自查页，本 PR 的改动全都格式化过。
- 根因：`format:check` 跑的是 `prettier --check "src/**/*.{ts,tsx,mjs,css}"`，按路径扫，不管文件是否被 git 跟踪；自查时临时改了自查页又没格式化，就把整条 check 拦下。E-07 的「先格式化」只格式化了改动文件，覆盖不到未跟踪的。
- 正确做法（2026-11-19 改，E-18）：自查、预览不在 `src/` 下另搭页面，一律用常设场景预览台（`pnpm --filter @agent-hud/hud run scenes`，缺场景在 `src/packages/hud/test/scenes/scenes.ts` 补）；一次性的自查页、截图脚本放 `src/` 外（证据目录）。`pnpm run check` 第一步会查 `src/` 下没提交的文件，有就停下并说这些。原来写的「对自查页也 `prettier --write`」作废：它让自查页留在 `src/` 里，L-43 的包边界检查照样会拦。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-relay-toss/check-2.log`（删页后重跑的那次覆盖了失败那次，失败输出见本条现象）；自查页备份在同目录 `relay-real-page/`。
- 升级：〔提醒〕部分升级（2026-11-19，积压清单组 12，#417；`pnpm run check` 本身靠约定去跑，驿窗没有 CI 和提交前钩子，按「怎么升级」不算〔机检〕，常浩 11-19 定）：`pnpm run check` 第一步 `pnpm run check:untracked`（`src/tooling/check-untracked.mjs`）查 `src/` 下没提交、也没被忽略的文件，有就列出来、写明正确做法并退出 1，后面的格式、类型、构建、边界检查都不跑；测试 `tests/check-untracked.test.mjs` 用这次的 `src/apps/desktop/relay-real/` 当样本，旧代码上红、新代码报错（`~/Library/Application Support/postpane/evidence/2026-11-19-b2-batch/`）。与 L-43 合并。不覆盖：单独跑 `pnpm run format:check`、`check:packages` 等子步骤。上一版：〔提醒〕未升级（待批：积压清单组 12）。

## L-14 自动转回 Claude 时，会话一轮做完就被桌面版结束了，直接送话必败（2026-11-07）

- 现象：L5 第一批真实任务里，ChatGPT 回信「需修改」，驿窗自动转回 Claude，两单都是重试一次仍失败，按规则停下交还常浩。
  - C（github-center #3，接力 `h1a1b1e9404a00`）01:34:42 失败，原因写「这个会话有一阵没回应 Agent HUD 插件了，可能被 Claude 暂停了」；
  - D（my-skills PR #16，接力 `h1a1b1f62cc701`）01:49:42 失败，原因写「这个会话还没加载 Agent HUD 插件」。
- 根因：直接送话（`reaches` + `reply`）要求会话 20 秒内签到过（`CHECK_IN_LIFETIME`）。桌面版会话一轮做完后不久，进程就结束了：D 的签到文件 01:46:37 被写成 `{"ended": …}`，它的那一轮 01:45 做完；C 的签到也停了，01:58 会话再被打开时才又签到。ChatGPT 审一轮要几分钟，回信到的时候，做事的会话几乎总是已经结束。D 的提示说「还没加载插件」不准确：`last_check_in` 遇到已结束的会话返回空，`unreachable` 就落到了「没加载」这一支。
- 正确做法：自动转回两次失败后，不直接停，改为把同一段话排进该会话的待发送队列（`Lines::leave`，与左滑发起同一机制），记 `queuedAt`，卡上提示「打开 Claude 会话继续」；排队也失败、或排了 1 小时没人领，才交还常浩。插件在会话再次运行时会领走排队的话。
- 证据：`~/Library/Application Support/app.postpane.mac/chatgpt/handoffs.json` 里上面两条接力的 `fail` / `stop` 步；`~/Library/Application Support/app.postpane.mac/claude-channel/sessions/7c4b4704-….json` 的 `ended`；修复 PR 见本条之后的交接。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `handoff::tests::words_back_to_claude_that_fail_are_tried_once_more_then_left_to_the_person`（改为排队，排队失败或 1 小时没人领才交还）。
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
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `hooks::transport::tests::a_request_open_when_postpane_restarts_is_put_to_the_new_one`、`a_request_postpane_ends_itself_goes_back_to_the_client_once`、`waiting_until_answered_never_runs_out`。

## L-16 Chrome 扩展测试 8 条全挂：Playwright 浏览器缓存被本机清理删掉了（2026-11-07）

- 现象：同一 worktree 一小时内跑两次 `pnpm test`，第一次 `test:extension` 是 `ℹ pass 8`，第二次变成 `ℹ pass 0` / `ℹ fail 8`，每条都报 `browserType.launch: Executable doesn't exist at ~/Library/Caches/ms-playwright/chromium_headless_shell-1248/...`。
- 根因：`~/Library/Caches/ms-playwright/` 整个目录被本机某个清理删掉了（不是驿窗的代码，仓库里搜不到这个路径），项目依赖的 Playwright 版本（1.64.1）没变。和代码改动无关。
- 正确做法：看到这条报错先 `ls ~/Library/Caches/ms-playwright/`；目录没了就在 `src/apps/chrome-extension` 下跑 `pnpm exec playwright install chromium-headless-shell` 补回，再重跑 `pnpm run test:extension`。不要为这个去改测试或代码。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-expanded-card-stays/test.log`（通过）、`test-2.log`（全挂）、`playwright-install.log`、`test-extension-3.log`（补装后 `ℹ pass 8`）。
- 升级：〔结构〕未升级（已批：积压清单组 6，改在磁盘瘦身，待实现；2026-11-19 补层级）。原记录：无（环境问题，测试本身的报错已经说清楚了）。可提议提升为全局坑：别的项目用 Playwright 也会被同样清掉。

## L-17 机器负载很高时，`core` 的 Grok 计时测试稳定失败（2026-11-07）

- 现象：`pnpm test` 里 `source_db::tests::grok_bot_session_works_while_a_message_has_no_reply_and_idles_once_answered` 在 `tests.rs:608` 的 `assert!(!backend.look())` 失败，单独重跑三次都失败，每次 12–19 秒；同一份代码一小时前、以及负载降下来后的全量都通过。
- 根因：这条测试要求刷新完之后 10 秒内再看一次「不该到点」；当时 `uptime` 负载均值 64–71（多个会话同时编译），一次刷新本身就超过 10 秒，轮询已经到点。与改动无关。
- 正确做法：这条失败先看 `uptime`；负载均值远高于核数时等别的编译跑完再重跑全量，不要为它改代码或改测试。交接里写明当时的负载和重跑结果。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-reply-dismiss-all/test.log`（失败）、`test-2.log`、`test-3.log`（负载 14–17 时通过，Rust 合计 742、743 passed / 0 failed）。
- 升级：〔结构〕已升级（2026-11-19，#415：Grok 轮询的「到点」改读 `snapshot::wall_clock_ms()`（`lib.rs` 的 `look`、`source_db.rs` 记下次轮询时间），测试固定时钟，验「差 1 毫秒不到点、满 10 秒到点」，不再按真实 10 秒计时；注入「一次刷新超过 10 秒」的延时，旧代码失败、新代码通过，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`；积压清单组 1。正式运行时两处读的仍是真实时间，行为不变）。原记录：未升级。

## L-18 ChatGPT 实际回了，驿窗没收到：插件把空占位块报成了「答完」（2026-11-07）

- 现象：接力 `h1a1b1fed89e00` 01:54:18 送达，ChatGPT 很快答完（「……结论：通过」），驿窗一直停在 `delivered`，连 `turn start` 也没有，30 分钟后按「没回信」停下。
- 根因：ChatGPT 先出一个空的回复占位块，答案随后写进同一个块、同一个 `messageId`。插件发完话后 `expecting` 为真，采样时没看到停止按钮（回复短、后台标签页采样慢，整段生成落在两次采样之间），就把空占位块当成新回复，600 毫秒后报了空的 `turn complete`，同时把这个 `messageId` 记为已报、`expecting` 清掉。宿主拿到空回复不算回信；真回复写进来后，插件因为 `messageId` 相同（或 `expecting` 已清）不再报。
- 正确做法：插件只在回复不为空、而且 600 毫秒内没再变化时才报 `turn complete`（`content.js` 的 `settle`）。查「回信丢了」先看 `<数据目录>/chatgpt/turns.jsonl`，再看 `hooks/inbox` 里该会话的 completion 记录（`message` 为空就是这一类）。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-reply-lost/`（`inbox-completion-empty.json`：01:54:19.827 收到的空回复，turnId `e6c1acb9…`；`dom-probe.md`：页面上真回复的 messageId 也是 `e6c1acb9…`）；复现测试 `src/apps/chrome-extension/test/content.test.mjs`「an empty placeholder is not the reply that fills it later」修复前报 `[['m5', '']]`。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」；积压清单组 8：同类问题已提升为全局 G-36，见下方「提升」）。原记录：已写成测试（上面那条，以及「a reply still being written without a stop button waits until it stops changing」）。
- 提升：已提升为全局 G-36（2026-11-19，agent-kit#83），和牛马之家 L-17、剪藏插件 L-04 同类：第三方聊天页先出容器、内容后到。

## L-19 「一直等」没生效：同一个允许值列表抄了三份，漏改了每次请求都跑的那份（2026-11-07）

- 现象：#181 加了「等待回答：一直等」（值 0），常浩本机设成它、设置文件回读是 0，可忘了处理的审批照样 10 分钟就从侧栏消失；常浩问「一直等真的打开了吗」。另有 Claude 每轮末尾的「下一步」提问框，超过 30 分钟就不在侧栏显示。
- 根因：允许的分钟数在 `lib.rs`（启动）、`settings.rs` 校验、`settings.rs` 的 `reload_preferences` 各写了一份；#181 只改了前两份。`reload_preferences` 在每次请求开头都跑，不认 0 就退回 10 分钟，所以启动那一刻是一直等，第一次请求后就变回 10 分钟。#181 的测试直接操作 `Requests`，没经过重读设置这条路，所以全过。下一步框另有两处写死的 30 分钟（`sessions.rs` 选卡、`clients/claude_desktop.rs` 重读措辞），沿用上游，不看设置。
- 正确做法：同一组取值只定义一次（`settings::APPROVAL_WAIT_MINUTES`），各处引用它；改设置相关功能时，测试要走「写设置文件 → 新建 core → 发一次请求 → 再看效果」这条真实路径。查「设置改了没生效」先 `grep -rn` 旧取值列表，看有没有漏网的副本。
- 证据：`git show 2fe2329 -- src/crates/core/src/settings.rs`（只改了校验）；回滚修复时 `settings::tests::waiting_until_answered_survives_every_reload_of_the_settings_file` 在「after a request reloads the file」处失败；日志 `~/Library/Application Support/postpane/evidence/2026-11-07-keep-waiting/`。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」；同类问题已提升为全局 G-31，见下方「提升」）。原记录：已写成测试 `waiting_until_answered_survives_every_reload_of_the_settings_file`、`a_next_step_box_left_for_hours_stays_in_the_sidebar_while_approvals_wait_until_answered`、`a_request_waits_for_postpane_past_two_minutes_only_when_set_to_wait_until_answered`。可提议提升为全局坑：「同一组取值抄多份，加新值漏改一份」换个项目也成立。
- 提升：已提升为全局 G-31（2026-11-19，agent-kit#82）。

## L-20 审批卡说「没加载插件，执行 /reload-plugins」，其实是 Claude 重启后会话停了（2026-11-07）

- 现象：数字分身会话的提问卡提示「这个会话还没加载 Agent HUD 插件。在会话里执行 /reload-plugins…」，可这个会话此前收过 40 多条驿窗转进去的消息，插件明明在跑。
- 根因：14:12:27 Claude 桌面应用重启（`ps -o lstart` 看主进程），退出时每个会话的插件都跑 `session.end`，约 50 个签到文件在 14:12:23 同一秒被写成 `{"ended":…}`。重启后桌面应用只给打开的会话起进程，没打开的会话没有进程，也不会再签到。`unreachable()` 只分「没装 / 被暂停 / 没加载」三种，`last_check_in` 遇到 `ended` 返回空，于是落到「没加载」，给了一个无处可执行的命令。
- 正确做法：签到文件标了 `ended` 就说「会话已停，在 Claude 里打开它」，不给 `/reload-plugins`。排查「会话为什么连不上」先看 `~/Library/Application Support/app.postpane.mac/claude-channel/sessions/<会话 id>.json` 的内容与修改时间，再用 `ps -axo lstart,command | grep "MacOS/claude "` 看这个会话有没有进程。
- 证据：`stat -f "%m %Sm %N" claude-channel/sessions/*.json | sort -rn`（大批文件同一秒写成 ended）；会话记录 `be0e22ad-….jsonl` 里有 43 处 `agent-hud`；日志 `~/Library/Application Support/postpane/evidence/2026-11-07-188-ended-session/`。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `an_unreached_session_names_the_step_that_lets_the_hud_answer` 的 ended 一段（#188）；签到文件一天后被 `sweep` 清掉、停久了又退回旧提示，#191 让标了 ended 的记录留 7 天，测试 `an_ended_session_is_remembered_for_a_week`。

## L-21 「继续自动」点了没反应：开关按钮只看「停了」就显示，没看打开后还有没有事可做（2026-11-07）

- 现象：数字分身 DT-ORC 那单接力卡显示「自动已停 · 第 2 / 2 轮」，常浩点「继续自动」，卡上没有任何变化，也没有真的继续。
- 根因：`actions()` 只要 `halt` 有值就给「继续自动」，后台 `resume` 也照收。可这单已审满 `ROUNDS` 轮，到上限后自动往返对任何回信都只会再停下，打开它没有任何效果；卡片又停在「转回 Claude」阶段（等 Claude 送审），时间线上只多一行「你打开了自动往返」。这单的 PR 其实早已合并，Claude 13:51 就回了「不用再做事」。
- 正确做法：开关类按钮按「打开后会不会有可见效果」决定显示，不只看状态字段；后台同样拒绝无效的打开，并说明原因。打开之后，在时间线上写明它接下来在等什么。查「点了没反应」先看 `~/Library/Application Support/app.postpane.mac/chatgpt/handoffs.json` 里这单的 `steps`：有没有记下这一下、当时在什么阶段、审了几轮。
- 证据：`handoffs.json` 中 `h1a1b344630400` 的 `resume` 14:53:08、`stop` 14:55:19，`phase` 为 `returned`，`ask` 两次；日志与截图在 `~/Library/Application Support/postpane/evidence/2026-11-07-194-resume-limit/`。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试：前端「「继续自动」 only while a round is left」，后端 `the_auto_round_trip_stops_at_the_last_round_or_without_a_verdict` 末段（#194）。

## L-22 跳去别的应用用 https applink，进了默认浏览器后台，目标应用不出来（2026-11-07）

- 现象：#196 侧栏 Hermes 提问行加了箭头，常浩实点说「点不动跳转键」。自查页里点击都送出了对的 chat id，实机快照也带 `chatId`。
- 根因：外壳用 `open https://applink.feishu.cn/client/chat/open?openChatId=…` 打开飞书。本机 https 默认交给 Chrome，Chrome 在后台接走这条链接，飞书根本没被叫起来；前台还是原来的应用，看起来就是「没反应」。`lark://` 同样没把飞书叫到前台；`feishu://applink.feishu.cn/…` 会，而且常浩确认打开的就是那个群。只在浏览器自查页里点、只看「送出了什么」，验不出这一层。
- 正确做法：跳去本机应用，优先用它自己注册的协议（看 `Info.plist` 的 `CFBundleURLSchemes`），用 `registered_url` 确认有人认领，没装才退回 https。验收「跳转」要看目标应用有没有到前台、打开到哪里：`osascript -e 'tell application "System Events" to get frontmost of (first process whose bundle identifier is "…")'`，内容要么请常浩看，要么拿到该应用的截图授权。
- 证据：本会话 17:2x 三次实测：`open https://…` 与 `open lark://…` 后前台仍为 `com.anthropic.claudefordesktop`；`open feishu://…` 后飞书 `frontmost` 为 `true`，常浩确认是亚古兽所在的群。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `a_feishu_chat_opens_in_feishu_and_only_without_it_in_the_browser`（#198）。
- 提升：已提升为全局 G-21（2026-11-07，agent-kit#34）。

## L-23 自己开的 ChatGPT 对话侧栏一条都收不到：插件重载后，已开标签页里的脚本断了（2026-11-07）

- 现象：常浩在 Chrome 里和 ChatGPT 聊了好几个对话，侧栏 ChatGPT 格一直「正在进行 0」，也没有新回复回执；接力会话却一直正常。
- 根因：Chrome 装上、更新或重新加载插件时，不给已经开着的标签页装新的内容脚本，旧脚本跟插件断开，`chrome.runtime.sendMessage` 同步抛错，被吞掉。ChatGPT 是单页应用，在同一个标签页里新建对话也不会重装脚本，于是这个标签页永远不报。接力会话每次由插件新开标签页，脚本是新的，所以只有接力能收到，看起来像「只读得到名单里的会话」。
- 正确做法：插件后台在 `runtime.onInstalled` 里用 `chrome.scripting.executeScript` 给已开的目标标签页补装脚本；内容脚本要能被重复装（旧的一份让位）、断开后自己停下。查「插件那边没报」先比两组：插件自己开的标签页能报、用户自己的标签页不能报，就是这一类；让用户刷新标签页再试一句，能报就坐实。
- 证据：`<数据目录>/hooks/inbox` 里 ChatGPT 的 17 条回复全在 `chatgpt/watched.json` 名单内，`chatgpt/turns.jsonl` 最后一行 14:29；常浩刷新标签页后发「测试」，19:05:08 start、19:05:12 complete 立即进来。修复见 #206。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」；积压清单组 7：同类问题已提升为全局 G-35，见下方「提升」）。原记录：已写成测试 `injected again into an open tab, the page reports each turn once`、`a copy cut off by an extension reload stops instead of throwing on every change`、`installing or reloading the extension puts the scripts into chatgpt.com tabs already open`。
- 提升：已提升为全局 G-35（2026-11-19，agent-kit#83），和剪藏插件 L-10、L-13 同类：插件重载后已开标签页里的旧脚本断开。

## L-24 ChatGPT「在答」从没显示过：开始回合的记录被收件箱拒收（2026-11-07）

- 现象：L-23 修好后，常浩的对话回复已经能进驿窗，但他正在和 ChatGPT 聊时，侧栏 ChatGPT 格仍是「正在进行 0」，快照里那个会话是 `idle`。
- 根因：插件报的 `turn start` 被平台层写成 `session-observation` 存进 `hooks/inbox`，但 `hooks/inbox.rs` 的 `valid()` 只认 attention、compaction、completion、account、origin、delivery，写入时返回「Unsupported」，只打一行 stderr。核心层（`core/src/hook_events.rs`）其实为 ChatGPT 准备好了 15 分钟的「在答」规则。别的客户端的开始回合还有钩子通道直连应用，只有 ChatGPT 全靠收件箱，所以只有它坏。#145 的测试只测了 `started()` 造出的事件对不对、核心收到后怎么算，没测「经通道进来 → 落到收件箱」这一段。
- 正确做法：新加一种事件经收件箱传递时，测试要从入口一路走到收件箱读取，不能只测造事件的函数和消费方；查「事件没生效」先看收件箱目录里有没有那个文件。
- 证据：`chatgpt/turns.jsonl` 20:01:28–20:02:06 有三条 `start`，`hooks/inbox` 里没有任何 chatgpt 的 `session-observation`；`hud_sessions` 里 `chatgpt:6aeed449…` 为 `idle`。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `a_chatgpt_turn_start_is_kept_so_the_sidebar_shows_it_answering`（收件箱写入与读取）与 `the_extension_opens_a_conversation_and_reports_its_reply` 里的收件箱断言（通道一路到收件箱）。

## L-25 点了跳转没跳过去，回复却被收起：「成功」只看请求发出去了，没看用户到了那里（2026-11-07）

- 现象：常浩在侧栏「新回复」上多次点 ↗，Claude 没切到那个会话，回复却一条条消失。
- 根因：后台把 Claude 会话的 CLI id 换成桌面标签时，找不到标签（`claude -p` 子进程误带 `claude-desktop` 目标；标签换过 CLI 会话后旧 id 只在 `priorCliSessionIds` 里，解析器不读）就只叫起 Claude、返回成功；前端只要没收到失败就收起回复。本机最近 100 个 Claude 会话里 57 个会走这条路。同一类问题审核里还查出好几处：后台任务跳转先报成功再在后台线程里打开；审批钩子对驿窗不处理的请求无声断开，客户端当成「驿窗退出」反复重连到 24 小时；送话超时后插件迟到的「已送达」被丢掉。侧栏窗口没挂 `<Toaster>`，失败提示一律看不见，更难发现。
- 正确做法：任何「做完就改界面状态」的动作，成功判定要对准用户可见的结果（目标到了前台、回答到了客户端、话进了对话），只确认了请求发出的一律按未成功处理，前端保留状态、在原地写明原因、几秒后可重试。对外连接要么给回应、要么只在自己真退出时才无声断开。验收跳转照 L-22 看目标应用和打开到哪里。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-07-ops-audit/`（`汇总.md`、`nav/` 本机会话统计脚本）；Claude 日志 `~/Library/Logs/Claude/main.log` 23:16:42 实测 `claude://claude.ai/epitaxy/local_…` 能切会话。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `a_claude_desktop_session_without_its_tab_is_not_reported_open`、`a_tab_that_moved_to_a_new_claude_code_session_is_found_by_the_old_id`、`a_print_run_under_the_desktop_app_has_no_tab_to_go_back_to`、`starting_the_move_is_not_reported_as_the_session_open`、`a_request_postpane_leaves_alone_goes_straight_back_to_the_client`、`words_sent_after_the_wait_gave_up_still_count`，前端 `open-result.test.ts`（#227、#228、#230）。可提议提升为全局坑：「把请求发出当成功」换个项目也成立，与 G-21 同源但更宽。
- 提升：已提升为全局 G-22（2026-11-08，agent-kit#40）。

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

## L-27 鼠标停着不动，侧栏小签却来回跳：悬停触发换位，换位又带位移动画（2026-11-08）

- 现象：常浩录屏（`~/Downloads/iShot_2026-11-08_10.49.10.mp4`）：鼠标停在侧栏左侧小签那一列，Claude「待回答」和 ChatGPT「REPLY 2」两张不停上下跳、互相叠住，在别家小人那一行也出现过 Claude 的签。
- 根因：两件事叠在一起。① 鼠标一进入别家小签（`SideTags` 的 `onPointerEnter`）就把那家换到最前；② 最前那张卡（`HUDExpandedSurface`）换家时用 0.4 秒从旧位置滑到新位置，别家小签却瞬间换位。滑动中的卡、刚冒出来的小签经过鼠标下，WebKit 在布局变化后会补发鼠标移动，于是又进入另一张小签、又换位，循环下去。鼠标只是路过一列小签，也会连换好几次。
- 正确做法：悬停能改变布局时，变化后的东西不能再从鼠标下经过——换家时前卡直接出现在那家原来小签的位置（不滑），小签要停留 250ms 才置前，路过不算。凡是「悬停 → 改排序 / 改位置」的交互，都要想一遍「改完以后鼠标下面是什么」。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-08-238-side-tag-jump/`（录屏抽帧、测试日志）。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」；悬停停留与动画仍只能实机看）。原记录：已写成测试 `side-tag-stack.test.ts` 的「the front tag handed to another agent jumps to its place (#238)」等 3 条；动画与停留只能实机看，留给常浩实测。

## L-28 挂件「悬停就动」，第二个挂件却要停 2.7 秒才晃：单独覆盖了共用动画的负延迟（2026-11-08）

- 现象：常浩说鼠标移到磁盘瘦身挂件上，挂绳不像随手记猫球那样晃，只有扫帚在动。代码里两者都写了悬停摇晃。
- 根因：摇晃关键帧 7 秒一周、62% 处才开始摆，靠负延迟让悬停一开始就落在摆动前一刻。猫球用共用规则 `-4.2s`（约 0.14 秒后摆）；#155 给磁盘瘦身单写了一条 `-1.6s` 想错开节奏，结果悬停后约 2.74 秒才摆，鼠标停一下就移走的人根本看不到。两个挂件不会同时被悬停，错开节奏没有意义。
- 正确做法：「只在悬停时动、间歇触发」的动画，负延迟决定第一下何时出现，必须落在悬停后半秒内；同款挂件共用同一条规则，不单写时间。改关键帧百分比或时长时，一起核对各处延迟。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-08-240-disk-sway/`（浏览器实测：猫球 270ms、磁盘瘦身 283ms 开始摆，最大 4.5°）。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `src/packages/ui/test/pendant-sway.test.ts`：每条悬停摇晃规则的第一下必须在 0.5 秒内，磁盘瘦身不得再单写摇晃时间。

## L-29 内置浏览器面板隐藏时截到「卡在半路」的侧栏，误以为布局错乱（2026-11-08）

- 现象：#243 用真实 `HUDScene` 在内置浏览器里自查竖签，两次截到前卡停在 Codex 那一行、宽度是整条小签、里面却是竖签内容，像是位置和尺寸算错了。用 JS 读 `.hud-expanded-surface` 的实际位置，是正确的 28×53、贴在 Hermes 票根上。
- 根因：`tabs_context` 显示浏览器面板是隐藏的（会话没在窗口里打开，常浩在手机上）。隐藏的页面按后台页处理，`requestAnimationFrame` 被节流，前卡的位移、尺寸动画停在中途，截图拍到的是半路帧。面板可见的那一轮截图完全正常。
- 正确做法：截图前先看 `tabs_context` 是否「hidden」。隐藏时不用截图判断位置、尺寸和动画结果，改用 `javascript_tool` 读元素的 `getBoundingClientRect()` 确认最终几何；截图只用来看样式。能把面板显示出来就先显示（`show_pane` 只在会话开在窗口里时有效）。
- 补充（#247）：隐藏面板里按截图坐标点击也不可靠。截图的坐标框架在 800×600 和 800×622 之间来回变，和模拟视口 900×700 对不上，点「去开始」落在按钮外，看着像按钮没反应。用 JS 读元素位置确认按钮在、命中检测（`elementFromPoint`）也落在按钮上之后，改用 `find` 拿到 ref，再用 `computer` 按 ref 点击（同样是真实输入事件），一次就点中了。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-08-narrow-tag/`（预览脚手架 `preview-243/`）。；#247 的记录在 `evidence/2026-11-08-go-start/preview-check.md`。
- 补充（2026-11-09）：面板隐藏时 `requestAnimationFrame` 完全暂停。脚本里等 rAF 会让 `javascript_tool` 45 秒超时（#259）；`PerformanceObserver` 的 longtask 也不报，测到的性能数不算（#264）。读几何不等帧，`getBoundingClientRect` 本身会强制排版，要等用 `setTimeout`。性能测量改用无头 Chrome（独立临时配置目录、调试协议发真实鼠标、每轮重新加载），并固定好指针历史（测量副本会停在最后悬停的那家）。注意它是 Chromium，不是驿窗的 WKWebView（`evidence/2026-11-09-264-deferred-measure/measure.md`）。
- 可提议提升为全局坑（和 G-11「截图要等画完」同一类：截图拍到的不一定是最终状态）。
- 升级：〔提醒〕未升级（2026-11-19 补写升级行；积压清单组 13 已批：并入全局 G-11，见下方「提升」）。
- 提升：并入全局 G-11（2026-11-19，agent-kit#83）：G-11 放宽到无头 Chrome、隐藏的内置浏览器面板，截到的都不一定是最终状态。

## L-30 测试替身比真实实现宽松，兜底路径一直是绿的却从没生效过（2026-11-09）

- 现象：#173 给「自动转回 Claude」加了排队兜底，测试全绿，交接写「已装机」；实机从没走通过（CURRENT 记「实机还没走过排队这条路」）。2026-11-09 对照上游 Agent HUD 的投递代码时读出来：排队那一步在 L-14 的场景里必被拒。
- 根因：测试替身 `Fake` 的 `reaches` 能设「不在线」，但它的 `leave` 不管在不在线都成功；真实的 `AppLines::leave` 走 `ClaudeChannel::hand`，会话没签到就返回 `NotLoaded`。兜底测试又是用「写入失败」（`reply_fails`）而不是「会话不在线」去模拟「会话暂停」，于是替身放行了真实实现会拒的那条路。
- 正确做法：给兜底、重试这类「第一条路失败后走的路」写测试时，先列出真实实现在这个场景下每一步会做的检查，替身逐条照做（同一个开关同时影响 `reaches`、`reply`、`leave`）；模拟场景用真实的失败原因（会话不在线），不用一个方便的替代原因（写入失败）。再加一条用真实组件（临时目录里的 `ClaudeChannel`）的测试，确认兜底那一步在该场景下真的能成。
- 证据：`handoff::tests::words_back_to_a_claude_session_that_ended_wait_in_its_queue`、`words_back_by_hand_that_cannot_go_in_wait_in_the_queue` 在替身改成照真实规则拒收后先红（前者 `left: 0, right: 1`，即一句也没排进去；红色输出只在本轮会话记录里，没另存文件），改走 `queue` 后变绿（全量日志 `evidence/2026-11-09-queue-back/test.log`）；`claude_plugin::tests::words_queued_for_a_session_that_ended_wait_for_it_to_open` 用真实通道验证。
- 可提议提升为全局坑：换个项目也成立（测试替身比真实实现宽松，掩盖兜底失效）。
- 升级：〔提醒〕未升级（2026-11-19 补写升级行；积压清单组 3 已批：提升为全局 G-34，见下方「提升」）。
- 提升：已提升为全局 G-34（2026-11-19，agent-kit#83）。

## L-31 照搬上游的 CSS 修复，去掉 `position: fixed` 后小票打印槽横跨整个窗口（2026-11-09）

- 现象：#259 移植上游「设置页滚到底不再整页回弹」（`2e094e4`）时，按上游去掉设置侧栏的 `position: fixed`，小票顶上那条打印槽宽度从 184 变成 952，横跨整个窗口。
- 根因：fixed 的侧栏原本是打印槽这类 `position: absolute` 子元素的定位容器。上游没有小票样式，所以去掉 fixed 没出问题。驿窗分叉后加的视觉依赖它。
- 正确做法：移植上游的样式改动前，先查被改元素里有没有依赖它定位的 absolute 子元素；改完在预览里逐页比对每个元素的位置尺寸（#259 比对 5 个设置页，差异为 0）。这次保留 `position: relative` 当定位容器。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-259-upstream-fixes/a4-preview-check.md`。
- 升级：〔提醒〕不升级（2026-11-19，积压清单组 16）：只在移植上游样式时碰到，只一次；驿窗已不再与上游同步（AGENTS.md 开头）。

## L-32 「临时改源码 → 跑测试 → 还原」写在一条前台命令里，被超时打断后文件留在改过的状态（2026-11-09）

- 现象：#257 为补「先红」证据，临时去掉新行为再跑测试。命令在等共用构建目录的锁时超过 2 分钟，被切走（exit 144），后面的还原步骤没执行。
- 根因：共用 `target` 时等锁的时间不可控，前台命令有超时；三步写在一条命令里，中间断了，最后一步就丢了。
- 正确做法：临时改文件前先备份；测试放后台跑；还原单独一步做，并用 `cmp` 核对已还原。更好的办法是一开始就先写测试、跑出红，再写实现，不用事后补红。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-257-relay-receipts/red-host.log`。

- 补充（2026-11-09，#251）：验红时先 `cp` 了改前副本，还原却用了 `git checkout -- <文件>`，把这个文件里本轮还没提交的改动也一起丢了，靠副本才找回。临时改源码验红，要么先提交，要么只用自己留的副本还原，不用 `git checkout`。
- 升级：〔提醒〕未升级（2026-11-19 补写升级行；积压清单组 14 已批：提升为全局 G-40，见下方「提升」）。
- 提升：已提升为全局 G-40（2026-11-19，agent-kit#83）。

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

## L-35 移植上游的性能优化后，驿窗侧栏的小人全变成静态图标（2026-11-09）

- 现象：#264 照上游 `e07cd7e` 把侧栏面板的隐藏测量副本改成 `useDeferredValue` 延后重画（PR #273）。合并装机后，侧栏 Claude 像素螃蟹、Codex 云朵、ChatGPT 小人全部变成静态 logo。常浩第二天早上发现。
- 根因：按提交二分装机定位（`768250f`、`ff6282b`、`285d8d8` 都正常，加上 `3c7addd` 就坏），撤回 #273 后恢复。具体机制没查清：只在驿窗的 WKWebView 里出现，Chromium 和 Safari 加载同一份前端、同一份实时快照都正常。测量阶段也是用无头 Chrome 做的，所以没发现。
- 正确做法：
  - 动侧栏渲染的改动（HUDScene、BotMark、测量与重画），合并前必须装机，在真实侧栏里隔 2 秒截两张图，确认小人在动，并和改前对比。浏览器预览不能代替。
  - 移植上游时，先确认驿窗自己的东西（小人、票根、挂件）没被改动波及。
  - 装机后的截图不能只看「有没有权限弹窗」。
  - 已加守护测试 `hud/test/measuring-copy-sync.test.ts`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-bots-static/`：`now-side.png` 坏、`old-70ad-side.png`、`b768-side.png`、`bff6-side.png`、`b285-side.png` 好、`fix-side.png` 修好；`motion-1/2-side.png` 两张不同，说明小人在动。
- 升级：〔机检〕部分升级（2026-11-19 补写升级行；#405 `a342c1c`：装后冒烟 `smoke.mjs` 是 `install.sh` 每次装机必走的一步，侧栏隔 2 秒截图看不出在动就 exit 6，并和装前截图对比，测试 `tests/smoke-diff.test.mjs`。算〔机检〕的理由：它接在装机脚本里自动跑、自动报错，不靠人记得截图。缺口：在包已经装上之后才查，拦的是「常浩看到坏包之前」而不是「装上之前」（回滚命令已打印）；比的是整个侧栏窗口，别的动画会把静态小人「带过」；还没在真实装机上跑过；守护测试 `hud/test/measuring-copy-sync.test.ts` 只能手动跑。积压清单组 4）。
- 提升：并入全局 G-33（2026-11-19，agent-kit#83），是 L-10 之外第二例：只在 Chromium（无头 Chrome）里验过，进驿窗的 WKWebView 才坏。

## L-36 Claude 进程被直接杀掉，驿窗的审批钩子被 launchd 收养继续等，审批卡挂满 10 分钟（2026-11-09）

- 现象：终端里的 Claude Code 停在审批上时被 `kill -9`，侧栏 Claude 那格的「1」和「批」印 15 秒后还在，要等 `approvalWaitMinutes`（默认 10 分钟）期满才交还。
- 根因：审批卡由 `PostPane --permission-hook` 子进程连着驿窗的 socket 撑着，连接断开才撤卡。父进程被直接杀掉时子进程不会跟着死，被 launchd（pid 1）收养后继续等。另外，终端版 Claude 2.1.319 停在第一轮审批时，既没写 `~/.claude/sessions/<pid>.json`，也没写会话记录，所以只靠进程登记撤不掉这张卡。
- 正确做法：钩子在等待时检查父进程，换了就结束等待（`hooks/client_unix.rs`），由连接断开走原有撤卡逻辑。进程登记只用来结束「登记过、进程已死」的会话；从没登记过的会话不能当作已结束，因为终端会话第一次回复前可能还没登记。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-251-process-gone/`：`after-kill-15s.png` 改前卡还挂着，`after-hook-exit-3s-side.png` 孤儿钩子退出后撤卡；`accept/1-card-side.png`、`accept/2-after-kill-side.png` 装机后 kill 约 1.5 秒撤卡。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `hooks::transport::client::tests` 两条、`claude::processes::tests` 六条、`presentation::tests::a_session_whose_process_was_killed_is_no_longer_running`。

## L-37 启动全量测试的那条 Bash 一直不返回，桌面应用判会话「Claude Code stopped responding」（2026-11-09）

- 现象：#282 两次用 Bash 的 `run_in_background` 启动「check → test → node」三条全量，工具调用都没返回，约 16 分钟后应用弹「Claude Code stopped responding」，常浩只能点「Try again」。应用日志 `~/Library/Logs/Claude/main.log` 两次都是 `timed out after 1016s / 970s of inactivity … last_tool_name=Bash`。
- 根因：
  - 第 1 次：命令里先跑了 `pkill -f 'cargo test --workspace'`。`-f` 按整行匹配，包着这条命令的那个 shell 的命令行里也有这串字，被它自己杀了，工具调用永远等不到结果（L-33 的另一面）。
  - 第 2 次：命令一行都没执行（日志文件的时间没变），卡在应用的后台任务启动上，原因没查清；当天 10:10 别的会话也出现过同样的超时。
- 正确做法：
  - 不用 `pkill -f` 停自己的测试，用后台任务 ID（TaskStop）停。
  - 长时间的全量测试写成脚本，用 `nohup 脚本 > 日志 2>&1 &` 自己放到后台，Bash 当场返回；再用 Monitor 按日志里的「exit」行等结果。
  - 会话弹「stopped responding」时，先在 `main.log` 里搜 `timed out after`，看 `last_tool_name` 是哪个工具卡住了。
- 证据：`main.log` 第 61278、62034 行（2026-11-09 12:02:37、12:25:37）。
- 可提议提升为全局坑：换个项目也成立（Claude 桌面应用里的任何长命令都可能碰上）。
- 补正（#292）：同一现象还有一条已查实的原因：命令被 Claude Code 的安全检查拦下，批准卡只挂在驿窗侧栏，见 L-41。
- 补正（2026-11-09，agent-kit#49 实测后）：两次大概率都不是上面写的原因，而是和 L-41 同一条链。两条命令都是 `source ~/.cargo/env` 之后 `rm -f $L/*.log`；用桌面版自带的 Claude Code 2.1.317 实测，`source` 之后 rm 目标是「变量 + 通配符」时，危险 rm 安全检查要求人工批准（原话「The target '$L/*.log' is a shell variable expansion: when $L is unset or empty it becomes `/`…」）。第 2 次「命令一行都没执行」也对得上：检查在执行前就停住了。第 1 次的 `pkill -f` 自杀不能排除，但不是必要条件。正确做法补一条：rm 目标里的变量写成 `"${L:?}"`。证据：`~/Library/Application Support/agent-kit/evidence/2026-11-09-49-bash-precheck/probes/out4/x_source_var_glob.txt`。
- 升级：〔机检〕部分升级（2026-11-19 补写升级行；两种肇事写法都由本机 Claude Code 的 Bash 预检钩子 `hooks/bash-precheck.mjs` 在执行前拦下：rm 目标里的变量加通配（agent-kit#49）、宽泛的 `pkill -f`（agent-kit#82 的 `kill-pkill-broad`）；「长全量测试写成脚本用 nohup 放后台」仍只靠提醒）。
- 提升：已提升为全局 G-25（2026-11-09）。另并入全局 G-32（2026-11-19，agent-kit#82）：`pkill -f` 把自己也杀了这一面。

## L-38 改了 Codex 的 MCP 工具批准配置，已经开着的 Codex 线程照旧要批准；`codex exec` 不能拿来做对照（2026-11-09）

- 现象：#286 在 `~/.codex/config.toml` 给 `relay_to_chatgpt` 加了 `approval_mode = "approve"`，随后让 10:57 开的测试线程调这个工具，13:22:01 照样触发了 `PermissionRequest` 钩子，60 秒没返回。用 `codex exec` 新开进程测，设成 `approve` 能直接执行，但对照组临时改回 `auto` 也能直接执行，分不出差别。
- 根因：
  - Codex 按线程记下 MCP 工具的配置。已经开着的线程不会重读，app-server 进程本身不用重启：13:28 在同一个 app-server（pid 83594，10:56 起）里新开线程，同一个工具 0.02 秒执行，没出批准。
  - `codex exec` 没有交互批准，同一个工具不论设成什么都直接执行，所以拿它做对照没有意义。
- 正确做法：改了 Codex 的 MCP 或批准配置后，在新开的线程里实测（驿窗 `start_session` 开一个就行）。对照组也要在同类线程里做，不要用 `codex exec`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-codex-relay-approval/`：老线程 rollout 第 347～399 行（13:22 调用、13:23:12 终止），`~/.codex/logs_2.sqlite` 13:22:01.147 `hook/started` 之后没有 `hook/completed`；新线程 `rollout-2026-11-09T13-28-36-01a1bec7-a276-…` 第 19～21 行；`exec-test/exec.jsonl`、`exec-test/control.jsonl`。
- 升级：〔提醒〕未升级（2026-11-19 补写升级行；积压清单组 13 已批：并入全局 G-26，见下方「提升」）。
- 提升：并入全局 G-26（2026-11-19，agent-kit#83）：G-26 放宽为「改了 AI 工具的配置或人设，已开会话照旧用旧的」，补 Codex 这一例。

## L-39 驿窗重启后接力转回 Codex 报「Unknown or child session target」，失败两次后自动往返停下（2026-11-09）

- 现象：#283 实测 (a)：为装新版重启过驿窗之后，ChatGPT 回了「需修改」，驿窗自动转回 Codex 线程时连续两次报 `Unavailable("Unknown or child session target")`，自动往返停下、交还常浩。#281 实测时没出这个问题。
- 根因：投递服务只往「已知会话目标表」里的会话送话（`platform/src/delivery/sending.rs`）。这张表在驿窗启动时是空的（`host/src/messages.rs` 传 `Vec::new()`），只有「智能体互发消息」的工具被调用时才按当时的快照刷新；接力转回 Codex（`handoff/lines.rs` 的 `codex_send`）从不刷新。#281 那次能通过，是因为表里碰巧已经填过。
- 正确做法：借用别的功能的投递通道时，先查它的前置状态由谁填、什么时候填，不假设已经有了。接力转回前用 `LocalClients::know_target` 把发起线程补进表；已知的会话保留原条目，子会话仍不收。
- 实测要先重启：凡是依赖进程内状态的通道，实机验收前先重启一次驿窗再测，才测得出「冷启动」这条路。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-283-codex-transcript/`（`h1a1bed7307000` 的步骤：`fail`、`fail`、`stop`）。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：只写成测试，未接进必经检查，见上方「怎么升级」）。原记录：已写成测试 `delivery::tests::a_session_made_known_keeps_the_rest_and_a_child_stays_a_child`。

## L-40 钩子等待时用 notify 盯 Codex 会话记录，追加写之后迟迟收不到事件，测试等满 10 分钟才失败（2026-11-09）

- 现象：#286 的 2A 第一版在钩子进程里用 `notify` 监听 Codex 会话记录，单测里能收到事件；端到端测试（钩子连着驿窗、在另一个线程里等）在会话记录末尾追加 `task_complete` 后，钩子只在开头读了一次，之后再没读，最后测试用的 `Requests` 等满默认的 10 分钟期限才失败。
- 根因：只读了一次，说明文件变化的事件没送到等待循环。在 macOS 上用 FSEvents 盯单个文件，同一进程的追加写不一定能及时报出来，具体为什么没查清。驿窗 Claude 那一路的 `hooks/transcript.rs` 也靠 `notify`，它在实机上靠得住，但不能保证别的地方也一样。
- 正确做法：等待循环本来就有短间隔（钩子是 0.1 秒）时，每一圈直接读文件新增的部分（`read_to_end` 从上次的位置往后读），不要依赖文件监听；测试里先把 `Requests` 的等待期限调短（`set_hold_ms`），失败时几秒就能看到，不要干等 10 分钟。
- 证据：`src/crates/platform/src/hooks/turn_end.rs`（改成每圈直接读）；测试 `hooks::transport::tests::a_codex_request_whose_turn_ended_is_declined_and_leaves_the_sidebar`。
- 升级：〔提醒〕不升级（2026-11-19，积压清单组 16）：只碰到一次，根因没查清；出事那处已改成每圈直接读（`src/crates/platform/src/hooks/turn_end.rs`）。

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

## L-42 审核纸条上的行用面板墨色，`get_hud_screenshot` 看着清楚，换成纸张外观后浅字落在浅纸上看不清（2026-11-09）

- 现象：#288 第一版审核纸条上的接力行用 `useBoardInks(true)` 取墨色。装机后 `get_hud_screenshot` 拍的面板字是深色的，看着没问题；浏览器预览真实 `HUDScene` 时面板是纸张外观，标题算出来是 `rgb(236, 231, 220)`，浅字落在浅蓝审核纸上几乎看不见。
- 根因：`useBoardInks` 有纸张时取纸张的墨（深色纸配浅墨），不看传进去的 `light`；审核纸条本身永远是浅色纸（`relayPaperOf(true)`），两者对不上。
- 正确做法：画在审核纸条上的字一律用 `relayPaperOf(true)` 自己的 `ink`、`dim`、`blue`，和悬停小收据（`DeskLines`）一样，不用面板墨。验收界面时至少换一种外观再看一次，不能只看 `get_hud_screenshot` 的一张。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-288-open-relays/preview-paper-ink-before-fix.png`；修正在 `src/packages/hud/src/panel/ReviewSlip.tsx`。同一纸条上 `LiveRow` 的审核会话行仍用面板墨，是否也有这个问题未核实，记为范围外发现。
- 升级：〔提醒〕不升级（2026-11-19，积压清单组 16）：界面配色的判断，机器判不了，只一次；出事那处已改（`src/packages/hud/src/panel/ReviewSlip.tsx`）。

## L-43 预览脚手架放在 worktree 的 `src/apps/desktop/` 下时跑 `pnpm run check`，包边界检查报「leaves the package」失败（2026-11-14）

- 现象：#328 一边后台跑 `pnpm run check`，一边在 `src/apps/desktop/preview-328/` 搭真实 `HUDScene` 预览；`check:package-boundary` 扫到 `main.tsx`、`vite.config.ts` 里的 `../../../packages/hud/src/...` 相对引用，报 4 处越界，`check exit 1`。代码本身没问题。
- 根因：预览脚手架为了直接引组件源码，必须跨包相对引用；它不提交，但只要还在工作区里就会被边界检查扫到。
- 正确做法（2026-11-19 改，E-18）：不再搭预览脚手架，预览只用常设场景预览台（`pnpm --filter @agent-hud/hud run scenes`，127.0.0.1:1480）；它在包里面，不跨包引用。原来写的「截完图挪到证据目录再跑 check」作废。报告里如实写第一次失败的原因，日志另存。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-14-328-newest-open/check-1-preview-in-tree.log`。
- 升级：〔提醒〕部分升级（2026-11-19，积压清单组 12，#417；`pnpm run check` 本身靠约定去跑，驿窗没有 CI 和提交前钩子，按「怎么升级」不算〔机检〕，常浩 11-19 定）：同 L-13，`pnpm run check` 第一步 `src/tooling/check-untracked.mjs` 拦 `src/` 下没提交的文件；测试 `tests/check-untracked.test.mjs` 用这次的 `src/apps/desktop/preview-328/` 当样本，旧代码上红、新代码报错（`~/Library/Application Support/postpane/evidence/2026-11-19-b2-batch/`）。预览统一用常设场景预览台（E-18，〔结构〕）。不覆盖：单独跑 `check:packages` 等子步骤。上一版：〔提醒〕未升级（待批：积压清单组 12，与 L-13 合并做成〔机检〕）。

## L-44 装机前查自动往返接力，查出有也照装了：查和装写在同一条命令里，中间没停（2026-11-14）

- 现象：#336 装机时把「查有没有开着自动往返的接力」和 `install.sh` 写进同一条命令。查出 `h1a1d7a90d8e00`（digital-twin｜PR #175 专项复审，10:39:33 刚把请审核送给 ChatGPT）开着自动往返，脚本照样往下装；10:39:58 重启后这单记「驿窗重启，自动往返先暂停」，ChatGPT 的回信不再自动转回 Claude，要常浩在卡上手动点。
- 根因：装机必然重启驿窗，重启会暂停所有 `auto` 且 opening / open 的接力（`handoffs.rs` 的 `restarted`）。「装前先查」只是写在交接和习惯里，脚本不管，查的结果要人看了才算数，一串命令里看不到。
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

## L-47 本机负载高时 MCP 测试偶发约 45 秒超时，每次挂的不是同一条（2026-11-14）

- 现象：#354 变基后把全量测试和 `tauri build` 写在同一条后台命令里，前后脚还有别的会话在打包，负载 15–20。`pnpm test` 的 `test:mcp` 挂了 2 条（`on Windows the launcher names the client…`、`relay_to_chatgpt hands…`，45 秒、100 秒）；补跑时换成另一条（`an Antigravity caller…`，45 秒）。负载降到 6 左右单独跑 `node --test src/apps/mcp/test/*.test.mjs`，9 条全过、20 秒。改动本身不碰 MCP。
- 根因：MCP 测试要起宿主进程、走 stdio，负载高时等不到回应就超时；不是代码问题。另外 `pnpm test` 是 `&&` 串起来的，MCP 一挂，后面的插件和 Chrome 插件测试根本没跑，不能当成「只挂了 MCP」。
- 正确做法：全量测试不和打包放在同一条命令里并行，先测完再打。MCP 失败且耗时在 45 秒上下时，等负载降下来单独重跑 `test:mcp` 确认，再补跑 `test:plugins`、`test:extension`；交接里两次结果都写，不改代码去「修」它。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-14-354-workplace-state/` 的 `test-rebased.txt`、`test-rebased-rest.txt`、`test-mcp-3.txt`、`test-rebased-plugins.txt`。
- 升级：〔结构〕已升级（2026-11-19，#415：MCP 测试的替身引擎编完先单独启动一次、给 120 秒，中转等引擎的 45 秒只算请求本身；`pnpm test` 改成 `src/tooling/test-all.mjs`，五套依次跑完再汇总，任何一套失败整体非零退出，测试 `tests/test-all.test.mjs`。注入「替身第一次启动停 50 秒」，旧代码 45 秒后报 `reading 'description'`、新代码通过，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`；积压清单组 1。不覆盖：机器忙时中转程序自己（node + tsx）启动慢）。原记录：未升级。

## L-48 测试里新写出的替身程序，机器忙时启动要好几秒，和要验的截止时间共用一个短超时就偶发失败（2026-11-14）

- 现象：`platform` 的 `a_write_to_an_app_server_that_stopped_reading_ends_at_the_deadline` 偶发 `TimedOut`，panic 在 `StdioServer::open(... 3 秒).unwrap()`；全量 `pnpm test` 并行跑、刚打完包时容易碰到，单独跑 3 次 2 过 1 败（#357）。只把 CPU 打满复现不出来；一边批量新建并执行几百个脚本、一边跑这项测试，16 次全败，都停在 3.06 秒。
- 根因：`StdioServer` 的握手（`initialize` + `initialized`）和之后每个请求共用一个 `timeout`。测试为了让「写入截止」3 秒内触发，把它设成 3 秒，python3 替身冷启动加握手也只剩 3 秒。平时 `#!/usr/bin/env python3` 起一个新写出的脚本就要 0.4–0.6 秒（`/usr/bin/python3` 是 xcrun 垫片），系统同时首次执行大量新程序时会排到几秒。
- 正确做法：测试里起替身程序的那一步给足时间（几十秒，正常情况立即返回、不拖慢测试），要验的截止时间单独设短。`StdioServer` 有仅测试用的 `set_timeout`，握手完再设。复现这类偶发超时用「批量新建并执行程序」压，不只用 CPU 压；压完 `pkill -f` 清掉压测进程，否则会顶到每用户进程数上限。
- 证据：修复后同样压测 32 次全过；单独连跑 20 次全过，每次 3.2–3.9 秒（写入截止仍是 3 秒）。证据目录 `~/Library/Application Support/postpane/evidence/2026-11-14-357-flaky-stdio/`。
- 2026-11-18 再现（#393）：`src/packages/engine-client/test/late-output.test.ts` 把替身引擎的启动算进了要验的 1.5 秒超时。启动一慢，第一个替身还没写标记文件就被杀掉，第二个被当成第一个、不回话，45 秒后才报超时，看起来像客户端坏了。新 worktree 首轮 `pnpm test` 两次都碰到（#389、#391）。改法同上：第一个替身先回一次话表示已启动（这一步给 60 秒），之后才开始计要验的 1.5 秒。这类用「标记文件分角色」的替身，要先确认第一个真的跑起来了再往下走。证据目录 `~/Library/Application Support/postpane/evidence/2026-11-18-393-late-output/`。
- 升级：〔提醒〕未升级；「测试里起子进程的超时和要验的时限分开给」换个项目也成立，可提议提升为全局坑。（2026-11-19 补层级：两处偶发已在原测试里改好，没有机制拦新写法；积压清单组 1 对这条只要求提升为全局坑，见下方「提升」）
- 提升：已提升为全局 G-30（2026-11-19，agent-kit#82）。

## L-49 小人导演有 TS、Rust 两份，实机走 Rust；只改 TS 在预览台里看着对、实机不生效（2026-11-14）

- 现象：#358 让待核对的会话「不让小人来找你」，只改了 `src/packages/hud/src/bots/mark-director.ts`，契约测试和场景预览台都对；合并后才发现应用里的小人指令是 `src/packages/app/src/lib/use-bot-directions.ts` 经 `invoke("hud_bot_directions")` 从 Rust 取的（`src/crates/hud/src/bots.rs`），TS 版只在浏览器预览（非 Tauri）里跑，实机小人照旧摆「问你」。票根 working 计数同理：TS `model.ts` 与 Rust `vendors.rs` 各一份。
- 根因：小人导演和票根派生是从 TS 移植到 Rust 的，两边并存；`bots.rs` 的对拍测试 `directs_as_the_typescript_director_did` 只回放 `director-cases.json` 里录好的步骤，TS 改了行为不会让它变红。
- 正确做法：改小人行为、票根 working、vendor 派生时，Rust 那份一起改，两边各补测试：`mark-director.ts` ↔ `src/crates/hud/src/bots.rs`（会话事实在 `bots/facts.rs`），`model.ts` 的 `vendorsFromSnapshot` ↔ `vendors.rs`，`stale.ts` ↔ `stale.rs`。预览台只能证明 TS 那份。
- 证据：#354 后续补漏 PR 的 `bots.rs` 测试 `a_stale_session_rests_its_bot_unless_a_card_stands`、`stale.rs` 测试。
- 升级：〔提醒〕部分升级（2026-11-19，#415：加了 TS 回放测试 `src/packages/hud/test/director-cases.test.ts`，和 Rust 的 `directs_as_the_typescript_director_did` 回放同一份 `director-cases.json`，只改一边、不改用例，那一边就红；把 TS 的 failed 提示改成 limit-hit，原有前端 462 条全绿、新测试变红，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`。积压清单组 2 的目标是〔机检〕，但驿窗没有 CI 和提交前钩子，测试只能手动跑，所以只算〔提醒〕部分升级。不覆盖：`model.ts` ↔ `vendors.rs`、`stale.ts` ↔ `stale.rs` 两对）。原记录：未升级。
- 提升：并入全局 G-31（2026-11-19，agent-kit#82），是「同一组取值或规则在几处各写一份」的第二例。

## L-50 ChatGPT 的标记名经 `vendorKey` 换算成 `openai`，按它筛接力会筛空（2026-11-14）

- 现象：#368 给没有额度区块的 ChatGPT 卡加统一卡头，`BoardHeading` 用 `vendorKey("ChatGPT")` 去 `relaysOf` 找接力，预览台 `mixed` 场景里开着 2 单，纸飞机却不出来。
- 根因：`agentArtworkKey` 把 ChatGPT 的标记名归到 `openai`（和 Codex 共用过 OpenAI 小人），而 `relaysOf` 认的是来源 id `chatgpt`。标记名、图标键、来源 id 是三样东西，名字相近容易混用。
- 正确做法：按家找数据（接力、会话、审批）用来源 id：单家面板里取 `sessionScope(...).sources` 或 `sourcesForMark(snapshot, 标记)`，不要拿 `vendorKey(标记名)` 当来源；`BoardHeading` 的 `place` 参数就是为此加的。
- 证据：`src/packages/hud/test/relay-toggle.test.ts`「every agent's card carries one plane in its head」断言 `place={selectedSources?.[0]}`。
- 升级：〔提醒〕不升级（2026-11-19，积压清单组 16）：已有测试守住这一处（`src/packages/hud/test/relay-toggle.test.ts`，未接进必经检查）；改成按类型区分标记名、图标键、来源 id 改动面太大，再犯再做。 原记录：未升级。

## L-51 「ChatGPT 30 分钟没回信」多半是回信到了、没认出来：页面存两份对话、提问显示会变、输入框会留旧稿（2026-11-19）

- 现象：11-14 到 11-18 接力反复「ChatGPT 30 分钟没回信，自动往返停下」。`turns.jsonl` 里同一会话每 2 分钟一行 `complete unmatched`：ChatGPT 一两分钟就回了，驿窗判成「不是这次送审的回信」，没转回，等满 30 分钟（#410）。
- 根因（三处，Chrome 里只读打开当时的 ChatGPT 会话逐一核对）：
  1. chatgpt.com 把对话放两份：前面一份隐藏（高 0），各轮按顺序都在、回信不画；后面一份显示，只画屏幕附近几轮。插件取页面里最后一个节点，拿到的是显示那份里较早一轮的提问和回信（`complete unmatched` 的字数正好等于上一轮回信）。
  2. 提问的显示有两种：有的会话把代码块画成代码框，```` ```python ```` 那一行整行没了；有的原样显示、换行全丢。比对只去了反引号，语言名还在，开头 600 字里带代码块的送审全对不上。
  3. 输入框里留着上一轮整段送审（ChatGPT 恢复的草稿），粘贴后发出去的是「旧送审 + 新送审」一条，开头是旧的。
- 正确做法：查接力「超时」先看 `turns.jsonl` 的 outcome，`unmatched` 就是认领问题，不是 ChatGPT 慢。插件按单元键（`data-chatgpt-search-unit-key`）第一次出现的顺序定最新一轮，读它最后一份（显示的那份）；只在隐藏那份里时不报、重读时滚到底让它画出来。比对两种归一都试（去代码块标记行 / 只去反引号）。发送前输入框有字先清空、等发送键灭了再粘贴，点发送前核对没多出旧字。
- 补充（同日装机实测）：新插件在后台标签页里滚到底也画不出回信。ChatGPT 不在后台标签页渲染新内容，常浩把那个标签页切到前台后，下一次重读（10:16:51）立刻认领。重读遇到「已答但没画出来」时，把标签页在自己窗口里短暂切到前台再问，问完切回。另外，Chrome 开发者模式加载的插件目录要核对：本机有 6 份插件副本，重新加载了另一份等于没更新（这次常浩移除后重新加载主目录那份才生效）。
- 补充（S1，同日）：认领修好后，「等不到回信」还有第二类，而且更多：Fable 5.2 评估 89 单、148 次送审，22 单等不到回信，其中 16 单是回信认领了，但自动往返已经停过（上一轮「Claude 2 小时没交回复审」「回信没写结论」「决策升级」，或这一轮「30 分钟没回信」），回信就停在侧栏等常浩点「转回」，发起会话一直在等。查这类先看 `handoffs.json` 的步骤：最后是 `stop` …… `ask` → `reply`、后面没有 `back`，就是这一类，不是认领问题。正确做法：自动往返关着时到的回信照样转回一次、写明下一步交常浩（`Handoff::held_answer`），驿窗自己停的在下一轮送审送到时重开自动往返，常浩手动暂停的不动。不做「重读时把后台标签页切到前台」（分支 `claude/410-relay-front2`，已删）：会抢常浩正在用的标签页，两单同时等时会切错标签页，也没有次数上限；后台标签页没画出来的回信，等常浩切到那个标签页时认领，有了 S1，认领后即使自动往返已因 30 分钟没回信停下也会照样转回。
- 补充（长送审变附件，同日晚）：S1 上线后 19:27 又有一单「30 分钟没回信」，回合日志里只有「开始答」、没有任何「答完」。只读打开那个对话：ChatGPT 9 分钟就答完了，但这一轮提问显示成附件「粘贴的文本 (1)(1).txt」，页面上没有 `data-user-message-bubble`。插件判「答完」要求最新回复排在最新提问之后，提问找不到就一直当没答完、从不上报，重读也落空；驿窗比对提问文字同样对不上。查法：回合日志里某会话只有 `start`、没有 `complete`，先只读打开对话看提问是不是附件。正确做法（#410 甲）：认领改按 ChatGPT 的提问编号——送出时插件读出新提问格子的 `data-chatgpt-search-message-ids` 报给驿窗、记在送审步骤上，答完时报这一轮回答的提问编号，两边相同才收；提问格子有自己的文字（附件名）就算提问。比对文字只给缺编号的老记录兜底。
- 证据：`src/apps/chrome-extension/test/page.test.mjs` 三条 #410 测试、`background.test.mjs`「an answer not drawn in a background tab…」、`content.test.mjs`「an answer held only in the hidden copy…」、`src/crates/host/src/handoff.rs`「a_prompt_drawn_without_its_code_fences_is_still_the_review」，均先在旧代码上失败；真实页面核对记录在 `~/Library/Application Support/postpane/evidence/2026-11-19-410-relay-unmatched/`。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：已写测试 `src/apps/chrome-extension/test/` 的 `page.test.mjs`、`content.test.mjs`、`background.test.mjs` 和 `handoff::belongs` 的 `a_prompt_drawn_without_its_code_fences_is_still_the_review`（#412、#413），未接进必经检查；积压清单未列这条）。原记录：未升级。

## L-52 用 Pillow 的 `ImageChops.difference(...).getbbox()` 比两张 RGBA 截图，只看透明度，小人明明在动却报「一样」（2026-11-18）

- 现象：#401 调查装后冒烟时，对真实侧栏窗口隔 2 秒截两张（`screencapture -l`，RGBA），用 `ImageChops.difference(a, b).getbbox()` 比，第一对返回 `None`，差点据此得出「隔 2 秒的两张可能恰好一样，要多截几张」的结论。同两张图换成逐像素比四个通道，有 2024 个像素不同，范围正落在小人上。
- 根因：Pillow 的 `getbbox()` 对带透明通道的图默认只看透明通道（`alpha_only=True`）。侧栏窗口的透明度两帧不变，颜色变了也报 `None`。#395 那次先 `.convert('RGB')` 再比，所以没踩到。
- 正确做法：比截图先转 RGB 再 `getbbox()`，或用 `getbbox(alpha_only=False)`；驿窗装机冒烟直接用 `.agents/skills/postpane-round/scripts/smoke.mjs compare <前.png> <后.png> [差异图.png]`，四个通道都比，并出一张标红的差异图。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-18-401-install-guard/smoke-live/`（同一个运行中的驿窗上 `smoke.mjs after` 判「在动」、1356 个像素不同，差异图 `smoke-motion-1.png`）。
- 升级：〔提醒〕部分升级（2026-11-19 补层级：驿窗自己的截图比对收进 `smoke.mjs compare`，测试 `tests/smoke-diff.test.mjs` 未接进必经检查；积压清单未列这条）。原记录：已写成工具和测试（`smoke.mjs`、`tests/smoke-diff.test.mjs`）。换个项目也成立（拿 Pillow 比任何带透明的截图都会踩），可提议提升为全局坑。

## L-53 侧栏前端里经 `model.ts` 的模块，plain node 的 TS 测试加载不了：它按 Vite 的方式引 JSON 和图片（2026-11-19）

- 现象：给 TS 小人导演写回放测试（L-49），`import { MarkDirector } from "../src/bots/mark-director.ts"` 直接报 `ERR_MODULE_NOT_FOUND …/src/model`。`test:ts` 是 `node --test "src/packages/*/test/*.test.ts"`，靠 node 自己去类型。
- 根因：`mark-director.ts` 引 `../model`（不带扩展名），`model.ts` 又引 `@agent-hud/protocol/hud-defaults.json`（不带 `with { type: "json" }`）和 `./agent-artwork`（再往下引图片），这些只有 Vite 认。别的 TS 测试测的模块都是带 `.ts` 扩展名、不碰 `model.ts` 的叶子模块，所以以前没碰上；这也是 TS 导演一直没有单测、只靠预览台看的原因之一。
- 正确做法：测这类模块，在测试里用 Vite 加载：`createServer({ configFile: false, root: <包目录>, appType: "custom", server: { middlewareMode: true, hmr: false, watch: null } })` 后 `ssrLoadModule("/src/…")`，拿到模块再 `close()`（中间件模式不开端口）。包目录和仓库里别处的文件用 `join(import.meta.dirname, …)` 拼路径，写成 `new URL("..", import.meta.url)` 会被 `check:packages` 当成越出包（本轮第一次全量就挂在这里）。写法见 `src/packages/hud/test/director-cases.test.ts`。不要为了能测去改 `model.ts` 的引用链。
- 证据：本轮会话；`director-cases.test.ts` 用 Vite 加载后 `ℹ pass 1`。
- 升级：〔提醒〕未升级（2026-11-19：只有一处用到，先记坑）。

## L-54 撤修复验证用 `cp` 备份、`mv` 还原，文件修改时间退回去，cargo 不重编、跑的还是撤改版（2026-11-18）

- 现象：#348 返修逐项「撤一处修复 → 跑对应测试 → 还原」，几项都如预期失败；全部还原后再跑全量，那条落盘失败的新测试一直失败，代码却已是对的。
- 根因：`cp f f.bak` 给备份打上当时的修改时间，改完再 `mv f.bak f` 还原，文件修改时间回到撤改之前，早于刚编出的撤改版产物；cargo 只比修改时间，认为不用重编，跑的还是撤改版（同 G-23 一类：cargo 只看修改时间）。
- 正确做法：还原后马上 `touch` 还原的文件（或改用 `git checkout -- <文件>` / `git stash` 一类会写新修改时间的方式），再跑全量；撤修复验证的结论照常有效，因为每一次撤改都写了新修改时间、触发了重编。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-18-347-review-gate/revert-checks.log`；`touch` 后全量 `cargo test -p agent-hud-host` 135/0。
- 升级：〔提醒〕未升级。可提议并进全局 G-23（同一根因）。

## L-55 用 `ditto` 备份驿窗数据目录里的 `chatgpt/`，碰到 `extension.sock` 报错退出，后面的命令全没跑（2026-11-19）

- 现象：接力审核门生效切换前按生效门备份 `<数据目录>/chatgpt/`，`ditto <数据目录>/chatgpt <证据目录>/chatgpt-before && … && install.sh …` 第一步就报 `extension.sock: Operation not supported on socket`、退出码 1，后面的装机没跑。
- 根因：`chatgpt/` 里有 Chrome 插件转接用的 Unix 套接字 `extension.sock`（驿窗运行时一直在），`ditto` 不能复制套接字，遇到就整体失败。
- 正确做法：备份这个目录用 `rsync -a --no-specials --no-devices <数据目录>/chatgpt/ <证据目录>/chatgpt-before/`（跳过套接字，其余照抄），再 `cmp` 核一遍 `handoffs.json`；套接字不用备份，驿窗启动时会重建。还原时同样只拷普通文件。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-19-review-gate-golive/chatgpt-before/`（1.7 MB，`handoffs.json` 与原件 `cmp` 一致）。
- 升级：〔提醒〕未升级（2026-11-19：只在生效切换这类手动备份时碰到；install.sh 不备份数据目录，要备份时照这条做）。

## L-56 有待处理时藏掉额度区块，连带藏掉了 Hermes 唯一能跳飞书的「最近被问」（2026-11-19）

- 现象：常浩截图说 Hermes 侧栏「又无法跳转到飞书会话了，之前是可以实现的」。卡上只剩「等待处理 · 4」，各行 ↗ 是暗的。
- 根因：#196 只给 Hermes 卡里的「最近被问」接了飞书跳转，待处理 / 正在进行 / 回执里的 Hermes 会话 `navigationTarget` 一直为空（#196 交接写了「本轮未做」）。#371 起有待处理时展开卡不画额度区块，而 Hermes 的「最近被问」就画在额度区块的位置（`QuotaSection` → `HermesBoard`），于是一有待处理，唯一能跳的地方就不见了。#371 验证只看了 Claude、Codex、DeepSeek 的场景，没看 Hermes。
- 正确做法：藏掉或挪走一整块区域前，先列出它里面有哪些别处没有的功能（跳转、按钮、开关），一并确认去处；各家的「回到会话」都放在会话行自己的 `navigationTarget` 上，不只放在某个区块里。#424 起 Hermes 会话行按飞书聊天或定时任务的投递对象给出跳转目标。
- 证据：#371 交接（`CURRENT.md` 2026-11-15 一节，验证场景 `mixed`、`claude-many-asks`、`all-running`）；#196 交接遗留第 3 条；实机快照 2026-11-19 18:1x Hermes 会话 `navigationTarget` 全为 `null`；#424 测试 `a_hermes_session_goes_back_to_its_feishu_chat`。
- 升级：〔提醒〕部分升级（2026-11-19：Hermes 这一处写成测试，未接进必经检查；「藏区块前列独有功能」只是这条提醒）。

## L-57 Hermes 记下的飞书用户 id 换了格式，只比用户 id 认本人，本人私聊被当成同事私聊（2026-11-19）

- 现象：亚古兽 11-19 11:10 的私聊在「最近被问」里没有 `chatId`，点不了；以前的私聊都能点。
- 根因：Hermes 这条会话的 `user_id` 记成 `e9cgcf77`，不是以前的 `ou_…`（open id），和 `config.yaml` 的 `home_channel.user_id` 对不上；驿窗只靠这一个字段判断「是不是常浩本人的私聊」。这条私聊的 `chat_id` 其实正是配置里常浩那个私聊。为什么 Hermes 换了格式未核实。
- 正确做法：认本人私聊时，用户 id 相同，或聊天 id 就是 `home_channel.chat_id`，满足一条即可（`hermes/chats.rs` 的 `HomeChannel::opens`）；读外部程序写的 id 不假定格式永远不变。
- 证据：`~/.hermes/profiles/agumon/state.db` 只读查询：`dm|e9cgcf77|1|2026-11-19 11:10:45`，同库其余私聊 `ou_6fac…`；#424 测试 `an_ask_opens_its_group_or_the_owners_own_private_chat` 的 `alias` 行（改前 `None`，见 `evidence/2026-11-19-424-hermes-jump/red-agents.log`）。
- 升级：〔提醒〕部分升级（2026-11-19：写成测试，未接进必经检查）。

## L-58 侧栏面板画两份，「展开其余 n 条」只展开了看得见的那份，框按没展开的测高副本定高（2026-11-19）

- 现象：常浩截图说 ChatGPT 卡点「展开其余 n 条」后快 10 条内容，框还是很短，只能在里面滚；Claude 提问卡同样。
- 根因：`HUDScene.tsx` 每个面板画两份：看得见的一份和隐藏的测高副本（`data-hud-measurement`），框高取测高副本的高度（最多屏幕高 - 80）。「展开其余 n 条」的开合是各组件自己的 `useState`，两份各有一份状态，点的是看得见的那份，测高副本一直折着。预览台实测：展开后 ChatGPT 卡测高仍 665、Claude 提问卡仍 790。
- 正确做法：凡是会改变面板内容高度的界面状态（展开 / 折叠、切页、选中某条），不放组件本地 `useState`，放两份共读的外部状态（#430 起是 `panel/fold-store.ts` 的 `cardFolds`，键按卡和段区分），侧栏收起时由 `useCloseWithSidebar` 统一复位；验证时同时看测高副本和可见框的高度，不只看内容有没有出来。
- 证据：`evidence/2026-11-19-430-fold-measure/`：`red.txt`（`fold-store.test.ts` 改前失败）、`before-chatgpt-expanded.jpg` / `after-chatgpt-expanded.jpg`、`preview-measure.md`（改后 ChatGPT 666 → 849、Claude 790 → 1089）。
- 补（2026-11-20，#448）：#430 把复位挂在「侧栏收起」上，可侧栏顶上挂着提醒条或待处理请求时永远不算收起，实机上展开后移开再悬停仍是展开的（「人机协作」会话代验发现）。复位要挂在「这张卡关上」（`HUDScene.tsx` 的 `open`）上，不挂在更粗的「侧栏收起」上；`closesWith` 把两者分开，接力卡仍等侧栏收起。验证「下次打开回到默认」时要在有提醒挂着的场景（如 `claude-many-asks`）里真的移开、等收起、再打开。
- 升级：〔提醒〕部分升级（2026-11-19：`fold-store.test.ts` 守住几处已知的折叠，未接进必经检查；`CompletionAlertView` 里「点开的那条回复」`chosen` 仍是本地状态，未核实是否同类）。

## L-59 长 brief 一次粘贴进 ChatGPT 被转成附件，回信早到了，驿窗却报「30 分钟没回信」（2026-11-19）

- 现象：新规则冒烟（#348 解冲突 L1 复核，接力 `h1a1f38f8b6200`），11516 个字符的 brief（13724 字节）送出后，ChatGPT 9 分 22 秒就写完回信（审查出口「通过」），驿窗一直没收下，30 分钟后报「ChatGPT 30 分钟没回信」停了自动往返。
- 根因：插件把整份 brief 一次粘贴，ChatGPT 把单次超过某个长度（按字符数，在 8000 到 1 万字之间）的粘贴转成附件「粘贴的文本.txt」。附件消息没有 `[data-user-message-bubble]`，页面上也只有文件名、没有原文：会话第一轮时 `answered()` 恒为 false，插件不报 `turn complete`，重读也不报；已有旧气泡的会话里（推断，未实测）插件会拿上一轮的气泡当最新提问上报，`belongs.rs` 判对不上。`holds()` 只防「输入框比原文多」，输入框空着（字在附件里）也放行发送。代码注释早写着「让 ChatGPT 把很长的文字转成附件」，从 #99 起一直如此，只是之前的 brief 都没到阈值（有记录的最长 6887 字）。
- 正确做法：送话按行切成每段不超过 6000 字分次粘贴（`page.js` 的 `pieces`、`paste`）；每段要等输入框（去空白）净增长到这段的全部可见字才算贴进（只看「变长」会放过只贴进半段的情况，只看总长八成会放过丢两成；只有空白的一段不能单独切出、也不能跳过，#435 审查 P1-01），贴完再核对输入框去空白后和原文是同样的字（只比字数会放过页面换了字的情况）；没贴全或字不同而发送键亮着就报 `composer-mismatch`、不发；贴之前输入框空着而发送键亮着（上次留下的附件，清空输入框清不到它）也不发。往第三方页面送长文时，先实测页面对单次输入的长度处理，不假定原样进输入框。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-19-golive-smoke/`（`root-cause-attachment.md`：页面 `[data-user-message-bubble]` 为 0、用户单元正文只有文件名；`turns-6afedd1d.jsonl` 只有两条 `start`）；阈值与分段实测记录在 #429；测试 `a long brief goes in as text, pasted a piece at a time`、`words that did not go in as text are not sent`（改前红：`evidence/2026-11-19-429-long-brief/red-before.txt`），`a long line is not cut inside a character`、`an attachment already in the composer is not sent along`（改前红：同目录 `red-round2.txt`）；真实页面只粘贴不发送、切点落在 ```` ```diff ```` 块内，逐行一致、无附件（2026-11-19 21:3x，记在 #429）。
- 升级：〔提醒〕部分升级（2026-11-19：写成插件测试，阈值随 ChatGPT 改版可能变化，没有接进必经检查）。

## L-60 在通道唯一的读线程上发送并等确认，确认永远读不出来：补格式每次都等满 30 秒超时（2026-11-19）

- 现象：还没在实机出现，是全链路梳理时读代码发现的（#440）。回信末尾几行不合规时驿窗请 ChatGPT 补写格式，这次发送必然等满 30 秒，卡上会记「请 ChatGPT 补写末尾几行没确认送到：…timeout」，自动往返停下，发起会话收到「送达状态未知」；这 30 秒里别的接力的发送确认也读不出来。补格式随审核门 11-19 上线，本机还没有一封回信走到这条路。
- 根因：插件的每句话由连接唯一的读线程读出（`platform/.../chatgpt/unix.rs`），监听回调在这条线程上同步执行。读线程上有三条路都会等到一个只有它自己能带回的确认：
  1. 回调里直接 `Desk::drive`：遇到要补格式就调 `ask_format` → `Lines::send` → `Shared::ask_as`，`recv_timeout` 等 `sent`。
  2. 回调里通知侧栏 `republish`：`Backend::refresh_handoffs` → `handoff::projection` → `catch_up` → `drive`，和上一条一样。第一版修复只挪走了第 1 条，L2 审查指出这条还在（#441 P1-01）。
  3. `republish` 要拿后台锁；数据线程做快照时拿着这把锁走 `projection` → `ask_format` 等 `sent`，读线程卡在等锁上，读不到 `sent`。
  测试没拦住，是因为替身 `Fake::send` 立刻返回，比真实通道宽松（全局坑 G-34）；第一版的新测试又把 `republish` 写成空函数，漏了第 2、3 条。
- 正确做法：读线程上的回调只记账（`observe`），推进和通知侧栏都交给另一条线程（`handoff/driver.rs` 的 `Driver`）。看一个函数能不能放在读线程上，要顺着调用链看到底，名字像「通知」「刷新」的不等于没有副作用。给会「发出去再等回应」的接口写测试时，替身要带上真实约束（回应只能由读线程带回，`handoff/tests/driver.rs` 的 `Wired`），回调的每个参数都要用和实机等价的实现测一遍（`Rig::refresh` 带后台锁、会推进）。
- 证据：`src/crates/host/src/handoff/tests/driver.rs`。`an_ask_to_mend_hears_that_it_went_in` 在原来的写法上失败（`evidence/2026-11-19-440-format-thread/red-before.txt`）；`the_sidebar_is_not_refreshed_on_the_reading_thread`、`a_refresh_that_waits_for_the_data_thread_does_not_hold_the_reading_thread` 在第一版修复上失败（`red-round2.txt`），第二版 6 条都过（`green-round2.txt`）。
- 升级：〔提醒〕部分升级（2026-11-20：写成测试，未接进必经检查；这条通道目前只有 `handoff::listen` 一个监听者，以后再加监听者要守同一条）。

## L-61 回信在 ChatGPT 页面里，窗口不在屏幕上就不画，重读也读不到，又等满 30 分钟（2026-11-20）

- 现象：#439 第 2 轮（接力 `h1a1f4958c4300`）05:31 送审，提问编号已记上。插件 05:31:18 报了「开始答」，之后没报答完，也没有 `unmatched`；06:01 驿窗按「ChatGPT 30 分钟没回信」停下。06:15 在 Claude in Chrome 新开前台标签页只读打开这个对话：回信早已答完（思考 14 分 19 秒，8054 字，结论「返修」）；页面里这一轮隐藏的那份只有 17 字（没画出），前台画出的一份是全文。打开约 1 分钟后，驿窗的定时重读读到它并收下（06:16:46 `complete taken`）。
- 根因（推断，原标签页当时的样子没看到，插件状态不落盘）：ChatGPT 只在看得见的页面里画新内容。原标签页所在的 Chrome 窗口不在屏幕上（最小化、被挡住或在别的桌面），页面一直算在后台；#413 的「切到前台再问」只在窗口里切标签、不抬窗口，救不回来。驿窗每 2 分钟让插件重读，插件不回报结果，所以这 30 分钟里驿窗和事后的人都看不出卡在哪。
- 正确做法：重读必须回报结果和标签页状态（`outcome`、`hidden`、`active`、`minimized`、`fronted`），记进 `turns.jsonl`（#457）；「已答完、没画出」连续两次就停下交给常浩，并说清点开那个 ChatGPT 标签页就能收回，不再干等 30 分钟。凡是「请对方再做一次、做没做成不回话」的补救，都要让它回话，否则补救失灵时没人知道。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-20-439第2轮漏报.md`；`evidence/2026-11-20-457-reread-undrawn/` 下 `red-background.txt`、`red-host.txt`、`red-platform.txt`（改前红）。测试：插件 `reading again tells PostPane what it found and how the tab stood`、`a read again says whether it was told, …`；驿窗 `handoff::tests::undrawn` 三条；平台 `the_extension_opens_a_conversation_and_reports_its_reply` 里 #457 那段。
- 升级：〔提醒〕部分升级（2026-11-20：写成测试；「窗口不在屏幕上就不画」还没有实测，等第 1 批记录攒到证据，再定第 3 批的自动救回）。

## L-62 侧栏有两条指针路径，「挂件不算侧栏」只在网页路径生效：实机悬停挂件时 DeepSeek 小人跟着动、小收据长成面板（2026-11-20）

- 现象：常浩把鼠标放到侧栏下方的随手记猫球、磁盘瘦身球上，最下面一格 DeepSeek 的小人做悬停动作，有时还弹出 DeepSeek 的单家面板（#480）。场景预览台里同样操作没有这个问题。
- 根因：侧栏悬停有两条路径。实机走原生指针（`hud:pointer`，`useHUDInteraction.ts` 里 `nativePointer` 那个 effect）；场景预览台没有原生指针，走网页的 `pointerenter` / `pointerleave`。挂件在侧栏窗口的命中区里，原生指针报 `inside: true`：effect 先 `setPointerInside(true)`，`hovered` 停在最后经过的一格（往下移正好经过 DeepSeek），`BotMark` 按 `hovered === key && pointerInside` 做悬停动作；小收据已出时 `entered()` 跳过了挂件判断，「停久看全」的计时照走，1.9 秒后长成面板。网页路径离开票条就触发 `pointerleave`，挂件不在保留名单里，按离开处理，所以没事。#133 加「猫球不弹面板」时只在打开判断里挡了一下，没让原生路径把挂件当成离开。
- 正确做法：改侧栏悬停、离开、展开的逻辑时，原生路径和网页路径各过一遍；判定写成两边共用的纯函数（这次是 `request-hover.ts` 的 `onSidebar`、`peek-expand.ts` 的 `peekGrowing`），测试覆盖。场景预览台只走网页路径，原生路径的结果只能装机看。
- 证据：issue #480；`~/Library/Application Support/postpane/evidence/2026-11-20-480-pendant-hover/`（`red.log` 改前红，`check2.log`、`test2.log`、`node2.log`）。测试：`request-hover.test.ts`「a pendant hangs outside the sidebar…」、`peek-expand.test.ts`「a peek grows into its panel only while the pointer stays on the sidebar」。
- 升级：〔提醒〕部分升级（2026-11-20：写成测试，未接进必经检查）。

## L-63 整套 platform 测试并行跑时，`the_extension_opens_a_conversation_and_reports_its_reply` 偶发失败，main 上也一样（2026-11-20）

- 现象：#486 改动后 `cargo test -p agent-hud-platform --lib` 三次里挂了两次，都是这一条，断言是 `tests_unix.rs:195` 的 `assert!(focus("68a1"))`。当时机器负载均值 20–80（别的会话在编译）。
- 根因：没查到底。能确定的两点：这条测试跑的时候走不到 #486 改过的代码（`--nocapture` 下没有任何输出）；main 上同样会挂。单跑这一条，main 和 #486 分支交替各 80 次都过；整套并行交替各 15 次，main 挂 2 次、分支挂 2 次，都是这一条。`focus` 读的是进程里共用的一个全局通道（`commands.rs` 的 `CURRENT`），同一进程里并行的别的测试也会换它，像是测试之间抢这个全局量（推断，没证实）。
- 正确做法：这条失败先别归到自己的改动上，也别直接当偶发放过：在 main 和自己的分支上交替各跑同样多次，比失败率；一样就写进交接，按范围外发现报，不为它改代码。全量里它挂了，等负载降下来重跑。
- 补充（2026-11-21，#488）：原因坐实了。`Channel::start` 把自己登记进进程级的 `CURRENT`，`focus()`、`reread()` 都从它取；`tests_unix.rs` 里原有两条测试各起一个 `Channel`，并行时后起的顶掉先起的，`focus("68a1")` 问到另一条测试的通道。#488 加第三条起 `Channel` 的测试后，这条失败变得常见，撤掉就恢复。已改：起 `Channel` 的测试都先拿同一把测试锁（`tests_unix.rs` 的 `one_channel()`），一次只有一个；不需要真实 socket 的新测试直接用 `Shared::new` + `attach`（假对端）+ `inbound`，不碰 `CURRENT`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-20-486-app-log/flake-compare.txt`（整套并行交替各 15 次，记了每次挂的是哪条）、`platform-rerun-2.log`。
- 升级：〔提醒〕未升级。

## L-64 隔离起一份打好的应用做验证，只换数据目录不够：它启动时会把 Claude Code 插件改装到自己的目录下（2026-11-20）

- 现象：没有发生，动手前读代码拦下的。#486 要在真应用里验日志落盘，原打算 `AGENTHUD_DATA_DIR=<临时目录>` 另起一份打好的包。
- 根因：应用启动时会修各家登记（`claude_plugin::repair_on_launch`）：Claude Code 里的驿窗插件如果是从「别的目录」装的，就从自己的数据目录重装一遍。隔离实例眼里，常浩正在用的那份就是「别的目录」；它一启动，正在用的插件会被指到临时目录，之后的转回、左滑都送不到真应用。只换数据目录时，它读的仍是真的 `~/.claude`。
- 正确做法：隔离验证连主目录一起换。应用的主目录只认 `$HOME`（`os/macos/mod.rs` 的 `home_dir`），数据目录、Claude 配置、各家登记都从它推出来：`env -i HOME=<证据目录下的空文件夹> PATH=/usr/bin:/bin:/usr/sbin:/sbin <包里的主程序>`。不在 `/Applications` 里的副本不认领客户端钩子，也不抢共用锁。启动前后各记一次 `shasum ~/.claude/plugins/installed_plugins.json`，确认没变；停它只按自己记下的进程号 `kill`，不用 `pkill -f`（G-32）。屏幕上会多出一条侧栏，验完就关。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-20-486-app-log/iso-run1-postpane.log`（隔离实例写出的启动行和 panic 一段）；验证前后插件登记的校验值都是 `8c45e265e598`。
- 升级：〔提醒〕未升级。
