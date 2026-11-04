# 当前状态

更新：2026-11-04。阶段 0 至阶段 2 全部完成；阶段 4 静止侧栏为「撕角票」、审批横条与展开框为「票签」（PR #27）、额度面板为「收据」（PR #31）、悬停小卡为「小收据」（PR #33），所有屏幕默认动态形态（PR #29），批次见 [docs/ROADMAP.md](docs/ROADMAP.md)。唯一下一步：阶段 4 剩余的小人与图标，开工前先和常浩对齐想要的感觉，再出三版。

## 悬停小卡换成「小收据」外观（2026-11-04，Claude，常浩问截图里的黑框是什么并要求换样式，选甲「小收据」，看过实物后说「没问题，合并」；PR #33 测试全过已 squash 合并 `7c9482e`、已打包安装）

- 时间：开工 `2026-11-04 22:33`（估计，按会话进度；本节写于 `2026-11-04 22:49`）。来由：额度面板换纸后，鼠标停在撕角票上弹出的小卡（peek）仍是黑底；issue #32，预览 https://claude.ai/artifact/VMX6bcvKEj1wdijMu74Bse 。
- 改了哪些文件（PR #33）：`src/packages/hud/src/scene/AgentPeek.tsx`（纸上的小卡：名字下撕线、点线连到窄体数字）、`scene/useHUDLayout.ts`（动态形态的小卡也取纸面；高度为撕线多留 6；没有读数时为「--」一行留高度）、`scene/HUDExpandedSurface.tsx`（小卡读到纸面）、`paper.ts`（新 `paperLevel`：墨、琥珀、红、灰）、`test/paper-level.test.ts`（新）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 119` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`），在最终提交上跑。
- 验证：安装后鼠标悬停实机截图，深色 Claude、Hermes，用 HUD 草稿临时切浅色截 Claude、DeepSeek，截完丢弃草稿，回读设置为深色。第一次装后发现 Hermes（无读数）小卡「额度 --」一行被裁，修正后重装复看正常。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-04-receipt-peek/` 的 `小卡-浅色-Claude.jpg`、`小卡-深色-Claude.jpg`、`小卡-浅色-DeepSeek.jpg`、`小卡-深色-Hermes.jpg`。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（按 L-03：固定产物路径、不先删）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-receipt-peek/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：简约形态的小卡线条、刘海形态未改；没有读数时被裁一行是原有问题，这次顺手修了；可清理 worktree 增加 `.claude/worktrees/32-receipt-peek`。
- 本轮新坑：无。

## 额度面板换成「收据」外观（2026-11-04，Claude，常浩选甲「收据」、柱图选「墨色深浅」，看过浅深两色实物后说「没问题，合并」；PR #31 测试全过已 squash 合并 `62f5f1b`、已打包安装）

- 时间：开工 `2026-11-04 22:09`（会话创建时间；本节写于 `2026-11-04 22:31`）。来由：ROADMAP 阶段 4 剩余的额度面板，内容、顺序、按钮照旧只换外观；issue #30，预览 https://claude.ai/artifact/PKUh19WL1XSnf6Fy5AM59C 。
- 改了哪些文件（PR #31）：`src/packages/hud/src/panel/theme.ts`（新 `usePanelPalette`：纸上用墨色、琥珀、红；网纹进度框、打孔、撕线、柱图墨色深浅的样式）、`HoverPanel.tsx` 与 `panel/*.tsx`（取色统一走 `usePanelPalette`；撕线、网纹进度框、打孔状态点、窄体数字、墨色柱图）、`HUDScene.tsx`（额度面板在动态与简约形态下也取纸面，测量时同样包纸）、`scene/useHUDLayout.ts`（新 `receipt`；从侧栏长出的面板在侧栏一侧多留 16）、`scene/receipt-sheet.ts`（新：纸铺在哪，与撕角票隔开 10）、`scene/HUDExpandedSurface.tsx`（纸按位置铺、纸上不画异形底）、`test/receipt-sheet.test.ts`（新，3 项）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 118` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`），都在最终提交上复跑。
- 验证：安装后实机截图——设置「按家分开」时点撕角票钉住的单家面板（深色）；用 HUD 草稿临时切浅色/深色并关掉分家，鼠标悬停撕角票截全量面板浅深两色，截完已丢弃草稿，设置回读为深色、按家分开。简约形态和贴上/下/左边缘只有单元测试覆盖，未实机看。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-04-receipt-quota/` 的 `额度面板-浅色.jpg`、`额度面板-深色.jpg`、`单家面板-深色.jpg`（含会话标题和邮箱，不进仓库）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启，实机看到纸面。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-receipt-quota/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 页脚按钮照旧只有图标，没加预览里的「设置 / 统计」文字；面板在侧栏一侧宽了 16，内容宽度不变。
  - 悬停撕角票时的小卡（peek）、设置里的面板预览、刘海形态都没改；设置里的「透明度」对纸面不起作用（与票签一致）。
  - `get_hud_screenshot` 只画裸面板，看不到纸面；要看实物得在屏幕上悬停截图。
  - 安装时脚本读错打包路径，旧版先被删、新版没复制上，随即补装成功，见 L-03。
  - 可清理 worktree 增加 `.claude/worktrees/30-receipt-quota`。
- 本轮新坑：L-03。

## 所有屏幕默认动态形态（2026-11-04，Claude，常浩说「把出厂规则也改掉，默认动态」；PR #29 测试全过已 squash 合并 `3ef2f98`、已打包安装）

- 时间：开工 `2026-11-04 21:46`（估计，按会话进度；本节写于 `2026-11-04 21:59`）。来由：常浩要笔记本内屏默认就是侧边动态形态，并要求出厂规则也改，不再「有刘海默认刘海」。issue #28。
- 改了哪些文件（PR #29）：`src/packages/protocol/hud-defaults.json` 与 `src/packages/app/src/lib/use-hud-config.ts`（默认 `mode` 为 `logos`）、`src/crates/host/src/hud/plans.rs` 与 `coordinator.rs`（默认动态，去掉只为此传的 `has_notch`，`primary()` 只返回 id）、`src/crates/hud/src/presentation/style_rules.rs` 与 `tools.rs`（默认外观、恢复默认、形态兜底改动态，去掉随之不用的参数）、`src/packages/app/src/settings/display/ResetSection.tsx`（设置里恢复默认外观为动态）、`tool_tests.rs`（新增 `every_screen_defaults_to_dynamic`，四个专测刘海行为的用例改为先存成刘海）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 638 passed / 0 failed、`ℹ pass 115` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`）；改 ResetSection 后重跑 check 与 `test:ts` 通过。
- 验证：安装后核对设置文件里内屏 `37D8832A-…` 仍为 `logos`。新屏或重置后默认动态这一点只有测试覆盖，未实机重置验证。
- 截图：无界面改动。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-default-logos/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：`docs/upstream` 的上游说明仍写「有刘海默认刘海」，未改；可清理 worktree 增加 `.claude/worktrees/28-default-logos`。
- 本轮新坑：无。

## 阶段 4：审批横条与展开框换成票签；额度面板改动撤回（2026-11-04，Claude，常浩选审批横条「一 票签」，要求结构照旧、按钮用常规文字；实物看过后说「没问题，合并」；额度面板未经确认，常浩要求撤回；PR #27 已合并 `f8e4d0f`、PR #26 撤回 #24、已打包安装）

- 时间：开工 `2026-11-04 20:50`（悬停面板对齐起算；本节写于 `2026-11-04 21:42`）。来由：ROADMAP 阶段 4 剩余的悬停部分。
- 过程与误会（重要）：「悬停面板」在常浩那里指的是**审批横条鼠标移上去展开的审批框**，不是侧栏小票弹出的额度面板。我按额度面板出了三版（https://claude.ai/artifact/C4TZ6aZwzCQJkkB45swhQs ），常浩选「甲 整张票据」并同意分 3 批，我据此合并了 #24（额度面板票据外观）、开了会话区 #25；常浩随后指出额度面板还没让他确认过，要撤回、以后重新设计。已用 PR #26 还原 #24（代码与 `35fdb67` 一致），#22、#25 关闭为不做，装回改之前的应用。审批的两种去处分镜 https://claude.ai/artifact/VA2na2qCUPGqqXTN1wZY9z 被否（常浩要保留窄横条 + 悬停展开的现有结构）。最终选型页 https://claude.ai/artifact/QyWVEHs5q83asx7MPjfcdP 「一 票签」。
- 改了哪些文件（PR #27）：`src/packages/hud/src/paper.ts`（新：纸色、纸纹、齿孔）、`alerts/CompactAlertView.tsx`（纸签横条、批/答小方章、「待确认计划」）、`scene/HUDExpandedSurface.tsx` 与 `HUDScene.tsx`（动态/简约模式下审批卡外壳换纸面）、`permissions/ApprovalContent.tsx`、`PermissionToolCard.tsx`、`PermissionQuestionCard.tsx`、`PermissionPlanCard.tsx`、`alerts/PendingEventRows.tsx`（圆戳、撕线、印刷行、按钮配色；文字全部不变）、`model.ts` + `ticket-stub.ts` + `scene/HUDMarkStrip.tsx`（撕角票章区分「批」「答」）、`test/ticket-stub.test.ts`。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 637 passed / 0 failed、`ℹ pass 115` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`）；`node scripts/check-rules.mjs` 通过。撤回 PR #26 同样跑过 check 与 test（`ℹ pass 114` / `ℹ fail 0`、Rust 637）。
- 验证：装好后用一次真实提问（AskUserQuestion）触发「答 待回答」横条与展开框，常浩看实物回复「没问题，合并」。权限请求类展开框没有实物触发，只在子代理的本地预览页看过浅/深两色。
- 截图：无存档（实物由常浩直接看）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-approval-tag/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 合并 #24、开工 #25 超出了常浩的本意（见上），已撤回；以后涉及「哪个面板」先用截图对齐指的是哪一个。
  - 刘海模式的审批横条与展开框未改（刘海里须黑色）。设置里的「透明度」对纸面不起作用。
  - 笔记本内屏定为动态形态、贴右边缘（常浩 2026-11-04 确认这是他要的默认；要换形态在设置「显示」里切）。原刘海设置的备份仍在 `evidence/2026-11-04-ticket-stubs/presentation-before-builtin-logos.json`。
  - 驿窗 HUD 工具（MCP）重启应用后要在设置里重开「Let agents arrange the HUD」才能截图。
  - 可清理的 worktree：`.claude/worktrees/18-ticket-stubs`、`20-tear-stub`、`22-receipt-panel`、`23-approval-tag`。
- 本轮新坑：无。

## 阶段 4：动态模式票根瘦身为撕角票（2026-11-04，Claude，常浩看实物后说票偏宽、家数多了放不下，并在三版里选「乙 撕角票」；PR #21 测试全过已 squash 合并 `8b6bf3e`、已打包安装并截图回读）

- 时间：开工 `2026-11-04 20:37`（`date` 记录；本节写于 `2026-11-04 20:44`）。来由：常浩看贴纸票根实物，觉得每张偏宽，往后 agent 多了一屏放不下；喜欢最早的票根样子，要求读数和票面和谐融合。issue #20。
- 设计过程：预览 https://claude.ai/artifact/3E6e9BKwEzFGzfSJPSesnM （甲 边码票 32×44 竖印读数 / 乙 撕角票 34×50 撕线下横印 / 丙 连票卷 30×42 墨条反白 / 现版对照，附整屏容量比较），常浩选乙。上一轮预览 X8wnGDprGnyhjSAYJ2BumP 保留未动。
- 改了哪些文件（PR #21）：`src/packages/hud/src/ticket-stub.ts`（票 1.7×2.5 个标志、小人上移到 0.35、新增撕角高度 0.7）、`src/packages/hud/src/scene/HUDMarkStrip.tsx`（读数印在撕线下一截，字 9.5；「批」章 12；打孔 5.5 固定在票头）、`src/crates/host/src/hud/plans.rs`（`strip_width` 同步为 1.7 与测试）、`src/packages/hud/test/ticket-stub.test.ts`（新尺寸、小人与撕角不重叠）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 637 passed / 0 failed、前端 `ℹ pass 114` / `ℹ fail 0`、MCP `ℹ pass 14`、插件 `ℹ pass 6`）。在 worktree `.claude/worktrees/20-tear-stub` 跑。
- 验证：常浩没有外接屏，笔记本内屏临时改成右边缘动态模式（把外接屏那份设置复制给内屏 `37D8832A-…`，原设置备份 `~/Library/Application Support/postpane/evidence/2026-11-04-ticket-stubs/presentation-before-builtin-logos.json`）。装好后截屏核对：四张撕角票、撕线、读数 32% / 3% / ≈$0.16 / ¥811.01、Claude 在跑有打孔；「批」章与红字本次未遇到，未实物核对。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-04-tear-stub/laptop-right-edge-2043.png`。
- 发布与回读：打包 `PostPane.app` 已 ditto 到 `/Applications` 并重启，截图回读如上。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-tear-stub/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 笔记本内屏仍是临时的右边缘动态模式，常浩说改回再改（备份见上）。
  - 「¥811.01」刚好放满 34 宽，余额再长一位会被截断，到时再定缩字还是去小数。
  - Claude 道具动起来会短暂扫过读数（各版都有，预览已标出）。
  - 上一轮遗留照旧：「标志离边距离」在动态模式下无作用；HUD 工具（MCP）重启后需在设置里重开。
  - 合并后的 worktree `.claude/worktrees/18-ticket-stubs`、`.claude/worktrees/20-tear-stub` 可清理。
- 本轮新坑：无。

## 阶段 4：动态模式静止侧栏改为贴纸票根（2026-11-04，Claude，常浩选定方向「票根」→ 变体乙 → 小人适配「乙 贴纸票」，并说「按计划开工」；PR #19 测试全过已 squash 合并 `1808d76`、已打包安装）

- 时间：开工 `2026-11-04 17:41`（`date` 记录；本节写于 `2026-11-04 20:10`）。来由：ROADMAP 阶段 4「UI 方向与小人形象」。
- 设计过程（预览都在同一链接 https://claude.ai/artifact/X8wnGDprGnyhjSAYJ2BumP ，现为第 4 版「小人适配三做法」）：
  - 侧栏+面板五版（玻璃/刻度/白瓷/时刻表/驿卫）→ 常浩认为偏离，改为只看静止侧栏。
  - 侧栏外框五式第一轮（同一套处理逻辑）被否；第二轮五种视觉语言（长虹玻璃/抖动/雾玻叠片/精工器物/驿站票根），常浩选票根。
  - 票根三变体（整张票/分票/素票），选「分票」；发现会裁切小人动效，再出三种适配（底座票/贴纸票/侧挂签），选「贴纸票」。
  - 常浩要求：多样式一律做进同一 HTML 可切换、只发一个链接——已写进 `~/.claude/CLAUDE.md` 第 9 节与 `~/.codex/AGENTS.md`；Vault P-08 未改（只读）。
- 改了哪些文件（PR #19）：`src/packages/hud/src/ticket-stub.ts`（新：票尺寸 42×62 随 logoSize、打孔/印章/红字判定）、`src/packages/hud/test/ticket-stub.test.ts`（新）、`src/packages/hud/src/scene/HUDMarkStrip.tsx`（logos 模式画纸票：纸面独立一层带齿孔与纸纹、小人不裁切且按浅色底绘制、票底读数、打孔、「批」字章；删 logos 绿色光边）、`src/packages/hud/src/HUDScene.tsx`（删 glowColors 与相关 props）、`src/packages/hud/src/geometry.ts`（logos 尺寸改票）、`src/crates/host/src/hud/plans.rs`（`strip_width` 同步与测试）。issue #18。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 637 通过、`ℹ pass 113` / `ℹ fail 0`、MCP `ℹ pass 14`、插件 `ℹ pass 6`）；最后一处改动（读数层级、小人浅色底、去下划线）后重跑 `pnpm --filter @agent-hud/hud run typecheck` 通过、`pnpm run test:ts` `ℹ pass 113` / `ℹ fail 0`，未再跑全套 Rust（该改动不涉 Rust）。
- 验证：本地临时检查页直接渲染 `HUDMarkStrip`（平静/在跑/等批准/告急 92%，logoSize 20 与 30）截图核对，读数、打孔、印章、红字正确，Claude 在跑时道具完整；检查页已删、未提交。外接屏未连接，笔记本屏是刘海模式，真实右边缘实物未看到；常浩拒绝了屏幕操控授权，未打开设置页预览。
- 截图：本会话临时目录，未存档。
- 发布与回读：打包 `PostPane.app` 已 ditto 到 `/Applications` 并重启（进程在）。回滚：旧版在 `~/Library/Application Support/postpane/evidence/2026-11-04-ticket-stubs/PostPane-before.app`，退出后 ditto 回去。
- 与授权不一致之处、遗留问题、范围外发现：
  - 设置里「标志离边距离」在 logos 模式下已不起作用（票总贴边），设置项未改。
  - 驿窗 HUD 工具（MCP）重启应用后连不上（提示打开「Let agents arrange the HUD」），未处理。
  - 悬停面板未做；票根在左/上/下边的实物未看。
- 本轮新坑：无。

## 审批卡拒绝路径实测（2026-11-04，Claude，常浩给了全屏操控、后来说重新测；纯文档提交 main、无需发布）

- 时间：开工 `2026-11-04 17:30`（取上一节写完的时刻；本节写于 `2026-11-04 17:39`，`date` 记录）。来由：上一节拒绝路径没测成。
- 改了哪些文件：仓库只改本文件。
- 测试：未跑测试（本批不改代码）。
- 验证：
  - 第 3 次重测（`approval-deny-3.txt`）：终端显示 `Error: Permission denied by hook` / `Denied by PermissionRequest hook`，Claude 回 `denied`；证据文件不存在。拒绝应是常浩在侧栏点的，我没碰侧栏，未向他核实。
  - 此前第 2 次（全屏操控下）在我只截图、把鼠标移到侧栏、没点击时就被批准（`approval-deny-2.txt` 内容 `Wed Nov  4 17:31:34 CST 2026`）。
  - 查代码（只读代理）：驿窗发出批准只有一条路——卡片上「批准一次」的真实点击（`src/packages/hud/src/permissions/PermissionToolCard.tsx` 的 `answer({ kind: "allow" })`）；超时、面板收起、卡片消失都不回决定（交还 Claude 自己的提示）；无快捷键、默认焦点、自动规则、复用旧决定；HUD 工具、插件、演示不发批准。常浩不记得之前点没点过，自动放行原因未定。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 若再出现没点就被批准，下一步在 `core/src/lib.rs` 的 `answer_request` 记决定与时间、在卡片点击处记 `event.isTrusted` 与坐标后复测。
  - 提问卡、Codex 审批仍未实测。
  - 测试会话里有个「整理新会话」的 UserPromptSubmit 钩子在跑（全局钩子，不属驿窗）。
- 本轮新坑：无。

## 清基线小尾巴（2026-11-04，Claude，常浩选「先清小尾巴」；PR #17 测试全过已 squash 合并、无需发布）

- 时间：开工 `2026-11-04 17:20`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 17:30`）。来由：阶段 0 基线与各批交接里留下的不阻塞项。
- 改了哪些文件：`src/crates/host/src/lib.rs`（两处 `Service::start` 调用按 rustfmt 合成一行，PR #17）；本文件。本机：`rustup component add rustfmt clippy`；旧残留 `~/Library/WebKit/app.agenthud.mac`、`~/Library/Caches/app.agenthud`、`~/Library/Caches/app.agenthud.mac` 经访达移到废纸篓。
- 测试：`cargo fmt --all --check` 首跑报 `host/src/lib.rs` 2 处差异，修后 `pnpm run format:check` 通过（`All matched files use Prettier code style!`）；`cargo clippy --workspace --tests --locked -- -D warnings` 退出码 0、0 条警告；`cargo test --workspace` 637 项通过、0 失败。
- 验证：局域网遗留依赖核对——工作区 `[workspace.dependencies]` 每一项都有模块引用；`qrcode` 已不在锁文件，`rustls`、`ring`、`flate2`、`security-framework`、`uuid` 仍在锁文件但属其他依赖的传递依赖，无可清理项。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 拒绝路径没测成：用屏幕操控点「拒绝」时侧栏卡片已收起，后台点击落空；请求随后被批准（终端 `Allowed by PermissionRequest hook`），证据文件 `evidence/approval-deny.txt` 内容 `Wed Nov  4 17:21:31 CST 2026`。驿窗设置里没有自动批准开关（只有 `approvalWaitMinutes 10`），推断是常浩在侧栏点的批准，未核实。
  - 提问卡、Codex 审批仍未实测；上游对照表 494 条 open 只作参考，不处理。
- 本轮新坑：无。

## 审批卡真实往返验证（2026-11-04，Claude，常浩让继续并同意用屏幕操控点审批卡；纯文档提交 main、无需发布）

- 时间：开工 `2026-11-04 17:13`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 17:16`）。来由：阶段 0 遗留验收项“审批卡往返一次成功”。
- 改了哪些文件：仓库只改本文件。本机：新增证据文件 `~/Library/Application Support/postpane/evidence/approval-roundtrip.txt`。
- 测试：未跑测试（本批不改代码）。
- 验证：
  - 在应用内终端运行 `/usr/local/bin/claude --no-chrome --permission-mode default`，让它执行一条 `date > …/evidence/approval-roundtrip.txt`。（第一次没加 `--no-chrome`，卡在 Chrome 浏览器工具的首次提示，已关掉重来。）
  - 终端弹出权限提示的同时，驿窗侧栏出现「待审批」卡：来源 postpane、BASH、说明与完整命令都对，带「拒绝」「批准一次」。
  - 卡上批准后，终端显示 `Allowed by PermissionRequest hook`，回复 `done`；证据文件内容 `Wed Nov  4 17:16:43 CST 2026`。
  - 谁点的批准：我用屏幕操控点「批准一次」时被拒（侧栏面板已收起，返回 Nothing was done），但请求随即经钩子放行，应是常浩在侧栏点的，未向他核实。
- 截图：无存档。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 驿窗侧栏在悬停收起后，屏幕操控在后台点不到卡片按钮；以后要代点需先让面板展开或申请全屏操控。
  - 只验证了“批准一次”这一条路径，拒绝、提问卡、Codex 审批未验证。
- 本轮新坑：无。

## 阶段 2-4 收尾：HUD 工具指向驿窗、核对插件与图标、旧应用移到废纸篓（2026-11-04，Claude，常浩同意按推荐计划做、同意把旧应用移到废纸篓；纯文档提交 main、无需发布）

- 时间：开工 `2026-11-04 17:05`（`date '+%F %H:%M'` 记录；本节写于 `2026-11-04 17:09`）。来由：2-4 剩余几项。
- 改了哪些文件：仓库只改本文件。本机：`~/.claude.json`、`~/.codex/config.toml` 的 `agent-hud` 服务用 `claude mcp remove/add --scope user` 与 `codex mcp remove/add` 重新添加（与设置页「移除再添加」走同一组命令，见 `src/crates/host/src/mcp_clients.rs` `args()`；没动技能文件）；`/Applications/Agent HUD.app` 经访达移到废纸篓。
- 测试：未跑测试（本批不改代码）。核对：两份配置里命令都是 `/Applications/PostPane.app/Contents/MacOS/PostPane`、参数 `--mcp`，`grep -c 'Agent HUD.app'` 两份都是 `0`；`claude mcp get agent-hud` 显示 `Status: ✔ Connected`；`codex mcp get agent-hud` 显示 `enabled: true`。
- 验证：
  - 插件：`claude plugin list` 显示 `agent-hud@agent-hud` 1.1.0、`Read from: …/app.postpane.mac/claude-plugin`、`Status: ✔ enabled`；插件钩子文件不含旧路径。
  - 图标：截屏放大程序坞，显示驿灯；安装包 `icon.icns` 与仓库同一份（shasum 一致）。访达未单独截图（`qlmanage -t` 卡住已停）。
  - 侧栏显示设置：新旧网页存储里都只有 `agenthud.selected-screen` 一项，值相同；其余显示设置不在网页存储，未受换标识影响。
  - 旧应用：访达返回已移入 `.Trash`，`/Applications/Agent HUD.app` 已不存在。
- 截图：无存档（截屏含其他私人窗口，已删）。
- 发布与回读：无需发布。回滚：配置备份在 `~/Library/Application Support/postpane/evidence/2026-11-04-switch/mcp-before/`；旧应用可从废纸篓放回。
- 与授权不一致之处、遗留问题、范围外发现：
  - `codex mcp add` 会重写整个 `config.toml`，顺带改了 `node_repl` 一段的写法：去掉空的 `args = []`、`120` 写成 `120.0`、环境变量换序，语义不变。
  - 移走旧应用时还有 5 组旧 `agent-hud-mcp`/`agent-hud-engine` 进程挂在早先开的会话上，会话结束后自行退出；新开的会话才连驿窗。
  - 旧残留目录 `~/Library/WebKit/app.agenthud.mac`、`~/Library/Caches/app.agenthud`、`app.agenthud.mac` 未处理。
  - 审批卡真实往返仍未验证。
- 本轮新坑：无。

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
