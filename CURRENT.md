# 当前状态

当前阶段目标：ROADMAP 阶段 5「多智能体接力」做完并实机验收。（2026-11-08 常浩确认，digital-twin#114）

## 侧栏 REPLY 和失败提醒不再给子任务（subagent）单独出行（#578）（2026-11-28，Claude，常浩 11-28 截图追问「还是出现同一个会话多次？」；回到 11-28 已定的「侧栏单位是单一任务会话」，不改已定内容；已提交，PR 见描述）

- 时间：开工 `2026-11-28 10:00`（`date '+%F %H:%M'` 记录）。来由：#565/#569 的按会话去重已在装着的包里（`4b853dea` 含 `replyLine`），侧栏仍出现 4 行以上「你在做一个 skill 的盲测执行方……」。实机快照里这些行的 `sessionId` 都是 `agent-a…`，父会话都是 `b633847f`「设计规范失效审核」：是主会话派出的子任务，各有编号。
- 改了哪些文件：
  - 你要求的：`src/crates/core/src/island_events/turns.rs` 的 `ended()` 跳过带 `parentId` 的会话（回复 `completion` 和失败 `turn-failed` 共用它，两种都不再为子任务出行），新增测试 `a_subagent_that_answers_or_fails_is_not_a_line_of_its_own`。
  - 我顺手改的：`docs/LESSONS.md` 新坑 L-81。
- 同类：查了另外两条会产生回复的路。钩子补的会话（`hook_events.rs` completion-hook）用主会话编号、`parentId` 为空，不会冒出子任务行；侧栏前端只在看板 `agent-board.ts` 用 `parentId`（本来就把子任务收在父会话下）。回复队列不落盘，装机重启后旧的子任务行一起清掉。
- 测试：见 PR 描述（三条全量）。
- 验证：见 PR 描述。
- 截图：无界面改动（少出几行，版式不变）。
- 发布与回读：见 PR 描述。
- 与授权不一致之处、遗留问题、范围外发现：Codex、DeepSeek、Kimi 的子任务同样带 `parentId`，一并不出行；子任务自己失败、触到额度也不再单独提醒，由主会话那一轮体现。
- 本轮新坑：L-81。

## 接力治本第 3 步其余 + 第 5 步日志：等回信按信号判（在写就接着等，2 小时总上限）；驿窗自己停下统一写 postpane.log（#544）（2026-11-27，Claude，接交接卡续做；「按信号判」是常浩对改动确认回「改」，日志统一入口按交接标「可直接做」；已提交，PR 见描述，已登记 DECIDED.md，未装机）

- 时间：开工 `2026-11-27 18:45`（`date` 记录）。来由：#544 第 3 步「判活按信号」（问题清单：11-24 #319 ChatGPT 写了 54 分钟，30 分钟时被判没回信）、第 5 步「静默停摆」里的日志统一入口。
- 改变的行为（常浩 11-27 对改动确认回「改」）：原来送达满 30 分钟一律停下交还常浩、侧栏改「未审」。现在满 30 分钟后，这一阶段最近 5 分钟内有重读报 `streaming` 就接着等，最多等 2 小时（从这一阶段开始算）；一直没读到在写的照旧 30 分钟停。停因和给会话的通知分三种：「ChatGPT 30 分钟没回信」（原样）、「ChatGPT 写到一半没了动静（5 分钟没在写）」、「ChatGPT 写了 2 小时还没写完」。侧栏「未审」按同一套规则、同一刻改章。
- 你要求的：
  - 驿窗：`answers/book_reread.rs` 的 `Reading` 加 `streamed`（落盘，旧文件读得进）、`Handoff::writing_at` / `wait_over` / `waited_out`、`Waited` 三种、`WRITING_FRESH_MS` 5 分钟、`REPLY_MOST_MS` 2 小时；重读报 `streaming` 时记下时间（原来次数为 0 时不记）。`book.rs` 的 `overdue` 改用 `waited_out`，三种停下都标 `Cause::NoAnswer`。`notice/book.rs` 的 `Trouble::NoAnswer` 带上是哪一种（按停下那一刻再判，`tell` 同一拍里先停后通知），`notice/desk.rs` 通知开头随之换说法，后半句不变。
  - 侧栏：`relay-stamps.ts` 新 `waitEnds`、`WRITING_FRESH_MS`、`REPLY_MOST_MS`，「审」/「未审」和下次换章时间都按它；`protocol/handoffs.ts` 的 `Handoff` 加 `rereading`（快照里本来就带）。
  - 日志（第 5 步）：新 `notice/desk_log.rs`，`Desk::change` 每次改完账本后比对各接力新增的、驿窗自动记的 `stop` / `fail` 步，一步一行 `PostPane stopped / gave up on handoff <编号>: <卡上那句>`；启动前已有的步骤不算新增，重启时驿窗自己停下的会记。删了 `desk_undrawn.rs` 里页面改版那句单独的日志（统一入口会写，卡上那句里有认不出哪几样）。
  - 文档：`docs/chatgpt-channel.md`（侧栏章、等回信到头）、`docs/接力规范.md` 第 3、5 节、`docs/接力异常全表.md` E7 等回信一格、`docs/DECIDED.md` 新一行，2026-11-07 那行备注「部分取代」。
- 我顺手改的：`handoff.rs` 里 `tossed` 的初始化改用同一个 `log::counts`（原来是同样的一段，行为不变）；`docs/LESSONS.md` 新坑 L-78。
- 同类：搜了 `REPLY_WAIT_MS` 的所有用处，按时间判等回信的只有 host `overdue` 和侧栏 `relay-stamps.ts` 两处，都改了；`desk_texts.rs` 的 `no_answer` 文字不变（仍是一直没写那种）。写 `note!` 的停下只有页面改版一处，已收进统一入口。
- 测试：`pnpm run check` 第一次 `check exit 1`（Prettier 报 `relay-stamps.ts`、`relay-stamps.test.ts` 两个文件格式），`prettier --write` 后重跑 `check exit 0`（`check.log`、`check2.log`）；`pnpm test` `test exit 0`，「全量测试汇总：6 套，失败 0 套」，Rust 合计 `1187 passed; 0 failed`，前端 `ℹ pass 535`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 200`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`（`test.log`；跑在格式化之前，格式化后 `relay-stamps.test.ts` 单独重跑 `ℹ pass 12` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`（`node.log`）。证据目录 `~/Library/Application Support/postpane/evidence/2026-11-27-544-writing-wait/`。
  - 先红：host 新测试在旧 `overdue` 上 `FAILED. 3 passed; 2 failed`（`red-host.txt`，过的 3 条守「一直没写照旧 30 分钟停」「上一阶段的在写不算」「旧文件读得进」）；侧栏新测试在旧 `relay-stamps.ts` 上是导入就失败（缺新导出），算弱红（`red-hud.txt`）；日志 2 条测的是新函数，旧代码上不存在，没有先红。
- 验证：替身通过（单测）。真实环境未验：要等一次 ChatGPT 写超过 30 分钟的真实接力，看 `turns.jsonl` 里每 2 分钟一行 `streaming`、卡上不停；以及下一次驿窗自己停下时 `postpane.log` 里有那一行。
- 截图：无界面外观改动（「未审」章样子不变，只改盖章时刻）。
- 发布与回读：未发布（未装机）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 第 3 步「空占位被误判成没画出」没改代码：真实页面只读看清了隐藏副本（回答格子高 0、`getClientRects` 为 0、正文空）和显示那份（有高、有字），但空占位和「后台没画出」时显示那份的样子都没看到（空占位要在 ChatGPT 里发一句再点停止，要常浩同意；后台状态 Claude in Chrome 造不出，L-78）。外层是虚拟化轮次，只凭「有高度、没正文」判空占位会把 #457 那种真没画出误判掉，所以先不改。证据 `evidence/2026-11-27-544-placeholder-probe/real-page-hidden-vs-drawn.md`。
  - 第 2 步端到端仍在等常浩两步操作（关掉插件开的「页面自检回复」标签页、在测试接力 `h1a21b81f47301` 卡上点「继续自动」）。18:45 回读：卡还是 13:44 停下、14:57 停读之后的样子。
  - #539 那张接力（`h1a2121c4a2101`）11-27 已被「24 小时没动静」自动结束，交接里「装机后看它 5 次内停读」已无对象，装机后改看新接力。
  - 影子读取 401 后自动恢复（第 5 步另一半）没做：改 #488 已定内容，要先发改动确认。
  - 主线：接力治本｜✅ 0、1、2（端到端待验）、3 缺陷修复、3 按信号判、5 日志入口 ⏳ 3 空占位（等真实样子）、5 影子读取恢复（改动确认）、4、6、7。
- 本轮新坑：L-78。
## 侧栏「等待处理」与「积压事项」按规范版改 7 项，积压行再改成「正在进行」的版式（停住的进度环、去掉 WAIT、细线框按钮、标题黄色）；小签 REPLY 回到蓝色（#562 #563）（2026-11-28，Claude，常浩看规范版回「都按推荐」，看实机后要求积压行改层级、选图标「丙」、标题「用黄色」；已提交、已推送 PR #564，已登记 DECIDED.md，已装机 `8bcbcb11881d`，等常浩看实物）
- 时间：开工 `2026-11-28 04:41`（按交接卡转来的时间，约数）。来由：常浩 11-28 定了一套规范版（https://claude.ai/artifact/F46pSwSMyFUjq2CfyDTdGK ），7 项加小签 REPLY 变黄的 bug，做进 PR #564。开工前用 `list_events` 和会话记录核了原话（04:26「都按推荐」，04:31 补按钮位置、字数工整和「转给那个会话」）。
- 行为变化（动手前已在会话里列出）：「等待处理」默认展开排第一的那条，REPLY 也能展开，同一时间只展开一条，只能回 Claude 里答的提问不再被拉进前 4 条；展开的 REPLY 小字写收尾、大字写下一步、右下「知道了」（只从驿窗收起，不往会话里发东西）；回复摘要去掉 Markdown 星号；积压签由红色「等你」换成紫色 WAIT；积压按钮「继续 / 不做了」改「继续 / 停止」，跟在问你最后一行右边，确认改「停止 / 取消」；小签 REPLY 由黄回到蓝，审批类的黄收成纸面 ochre。积压标题行补等了多久、问你全文换行（只加内容）。
- 你要求的：`permissions/approval-list.ts`（`openEntryId` 默认展开第一条）、`permissions/ApprovalContent.tsx`（回复也能展开、只保留点选的那条在视野里、`drop` 收起回复）、`permissions/ReplyDetail.tsx`（新：展开的 REPLY）、`permissions/reply-closing.ts`（新：读回复的收尾、去星号）、`permissions/tag-tone.ts`（新：类型签取色唯一入口 `toneInk`，加 WAIT / `wait`）、`paper.ts`（`violet`）、`alerts/CompactAlertView.tsx`（小签改走 `toneInk`）、`panel/BacklogFold.tsx`（WAIT、等了多久、继续 / 停止）、`panel/BacklogLine.tsx`（新：问你全文 + 按钮跟在最后一行）、`panel/backlog.ts`（`backlogWaited`）、`panel/SessionsSection.tsx` 与 `panel/PlaceRows.tsx`（积压行的写法，保留左滑）、`scene/NewsCard.tsx`；`docs/design/卡片版式规范.md` 加「组件一致性」；`docs/DECIDED.md` 两行。
- 我顺手改的：`permissions/CardButton.tsx`（新：卡片按钮一份，ASK 卡的提交 / 跳过 / 返回 / 知道了 / 打开智能体插件也换成它，样式不变，`PermissionQuestionCard.tsx` 少 63 行）；`alerts/reply-list.ts` 的 `replyMessage` 去星号（普通回复卡的摘要和正文跟着去掉）；`panel/fold-store.ts` 加 `pickStore`，展开哪条、哪条在问「确定停止」两份侧栏共用（#430 同一个问题），关侧栏时复位（`scene/close-with-sidebar.ts`）；`panel/theme.ts` 加 `clipped`，`SessionsSection.tsx` 6 处重复的截断样式收成它；`ApprovalContent` 去掉不再用的 `selected` 参数；场景预览台加 `claude-reply-first`、积压场景换长问句；`file-size-baseline.json` 收紧 3 个文件。
- 同类：搜了各处给类型签自己取色的写法（`tone ===`、`ApprovalTag color=`），只有 `CompactAlertView` 一处另取，已改；搜了显示回复原文的地方，`ApprovalContent` 摘要和回复卡共用的 `replyMessage` 两处，都去掉星号。
- 测试：新测试 `src/packages/hud/test/waiting-spec.test.ts` 和实现一起写，事后放回改动前的代码上跑，因缺 `WAIT_BADGE` 等导出整份失败（先红是事后补验，不是先写测试）。三条全量：`pnpm run check` `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 合计 passed 1193，前端 `ℹ pass 543` `ℹ fail 0`，MCP 9，插件 14，Chrome 插件 200，注入脚本 11）；`node --test tests/*.test.mjs` `ℹ pass 65` `ℹ fail 0`。场景文件在全量跑的过程中改过，补跑侧栏包 `node --test src/packages/hud/test/*.test.ts` `ℹ pass 462` `ℹ fail 0`。证据 `~/Library/Application Support/postpane/evidence/2026-11-28-564-spec/`。
- 验证：替身通过（场景预览台 127.0.0.1:1482，1440×900）。`claude-reply-first`：第一条 REPLY 默认展开，小字收尾、下一步大字、右下「知道了」，只能回 Claude 里答的提问在「展开其余 2 条」里；`claude-backlog`（纸面卡）：紫色 WAIT、「398 小时」、长问句最后一行和「继续 / 停止」同行，短句这一行放不下按钮时另起一行，按钮和文字至少隔 10 像素；`claude-reply-card`：小签 REPLY 颜色读回 `rgb(143, 176, 236)`（纸面蓝）。预览台里面板被侧栏场景层盖住，积压标题是用页面脚本点开的。未在真实侧栏验证。
- 截图：证据目录 `scene-reply-first.jpg`、`scene-backlog-paper.jpg`、`scene-backlog-notch.jpg`（场景预览台，非实机）。
- 发布与回读：未发布。
- 与授权不一致之处、遗留问题、范围外发现：刘海模式（没有纸面）下主按钮沿用 ASK 卡在刘海里的绿色，规范版只画了纸面；和 ASK 卡一致，没另改。
- 第 3 版（同日，看实机后返修）：常浩指出 WAIT 签放进左边图标列、和小人与在跑方点成了一级，层级不对。改成：左列放积压自己的图标 `panel/BacklogMark.tsx`（紫色停住的进度环，只呼吸不转，三选一选丙，预览 https://claude.ai/artifact/Sx7Ztr2k2Vhf7Uo5qgTKLx ）；去掉 WAIT 签和 `wait` 色调；问你改成在跑那一行的 12 号灰字；「继续 / 停止」改成 `CardButton` 的轻按钮（`quiet` / `quietStop` / `quietSure`，细线框、高 20、无图标）；积压段标题文字黄色（`SessionsHeading` 加 `color`）。顺手：`SessionsSection.tsx` 四处重复的第二行样式收成 `underTitle`；`unified-card.test.ts` 网格那条跟着新写法改。测试先红 `red-backlog-v3.txt`（`ℹ pass 4` / `ℹ fail 2`），三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」（前端 `ℹ pass 546`，Rust 合计 1193）；`ℹ pass 65` / `ℹ fail 0`（`check-3.log`、`test-3.log`、`rules-3.log`）。
- 发布与回读：装机包是 `tmp/564-spec-560`（#564 `5e21539` + #560 `fd3cdeb`，worktree `.claude/worktrees/564-spec-install`），不含 #573（`e48b7a5`，合并时再合最新 main）。`install.sh 564-spec-v3 <产物> --takeover`（接管前一个合并包 `e07012a3446d`，装它的「侧栏回复｜每会话只出现一次」会话回话同意覆盖）：产物 `8bcbcb11881d` / 已装 `8bcbcb11881d`，签名正常，冒烟侧栏在动，没有权限弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-28-564-spec-v3/PostPane-e07012a3446d.app" /Applications/PostPane.app; open /Applications/PostPane.app`。实机离屏渲染 `evidence/2026-11-28-564-spec-v3/real-claude-panel-board.png`：「积压事项 · 4」黄色、在正在进行下面；积压段折着，展开后的样子未在真实侧栏看（要动鼠标）。
- #561：合了最新 main（`57b3552`，冲突只在 CURRENT / DECIDED，两边都留），全量 check 0、6 套里 Chrome 插件一条计时测试超时失败（机器同时在打包，26 秒），单独重跑 `ℹ pass 200` / `ℹ fail 0`，已推送。
- 范围外发现：看板面板「等待处理」的「等你」签也在图标列（11-14 定的版式），没动，已转给「设计规范失效审核｜层级对齐类错误根治」会话。
- 实机验收（2026-11-28 09:25–09:38，接手会话，常浩回「都按推荐」同意全屏、「停 Mac 合盖」选卡）：积压展开态截图已发常浩（`evidence/2026-11-28-561-564-merge-main/real-backlog-zoom.jpg` 等，实机）；REPLY「提交」实点：测试会话 `local_4e12de73` 收到「测试收到」，通过。积压「停止」实点「Mac 合盖」：行消失但会话没收到（它的提问 11-09 就过期了，旧代码没有提问就只移走行），不通过。
- 修复（`5a637a3`）：核心新加 `tell_session`，没有能回答的提问时把「这件事不做了，停掉」送进会话（和回答提问同一条路，进程已结束的由 host 后台续接）；送到才移走行，送不到行留着写「没发出去：原因」。属回到已定行为（DECIDED 第 127 行「替你给会话发」），不改已定内容。新测试：core `the_backlogs_stop_sends_its_words_into_a_session_with_no_question_left`、hud `waiting-spec` 一条。
- 修复后实机复验（2026-11-28 12:14，装 `e291aa514a36` = 本分支 + #560，常浩回「停月度用户策略」选卡）：确认提示写「会替你给这个会话发『这件事不做了，停掉』」；点确认后显示「没发出去：这个会话还没加载 Agent HUD 插件……」，行留着，会话记录行数前后都是 1099（没写进去）。部分：拒绝这条路实机通过；送到这条路和 REPLY「提交」走同一个 `reply`，那条上午已实机通过，积压行上没有再实发验证。截图 `evidence/2026-11-28-564-stop-tell/real-stop-confirm.jpg`、`real-stop-refused.jpg`。
- #561 已 squash 合并（`8f552b6`），本分支合了它之后的 main；冲突只在 CURRENT / DECIDED / 场景数据，DECIDED 去掉了合并带进来的三行重复。
- 本轮新坑：无

## 设计规范失效审核：卡片版式规范写成「每种元素放在哪」，新增 `check:card-layout` 机检（2026-11-28，Claude，常浩要求「深度审核，说清楚原因并修复，确保以后不再犯」，经 #564 会话转来；已提交，PR 见描述；无需发布）

- 时间：开工 `2026-11-28 05:17`（`date '+%F %H:%M'` 记录）。来由：积压事项的 WAIT 签放进了图标列（常浩 11-28 05:11 指出），同类界面规范错误反复出现，他写的全局 DESIGN.md 没约束住。
- 改了哪些文件：
  - 你要求的：`docs/design/卡片版式规范.md`（开头写什么时候读、要连全局 `ui-system/docs/design-spec/DESIGN.md` 一起读；新增「每种元素放在哪」表、「同一种事，同一种行」、11-28 正反例；例外第 1 条写明只管章；新增「画预览、规范版时」「机器查的几条」）；`src/tooling/check-card-layout.mjs`（新：基线与命令行）、`src/tooling/card-layout-rules.mjs`（新：读 TSX 查三条：类型签进图标列、缩进写死数字、签自己挑颜色）、`src/tooling/card-layout-baseline.json`（新：16 处旧问题）；`package.json` 加 `check:card-layout` 并接进 `check`，根目录开发依赖加 `@babel/parser` 7.29.9（理由：机检要读 TSX 语法树，仓库里的 TypeScript 7 不再带可调用的解析器；这个版本已在依赖树里，离线装上）；`scripts/check-rules.mjs` 的 `ALLOWED_DEPS` 加它；`tests/check-card-layout.test.mjs`（新：9 条，第一条用 #564 分支 `f8cebde` 原样摘出的 WAIT 写法）；`AGENTS.md`「做什么事之前读哪份」那一行改成「动侧栏任何界面，含画预览和规范版」并指向两份规范和机检；`.agents/skills/postpane-round/SKILL.md` 测试一步加界面自查；`docs/LESSONS.md` 新坑 L-80。
  - 我顺手改的：记忆 `same-component-same-style.md`（原写「全局版在 CLAUDE.md 第 9 节」，实际没有，已改正）、`postpane-one-left-grid.md`（补类型签不进图标列）。
- 同类：搜了 hud 全部 TSX 的网格行、`ApprovalTag` 调用、按 tone 挑颜色的分支：16 处旧问题（写死数字 10 处、签自己挑颜色 6 处）记进基线，这次不改界面代码；用 #564 分支当前代码跑，新增 3 处（WAIT 进图标列、WAIT/等你共用签自己传颜色、ApprovalContent 多一处文字线 30）。
- 测试：`pnpm run check` `check exit 0`；`node --test tests/*.test.mjs` `ℹ pass 74` / `ℹ fail 0`（含新的 `check-card-layout.test.mjs` 9 条）；`pnpm test` 第一遍「全量测试汇总：6 套，失败 1 套」，失败的是 Chrome 插件（`ℹ pass 198` / `ℹ fail 2`，`chromium.test.mjs` 两条真实 Chromium 计时测试，本 PR 没改插件），单独重跑 `pnpm run test:extension` `ℹ pass 200` / `ℹ fail 0`；合进最新 main 后在 `b1497a4` 上三条重跑：`pnpm run check` `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust passed 1189 failed 0，前端 `ℹ pass 542`，MCP 9，插件 14，Chrome 插件 200，注入脚本 11，各 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 74` / `ℹ fail 0`（证据子目录 `merged-b1497a4/`）。证据 `~/Library/Application Support/postpane/evidence/2026-11-28-design-rules-audit/`（`check.log`、`test.log`、`extension-rerun.log`、`node-tests.log`）。新测试和机检是一起写的，没有先跑出红；用 #564 分支原样代码跑机检报错，算这次的「红」。
- 验证：机检在 #564 分支 `f8cebde` 与当前头 `bf96b01` 的 `src/packages/hud/src` 上跑（`git archive` 到临时目录），都报 `SessionsSection.tsx:555` 类型签进了图标列。审核报告：https://claude.ai/artifact/DpgUQnEQcG36yE9xJ2uYRf。界面纠正盘点（50 条，带会话出处）在共享笔记 `界面纠正清单-2026-11-28.md`。
- 截图：无界面改动。
- 发布与回读：无需发布（只改规范、检查、文档）。
- 与授权不一致之处、遗留问题、范围外发现：#564 合并前要改掉上面 3 处才过 `pnpm run check`（第一处正是常浩 05:11 要它改的）。#553 把 `scripts/check-rules.mjs` 换成 agent-kit 共用实现，后合的一方要把 `@babel/parser` 挪进新白名单。全局 CLAUDE.md、`ui-system` DESIGN.md、three-versions skill 三处改动只出了提案（报告第六节），等常浩定。16 处旧问题和把 `ApprovalTag` 按章、类型签、套餐标签拆开，要改界面代码，等 #564 合并后另开一单。
- 本轮新坑：L-80。

## 接力传信动画精修：细线白信封装信、连续对折成纸飞机（#570）（2026-11-28，Claude，常浩三版里选甲「细线」、改动确认回「改」：侧栏、刘海、互发消息一起换；已提交、未装机）

- 时间：开工 `2026-11-28 04:39`（`date '+%F %H:%M'` 记录）。来由：常浩要接力纸飞机动画「再做 3 种版式」，两轮预览后定：保留折信封，普通白信封，细线画法（设计稿 https://claude.ai/artifact/MMBm4NF9wcdPqELQr1cS2h 甲）。
- 行为变化（动手前已在会话里发改动确认，常浩回「改」）：接力和智能体互发消息的飞行，侧栏与刘海两种模式都换成新画法；约 2.5 秒 → 约 2.9 秒；虚线航迹换成渐淡小烟点；地上加影子；绕圈时纸飞机侧身翻过来、落地端正；送不出去改成失速翻滚、半路散开回信封；信纸落地时刻 `LETTER_LANDS_MS` 跟着变（约 2.88 秒），「审」章等信落地才盖的等待也跟着变长；减弱动效下的静态信封换成新画法。
- 你要求的：`scene/flight-paper.ts`（新：白信封、纸飞机的 6 点裁切形状与下半边、飞机三面画法，翻身 `rollAt`、影子 `shadowAt`、信纸滑进信封 `letterClip`、失速翻滚 `tumble`、装信时刻 `PACK`）；`scene/flight-plan.ts` 的 `story()`（装信、封口两面翻、合上轻压、侧身、影子、小烟点、展开交信、失速翻滚；`STORY` 各段与 `handIn`；返回 `delivered`、`roll`、`shadow`、`puffs`）；`scene/flight-craft.tsx`（新：信封、封口、纸飞机、信纸、影子、数字的画法）；`scene/FlightLayer.tsx`（接上翻身、影子、下半边、小烟点；信纸移到最上层好滑进信封；接住时刻用 `delivered`）；`relay-stamps.ts`（`LETTER_LANDS_MS` 用 `handIn`）。
- 我顺手改的：航线几何整块拆到 `scene/flight-route.ts`（行为不变，flight-plan 照旧转出，腾出行数过 300 行棘轮）；删掉没人用的 `pathData`；场景预览台 `preview/main.tsx` 加「飞：送审 / 回信 / 送不出去」三个按钮，能触发真实飞行；`file-size-baseline.json` 收紧（FlightLayer 925→716、flight-plan 834→692）。
- 同类：搜了「收信时刻」`STORY.deliver * 0.7`，命中 3 处（FlightLayer 两处、relay-stamps 一处），都改成 `STORY.handIn` / `story.delivered`。
- 测试：新测试先跑出红 `ℹ pass 6` / `ℹ fail 4`（`red.txt`）。改后 `node --test src/packages/hud/test/flight-plan.test.ts src/packages/hud/test/flight-paper.test.ts` `ℹ pass 14` / `ℹ fail 0`。`pnpm run check` 退出码 0（`check.txt`）。`pnpm test` 第一次失败 2 套：前端 `relay-stamps` 一条（信纸落地上限写死 2600，本轮带出，已改为 2600–3100），Rust `the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry` 计时超窗（285 秒 < 290，机器忙；本轮没碰 Rust，单跑 `test result: ok. 1 passed`）；重跑 `全量测试汇总：6 套，失败 0 套`，Rust `test result` 合计 1189 passed、0 failed（`test2.txt`）。`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`（`node.txt`）。
- 验证：替身通过。场景预览台（Chromium，真实 HUDScene + FlightLayer，`?scene=two-relays`，浅色、深色），用新加的按钮触发送审、回信、送不出去，暂停在 450 / 680 / 1010 / 1450 / 2330 / 2640 / 2800 毫秒和失败的 1780 / 2250 / 2520 毫秒逐帧看。刘海模式没在预览台看（预览台只有侧栏）；真实接力里的飞行要等下一次接力或互发消息时看，驿窗的 WKWebView 未验。
- 截图：`evidence/2026-11-28-570-relay-paper/frames-scene-preview.png`（预览台 4 倍放大四帧）。
- 发布与回读：未装机。包已打好（变基到 `2aba8b3` 之后重打，`build2.txt`），`install.sh 570-relay-paper` 停在 L-05 检查：已装的是 #569 会话 04:46 装的合并包 `3265645`（main + #564 `781c0f7` + #560 `fd3cdeb`，后两个还没合并），装本包会把这两项从实机拿掉，等常浩定。已登记 DECIDED.md（基线截图暂用预览台四帧，实机截图待补）。
- 与授权不一致之处、遗留问题、范围外发现：预览阶段的「现状」画板是凭印象复刻的，和真实画法有出入（L-77），常浩两轮是拿它做参照；本轮实现照真实画法改，故事顺序没变。
- 本轮新坑：L-77。
- skill 进化：无。
## 恢复被 #568 冲掉的 #566「同一会话只出现一次」：代码、测试、场景、DECIDED 登记、交接一节（#569）（2026-11-28，Claude，常浩 11-28 已验收并让合并 #566；属回到已定行为，不改已定内容；已提交，PR 见描述）

- 时间：开工 `2026-11-28 04:55`（`date '+%F %H:%M'` 记录）。来由：给 #564 打合并包前核对 main，发现 #568（`7575cf9`）的 squash 提交把 #566 改的 6 个文件原样退回 #566 之前（`git diff bdcbc19 7575cf9 -- <6 个文件>` 为空），还删了 DECIDED 里 11-28「单一任务会话」那一行和 CURRENT 里 #565 一节；#568 的分支提交 `99296b6` 父提交就是 `1ac0ab1`，退回是它自己带进去的。之后在这个 main 上合的包（#567 会话装的 `2e53e13`）、#561 分支（`3b6908e`）都没有去重。
- 改了哪些文件：
  - 你要求的（恢复）：`src/packages/hud/src/alerts/news-lanes.ts`、`reply-list.ts`、`CompletionAlertView.tsx`、`test/reply-list.test.ts`、`test/reply-queue-keep.test.ts`、`test/scenes/scenes.ts` 取回 `1ac0ab1` 的版本；`docs/DECIDED.md` 补回那一行；`CURRENT.md` 补回 #565 一节（放在 #567 一节下面）。
  - 我顺手改的：`docs/LESSONS.md` 新坑 L-76。
- 同类：比对了 #568 改动的全部 18 个文件，和它主题（子程序继承系统代理）无关的只有上面 8 个，都是 #566 的；其余 10 个是 #567 自己的，没动。
- 测试：见下「发布与回读」（合并包）；本分支单独的三条全量见 PR 描述。
- 验证：装前侧栏截图（`evidence/2026-11-28-569-combo/smoke-before-1.png`，当时装的是 #567 会话的包 `2e53e13`）里，常浩开着 Claude 面板，能看到一张真实的 REPLY 下一步卡（REPLY 签、小字、白字下一步、选项、跳过 / 提交），和积压事项旧版式。新包的去重与积压事项新版式未在实机看（悬停面板我控制不了），留给常浩。
- 截图：无界面改动（恢复已验收的行为）。
- 发布与回读：合并包 `3265645` = main `7575cf9` + 本分支 `61736b4` + #564 `781c0f7` + #560 `fd3cdeb`（`turns.rs` 冲突照 #564 那次合法，`CURRENT.md`、`LESSONS.md` 两边都留）。三条全量：`pnpm run check` `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 1214 passed，前端 `ℹ pass 540`，MCP 9，插件 14，Chrome 插件 200，注入脚本 11，各 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`。`install.sh 569-combo --takeover`（原装 #567 会话的 `bb4da8175097`，它同意覆盖）：产物 `e07012a3446d` / 已装 `e07012a3446d`，签名证书 `b773068e`；冒烟：侧栏在动，隔 2 秒 2143 个像素不同。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-28-569-combo/PostPane-bb4da8175097.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：#560 分支也用了 L-75～L-79，和 main 的 L-75、本 PR 的 L-76 撞号，#560 变基时要改编号。
- 本轮新坑：L-76。

## 驿窗启动的子程序继承 Mac 系统代理，claude 登录续期不再因直连 403 失败（#567）（2026-11-28，Claude，常浩回「做甲乙两条」；已提交，未装机：真实机器上正装着别的会话 #566 的测试包）

- 时间：开工 `2026-11-28 00:46`（`date '+%F %H:%M'` 记录）。来由：常浩截图说展开卡上的周额度暗印（#319）又看不到了，要求恢复并「确保这个问题以后不会再发生」。查实暗印代码没坏：本机 Claude Code 命令行登录过期，Claude 额度变成「过期」，暗印按设计不画；登录反复掉的根子是驿窗启动的 claude 不带代理、直连 Anthropic 被拒（L-75）。常浩带代理重登后，00:38 驿窗读回额度（本周 95%，吃紧）。
- 行为变化（动手前已在会话里列出）：驿窗启动时，环境里一个代理变量都没有而 Mac 系统代理开着，就把系统代理写进自己的环境（`HTTPS_PROXY`/`HTTP_PROXY` 大小写两套，`NO_PROXY`/`no_proxy` 为 `localhost,127.0.0.1,::1`），之后启动的所有子程序（claude、codex、git 等）都继承；已有代理变量或系统代理没开时照旧。
- 你要求的：`platform/src/child_proxy.rs`（新：判断要补哪些变量、启动时写进环境，5 条测试）；`platform/src/os/macos/proxy.rs`（新：读 `scutil --proxy`，HTTPS 优先、其次 HTTP，IPv6 加方括号，4 条测试）；`os/linux`、`os/windows` 各加 `system_proxy` 返回 None（这两个系统先不读）；`os/unix/mod.rs` 加 `script_output`（复用现有带时限的脚本执行）；`host/src/lib.rs` 启动入口在建任何线程前调用，日志记一行；`runtime/src/lib.rs` 转出；`docs/LESSONS.md` 新增 L-75。终端一侧 `~/.zshrc` 加 `claude` 包装函数（不进仓库，改前备份在证据目录 `zshrc.before`）。
- 我顺手改的：`os/macos/mod.rs` 的 `legacy_preferences` 只转一手的包装函数改成 `pub(crate) use legacy_preferences::read as legacy_preferences;`（行为不变，腾出行数过 300 行棘轮）。
- 同类：搜了驿窗启动子程序的地方（`accounts/engine.rs`、`mcp_clients.rs` 的 `run_client_in`、`delivery/process`），都是在继承的环境上追加变量、没有 `env_clear`，启动时补一次全部覆盖，不逐处改。
- 测试：新测试先在打桩实现上跑出红 `test result: FAILED. 3 passed; 6 failed`（`red.txt`），改后 `test result: ok. 9 passed; 0 failed`（`green.txt`）。`pnpm run check` 退出码 0；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 合计 passed 1189 failed 0，前端 `ℹ pass 534` `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` `ℹ fail 0`。证据 `~/Library/Application Support/postpane/evidence/2026-11-28-567-child-proxy/`。
- 验证：替身通过。按 E-24 用 `env -i HOME=<证据目录/sandbox-home> PATH=/usr/bin:/bin:/usr/sbin:/sbin` 启动打好的包（环境里没有代理变量，和从程序坞启动一样），日志第二行 `Programs started from here go through the system proxy http://127.0.0.1:8086 (#567)`；前后 `installed_plugins.json` 的 shasum 一致；按自己记下的进程号停掉。未在真实环境验证：没装进 /Applications，子程序实际继承、登录续期不再掉线要装机后看 `postpane.log` 和后续几天有没有 `OAuth session expired`。终端包装函数已实测：干净环境下 `zsh -ic 'claude -p …'` 回复 ok（改前同样命令 403）。
- 截图：无界面改动。
- 发布与回读：未发布。`install.sh 567-child-proxy` 停在 L-05 检查：00:51 已装的是 `reply-one-per-session`（`tmp/565-with-560`，PR #566）的测试包，那个会话正在实机验，没有 `--takeover`。
- 与授权不一致之处、遗留问题、范围外发现：范围比会话里最初说的「驿窗启动 claude 时带代理」大，codex、git 等子程序也一并走代理（动手前已列出）。暗印在「读不到额度」时悄悄消失、原因看不到，常浩这次选了先不做提示（方案丙）。
- 本轮新坑：L-75。可提议提升为全局坑：并进全局坑 11-14「交互终端缺代理」那条，补图形界面应用这一面。

## 侧栏 REPLY 每个会话只出现一次，新回复顶替旧行（#565）（2026-11-28，Claude，常浩附截图要求「每个会话都是出现一次……并改好」，动手前在会话里列了行为变化；已提交，PR 见描述，已登记 DECIDED.md，装机见下）

- 时间：开工 `2026-11-28 00:05`（按建 worktree 的时间，约数）。来由：常浩截图里回复卡同一会话出现 2～3 行（「Claude 收尾｜…」「【交接】数字分身…」「Antigravity｜代理登录修复」）；实机快照 `islandEvents` 里同一会话有 4 条回复事件，侧栏队列每条回复各占一行，只有「失败」按会话顶替旧行。
- 改变的行为（动手前已在会话里列出）：回复卡、「等待处理」里的 REPLY 行、折起的回复小签和印章上的计数，同一会话（同一家 + 同一会话 id）只占一行；同一会话再回复，新回复在原位置顶替旧行，显示最新那条，计数按会话数算。没有会话 id 的回复照旧一条一行。
- 你要求的：`src/packages/hud/src/alerts/news-lanes.ts`（`reconcileIslandCards` 新回复按 `replyLine` 找同一会话的旧行原位顶替）。
- 我顺手改的：删掉 `reply-list.ts` 的 `sessionReplies`（回到会话时收起这个会话的全部回复；现在每个会话只有一行，`CompletionAlertView.tsx` 改成只收这一行）及其测试；场景预览台加场景 `replies-again`（`test/scenes/scenes.ts`）。
- 同类：搜了 `islandEvents` 的所有读取处，侧栏只有 `IslandNews` 的队列一个入口，回复卡、等待处理卡、小签、印章都从它取，改这一处全部跟着变。
- 测试：
  - 新测试先红：`reply-queue-keep.test.ts` `ℹ pass 10` / `ℹ fail 2`（`red-reply-queue-keep.txt`；另 2 条守边界：别家同号、没会话 id、失败与回复分开，本来就过）；改后过。
  - 三条全量：`pnpm run check` `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 1180 passed，前端 `ℹ pass 537`，MCP 9，插件 14，Chrome 插件 200，注入脚本 11，各 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`。证据目录 `~/Library/Application Support/postpane/evidence/2026-11-28-reply-one-per-session/`。
- 验证：场景预览台（替身）新场景 `replies-again`：Claude 同一会话连回 3 次，悬停 Claude 票根，「等待处理 · 1」只一行「整理周报模板」，时间是最新那次。
- 截图：`scene-replies-again.jpg`（场景预览台，非实机）。
- 发布与回读：常浩选「装合并包」：本分支 `d98a0a4` + #560 `fd3cdeb` 合在临时分支（合并提交 `004fb00`，只 `CURRENT.md` 冲突、两节都留），合并包三条全量：`pnpm run check` `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 1201 passed，前端 `ℹ pass 537`，MCP 9，插件 14，Chrome 插件 200，注入脚本 11，各 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`（`combo-*.txt`）。`install.sh 565-reply-one-per-session --takeover`（原装的是 #560 分支 `2d38464` 的包 `85ce451e68d7`）：产物 `e0f0b96d9422` / 已装 `e0f0b96d9422`，签名证书 `b773068e`；冒烟：侧栏在动，隔 2 秒 2314 个像素不同；装后无权限弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-28-565-reply-one-per-session/PostPane-85ce451e68d7.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 实机：本机 `claude -p` 在同一会话 `44c224bd…` 连发两轮（「驿窗自检第 1/2 轮，只回 OK」，工作目录 `evidence/2026-11-28-565-reply-one-per-session/selftest`），驿窗快照里收到这个会话 2 条回复事件（`event:1`、`event:2`）。侧栏上显示几行没验：离屏截图不画回复提醒，驿窗后台控制权限常浩拒绝了；结论「部分」，界面那一下留给常浩悬停 Claude 票根看。常浩看过实机后回「验收，然后合并」，已登记 DECIDED.md。
- 与授权不一致之处、遗留问题、范围外发现：
  - 同一会话既有等你回答的请求（ASK）又有一条回复时，仍各占一行（请求和回复是两类，回复不该顶掉要你决定的请求）。要不要也合成一行，等常浩定。
  - 侧栏上现在已经堆着的重复行：装机会重启驿窗，队列清空，之后按新规矩来。
- 本轮新坑：无。
- skill 进化：无。

## 侧栏行动化 2、3：要你动手的回复做成「下一步卡」（#562）；等你超过 48 小时沉到「积压事项」（#563）（2026-11-27，Claude，常浩选「第一处选甲，但是如图其实现在这样就行……你不要完全给我变了；第二处选甲，名字叫做积压事项」；已提交，PR 见描述，叠在 PR #561 上；未装机：#558 的包正装着做实机）

- 时间：开工 `2026-11-27 23:00`（接着同一会话做）。来由：常浩反馈回复几十条却不告诉他下一步，要点进会话读最后一句；久挂的条目（最久约 431 小时）永远挂在侧栏。
- 改变的行为（动手前已在会话里列出）：① 这一轮已经变成卡的（带按钮框的「下一步」框，或下面的回复卡），不再另发一条 REPLY 通知；「已结束」「后台进行中」的回复照旧 4 秒收起。② Claude 会话收尾是〔等你决定〕〔等你操作〕〔受阻〕且这一轮没带按钮框的，生成一张 REPLY 卡，版式就是现在的 ASK 卡：REPLY 签 → 小字（本次完成 + 当前状态）→ 白字放大的下一步 → 选项（下一步里每个「回复『X』」一项，另有「其他」）→ 跳过 / 提交；提交把那句话发回原会话，走侧栏回答 Claude 提问的同一条通道。③ 等你的卡和会话，不分类型，挂满 48 小时就不算进「等你」的数、不点亮侧栏小签，沉到「等待处理」最下面一行「积压事项 · n · 超过 48 小时没处理」，默认收起；展开后每条「继续」（回到会话）、「不做了」（先问一句，确认后替你给会话发「这件事不做了，停掉」；权限卡改成拒绝；送不进会话的只从侧栏移除）。④ **事前没列、补报**：会话「最后一段话」原来截到 240 字，现在遇到收尾三项整段保留（最多 1200 字），否则读不到下一步；回复摘要里能看到的字因此变多。
- 你要求的：`agents/src/transcript/closing.rs`（新：解析收尾三项、整段保留、生成回复卡、列出会话的三种卡）；`core/src/sessions.rs`（回复卡进审批列表）；`agents/src/claude/transcript.rs`（REPLY 签）；`core/src/island_events/turns.rs`（已成卡的那一轮不再报 REPLY）；`hud/src/panel/backlog.ts`、`BacklogFold.tsx`（新：48 小时、积压事项一行、继续 / 不做了）；`place-sessions.ts`、`WorkSections.tsx`、`model.ts`、`HUDScene.tsx`、`PanelContext.tsx`（积压不计数、不点亮小签，面板拿得到回答通道）；`approval-list.ts`（REPLY 收起签）。
- 我顺手改的：`permissionToolBadge` 从 `PendingEventRows.tsx` 搬到新文件 `alerts/tool-badge.ts`（300 行棘轮，原文件短了 70 行）；`last_paragraph` 从 `live.rs` 搬进 `closing.rs`；会话三种卡的拼法收成 `standing_asks` 一处；场景预览台补 `claude-reply-card`、`claude-backlog` 两个场景；收紧行数基线。
- 同类：回复显示用的「最后一段」只有 `last_paragraph` 一个入口（Claude、Codex 共用），改一处两家都整段保留；会话出卡只有 `sync_claude_desktop_asks` 一处。
- 测试：回复卡端到端测试旧代码上 `FAILED`（只有按钮框那张，`red-562.txt`），「已成卡不再报 REPLY」测试旧代码上 `FAILED`（`red-562-island.txt`），改后都通过；积压事项的前端测试**没有先跑出红**，写完实现后直接通过（`ℹ pass 22` / `ℹ fail 0`，含 approval-list）。全量：`pnpm run check` 退出码 0；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 合计 `1184 passed; 0 failed`，前端 `ℹ pass 537 ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`。中途一次全量里两条旧前端测试失败（数据是固定旧日期，被 48 小时规则当成积压），已给它们传入场景的固定时间。证据 `~/Library/Application Support/postpane/evidence/2026-11-27-559-handoff-one-tag/`。
- 验证：替身通过。场景预览台（127.0.0.1:1482，内置浏览器 Chromium，不是 WKWebView）：`claude-reply-card` 卡上 REPLY、小字、白字下一步、两个选项加「其他」、跳过 / 提交（`scene-claude-reply-card.png`）；`claude-backlog` 小签数字是 2 不是 4，「积压事项 · 2」一行，展开两条各带继续 / 不做了，点「不做了」先问一句（`scene-backlog-*.png`；看板那块在预览台里被上层盖住，展开和点按钮是用脚本点的）。真实环境未验：装机后要在真实侧栏看一张真回复卡、点一次提交，确认话送进会话；积压事项点一次「不做了」。
- 截图：见上，证据目录。
- 发布与回读：未发布（#558 的包正装着做实机，没覆盖）。
- 与授权不一致之处、遗留问题、范围外发现：① 回复卡的文字只在驿窗这次运行期间记得（会话记录检查点不存对话原文），驿窗重启后要等那个会话下一次说话才会再出卡；② Codex 的回复不出回复卡（Codex 的回答通道不同），只是摘要整段保留；③ 面板每行左边的「等你」章没动（11-15 定），积压事项里的行也还挂着它。
- 11-28 返修（常浩在 #565 会话附截图提出、经该会话转来）：积压事项挪到「正在进行」下面，标题和「等待处理 · n」「正在进行 · n」同一种样式（`SessionsHeading`，「积压事项 · n」加横线），去掉「超过 48 小时没处理」；已登记 DECIDED.md。
- 主线：侧栏行动化｜▶ ① 只留类型签（PR #561）② 回复下一步卡（本 PR）③ 积压事项（本 PR）④ 名字「积压事项」✅ 定；⑤ Claude 收尾一律带按钮框（另一个会话在做）。
- 本轮新坑：无。
- skill 进化：无。

## 侧栏卡只留类型签：去掉「切换会话」「下一步」「新任务」三种虚线行动签（#559）（2026-11-27，Claude，常浩问「切换会话为什么会同时出现两个标识，没必要」，随后说「切换会话、下一步这种行为指引……都是可以统一去掉的」；已提交，PR 见描述；未装机：#558 的包正装着做实机，没覆盖）

- 时间：开工 `2026-11-27 21:39`（`date '+%F %H:%M'` 记录）。来由：侧栏交接卡上方同时挂着绿色 START 小签（#245，2026-11-08 定）和问题分区标题「切换会话」（红色虚线签），说的是同一件事。
- 改变的行为：Claude 桌面应用的三种卡原来在类型签下面再挂一枚红色虚线签：交接卡「切换会话」、下一步卡「下一步」、新任务卡「新任务」。改成都不挂，只留类型签（交接卡 START，其余 ASK）。收起时的一行提示「待切换会话」不变；已定的 START 小签不动；Claude Code 自己提问（AskUserQuestion）带的分区标题不在这次范围。
- 你要求的：`src/crates/agents/src/claude/transcript.rs` 的 `desktop_ask_view`：三种卡的问题都不再带分区标题（`header` 为 null），前端本来就是有标题才画签；`claude_desktop.rs` 加两条断言（交接卡、下一步卡都没有标题）。
- 我顺手改的：`src/packages/hud/test/approval-list.test.ts`、`src/packages/hud/test/scenes/build.ts` 测试数据的 `header` 跟着改成 null；场景预览台补一个 `claude-handoff` 场景（`src/packages/hud/test/scenes/scenes.ts`，两张交接卡：能在侧栏开始的、只能到 Claude 里开始的）。
- 同类：搜了 `切换会话` / `Switch session` 和前端所有画 `header` 的地方（`HandoffStartCard`、`PermissionQuestionCard` 两处），只有 Rust 这一个来源，一处改掉即可。
- 测试：两条新断言在旧代码上各自 `test result: FAILED. 0 passed; 1 failed`（`red.txt`、`red-next-step.txt`）；只去掉交接卡那一版：`pnpm run check` 退出码 0、`pnpm test`「全量测试汇总：6 套，失败 0 套」；扩到三种签后：`pnpm run check` 退出码 0，`pnpm test`「全量测试汇总：6 套，失败 2 套」（Rust `the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry` 计时失败，单独重跑 `ok. 1 passed`；Chrome 插件 3 条真浏览器计时测试，单独重跑仍 `ℹ fail 3`，当时机器负载 134，本 PR 不碰 Chrome 插件代码，**合并前要在负载正常时重跑全过**）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`。证据 `~/Library/Application Support/postpane/evidence/2026-11-27-559-handoff-one-tag/`。
- 验证：替身通过。场景预览台（127.0.0.1:1482，`?scene=claude-handoff&panel&still`，浏览器内置面板，Chromium 不是 WKWebView）展开两张卡，都只有 START，页面上没有「切换会话」签。真实环境未验：需装机后在一张真实交接卡上看。
- 截图：`scene-claude-handoff.png`（场景预览台）。
- 发布与回读：未发布。`install.sh` 报现在装着的是 `claude/558-agy-hub`（21:36 装、PR #560 未合并）的包，停下没装（L-05）；#558 实机做完后再装本包、和改前对比 START 小签（AGENTS.md「没打算改、但碰到同一处代码」），再合并。
- 与授权不一致之处、遗留问题、范围外发现：常浩同轮提出侧栏三处困惑，已出方案页 https://claude.ai/artifact/YQxPFTSoqWweCMWVC5sTfB（源文件 `docs/design/侧栏行动化三版预览-2026-11-27.html`，未进仓库），等他挑 3 处。Claude 收尾稳定给按钮框另开会话（任务卡，待常浩点开始）。
- 主线：侧栏行动化｜✅ 0 ▶ 1 ❓ 3 📌 1：① 只留类型签（本 PR，等 #558 实机做完装机合并）▶；② 回复按收尾状态分流、主文字换成下一步、按钮一键做 ❓；③ 48 小时积压区 + 「不做了」❓；④ 积压区名字 ❓；⑤ Claude 收尾一律带按钮框（另开会话）📌。
- 本轮新坑：无。
## Antigravity 2.35.2 桌面版经驿窗能开会话、能读回复：认发现文件里的令牌，补齐 get_message 判完成的三处断点（#558）（2026-11-27，Claude，多模型协同会话转来常浩的目标「经驿窗新开 Antigravity 会话交任务」；已提交，PR 见描述；本分支包已装机 `4f01917620a7` 回读通过，未合并）

- 时间：开工 `2026-11-27 20:47`（`date '+%F %H:%M'` 记录）。来由：#558。桌面版开着、没有 agy 进程时，`start_session`（antigravity）、`send_message` 被拒「没有已登录且正在运行的 Antigravity 服务」，卡住 MA-04 第一次试跑。
- 你要求的（验收句「`start_session` 新开成功，`get_message` 能读到回复」要求的四处，前一处修好才露出后一处）：
  1. 发现：2.35.2 的 language_server 从标准输入拿 host 令牌，参数里没有 `--csrf_token`；新版把端口和令牌写在 `~/.gemini/antigravity*/daemon/*.json`。新 `clients/antigravity/daemon.rs` 读它，`running.rs` 只在参数里没令牌时按 pid 对上发现文件才用，过期文件不认；旧版和 agy 命令行照旧（L-75）。
  2. 完成事件的轮次：`antigravity/hooks.rs` 的 `enrich` 把 `turnId` 写成回复那一步，会话记录按提问那一步编号，对不上就判不出最新一轮；改成往回找开启这一轮的提问步（L-76）。
  3. 会话 id：start 回执记裸 UUID，快照和 `session_detail` 认 `antigravity:<uuid>`；读会话页前统一换成快照 id（`transcript::page_id`，L-77）。
  4. 判结束的数据：侧栏「实时状态」关着的那家，快照里没有 liveFacts；本机 Antigravity 正是关的。改成快照里没有时用会话页自带的 `session.liveFacts`（L-78）。
- 改变的行为（动手前已在会话里列出）：① 任何一家「实时状态」关着时，`get_message` 原来永远停在 started，现在按会话页的 liveFacts 判出 done 并给回复；快照里有 liveFacts 的照旧。② Antigravity 完成事件的 `turnId` 从回复步改成提问步（和会话记录一致）。③ 2.35+ 桌面版从「认不出」变成能读额度、能收发消息。
- 我顺手改的：进程发现从 `service.rs` 搬到 `running.rs`（300 行棘轮，`service.rs` 基线 662→476）；`docs/accounts.md` 补一段发现文件；测试夹具 `session_detail` 能带 `session.liveFacts`；LESSONS L-75～78。
- 同类：见各提交正文「同类：」一行。范围外发现：`delivery/antigravity/mod.rs` 的 `call` 按 `"no running Antigravity service"` 判不可用，和实际报错对不上，`agy -p` 兜底从移植起没走到过（改了会在没开桌面版时改由命令行无头开会话，属行为变化，没改）；`stored::answer` 同样只看快照 liveFacts（驿窗没接会话存储，没改）。
- 测试：新测试先在旧逻辑上跑红（`red.txt` 2 failed、`red-hooks.txt` 2 failed、`red-bare-id.txt`、`red-live-off.txt` 各 1 failed）。最终版本 `36c660b` 三条全量：`pnpm run check` exit 0；`pnpm test` exit 0（Rust `1190 passed, 0 failed`，前端各套 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` `ℹ fail 0`。证据 `~/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub/`（`r4/`）。
- 验证：真实环境通过。桌面版 2.35.2 开着、agy 进程数 0：`start_session`（folder 空）第 4 次 `m-8e6f70a778cb` → done，回复「驿窗 558 第四次已收到」；`send_message` 续发 `m-85c21e82de73` → done，回复「驿窗 558 续发已收到」；修前修后每一步的现象见证据目录 `real-env.md`。
- 截图：无界面改动；装机冒烟图在各 `evidence/2026-11-27-558-agy-hub-r*/`。
- 发布与回读：本分支包装了 4 次，最后一次 `4f01917620a7`，产物与已装 `shasum` 一致，签名证书一致；回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-27-558-agy-hub-r4/PostPane-70b60e21467d.app" /Applications/PostPane.app; open /Applications/PostPane.app`。第一次装机接管了 #554 分支的包（#554 已合并进 main，本分支含它）。
- 与授权不一致之处、遗留问题：
  - 待常浩定：本机 Antigravity「实时状态」是关的（`presentation.json` `sources.antigravity.live: false`，首次见到时还没检测到、默认存成了关；ChatGPT 有 `DETECTED_LATE` 检测到后补开一次，Antigravity 没有）。关着时侧栏只显示空闲，#554 实机「只看到打盹」很可能是这个原因（未核实）。要不要打开、要不要把 Antigravity 加进 `DETECTED_LATE`，没动。
  - 测试时在 Antigravity 里留了 4 个「驿窗连通性测试…」会话，可删。
- 本轮新坑：L-75、L-76、L-77、L-78。
- MA-02 第 1 轮返修（审查链 `r1a21d3e4c3c00`，受审 `8bf3b91`，P1 1、P2 3、P3 2，全部已修）：
  - P1-01 发现文件里的端口没和进程绑定：`running::candidates` 只用该进程正在监听的端口（`listening_ports(pid)`），读不到监听端口就不用文件；命令行来的照旧。
  - P2-01 目录符号链接：存储目录和 `daemon` 目录是链接的不读（文件本身原来就不读链接）。检查和打开之间的竞态没处理，理由写在回信里：端口已经绑定到进程，文件改不了信任对象。
  - P2-02 超长轮次的回退轮次：钩子认不出轮次时标 `turnKnown: false`，`HookEvent::completed_turn` 让 overlay 保留会话记录的轮次，同一轮不会在两个名字下各结束一次。
  - P2-03 发现文件的位置改用 `AGENT.discovery.storage`，和会话记录一致（认 `GEMINI_CLI_HOME`）。`hud_tools::antigravity` 的注释说 Antigravity 不认这个变量，两边不一致，没改它。
  - P3-01 钩子判「未答的提问」改成和 `TURNS` 一样，只排除 SYSTEM；P3-02 `page_id` 按客户端限定，判结束时按快照 id 精确匹配；快照 liveFacts 为空对象 `{}` 时也改看会话页。
  - 每条新测试都先临时换回旧写法跑出红，证据在 `r5/red-*.txt`。
  - 返修后 `a88b866` 三条全量：`pnpm run check` exit 0；`pnpm test` exit 0（Rust `1196 passed, 0 failed`，前端各套 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 65` `ℹ fail 0`。装机 `2042a24ea279`，真实环境 `start_session` 第 5 次 `m-57203ff68420` → done，回复「驿窗 560 返修后已收到」。
- skill 进化：无。

## 接力治本第 3 步（缺陷修复部分）：页面最新回答是更早一轮的，重读也在 5 次后停（#544）（2026-11-27，Claude，常浩在复盘主会话回「全部都按推荐」经主会话转来；已提交，PR 见描述，装机见下）

- 时间：开工 `2026-11-27 17:31`（`date '+%F %H:%M'` 记录）。来由：全表 E11 空格 31，真实环境现场 #539 第 4 轮（11-26 11:52 起每 2 分钟重读 12 小时以上）。
- 改了什么：`answers/book_reread.rs` 的 `reread_result`：插件报 `told`、回信却没被收下（接力还在等）时算无果，不再清零连续次数；`streaming` 照旧清零。被收下的回信会先把接力推离等待，不受影响。属修缺陷：让 #433（常浩 2026-11-25 定「最多 5 次」）在这种情形下也生效，不改已定行为。
- 你要求的：上面一处；测试 `handoff/tests/read_older.rs` 2 条（只报旧回信的 5 次后停；中间报「在写」照旧重新计数）；文档 `docs/chatgpt-channel.md` 退避一句、`docs/接力规范.md` 第 3 节、`docs/接力异常全表.md` 空格 31。
- 我顺手改的：无。
- 同类：重读结果里会清零计数的只有 `told`、`streaming` 两种，`streaming` 是真进展，不改。
- 测试：新测试旧代码上 `FAILED. 1 passed; 1 failed`（`red-host.txt`，过的那条守「在写照旧清零」）；改后 `cargo test -p agent-hud-host read_` `ok. 29 passed`。三条全量见 PR 描述。证据 `~/Library/Application Support/postpane/evidence/2026-11-27-544-reread-bugs/`。
- 验证：替身通过。真实环境：#539 那张原来停不下的接力，装上本包后看它 5 次内停读（装机后回读）。
- 截图：无界面改动。
- 发布与回读：见 PR 描述。
- 与授权不一致之处、遗留问题、范围外发现：
  - 第 3 步其余部分没做：「30 分钟没回信」改成按信号判（改的是已定内容，单独发了改动确认，等常浩回）；空占位被误判成「没画出」（要先在真实页面看清空占位的样子再改）。
  - 第 2 步端到端还差常浩两步操作（关掉插件开的「页面自检回复」标签页、在测试接力卡上点「继续自动」）。顺带的真实证据：测试接力因「标签页没画出回信」按设计停下并通知了会话（13:44），之后重读 5 次后停读并在卡上说明（14:57），#433 在真实环境生效。
  - 主线：接力治本｜✅ 0、1、2（端到端待验）⏳ 3 其余（改动确认）、4、5、6、7。
- 本轮新坑：无。
- skill 进化：无。

## 侧栏 Antigravity 小人有了一套「反重力」动作库（22 个场景，对标 ChatGPT 小花）；侧栏顺序调到 ChatGPT 下面、Hermes 上面（2026-11-27，Claude，常浩要求「位置调整到 GPT 的下面 Hermes 的上面」「把 anti-gravity 的动作库做出来，对标 GPT 的动作库的这个范围」；已提交，PR 见描述，常浩回「覆盖装机」后已发布 `628de7f4b999` 回读通过；常浩经驿窗回「Accepted, merge」验收，已登记 DECIDED.md）

- 时间：开工 `2026-11-27 16:10`。来由：#554。常浩刚开通 Antigravity，它进了侧栏；要求调顺序、并按 GPT 小花的场景范围做它的动作库。小人动效按记忆只出一版。
- 侧栏顺序：不在代码里，在侧栏布局 `hud.agents`。已经用 `draft_hud` 放进草稿：`[claude, codex, chatgpt, antigravity, hermes, deepseek]`，离屏截图核对过顺序。**要常浩悬停侧栏、在面板里点「保存」**；装机会重启应用，草稿会丢，装完已重放（见「发布与回读」）。
- 改变的行为（动手前已在会话里列出）：① Antigravity 在侧栏改成常驻小人（`stays: true`），闲着不再显示图标；② 它的动作从通用动作换成自己的一套；别家小人走的分支不变。
- 动作（场景 → 动作）：待机 悬浮 + 地影（飘高影子变小变淡）+ 每 8 秒一颗小黄石子往上飘；打招呼 往上飘、朝鼠标那边歪、那侧闪两颗星；开工 下蹲 → 脚底喷火蹿高 → 飘回；思考 头顶三颗彩色卫星绕圈，眼睛和身子跟着前面那颗（不挂省略号）；压缩上下文 一缩一放，卫星螺旋钻进钻出；改文件 3 秒一阵、每半秒往左/右歪一格、头顶蹦火星；跑命令 3 秒一阵脚底喷火、升高、抖；读文件 身边托一页纸、读到的行变蓝、眼睛逐行扫；长命令 土星环轨道、蓝卫星 6 秒一圈、后半圈藏到身子后面；其他干活 小火苗一阵阵；等批准 飞高上下蹦；问问题 飞高左右摇；方案待确认 飞高点头；看审批卡 停在高处看卡；三种找你都带左上角橙色星球牌（带环的小星球）! ? ≡；回复完成 空翻一圈撒四色星；长活完成 翻两圈；额度重置 飞更高翻一圈撒 8 颗星；打盹 沉低、歪着、弯线闭眼、慢呼吸、淡蓝梦泡，不挂 Z；出错 反重力失灵直直掉地、压扁、扬灰尘、红色星球牌 ×，过一会儿再飘起；额度用完 慢慢沉地坐着、紫色星球牌沙漏；卡住重试 半空不动；没新消息 悬浮 + 通用变淡。
- 改了哪些文件：
  - 新 `hud/src/bots/bot-float.ts`：按状态算每一帧的高度、角度、伸缩、眼睛朝向和身边的东西；读的是鲸鱼同一份 cue。
  - 新 `hud/src/bots/bot-float-sky.ts`：卫星、星、火苗、灰尘、石子、梦泡、火星的形状与位置。
  - 新 `hud/src/bots/bot-float-paint.ts`：画火苗、纸、土星环、星和点；地影抵消姿态（身子飘起来影子留在地上），用 `destination-over` 垫在身子后面；左上角星球牌。
  - `bot-spec.ts`：`antigravity` 加 `float: true`、`stays: true`；`BotSpec` 加 `float` 开关。
  - `bot-motion.ts`：鲸鱼的 `swim()` 接口改成鲸鱼 / Antigravity 共用（`ownSea`），Antigravity 开工和打招呼不叠共用的「跳一下」；思考不挂省略号、打盹不挂 Z 沿用鲸鱼的写法。
  - `bot-renderer.ts`：画天空和地影一处接入；云、鲸鱼、Antigravity 三家的标识合成一个 `ownTag`；重绘判定键加上天空和姿态（地影跟姿态变）。
  - 300 行棘轮（纯搬移，行为不变）：`BotSpec` 类型挪到 `bot-spec-types.ts`、原处转出；`BotMotion.aim`、`poseIsRest` 挪成 `bot-motion-parts.ts` 的 `aimAt`、`isRestPose`。基线 `bot-spec` 399 → 361、`bot-motion` 1532 → 1530，`bot-renderer` 仍 1191。
  - 新 `hud/test/antigravity-float.test.ts`：18 条（只有 Antigravity 会飘并常驻、外形不变；没开关的小人没有天空；待机悬浮不落地、石子；打招呼朝鼠标歪 + 那侧闪星；开工先蹲后喷火蹿高；思考三颗卫星在头顶、眼睛跟、无省略号；压缩卫星螺旋进；改文件两边歪 + 火星；跑命令一阵喷火一阵歇；读文件纸在右、三行轮流、眼睛看纸；长命令 6 秒一圈；找你飞高、蹦、牌鼓、问问题摇、看卡停；标识走星球牌；完成翻一圈 4 星、长活两圈、重置 8 星；打盹歪着弯线闭眼梦泡无 Z；出错落地扬尘红 × 再飘起；额度用完沉地坐着；卡住不动）。
- 测试：
  - 新测试在 main 快照上跑是红的（`bot-float.ts` 不存在，`ℹ pass 0`，`red-on-main.txt`）；先写的实现、后写的测试，不是严格的先红后绿。改后 `ℹ pass 18` / `ℹ fail 0`。
  - `pnpm run check` 退出码 0（`check.log`）；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」，Rust 合计 `1178 passed; 0 failed`，前端 `ℹ pass 534` / `ℹ fail 0`，其余 `ℹ pass 9`、`ℹ pass 14`、`ℹ pass 200`、`ℹ pass 11` 均 `ℹ fail 0`（`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`（`node.log`）。
- 验证：定格胶片页（真实 `BotMotion` 按模拟时间逐帧推进，走 `BotMark` 同一条 `renderBot` + CSS 姿态路径，Chromium，替身）逐个场景截帧自查两轮，改过：开工的速度线跟着身子走像腿 → 改成脚底喷火；火苗太细 → 两层水滴形；卫星压住头顶 → 环上移；长命令轨道后半圈压在脸上 → 后半圈画到身后；改文件火星、完成的星、梦泡太小 → 放大；星球牌太大 → 缩到 1.1 倍、往左上挪；共用的「跳一下」抵消了开工的下蹲 → Antigravity 不叠。预览页放进票根看：地影在撕线上方，不碰。
- 预览：https://claude.ai/artifact/FfbPChjxN1Rh7oy9L5BPyf （真实代码打包，现在 vs 新动作，31 号票根 + 放大，按新顺序排的侧栏一排）。
- 截图与证据：`~/Library/Application Support/postpane/evidence/2026-11-27-554-antigravity-moves/`：`before-after-strip.png`、`check.log`、`test.log`、`node.log`、`red-on-main.txt`、`build.log`；预览脚手架在 `preview/`（`entry.tsx`、`frames.tsx`、`build.sh`、`rebuild-frames.sh`、`out/`，`old/` 是 main 快照）。
- 发布与回读：常浩经驿窗侧栏回「覆盖装机」，`install.sh 554-antigravity-moves --takeover`：装前 `d49ed6e89c8e`（`install-548-539` 合并包，含未合并的 #539）已备份到证据目录 `PostPane-d49ed6e89c8e.app`；产物 `628de7f4b999` / 已装 `628de7f4b999`，签名一致；`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-27-554-antigravity-moves/PostPane-d49ed6e89c8e.app" /Applications/PostPane.app; open /Applications/PostPane.app`。实机截屏（`before-after-strip.png`，由 `smoke-before-1.png`、`smoke-after-1-1.png` 裁出）：装后 Antigravity 排第 4、是常驻小人、正在打盹；其余五家与装前一致。重启后顺序仍是第 4 位，但 `draft_hud` 回读的已保存列表里还没有 antigravity，请常浩在面板里再点一次「保存」。装上的包不含 #539，#539 合并后要从 main 重打重装。动作只看到打盹一种，其余动作没在实机上逐个验。
- 与授权不一致之处、遗留问题、范围外发现：常浩看预览和实机截图后经驿窗回「Accepted, merge」，已验收并按他的话合并；实机只看到打盹，其余 21 个动作以预览为准。合并后主目录没拉（postpane 不在拉齐名单，请他回合并时没写「拉主目录等于上线」的提示）。顺序要他在面板里点「保存」。
- 本轮新坑：无
- skill 进化：无

## 接力治本第 2 步：重读时做页面体检，页面改版几分钟内说清认不出什么；认网页的写法收口（#548）（2026-11-27，Claude，常浩确认问题清单第 2 条后回「开始第 2 步」，动手前在会话里列了行为变化；已提交，PR 见描述，已登记 DECIDED.md，装机与端到端验证见下）

- 时间：开工 `2026-11-27 01:27`（按建分支的时间，约数）。来由：#544 验收第 1、2 条；全表 E10 空格 26–30（页面认不出时只表现为「30 分钟没回信」或误诊）。
- 改变的行为（动手前已在会话里列出）：重读时插件做页面体检，缺了插件要认的东西就报 `changed` + `missing`；同一张接力隔几分钟连续两次都是 `changed`，驿窗停下自动往返，卡上写「ChatGPT 页面改版：驿窗认不出 X」，通知发起会话一次（不是没回信、别重送），写一行 `postpane.log`。原来要等 30 分钟、说成「ChatGPT 没回信」。实现时调整一处并已告知：自动往返已停着的接力也通知一次（它之前收到的是「30 分钟没回信」，要更正成真实原因）。页面还在画历史时也会缺项，靠「隔几分钟连续两次」排除。
- 你要求的：
  - 插件：`page.js` 加 `shape(doc, held)`（查输入框；会话里有驿窗的话时再查对话轮次、提问编号、回答格子、提问文字）、`WATCHED`、`SEL.ids`；`content.js` 重读回复带 `missing`，盯的属性改用 `page.WATCHED`；`background.js` 有缺项就报 `changed` 并转 `missing`；版本 0.2.11 → 0.2.12。
  - 驿窗：`answers/desk_undrawn.rs` 连续计数改为「同一种结果连着几次」（`undrawn`、`changed` 两种），`changed` 两次就 `page_changed`，turns.jsonl 记 `missing`；`notice/book.rs` 新 `Cause::PageChanged`、`Trouble::PageChanged`、`Book::page_changed`；`notice/desk.rs` 通知文字；`handoff.rs` 计数字段类型改一行。
  - `scripts/check-rules.mjs` 新规则 `page`：插件里 `page.js`、`data.js`、`mark.js` 之外不许出现选择器。
  - 文档：`docs/chatgpt-channel.md`（`changed`、页面体检、2026-11-27 页面结构实测）、`docs/接力规范.md` 第 6 节和全表摘要、`docs/接力异常全表.md` E10、`docs/DECIDED.md` 一行。
- 我顺手改的：`page.js` 里提问编号属性名原来写了 3 处，合成一处；影子读取认得的页面结果加 `changed`（`platform/.../shadow.rs`）；更正 `evidence/2026-11-27-544-page-probe/real-page-structure.md` 里「空输入框时也有发送键」（见下）。
- 同类：搜了插件里所有选择器写法（`querySelector`、`aria-label`、`data-*`），`page.js`、`data.js`、`mark.js` 之外只有 `content.js` 那一处，已收；驿窗 Rust 侧按提问文字比对的老兜底没动（给缺编号的老记录用，另看）。
- 测试：
  - 新测试先红后绿：插件页面 `ℹ fail 3`（`red-content.txt`）、插件后台 `ℹ fail 1`（`red-background.txt`）、规则 `ℹ fail 1`（`red-check-rules.txt`）、驿窗 `FAILED. 1 passed; 2 failed`（`red-host.txt`；过的那条守「中间夹别的结果就重新计数」，旧代码本来不停）；改后都过。
  - 旧测试改了 2 条预期（「a reply with no prompt drawn yet…」「asked to read again, a tab checks its conversation…」）：页面还在画历史时现在也报缺项，照批准的行为改。
  - 三条全量：`pnpm run check` 原样 `check exit 0`；`pnpm test` 第一次「全量测试汇总：6 套，失败 1 套」：Chrome 插件 `ℹ pass 199` / `ℹ fail 1`，失败的是真实 Chromium 那条「a page too busy to answer…」跑了 229 秒（当时负载 38–44，同批另一条正常测试跑了 17 分钟）；单独重跑 `chromium.test.mjs` `ℹ pass 15` / `ℹ fail 0`，整套插件 `ℹ pass 200` / `ℹ fail 0`（`rerun-chromium.txt`、`rerun-extension.txt`）；其余：Rust 1178 passed，前端 516，MCP 9，插件 14，注入脚本 11，各 fail 0。`node --test tests/*.test.mjs` `ℹ pass 65` / `ℹ fail 0`。证据目录 `~/Library/Application Support/postpane/evidence/2026-11-27-544-page-probe/`。
- 验证：
  - 真实页面（常浩的 Chrome，新开标签页、已结束接力的会话，只读；改名只改本地 DOM，测完改回关掉；`real-page-shape-check.md`）：第一版查发送键，页面完好也误报——输入框空着时 ChatGPT 把发送键换成「开始语音」，已去掉这一项；第二版：完好 `[]`，回答格子 / 提问编号 / 提问文字 / 输入框 / 对话轮次分别改名各报对应一项，改回 `[]`。
  - 插件 → 驿窗 → 接力卡 → 通知这一整条：替身通过（`page_changed.rs`、`background.test.mjs`）。真实环境端到端在合并后做：常浩同意装「本分支 + #539」的合并包、重载插件、发一条测试接力（「驿窗自检，只回 OK」），在那个标签页本地改名看卡片和通知；结果写进下一节。
- 截图：无界面改动（卡上文字走原有停因显示）。
- 发布与回读：见下一节（合并后装机）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 停止键只在写回答时出现，体检查不了（全表 E10 空格 27 仍在）。
  - 送话那一路没改（`no-composer` 等原因照旧）。
  - 主线：接力治本｜✅ 0 装机、1 规范、2 页面体检（端到端待验）⏳ 3 判活按信号（改动确认）、4 不丢不重复与回程、5 静默停摆、6 每日自检（要批）、7 真实环境验收。
- 本轮新坑：无（「空输入框时发送键被换走」记在通道文档和证据里，属页面事实，不是做法上的坑）。
- skill 进化：无。

## 接力治本第 0、1 步：补装 7 个已合并的接力修复；接力规范与「状态 × 异常事件」全表（#544、#545）（2026-11-27，Claude，常浩确认问题清单并回「清单没问题，先装机」「#539 分支最新版」「开始第 1 步」；已提交，PR 见描述，已装机回读）

- 时间：开工 `2026-11-27 00:05`（`date '+%F %H:%M'` 记录）。来由：常浩 11-26 跨项目复盘第 9 条「先不加功能，把网页一改就坏这些问题真的解决掉，把制度梳理清楚、跑通」。先只读出问题清单（`docs/design/接力治本-问题清单-2026-11-27.md`，12 条），常浩确认后做第 0 步装机、第 1 步规范。
- 改了哪些文件：
  - 你要求的：`docs/design/接力治本-问题清单-2026-11-27.md`（问题清单，含第 0 步结果、#539 现场结论）；`docs/接力规范.md`（新，角色、一段话的一生、失败三档、不丢不重复、认网页约定、全表摘要、接新执行方要做的事，每条标〔现行〕或〔目标 #544-n〕）；`docs/接力异常全表.md`（新，15 种异常 × 各阶段，代码位置、测试、证据类型，36 个空格各标由 #544 哪一步处理，8 处文档与代码不一致）。
  - 我顺手改的：`AGENTS.md` 导航表加一行指向接力规范；`docs/LESSONS.md` 新坑 L-74。
  - 没改代码，没改已有行为。
- 测试：`node --test tests/*.test.mjs` 原样 `ℹ pass 64` / `ℹ fail 0`；`node scripts/check-rules.mjs`「通用规则检查通过」。纯文档改动，`pnpm run check`、`pnpm test` 本分支未跑；装机那一包（`9ab0578`）跑过三条全量，见下。
- 验证：
  - 第 0 步（真实环境）：装前已装二进制是 11-25 17:00 `claude/motion-polish` 打的包，搜不到 #433、#431 的提示文字；装后四串（#433「已停止自动重读」、#431「提问读不到」、#524、#528）都在，应用按插件 0.2.11 打包，和 Chrome 里一致。
  - #539 第 4 轮现场（Claude in Chrome，常浩的 Chrome 新开标签页只读，未发消息、未点按钮，看完关掉）：会话里只有第 2、3 轮，第 4 轮提问编号 `96110618…` 不存在，不在生成，无报错 → 提问没送进去，需重送。证据 `evidence/2026-11-27-relay-fixes-install/539-round4-page-check.md`。
  - 全表：只读子 agent 逐格对照代码取证（没跑测试）；我复核了 E11 两格（`answers/book_reread.rs` 的 `reread_result` 遇 `told` 清零计数；`content.js` 空占位判 `undrawn`），属实。装机后 #539 那单仍在每 2 分钟重读（`turns.jsonl` 该回信编号的 `unmatched` 到 01:13 共 255 行，其中装机后 18 行），是 E11 第 1 格在真实环境的证据。
- 截图：无界面改动。装机冒烟图 `evidence/2026-11-27-relay-fixes-install/smoke-*.png`、`after-install-screen.png`。
- 发布与回读：常浩选装 `claude/motion-polish` 最新 `9ab0578`（已含 main `6181233`）。临时 worktree 里 `pnpm run check` exit 0；`pnpm test`「全量测试汇总：6 套，失败 0 套」（Rust 1175 passed，前端 `ℹ pass 546`，MCP 9，插件 14，Chrome 插件 196，注入脚本 11，各 `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。`install.sh relay-fixes-install --takeover`：产物 `51a88434773b` / 已装 `51a88434773b`，签名证书 `b773068e`；冒烟：侧栏在动，隔 2 秒 2108 个像素不同。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-27-relay-fixes-install/PostPane-1bce2b00156a.app" /Applications/PostPane.app; open /Applications/PostPane.app`。临时 worktree 已删。
- 与授权不一致之处、遗留问题、范围外发现：
  - 装的是未合并的 #539 分支（常浩选的），#539 合并后要从 main 重装一次。
  - 装完弹出「PostPane 想访问钥匙串中的 Claude Safe Storage」授权框，由常浩自己点；是否每次重装都弹未核实。
  - `postpane.log` 00:25 有一行后台续接 Claude 失败「OAuth session expired」：Claude 命令行登录可能过期，后台续接会失败，不在本单范围。
  - 每日自检 9:00 是否可以、新建 launchd 任务：等常浩回。
  - 主线：接力治本｜✅2/8（0 装机、1 规范）▶ 无 ⏳ 2 认网页收口与体检、3 判活按信号（改动确认）、4 不丢不重复与回程、5 静默停摆、6 每日自检（要批）、7 真实环境验收。
- 本轮新坑：L-74。
- skill 进化：无。

## 接力写作闸：点了停止、一个字没写出时页面报 stopped，驿窗立即解除（#526）（2026-11-24，Claude，常浩看改动确认后在会话里回「12改」；已提交，PR 见描述，已登记 DECIDED.md，接在 #518 后面）

- 时间：开工 `2026-11-24 13:44`（`date '+%F %H:%M'` 记录）。来由：拍板清单第 12 项。写作闸（11-22 定，只认同一轮「写完」才解除）在常浩点了停止、一个字没写出时听不到「写完」，会挡满 30 分钟。改的是已定内容：发过改动确认（原定、改成什么、风险「思考阶段被误判提前解除」、备选「缩到 5 分钟」），常浩回「12改」。
- 改变的行为：页面在停止按钮消失后 600 毫秒读一次、再隔 2 秒读一次，两次都是「没在生成、最新提问没变、它后面没有回答或只有空占位」，报 `turn` 的 `stopped`（带开始时记下的提问编号）；驿窗按同一轮「写完」的规矩立即解除写作闸，别的什么都不做。两次之间写出了字就不报。其余照 11-22 那行（30 分钟出口还在）。
- 你要求的：
  - `src/apps/chrome-extension/content.js`：`unwritten`、`watchStop`、`STOP_AGAIN`；插件 0.2.9 → 0.2.10（#518 已升到 0.2.9、还没发布，两张合并后常浩重新加载一次）。
  - `src/crates/platform/src/clients/chatgpt/mod.rs`：`stopped` 原样转给驿窗，不记事件。
  - `src/crates/host/src/handoff.rs`：`observe` 加一支，只交给写作闸（`heard_writing` 本来就把非「开始」的阶段当结束，不用改）。
  - 测试：`content.test.mjs` 3 条（一字未写报、只有空占位报、两次之间写出字不报），`handoff/tests/writing.rs` 1 条（别的提问停了不解除、这一轮停了就放行）。
  - 文档：`docs/chatgpt-channel.md` 两处；`docs/DECIDED.md` 新一行，11-22 那行备注「部分已被取代」。
- 我顺手改的：
  - 通道层 `mod.rs` 在 300 行棘轮基线里只许变短，加一支要多 5 行；把只是「回合变成事件」的四个纯函数（`turn_at`、`turn_title`、`started`、`completion`）原样挪到新文件 `turns.rs`（542 → 470 行，基线跟着收紧），`tests_unix.rs` 补一行引用。
  - `src/tooling/file-size-allowlist.json`：`handoff.rs` 上限 2001 → 2006，理由写明。
  - `src/packages/app/test/picture-queries.test.ts`：第一次全量时这条在负载 22 下失败（20 毫秒的时限过了 1 秒多才回来，`picture-rerun.txt` 单独重跑 3 次都过），断言「1 秒内回来」放宽到 10 秒，原意「不等永远不回的查询」不变。同类：搜了测试里 `Date.now() - started <` 这种写法，只此一处。
- 同类：插件报给驿窗的回合阶段只有开始、完成两种，「停了」是第三种；没有别处要认它。
- 测试：
  - 新测试先红后绿：页面 3 条在旧代码上 `ℹ pass 1` / `ℹ fail 2`（`red-page.txt`；过的那条守「写出字就不报」），驿窗 1 条 `FAILED. 0 passed; 1 failed`（`red-host.txt`）；改后页面测试 `ℹ pass 32` / `ℹ fail 0`，驿窗接力模块 `ok. 232 passed`，通道层 `ok. 272 passed`。
  - 三条全量：`pnpm run check` 原样 `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1159 passed（1158 + 1），前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 188`（185 + 3），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`（`check2.txt`、`test2.txt`；第一次全量前端那条见上）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`（`node.txt`）。
  - 证据目录 `~/Library/Application Support/postpane/evidence/2026-11-24-526-stop-empty/`。
- 审查：没送 ChatGPT，没另做独立审查。
- 验证：页面测试在真实 Chromium（Playwright）里加载 `content.js` 跑，但页面是本地夹具不是真 chatgpt.com，属替身通过。真实页面未验：要在 chatgpt.com 上发一句、马上点停止，看 `turns.jsonl` 里有没有 `stopped`、接力能不能立刻发。
- 截图：无界面改动。
- 发布与回读：（#518 审查通过、两张合并后从 main 装机，请常浩重新加载插件 0.2.10）
- 与授权不一致之处、遗留问题、范围外发现：本分支从 #518 的分支拉出（都改插件版本和同几份文档），PR 连带 #518 的提交，#518 先合并后只剩自己的。
- 本轮新坑：无。
- skill 进化：无。

## 接力：读回信时临时切前台再切回，改用保守规则（#518）（2026-11-24，Claude，常浩看「接力根治」拍板清单后经 agent-hud 插件回「全按推荐」（第 4 项）；已提交，PR 见描述，已登记 DECIDED.md，送 L2 审查见下）

- 时间：开工 `2026-11-24 13:32`（`date '+%F %H:%M'` 记录）。来由：#508 审查第 4～8 轮在 `drawnInFront` 里一轮轮找出更细的时机边界（#507-P2-05），常浩 11-22 定「先合并另开单」；issue 提的保守规则这次经「全按推荐」确认。
- 改变的行为（动手前已在会话里列出）：
  - 正在把 ChatGPT 标签页切到前台时常浩换了标签页：原来插件的切换若后完成、盖住了常浩选的，就把他选的切回来；现在什么都不切回，他选的也不再切回来，不读。代价（issue 写明、常浩已知）：ChatGPT 标签页可能留在前台，要自己切回。
  - 切到前台的请求 3 秒没回音：原来不读、不切回；现在不读，再盯 10 秒，迟到完成且这个窗口没被动过就切回原来那个，动过就不动。
  - 判断只看目标窗口，别的窗口里的切换不算。
- 你要求的：
  - `src/apps/chrome-extension/background.js`：`drawnInFront` 去掉「把常浩选的切回来」那一支；切前台请求留着（`putting`），没回音时用 `LATE_PUT`（10 秒）再盯。插件版本 `manifest.json` 0.2.8 → 0.2.9。
  - 测试 `test/background.test.mjs`：原「正在切过去时换了标签页」那条预期从 `[2, 4]` 改成 `[2]`（照批准的行为改）；新加一条三种情形（迟到且没动过 → 切回；迟到但动过 → 不动；别的窗口里切换 → 仍切回），迟到用测试手里放行的 Promise，两窗口夹具。
  - 文档：`docs/chatgpt-channel.md` 时限一段两处；`docs/DECIDED.md` 一行。
- 我顺手改的：无。
- 同类：插件里另一处切前台是 `focus()`（常浩点「跳回」时主动切，不切回），不是同类。
- 测试：
  - 新测试先红后绿：旧代码上 `ℹ pass 0` / `ℹ fail 2`（`red.txt`：「late」实得 `[2, 4]`、「come late, put back」实得 `[2]`）；改后插件后台测试 `ℹ pass 82` / `ℹ fail 0`（`green.txt`）。
  - `pnpm run check` 原样 `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1158 passed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 185`（184 + 1），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。
  - 证据目录 `~/Library/Application Support/postpane/evidence/2026-11-24-518-front-guard/`。
- 审查：照 issue 送 ChatGPT L2，审查链接 #507 的 `r1a2019f9b8302`（结果见下）。
- 验证：替身通过：标签页切换由测试替身代替。真实 Chrome 未验：要等一次「回信没画出来、插件切前台读」时常浩正好在换标签页。
- 截图：无界面改动。
- 发布与回读：（审查通过、合并后从 main 装机，并请常浩在 Chrome 里重新加载插件 0.2.9）
- 与授权不一致之处、遗留问题、范围外发现：无。
- 本轮新坑：无。
- skill 进化：无。

## 接力审核门：经代理回读 PR 提交失败时直连再读一次（#527）（2026-11-24，Claude，常浩看「接力根治」拍板清单后经 agent-hud 插件回「全按推荐」（第 13 项）；已提交，PR 见描述，已登记 DECIDED.md，装机见下）

- 时间：开工 `2026-11-24 13:22`（`date '+%F %H:%M'` 记录）。来由：11-23 夜里本机代理 127.0.0.1:8086 坏了，驿窗按通过结束前回读 PR 提交失败，#510 第 3 轮通过被记「版本待核」、多跑一轮。
- 改变的行为（动手前已在会话里列出）：原来回读失败就记「版本待核」、停下交常浩；现在第一次失败（PR 不存在除外）去掉代理、直连 GitHub 再读一次，两次都失败才记「版本待核」，原因把两次的都写上；日志记哪一次成的、各自失败原因。第一次仍按原来的环境读（直连可能被 DNS 污染，G-19）。审核门的判断规则不变。
- 你要求的：
  - `gate/desk_pr_head.rs`（新）：回读从 `gate/desk.rs` 整段挪来，加 `with_fallback`、`args`（直连时加 `-c http.proxy= -c https.proxy=`）、`PROXY_VARS`（直连时去掉的 6 个环境变量）；5 条单测。`gate/desk.rs` 声明这个模块并转出 `read_pr_head`，调用方不变。
  - 文档：`docs/chatgpt-channel.md` 审核门一句；`docs/DECIDED.md` 一行。
- 我顺手改的：#528 加的 `MEND_AGAIN_MS` 导出在正式构建里报「没用到的导入」警告（我上一张留下的），改成只在测试里导出（`book.rs`、`sending/book_unsure.rs`，行数不变）。
- 同类：驿窗里另外的联网读取（额度、云端会话）不走 `git ls-remote`，不在这张范围；没有别处读 PR 提交。
- 测试：
  - 新测试先红后绿：先只挪代码、不加兜底，`test result: FAILED. 2 passed; 3 failed`（`red.txt`；没失败的两条守的是「一次成功就不再读」「PR 不存在不再读」）；实现后接力模块 `test result: ok. 231 passed; 0 failed`（`green.txt`）；正式构建 `cargo build -p agent-hud-host` 无警告。
  - `pnpm run check` 原样 `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1158 passed（1153 + 5），前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 184`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。证据目录 `~/Library/Application Support/postpane/evidence/2026-11-24-527-head-direct/`。
- 验证：真实环境里分别跑了两种读法（`real-ls-remote.txt`）：当时本机代理又坏了，原来那种读法报 `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`，直连读法读回 `c093ef69…`，和 PR #530 实际的提交一致。驿窗进程里走这一路的那一下没实测（要等一次真实的通过回信）。
- 截图：无界面改动。
- 发布与回读：`install.sh 527-head-direct`（本分支从含 #528 的 `360b5ae` 拉出，这一包同时带上 #528；装前是 #524 的包 `64081b80fd41`）：产物 `78a4d93b488a` / 已装 `78a4d93b488a`，签名证书 `b773068e`；冒烟：侧栏在动，隔 2 秒 471 个像素不同。装前装后 1.08% 像素不同：重启后另一个会话等回答的提问小签弹出来了（装前收成角标「3」），属正常显示，和本次改动无关（`smoke-before-after-1.png`）。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-24-527-head-direct/PostPane-64081b80fd41.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：无。
- 本轮新坑：无。
- skill 进化：无。

## 接力：驿窗自己发的补格式没点发送时也算没送成，过 30 秒再补一次（#528）（2026-11-24，Claude，常浩看「接力根治」拍板清单后经 agent-hud 插件回「全按推荐」（第 6 项）；已提交，PR 见描述，已登记 DECIDED.md，装机见下）

- 时间：开工 `2026-11-24 13:14`（`date '+%F %H:%M'` 记录）。来由：#466（11-20）只把「没点发送算没送成」用在会话发起的送审上，补格式当时写明「等常浩定」，一直挂在主线 ❓。拍板清单第 6 项推荐「照送审一样：没点发送按没送成恢复，可重送」，常浩回「全按推荐」。核对过：这一块当时是待定，不是已定内容，没发改动确认。
- 改变的行为（动手前已在会话里列出）：原来驿窗发补格式时插件说没点发送（或插件没连上），照送达未确认处理：自动往返停下、交常浩、通知会话。现在清掉补格式的待确认，回信回到「等处理」，卡上记一步「补格式这一段没送成（原因）：发送没有点下去，驿窗过一会儿再补一次」，自动往返不停；30 秒后再补一次。再补那次还是没点发送，或点了没见开始、说不清点没点，照旧按送达未确认处理。
- 你要求的：
  - `sending/book_mending.rs`：`MEND_AGAIN_MS`；`Handoff::mending_waits`（这一封回信已补过、没送成后不到 30 秒就先不补）；`Book::mending_not_sent`（只在这封回信第一次补格式时生效）。
  - `gate/desk.rs`：`ask_format` 遇到没点发送先走 `mending_not_sent`，再补那次照旧；`gate/desk_guard.rs`：卡上那句话。`book.rs`、`sending/book_unsure.rs`：导出常量（并进原有一行）。
  - 测试 `handoff/tests/mend_unsent.rs`（2 条）。
  - 文档：`docs/chatgpt-channel.md` #466 那段补格式一句改写；`docs/DECIDED.md` 加 2026-11-24 一行，2026-11-20（①）那行备注补「补格式那块已由 #528 定下」。
- 我顺手改的：无。
- 同类：会话发起的送审没点发送早由 #466 处理；补格式是剩下唯一一处「没点发送仍按送达未确认」的发送，没有别处。
- 测试：
  - 新测试先红后绿：只加常量、不改行为时 `test result: FAILED. 0 passed; 2 failed`（`red.txt`；旧代码第一次没点发送就停下、不再补）；实现后接力模块 `test result: ok. 226 passed; 0 failed`（`green.txt`）。
  - `pnpm run check` 原样 `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1153 passed（1151 + 2），前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 184`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`（`check.txt`、`test.txt`、`node.txt`）。
  - 证据目录 `~/Library/Application Support/postpane/evidence/2026-11-24-528-mend-unsent/`。
- 审查：没送 ChatGPT，没另做独立审查（改动集中在补格式发送失败的一支，两条测试覆盖两种走向）。
- 验证：替身通过：没点发送由测试替身代替。真实环境未验：要等真实出现「补格式时 ChatGPT 还在写」，再看卡上的那一步和 30 秒后的再补。
- 截图：无界面改动。
- 发布与回读：本分支没单独装机，和下一张 #527 合并后从 main 一起打包装机（见 #527 那节）。
- 与授权不一致之处、遗留问题、范围外发现：30 秒、最多再补一次是实现时定的（防 ChatGPT 还在写时连发），已写进 DECIDED 那行备注。
- 本轮新坑：无。
- skill 进化：无。

## 接力：去会话里找满 30 次后交常浩并通知会话；查明没送到也通知会话（#524）（2026-11-24，Claude，常浩看「接力根治」拍板清单后经 agent-hud 插件回「全按推荐」（第 2、3 项）；已提交，PR 见描述，已登记 DECIDED.md，装机见下）

- 时间：开工 `2026-11-24 12:46`（`date '+%F %H:%M'` 记录）。来由：#510 L3 审查留下的 P2-01、P2-02 交常浩定，推荐「查明没送到通知会话」「找满 30 次交常浩并通知一次，计数问题一起修」，常浩回「全按推荐」。
- 改变的行为（动手前已在会话里列出）：
  - 查明没送到（`absent`）：原来只恢复接力、卡上记一步，发起会话不知道；现在另按出错通知告诉会话一次「上一段查明没送到，请原样重送」。自动往返仍停着时（放回了更早一段没确认的送审，或常浩暂停了）照实说，请会话重送前先向常浩说明；通知前会话已经重送的不再通知。
  - 找满 30 次之后：原来不再找、不出声，卡永远停在送达未确认；现在最后一次之后又过 2 分钟仍说不清，卡上记一步「驿窗去 ChatGPT 会话里找了 30 次仍查不清这一段送到没有，交常浩」，并通知会话一次（写「送达状态未知」）。这一步不需要插件，插件没连上也照记；之后重启不再另记、不再通知。
  - 计数：原来定时到点就算一次（通道没连上也算），重启清零；现在插件收到查找指令才算一次，次数随待确认写盘，重启后接着数。
- 你要求的：
  - `sending/book_finding.rs`：`to_find` 只记时间不计数；新 `looked_once`、`lost_finding`；`found_absent` 给那一步标原因 `Absent`。
  - `sending/desk_finding.rs`：`find_unsure` 发出去了才计数并写盘；新 `lose_unfound`（有改动才写盘）。`answers/desk_reread.rs`：定时入口先调它，再看插件连没连上。
  - `sending/book_unsure.rs`：`Pending.looked` 写盘，新 `lost`；重启时 `lost` 的不再记「重启时未确认」。
  - `notice/book.rs`、`notice/desk.rs`：新原因 `Absent`、`Lost` 和对应的两段通知；`Absent` 之后紧跟的「恢复自动往返」不算情况变了。
  - `gate/desk_guard.rs`：卡上那句话 `finding_lost`。`book.rs` 导出 `FIND_MOST`（并进原有一行，行数不变）。
  - 测试 `handoff/tests/find_tell.rs`（8 条），假通道 `tests.rs` 加 `find_fails`。
  - 文档：`docs/chatgpt-channel.md` 送达未确认一段补三处；`docs/DECIDED.md` 登记 2026-11-24 一行。
- 我顺手改的：`docs/LESSONS.md` L-69 补「提升：已提升为全局 G-49」（agent-kit#125，PR agent-kit#126 等合并）。
- 同类：搜了接力里的计数（`+= 1`）和不写盘的字段（`serde(skip)`），命中 3 处：重读（发送失败本来就不计）、没画出（按插件回报计）、写作闸（设计上由插件重启后补报），都不用改。
- 测试：
  - 新测试先红后绿：第一批 5 条在旧代码上 `test result: FAILED. 1 passed; 4 failed`（`red.txt`；没失败那条守的是「会话已重送就不通知」，旧代码本来就不通知）；独立审查后补 3 条，`FAILED. 5 passed; 3 failed`（`red-r1.txt`）；改后接力模块 `test result: ok. 224 passed; 0 failed`（`green-r1.txt`）。
  - `pnpm run check` 原样 `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1151 passed（基线 1143 + 新增 8），前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 184`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`（`check2.txt`、`test2.txt`、`node2.txt`）。第一次全量 `check exit 1`：`FIND_MOST` 只在测试配置下导出、正式构建找不到，`book.rs` 多一行超了 300 行棘轮名单的上限 1579；合进原有导出行后过了。
  - 证据目录 `~/Library/Application Support/postpane/evidence/2026-11-24-524-find-tell/`。
- 审查：请子 agent 做了一次只读独立审查（只给代码和需求），1 条 P1、2 条 P2、3 条 P3。P1「每秒都写盘」、P2「放回更早一段时通知说自动往返没停」、P2「交常浩后重启会再通知一次」、P3「约一小时不准」、P3「插件没连上时不记交常浩」都成立，已修并补测试；P3「放回的更早一段刚好找满 30 次会盖掉没送到的通知」不会发生：放回的那段一定已经有回信（`answered`），`lost_finding` 跳过它。没送 ChatGPT 审查。
- 验证：替身通过：查找、通知都由测试替身代替。真实环境未验：要等真实出现送达未确认，再看接力卡步骤、发起会话收到的通知、`handoffs.json` 里待确认的 `looked`。
- 截图：无界面改动。
- 发布与回读：`install.sh 524-find-tell`（装前是 #510 从 main 打的包 `d11c804247c1`）：产物 `64081b80fd41` / 已装 `64081b80fd41`，签名证书 `b773068e`；冒烟：侧栏在动，隔 2 秒 603 个像素不同；装前装后 0.23% 像素不同、落在小人一带。13:10:06 启动行正常，145 张旧接力照常读出（旧数据没有 `looked`、`lost` 两项，按默认值读）。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-24-524-find-tell/PostPane-d11c804247c1.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：无。
- 本轮新坑：无。
- skill 进化：无。

## #509 收尾：L3 审查 4 轮通过、合并、从 main 装机，真实页面只读核对（2026-11-24，Claude，接 #510 交接卡的收尾步骤；PR #510 已 squash 合并 `c2d84fb`、已装机回读通过，真实页面部分核对）

- 时间：开工 `2026-11-24 12:27`（`date '+%F %H:%M'` 记录）。来由：上一节（#509）写到「已送 L3 审查、未装机」，本节记审查到合并装机的经过，补 DECIDED 提交号和通道文档，并把主线剩下要常浩定的事收成一张清单。
- 改变的行为：无（只改文档）。
- 审查与合并（前几个接手会话做的，本节汇总）：
  - L3 审查接力 `h1a207e54d6608`（审查链 `r1a207e54d6608`），4 轮。第 1 轮 4 条 P1（全会话找请求号要有锚点、重启后记提问编号、重载由页面自己判断、`Pending.before` 写盘）；P1-01、P1-03 改了常浩 11-22 定的找法，发改动确认后常浩 11-23 经 agent-hud 插件回「改」，DECIDED 已加 2026-11-23 行。第 2 轮 2 条 P1（没画出字的提问算读不到、附件草稿和可编辑框不重载）。第 3 轮通过，但驿窗回读 PR 提交时本机代理 127.0.0.1:8086 坏了，记「版本待核」没放行；第 4 轮核验版本后放行、接力结束。回信全文在 `<数据目录>/chatgpt/replies/h1a207e54d6608-0{1..4}-*.md`。
  - 顺手修了 main 上也挂的 DeepSeek 插件测试（计时器 `unref`，`7f0db4a`），加 L-72、L-73，随 #510 合并；审查提的 P2-04（那处等待没有超时）开了 #522。
  - PR #510 2026-11-24 squash 合并为 `c2d84fb`。
- 改了哪些文件（本节这个 PR）：
  - 你要求的：`docs/DECIDED.md` #507/#508 两行提交号补成 `2429481`、#509 两行（11-22、11-23）补成 `c2d84fb`；`docs/chatgpt-channel.md` `found` 一行补「页面上不一定有每一轮，锚点兜底」；本节。
  - 我顺手改的：`docs/DECIDED.md` #520 那行同样写着「见 PR 的合并提交」，补成 `69f358a`（PR #521）。同类：搜了 DECIDED 里「见 PR…合并提交」，命中 5 处，全部补上。
- 测试：main `c2d84fb` 上 `pnpm run check` 原样 `check exit 0`；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 通过（1143），前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 184`，注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。日志 `evidence/2026-11-24-510-main/{check,test,node}.log`。本节 PR 只改文档，三条全量重跑结果写在 PR 描述。
- 验证：
  - 装机回读：通过。版本对上：12:16 旧包（#520，按 0.2.7 打包）还在跑时常浩已把插件重载到 0.2.8，日志记一行版本不一致；12:19 新包启动（`postpane.log` 第 26 行，pid 40353）之后没有再出现不一致。
  - 真实页面只读核对（Claude in Chrome，常浩的 Chrome，新开标签页只读跑 `c2d84fb` 的 `page.js` 判断，没发消息，`evidence/2026-11-24-510-main/real-page-check.md`）：
    - 通过：第 2、3、4 轮送审在真实 chatgpt.com 都按请求号找到，提问编号和驿窗记的一致。
    - 通过：空输入框、没附件时没有发送键，`drafting=false`，允许重载。
    - 发现：长会话开头那一轮（第 1 轮长送审说明）不在页面里，拿它当锚点 `anchored=false`；锚点机制在这里起了兜底作用（找不到锚点就不判没送成）。已写进 `docs/chatgpt-channel.md`。
    - 没验：输入框挂文件、挂图片不发送时 `drafting` 是否为真；改旧提问用的是哪种编辑框。两项都要在常浩账号里挂附件、点编辑，等常浩定由谁操作。
    - 没验：两张原来卡死的接力（`h1a1f80d704602`、`h1a1fd0571bd03`）已被驿窗「24 小时没动静」自动结束，新代码只找开着的接力，没法再拿它们验。
    - 没验：`find` 整条链路在真实「送达未确认」时的表现，只能等自然发生。出现时查：接力卡步骤里有没有「驿窗重新读了 ChatGPT 会话…」或「确认送到」那一步；`<数据目录>/chatgpt/turns.jsonl` 里这一轮的提问编号；`grep -n "find\|found" <数据目录>/logs/postpane.log`。不为它新建定时任务。
- 截图：无界面改动。装机冒烟图 `evidence/2026-11-24-510-unsure-resolve/smoke-*.png`。
- 发布与回读：`install.sh 510-unsure-resolve --takeover`（接管的是已合并的 #520 worktree 的包）：产物 `d11c804247c1` / 已装 `d11c804247c1`，签名证书 `b773068e`；冒烟：侧栏在动，隔 2 秒 479 个像素不同。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-24-510-unsure-resolve/PostPane-a252ca15d4b5.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 清现场：`.claude/worktrees/507-tab-revive` 用来写本节，本 PR 合并后删掉，连同本地分支 `claude/507-tab-revive`、`claude/509-unsure-resolve`、`claude/510-wrapup`。
  - 待常浩定的事收成一张拍板清单，发在本会话的答复里（#510-P2-01、P2-02，#518，半截回信，补格式，#470，第 2～4 批，#432，L-69 提升，几处问 Chrome 没有时限，停止后写作闸挡 30 分钟，代理坏了时版本待核）。
  - 主线：接力根治｜完成 9/19（之前写的「/16」没数全，本节按清单逐项数：✅9 ▶2 ❓8）：✅ S1（#423）✅ 按提问编号认领（#437）✅ 全链路梳理 ✅ 第 0 批止血代码（#441、#451、#468）✅ 另外三处规则文字 ✅ 第 1 批只读探测（#487）✅ 第 1 批影子运行代码（#491）✅ 标签页失效自愈与 2 小时不再停（#507，`2429481`）✅ 送达未确认后自动查清（#509，`c2d84fb`）▶ #507、#509 实机验证（装机、插件 0.2.8 已就位；附件两项待常浩定，`find` 等自然发生）▶ 影子运行实测（11-22 09:53 起在记录）❓ 没找到之后通知会话（#510-P2-02）❓ 找满 30 次之后（#510-P2-01）❓ 半截回信并入读对话数据、何时切成正式读法 ❓ 补格式没送成怎么处理 ❓ #470 ❓ 第 2 批其余（并 #431、#433 余下部分、#442、#443、#444、#463）❓ 第 3 批分级恢复（并 #434）❓ 第 4 批体检与防回退；#432 排查单另算。
- 本轮新坑：无（L-72、L-73 已随 #510 合并）。
- skill 进化：无。

## 侧栏回答 Claude 提问：会话进程被回收后在后台续接（#520）（2026-11-23，Claude，常浩看甲乙两种修法后回「按甲：后台续接」；已提交，PR 见描述，已装机回读，真实回收场景未实测）

- 时间：开工 `2026-11-23 10:01`（`date '+%F %H:%M'` 记录）。来由：常浩截图「又出现这样的情况」：会话 `local_08fcc96a…`（CLI `3f10b6fe…`）09:53:45 答完这一轮、留下「下一步」框，09:55:09 桌面版日志 `[CliGovernor] pressure evicting … (idle 84s)` 回收了进程；侧栏卡按设计仍显示能答，选「重送」提交后被拒，要他去 Claude 里发话。接力早有后台续接（#175），侧栏回答没接上。
- 改变的行为：侧栏（和手机）回答 Claude 桌面会话的提问时，插件签到写着已停（`ended`）的，不再拒绝，改用 `claude -p --resume <会话号>` 在后台续接，带会话自己的权限模式、模型、力度，最长 2 小时，回答当这一轮的输入，卡照常收走，投递记录照常记「Agent HUD」；后台那一轮结束或出错在 `postpane.log` 记一行「Background Claude run for the HUD's answer in …」。只是暂时没签到、没写已停的照旧拒绝（桌面版进程可能还活着，不另起一个）。权限模式会问人的、找不到会话记录或目录、找不到 claude 命令行的不续接，提示在原句后补「驿窗想在后台续接它，也没成：<原因>。」。不动：卡片生成时「能不能在侧栏答」的判断和 #331 沉底折叠；接力 `reply_as` 与它自己的续接；智能体互发消息。
- 你要求的：
  - `platform/src/claude_plugin/replies.rs`：`ClaudeReplies` 加 `waking(Waker)`；`reply` 遇到 `NotLoaded` 且会话已停时交给宿主续接；「进程已停」文案提成 `stopped()`，续接和原提示共用。
  - `host/src/claude_wake.rs`（新）：续接命令组装与后台启动（`run`、`wake_arguments`），从 `handoff/back/desk_wake.rs` 移来，接力和侧栏回答共用。
  - `host/src/claude_plugin.rs`：侧栏用的 `replies()` 接上 `claude_wake::run`。
  - 测试 `an_answer_for_a_session_whose_process_stopped_runs_it_in_the_background`：从没签到、只是不签到都不续接；已停的续接、带会话号和原话、记投递；续接失败时提示带「已停」和失败原因；没接续接的照旧拒绝；回答给 Codex 照旧拒绝。
- 我顺手改的：
  - `ClaudeReplies` 整块从 `platform/src/claude_plugin/mod.rs` 拆进 `replies.rs`（mod.rs 763 → 611 行，`file-size-allowlist.json` 上限跟着收紧），原因是 mod.rs 已顶到上限；`tests.rs` 补一行引用。
  - `handoff/back/desk_wake.rs` 的 `wake` 改调 `claude_wake::run`，行为不变；`handoff/tests.rs` 的 `wake_arguments` 引用改到新位置。
  - `delivered` 改为只在成功时调用，不再自己判断结果（行为不变）。
  - `docs/DECIDED.md`：登记本轮常浩选的「甲：后台续接」。
- 测试：
  - 新测试先红：编译失败 `cannot find type Waker` / `no method named waking`，输出在 `evidence/2026-11-23-520-answer-wake/red.txt`；实现后插件模块 `14 passed; 0 failed`，宿主 `255 passed; 0 failed`。
  - `pnpm run check` 退出 0（`check.txt`）；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1134 passed / 0 failed（基线 1133 + 新增 1），前端 `ℹ pass 516` / `ℹ fail 0`（`test.txt`）；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`（`node-tests.txt`）。
- 验证：替身通过：续接由测试替身代替，没真的起 `claude`。接力那一路用的是同一段续接代码，只挪了位置。真实环境未验：装机后侧栏里两张可答的 Claude 卡对应会话都在线（10:26:38 签到），眼下没有「进程已停、卡还能答」的现成场景；不替常浩回答真实会话的提问。要等下一次桌面版回收某个会话后，常浩在侧栏回答它的卡，再核对 `postpane.log` 那一行和会话记录末尾的新一轮。
- 截图：无（提示文字之外界面不变）；装机脚本的冒烟截图在 `evidence/2026-11-23-520-answer-wake/smoke-*.png`。
- 发布与回读：`install.sh 520-answer-wake --takeover`（装前是已合并的 #517 分支包 `9e7bacbba8f4`，本分支从包含它的 `f2d0911` 拉出）：产物 `a252ca15d4b5` / 已装 `a252ca15d4b5`，签名证书 `b773068e`；冒烟：侧栏在动，装前装后 0.25% 像素不同、落在小人一带。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-23-520-answer-wake/PostPane-9e7bacbba8f4.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 只管「卡出来时会话还活着、之后才被回收」这一种（截图就是这种）。卡出来时会话已停，或驿窗重启过（「能答」的记忆在内存里），卡仍是「请到 Claude 里回答」、按 #331 沉底。要让这些也能后台续接，会碰到 #331 定下的沉底做法，要先单独发改动确认，没做。
  - 后台那一轮在 Claude 窗口里看不到实时过程，之后打开会话能接上（L-14 证据 `evidence/2026-11-07-headless-resume/`）。
- 本轮新坑：无。
- skill 进化：无。

## 跳回会话失败：提示改中文，失败原因记进日志（#517）（2026-11-23，Claude，常浩看排查后回「补上」；已提交，PR 见描述，已装机，冒烟因锁屏未截到侧栏）

- 时间：开工 `2026-11-23 00:06`（`date '+%F %H:%M'` 记录）。来由：常浩截图里提问卡点 ↗ 后出现英文红字「The native client could not open this session」，4 秒就消失；本机按同样方式调 `open` 6 次都成功，`postpane.log` 里什么都没有，失败原因查不出（#517）。
- 改变的行为：跳回会话失败时，侧栏那行字由英文改成随语言设置的「没能在对应的应用里打开这个会话，过几秒再试一次」；显示会话记录失败的那句中文环境下改为「没能显示这个会话的记录文件」。失败时 `postpane.log` 多一行「A session's link did not open: …」或「The transcript could not be shown: …」，写明没起来 / 超过 3 秒被结束 / 返回码 / 等不到子进程（Windows 记 ShellExecuteW 返回值）。跳回本身（3 秒时限、4 秒后可重试）不变。
- 你要求的：
  - `platform/src/os/mod.rs`：新 `could_not_open_session`、`could_not_reveal_transcript`，记日志并返回中英文提示，三个平台共用。
  - `platform/src/os/unix/mod.rs`：脚本调用拆出 `run()`，按失败类型返回 `Failure`；`spawn_script` 返回原因；`inspect` 对外报错原文不变；新 `open_url`、`reveal`；4 条单测（返回码、超时、成功、inspect 原文不变）。
  - `platform/src/os/windows/mod.rs`：打开失败记 ShellExecuteW 返回值，显示记录失败记启动错误，提示走共用函数。
- 我顺手改的：
  - `platform/src/os/macos/mod.rs`、`linux/mod.rs`：两家各写一遍的「调脚本、失败换提示」合进 `unix::open_url` / `unix::reveal`，macos/mod.rs 变短，`file-size-baseline.json` 收紧（337 → 333）。
  - 「Could not reveal transcript」同属没翻译的提示，一并改中文、记原因（行为变化已列在上面）。
  - `docs/LESSONS.md`：L-71。
- 测试：
  - 新测试先红后绿：红为编译失败 `cannot find function run`，绿 `4 passed; 0 failed`；输出在 `evidence/2026-11-23-517-open-reason/red.txt`。
  - 变基到 `2429481`（含 #508）后：`pnpm run check` 退出 0；`pnpm test`「全量测试汇总：6 套，失败 0 套」，Rust 合计 1133 passed / 0 failed，前端 `ℹ pass 516` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`。输出在同目录 `check3.txt`、`test3.txt`、`node3.txt`。
  - Windows 代码没在 Windows 上编译过（本机只编 macOS 目标）。
- 验证：替身通过：单测覆盖返回码、超时两种失败原因的写法。真实环境未验：要等一次真的跳回失败，才看得到中文提示和日志那一行；正常跳回不受影响。
- 截图：无（锁屏，装机脚本没截到侧栏）。
- 发布与回读：`install.sh 517-open-reason`：产物 `9e7bacbba8f4` / 已装 `9e7bacbba8f4`，签名证书 `b773068e`；冒烟没过，原因是屏幕锁着（`CGSSessionScreenIsLocked = True`），驿窗进程 58861 在跑、`postpane.log` 01:28:20 有启动行。装的包含 #508。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-23-517-open-reason/PostPane-566bda76888b.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 2026-11-22 那次失败的真正原因仍不知道；下次出现先 `grep "link did not open" postpane.log`。
  - 装后日志：「The ChatGPT extension connected as 0.2.6; this app was built with 0.2.7」：#508 升了插件版本，Chrome 里的 ChatGPT 插件要重新加载。
  - 截图里黄字那条（会话进程被 Claude 停了，答案送不进去）是正常提醒，没改。
- 本轮新坑：L-71。
- skill 进化：无。

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

## 接力：送达未确认之后驿窗自己去会话里找，不再卡死（#509，#507 的批 B1）（2026-11-22，Claude，常浩看改动确认 1 后经 agent-hud 插件回「两条都改」；已提交、PR #510、#508 合并后跟上 main、已送 L3 审查、未装机）

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
- 跟上 main 并送审（2026-11-23）：#508 已 squash 合并（`2429481`）。直接合 main 会因为 squash 认不出共同历史、冲突 11 个文件；main 的内容和 #508 分支最后的 `84d0ab7` 完全相同（树对象一致），所以先合 `84d0ab7`（只有本文件一处冲突：保留 #509 一节，#507 一节用新标题），再 `git merge -s ours origin/main` 记成已合入。和 main 的差异只剩 #510 自己的 24 个文件。三条全量：`check exit 0`；「全量测试汇总：6 套，失败 0 套」，Rust 合计 1134 passed / 0 failed，前端 `ℹ pass 516`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，Chrome 插件 `ℹ pass 176`（含真实 Chromium），注入脚本 `ℹ pass 11`，各 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 64` / `ℹ fail 0`（`evidence/2026-11-22-509-unsure-resolve/check-l3.log`、`test-l3.log`、`rules-l3.log`）。L3 送审说明 `brief-l3.md`（`brief-l3-c4f9e0f.md` 是合并前那版）。
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
