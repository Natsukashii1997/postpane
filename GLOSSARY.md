# 术语表

驿窗的领域用词。issue、方案、测试名提到这些概念时用这里的叫法，不换同义词。架构决定见 `docs/adr/`。

| 术语 | 含义 | 不要叫 |
|---|---|---|
| 工作场所 | Claude、Codex、ChatGPT、DeepSeek 四家，常浩做事的地方；结构相同，能力各异（ADR-0001） | 智能体卡、各家面板 |
| 飞书工作台 | Hermes：两个飞书机器人的在岗、定时任务、最近被问、断线；不进「等你」和接力 | 第五个工作场所 |
| 工作实例 | 工作场所里的一个会话、任务或回合，带它的观察通道 | 场所、条目 |
| 观察通道 | 驿窗知道一个工作实例状态的途径：会话记录、钩子、桌面观察器、Chrome 插件、提问流等 | 数据源（太宽） |
| 工作项 | 一件需要常浩关注的工作：等你、在跑、刚回复或出错，属于一个工作实例 | 通知、消息 |
| 等你 | 有明确的用户动作义务（审批、提问、等你回复），证据仍有效 | 待审核（只是其中一种） |
| 待核对 | 曾经在等，但观察器失联或日志静默，看不清；不当空闲，也不当可点的审批 | 超时、过期 |
| 已处理 | 作答、撤回或确认终止，退出等你 | 清掉 |
| 在跑 | 回合进行中、没有等用户 | 运行中 |
| 刚回复 | 一轮刚完成；回执按各家停留规则收起 | 新消息 |
| 出错 | 一轮失败、限流或中断；偶发出回执，持续阻断挂到恢复 | 空闲 |
| 能力四态 | 某项能力在某家：不支持 / 未启用 / 观察失联 / 正常无事 | 开关 |
| 接力 | 一次跨家协作的独立记录：执行方（Claude、Codex）和审核方（ChatGPT）；各家按参与关系引用 | 某家的接力 |
| 要你管 / 在动 / 静着 | 开着的接力的三组（#427）：要你管＝停、未完暂停、回信到了等你转回、没送出去；在动＝送审中、审核中、返修中；静着＝2 小时没动静且执行方会话不在跑。小收据、ChatGPT 卡、接力卡切单都按这个顺序 | 待审、超时 |
| 票根 | 侧栏静止时每家一格：小人 + 读数 + 状态章 | 图标 |
| 外层展出卡 | 点开小签看到的卡：卡头、等你、在跑、刚回复 | 待审批卡（只是其中一种） |
| 内层接力卡 | 从外层卡头纸飞机、会话行的「接力」小签或 ChatGPT 卡的接力行进入的接力时间线；卡上「上一单 / 下一单」按要你管 → 在动 → 静着切（#427） | 接力看板 |
| 概览通道 | 悬停小收据和整张看板，和操作路径并行 | 第四层 |
| 个性化白名单 | 允许各家不同的地方：小人与动效、印章颜色、脚印读数、ChatGPT 两栏内容、DeepSeek 余额、Hermes 整块 | — |
| 固定场景 | `src/packages/hud/test/scenes/` 里的合成快照，契约测试和预览台共用 | mock、假数据 |
| 场景预览台 | `src/packages/hud/preview/`：用真实组件渲染固定场景 | preview-xxx 脚手架 |

## 代码里叫什么

上面一张表是领域用词。下面几张把界面上的东西、文档里的叫法和代码名对上（2026-11-20 从代码反查补上）。路径省略前缀：`hud/` 指 `src/packages/hud/src/`，`app/` 指 `src/packages/app/src/`，`crates/` 指 `src/crates/`。发现对不上，以代码为准，改这里。

### 界面上的东西

| 界面上的东西 | 文档里的叫法 | 代码名 |
|---|---|---|
| 贴屏幕边的那一条 | 侧栏、动态形态 | `HUDMode` 的 `"logos"`（`hud/model.ts`）；strip、dock、resting、sidebar 都指它；`hud/scene/HUDMarkStrip.tsx` |
| 每家一格的小纸片 | 票根 | stub、mark；`hud/ticket-stub.ts`、`hud/scene/StubPaper.tsx`；数据是 `HUDVendor`（`hud/model.ts`） |
| 票根上的动画角色 | 小人 | bot；`hud/BotMark.tsx`、`hud/bots/`；什么状态演什么在 `crates/hud/src/bots/` |
| 票根上的「审 / 回 / 停」 | 状态章、印章 | stamp；`hud/relay-stamps.ts`、`hud/scene/RelayStamps.tsx` |
| 卡头的圆章「待答 / 待批」 | 章 | seal；`hud/permissions/PaperSeal.tsx` |
| Hermes 机器人的章 | 印章 | `hud/panel/BotStamp.tsx` |
| 小人头上的符号 | — | sign；`hud/bots/bot-signs.ts` |
| 悬停票根出来的小纸条 | 小收据、悬停小收据 | peek、receipt；`hud/scene/AgentPeek.tsx`、`hud/scene/receipt-sheet.ts` |
| 小收据里「等你 · 在跑 · 接力」一行 | — | `hud/scene/WorkLine.tsx`，数据是 `PeekWork`（`hud/workspace.ts`） |
| ChatGPT 的对话、审核两栏 | 两联、ChatGPT 两栏 | desk；`hud/chatgpt-desk.ts`、`hud/scene/DeskLines.tsx` |
| 点票根或停久后出来的一家面板 | 单家面板 | `SourceHoverPanel` 带 `focusVendor`（`hud/HoverPanel.tsx`） |
| 所有家的大面板 | 整张看板、悬停面板 | board；`SourceHoverPanel` 不带 `focusVendor`；`hud/panel/AgentBoard.tsx` |
| 票根旁挂的提示条 | 小签、票签 | tag；`hud/scene/SideTags.tsx` |
| 小签折起来的窄条 | 窄签 | slip；`hud/scene/tag-fold.ts` |
| 点开小签的卡 | 外层展出卡；日常也叫展开卡 | news card；`hud/scene/HUDExpandedSurface.tsx`（外壳）、`hud/scene/NewsCard.tsx`（内容）、`hud/permissions/`（等你的各种卡） |
| 一轮完成或出错的提示 | 回执、刚回复 | island event、news；`hud/IslandNews.tsx`、`hud/alerts/CompletionAlertView.tsx`；后端 `crates/core/src/island_events.rs` |
| 接力时间线那张卡 | 内层接力卡 | handoff card；`hud/alerts/HandoffCard.tsx` 和同目录 `Handoff*`、`handoff-*` |
| 列表里的接力行 | 接力单 | `hud/panel/RelayRows.tsx`、`hud/panel/ReviewSlip.tsx`、`hud/alerts/RelayFrame.tsx` |
| 票根之间飞的纸飞机 | 纸飞机 | flight；`hud/scene/FlightLayer.tsx`、`hud/scene/flight-plan.ts`；后端 `crates/messaging/src/flights.rs` |
| 卡头进出接力的方块 | 白色纸飞机 | `hud/alerts/RelayToggle.tsx` |
| 会话行左滑出来的操作 | 左滑发起 | tray；`hud/panel/relay-tray.ts`；协议里是 `RelayLaunch` |
| 侧栏下面挂的球 | 挂件 | pendant；`hud/app-pendant.ts`、`hud/scene/AppPendant.tsx`（随手记）、`hud/scene/DiskPendant.tsx`（磁盘瘦身）；后端 `crates/host/src/float_notes.rs`、`crates/host/src/disk_slim/` |
| 纸张质感的底 | 纸 | paper；`hud/paper.ts`。不是纸面的底叫 ground：`hud/ground.tsx` |
| 刘海周围的光 | 光晕 | glow；`hud/HUDGlow.tsx`、`hud/glow-*.ts` |
| 贴刘海的形态 | 刘海形态 | `HUDMode` 的 `"notch"`；代码里的 island 多半指它 |
| 只画环和数字的形态 | 简约形态（设置里已无入口，#397） | `HUDMode` 的 `"simple"`；`hud/scene/simple-panel.ts` |
| Hermes 那一块 | 飞书工作台 | `hud/panel/HermesBoard.tsx`；注释里也叫 Feishu desk |

### 状态和领域词

| 术语 | 代码名 |
|---|---|
| 工作场所 | place、workspace；`hud/workspace.ts` 的 `workspaceOf` |
| 等你 | waiting、request、approval；后端 `crates/core/src/requests.rs` |
| 待核对 | stale；`hud/stale.ts` 的 `isStale` |
| 在跑 | running、working、busy；`hud/stale.ts` 的 `isBusy` |
| 接力 | 协议和后端叫 `Handoff`（`src/packages/protocol/src/handoffs.ts`、`crates/host/src/handoff.rs`；记录与状态在 `crates/host/src/handoff/book.rs` 及 `book/`，7a 批 2 从 platform 搬来）；hud 的文件名和 MCP 工具名叫 relay（`relay_to_chatgpt`） |
| 接力的执行方 | doer；字段 `claude_session` / `claudeSession` 在执行方是 Codex 时装的是 Codex 线程 |
| 接力的三个角色（后端） | `Desk`：推进一张接力的编排者（host）；`Book`：全部接力的记录和落盘（platform）；`Lines`：收发通路，测试里换成 `Fake` |
| 中转站 | 第三方 API 代理，也叫 relay：`RelaySource`、`crates/agents/src/relays.rs`、`app/settings/RelaysPane.tsx`。和接力无关 |
| 固定场景、场景预览台 | scenes；`src/packages/hud/test/scenes/`、`src/packages/hud/preview/` |

### 一个词几个意思

读代码时先分清是哪一个。

| 词 | 意思 |
|---|---|
| relay | ① 接力（hud 文件名、`relay_to_chatgpt`、快照里的 `relayLaunches`）；② API 中转站（快照里的 `relays`、`RelaySource`）；③ 注释里指转接进程，即 Chrome 启动的那个或 MCP 进程自己 |
| handoff | ① 接力（`Handoff`、`handoffs.json`）；② 文档里的「交接」（`docs/templates/handoff.md`、CURRENT.md 每轮一节）；③ 把已启动的 Claude 任务移进桌面应用（`crates/platform/src/delivery/handoffs.rs`）；④ 带「【交接】」的开始卡（`claude_handoff`，`crates/agents/src/claude/transcript.rs`） |
| engine | ① 桥接程序 `agent-hud-engine`（`crates/engine`）：Chrome 插件、MCP、钩子都经它连到应用；② 各家客户端的命令行（`engine_candidates`）；③ 读账户时起的子进程（`agents::account::Engine`）；`src/packages/engine-client` 是 Node 侧连 ① 的传输，只有 MCP 和开发模式用 |
| 一家的标识 | 两套键：来源 id（`"chatgpt"`、`"claude"`，会话的 `source`）和标记键（`agentArtworkKey`，别名 `vendorKey`、`botKey`；ChatGPT 的标记键是 `"openai"`）。vendor、source、provider、agent、mark、place、client 在不同文件里指的都是「哪一家」，比较前先看手里是哪套键 |
| island | 上游对刘海的叫法；`island_events` 是额度告警、登出、回执这类事件流，和形态无关 |
| channel / 通道 | ① 术语表里的观察通道、概览通道；② `crates/agents/src/channel.rs`：客户端原生通道的描述；③ ChatGPT 插件的套接字服务（`crates/platform/src/clients/chatgpt/mod.rs`） |
| replies | ① 把话作为用户的下一条消息送进会话（`crates/agents/src/replies.rs`、`crates/core/src/replies.rs`）；② ChatGPT 回信全文的目录 `<数据目录>/chatgpt/replies/` |
| delivery | ① 把话送进运行中的会话（`crates/platform/src/delivery/`）；② 快照里的 `requestDeliveries`：审批回答送没送到 |

### 项目的三个名字

- **Open**：上游最早的 Swift 原生版。注释里的「Open's X」「*.swift」指它，源码不在本仓库。
- **Agent HUD**：上游的 Tauri 移植版，驿窗从它的提交 `917df21` 分出来。包名 `@agent-hud/*`、crate 名 `agent-hud-*`、MCP 服务名 `agent-hud`、环境变量 `AGENTHUD_*` 都沿用它，是内部代号，不打算改。
- **驿窗 PostPane**：产品名。应用名、标识 `app.postpane.mac`、数据目录、Chrome 插件用它。

### 编号怎么查

| 写法 | 是什么 | 去哪查 |
|---|---|---|
| `#123` | issue 或 PR 号 | 本仓库 GitHub |
| `L-12` | 本项目踩过的坑 | `docs/LESSONS.md` |
| `G-12` | 跨项目的坑 | 仓库外：`agent-kit/LESSONS.md` |
| `E-12` | postpane-round 这份 skill 的进化记录 | `.agents/skills/postpane-round/EVOLUTION.md` |
| `ADR-0001` | 架构决定 | `docs/adr/` |
| `P-13` | 常浩的全局协作规则 | 仓库外：`~/.claude/CLAUDE.md` 对应节 |
| `L1`–`L3` | 一次接力审核的风险级（`Risk`） | `docs/chatgpt-channel.md`「审核门」 |
| `P0`–`P2`、`P1-03` | 审核问题的严重度和台账编号。每次评审各自从头编，同一个 `P1-01` 在不同 issue 的评审里不是同一条，引用时要带 issue 号 | 对应 issue 或 PR 的审核记录 |
| 甲 / 乙 / 丙 | 某次三版预览里的一版 | `docs/DECIDED.md` 按日期和 issue 号找 |
