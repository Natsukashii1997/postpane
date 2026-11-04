# 当前状态

更新：2026-11-04。阶段 1（界面收拢），批次见 [docs/ROADMAP.md](docs/ROADMAP.md)。唯一下一步：2-4 收尾——把 Claude、Codex 的 HUD 工具（MCP）重新指向驿窗，核对插件与图标，经常浩同意后把旧 Agent HUD.app 移到废纸篓；审批卡真实往返仍待常浩配合验证。

## 阶段 2-4（进行中）：打包安装驿窗与本机切换（2026-11-04，Claude，常浩同意由 Claude 用屏幕操控代点设置；无需发布）

- 时间：开工 `2026-11-04 16:48`（开工时没用 date 记录，取打包日志文件的创建时间；本节写于 `2026-11-04 17:02`）。来由：阶段 2 最后一批。
- 改了哪些文件：仓库只改本文件。本机：安装 `/Applications/PostPane.app`；`~/.claude/settings.json`、`~/.codex/hooks.json` 的钩子由驿窗重写；`~/.claude/plugins/known_marketplaces.json` 插件来源由驿窗改到 `app.postpane.mac`。
- 测试：未跑新测试（本批不改代码）。核对命令 `grep -c` 原样结果：Claude 钩子 `old=0 new=5`，Codex 钩子 `old=0 new=3`，设置 `clientHooks` 为 `True`。
- 验证：
  - 打包 `pnpm --filter @agent-hud/desktop exec tauri build --bundles app` 成功，`PostPane.app` 标识 `app.postpane.mac`，中转程序 `codesign -v` 通过。
  - 退出旧 Agent HUD 后安装启动驿窗：`app.agenthud.mac` 整个迁到 `app.postpane.mac`（账本、账户读数、设置都在，旧目录已不存在）。
  - 驿窗启动时自动改了 Codex 钩子和插件来源；Claude 钩子没自动改，用屏幕操控在「智能体插件」页把「客户端回调」关掉再打开后，5 处全部指向驿窗。
- 截图：无存档。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - HUD 工具（MCP）还指着旧应用：`~/.claude.json`、`~/.codex/config.toml` 里 `agent-hud` 的命令仍是 `/Applications/Agent HUD.app/...`；设置页显示「HUD 工具：可以使用」，但它只认名字，需要在设置里移除后重新添加，或核对新应用的添加逻辑。
  - 正在运行的 Claude、Codex 会话还挂着旧的 `agent-hud-mcp` 进程，会话结束后自行退出。
  - 插件实际能否加载、审批卡真实往返、程序坞图标效果、侧栏显示设置是否随网页存储丢失，都未核对。
  - 旧 `/Applications/Agent HUD.app` 仍在，未删。
  - 切换前备份：`~/Library/Application Support/postpane/evidence/2026-11-04-switch/`（配置文件与整个旧数据目录，三个运行中的套接字文件未复制）。
- 本轮新坑：无。

## 阶段 2-3：应用图标换成驿灯（2026-11-04，Claude，常浩从第二轮三版里选定「驿灯」；测试全过直接合并、未安装）

- 时间：开工 `2026-11-04 16:42`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 16:47`）。来由：第一轮三版（窗格、驿印、小信使）被否，第二轮从“驿”“窗”本意出发出了一枝春、驿灯、燕归，常浩选驿灯。
- 改了哪些文件：`src/apps/desktop/src-tauri/icons/icon.icns`、`icon.ico`、`icon.png`（用 `tauri icon` 从 1024 透明底图生成）；`src/packages/app/src/assets/app-icon.png`（256 像素）；新增 `docs/design/icon/postpane-icon.svg`（源文件）与 `postpane-icon-1024.png`；本文件。
- 测试：`cargo test --workspace` 退出码 0，637 项通过；`test:ts` `ℹ pass 110` / `ℹ fail 0`；`test:mcp` `ℹ pass 6` / `ℹ fail 0`；`test:plugins` `ℹ pass 14` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；typecheck、build、check:platform、check:packages、check:clients、check:test-paths 通过。
- 验证：1024 图四角透明已用 PIL 读像素核对（角落 alpha 0）；访达与程序坞里的样子要到 2-4 安装后看。
- 截图：三版预览在 `.claude/previews/`（不进仓库）。
- 发布与回读：无需发布；未安装。
- 与授权不一致之处、遗留问题、范围外发现：qlmanage 渲染 SVG 时会铺白底，透明是靠圆角蒙版抠出来的，边缘可能有极细的白边，安装后核对。
- 本轮新坑：无。

## 阶段 2-2：界面文字换成驿窗（2026-11-04，Claude，常浩授权测试全过的 PR 直接合并；无需发布、未安装）

- 时间：开工 `2026-11-04 16:26`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 16:30`）。来由：ROADMAP 阶段 2 第二批。
- 改了哪些文件：界面上能看到的 Agent HUD 字样，中文换成「驿窗」、英文换成「PostPane」：`src/packages/app/src/App.tsx`（设置页说明、默认产品名、图标替代文字）、`lib/agent-plugins.ts`、`settings/AgentPluginsPane.tsx`、`settings/agent-plugins/ClientCards.tsx`、`HooksSection.tsx`、`settings/agents/Connection.tsx`、`src/packages/hud/src/HUDScene.tsx`、`scene/HUDMarkStrip.tsx`、`src/crates/host/src/instance.rs`（无法启动、已在运行的提示，另一份安装的路径）、`hud/mod.rs`（侧栏窗口标题）、`tray.rs`（菜单栏提示）、`system/macos.rs`、`src/apps/mcp/src/index.ts`（两个工具说明）；`src/packages/app/test/agent-plugins.test.ts` 期望文字同步；本文件。
- 测试：`cargo test --workspace` 退出码 0，637 项通过；`test:ts` 首跑 `ℹ pass 109` / `ℹ fail 1`（测试仍期望旧文字），改期望后 `ℹ pass 110` / `ℹ fail 0`；`test:mcp` `ℹ pass 6` / `ℹ fail 0`；`test:plugins` `ℹ pass 14` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；typecheck、build、prettier、check:platform、check:packages、check:clients、check:test-paths 通过。
- 验证：只改文字，未在预览里逐页看。
- 截图：无。
- 发布与回读：无需发布；未安装。
- 与授权不一致之处、遗留问题、范围外发现：内部协议名保持不变——钩子配置键与识别标记、MCP 服务名 `agent-hud`、插件名、`CLAUDE_CODE_ENTRYPOINT`、中转程序文件名、日志前缀，改了会让新应用认不出旧配置与历史记录；Windows、Linux 专用文字未改。
- 本轮新坑：无。

## 阶段 2-1：应用标识与数据目录换成驿窗（2026-11-04，Claude，常浩让继续推进；PR 待合并、未安装）

- 时间：开工 `2026-11-04 15:52`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 15:57`）。来由：ROADMAP 阶段 2 第一批。
- 改了哪些文件：
  - `src/apps/desktop/src-tauri/tauri.conf.json`：应用名与主程序名 PostPane，标识 `app.postpane.mac`，设置窗口标题；`tauri.windows.conf.json`、`tauri.linux.conf.json` 标识同步。
  - `src/crates/platform/src/data_folder.rs`：数据目录名换成 `app.postpane.*`；首次启动迁移的旧目录从 `app.agenthud.next` 改为各系统的 `app.agenthud.<系统>`；`os/*/mod.rs` 各加 `EARLIER_FOLDER`。
  - `src/crates/agents/src/cursor/mod.rs`：Cursor 回合日志位置跟到新目录；`naming/surfaces.rs`：认出 `app.postpane` 开头的来源。
  - `src/apps/desktop/src-tauri/src/main.rs`：去掉共用代码里的系统判断，只按 `/Applications/` 判断。
  - `AGENTS.md`：结构一节 parity 说明更正、补 `docs/upstream/`。
- 测试：`cargo test --workspace` 退出码 0，637 项通过；`test:ts` `ℹ pass 110` / `ℹ fail 0`；`test:mcp` `ℹ pass 6` / `ℹ fail 0`；`test:plugins` `ℹ pass 14` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；typecheck、build、prettier、check:packages、check:clients、check:test-paths 通过；`check:platform` 现为 `Platform boundary: shared code selects adapters only through mod/use selectors.`（基线那条消掉了）。
- 验证：未打包安装；迁移只有单元测试覆盖，真实迁移要到本机切换时验证。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 换标识后 macOS 会给新应用一份新的网页存储，前端存在 localStorage 的 `agenthud.hud-config.v3`、隐藏卡片、选中屏幕等可能不跟过来，切换时要核对侧栏显示设置。
  - 钩子配置里识别自家条目的标记（`Agent HUD` 字样）、MCP 名 `agent-hud`、插件名、中转程序名、界面上的 Agent HUD 字样都还没改，留给 2-2。
  - Windows 登录项名、Linux 桌面文件名仍是旧的，不在电脑版范围内。
- 本轮新坑：无。

## 阶段 1-4：文档收尾（2026-11-04，Claude，常浩让继续推进；纯文档，按工程流程第 3 节直接提交 main、无需发布）

- 时间：开工 `2026-11-04 15:50`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 15:51`）。来由：阶段 1 最后一批；顺带补记常浩“余额照留”的决定。
- 改了哪些文件：`README.md` 换成驿窗说明；上游 `README.md`、`README.zh-CN.md` 移到 `docs/upstream/` 并修正图片相对路径；`docs/development.md`、`docs/platform-architecture.md`、`docs/platform-builds.md` 去掉局域网；`docs/ROADMAP.md` 补记余额照留、改写 1-4；本文件。
- 测试：`node --test tests/*.test.mjs` 原样结果 `ℹ pass 4 ℹ fail 0`（本节只改文档，未跑构建）；`node src/tooling/parity-ledger.mjs --check` 输出 `Parity ledger: 1217 behaviors, 583 match or are fixed, 494 open.`。
- 验证：只改文档，无界面。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：`docs/parity/` 没有归档，因为 `parity-ledger` 检查依赖它在原处；`AGENTS.md` 结构一节里 parity 的说明（“裁剪后归档”）已过时，AGENTS 改动按流程要走 PR，留到阶段 2 的 PR 一并改。
- 本轮新坑：无。

## 阶段 1-3：界面去掉成本数字，只看 token（2026-11-04，Claude，常浩决定成本与套餐价值都去掉、只看 token；PR 待合并、无需发布）

- 时间：开工 `2026-11-04 15:19`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 15:27`）。来由：常浩不需要成本数字，统计里的套餐价值、会话图表的费用切换都去掉。
- 改了哪些文件：
  - 统计：`src/packages/app/src/Statistics.tsx` 去掉套餐价值卡片；`statistics/ProviderCard.tsx` 去掉费用格、缓存费用说明、最高会话与时段的按价估算；`statistics/StatsTheme.tsx` 去掉模型提示与汇总里的按价估算。
  - 会话：`sessions/SessionListSection.tsx` 去掉今日费用、每行费用，表头改为「Token · 上下文」；`sessions/SessionDetailView.tsx` 去掉费用卡、每轮费用提示，图表固定按 token、不再显示费用切换；`sessions/SubagentTimeline.tsx` 去掉每行费用。
  - 侧栏：`src/packages/hud/src/panel/QuotaSection.tsx` 去掉「最近 24 小时」后的花费。
  - 本文件。
- 测试：`cargo test --workspace` 退出码 0，637 项通过；`test:ts` `ℹ pass 110` / `ℹ fail 0`；`test:mcp` `ℹ pass 6` / `ℹ fail 0`；`test:plugins` `ℹ pass 14` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；typecheck、build、prettier、check:packages、check:clients、check:test-paths 通过；`check:platform` 仍只报基线那条 `main.rs:7`。
- 验证：浏览器开发预览（独立数据目录）实际查看统计窗口的 Tokens 页、Sessions 页和一个会话详情页，读页面文字，没有 Cost、费用、At API prices、套餐价值字样；会话详情只剩 Token、轮次、上下文、缓存命中等。
- 截图：未存档。
- 发布与回读：无需发布；未安装到 /Applications。
- 与授权不一致之处、遗留问题、范围外发现：API 余额类账户（如 DeepSeek）的余额卡片和侧栏余额块里还有「估算花费」「日均消耗」「预计耗尽」，属于余额读数，这次没动，要不要一并去掉待常浩定；后台计价代码与 `costText` 等函数保留未删。
- 本轮新坑：无。

## 阶段 1-2：助手置顶与折叠，藏起中转站/价格/更新（2026-11-04，Claude，常浩改定“旧功能背后保留、界面隐藏”；PR 待合并、无需发布）

- 时间：开工 `2026-11-04 15:06`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 15:14`）。来由：常浩决定旧功能不删，只在界面上收拢；助手全部显示，四个置顶，其余折叠；成本数字不要；局域网不恢复。
- 改了哪些文件：`src/packages/app/src/settings/agents/AgentList.tsx`（`PINNED` 置顶 claude、codex、hermes、grok-bot，其余进默认折叠的“其他助手”）、`AgentsPage.tsx`（默认选中 Claude Code）、`agents.css`（折叠按钮样式）；`src/packages/app/src/App.tsx`（`hiddenPages` 藏起 relays、prices、updates）；`docs/ROADMAP.md`（阶段 1 改为界面收拢、重排批次）；本文件。
- 测试：`cargo test --workspace` 退出码 0，637 项通过；`test:ts` `ℹ pass 110` / `ℹ fail 0`；`test:mcp` `ℹ pass 6` / `ℹ fail 0`；`test:plugins` `ℹ pass 14` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；typecheck、build、prettier、check:packages、check:clients、check:test-paths 通过；`check:platform` 仍只报基线那条 `main.rs:7`。
- 验证：浏览器开发预览（`pnpm run dev`，独立数据目录）实际查看：设置侧栏只剩通用、显示、智能体、智能体插件；智能体页 Claude Code、Codex、Hermes、Grok Bot 置顶，“Other agents (18)”默认收起，点开后列出其余助手，默认选中 Claude Code。
- 截图：未存档。
- 发布与回读：无需发布；未安装到 /Applications。
- 与授权不一致之处、遗留问题、范围外发现：成本数字牵连统计、会话、侧栏约 10 个前端文件，拆到 1-3；Grok 有 Grok CLI 与 Grok Bot 两个助手，按常浩说的置顶 Grok Bot，Grok CLI 在折叠组里。
- 本轮新坑：无。

## 阶段 1-1：删 iPhone/局域网（2026-11-04，Claude，用户同意合并 1-0 并做 1-1；PR 待合并、无需发布）

- 时间：开工 `2026-11-04 14:46`（开工时没用 date 记录，取 issue #5 的创建时间 06:46Z 折算北京时间；本节写于 `2026-11-04 14:55`）。来由：ROADMAP 阶段 1 批次 1-1。
- 改了哪些文件：删除 `src/crates/lan`、`src/crates/share`、`src/crates/host/src/phones.rs`、`src/packages/app/src/settings/LocalNetworkPane.tsx`；`Cargo.toml`、`Cargo.lock`、`src/crates/host/Cargo.toml` 去掉两个模块；`src/crates/host/src/lib.rs` 去掉共享的启动、快照推送、`phone_share` 请求与退出时停止；`src/crates/host/src/extension.rs` 去掉 `shares_with_phones`；`src/packages/app/src/App.tsx`、`SettingsPanes.tsx` 去掉局域网设置页与「设备」分组；`src/packages/protocol/src/index.ts` 去掉 `phone_share`；`AGENTS.md` 结构一节同步。
- 测试：`cargo test --workspace` 退出码 0，637 项通过（基线 662，差额为随两个模块删掉的测试）；`test:ts` `ℹ pass 110` / `ℹ fail 0`；`test:mcp` `ℹ pass 6` / `ℹ fail 0`；`test:plugins` `ℹ pass 14` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；typecheck、build、prettier、check:packages、check:clients、check:test-paths、对照表检查通过；`check:platform` 仍只报基线那条 `main.rs:7`。
- 验证：未打包安装，本机仍运行旧 Agent HUD；界面变化未实际查看。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：`cargo clippy` 本机缺组件未跑；工作区 `Cargo.toml` 里只给局域网用的第三方依赖声明可能已无人使用，未清理；`docs/development.md` 等上游文档仍提到 lan，留到 1-6。
- 本轮新坑：无。

## 阶段 1-0：修 MCP 测试替身程序签名（2026-11-04，Claude，用户同意按分批计划开工；PR 待合并、无需发布）

- 时间：开工 `2026-11-04 14:43`（`date '+%F %H:%M'` 记录）。来由：阶段 0 基线里 `test:mcp` 6 项全部失败，排查为 bun 编译的替身程序签名无效被系统杀掉。
- 改了哪些文件：`src/apps/mcp/test/host-tools.test.mjs`（macOS 上编译后补本地临时签名）；`docs/LESSONS.md`（L-02）；`docs/ROADMAP.md`（阶段 1 改为直接删、列出批次）；本文件。
- 测试：`pnpm run test:mcp` 原样结果 `ℹ pass 6` / `ℹ fail 0`；`node --test tests/*.test.mjs` 原样结果 `ℹ pass 4` / `ℹ fail 0`。
- 验证：只改测试与文档，无界面。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：无。
- 本轮新坑：L-02。

## 阶段 0：路线定稿、构建测试基线、铺协作骨架（2026-11-04，Claude，用户同意路线与铺骨架；未提交、无需发布）

- 时间：开工 `2026-11-04 14:12`（`date '+%F %H:%M'` 记录）。来由：上一会话自立项目后交接；本轮梳理路线、跑基线，并用「项目起步」（agent-kit 的 `skills/project-starter`）铺协作骨架。
- 改了哪些文件：
  - 新建 `docs/ROADMAP.md`（分阶段路线与 2026-11-04 拍板结论）。
  - 新建骨架：`AGENTS.md`、`CURRENT.md`（本文件）、`docs/LESSONS.md`（含 L-01）、`docs/OPERATIONS.md`、`docs/templates/handoff.md`、`docs/agents/`（issue-tracker、triage-labels、domain）、`.github/pull_request_template.md`、`scripts/check-rules.mjs`、`tests/check-rules.test.mjs`、`tests/handoff-format.test.mjs`。
  - 按项目改了骨架：`check-rules.mjs` 的扫描目录改为 `src/packages`、`src/apps`、`src/tooling`，跳过 `dist`、`target`；依赖白名单放根目录已有的 `@playwright/test`、`prettier`；自测样本路径随之调整。
  - 已有文件未改。
- 测试：
  - 骨架：`node --test tests/*.test.mjs` 原样结果 `ℹ tests 4` / `ℹ pass 4` / `ℹ fail 0`；`node scripts/check-rules.mjs` 输出 `通用规则检查通过`。
  - 构建测试基线（未改代码时）：
    - 通过：`pnpm install`、`typecheck`、`build`、prettier 格式检查、`check:packages`、`check:clients`、`check:test-paths`、对照表检查（`Parity ledger: 1217 behaviors, 583 match or are fixed, 494 open.`）、`cargo test --workspace`（先生成资源目录后，退出码 0，662 项通过）、`test:ts`（`ℹ pass 110` / `ℹ fail 0`）、`test:plugins`（`ℹ pass 14` / `ℹ fail 0`）。
    - 不通过：
      1. `format:check`：`error: 'cargo-fmt' is not installed for the toolchain 'stable-aarch64-apple-darwin'.`，本机缺 rustfmt 组件，装不装等常浩定。
      2. `check:platform`：`src/apps/desktop/src-tauri/src/main.rs:7: cfg!() on the operating system`，是自改的回调程序登记，计划在阶段 2 挪进 macOS 专属文件。
      3. `test:mcp`：`ℹ pass 0` / `ℹ fail 6`，报 `Tool some_tool not found` 等，原因未查。
      4. 首轮 `cargo test` 退出码 101（缺资源目录），见 L-01。
- 验证：只铺文档与测试、只读跑基线，无界面。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - `check-rules.mjs` 只查前端与脚本，Rust 代码不在它的检查范围。
  - `test:mcp` 失败原因待阶段 1 前排查。
  - Hermes 在代码里只读会话和用量，没有钩子、审批和额度读取。
  - 审批卡真实往返未验证。
- 本轮新坑：L-01。
