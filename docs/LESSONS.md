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

## 已归档的条目

按上面「条目超过约 30 条时整理一次」，已升级或已关闭、之后没再犯的条目原样移到 [docs/history/LESSONS-归档.md](history/LESSONS-归档.md)（2026-11-22）。编号不复用；排障时这里搜到编号，正文去归档里看。

- L-01 新目录直接跑 cargo test，桌面程序编译失败（2026-11-04）：〔文字〕已升级
- L-02 bun 编译出的程序在 macOS 上一运行就被杀（2026-11-04）：〔结构〕关闭
- L-03 安装时先删旧版，打包路径读错导致应用被删（2026-11-04）：〔结构〕关闭
- L-06 新装的包卡在「正在读取本机活动…」，侧栏不出现（2026-11-05）：〔结构〕关闭
- L-12 全量测试偶发一条 core 演示测试失败，不是本次改动造成的（2026-11-07）：〔结构〕已升级
- L-17 机器负载很高时，`core` 的 Grok 计时测试稳定失败（2026-11-07）：〔结构〕已升级
- L-26 几个 worktree 共用 CARGO_TARGET_DIR，测试跑的是别的 worktree 编出的代码（2026-11-08）：〔文字〕已升级
- L-33 并行子 agent 共用一台机器，宽泛的 `pkill -f` 把别人正在跑的测试也杀了（2026-11-09）：〔机检〕已升级
- L-34 共用 `CARGO_TARGET_DIR` 时，`package-resources` 先于导出变量跑，又在 worktree 里生成了自己的 `target`（2026-11-09）：〔结构〕已升级
- L-41 bypass 模式下 Bash 仍要批准，批准卡只挂在驿窗侧栏，没人点，16 分钟后桌面版判「Claude Code stopped responding」（2026-11-09）：〔机检〕已升级
- L-44 装机前查自动往返接力，查出有也照装了：查和装写在同一条命令里，中间没停（2026-11-14）：〔机检〕关闭
- L-45 预览脚手架的 `?still` 用展开复制伪造 `matchMedia`，小人全退成静态图（2026-11-14）：〔结构〕关闭
- L-46 Claude 会话挂着后台命令等通知，侧栏却出 REPLY（2026-11-14）：〔提醒〕关闭

---

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
- 根因：投递服务只往「已知会话目标表」里的会话送话（`platform/src/delivery/sending.rs`）。这张表在驿窗启动时是空的（`host/src/messages.rs` 传 `Vec::new()`），只有「智能体互发消息」的工具被调用时才按当时的快照刷新；接力转回 Codex（`handoff/lines.rs`，7a 批 3 起在 `handoff/sending/desk_lines.rs`，的 `codex_send`）从不刷新。#281 那次能通过，是因为表里碰巧已经填过。
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

## L-47 本机负载高时 MCP 测试偶发约 45 秒超时，每次挂的不是同一条（2026-11-14）

- 现象：#354 变基后把全量测试和 `tauri build` 写在同一条后台命令里，前后脚还有别的会话在打包，负载 15–20。`pnpm test` 的 `test:mcp` 挂了 2 条（`on Windows the launcher names the client…`、`relay_to_chatgpt hands…`，45 秒、100 秒）；补跑时换成另一条（`an Antigravity caller…`，45 秒）。负载降到 6 左右单独跑 `node --test src/apps/mcp/test/*.test.mjs`，9 条全过、20 秒。改动本身不碰 MCP。
- 根因：MCP 测试要起宿主进程、走 stdio，负载高时等不到回应就超时；不是代码问题。另外 `pnpm test` 是 `&&` 串起来的，MCP 一挂，后面的插件和 Chrome 插件测试根本没跑，不能当成「只挂了 MCP」。
- 正确做法：全量测试不和打包放在同一条命令里并行，先测完再打。MCP 失败且耗时在 45 秒上下时，等负载降下来单独重跑 `test:mcp` 确认，再补跑 `test:plugins`、`test:extension`；交接里两次结果都写，不改代码去「修」它。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-14-354-workplace-state/` 的 `test-rebased.txt`、`test-rebased-rest.txt`、`test-mcp-3.txt`、`test-rebased-plugins.txt`。
- 补充（2026-11-22，又犯）：删死名字、修 lint 那一轮，别的会话同时在编译，负载 87–131。两次 `pnpm test` 和一次 `cargo test --workspace --no-fail-fast`，每次挂的都不一样：MCP 两条（90 秒、126 秒）、core `tests::ingestion::the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry`（要求快照 10 秒内做完）、platform `accounts::engine::tests_unix` 两条（等辅助进程报 ready）、Chrome 插件 `background.test.mjs` 两条信任判断；逐条单独重跑都通过。改动不碰这些代码。`cargo test --workspace` 一个 crate 失败后面的 crate 就不跑，要加 `--no-fail-fast` 才看得全。证据：`~/Library/Application Support/postpane/evidence/2026-11-22-dead-names-lint/` 的 `test.log`、`test-2.log`、`cargo-nff.log`、`mcp-2.log`、`ext-2.log`。
- 升级：〔提醒〕部分升级（2026-11-22：#415 的替身引擎没管住高负载下的超时，又犯一次，从归档移回）。原记录：〔结构〕已升级（2026-11-19，#415：MCP 测试的替身引擎编完先单独启动一次、给 120 秒，中转等引擎的 45 秒只算请求本身；`pnpm test` 改成 `src/tooling/test-all.mjs`，五套依次跑完再汇总，任何一套失败整体非零退出，测试 `tests/test-all.test.mjs`。注入「替身第一次启动停 50 秒」，旧代码 45 秒后报 `reading 'description'`、新代码通过，证据 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/red/`；积压清单组 1。不覆盖：机器忙时中转程序自己（node + tsx）启动慢）。原记录：未升级。

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
- 补充（S1，同日）：认领修好后，「等不到回信」还有第二类，而且更多：Fable 5.2 评估 89 单、148 次送审，22 单等不到回信，其中 16 单是回信认领了，但自动往返已经停过（上一轮「Claude 2 小时没交回复审」「回信没写结论」「决策升级」，或这一轮「30 分钟没回信」），回信就停在侧栏等常浩点「转回」，发起会话一直在等。查这类先看 `handoffs.json` 的步骤：最后是 `stop` …… `ask` → `reply`、后面没有 `back`，就是这一类，不是认领问题。正确做法：自动往返关着时到的回信照样转回一次、写明下一步交常浩（`Handoff::held_answer`），驿窗自己停的在下一轮送审送到时重开自动往返，常浩手动暂停的不动。没做的是另一版更激进的切前台（分支 `claude/410-relay-front2`，已删）：会抢常浩正在用的标签页，两单同时等时会切错标签页，也没有次数上限。留着的是 #413 合并的那一版（上一条补充写的，`src/apps/chrome-extension/background.js` 的 `drawnInFront`，`docs/chatgpt-channel.md` 的 `reread` 一行）：只在重读遇到「已答但没画出来」时，把标签页在它自己的窗口里切到前台再问，最多 3 次、每次隔 1.5 秒，问完切回原来在前台的标签页，这期间常浩自己换过标签就不动，也不把 Chrome 窗口提到最前（2026-11-21 改措辞：原来写成「不做重读时切前台」，和代码、通道文档对不上，常浩回「都按推荐」）。这样还画不出来的回信（窗口被挡住或最小化），等常浩切到那个标签页时认领，有了 S1，认领后即使自动往返已因 30 分钟没回信停下也会照样转回。
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
- 正确做法：读线程上的回调只记账（`observe`），推进和通知侧栏都交给另一条线程（`handoff/driver.rs`，7a 批 3 起在 `handoff/answers/desk_driver.rs`，的 `Driver`）。看一个函数能不能放在读线程上，要顺着调用链看到底，名字像「通知」「刷新」的不等于没有副作用。给会「发出去再等回应」的接口写测试时，替身要带上真实约束（回应只能由读线程带回，`handoff/tests/driver.rs` 的 `Wired`），回调的每个参数都要用和实机等价的实现测一遍（`Rig::refresh` 带后台锁、会推进）。
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
- 升级：〔文字〕已升级（2026-11-22，E-24）：驿窗一轮 SKILL.md 第 3 步「装之前（可选）」。原记录：〔提醒〕未升级。
- 提升：已提升为全局 G-48（2026-11-22，常浩回「全按推荐」；agent-kit#119，PR #120 等常浩说「合并」）

## L-65 往页面主世界注入的同一份脚本，两次执行之间没有「只有自己知道」的东西：重新启用、认出自己的句柄都做不到（2026-11-21）

- 现象：#488 第 2 轮审查指出，`data.js` 放在页面上的句柄带一个公开的 `start()`，页面自己就能调它重新开始旁听；再装一份时直接调已有句柄的 `start()`，页面先放一个假句柄就能顶替。原拟「用闭包里的私有 Symbol 认出自己的句柄、文件再次执行时重新启用」，动手时发现做不到。
- 根因：每次执行都是一个新闭包，第一次执行的私有 Symbol 第二次拿不到；写死在文件里的常量，页面用 `Function.prototype.toString` 就能从句柄的函数里读出来。另外，`registerContentScripts` 登记的那份跑出的结果插件后台看不到，只有 `executeScript` 的结果带 `documentId` 和脚本的返回值。
- 正确做法：主世界里的句柄只给停用这种收得回的能力，停用是永久的，没有重新启用的入口（关掉再打开要刷新页面）。脚本发现句柄已经在了一律让开，返回 `present`；可信与否由插件后台按「谁装的」判断：后台用 `executeScript` 补装过的页面按 `documentId` 记下来（`installed` 记晚装、`present` 记冲突），不信页面说的。
- 补充（同日，第 3 轮审查）：可信要靠正面证据，「不在不可信名单里」不算（名单一淘汰、或补装时没拿到 `documentId`，补装页就被当成可信了）。做法：和 `data.js` 同一次登记一份跑在插件隔离环境里的 `mark.js`，它在那里留一个标记；读完再用 `executeScript`（不写 `world`，就是插件的隔离环境，页面和别的扩展都碰不到）按同一个 `documentId` 查标记，有才算可信。第 4 轮审查否掉了先前「比较页面 `performance.timeOrigin` 和后台 `Date.now()`」的做法：前者走单调时钟，后者会随系统校时跳，两者不能当安全边界比较。句柄按固定的属性名取，不经 `Symbol.for`：页面能换掉 `Symbol.for`，换不掉已经放上的不可配置属性。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-20-488-relay-shadow/round3-red.log`（新测试放到第 2 轮受审版本上跑的结果）及同目录 `round3-red-说明.txt`；第 3 轮审查那部分见 `round4-red.log`、`round4-red-说明.txt`。
- 升级：〔提醒〕未升级。

## L-66 改了 Cargo.toml 的依赖没提交 Cargo.lock：本地全绿，干净的 main 上 `--locked` 构建失败（2026-11-21）

- 现象：7a 批 2（#503）给 host 加了工作区内的 `agent-hud-agents` 依赖，只提交了 `Cargo.toml`。合并后删 worktree 时被拒（「contains modified files」），才发现 `Cargo.lock` 多了一行没提交。干净的 main 上 `cargo metadata --locked` 退出码 101；打包走的 `src/tooling/build.mjs` 用 `cargo build --locked`，会断。
- 根因：cargo 在本地构建时自动改写锁文件，`pnpm run check`、`pnpm test` 都在这份改过的工作区里跑，所以全绿；`git add` 时按目录只加了 `src`、`docs`，根目录的 `Cargo.lock` 漏了。
- 正确做法：改了任何 `Cargo.toml` 的依赖，提交前 `git status --short` 看一眼根目录，`Cargo.lock` 一起提交；推送前在干净副本上跑 `cargo metadata --locked --format-version 1 >/dev/null` 确认锁文件是新的。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-21-7a-move-book/locked-before.txt`（修前 `--locked` 的报错），修后同一命令退出码 0。
- 升级：〔提醒〕未升级；再犯一次就加进 `pnpm run check`（跑一次 `cargo metadata --locked`）。

## L-67 窗口一片空白，先别断定「网页进程死了没重载」：Tauri 默认会自动重载，查进程归属要看它跟不跟驿窗一起退出（2026-11-22）

- 现象：侧栏窗口还在屏幕上，截图却全透明，设置窗口正常（#512）。先按「网页进程退出、驿窗没接重载回调」下结论，提出补回调；准备动手时才读到 `tauri-runtime-wry` 在没设回调时默认就会重载，22:09 那次侧栏也确实重载过（新起了网页进程 11622），只是重载后没画出来。中途按启动时间挑「驿窗的」WebKit 进程去杀，挑中的是不是驿窗的，一开始也说不准。
- 根因：只看了项目代码里有没有处理，没看框架的默认行为；WebKit 的辅助进程父进程都是 launchd，`ps`、`sample` 看不出属于哪个应用，读环境变量又会泄露令牌（G-42）。重载后为什么没画出来仍不知道（推断之一：Tauri 默认重载用 `try_borrow` 借窗口表，借不到只记 debug 日志不重载）。
- 正确做法：窗口空白时，先查框架对这件事的默认行为（Tauri 2 看 `tauri-runtime-wry` 的 `with_on_web_content_process_terminate_handler` 一段），再下「没处理」的结论。认 WebKit 进程归属：退出驿窗，跟着消失的那些才是驿窗的；或在重启后的驿窗上杀进程，看是不是同一秒新起一个替身。#512 起，网页进程退出、重载发出或失败都会记进 `postpane.log`，下次先 `grep "Web content" postpane.log`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-22-侧栏不显示/`（空白截图、主进程与网页进程采样、`repro-*`、`repro2-*`、`gpu-*` 三组杀进程后的截图）。
- 升级：〔提醒〕未升级；再出现空白时先看日志里这几行，定位到原因再决定要不要做整窗重建。

## L-68 Chrome 回收或冻结的标签页还留在插件的名单里：往它发消息抛错或一直不答，被记成「不知道送没送到」（2026-11-22）

- 现象：11-21 两次送审、一次补格式回了不带 `pressed` 的 `tab-closed`（其中一次 0.3 秒就回）或 30 秒没答话，驿窗记成送达未确认，两张接力卡了一天，会话重送只得到「刚才已经送到」；另一个会话每 2 分钟重读一次，128 次全是 `unreachable`。同一时段「Claude 2 小时没交回复审」7 次全是误报，一度被当成主要问题。
- 根因：插件 `background.js` 的 `pages` 名单只在标签页被关、导航离开时清。标签页被 Chrome 回收（内存节省）或冻结后既不触发这两个事件，也不再有内容脚本：`chrome.tabs.sendMessage` 抛「Receiving end does not exist」或一直挂着。发送把抛错一律报成「标签页中途没了、可能点过发送」；重读补注入脚本失败（回收的标签页注入不进）后就放弃，不重载。
- 根因更正（11-22 第 2 轮审查返修时在真实 Chromium 156 里实测）：标签页被回收后**编号会换**，触发的是 `chrome.tabs.onReplaced`，不是 `onRemoved`。名单里留下的旧编号不属于任何标签页（`chrome.tabs.get` 报不存在），真正的标签页在新编号下、`discarded: true`。所以「重载名单里那个编号」行不通，要按网址把它找回来。
- 正确做法：往标签页发要紧的话之前先探活（一条立即回答的消息加时限）。不答的只在确定里面没有活页面时才重载（已回收，或注入脚本被 Chrome 直接拒绝）；其余不答的不动它，换一个或另开一个，因为它可能正在写回答（第一版写的是「不答就重载」，审查后改掉）。找到答应显示这个会话的标签页之前什么都没递给页面，可以明确报「没点发送」。给页面的每个提问、每次注入都带时限。查这类「卡住」先对三处：接力卡的步骤、`turns.jsonl` 里那个会话的行、发起会话记录里 `relay_to_chatgpt` 当时返回的原话（原因码只在那里）。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-22-507-tab-revive/`（`red-plugin.log` 是新测试在旧代码上的 5 条失败）；实机记录见 issue #507。
- 升级：〔提醒〕未升级。发送失败的原因码现在只进调用的返回、不进接力卡和日志，下次再查不到就把原因码写进卡片步骤（#434）。

## L-69 浏览器接口的行为按想象写进替身，测试全绿、和真实 Chrome 对不上：回收换编号、名单里的状态没人更新（2026-11-22）

- 现象：#507 两轮审查共 6 条意见，替身测试每一轮都全绿。第 1 轮返修把「重载」限定成只重载名单里那个编号，替身里通过；真实 Chrome 里被回收的标签页已经换了编号，这条路径根本走不到重载，只会另开一个标签页。审查建议用名单里缓存的 `streaming` 判断页面是不是在写回答，查了才发现这个字段只在页面加载、换会话、切前后台时更新，开始写和写完都不刷新。
- 根因：`test/background.test.mjs` 的扩展接口替身是照「我以为 Chrome 会怎样」写的（回收后编号不变、`chrome.tabs.get` 对不存在的标签页返回空值），没有一条测试在真实浏览器里跑插件本身。缓存字段有人存、没人读，也就没人发现它不准。
- 正确做法：
  - 方案依赖浏览器对标签页做了什么（回收、冻结、替换、注入被拒）时，先在真实 Chromium 里加载插件实测，再写替身和实现。现成的做法见 `src/apps/chrome-extension/test/chromium.test.mjs`：Playwright `launchPersistentContext` 加 `--load-extension`，用后台的 `worker.evaluate` 直接调插件自己的函数。
  - 这类测试里顶替 chatgpt.com 不能用 Playwright 的 `context.route`：插件自己用 `chrome.tabs.create` 开的标签页，第一次加载发生在路由生效之前，会真的连到 chatgpt.com。改用本机 HTTPS 服务器加 `--host-resolver-rules=MAP * 127.0.0.1:<端口>`、`--no-proxy-server`（本机有系统代理时不加会被代理接走）、`--ignore-certificate-errors`。
  - 要用一个缓存字段做判断之前，先搜它在哪些时刻被写。存了没人读的字段删掉，不留着等人误用。
  - 无头 Chromium 里造不出真冻结：CDP 的 `Page.setWebLifecycleState` 和 `chrome://discards` 的 Freeze 都没让 `tab.frozen` 变真。冻结相关的结论只能标「未实测」，规则写成不依赖它的具体表现。
  - 判断「标签页里还有没有活页面」用 Chrome 自己的说法，不从报错反推（#507 第 3 轮复审 P1-01）。实测 Chromium 156：页面崩溃后 `tabs.get` 给 `status: "unloaded"`、网址还在、`discarded: false`；停在 Chrome 错误页的标签页不把网址告诉插件；重载途中注入脚本不会被拒，会等新文档。「注入被拒」只说明这一刻注不进去，不能当成可以重载的依据：审查指出预渲染页面顶上来、从缓存恢复时也会被拒（这两种没实测）（`real-chromium/probe-crashed.log`、`probe-error-page.log`）。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-22-507-tab-revive/real-chromium/`（`probe-discard.log` 回收前后的编号和各接口返回，`probe-freeze.log` 两种冻结办法都没生效，`chromium-test.log` 四条真实 Chromium 测试）。
- 升级：〔机检〕已升级（2026-11-22，#507）：加了 `chromium.test.mjs`，随 `pnpm test` 跑；其中第一条断言「回收后编号会换」，Chrome 改了这个行为会在这里先红。可提议提升为全局坑（浏览器插件项目都适用），等常浩批。
- 提升：已提升为全局 G-49（2026-11-24，常浩「全按推荐」；agent-kit#125，PR agent-kit#126 等合并）。

## L-70 通道一启动就收消息，订阅方稍后才挂上：中间到的消息被直接丢掉，「重连时补报」恰好落在这段（2026-11-22）

- 现象：#507 第 5 轮审查指出，驿窗启动时 `ChatGpt::start` 先开 Unix socket 接连接，`Desk::new` 读完接力账本后 `handoff::listen` 才挂上监听；`Shared::tell` 没有监听就直接丢消息。插件一连上就 `resync`，把「这个会话正在写」补报一次，这条正好可能落在中间被丢，驿窗重启后的写作闸就恢复不了。三条全量、所有替身测试都没覆盖到，是审查沿真实初始化顺序读出来的。
- 根因：生产者（插件重连补报）和消费者（接力监听）的就绪顺序没人保证；「没有监听就不交付」写成了「没有监听就丢」。补报机制本身就是为重启设计的，却偏偏只在启动那一瞬发一次。
- 正确做法：
  - 事件通道在订阅方挂上之前收到的消息，按顺序暂存、设上限，订阅时先按序交付再接新的；交付旧消息时持锁，不让新消息插队（`platform/src/clients/chatgpt/listening.rs`）。
  - 写「重连时补报 / 重启后同步」这类逻辑时，顺着真实启动代码走一遍：补报发出那一刻，接收方的每一层（连接、解析、订阅、账本）是不是都已就绪。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-22-507-tab-revive/r6-unit.log`（`listening` 两条测试）；第 5 轮回信 `replies/h1a2026f624206-02-c9f2aa78.md`。
- 升级：〔结构〕已升级（2026-11-22，#507）：通道自带暂存，监听晚挂上也不丢；单测守着顺序和上限。

## L-71 侧栏只亮 4 秒的失败提示，原因不进日志就再也查不到：`open` 跳回链接几乎总返回 0，失败只能出在驿窗自己这边（2026-11-23）

- 现象：常浩截图里提问卡点 ↗ 后出现英文红字「The native client could not open this session」（#517）。事后本机按驿窗同样方式（`/bin/sh -c 'exec /usr/bin/open "$1"'`、标准输出接管道）跑 6 次全成功，假会话 id 也返回 0；`postpane.log` 什么都没有；系统日志里那几分钟只找到一次把链接交给 Claude 的 `open`，而且是成功的。失败那次是没起来、超过 3 秒还是返回码不对，无从判断。
- 根因：`unix::spawn_script` 把所有失败合成一句固定英文，原因（超时、返回码、等不到子进程）在 `map_err(|_| …)` 里丢掉；侧栏提示 4 秒后就消失，没有别处留痕。提示也没走 `l10n::text`。
- 正确做法：侧栏上一闪而过的失败，原因同时用 `note!` 写进 `postpane.log`，`map_err(|_| 固定句子)` 之前先想清楚原因要不要留。查跳回失败：`grep "link did not open" postpane.log`；再用 `log show --predicate 'process == "open"'` 看那一刻有没有 `open` 起来、有没有 `Opening URL`。#517 起失败分「could not start / did not finish within 3s and was ended / exited with … / could not be waited for」几种写进日志。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-23-517-open-reason/`（红测输出、全量测试输出）；排查过程在 #517。
- 升级：〔提醒〕未升级。和 L-67 同属「失败不留痕」，再出现第三次时提议在 `check-rules` 里查 `src/crates` 下面向用户的 `map_err(|_|` 固定句子。

## L-72 判断「一段话送没送进去」只看最新一条提问：常浩在后面插一句，送到了的也被判成没送到；为了读最新内容去刷新活页面，会冲掉他没发的草稿（2026-11-23）

- 现象：#510 第 1 轮 L3 审查指出，`find` 只读会话最新一条提问有没有请求号。送审其实送到了、之后常浩在同一会话里手动问了一句，页面画全、读两次都一样，照样报 `absent`，驿窗把同一段送审再发一遍。同一处为了读到最新内容，只看「没在生成」就重载标签页，常浩输入框里没发的话会丢。替身测试和真实 Chromium 测试都只造了「目标就是最新一条」「页面空闲」两种页面，全绿。另：写页面测试时 `page.evaluate(() => … prompt(7, …))` 里的 `prompt` 在浏览器里是 `window.prompt`，不报错，插进去的是 `null`。
- 根因：把「最新的就是要找的」当成前提，没把用户自己也在用这个会话算进去（#507 的写作闸其实已经考虑过他会插话）；「判没有」比「判有」需要更强的证据，却用了同一套读法。刷新页面是一种新的动作授权，不能沿用「失效页面可以刷新」的结论。
- 正确做法：
  - 找一段话在不在，读会话里全部提问，按开头那一行精确匹配；判「不在」另要锚点证明历史读到了这段之前（上一轮已知送到的提问编号），锚点之后有读不到文字的提问就说不清；两条都匹配也说不清。
  - 「读得到」要按内容算，不按节点在不在算（第 2 轮 P1-01）：还没画出来的提问（没有气泡、气泡是空的）同样可能就是要找的那段，不能先过滤掉再判「不在」。
  - 刷新用户可能正在用的页面，检查和刷新放在页面里同一步做（`content.js` 的 `reload`）：没在生成、没草稿、没在改旧提问才刷新。草稿不只是输入框里的字（第 2 轮 P1-03）：待发的文件、图片看不到长什么样，就用「输入框空着、发送键却亮着」这个已在真实页面用过的信号（`submit`，#429），不去猜附件预览的 DOM。
  - 测试里传给浏览器的 HTML 在 Node 侧拼好再当参数传，不在 `evaluate` 的函数体里引用 Node 侧的辅助函数。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-22-509-unsure-resolve/`（`r1-red-host.log`、`r1-red-plugin.log`、`r1-red-chromium.log`）；回信 `replies/h1a207e54d6608-01-b7c08122.md`。
- 升级：〔结构〕已升级（2026-11-23，#509）：`PostPanePage.marked` 读全部提问并要锚点，`reload` 由页面自己判断；真实 Chromium 测试守着「后面又有一条提问」「有草稿」两种页面。

## L-73 被测代码的计时器都 `unref`，测试却在等只有这些计时器才会带来的结果：没有别的东西撑着事件循环，Node 提前结束文件，测试被取消（2026-11-23）

- 现象：#510 第 2 轮返修跑全量时，「插件」一套在第 7～14 条报 `Promise resolution is still pending but the event loop has already resolved`（`cancelledByParent`），main `69f358a` 上一样，之后每次都这样；同一天早些时候全过，被测代码和 Node 版本都没变。
- 根因：DeepSeek 插件的轮询计时器按设计 `unref`（宿主里不该被它们吊着不退出）。测试写完回答文件就 `await` 结果，而结果只有那个 `unref` 的轮询会带来；事件循环里没有别的 ref 句柄，Node 认为无事可做直接结束。之前能过，靠的是碰巧还有别的句柄没结束，属于时序巧合。
- 正确做法：测试 `unref` 计时器驱动的逻辑时，测试自己挂一个 ref 的保活计时器，在 `t.after` 里清掉（`deepseek_plugin/agent-hud.test.mjs` 的 `setup`）。看到 `cancelledByParent` 加这句报错，先查被等的结果是不是只靠 `unref` 的句柄推进。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-22-509-unsure-resolve/`（`r2-rerun-plugins-*.log` 修前 3 次失败，`r2-fix-plugins-*.log` 修后 3 次 14 条全过）。
- 升级：〔文字〕未升级：只出现过一次，记在这里。

## L-74 修复合并了、没装上：功能分支 17:00 打的包，盖不住 18:00 之后合并的 7 个接力修复，跑了 30 多个小时没人发现（2026-11-27）

- 现象：#539 第 4 轮送审（11-26 11:52）之后，驿窗每 2 分钟重读一次 ChatGPT，过夜 223 次，卡上没有新说法；按 11-25 合并的 #433 本该 5 次就停。核对已装应用：二进制是 11-25 17:00 从 `claude/motion-polish`（#539，未合并）打的包，搜得到 #524、#528 的提示文字，搜不到 #433「已停止自动重读」、#431「提问读不到」；11-25 18:01–18:20 合并的 #518、#526、#434、#433、#443、#431、#432 全都没装。`postpane.log` 里「插件 0.2.11、应用按 0.2.8 打包」那一行也一直挂着。
- 根因：一批 PR 在功能分支装机之后才合并，合并的会话打了包（`2026-11-25-merge-batch/build.log` 18:32）但没装；之后谁也没从 main 重装。没有任何地方比对「已装的包含不含 main 上的修复」，版本不一致只记一行日志。
- 正确做法：查「修了还在犯」先确认修复在不在已装的包里：在 `/Applications/PostPane.app/Contents/MacOS/PostPane` 里搜那次修复新加的提示文字（中文串直接按 UTF-8 字节搜），比打包时间更可靠。一批合并的最后一个会话负责从 main（或已含最新 main 的分支）装机回读，交接里写装的提交号。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-relay-fixes-install/`（装前备份 `PostPane-1bce2b00156a.app`，装后二进制检索结果写在 #544 问题清单第 1 条）。
- 升级：〔提醒〕未升级。#544-6 每日自检会比对已装版本落后 main 几个接力修复，做完改〔机检〕。

## L-75 驿窗从图形界面启动、环境里没有代理变量，它启动的 claude 直连 Anthropic 被拒（403），登录续不上，Claude 额度和卡上暗印跟着消失（2026-11-28）

- 现象：11-27 一天里本机 Claude Code 命令行登录掉了 6 次（`postpane.log` 00:25、11:18、14:42、20:41、23:48，11-28 00:29 都是接力回信唤醒报 `OAuth session expired and could not be refreshed`）。每次掉线，驿窗的 Claude 额度变成「过期」，卡上的周额度暗印（#319）和票根数字按设计不再显示；有待处理时卡上不放额度区块，「已退出登录」的提示也看不到，看上去像暗印被改坏了。常浩在终端重登，浏览器显示授权成功，终端却报 `OAuth error: Request failed with status code 403`。
- 根因：本机直连 api.anthropic.com、platform.claude.com 一律 403（IPv4、IPv6 都是，`curl --noproxy '*'`），经本机代理 127.0.0.1:8086 才通。`claude` 只认环境变量里的代理、不认 Mac 系统代理；驿窗自己的 HTTP 走系统代理（连接都落在 8086），可它从程序坞或登录项启动时环境里没有代理变量，启动的 claude（读额度引擎、接力回信唤醒、开新会话）全部直连。登录凭据隔几小时要续期，由正在跑的 claude 去续，碰上不带代理的那个就失败。和全局坑里 11-14 数字分身那条（交互终端缺代理）是同一类，第二次出现。
- 正确做法：驿窗启动时环境里没有任何代理变量、系统代理开着，就把系统代理写进自己的环境（`HTTPS_PROXY`/`HTTP_PROXY` 大小写两套，`NO_PROXY` 留本机地址），之后启动的子程序都继承（`platform/src/child_proxy.rs`，#567）；启动日志写一行 `Programs started from here go through the system proxy …`。判断「登好了」以 `claude auth status` 为 `loggedIn: true` 为准，不以浏览器页面为准；在桌面应用的 Bash 里验证要用 `env -i HOME=$HOME USER=$USER PATH=…` 去掉桌面应用的变量。终端一侧由 `~/.zshrc` 的 `claude` 包装函数自动带系统代理（不进仓库）。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-28-567-child-proxy/`（`red.txt` `green.txt` `check.txt` `test.txt`，隔离启动日志在 `sandbox-home/`，`zshrc.before` 为改前备份）。
- 升级：〔结构〕已升级（2026-11-28，#567）：驿窗启动时统一补系统代理，所有子程序继承，不再逐处带。可提议提升为全局坑：并进全局坑 11-14 那条，补「图形界面应用启动的命令行工具」这一面。

## L-76 换底后整份提交，把别人刚合并的改动当成自己的删除带进 PR，squash 合并后已验收的功能整段消失（2026-11-28）

- 现象：#566（同一会话的回复只占一行，常浩 11-28 验收并合并，`1ac0ab1`）合并 9 分钟后，#568（子程序继承系统代理）squash 合并进 main（`7575cf9`），#566 改的 6 个文件原样回到 #566 之前，DECIDED 里那一行、CURRENT 里那一节也没了。之后在 main 上合的包都没有去重，侧栏同一会话又出现好几行。没有任何测试失败：被退回的测试也一起退回了。
- 根因（#567 会话查实）：分支从 `bdcbc19` 开出，提交前为了把 WIP 压成一个提交跑了 `git reset --soft origin/main`。几个 worktree 共用远端引用，origin/main 已被别的会话 fetch 到 `1ac0ab1`；soft reset 只挪了 HEAD，索引和工作区还是 `bdcbc19` 加自己的改动，于是提交 `99296b6` 的父提交是 `1ac0ab1`、内容却是 #566 之前的样子，在 git 看来就是「删掉 #566 的改动」，合并不冲突。合并前查的是 `git log 分支..origin/main`（为空），盖住了问题；PR 的文件列表没逐个核对。
- 正确做法：推送、开 PR、合并前都看一眼 `git diff --stat origin/main...HEAD`，列出的文件必须都是自己这张 issue 的；出现不相干的文件（尤其是刚合并的别的 PR 的文件）就停下，从 `origin/main` 重新拉分支、只 cherry-pick 自己的提交。换底用 `git rebase origin/main` 或 `git merge origin/main`，不用 `reset --soft` 再整份提交。合并包、装机前核对一下已验收的功能还在（如本条用 `git show <提交>:<文件> | grep` 查关键函数）。
- 证据：`git show --stat 99296b6`（含 6 个 hud 文件和 DECIDED、CURRENT）；`git diff bdcbc19 7575cf9 -- <6 个文件>` 为空。
- 升级：〔提醒〕未升级。可做成〔机检〕：推送前钩子比对本分支改到的文件和 merge-base 之后 main 上别的提交改过的文件，有重叠且是「改回旧内容」就拒绝推送；先出提案等常浩定。

## L-77 三版预览里的「现状」是凭印象复刻的：真实代码早有信纸飞进信封、信封连续变形成飞机，复刻版却画成淡入淡出替换，常浩拿它当参照挑方案（2026-11-28）

- 现象：#570 出接力动画三版预览时，为了对比，在预览页里手写了一块「现状」画板。写的时候只看了实机截图和故事注释，没读 `FlightLayer` 的画法，把「信封淡出、飞机淡入」「信纸凭空在信封里」当成现状；开工实现时才发现真实代码一直是 6 点裁切连续变形，信纸也是从发信方飞进信封的。常浩两轮都是拿这块不准的「现状」做参照，觉得「不好看」「把折信封做没了」。
- 根因：预览页的「现状」是另写的替身，不是真实组件；替身画得比真实的差，新方案就显得更好，比较失真。
- 正确做法：预览页里要放「现状」做参照时，用真实组件截出来（场景预览台 `pnpm --filter @agent-hud/hud run scenes`，飞行有「飞：送审 / 回信 / 送不出去」三个按钮，暂停在指定时刻：`[...document.querySelectorAll('.hud-flight *')].flatMap(e => e.getAnimations()).forEach(a => { a.pause(); a.currentTime = T })`），或者先读真实画法再复刻，并在页面上写明「按代码复刻、哪里有出入」。凭印象复刻的不放进对比。
- 证据：`docs/design/接力动画三版预览-2026-11-28.html` 的「现状」画板；真实画法见 `src/packages/hud/src/scene/flight-plan.ts` 改前的 `story()`（`shape` 关键帧 ENVELOPE→PLANE、`letter` 从 `from` 飞到 `start`）。
- 升级：〔文字〕本条。场景预览台已能触发真实飞行（#570），之后做飞行相关预览直接截真实组件。

## L-80 规范读过、预览自查做过，类型签还是放进了图标列：规范只写了「两条线」，没写每种元素只能在哪一列，例外又把「章」放进了图标列（2026-11-28）

- 现象：常浩要求积压事项的「等你」改成 WAIT、「跟之前的 start reply ask 同层级」。出规范版的会话读过 `docs/design/卡片版式规范.md`，还是让 WAIT 顶替「等你」章的位置进了图标列（行第一列改成 `auto`），和 Claude 小人、在跑方点同级；预览里手写 CSS，自查只量了按钮和文字的间距。常浩在一批 7 项里批了它，做进 #564 后才指出。同一轮还有：侧栏小签 REPLY 黄、面板里蓝（小签自己传了颜色）；按钮「继续 / 不做了」和签长得像、字数不齐。
- 根因：① 规范只规定「两条左对齐线」，没规定「哪种元素只能放哪一列」；WAIT 放在图标线上也算「对齐」。② 例外「章留在图标列」没说章是什么，`ApprovalTag` 既画章又画类型签，换个字就从章变成了签。③ 「组件引用 GRID，不另写数字」「签的颜色一处取」只写成文字，没有机检，代码里已有 16 处违反没人发现。④ 全局基础规范 `ui-system/docs/design-spec/DESIGN.md` 没有任何入口指向它（全局指令、AGENTS.md、postpane-round 都没提），做驿窗界面的会话不会读到。⑤ 预览手写排法，不照真实组件，错先出在预览里，批的人在一大批改动里看不出单项位置。
- 正确做法：规范按「每种元素放在哪」写成表（图标、章、类型签、标题小字、按钮各只能在哪），配正反例；新加一种「等你处理的事」的行，照已有 ASK、REPLY 行排，并排放在预览里比；交付前 `pnpm run check` 的 `check:card-layout` 会拦类型签进图标列、缩进写死数字、签自己挑颜色；机检查不了的（签的左边是否在文字线、签和按钮分不分得开、并排字数）在场景预览台手量。
- 证据：常浩原话在会话 `f257c206`（11-28 04:17「它应该是跟之前的 start reply ask 同层级」、04:20「同一个组件在不同的场景下它应该是一致的」）和 `a409fbef`（05:11「它变成了跟侧边的这个 Claude 的图标……成了一个层级了」）；规范版 `docs/design/侧栏等待处理与积压事项规范版-2026-11-28.html`（主目录，未进仓库）第 70 行 `.brow{grid-template-columns:auto …}`；`tests/check-card-layout.test.mjs` 第一条用 #564 分支 `f8cebde` 原样摘出的写法跑出失败。
- 升级：〔机检〕已升级（2026-11-28，本条所在 PR）：`src/tooling/check-card-layout.mjs` 接进 `pnpm run check`，旧问题记在 `card-layout-baseline.json` 只许变少。签的左边是否正好在文字线、签和按钮分不分得开、并排字数仍只靠规范文字和手量。
## L-78 想用 Claude in Chrome 造「后台标签页 / 窗口不在屏幕上」验 ChatGPT 页面：它自己的标签页一直是 `visible`，造不出来（2026-11-27）

- 现象：#544 第 3 步要看清「空占位」和「后台没画出」在真实页面上的区别，在 Claude in Chrome 自己的标签组里开两个 chatgpt.com 标签页，前一个、后一个、刚新建的，`document.visibilityState` 全是 `visible`；让后台那个重新加载也一样。#457（2026-11-20）当时也是两次没造出来。
- 根因：Claude in Chrome 操作的标签页按可见处理（调试接管时页面不进入隐藏状态），ChatGPT 照常画，「后台不画」这种状态在它手里出不来。
- 正确做法：后台标签页、窗口被挡住这类页面状态，不靠 Claude in Chrome 现造：用真实接力留下的 `turns.jsonl`（`phase: "reread"` 那行的 `hidden`、`fronted`、`outcome`）取证，或请常浩把插件开的那个标签页留在后台时，只读看那一刻的结构。试两次没造出来就停，不再换花样试。只能在真实状态下才分得清的判定（如空占位 vs 没画出），没看到真实样子之前不改代码。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-544-placeholder-probe/real-page-hidden-vs-drawn.md`；#457 证据 `evidence/2026-11-20-457-reread-undrawn/pr-body.md`「实机未做」一条。
- 升级：〔提醒〕未升级。

## L-81 按会话编号去重做完、场景和测试都过，实机侧栏还是一个任务出好几行：重复的是主会话派出的子任务，各有自己的编号（2026-11-28）

- 现象：#565/#569 让 REPLY 按「来源 + 会话编号」每个会话只留一行，测试和场景预览台都过，常浩 11-28 验收后合并。当天上午侧栏又出现 4 行以上「你在做一个 skill 的盲测执行方……」（#578）。
- 根因：这些行是主会话 `b633847f` 派出的子任务（Claude 的 `subagents/agent-…jsonl`），每个子任务的会话编号不同，只是标题一样；会话数据里带着 `parentId`，但生成回复的 `island_events/turns.rs` `ended()` 没看它。修 #565 时只看了常浩截图里的标题，没拿实机快照（`hud_snapshot` 的 `islandEvents`）核对重复行的 `sessionId`，场景也只造了「同一编号回两次」。
- 正确做法：侧栏「单位是单一任务会话」，带 `parentId` 的子任务不单独出回复和失败提醒（`ended()` 已过滤）。查「同一个东西出现好几次」先从实机快照取出那几行的编号和父编号，再决定按什么去重；造场景时把「标题相同、编号不同」和「子任务」各造一个。
- 证据：快照 `islandEvents.items` 里 9:29–9:53 的 completion 行 `sessionId` 为 `agent-a7350e0a…`、`agent-a96fb22c…`、`agent-a033c91c…`、`agent-ad83d7d9…` 等，`sessions` 里对应 `parentId` 都是 `b633847f-c6e5-47dd-ae61-0d8c9ac92606`；测试 `island_events::turns::tests::a_subagent_that_answers_or_fails_is_not_a_line_of_its_own`。
- 升级：〔机检〕已升级（2026-11-28，#578 的 PR）：测试 `a_subagent_that_answers_or_fails_is_not_a_line_of_its_own` 守住子任务不出行；「先拿实机编号再定去重」只靠本条提醒。

## L-82 插件后台是普通脚本，新加的函数和已有的同名，后一个悄悄顶掉前一个，不报错（2026-11-27）

- 现象：#542 第 5 轮返修给后台加了 `sending(text)`，文件里已有 `sending(conversation)`（送话途中记账用）。脚本照常加载，`send` 调到的却是新函数，按文字认提问的几条测试一直不过，换了几种写法都以为是逻辑问题。
- 根因：`background.js` 是 Chrome 插件的普通脚本（不是模块），同名的 `function` 声明后者覆盖前者，没有任何报错；文件近 1900 行，起名前没搜。
- 正确做法：在插件后台新加函数前先 `grep -n "function 名字"`。`test/background.test.mjs` 的「no two functions of the worker share a name」会查顶层同名函数。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-26-542-close-tabs/round6/`。
- 升级：〔机检〕测试已加。

## L-83 shell 脚本里 `$变量` 后面紧跟中文，macOS 自带 bash 3.2 在 UTF-8 语言环境下把中文字节当成变量名，`set -u` 下装机脚本直接退出（2026-11-28）

- 现象：#542 第 9 轮跑 `node --test tests/*.test.mjs`，装机脚本和备环境脚本的 14 条测试一起失败，报 `OLD�: unbound variable`、`CARGO_TARGET_DIR�: unbound variable`。前几轮同样的测试都过。
- 根因：`install.sh` 第 91 行 `echo "装前 $OLD，已备份到 …"`，`$OLD` 后面直接是中文逗号。`/bin/bash` 3.2 在 `LANG` 是任何 UTF-8 语言（`en_US.UTF-8`、`zh_CN.UTF-8`、`C.UTF-8`）时，把中文的字节也算进变量名，变量名成了 `OLD�`，`set -u` 下没定义就整段退出；`LANG` 没设（C）时才不出事。前几轮跑测试的环境没设 `LANG`，这一轮的会话环境是 `LANG=C.UTF-8`。常浩的终端若是 UTF-8 语言，照着 skill 装机会停在备份之后、退出应用之前。全仓库搜到 4 处（`install.sh` 两处、`install-guard.sh`、`setup-worktree.sh`）。
- 正确做法：变量后面紧跟非 ASCII 字符时一律写 `${变量}`。验证：`LANG=en_US.UTF-8 bash -c 'set -u; OLD=x; echo "$OLD，"'` 报错，换成 `${OLD}，` 就好。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-26-542-close-tabs/round9/`（`node.log` 改前 14 条失败，`red-check-rules.log` 新检查在改前脚本上抓到 4 处）。
- 升级：〔机检〕已升级（2026-11-28，#543）：`scripts/check-rules.mjs` 的 `shell` 一条扫 `scripts/`、`.agents/skills/` 下的 shell 脚本。可提议提升为全局坑（和 G-08 同属 `set -u` 一类）。

## L-84 客户端升级后把本地服务的令牌从启动参数挪进发现文件，驿窗只看启动参数，整家报「没有正在运行的服务」（2026-11-27）

- 现象：Antigravity 桌面版 2.35.2 开着、没有 `agy` 进程时，经驿窗 `start_session`（client antigravity）、`send_message` 发 Antigravity 都被拒：「没有已登录且正在运行的 Antigravity 服务」；`agy` 命令行跑着时又能认出。
- 根因：`clients/antigravity` 的发现只从 language_server 启动参数读 `--csrf_token` / `--extension_server_port`。2.35.2 桌面版改成 `--subclient_type hub --https_server_port 0 --read_host_bridge_token_from_stdin`，参数里没有令牌，进程被整个跳过；新版把端口和令牌写在 `~/.gemini/antigravity/daemon/hub_<httpPort>.json`（0600，`pid`、`httpsPort`、`httpPort`、`csrfToken`）。不带令牌直接调，服务回 `401 missing CSRF token`。
- 正确做法：接本机客户端的本地服务，启动参数和客户端自己写的发现文件都要认；发现文件只在它写的 pid 对上一个正在运行、认得出的服务进程时才算，过期文件不认；文件里写的端口必须是那个进程正在监听的（`listening_ports(pid)`），否则文件就不只是给令牌、而是在决定驿窗信任谁（#560 审查 P1-01）。发现文件的位置跟会话记录用同一套（认 `GEMINI_CLI_HOME`）。客户端升级后某家突然「没在运行」，先 `ps -o command= -p <pid>` 看参数里还有没有令牌，再看它的数据目录下有没有 `daemon/` 这类发现文件；只打印字段名和长度，不打印令牌。
- 同类：搜了 `csrf_token`、`extension_server_port`、「没有已登录且正在运行」，令牌读取只此一处（已改）。另见 `delivery/antigravity/mod.rs` 的 `call`：按 `"no running Antigravity service"` 判「不可用」，和实际报错文字对不上，所以 `start_antigravity` 的 `agy -p` 兜底从移植起就没走到过；改它会让没开桌面版时改由命令行无头开会话，属行为变化，本轮没改，记为范围外发现。2026-11-28 常浩定修，见 L-92（#586）。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub/`（`red.txt` 新测试在旧逻辑上失败、`green.txt`、全量测试输出、实机记录）。
- 升级：〔提醒〕部分升级（2026-11-27，#558）：`running.rs` 新版启动参数与发现文件夹具测试、`daemon.rs` 发现文件测试，未接进必经检查。

## L-85 同一轮在两处各有一套编号规则：完成事件按回复那一步编号、会话记录按提问那一步编号，get_message 永远判不出 Antigravity 这轮结束（2026-11-27）

- 现象：#558 修好发现后，经驿窗 `start_session` 新开的 Antigravity 会话 3 秒内就回了「驿窗 558 已收到」，侧栏显示空闲、`hud_session` 的 liveFacts 有 `endedAt` 和 `outcome: completed`，`get_message` 却一直是 `started`、`answer: null`。
- 根因：Stop 钩子的 `antigravity/hooks.rs` `enrich` 把完成事件的 `turnId` 写成 `step-<PLANNER_RESPONSE 的 step_index>`（这次是 `step-1`）；会话记录的 `transcript::TURNS` 按开启这一轮的 `USER_INPUT` 编号（`step-0`）。messaging 的 `stored::answer` 用 liveFacts 的 `turnId` 认「这是最新一轮」，对不上就只能等下一轮开始才算结束。从上游移植起（`04a6f2f`）就这样，和桌面版新旧无关。
- 正确做法：同一个概念（这里是「一轮」）的编号只按一处规则来，另一处照它推导；改完成事件、钩子补字段这类代码时，拿会话记录那边的测试数据（messaging 测试里 `turnId: step-5`、回复 `step-8:text`）对一遍。验证「能读到回复」要看 `get_message` 变成 `done`，看到侧栏空闲、回复写进记录不算。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub/`（`red-hooks.txt` 旧逻辑 `left: "step-1" right: "step-0"`、`green-hooks.txt`、实机前后两次 `get_message`）。
- 升级：〔提醒〕部分升级（2026-11-27，#558）：`antigravity::hooks::tests` 两条，未接进必经检查。

## L-86 同一个会话两种 id 写法：start 回执记裸 UUID、快照和会话页认 `antigravity:<uuid>`，按记下的 id 去查就「找不到会话」（2026-11-27）

- 现象：L-85 修好后，liveFacts 的 `turnId` 已经对上，`get_message` 仍停在 `started`；`hud_session` 用裸 UUID 查回「Session was not found; refresh first」，带 `antigravity:` 前缀才查得到。
- 根因：`start_session` 的回执用 Antigravity 返回的裸 cascade id 记收件会话；驿窗快照、`session_detail` 给 Antigravity、DeepSeek Harness 的 id 前面加了客户端前缀。`send_message` 发出前已经换成快照 id（`send.rs` 的 `target["id"]`），start 没换；`snapshot::find` 两种写法都认，所以列表、状态看着都正常，只有按 id 查会话页那一步落空。messaging 测试里 `ANTIGRAVITY` 是裸 id，快照里也是裸的，测不出来。
- 正确做法：按 id 去查别的接口之前，先经快照换成快照里的那个 id（`transcript::page_id`）；测试夹具里 Antigravity 的快照 id 要带 `antigravity:` 前缀，和真实快照一致。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub/`（`red-bare-id.txt` 旧逻辑停在 `queued`、`green-bare-id.txt`、实机第三次 `get_message`）。
- 升级：〔提醒〕部分升级（2026-11-27，#558）：messaging 测试 `an_antigravity_start_named_by_its_bare_id_is_read_under_the_snapshots_id`，未接进必经检查。

## L-87 显示偏好挡住了业务判断：侧栏「实时状态」关着的那家，快照里没有 liveFacts，get_message 永远判不出这一轮结束（2026-11-27）

- 现象：L-85、L-86 修好后，日志里那条消息已经认出所在的轮次（`turn: step-0`、指纹对），`get_message` 仍停在 `started`；`hud_session` 的 `session.liveFacts` 有 `endedAt`，`hud_snapshot` 里同一个会话的 `liveFacts` 却是 null。
- 根因：`hud/src/presentation.rs` 在某家 `sources.<家>.live == false`（设置 →「智能体」→「实时状态：在侧栏上显示运行和等待中的会话」）时，从快照里删掉它的 liveFacts、状态记成 idle。messaging 的 `paged::answer` 只看快照的 liveFacts。本机 `presentation.json` 里 Antigravity 是 `live: false`：`apply_live_status_defaults` 在它第一次出现、还没检测到时存成了关，之后检测到也不会改（只有 `DETECTED_LATE` 里的 ChatGPT 会补开一次）。#554 实机「只看到打盹」很可能也是这个原因（未核实）。
- 正确做法：业务判断（消息有没有被答完）不读经过显示偏好过滤的数据；快照里没有时，用会话页 `session_detail` 自带的 `session.liveFacts`。改显示偏好的过滤时，搜一遍谁还在读快照里的这个字段。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub/`（`red-live-off.txt`、`green-live-off.txt`、实机第四次 `get_message`）。
- 升级：〔提醒〕部分升级（2026-11-27，#558）：messaging 测试 `a_turn_whose_client_shows_no_live_status_ends_by_the_facts_its_pages_carry`，未接进必经检查。`stored::answer` 同样只看快照，驿窗没接会话存储所以没改，接的时候要一起改。Antigravity 实时状态默认关、要不要像 ChatGPT 一样检测到后补开一次：2026-11-28 常浩定打开，Antigravity 加进 `DETECTED_LATE`（#586）。

## L-88 Antigravity 的 `transcript.jsonl` 会截断长字段，完整内容在旁边的 `transcript_full.jsonl`；用短消息验收测不出（2026-11-27）

- 现象：#560 用短消息验收全过；多模型协同会话经 `start_session` 发了约 1.9 万字节的送审包（`m-fa3b7d6821af`），Gemini 21:48 已写完回复，`get_message` 却一直 `started`、`answer: null`。
- 根因：Antigravity 写 `transcript.jsonl` 时把长字段截短：这一行带 `truncated_fields: ["content", …]`，正文只留头尾，中间换成一行 `<truncated N bytes>`；完整的同一步（同一个 `step_index`）写在同目录的 `transcript_full.jsonl`。驿窗只读 `transcript.jsonl`。以常浩身份发送的消息按全文指纹认（`PromptForm::Own`），截断后的提问指纹对不上，找不到这一轮；就算找到了，回复也是截断的，不是「整段回复」。
- 正确做法：会话页读到带 `truncated_fields` 的 Antigravity 行时，按 `step_index` 去 `transcript_full.jsonl` 取整条（`core/clients/antigravity_whole.rs`，按文件长度和修改时间缓存一份步号→偏移的索引）。用量和实时状态仍读 `transcript.jsonl`：用量账本按「来源文件 + 事件键」做主键，换来源文件可能把历史用量算两遍，所以没有整体改读完整版。凡是「把回复交给别人」的功能，验收要带一条长消息和一条长回复。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub/r6/`（会话 `f2e8fb04`：`transcript.jsonl` 提问 1939 字、回复 1789 字，`transcript_full.jsonl` 提问 8426 字、回复 17370 字；修后 `get_message` 的结果）。
- 升级：〔提醒〕部分升级（2026-11-27，#560）：`antigravity_whole` 两条测试，未接进必经检查。

## L-89 想让一个值滑过去，它的规则却带 `!important`：重要声明在层叠里压过过渡，值一下就跳到终点（2026-11-25）

- 现象：动效统一第 6 处，设置页开关改成「墨块滑过去」，`background-position` 也写了 `transition`，计算样式里过渡属性和时长都对，逐帧读值却从 100% 一帧跳到 0，没有中间值。
- 根因：CSS 层叠里，过渡产生的值排在所有普通声明之上、所有 `!important` 声明之下。开关原来用 `background: … !important` 压 Tailwind 的 `bg-primary`，简写顺带把 `background-position` 也设成了重要声明；勾选态那条也带 `!important`。过渡值赢不了它们，所以不动。
- 正确做法：要做过渡的那个属性不写 `!important`，也别让带 `!important` 的简写（`background`、`transition`、`transform` 等）顺带设到它；需要压别人的，只给真正冲突的长写属性加（这里是 `background-color`、`background-image`）。验证时在页面里逐帧读 `getComputedStyle` 或看 `el.getAnimations()` 里有没有这条过渡，别只看计算样式里的 `transition-*`。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-25-motion-polish/settings/`（`switch.mjs` 两次输出：改前一帧跳到 0；改后 100% → 48% → 20% → … → 0，约 120ms）。
- 升级：〔文字〕未升级：只出现过一次，记在这里。

## L-90 Claude 桌面会话间转达的消息标了 isMeta，「这一轮谁开的头」把它跳过，认成了上一轮常浩自己打的字（2026-11-19；2026-11-28 两次变基撞号，由 L-59 改号为 L-90）

- 现象：#439 装机实测 `relay_end`，本会话这一轮是别的 Claude 会话转达常浩批量答复开的头，按设计应整批拒收，结果核实通过、结束了 0B-4b 那张接力（它本来就在要结束的名单里，结果无害）。
- 根因：`claude_plugin/opener.rs` 的 `current_turn` 往回找「这一轮的第一条用户消息」时只认 `claude_prompt`，而它排除 `isMeta`。Claude 桌面的会话间转达那一行是 `isMeta: true`、`origin.kind: "peer"`，被当成非提问跳过，往回落到常浩上一轮自己打的字（`origin.kind: "human"`），于是判成 `Opener::Person`。任务通知那一行不带 `isMeta`，所以原测试里「认不出」一直是绿的，没发现。同样影响 #258 插话重算和到上限后续审的授权（`extra`），只是那两处还比对时间、要晚于最近一次转回，暴露得少。
- 正确做法：判断一轮由谁开头时，凡是 Claude Code 写了 `origin` 的用户行都算这一轮的开头（再按 `origin.kind` 判：`human` 是本人，驿窗插件的按插件判，其余一律认不出），不能只用「像不像用户提问」的过滤；新的开头来源要先在本机会话记录里数一遍各种 `origin` 和 `isMeta` 的组合，再写测试。
- 证据：`evidence/2026-11-19-439-relay-end/`：`live-end-refused.txt`（本该拒收却结束了）、`red-peer.txt`（补的测试在旧代码上失败：`left: Some((Person, …))`）。
- 升级：〔机检〕已升级（2026-11-20，#439）：`claude_plugin/tests.rs` 的 `the_current_turn_is_begun_by_the_person_or_by_the_plugin` 加了会话间转达开头的一轮。

## L-91 几个会话各自在 worktree 里同时跑全量测试和打包，负载 211，计时测试成片误报、反复重跑（2026-11-28）

- 现象：11-28 中午 7 个开着的 PR 各有一个会话在推，同一时刻 4 份 `pnpm test`、3 次 `tauri build`、1 次 `setup-worktree`（编引擎 release）在跑，10 核机器平均负载 211、磁盘剩 9 GB。core 的 `the_next_pass_is_due…`、Chrome 插件真浏览器、MCP 的计时测试每份都挂几条、每次挂的不一样（L-47），各会话又整套重跑，越跑越挤；#539 一轮重跑了三次没跑通。另有一份打了 40 分钟的过期合并包，打完会被它的会话装上去，把实机退回旧版。
- 根因：装机有锁（L-05），全量测试和打包没有：每个 worktree 各起各的，谁也不知道别人在跑。L-47 只写了「别把测试和打包放进同一条命令」，管不到不同会话之间。
- 正确做法：重活排队。`pnpm test`（`src/tooling/test-all.mjs`）和打包生成资源那一步（`src/tooling/package-resources.mjs`，`tauri build` 和 `setup-worktree.sh` 都经过它）开跑前先在 `~/Library/Application Support/postpane/heavy-queue/` 占位，别人占着就排队、每分钟说一次在等谁，跑完放手；打包时位子占到整个 `tauri build` 进程结束；占位进程不在了就直接接手；占位的是自己的上级就不排。实测 11-28 那次是由主目录会话按顺序叫号解开的，负载降到 6，6 个 PR 约两小时内合完。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-28-heavy-queue/`：`red.txt`（新测试在改前失败）、`green.txt`、`real-wait.txt`（全量测试占位时另起一份，打印「排队：全量测试（main-install，进程 3515…）」并一直等）。
- 升级：〔提醒〕部分升级（2026-11-28）：排队写进 `test-all.mjs`、`package-resources.mjs`，测试 `tests/heavy-queue.test.mjs`；单独跑的 `cargo test`、`cargo build` 不经过它，不算必经检查。

## L-92 按自家报错的文字判断错误类型，文字一改兜底就永远走不到；兜底又按同步跑完设计，60 秒掐断、读错字段，三处都没被测到（2026-11-28）

- 现象：Antigravity 桌面版没开时，经驿窗开 Antigravity 会话直接报「没有已登录且正在运行的 Antigravity 服务」，`agy` 命令行装着也不用。`start_antigravity` 写了 `agy -p` 兜底，从移植起一次都没走到过。
- 根因：四处叠在一起。① `delivery/antigravity/mod.rs` 的 `call` 用 `error.contains("no running Antigravity service")` 判「不可用」，而 `service::call` 实际报的是本地化文字「没有已登录且正在运行的 Antigravity 服务」/ "No authenticated already-running…"，永远对不上，全判成「被拒」。② 就算走到，兜底用 `agy -p … --output-format json` 同步等整轮做完，60 秒一到就杀进程，稍长的任务必然被打断、报「不确定」。③ 读会话编号找的是 `session_id` / `sessionId` / `cascadeId`，agy 1.5.18 的字段是 `conversation_id`。④ agy 没登录时先在 stderr 打登录链接、等约 60 秒登录超时才退出 1，只报一句 "refused"。测试替身只测了有桌面版的那条路（G-34）。
- 正确做法：错误类型用类型表达，不用文字：`service::call` 返回 `CallError::{Unavailable, Refused}`，「一个服务都没找到」才是 Unavailable，找到了但它拒绝是 Refused。让命令行替代后台服务时，按它的流式输出拿编号就返回，进程留着把这一轮做完（`agy -p … --output-format stream-json`，输出写进 `~/.agenthud/agy-starts/<请求>.ndjson`，20 秒内认出 `conversation_id` 就回 started），看到要登录就停掉进程、直接说要登录。兜底只能接在「确定没执行」之后：写操作（开会话、发消息）的失败分三种，连不上（没发出去）、服务回 4xx（动手前就拒了，408 / 409 / 499 除外）、其余（发出去后断了、超时、5xx、回的读不懂：结果不明）；前两种可以换下一个服务，只有「一个都没连上」才能改用命令行；结果不明报「不确定」，不重发（#592 审查 AGY586-P1-01，`service/once.rs` 的 `call_once`）。「没拿到成功证据」不等于「确定没执行」：命令行没报出会话编号就退出、报错或 10 分钟没动静，都记「不确定」，只有登录提示（出现在建会话之前）才算被拒（AGY586-P1-03）。同一张回执有两个写入者时加锁，并且「不确定」盖不掉已有结论（`start.rs` 的 `settle`）。命令行的输出里有整轮的提问和回答，写文件时目录 0700、文件 0600，有结果就删（AGY586-P1-02）。接外部命令行之前先真跑一次看它的输出字段和失败时的样子，不凭记忆写字段名。把别人给的文字当参数传给命令行时，贴在选项上（`-p=<消息>`），不单独放一个参数：agy 1.5.18 实测 `agy -p "--version"` 会打印版本号，消息被当成了它自己的选项；贴上后以 `-` 开头的消息它会拒收，前面补一个空格。
- 同类：搜了按自家报错文字判断错误类型的写法（`contains(` 匹配本地化文字），只有这一处；其余命中是测试断言、读外部程序输出（`claude_plugin.rs` 读 claude 的 "unknown option"）或读 ChatGPT 回信。
- 证据：`~/Library/Application Support/postpane/evidence/2026-11-28-agy-fallback/`（`agy-p-output.json` 没登录时的真实输出、`agy-help-stream.ndjson` stream-json 的事件格式、红绿测试输出）。
- 升级：〔提醒〕部分升级（2026-11-28，#586）：`delivery/antigravity` 的 `no_running_language_server_is_unavailable_whatever_it_says`、`starts/agy.rs` 十四条、`service/once.rs` 六条（本机临时端口：没连上、发出去后断了 / 超时 / 回的读不懂、回 500 / 503 / 409、回 400、第一个拒了换第二个、结果不明不碰第二个）、`presentation.rs` 三条，未接进必经检查。已登录的 agy 真实开会话没验（本机 agy 未登录）。
