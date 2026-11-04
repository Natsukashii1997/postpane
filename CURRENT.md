# 当前状态

更新：2026-11-04。阶段 0（立规矩与基线），路线见 [docs/ROADMAP.md](docs/ROADMAP.md)。唯一下一步：在现装的 Agent HUD 上真实验证一次审批卡往返（需常浩配合），然后进入阶段 1 裁剪。

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
