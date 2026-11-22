# 当前状态

当前阶段目标：ROADMAP 阶段 5「多智能体接力」做完并实机验收。（2026-11-08 常浩确认，digital-twin#114）

## 网页进程退出时记进日志再重载（#512）（2026-11-22，Claude，常浩经侧栏选「只加记录」；已提交，PR 见描述，已装机回读通过）

- 时间：开工 `2026-11-22 22:38`（`date '+%F %H:%M'` 记录）。来由：22:10 侧栏整窗空白，重启驿窗才恢复；查到 22:09 侧栏网页自动重载过却没画出来，驿窗什么都没记，原因查不出（#512）。
- 改变的行为：用户看得到的没有变：网页进程退出后照样自动重载。内部变化两处：`postpane.log` 多出「Web content process ended in window …」「reload sent / failed」两行；重载改由另一个线程发消息进事件循环，不再用 Tauri 默认的 `try_borrow`（借不到窗口表时会静默不重载）。
- 你要求的：
  - `host/src/shell/web_process.rs`（新）：`process_ended(label, reload, log)`，先记退出、再重载，记下重载已发出或失败原因；两条单测。
  - `host/src/shell/macos.rs`：`web_content_hooks` 在应用构建器上接 `on_web_content_process_terminate`，克隆网页视图后另起线程调 `process_ended`，用 `note!` 写日志。
  - `host/src/shell/windows.rs`、`linux.rs`：同名函数原样返回构建器（这两家 Tauri 不报网页进程退出）；`shell/mod.rs` 登记新项。
  - `host/src/lib.rs`：只把 `tauri::Builder::default()` 换成 `shell::web_content_hooks(tauri::Builder::default())`，行数不变。
  - `docs/LESSONS.md`：L-67。
- 我顺手改的：无。
- 测试：
  - 新测试先红后绿：红 `test result: FAILED. 0 passed; 2 failed`（`left: []`），绿 `2 passed; 0 failed`；输出在 `evidence/2026-11-22-512-process-log/red.txt`、`green.txt`。
  - 变基前：`pnpm run check` 退出 0；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1117 passed / 0 failed，前端 `ℹ pass 516` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。变基到 `6dd1bea`（含 #513、#514）后重跑的结果写在 PR 描述。
- 验证：装机后在真实驿窗上依次 `kill -9` 两个网页进程（23:56:18、23:56:22）。`postpane.log` 记下 `window main` 和 `window hud-3337…3230` 各两行（退出、重载已发出）；替身进程同一秒起来；侧栏 8 秒、15 秒后截图都有内容，五家小人与读数、两个挂件都在。22:09 那种「重载了却没画出来」没复现，这次的改动不保证修好它，只保证下次能在日志里看到。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-22-512-process-log/kill2-after-crop.png`（杀进程后侧栏）；诊断时的空白截图在 `evidence/2026-11-22-侧栏不显示/`。
- 发布与回读：`install.sh 512-process-log`：产物 `7a0fef0ca5cf` / 已装 `7a0fef0ca5cf`，签名证书 `b773068e`；冒烟侧栏在动。装的包不含 #513、#514（都不是界面改动），合并后从 main 重打重装。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-22-512-process-log/PostPane-f3fecdbc07f2.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：#512 的根因还不知道，issue 保持打开；下次空白先 `grep "Web content" postpane.log`，看重载是否发出、发给了哪个窗口，再决定要不要做整窗重建。
- 本轮新坑：L-67。
- skill 进化：无。

## E-24 写进驿窗一轮 SKILL，L-64 提升为全局 G-48（2026-11-22，Claude，常浩经侧栏回「全按推荐」：E-24 批、L-64 提升、7b 批 3 继续搁置；已提交，PR 见描述，无需发布）

- 时间：开工 `2026-11-22 23:33`（按分支建立时间补记）。来由：上一节留下的三问，推荐分别是「批」「提升」「不做」。
- 改变的行为：无。
- 改了哪些文件：`.agents/skills/postpane-round/SKILL.md` 第 3 步「装」下加一条可选的隔离验证做法（换 `HOME` 另起一份包，前后比插件登记校验值，按进程号停）；`EVOLUTION.md` E-24 状态改「已采纳」；`docs/LESSONS.md` L-64 升级改〔文字〕已升级，加「提升：已提升为全局 G-48」。
- 测试：`node --test tests/*.test.mjs` 与 `node scripts/check-rules.mjs` 结果见 PR 描述。只改文档和 skill，没跑 `pnpm test`。
- 验证：无界面改动。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 全局坑在 agent-kit：issue #119、PR #120（`node --test tests/*.test.mjs` `ℹ pass 115` / `ℹ fail 0`）。agent-kit 的规则文档要常浩说「合并」才合，这里的「已提升」先于它合并写上。
  - 7b 批 3 继续 ⏸。ROADMAP「现状对照」的改动确认仍等常浩回。
  - 主线：接手成本与方案评估｜✅7 ⏸2 ❓1：❓ 只剩 ROADMAP 改动确认，另有 agent-kit PR #120 等「合并」。
- 本轮新坑：无。
- skill 进化：E-24 已采纳（本节）。

## 按推荐清待办：删四个没人用的名字、lint 修到通过、CURRENT 瘦身、LESSONS 整理、看板对账（2026-11-22，Claude，常浩「你把所有的 to do 都列出来，然后给出你的推荐，然后我全部按推荐去做。」经「牛马之家」会话转达，原话已在三个会话记录里核对；已提交，两个 PR 见描述，未装机）

- 时间：开工 `2026-11-22 21:38`（按分支建立时间补记，没在开工时跑 `date`）。来由：「接手成本与方案评估」主线收尾，常浩按推荐批量定：做五项、不做五项、登记一张 issue、ROADMAP 先问、E-24 / L-64 / 7b 批 3 补一句话再问。
- 改变的行为：无用户看得到的变化。删的四个名字前端、宿主都没有调用方或接收方。
- 改了哪些文件：
  - 删名字、修 lint（分支 `claude/dead-names-lint`）：
    - `host/src/chatgpt.rs` 删 `chatgpt_open/send/status` 三个 Tauri 命令外壳，同名方法照旧走本地工具通道；`host/src/lib.rs` 删四个注册和 `product:event` 那段；`host/src/extension.rs` 删 `Publish` 和 `publish` 字段（只有它发 `product:event`，应用启动传 None）；`host/src/events.rs` 删 `PRODUCT_EVENT`；`host/src/hud/types.rs` 去掉 `hud_native_capabilities` 的 `#[tauri::command]`（函数留着自用）；`host/README.md` 改一句。
    - `app/src/lib/use-hud-config.ts` 删只发不收的 `hud:config`；`protocol/src/{commands,events}.ts` 去掉这几个名字。
    - clippy 四处：`core/src/clients/claude_desktop.rs`（filter_map + then）、`host/src/handoff.rs`（then/unwrap_or_else 改 if/else）、`host/src/handoff/gate/book.rs`（`assert_eq!(.., false)`）、`platform/src/clients/chatgpt/mod.rs`（#150 留下的孤立文档注释）。
    - `src/tooling/file-size-allowlist.json` 里 `handoff.rs` 上限 1997 → 1999，理由里重复的一段顺手去掉；基线收紧两个变短的文件。
  - 文档（分支 `claude/docs-slim`）：`CURRENT.md` 2026-11-20 及更早的 79 节和开头「更新：2026-11-06」总述原样移到 `docs/history/CURRENT-2026-11-12至2026-11-20.md`；`docs/LESSONS.md` 按「超过约 30 条整理一次」把 13 条已升级或已关闭的移到 `docs/history/LESSONS-归档.md`，原处留索引；`tests/postpane-round.test.mjs` 让「引用的 L-xx」把归档也算进去。
- 测试：`pnpm run lint` 改前退出码 101（`core` 第一处就停），改后 0；`pnpm run check` 第 1 次只因 `handoff.rs` 超上限失败，调上限后第 2 次退出码 0。`pnpm test` 两次都没全过：第 1 次 `全量测试汇总：6 套，失败 2 套`（core 计时一条、Chrome 插件一条），第 2 次 `失败 3 套`（Rust、MCP 两条、Chrome 插件两条），负载 87–131；`cargo test --workspace --no-fail-fast` `1113 passed; 2 failed`（platform `accounts::engine::tests_unix` 两条）。每条失败都单独重跑通过：core 那条 1/1、引擎两条连跑 2 次、`test:mcp` `ℹ pass 9` / `ℹ fail 0`、插件信任判断 3 条 `ℹ pass 3` / `ℹ fail 0`；前端 `ℹ pass 516` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，注入脚本 `ℹ pass 11` / `ℹ fail 0`。`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`；`node scripts/check-rules.mjs` `通用规则检查通过`。日志 `evidence/2026-11-22-dead-names-lint/`。
- 验证：替身通过（只有测试，没装机）；行为不变，名字对照测试 `protocol/test/names.test.ts` 管住两边一致。
- 截图：无。
- 发布与回读：未发布，没有可见变化，不装机。
- 与授权不一致之处、遗留问题、范围外发现：
  - 看板对账：#359 本来就关着；#356 代码和返修都合了，但验收里「ChatGPT 写到一半时重新加载插件，回信照样进驿窗」从没做过，所以没关，在 issue 里留言写明只差这一项、要常浩来点重新加载。
  - 登记 issue：#511（大文件按函数拆、HUDScene 拆 hook、AgentHudCore 拆子结构体、hud 目录改名、注释清理），先不做。
  - ROADMAP「现状对照」已单独发改动确认，等常浩回；ROADMAP 第 98 行写的 `product:event` 本轮删了，那句已过期，一并列在确认里，没改。
  - E-24、L-64、7b 批 3：按转达的要求各写一句话加推荐，问常浩。
  - L-47 原本归进了归档，测试时又犯，移回 LESSONS 补了一段，升级改〔提醒〕部分升级。
  - 主线：接手成本与方案评估｜✅7 ⏸2 ❓1：✅ 评估、第一批、日志落盘、#493、7a（批 4 ⏸）、7b（批 3 ⏸）、按推荐清待办（本节）❓ ROADMAP 改动确认、E-24、L-64、7b 批 3 补问。接力拓扑对照试验已转给「驿窗接力｜进度与根治核查」会话。
- 本轮新坑：无（L-47 复发，补在原条目）。
- skill 进化：无。

## 接力：送达未确认之后驿窗自己去会话里找，不再卡死（#509，#507 的批 B1）（2026-11-22，Claude，常浩看改动确认 1 后经 agent-hud 插件回「两条都改」；已提交、PR #510、未送审、未装机）

- 时间：开工 `2026-11-22 12:52`（`date '+%F %H:%M'` 记录）。来由：送审发出后没等到确认（送达未确认）是死胡同：自动往返停下、这张接力不再收别的话、同一段话重送回「刚才已经送到」，之后没有任何东西去查。实机 `h1a1f80d704602`、`h1a1fd0571bd03` 卡了一天。本分支接在 #508（`f19e091`）后面，PR 连带 #508 的改动，#508 先合并后只剩自己的。
- 改变的行为（已定内容，改动确认 1，已登记 DECIDED.md）：
  - 原来：送达未确认后一律停下交常浩，回信到了一律不按通过结束。
  - 现在：这段话发出 40 秒后还没确认、回信也没到，驿窗让插件重载这个会话的标签页，读最新一条提问里有没有这段话的请求号，之后每 2 分钟一次、一次运行最多 30 次。找到：等同确认送到，照常等回信、照常放行。最新提问不是这段、也没在生成（隔 2 秒读两次都这样）：按没送成处理，恢复到发送前，自动往返重新打开，同一段话重送会真的再发。说不清：什么都不改。回信先到的不再找，照旧不放行。只管会话发起的送审，不管补格式。
- 改了哪些文件：
  - 插件（0.2.7 → 0.2.8）：`background.js` 加 `find` 指令和 `found` 回报；`content.js` 加 `asked` 指令。
  - 通道：`platform/src/clients/chatgpt/commands.rs` 加 `Channel::find`，`mod.rs` 把 `found` 交给监听方。
  - 驿窗：新文件 `handoff/sending/book_finding.rs`（`to_find`、`looked_for`、`found_late`、`found_absent`）、`desk_finding.rs`（`find_unsure`、`heard_found`）；`book_unsure.rs`（`Pending.looked`）；`desk_reread.rs`（定时入口里顺带去找）；`desk_lines.rs`、`handoff.rs`（`Lines::find` 和 `found` 一支，行数白名单 1997 → 2000）；`gate/desk_guard.rs`（卡上那句话）。
  - 测试：`chrome-extension/test/background.test.mjs`（3 条）、`content.test.mjs`（1 条）、`handoff/tests/finding.rs`（4 条）、`book_finding.rs` 内 1 条。
  - 文档：`docs/chatgpt-channel.md`（`find`、`found` 两行和送达未确认一段）、`docs/DECIDED.md`（1 行）。
- 跟上 #508 第 1 轮审查的修法（开工 `2026-11-22 13:48`，接手会话）：把修过的 #508（`6bd1f05`）合进本分支（`git merge`，冲突在 `CURRENT.md`、`docs/chatgpt-channel.md`、`background.test.mjs`，两边都留）。`find` 原来无条件重载标签页；没确认送到的话多半其实送到了、ChatGPT 正在写回答，重载会打断它（和 #507-P1-01 同一类）。改成先问页面现在怎样：页面说正在写，或不应答但最近说过在写，不重载，报 `unread`，驿窗 2 分钟后再找；已回收的、没在写的照旧重载再读。`find` 改用 `tabShowing` 和 `stands`，不再把空的标签页编号交给 `loadAgain`。测试：`finding` 辅助函数加「重载前页面怎样」，原 3 条按新语义改，加 1 条；旧 `find` 上 `ℹ pass 59` / `ℹ fail 4`（`red-r2-plugin.log`），改后插件整套 `ℹ pass 142` / `ℹ fail 0`（`green-r2-plugin.log`）。合并后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1122 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 142`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r2.log`、`test-r2.log`、`rules-r2.log`）。仍是替身通过。
- 跟上 #508 第 2 轮审查的修法（约 `2026-11-22 15:18` 开工，写完时 `date` 为 15:26，接手会话；三条全量由再下一个接手会话 `2026-11-22 15:36` 起跑、跑完后推送）：把 #508 的 `cb676bb` 合进本分支（冲突在 `CURRENT.md`、`docs/chatgpt-channel.md`、`background.test.mjs`，两边都留）。`find` 改用 #508 的 `reach` 找标签页：刚重载或刚新开的直接读；原本就在的先问它现在怎样，正在写回答、不答、已换会话的不重载、报 `unread`，其余重载一次再读。页面的 `asked` 回答多带 `here`（是不是这个会话）。上面「跟上第 1 轮」那一条里的 `mayWrite`、`tabShowing`、`stands` 的写法已被这一条取代。插件整套 `ℹ pass 157` / `ℹ fail 0`（`green-r3-plugin.log`）。`b32511a` 上三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1122 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 157`（含真实 Chromium 5 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r3.log`、`test-r3.log`、`rules-r3.log`）。仍是替身通过。
- 真实 Chromium 里查出并修掉一处（开工 `2026-11-22 15:43`，接手会话）：给 `find` 加了 4 条真实 Chromium 测试（`adf3881`），全量里其中一条失败。写探针在真实 Chromium 156 里跑 10 轮：重载一个在前台的标签页时，旧页面卸载途中会因为被隐藏（`visibilitychange`）再报到一次，插件把它当成新页面已经到了，去问一个正在离开的页面，10 轮里 8 轮报 `unread`（`real-chromium-find/probe-reload-report-before.log`）。替身测试测不出来。修法：`content.js` 在 `pagehide` 之后不再因为被隐藏而报到，从缓存回来（`pageshow` 且 `persisted`）时再报一次。修后 10 轮全是 `there`，每轮只收到新页面报到一次（`probe-reload-report-after.log`）。加 1 条真实 Chromium 测试（前台标签页重载后等新页面再读，连跑 3 个会话）：修前第 2 个会话就失败（`red-r4-front.log`），修后过。行为变化：页面卸载时不再多报一次「在、但隐藏了」，对驿窗看到的标签页状态没有可见影响（新页面马上会报到）。
- 跟上 #508 第 3 轮审查的修法（开工 `2026-11-22 16:46`，接手会话）：把 #508 的 `c297be3` 合进本分支（`91e27cc`，冲突在 `CURRENT.md`、`docs/DECIDED.md`、`chromium.test.mjs`，两边都留）。`find` 不用改：它走 `reach`，只重载 Chrome 说已卸载的标签页这条规则只管 `reach` 里的候选；`find` 自己重载的是「答了在、显示这个会话、没在写」的标签页，有活页面但确定没在写，重载是要读到页面最新的样子。
  - 测试：合并加修复后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1126 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 170`（含真实 Chromium 11 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r5.log`、`test-r5.log`、`rules-r5.log`）。仍是替身通过，未在真实环境验证。
- 测试：
  - 新测试先红后绿（G-40）。插件：3 条新测试在没有实现时 `ℹ pass 51` / `ℹ fail 3`（`red-plugin.log`），实现后 `ℹ pass 54` / `ℹ fail 0`。驿窗：临时让 `find_unsure` 不去找、`heard_found` 不入账，`cargo test -p agent-hud-host --lib handoff` 得 `test result: FAILED. 202 passed; 3 failed`（`red-host.log`）；还原后 `test result: ok. 205 passed; 0 failed`（`green-host.log`）。
  - `pnpm run check` 通过（`check exit 0`）。第一遍 `check exit 1`：三个新文件还没 `git add`，开头查 `src/` 下没提交文件那一步拦下的，加进暂存区后重跑。
  - `pnpm test`：「全量测试汇总：6 套，失败 0 套」；Rust 合计 1122 passed / 0 failed，前端 `ℹ pass 516` / `ℹ fail 0`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 132`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`。
  - `node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`。
  - 日志在 `~/Library/Application Support/postpane/evidence/2026-11-22-509-unsure-resolve/`。
- 验证：只有测试，属于替身通过。未在真实环境验证：真实 chatgpt.com 页面重载后最新一条提问能不能读到请求号、两张卡死的接力装机后会不会自己查清，要装机并重新加载插件 0.2.8 后看。
- 截图：无界面改动，无。
- 发布与回读：未装机。
- 与授权不一致之处、遗留问题、范围外发现：
  - 你要求的：送达未确认后自动查清。我顺手改的：无。
  - 待常浩定：没找到之后，驿窗要不要主动通知发起会话「上一段查明没送到，请原样重送」，或者手里还有原文时由驿窗自己重发。现在只恢复状态、卡上记一步，会话不会自己知道，要常浩跟会话说一句。推荐通知会话。
  - 已知代价（常浩已看过）：页面没画全时可能把在的看成不在，同一段送审发两遍。
  - 驿窗重启后找到的那一轮，卡上的送审步骤只有摘录（原文没落盘），回信按摘录比对。
  - 送审：#508 的 L2 已送（常浩 11-22 回「送审」，接力 `h1a2019f9b8302`），本 PR 的 L3 等它审完再送：同一个会话一次只挂一条审查。这个目录里有一条审到顶没了结的审查链 `r1a1fbaef0ca01`（#488），新送审要常浩先在会话里说一句。
  - 主线：接力根治｜完成 7/16：✅ S1（#423）✅ 按提问编号认领（#437）✅ 全链路梳理 ✅ 第 0 批止血代码（#441、#451、#468）✅ 另外三处规则文字 ✅ 第 1 批只读探测（#487）✅ 第 1 批影子运行代码（#491）▶ 标签页失效自愈与 2 小时不再停（#507，PR #508 等审查）▶ 送达未确认后自动查清（本节，#509）⏳ #507、#509 实机验证（装机、重载插件 0.2.8）▶ 影子运行实测（11-22 09:53 起在记录）❓ 没找到之后通知会话还是驿窗自己重发 ❓ 半截回信并入读对话数据、何时切成正式读法 ❓ 补格式没送成怎么处理 ❓ #470 ❓ 第 2 批其余（回执序号与补发、会话查询工具 #442、已领取重投、转回按钮真重送、会话改绑，并 #431、#433 余下部分、#443、#444、#463）❓ 第 3 批分级恢复（并 #434）❓ 第 4 批体检与防回退；#432 排查单另算。
  - skill 进化：无。
- 本轮新坑：无。

## 接力：ChatGPT 标签页失效后发送和重读自己恢复；转回 Claude 后不再因 2 小时停下（#507）（2026-11-22，Claude，常浩说「出第 2 批计划，直到该问题彻底解决」，看两条改动确认后经 agent-hud 插件回「两条都改」；已提交、PR #508、第 8 轮审查后常浩定「先合并另开单」、P2-05 余下三处转 #518、PR #508 squash 合并、未装机）

- 时间：开工 `2026-11-22 10:47`（`date '+%F %H:%M'` 记录）。来由：常浩要求彻底解决接力「中途停止、超时未读取」。对账本机 `handoffs.json`、`turns.jsonl` 和发起会话记录：11-20 17:02 装上第 0 批止血代码后的 41 次送审里，「30 分钟没回信」0 次；非规则要求的停下三类：送审没确认送到 3 次（两次插件回 `tab-closed`，一次 30 秒没答话，2 张接力卡到现在）、半截回信 1 次（之后同一标签页重读 128 次全是 `unreachable`）、「Claude 2 小时没交回复审」7 次（全是误报）。前两类同一个根因：标签页失效后插件不探活、不重载（L-68）。
- 改变的行为（常浩 11-22 看过计划和改动确认）：
  - 发送：原来标签页不应答时回不带 `pressed` 的 `tab-closed` 或一直不答，记成送达未确认并停下；现在发送前先探活，不答的按情况恢复（见下面「第 2 轮审查返修」：已回收的、注入被拒的重载；其余不答的不动它，换一个或另开一个，同一会话最多 2 个标签页）再发，到点没好回 `timeout`、`pressed: false`，按 #466 的「没送成」处理。发送指令带会话编号，页面核对不上回 `other-conversation`、不发。
  - 重读：原来补注入脚本失败就放弃，每 2 分钟空读一次；现在和发送用同一套办法找到一个答应显示这个会话的标签页再读，连续读不到的间隔翻倍到最长 32 分钟。
  - 重启：原来每次重启都给还没确认的送审再记一步、再通知会话一次；现在同一段只记一次、只通知一次（修 bug）。
  - 转回 Claude 之后：原来 2 小时没交回复审就停下自动往返、标「未完暂停」；现在不设时限，由 24 小时没动静自动结束兜底（已定内容，改动确认 2，已登记 DECIDED.md）。
- 改了哪些文件：
  - 插件（0.2.6 → 0.2.7）：`background.js` 加 `answers`（探活）、`loadAgain`（重载），`send`、`readAgain` 接上；给页面的重读提问加 10 秒时限。`content.js` 加 `alive` 指令。
  - 驿窗：`handoff/answers/desk_reread.rs`、`desk_undrawn.rs`（读不到的退避，`turns.jsonl` 多记 `reloaded`）；`handoff/sending/book_unsure.rs`（`Pending.restarted`，重启只记一次，旧记录按最后一步的原因认）；`handoff/book.rs`（`overdue` 去掉转回后的 2 小时）、`handoff/back/desk_texts.rs`（删用不上的 `no_handover`）、`handoff.rs`（调用处）。
  - 测试：`chrome-extension/test/background.test.mjs`（5 条新测试，1 条按新语义改）、`content.test.mjs`（1 条）、`handoff/tests/read_again.rs`、`unsure.rs`（各 1 条）、`held_back.rs`、`book.rs`、`book_states.rs`、`notice/book.rs`（跟着 2 小时去掉改）。
  - 文档：`docs/chatgpt-channel.md`、`docs/LESSONS.md`（L-68）、`docs/DECIDED.md`（1 行）。
- 第 1 轮审查返修（开工 `2026-11-22 13:35`，接力 `h1a2019f9b8302`、审查链 `r1a2019f9b8302`，ChatGPT 结论「需修改」：P1-01、P2-01；另四个重点方向它判可以接受）：
  - P1-01（探活 2 秒没答就重载，可能打断正在写的回答）：改成分情况。Chrome 已回收的直接重载；标签页还在、最近一次报到说正在写回答（30 分钟内，`WRITING_FOR`）的不重载、不注入，发送回 `busy`、`pressed: false`，重读回 `outcome: "busy"`；还在、没说在写的先补注入脚本再问一次（合计最多 8 秒），脚本被切断的、只是答得慢的这一次会答；仍不答才重载。`background.js` 的 `answers` 换成 `stands`、`shown`、`mayWrite`。
  - 审查没提到、返修时查出的一处：`pages` 里的 `streaming` 只在页面报到时更新（加载、换会话、切前后台），开始写和写完回答时并不刷新，照审查意见直接用它，保护是空的。`content.js` 改成开始写、写完各报到一次，插件记下报到时间。
  - P2-01（重载的可能是另一个标签页，却还问旧的）：`loadAgain` 只重载传进来的那一个，不再按网址另找；名单里的标签页已经没了，发送换名单里下一个或新开，重读从头换一个读。
  - 测试夹具的 `chrome.tabs.get` 改成像 Chrome 一样对不存在的标签页报错。
  - 返修测试：9 条新测试（插件后台 8 条、页面脚本 1 条），3 条按新语义改。旧实现上 `ℹ pass 72` / `ℹ fail 8`（`red-r2-plugin.log`，另 1 条「冻结的标签页问两次仍不答就重载」旧实现也过，是防回退的）；实现后插件整套 `ℹ pass 137` / `ℹ fail 0`（`green-r2-plugin.log`）。返修后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1117 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 137`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r2.log`、`test-r2.log`、`rules-r2.log`）。
- 第 2 轮审查返修（开工 `2026-11-22 14:05`，接力 `h1a201cbe06b04`，ChatGPT 结论「需修改」：P1-01 未关、新增 P1-02、P1-03，P2-01 未关。四条都成立，照修；第 1 轮返修里的「最近说过在写就不重载」「30 分钟上限」「`outcome: busy`」「页面在开始写和写完时报到」随之撤掉）：
  - 先在真实 Chromium 156 里加载插件实测（L-69）：标签页被回收后编号会换，旧编号不属于任何标签页，触发 `onReplaced`；新编号下 `discarded: true`、注入被拒、重载后恢复。第 1 轮返修把重载限定成名单里那个编号，真实环境里走不到重载。
  - P1-01（「是不是在写」靠后台内存，重启就丢）：不再靠记忆。只在确定里面没有活页面时重载：已回收，或注入脚本被 Chrome 直接拒绝（冻结、还在加载的除外）。其余不答的不动它，从名单拿掉，换下一个候选或另开一个标签页；同一会话已有 2 个标签页就不再开。`resync` 改成同时问、每个最多等 2 秒。加 `onReplaced` 监听。名单里不再存 `streaming`（存了没人读）。
  - P1-02（重读补注入没有时限）：发送和重读共用 `reach`、`stands`，注入都有时限。
  - P1-03（探活后标签页被切到别的会话，话会发进别的会话；`main` 上本来就有）：发送指令带会话编号，`content.js` 收到时核对，`page.js` 往输入框放每一段前、点发送前核对，对不上回 `other-conversation`、`pressed: false`。
  - P2-01（标签页被 `onRemoved` 先清掉后不会换另一个；页面换了会话被当成「还在等」）：`reach` 逐个候选核对会话，不依赖名单删除的返回值；重读时页面回 `other-conversation` 按没读到算。
  - 新增 `test/chromium.test.mjs`：真实 Chromium 里跑插件本身，5 条（回收换编号后重载并发进去；重读同理；卡死 14 秒的页面不被重载、话发进另开的标签页；被切到别的会话的标签页一个字不收；去了别的网站的标签页不被重载）。chatgpt.com 由本机 HTTPS 服务器顶替，不出本机。
  - 送审前请子 agent 做了一次只读的独立复查（没给它我的结论），8 条发现，修了 7 条：名单里的标签页去了别的网站会被当成「没有活页面」重载（Chrome 不告诉插件别的网站的网址，名单清不掉）→ 重载前核对网址仍是这个会话；发送和重读同时找标签页会各开一个 → 只开一个、另一边等；安装时逐个补注入没有时限 → 同时做、各有时限；按网址找到的活标签页补进名单；重载、新开在到点时的留痕不准；判断用的是注入前的旧状态 → 被拒后重新看一眼；补注入门槛从 10 秒降到 2 秒后会丢「在等回答」→ 旧脚本把状态交给新脚本。没修 1 条：发送指令本身（`submit` 的 `sendMessage`）没有时限，是旧代码，驿窗自己的 30 秒等待兜住，晚到的结果驿窗仍采用，在插件里截断反而丢掉迟到的成功结果。
  - 没做到：冻结的标签页没能实测（无头 Chromium 里两种办法都没让 `tab.frozen` 变真）；规则写成不依赖它的表现。
  - 待观察：`background.test.mjs` 里影子读取的两条旧测试（`a page is trusted only on evidence…`、`what a page read says is trusted only…`）在本机负载很高时偶发失败过两次，之后上一版提交和当前改动各连跑 8 遍都全过，没能复现。
  - 代价：冻结或卡死的标签页不再被刷新，留在原处，旁边多开一个同会话的标签页。
  - 返修测试：上一版实现上跑新测试 `ℹ pass 101` / `ℹ fail 9` / `ℹ cancelled 3`（`red-r3-plugin.log`，每条限 20 秒；不限时会卡死在「注入永不返回」那条上，其中 1 条失败是限时碰到的旧慢测试）。实现后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1117 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 152`（含真实 Chromium 5 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r3.log`、`test-r3.log`、`rules-r3.log`）。第一遍全量有两条失败（L-69「升级」一行的标签词不合规则；真实 Chromium 的卡死页面测试在高负载下超时，原因是后台标签页定时器每秒只跑一次、测试页面不接粘贴），修后重跑全过。
- 第 3 轮审查返修（开工 `2026-11-22 15:54`，接手会话；接力 `h1a201cbe06b04` 第 3 轮，ChatGPT 结论「需修改」：P1-02、P1-03、P2-01 已验证关闭；P1-01 未关，新增 P1-04、P2-02、P2-03、P2-04。五条都成立，照修）：
  - P1-01（注入被 Chrome 拒绝不等于没有活页面：标签页正在换文档时也会被拒，之后会误重载）：不再拿「注入被拒」当证据。只有 Chrome 自己说标签页里没有加载任何页面时才重载：`discarded: true`，或 `status: "unloaded"`。先在真实 Chromium 156 里实测（`real-chromium/probe-crashed.log`、`probe-error-page.log`）：页面崩溃后网址还在、`discarded: false`、`status: "unloaded"`、注入被拒；停在 Chrome 错误页的标签页不把网址告诉插件；重载途中注入不被拒、会等新文档。`stands` 不再读 `tab.frozen`。行为变化：注入被拒但 Chrome 没说卸载的标签页，原来重载，现在不动它、另开一个。
  - P1-04（驿窗的「在途」只认自己送出的话；回信转回之后常浩自己在这个会话里发话、ChatGPT 正在写时，原标签页不应答、另开的标签页还没画出停止按钮，新送审可能发进去）：三道。`page.js` 点发送前再看一次有没有停止按钮，有就回 `busy`、`pressed: false`；驿窗记下已绑定会话里每个回合的开始和结束，不分阶段（新文件 `handoff/gate/book_writing.rs`，`Gate.writing`，只在内存里），正在写时 `ask` 不发，工具回「ChatGPT 正在这个会话里写另一个回答…没有发出」。每次拦下都让插件重读这个会话，重读回 `told` 或 `waiting`（页面在、没有回答在写）就解除；没有重读结果时，听到开始后 30 分钟（`REPLY_WAIT_MS`）不再拦。这份记录只用来拦发送，不决定重不重载。行为变化（已定内容，常浩 2026-11-22 在本会话看甲乙两种做法后回「甲」，已登记 DECIDED.md）：多了一种「没发出」的情形，会话要等它写完、或等重读核实后再送。
  - P2-02（`tabs.create` 在要它的一方到点时还没返回，预留就放了，另一方会再开一个，突破 2 个；查询标签页失败被当成一个都没有）：向 Chrome 要的标签页没回音之前一直算「正在开」，回音来了还要等它报到（最多 15 秒，`MADE_BY`：刚开出来的标签页没有网址，按网址找不到）；`tabsAt` 查不到时回空值，这次不找了、也不新开。
  - P2-03（发送途中页面被切到别的会话，插件放进输入框的字留在那里）：输入框里只有这次放进去的字（整段或开头一部分）就清掉；还有别的字不动，回报多带 `left: true`，驿窗在没送成的说明后面加一句「输入框里留着没清掉的字」。到点的同时页面也换了会话，同样取回。
  - P2-04（重读后半段 `standing`、`drawnInFront` 里问 Chrome 的调用没时限）：每次最多等 3 秒（`CHROME_BY`），没答按「不在前台、没最小化」记，没确认切到前台就不读。
  - 送审前请子 agent 做了一次只读的独立复查（没给它我的结论），9 条发现，修了 7 条：只听到开始没听到结束会误拦 30 分钟（回答途中标签页切走、被关、被回收、点了停止都只报开始）→ 加上面的「拦下就重读、页面说没在写就解除」；迟到的标签页刚开出来没有网址，等它的一方会当场再开一个 → 预留等到它报到；查询标签页失败时 `reach` 还会往下走 → 直接算没找到；`left` 没人读 → 写进没送成的说明；到点和换会话同时发生时字不清 → 也取回；两条新测试没测到它声称的分支（其中「开标签页超时不再开第二个」在旧实现上也能过）→ 改正并补断言；文案里的 30 分钟写死、注释和 LESSONS 措辞 → 改。没修 2 条：点发送前第二次看停止按钮，在真实页面上可能和「等不到发送键」是同一拍、拦不到东西（没核对 chatgpt.com 现在的页面结构；它是审查点名要的，留着无害，实际靠驿窗那一道）；`tabs.create` 永远不回时这个会话在插件后台重启前不再新开标签页（有意的，宁可不开）。另记：`resync`、`onInstalled`、`focus`、`open`、影子读取里问 Chrome 的调用仍没有时限，补格式不看「正在写」的记录，都不在这轮意见里。
  - 改了哪些文件：`background.js`（`unloaded`、`stands`、`tabsAt`、`reach`、`make`、`MADE_BY`、`standing`、`drawnInFront`、`chromeSays`）、`page.js`（`submit`、`press`、`takeBack`）；驿窗 `handoff.rs`（`observe` 记回合、`ask` 改问 `unheld`，行数不变）、`handoff/gate/book.rs`（`Gate.writing`）、`gate/book_writing.rs`（新）、`gate/desk.rs`（`unheld`）、`gate/desk_guard.rs`（`writing_other`）、`answers/desk_undrawn.rs`（重读结果解除）、`platform/…/chatgpt/sending.rs`（留字说明）；测试 `background.test.mjs`（加 6 条，改 3 条）、`page.test.mjs`（加 1 条，改 1 条）、`chromium.test.mjs`（加 1 条：页面崩溃后重载）、`handoff/tests/writing.rs`（新，3 条）、`sending.rs` 内 1 条；文档 `docs/chatgpt-channel.md`、`docs/LESSONS.md`（L-69 补一条）、`docs/DECIDED.md`（1 行）。插件版本仍是 0.2.7（还没装过机）。
  - 返修测试：上一版实现（`cb676bb` 的 `background.js`、`page.js`）上跑本轮最终的测试，`ℹ pass 100` / `ℹ fail 7` / `ℹ cancelled 1`（`red-r4-plugin.log`，在临时副本里跑，每条限 20 秒；取消的那条是旧实现卡在「Chrome 不答标签页状态」上）；驿窗在临时副本里让 `heard_writing` 什么都不记，`test result: FAILED. 0 passed; 3 failed`（`red-r4-host.log`）。实现后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1121 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 160`（含真实 Chromium 6 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r4.log`、`test-r4.log`、`rules-r4.log`）。仍是替身通过，未在真实环境验证。
- 第 4 轮审查返修（开工 `2026-11-22 17:08`，接手会话；接力 `h1a2026f624206`，审查链 `r1a2019f9b8302` 第 4 轮，ChatGPT 结论「需修改」：P1-01、P2-04 已验证关闭（它查了 Chromium 源码，认可 `discarded || status === "unloaded"`）；P1-04、P2-02、P2-03 仍待修，新增 P2-05。四条都成立，照修）：
  - P1-04 三个子问题：① 重读回 `waiting` 也可能是回答还在变，不能当解除依据 → 去掉按重读结果解除，只认同一轮的 `turn complete`（重读读到已写完的回答会补报一次，带 `reread: true`）；② 驿窗重启后不记得、页面开始时已在写也不报开始 → `content.js` 脚本开始时页面已在写就补报开始（`again: true`），`background.js` 的 `resync` 对正在写的标签页补报开始，`connect()` 成功后调 `resync()`；③ 开始和结束没按回合对上 → `Gate.writing` 记下开始那一轮的 `promptId`（`Writing { began, prompt }`），只有同一编号的结束才解除，开始时编号不明的任何结束都解除。30 分钟上限写明是防卡死的出口（fail-open）。行为变化：解除条件更严，原来重读回 `waiting` 就放行，现在要读到这一轮回答已写完；DECIDED.md 那一行跟着改了措辞（常浩选定的「甲：挡，最长 30 分钟」不变）。
  - P2-02（过了 15 秒还没报到的标签页不计数）：`tabsAt` 改查全部标签页，按 `url` 或 `pendingUrl` 含 `/c/<会话>` 认。
  - P2-03（文字相像不算归属，可能删掉另一个会话的草稿）：只有送审第一行「【驿窗送审 <请求号>】」完整在输入框里、且整段是送审开头才清。
  - P2-05（切到前台的请求超时后会抢回焦点）：只在确认这个标签页仍在前台时才切回原来那个。
  - 改了哪些文件：`background.js`（`unloaded` 注释、`tabsAt`、`drawnInFront`、`resync`、`connect`）、`content.js`（开头补报）、`page.js`（`takeBack`、`OWN`）；驿窗 `handoff.rs`（`observe` 把整条回合交给 `heard_writing`）、`gate/book_writing.rs`（`Writing`）、`gate/book.rs`、`answers/desk_undrawn.rs`（去掉重读解除）；测试 `writing.rs`（4 条，改写）、`background.test.mjs`（加 3 条、改 1 条）、`page.test.mjs`（加 2 例、送审文字改成带请求号）、`content.test.mjs`（加 1 条）；文档 `docs/chatgpt-channel.md`、`docs/DECIDED.md`（1 行措辞）。
  - 改的过程中踩到一处：`tabsAt` 第一版用 `startsWith('chatgpt.com/c/<id>')`，漏掉项目里的会话（`/g/<项目>/c/<id>`），旧测试卡住才发现，改回 `includes`。
  - 返修测试：上一版实现（`c297be3` 的 `background.js`、`page.js`、`content.js` 和写作闸）上跑本轮最终的测试：插件 `ℹ pass 123` / `ℹ fail 5`（`red-r5-plugin.log`：重启补报开始、脚本开始时补报、未提交网址的标签页计数、不抢回焦点、文字相像不删），驿窗 `test result: FAILED. 3 passed; 1 failed`（`red-r5-host.log`：只有「旧回合的结束不解除」在旧实现上失败；补报开始、30 分钟兜底、基本拦截三条旧实现也过，补报的改动在插件那头）。新加的「读完只在仍在前台时切回」那条在旧实现上也过（它测的是常浩中途切走、请求本身成功的情形；P2-05 的失败路径由「切到前台没回音」那条测到）。实现后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1122 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 164`（含真实 Chromium 6 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r5.log`、`test-r5.log`、`rules-r5.log`）。仍是替身通过，未在真实环境验证。
- 第 5 轮审查返修（开工 `2026-11-22 17:39`，接手会话；接力 `h1a2026f624206` 第 2 封回信，ChatGPT 结论「需修改」：P2-02、P2-03 已验证关闭；P1-04 两个子问题、P2-05 未关。本授权周期 5 轮到顶，常浩 2026-11-22 经 agent-hud 插件回「授权再审 1 轮」。三处我对照代码核实都成立，照修）：
  - P1-04 ①（开始时读到的提问编号可能是上一轮已答完的；开始没带编号时任何结束都能解除，含别的标签页迟到的旧回合）：`content.js` 记下页面已知答完的最新提问（`done`），最新提问就是它时开始不带编号，提问画出来后补报一次开始（带编号、沿用原开始时间）；`state` 多回 `writingFor`，`resync` 用它；`background.js` 转给驿窗的每个回合带上报信的标签页（`tab`）。驿窗 `gate/book_writing.rs` 改成 `Pen { now, ended }`、`Writing { began, prompt, tab }`：不带编号的开始只由同一标签页的结束解除；开始带的编号已听到过结束的当作不带编号；同一回合补报编号时沿用原 `began`。
  - P1-04 ②（驿窗启动时通道先收消息、`handoff::listen` 稍后才注册，`Shared::tell` 没有监听就丢，插件连上就补报的开始可能丢）：新文件 `platform/src/clients/chatgpt/listening.rs`，监听注册前到的消息按序暂存（最多 64 条），注册时先交付。L-70。
  - P2-05（`tab.active` 只是窗口内激活，常浩切到别的窗口后仍会切回）：切回前还要窗口焦点和切过去之前一样（`windows.get(...).focused`），问不到就不动。和审查建议的「仍然 focused」不同：常浩一直在别的应用里、没动过 Chrome 时照常切回，送审说明里请它判断。
  - 改变的行为：写作闸里没带编号的开始，原来任何结束都解除，现在只认同一标签页的结束，认不到就等 30 分钟出口；读完切回原标签页多了「窗口焦点没变」这个条件；驿窗启动时在监听注册前收到的回合、打开、送达消息，原来丢掉，现在交给接力。
  - 改了哪些文件：插件 `background.js`、`content.js`；驿窗 `gate/book.rs`（字段类型）、`gate/book_writing.rs`、`platform/…/chatgpt/mod.rs`、`listening.rs`（新）；测试 `handoff/tests/writing.rs`（删 1 例、加 3 条）、`handoff/tests.rs`（回合助手带 `tab`）、`listening.rs` 内 2 条、`tests_unix.rs`（监听前的消息现在会交付，断言按新语义改）、`background.test.mjs`（焦点 4 例、补报带 `writingFor` 和 `tab`、转发带 `tab`）、`content.test.mjs`（1 条）；文档 `docs/chatgpt-channel.md`（3 处）、`docs/LESSONS.md`（L-70）；`mod.rs` 行数基线收紧。
  - 返修测试：本轮新测试放在上一轮受审实现（`0438bec` 的 `background.js`、`content.js`、`page.js`，临时副本）上跑，插件 `ℹ pass 97` / `ℹ fail 3`（`red-r6-plugin.log`：焦点、补报带 `writingFor`/`tab`、提问后画出）；驿窗在新代码上把两处改回旧行为（未知编号通配、没有监听就丢），`test result: FAILED. 5 passed; 2 failed` 和 `FAILED. 2 passed; 2 failed`（`red-r6-host.log`）。第一遍全量 Rust 有 1 条失败：`tests_unix.rs` 的通道测试断言监听只收到 2 条，暂存后监听注册前的 2 条也会交付，按新语义改了断言。实现后三条全量结果见下面「测试」的第 5 轮那一行。仍是替身通过，未在真实环境验证。
  - 顺带发现：取红证据用的临时副本 `~/Sandbox/2026-11-22-postpane-508-red` 是整个复制过来的，`.git` 指向本 worktree 的 git 目录（同一个索引），而且源码停在 `c297be3`。已把它的 `.git` 改名为 `.git-detached-was-507-worktree` 断开，源码换成要比的版本再跑。
- 第 6 轮审查返修（开工 `2026-11-22 18:50`；常浩经侧栏回「送审」后送出，新接力 `h1a202c9622b07`、审查链 `r1a2019f9b8302`，ChatGPT 结论「需修改」：P1-04 ② 已验证关闭；P1-04 ① 旧版脚本交接缺口、P2-05 活动标签页竞态未关。它认可 P2-05 的「焦点和之前一样」做法、通道暂存持锁交付）：
  - P1-04 ①（补注入时改动之前的旧脚本交来的状态里没有 `done`，新脚本会把上一轮的提问当成这一轮的）：没交来 `done`、页面又正在写时，把页面上最新的提问当作已答完：开始不带编号，由这个标签页自己的结束解除，之后画出来的提问照常补报。顺带修了上一轮自己的一处：补报编号时消息里的 `at` 和记下的开始时间各取一次 `Date.now()`，可能差 1 毫秒，改成同一个值。
  - P2-05（先记下原来的前台标签页、再问窗口焦点，这段等待里常浩换了标签页会被抢回；读完先查标签页、再问焦点也一样）：从动手前就监听 `tabs.onActivated`，这个窗口里有别的标签页被切到前台过就不切回；切过去之前就有人换了，这次不切过去；读完先问焦点、最后才查标签页和这份记录。
  - 改变的行为：读完切回又多了「期间没人换过标签页」这一条（换过再换回来也不切回）；切过去之前就有人换了标签页时，这次不切过去读（重读结果按没画出来算，下次再读）。
  - 改了哪些文件：`background.js`（`drawnInFront`）、`content.js`（`done` 初值、`tellStart` 的 `at`）；测试 `background.test.mjs`（夹具加 `tabs.onActivated`、`activate`，焦点用例加来回切换、两处等待里换标签页）、`content.test.mjs`（旧版交接 1 条）；文档 `docs/chatgpt-channel.md`（2 处）。
  - 返修测试：新测试放在上一轮受审实现（`3c6c35e`，临时副本）上跑，插件 `ℹ pass 98` / `ℹ fail 3`（`red-r7-plugin.log`：焦点用例、补报沿用开始时间、旧版交接）。驿窗端没改。实现后三条全量见下面「测试」的第 6 轮那一行。仍是替身通过，未在真实环境验证。
- 第 7 轮审查返修（开工 `2026-11-22 19:50`；常浩经侧栏回「再授权 1 轮」后送出，接力 `h1a202c9622b07` 续审，ChatGPT 结论「需修改」：P1-04 已验证关闭，未决 P1 0；只剩 P2-05：监听装在第一次问 Chrome 之后，那次等待里换的标签页记不到；切到前台的请求本身在路上时常浩换了标签页，插件的切换后完成会盖住他选的）：
  - P2-05：问 Chrome 任何东西之前就监听，先把所有激活事件存下，拿到标签页所在窗口后再筛；切到前台的请求回来后若期间有人换过，不读，插件的切换后完成时把常浩选的那个切回来。
  - 改变的行为：切到前台途中常浩换了标签页，这次不读（原来照读，读完不切回）；插件的切换盖住他选的时会切回他选的。
  - 改了哪些文件：`background.js`（`drawnInFront`）、`background.test.mjs`（两种情形）、`docs/chatgpt-channel.md`（1 处）。
  - 返修测试：新断言放在上一轮受审实现（`fc096b6`，临时副本）上跑都失败：第一次问标签页时换的那条 `actual: [ 2, 4 ]`（应为 `[]`，`red-r8-plugin.log`），切到前台途中换的那条去掉前一条单独跑 `actual: [ 2 ]`（应为 `[ 2, 4 ]`，`red-r8-plugin-late.log`）。实现后三条全量见下面「测试」的第 7 轮那一行。仍是替身通过。第 8 轮没有送：常浩这次授权的是 1 轮，等他再定。
- 第 8 轮审查（受审 `23c21e5`，常浩在本会话回「送第 8 轮」后送出）：结论「需修改」，P0 0、P1 0，只剩 P2-05 三处边界：恢复判断用了全浏览器最后一次激活事件、没限定窗口；切到前台的请求超时后迟到完成会绕过保护；`tabs.onActivated` 分不清是谁切的，常浩自己点回 ChatGPT 标签页会被当成插件的切换。三处对照代码都成立。P2-05 已连续返修 5 轮（第 4～8 轮），第 3 处是 Chrome 接口本身给不出来源，停下请常浩定。常浩 2026-11-22 经驿窗侧栏（回到统筹会话「驿窗接力｜进度与根治核查」，本会话在它的记录里核对过原话）回「先合并另开单」：接受 P2-05 这三处暂不关，另开 #518，换成保守规则（发现常浩动过就什么都不切回；超时的切换在时限内继续盯；只看目标窗口），规则待他确认。
- 合 main 时坑编号撞号：main 上 #516 先合进了 L-67（窗口空白、网页进程重载），本节原来的 L-67、L-68、L-69 顺延为 L-68、L-69、L-70，本节和 LESSONS 都已改，PR 描述同步；main 那条和它在 #516 一节的引用没动。合并后三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1129 passed / 0 failed，其余各套 `ℹ fail 0`（`check-merge2.log`、`test-merge2.log`）。
- 测试：
  - 新测试先红后绿（G-40）。插件：5 条新测试在旧代码上 `ℹ pass 46` / `ℹ fail 5`（`red-plugin.log`），实现后 `ℹ pass 51` / `ℹ fail 0`。驿窗：临时关掉三处实现（重启只记一次的判断、读不到的退避、把转回后的 2 小时加回去）跑 `cargo test -p agent-hud-host --lib handoff`，`test result: FAILED. 195 passed; 5 failed`（2 条新测试加 3 条跟着 2 小时去掉改的，`red-host.log`）；还原后 `test result: ok. 200 passed; 0 failed`（`green-host.log`）。第一遍红没编译过（新测试调了私有的 `live_mut`），改掉后重跑的。
  - `pnpm run check` 通过（`check exit 0`）。
  - `pnpm test`：「全量测试汇总：6 套，失败 0 套」；Rust 合计 1117 passed / 0 failed，前端 `ℹ pass 516` / `ℹ fail 0`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 128`（原 122，加 6 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`。
  - `node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`。
  - 第 5 轮返修后（`0d64294`）三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1127 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 165`（含真实 Chromium 6 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r6.log`、`test-r6.log`、`rules-r6.log`）。
  - 第 6 轮返修后（`a7eb0c4`）三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1127 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 166`（含真实 Chromium 6 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r7.log`、`test-r7.log`、`rules-r7.log`）。第 7 轮没有送：常浩授权的是「再审 1 轮」，已用在第 6 轮，等他再定。
  - 第 7 轮返修后（`5c1c7a9`）三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1127 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 166`（含真实 Chromium 6 条），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`（`check-r8.log`、`test-r8.log`、`rules-r8.log`）。
  - 日志在 `~/Library/Application Support/postpane/evidence/2026-11-22-507-tab-revive/`。
- 验证：只有测试（插件在沙盒里用替身的扩展接口跑，页面脚本在无头浏览器里跑），属于替身通过；未在真实环境验证：真实 Chrome 里标签页被回收后发送、重读能不能自己恢复，要装机并重新加载插件 0.2.7 后实测。
- 截图：无界面改动，无。
- 发布与回读：未装机。装机要退出正在运行的驿窗，装完要常浩重新加载 Chrome 插件 0.2.7（设置「智能体插件」会提示版本不一致），再做实机验证。
- 与授权不一致之处、遗留问题、范围外发现：
  - 你要求的：A1 发送前探活、A2 重读自愈与退避、A4 重启只记一次、B2 不再因 2 小时停下。我顺手改的：删掉用不上的 `no_handover` 文字和 `overdue` 的一个参数；`turns.jsonl` 的重读行多记 `reloaded`。
  - 没做：A3 半截回信（回信入账和补格式的规则缠在一起，仓促改容易改坏；根治是用对话数据的「写完」标记，并入「回信正式改读对话数据」，等常浩定切换）；B1 送达未确认后自动查清（常浩已回「改」，体量大、要改通过放行条件，另开 PR 并送 L3 审查）。
  - 现在卡着的 2 张数字分身接力（`h1a1f80d704602`、`h1a1fd0571bd03`）这个 PR 解不开，出路是常浩在卡上结束接力后让会话重送，或等 B1。
  - 规则和现状对不上一处：本文件「接力根治」主线写影子运行「装机、重载插件 0.2.6、打开开关都另等常浩定」，实际 11-22 09:37 已装含 #491 的包、`dataShadow` 已打开、`shadow.jsonl` 09:53 起有记录（到 10:27 共 7 行，2 封完整回信）。
  - 主线：接力根治｜完成 7/16：✅ S1（#423）✅ 按提问编号认领（#437）✅ 全链路梳理 ✅ 第 0 批止血代码（#441、#451、#468）✅ 另外三处规则文字 ✅ 第 1 批只读探测（#487）✅ 第 1 批影子运行代码（#491）▶ 标签页失效自愈与 2 小时不再停（本节，#507）⏳ #507 实机验证（装机、重载插件 0.2.7）▶ 影子运行实测（11-22 09:53 起在记录）⏳ B1 送达未确认后自动查清（常浩 11-22 回「改」，另开 PR）❓ 半截回信并入读对话数据、何时切成正式读法 ❓ 补格式没送成怎么处理 ❓ #470 ❓ 第 2 批其余（回执序号与补发、会话查询工具 #442、已领取重投、转回按钮真重送、会话改绑，并 #431、#433 余下部分、#443、#444、#463）❓ 第 3 批分级恢复（并 #434）❓ 第 4 批体检与防回退；#432 排查单另算。
  - skill 进化：E-25 待批（新 worktree 克隆主目录的 `target/debug` 省编译）。
- 本轮新坑：L-68（Chrome 回收或冻结的标签页还留在插件名单里）、L-69（浏览器接口的行为按想象写进替身，和真实 Chrome 对不上）。

## 命令名、事件名集中到 protocol 包，加两侧对名字的测试（7b 批 1、批 2）（2026-11-22，Claude，常浩看 7b 分批计划后经 agent-hud 插件回「按推荐开工」；前一会话写完代码、上下文到 50% 交接，本会话补测试收尾；已提交，PR #506，无需装机）

- 时间：开工 `2026-11-22 09:55`（`date '+%F %H:%M'` 记录）。来由：主线「接手成本与方案评估」第二批 7b，前端散落的 Tauri 命令名、事件名收到一处，两侧改名时测试能拦住。
- 改变的行为：无（只换写法）。
- 改了哪些文件：
  - `protocol/src/commands.ts`（新，`COMMANDS` 38 个，与 host `generate_handler!` 同序）、`protocol/src/events.ts`（新，`HOST_EVENTS` 宿主发的 18 个 + `WINDOW_EVENTS` 窗口之间的 2 个，`EVENTS` 是两者合并），`protocol/package.json` 加 `./commands`、`./events` 子路径导出。
  - `protocol/test/names.test.ts`（新）：`COMMANDS` 与 host `lib.rs` 的 `generate_handler!` 名单逐项相等；`HOST_EVENTS` 与 host `events.rs` 的常量值相等（内部用的 `SNAPSHOT` 除外）；`app/src` 里除 `lib/native.ts` 外没有文件从 `@tauri-apps/api/core` 引 `invoke`、从 `@tauri-apps/api/event` 引 `listen`/`emit`。
  - `app/src/lib/native.ts`（新）：`call`、`listenTo`（透传监听选项）、`listenHere`（当前窗口的 `listen`，范围不变）、`emitTo`。app 12 个文件的裸字符串 `invoke`/`listen`/`emit` 全改用它们。
  - 开发桥白名单写成 `Set<NativeMethod>`，6 个写方法照旧不放；`vite-config` 加工作区依赖 `@agent-hud/protocol`，`pnpm-lock.yaml` 跟着改了 3 行（L-66）。
  - host 新增 `events.rs`（18 个事件名常量 + 内部用的 `SNAPSHOT`），9 个文件的事件名字面量改用常量。
  - 行数：`HUDSurface.tsx`、`App.tsx`、`use-hud-config.ts` 变短，基线已收紧；`host/src/lib.rs` 白名单上限 1126 → 1127（挂 `events` 模块一行）。
- 测试：
  - 新测试先红后绿（G-40）：同一条命令里临时删 `COMMANDS` 的 `quit_app`、把 `events.rs` 的 `hud:clock` 改成 `hud:clocks`、在 `app/src` 加一个 `import { invoke as call } from "@tauri-apps/api/core"` 的文件，`ℹ pass 0` / `ℹ fail 3`；还原后 `ℹ pass 3` / `ℹ fail 0`。
  - `pnpm run check` 通过（`check exit 0`；第一次被包边界检查拦下测试里的 `new URL("../../../../")`，改成 `join(import.meta.dirname, …)` 读文件，同 `hud/test/director-cases.test.ts`）。
  - `pnpm test`：「全量测试汇总：6 套，失败 0 套」；Rust 合计 1115 passed / 0 failed，前端 `ℹ pass 516` / `ℹ fail 0`（含新测试 3 条），MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 122`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`。
  - `node --test tests/*.test.mjs` 原样结果 `ℹ pass 64` / `ℹ fail 0`。
  - `cargo metadata --locked --format-version 1` 退出 0（L-66）。
  - 日志在 `~/Library/Application Support/postpane/evidence/7b-names-2026-11-22/`。
- 验证：只有测试；行为不变，没开应用实测。
- 截图：无界面改动，无。
- 发布与回读：未装机。只换写法、行为不变；main 里还有 #491（插件 0.2.6），它的装机常浩另定。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划里写「集中命令名、事件名和载荷类型」，实际只集中了名字：参数和返回值类型大多是 app 包里的类型（拖动参数、截图任务、各插件状态），搬进 protocol 要连带搬十几个类型，没做。
  - 发现（待常浩定，没删）：`hud:config` 前端发、没人听；`product:event` 宿主发、前端没人听；`chatgpt_open`/`chatgpt_send`/`chatgpt_status` 作为 Tauri 命令前端不调（同名功能走本机工具通道 `tools.rs`）；`hud_native_capabilities` 前端不调（README 提到）。
  - 主线：接手成本与方案评估｜✅5 ▶0 📌0 ❓1：✅ 评估、第一批、日志落盘、#493、7a（批 4 ⏸）、7b 批 1、2（本节；批 3 ⏸）❓ 待常浩定的几项同 #493 那节，另加「两个大文件按函数拆」与上面四个疑似死名字。
- 本轮新坑：无。
- skill 进化：无。

## 接力代码按概念放目录：gate/back/answers/sending/notice（7a 批 3）（2026-11-22，Claude，常浩选「概念目录（推荐）」；已提交、PR 见 PR 描述、未装机）

- 时间：开工 `2026-11-22 09:30`（`date '+%F %H:%M'` 记录）。来由：7a 批 3，评估原文第 2 节第 1 条第 3 步「文件按概念重组」，消掉两侧成对同名的 `gate`/`guard`/`held`/`notice`/`wake`。原计划「每个概念一个文件」合起来会超 300 行，11-21 问过常浩，他选「概念目录（推荐）」。
- 改变的行为：无。
- 你要求的：
  - 28 个子文件用 `git mv` 搬进 `host/src/handoff/` 下五个概念目录：`gate/`（审核门）、`back/`（转回与续接）、`answers/`（收信）、`sending/`（送审）、`notice/`（出错通知）。记录一侧叫 `book*.rs`，宿主一侧叫 `desk*.rs`，同一概念的两半放在一起；原 `handoff/book/` 目录没了。
  - 实现方式：`book.rs`、`handoff.rs`、`book_unsure.rs` 里用 `#[path]` 把文件挂在原来的模块下，所以模块树、`Book` 私有方法的可见性、`super::` 路径、测试名全不变。代价是目录和模块名不再一一对应，写进新文件 `handoff/README.md`（目录 ↔ 模块对照、各目录管什么）。
  - 状态测试（批 1 的 `states.rs`）挪到 `handoff/tests/book_states.rs`，挂在 `handoff::tests` 下：内联测试模块的 `#[path]` 要经过已删的 `book/` 目录，解析不了；文件里只把 `use super::*;` 改成 `use crate::handoff::book::*;`。
  - 文档：`GLOSSARY.md`、`AGENTS.md`「AI 接入」一处、`docs/chatgpt-channel.md` 四处、`docs/LESSONS.md` 两处、几处代码与前端注释改新路径。
- 我顺手改的：`hud/test/handoff-card.test.ts` 两行注释里的 `gate.rs` 改成新路径（只动注释）。
- 行数白名单：`#[path]` 每条 rustfmt 都拆成单独一行，`handoff.rs` 1984 → 1997、`book.rs` 1565 → 1578，各 +13，上限同步调高并写明原因（按函数拆这两个大文件另开单）。
- 测试：没有新行为，没有「先红」。搬前搬后各跑一次 `cargo test -p agent-hud-host -- --list`：244 条一一对应，状态测试 11 条只是模块路径从 `handoff::book::tests::states::` 变成 `handoff::tests::book_states::`（`host-tests-before/after.txt`）；字面量 4097 → 4124，多的 27 个全是 `#[path]` 路径字符串。`pnpm run check` 退出码 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（cargo 合计 1115 通过 0 失败；前端 `ℹ pass 513` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`；`cargo metadata --locked` 退出码 0（L-66）。证据在 `~/Library/Application Support/postpane/evidence/2026-11-22-7a-concepts/`。
- 验证：只有测试与清单比对。
- 截图：无。
- 发布与回读：未装机。行为不变；main 含 #491（插件 0.2.6），它的装机另等常浩定。
- 与授权不一致之处、遗留问题、范围外发现：
  - 和批 3 计划写的「每块一个文件、Book 和 Desk 写在一起」不同：按常浩选的「概念目录」做，一个概念的两半各自成文件、放在同一目录；用 `#[path]` 而不是改模块树，见上。
  - #442 碰的 9 个接力文件这次又换了位置，它变基时要按 `handoff/README.md` 找新路径。
  - 两个大文件（`handoff.rs` 1997 行、`book.rs` 1578 行）按函数拆开没在 7a 范围里，另开单要等常浩定。批 4（合并 Status/Phase）仍搁置。只在测试用的 `Book::round` 等 6 项（批 2 加的 `#[cfg(test)]`）没删。
  - 主线：接手成本与方案评估｜✅4 ▶1 📌1 ❓1：✅ 评估、第一批、日志落盘、#493 ▶ 7a（批 1 ✅、F-01 ✅、批 2 ✅、批 3 ✅ 本节、批 4 ⏸）📌 7b ❓ 待常浩定的几项同 #493 那节，另加「两个大文件按函数拆」。
- 本轮新坑：无。
- skill 进化：无。

## 补提交 Cargo.lock（7a 批 2 漏提交）（2026-11-21，Claude，#503 合并后清理时发现；已提交、PR 见 PR 描述、无需发布）

- 时间：开工 `2026-11-21 20:58`（`date '+%F %H:%M'` 记录）。来由：#503 给 host 加了 `agent-hud-agents` 依赖，`Cargo.lock` 跟着多一行却没提交；合并后删 worktree 被拒才发现。
- 改变的行为：无。
- 你要求的：无（属上一张的漏项）。
- 我顺手改的：`Cargo.lock` 补上 `agent-hud-host` 依赖 `agent-hud-agents` 一行；`docs/LESSONS.md` 加 L-66。
- 测试：干净的 main（`9b35c6a`）上 `cargo metadata --locked` 退出码 101（`locked-before.txt`），补上后退出码 0；`pnpm run check`、`node --test tests/*.test.mjs` 见 PR 描述。`pnpm test` 没重跑：只动锁文件，依赖解析与 #503 测试时用的那份一字不差（就是那个工作区里改出来的同一份）。
- 验证：无。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：#503 合并到本 PR 合并之间，main 上 `--locked` 构建会失败（打包会断）；期间没有人从 main 打包过（install 记录仍是 `dcb99bd83d56`）。
- 本轮新坑：L-66。
- skill 进化：无。

## 接力模型搬进 host：platform 的 handoffs 原样移到 host/src/handoff/book（7a 批 2）（2026-11-21，Claude，常浩看 7a 分批计划后经 agent-hud 插件回「按推荐开工」，计划写明批 2 在 #491 合并后做；已提交、PR 见 PR 描述、未装机）

- 时间：开工 `2026-11-21 20:17`（`date '+%F %H:%M'` 记录）。来由：7a 批 2，评估原文第 2 节第 1 条第 2 步「把 handoffs 搬出 platform，和 Desk 放进同一个模块树」。#491 已在 `e361ed4` 合并，空档到了。
- 改变的行为：无。
- 你要求的：
  - `platform/src/clients/chatgpt/handoffs.rs` 与 `handoffs/`（含 `unsure/`、`tests/states.rs`）用 `git mv` 搬到 `host/src/handoff/book.rs` 与 `book/`；host 里 16 个文件的引用从 `agent_hud_runtime::chatgpt::handoffs` 改成 `crate::handoff::book`（`handoffs::` 前缀改 `book::`）；`handoff.rs` 挂 `pub(crate) mod book;`。
  - 接力模型原来用到的 platform 内部项：`claude_plugin` 改走 runtime 已有的再导出；runtime 加一行 `pub use agent_hud_platform::clients::codex;`；host 的 `Cargo.toml` 加工作区内的 `agent-hud-agents`（core、platform 早已依赖它，方向向下，不是新外部依赖）；通道的 `write_private` 改为公开。
  - 通道和接力共用的 `config.json` 读写（`config`、`set_config`、`config_path`、`read_small`、`data_shadow`）和私有目录（`private_directory`）收进 platform 新文件 `chatgpt/files.rs`：#491 的 `shadow.rs` 要读影子开关，留在 platform 更合适；`chatgpt/mod.rs` 里 `pub mod handoffs;` 换成 `pub mod files;`，行数不变。
  - 文档：`GLOSSARY.md`、`docs/chatgpt-channel.md`（审核门、接力状态、停着时到的回信三处路径）、`docs/LESSONS.md` 一处、几处代码注释改新路径。行数白名单条目随文件从 platform 路径换到 `host/src/handoff/book.rs`（上限 1583 → 1565，就是现在的行数）。
- 我顺手改的：搬成 crate 内私有后，编译器指出几项只有测试在用：`Book::round`、`Handoff::reviews`、`Handoff::chain`，以及 `chain_id`、`ledger`、`reviewed_commit` 的再导出（原来是 platform 的公开 API，不报）。都加了 `#[cfg(test)]`，测试一字没改；删不删留到批 3。`Earlier`、`doer_name` 两个再导出没人用，删了。
- 测试：没有新行为，没有「先红」。搬前搬后各跑一次 `cargo test -- --list`：接力模型 54 条一一对应（`book-tests-before/after.txt`），host 原有 190 条不变；字面量 1051 → 1048，少的 3 个（`"config"`、`"config.json"`、`"dataShadow"`）随设置文件读写搬去 `files.rs`。`pnpm run check` 退出码 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（cargo 合计 1115 通过 0 失败，和搬前同数；前端 `ℹ pass 513` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。证据在 `~/Library/Application Support/postpane/evidence/2026-11-21-7a-move-book/`。
- 验证：只有测试与清单比对。
- 截图：无。
- 发布与回读：未装机。行为不变；main 已含 #491（插件 0.2.6），它的装机另等常浩定，本 PR 不替它装。实机仍是 #494 的包（`dcb99bd83d56`）。
- 与授权不一致之处、遗留问题、范围外发现：
  - #442（`claude/439-relay-end`，11-19 起未动）碰 9 个接力文件，这次搬家后它要变基，路径要跟着改。
  - 批 3（按概念重组、消掉成对同名文件）下一步做；批 4 搁置。
  - 主线：接手成本与方案评估｜✅4 ▶1 📌1 ❓1：✅ 评估、第一批、日志落盘、#493 ▶ 7a（批 1 ✅、F-01 ✅、批 2 ✅ 本节、批 3 ⏳、批 4 ⏸）📌 7b ❓ 待常浩定的几项同 #493 那节。
- 本轮新坑：无。
- skill 进化：无。

## 接力重试：被同会话更新的接力顶替的失败接力不再重试（F-01）（2026-11-21，Claude，常浩看缺口说明后经 agent-hud 插件回「修 F-01」；已提交、PR 见 PR 描述、未装机）

- 时间：开工 `2026-11-21 18:35`（`date '+%F %H:%M'` 记录）。来由：7a 批 1 随机测试发现的缺口 F-01。「修 F-01」核对过：`<数据目录>/messaging/messages.json` 最近几条都不是发给本会话的。
- 改变的行为（上一轮回复里先列过）：同一会话先后两张接力都没打开时，在较旧那张失败卡上点「重试」，原来会重新打开它（之后较新那张迟到打开，就会有两张进行中的接力）；现在拒绝，卡上显示现有的报错「这次接力不能重试」。
- 你要求的：`platform/.../chatgpt/handoffs.rs` 的 `retry` 加查 `superseded`（和 `opened` 一样），注释同步，代码行数不变；`handoffs/tests/states.rs` 复现测试去掉 `#[ignore]`，随机测试恢复检查 I-06；`docs/chatgpt-channel.md`「接力状态」里 `retry` 的前提、I-06、F-01 改成已修。
- 我顺手改的：无。
- 同类：搜了能让失败接力重新进行中的入口（`retry`、`opened`/`opened_late`、`close_others`），`opened` 早已查被顶替，`close_others` 只结束，只有 `retry` 缺。
- 测试：先红后绿（`red.txt`：`f01_…` 与 `t10` 都 FAILED，`retried=true bound=true: 2 live handoffs of s1`；`green.txt`：接力相关 `54 passed; 0 failed`）。变基到 `e361ed4`（含 #491）后：`pnpm run check` 退出码 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（cargo 合计 1115 通过 0 失败 0 忽略，前端 `ℹ pass 513` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。证据在 `~/Library/Application Support/postpane/evidence/2026-11-21-f01-retry-superseded/`。
- 验证：只有测试。实机造这个场景要两次打开失败再迟到打开，没做。
- 截图：无。
- 发布与回读：未装机。开工后 main 合进了 #491（影子读取，插件 manifest 升到 0.2.6）；装含它的包会让设置页提示「需要重新加载插件」，而 #491 的装机、重载插件、开开关按它的交接另等常浩定，所以本 PR 不替它装。实机仍是 #494 的包（`dcb99bd83d56`）。
- 与授权不一致之处、遗留问题、范围外发现：#491 已合并，7a 批 2、3 的搬家空档到了（#442 仍开着，搬完要变基）。
  - 主线：接手成本与方案评估｜✅4 ▶1 📌1 ❓1：✅ 评估、第一批、日志落盘、#493 ▶ 7a（批 1 ✅、F-01 ✅、批 2 ⏳ 可开工、批 3 ⏳ 等批 2、批 4 ⏸）📌 7b ❓ 待常浩定的几项同 #493 那节。
- 本轮新坑：无。
- skill 进化：无。

## 接力第 1 批影子读取：另加一路读 ChatGPT 对话数据，只记录，默认关（#488）（2026-11-21，Claude，常浩 11-20 经侧栏回「做影子运行」，看三处推荐后在父会话回「按推荐开工」＝三处按推荐并授权 L3 开工和送审；PR #491 squash 合并（常浩选乙：P2-13 修完不再审、直接合并）、未装机、插件 0.2.6 未重新加载、开关没打开）

- 时间：开工 `2026-11-20 23:35`（`date '+%F %H:%M'` 记录）。来由：接力根治第 1 批，探测（#487）验证对话数据读得到之后的下一步。读页面那一路照旧作数，新加的一路只记录，用来攒证据决定以后要不要切换。「按推荐开工」是父会话转来的，动手前在父会话记录里核对过原话和它回答的问题。
- 改了哪些文件：
  - 常浩要求的：
    - `src/apps/chrome-extension/data.js`（新）：跑在页面自己的运行环境里。旁听页面发往 `/backend-api/` 的请求，把登录请求头留在自己内部；收到指令时取最近 2 轮（提问不在里面、前面还有时再取一次 10 轮），校验结构，按「提问 → 同一轮 → `final` 频道的回信 → 四个完成标记」认回信，只交回摘要（没有正文和登录信息）。
    - `src/apps/chrome-extension/content.js`：新增 `data` 指令，把读取请求转给 `data.js`、把摘要带回；标签页显示的不是这个会话、或页面里没有 `data.js` 时如实回。
    - `src/apps/chrome-extension/background.js`：开关（驿窗在 `watch` 里带 `shadow: true`）开着才登记 `data.js`，关了撤掉，以插件自己存下的状态为准；三种触发（页面报回信、驿窗重读、发出 20 秒后），每条提问每种最多一次；不是 200 该会话停读，401 / 403 / 429 全部停，停的状态存下来、插件后台重启后仍有效；只读名单里的会话、只在连着驿窗时读。
    - `src/apps/chrome-extension/manifest.json`：0.2.5 → 0.2.6。
    - `src/crates/platform/src/clients/chatgpt/shadow.rs`（新）：读开关（`config.json` 的 `dataShadow`），把插件报来的 `shadow` 追加成 `shadow.jsonl` 的一行（只有本人可读写，超过 4096 字节的不记，不在名单里的不记）。
    - `src/crates/platform/src/clients/chatgpt/mod.rs`、`handoffs.rs`、`handoffs/gate_io.rs`：`watch` 带开关；收到 `shadow` 只记录，不通知接力状态机。
    - `scripts/relay-shadow-report.mjs`（新）：影子记录对 `handoffs.json`，按切换门槛出结果。
    - `docs/chatgpt-channel.md`（消息表两处 +「影子读取」一节）、`AGENTS.md`「AI 接入」、`src/packages/app/src/settings/AiAccessPane.tsx`（「读」「写到」两行补文字，版式不动）、`docs/DECIDED.md`（已登记 DECIDED.md）。
  - 我顺手改的：
    - `src/crates/platform/src/clients/chatgpt/watched.rs`（新）：名单的结构、读写、增补、名单消息从 `mod.rs` 原样搬过来（`mod.rs` 612 → 554 行，行数棘轮不许它变长），对外的名字不变。`src/tooling/file-size-baseline.json` 跟着收紧。
    - `docs/LESSONS.md`：给 L-63（主分支 #490 刚记的同一条测试偶发失败）补了一条，原因坐实；`tests_unix.rs` 里起 `Channel` 的测试加了同一把测试锁 `one_channel()`，一次只跑一个。
  - 改变了已有行为：开关关着（默认）时没有；`watch` 消息只在开关开着时多一项 `shadow`。开关开着时，每条提问多出最多三次只读请求、插件多发一种消息、驿窗多写一个文件，接力的认领、转回、停下都不变。
- 测试：`pnpm run check` 退出 0；`pnpm test` 原样结果 `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 488` / `ℹ fail 0`，Chrome 插件 `ℹ pass 83` / `ℹ fail 0`，其余 `ℹ pass 9`、`14`、`11` / `ℹ fail 0`；cargo 各套合计 1083 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 63` / `ℹ fail 0`；`node scripts/check-rules.mjs` `通用规则检查通过`。先红：`data.js`、后台脚本、驿窗三处都先跑红再写实现（`red-data.log`、`red-background.log`、`red-rust.log`）；内容脚本那两条测试是和实现一起写的，没有先红。中途失败过三次：格式检查（三个测试文件）、平台检查（共用测试里一处 `#[cfg(unix)]`）、行数棘轮和 L-63 那条偶发失败，都修掉后重跑全过。之后变基到 `e6ccc5c`（#489、#490），`CURRENT.md`、`docs/LESSONS.md` 有冲突已解，变基后重跑的结果写在 PR。
- 验证：只在测试里验证（替身：假页面、假扩展接口、无头 Chromium）。**未在真实环境验证**：没装机、没在真实 Chrome 里加载 0.2.6、没打开开关、没对真实 chatgpt.com 读过；差的是「页面别的请求带的登录信息够不够用」「`data.js` 包一层 `fetch` 后页面是否一切照常」「生成中数据长什么样」，都要打开开关后由影子记录回答。
- 截图：无（设置页只改了两行文字，没截图；版式没动）。
- 发布与回读：未发布。装机会顶掉现在装着的包，要常浩另行点头；装完要他在 Chrome 里重新加载插件；开关也要他另行点头才打开。
- 与授权不一致之处、遗留问题、范围外发现：
  - 授权不包括、都没做：打开开关、装机、切换成正式读法。
  - 开关改了要重启驿窗才生效（驿窗只在插件连上和新开会话时发名单）；设置里没有这个开关的界面（常浩选的）。
  - 证据在 `~/Library/Application Support/postpane/evidence/2026-11-20-488-relay-shadow/`（`check.log`、`test.log`、`root-tests.log`、三份先红）。
  - 和 #442（未合并）有两处文档挨着：`AGENTS.md`、`docs/chatgpt-channel.md`，各改不同的段，合并时可能要手工对一下。
  - 主线：接力根治｜完成 6/14：✅ S1（#423）✅ 按提问编号认领（#437）✅ 全链路梳理 ✅ 第 0 批止血代码（#441、#451、#468）⏳ 第 0 批实机验证（代码已装上：11-20 17:02 别的会话从 `claude/480-pendant-hover` `7e65af9` 装的包里有 #441、#451、#468，不用再等 #442；等常浩重载插件 0.2.5，装机后还没走到要验的两条路径）✅ 另外三处规则文字 ✅ 第 1 批只读探测（#487）✅ 第 1 批影子运行代码（本节，PR #491 已合并）⏳ 影子运行实测（装机、重载插件 0.2.6、打开开关、攒够门槛、切换成正式读法，都另等常浩定）❓ 补格式没送成怎么处理 ❓ #470 点过发送后要不要取消自动再试 ❓ 第 2 批回执与重拉（并 #431、#433、#443、#444、#463）❓ 第 3 批分级恢复（并 #434）❓ 第 4 批体检与防回退 ❓ 规则与现状对不上两处（梳理报告第六节）；#432 排查单另算。
- L3 审查第 1 轮（受审 `babd6ba`，11-21 09:39 回信，返修：P1 3 条、P2 4 条）的返修（11-21 开工 `09:45`）：
  - P1-01：去掉 `window.postMessage` 那条通道。`data.js` 在 `window` 上只放一个不可改写的句柄，插件后台用 `chrome.scripting.executeScript`（页面运行环境）直接调用它，结果经插件内部通道带回。`data.js` 只读当前显示的会话、10 分钟最多 12 次请求。插件后台和驿窗两头按字段白名单校验，记录里不会有自由文字。剩下一部分防不住：专门针对驿窗、又先于它跑起来的页面顶层脚本，可以先占住句柄、给假摘要；这类脚本本来就握着整个登录会话，送审时提议这部分判定不成立。
  - P1-02：关开关时撤掉登记（回查确认），再到每个开着的 chatgpt.com 标签页调用 `stop()`（清登录信息、不再旁听、放回页面的 `fetch`）。够不着的标签页记成「撤销未完」，驿窗每发一次名单就重试；撤销结果报给驿窗一条 `why: "off"` 记录，开关关着也记。
  - P1-03：读取账本（会话 → 提问 → 读过的原因）存进插件的本地存储，先记账再读，插件后台重启后同一条提问不再读。
  - P2-01：提问必须是用户消息，回信必须和提问同一个 `turn_exchange_id`；提问没有它、或 `has_previous_page` 不是布尔值，报读不懂。不知道是哪条提问时不读，报 `no-prompt`；页面报回信时带的提问编号回填进账本。
  - P2-02：对账脚本里 `no-script` 之后同一条提问没再读成的算漏读；「认到的提问都在 `handoffs.json` 里」加进门槛。
  - P2-03：打开开关时，给已开着的每个 chatgpt.com 标签页补装 `data.js`。
  - P2-04：驿窗写入前核对已有的 `shadow.jsonl` 是普通文件、只有本人能读写，不是就不写。
  - 顺手：内容脚本里不再用的 `data` 指令删掉了（`content.js` 回到和 main 一样）；每条影子记录都带上要找的提问编号 `asked`。
  - 返修后三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 488` / `ℹ fail 0`，Chrome 插件 `ℹ pass 91` / `ℹ fail 0`，其余 `ℹ pass 9`、`14`、`11` / `ℹ fail 0`；cargo 合计 1093 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 63` / `ℹ fail 0`；`node scripts/check-rules.mjs` `通用规则检查通过`（`check-r2.log`、`test-r2.log`、`root-tests-r2.log`）。第 2 轮复审未送，交给接手的会话。
  - 这轮的测试是和修法一起写的，没有先红；改为把新测试放到 `babd6ba` 的插件代码上跑，审查指出的几组都失败（`round2-red.log`：16 过 29 败），换成这轮的代码全过。
- L3 审查第 2 轮（受审 `ec0dabf`，11-21 10:21 回信，返修：未决 P1 3 条，新增 P2-05、P2-06、P2-07；P2-01、P2-04 已关）的返修（接手会话做；开工时没用 `date` 记，第一次记录是 11-21 `12:00`）：
  - P1-01（常浩 2026-11-21 回「开始，P1-01 接受」：剩余风险接受，只靠 `trusted` 标记加门槛排除兜底）：`data.js` 发现句柄已在一律让开、返回 `present`（装上返回 `installed`）；一跑起来就取下读取用的原生方法；插件后台按 `executeScript` 的 `documentId` 记下自己补装过的页面（`shadowDocs`：晚装 / 冲突），晚装页面的结果加 `trusted: false`，冲突页面只报 `conflict`，其余 `trusted: true`；驿窗白名单加 `trusted`，对账只计 `trusted: true`。原拟「闭包私有 Symbol 认自己的句柄、再执行时重新启用」做不到（L-65），改成已有句柄一律当冲突。文档写明两种剩余风险已被接受，补「读页面画面那一路同样可被页面伪造」这条论据。
  - P1-02：`data.js` 每次读取一个 `AbortController`，`stop()` 全部中止；每次请求前现取登录信息，每个 `await` 后都核对停用；句柄去掉 `start()`，停用是永久的（关掉再打开后开着的页面要刷新才重新读）。插件后台加代次 `generation` 和在途集合 `inflight`：读取每一步后代次变了就停，只报 `superseded`；补装前也核对；`disarm()` 停一遍、等在途全部结束、再停一遍。
  - P1-03：读取账本恢复失败就一律不读、不补装、不写存储，只报 `ledger-unavailable`。
  - P2-02：补证要同会话、同一条要找的提问、实际找到的就是它、`askFound`、回信编号和页面那一路相同、可信且写完；补上的那几次的提问也要在 `handoffs.json` 里。
  - P2-03：开开关时登记失败、或没被丢弃的标签页装不进去，记 `shadowArm.pending`，每次名单都重试（后台重启后也接着试）。
  - P2-05：20 秒定时器带上当时的提问编号；账本按「会话:提问」记。
  - P2-06：回信正文要是 `text` 类型、`parts` 为全字符串的非空数组，不是就报读不懂。
  - P2-07：`bytes` 改成 UTF-8 字节数。
  - 白名单收紧（审查建议）：编号只认 UUID；`role`、`channel`、`status`、`type`、`finish` 只认约定的词（认不出记 `other`），`asyncStatus` 只记有没有；驿窗另把 `why`、`outcome`、`pageOutcome`、`login` 改成枚举；`askFound` 为真时 `prompt` 必须等于 `asked`。插件、驿窗、对账脚本三处同步。
  - 改了哪些文件：`data.js`、`background.js` 及两份测试，`shadow.rs`、`tests.rs`、`tests_unix.rs`，`scripts/relay-shadow-report.mjs` 及测试，`docs/chatgpt-channel.md`「影子读取」，`docs/LESSONS.md`（L-65），本文件。改变了已有行为：只在开关开着时（默认关）——补装页面的结果不再算数、关掉再打开后开着的页面要刷新才重新读。
  - 返修后三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 488`，Chrome 插件 `ℹ pass 104`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1094 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 63` / `ℹ fail 0`；`node scripts/check-rules.mjs` `通用规则检查通过`（`check-r3.log`、`test-r3.log`、`root-tests-r3.log`）。
  - 先红：本轮新测试放到 `ec0dabf` 的插件代码和对账脚本上跑，34 过 27 败，22 条是审查指出的各组，另 5 条是临时目录读不到 Rust 源文件、与本轮无关（`round3-red.log`、`round3-red-说明.txt`）。
  - 验证只在替身上（vm 里的假页面、假扩展接口）；**未在真实环境验证** MAIN 世界执行顺序、`documentId` 和脚本返回值、关闭竞态。
- L3 审查第 3 轮（受审 `d6c5de9`，11-21 回信，返修：未决 P1 3 条，新增 P2-08、P2-09、P2-10；P2-03、P2-05、P2-06、P2-07 已关）的返修：
  - P1-01：可信改成要正面证据：后台记下登记时间，读完再在插件自己的隔离环境里按同一个 `documentId` 取页面开始加载的时间，比登记晚 5 秒以上、又没补装过才可信；补装记录淘汰、没拿到 `documentId` 都不会变成可信。句柄改放在固定属性名 `window.__postpaneData` 上，后台按名字取，页面换掉 `Symbol.for` 也指不到别处。
  - P1-02：开关切换排队一件件做（在途工作照旧立刻停）；关开关等在途全部结束后再撤一次登记并回查。
  - P1-03：账本没恢复时不登记，已有的登记撤掉、开着的页面停一遍。
  - P2-02：对账的「之后」按文件里的行序，不按时间戳。P2-08：开关关着、或送话途中切换过，送话结果什么都不记。P2-09：同一会话送两次、后送的先回来，记后送那次的提问。P2-10：Rust 的数值和 `sha` 跟插件后台一样严。
  - 改了哪些文件：`data.js`、`background.js` 及两份测试，`shadow.rs`、`tests.rs`，`scripts/relay-shadow-report.mjs` 及测试，`docs/chatgpt-channel.md`，`docs/LESSONS.md`（L-65 补充）。改变了已有行为：只在开关开着时——句柄的名字变了（插件内部，没有别处用）；开关切换改成排队做。
  - 返修后三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 488`，Chrome 插件 `ℹ pass 110`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1094 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 63` / `ℹ fail 0`；`check-rules` 通过（`check-r4.log`、`test-r4.log`、`root-tests-r4.log`）。
  - 先红：新测试放到 `d6c5de9` 上跑，41 过 26 败，本轮台账对应的 7 条都失败（`round4-red.log`、`round4-red-说明.txt`）。
  - 失误：跑第 4 轮全量时脚本里的日志名还是 r3，覆盖了第 3 轮的 `check-r3.log`、`test-r3.log`，发现后立即停掉、改名标明，说明在 `r3日志被覆盖-说明.txt`；第 3 轮结果以本节上一条和送审记录为准。
  - 验证仍只在替身上；**未在真实环境验证**。
- L3 审查第 4 轮（受审 `18f04eb`，11-21 回信，返修：未决 P1 3 条和 P2-08；P2-02、P2-09、P2-10 已关）的返修：
  - P1-01：不再比较页面的 `performance.timeOrigin` 和后台的 `Date.now()`（一个走单调时钟、一个随系统校时跳）。改为和 `data.js` 同一次登记一份 `mark.js`（插件隔离环境，`document_start`），它在页面里插件自己的环境留一个标记；读完按同一个 `documentId` 查标记，有才可信。补装只装 `data.js`，没有标记。
  - P1-02：每次切换带上自己的代次，每个异步步骤之后都核对，变了就停在那一步；存开关状态用这一次要的值；`arm()` 自己也核对代次和开关；关开关时只要可能还登记着（存的状态、未完的撤销、回查到登记，任一样）就照常撤销。
  - P1-03：账本没恢复时，撤销和停用的结果都记进 `shadowArm`（`unregistered`、停不了的标签页），每次名单再试，不当成已清理。
  - P2-08：20 秒定时器带上送话时的代次，到点再核对；开关一切换，还没到点的定时器全部取消。
  - 改了哪些文件：`background.js` 及测试，新文件 `mark.js`，`docs/chatgpt-channel.md`，`docs/LESSONS.md`（L-65 补充改写）。改变了已有行为（只在开关开着时）：多登记一份 `mark.js`；可信的依据从加载时间换成标记。
  - 返修后三条全量：`pnpm run check` 退出 0（第一次因新文件 `mark.js` 没加入暂存区停在未提交检查，`git add` 后重跑通过，两份日志都留着）；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 488`，Chrome 插件 `ℹ pass 114`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1094 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 63` / `ℹ fail 0`；`check-rules` 通过（`check-r5.log`、`test-r5.log`、`root-tests-r5.log`）。
  - 先红：新测试放到 `18f04eb` 上跑，本轮台账对应的 5 条都失败（`round5-red.log`、`round5-red-说明.txt`）。
  - 验证仍只在替身上；**未在真实环境验证**（`mark.js` 和 `data.js` 在真实 Chrome 里是否同时注入、隔离环境的标记能否按 `documentId` 读到，要装机后实测）。
- L3 审查第 5 轮（受审 `5c6c2c9`，11-21 回信，返修，到顶）：P1-02、P1-03、P2-08 关闭；未决 P1-01（`mark.js` 只证明自己跑过，没证明 `data.js` 装上了句柄）和新的 P1-04（「存的是关、登记还在」时撤销前没先落盘待撤销，中途被终止会漏停页面）。驿窗停下。常浩 2026-11-21 经侧栏回「甲：再审一周期」（上级会话转达原话「甲：再审 3 轮」），授权新周期、上限 3 轮。
- 新周期第 1 轮的返修：
  - P1-01：`data.js` 第一件事就放句柄，准备完之前、或准备中途出错，读取只回 `failed`，页面也换不掉这个句柄；新增结果 `failed`（插件、驿窗白名单同步）。
  - P1-04：`disarm()` 第一步先落盘 `shadowDisarm.pending`，全部确认才清；查不到标签页列表记 `unlisted`、算没完；账本未恢复的清理同样记 `unlisted`。
  - 改了哪些文件：`data.js`、`background.js` 及两份测试，`shadow.rs`，`docs/chatgpt-channel.md`。改变了已有行为（只在开关开着时）：读取多一种结果 `failed`。
  - 返修后三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 488`，Chrome 插件 `ℹ pass 117`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1094 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 63` / `ℹ fail 0`；`check-rules` 通过（`check-r6.log`、`test-r6.log`、`root-tests-r6.log`）。
  - 先红：新测试放到 `5c6c2c9` 上跑，本轮对应的 3 条都失败（`round6-red.log`、`round6-red-说明.txt`）。
  - 验证仍只在替身上；**未在真实环境验证**。
- 新周期第 1 轮（受审 `6fa5a3f`，11-21 回信，返修）：P1-04 关闭；P1-01 仍未决（`mark.js` 执行不等于 `data.js` 执行；放句柄失败被当成 `present`）。第 2 轮的返修：
  - `data.js` 放好句柄之后、页面还在加载时，往文档里插一个空元素 `<postpane-installed>` 当凭证；`mark.js` 只在看到凭证时才留标记，并拿掉凭证。`document_start` 时页面的内容和脚本都还没有，凭证只可能是扩展脚本放的。`data.js` 没跑、句柄没放上、`mark.js` 先跑，都不可信。
  - 放句柄失败报 `unavailable`，不当成已有句柄，也不留凭证。
  - 改了哪些文件：`data.js`、`mark.js`、`test/data.test.mjs`、`docs/chatgpt-channel.md`。
  - 三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 501`，Chrome 插件 `ℹ pass 119`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1098 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`；`check-rules` 通过（`check-r7.log`、`test-r7.log`、`root-tests-r7.log`）。
  - 先红：两条新用例放到 `6fa5a3f` 上跑都失败（`round7-red.log`、`round7-red-说明.txt`）。
  - **未在真实环境验证**；真实 Chrome 里如果隔离环境那份总是先跑，所有读取都会不可信，要装机实测。
- 新周期第 2 轮（受审 `a939d7f`，11-21 回信，返修）：P1-01 仍未决：文档是各扩展共享的，别的扩展只插一个同名元素就能让 `mark.js` 误标。第 3 轮的返修：
  - `data.js` 放好句柄后生成只有自己知道的随机码，写在凭证上；`mark.js` 只在恰好一个凭证、随机码格式对时收进隔离环境，并拿掉所有凭证。
  - 后台读完后按同一个 `documentId` 取随机码，再现做随机数，让页面句柄算「随机码:随机数」的 SHA-256（`prove`），对上才可信。别的扩展插的凭证，页面句柄答不出。
  - 改了哪些文件：`data.js`、`mark.js`、`background.js`、两份插件测试、`docs/chatgpt-channel.md`。
  - 三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 501`，Chrome 插件 `ℹ pass 121`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1098 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`；`check-rules` 通过（`check-r8.log`、`test-r8.log`、`root-tests-r8.log`）。
  - 先红：本轮关键用例放到 `a939d7f` 上都失败（`round8-red.log`、`round8-red-说明.txt`）。
  - **未在真实环境验证**。
- 新周期第 3 轮（受审 `83f3d81`，11-21 回信，决策升级）：随机码挑战获认可；P1-01 改为「待决策」：先于驿窗控制页面环境的其他扩展能改掉内建方法换句柄、控制随机码；新增 P2-11 文档漏写 `prove`。常浩经驿窗侧栏回「甲：扩大接受再审1轮」。之后只改文档：「风险和防不住的」扩大到这一整类、补写 `prove`；已登记 DECIDED.md；合并 main（#499、#500），只解了 CURRENT 冲突。代码没改。再审第 1 轮（受审 `1ee1d01`）出口返修、未决 P0 0 P1 0：P1-01 判定不成立，P2-11 关闭，新增 P2-12（文档补写原型篡改能绕过 12 次请求上限）。常浩回「甲：再审1轮」，补写了 P2-12、合并 main #501（只解 CURRENT 冲突）。再审第 2 轮（受审 `ef2f9c9`）出口决策升级、未决 P0 0 P1 0：P2-12 关闭，新增 P2-13（请求计数用页面环境的 `Date.now`，页面改掉就能绕过上限）。常浩选乙（经数字分身会话转达，他亲手打字「乙」）：修完不再审、直接合并。已修：`data.js` 加载时取下 `Date.now`，计数用取下的这份；新增测试「页面改了 Date.now 后第 13 次仍 limited」（放到 `ef2f9c9` 上先红，`round11-red.log`）；文档「取下原生方法」补上 `Date.now`。三条全量：`pnpm run check` 退出 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（前端 `ℹ pass 513`，Chrome 插件 `ℹ pass 122`，其余 `ℹ pass 9`、`14`、`11`，各 `ℹ fail 0`；cargo 合计 1114 通过 0 失败）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`；`check-rules` 通过（`check-r11.log`、`test-r11.log`、`root-tests-r11.log`）。之后 squash 合并。L3 审查共 11 轮：未决 P0 0、P1 0；P1-01 按常浩扩大的风险接受判定不成立，其余 P1、P2-01 至 P2-12 已验证关闭，P2-13 修完按常浩决定未再审。下一步都待常浩定：装机、在 Chrome 重新加载插件 0.2.6、打开 `dataShadow`、攒够门槛后是否切换成正式读法；真实 Chrome 要先验两个世界的执行先后和凭证、挑战是否走得通（替身上验不了）。
- 本轮新坑：L-65（第 1 轮另给 L-63 补了一条，第 3、4 轮审查给 L-65 补了一条）。

## 接力状态：补状态转移表、不变量和随机序列测试（7a 批 1）（2026-11-21，Claude，常浩看 7a 分批计划后经 agent-hud 插件回「按推荐开工」；已提交、PR 见 PR 描述、无需发布）

- 时间：开工 `2026-11-21 17:54`（`date '+%F %H:%M'` 记录）。来由：接手成本评估第二批 7a（评估原文第 2 节第 1 条：接力分在两个 crate、状态多维）。批 1 先补护栏，批 2、3 搬家要用它兜底。「按推荐开工」这条回复核对过：`<数据目录>/messaging/messages.json` 最近几条都不是发给本会话的。
- 你要求的：
  - `docs/chatgpt-channel.md` 加「接力状态」一节：能出现的 status×phase 组合、每个移动的前提和结果（对应测试名）、九条不变量 I-01–I-09、缺口 F-01。
  - `platform/.../chatgpt/handoffs/tests/states.rs`（新）：`t01`–`t09` 每行转移一条；`t10` 固定种子随机跑 300 组×120 步、每步查全部不变量，按编号汇总第一个反例；`f01_…` 复现缺口（`#[ignore]`）。`handoffs.rs` 的 `mod tests` 里加一行 `mod states;`（测试模块，不计 300 行基线）。
- 我顺手改的：无。没有改任何业务代码。
- 发现（待常浩定，没修）：F-01，同一会话先后两张接力都没打开，重试较旧那张、较新那张又迟到打开，就有两张进行中的接力（I-06 被打破）。原因是 `retry` 只看同会话有没有进行中的，不像 `opened` 那样看有没有被更新的顶替。修法很小（`retry` 也拒绝被顶替的），但会改变「点旧的失败卡上的重试」的结果，所以先问。另记一条约定：`Book` 不拦在 `opening` 上续接，「opening 一定是 sending」没写成不变量。
- 测试：转移测试是给现有行为照相，第一次跑就过，没有「先红」；随机测试第一次跑红在 I-06（`states-first-run.txt`、`states-all-findings.txt`，300 组里只有这一条不变量被打破），复现单独跑 `retried=true bound=true: 2 live handoffs of s1`（`f01-repro.txt`）。`pnpm run check` 退出码 0；`pnpm test` `全量测试汇总：6 套，失败 0 套`（cargo 合计 1107 通过 0 失败 1 忽略，前端 `ℹ pass 513` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 61` / `ℹ fail 0`。证据在 `~/Library/Application Support/postpane/evidence/2026-11-21-7a-relay-states/`。
- 验证：无（只加了测试和文档）。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 批 2、3（搬家、按概念重组）按计划等 #491 合并后的空档做；#442 自 11-19 未动，搬完它要变基。批 4（合并 Status/Phase）搁置。
  - 主线：接手成本与方案评估｜✅4 ▶1 📌1 ❓1：✅ 评估、第一批、日志落盘、#493 ▶ 7a（批 1 完成；F-01 待定；批 2、3 等 #491；批 4 搁置）📌 7b 命令名、事件名集中到 protocol 包 ❓ 待常浩定的几项同 #493 那节。
- 本轮新坑：无。
- skill 进化：无。

## 插件版本校验验收，登记 DECIDED.md（#493）（2026-11-21，Claude，常浩在接手会话回「验收」；已提交、PR 见 PR 描述、无需发布）

- 时间：开工 `2026-11-21 17:41`（`date '+%F %H:%M'` 记录）。来由：#493（PR #494，`9cce003`）合并装机后，常浩自己看了设置页两处，回「验收」（本会话申请后台控制读设置窗口，系统授权框被拒绝，没读到）。
- 改了哪些文件：`docs/DECIDED.md` 末尾加一行（期望版本的来源和比法、设置两处在一致和不一致时的显示、接力回复与报错的提醒、日志、不提示的情况）；本节。
- 测试：`node --test tests/*.test.mjs` 与 `node scripts/check-rules.mjs` 见 PR 描述。没有改代码，没跑 `pnpm run check`、`pnpm test`（只动了两份文档）。
- 验证：无（纯文档）。
- 截图：无。
- 发布与回读：无需发布。实机仍是 #494 那份包（`dcb99bd83d56`）。
- 与授权不一致之处、遗留问题、范围外发现：验收只覆盖版本一致时的显示，不一致的三种显示和接力提醒只有测试，登记行备注里写明了。主线「接手成本与方案评估」#493 完成，剩第二批 7a、7b 和一组待常浩定的事（见 #493 那节的主线一行）。
- 本轮新坑：无。
- skill 进化：无。
- 已登记 DECIDED.md。

## 插件版本校验：比对 Chrome 插件报的版本，不一致时在设置两处和接力回复里提示（#493）（2026-11-21，Claude，常浩看过计划后回「按推荐开工」；已提交、PR 见 PR 描述；接手会话补出错提醒后重装、按授权 squash 合并，设置页实机显示等常浩看）

- 时间：开工 `2026-11-21 09:28`（`date '+%F %H:%M'` 记录）。来由：接手成本评估第二批第二项。插件连上时 `hello` 带版本，驿窗只存不比；装了新驿窗、忘了在 Chrome 里重新加载插件时没有任何提示。中途从 Fable 切到 Opus 5.5 继续（常浩让「额度不足切 Opus 5.5 high」）。
- 改变的行为（计划里列过，常浩同意）：设置「智能体插件」ChatGPT 行，连着时原来只写「已连接」，现在版本一致写「已连接 · 0.2.5」，插件旧了写黄色「需要重新加载插件」，插件新了写「需要重装驿窗」，下面一行写两边版本和怎么做；「AI 接入」执行方状态章在不一致时由绿色「可用 · 插件已连上」改成橙色「可用 · 插件要重新加载」或「可用 · 驿窗要重装」；`relay_to_chatgpt` 版本不一致时照常发出，回复 `message` 末尾多一句提醒；连上时版本不一致日志写一行。没报版本或认不出的不提示。侧栏不变。
- 改了哪些文件：
  - `src/crates/platform/src/clients/chatgpt/version.rs`（新）：`include_str!` 同一仓库插件 manifest 取期望版本；`fit` 点分数字逐段比（末尾的 0 不算）；`note` 出提醒文字；`hello` 记版本并在不一致时写日志。`mod.rs` 加 `pub mod version;`，`hello` 两行换成一行，行数不变（在 300 行基线上）。
  - `src/crates/host/src/chatgpt.rs`：设置状态加 `expectedVersion`、`versionFit`；新 `version_note`。`src/crates/host/src/handoff.rs` 的 `relay` 末尾加 4 行把提醒接到回复里（白名单上限 1986，现在 1984）。
  - `src/packages/app/src/lib/chatgpt-row.ts`（新）：ChatGPT 行的判定从 `agent-plugins.ts` 挪过来（我顺手改的：原文件在行数基线上只许变短，挪完降到 300 行以下、移出基线），加版本三种状态和 `chatgptInput`（`ClientCards.tsx` 改用它，短了 11 行）。`lib/ai-access.ts` 的 `executorState` 加两种橙色状态；`settings/agent-plugins/services.ts` 类型加两项。
  - 测试：`version.rs` 4 条、host 设置状态 1 条（扩写）、`agent-plugins.test.ts` 1 条、`ai-access.test.ts` 1 条。
  - 文档：`AGENTS.md`「AI 接入」、`docs/chatgpt-channel.md` 加「插件版本校验」一条。`src/tooling/file-size-baseline.json` 收紧。
- 测试：7 条新测试先红后绿（`red-app.txt` `ℹ fail 2`、`red-platform.txt` `0 passed; 4 failed`、`red-host.txt` `0 passed; 1 failed`）。第一次全量（09:40，负载均值 42–63）：`pnpm run check` 退出码 0；`pnpm test` `全量测试汇总：6 套，失败 2 套`，挂的是 L-63 那条 platform 测试和 Chrome 插件 `a script put in mid-reply reports that reply when it ends`（本分支没改 `src/apps`），单独重跑 platform `299 passed; 0 failed`、Chrome 插件连跑 3 次都 `ℹ pass 61` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 60` / `ℹ fail 0`。负载降下来后重跑（09:57）：`全量测试汇总：6 套，失败 0 套`（cargo 合计 1091 通过 0 失败，前端 `ℹ pass 490` / `ℹ fail 0`）。clippy 报 `handoff.rs:1371`，是 11-19 `3d97f61` 留下的，不是本次改动。
- 验证：
  - 实机（`install.sh` 装到 `/Applications`）：插件转接进程（`agent-hud-engine chrome-extension://fjjb…`）在新应用启动后连上；日志 `logs/postpane.log` 里没有「ChatGPT extension connected as」一行，说明后端判定插件版本和期望版本一致（Chrome 里的插件是 0.2.5）。
  - 没验的：设置页两处的实机显示。我申请后台控制驿窗窗口去看，常浩拒绝了；「已连接 · 0.2.5」只有前端测试和后端数据核对，是替身通过。不一致时的三种显示和接力提醒实机造不出来（要改常浩正在用的插件），只有测试。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-21-493-extension-version/`：`smoke-before-1.png`、`smoke-before-after-1.png`（装前侧栏正展开着 Claude 的卡、装后收起，差 48.81% 是这个，票根一致）。
- 发布与回读：`install.sh 493-extension-version --takeover`（接管的是本会话 #486 装的包，内容已合并），原样输出在证据目录 `install.log`：`产物 a638a2229b0a / 已装 a638a2229b0a`；`冒烟：侧栏在动`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-21-493-extension-version/PostPane-dba8c904f9eb.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - PR 未合并：上下文到 53% 收尾，合并留给接手会话（全量已绿，可按「绿 PR 直接合并」授权合）。
  - 设置页实机显示等常浩自己看一眼，或同意后台控制驿窗后再回读。
  - `pnpm run lint` 在 main 上本来就不过，新增一处范围外记录：`host/src/handoff.rs:1371`（`then(..).unwrap_or_else(..)` 可写成 if/else）。
- 接手续做（交接卡会话，开工 `2026-11-21 16:45`，`date` 记录；常浩 11-21 在拍板清单回「A 组都按推荐」，推荐原文「开始；接手会话先补出错时的版本提醒和测试，再合 #494」，并在原会话亲自回「开始」）：
  - 你要求的：`relay` 里 `start(...)` 出错时，报错末尾也带版本提醒（原来只有发出成功的回复带）。出错和成功都走新的 `host/src/chatgpt.rs` `noted`；参数校验类的早期报错（不是 Claude/Codex 会话、没有会话 id）不加。`handoff.rs` 净短 1 行（1983）。
  - 我顺手改的（改变了行为，动手前在会话里列过）：`platform/.../chatgpt/mod.rs` 新连接时清空上一条连接的 `hello`，收到新 `hello` 前设置页写「已连接」不带版本、不误报不一致；`hello` 分支三行并一行，行数不变（612）。另补 `chatgptInput` 映射测试（`agent-plugins.test.ts`）。
  - 测试：两条新 Rust 测试先红后绿（`red-relay-error-note.txt` `0 passed; 1 failed`；`red-hello-reset.txt` `0 passed; 1 failed`，验红时临时去掉修复、同一条命令里还原）。变基到 `b1796a5`（含 #497）后：`pnpm run check` 退出码 0（第一次被 `check-test-paths` 拦下：测试把 `tempdir()` 根目录交给 `Shared::new`，改成 `temp.path().join("data")`）；`pnpm test` `全量测试汇总：6 套，失败 0 套`（cargo 合计 1097 通过 0 失败，前端 `ℹ pass 504` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 61` / `ℹ fail 0`。
  - 发布与回读：`install.sh 493-extension-version --takeover`（接管 `359-494-combo` 的合装包 `59301ee8eaa1`，#359 已合进 main、新包含它），`产物 dcb99bd83d56 / 已装 dcb99bd83d56`，`冒烟：侧栏在动`；插件转接进程 `agent-hud-engine chrome-extension://fjjb…` 在 16:59 启动后连上，`logs/postpane.log` 没有版本不一致那一行。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-21-493-extension-version/PostPane-59301ee8eaa1.app" /Applications/PostPane.app; open /Applications/PostPane.app`。证据在同一证据目录 `r2-*`。
  - 没验的：出错路径带提醒只有 `noted` 的单元测试和代码走读，`relay` 本身要 `AppHandle`、没有测试桩；实机造不出版本不一致。设置页「已连接 · 0.2.5」仍等常浩看。
  - 主线：接手成本与方案评估｜✅3 ▶1 📌2 ❓1：✅ 评估、第一批（#485）、日志落盘（#490）▶ #493（本节）📌 第二批 7a 接力两侧并进一个模块树、补状态转移表和不变量测试 📌 第二批 7b 命令名、事件名集中到 protocol 包 ❓ 待常浩定：接力拓扑对照试验、交接改写在 PR 里并给 CURRENT 瘦身、ROADMAP 重写为现状、上游残留冻结还是删、简约形态渲染代码删不删、开发桥白名单放不放开、E-24 批不批、L-64 要不要提升为全局坑。
- 本轮新坑：无。
- skill 进化：无。

## Hermes 断线、定时任务没跑成改用出错回执；回执停留改成每家一项配置（#498 工作场所契约第 4 批）（2026-11-21，Claude，常浩对改动确认回「改」；已提交、PR 见 PR 描述、已装机回读通过）

- 时间：开工 `2026-11-21 16:45`（按 #498 创建时间记）。来由：第 4 批只读梳理出清单后，第 4 项会改到已定的 Hermes 细条，单独发了改动确认，常浩回「改」。
- 改变的行为（改动确认里列过，常浩回「改」）：
  - Hermes 机器人断线：原来是一张额度细条，没人指着 4 秒收起；现在是 Hermes 卡上一行红色「出错」回执，小签写「断线」，断线期间一直挂着，重新连上自动收起，没有「知道了」。
  - Hermes 定时任务没跑成：原来也是 4 秒收起的细条；现在是同样的出错回执，小签写「没跑成」，留到点「知道了」。正文写「定时任务没跑成：<失败时间> 失败 · 下次 <时间>。」（原细条那一行字）。
  - 同一个机器人同一种异常只留一行，再报一次显示「断线 ×2」「没跑成 ×2」（计数在前端做，Hermes 后端不计数）。
  - 出错小签 5 秒后收成窄条，挤位置时不被挤掉，和四家的出错回执一样。
  - 不变：Hermes 卡内部（看板、断线圆章、定时任务表）；Hermes 新回复看过才收；四家的出错回执；Hermes 异常不受「提醒」开关管，这一点也和原来一样。
- 你要求的：
  - `src/packages/hud/src/alerts/failure-list.ts`：`isFailure` 认 `bot-offline`、`cron-failed`；按机器人 + 类型合并；断线挂到 `hermesBots` 里这个机器人不再 `down`（读不到这个机器人就收起）；没跑成只能点「知道了」收；`takeLine` 替换同一行时给 Hermes 计数；标签、小签、正文三处文字。
  - `alerts/news-lanes.ts`（`laneFailures`、合并计数、出错不被自家等你挡住）、`IslandNews.tsx`（去留看 `hermesBots`、出错卡走出错回执）、`scene/news-seal.ts`（红「出错」印章认 Hermes）、`alerts/CompactAlertView.tsx`（小签文字和红色）、`alerts/FailureAlertView.tsx`（Hermes 行用机器人印章、没有回会话的箭头）。
  - `alerts/reply-stays.ts`：回执停留改成每家一项的表 `REPLY_STAY`（Claude、Codex、DeepSeek 4 秒，ChatGPT、Hermes 看过才收；表外的照旧 4 秒），行为不变（ADR 第 7 条）。
  - 测试：`test/hermes-failure.test.ts`（新，7 条）；契约测试加 2 条（Hermes 出错共用回执、停留配置表）；场景预览台加 `hermes-trouble`（机器人乙飞书断线报了 2 次、机器人甲定时任务没跑成）。
- 我顺手改的：
  - 删死代码：`QuotaAlertViews.tsx`、`quota-chip.ts` 里 Hermes 两种细条的分支，`quota-list.ts` 的额度事件不再含这两种；`quota-alert-copy.ts` 的 `cronFailedCopy` 收成只返回时间那一行的 `cronFailedWhen`。
  - `test/bot-offline.test.ts`、`test/cron-failed.test.ts` 跟着新行为改断言。
  - `src/tooling/file-size-baseline.json`：`QuotaAlertViews.tsx`、`quota-alert-copy.ts`、`CompactAlertView.tsx` 变短后收紧。
- 改变了已有行为的：只有上面 Hermes 两种异常那几条。
- 测试：变基到 `9cce003`（含 #494）后跑的：`pnpm run check` 退出码 0；`pnpm test` 原样结果 `全量测试汇总：6 套，失败 0 套`（Rust 1097 passed / 0 failed，前端 `ℹ pass 513` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 61` / `ℹ fail 0`。日志在证据目录 `check-r2.log`、`test-r2.log`、`node-r2.log`。新测试先红（`does not provide an export named 'laneFailures'`）后绿。
- 验证：
  - 场景预览台（替身，127.0.0.1:1492，1440×900）`hermes-trouble`：小签「周会纪要 · 没跑成」红字带机器人印章，5 秒后收成窄条；点开是 Hermes 卡，红「出错」印章，「机器人乙 · 断线 ×2」「周会纪要（每周一）· 没跑成」两行，正文写原因和时间，没有回会话箭头；点「知道了」只收了没跑成那一行，断线那行还在、没有「知道了」。看板里 Hermes 一块原样（断线圆章、「飞书断线 40 分钟」、任务表）。回归：`failed` 场景两张出错小签照旧；`replies` 场景 4 秒后 Claude、Codex、DeepSeek 收起、ChatGPT 留着。结论：替身通过。
  - 实机：读快照（`real-snapshot-after-install.txt`），两个机器人都在线、没有失败的定时任务，事件里没有 Hermes 异常。Hermes 出错回执在实机上还没出现过，等下次真断线或任务没跑成时看。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-21-498-hermes-boundary/`：`scene-hermes-trouble-*.jpg/png`（小签窄条、卡片、点「知道了」后、看板）；装机 `smoke-before-1.png`、`smoke-motion-1.png`、`smoke-before-after-1.png`、`after-install-screen.png`。
- 发布与回读：`install.sh 498-hermes-boundary --takeover`，原样输出在证据目录 `install.log`：`产物 382f3edea947 / 已装 382f3edea947`，`冒烟：侧栏在动`；`install.sh check` 结果「一致：已装的是本目录装的」。接管的是 #494 会话 16:59 装的 `dcb99bd83d56`（#494 已合并，本包从含它的 main 打出，没有丢功能）。装前装后只差 Codex 旁未读条数（3）重启清空，没有「想访问文稿」弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-21-498-hermes-boundary/PostPane-dcb99bd83d56.app" /Applications/PostPane.app; open /Applications/PostPane.app`
- 与授权不一致之处、遗留问题、范围外发现：
  - 上一轮清单把 #447 标成「可直接做」，标错了：issue 写明改任务名还是改规则要常浩定，改规则会动 #326 定下的合并规则。本轮没做，等常浩定。
  - 范围外发现：Hermes 的回执卡（新回复和出错都一样）下半截有「正在进行 · 0 / 暂无在跑的会话」，是 #369 起共用卡带的；ADR 说 Hermes 不算工作场所，这一段对 Hermes 有没有意义可以在整体验收时一起看。没改。
  - 装机截图里驿窗设置窗口又开着（显示页），#486、#359 两轮都看到过，本次改动不碰窗口。
  - 第 4 批还剩整体验收（清单 5），要常浩看证据回「验收」。
- 本轮新坑：无。
- skill 进化：无。

## 出错回执：一轮失败或被限流时，那一家的卡上弹「出错」回执（#359 第 3 批之三，ADR-0001 C6）（2026-11-21，Claude，常浩 11-14 选甲，11-21 对分批计划回「都按推荐开工」、装机回「合在一起装」；已提交、PR 见 PR 描述、已装机回读通过）

- 时间：开工 `2026-11-21 12:00`（按会话第一条记录的时间记，没用 `date`）。来由：工作场所契约第 3 批最后一项。原来一轮失败或被限流，侧栏什么都不显示，要自己进会话才知道。
- 改变的行为（动手前在分批计划里列过，常浩回「都按推荐开工」）：
  - 新增：会话一轮失败或被限流时，那一家的卡上加一行出错回执，盖红色「出错」印章，小签写「出错」或「限流至 15:00」（过了午夜写日期），按警示闪（橙色）。
  - 同一来源、同一会话、同一种错只留一行，再出错就换成新的，显示「失败 ×2」。这个会话下一轮正常做完，计数清零。
  - 偶发失败一直留着，直到点「知道了」，或这个会话开始下一轮；限流挂到恢复时间，恢复时间不知道的也能点「知道了」收起。
  - 出错小签和等你小签一样：整张挂满 5 秒后收成窄条，窄条上的数字用红色。
  - 队列满了要挤掉一条时，先挤会自己收的通知，出错回执和看过才收的回复都留着（原来挤的是不会自己收之外最早的那条，出错回执是新加的，原有几种通知的挤法不变）。
  - 不变：新回复照旧 4 秒收起，Hermes 和 ChatGPT 的回复照旧看过才收；同一家后到的新回复排到出错卡前面，照常 4 秒收，收完出错卡回到前面。
- 你要求的：
  - `src/crates/core/src/island_events/failures.rs`（新）：从会话的 liveFacts 里找出这一轮以 failed / limited 结束的，按来源 + 会话 + 错误类型计数，发 `turn-failed` 事件；这一轮正常结束就清掉计数。附 4 条测试。
  - `src/crates/core/src/island_events/turns.rs`（新）：取「这一轮结束了」的逻辑，新回复和出错共用。`island_events.rs` 改成调这两处。
  - `src/packages/protocol/src/index.ts`：事件加 `turn-failed` 种类和 `failure`、`limitedUntil`、`count` 三个字段。
  - `src/packages/hud/src/alerts/failure-list.ts`（新）：一行的合并键、「知道了」能不能收、这一行还在不在、标签、正文、小签文字。
  - `src/packages/hud/src/alerts/FailureAlertView.tsx`（新）：出错回执卡的内容。
  - `src/packages/hud/src/scene/news-seal.ts`（新）、`scene/NewsCard.tsx`：卡头盖红色「出错」印章，数这一家有几行出错。
  - `src/packages/hud/src/alerts/news-lanes.ts`：`reconcileIslandCards` 从 `IslandNews.tsx` 挪进来，新事件替换同一行；出错事件不被自家的等你挡住；挤位置时先挤会自己收的。
  - `src/packages/hud/src/alerts/reply-stays.ts`：加 `foldsByItself`；新回复插到同一家出错卡前面。
  - `src/packages/hud/src/IslandNews.tsx`：会话下一轮开始或限流到点时，从队列里拿掉那一行；出错卡走 `FailureAlertView`；标题「出错」。
  - `src/packages/hud/src/alerts/ReminderMark.tsx`（失败、限流角标）、`glow-alert.ts`（出错按警示闪）。
  - `src/packages/hud/src/scene/tag-fold.ts`、`alerts/CompactAlertView.tsx`：出错小签 5 秒后收成窄条，文字和窄条数字用红色（审查时补改，`f35b5fd`）。
  - 测试：`test/failure-alert.test.ts`（新，12 条），`workplace-contract.test.ts`、`reply-queue-keep.test.ts` 跟着改；场景预览台加「出错」场景，「混合」场景加一张出错卡（`test/scenes/build.ts`、`scenes.ts`）。
- 我顺手改的：
  - `src/packages/hud/src/alerts/quota-chip.ts`（新）：把额度小签的文字逻辑从 `CompactAlertView.tsx` 挪出来，不改行为。原因是那个文件超过 300 行棘轮。
  - `src/tooling/file-size-baseline.json`：`CompactAlertView.tsx`、`island_events.rs` 变短后收紧基线。
- 改变了已有行为的：只有上面「新增」的那几条，原有几种通知怎么排、怎么收都没变。
- 测试：变基到 `890665a` 之后跑的。`pnpm run check` 退出码 0；`pnpm test` 原样结果 `全量测试汇总：6 套，失败 0 套`（Rust 1091 passed / 0 failed，前端 `ℹ pass 501` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 60` / `ℹ fail 0`。日志在证据目录：`check-r2.log`、`test-r2.log`、`node-r2.log`。新测试先红后绿：`red-rust.log`、`red-ts.log`、`green-ts.log`。
- 验证：
  - 场景预览台（替身，127.0.0.1:1491）：「出错」场景里 Codex 卡显示红色「出错」印章和「失败 ×2」，点「知道了」能收掉；收掉后出 Claude 限流卡，上面没有「知道了」；小签挂满 5 秒后收成红色数字的窄条；「刚回复」场景和改前对照，新回复照旧 4 秒收起。结论：替身通过。
  - 实机（常浩的 `/Applications/PostPane.app`）：装机后读快照（`real-snapshot-after-install.txt`），事件里没有 `turn-failed`。有 3 个 Claude 会话的上一轮是限流，结束和恢复时间都在今天 04:10 以前，按设计只记作基线、不重复弹出。这一点通过。
  - 没在实机上验的：实机上还没有遇到新的失败或限流，从 Rust 发事件到侧栏弹卡这一段没在真实会话里看到过。等下一次真的失败或限流，看侧栏有没有弹出、点「知道了」能不能收。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-21-359-failure-alert/`：预览台 `scene-failed-*.jpg`、`review-*.jpg/png`；装机 `smoke-before-1.png`、`smoke-motion-1.png`、`smoke-before-after-1.png`、`after-install-screen.png`（查权限弹窗用）。
- 发布与回读：`install.sh 359-failure-alert --takeover`，原样输出在证据目录 `install.log`：`产物 59301ee8eaa1 / 已装 59301ee8eaa1`，`冒烟：侧栏在动`；再跑 `install.sh check` 结果「一致」。装前装后对比：变了的地方是 Codex、Hermes 小人旁的未读条数（11、8）重启后清空，Claude 由 3 变 4，其余只有小人在动。没有「想访问文稿」弹窗。
  - 这份包是合装包：常浩选「合在一起装」，所以在临时 worktree `359-494-combo` 里，以本分支 `f35b5fd` 为底叠上 #494 的 `3a3b9a5`（插件版本校验，PR 还开着、等常浩看设置页），没提交，打一个包装上。接管的是 #494 那个会话 10:12 装的 `a638a2229b0a`，备份在证据目录。两边的功能都在。#494 合并后从 main 重新打包装机。
  - 回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-21-359-failure-alert/PostPane-a638a2229b0a.app" /Applications/PostPane.app; open /Applications/PostPane.app`
- 与授权不一致之处、遗留问题、范围外发现：
  - 没出三版预览：常浩 11-14 已在三版里选了甲，11-21 定「照甲做，不再出三版」。
  - 装机截图里驿窗的设置窗口开着（显示页），#486 那轮也看到过，本次改动不碰窗口。
  - 第 4 批（Hermes 边界与整体验收）下一步先只读梳理、出清单；B10/B11/B20/B21 要不要并进接力根治主线，等常浩定；AGENTS.md 导航表「改小人」那一行要不要补 `src/crates/hud/src/bots.rs`，等常浩定。
- 本轮新坑：无。
- skill 进化：无。

## 应用报错落盘验收，登记 DECIDED.md（#486）（2026-11-21，Claude，常浩经 agent-hud 插件回「验收」；已提交、PR 见 PR 描述、无需发布）

- 时间：开工 `2026-11-21 00:57`（`date '+%F %H:%M'` 记录）。来由：#486（PR #490，`e6ccc5c`）合并装机后，常浩看过证据回「验收」。这条回复核对过：`<数据目录>/messaging/messages.json` 最后一条仍是 11-19 22:47，没有智能体互发消息。
- 改了哪些文件：`docs/DECIDED.md` 末尾加一行（日志位置与权限、开头一行和每行时间的格式、panic 一段、轮转、不接管的几种启动、自检开关、不加设置入口）；本节。
- 测试：`node --test tests/*.test.mjs` 与 `node scripts/check-rules.mjs` 见 PR 描述。没有改代码，没跑 `pnpm run check`、`pnpm test`（只动了两份文档）。
- 验证：无（纯文档）。
- 截图：无。
- 发布与回读：无需发布。实机仍是 #490 那份包（`dba8c904f9eb`）。
- 与授权不一致之处、遗留问题、范围外发现：验收依据里 panic、轮转、终端启动三项是在隔离主目录下用同一份包验的，实机上没有触发过 panic，登记行备注里写明了。E-24、L-64 提升全局坑仍待常浩批。
- 本轮新坑：无。
- skill 进化：无。
- 已登记 DECIDED.md。

## 更早的交接

旧交接原样归档在 `docs/history/`，查常浩定过什么时和本文件一起搜：
- 2026-11-12 至 2026-11-20：[docs/history/CURRENT-2026-11-12至2026-11-20.md](docs/history/CURRENT-2026-11-12至2026-11-20.md)（开头另有原在本文件开头的「更新：2026-11-06」总述）
- 2026-11-04 至 2026-11-12：[docs/history/CURRENT-2026-11-04至2026-11-12.md](docs/history/CURRENT-2026-11-04至2026-11-12.md)
