# 驿窗 PostPane 路线

定位：守在屏幕边上的个人工作中枢。汇总 AI 助手的额度、实时状态、审批、提问和回复，能一键跳回会话；第三方应用只做一键唤起。

代码源自 Agent HUD `917df21`（见 `NOTICE`），不再与上游同步，允许大改。默认只做电脑版；涉及 UI 时每次出 3 版明显不同的方案并附可打开的预览。

## 已拍板（2026-11-04）

1. **保留的助手**：Claude Code、Codex、Hermes，另保留 Grok（客户端与它的小人，以后可能接入），其余全部裁掉。iPhone/局域网、中转站、价格、更新器一并裁掉；每个模块直接删代码，一个模块一个 PR，出问题撤回该 PR（2026-11-04 改，原定先关后删）。
2. **改名范围**：标识定为 `app.postpane.mac`；历史数据迁到新目录保留；内部代码名 `agent_hud_*`、`@agent-hud/*` 暂不改。
3. **自建应用接入暂缓**：先做阶段 0–2，自建应用（牛马之家、数码世界）以后再议，已有的调研结论记在文末。

## 阶段

### 阶段 0 立规矩与基线

- 目标：能稳定构建，知道现状，项目协作骨架就位。
- 交付物：
  - `pnpm install` 后记录构建与测试基线（哪些原本就失败），写进 `docs/BASELINE.md` 或 LESSONS。
  - 用 `/project-starter` 铺 `AGENTS.md`、`docs/LESSONS.md`、交接模板（先列计划等确认）。
  - `digital-twin/projects.json` 登记提案（只出提案）。
  - 在现装的 `/Applications/Agent HUD.app` 上真实验证：Claude 发起权限请求 → 侧栏弹审批卡 → 回复送回会话。
- 验收：基线有记录；`pnpm --filter @agent-hud/desktop exec tauri build --bundles app` 产物能启动；审批卡往返一次成功。
- 风险：测试原本就有失败的，只记录不修；审批卡不通时先修它，其余阶段顺延。

### 阶段 1 裁剪

- 目标：只留 Claude Code、Codex、Hermes、Grok 和驿窗要用的部分。
- 裁掉：
  - iPhone/局域网：`src/crates/lan`、`src/crates/share`、设置页 `LocalNetworkPane`。
  - 中转站：`src/crates/agents/src/relays.rs`、`RelaysPane`、`RelayForms`。
  - 价格：`PricesPane`、`PriceFields`，以及依赖价格的成本显示。
  - 更新器：`UpdatesPane`。
  - 其余助手：`src/crates/agents/src/` 下除 `claude`、`codex`、`hermes`、`grok` 外的客户端目录，以及对应的钩子格式、账户读取、设置页、图片素材；Grok 的小人造型（`src/packages/hud/src/bots/` 里的 Grok 定义）一并保留。
- 做法：每个模块直接删，一个模块一个 issue、一个 PR，删前删后都跑全套测试。批次：1-0 修 MCP 测试签名；1-1 局域网；1-2 中转站；1-3 价格与成本；1-4 更新器；1-5a Antigravity、DeepSeek 及其专属通道；1-5b 其余助手；1-6 文档收尾。
- 验收：每步构建和测试全过；设置页不再出现；`lsof -i` 查不到局域网端口；Claude/Codex 的额度、会话状态、审批卡回归通过，Hermes 会话和用量照常显示。
- 风险：成本统计依赖价格表；`check:clients` 会校验 agents 目录；`docs/parity/` 会过时，裁完后归档。
- 说明：Hermes 在代码里只读会话和用量（`~/.hermes/state.db`），没有钩子、审批和额度读取；要更多能力另立事项。

### 阶段 2 改名与本机切换

- 目标：应用以驿窗身份运行，本机配置全部切到新应用。
- 交付物：
  - 应用名、标识 `app.postpane.mac`、窗口标题、托盘与菜单文字。
  - 图标出 3 版供挑选。
  - 数据目录迁移：复用 `src/crates/platform/src/data_folder.rs` 的一次性迁移，把 `app.agenthud.mac` 迁到新目录。
  - 环境变量 `AGENTHUD_DATA_DIR`、MCP 服务名 `agent-hud`、Claude 插件名、中转程序 `agent-hud-mcp` / `agent-hud-engine` 改名。
- 切换顺序：备份配置 → 退出旧应用 → 装新应用 → 设置里关掉再打开“客户端回调” → 重新添加 HUD 工具 → 卸旧插件装新插件 → 经常浩同意后移走旧应用。
- 验收：`~/.claude/settings.json`、`~/.codex/hooks.json`、MCP 与插件配置里搜不到 `Agent HUD.app` 和 `app.agenthud.mac`；额度能读到；历史统计还在；一次真实会话的状态能在侧栏看到。
- 风险：
  - 钩子指向旧路径时，Claude/Codex 每次调工具都会出错，所以先关旧回调再动旧应用。
  - 新旧应用同时运行会各用一个数据目录、重复收集，旧应用必须退出并移走。
  - macOS 系统权限要按新标识重新授权。
  - 改应用包前先整份备份，改完实际打开一次（全局坑 G-15）。

### 阶段 3 唤起类应用

- 目标：豆包、ChatGPT 桌面版一键唤起。
- 做法：`open -b <应用标识>`；具体位置随阶段 4 的 UI 方向定。
- 验收：点击能唤起或前置；没安装时图标置灰。

### 阶段 4 UI 方向与小人形象

- 范围：侧栏静止状态、悬停面板、图标、小人。
- 做法：每一版出 3 个明显不同的方案并附预览。小人优先用程序绘制的机器人体系（`src/packages/hud/src/bots/`），改参数就能造新角色。
- 注意：之前的软糖、星轨、手账三版已否掉，不沿用；开画前先对齐想要的感觉。Clawd 素材版权归 Anthropic，不可对外发布。
- 依赖：可与阶段 1–3 并行。

### 阶段 5 助手传话评估

- 结论草案：不做主动传话和接力，只保留“看见状态、审批、跳回会话”；上游的飞行动画和把话送进会话的功能默认关闭。
- 依据：数字分身 PRD Q5 已冻结数码世界的调度、接力、提醒路线，调度归 Hermes；常浩现有的 Claude/Codex 接力流程照旧。
- 验收：常浩确认后更新本节。

## 暂缓：自建应用接入

调研结论，供以后重启时参考：

- `docs/agent-contract.md` 是编译进程序的 Rust 描述，不是放文件就能接入的插件，“不改核心代码套用约定”不成立。
- 宿主留有扩展口 `ProductExtension`（`src/crates/host/src/extension.rs`），`src/apps/desktop/src-tauri/src/main.rs` 目前传 None。它的 `publish` 发出 `product:event`，前端还没有接收方。
- 三条候选路：
  - A：把应用当作“助手”接入，读事件记录文件，现成的状态、小人、光边、提醒卡都能用，但会混进用量统计。
  - B：扩展口读收件箱目录里的事件记录文件，侧栏新增“应用”区块，边界清楚。倾向这条。
  - C：侧栏轮询应用接口；应用不在线就收不到，还要开放本地接口（全局坑 G-07）。
- 事件四类：正在跑、等你处理、有新结果、空闲。每个应用推哪些事件，常浩还没给。
- 数码世界已收缩为看板和资产库，事件很少，重启时先接牛马之家。
