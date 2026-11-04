# 当前状态

更新：2026-11-04。阶段 1（界面收拢），批次见 [docs/ROADMAP.md](docs/ROADMAP.md)。唯一下一步：1-2 合并后做 1-3 去掉成本数字；审批卡真实往返仍待常浩配合验证。

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
