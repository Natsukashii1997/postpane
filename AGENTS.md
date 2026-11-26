# 驿窗 PostPane 协作约定（Codex / Claude 必读）

驿窗是守在屏幕边上的个人工作中枢：汇总 Claude Code、Codex、Hermes 的额度、实时状态、审批和回复，能一键跳回会话，只有常浩本人使用；代码源自 Agent HUD `917df21`（见 [NOTICE](NOTICE)），不再与上游同步。进入顺序：本文件 → [CURRENT.md](CURRENT.md)（当前状态与唯一下一步）。需求以 [docs/ROADMAP.md](docs/ROADMAP.md) 为准。所有面向用户的文字用简体中文。本文件只放怎么开始和做什么事之前读哪份；操作细节在 [docs/OPERATIONS.md](docs/OPERATIONS.md)，按需读对应一节。

## 做什么事之前读哪份

| 要做的事 | 先读 |
|---|---|
| 改需求、加功能 | [docs/ROADMAP.md](docs/ROADMAP.md) |
| 构建、测试、打包 | [docs/development.md](docs/development.md)、[docs/platform-builds.md](docs/platform-builds.md)；下面「运行」 |
| 接客户端、改钩子、审批卡 | [docs/agent-contract.md](docs/agent-contract.md)、[docs/client-hooks.md](docs/client-hooks.md) |
| 改接力流程（送审、回信、转回、出错怎么处理）、接新执行方 | [docs/接力规范.md](docs/接力规范.md)（含「状态 × 异常事件」全表，改了处理要同步那一格） |
| 改 ChatGPT 通道（Chrome 插件、转接程序、host manifest） | [docs/chatgpt-channel.md](docs/chatgpt-channel.md) |
| 加或改 AI 功能、MCP 工具、读取哪家数据 | 下面「AI 接入」一节；改完同步设置 →「AI 接入」页 |
| 写系统相关代码 | [docs/platform-architecture.md](docs/platform-architecture.md)（共用代码不写系统判断，`check:platform` 会查） |
| 改小人 | `src/packages/hud/src/bots/`（画法与动作）、`src/crates/hud/src/bots/`（什么状态演什么）；各小人的测试在 `src/packages/hud/test/`（`codex-cloud`、`deepseek-whale`、`hermes-avatar` 等） |
| 改卡片 / 面板版式（对齐、缩进、区块顺序） | [docs/design/卡片版式规范.md](docs/design/卡片版式规范.md)（一套左对齐线，数值只在 `panel/theme.ts` 的 `GRID`） |
| 改侧栏结构、给某家加能力（等你、在跑、回执、接力入口、看板） | [docs/adr/0001-工作场所契约.md](docs/adr/0001-工作场所契约.md)、[GLOSSARY.md](GLOSSARY.md)；改完跑 `workplace-contract.test.ts`，在场景预览台（`pnpm --filter @agent-hud/hud run scenes`，127.0.0.1:1480）逐个场景看，不再另搭 `preview-xxx` 脚手架 |
| 排障、改脚本、装 launchd 或定时任务 | 先 `grep -n 关键词 docs/LESSONS.md`，再搜全局坑 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md` |
| 开需求、拆任务、实现、审查 | 下面「Agent skills」一节 |
| 改动会碰到常浩定过的内容（含批量授权里的单项）；常浩选定或验收了什么要登记 | [docs/DECIDED.md](docs/DECIDED.md)（已定内容登记表，先查这张表）；下面「已定内容要改，先单独确认」 |
| 写交接、验收别人的交接 | [docs/templates/handoff.md](docs/templates/handoff.md) 骨架；[OPERATIONS](docs/OPERATIONS.md)「交接写法」「报告与验收」 |
| 一轮从开工到收尾：worktree、测试、装机回读、交接、合并清理、复盘进化 | [.agents/skills/postpane-round/SKILL.md](.agents/skills/postpane-round/SKILL.md)（Claude `/postpane-round`，Codex `$postpane-round`） |
| 查应用自己报了什么错（保存失败、送不出去、panic） | `<数据目录>/logs/postpane.log`（#486）：每行带时间，每次启动先写一行开头；怎么读见 [postpane-round](.agents/skills/postpane-round/SKILL.md)「实机出问题怎么查」。新加的报错用 `note!`（host 里 `agent_hud_runtime::note!`，其余 `agent_hud_core::note!`），不直接写 `eprintln!`；写给调用方看的（`--mcp`、钩子、桥接进程）除外 |
| 给别人装驿窗、第二人复现 | [docs/安装与使用.md](docs/安装与使用.md) |
| 查 AI 使用六级 L4–L6 的证据 | `docs/evidence/`（L4 Skill 与使用记录、L5 运行记录、L6 前后对比） |

项目长出接口、样式、发布等文档后，在这张表里加一行。

## 分工

- 以用户每轮明确授权的范围为准：不做没要求的新功能、新页面、新配置项。
- 代码库按「归你」的标准改，和全局 `~/.claude/CLAUDE.md` 第 3 节一致（2026-11-18 常浩定以全局为准，#402）：合并重复实现、清死代码和改动残留、修看到的相关问题、补测试和必要文档，可以直接做，不用另外请示。常浩这一轮说「只改这一处」「尽量少改」时按他说的办。三条底线任何情况都守：
  1. 碰到常浩定过的内容，照下面「已定内容要改，先单独确认」单独问，顺手改动也一样；
  2. 改变已有功能的行为，动手前先在消息里写清改哪个功能、原来怎样、改成怎样、为什么（修 bug 回到原定行为不算）；
  3. 交付时分「你要求的」「我顺手改的」两栏列全部改动，小改动也列，改变了行为的单独标出。
  顺手改的同样跑全量测试（G-03）。
- 并行的会话各开独立 worktree，不在同一目录改代码；做不到时照全局坑 G-04，只提交自己的改动。

## 运行

先 `source ~/.cargo/env`，并把 `~/.bun/bin` 放进 PATH。

```sh
bash scripts/setup-worktree.sh           # 新目录备环境：先定构建目录，再 pnpm install、生成打包资源目录（不进仓库），顺序写死（L-01、L-34）；共用构建目录时把绝对路径当参数
pnpm run check                           # 先查 src/ 下有没有没提交的文件（L-13、L-43），再格式、类型、构建、边界检查、cargo check
pnpm test                                # Rust + 前端 + MCP + 插件 + Chrome 插件 + 注入脚本：六套都跑完再汇总，任何一套失败整体非零（L-47）
pnpm --filter @agent-hud/desktop exec tauri build --bundles app   # 打包；不要用 --bundle（生成 DMG 时会自动启动应用）
node --test tests/*.test.mjs             # 交接格式 + 通用规则（含自测）
node scripts/check-rules.mjs             # 只跑通用规则检查
git config core.hooksPath scripts/hooks   # 装提交、推送前的必经检查（每个克隆、每台电脑各一次；不用 --no-verify 绕过）
```

安装：先退出正在运行的应用，再用 `ditto` 把打出的 `.app` 复制到 `/Applications`。

## 结构

```
AGENTS.md            入口（本文件）
.agents/skills/       项目内 skill（postpane-round）；.claude/skills/ 软链接到同一份
CURRENT.md           当前状态与唯一下一步；每轮交接写在顶部
NOTICE               来源与许可说明
src/
  apps/desktop/      React 工作区 + Tauri 外壳（src-tauri/）
  apps/mcp/          给助手用的 MCP 服务
  apps/chrome-extension/  接 chatgpt.com 的 Chrome 插件（ChatGPT 通道）
  crates/            Rust：agents（每个客户端一个目录）、core、runtime、platform、host、hud、messaging（智能体互发消息）、l10n、engine（桥接程序 agent-hud-engine）
  packages/          前端：app（设置、统计、会话窗口）、hud（侧栏）、ui、protocol、engine-client、vite-config
  fixtures/          对照用测试数据
  tooling/           构建入口与仓库检查脚本
docs/
  ROADMAP.md         需求与分阶段路线
  agents/            Matt Pocock 技能读的约定：issue 看板、分流标签、领域文档
  LESSONS.md         本项目的坑（排障、改脚本前先搜）
  OPERATIONS.md      操作手册：交接写法、报告与验收
  templates/handoff.md  交接一节的骨架
  其余               上游技术文档（开发、接入约定、钩子、会话数据、平台构建等）
scripts/
  check-rules.mjs    通用规则检查（只查机器能判定的）
  setup-worktree.sh  新 worktree 备环境（见「运行」）
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

## 已定内容要改，先单独确认

常浩明确定过的内容，以后要改都得先说清楚、等他再确认，给他留出重新考虑的空隙。来由：2026-11-09 第二批上游借鉴在「直接通过」的批量授权下合进 #264，侧栏小人被改成静态图标（L-35）。

- **什么算已定**：项目的已定内容登记表（[docs/DECIDED.md](docs/DECIDED.md)，先查它）、CURRENT.md、PR、issue、记忆里写着常浩「选 / 定 / 定稿 / 验收」的内容，范围包括但不限于外观、动效、交互、文案、行为、数据格式。登记表只是依据之一，没登记不等于没定；拿不准算不算，按已定处理。
- **定了就登记**：常浩选定或验收一项内容的当轮，把日期、定了什么、提交号、基线截图路径（界面类）、在哪定的，在 [docs/DECIDED.md](docs/DECIDED.md) 表里加一行（写法见表头说明），当轮交接写明「已登记 DECIDED.md」。
- **什么时候要问**：动手前发现改动会改变已定内容，不论是本来就要改它，还是改别处会顺带波及它。
- **怎么问**：单独发一条「改动确认」，写四件事，问完就停，等他明确回复，不在同一轮里先做后问：
  1. 原来怎么定的：哪天、在哪定的（CURRENT 哪一节 / PR / issue / 记忆），当时的思路和理由；
  2. 这次要改成什么、为什么要改；
  3. 改的风险和代价：会丢掉什么、可能波及什么；有没有不改也能达到目的的做法；
  4. 请他选：改 / 不改 / 换个改法。
- **批量授权**：「都做」「一口气做完」「直接通过」不算对已定内容的确认。批里只要有一项涉及已定内容，就把这一项单独摘出来照上面问，其余项照常做。
- **没打算改、但碰到同一处代码**（侧栏渲染、小人、动效 CSS 等）：合并前装机，隔 2 秒截两张、和改前对比，确认已定内容没变（L-35）。事后发现改坏了，先撤回恢复，再报告。
- **借鉴上游**：只取做法，不照搬样子。

## 规则

- 验证用的备份、日志等证据放 `~/Library/Application Support/postpane/evidence/`，不放 `/tmp`（全局坑 G-01）；私人数据与完整日志不进仓库。
- 本机服务只监听 127.0.0.1；新增依赖先改 `scripts/check-rules.mjs` 的 `ALLOWED_DEPS`，并在交接里说明理由（`check-rules` 会查）。
- 页面上的时间经统一的格式化函数按北京时间显示，不直接截取 ISO 字符串（全局坑 G-02，`check-rules` 会查）。
- 默认只做电脑版；涉及 UI 时每次出 3 版明显不同的方案并附可打开的预览。
- 源文件 300 行棘轮（`pnpm run check` 里的 `check:file-size`）：`src/` 下 `.rs` `.ts` `.tsx` `.mjs` 自己的代码（不含测试）超过 300 行的记在 `src/tooling/file-size-baseline.json`，只许变短，新文件不许超；变短后跑 `node src/tooling/check-file-size.mjs --update` 收紧基线。确有理由要超的，写进 `src/tooling/file-size-allowlist.json`：`{ "路径": { "max": 上限, "reason": "一句理由" } }`。
- 手写设置文件必须带 `"providers": {}`，否则数据服务报错。
- 图形界面应用找的是 `/usr/local/bin/claude`，不是 nvm 里那份。
- Clawd 小人素材版权归 Anthropic，不可对外发布。
- agent-hud 插件转进会话的消息可能与实际状态不符，据此改动前先核实。
- GitHub Actions 已停用，只允许 squash 合并。
- PR 合并后，马上在那个 worktree 里跑 `cargo clean`（或直接 `git worktree remove` 删掉整个 worktree），不把 6–9 GB 的 `target/` 留着；还要接着用这个 worktree 的除外。漏了的由磁盘瘦身兜底：PR 已合并、静置 2 小时、没在用的会被它清掉。

## AI 接入

全局规则 P-13（`~/.claude/CLAUDE.md` 第 14 节）。和设置 →「AI 接入」页内容一致；改了 AI 功能、对外接口或数据来源，两处一起改：页面在 `src/packages/app/src/settings/AiAccessPane.tsx`，文字和取数在 `src/packages/app/src/lib/ai-access.ts`。

- **默认执行方**：只有 ChatGPT 网页一家，不可切换。用常浩 Chrome 里登录的 chatgpt.com，模型由网页决定、驿窗拿不到。设置页实时显示可用 / 插件没连上 / 插件未登记，附检查时间；插件连着但版本和打包这版驿窗时的不一样，显示「可用 · 插件要重新加载」或「可用 · 驿窗要重装」（#493，接力照常发，工具回复里多一句提醒）。插件没连上时接力直接报错，不换别家。Claude、Codex 只能发起接力，不能当执行方（Codex 发起见 #280）。
- **功能清单**（1 项）：

  | 功能 | 执行方 | 接入方式 | 读什么 | 写到哪里 |
  |---|---|---|---|---|
  | ChatGPT 接力审核（含侧栏左滑「审核 / 讨论」、自动往返，默认最多审 5 轮、设置「智能体插件」可调 1–9 轮，#409；Claude Code 和 Codex 会话都能左滑发起，#282） | ChatGPT 网页（跟随默认），**仅支持 ChatGPT 网页** | 网页桥：Chrome 插件 → Native Messaging `com.postpane.chatgpt` → 驿窗 | Claude Code 或 Codex 会话交来的说明和改动摘要；ChatGPT 读不到本机文件。驿窗另读发起方会话记录末尾（Claude 的 `~/.claude/projects`、Codex 的 `~/.codex/sessions`），只看当前这一轮是谁开的头（常浩插话就重算轮数，#258、#283），并读留话的状态（排队中 / 已领取 / 已开始，#257；Codex 的从它会话记录里看到这一轮开始就算已开始）；按通过结束前用本机 `git ls-remote`（常浩的 git 凭据）回读 PR 当前提交（审核门，#347）；影子读取（#488，默认关：`config.json` 的 `dataShadow` 设为 `true` 并重启驿窗后，插件另在 chatgpt.com 页面里用页面自己的登录状态读名单里会话的对话数据，登录信息不出页面，每条提问最多读三次、最多六次请求，结果经插件内部通道带回、两头按字段白名单校验，只记编号、大小和完成标记，不记正文；关开关时逐个标签页撤销；读页面那一路照旧作数） | `<数据目录>/chatgpt/handoffs.json`（另有 `turns.jsonl`、`launches.json`、`notices.json`；每封回信全文另存 `replies/`，接力审核上限 `reviewLimit` 在 `config.json`，#347；影子读取每次读到什么记一行在 `shadow.jsonl`，#488）；回信转回原 Claude 会话 |

  仅支持 ChatGPT 网页的原因：审核要用常浩 ChatGPT 账号里的项目和记忆；发起方只认 Claude Code 和 Codex 会话（`src/crates/host/src/handoff.rs` 的 `relay`），因为回信要按会话 id 送回去：Claude 经 agent-hud 插件，Codex 经它自己的队列（`thread/queue/add`，#280，`handoff/sending/desk_lines.rs`）。Codex 审核改用智能体互发消息（#278）。审几轮由 ChatGPT 按问题台账判断，驿窗只执行硬规则（本次授权周期上限默认 5、审查链跨 PR 累计、受审版本锚点、末尾格式自动补一次），见 [docs/chatgpt-channel.md](docs/chatgpt-channel.md)「审核门」（#347）。留痕：接力卡时间线记每一步的时间、谁做的、是不是驿窗自动做的（`handoffs.json` 的 `steps`）。
- **对外开放**：只在本机，不开网络端口（stdio → `<数据目录>/tools/mcp.sock`，0600）。
  - 侧栏工具，MCP「agent-hud」：可装到 Claude Code、Codex、Cursor、DeepSeek Harness、Antigravity。能读侧栏布局、快照、会话、用量统计、侧栏截图（账户打码）；能写侧栏草稿（面板里保存才生效）、外观和动画两项偏好。开关是设置 `hudTools`（「允许智能体调整侧栏」，「AI 接入」页和「智能体插件」页是同一个），同时管读和写。
  - 发起接力 `relay_to_chatgpt`：接 Claude Code 和 Codex 会话，能新开或续接一次审核；不受 `hudTools` 管，在「智能体插件」移除 ChatGPT 插件登记即关。这个工具声明了 `openWorldHint: true`，Codex 默认每次调用都要批准；常浩本机在 `~/.codex/config.toml` 给它设了 `[mcp_servers.agent-hud.tools.relay_to_chatgpt] approval_mode = "approve"`，免批准，只对新开的线程生效，删掉这两行即恢复（#286）。
  - 智能体互发消息（#278，移植上游 `b1217c3`）：同一个 MCP「agent-hud」的 `list_sessions`、`send_message`、`start_session`、`get_message`，本机 Claude Code、Codex、Antigravity、DeepSeek Harness 会话之间列出会话、互发消息（对方空闲才送进去，不打断）、开新会话、取回回答；只送发件方写的那段话，不转发会话记录。开关在「智能体插件」单独一节「智能体互发消息」：「允许智能体互发消息」（`agentMessages`，默认关，关着时工具不列出）；「以我的身份发送」（`agentMessagesAsUser`，默认关，标「注意」，打开后消息不带来源标签，对方当成常浩的话照做）；「连续来回上限」（`agentMessagesLimit`，默认 10，常浩插一句就重新计数）。日志只存指纹，在 `<数据目录>/messaging/messages.json`；送达回执在 `<数据目录>/local-client-receipts/`。互发消息也飞接力那种纸飞机，不盖印章（常浩 2026-11-09 选甲）。
- **数据对象**：只读取、不替驿窗产出、不放进可切换项。本机检测到且在「智能体」页开着的才读；每家读哪里见 `lib/ai-access.ts` 的 `sources`。主要几家：Claude Code（`~/.claude/projects`，额度用本机 claude 登录，重启后第一次就读失败时退回 `~/.claude.json` 里 Claude Code 自己记下的读数、只认同一账号，云端会话经 api.anthropic.com）、Codex（`~/.codex/sessions`，本机 codex app-server，顺带查驿窗钩子是否已允许）、Hermes（`~/.hermes/state.db`、`profiles/*/state.db`，不联网）、ChatGPT 网页（Chrome 插件报回合，不读文件）、Antigravity（`~/.gemini/antigravity*/brain`，本机 language server）。DeepSeek、Kimi、GLM、OpenCode 的额度可用驿窗保存的 API Key，存 `<数据目录>/account-credentials/`，界面只显示「已保存」。

`<数据目录>` 在 macOS 上是 `~/Library/Application Support/app.postpane.mac`。

## 交接格式

每轮完成后，在 CURRENT.md 顶部新增一节（旧节保留在下面，过长时归档到 `docs/history/`），骨架照抄 [docs/templates/handoff.md](docs/templates/handoff.md)；`tests/handoff-format.test.mjs` 会检查顶部一节有没有日期、「时间：开工」「测试：」「本轮新坑：」三行，新坑编号在 LESSONS 里要存在。每一行怎么写、报告与验收的防伪造五条见 [OPERATIONS](docs/OPERATIONS.md)「交接写法」「报告与验收」；没做就写「未做」。
