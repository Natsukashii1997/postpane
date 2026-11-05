# 当前状态

更新：2026-11-05。阶段 0 至阶段 2 全部完成；阶段 4 静止侧栏为「撕角票」、审批横条与展开框为「票签」（PR #27）、额度面板为「收据」（PR #31）、悬停小卡为「小收据」（PR #33）、新回复等通知为「回执」（PR #35），所有屏幕默认动态形态（PR #29），菜单栏图标本机关掉；侧栏 Codex 小人改为常驻并补齐「花瓣身体语言」动作（PR #43），第二版打盹加强、各动作更明显（PR #47），Hermes 改为头像常驻加 9 个带颜色的细微动作（PR #45），其他小人之后各做一版；侧栏面板内容逐个梳理，面板清单见 https://claude.ai/artifact/P2u7uDGFzNy4ivv5QhDsKc ，第一个待审批卡已改成「清单卡」（PR #49），侧栏静止条不再显示金额、无额度智能体改显示 24 小时 Token（PR #51），悬停面板改成额度看板（PR #53），新回复通知卡改成「清单回执」（PR #55），额度预警卡改成「细条」（PR #62），重置到账、登出提醒与面板事件行并入细条、待审批小签显示会话标题、侧栏各处不显示面板设置里隐藏的额度行（PR #65），面板清单 17 项至此全部定完（02 悬停小卡、04 合并面板不改），「正在进行」加入 Claude 云端会话、超过 5 条可滚动（PR #63），Claude 额度看板加「云端额度」、每周 Fable 用看板设置隐藏（PR #58）；后台页面换「热敏小票」分 4 批，第 1 批设置窗口外框（PR #37）、第 2 批设置四页正文与网纹框滑块（PR #39）、第 3 批统计窗口外壳与用量页（PR #41）已合并，批次见 [docs/ROADMAP.md](docs/ROADMAP.md)。设置页页头与正文对齐、「显示」页 HUD 预览改成壁纸入框与四联票、形态去掉「简约」、「正在进行」滚动条停下淡出（PR #67）。设置页整体优化：外框统一收据、内容分组框加控件右齐、面板真实预览，设置里「HUD」改叫「侧栏」（PR #73）。唯一下一步：后台第 4 批「统计会话」（外观已定，待实现）；其他小人各做一版仍待做。

## 随手记嵌入侧栏：挂件入口 + 原页面小窗（2026-11-05，Claude，常浩要求把自建应用的侧边浮窗接进驿窗、先试数码世界随手记，「保持原样只做嵌入」，区分样式选「丙 · 挂件」，看过安装后说「合并」；PR #75 测试全过已 squash 合并 `7aaafbd`，已从 main 内容重新打包安装、回读一致）

- 时间：开工 `2026-11-05 17:00`（估计，按「先只做随手记」那条消息；本节写于 `2026-11-05 17:45`）。来由：常浩要把自建应用的侧边浮窗收进驿窗侧栏，先接随手记；issue #70。三版预览 https://claude.ai/artifact/R3uKEDZa6Ahd7LPoWRG2tE （选丙）；更早一版「纸面重画」的预览 https://claude.ai/artifact/7As4PMe4MWB1m3dmC9T3pA 已被否（改为原样嵌入）。
- 改了哪些文件（PR #75）：`src/crates/host/src/float_notes.rs`（新：`toggle_float_notes` 命令，建 `float-notes` 无边框透明置顶小窗加载 `127.0.0.1:5178/?floatingNotes=1#/float`，368×600 开在球旁朝屏幕内侧；`on_navigation` 只放行这一页，`on_new_window` 把「在数码世界打开」交给默认浏览器；端口不在线显示「数码世界还没有启动」+ 重试；不进任何 capability）、`host/src/lib.rs`（注册命令）、`host/src/shell/{mod,macos,linux,windows}.rs`（`open_in_browser`）、`src/packages/hud/src/app-pendant.ts`（新：挂件位置，侧边挂票根下、放不下挂上方，顶/底边跟在右侧）、`hud/src/scene/AppPendant.tsx`（新：虚线挂绳 + 纸色垫圈里的原球 + 「随手记」吊牌）、`hud/src/HUDScene.tsx`（动态形态渲染挂件，新 prop `onFloatNotes`）、`app/src/HUDSurface.tsx`（invoke 命令；点击区域与轮廓观察加 `.hud-app-pendant`）、`hud/src/assets/float-notes-ball.png`（原样复制自 digiworld）与素材 README、`docs/ROADMAP.md`（自建应用接入改为已启动，本节一并提交）。
- 测试：变基到 `58f6816` 后的分支 `e50008b`（与 main `7aaafbd` 内容相同，`git diff` 为空）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 653 passed / 0 failed；`ℹ pass 189` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node scripts/check-rules.mjs` 通过。新增 Rust `float_notes` 6 项、`hud/test/app-pendant.test.ts` 5 项。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-float-notes/`。
- 验证：我申请操作驿窗窗口被常浩拒绝，点球开合、位置、样子由常浩自己看过（「看过了，合并」）；小窗拿不到 IPC、数码世界停服时的提示，均未实机验证，只有单测覆盖放行规则。注意：我 17:31:58 装的分支版 17:36:58 被另一会话的 #73 安装覆盖（L-05 又一次），常浩看的可能是两者之一，以合并后重装版为准。
- 截图：无（未获窗口操作授权）。
- 发布与回读：合并后从与 main `7aaafbd` 内容相同的分支打包，17:42:54 ditto 到 `/Applications` 并重启；`shasum` 回读 `/Applications/PostPane.app/Contents/MacOS/PostPane` 为打包产物的 `50852e05ca07`（含 #73 与 #75）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-float-notes/PostPane-before.app /Applications/PostPane.app`（这是 17:31 前的版本，不含 #73）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 网页右上角「−」嵌入后只会把页面折起（拿不到原生桥），收窗口要点球；未写完的草稿存在驿窗网页存储，不与原随手记程序的恢复区共用。
  - 原随手记程序 `~/Applications/随手记.app` 仍在运行并开机自启，屏幕上有两颗球；停不停用等常浩定。
  - 刘海形态不显示挂件。
  - 同日还做了：一键转交方案（#71，选「乙 · 转交单」，未开工）、Codex/Orca 往返实测（#72 评论里有结论与命令）。实测留下两个 Codex 测试会话（`01a1aae3…`、`01a1aaec…`）和 Orca 里注册的测试仓库 `codex-sandbox`，是否移除待常浩定。
  - 可清理 worktree：`.claude/worktrees/70-float-notes` 本节提交后即删。
- 本轮新坑：无（L-05 重现，未新增）。

## 设置页整体优化：统一收据外框、分组框加控件右齐、面板真实预览，HUD 改叫侧栏（2026-11-05，Claude，常浩说设置页「不太好看，也不协调」，外框选「甲 · 统一收据」，内容要「一的效果 二的规范框架」、对齐选「甲 · 控件右齐」，HUD 改叫「侧栏」、只删「显示」页页头说明，看过安装后的应用说「合并」；PR #73 测试全过已 squash 合并 `b5d650b`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 15:52`（按常浩提出整体优化那条消息；issue #69 建于 16:25；本节写于 `2026-11-05 17:09`）。来由：面板清单审完后对设置窗口做最后一轮整体优化。定稿页：外框 https://claude.ai/artifact/Dwtz24xPLQYtW1bqLvL6ac （甲），内容三版 https://claude.ai/artifact/MsikAFgUQnEPc6rwBaY3Wq ，合并版 https://claude.ai/artifact/LjbTbmyTt8VyTYSXP14K4P （甲 · 控件右齐）。
- 改了哪些文件（PR #73，实现由子 agent 完成，我核对提交、截图与实机；27 个文件）：`src/packages/app/src/App.tsx`（页头与正文同一张纸一起滚动、换页回顶、页码写 `data-page`、删「显示」页中文说明）、`settings/receipt.css`、`settings/settings.css`（纸面统一 620 宽、导航票加长对齐、去条形码改页码行、分组框、24 高墨框控件、值在把手上方的滑块、一行红字提示，均限定 `.apple-app`）、`settings/SettingsPrimitives.tsx`（`Slide`）、`settings/display/*` 与 `DisplayPane.tsx`（四组加「恢复默认」一行；「按 Option 才展开」改「展开方式」单选，存值不变；「Bot 形象」移进第一组）、`settings/SettingsSamples.tsx`（删 `PartSample`，新增 `PanelPreview` 用 `SourceHoverPanel` 渲染真实面板并缩小）、`settings/GeneralPane.tsx`（三组，语言与额度百分比改单选）、`settings/agents/*`（顶部智能体卡片；额度行复用面板的 `quotaWindowLabel`、`resetText`、`quotaOutlook`）、`settings/agent-plugins/*`、`AgentPluginsPane.tsx`、`lib/agent-plugins.ts`（客户端表格，「HUD 工具」→「侧栏工具」）、`test/agent-plugins.test.ts`（期望文字同步）、`src/packages/hud/package.json`（新增三个导出，侧栏与面板代码未改）。
- 测试：在分支提交 `e0e3b23`（与 main `b5d650b` 内容相同，`git diff` 为空）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 各组 test result 全部 ok、0 failed；`ℹ pass 184` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-settings-content/check.log`、`test.log`（子 agent 跑，我核对过结果行）。
- 验证：子 agent 在 worktree 用独立数据目录起开发页，中文界面、960×720 看了四页、刘海与动态两种形态、关掉额度看板后面板预览随之变化、统计窗口对照；我看过显示页截图。装机后用 computer-use 后台截图设置「显示」页，新版式在；后台截图时预览小人停在厂商图标，查明是 `BotMark` 画出第一帧前先显示图标、窗口被挡住时不重绘（原有行为，侧栏小人正常）。智能体、插件页在实机只看了开发页截图。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-settings-content/settings-*.png`、`statistics-unchanged.png`（开发页截图；智能体页截图露出真实账户邮箱，只在本机）。
- 发布与回读：分支版 17:00:15 ditto 到 `/Applications` 并重启；合并后 `shasum` 回读 `/Applications/PostPane.app/Contents/MacOS/PostPane` 为打包产物的 `1261935ffdf2`，未被覆盖（L-05）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-settings-content/PostPane-before.app /Applications/PostPane.app`（#67 版）。按 AGENTS.md 已对 `69-settings-content` 跑 `cargo clean`（约 7 GB）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 子 agent 自定、常浩合并时未逐条表态：面板三块改叫「额度看板 / Token 消耗 / 正在进行」；几处说明换成模型写法；语言、额度百分比、展开方式由开关或下拉改单选（存值不变）；「Bot 形象」放进「侧栏长什么样」组，但它对所有屏幕生效；插件页客户端表格行不计入「共 M 项」；重置按钮去掉了各自的说明文字。
  - ⋯ 菜单「隐藏 HUD / 显示 HUD」与统计窗口共用，没改，是设置窗口唯一剩下的中文「HUD」。
  - Rust `vendors.rs` 算侧栏宽度仍算隐藏行和云端额度；额度看板里 Codex 仍写「OpenAI」，未改（见前几节）。
  - 可清理 worktree 增加 `.claude/worktrees/69-settings-content`，清理前问常浩。
- 本轮新坑：无。

## 设置页页头对齐、HUD 预览壁纸入框与四联票、形态去简约；正在进行滚动条淡出（2026-11-05，Claude，常浩提出 #66、#68，HUD 预览选「丙 · 壁纸入框」、DeepSeek「只加在预览」、连票选「乙 · 四联票」，看过安装后的设置页说「所有面板、所有呈现都审核过，都满足要求」；按「测试全过可直接合并」的授权合并 PR #67 `5bdcf39`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 15:08`（按 issue #66 创建时间 07:08:56Z；本节写于 `2026-11-05 15:52`）。来由：常浩看设置页时发现页头与正文没对齐、「正在进行」滚动条常显，HUD 预览壁纸太跳、预览和实际样子不一致；issue #66、#68。定稿页：壁纸入框 https://claude.ai/artifact/TWhvAhAqHcrnYuYyMLfJgS （丙），连票 https://claude.ai/artifact/KzJtyXG3xvepAjcitA6AuR （乙）。
- 改了哪些文件（PR #67）：`src/packages/app/src/settings/receipt.css`（正文滚动区 `scrollbar-gutter: stable both-edges`；预览墨色虚线框、「预览」标签、壁纸单独降饱和、底部说明行）、`settings/display/HUDSection.tsx`（形态去掉「简约」，给预览传框上文字）、`settings/SettingsSamples.tsx`（预览用侧栏同款常驻小人、居中、预览固定多显示 DeepSeek；动态画一整张四联票：每格一张小票宽，格间竖撕线，顶边底边撕孔，不再画底部数据，票宽票高在预览里单独算；只有刘海带光晕）、`src/packages/hud/src/scene/HUDMarkStrip.tsx`（抽出 `StubPaper`、`StubFace`、`stubBoxStyle` 共用，`StubPaper` 加可选 `bothEdges`）、`hud/package.json`（新增导出 `./bots/artwork`、`./bots/bot-spec`、`./scene/HUDMarkStrip`、`./ticket-stub`）、`hud/src/panel/SessionsSection.tsx` 与 `app/src/styles.css`（「正在进行」隐藏系统滚动条，自画细滑块，滚动时出现、停下约 1 秒淡出）。
- 测试：在分支提交 `1f4da12`（与 main `5bdcf39` 内容相同）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 647 passed / 0 failed；`ℹ pass 184` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node scripts/check-rules.mjs` 通过。首轮 check 因删底部数据时漏删几行报语法错，补删后重跑全过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-scroll-align/check-joined.log`、`test-joined.log`、`build-joined.log`。
- 验证：装机后用 computer-use 后台截图设置「显示」页，预览为四联票、无底部数据，常浩自己的截图一致。三版连票预览页用 esbuild 打包真实 `BotMark`，本机起服务看过四个标签；发布后的链接因内置浏览器未登录 claude.ai 没打开验证。未验证：「正在进行」超过 5 条时的淡出滑块（沿用前一节的实现说明，本轮没在实机凑够 5 条）。
- 截图：无单独存档（computer-use 截图只在本会话里看过）。
- 发布与回读：分支版 15:41:50 ditto 到 `/Applications` 并重启；合并后 `shasum` 回读 `/Applications/PostPane.app/Contents/MacOS/PostPane` 为打包产物的 `4e449f5fdbd4`，未被覆盖（L-05）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-scroll-align/PostPane-655ddcd.app /Applications/PostPane.app`（单张小票版）；改版前在同目录 `PostPane-before.app`（#65 版）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 主目录 main 上有一条别的会话 15:34 留下、未推送的本地提交（AGENTS.md 加「PR 合并后清 worktree 的 target」规则），合并后与远端分叉；我用 `git pull --rebase` 把它接到 `5bdcf39` 之后（内容未改），随本节一起推送。照这条规则已对 `66-scroll-align` 跑 `cargo clean`（释放约 6 GB）。
  - 预览固定画四个智能体；没装或关掉某个智能体时预览仍显示它（按「只加在预览」）。
  - Rust `vendors.rs` 算侧栏宽度仍算隐藏行和云端额度、额度看板里 Codex 仍写「OpenAI」，未改（见上节）。
  - 可清理 worktree 增加 `.claude/worktrees/66-scroll-align`，清理前问常浩。
- 本轮新坑：无。

## 侧栏重置到账、登出提醒与面板事件行并入细条（2026-11-05，Claude，常浩选 15、16「甲 · 并入细条」，02 不改、17「甲 · 细条同款」，看截图后追加待审批小签显示会话标题、侧栏去掉 Fable 并把 Cloud 改「云端」，说「开工」，看过前后对比页与安装后的应用说「合并」；PR #65 测试全过已 squash 合并 `cfa289a`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 13:58`（估计，按「开工」那条消息；本节写于 `2026-11-05 14:36`）。来由：侧栏面板逐个梳理的最后几项（面板清单 15、16、17，另确认 02 不改）；预览与定稿 https://claude.ai/artifact/TksR6Ltwp3YVo4qPaAbwQV （15、16）、https://claude.ai/artifact/82xPsuYeeRfNFZUvFfuLvr （02、17），前后对比 https://claude.ai/artifact/Li98f3MC4THoHEjKJWvANm ，issue #64。
- 改了哪些文件（PR #65，实现由子 agent 完成、我对照定稿截图与过滤逻辑审核；都在 `src/packages/hud/`）：`src/alerts/QuotaAlertViews.tsx`（删两张大卡，新增通用细条 `AlertStrip` 与 `stripCopy`，四种额度类提醒同列）、`alerts/quota-alert-copy.ts`（重写 `resetCreditCopy`，新增 `signInCopy`：登出写原因和「额度停在 HH:MM 的读数」，取该智能体额度最晚 `observedAt`）、`alerts/quota-list.ts`（`isQuotaEvent` 扩到四种，新增 `shownNews` 过滤隐藏行的提醒）、`alerts/InlineEventRow.tsx`（看板顶部事件行改用细条）、`alerts/CompactAlertView.tsx`（重置到账、登出新小签；待审批小签先用会话标题）、`permissions/approval-list.ts`（`requestTitle`）、`quota-rows.ts`（`quotaRowShown`、`tightestWindow`）、`model.ts`（侧栏智能体先去掉面板隐藏的行再算最紧值）、`usage-meter/mark-windows.ts`、`panel/window-labels.ts`（`peekWindowName`：中文界面 Cloud →「云端」）、`scene/AgentPeek.tsx`、`IslandNews.tsx`、`HUDScene.tsx`、`scene/HUDExpandedSurface.tsx`、`scene/useHUDLayout.ts`；测试 `test/quota-alert-copy.test.ts`、`quota-list.test.ts`、`approval-list.test.ts`、`quota-rows.test.ts`。
- 测试：在分支提交 `b0c7c51`（与 main `cfa289a` 内容相同，`git diff` 为空）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 647 passed / 0 failed；`ℹ pass 184` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node scripts/check-rules.mjs` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-credit-signin/check.log`、`test.log`（子 agent 跑，我核对过结果行）。
- 验证：子 agent 用临时页面以 vite 打包真实组件、无头浏览器截图（临时文件已删）；改版前的对照图由另一子 agent 在 `cdcb999` 上用同一脚本渲染；我对照定稿看过四种混排、悬停小卡、待审批小签、看板事件行。实机里重置到账、登出、看板事件行还没真正出现过。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-credit-signin/`（新版 `reset-*`、`signin-*`、`mix-*`、`chips-*`、`request-chip-*`、`panel-*`、`peek-*`；改版前 `old-reset-dark-zh.png`、`old-signin-dark-zh.png`、`old-panel-dark-zh.png`；均为组件渲染图，非实机）。
- 发布与回读：分支版 14:21:54 ditto 到 `/Applications` 并重启；合并后 `shasum` 回读 `/Applications/PostPane.app/Contents/MacOS/PostPane` 仍为打包产物的 `8e60e4efd71f`，分支与 main 内容相同，未被覆盖（L-05）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-credit-signin/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 实现时自定：隐藏行按面板设置（`hiddenRows` / `hiddenAccounts`）判断，不按 Fable 字样硬编码；待审批小签标题按 150 宽截断；刘海模式重置到账沿用原 calm 色；登出那条智能体名显示厂商名「Claude」（旧卡显示 provider 名「Claude Code」）。
  - Rust 侧算侧栏宽度（`src/crates/hud/src/vendors.rs`）取最紧额度时仍算隐藏行和云端额度，数字变短时那一格可能略宽，未改。
  - 旧卡把 Codex 写成「OpenAI」，新细条已改为「Codex」；额度看板里的智能体名仍是「OpenAI」，未改。
  - 可清理 worktree 增加 `.claude/worktrees/64-credit-signin-strip`，清理前问常浩。
- 本轮新坑：无。

## 侧栏额度预警卡改成细条（2026-11-05，Claude，常浩看过三版预览选「丙」，开工指令经 agent-hud 插件转入（与待答问题对得上），看过安装后的应用说「合并」；PR #62 测试全过已 squash 合并 `cdcb999`，已从 main 重新打包安装、回读一致）

- 时间：开工 `2026-11-05 12:55`（估计，按插件转入「开工」那条消息；本节写于 `2026-11-05 13:34`）。来由：侧栏面板逐个梳理的第五项（面板清单 14）；三版预览与定稿 https://claude.ai/artifact/5PS5DhbhkCkscx7bkc5eCq ，issue #59。
- 改了哪些文件（PR #62，实现由子 agent 完成、我对照定稿截图和队列逻辑审核）：`src/packages/hud/src/alerts/QuotaAlertViews.tsx`（`QuotaAlertView` 改成细条列表：图标、「智能体 · 中文窗口名 + 状态」、彩色百分比、×，细进度条与时间行；点整条打开用量统计并关掉这条，× 只关这条）、`alerts/quota-alert-copy.ts`（预计用完 / 已用完 / 到 90% / 已重置四种状态句与时间行，中英文）、`alerts/quota-list.ts`（新：队列里的额度预警与重置合并、最新在上）、`alerts/alert-tones.ts`（`quotaAccent`：黄 / 红 / 蓝）、`alerts/CompactAlertView.tsx`（小签改为图标 + 窗口名 + 彩色百分比，宽度同步）、`IslandNews.tsx`、`HUDScene.tsx`、`scene/useHUDLayout.ts`；测试 `test/quota-alert-copy.test.ts`（重写）、`test/quota-list.test.ts`（新）。另本轮交接改 `docs/LESSONS.md`（L-05）。
- 测试：在分支提交 `bf7cb61` 上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 643 passed / 0 failed；`ℹ pass 175` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node scripts/check-rules.mjs` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-quota-strip/check.log`、`test.log`（子 agent 跑，我核对过结果行）。合并后的 main `cdcb999` 只打包、未重跑测试。
- 验证：子 agent 用临时页面打包真实组件、无头浏览器截图（临时文件已删）；我对照定稿看过四条同时、小签、浅色英文。额度卡只在额度越过阈值或重置时才弹，实机上未见到真实弹卡。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-quota-strip/`（`quota-*-dark-zh.png`、`quota-light-en.png`、`quota-chip-*.png`、`quota-notch-dark-zh.png`，组件渲染图，非实机）。
- 发布与回读：分支版 13:13:33 装过一次，13:14:07 被另一会话的 #63 安装覆盖（见 L-05），常浩说「合并」时实机里的是 #63 版。合并后从 main `cdcb999`（含 #62、#63）重新打包，13:32:31 ditto 到 `/Applications` 并重启；`shasum` 回读与打包产物一致（`2d7374bb99bd`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-quota-strip/PostPane-before-main.app /Applications/PostPane.app`（#63 版）；改版之前的版本在同目录 `PostPane-before.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 实现时自定：到 90% 算不出速度时写「已用到 90%」，不跟「已用 / 剩余」设置；智能体名用 `clientDisplayName`（Codex 显示「Codex」，原卡是「OpenAI」）；刘海模式没有纸面，重置用原有 calm 绿色而非蓝色（改 `quotaAccent` 一行即可）；小签只显示队首一条，不显示条数；时间行钟点不加粗。
  - 4 秒自动消失仍只关队首那条，多条时卡片一条条变短，未改（与回复卡相同）。
  - 可清理 worktree 增加 `.claude/worktrees/59-quota-strip`（现已检出 main `cdcb999`，分离头），清理前问常浩。
- 本轮新坑：L-05。

## 侧栏「正在进行」显示 Claude 云端会话，超过 5 条可滚动（2026-11-05，Claude，常浩问「做这个复杂么，没大问题就正常做加进去，正在进行最多显示 5 个，再多做侧边滚动条」，看过 4 批计划；按「测试全过可直接合并」的授权合并；PR #63，已打包安装）

- 时间：开工 `2026-11-05 12:50`（按 issue #60 创建时间 04:50:31Z；本节写于 `2026-11-05 13:20`）。来由：常浩发现驿窗只显示 4 个在进行，实为云端会话（Anthropic 服务器上跑的）本机没有记录、读不到；issue #60。
- 改了哪些文件：`src/crates/agents/src/claude/cloud.rs`（新：`claude-cloud` 读取器，每 60 秒用 Claude Code 登录读 `api.anthropic.com/v1/sessions`，只取 `anthropic_cloud` 中在跑 / `blocked` 等你的会话，整理成会话行）、`agents/src/account.rs`（`Reading.live_sessions`、`Provider.every`）、`agents/src/agent.rs`（读取器排在末尾）、`agents/src/claude/account.rs`（`profile`、`config_dir` 放开给同级模块）、`agents/src/{antigravity,cursor,deepseek}/account.rs`（补新字段）、`core/src/accounts.rs`（`AccountProjection.live_sessions`、`live_elsewhere` 去重）、`core/src/snapshot.rs`（快照追加云端会话）、`core/src/sessions.rs`（`session_detail` 能按 ID 找到云端会话）、`core/src/demo/mod.rs`、`platform/src/accounts/mod.rs`（Claude 启用时同时启用 `claude-cloud`；读取失败不显示；`every` 固定间隔）、`platform/src/accounts/restart_copy.rs`（重启不恢复云端会话）、`platform/src/navigation.rs`（`claude-cloud-session` 打开 `https://claude.ai/code/<id>`）、`src/packages/hud/src/panel/SessionsSection.tsx`（列出全部，超过 5 条区域内滚动；云端副标题加「云端 ·」；去掉「还有 N 个在进行」）、`docs/session-data.md`、`docs/LESSONS.md`；测试：`claude/cloud.rs` 2 个、`platform/src/navigation/tests.rs` 1 个、`core/src/tests/sessions.rs` 1 个。
- 测试：在分支（变基到 `e0d474b` 之前的同内容提交）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 647 passed / 0 failed；`ℹ pass 167` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。首轮 `pnpm test` 有 1 项失败（`readings_run_in_opens_source_order`：新读取器插在 claude 后面，打乱了原版顺序），改成排在末尾后重跑全过。变基只带进 main 上两个改 `CURRENT.md` 的提交，代码未变，没有重跑。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-cloud-sessions/check.log`、`test.log`。
- 验证：接口先用脚本只读实测（2026-11-05 12:4x，返回 200，字段见 issue #60）；装机后 13:14:38 用 MCP `hud_snapshot` 取快照，没有父会话、在跑或等你的会话 4 个，其中云端 1 个（digiworld），与同一时刻接口返回的云端在跑数一致；`get_hud_screenshot` 面板截图第 4 行显示「云端 · 正在干活」。未验证：超过 5 条时的滚动（当时只有 4 个在进行）、点击云端会话打开网页。
- 截图：无单独存档（MCP 截图只在本会话里看过，标题被打码）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（13:14:07）。注意：`osascript` 的 quit 退不掉驿窗，用 `kill -TERM` 才退出。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-cloud-sessions/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：云端会话不进统计窗口（接口没有 Token 数）；读取间隔 60 秒，云端会话结束后最多约 1 分钟才从列表消失；Claude Code 登录过期时云端会话暂时不显示，等它自己续期。
- 本轮新坑：L-04

## Claude 额度看板：每周 Fable 换成云端额度（2026-11-05，Claude，常浩要求把每周 Fable 改成 claude.ai 的 Cloud session credits，确认方案后选「设置里隐藏 Fable」；PR #58 测试全过已 squash 合并 `412d863`，已打包安装）

- 时间：开工 `2026-11-05 12:32`（本会话创建时间；本节写于 `2026-11-05 12:50`）。来由：常浩截图对比 claude.ai 用量弹窗与驿窗 Claude 看板，issue #56。
- 改了哪些文件：`src/crates/agents/src/claude/account.rs`（`get_usage` 里带 `limit_dollars`/`used_dollars` 的一项读成 `claude-cloud-credits` 行，金额进 `nativeUsage`，无周期）、`src/packages/hud/src/quota-rows.ts`（`quotaCredits` 按 `metrics.consumed.unit === "USD"` 认出）、`panel/agent-board.ts` 与 `AgentBoard.tsx`（「…后到期」、条下已用/剩余金额、不参与预测和判词计数）、`panel/window-labels.ts`（「云端额度」）、`model.ts`（静止条最紧额度不算它）；测试 `account.rs` 1 个、`test/agent-board.test.ts` 1 个。
- 测试：分支提交 `931b56f`（与 main `412d863` 内容相同）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 643 passed / 0 failed；`ℹ pass 167` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-cloud-credits/56-check.log`。
- 验证：本机直接调 Claude 引擎 `get_usage`，确认该项为 `iguana_necktie`：上限 250、已用 109.05、`resets_at` 2026-11-05T07:59Z，与 claude.ai 弹窗一致；装好新版后用 HUD 工具 `get_hud` 回读，Claude 块多出 `Cloud session credits` 行（`usedPercent` 55.58、`consumed` 138.95/250 USD、`windowDurationSeconds` 为空）；放好隐藏 Fable 的草稿后用 `get_hud_screenshot` 截面板，看到「云端额度 56%　3 小时 9 分后到期　已用 $139 / $250」，判词为「两个额度在重置前都用不完」。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-cloud-credits/panel-draft-dark-zh.png`（应用内面板渲染，含未保存草稿，账户已遮盖）。
- 发布与回读：`PostPane.app`（worktree 分支提交 `931b56f` 打包，内容同 main `412d863`）已 ditto 到 `/Applications` 并重启（12:49:30，按 L-03），回读见「验证」。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-cloud-credits/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 每周 Fable 未改代码，经 HUD 工具 `draft_hud` 放了草稿 `blocks.claude.hiddenRows = ["claude-weekly-fable"]`，需常浩在面板点「保存」才生效（重启前未保存会丢，安装重启后已重新放过一次）。
  - 这笔云端额度今天 15:59 到期，之后接口不返回，这一行自动消失。
  - 额度阈值提醒对云端额度行仍按百分比走，未单独处理。
  - 第一次把读取层改在了主目录，随后移进 worktree `.claude/worktrees/56-cloud-credits`，主目录已还原。可清理 worktree 现共 19 个，清理前问常浩。
- 本轮新坑：无。

## 侧栏新回复通知卡改成清单回执（2026-11-05，Claude，常浩看过三版预览选甲「清单回执」，确认计划后说「开工」，装好后说「合并」；PR #55 测试全过已 squash 合并 `1315622`、已打包安装）

- 时间：开工 `2026-11-05 11:45`（估计，按「开工」那条消息；本节写于 `2026-11-05 12:02`）。来由：侧栏面板逐个梳理的第四项（面板清单 12、13）；三版预览与定稿 https://claude.ai/artifact/EqDRpN1LFCWPaBr82o7w16 ，issue #54。
- 改了哪些文件（PR #55，实现由子 agent 完成、我对照定稿截图和关闭/排队逻辑审核）：`src/packages/hud/src/alerts/CompletionAlertView.tsx`（重写为清单回执卡：顶部「新 回 复」+ REPLY 计数 + 纸面「已回」章，按侧栏分区分组，最新一条展开显示模型　推理强度、摘要、用时与本会话 Token、「知道了 / 全部知道了」与「↗ 回到会话」，其余折两行）、`alerts/reply-list.ts`（新：排序、分组、用时与 Token 文字、小签数据）、`permissions/ListCard.tsx`（新：审批卡与回复卡共用的取色、行、头部、撕线、分组标题、折叠按钮）、`permissions/ApprovalContent.tsx`（改用共用部件，外观不变）、`permissions/approval-list.ts`（`approvalGroups` 可传排序）、`IslandNews.tsx`（`dropIslandCards`、`queuedReplies`，回复卡拿到全部回复）、`alerts/PendingEventRows.tsx`（当前是回复卡时不再重复列其他回复）、`alerts/CompactAlertView.tsx`（小签改为图标 + 最新会话标题 + REPLY 计数，侧栏宽度同步）、`HUDScene.tsx`、`scene/HUDExpandedSurface.tsx`、`scene/useHUDLayout.ts`；测试 `test/reply-list.test.ts`（9 个）。
- 测试：在分支提交 `923084a`（与 main `1315622` 内容相同，`git diff` 为空）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 642 passed / 0 failed；`ℹ pass 166` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-reply-list/check.log`、`test.log`（子 agent 跑，我核对过结果行）。
- 验证：子 agent 用临时页面打包真实组件、无头浏览器截图（临时文件已删）；我对照定稿看过三条排队和小签；实机由常浩看过后说「合并」。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-reply-list/`（`reply-single-dark-zh.png`、`reply-three-dark-zh.png`、`reply-chip-dark-zh.png`、`reply-extra-light-en-notch.png`，组件渲染图，非实机）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（12:01:08，按 L-03）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-reply-list/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 实现时自定：「已回」章只在纸面印，刘海里只有 REPLY 计数；英文章为 DONE；回复卡最新一条在最上，审批卡里的 REPLY 行仍按先来先列；回到会话成功只关那一条；摘要不保留换行。
  - 4 秒自动消失仍只关队首那条，多条时卡片一条条变短，未改。小签里的 REPLY 标签不随侧栏缩放。
  - 可清理 worktree 增加 `.claude/worktrees/54-reply-list`（现共 18 个），清理前问常浩。
- 本轮新坑：无。

## 侧栏静止条不显示金额、悬停面板改成额度看板（2026-11-05，Claude，常浩答复 PR #53 遗留四问（显示余额；合并面板不加图标；剩余模式进度条可以；无预测盖「未知」章），确认分批计划后说「按推荐开工」，看过实物后说「合并」；PR #51 squash 合并 `5837e4d`、PR #53 squash 合并 `6e84ad7`，已打包安装）

- 时间：开工 `2026-11-05 11:14`（本会话创建时间；两个 PR 的主体代码由上一会话写好，本会话负责收尾、验收与合并；本节写于 `2026-11-05 11:30`）。来由：侧栏面板逐个梳理的第二、三项；预览：侧栏 https://claude.ai/artifact/4opU9NBbAXonLkfx1HfqTg ，悬停面板 https://claude.ai/artifact/F3iS2KywnVrxXashMd5fT8 （甲），issue #50、#52。
- 改了哪些文件：
  - PR #51：`src/packages/hud/src/model.ts`、`recent-usage.ts`、`scene/HUDMarkStrip.tsx`（没有额度窗口的 Hermes、DeepSeek 侧栏显示灰色 24 小时 Token，不显示金额）、`src/crates/hud/src/vendors.rs`（Rust 用同一文字算侧栏宽度）、`test/recent-usage.test.ts`。
  - PR #53：新 `panel/window-labels.ts`、`panel/agent-board.ts`、`panel/AgentBoard.tsx`，改 `QuotaSection.tsx`、`SessionsSection.tsx`、`HoverPanel.tsx` 等（实现由子 agent 完成、上一会话审核）；本会话加提交 `05ef07a`：`agent-board.ts` 有额度但无预测（含读数过旧）时印章为「未知」，`AgentBoard.tsx` 印章加「未知」中性灰，`QuotaSection.tsx` 读不到额度且有掉线提示时也盖「未知」，无额度智能体不盖章；`test/agent-board.test.ts` 补对应断言。
- 测试：PR #53 分支合入最新 main（含 #51）后的提交 `281a00c`（与 main `6e84ad7` 内容相同，`git diff` 为空）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 642 passed / 0 failed；`ℹ pass 157` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-agent-panel/premerge-*.log`；#51 单独的结果在 `evidence/2026-11-05-strip-tokens/`。
- 验证：两分支临时合并打包安装看实物，常浩看过后说「合并」；组件渲染截图沿用上一会话子 agent 的结果（`evidence/2026-11-05-agent-panel/*.png`），「未知」章未单独截图。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-agent-panel/`（`claude-*.png`、`hermes-dark-zh.png`、`merged-dark-zh.png`，组件渲染图，非实机，不含「未知」章）。
- 发布与回读：`PostPane.app`（#51 加 #53 临时合并版，内容与合并后 main 相同）已 ditto 到 `/Applications` 并重启（11:26:16，按 L-03），临时合并已撤销。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-agent-panel/PostPane-before.app /Applications/PostPane.app`（两项改动之前的版本）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划写的是把 #53 变基后强推，强推被自动模式拦下，改为把 main 合进分支再 squash 合并，结果相同。
  - 常浩定：DeepSeek 关联余额时面板保留余额块；合并面板（设置 → 显示 →「按智能体分开」关掉才出现）不加智能体图标；「剩余」模式下进度条按已用画。
  - 可清理 worktree 增加 `.claude/worktrees/50-strip-tokens`、`52-agent-panel`（现共 17 个），清理前问常浩。
- 本轮新坑：无。

## 侧栏待审批卡改成清单卡（2026-11-05，Claude，常浩经三轮预览选定丙「清单」并逐项调整，说「可以，开工」，看过实物后说「可以合并」；PR #49 测试全过已 squash 合并 `a059217`、已打包安装）

- 时间：开工 `2026-11-05 09:58`（估计，按「可以，开工」那条消息；本节写于 `2026-11-05 10:32`）。来由：常浩要逐个梳理侧栏面板内容，先做待审批卡；面板清单 https://claude.ai/artifact/P2u7uDGFzNy4ivv5QhDsKc ，定稿预览 https://claude.ai/artifact/3PevPG5CE3DRAExnbhouoY ，issue #48。
- 改了哪些文件（PR #49，实现由子 agent 完成、我审核）：`src/crates/agents/src/claude/transcript.rs`（读桌面会话元数据的 `effort`，读 `claude_desktop_config.json` 的侧栏分区并按修改时间缓存，读不到当未分区）、`src/crates/core/src/presentation.rs`（会话带 `effort`、`section`）、`agents/src/transcript/log.rs` 与 `codex/transcript.rs`、`core/src/database/checkpoints.rs`、`core/src/ingestion.rs`（Codex 从 `turn_context` 读推理强度）、`src/packages/protocol/src/index.ts`（`Session.effort`、`Session.section`）、`hud/src/permissions/approval-list.ts`（新：排序、分组、折叠、找会话与退回、能否回到会话）、`ApprovalTag.tsx`（新：统一画框标签）、`ApprovalContent.tsx`（重写为清单卡、删工作目录行、↗ 复用 `openSession`）、`PermissionQuestionCard.tsx`（虚线小标题、前情调亮）、`PermissionToolCard.tsx`（「批准一次」改「允许一次」）、`HUDScene.tsx`、`IslandNews.tsx`；测试 `hud/test/approval-list.test.ts`（10 个）和 Rust 4 个。
- 测试：在合并前的分支提交 `209255a` 上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 19 组 `test result: ok`，合计 642 passed / 0 failed；`ℹ pass 148` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-05-approval-list/`。
- 验证：子 agent 把真实 `ApprovalContent` 渲染成静态页截图（深色、浅色、英文超过 5 条），我对照定稿看过（`shot.png` 在证据目录）；实机由常浩看过侧栏后同意合并。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-approval-list/shot.png`（组件渲染图，非实机）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（10:30:19，按 L-03）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-approval-list/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 实现时自定：分组按组内等得最久的一条排序（不按 Claude 侧栏分区顺序）；全部无分区时不印组标题；「还有 N 条」点开全部展开；点 REPLY 行仍切到原回复通知卡；刘海模式也用清单卡版式（不盖印章，未看实物）。
  - 分区读取依赖 Claude 应用内部设置格式，应用升级后可能读不到，届时退回「未分区」。
  - 演示模式的外观设置目录 `~/Library/Application Support/app.postpane.mac/demo/presentation.json` 里放了一份常浩的真实显示设置（截面板清单用），正式版不读它；原默认值备份在 `evidence/2026-11-05-panel-inventory/demo-presentation-default.json`。
  - 可清理 worktree 增加 `.claude/worktrees/48-approval-list`（现共 15 个），清理前问常浩。
- 本轮新坑：无。

## 侧栏 Codex 小人第二版：打盹加强、各动作更明显（2026-11-05，Claude，常浩审核第一版动作库后说打盹不明显、其余都再明显一点；确认三批计划后说「按计划开始」，看过实物和审核页后说「同意合并」；PR #47 测试全过已 squash 合并 `c7f9ed5`、已打包安装、审核页已更新到第二版）

- 时间：开工 `2026-11-05 08:23`（本会话创建时间；代码由上一个会话在分支 `claude/46-codex-clearer` 写好，本会话负责验收与合并；本节写于 `2026-11-05 08:31`）。来由：常浩审核 Codex 真实动作库 https://claude.ai/artifact/DWA9o2vomCEte2kXsd3Jbc 后的反馈，issue #46。
- 改了哪些文件（PR #47，只对 Codex 的 `petals` 开关生效）：`src/packages/hud/src/bots/bot-motion.ts`（打盹压扁、慢深呼吸、变暗 dim 0.35；待机 spin×1.6、思考 60°/s、读文件 −60°/s；跑命令抖动 0.012、压缩缩小 0.2、等批准/提问/方案/完成/重置的张合加大；额度用完 dim 0.4、花瓣收到 0.6；新增 `dimGoal`，常暗状态不再一直高帧率刷新，打盹按 12 帧）、`bot-renderer.ts`（出错变暗系数 0.28→0.38、长命令进度环外径加粗到 1.4）、`test/codex-petals.test.ts`（新增 `a dozing Codex flattens, breathes deep and darkens`）、`docs/parity/c08-bots.md`（第 50 行）。
- 测试：在提交 `ab23566`（与合并后内容相同）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 19 组 `test result: ok`，合计 638 passed / 0 failed；`ℹ pass 138` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-05-codex-clearer/`。
- 验证：上一个会话用本地临时页以真实 `BotMark` 看过 18 个动作（沿用其结果）；审核页用真实小人代码重新打包（产物核对含 `dimGoal`、`.38`、`.012`），常浩看过实机侧栏和审核页后同意合并。
- 截图：无。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（08:28:54，按 L-03，用 `pgrep -f "Contents/MacOS/PostPane$"` 确认退出与重启）。审核页同一链接更新为 Version 2，只发布页面脚本和 `chatgpt-*.png`，未发布 Clawd 素材；审核页临时文件已从 worktree 删除。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-codex-clearer/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 中途试过给 Codex 加 Hermes 那套彩色光圈加彩色徽章，常浩说和 Hermes 区分不开，已撤回，未进提交；每个形象风格独立。
  - 可清理 worktree 增加 `.claude/worktrees/46-codex-clearer`（现共 14 个），清理前问常浩。
- 本轮新坑：无。

## 侧栏 Hermes 头像常驻并加 9 个细微动作（2026-11-05，Claude，常浩要求直接用女生头像、不改卡通、动作少而典型，看过一版预览后说「按计划开工」，实物看了三轮后说「看过了，合并」；PR #45 测试全过已 squash 合并 `622edd0`、已打包安装）

- 时间：开工 `2026-11-05 07:36`（估计，按会话进度；本节写于 `2026-11-05 08:08`）。来由：侧栏小人逐个做活的第二个；预览 https://claude.ai/artifact/DGEi8X6gtwJymx1jyTF2pF ，issue #44。
- 改了哪些文件（PR #45，squash 前 4 个提交）：`src/packages/hud/src/bots/bot-spec.ts`（`avatar` 字段与眼睛椭圆，Hermes 打开并常驻）、`bot-motion.ts`（`actAvatar`：绕脖子偏头、抬起、点头、变淡，道具 `typing`/`sent`/`letter`/`hello`，光圈 `glow`，待机 `standby`；头像模式不显示思考省略号、不画叉眼；按动作排帧率）、`bot-renderer.ts`（`drawAvatar` 画头像本身、擦除加睫毛线合眼、彩色光圈、左上角彩色徽章 `drawAvatarBadge`、实色气泡与信、待机光泽扫过；头像不再走像素符号）、`test/hermes-avatar.test.ts`（10 个测试）、`test/codex-petals.test.ts`（常驻名单加 Hermes）、`docs/parity/c08-bots.md` 与 `README.md`（第 51 行有意改动并重算汇总）。
- 测试：首个提交上 `pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 135` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`）；之后三个提交只改前端，每次复跑 `pnpm run check` 退出 0 与 `pnpm run test:ts`，最后一次 `ℹ pass 137` / `ℹ fail 0`，在合并的提交 `0fa6a5b` 上跑；Rust 未复跑。
- 验证：每轮用本地临时调试页（未提交，已删）以真实 `BotMark` 排开状态看过（80/64/26/24px）；实机由常浩看了三轮并提意见：①太不明显→加彩色光圈、彩色徽章、实色气泡；②待机、打招呼、额度用完重做，打点气泡移到左上角；③删掉绿色在线小点，待机改为光泽扫过。
- 截图：无。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（08:07:58，按 L-03）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hermes-avatar/PostPane-before.app /Applications/PostPane.app`（这是 Hermes 改动前、含 Codex 改动的版本）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 「收到消息」接的是现有的「新一轮开始」；飞书机器人接入不在本次范围，接入后飞书消息到达也走这一段。
  - Hermes 的颜色约定：处理/收到消息蓝、等你处理橙、完成绿、出错红、额度用完深灰电池、打盹靛蓝 z、悬停黄色 Hi；以后其他头像类小人可沿用。
  - 可清理 worktree 增加 `.claude/worktrees/44-hermes-avatar`（现共 13 个），清理前问常浩。
- 本轮新坑：无。

## 侧栏 Codex 小人常驻并补齐花瓣动作（2026-11-05，Claude，常浩看过三版预览选丙「花瓣身体语言」、确认三批计划，看过实物后说「看过了，合并」；PR #43 测试全过已 squash 合并 `009de4b`、已打包安装）

- 时间：开工 `2026-11-05 00:55`（会话创建时间；本节写于 `2026-11-05 07:33`）。来由：常浩要侧栏图标都像 Clawd 一样活起来，先做 Codex：一直是绿色小人，不再平时显示 OpenAI 花纹；三版预览 https://claude.ai/artifact/Ue8gWQt89gBbTk6vC6ZQzu 选丙，要求和现有 Codex 小人形象一致、在原动效上融合，不重做；issue #42。
- 改了哪些文件（PR #43）：`src/packages/hud/src/bots/bot-spec.ts`（`stays`、`petals` 开关，只有 `openai` 打开；`staysAsBot`）、`scene/HUDMarkStrip.tsx`（侧栏按 `staysAsBot` 常驻，原来写死 `false`）、`bot-form.ts`（轮廓加花瓣张合系数）、`bot-renderer.ts` 与 `bot-still.ts`（按张合画身体并进缓存键、出错变暗、长命令进度环）、`bot-motion.ts`（各工具转法、改文件 30° 咔哒、张合、出错卡住、完成绽放与跳舞、读文件扫行与进度环眼神；两处导入补 `.ts`）、`test/codex-petals.test.ts`（7 个测试）、`docs/parity/c08-bots.md` 与 `README.md`（第 50 行有意改动并重算汇总）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 128` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`）。之后只改测试文件类型标注，复跑 `pnpm run check` 退出 0、`node --test src/packages/hud/test/codex-petals.test.ts` 为 `ℹ pass 7` / `ℹ fail 0`，合并的提交即 `4c55cfe`。
- 验证：本地临时调试页（未提交，已删）用真实 `BotMark` 排开 Codex 18 个状态，64px 与 22px 两档看了打盹合拢、进度环、出错变暗叉眼、压缩收瓣、完成笑眼。实机由常浩看过侧栏；我未截到实机（HUD 截图工具要先在设置里打开「让智能体排布 HUD」，没改设置）。
- 截图：无。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（07:30:15，按 L-03）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-codex-bot/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划说分 3 个提交，实际合成 1 个（三批改同一组文件）。
  - 「长活完成」「额度重置」要宿主给出对应 `card` 才出现，没有时按「回复完成」演。
  - 常浩新定：以后其他小人动效只出一版，沿用现有程序化小人形象与动效，不出三版、不做像素或道具款（已记进项目记忆）。
  - 可清理 worktree 增加 `.claude/worktrees/42-codex-bot`（现共 12 个），清理前问常浩。
- 本轮新坑：无。

## 后台第 3 批：统计窗口外壳与用量页换热敏小票（2026-11-05，Claude，常浩确认计划并选图表配色「甲 墨色深浅」，经 HUD 回复「合并」；PR #41 测试全过已 squash 合并 `f5b10ee`、已打包安装）

- 时间：开工 `2026-11-05 00:30`（估计，按会话进度；本节写于 `2026-11-05 00:54`）。来由：后台第 3 批，issue #40；图表配色三版预览 https://claude.ai/artifact/2Wn7dQ3UJqwwDyswH1rrk1 ，常浩选甲。版式按推荐：一整条长小票；会话页接受过渡状态。
- 改了哪些文件（PR #41）：`src/packages/app/src/settings/receipt.css`（纸、墨变量与弹层样式扩到 `.statistics-window`；新增统计窗口一节：桌面底、Token / 会话两格反白、撕齿长小票、页尾「共 N 个智能体」与条码）、`App.tsx`（统计窗口加 `lang`）、`statistics/StatsTheme.tsx`（`themeFor` 纸面墨色并加 `ink`；`card` 撕线分隔；`modelColor(id, theme)` 按 `rankModels` 排的用量墨色深浅；总数窄体大字）、`Statistics.tsx`（分段反白、复选框墨色、调用 `rankModels`）、`StatisticsParts.tsx`（再导出）、`statistics/UsageChart.tsx`、`ActivityHeatmap.tsx`、`ProviderCard.tsx`、`QuotaHistory.tsx`（取色改墨色、去圆角）、`docs/ROADMAP.md`（第 3 批标完成）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 121` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`），都在合并的提交 `c0195ab` 上跑。
- 验证：浏览器开发模式（独立数据目录 `evidence/2026-11-05-backstage-stats/devdata`，`?window=statistics`）看了 Token 页浅深两色全页、会话页浅色。实机未看：两次请求 computer-use 访问驿窗都未获批准，统计窗口要从设置菜单打开，命令行唤不出来。
- 截图：无（实机未截）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（00:47:35，按 L-03）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-backstage-stats/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 超过 5 个模型时其余同用最浅一档，图例里没有另加「其他」一行。
  - 会话页只换了外壳与纸面，内部仍是原来的白卡（SessionTheme 是另一套主题），留第 4 批。
  - 「合并」经 agent-hud 插件转入，合并前核实 PR 仍开着、头提交即测过的 `c0195ab`、main 无新提交。
  - 可清理 worktree 增加 `.claude/worktrees/40-backstage-stats`（现共 11 个），清理前问常浩。
- 本轮新坑：无。

## 后台第 2 批：设置四页正文换小票细节与网纹框滑块（2026-11-05，Claude，常浩确认分批计划并说「按推荐开工」，看过显示页浅色实物后经 HUD 回复「合并」；PR #39 测试全过已 squash 合并 `3297988`、已打包安装）

- 时间：开工 `2026-11-05 00:03`（会话创建时间；本节写于 `2026-11-05 00:28`）。来由：第 1 批外框之后的设置四页正文，滑块常浩已选「甲 网纹框」（预览 https://claude.ai/artifact/45fUqbNvXETpyBaaoMsDeR ），issue #38。三个细节按推荐答案：智能体列表反白加「◀」、「共 N 项」数本页显示出的设置行、部件样例改纸面。
- 改了哪些文件（PR #39）：`src/packages/app/src/settings/receipt.css`（网纹框滑块；智能体列表、拖动目标、确认弹窗；HUD 预览墨框；插件卡头悬停与展开明细缩进虚线；页尾双线、「共 N 项」CSS 计数、固定花纹条码）、`SettingsPrimitives.tsx`（滑块带 `data-min`/`data-max`，印两端值）、`SettingsSamples.tsx`（HUD 预览加类名；部件样例用真面板的 `paperOf` 取色印成纸面）、`src/packages/hud/package.json`（多导出 `./paper`）、`docs/ROADMAP.md`（第 2 批标完成）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 121` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`），都在合并的提交 `c70cef4` 上跑。
- 验证：浏览器开发模式（独立数据目录 `evidence/2026-11-05-backstage-pages/devdata`）看了四页浅深两色、中英文；打包安装后实机只看了显示页浅色，网纹框把手在 WebKit 下压在框上。深色与其他三页未实机看：本轮 computer-use 访问驿窗被拒，改用 `open -a` 唤出设置窗口加 `screencapture -l` 只截到当前页。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-backstage-pages/设置-显示-浅色.png`。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（00:21:08，按 L-03）；设置回读 `appearance=system`、`showMenuBarIcon=false`（本轮未改）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-backstage-pages/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划说内部分 4 步提交，实际合成 1 个提交（改动集中在同一个样式文件）。
  - 页尾没做原预览右侧的「已保存 时:分:秒」（设置是改了就存，免得加状态逻辑），计划里已说明。
  - 「合并」经 agent-hud 插件转入，合并前核实了 PR 仍开着、头提交即测过的 `c70cef4`、main 无新提交。
  - 可清理 worktree 增加 `.claude/worktrees/38-backstage-pages`（现共 10 个），清理前问常浩。
- 本轮新坑：无。

## 后台第 1 批：设置窗口换热敏小票外框（2026-11-04，Claude，常浩先看两轮三版预览后选「一 热敏小票」并确认 4 批计划，看过实物截图后说「合并」；PR #37 测试全过已 squash 合并 `03202ee`、已打包安装）

- 时间：开工 `2026-11-04 23:20`（估计，按会话进度；本节写于 `2026-11-04 23:57`）。来由：常浩指出阶段 4 没收尾，后台页面也要适配纸面风格；第一轮三版（收据、账簿、公文表格）被否，第二轮在「收据」上加深出热敏小票、票夹钉单、复写联单，选热敏小票。预览 https://claude.ai/artifact/Hmfcbhmzc18TsKEiULg7wa ，issue #36。
- 改了哪些文件（PR #37）：`src/packages/app/src/settings/receipt.css`（新：只作用于设置窗口 `.apple-app` 的热敏纸样式、撕齿、打印口目录条、刻度尺滑块、关/开两格开关、□/■ 分段、方角按钮与下拉）、`styles.css`（引入）、`App.tsx`（设置窗口加 `lang`、打印口与目录纸条外层、单号与页码行）、`docs/ROADMAP.md`（阶段 4 改正为后台还剩 4 批）。
- 测试：`pnpm run check` 退出 0（最终提交上复跑）；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 121` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`，在第一个提交上跑，第二个提交只改 CSS）。
- 验证：浏览器开发模式（独立数据目录）看了四页浅深两色；打包安装后实机看通用、显示两页浅深两色。实机发现开关滑块在 WebKit 下跑出框（浏览器里正常），改为用开关自身半边底色表示选中，重装复看正常。截深色时临时把「外观」切深色，截完改回「跟随系统」，回读 `appearance=system`、`showMenuBarIcon=false`。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-04-backstage-base/` 的 `设置-显示-浅色.png`、`设置-显示-深色.png`、`设置-通用-深色.png`。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（按 L-03）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-backstage-base/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 预览里 HUD 预览是灰度网点，实现保持彩色（背景光晕要看颜色），计划里已说明。
  - 智能体页左侧列表仍是圆角选中、插件卡片和页尾合计条码未做，留第 2 批；「此版本找不到登录服务」提示是原有问题。
  - 上一节写的「阶段 4 已收尾」不对，已在 ROADMAP 改正。可清理 worktree 增加 `.claude/worktrees/36-backstage-base`（现共 9 个）。
- 本轮新坑：无。

## 阶段 4 收尾：小人不改，菜单栏图标关掉（2026-11-04，Claude，常浩看过示意图后说「都不做，小人就是现在的样子，菜单栏图标默认不显示，直接给我改设置，我不需要，图标做完了」；交接已提交到 main、本机设置已改并回读）

- 时间：开工 `2026-11-04 23:07`（会话创建时间；本节写于 `2026-11-04 23:13`）。来由：ROADMAP 阶段 4 剩余的「小人与图标」，先用示意图对齐范围 https://claude.ai/artifact/3tcEEHALJcvjQwFuy6SqHr （A 撕角票标志与小人、B 菜单栏图标、C 应用图标），常浩决定都不改。
- 改了哪些文件：`docs/ROADMAP.md`（阶段 4 加完成状态）、`CURRENT.md`（本节与顶部下一步）。代码未改；本机 `~/Library/Application Support/app.postpane.mac/settings.json` 的 `showMenuBarIcon` 改为 `false`（`providers` 保留）。
- 测试：`node --test tests/*.test.mjs` 结果 `ℹ pass 4` / `ℹ fail 0`；`pnpm run check`、`pnpm test` 未跑（没改代码）。
- 验证：退出驿窗 → 改设置 → 重新打开；回读设置为 `showMenuBarIcon = False`；应用运行中用 System Events 查驿窗进程，没有状态栏菜单（`menu bar 2` 不存在）。未截图看菜单栏。
- 截图：无。
- 发布与回读：无需发布。回滚：退出驿窗后 `cp ~/Library/Application\ Support/postpane/evidence/2026-11-04-hide-menubar/settings-before.json ~/Library/Application\ Support/app.postpane.mac/settings.json` 再打开，或在设置「通用」里打开菜单栏图标。
- 与授权不一致之处、遗留问题、范围外发现：常浩说「默认不显示」，这次只改了他本机的设置，代码里新装的默认值仍是显示（`src/crates/core/src/lib.rs` 的 `showMenuBarIcon: true`）；只有他一人使用，暂不改。可清理 worktree 仍是 8 个，清理前问常浩。
- 本轮新坑：无。

## 新回复等通知换成「回执」外观（2026-11-04，Claude，常浩指着黑底「有新回复」卡说还没做，选甲「回执」，看过实物后说「看过了，合并」；PR #35 测试全过已 squash 合并 `34126a4`、已打包安装）

- 时间：开工 `2026-11-04 22:50`（估计，按会话进度；本节写于 `2026-11-04 23:05`）。来由：通知卡和横条仍是黑底，和其他纸面不一套；issue #34，预览 https://claude.ai/artifact/RfBWq92n9egDR75zccuwYv 。
- 改了哪些文件（PR #35）：`src/packages/hud/src/HUDScene.tsx`（动态与简约形态下通知也取纸面，通知卡与通知队列包纸）、`alerts/CompactAlertView.tsx`（通知横条：粗体名、撕线、蓝/琥珀/墨色状态，宽度相应加宽）、`alerts/CompletionAlertView.tsx`（新回复卡：撕线、蓝色小方框、点线时间与窄体数字、方角按钮）、`alerts/QuotaAlertViews.tsx`（额度类通知：纸色、方角按钮、网纹进度框）、`alerts/alert-tones.ts` 与 `alert-palette.ts`（新：通知取色，纸上蓝/琥珀/实心墨）、`paper.ts`（新 `blue`）、`test/alert-tones.test.ts`（新）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 638 passed / 0 failed、`ℹ pass 121` / `ℹ fail 0`、`ℹ pass 6`、`ℹ pass 14`）。
- 验证：已打包安装；我尝试结束一轮后回来截「有新回复」实物，但通知已不在，未截到。实物由常浩自己看过（「看过了，合并」）。额度告急、额度重置、需要登录未实机看过，只有测试覆盖。
- 截图：无（未截到）。
- 发布与回读：`PostPane.app` 已 ditto 到 `/Applications` 并重启（23:03:23 启动）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-04-receipt-news/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：刘海形态、额度面板里夹带的通知行未改；可清理 worktree 增加 `.claude/worktrees/34-receipt-news`（现共 8 个可清理）。
- 本轮新坑：无。

## 悬停小卡换成「小收据」外观（2026-11-04，Claude，常浩问截图里的黑框是什么并要求换样式，选甲「小收据」，看过实物后说「没问题，合并」；PR #33 测试全过已 squash 合并 `7c9482e`、已打包安装）

- 时间：开工 `2026-11-04 22:33`（估计，按会话进度；本节写于 `2026-11-04 22:47`）。来由：额度面板换纸后，鼠标停在撕角票上弹出的小卡（peek）仍是黑底；issue #32，预览 https://claude.ai/artifact/VMX6bcvKEj1wdijMu74Bse 。
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
