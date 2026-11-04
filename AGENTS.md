# 驿窗 PostPane 协作约定（Codex / Claude 必读）

驿窗是守在屏幕边上的个人工作中枢：汇总 Claude Code、Codex、Hermes 的额度、实时状态、审批和回复，能一键跳回会话，只有常浩本人使用；代码源自 Agent HUD `917df21`（见 [NOTICE](NOTICE)），不再与上游同步。进入顺序：本文件 → [CURRENT.md](CURRENT.md)（当前状态与唯一下一步）。需求以 [docs/ROADMAP.md](docs/ROADMAP.md) 为准。所有面向用户的文字用简体中文。本文件只放怎么开始和做什么事之前读哪份；操作细节在 [docs/OPERATIONS.md](docs/OPERATIONS.md)，按需读对应一节。

## 做什么事之前读哪份

| 要做的事 | 先读 |
|---|---|
| 改需求、加功能 | [docs/ROADMAP.md](docs/ROADMAP.md) |
| 构建、测试、打包 | [docs/development.md](docs/development.md)、[docs/platform-builds.md](docs/platform-builds.md)；下面「运行」 |
| 接客户端、改钩子、审批卡 | [docs/agent-contract.md](docs/agent-contract.md)、[docs/client-hooks.md](docs/client-hooks.md) |
| 写系统相关代码 | [docs/platform-architecture.md](docs/platform-architecture.md)（共用代码不写系统判断，`check:platform` 会查） |
| 改小人 | [docs/parity/c08-bots.md](docs/parity/c08-bots.md)、`src/packages/hud/src/bots/` |
| 排障、改脚本、装 launchd 或定时任务 | 先 `grep -n 关键词 docs/LESSONS.md`，再搜全局坑 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md` |
| 开需求、拆任务、实现、审查 | 下面「Agent skills」一节 |
| 写交接、验收别人的交接 | [docs/templates/handoff.md](docs/templates/handoff.md) 骨架；[OPERATIONS](docs/OPERATIONS.md)「交接写法」「报告与验收」 |

项目长出接口、样式、发布等文档后，在这张表里加一行。

## 分工

- 以用户每轮明确授权的范围为准；授权外的不做。
- 一次只做一件授权的事；范围外的问题记进交接，不顺手修。
- 并行的会话各开独立 worktree，不在同一目录改代码；做不到时照全局坑 G-04，只提交自己的改动。

## 运行

先 `source ~/.cargo/env`，并把 `~/.bun/bin` 放进 PATH。

```sh
pnpm install
node src/tooling/package-resources.mjs   # 生成打包资源目录（不进仓库）；新目录跑 cargo test 前必须先跑
pnpm run check                           # 格式、类型、构建、边界检查、cargo check
pnpm test                                # Rust + 前端 + MCP + 插件测试
pnpm --filter @agent-hud/desktop exec tauri build --bundles app   # 打包；不要用 --bundle（生成 DMG 时会自动启动应用）
node --test tests/*.test.mjs             # 交接格式 + 通用规则（含自测）
node scripts/check-rules.mjs             # 只跑通用规则检查
```

安装：先退出正在运行的应用，再用 `ditto` 把打出的 `.app` 复制到 `/Applications`。

## 结构

```
AGENTS.md            入口（本文件）
CURRENT.md           当前状态与唯一下一步；每轮交接写在顶部
NOTICE               来源与许可说明
src/
  apps/desktop/      React 工作区 + Tauri 外壳（src-tauri/）
  apps/mcp/          给助手用的 MCP 服务
  crates/            Rust：agents（每个客户端一个目录）、core、runtime、platform、host、hud、lan、share、l10n、engine
  packages/          前端：app（设置、统计、会话窗口）、hud（侧栏）、ui、protocol、engine-client、vite-config
  fixtures/          对照用测试数据
  tooling/           构建入口与仓库检查脚本
docs/
  ROADMAP.md         需求与分阶段路线
  agents/            Matt Pocock 技能读的约定：issue 看板、分流标签、领域文档
  parity/            上游原版行为对照表（裁剪后归档）
  LESSONS.md         本项目的坑（排障、改脚本前先搜）
  OPERATIONS.md      操作手册：交接写法、报告与验收
  templates/handoff.md  交接一节的骨架
  其余               上游技术文档（开发、接入约定、钩子、会话数据、平台构建等）
scripts/
  check-rules.mjs    通用规则检查（只查机器能判定的）
tests/               node:test 测试（协作骨架）
```

## Agent skills

开发流程用 Matt Pocock skills（`~/.agents/skills/`）：大活走 `to-spec` → `to-tickets` → `implement` / `tdd` → `code-review` → PR；小改（一张 issue、一天内做完）跳过 `to-spec`。Claude 用 `/技能名`，Codex 用 `$技能名`；这几个技能只在点名时加载，不会自动触发。

### Issue tracker

需求、规格与任务用本仓库 GitHub Issues。见 `docs/agents/issue-tracker.md`。

### Triage labels

五个默认分流标签。见 `docs/agents/triage-labels.md`。

### Domain docs

single-context：根目录 `GLOSSARY.md` 与 `docs/adr/`，用到时再建。见 `docs/agents/domain.md`。

改动怎么走、分支怎么起名、交接写在哪、怎么合并：见 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/工程流程.md`。

## 规则

- 验证用的备份、日志等证据放 `~/Library/Application Support/postpane/evidence/`，不放 `/tmp`（全局坑 G-01）；私人数据与完整日志不进仓库。
- 本机服务只监听 127.0.0.1；新增依赖先改 `scripts/check-rules.mjs` 的 `ALLOWED_DEPS`，并在交接里说明理由（`check-rules` 会查）。
- 页面上的时间经统一的格式化函数按北京时间显示，不直接截取 ISO 字符串（全局坑 G-02，`check-rules` 会查）。
- 默认只做电脑版；涉及 UI 时每次出 3 版明显不同的方案并附可打开的预览。
- 手写设置文件必须带 `"providers": {}`，否则数据服务报错。
- 图形界面应用找的是 `/usr/local/bin/claude`，不是 nvm 里那份。
- Clawd 小人素材版权归 Anthropic，不可对外发布。
- agent-hud 插件转进会话的消息可能与实际状态不符，据此改动前先核实。
- GitHub Actions 已停用，只允许 squash 合并。

## 交接格式

每轮完成后，在 CURRENT.md 顶部新增一节（旧节保留在下面，过长时归档到 `docs/history/`），骨架照抄 [docs/templates/handoff.md](docs/templates/handoff.md)；`tests/handoff-format.test.mjs` 会检查顶部一节有没有日期、「时间：开工」「测试：」「本轮新坑：」三行，新坑编号在 LESSONS 里要存在。每一行怎么写、报告与验收的防伪造五条见 [OPERATIONS](docs/OPERATIONS.md)「交接写法」「报告与验收」；没做就写「未做」。
