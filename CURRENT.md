# 当前状态

当前阶段目标：ROADMAP 阶段 5「多智能体接力」做完并实机验收。（2026-11-08 常浩确认，digital-twin#114）

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
