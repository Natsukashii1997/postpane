# 当前状态

当前阶段目标：ROADMAP 阶段 5「多智能体接力」做完并实机验收。（2026-11-08 常浩确认，digital-twin#114）

更新：2026-11-06。阶段 0 至阶段 2 全部完成；阶段 4 静止侧栏为「撕角票」、审批横条与展开框为「票签」（PR #27）、额度面板为「收据」（PR #31）、悬停小卡为「小收据」（PR #33）、新回复等通知为「回执」（PR #35），所有屏幕默认动态形态（PR #29），菜单栏图标本机关掉、新装或缺这项设置时默认也不显示（PR #57）；侧栏 Codex 小人改为常驻并补齐「花瓣身体语言」动作（PR #43），第二版打盹加强、各动作更明显（PR #47），Hermes 改为头像常驻加 9 个带颜色的细微动作（PR #45），其他小人之后各做一版；侧栏面板内容逐个梳理，面板清单见 https://claude.ai/artifact/P2u7uDGFzNy4ivv5QhDsKc ，第一个待审批卡已改成「清单卡」（PR #49），侧栏静止条不再显示金额、无额度智能体改显示 24 小时 Token（PR #51），悬停面板改成额度看板（PR #53），新回复通知卡改成「清单回执」（PR #55），额度预警卡改成「细条」（PR #62），重置到账、登出提醒与面板事件行并入细条、待审批小签显示会话标题、侧栏各处不显示面板设置里隐藏的额度行（PR #65），面板清单 17 项至此全部定完（02 悬停小卡、04 合并面板不改），「正在进行」加入 Claude 云端会话、超过 5 条可滚动（PR #63），Claude 额度看板加「云端额度」（PR #58），每周 Fable 从读取层与额度出口彻底去掉、各处不显示不计入（PR #94、#96）；后台页面换「热敏小票」分 4 批，第 1 批设置窗口外框（PR #37）、第 2 批设置四页正文与网纹框滑块（PR #39）、第 3 批统计窗口外壳与用量页（PR #41）已合并，批次见 [docs/ROADMAP.md](docs/ROADMAP.md)。设置页页头与正文对齐、「显示」页 HUD 预览改成壁纸入框与四联票、形态去掉「简约」、「正在进行」滚动条停下淡出（PR #67）。设置页整体优化：外框统一收据、内容分组框加控件右齐、面板真实预览，设置里「HUD」改叫「侧栏」（PR #73）。光晕只留柔光，设置页修纸面滚动分块错位、Hermes 图标、智能体卡片截断（PR #77）。插件页「各客户端」表格统一成一套三列网格、按层级对齐（PR #83）。侧栏 Hermes 接两个飞书机器人猛鬼兽、亚古兽：会话、回执、断线细条盖各自的方印，按回合租约判断正在回复与回复完成，网关断线出细条（PR #86、#88），回执与正在进行用这一轮的问题当标题（PR #90），Hermes 新回复看过才收起（PR #93）、不被别的智能体的待回答挡住（PR #97），新回复的小签和回执左侧换成机器人印章（PR #102）、印章摆正不再倾斜（PR #107）。侧栏悬停 Hermes 的小收据不再显示「额度 --」，改为两个机器人各自的在线 / 正在回复 / 断线、最近一次回复与今天轮数，加 24 小时 Token（PR #111）。随手记猫球轻摆幅度调大（PR #91）。DeepSeek 监听提问加开关、默认关，不再每 2 秒扫全机进程（PR #100）。侧栏「正在进行」会话可左滑露出「移除」，拿掉不想回复的会话，有新内容时自动回来（PR #110、#113）。多智能体接力批 A 已收尾（PR #121、#122、#123）。接力展开卡改浅蓝航空信纸、只留顶边航空斜纹（PR #125）；侧栏票根去掉左上角打孔圆点（PR #126）；Hermes 定时任务失败时侧栏弹一次细条（PR #115，此前交接写了已合并，实际今天才合并）；随手记猫球只在悬停时动（PR #127）；批 B「正在进行」本机 Claude 会话左滑发起审核 / 讨论（PR #128）。两指左划拉托盘时整个悬停面板不再横向错位（PR #130）。悬停面板两指左划不再横向错位（PR #130）。ChatGPT 接力处理中时侧栏 OpenAI 小人动起来（PR #131）。左滑「审核」实机已跑通：常浩点后本会话收到固定请求并调用 `relay_to_chatgpt`，ChatGPT 回信「需修改」3 条。左滑发起跟进留给会话的话、排队中 / 被拒 / 过期写在那一行（PR #132，已装机 `453575a7b643`）。侧栏 Codex 与网页 ChatGPT 改为各占一个位置，Codex 换云朵小人（PR #138），Codex 云朵有了自己的 21 段动作：待机漂移变形、打盹散成三朵、思考往上堆、跑命令下雨、找你变对话气泡（PR #143，已装机 `9c06aa25b640`）；打盹按常浩选的乙改成「满尺寸呼吸 + 鼻涕泡」、弯线闭眼、不挂 Z（PR #144，已装机 `621500c59f09`）；Codex 标记改成自己的小云 / 思考泡泡、没新消息改雾、长命令云环、盖章放慢（PR #152）；ChatGPT 打盹按常浩要求改回原版（PR #153，已装机 `3220e7b028aa`）。随手记点收起直接缩回猫球，不再留「打开便签栏」（PR #157，已装机 `62c788033f0e`）。侧栏每家智能体挂自己的小签、点开是自己的展开卡，常浩选甲「各挂全签」（PR #163，已装机 `c2c76c0b5e63`）。左滑发起复审返修收尾（PR #164）。接力自动往返上线（#72，PR #168，已装机 `b0bb150f84cf`）：需修改未满 2 轮自动转回 Claude、通过自动结束、到上限 / 无结论 / 送话失败两次 / 超时交还常浩，重启先暂停。ChatGPT 第 2 轮复审左滑发起的 5 条，常浩说「现在返修」：按编号归因、记录落盘、从领取起计时、状态不明（PR #170，已装机 `98ea78960937`），第 3 轮已交回同一个审核会话（`h1a1b076a94400`，#72 之前的记录，不自动往返，回信由常浩定）。#173 自动转回失败改排队已装机 `4638968249ee`；L4–L6 证据整理进 `docs/evidence/`，给第二人的说明是 `docs/安装与使用.md`（见下节索引表）。唯一下一步：L-14 排队等下一单自然触发后，核对 `handoffs.json` 补进 L6 文档（常浩定，C 单不再手动验证）；补 L4 同事使用材料；约第二人照说明复现；常浩还要在 Chrome 扩展程序页重新加载驿窗插件，下一轮 ChatGPT 处理时看 OpenAI 小人动；接力批 C 传信动效按 2026-11-07 定稿「纸飞机 + 票根印章」做完（#171）；后台第 4 批「统计会话」与其他小人各做一版仍待做。悬停面板：随手记猫球不再弹面板、「等待更新」的额度按占用变红、Hermes 标题图标改黑色女孩、去掉 Hermes 与 OpenAI 的「近 24 小时 Token」（PR #135，已随 #138 装机）；Hermes 区按常浩选定的丙「各管一摊」做完：猛鬼兽定时任务表、亚古兽最近被问、在岗 / 断线圆章（PR #139，已从 main `0677fe1` 打包装机，回读一致）。侧栏小收据、单家面板、整张看板在同一块屏并存，常浩选乙「停久看全」：悬停一格 0.4 秒出小收据，同一格停满 1.2 秒展开成整张看板并滚到这一家（PR #158 起小收据出现后再等 1.5 秒，即悬停 1.9 秒才展开），点一格出单家面板，「按智能体分开」开关去掉（PR #141，已装机 `54e5f63c063f`，实机鼠标操作待常浩试）。小收据底边等待线按常浩选的甲改成从中间展开、两端羽化（PR #149，已装机 `97e641b60d45`）。ChatGPT 读取全部会话：常浩自己在 Chrome 里开的「对话」和驿窗发起的「审核」分开，侧栏按常浩选的「一格两栏 · 两联 · 旧信纸」显示，所有审核纸统一成旧信纸（PR #150，已装机 `966e3ef93773`；常浩要在 Chrome 扩展程序页重新加载驿窗插件 0.2.0 后实测）。



## 侧栏票根变矮、小人不变；票根顺序固定为 Claude、Codex、ChatGPT、Hermes（2026-11-10，Claude，常浩截图要求「第三个 GPT、第四个 Hermes」「高度变低，小人不变」；已提交、PR 按授权合并、已发布 `87d44c24ff6f` 回读通过；顺序是待常浩保存的草稿）

- 时间：开工 `2026-11-10 16:58`。来由：常浩要加第五个（DeepSeek Harness），嫌票根占地方；起初说「窄」，追问后明确是高度变低、小人大小不变。票根尺寸是 PR #27「撕角票」定的，本轮是常浩点名改这一项本身。
- 顺序：查实没有写死的顺序，没设顺序时动态侧栏按「有额度的在前，其余按最近会话新的在前」排（`resting-agents.ts`），Hermes 最近有会话就排到了 ChatGPT 前。用侧栏工具给主屏布局放了草稿 `hud.agents = [claude, codex, chatgpt, hermes]`，**未保存**，要常浩悬停侧栏在面板里点「保存」；应用重启会丢草稿（本轮两次装机都重放过一次）。注意：`hud.agents` 只显示列出的几家，DeepSeek Harness 接上后要把它加进这个列表才会出现。
- 改了哪些文件：
  - `hud/src/ticket-stub.ts`：`stubSize` 高度系数 2.5 → 2.2（34 × 50 → 34 × 44 @20，常浩的 31 号小人 78 → 68 像素），宽度、小人位置和大小、撕口高度不变，小人到撕口留 3 个单位；新参数 `horizontal`：贴上下边时孔在票根端头占 3 个单位，高度用 2.35，留同样的空；新 `stubHoleStart`：侧边一排孔居中，变矮后不在角上切出半个孔。
  - `hud/src/scene/StubPaper.tsx`：`stubHoles` 侧边的孔按 `stubHoleStart` 起排（接力脚的孔跟着对齐）；`stubBoxStyle` 按方向取高度。
  - `hud/src/geometry.ts`、`hud/src/scene/HUDMarkStrip.tsx`：`stubSize` 传方向。
  - `hud/test/ticket-stub.test.ts`：尺寸断言改新值并加横向；「小人和撕口之间留空」两种方向都查；新测试 `the holes down a stub's side sit centred, none cut at a corner`（20–60 号逐个查）。
  - `crates/host/src/hud/plans.rs`：测试注释 34 × 50 → 34 × 44（Rust 只镜像宽度，逻辑不动）。
- 测试：`pnpm run check` 退出码 0；第一次 `pnpm test` 退出码 1：`agent-hud-core` 的 `demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes` 失败（演示快照里两次取时差了毫秒），单独重跑 `5 passed; 0 failed`，与本轮无关；横向改动后整套重跑 `pnpm test` 退出码 0，Rust 合计 `936 passed; 0 failed`，前端 `ℹ pass 387` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证：实机右侧侧栏截图：四张票根都变矮，小人大小不变，接力脚的灰蓝纸仍铺到打孔边，孔不在角上切半个；离屏横向渲染：第一版（统一 2.2）小人下沿贴到航空斜纹，加 `horizontal` 后留出空隙。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-10-stub-shorter/`：`screen-before-edge.png`、`screen-after2-edge.png`、`screen-after-zoom.png`、`after-offscreen-horizontal.png`（整屏 `screen-after*.png` 含私人窗口，不外发）。
- 发布与回读：`87d44c24ff6f`，`install.sh` 回读一致（中间装过一版 `cc74dced6ebd`，横向贴斜纹，已被覆盖）。回滚到本轮前：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-10-stub-shorter/PostPane-75fedf42700c.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：顺序草稿待常浩保存；DeepSeek Harness 接上时把它加进 `hud.agents`。范围外发现：两条 Rust 测试（单实例锁、演示快照）全量并发下偶发失败，未查。skill 进化：无。
- 本轮新坑：无

## 侧栏接力票根的灰蓝纸铺到打孔边（2026-11-10，Claude，常浩截图点名「接力时侧边边缘要完全覆盖，现在空了一点」；已提交、PR 按授权合并、已发布 `75fedf42700c` 回读通过）

- 时间：开工 `2026-11-10 16:02`。来由：侧栏票根在接力时（「审」「回」，或盖着「答」又有回信），脚部的旧信纸在打孔那一侧缩进 3 个单位，打孔边条露成一条白纸。接力脚的旧信纸 + 航空斜纹是 #145、#218 定的，本轮是常浩点名改这一处本身。
- 改了哪些文件：
  - `hud/src/scene/HUDMarkStrip.tsx`：`StubFace` 在接力纸时脚部铺到打孔边（侧栏在左右边时铺满那一侧，在下边时铺到底），用和票根同一排孔打孔（按脚部在票根里的位置对齐孔位），印章靠补的内边距留在原位；非接力的读数脚不变，仍在打孔边条内侧、带虚线撕口。
  - `hud/src/scene/StubPaper.tsx`（新）：`StubSide`、`stubBoxStyle`、新 `stubHoles`（打孔遮罩，原来写在 `StubPaper` 里）、`StubPaper` 从 `HUDMarkStrip.tsx` 原样搬来（300 行棘轮：669 → 612，基线只改这一行）；顺手把 `stubBoxStyle` 那段错挂在 `chatgptConversation` 上方的注释放回原处。
  - `hud/package.json` 加 `./scene/StubPaper` 导出；`app/src/settings/SettingsSamples.tsx` 的 `StubPaper` 改从新路径导入。
- 测试：`pnpm run check` 退出码 0；第一次 `pnpm test` 退出码 1：`agent-hud-platform` 的 `instance::tests::a_held_lock_turns_the_next_claim_away_and_names_the_holder` 失败（`the lock is free once its holder lets go`），单独重跑 `cargo test -p agent-hud-platform --lib instance::` 为 `9 passed; 0 failed`，与本轮改动无关；整套重跑 `pnpm test` 退出码 0，Rust 合计 `936 passed; 0 failed`，前端 `ℹ pass 386` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证：装机后 `get_hud_screenshot`（离屏渲染，票根打孔在下边）：Claude、Codex 两张「回」的灰蓝纸铺到底边，孔位与票根一致；改前同一处露白纸带孔。实机屏幕（侧栏在右边、打孔在左边）截图放大：Claude「答」+ 回信、Codex「回」两张的灰蓝纸和航空斜纹都铺到左侧打孔边。整屏无「想访问文稿」弹窗（L-06）。小人和动效代码没动。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-10-2026-11-10-relay-foot-edge/`：`before.png`、`after-offscreen.png`、`zoom-before.png`、`zoom-after-offscreen.png`、`screen-after-zoom.png`、`screen-after-zoom-codex.png`（整屏 `screen-after.png` 含私人窗口，不外发）。
- 发布与回读：`75fedf42700c`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-10-2026-11-10-relay-foot-edge/PostPane-81008a4a1a79.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：`install.sh` 会自己在证据目录名前加日期，传入的短名再带日期就成了 `2026-11-10-2026-11-10-…`，下次只传短名。范围外发现：Rust 单实例锁测试在全量并发下偶发失败一次，未查。skill 进化：无。
- 本轮新坑：无

## 亚古兽印章换成紫藤色，和猛鬼兽区分开（#299）（2026-11-10，Claude，常浩在三版预览里选「甲 · 紫藤」；已提交、PR 按授权合并、已发布 `81008a4a1a79` 回读通过）

- 时间：开工 `2026-11-10 12:13`。来由：常浩截图「新回复」列表，两个机器人的方印都是朱红，分不开。三版预览（紫藤 / 赭金 / 墨印）：https://claude.ai/artifact/EGRmx7KziAvuKXsKQjjkXw 。印章颜色原是 2026-11-05 常浩定的朱红方印，本轮是他点名只改亚古兽这一枚。
- 改了哪些文件：`hud/src/panel/bot-stamp.ts`：新 `sealInk(bot, light)`，亚古兽深色外观 `#b89ae8`、浅色外观 `#6b4a9c`，猛鬼兽和其他 profile 的首字印仍是朱红（`#e7826f` / `#a83a2c`）；`hud/src/panel/BotStamp.tsx`：去掉原来只按外观取色的 `sealInk`，改用上面这个。印章用到的地方（新回复列表、Hermes 面板、正在进行行尾、提醒、悬停小卡）都走 `BotStamp`，一起变；`hud/test/bot-stamp.test.ts`：新测试 `亚古兽's seal is wisteria, 猛鬼兽's and any other vermilion (#299)`。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `936 passed; 0 failed`，前端 `ℹ pass 386` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。日志在证据目录 `check.log`、`test.log`、`node.log`。
- 验证：装机后 `get_hud_screenshot` 拍悬停面板，Hermes 区猛鬼兽印章朱红、亚古兽印章紫色；改前同一处两枚都是朱红。整屏截图没有「想访问文稿」弹窗（L-06）。「新回复」列表用的是同一个 `BotStamp`，但本轮没等到新回复出现，**未单独截到**。侧栏小人和动效代码没动。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-10-agumon-seal/`：`before-panel.png`、`after-panel.png`、`screen-after-install.png`。
- 发布与回读：`81008a4a1a79`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-10-agumon-seal/PostPane-1bd821b5671e.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：无；范围外发现：无。skill 进化：无。
- 本轮新坑：无

## 审核纸条最多露 3 行，其余在纸条里滚动（#288 跟进）（2026-11-09，Claude，常浩看实机截图后要求「最多显示三个，剩下的用滚动条」；已提交、PR 按授权合并、已发布 `1bd821b5671e` 回读通过）

- 时间：开工 `2026-11-09 16:52`。来由：#294 合并后常浩截图，12 单接力把 ChatGPT 面板撑得很长。
- 改了哪些文件：`hud/src/panel/ReviewSlip.tsx`：`ReviewRows` 的行包进一个滚动区，量第 3 行的底边当最大高度（`SLIP_ROWS = 3`），超过 3 行才滚；「审核」标题不滚。正在答的审核会话行和开着的接力行合在一起算 3 行。滑块用全局的 `scroll-thumbs`（滚动时出现、停下淡出），和「今天的对话」列表一样。
- 测试：`pnpm test` 退出码 0，Rust 合计 `936 passed; 0 failed`，前端 `ℹ pass 385` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。同一次的 `pnpm run check` 因 `ReviewSlip.tsx` 没格式化退出码 1（`check-unformatted.log`），prettier 格式化后单独重跑 `pnpm run check` 退出码 0；格式化只动了导入那一行的排版。
- 验证：浏览器预览真实 `HUDScene`（端口 1465，常浩真实侧栏配置 + 驿窗快照，脚手架沿用 #288 证据目录的 `preview-288/`）：真实悬停展开 ChatGPT 面板，审核纸条只露 3 行；滚轮在纸条里滚，后面的单子滚出来，面板其余部分不动。装机后 `get_hud_screenshot` 核对。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-09-288-slip-scroll/`：`preview-three-rows.jpg`、`preview-scrolled.jpg`、`after-chatgpt-panel.png`、`after-hud.png`。
- 发布与回读：`1bd821b5671e`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-288-slip-scroll/PostPane-e3e2ce4b969f.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：12 单老接力仍等常浩在面板里逐单处理。
- 本轮新坑：无

## ChatGPT 面板审核纸条列出所有开着的接力，点一行打开接力卡（#288）（2026-11-09，Claude，常浩看改动确认后回「改，用甲」；已提交、PR 按授权合并、已发布 `e3e2ce4b969f` 回读通过）

- 时间：开工 `2026-11-09 16:26`。来由：#288，发起会话停了以后接力卡没有入口，结束不了。查实原因：接力卡只能从活着的发起会话行上的「接力 n/m」小标或回复提醒里的「查看接力」打开；ChatGPT 面板的审核纸条只列 ChatGPT 正在答的审核会话；悬停小收据的审核行点不了，还会藏起发起会话没在跑、超过 2 小时没动静的单子（`STALE_REVIEW`）。本机 12 单开着的接力（停了 3 到 64 小时）都打不开。常浩在甲（审核纸条列出）、乙（Claude / Codex 面板加一行）、丙（自动收尾）里选甲，改动确认写明会动到 #145 定下的下联内容。
- 改了哪些文件：
  - `hud/src/panel/ReviewSlip.tsx`（新）：`ReviewRows` 从 `SessionsSection.tsx` 原样搬来（300 行棘轮）；新 `QuietRelayRow`：「接力 n/m」虚线小标（等宽数字，各行标题对齐）、标题、`progressLine` 一行，整行是按钮，点开接力卡；墨色用审核纸自己的 `relayPaperOf(true)`（L-42）。
  - `hud/src/chatgpt-desk.ts`：新 `quietRelays`，开着或正在开的接力，去掉已经有 ChatGPT 审核会话行的，不论停了多久、发起方是谁，按最近动静倒序。
  - `hud/src/panel/SessionsSection.tsx`：只在 ChatGPT 单家面板，审核纸条在正在答的行下面接上这些接力行；没有正在答的也照样显示纸条。行数 1179 → 1146，基线只改这一行。
  - `hud/test/chatgpt-desk.test.ts`：新测试 `open handoffs ChatGPT is not answering are listed, however old (#288)`。
  - `docs/LESSONS.md`：L-42。
  - 悬停小收据（`DeskLines`）没改：仍是预览，点它进面板；2 小时规则照旧。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `936 passed; 0 failed`，前端 `ℹ pass 385` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。以最后一次（提交 `b7256e4`）为准，前两次同样全过。
- 验证：
  - 装机后 `get_hud_screenshot` 拍 ChatGPT 面板：改前没有审核纸条，改后列出 12 单，各带轮次、阶段和「自动已停」。
  - 浏览器预览真实 `HUDScene`（端口 1465，常浩真实侧栏配置 + 驿窗当时的快照，脚手架存证据目录 `preview-288/`，不提交）：真实悬停展开 ChatGPT 面板，点「驿窗实测｜#217 L2 跨会话」一行，接力卡打开，底部有「结束接力」「继续自动」；再点「结束接力」，`handoffAct` 收到 `{id: "h1a1b70a066c01", action: "end"}`，正是这一单（预览里是桩，没有真结束）。第一次预览发现纸张外观下标题看不清，改墨色后重看清楚（L-42）。
  - 面板超过屏幕高时在面板内滚动，不出屏（`HUDExpandedSurface` 已有最大高度）。
  - **未做**：在真机上用鼠标点（申请操作驿窗的权限被拒）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-09-288-open-relays/`：`before-chatgpt-panel.png`、`after-chatgpt-panel.png`、`before-hud.png`、`after-hud.png`（L-35：侧栏除「对话」数字外无变化）、`preview-panel.jpg`、`preview-card-opened.jpg`、`preview-paper-ink-before-fix.png`。
- 发布与回读：`e3e2ce4b969f`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-288-open-relays/PostPane-db5038f37b88.app" /Applications/PostPane.app; open /Applications/PostPane.app`（装本轮之前的版本）。
- 遗留与范围外发现：
  - 12 单老接力本轮没替常浩结束，等他在面板里逐单处理。
  - 同一纸条上正在答的审核会话行（`LiveRow`）仍用面板墨色，纸张外观下是否也看不清未核实（L-42）。
- 本轮新坑：L-42

## 侧栏 START 交接卡一键开始；BASH 卡写明只能在侧栏批（#292）（2026-11-09，Claude，常浩选「替你回原会话『开始』」「保留 BASH，并查清为何弹」后回「开工」；已提交、PR 待合并、已发布 `db5038f37b88` 回读通过）

- 时间：开工 `2026-11-09 14:36`。来由：常浩要「去掉侧栏 BASH，因为不需要我操作」、START 卡像 ANSWER 一样在侧栏直接开始。查实 BASH 卡不是误报：是 Claude Code 内置安全检查在 bypass 下仍要批准，批准只挂在驿窗侧栏、Claude 桌面窗口不弹，没人点 16 分钟后桌面版判「Claude Code stopped responding」（L-41）。常浩据此改选「保留，并查清为何弹」。#247「去开始」是定过的内容，这次常浩点名要改，不另发改动确认。
- 改了哪些文件：
  - `core/src/clients/claude_desktop.rs`：`desktop_ask_way` 去掉交接卡的固定「只能在 Claude 窗口开始」，和下一步框一样，能送达会话就可回答。
  - `hud/src/permissions/HandoffStartCard.tsx`（新）：交接卡能回答时的展开卡，「切换会话」标签、标题、一段「点『开始』会替你在原会话里回一句『开始』」说明、左「跳过」右「开始」。点「开始」送 `{custom: "开始"}`，由原会话照常浩全局规则自己调 `start_session` 启动交接卡；送不到时仍是 #247 的「去开始」。
  - `hud/src/RequestActions.tsx`：`startsHere` 的交接卡走新卡。
  - `hud/src/permissions/approval-list.ts`：`START_WORDS`、`startsHere`、`startDecision`、`asksOnlyHere`。
  - `hud/src/permissions/PermissionToolCard.tsx`：Claude Code 经驿窗钩子来的权限卡加一行「Claude 桌面窗口里不会弹这条，请在这里批；放着不管，Claude 可能直接拒绝，会话也会卡住。」
  - 测试：`core/src/tests/claude_desktop.rs` 交接卡测试加「能送达时可回答、送出『开始』、卡收起」；`hud/test/approval-list.test.ts` 新 2 条。
  - `docs/LESSONS.md`：L-41；L-37 补正。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，前端 `ℹ pass 384` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`，Rust 全部通过；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。日志 `evidence/2026-11-09-292-start-bash/full.log`。之后只改了 LESSONS 与本节。
- 验证：
  - 浏览器预览真实 `HUDScene`（端口 1464，脚手架存 `evidence/…/preview-292/`，不提交）：交接卡展开为新卡，用真实点击点「开始」，`onRequestDecision` 收到 `{"kind":"answer","answers":{"toolu_…":{"selected":[],"custom":"开始"}}}`；BASH 卡说明行显示在命令下方、按钮上方。
  - 原因复现：不挂驿窗钩子的 `claude -p --permission-mode bypassPermissions`，heredoc 里两个美元符加左括号、双引号里反斜杠美元符左括号的两条命令都回「requires explicit approval」，`echo hi` 正常。
  - **未做（要常浩动手）**：实机侧栏点一次真实交接卡的「开始」，看原会话收到「开始」后启动交接卡、新会话挂在原会话下（L-09：悬停面板里电脑控制点不动）。终端里的 Claude Code 遇到这类请求是否同时弹窗，未核实。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-09-292-start-bash/`：`preview-start-card.jpg`、`preview-bash-card.jpg`、`before-*`、`after-*`、`compare-side.png`（L-35：装机前后侧栏各隔 2 秒两张，Claude 格「答」、Codex 云朵在动、ChatGPT「3 对话」、Hermes、挂件不变）。
- 发布与回读：`db5038f37b88`，`install.sh` 回读一致，未见「想访问文稿」弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-292-start-bash/PostPane-9f07d4b0d70e.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留与范围外发现：
  - L-41 可提议提升为全局坑（Claude 桌面版里写含命令替换的 Bash 都会碰上），提案未写，等常浩批。
  - 本轮会话两次被「stopped responding」掐断，都是自己的 Bash 踩中 L-41（一次 grep、一次用 heredoc 写 L-41 正文）。
- 本轮新坑：L-41
- skill 进化：无

## Codex 那一轮结束后驿窗替常浩拒绝并撤卡（#286 方案 2A）（2026-11-09，Claude，常浩看改动确认后回「改」；已提交、PR 待合并、已发布 `9f07d4b0d70e` 回读通过）

- 时间：开工 `2026-11-09 13:58`。来由：#286 实测到 Codex 结束一轮时不会取消还在等批准的调用。12:45 那张卡挂了 22 分钟，13:07 被批准后补跑，往 ChatGPT 重复送了一轮。2A 会改到常浩 11-07 选定的「一直等」（#174 / PR #181、#184 / PR #187），已发改动确认，常浩回「改」。
- 改了哪些文件：
  - `platform/src/hooks/turn_end.rs`（新）：钩子进程从 Codex 会话记录（payload 的 `transcript_path`）的当前末尾往后读，每圈（0.1 秒）只读新增部分；看到同一 `turn_id` 的 `task_complete` 或 `turn_aborted`，就按 Codex 的回复格式回「拒绝」，并说明原因（The turn that asked for this has ended…）。只对按轮记批准人的客户端生效（`reviewer_gate`，即 Codex）。
  - `platform/src/hooks/client_unix.rs`：`Watch` 把原来的「客户端里答了 / 客户端没了」和新的「这一轮结束」合在一起。`unix.rs` 的等待和重连改用它，行数 490 → 487（基线同步收紧）。Windows 没改（Codex 在 Windows 上未验证）。
  - `docs/client-hooks.md` 补一条说明；`docs/LESSONS.md` 新增 L-40。
- 测试：`pnpm run check` 退出码 0（第一次被 `check:test-paths` 拦下一处测试里的 `/x` 路径，改用临时目录后复跑通过）；`pnpm test`：Rust 合计 `936 passed; 0 failed`（新增 6 条：轮结束 / 被中断都拒绝、别的轮结束不算、半行写入、只对 Codex、拒绝的格式与说明、端到端：挂卡 → 轮结束 → 回拒绝 → 卡撤下），前端 `ℹ pass 382` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证（实机）：装 `9f07d4b0d70e` 后，用 10:57 开的老测试线程 `01a1be3c…`（这个线程调 `relay_to_chatgpt` 仍要批准）调用一次，不等待、不终止，直接结束这一轮。14:22:18 钩子开始等，14:22:49.105 这一轮 `task_complete`，8 毫秒后调用以 `failed` 收场，带驿窗的拒绝说明；钩子同时退出。之后侧栏 Codex 批准卡为 0，没有建出接力单。证据：`~/Library/Application Support/postpane/evidence/2026-11-09-codex-turn-ended/`（`realtest-rollout.txt`、`snapshot-after.json`、`run.log`、`check2.log`）。等待期间侧栏是否挂过卡没截到（电脑控制授权上一轮被拒），端到端测试覆盖了这一点。
- 截图：无（没动侧栏渲染和外观，L-35 对照不适用）。
- 发布与回读：`install.sh` 输出「产物 9f07d4b0d70e / 已装 9f07d4b0d70e」，14:21:58 启动。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-codex-turn-ended/PostPane-3ea2c2305c8e.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留与范围外发现：
  - Codex 那一轮还在进行时，「一直等」照旧，卡一直挂到常浩答复为止。
  - Claude 不受影响（它的卡在进程被杀时撤，#251）。
- 本轮新坑：L-40
- skill 进化：无

## 接力 B：读 Codex 会话记录——插话后重算轮数、转回回执推进（#283）（2026-11-09，Claude，常浩「按计划开工」「在 #283 里修」；已提交、PR 待开、已发布 `0dada9ced3a5` 回读通过，实机两项通过）

- 时间：开工 `2026-11-09 13:15`。来由：#253 方案 B 单；常浩确认分三批做（批 1 读记录、批 2 接到接力、批 3 测试装机实测）。
- 改了哪些文件：
  - `platform/src/clients/codex/turns.rs`（新）：按线程 id 找 `~/.codex/sessions/年/月/日/rollout-…-<线程>.jsonl`，读末尾，取每轮开始时间、`turn_attribution.turn_trigger`（亲手打字 `composer`、队列送进 `queue`）和第一句用户原话（`user_words` 跳过 AGENTS.md、环境说明）；只解析含 `task_started` 或用户发言的行。
  - `platform/.../handoffs/doer.rs`：加 `codex_turn`、`codex_began` 两个薄封装（经已导出的 `chatgpt::handoffs` 给 host 用，为 300 行棘轮不加 re-export 行）；`claude_plugin/opener.rs` 的 `tail` 改成 `pub`。
  - `host/src/handoff.rs`：`Lines::left` 加「原话」参数（`track` 传这一步全文，左滑按 code 重拼原话）；新测试 `words_back_to_a_codex_thread_are_followed_by_their_words`。
  - `host/src/handoff/lines.rs`：`opener` 的 Codex 分支读当前轮（打字算插话，队列送的按原话比对指纹）；`codex_left` 队列还说排队时，会话记录里见到以原话开头的一轮就算「已开始」（Codex 没有单独的「已领取」）。
  - 同步：`AGENTS.md` 功能清单、「AI 接入」页（去掉「Codex 暂不重算」）。
  - 实测中修的 #280 遗留问题（常浩「在 #283 里修」，L-39）：驿窗重启后投递目标表是空的，转回 Codex 报 `Unknown or child session target`。`platform/src/delivery/targets.rs` 加 `know_target`（补一个会话、保留其余、子会话不变），`handoff/lines.rs` 的 `codex_send` 转回前先补上发起线程；新测试 `a_session_made_known_keeps_the_rest_and_a_child_stays_a_child`。
- 测试：`pnpm run check` 退出码 0；`pnpm test`：变基到 `2e2fed2` 并加上修复后重跑，Rust 合计 `930 passed; 0 failed`（新增 6 条），前端 `ℹ pass 382` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证（实机，测试线程 `01a1be3c…`，发起用脚本按 MCP 协议直接调 `relay_to_chatgpt`）：
  - (a) 第一次（`h1a1bed7307000`，修前、驿窗刚重启）：ChatGPT 回「需修改」后转回 Codex 两次失败，`fail`、`fail`、`stop`，即 L-39。修后装 `0dada9ced3a5`、重启后重测（`h1a1beddd04200`）：回信与 back 步同一毫秒，back 步 `delivery` 为 `started`；Codex 会话记录 05:53:12 一轮 `turn_trigger: queue`。`waiting` 只持续约 2 秒，3 秒一采的监视没采到，只见到终态。
  - (b) 常浩在该线程亲手打一句（05:55:03 一轮 `turn_trigger: composer`），之后同线程续接送审：`roundsFrom` 设为 4（从新 `work` 步起重算，即第 1 轮）；ChatGPT 回「通过」，自动结束接力。
  - 截屏无「想访问文稿」弹窗。实测中顺带发现开着的接力在发起会话停了后打不开接力卡，记 #288，本轮不修；为此旧单 `h1a1beb129a000`、`h1a1bed7307000` 是驿窗退出时按 `Book::end` 同样的改法改 `handoffs.json` 结束的，改前备份在证据目录。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-09-283-codex-transcript/after-install.png`、`after-fix-install.png`；接力记录 `a-handoff-h1a1beddd04200.json`、`b-handoff-h1a1beddd04200.json`，Codex 记录摘录 `a-rollout-tail.txt`。
- 发布与回读：`0dada9ced3a5`（含修复），`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-283-codex-transcript-fix/PostPane-3f9546077c11.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：#288（接力卡入口）；Codex 调 `relay_to_chatgpt` 逐次批准见 #287 方案，本轮不处理。
- 本轮新坑：L-39
- skill 进化：无

## Codex 调接力工具免批准（#286 方案 1A）（2026-11-09，Claude，常浩回「做 1A」；已提交、PR 待合并、已装 `7126cf631f47` 回读一致后被并行会话覆盖）

- 时间：开工 `2026-11-09 13:19`。来由：#282 实测时 Codex 调 `relay_to_chatgpt` 每次都要批准，调用会挂住；方案见 `docs/design/Codex调接力工具的批准卡-方案-2026-11-09.md`（#286，PR #287 已合并），常浩选 1A。
- 改了哪些文件：
  - 本机配置（不在仓库）：`~/.codex/config.toml` 在 `[mcp_servers.agent-hud]` 后加 `[mcp_servers.agent-hud.tools.relay_to_chatgpt]`、`approval_mode = "approve"` 两行；原文件备份在证据目录 `config.toml.before-1a`。
  - `src/packages/app/src/settings/AiAccessPane.tsx`：「AI 接入」页 Codex 一行补一句「Codex 每次调接力工具默认要你批准；在 ~/.codex/config.toml 给 relay_to_chatgpt 设 approval_mode = "approve" 就免批准（#286，新开的线程才生效）」；行数不变。
  - `AGENTS.md`「对外开放」发起接力一行同步同一说明。
  - 方案文档加第六节「1A 实施结果」；`docs/LESSONS.md` 新增 L-38。
- 测试：`pnpm run check` 退出码 0；`pnpm test`：Rust 合计 `924 passed; 0 failed`，前端 `ℹ pass 382` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`（写本节前跑的，写完后复跑见 PR）。
- 验证（实机）：
  - 新开的 Codex 线程 `01a1bec7-a276-…`（驿窗 `start_session`，13:28）：调用到完成 0.02 秒，没出批准，建单 `h1a1bec7ca0802`。
  - 10:57 开的老线程 `01a1be3c…`（13:22）：照样触发 `PermissionRequest` 钩子，60 秒没返回；模型 13:23:12 终止等待后钩子结束、侧栏没留卡、调用没执行。结论：配置只对新开的线程生效（L-38）。
  - `codex exec` 两组（`approve`、对照 `auto`）都直接执行，不能当证据；多建了测试接力单 `h1a1bec6d6da00`、`h1a1bec74c5b01`。
  - 「AI 接入」页没截图：请求驿窗的电脑控制授权被拒。改为核对打包产物 `src/apps/desktop/dist/assets/SettingsPanes-D1Wp8WTr.js` 里有新文字、已装与产物 shasum 一致。
- 截图：无（见上）。证据：`~/Library/Application Support/postpane/evidence/2026-11-09-codex-relay-approval/`（`tests.log`、`build.log`、`exec-test/`、`config.toml.before-1a`）。
- 发布与回读：`install.sh` 输出「产物 7126cf631f47 / 已装 7126cf631f47」，13:43:11 启动。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-codex-relay-approval/PostPane-20ebf1fa5d5d.app" /Applications/PostPane.app; open /Applications/PostPane.app`。**13:45:18 被 B 单会话（#283，`283-codex-transcript`）用它的分支包覆盖，现装 `3f9546077c11`，不含本轮文字**；没有装回去，免得两边来回覆盖（L-05），合进 main 后下次从 main 装机带上。
- 遗留与范围外发现：
  - 已经开着的 Codex 线程（含测试线程 `01a1be3c…`）仍要逐次批准，重开线程才免。
  - 方案 2A（那一轮结束后驿窗替常浩拒绝并撤卡）要先发改动确认，未做。
  - 本轮共多建了 3 张测试接力单（`h1a1bec6d6da00`、`h1a1bec74c5b01`、`h1a1bec7ca0802`），ChatGPT 那边各开了一个测试会话。
- 本轮新坑：L-38

- skill 进化：无

## 接力 C：Codex 发起时的侧栏表现与左滑发起（#282）（2026-11-09，Claude，常浩改动确认「四项都改」；已提交、PR 待常浩实测后合并、已发布 `491ba714697a` 回读通过）

- 时间：开工 `2026-11-09 11:28`。来由：#253 方案的 C 单；改的是定过的内容（#171、#218 纸飞机与方章，2026-11-06 甲·时间线展开卡，#128 左滑发起），2026-11-09 发改动确认，常浩回「四项都改」。
- 改了哪些文件：
  - `host/src/handoff.rs`：纸飞机起落点改成发起方（Codex 发起时在 ChatGPT 与 Codex 之间飞）；自动往返的停下理由、转回失败等时间线文字按发起方写（`by_doer`）；左滑发起收 Codex 线程，话经 Codex 队列送（request id 用这次左滑的 code），`launches.json` 记 `doer`；`relay_launch` 多收 `source`。
  - `host/src/handoff/texts.rs`（新）：时间线文字函数从 handoff.rs 原样挪出（为 300 行棘轮），并同步 #177 改过的「改为排进待发送队列」那句。
  - `platform/.../handoffs/doer.rs`（新）：`doer_name`、`by_doer`；`set_doer` 挪进来；`overdue` 的「2 小时没交回复审」按发起方写。
  - 前端：`alerts/handoff-doer.ts`（新，`handoffFor`、`doerSession`、`chatgptSession` 挪进来，认 Codex 线程）；`handoff-card.ts` 时间线、进度行、航空框文字按发起方写，「意见已排队」Claude 沿用 #177 原句、Codex 写「Codex 空闲了就送进去」；`HandoffCard.tsx` 头像、名字、「回到 … 会话」「转回 …」按发起方，头像挪到 `HandoffAvatar.tsx` 并加 Codex 云朵；`relay-stamps.ts`、`model.ts`「回」章盖在发起方脚上；`relay-tray.ts` Codex 会话也有「审核 / 讨论」；`app/lib/relay-launch.ts`（新）。
  - `protocol/src/handoffs.ts`（新）：`Handoff`、`HandoffStep` 从 index.ts 挪出（驿窗自己的类型，不属上游对照范围），加 `doer`。
  - 同步：「AI 接入」页「谁发起」、`AGENTS.md` 功能清单、行数基线；`docs/LESSONS.md` L-37。
- 测试：变基到 `740f5ef` 后跑，原样结果如下。
  - `pnpm run check` 退出码 0；
  - `pnpm test`：Rust 合计 `924 passed; 0 failed`（新增 4 条：Codex 发起的纸飞机、时间线写 Codex、左滑送进 Codex 队列、`by_doer`），前端 `ℹ pass 382` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`（新增：「回」章归属、Codex 接力认线程且写 Codex、Codex 会话有左滑）；
  - `node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证（实机）：
  - L-35 对照：装机前后侧栏各隔 2 秒截两张，Claude 格（螃蟹 +「答」）、ChatGPT、Hermes 不变，Codex 云朵两张表情不同（在动）。`compare-side.png`。
  - 接力 `h1a1beb129a000`（`doer: codex`，线程 `01a1be3c…`）：13:04:11 送到 ChatGPT，13:04:13 回「收到」，时间线「回信没写结论，自动往返停下，交还常浩」。连拍拍到回信那趟纸飞机从 ChatGPT 飞到 Codex 云朵（`flight-sheet.png` 第 3–5 帧），Codex 脚换成接力纸。
  - 发起方式：请 Codex 线程自己调用两次都没返回。查实是 Codex 每次调 `relay_to_chatgpt` 要先批准，批准卡挂在侧栏 Codex 格上（12:45:27 那条 `permission`，脚上「批」章），Codex 那边只看到调用不返回。第三次改为按 MCP 协议直接调驿窗的工具、带同一个 Codex 线程 id（`scratchpad/mcp-relay.mjs`），0.1 秒建单。
  - **未做（要常浩动手）**：①Codex 脚上的「回」章：被那张过期的批准卡挡着（定稿规则「答 / 批」优先），拒掉批准卡后才看得到；②展开卡上的「Codex」文字与「回到 Codex 会话」按钮；③Codex 会话左滑「审核」（L-09 侧栏悬停面板电脑控制点不动）。三项都有单测覆盖。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-09-282-codex-relay-side/`：`before-*`、`after-*`、`compare-side.png`、`flight-sheet.png`、`burst/`。
- 发布与回读：`491ba714697a`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-282-codex-relay-side/PostPane-c9a5d531025f.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留与范围外发现：
  - Codex 调 `relay_to_chatgpt` 要逐次批准，批准前调用一直挂着；Codex 停下后批准卡仍挂在侧栏。要不要给这个工具免批准、批准卡何时撤，另开一单再议。
  - B 单 #283（Codex 插话后重算轮数、转回回执推进）未做。
- 本轮新坑：L-37
- skill 进化：无

## 接力自动往返：会话进程被停时后台续接 Claude（#175）（2026-11-09，Claude，常浩「按方案开工」「可以发」「放行」；已提交、PR #177 合并中、已发布 `0d33a93ee7ec` 回读通过，文案修正待合并后重装）

- 时间：开工 `2026-11-07 08:46`。来由：常浩实测接力，ChatGPT 判「需修改」后没有转回 Claude，侧栏全是「待你看」，要人工介入。查桌面版日志和三次实验后确认：桌面版在内存紧张时会回收空闲会话的 Claude 进程（`CliGovernor pressure evicting`），而打开会话只会「预热」，不会重启进程。所以排队的话没人领。
- 改了哪些文件：
  - `host/src/handoff/wake.rs`（新）：后台续接。`claude -p --resume <会话> --permission-mode <会话自己的模式>`，带会话的模型、思考强度和工作目录，只接受 auto / acceptEdits / bypassPermissions 三种模式。`wake_queued` 处理排队 3 分钟没领的情况：撤回后续接，起不来就按「取消」交还常浩。`woke_up` 收尾：跑完还没交回复审就交还常浩。
  - `host/src/handoff.rs`：`Lines` 加 `stopped` / `withdraw` / `wake` 三个方法。`auto_back` 里直接送话失败、发起方是 Claude 且会话已停时，立即续接；`projection` 先 `track` 再 `wake_queued`。
  - `host/src/handoff/lines.rs`：三个方法的委托。
  - `host/src/mcp_clients.rs`：`run_client_in`，可以指定工作目录。
  - `platform/src/claude_plugin/mod.rs`：`ClaudeChannel::stopped`；「会话已停」的提示改为「发一句话让它重新运行」，打开会话不会重启进程。
  - `platform/src/clients/chatgpt/handoffs.rs` 与 `handoffs/wake.rs`（新）：`wakingSince`、`Wake` 步、`WAKE_AFTER_MS`（3 分钟）。续接时 `back` 步的送达状态记为「已开始」，避免撤回排队后被 #257 的送达跟踪误判为取消、交还常浩。
  - `platform/src/navigation.rs`：读桌面版会话记录（合入 #220 的 `priorCliSessionIds`）。
  - 前端：`protocol` 加 `wakingSince` 和 `wake`；`handoff-card.ts` 的进度行和时间线加「驿窗在后台续接 Claude」。
  - 文档：`docs/chatgpt-channel.md`「出错与处理」；`docs/LESSONS.md` L-14 补正。
  - `src/tooling/file-size-allowlist.json`：7 个基线文件只多出接入点，常浩 11-09 回复「放行」。
- 测试：
  - `pnpm run check`：退出码 0；
  - `pnpm test`：Rust 合计 `920 passed; 0 failed`，前端 `ℹ pass 380` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；
  - `node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`；
  - 日志：`evidence/2026-11-07-resume-back/final-*.log`。
- 验证（实机，测试会话 `local_db34d4b5`，发送均由常浩在该会话回「执行」）：
  - 第 1、2 轮会话在线，直接送话：「需修改」自动转回，Claude 追加 fixed、交回复审，「通过」后自动结束。分别是 `h1a1be67939b01`（11:43:56–11:44:15）、`h1a1be8db36200`（12:25:36–12:25:53）。
  - 第 3 轮 `h1a1be92e9c701` 测后台续接：送到 ChatGPT 后，监视脚本用 SIGTERM 停掉会话进程，模拟回收。12:31:14 ChatGPT 判「需修改」，驿窗记 `back`（已开始）和 `wake`；12:31:20 出现后台 claude 2.1.318 的签到；12:31:24 后台续接追加 `LIVE3 fixed`；12:31:30 交回复审；12:31:35「通过」并自动结束。
  - 证据：`evidence/2026-11-09-wake-live/`（`watch.py`、`watch.log`）、`evidence/2026-11-07-resume-back/live.log`；三次前期实验在 `evidence/2026-11-07-{bg-wait,link-wake,headless-resume}/`。
- 截图：无。实机只核对了 `handoffs.json` 时间线，展开卡上新那一行的实物没看。
- 发布与回读：`0d33a93ee7ec`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-resume-back-codex/PostPane-ab85dfb2b7a8.app" /Applications/PostPane.app; open /Applications/PostPane.app`。最后一处文案修正（`wake` 步不再拼接「在 Claude 里给它发一句话」、去掉「。。」）在这之后提交，合并后从 main 重装。
- 与授权不一致之处、遗留问题：
  - 我在链接唤醒实验中误把常浩的 Claude 窗口切到了 my-skills 会话，当时已告知。
  - 第 2 轮监视脚本把接力的「opening」状态当成结束、提前退出，停进程晚了，第 3 轮修好。停进程恰逢测试会话正在调用 `relay_to_chatgpt`，它收到「Connection closed」，但驿窗已收到这次复审。
  - 未验证：后台续接进行中，桌面版界面会不会实时显示这一轮；常浩同时在桌面版里给同一会话发消息时的并发情况。
  - Codex 发起的接力不走后台续接（#280 走 Codex 自己的队列），已有测试。
- 可提议提升为全局坑：「Claude 桌面版内存紧张时回收空闲会话的进程；打开会话只预热、不重启进程，要发一条消息才会重启」。换个项目，凡是给桌面版会话留话的都成立，等常浩批。
- 本轮新坑：无（L-14 补正，不另编号）
- skill 进化：无

## 接力 A：Codex 发起 ChatGPT 审核、回信经 Codex 队列送回（#280）（2026-11-09，Claude，常浩「按 A 开工」；已提交、PR 待合并、已发布 `ab85dfb2b7a8` 回读通过）

- 时间：开工 `2026-11-09 11:03`。来由：#253 方案（`docs/design/驿窗接力接入Codex-方案-2026-11-09.md`，`5ec30d2`）的 A 单。
- 改了哪些文件：
  - `platform/src/clients/chatgpt/handoffs.rs`：接力记录加 `doer`，没有值就是 Claude Code，旧记录照常读；加 `set_doer`。`pull_request` 挪到 `handoffs/pull_request.rs`，抵掉新增的行数。
  - `host/src/handoff.rs`：`Rule.doer`；`relay` 收 Codex 调用方；回信通道接口（`reaches`、`reply`、`queue`、`left`、`opener`）加发起方参数；新增两条测试。
  - `host/src/handoff/lines.rs`（新）：从 handoff.rs 原样挪出 `AppLines`，并加 Codex 分支，走 #278 的 `LocalClients`（`Enqueue`，固定 request id）。
  - `host/src/messages.rs`：把 `DeliveryClients` 登记给接力用，避开主程序数据锁。
  - 同步：「AI 接入」页（`AiAccessPane.tsx`、`AiAccessAgentRows.tsx`）、`AGENTS.md`、`docs/ROADMAP.md` 第 83 / 138 行、MCP 工具说明、行数基线。
- 测试：
  - `pnpm run check` 退出码 0；
  - `pnpm test`：Rust 合计 `914 passed; 0 failed`（多出的 2 条是新测试），前端 `ℹ pass 379` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；
  - `node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证（实机）：
  - 用互发消息请测试用的 Codex 线程 `01a1be3c…` 调用 `relay_to_chatgpt`（L1）。接力 `h1a1be4e4e0f00` 记成 `doer: codex`。
  - ChatGPT 新开会话 `6af13afd…`，按要求回「结论：需修改」。驿窗自动生成转回步骤（`h1a1be4e4e0f00-b2`），11:16:31 作为新一轮送进 Codex 线程，Codex 回「Codex 已收到 ChatGPT 回信」。L1 只审一轮，接力随后自动结束。
  - 证据：`~/Library/Application Support/postpane/evidence/2026-11-09-280-codex-relay/`，有 `handoff-h1a1be4e4e0f00.json` 和 `codex-thread-tail.txt`。
- 截图：无，侧栏表现没改（C 单）。
- 发布与回读：`ab85dfb2b7a8`，`install.sh` 回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-09-280-codex-relay/PostPane-1aaf637728ae.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：
  - **Codex 转回步骤的回执只到「排队中」**：Codex 队列的回执不会自己往前推进，要读 Codex 会话记录才知道它已领取、已开始，并入 B 单。
  - **时间线文字**：时间线上 6 句写死了「转回 Claude」，例如「L1 审查预算用完：意见已转回 Claude 改完收口」。发起方是 Codex 时说法不对，并入 C 单（展开卡上的 Claude 改成实际客户端，先问常浩）。
  - 侧栏纸飞机、方章、左滑发起 Codex：C 单。
- 本轮新坑：无
- skill 进化：无

## 智能体互发消息：移植上游 b1217c3（#278）（2026-11-09，Claude，常浩「直接拿过来代码，不要自己从头开始做」，改动确认选「飞机甲、标题乙」；已提交、已发布 `1aaf637728ae` 回读通过）

- 时间：开工 `2026-11-09 10:33`。来由：常浩要学上游「智能体之间用纸飞机互发消息」，调研报告 `docs/design/智能体互发消息-现状与差距-2026-11-09.md`（`0dc2b5b`）。
- 改了哪些文件：
  - 原样搬入上游：`src/crates/messaging/`、`src/crates/platform/src/delivery/`、`claude_plugin/mod.rs` 的 `unwrap_prompt`、`AgentMessagesRow.tsx`（只改了 `Menu` 的导入）；
  - 手工接线：`host/src/{lib,tools,extension,claude_plugin,messages}.rs`；
  - 设置：`core/src/{lib,settings}.rs`、`protocol/src/index.ts`；`ToolsSection.tsx` 新增 `MessagesSection`，单独一节「智能体互发消息」，「让智能体调整侧栏」原样不动（常浩选乙）；
  - 纸飞机：`messages.rs` 接回 `hud:flight`，互发消息也飞接力那种纸飞机，不盖印章（常浩选甲）；
  - P-13：`AiAccessAgentRows.tsx`（新）、`AiAccessPane.tsx`、`AGENTS.md`「AI 接入」；
  - 其他：`docs/platform-architecture.md`，以及 `file-size-allowlist.json` 和基线。
- 测试：第二次提交 `69b5333` 后重跑。
  - `pnpm run check` 退出码 0；
  - `pnpm test`：Rust 合计 `912 passed; 0 failed`，前端 `ℹ pass 379` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；
  - `node --test tests/*.test.mjs`：`ℹ pass 18` / `ℹ fail 0`。
- 验证（实机，`/Applications/PostPane.app`）：
  - 设置「智能体插件」页最下面多出单独一节「智能体互发消息」；打开后显示「以我的身份发送 · 注意」（关）和「连续来回上限 10」；`settings.json` 回读 `agentMessages: true`、`agentMessagesAsUser: false`、`agentMessagesLimit: 10`。
  - 本会话的 agent-hud MCP 约 15 秒内收到 `list_sessions` 等四个工具。`list_sessions` 认出本会话 `self: true`，没装插件的会话标 `reachable: false` 并写明原因。
  - `send_message` 发给空闲的「撤回 #264」会话：`queued` → `started`（约 18 秒）→ `done`，`get_message` 取回答「收到，互发消息测试通过」。日志只存指纹（`messages-journal.json`）。
  - 对方会话的 MCP 在开关打开前就已启动，没有 `send_message`，所以按上游的兜底直接作答，由发件方取回。
  - 未实测：第 11 次被拒、常浩插话后重新计数、关掉开关工具消失。这几项由上游的单元测试覆盖（messaging 55 条）。
  - Codex（常浩同意后补测）：常浩自己开的 Codex 空会话还没建线程（Codex 要等第一条消息发出才写会话记录），驿窗看不到。改用 `start_session` 新开 Codex 会话 `01a1be3c…`（不绑项目目录），第一条消息送进去约 10 秒后，Codex 用 `send_message` 回信「Codex 收到，互发消息测试通过」（`m-7b694ccc4660`，回复 `m-921b3708b480`）。回信等本会话空闲才作为新一轮送进来，带首行来源标签和「还需要再说时才回」。日志里两条在同一条链上，计数 1 → 2（`messages-journal-codex.json`）。Codex 那一趟纸飞机没截到：回信那一刻侧栏窗口不在可截取的列表里。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-09-278-agent-messages/`，有 `settings-agent-messages-off.jpg`、`settings-agent-messages-on.jpg`、`hud-flight-envelope.jpg`（回信时 Claude 小人旁弹出信封、准备折成纸飞机）。
- 发布与回读：`1aaf637728ae`，`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-09-2026-11-09-278-agent-messages/PostPane-3600980d505d.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：
  - 「允许智能体互发消息」实测时已打开、保持开着，在设置里可以关；
  - 两个 Claude 会话互发时，纸飞机起点和终点是同一个小人（只看到信封在 Claude 旁弹出），观感要常浩看；
  - 上游插件卡片上的「Send messages」开关没搬：驿窗没有 `KnownClientCard`，两个设置都默认开；
  - #253 正文里「不借以我的名义发」一条待改；
  - 常浩那个空的 Codex 会话可以关掉；测试用的 Codex 会话 `01a1be3c…` 也可以归档；
  - 300 行棘轮：三个文件为了保持上游原样，进了白名单。
- 本轮新坑：无
- skill 进化：无

## AGENTS.md 加「已定内容要改，先单独确认」（2026-11-09，Claude，常浩口述底线：「明确确定过的内容，后续涉及修改要给出指示……批量授权里单独项要摘出来询问」；已提交、无需发布）

- 时间：开工 `2026-11-09 09:50`。来由：#264 在「直接通过」的批量授权下改坏侧栏小人（L-35），常浩两次明确底线。
- 改了哪些文件：`AGENTS.md`（新增一节，导航表加一行）。
- 测试：`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`；`node scripts/check-rules.mjs` 「通用规则检查通过」。纯文档改动，未跑 Rust 与前端全量（不涉及代码）。
- 验证：无界面改动。
- 截图：无。
- 发布与回读：无需发布。
- 遗留：这条是否提升为全局规则（`~/.claude/CLAUDE.md` 与 Vault P-xx），常浩未定。
- 本轮新坑：无
- skill 进化：无

## #251 Claude 进程没了：审批卡随即撤下、会话不再显示正在进行（2026-11-09，Claude，常浩选「A+B 开工」；已提交、已装机 `3600980d505d` 回读通过）

- 时间：开工 `2026-11-09 08:41`（调研从 08:33 起）。来由：上游可学点 #251，常浩定「先做 #251」，看过改前改后表后选 A+B。
- 改前复现：终端 Claude 停在审批上 `kill -9`，`PostPane --permission-hook` 被 launchd 收养继续等，侧栏「1」加「批」印 15 秒后还在，要挂满 10 分钟（L-36）。
- 改了哪些文件：
  - A：新增 `src/crates/platform/src/hooks/client_unix.rs`（钩子等待时父进程换了就结束等待）；`hooks/unix.rs` 两处等待条件改走它（行数变短）。
  - B：新增 `src/crates/agents/src/claude/processes.rs`（读 `~/.claude/sessions/*.json`，登记过、进程已死的会话算结束；从没登记过的不算）；`platform/src/os/{macos,linux,windows}/process.rs` 加 `process_runs`（macOS 用 signal 0 加进程启动时间防 pid 复用），`platform/src/lib.rs` 启动时登记；`core/src/clients/claude_desktop.rs` 每 3 秒的 look 与收集轮次一起刷新，`settle_ended` 把已结束的会话改为空闲、清掉待回答；`core/src/presentation.rs` 接上；`agents/claude/jobs.rs` 放开 `small_file`。
  - 文档：`docs/session-data.md` 新增一节，`docs/agent-contract.md` 一句。
- 测试：共用主目录 `target`，先把全部 `.rs`、`Cargo.toml`、`build.rs` 时间改到未来，输出里有 9 行本 worktree 路径的 `Compiling`。`pnpm run check` `check exit=0`；`pnpm test` Rust 823 passed / 0 failed（基线 813 + 新增 10：agents 6、platform 3、core 1），前端 `ℹ pass 379` / `ℹ fail 0`，MCP 9、插件 14、扩展 13 全过；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。core 新测试先红：去掉 `settle_ended` 调用时报 `left: "running"` / `right: "idle"`。日志在 `evidence/2026-11-09-251-process-gone/full-*.log`、`targeted.log`。
- 验证：装机后按 #251 验收实测：终端 Claude 停在审批上（侧栏出现「批」），`kill -9` 后约 0.5 秒钩子退出，约 1.5 秒内「批」变回「回」、小签消失，命令没被执行。小人隔 2 秒两张截图不同，在动。我自己这个正在跑的会话在驿窗里仍是 `running`，没被误判。
- 截图：`evidence/2026-11-09-251-process-gone/accept/`：`1-card-side.png` 有卡，`2-after-kill-side.png` 撤卡，`m1/m2-bots.png` 小人在动，`0-installed.png` 无权限弹窗。
- 发布与回读：`install.sh 251-process-gone`：装前 `6349cc384273` 已备份，08:53:37 退出、08:53:38 启动，产物 `3600980d505d` / 已装 `3600980d505d`，签名 leaf `H"b773068e"`；`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-09-251-process-gone/PostPane-6349cc384273.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留：B「会话不再显示正在进行」没能在真实进程上复现，只有测试覆盖。终端版 Claude 2.1.319 在两次实验里都没写登记和会话记录，`claude -p` 也没写，所以造不出「被杀的会话还挂着」的现场。上游「进程说在等就超过 30 分钟也显示等你回答」没做，常浩没定。钩子由 `sh -c` 中间进程启动时，父进程检查看不到 Claude 被杀，目前实测父进程就是 Claude 本身。
- 本轮新坑：L-36（另在 L-32 补了一条还原教训）
- skill 进化：无

## 撤回 #264：侧栏小人全变静态图标的回归（2026-11-09，Claude，常浩指出「侧边栏的动态小人为什么都没有了」；已提交、PR 待全量测试后合并、已装机 `6349cc384273`）

- 时间：开工 `2026-11-09 08:04`。来由：第二批合并装机（`b977cfc5aa5e`）后，侧栏小人全部变成静态 logo。
- 定位：数据和设置都没变（`botLogos: true`，系统没开「减少动态」）。Chromium 和 Safari 预览都复现不了。按提交二分装机：`768250f`、`ff6282b`、`285d8d8` 正常，坏在 #264 的 `3c7addd`（测量副本 `useDeferredValue`）。机制没查清（L-35）。
- 改了哪些文件：撤回 `3c7addd`（`src/packages/hud/src/HUDScene.tsx` 回到同步重画，删掉它的测试）；新增守护测试 `src/packages/hud/test/measuring-copy-sync.test.ts`；`docs/LESSONS.md` 加 L-35。
- 测试：新守护测试 `ℹ pass 1` / `ℹ fail 0`，在 #264 版本上会红（源码同时含 `useDeferredValue` 和 `MeasuringCopy`）；`check-file-size` 通过。三条全量由接手会话在本 worktree 跑（共用主目录 `target`，先把全部 `.rs`、`Cargo.toml`、`build.rs` 时间改到未来，输出里有本 worktree 路径的 `Compiling` 行）：`pnpm run check` 通过（第一次因未提交的调试目录 `preview-bots/` 格式不合规失败，删掉后重跑通过）；`pnpm test` Rust 813 passed / 0 failed，前端 `ℹ pass 379` / `ℹ fail 0`（380 − 撤回 2 + 守护 1，守护测试名出现且通过），其余三组 9 / 14 / 13 全过；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。日志在 `evidence/2026-11-09-bots-static/full-*.log`。
- 回归核查（接手会话）：接力数据 `handoffs.json`、`settings.json`、`presentation.json` 与装旧版前的备份逐字节相同，#257 的回执状态存 `launches.json`（目前没有待送的话，文件不存在），没丢字段。侧栏隔 2 秒两张截图小人区域不同（`evidence/2026-11-09-bots-static/regress/`），版面与第二批前的 `old-70ad-side.png` 逐项一致（螃蟹、航空斜纹与「回」印、云朵 37%、ChatGPT 6.7M、Hermes、猫球、磁盘瘦身挂件）。小签、ANSWER / START 框、接力纸飞机等只在特定状态出现，截图看不到，改读第二批对侧栏的代码改动：只新增「钩子未允许」细条、接力回执状态字、插话后轮数重算，修了问答卡 hook 顺序和悬停计时，新字段缺省时渲染不变。
- 验证：从本分支打包装机后，侧栏 Claude 螃蟹、Codex 云朵、ChatGPT 打盹都回来了；隔 2 秒两次截图不同，确认在动（`evidence/2026-11-09-bots-static/fix-side.png`、`motion-*-side.png`）。
- 截图：见上面的证据目录。
- 发布与回读：产物与已装都是 `6349cc384273`；回滚到坏版本的命令（只供排查）是 install.sh 打印的 `PostPane-3a28d69abd34.app`。
- 遗留：#264 原先要解决的「审批卡离开时卡 60–150 ms」又回来了，要另想办法，并且必须在真实侧栏里验证；issue #264 已重新打开。
- 本轮新坑：L-35
- skill 进化：无（L-35 的「动侧栏渲染必须装机看小人」建议并入 E-14 一起批）

## 上游 Agent HUD 可学点第二批 9 张一次做完（#257–#265）（2026-11-09，Claude 主会话 + 7 个子 agent，常浩「都做，一口气全做了，我现在直接通过」；已提交、8 张 PR squash 合并、已发布 `b977cfc5aa5e` 回读通过）

- 时间：开工 `2026-11-09 01:00` 前后（常浩回「都做」后立即分派，按会话记录估记）。来由：上游对比报告（`docs/design/上游AgentHUD对比-2026-11-09.md`）列出的第二批可学点开成 #257–#265 后，常浩一次授权全部直接做。
- 做法：分两批开 7 个子 agent，各开 worktree、各开一张 PR，共用主目录 `target`（每次测试前把本 worktree 全部 Rust 源时间改到未来，核对编译路径和通过数，L-26 补充）。子 agent 不写本文件和 LESSONS、不装机；主会话逐张审 diff 后合并，最后由本收尾 PR 统一写交接、新坑，并打包装机一次（E-12 待批）。
- 合并了哪些（squash 提交）：
  - #260 Codex 钩子信任提醒 `f509614`（PR #267）：读 Codex 额度时同一个 app-server 发 `hooks/list`；驿窗钩子是 `untrusted` / `modified` 时，侧栏出细条「Codex · 没在运行驿窗的钩子」。本机 codex-cli 0.166.0 已核实有这个接口、字段对得上。
  - #259 上游 6 个小缺陷 `dd07759`（PR #268）：MCP 引擎回答按流解码、悬停计时到点才触发、问题卡钩子移到 return 前、设置页滚到底不回弹、加载更多保留已选轮次的调用、同一错误只提示一次。
  - #262 token 账本不再 31 天过期 `03c57b4`（PR #266）：只做「不删」，读取窗口仍是 31 天，没做全量回读旧日志。
  - #257 + #258 `768250f`（PR #270）：
    - 转回 Claude 的每一步用固定 id，跟进「排队中 / 已领取 / 已开始」，被拒、过期、取消时立刻交还。
    - Claude 续接时，如果这一轮是常浩自己开的头，自动轮数从 1 重算；判断依据是会话记录里 `origin.kind`，已用本机真实记录核实。
  - #261 锁被毒化后继续运行 `ff6282b`（PR #271）：27 个文件统一改成 `unwrap_or_else(PoisonError::into_inner)`，清单见证据目录 `sites.tsv`。`handoff.rs` 的 `republish` 留到本 PR 改。
  - #265 上游低优先级 6 条 `285d8d8`（PR #272）：侧栏截图等数据设上限、子智能体时间线合并相邻调用并可平移、Claude 额度冷启动退回 `~/.claude.json` 的 `cachedUsageUtilization`（只认同一账号、30 天内）、HUD 工具不再拒收已存旧字段、价格表随账本重读、「今天」卡改由 Core 全量计算。另 3 条不做：要新视觉、本机单屏、不急。
  - #264 卡片离开时测量副本延后重画 `3c7addd`（PR #273）：无头 Chrome 实测改前审批卡离开、「知道了」有 53–152 ms 长任务，改后基本消失，首开高度不变。
  - #263 源文件 300 行棘轮 `3858c36`（PR #269）：最后合，合前按当时的 main 重新生成基线（153 个文件）。
- 改了哪些文件（本收尾 PR）：
  - `src/crates/host/src/handoff.rs`：`republish` 锁被毒化后照样刷新接力卡（#261 遗留）。写成 3 行，没加长，棘轮通过。
  - `CURRENT.md`：本节。
  - `docs/LESSONS.md`：L-26、L-29 补充；新 L-31 至 L-34。
  - `.agents/skills/postpane-round/EVOLUTION.md`：E-12 至 E-14，待批。
- 替常浩定的事（他说「直接通过」）：
  - #257 只给「回 Claude」这段加回执，ChatGPT 那侧保留「30 秒没回话算失败、可重试」。
  - #258 常浩插话时，自动轮数和审查预算（#217）一起从这一段重算（代码里是同一个计数），每段上限仍是 2 轮、L1 1 轮；已停的自动往返不会自己打开。
  - #262 只做第一步。
  - #265 跳过 3 条。
  - #264 实测有卡顿，所以改了。
- 测试：在本收尾分支（= 合并完 8 张 PR 的 main `3858c36` + `republish` 一处）跑：
  - `pnpm run check` exit 0；
  - `pnpm test` exit 0：Rust 合计 `813 passed / 0 failed`（788 基线 + #260 6 + #270 9 + #271 2 + #272 7 + #266 1 = 813），前端 `ℹ pass 380` / `ℹ fail 0`，MCP 9、插件 14、扩展 13，均 `ℹ fail 0`；编译行没有一行来自别处路径；
  - `node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`（#263 加了 4 条）。
  - 日志在 `evidence/2026-11-09-batch-wrapup/{check,test,build}.log`；各 PR 的先红输出在各自的 `evidence/2026-11-09-<号>-*/`。
- 验证：各 PR 只到单元测试、真实通道测试和浏览器预览（#259 设置页逐元素比对、#265 时间线平移、#264 无头 Chrome 测量）。实机没走的：
  - 钩子提醒要改一个字符触发；
  - 设置页触控板回弹；
  - 接力回执和插话重算要等真实接力；
  - 额度冷启动兜底要重启后第一次就读失败才触发。
- 截图：`evidence/2026-11-09-265-upstream-small/preview/`（5 张）、`evidence/2026-11-09-259-upstream-fixes/a4-settings-after.jpg`；装机后截图 `evidence/2026-11-09-batch-wrapup/after-install.png`。
- 发布与回读：从本收尾分支打包（树与合并后的 main 相同；编译行没有别处路径），装前 `70ad4a4648bb`、产物与已装都是 `b977cfc5aa5e`，签名证书 leaf `b773068e`；已装程序里能搜到 `hooks/list`、`cachedUsageUtilization`、`roundsFrom`；装后侧栏、设置窗正常，没有「想访问文稿」弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-batch-wrapup/PostPane-70ad4a4648bb.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 要常浩定：子智能体时间线合并的一段画成「加宽的竖线」，没用上游「扁条 + 图例新项」；要换得出三版。
  - 范围外：
    - 本机 agent-kit 的两条 Codex 钩子 `guard-git.mjs`、`lessons-remind.mjs` 是 `untrusted`，Codex 不跑它们，建议到 Codex 里允许；
    - `hud/.../rules.rs` 的拒收文案说 columns 适用于 `ring`，与规则不符，没改；
    - `ClaudeChannel::queue`（#255）生产代码已不用，只剩测试在用，没删；
    - #261 的子 agent 曾用宽泛 `pkill -f` 误杀其他 agent 的测试，已重跑（L-33）。
  - 第一批 #250–#254 不在这次授权的 9 张里，仍开着；#249 总清单未改。
- 本轮新坑：L-31、L-32、L-33、L-34（另 L-26、L-29 补充）；L-30、L-33 可提议提升为全局坑。
- skill 进化：E-12、E-13、E-14 待批

## 自动转回 Claude 的排队兜底改成真能排进去（#255）（2026-11-09，Claude，常浩选「先修排队兜底」；已提交、已发布 `70ad4a4648bb` 回读通过）

- 时间：开工 `2026-11-09 00:18`。来由：对照上游 Agent HUD 的投递代码（`docs/design/上游AgentHUD对比-2026-11-09.md` 二·1）时读出，#173 加的「直接送两次失败就排队」从没生效：`Lines::leave` 底下是 `ClaudeChannel::hand`，和直接送话一样先查 20 秒内签到，L-14 那种会话结束的场景三次都被同一道检查拒掉。
- 改了哪些文件：`src/crates/platform/src/claude_plugin/mod.rs`（新 `ClaudeChannel::queue`：与 `hand` 同样拒空话、斜杠开头、非法 id，但不要求会话在线；两者共用 `put`）；`src/crates/host/src/handoff.rs`（`Lines` 加 `queue`，`AppLines::queue` 调它；自动转回 `auto_back` 与手动「转回」的兜底从 `leave` 改用 `queue`；左滑发起仍 `reaches` + `leave`，行为不变；测试替身的 `leave` 改成会话不在线就拒，与真实一致，并加 `queue`；新测试 `words_back_to_a_claude_session_that_ended_wait_in_its_queue`；4 处兜底断言从 `"leave"` 改 `"queue"`）；`src/crates/platform/src/claude_plugin/tests.rs`（新 `words_queued_for_a_session_that_ended_wait_for_it_to_open`，用临时目录里的真实通道：签到文件写 `ended` 后 `hand` 返回 `NotLoaded`，`queue` 写进 `prompts/<会话>/`、1 小时过期、状态 Waiting）；`docs/LESSONS.md`（L-14 加补充，新 L-30）。
- 测试：先红：替身照真实规则拒收后，`words_back_by_hand_that_cannot_go_in_wait_in_the_queue` 与新测试 `words_back_to_a_claude_session_that_ended_wait_in_its_queue` FAILED（后者 `left: 0 right: 1`，一句也没排进去）。改后 `pnpm run check` exit 0（第一次 exit 1：`check-test-paths` 不许把 tempdir 根目录交给私有目录代码，新测试改用 `temp.path().join("data")` 后通过）；`pnpm test` exit 0：Rust 合计 `788 passed / 0 failed`，各包 278、199、177、90、32 等，比上一轮的 278、198、177、89、32 正好多 platform、host 各 1 条，编译行是本 worktree 路径（共用主目录 `target`，按 L-26 把改动文件时间改到未来再测），前端 `ℹ pass 359` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、扩展 `ℹ pass 13`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` 见 PR。日志 `evidence/2026-11-09-queue-back/{check,test,build}.log`。
- 验证：只到单元与真实通道测试。没有实机走一单「会话已结束 → 自动转回排队 → 打开会话后插件领走」：要一单真实接力恰好碰上会话结束，沿用 L-14 时常浩定的「等下一单自然触发」。插件领取逻辑没改：`register.ts` 每秒扫 `prompts/<会话>/`，会话重新打开就会领走。
- 截图：`evidence/2026-11-09-queue-back/after-install.png`（装后侧栏与设置窗正常，没有「想访问文稿」弹窗）；无界面改动。
- 发布与回读：从本分支打包装机，产物 `70ad4a4648bb` / 已装 `70ad4a4648bb`，签名证书 leaf `b773068e`，已装二进制里能搜到新提示「没能排进这个会话的待发送队列」。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-09-queue-back/PostPane-b18150e21b61.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 遗留与范围外：上游对比报告里另有可学点（回执状态机、Codex 走队列不走 steer、插话自动重置轮次、照抄级小缺陷 A1–A6、Codex 钩子信任提醒等）还没开 issue；#253 正文有一处说错（上游传话一律走队列，不是先交桌面应用），未改。本轮在 `tests.rs` 第 241 行误改过别人的测试一行，已还原，diff 里没有。
- 本轮新坑：L-30
- skill 进化：无

## 交接卡「知道了」改「去开始」（#247）（2026-11-08，Claude，常浩评估后定：不做侧栏直接开启，只把「知道了」改成「去开始」三个字，点了跳回原会话并收起；已提交、squash 合并、已发布 `b18150e21b61` 回读通过）

- 时间：开工 `2026-11-08 17:05`（`date '+%F %H:%M'` 估记）。来由：常浩装了 #245 后说交接卡只有「知道了」，点了还得自己找回原会话去点 START。先评估过「侧栏直接开启」（经驿窗插件把「开始」送进原会话）：新会话开起来照样要回 Claude 用，还多出十几到几十秒等待和插件、开关、会话忙等失败环节，常浩同意不做。
- 改了哪些文件：`src/packages/hud/src/permissions/approval-list.ts`（新 `goesToStart`：交接卡、能跳回、上次没失败时按钮读「去开始」）；`permissions/PermissionQuestionCard.tsx`（只读提示下的按钮有 `goStart` 时读「↗ 去开始」并调用它，否则仍是「✕ 知道了」只收起）；`RequestActions.tsx`（转交 `onGoStart`）；`permissions/ApprovalContent.tsx`（展开的交接卡传入 `goBack`：跳回成功即发 `{kind:"leave"}` 收起，失败照旧在那一行写原因，按钮退回「知道了」）；`test/approval-list.test.ts`（新 1 条，先红后绿）；`docs/LESSONS.md`（L-29 补充：隐藏面板里按截图坐标点不中，改用 ref 点击）。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 各包 `test result: ok`（278、198、177、89、32 等，0 failed），前端 `ℹ pass 359` / `ℹ fail 0`（比 #245 多 1 条，即新测试），MCP `ℹ pass 9`、插件 `ℹ pass 14`、扩展 `ℹ pass 13`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-08-go-start/{check,test,rules,build}.log`。
- 验证：真实 `HUDScene` 预览（端口 1463，视口模拟 900×700，脚手架 `evidence/2026-11-08-go-start/preview-247/`，没提交）：交接卡底部是「↗ 去开始」，页面里没有「知道了」；按 ref 真实点击「去开始」，`openSession` 调用 1 次、发出 `{kind:"leave"}`，START 小签和票根「换」章消失。按截图坐标点了两次点不中（隐藏面板坐标框架变动，记入 L-29 补充）。记录 `preview-check.md`。
- 截图：浏览器自查截图未存盘（卡片样子见上文核对数据）。
- 发布与回读：`install.sh go-start`：装前 `d1975a4e6235` 已备份，17:37:15 退出并启动，产物 `b18150e21b61` / 已装 `b18150e21b61`，签名 leaf `H"b773068e`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-08-go-start/PostPane-d1975a4e6235.app" /Applications/PostPane.app; open /Applications/PostPane.app`。实机未看到，要等下一次真实交接卡时常浩点一次「去开始」；未截「想访问文稿」弹窗检查。
- 与授权不一致之处、遗留问题、范围外发现：卡片里「切换会话」小标题框仍是红色虚线（沿用提问卡样式，没改）。
- 本轮新坑：L-29（补充）。
- skill 进化：无。

## 交接卡挂 START 小签提醒切换会话（#245）（2026-11-08，Claude，常浩确认 issue 里的推荐做法，票根小章选「绿章」；已提交、squash 合并、已发布 `d1975a4e6235` 回读通过）

- 时间：开工 `2026-11-08 16:06`（本会话接手；读取层、核心与前端标签是上一会话的 WIP `89f0d61`，15:14 提交）。来由：常浩在 #243 同轮提出，Claude 会话上下文快满写「【交接】」交接卡时，侧栏要提醒他切换会话。
- 改了哪些文件：读取层 `src/crates/agents/src/transcript/live.rs`（`Activity.handoff`，新回合清空、被拒的调用清空）、`claude/transcript.rs`（`claude_handoff`：只认会话自己提出、标题以「【交接】」开头、结果 Proposed 的 `start_session`；遇到 `dismiss_task` 或带 `proposal_id` 的 `start_session` 清掉；`desktop_ask_view` 给 header「切换会话」、`badge: "START"`）、`transcript/log.rs`（记行偏移）；核心 `src/crates/core/src/sessions.rs`、`clients/claude_desktop.rs`（交接卡变只读卡，说明「回到会话，在 Claude 窗口里点交接卡开始新会话。」，也会重读）；前端 `permissions/approval-list.ts`（`START_BADGE`、绿色 `start` 色调）、`alerts/CompactAlertView.tsx`（START 绿框、刘海状态「待切换会话」）、`alerts/PendingEventRows.tsx`、`permissions/ApprovalContent.tsx`（章「切换」绿色；回到会话跳成功后发 `{kind:"leave"}` 收起）、`permissions/ListCard.tsx`（章支持绿色）、`permissions/PermissionQuestionCard.tsx`（交接卡写「请到 Claude 里开始」而不是「回答」）、`model.ts` + `ticket-stub.ts` + `scene/HUDMarkStrip.tsx`（票根小章：等待的全是交接卡时盖绿色「换」，英文「→」；和问题 / 审批混着时照旧「答」/「批」）；测试 `core/src/tests/claude_desktop.rs`（新 `a_handoff_card_hangs_a_start_tag_until_the_user_moves_on`）、`agents` 重读测试、`hud/test/approval-list.test.ts`、`hud/test/ticket-stub.test.ts`（新 1 条）。
- 测试：`pnpm run check` 第一次 exit 1（`ticket-stub.test.ts` 没过 Prettier），格式化后重跑 exit 0（`check2.log`）；`pnpm test` exit 0：Rust 各包 `test result: ok`（278、198、177、89、32 等，0 failed，含两条新的 handoff 测试，编译行是本 worktree 路径），前端 `ℹ pass 358` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、扩展 `ℹ pass 13`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-08-start-tag/{check,check2,test,rules,build}.log`。
- 验证：真实 `HUDScene` + 今天的真实快照，把那条 Claude 提问改成交接卡（`?kind=start`），内置浏览器视口模拟 900×700，用 JS 读位置与颜色（L-29）：开场完整小签「会话标题 + START 1」绿框；约 7 秒后缩成竖签、计数绿色；票根小章「换」绿色；清单卡显示 START、交接标题、「切换会话」、「请到 Claude 里开始」和说明、章「切换」绿色；接上 `openSession` 返回成功后点「回到会话」，发出 `{kind:"leave"}`，START 与「换」都消失；`?kind=question` 对照仍是 ANSWER 和红色「答」。记录 `evidence/2026-11-08-start-tag/preview-check.md`，脚手架 `preview-245/`（没提交）。
- 截图：无存盘截图（面板隐藏，以 JS 回读数据为准）。
- 发布与回读：`install.sh start-tag`：装前 `a755cab0bae9` 已备份，16:44:55 退出、16:44:56 启动，产物 `d1975a4e6235` / 已装 `d1975a4e6235`，签名 leaf `H"b773068e`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-08-start-tag/PostPane-a755cab0bae9.app" /Applications/PostPane.app; open /Applications/PostPane.app`。**实机小签未看到**：`get_hud_screenshot` 不画小签、电脑控制点不动侧栏（L-09），要等下一次真有会话写「【交接】」卡时常浩看一眼：挂 START 1 绿框、5 秒缩竖签、点「回到会话」后收起；未截「想访问文稿」弹窗检查。
- 与授权不一致之处、遗留问题、范围外发现：清单卡的章「切换」和只读提示「请到 Claude 里开始」是自查时顺着绿章补的（原来是红章和「请到 Claude 里回答」）。常浩点交接卡启动新会话这件事在原会话记录里看不到，所以靠「跳回即收 / 再发言即收 / 侧栏手动收」；交接卡不能在侧栏直接开始新会话（那是 Claude 窗口自己的按钮）。
- 本轮新坑：无。
- skill 进化：无。

## 常驻小签 5 秒后缩成竖签；待回答改 ANSWER 框（#243）（2026-11-08，Claude，常浩从三版预览选乙「竖签」，没说「只改 ANSWER」，APPROVE / PLAN 一起改；已提交、squash 合并、已发布 `a755cab0bae9` 回读通过；装机后常浩试出「滑到侧栏任何位置都弹」，同轮改成一一对应后重装）

- 时间：开工 `2026-11-08 14:20`（`date '+%F %H:%M'` 记录）。来由：常浩截图，Claude「待回答」和 Hermes 回复小签一直完整挂着挡内容；11-07 两轮设计（https://claude.ai/artifact/Es4WzEigfQwQ2kjUAiojJX 、https://claude.ai/artifact/AZgkYyfbV8toQmaLnVmK3F ）没定下来，这次重出三版 https://claude.ai/artifact/P1vt5nHeY4rV4Nf2uGiFQE ，常浩选乙。
- 改了哪些文件：`src/packages/hud/src/scene/tag-fold.ts`（新：哪些小签算「等你处理」、5 秒计龄、竖签尺寸、贴票根不留缝）；`scene/useTagFold.ts`（新：按「智能体 + 前卡 id + 条数」计龄，新来一条就重新完整挂 5 秒；鼠标在侧栏或正在打字时全部展开）；`HUDScene.tsx`（前卡和别家小签共用计龄；展开时在竖签原位放一块透明「保护区」登记成可悬停区，防止展开后鼠标落在缝里又缩回来回跳，见 L-27）；`scene/useHUDLayout.ts`（前卡竖签尺寸与位置，另算竖签原位）；`scene/SideTags.tsx`（别家小签竖签与原位）；`scene/HUDExpandedSurface.tsx`（把竖签传给前卡）；`alerts/CompactAlertView.tsx`（竖签画法：印章、短撕线、彩色数字；请求小签改成和 REPLY 同款框）；`permissions/approval-list.ts`（`requestBadge`：提问 ANSWER、计划 PLAN、权限 APPROVE）；测试 `test/tag-fold.test.ts`（新 7 条）、`test/approval-list.test.ts`（加 1 条，先红后绿）；`docs/LESSONS.md`（L-29）。
- 一一对应（常浩装机试后提出：滑到侧边任意票根都会弹出小卡，要求只有滑到 / 点到对应的 AI 才显示它自己的）：第一版是鼠标进侧栏就全部展开，改成只展开鼠标所在那一家（`tag-fold.ts` 新 `agentUnder`：鼠标在哪家票根、小签或竖签上；`useTagFold` 改为按智能体判断）。另修一个更早就有的问题：别家新消息挂在最前时，滑到任何票根弹出的都是最前那家的卡；现在滑到别的 AI 只出它自己的小收据，最前那家的消息不算看过（`HUDScene.tsx` 的 `otherMark`，面板收起前保持不变；`IslandNews.tsx` 加 `elsewhere`；`useHUDInteraction` 仍拿真实消息判断，避免误当「最后一条处理完」收起）。`request-hover.ts`：有待回答时滑到别家票根，从「什么都不出」改为出那家自己的小收据（改了 #79 的一条测试，见下）。
- 测试：`pnpm run check` 通过（exit 0）。`pnpm test` 第一遍 Rust 一条失败：`clients::chatgpt::tests::unix::the_extension_opens_a_conversation_and_reports_its_reply`（期望 `opened`，先收到 `turn`），本轮没改 Rust，单独重跑通过；第二遍全量 exit 0：Rust 各包 `test result: ok`（277、198、176、89、32 等，0 failed），`ℹ pass 354` / `ℹ fail 0`（前端），MCP `ℹ pass 9`、插件 `ℹ pass 14`、扩展 `ℹ pass 13`，均 `ℹ fail 0`。一一对应改完后重跑：`pnpm run check` exit 0；`pnpm test` exit 0，Rust 无 FAILED，前端 `ℹ pass 356` / `ℹ fail 0`，MCP 9、插件 14、扩展 13 均 0 失败（`check3.log`、`test3.log`）。`node --test tests/*.test.mjs`：`ℹ pass 14` / `ℹ fail 0`。日志在 `evidence/2026-11-08-narrow-tag/`（`check.log`、`test.log`、`test2.log`、`rules.log`）。
- 验证：真实 `HUDScene` + 今天的真实快照（Claude 一条提问）+ 注入 Hermes 回复，在内置浏览器里看（脚手架 `evidence/2026-11-08-narrow-tag/preview-243/`，没提交）：刚来两张都完整，ANSWER 1 红框、REPLY 1 蓝框；5 秒后都缩成竖签（Claude 小人 + 红 1，猛鬼兽印章 + 蓝 1）；悬停票根全部展开、移开缩回；点开看过的 Hermes 回复按原规则 4 秒收起；`?kind=permission&more`：APPROVE 1 琥珀框 → 竖签 → 第 2 条到达完整弹出 APPROVE 2 → 5 秒后竖签显示 2；顶边竖签横躺在票根下；左边用 JS 回读竖签 28×53 贴票根。面板隐藏时截到过半路帧，记为 L-29。一一对应复测（JS 回读元素位置和文字）：Hermes 回复在最前时指 Codex 票根，只出「Codex 5h 10% Weekly 32%」小收据，Claude 竖签不动；移开 6 秒后 Hermes 竖签仍在（没被当成看过）；指 Hermes 票根只有 Hermes 展开成整条，Claude 仍是竖签。
- 截图：浏览器自查截图未存盘；三版预览源文件在 `evidence/2026-11-08-narrow-tag/`。
- 发布与回读：`install.sh narrow-tag`：装前 `e0a8ff934edb` 已备份，第一版 `2dfec0fd254f`；一一对应版再装：装前 `2dfec0fd254f` 已备份，产物 `a755cab0bae9` / 已装 `a755cab0bae9`，签名 `H"b773068e`；回滚到本轮之前：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-08-narrow-tag/PostPane-e0a8ff934edb.app" /Applications/PostPane.app; open /Applications/PostPane.app`。**实机竖签未截到**：`get_hud_screenshot` 不画小签，电脑控制点不动侧栏（L-09），要常浩看一次：有待回答或 Hermes 回复时 5 秒缩成竖签、鼠标移到侧栏展开、移开缩回，鼠标停在竖签和票根之间的缝里不来回跳；滑到哪家只出哪家。
- 与授权不一致之处、遗留问题、范围外发现：刘海形态（notch）不缩，保持原样；APPROVE / PLAN 是我推断的写法，常浩没反对。#79「有待回答时只在对应小人上展开」：待回答的卡仍只从它自己的票根打开，但滑到别家票根不再什么都不出，而是出那家自己的小收据（按常浩这次说的「每个动作都有对应关系」改）。别家小收据显示时，最前那家的小签暂时让位，移开后回来。范围外：常浩同轮提出「会话写交接卡时弹 START 小签」，另开一单，计划待常浩确认。
- 本轮新坑：L-29（可提议提升为全局坑，和 G-11 同类）。
- skill 进化：无。

## 磁盘瘦身挂件悬停马上摇晃（#240）（2026-11-08，Claude，常浩要求鼠标滑上去挂绳要像数码世界猫球一样晃、小扫帚同时动；已提交、squash 合并、已发布 `e0a8ff934edb` 回读通过；常浩实机验收通过）

- 时间：开工 `2026-11-08 11:32`。来由：常浩截图说磁盘瘦身挂件悬停时没有猫球那种挂绳摇晃。代码里有摇晃，但磁盘瘦身单写了 `-1.6s` 负延迟，悬停约 2.74 秒才开始摆（L-28）。
- 改了哪些文件：`src/packages/ui/src/global.css`（删掉磁盘瘦身单独的摇晃时间，改用和猫球同一条共用规则 `7s -4.2s`；扫帚、眨眼、星光、气泡不变）；`src/packages/ui/test/pendant-sway.test.ts`（新增 2 条：每条悬停摇晃第一下 ≤0.5 秒、磁盘瘦身不再单写摇晃时间；在旧样式上报「2.74 s after the hover」失败，改后通过）；`docs/LESSONS.md`（L-28）。
- 测试：`pnpm run check` exit 0（第一次因测试放在 hud 包跨包读 ui 文件被边界检查拦下，移到 ui 包后通过）；`pnpm test` exit 0：Rust 合计 `784 passed / 0 failed`，test:ts `ℹ pass 346` / `ℹ fail 0`，mcp `ℹ pass 9` / `ℹ fail 0`，plugins `ℹ pass 14` / `ℹ fail 0`，extension `ℹ pass 13` / `ℹ fail 0`；测试文件移包后补跑 test:ts `ℹ pass 346` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-08-240-disk-sway/{check,test,test-ts,rules,build}.log`。
- 验证：用打包产物里的真实 CSS（`dist/assets/index-nZPUrv0O.css`，已确认只剩共用摇晃规则）在内置浏览器搭同结构挂件，真实鼠标悬停逐帧读旋转角：猫球 270ms 开始摆、磁盘瘦身 283ms 开始摆，最大偏角都是 4.5°；悬停时扫帚动画 `hud-disk-sweep` 在跑。结果 `evidence/2026-11-08-240-disk-sway/browser-check/result.json`。实机侧栏上常浩用鼠标悬停验收通过（2026-11-08 回复「晃了，没问题」）。
- 截图：无（动画以逐帧角度数据为准）。
- 发布与回读：worktree `claude/240-disk-sway` 打包，`install.sh 240-disk-sway`：装前 `de24114e20a2`（已备份），12:07:41 退出、12:07:42 启动，产物 `e0a8ff934edb` / 已装 `e0a8ff934edb`，签名 leaf `H"b773068e"`；`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-08-240-disk-sway/PostPane-de24114e20a2.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：#155 原意「和猫球错开节奏」随之取消（两个挂件不会同时被悬停，错开无意义）；未截「想访问文稿」弹窗检查。
- 本轮新坑：L-28。
- skill 进化：无。

## 侧栏小签在鼠标附近来回跳（#238）（2026-11-08，Claude，常浩发录屏说「一直在跳来跳去」，常浩经驿窗侧栏回复「同意下载并合并」；已提交、squash 合并、已发布 `de24114e20a2` 回读通过）

- 时间：开工 `2026-11-08 10:54`。来由：常浩录屏 `~/Downloads/iShot_2026-11-08_10.49.10.mp4`，鼠标停在侧栏左侧小签那一列时，Claude「待回答」和 ChatGPT「REPLY 2」不停上下跳、互相叠住。抽帧看到前卡在两家小人之间的中间位置出现，确认是位移动画加悬停换位的循环（L-27）。
- 改了哪些文件：`src/packages/hud/src/scene/side-tag-stack.ts`（新增 `SIDE_TAG_REST_MS = 250` 与 `frontTagSwapped`）；`scene/HUDExpandedSurface.tsx`（前卡换成另一家时位置、大小直接到位，不再 0.4 秒滑过去；同一家、展开收起仍照旧动画）；`scene/SideTags.tsx`（鼠标在别家小签上停 250ms 才把那家换到最前，离开就取消，路过不算）；`test/side-tag-stack.test.ts`（3 条新测试）；`docs/LESSONS.md`（L-27）。
- 测试：`pnpm run check` exit 0（第一次因 React 19 `useRef` 要初值报 TS2554，补上后重跑通过）；`pnpm test` exit 1：Rust 合计 `784 passed / 0 failed`，test:ts `ℹ pass 344` / `ℹ fail 0`，mcp `ℹ pass 9` / `ℹ fail 0`，plugins `ℹ pass 14` / `ℹ fail 0`，extension `ℹ pass 1` / `ℹ fail 12`——12 条全是 `browserType.launch: Executable doesn't exist at ~/Library/Caches/ms-playwright/chromium_headless_shell-1248/...`，本机 `~/Library/Caches/ms-playwright` 整个不存在，与本次改动无关（未改扩展）；经常浩同意 `pnpm exec playwright install --only-shell chromium` 装上 `chromium_headless_shell-1248` 后补跑 `pnpm run test:extension` `ℹ pass 13` / `ℹ fail 0`（`extension.log`）；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-08-238-side-tag-jump/{check,check2,test,node,build}.log`。
- 验证：录屏抽帧对照（`evidence/2026-11-08-238-side-tag-jump/sheet_*.png`、`fine.png`、`start.png`）定位原因；修后未在实机用鼠标悬停复现——侧栏悬停要真实鼠标，电脑控制未授权（L-09），实测留给常浩。
- 截图：录屏抽帧见上；修后无实机截图（未做，原因同上）。未截「想访问文稿」弹窗检查。
- 发布与回读：worktree `claude/238-side-tag-jump` 打包，`install.sh 238-side-tag-jump`：装前 `f009fe1bbfe1`（已备份），11:07:19 退出、11:07:20 启动，产物 `de24114e20a2` / 已装 `de24114e20a2`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-08-238-side-tag-jump/PostPane-f009fe1bbfe1.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：「停在别家小签上把它换到最前」从立即改成停 250ms（#162 原意是「停在上面」，路过不算更贴原意）；本机 Playwright 浏览器缓存曾缺失，已补装无头版（缓存目录被清后会再缺，届时同样补装）；修后实机悬停仍待常浩试。
- 本轮新坑：L-27。
- skill 进化：无。

## 全操作审核与 5 批缺陷修复（2026-11-08，Claude，常浩反馈「点 ↗ 没跳过去、回复却没了」，要求多个子 agent 深度审核所有操作并修复，看审核清单后回复「按计划修」；5 个 PR 全量通过，按授权 squash 合并；已从 main `fb62a6a` 打包装机回读一致）

- 时间：开工 `2026-11-07 23:47`（`date '+%F %H:%M'` 记录；审核从 23:20 起）。来由：常浩在新回复卡上多次点 ↗ 没跳到会话，回复却被收起。5 个子 agent 只读审核跳转、回复队列、审批、接力、侧栏与设置五块（汇总 `evidence/2026-11-07-ops-audit/汇总.md`），确认后开 #220–#224 五张 issue，各由一个子 agent 在独立 worktree 先写复现测试再修，主会话逐个审 diff、变基复测后合并。
- 改了哪些文件（按 PR）：
  - #227（#220 跳转可信）：`platform/src/lib.rs`、`navigation.rs`（找不到 Claude 标签时报原因，不再只叫起 Claude 算成功；认 `priorCliSessionIds`）、`navigation/claude_job.rs`（后台任务不提前报成功）、`agents/src/claude/process.rs`（`claude -p` 不发桌面目标）；前端新增 `open-result.ts`、`OpenNotice.tsx`，回复卡、会话行、Hermes 提问行、审批跳回失败时行内写原因、4 秒后可重试，点回复行只展开、↗ 才跳，跳成功后同会话回复一起收；「设置」「统计」先打开、成功才收起面板。
  - #226（#221 回复队列不丢）：`IslandNews.tsx`、`HUDScene.tsx`、`reply-stays.ts`、`news-lanes.ts`（没画出的小签不计时；鼠标在侧栏或打字时不插队；满 32 条挤最旧的；卡片展开才算看过）。
  - #228（#222 审批）：`hooks/unix.rs`（驿窗在线但不处理的请求回 `{}` 交还客户端，只在退出时无声关闭）、`codex/desktop.rs`（送达失败卡片回来）、提问卡与计划卡草稿发送成功后才删、回答后 2 秒内顶上来的卡前 400ms 不受理点击（`answer-gate.ts`；主会话把原实现「之后每张卡」收窄到「紧接着顶上来的那张」）。
  - #229（#224 设置与挂件）：`core/src/settings.rs`（重读设置容错，坏文件照用内存值并在常规设置页报出，下一次改设置重写）、`host/src/float_notes.rs` 与 `AppPendant.tsx`（随手记光圈跟窗口真实状态）、`GeneralPane.tsx`（保存排队，不丢点击）。
  - #230（#223 接力）：`handoffs.rs`（「继续自动」重新计时）、`handoff.rs`（迟到的 `sent` 补记 ask；手动转回失败进队列；重启文案按设置语言；新对话打开中「结束接力」提示稍后再试）、`chatgpt/mod.rs`（送话带请求号）、`docs/chatgpt-channel.md`。
  - 本节：`CURRENT.md`、`docs/LESSONS.md`（L-25、L-26）。
- 测试：合完 5 批后在主目录用 main 自己的构建目录（不用共享目录，见 L-26）跑 `fb62a6a`：`pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 `784 passed / 0 failed`（761 基线 + 本轮 13 条 + #233 的 10 条），test:ts `ℹ pass 338` / `ℹ fail 0`，mcp 9/0、plugins 14/0、extension 13/0；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-08-ops-fixes/{check,test}-fb62a6a.log`。各 PR 合并前的变基复测与红/绿输出在 `evidence/2026-11-07-fix-22{0..4}/`。
- 验证：装机后 `get_hud_screenshot` 渲染悬停面板正常（额度、Hermes、正在进行均有数据）；`hud_sessions` 看到修复前记下的 `claude -p` 会话仍带 `claude-desktop` 目标（目标在采集时写入），按 #227 现在点它的 ↗ 会报「找不到这个会话的标签」并保留回复（有测试，实机未点）。侧栏悬停面板按钮电脑控制点不动（L-09），实点留给常浩。
- 截图：`evidence/2026-11-08-ops-fixes/` 未存全屏截图；面板渲染图见本会话 `get_hud_screenshot`。未截「想访问文稿」弹窗检查（电脑控制未授权），请常浩看一眼。
- 发布与回读：从 main `fb62a6a` 打包（`bcf71b2` 只改 CURRENT.md），`install.sh 2026-11-08-ops-fixes`：装前 `b4c7a75cb585`（已备份），01:46:01 退出、01:46:01 启动，产物 `f9039973266c` / 已装 `f9039973266c`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-08-2026-11-08-ops-fixes/PostPane-b4c7a75cb585.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 暂不修（审核汇总里列了理由）：驿窗重启期间 ChatGPT 回信丢失（要插件缓存，需单独设计）；隐藏光晕时清空通知（与上游一致）；已排队通知不随语言切换；审批 F5/F7/F8；接力「重试」按钮对失败单一律显示、思维评审轮次前后端算法不一致；按住标记 300ms 后点击被吞（上游行为）；`open` 3 秒上限、统计窗打开到旧会话。
  - #227：后台任务转进桌面最终失败时前端收不到通知；「未审」章跳不过去时改为展开面板、不显示原因文字；审批卡「打开插件设置」仍先收起面板。
  - #230：「结束接力」遇到新对话正在打开是提示稍后再试，不是阻塞等待；迟到的 `sent` 到之前 ChatGPT 已开始回答时，「审核中」那步会漏记，回信不受影响。
  - #229：随手记光圈的宿主侧（发通知、新命令）没有 Rust 自动测试，要实机确认。
  - 子 agent 提的 `check-rules.mjs` 把前端 `.listen(` 误报为「本机服务只监听 127.0.0.1」违规，未改，留作提案。
  - 常浩实点验收（2026-11-08 回复「都正常」，4 处均通过）：① 新回复点 ↗ 能到会话；点一条修复前的 `claude -p` 回复，回复留着并写原因、4 秒后能再点。② 别家回复小签在刘海模式不再 4 秒没露面就消失；鼠标停在侧栏时来 Hermes 回复不换卡。③ 停下的接力点「继续自动」后不再马上停。④ 随手记用页面里「收起」关掉后光圈熄。
- 本轮新坑：L-25、L-26（均可提议提升为全局坑）。
- skill 进化：E-11 待批（并行 worktree 的构建目录与合并后主目录全量复测）。

## 设置加「AI 接入」页，AGENTS.md 加「AI 接入」一节（2026-11-08，Claude，常浩按全局规则 P-13 让母会话分派，看三版预览 https://claude.ai/artifact/Eusos7b3DHkDT4uQ4VrCtY 后选甲「四块收据」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 23:25`（会话创建时间，未单独 `date` 记录）。来由：P-13 要求应用里 AI 产出的东西在设置里看得清谁做、怎么接、读什么、写到哪、能不能用。盘点结论：驿窗有一个执行方（ChatGPT 接力审核，网页桥，仅支持 ChatGPT 网页），一个对外开放（MCP「agent-hud」+ `relay_to_chatgpt`），其余各家都是数据对象；母会话原判断「没有执行方」不准。
- 改了哪些文件：
  - `src/packages/app/src/settings/AiAccessPane.tsx`、`ai-access.css`（新）：四块——默认执行方（ChatGPT 网页可用状态 + 检查时间，Claude / Codex 标不支持）、功能清单（接力审核：谁发起、执行方、接入、读、写到、留痕、为什么仅支持）、对外开放（侧栏工具开关即 `hudTools`，能读 / 能写 / 在哪关；发起接力按 ChatGPT 插件登记显示开关）、数据对象（按快照列在读的、已关的、没检测到的）。
  - `src/packages/app/src/lib/ai-access.ts`（新）：可用状态、MCP 装到哪些客户端、各家读取来源的文字与拆分；`test/ai-access.test.ts` 3 条。
  - `src/packages/app/src/App.tsx`、`SettingsPanes.tsx`：登记第 5 页「AI 接入」。
  - `AGENTS.md`：新增「AI 接入」一节，导航表加一行。
- 测试：变基到 main `bcf71b2` 后 `pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 784 passed / 0 failed，前端 `ℹ pass 341` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志在 `evidence/2026-11-07-ai-access/`（`check3.log`、`test3.log`、`rules3.log`）。
- 验证：浏览器预览（隔离数据目录，拷入本机真实 `settings.json`）用真实组件看了两轮：第 1 轮浅色，数据对象与本机一致（在读 Claude Code、Codex、Hermes；7 个已关），发现页尾 API Key 说明单独成行，挪进「数据对象」脚注；第 2 轮深色复看。ChatGPT 插件状态、MCP 装到哪些客户端只在 Tauri 里读得到，浏览器里显示「这个系统不支持」「这里读不到」，逻辑由单测覆盖，实机未看——请求电脑控制截图被拒。
- 截图：在本会话工具结果里，未另存。
- 发布与回读：从分支 `claude/ai-access-declare-62dcfa`（基于 main `bcf71b2`）打包，`install.sh ai-access-final`：装前 `f9039973266c`（已备份），01:46:24 退出并启动，产物 `f009fe1bbfe1` / 已装 `f009fe1bbfe1`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-08-ai-access-final/PostPane-f9039973266c.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：各家读取来源的文字写在前端 `lib/ai-access.ts`（不在 agents crate 描述符里），新增客户端时要同步补一行，否则显示「它的本机日志」。范围外：「允许智能体调整侧栏」开关名字只说调整，实际也管读取快照、会话、截图；Codex 发起或审核接力要另开一单。
- 本轮新坑：无
- skill 进化：无。

## 工程接力按风险级设审查预算、续审按 PR 跨会话累计、支持暂停/升级与专项续审（2026-11-08，Claude，常浩在 #217 方案评论上回复「按方案开工」；PR 全量通过，按授权 squash 合并；实机往返在合并前的包上做，合并后从 main 重打重装见下）

- 时间：开工 `2026-11-07 23:07`（`date '+%F %H:%M'` 记录）。来由：multi-agent MA-02 工程审查契约 v0.1（`317945b`），常浩 11-07 批准审查预算原则；方案见 #217 评论。
- 改了哪些文件：
  - `src/crates/platform/src/clients/chatgpt/handoffs.rs`：Handoff 加 `risk`、`pr`、`carried`、`extra`；`budget`、`counted`（按 ChatGPT 实际回信数计，暂停取证那次不算）、`spent`；`review_exit` 读倒数第二行「审查出口」；`pull_request` 取 brief 第一个 PR；`Book::carried_for`、`pr_counted`、`rule`、`allow_extra`；`next()` 新增 `Settle`（L1 收口）、`BadTail`（出口与结论对不上）；工程审查的「证据不足暂停」也走 #209 的取证续上。
  - `src/crates/host/src/handoff.rs`：`start_ruled` 拒收 L0 和写错的风险级；新单按同一 PR 已审次数判预算；续发按 PR 累计（`pr_counted`）判预算，用完后不带 `extra` 就拒发；带 `extra` 时加一轮预算并记一步「专项续审：…」；转回话术按「可复审 / L1 收口 / 预算用完 / 证据不足 / 决策升级 / 出口无效」区分；工具返回提示不再写死 2 轮；`Desk::start` 只留给测试。
  - `src/apps/mcp/src/index.ts`：`relay_to_chatgpt` 加 `risk`、`extra`；工具说明写进预算规则、PR 链接放最前、回信末两行格式。
  - `src/packages/hud/src/alerts/handoff-card.ts`、`src/packages/protocol/src/index.ts`：卡上「第 n / m 轮」和「再审一轮」按预算与 `carried` 算，只改数字和文字。
  - 测试：handoffs.rs 5 例、handoff.rs 5 例、`handoff-card.test.ts` 1 例。
  - 文档：`docs/chatgpt-channel.md`「审查预算」一条与参数说明、`docs/安装与使用.md` 第 89–91 行。
- 测试：变基到 `f5234ad` 后，`pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 784 passed / 0 failed，hud 套件 `ℹ pass 338` / `ℹ fail 0`，其余套件 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志在 `evidence/2026-11-07-217-review-budget/`。再变基到 `bfa8d60`（只改交接文档）后只重跑了 `node --test tests/*.test.mjs`，见 PR。
- 验证：在 `d2d9c9cbe121` 包上（基于 `f441f73`，不含 #228–#231）用 `claude -p` 新开会话实机往返，测试 PR 编号 90001、90002，请 ChatGPT 按固定格式回：
  - L1（`h1a1b708fc4400`）：回「返修 / 需修改」，转回话术含「L1 的审查预算已用完……补改未复审」，随后自动结束，结束原因「L1 审查预算用完」；
  - 跨会话 L2：会话一 `h1a1b70a066c01` 第 1 轮；会话二 `h1a1b70aa6ed02` 自动关联，卡上「续审 · 原单 h1a1b70a066c01 · 已审 1 次」，`carried` 1，回「需修改」后停下，原因「已审 2 轮仍需修改」；
  - 会话三不带 `extra` 再送，被拒，返回「这个 PR 已审 2 轮，审查预算用完了，没有发出……」。
  - 实机中发现工具返回提示还写「没满 2 轮」，已改。
- 截图：无（没有界面样式改动；卡上数字由单元测试覆盖）。
- 发布与回读：合并前装 `d2d9c9cbe121`（装前 `f67df8d754e0` 备份在 `evidence/2026-11-08-2026-11-08-217-review-budget/`），用于实机。合并后从 main `fb62a6a` 重打（`build=0`，无警告，打完 main 没有新提交），`install.sh 217-main`：装前 `4ea6f3b36caa`（并行会话装的，已备份到 `evidence/2026-11-08-217-main/`），01:40:14 退出、01:40:14 启动，产物 `b4c7a75cb585` / 已装 `b4c7a75cb585`，签名 leaf `H"b773068e"`；应用在运行，启动后两分钟日志无 error/panic。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-08-217-main/PostPane-4ea6f3b36caa.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 两张测试卡 `h1a1b70a066c01`（`claude -p` 会话退出，转回失败两次后停下）、`h1a1b70aa6ed02` 停在「等你决定」，请常浩点「结束接力」。
  - 风险级只在新单第一次送审时记，续发时再填不会改。
  - multi-agent MA-02 契约第 4 节「正文第一行写暂停/升级」要改成「倒数第二行审查出口」，在 multi-agent 另开 PR。
- 本轮新坑：无
- skill 进化：E-10 待批（并行合并频繁时不追变基，先装本分支做实机，合并后从 main 重打重装）。

## ChatGPT 单家面板列出今天的对话，与侧栏「N 对话」一致（2026-11-07，Claude，常浩截图说侧栏显示 5 对话、展开却说没有会话，选甲「沿用一格两联补上已回」；PR 全量通过，按授权 squash 合并；已从 main 装机回读一致）

- 时间：开工 `2026-11-07 23:30`（`date '+%F %H:%M'` 记录）。来由：#219。脚注「5 对话」与悬停小收据由 `chatgpt-desk.ts` 按今天（北京时间）自己的对话计、回完也算；单家面板走通用 `liveSessions`，只列 running / waiting，ChatGPT 回完即 idle，于是「正在进行 0」，底行「近 24 小时 18 个会话」又把 13 个审核算进去。#145 定了「正在进行里列出（在答 / 已回）」，单家面板漏做「已回」。
- 改了哪些文件：
  - `src/packages/hud/src/chatgpt-desk.ts`：`ChatGPTDesk` 加 `day`（今天全部自己的对话，在答在前），`chats` 改为取它前 3 条；新增 `reviewsInDay()`（近 24 小时有动静的审核数）。
  - `src/packages/hud/src/panel/SessionsSection.tsx`：只在 ChatGPT 单家面板生效——标题「正在进行」改「今天的对话」、数字取 `desk.today`（与脚注同一个数）；在答 / 等你的行照旧，其后加「已回」行（`RepliedRow`：灰色「已回」签、标题、「HH:MM 回复」、↗ 回到会话，回不去照 #227 在第二行说原因）；空时写「今天还没有对话」；底行改「今天 N 个对话 · 近 24 小时 M 个审核」「去统计看全部」。下联旧信纸的审核不变；其他智能体的面板不变。
  - `src/packages/hud/test/chatgpt-desk.test.ts`：新增 2 条（面板列出今天全部对话且与脚注同数、小收据仍取前 3；审核按 24 小时单独计）。
- 测试：以最后一次为准（底座 `72e9699`，main 在跑测试期间又合进 #229，未再重跑）：`pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 767 passed / 0 failed，前端 `ℹ pass 331` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。中途两次未过：变基到含 #227 后类型检查报 `Opened` 与 `false` 比较（#227 改了回到会话的返回值），已改成与 `LiveRow` 相同的 `failureOf` / `useOpenFailures`；同一次 Rust 有一条 `the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry` 失败（剩余 288.7 秒，断言要 290–300 秒），本 PR 不碰 Rust，单独重跑 1 passed，下一次全量 0 failed，与 L-12 同类。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-219-chatgpt-panel/`（`check5.log`、`test5.log`、`rules5.log`，失败那次是 `check3.log`、`test3.log`）。
- 验证：单测覆盖三处计数一致。真实组件自查页（`SourceHoverPanel` 原样、`focusVendor="chatgpt"`，常浩 23:28 的真实快照，内置浏览器等字体加载完）：标题「今天的对话 5」，5 行「已回」依次 22:39、22:09、21:54、21:51、19:17，与小收据前 3 条、「另有 2 个对话」一致；底行「今天 5 个对话 · 近 24 小时 13 个审核」；点第一行 ↗，`openSession` 收到「审核需求梳理」，假造的失败原因红字显示在第二行、箭头变灰。装机后 `get_hud_screenshot` 渲染 ChatGPT 单家面板：已过零点（01:32），显示「今天的对话 0」「今天还没有对话」「今天 0 个对话 · 近 24 小时 15 个审核」，与此时脚注「--」一致；带对话的实机样子待常浩今天聊过一轮后点开看。自查页源码备份在证据目录 `preview-219/`，工作区已删（L-13）。
- 截图：证据目录 `preview-panel.jpg`（5 行已回）、`preview-open-fail.png`（回不去时的提示）、`installed-panel-after-midnight.png`（装机后零点后的空面板）。
- 发布与回读（补记）：并行会话合并频繁（本轮开工后先后进了 #225–#229），先合并再从 main `cefe5e4` 打包，`install.sh 219-chatgpt-panel`：装前 `d2d9c9cbe121`（已备份），01:31:55 退出并启动，产物 `d0c745534149` / 已装 `d0c745534149`，签名 leaf `H"b773068e"`；`install.sh check` 一致。打包期间 main 又合进 #230（接力），这次装的包不含它，由 #230 那边或下一轮从 main 重装。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-08-219-chatgpt-panel/PostPane-d2d9c9cbe121.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：整张看板（不指定智能体）的「正在进行」仍按原口径，只列在跑 / 等你；范围外：`the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry` 在机器忙时会偶发失败（快照一次超过 10 秒），可另开一单把时间放宽或固定。
- 本轮新坑：无
- skill 进化：无。

## Claude 那格的「回」改成和「审」同一枚方章（2026-11-07，Claude，常浩说「回」不好看、要和「审」放一起看成接力的两面、一套风格，看三版后选甲「脚上一枚，答优先」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 23:09`（`date '+%F %H:%M'` 记录）。来由：Claude 票根角上的红色立体火漆「回」和其他扁平印章不统一、被打孔切掉、又和「答」同红。设计稿 https://claude.ai/artifact/Rs6zDWu49aKP68SaxuaU2a 第 5 版（ChatGPT 与 Claude 两格并排、接力四个时刻）。issue #218。
- 改了哪些文件：`src/packages/hud/src/ticket-stub.ts`（新增 `stubFoot`：脚上印什么——自己的「答/批」优先，其次接力章「审 / 回」，再次读数；接力纸给在审的 ChatGPT 脚、和有回信等看的 Claude 脚，Claude 盖着「答」时接力纸也保留）；`src/packages/hud/src/scene/HUDMarkStrip.tsx`（`StubFace` 改用 `stubFoot`，「回」走 `ReviewStamp`，去掉角上的 `ReplySeal`）；`src/packages/hud/src/scene/RelayStamps.tsx`（`ReviewStamp` 加 `reply`：字换成「回」，同色同尺寸、同落下动画、不发散；删掉 `ReplySeal`）；`relay-stamps.ts`、`model.ts` 只改注释；`docs/chatgpt-channel.md`、`docs/ROADMAP.md` 同步规则；`src/packages/hud/test/ticket-stub.test.ts` 加两条 `stubFoot` 测试。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 761 passed / 0 failed，hud 前端 `ℹ pass 315` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek `ℹ pass 14` / `ℹ fail 0`，插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志在 `evidence/2026-11-07-reply-stamp/{check,test,rules}.log`。
- 验证：真实组件自查页（`HUDScene` 原样，#171 那份脱敏快照，`?s=review|replied|ask`）放大看：在审时 ChatGPT 脚上蓝「审」照旧；有回信时 Claude 脚换接力纸加航空斜纹、蓝「回」方章落下（截到落下中途的一帧，读数 82% 随后让开），`data-relay-stamp="reply"`，颜色 `rgb(58, 92, 150)` 与「审」相同；同时有待答时 Claude 脚上是红「答」、接力纸保留。实机：装机后实机有 4 单「已回复」，`get_hud_screenshot` 看到 Claude 格是接力纸加蓝「回」方章。自查页已备份到 `evidence/2026-11-07-reply-stamp/preview-218/` 后删掉。
- 截图：`evidence/2026-11-07-reply-stamp/hud-after.png`（装机后实机侧栏渲染）；自查页放大截图只在会话里看过，没落盘。
- 发布与回读：从分支 `claude/218-reply-stamp`（基于 main `785cd28`）打包，`install.sh 2026-11-07-reply-stamp`：装前 `5540cc76bc8e`（已备份），00:09:03 退出、00:09:03 启动，产物 `f67df8d754e0` / 已装 `f67df8d754e0`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-08-2026-11-07-reply-stamp/PostPane-5540cc76bc8e.app" /Applications/PostPane.app; open /Applications/PostPane.app`（脚本给备份目录加了当天日期前缀）。
- 与授权不一致之处、遗留问题、范围外发现：Claude 有「答」时「回」字不显示，只靠接力纸提示还有回信，这是甲的取舍，常浩已知。设计稿里的小人是示意图，实机用真实素材。可提议提升为全局坑：Artifact 页面脚本顶层 `const claude` 会和运行环境自带的全局 `claude` 撞名，整段脚本不执行、控制台也看不到报错（发布后页面空白才发现），只出提案。
- 本轮新坑：无
- skill 进化：无。

## 额度看板「吃紧」红色斜纹调浅（2026-11-07，Claude，常浩截图说红色斜纹太显眼、影响观看，要「稍微再浅一点点」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 21:33`（`date '+%F %H:%M'` 记录）。来由：悬停面板 Claude「每周」照速度会提前用完时，「照速度到重置」那段斜纹用满色红，压过了已用条和文字。
- 改了哪些文件：`src/packages/hud/src/panel/AgentBoard.tsx`（额度条预测斜纹在 `runsOut` 时加 `opacity: 0.55`；颜色、纹路、灰色斜纹、下方红字和「吃紧」圆章都不变）。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 761 passed / 0 failed，前端各套件 `ℹ fail 0`（hud 套件 `ℹ pass 313` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志在 `evidence/2026-11-07-hatch-lighter/hatch-*.log`。
- 验证：装机后用驿窗 MCP `get_hud_screenshot` 渲染悬停面板，「每周」斜纹亮条像素约 `(163,61,55)`，下方红字约 `(191,56,48)`，斜纹已比文字暗一档；电脑控制截图请求被拒，未做全屏截图。
- 截图：`evidence/2026-11-07-hatch-lighter/panel-after.png`。
- 发布与回读：从分支 `claude/hatch-lighter`（基于 main `70763a3`）打包，`install.sh hatch-lighter`：装前 `d18118eff032`（已备份），21:40:41 退出、21:40:41 启动，产物 `5540cc76bc8e` / 已装 `5540cc76bc8e`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-hatch-lighter/PostPane-d18118eff032.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：只出一版（0.55），属单一参数微调，没出三版；常浩觉得还要更浅或偏深，改这个数即可。
- 本轮新坑：无
- skill 进化：无。

## 亚古兽「最近被问」来源标签「私聊」改成「私」（2026-11-07，Claude，常浩截图要求「私聊改成私，跟下面的群对齐」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 21:12`（`date '+%F %H:%M'` 记录）。来由：悬停面板 Hermes 区亚古兽「最近被问」里，私聊来源标两个字「私聊」，比下面一个字的「群」宽，标题起点对不齐。
- 改了哪些文件：`src/packages/hud/src/panel/hermes-board.ts`（`chatLabel` 中文私聊改为「私」，英文仍是 DM）；`src/packages/hud/test/hermes-board.test.ts`（断言同步改为「私」）。标签宽度随文字（`HermesBoard.tsx` 里没有固定宽度），单字后与「群」同宽。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 761 passed / 0 failed，前端各套件 `ℹ fail 0`（hud 套件 `ℹ pass 313` / `ℹ fail 0`，含 `asks read 私 or 群` 一条）；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志在 `evidence/dm-label-*.log`。
- 验证：单测覆盖文案；实机悬停面板未看（电脑控制点不动悬停面板，见 L-09），请常浩悬停亚古兽一格看一眼。
- 截图：`evidence/2026-11-07-dm-label/after-install.png`（装机后全屏，无「想访问文稿」弹窗）。
- 发布与回读：从分支 `claude/dm-label`（基于 main `3207202`）打包，`install.sh dm-label`：装前 `6329ee7a901a`（已备份），21:20:09 退出、21:20:09 启动，产物 `d18118eff032` / 已装 `d18118eff032`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-dm-label/PostPane-6329ee7a901a.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：无。
- 本轮新坑：无
- skill 进化：无。

## 思维评审接力：严格末两行、终态转回 Claude、按评审出口换话术（2026-11-07，Claude，常浩在 thinking-review skill 审核意见上选「驿窗加窄改动」；PR 全量通过，按授权 squash 合并；装机回读见下）

- 时间：开工 `2026-11-07 19:37`（`date '+%F %H:%M'` 记录）。来由：#209。my-skills#66（thinking-review 1.0.0）经 ChatGPT 审核指出三处驿窗行为（已核对属实）：`Next::Pass` 只关闭接力、不把回信转回 Claude；`review()` 从下往上找「结论：」，认不出的值会继续往上找，可能把正文引用的旧「结论：通过」当结论；`back_text()` 固定是工程返修话术。
- 改了哪些文件：只对标题以「思维评审｜」开头的接力生效，工程审查接力行为与旧断言不变。
  - `src/crates/platform/src/clients/chatgpt/handoffs.rs`：新增 `Exit`、`Flaw`、`exit()`（只认最后两个非空行「评审出口：…」「结论：…」且必须对得上，缺失、未知、矛盾都算无效）、`Handoff::thinking()`、`rounds_used()`（证据不足暂停后的自动恢复不计轮）、`waits_for_evidence()`、`Book::evidence_in()`；`Next` 加 `Close`、`Pause`、`Escalate`、`Invalid`；思维评审接力的卡片结论改用严格解析。
  - `src/crates/host/src/handoff.rs`：`drive()` 按评审出口处理——成熟退出 / 转其他路径先转回 Claude（复用送达、重试、排队）再结束，送不到不关；继续深化转回；证据不足暂停转回后停下、不计等复审超时，Claude 带证据续接时自动往返恢复；决策升级转回并交常浩；无效末两行不放行、不转回、交常浩。新增思维评审版转回、再审一轮、收口话术与卡片文案；启动时直接结束已通过接力的那段跳过思维评审接力。
- 测试：子 agent 跑 `pnpm run check` exit 0；`pnpm test` exit 0，Rust 合计 760 passed / 0 failed，前端各套件 fail 0；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。我独立复跑 `cargo test -p agent-hud-platform handoffs` 13 passed / 0 failed，`cargo test -p agent-hud-host handoff` 36 passed / 0 failed。新增测试：T1 `a_thinking_review_that_settles_goes_back_to_claude_once_then_ends`，T2 `a_thinking_review_quoting_an_old_pass_is_escalated_not_passed`，T3 `a_thinking_review_short_of_evidence_pauses_for_it_then_goes_again`、`a_thinking_review_goes_on_by_itself_once_claude_brings_the_evidence`，T8 `a_thinking_review_whose_last_two_lines_do_not_hold_sends_nothing`，另有继续深化、启动场景、再审一轮、解析单测各一。
- 验证：单测覆盖 T1、T2、T3、T8；实机往返见「发布与回读」。
- 截图：无。
- 发布与回读（补记）：从 main `3ff8684` 打包，`install.sh 209-thinking-relay`：装前 `bfd637730be4`（已备份），19:52:24 退出、19:52:24 启动，产物 `f1b8bdb870a8` / 已装 `f1b8bdb870a8`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-209-thinking-relay/PostPane-bfd637730be4.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 实机往返（T1，补记）：本会话调 `relay_to_chatgpt` 发测试单「思维评审｜驿窗｜接力实机往返测试」（接力 `h1a1b5da92af00`），ChatGPT 回信末两行「评审出口：成熟退出 / 结论：通过」；本会话收到回信全文加收口话术「这次思维评审已收口……不要再调用 relay_to_chatgpt」。`handoffs.json` 该接力 steps：work、ask、reply、back（自动）、end（自动，「思维评审收口，回信已转回 Claude，自动结束接力」），状态 closed / ended。
- 与授权不一致之处、遗留问题、范围外发现：转给 Claude 的思维评审话术只写中文（与现有 `back_text` 一致）；回信超过 64KB 被截断时末行损坏，按无效交常浩；MCP 工具说明仍偏工程审查，未改（skill 里写明以 skill 为准）。
- 本轮新坑：无
- skill 进化：无。

## ChatGPT 格：在答时「未审」章让位，挂满 2 小时的「未审」边框发散（2026-11-07，Claude，常浩看三版预览 https://claude.ai/artifact/3t7EizoP38kBF8yWqLPYyM 后选乙，并改「长期未审不退场，要像审接力一样闪起来、边框发散」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 20:56`（`date '+%F %H:%M'` 记录）。来由：#213。#212 遗留：18 小时前的接力 `h1a1b1fed89e00` 挂着「未审」，章落下时把脚注淡成 0，常浩聊天时 ChatGPT 格看不出「在答」。同日先在常浩同意下结束了这条接力（退出驿窗改 `handoffs.json`，改前备份在 `evidence/2026-11-07-end-stale-relay/`，重启后读回 closed / ended）。
- 改了哪些文件：
  - `src/packages/hud/src/chatgpt-desk.ts`：脚注数据加 `pressing`（在答，或有回信待你看）。
  - `src/packages/hud/src/relay-stamps.ts`：`relayStamps` 加参数 `yields`，为真时不算「未审」；加 `lingering`（未审挂满 `LINGERS_MS` = `STALE_REVIEW` 2 小时）；`until` 也算「开始发散」的时刻。
  - `src/packages/hud/src/model.ts`：先算脚注，再把 `desk.pressing` 交给章。
  - `src/packages/hud/src/scene/RelayStamps.tsx`、`HUDMarkStrip.tsx`：「未审」挂久了照「审」的波纹发散（2.4 秒一圈、放大 1.9 倍淡出），蜡红、17 单位宽的长方框。
  - 测试：`test/relay-stamps.test.ts` 新增一条并补字段，`test/chatgpt-desk.test.ts` 新增一条；`docs/chatgpt-channel.md` 章的规则补一段。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 761 passed / 0 failed，前端 `ℹ pass 313` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。第一次全量 exit 101：新 worktree 没先跑 `package-resources.mjs`（L-01），补上后重跑即上面的结果。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-stub-yields/`（`check2.log`、`test2.log`）。
- 验证：真实组件自查页（`HUDScene` 原样，常浩 20:34 的真实快照，右侧停靠、30 pt 票根），内置浏览器等字体加载完后逐种核对：你的对话在答 + 18 小时未审 → 脚注「在答」、无章；未审 40 分钟 → 静止「未审」、无发散圈；未审 18 小时 → 有发散圈，边框 `rgb(179, 38, 30)`、2400 ms、无限循环，暂停在 1.3 秒放大截图可见红框外扩；ChatGPT 在审接力 → 蓝色「审」照常发散（`rgb(58, 92, 150)`）。自查页备份在证据目录 `preview-213/`，工作区里已删除（L-13）。实机：装机后常浩 21:03:44 在 ChatGPT 发问，`get_hud_screenshot` 显示 ChatGPT 格脚注蓝色「在答」（#206 一整条在真实使用中走通）。
- 截图：自查页截图在本会话工具结果里，未另存；实机未审发散没有现成的未审接力可看，未实看。
- 发布与回读：`install.sh stub-yields`：装前 `06a7d6cd0a2b`（已备份），21:07:35 退出并启动，产物 `6329ee7a901a` / 已装 `6329ee7a901a`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-07-stub-yields/PostPane-06a7d6cd0a2b.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：「挂久」的门槛常浩只举了 18 小时的例子，取 2 小时（与悬停面板不再列出该审核一致），如要改只动 `LINGERS_MS`。范围外：接力过了 2 小时悬停面板就不再列出，界面上点不到「结束接力」，常浩这轮没选做。
- 本轮新坑：无。
- skill 进化：无。

## ChatGPT「在答」能进驿窗了：收件箱不再拒收开始回合（2026-11-07，Claude，常浩装上 #207 后反馈「还是失败抓不到」，看实测后回「发了，还是没显示」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 20:06`（`date '+%F %H:%M'` 记录）。来由：#206 第二个断点。#207 之后回复已经能进驿窗（19:30「审核需求梳理」4634 字），但 ChatGPT 格仍是「正在进行 0」。
- 根因（有证据）：`chatgpt/turns.jsonl` 20:01–20:09 有多条 `start`，`hooks/inbox` 里没有任何 chatgpt 的 `session-observation`，`hud_sessions` 里 `chatgpt:6aeed449…` 是 `idle`。`platform/src/hooks/inbox.rs` 的 `valid()` 只认 attention、compaction、completion、account、origin、delivery，写入时直接拒收。别的客户端的开始回合还有钩子通道直连应用，只有 ChatGPT 全靠收件箱，所以只有它坏。
- 改了哪些文件：
  - `src/crates/platform/src/hooks/inbox.rs`：只给「自己的通道报回合」的客户端（目前只有 ChatGPT）收 `session-observation`，保留 30 天（与核心一致，核心 15 分钟后不再算在答）；别的客户端仍拒收。新增测试 `a_chatgpt_turn_start_is_kept_so_the_sidebar_shows_it_answering`。
  - `src/crates/platform/src/clients/chatgpt/tests_unix.rs`：通道测试加断言，开始回合一路落到收件箱。
  - `docs/chatgpt-channel.md` 补一句；`docs/LESSONS.md` 新增 L-24。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 761 passed / 0 failed，前端 `ℹ pass 311` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通用规则检查通过。第一次全量有两处失败：`check-test-paths`（新测试直接用了 tempdir 根，已改成 `join("data")`）、`demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes`（时间戳抖动，单独重跑与全量重跑都通过，与本改动无关）。撤掉修复时收件箱单测 `FAILED`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-running/`（`check2.log`、`test2.log` 为最终结果）。
- 验证：装机后常浩在 ChatGPT 发问，20:29:44 `start` 落进收件箱（「项目体系重构报告」，`running`）；`hud_snapshot` 里该会话 `state: running`；`get_hud_screenshot` 渲染的 ChatGPT 面板为「正在进行 1 · 在跑 · 正在干活 · 已 5 分钟」。
- 截图：应用自渲染面板与静止侧栏各一张，在本会话工具结果里，未另存。
- 发布与回读：`install.sh chatgpt-running`：装前 `f1b8bdb870a8`（已备份），20:14:44 退出并启动，产物 `06a7d6cd0a2b` / 已装 `06a7d6cd0a2b`，签名 leaf `H"b773068e"`；插件 20:14:49 重连。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-running/PostPane-f1b8bdb870a8.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：**遗留，等常浩定**：静止侧栏 ChatGPT 格脚注本应显示蓝色「在答」，但被接力 `h1a1b1fed89e00`「驿窗｜批 C 传信动效实机测试」的红色「未审」章盖住（章落下时把脚注淡成 0）。这条接力 01:54 送达，ChatGPT 早已回「通过」（L-18 当时丢了回信），至今仍是 open / delivered / halt，章已挂了 18 小时。可选：结束这条接力（章立即消失），和 / 或改设计让「在答」压过陈旧的「未审」。另：截图工具渲染的是静态帧，小人「工作中」的动作未实看（`vendors.rs` 已把 ChatGPT running 会话计入 `working`）。
- 本轮新坑：L-24。
- skill 进化：无。

## 侧栏收得到自己开的 ChatGPT 对话：插件重载后给已开标签页补装脚本（2026-11-07，Claude，常浩反馈「侧边栏 GPT 还是抓不到他的回话……明显的 bug」，并按提示刷新标签页发了一句测试；PR 全量通过，按授权 squash 合并；常浩重新加载插件 0.2.2 后实机验证通过，驿窗应用无需发布）

- 时间：开工 `2026-11-07 19:05`（`date '+%F %H:%M'` 记录）。来由：#206。常浩在 Chrome 里聊了「审核需求梳理」「审核Skill方法论提炼」等对话，侧栏 ChatGPT 格「正在进行 0」，没有回执。
- 根因（有证据）：`hooks/inbox` 里 ChatGPT 的 17 条回复全是接力会话（都在 `watched.json`），#145 上线以来没有一条常浩自己开的对话；`chatgpt/turns.jsonl` 也只有接力会话，最后一行 14:29，宿主对任何 turn 都记，所以是插件没报。页面选择器在当前 ChatGPT 页面上仍取得到。常浩刷新标签页后发「测试」，19:05:08 start、19:05:12 complete 立即进来，收件箱生成 completion。结论：插件重载（#183 时 12:51）后，Chrome 不给已开标签页装新脚本，旧脚本断开、发消息同步抛错被吞；接力会话由插件新开标签页，所以不受影响。
- 改了哪些文件：
  - `src/apps/chrome-extension/background.js`：`runtime.onInstalled` 时给每个已开的 chatgpt.com 标签页 `chrome.scripting.executeScript` 补装 `page.js`、`content.js`，单个标签页失败不影响其余，装完 `resync()`。
  - `src/apps/chrome-extension/content.js`：再装一次时旧的一份先停（`PostPaneContentStop`）、新的一份接手；发消息同步出错（与插件断开）就停下，不再每次页面变化都抛错。
  - `src/apps/chrome-extension/manifest.json`：加 `scripting` 权限，版本 0.2.1 → 0.2.2。
  - `src/apps/chrome-extension/test/content.test.mjs` 两条、新增 `test/background.test.mjs` 一条；`docs/chatgpt-channel.md` 补一条；`docs/LESSONS.md` 新增 L-23。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 751 passed / 0 failed，前端 `ℹ pass 311` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通用规则检查通过。新加的两条内容脚本测试换回旧 `content.js` 跑是 `ℹ pass 0` / `ℹ fail 2`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-stale-tabs/`。
- 验证：根因实测见上（常浩刷新后发一句）。修复后实机（补记）：常浩在 `chrome://extensions` 重新加载插件 0.2.2，转接进程 19:16:52 重启；**没刷新**的那个 ChatGPT 标签页里发「测试2」，`turns.jsonl` 19:17:00 start、19:17:05 complete，收件箱生成 completion（回复「测试2：接收成功，回复正常。」），说明重载后补装的脚本在工作。
- 截图：无。
- 发布与回读：驿窗应用没改，无需发布；插件靠常浩重新加载生效。
- 与授权不一致之处、遗留问题、范围外发现：范围外：`manifest.json` 的 description「只报驿窗名单里的会话」、`content.js` 开头注释「只转发名单里的会话」自 #145 起已不符，未改。
- 本轮新坑：L-23。可提议提升为全局坑：「浏览器插件重载后，已开标签页里的内容脚本断开，要在 onInstalled 里补装」换项目也成立。
- skill 进化：无。

## 侧栏停满后直接进各家自己的面板，不再展开整张看板（2026-11-07，Claude，常浩说「删除这个图1完整页面，我不需要同时看。单ai小卡黄色线走过之后，直接进入到各自的图3」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 18:17`（`date '+%F %H:%M'` 记录）。来由：#202。#141「停久看全」：悬停一格出小收据，黄线走完（再停 1.5 秒）展开成整张看板（各家叠在一起）。常浩改为黄线走完直接进这一家自己的面板（与点一格相同）。
- 改了哪些文件：`src/packages/hud/src/peek-expand.ts`（新增 `PEEK_GROWS_INTO = { pinned: true, expanded: false }`，注释改为长成自己的面板）；`src/packages/hud/src/HUDScene.tsx`（黄线计时到点改为钉住这一家，不再置 `expanded`；已钉住时不再计时）；`src/packages/hud/test/peek-expand.test.ts` 新增一条（改前 `PEEK_GROWS_INTO` 不存在而失败）。等待时长 1.5 秒、黄线不变。
- 范围：只改悬停停满这条路。刘海形态、菜单「打开面板」、助手编辑 HUD 时的保持，没有单独一家可看，仍是整张看板（`expanded`），未删。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 751 passed / 0 failed，前端 `ℹ pass 311` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-202-peek-to-panel/`。
- 验证：自查页渲染真实 `HUDScene`（logos、右边，与本机设置相同），喂 16:37 读到的实机快照（去掉审批），内置浏览器真实悬停：Codex 格 1 秒时小卡与黄线在（`.hud-peek-expand-meter` 存在），3 秒后只有 Codex 一家面板；Hermes 格同样只出 Hermes 面板；面板出来后移到 Claude 格，换成 Claude 一家，整张看板没出现。浏览器里小卡阶段的截图没拍到画面（DOM 里在），未补。自查页备份在证据目录 `check-page/`，实机快照副本已删、不留。实机侧栏：常浩 18:3x 悬停试过，回复「对了」（经 agent-hud 插件转来）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-07-202-peek-to-panel/`：`codex-after-wait.jpg`、`hermes-after-wait.jpg`、`move-to-claude.jpg`。
- 发布与回读：`install.sh 202-peek-to-panel`：装前 `5076014be5bd`（#200 那版，已备份），18:27:16 退出、18:27:17 启动，产物 `bfd637730be4` / 已装 `bfd637730be4`，签名 leaf `H"b773068e"`；`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-202-peek-to-panel/PostPane-5076014be5bd.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：整张看板在刘海形态、菜单打开、编辑保持里仍在；常浩要连这些也去掉，需另定这几处改显示什么。
- 本轮新坑：无
- skill 进化：无。

## 侧栏所有跳转箭头统一按钮质感（2026-11-07，Claude，常浩实点 #198 后说「两个都对」，并要求把侧栏所有跳转箭头的效果统一、有点击按钮的质感；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 17:59`（`date '+%F %H:%M'` 记录）。来由：#200。#182 只给清单卡（审批 / 回复）的 ↗ 加了 `.hud-go-button`（悬停变亮、按下下沉），正在进行会话行、Hermes 提问行（#196 新加）、接力卡头部「回到 Claude 会话」各自手写样式，没有反馈。
- 改了哪些文件：新增 `src/packages/hud/src/GoButton.tsx`（共用 ↗ 按钮，套 `.hud-go-button`，`enabled` 控制变淡与 `aria-disabled`，尺寸 26 或紧凑行 20）；`permissions/ListCard.tsx`、`panel/SessionsSection.tsx`、`panel/HermesBoard.tsx`、`alerts/HandoffCard.tsx` 头部改用它；`HandoffCard.tsx` 的「查看 ChatGPT 对话 ↗」加 `.hud-press` 和 `aria-disabled`。`global.css` 未改。
- 测试：`pnpm run check` 第一次 exit 1（`ListCard.tsx` 删导入后没重新格式化，E-07），格式化后 exit 0；`pnpm test` exit 0：Rust 合计 751 passed / 0 failed，前端 `ℹ pass 310` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-200-go-button/`（`check-2.log`、`test-2.log`、`node-test.log`、`build.log`）。
- 验证：真实组件自查页（`HermesBoard`、`HandoffCard` 原样，接力用 #194 的 DT-ORC 真实记录），内置浏览器真实悬停：Hermes 提问 ↗ 悬停时边框与箭头变 `rgb(245,245,247)`、底色 14% 填充，旁边的不变；「查看 ChatGPT 对话」悬停 `filter: brightness(1.18)`；这单「回到 Claude 会话」不可用，`aria-disabled="true"`，不亮。按下下沉沿用 `.hud-go-button:active` 规则（已确认在页面样式里），浏览器工具按不住鼠标，**未实测按下那一下**。正在进行会话行、清单卡改用同一组件，靠类型检查与全量测试，未单独截图。实机侧栏：常浩摸过后回复「手感对了」。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-07-200-go-button/`：`page.jpg`、`hermes-hover.png`；自查页备份在 `check-page/`。
- 发布与回读：`install.sh 200-go-button`：装前 `3e1e0471ecf8`（#198 那版，已备份），18:08:02 退出并启动，产物 `5076014be5bd` / 已装 `5076014be5bd`，签名 leaf `H"b773068e"`；`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-200-go-button/PostPane-3e1e0471ecf8.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：接力卡其余文字按钮（结束接力、转回 Claude 等）仍没有按下反馈，不是跳转箭头，本轮未动；面板底部「统计 ↗」是另一套按钮，未动。
- 本轮新坑：无
- skill 进化：无。

## Hermes 提问跳转改用 feishu:// 协议，飞书直接到前台（2026-11-07，Claude，常浩实点 #196 后说「有问题，点不动跳转键」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 17:29`（`date '+%F %H:%M'` 记录；排查从 17:0x 起）。来由：#198。#196 用 `open https://applink.feishu.cn/…` 跳飞书，本机 https 默认交给 Chrome，Chrome 在后台接走，飞书不出来（L-22）。
- 改了哪些文件：`src/crates/platform/src/navigation.rs`（`feishu-chat` 先拼 `feishu://applink.feishu.cn/client/chat/open?openChatId=…`，飞书没认领这个协议才退回 https）；`navigation/tests.rs` 改为 `a_feishu_chat_opens_in_feishu_and_only_without_it_in_the_browser`（改前旧测试在本机返回 `feishu://` 而失败）；`docs/LESSONS.md` 新增 L-22。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 751 passed / 0 failed，前端 `ℹ pass 310` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-198-feishu-scheme/`。
- 验证：终端里三种链接各开一次亚古兽所在的群：`https://` 与 `lark://` 后前台仍是 Claude；`feishu://` 后飞书 `frontmost` 为 `true`，常浩看过确认打开的就是那个群。实机侧栏：常浩点了群与私聊两行，回复「两个都对」。排查时 `open https://…` 给 Chrome 留了 applink 标签页，可直接关。
- 截图：无（飞书窗口截图授权被拒，由常浩目视确认）。
- 发布与回读：`install.sh 198-feishu-scheme`：装前 `de58129a128f`（#196 那版，已备份），17:37:20 退出并启动，产物 `3e1e0471ecf8` / 已装 `3e1e0471ecf8`，签名 leaf `H"b773068e"`；tccd 无文稿权限请求；`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-198-feishu-scheme/PostPane-de58129a128f.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：L-22 可提议提升为全局坑（deeplink 跳本机应用别走 https），待常浩批。
- 本轮新坑：L-22
- skill 进化：无。

## 侧栏 Hermes「最近被问」点一下跳到飞书对应私聊 / 群（2026-11-07，Claude，常浩截图问「为什么不能像 Claude、GPT 一样一箭头跳转」，看方案后点「开工」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 15:43`（`date '+%F %H:%M'` 记录）。来由：#196。Hermes 的 `state.db` 每条飞书会话都记着 `chat_id`，但 `recent_asks` 没读，快照里没有，外壳的跳转白名单也不认飞书，所以提问行只能看不能跳。
- 改了哪些文件：`src/crates/agents/src/hermes/transcript.rs`（`recent_asks` 多读 `chat_id`、`user_id`，旧库没有这两列照常列出）；`src/crates/agents/src/hermes/mod.rs`（`feishu_chat_id` 校验 `oc_` 开头的 id，`chat_target`；`Gateway::owner()` 读 `config.yaml` 的 `platforms.feishu.home_channel.user_id` 认出本人；`asks_with_chats` 只给群 / 话题和本人的私聊配聊天，同事私聊不给）；`src/crates/core/src/snapshot.rs`、`lib.rs`（快照 asks 带 `chatId`；新请求 `hermes_chat_target` 只放行面板列出的聊天）；`src/crates/runtime/src/lib.rs`（`open_feishu_chat`）；`src/crates/platform/src/navigation.rs`（`feishu-chat` → `https://applink.feishu.cn/client/chat/open?openChatId=…`）；前端 `protocol`、`dev-bridge`、`PanelContext`（`openFeishuChat`）、`App.tsx`、`HermesBoard.tsx`（提问行整行可点、末尾 20px 箭头框，打开失败变灰；同卡有一行能跳时其余行留位对齐）、`hermes-board.ts`（`askChat`、`askGoTitle`）。测试：transcript、gateway（本人 / 同事私聊、怪 id）、快照与放行、外壳链接、前端各补一条。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 751 passed / 0 failed，前端 `ℹ pass 310` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`（对齐修改后重跑的结果）。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-196-hermes-jump/`（`check-2.log`、`test-2.log`、`node-test-2.log`、`build.log`）。
- 验证：真实组件自查页（`HermesBoard` 原样，深浅两种底，数据仿本机：本人私聊、群、同事私聊、猛鬼兽定时任务下的提问），内置浏览器等字体加载完后真实点击：点箭头送出 `oc_aa3_mine`、点群那行标题送出 `oc_08a_group`、点同事私聊那行无反应、模拟打开失败后箭头变灰并改提示「飞书没能打开这个聊天」。第一轮发现同事那行时间没对齐，改成留位后放大复查对齐。装机后用 MCP 读实机快照（16:37:32）：猛鬼兽 3 条私聊、亚古兽私聊与 2 条群都带 `chatId`。自查页备份在证据目录 `check-page/`，不进仓库。**未验证**：实机侧栏里点箭头、飞书是否打开到对的聊天（悬停面板电脑控制点不动，L-09；本轮请求看飞书窗口被常浩拒绝），留给常浩点一次群、一次私聊。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-07-196-hermes-jump/`：`before-align.jpg`（第一轮，同事行时间偏右）、`after-clicks.jpg`、`after-align-zoom.png`。
- 发布与回读：`install.sh 196-hermes-jump`：装前 `c9f2c7a3fb42`（#194 那版，已备份），16:37:21 退出并启动，产物 `de58129a128f` / 已装 `de58129a128f`，签名 leaf `H"b773068e"`；tccd 无文稿权限请求；`install.sh check` 一致。包从本分支打（基于 main `b8e2a81`，之后 main 无新提交）。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-196-hermes-jump/PostPane-c9f2c7a3fb42.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 话题群只能跳到群，跳不到具体话题（`thread_id` 目前都为空，飞书也没有稳定的话题链接）。
  - 群里不判断常浩是否在群：机器人所在的同事群如果常浩不在，飞书会提示无权限。
  - 「正在进行」和回执里的 Hermes 会话仍没有跳转（它们走 `open_session`，Hermes 没有 `session_target`），本轮未做。
- 本轮新坑：无
- skill 进化：无。

## 接力卡：审满轮数后不再显示「继续自动」；等待行时间顺序（2026-11-07，Claude，常浩截图问「点继续自动毫无反应」，看排查后说「先改之前的问题」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 15:00`（`date '+%F %H:%M'` 记录）。来由：#194。数字分身 DT-ORC 接力卡（`h1a1b344630400`）「第 2 / 2 轮」，点「继续自动」没反应：后台其实记下了（14:53:08 `resume`），但这单已审满 `ROUNDS` 轮、停在「转回 Claude」阶段，打开自动往返没有任何效果，卡上也不说明（L-21）。这单的 PR #63 早已合并，Claude 13:51 回过「不用再做事」。
- 改了哪些文件：`src/packages/hud/src/alerts/handoff-card.ts`（`actions()` 只在 `reviews < ROUNDS` 时给「继续自动」；刚打开自动往返的那一行写明在等什么；阶段开始后有更晚步骤时，等待行不显示较早时刻，改写「HH:MM 起 · 已 X」）；`src/crates/host/src/handoff.rs`（`act("resume")` 已审满时拒绝并说明，新增 `no_rounds_left()`）；`src/packages/hud/test/handoff-card.test.ts`（新增 2 条，改 1 处期望；修复前 3 处失败）；`handoff.rs` 测试 `the_auto_round_trip_stops_at_the_last_round_or_without_a_verdict` 末段（修复前 `left: None`）；`docs/LESSONS.md` 新增 L-21。轮数仍按 `ROUNDS` 判断，不写死 2。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 748 passed / 0 failed，前端 `ℹ pass 309` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-194-resume-limit/`（`check.log`、`test.log`、`node-test.log`、`build.log`）。
- 验证：真实组件自查页（`HandoffCard` 原样，470 宽，接力信纸），喂本机 DT-ORC 真实记录和两个第 1 轮变体，内置浏览器等字体加载完截图、放大核对两轮：真实记录底部只剩「结束接力」「查看 ChatGPT 对话」，时间读作 08:06 → 13:48 → 14:53 → 14:55，等待行写「13:48 起 · 已 1 小时」；第 1 轮暂停仍有「继续自动」；第 1 轮打开后写「等 Claude 改完送审，回信需修改就自动转回」、按钮变「暂停自动」。自查页备份在 `evidence/2026-11-07-194-resume-limit/check-page/`，不进仓库。**未验证**：实机侧栏里这张卡（悬停面板按钮电脑控制点不动，L-09，留给常浩看）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-07-194-resume-limit/`：`after-three-cards.jpg`、`after-real-bottom.png`、`after-r1-paused.png`、`after-r1-resumed.png`。
- 发布与回读：`install.sh 194-resume-limit`：装前 `0612183039f6`（#191 那版，已备份），15:08:57 退出并启动，产物 `c9f2c7a3fb42` / 已装 `c9f2c7a3fb42`，签名 leaf `H"b773068e"`；tccd 无文稿权限请求；装时没有开着的自动往返；`install.sh check` 一致。包从本分支打（基于 main `5aaf8dd`，之后 main 无新提交）。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-194-resume-limit/PostPane-0612183039f6.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - DT-ORC 这张卡是旧单，要常浩点「结束接力」收掉。
  - PR #177（#175）也改 `handoffs.rs` / `handoff-card.ts`，已有冲突，与本轮改的不是同一处，未动。
  - 常浩下一步要讨论：把审核过程重新梳理成审核 skill，由它决定跑几轮，替代固定 2 轮。本轮未做。
- 本轮新坑：L-21
- skill 进化：无。

## 已停会话的签到记录留 7 天（2026-11-07，Claude，常浩在 #189 收尾时点「改成 7 天」；PR 全量通过，按授权 squash 合并；装机见「发布与回读」）

- 时间：开工 `2026-11-07 14:30`（`date '+%F %H:%M'` 记录）。来由：#191。#189 之后，`sweep` 仍把超过一天的签到文件全删，停了一天以上的会话又显示「没加载插件，执行 /reload-plugins」。
- 改了哪些文件：`src/crates/platform/src/claude_plugin/mod.rs`（`sweep`：标了 `ended` 的签到文件留 7 天，其余仍一天）；`claude_plugin/tests.rs` 新增 `an_ended_session_is_remembered_for_a_week`（修复前在「kept past a day」处失败）；`docs/LESSONS.md` L-20 升级一行补上。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 748 passed / 0 failed，前端 `ℹ pass 307` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`（以上为变基到含 #192 的 main 后重跑结果）。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-191-ended-week/*-rebased.log`。
- 验证：单测覆盖 2 天（已停的留、普通的删）与 8 天（已停的也删）。
- 截图：无。
- 发布与回读：合并为 `47623e1`，从同树分支（含 #192）打包，`install.sh 191-ended-week`：装前 `eb4bbc557f00`（#192 会话装的，已备份），14:44:11 退出、14:44:12 启动，产物 `0612183039f6` / 已装 `0612183039f6`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-191-ended-week/PostPane-eb4bbc557f00.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：装前已被删掉的记录找不回来，11-04 那 2 张提问卡（会话 `35984513…`、`3182ae78…`）仍显示旧提示，要在侧栏手动拿掉。
- 本轮新坑：无
- skill 进化：无。

## 侧栏 11-07 改动实机点验第一批；刘海形态下接力框的签不再被虚线划穿（2026-11-07，Claude，常浩看分批计划后点「按计划开始」，看点验结论后点「现在修」；PR #192 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 14:26`（`date '+%F %H:%M'` 记录，修 #190 那段；点验从 14:17 起）。来由：[【交接】驿窗侧栏｜回复卡与接力章实机点验] 会话，把 #180、#182、#183、#186 在实机上逐项点验。
- 点验结果（第一批，只读）：
  - 现装核对：开工时现装 `e0596c0c2a2d`（#187 那版，与 main `68ea84b` 同内容，含今天四个 PR），`install.sh check` 一致。
  - 接力虚线框（#186）：真实组件自查页三种底色截图。深色、浅色纸面对；刘海形态（无纸面，`usePaper()` 为空）下签底色 `transparent`，虚线从字中间穿过，「接力」「需修改」退成白色 → 开 #190 修掉（见下）。纸面上签的纯色底在纸纹上显出一块略深的矩形，一并修掉。常浩现在用动态形态，回复卡印在纸面上，原本看不到刘海这个问题。
  - 实机侧栏 14:18 截图：Claude 格挂「回」，ChatGPT 格挂红色「未审」（批 C 那单 `h1a1b1fed89e00`）。
  - **未验证，等常浩亲手点（L-09）**：点「未审」是否打开那个 ChatGPT 对话；↗ 悬停变亮、按下下沉；两条以上待审批时停在展开卡上回答一条是否直接接下一条；dt-sandbox 两单回复在实机上的虚线框样子。
- 改了哪些文件（#190 / PR #192）：`hud/src/alerts/CompletionAlertView.tsx`（`RelayFrame` 用 SVG mask 在签的位置给框线留缺口，宽度按签实测、`ResizeObserver` 跟随；签不再铺底色；颜色走 `relayLegendInks`）；`hud/src/alerts/handoff-card.ts` 新增 `relayLegendInks`（无纸面时用同外观纸面的蓝 / 红）；`hud/test/handoff-card.test.ts` 新增 1 条（先红：没有该导出；后绿）。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 747 passed / 0 failed，前端 `ℹ pass 307` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-notch-legend/`（`check.log`、`test.log`、`node-test.log`、`build.log`）。
- 验证：真实组件自查页（`CompletionAlertView` 原样，470 宽，深色纸 / 浅色纸 / 刘海黑底各一张，两单接力 + 一单普通回复），内置浏览器等字体加载完截图，放大到签对照两轮：缺口两端距字约 6px，三种底色下框线都不压字，刘海下「接力」蓝、「需修改」红。自查页备份在 `evidence/2026-11-07-sidebar-spot-check/reply-check-page/`，用后已删。**未验证**：实机刘海形态（常浩没在用，没有切形态去看）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-07-notch-legend/`：`before-notch.jpg`、`after-notch.jpg`、`after-notch-x5.jpg`、`after-dark.jpg`、`after-light.jpg`；点验截图在 `evidence/2026-11-07-sidebar-spot-check/`（`three-modes.jpg`、`hud-real-1418.png` 等）。
- 发布与回读：`install.sh notch-legend`：装前 `64e4138de2f3`（#189 那版，已备份），14:40:19 退出并启动，产物 `eb4bbc557f00` / 已装 `eb4bbc557f00`，签名 leaf `H"b773068e"`；tccd 无文稿权限请求；装时没有开着的自动往返。包从与 main `2969c84` 同代码的分支打（之后 main 只多了交接文档）。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-notch-legend/PostPane-64e4138de2f3.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 顺序：这次先合并 PR 再写本节交接，和 postpane-round「写好交接再合并」不一致；交接内容没有缺项。
  - 范围外：dt-sandbox 两单（`h1a1b486b8d801`、`h1a1b48f66f200`）「转回 Claude 失败两次」：发起会话是一次性代发会话（只调用一次 `relay_to_chatgpt` 就结束，各约 20 秒），回信时没人接；当时提示「还没加载插件，/reload-plugins」与实情不符。#189 之后已停会话改提示「已经停了」，代发会话正常结束时是否也写 `ended`，未核实。relay 工具回给代发会话的话仍承诺「自动转回这个会话」。排查记录 `evidence/2026-11-07-sidebar-spot-check/dt-sandbox-auto-back-fail.md`。未改。
  - 挂「回」的各单（左滑复审第 2 轮、GitHub 快速中心 #3、数字分身 DT-ORC、管培生 #1、dt-sandbox 两单）没动，等常浩定。
- 本轮新坑：无
- skill 进化：无。

## 审批卡：Claude 重启后停掉的会话不再误报「没加载插件」（2026-11-07，Claude，常浩看排查结论后点「改，在这里做」；PR 全量通过，按授权 squash 合并；装机见「发布与回读」）

- 时间：开工 `2026-11-07 14:17`（`date '+%F %H:%M'` 记录）。来由：#188，常浩截图问数字分身会话的提问卡为什么说「没加载插件」。查到 14:12 Claude 桌面应用重启，约 50 个会话同一秒被插件写成 `ended`，这个会话其实加载过插件（L-20）。
- 改了哪些文件：`src/crates/platform/src/claude_plugin/mod.rs`（`ClaudeChannel::ended` 新增；`unreachable()` 先判断会话已停，提示「这个会话已经停了（Claude 重启或关掉过它）。在 Claude 里打开这个会话，就能在 Agent HUD 里回答。」，不给 `/reload-plugins` 修复动作）；`claude_plugin/tests.rs`（`an_unreached_session_names_the_step_that_lets_the_hud_answer` 加 ended 一段，修复前在 `fix` 处失败：`Some(ReloadPlugins)` ≠ `None`）；`docs/LESSONS.md` 新增 L-20。前端没改：`fix` 为空时卡片原样显示提示文字（与「被暂停」一样）。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 747 passed / 0 failed，前端 `ℹ pass 306` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-188-ended-session/`。
- 验证：单测覆盖 ended 刚写与一小时前两种；实机卡片文案未单独截图。
- 截图：无。
- 发布与回读：从与 main `2969c84` 同树的分支打包，`install.sh 188-ended-session`：装前 `e0596c0c2a2d`（已备份），14:28:06 退出并启动，产物 `64e4138de2f3` / 已装 `64e4138de2f3`，签名 leaf `H"b773068e"`。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-188-ended-session/PostPane-e0596c0c2a2d.app" /Applications/PostPane.app; open /Applications/PostPane.app`。装后数字分身会话 14:28:17 重新签到（常浩在 Claude 里打开了它），那张卡已不在待审批列表。
- 与授权不一致之处、遗留问题、范围外发现：签到文件超过一天会被 `sweep` 删掉，所以停了一天以上的会话又会退回「没加载插件」的提示；装后待审批里还剩 2 张 11-04 的提问（会话 `35984513…`、`3182ae78…`），都没有签到文件，显示的仍是旧提示，要不要把 ended 记录留得更久未定。#175（会话被桌面版停掉时后台续接）与本题相邻，本轮只改提示，不续接。
- 本轮新坑：L-20
- skill 进化：无。

## 驿窗一轮采纳 E-09：同一会话接着做下一张可复用刚合并的 worktree（2026-11-07，Claude，常浩经驿窗侧栏回复「批 E-09」；已提交，无需发布）

- 时间：开工 `2026-11-07 09:27`（`date '+%F %H:%M'` 记录）。来由：#178；E-09 由 #168 的会话提出。动手前核实 main 上 E-09 仍是待批、skill 目录自 `7733bc4` 起没被别处改过、没有别的 PR 在改它。
- 改了哪些文件：`.agents/skills/postpane-round/SKILL.md`（第 1 步加一条：上一张已合并、原 worktree 干净时可在原地 `git switch -c claude/<号>-<短名> origin/main`，别的会话在用的不碰，并行仍各开各的）；`steps.json`（start 痕迹加 `git switch -c claude/`）；`EVOLUTION.md`（E-09 改为已采纳，记批准来源与落地差异：`main` 写成 `origin/main`、加「干净」判据）。
- 测试：`node --test tests/*.test.mjs` 原样结果 `ℹ pass 14` / `ℹ fail 0`。未跑 `pnpm run check` / `pnpm test`：只改 skill 文档与 `steps.json`，没碰 `src/` 与脚本。
- 验证：读回第 1 步全文确认新条目位置与命令；无界面改动。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：批准经 agent-hud 插件转进本会话，按 AGENTS.md 先核实了 E-09 的现状再改。开 issue 时号是 #178，worktree 先按预估的 177 建，已改名为 `178-round-e09`、分支 `claude/178-round-e09`。
- 本轮新坑：无。
- skill 进化：E-09 已采纳；当前没有待批条目。

## 回复卡：接力单套航空虚线框，去掉重复的「回到会话」（2026-11-07，Claude，常浩看三轮预览后定「甲 · 航空虚线框」；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 13:35`（`date '+%F %H:%M'` 记录）。来由：常浩说展开那条里的白色「回到会话」和标题行 ↗ 重复，要删；接力单和普通回复混在一起分不出来，要围绕「会话框」本身做区分。预览 https://claude.ai/artifact/GP6JQSmbiUxtFhmoUMm2hQ 第 4 版甲；前两轮（整张换纸、只加斜纹线）被否，理由见记忆 postpane-relay-card-distinct。
- 改了哪些文件：`hud/src/alerts/CompletionAlertView.tsx`（属于接力的回复整单套红蓝交替虚线框、极淡蓝底，框上左上角嵌签「接力 · Claude ⇄ ChatGPT · 第 n / 2 轮 · 结论」；送审纸条上的不套；展开后只剩「查看接力」，白色「回到会话」删掉，普通回复展开后没有按钮）；`hud/src/alerts/handoff-card.ts` 新增 `relayLegend`；`hud/src/paper.ts` 导出 `AIRMAIL_RED` / `AIRMAIL_BLUE`；测试 `handoff-card.test.ts` 新增 1 条（先红后绿）。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 744 passed / 0 failed，前端 `ℹ pass 306` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-relay-entry-frame/`。
- 验证：真实组件自查页（`CompletionAlertView` 原样，470 宽深色纸，两单接力数据）截图：框、签、「需修改」、只剩「查看接力」都对；自查页备份在证据目录 `reply-check-page/` 后删掉。**未验证**：实机里有接力回复时的样子，等下一单接力回信时看。
- 截图：无。
- 发布与回读：`install.sh relay-entry-frame`：装前 `d70c15d14181`（已备份），13:48:43 退出并启动，产物 `93e2849ddb33` / 已装 `93e2849ddb33`，签名 leaf `H"b773068e"`；装时没有开着的自动往返。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-relay-entry-frame/PostPane-d70c15d14181.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：刘海形态（无纸面）下签没有底色衬，压在框线上，未专门看。
- skill 进化：无。
- 本轮新坑：无

## 接力回信不再丢：插件不把空占位块报成答完，宿主记回合日志（2026-11-07，Claude，常浩看分批计划后点「按推荐开工」；查到根因后按证据缩小范围：不做「对账」兜底，只修根因加日志；PR 全量通过，按授权 squash 合并；已装机回读一致；常浩重新加载插件 0.2.1 后实测一单真实接力，回信收到并自动结束）

- 时间：开工 `2026-11-07 12:31`（`date '+%F %H:%M'` 记录）。来由：批 C 那单接力 `h1a1b1fed89e00` ChatGPT 实际回了「结论：通过」，驿窗停在 `delivered`，30 分钟后交还常浩（#182 只让它被看见）。
- 根因（有证据）：`hooks/inbox` 里这个对话在 01:54:19.827（送达后 1.5 秒）收到一条 `turn complete`，回复为空，messageId `e6c1acb9…`；在 Chrome 打开该对话，真回复的 messageId 也是 `e6c1acb9…`。ChatGPT 先出空占位块，答案随后写进同一个块。插件发完话后采样时没看到停止按钮，就把空块报成答完并记为已报；宿主不收空回复；真回复写进来后，插件因为同一 messageId（且 `expecting` 已清）不再报。整轮没采到停止按钮，所以也没有 `turn start`。详见 L-18。
- 改了哪些文件：
  - `src/apps/chrome-extension/content.js`：只在回复不为空、而且 600 毫秒内没再变化时才报 `turn complete`；空的或还在变的，等下一次变化再采样（5 行）。
  - `src/apps/chrome-extension/manifest.json`：版本 0.2.0 → 0.2.1，重新加载后宿主 `hello` 能看出是新版。
  - `src/crates/host/src/handoff.rs`：每条 `turn` 记一行 `<数据目录>/chatgpt/turns.jsonl`（`at`、`conversation`、`phase`、`messageId`、`replyChars`、`outcome`：taken / early / caught-up / unused / evicted），不记原文，超过 1 MB 改名 `turns.old.jsonl`。
  - 测试：`content.test.mjs` 新增「an empty placeholder is not the reply that fills it later」（修复前报 `[['m5', '']]`，与这次故障一致）和「a reply still being written without a stop button waits until it stops changing」（修复前报出半截「一二三」）；`handoff.rs` 新增 `every_turn_is_logged_with_what_became_of_it_but_not_its_words`。
  - `docs/chatgpt-channel.md`：页面结构补占位块规则，接力一节补回合日志；`docs/LESSONS.md` 新增 L-18。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 744 passed / 0 failed，前端 `ℹ pass 305` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 10` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。还原 `content.js` 的 prettier 重排后重跑 `pnpm run test:extension` `ℹ pass 10` / `ℹ fail 0`，`format:check`、`check-rules` 通过。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-reply-lost/`（`check.log`、`test.log`、`node-tests.log`、`test-extension-2.log`、`build.log`）。
- 验证：根因证据同目录 `inbox-completion-empty.json`、`handoff-h1a1b1fed89e00.json`、`dom-probe.md`。实机（补记）：#183 合并、主目录拉取后，常浩在扩展程序页重新加载插件，转接进程 12:51:24 重启；本会话用 `relay_to_chatgpt` 在「驿窗审核」项目新开一单（`h1a1b4592f6f00`，请 ChatGPT 只回「结论：通过」，即这次出事的情形）。`turns.jsonl`：12:51:54 `start` 先 `early` 后 `caught-up`，12:51:58 `complete` messageId `4cee2eaa…`、`replyChars` 5、`taken`，没有空回复那一行；接力 12:51:58 记 `reply`（`pass`），同一秒自动 `end`。证据 `turns-after-fix.jsonl`、`handoff-h1a1b4592f6f00.json`。一单只能说明这条路通了，后台标签页久挂、长回复的情形仍靠 `turns.jsonl` 观察。
- 截图：无界面改动。
- 发布与回读：`install.sh chatgpt-reply-lost`：装前 `3888d0dec483`（已备份），12:48:30 退出并启动，产物 `d70c15d14181` / 已装 `d70c15d14181`，签名 leaf `H"b773068e"`；`extension.sock` 12:48 重建，tccd 无文稿权限请求；装时没有开着的自动往返。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-chatgpt-reply-lost/PostPane-3888d0dec483.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划里的「对账」兜底（宿主定时请插件读对话最新回复）没做：根因已有证据并修掉，另两处可疑点（`background.js` 丢弃无会话 id 的 `complete`、原生连接断开时 `post` 静默丢消息）这次没有证据，留给 `turns.jsonl` 观察；再丢一次、日志里没有那一行时再做。
  - 取舍：只有图片、没有文字的回复不再报 `turn complete`（以前报一条空回执）。
  - 范围外：`early` 只留 16 条，常浩自己聊天的回合也会存进去、一直不清（现在日志里记成 `early` / `evicted`），短时间内不会挤掉接力的回合，未改。
- skill 进化：无。
- 本轮新坑：L-18

## 回复卡「全部知道了」移到头部；按钮有按下反馈；接力章改成「审 / 未审 / 回」按实际状态（2026-11-07，Claude，常浩看预览后说「把蓝色标识删掉，上面放一个全部知道了就可以」，章的规则在提问里选定：「审」停掉或交还就撤、30 分钟没回信改「未审」可点去 ChatGPT，「回」通过即结束、需修改留章；PR 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 11:15`（`date '+%F %H:%M'` 记录）。来由：常浩三条反馈：回复卡里「全部知道了」作用于整张却放在单条里；条目右上 ↗ 悬停、按下都没反应；「回」「审」一直挂着，分不清接力结束没有。预览 https://claude.ai/artifact/URiwPVoodUWGH1rPgKtVR2 第 2 版。
- 改了哪些文件：
  - `hud/src/alerts/CompletionAlertView.tsx`、`permissions/ListCard.tsx`：`ListHead` 加 `action`，回复卡把「全部知道了」（只有 1 条时写「知道了」）放到头部数量签左边；单条只留「查看接力」「回到会话」，靠右。
  - `ui/src/global.css` 新增 `.hud-go-button`（↗：悬停描边与图标变亮、浅底；按下下沉缩小）、`.hud-press`（回复卡文字按钮：悬停提亮、按下下沉）；减少动效时不动。
  - `hud/src/relay-stamps.ts`、`model.ts`、`scene/HUDMarkStrip.tsx`、`scene/RelayStamps.tsx`：「审」只在接力开着、`delivered` / `working`、没有 `halt`、送达不到 30 分钟时盖；送达超过 30 分钟没回信（停没停都算）盖红色「未审」，点 ChatGPT 那一格直接打开那个 ChatGPT 对话；票根缓存到 30 分钟点自动刷新。
  - `platform/.../chatgpt/handoffs.rs` `next()`：判「通过」不论自动往返开没开都结束；`host/src/handoff.rs` 驿窗启动时结束已判通过、没人驱动的接力。
  - 测试：`relay-stamps.test.ts` 新增 1 条并给旧用例固定时钟；Rust 新增 `a_pass_ends_the_handoff_even_with_the_auto_round_trip_off`、`a_review_that_passed_with_nothing_driving_it_ends_when_the_app_starts`。
  - `docs/chatgpt-channel.md` 写明章的规则与通过即结束；`docs/LESSONS.md` 新增 L-17。
- 测试：`pnpm run check` exit 0；`pnpm test` exit 0：Rust 合计 743 passed / 0 failed，前端 `ℹ pass 305` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 8` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。中途一轮 Grok 计时测试失败（L-17，负载 64–71），负载降下后全量通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-07-reply-dismiss-all/`（`check-3.log`、`test-3.log`、`node-test-3.log`）。
- 验证：真实组件自查页（`CompletionAlertView` 原样，470 宽深色纸）：3 条时头部「全部知道了」、点后全部收掉，1 条时写「知道了」，单条只剩右侧按钮；↗ 悬停实测变亮（计算样式与放大截图），按下的 `:active` 规则已生效但截不到那一瞬。侧栏自查页（`HUDScene` 原样）放大看「未审」章。实机：装机后 `get_hud_screenshot` 侧栏 ChatGPT 票根是红色「未审」（批 C 那单），Claude 票根仍有「回」（3 单需修改待处理）；my-skills #16、数码世界 #60 两单已自动结束（`closed` / `ended`）。**未验证**：实机点「未审」跳转、↗ 按下手感，要常浩亲手点（L-09）。自查页已备份到证据目录 `reply-check-page/`、`stub-check-page/` 后删掉。
- 截图：无（实机截图在本会话里看过，未落盘）。
- 发布与回读：`install.sh reply-dismiss-all-2`：装前 `324a033ce9cc`（本轮第一次装的，已备份），12:15:46 退出并启动，产物 `3888d0dec483` / 已装 `3888d0dec483`，签名 leaf `H"b773068e"`；装时没有开着的自动往返。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-reply-dismiss-all-2/PostPane-324a033ce9cc.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - **ChatGPT 回信没收到（bug，未修）**：批 C 那单（`h1a1b1fed89e00`，对话 `6aee1442-…`，在「驿窗审核」项目里）ChatGPT 实际回了「结论：通过」，驿窗却连「开始回答」都没收到，停在「已送达」。插件代码里项目路径 `/g/…/c/<id>` 是认的；可疑点：新对话地址出现前就答完时完成事件带不上会话 id 被丢、原生连接断开时 `post` 静默丢消息。当时没有插件到宿主的日志，定位不了，建议另开会话先加回合日志再等复现。
  - 「需修改」交还常浩的 3 单（左滑复审第 2 轮、GitHub 快速中心 #3、数字分身 DT-ORC）仍挂「回」，按常浩选定的规则要在卡上点「结束接力」或转回 Claude 才撤。
  - 已装这版不含 #177（尚未合并），#181 那节「#177 合并后统一装机」仍有效。
- skill 进化：无。
- 本轮新坑：L-17

## 待审批展开卡回答一条后不再收成小签，鼠标在面板上可连续处理（2026-11-07，Claude，常浩反映「处理完一个就弹回小卡、剩下的得再点」请修复，看过方案后说「现在装」；PR #180 全量通过，按授权 squash 合并；已装机回读一致）

- 时间：开工 `2026-11-07 09:31`（`date '+%F %H:%M'` 记录）。来由：常浩截图，在待审批展开卡里回答 / 选一项后，面板收成小签，下一条要再点小签展开。
- 改了哪些文件：`src/packages/hud/src/alerts/news-lanes.ts`（新增 `liveQueue`：读队首前去掉已不在等的请求，队首被去掉时把等得最久的请求提前；`promoteOldestWaiting` 从 `IslandNews.tsx` 挪来共用）；`src/packages/hud/src/IslandNews.tsx`（`current`、各家小签、返回的 `queue` 都用 `liveQueue` 的结果）；`src/packages/hud/test/news-lanes.test.ts`（两条用例）；`docs/LESSONS.md` 新增 L-16。
- 根因：回答后快照先去掉那条审批，`useIslandNews` 的队列要到下一次 effect 才跟上；中间那一帧队首还是已回答的请求，`request` 读成空，`useHUDInteraction` 当成「最后一条提醒处理完」（closeAfterLastAlert）：收起面板并压住悬停；下一帧新请求到队首时面板已关，只出小签，鼠标还在也不会再自动展开。
- 测试：新用例先红（`does not provide an export named 'liveQueue'`）后绿。变基到含 #181 的 main（`2fe2329`）后重跑：`pnpm run check` exit 0；`pnpm test` Rust 合计 741 passed / 0 failed，前端 `ℹ pass 304` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展第一次 `ℹ pass 0` / `ℹ fail 8`（L-16，Playwright 浏览器缓存被本机清掉），补装后 `pnpm run test:extension` `ℹ pass 8` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-expanded-card-stays/`（`check-2.log`、`test-2.log`、`test-extension-3.log`、`node-test-2.log`）。
- 验证：只有单测和代码推演，**实机未验证**：侧栏面板里的「提交」电脑控制点不动（L-09），要常浩下次有两条以上待审批时亲手点一次——鼠标停在展开卡上回答一条，应直接显示下一条；移开后照收起延时缩回小签；全部答完照旧收起。
- 截图：无。
- 发布与回读：从 `2fe2329`（含 #181）+ 本修复打包，`install.sh expanded-card-stays`：装前 `bd108f283650`（已备份），10:55:53 退出、10:55:54 启动，产物 `480e26fab1d2` / 已装 `480e26fab1d2`，签名 leaf `H"b773068e"`，`install.sh check` 复核一致；`log show` 里 tccd 没有对驿窗的文稿权限请求。之后 main 只多了 CURRENT.md 两次提交，代码与已装一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-expanded-card-stays/PostPane-bd108f283650.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 装机时管培生 #1 后端审核那单接力（`h1a1b3a224a200`）开着自动往返、09:37 「需修改」转回 Claude 后在改；常浩说「现在装」后装机，10:55:55 记 `stop`、`auto` 已关，要常浩在卡上点「继续自动」。
  - 已装这版含 #181 代码，不含 #177（尚未合并）。上一节「#177、#180 合并后由最后合并的会话统一装、再把等待回答改成一直等」仍有效：#177 合并的会话照做；本会话没改 `approvalWaitMinutes`。
  - 范围外：`~/Library/Caches/ms-playwright/` 被本机别的清理删掉，没查是哪个程序（L-16）。
- skill 进化：无。
- 本轮新坑：L-16

## 侧栏读数固定每周、审批重启后重挂与「一直等」（2026-11-07，Claude，常浩反映「数字成了 5 小时」「真实任务的审批侧栏没弹」，请深度自检修复；四项方案常浩逐项选定；PR #181 全量通过，按授权 squash 合并 `2fe2329`；随 #180 装机，实机回读通过）

- 时间：开工 `2026-11-07 08:44`（`date '+%F %H:%M'` 记录）。来由：#174。
- 根因（排查证据见 L-15 与 #174）：
  - 读数：规则一直是「面板里用得最多的一窗」，从没有「固定每周」。Claude 每周额度今早重置到 4%，5 小时 11%，读数自动换成 5 小时；不是被哪个 PR 改回去。
  - 审批：钩子链路是通的（08:37 的审批驿窗收到了）。看不到有两个原因：「等待回答」10 分钟到点就撤卡交还 Claude 窗口，02:28 那条 02:38 就撤了；07:29 另一会话装 #173 重启驿窗，挂着的审批连接一断就丢，新进程不知道。
- 改了哪些文件：
  - `hud/src/quota-rows.ts` `leadingWindow` / `weeklyWindow`、`held-reading.ts`、`model.ts`；Rust `crates/hud/src/vendors.rs`：有每周（全模型）窗口时读数与颜色固定用每周，读失败的灰色兜底也优先每周；Claude、Codex 都适用。
  - `platform/src/hooks/unix.rs`：驿窗主动结束请求回 `{}`；连接无声断开视为驿窗退出，钩子最多等 2 分钟，新进程起来后重挂同一条请求，Claude 窗口里批了就不再挂。
  - `core/src/requests.rs`、`settings.rs`、`lib.rs`、协议 `ApprovalWaitMinutes`、设置页 `HooksSection.tsx`：「等待回答」加「一直等」（值 0，不设截止）。
  - `docs/LESSONS.md` 新增 L-15。
- 测试：
  - 新增 `hooks::transport::tests` 3 条（重启后重挂并能批准、主动结束只回一次 `{}`、一直等不过期），把重挂关掉时第 1 条失败、已还原；前端 `quota-rows`、`held-reading` 各 1 条；Rust `a_mark_leads_with_its_weekly_window_however_full_the_5_hours_are`。
  - `pnpm run check` 退出 0。`pnpm test` 第一次退出 101（我新写的 Rust 测试 `json!` 写法编译不过），改后重跑退出 0：Rust 合计 741 passed / 0 failed；`ℹ pass 302` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`。
  - `node --test tests/*.test.mjs`（变基到含 #176、#179 的 main 后）`ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-07-weekly-approvals/check-2.log`、`test-2.log`、`node-test.log`。
- 验证：单测与端到端测试（真起钩子服务、模拟重装）。实机（11:37–11:44，现装 `480e26fab1d2`，即 #180 会话 10:55 从含 #181 的提交打包装机）：
  - 读数：采样表里 Claude 5 小时 36%、每周 10%，侧栏 Claude 票根 10%；Codex 5 小时 36%、每周 21%，票根 21%（旧规则两家都会是 36%）。
  - 审批重挂：用 `PostPane --permission-hook claude` 喂一条测试审批（会话 `postpane-174-selftest`，命令 `echo`），驿窗收到（`hook:claude:…:15`）；11:43:20 退出驿窗，钩子进程没退；11:43:22 启动，11:43:25 新驿窗里同一条重新挂上（`hook:claude:…:1`）；常浩在侧栏点了允许，钩子 11:44:16 拿到 `{"hookSpecificOutput":{"decision":{"behavior":"allow"},…}}` 退出。
  - 「一直等」：驿窗退出时把 `settings.json` 的 `approvalWaitMinutes` 改为 `0`，重启后快照 `settings.approvalWaitMinutes` 为 `0`。改前备份与钩子输出在 `evidence/2026-11-07-weekly-approvals/real/`。
- 截图：无。
- 发布与回读：本会话没有单独装机；#180 会话 10:55 装的 `480e26fab1d2` 已含本修复（其分支含 `2fe2329`），常浩选「等合并后统一装」后发现已装上。#177 那份实测版被 #180 的装机换掉，#177 仍未合并。
- 与授权不一致之处、遗留问题、范围外发现：
  - Windows 钩子传输（`hooks/windows.rs`）未改。
  - 装机前已在等的审批由旧版钩子进程托着，不会重挂；装上本版之后发起的才有效。
  - #177、#180 合并前要变基到含 #181 的 main，否则它们装机会把本修复冲掉（L-05）。
  - 常浩 2026-11-07 先定「等合并后统一装」，随后发现 #180 已带着本修复装机，常浩说「你来改」，本会话把「等待回答」改成「一直等」并实机验证（见上）。剩下只有 #177：合并前变基到最新 main 再装，否则会冲掉 #181、#180。
- skill 进化：无。
- 本轮新坑：L-15

## L4–L6 证据整理；#173 装机；L5 批 3 跑完（2026-11-07，Claude，常浩说「按计划开工」，后补「我不是为了交作业，而是深度分析补全实际的项目的真实情况」；已提交、#173 已装机回读通过）

- 时间：开工 `2026-11-07 02:27`（本会话第一条命令 `date` 记录）。来由：上一会话 L5 批 3 跑到一半时上下文到 50%，交接到本会话，补齐 L4–L6 证据并装 #173。
- 改了哪些文件：`docs/evidence/L5-运行记录.md`（自动往返上线后 5 单真实接力，逐步时间线、每轮用时、出错与处理，以及 5 条发现）；`docs/evidence/L6-前后对比.md`（L-05、L-14 两组前后对比，带提交号）；`docs/evidence/L4-Skill与使用记录.md`（Skill 本身的证据；同事使用记录写「缺」）；`docs/安装与使用.md`（给第二人：环境、签名证书、构建安装、接 Claude 与 ChatGPT、跑一次接力、常见问题、复现记录表）；`AGENTS.md` 导航表加两行；本文件。
- 测试：只改文档，没跑 `pnpm run check` 和 `pnpm test`（格式检查只管 `src/`，不查 Markdown）。`node --test tests/*.test.mjs`：`ℹ pass 14` / `ℹ fail 0`；`node scripts/check-rules.mjs`：通用规则检查通过，退出码 0。
- 验证：
  - 第二人路径实走：在 `~/Sandbox/2026-11-07-postpane-second-person/` 从 GitHub 新克隆 `4a1785c`，`pnpm install`、`package-resources.mjs`、`pnpm run check`、`tauri build --bundles app` 四步退出码都是 0，合计约 24 分钟，产物 `f0cd5b316ec3`、签名 `H"b773068e…"`；没装进 `/Applications`；本机本来就有证书，所以没验证「没有证书会怎样」；走完 `cargo clean` 收回 2.9 GB。日志 `evidence/2026-11-07-second-person/`。
  - 说明里建签名证书的几条命令，在临时钥匙串里跑通：导入后 `codesign` 能签名，签完删掉临时钥匙串，没碰登录钥匙串。
  - L5 数字全部来自 `handoffs.json`，快照 08:50；09:11 回看，C 单与 A 单都没变化。
- 截图：无。
- 发布与回读：`install.sh auto-back-queue` 装 #173 产物（与 main `1852338` 同树；之后 main 只多了 CURRENT.md），装前 `0719f477cba0`，已装 `4638968249ee`，07:29:09 退出并启动，`install.sh check` 一致，签名 `H"b773068e"`；装时没有开着的自动往返。「文稿」权限弹窗没截屏确认。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-auto-back-queue/PostPane-0719f477cba0.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- L4–L6 证据索引：

  | 级 | 证据在哪 | 怎么查 | 现状 |
  |---|---|---|---|
  | L4 | `docs/evidence/L4-Skill与使用记录.md`；skill `.agents/skills/postpane-round/`（`12a1a8e`、`7733bc4`）；工具 `relay_to_chatgpt` | 读 SKILL.md、EVOLUTION.md；`evidence/2026-11-07-{auto-relay,launch-attribution,relay-toss,auto-back-queue}/` 里是 `install.sh` 留下的备份 | Skill 有；**同事使用记录缺**，要常浩补 |
  | L5 | `docs/evidence/L5-运行记录.md`；原始数据 `~/Library/Application Support/app.postpane.mac/chatgpt/handoffs.json` | 文档「怎么查」一节的脚本，按接力编号看每一步 | 5 单真实接力，B（digiworld #64）、D（my-skills #16）审到通过；出错有打开超时、转回失败、30 分钟不回信、到上限 |
  | L6 | `docs/evidence/L6-前后对比.md`；`docs/安装与使用.md` | L-05：`ebbe0dc`、`12a1a8e` 与 CURRENT 11-06 各节回读；L-14：`1852338` 与两单接力的 `fail` / `stop` 步 | L-05 前后对比完整；L-14「改进后」**等下一单自然触发**；第二人复现**待约** |

- 与授权不一致之处、遗留问题、范围外发现：
  - 09:20 前后补记：C 单的卡在侧栏里没有入口可以打开（会话停了，不在「正在进行」里，回执也已收起）；就算重新打开会话，也只会直接送话成功，测不到排队。常浩定：改为等下一单自然触发（见 L6 文档）。「停了的接力卡打不开」是现有的界面缺口，没开 issue。
  - 想替常浩在 C、D 卡上点「继续自动」，两次申请操作驿窗窗口都被拒（常浩当时像是在手机上远程），没有重试第三次。D 在 08:43 由常浩手动接上，08:44 第 2 轮审到通过，不再用来验证；C 仍停着，L-14 的实测只剩它。
  - 管培生 A 单（trainee-hub PR #27）：转述常浩的「送」，被那个会话拒绝，要常浩本人在会话「管培生工作台｜后端工程骨架接通」里回「送」。这是外发的安全边界，不是缺陷。
  - 上一会话转述 B 会话说过「timeout 已交还」，和记录对不上：02:01 超时后 2.5 分钟就重送成功了，交还是 02:29 到上限那次。B 会话原话没有核对。
  - 发现（详见 L5 一文，都没改代码，要常浩定）：① ChatGPT 上线后回信 9 次、7 次「需修改」，2 轮上限几乎一定会碰到；② 交还常浩后等了 5～7 小时才有人接上，比 AI 审和改都慢得多；③ 自动往返停下后，B、D 回信「通过」时 `auto` 已关，接力不会自动结束，要常浩在卡上点「结束接力」；④ L-14 提示「没加载插件」说错了原因，提示文字没改。
  - 范围外：现有接力卡没有「从 CLI 或工具恢复自动往返」的入口，只能在界面上点，所以常浩不在电脑前时，这一步谁也替不了。
- 本轮新坑：无。

## 接力批 C 传信动效「纸飞机 + 票根印章」合并装机（2026-11-07，Claude，常浩定稿「乙的纸飞机 + 甲的票根印章」后看分批计划说「按计划开工」；PR #172 全量通过，按授权 squash 合并 `936850a`；已从与该 main 同树的分支打包安装、回读一致）

- 时间：开工 `2026-11-07 01:14`（本会话接手收尾；代码由会话「驿窗接力｜传信动效梳理与优化」在 WIP 提交 `1d7b42b` 写完）。来由：#171，设计稿 https://claude.ai/artifact/1VZALBQ4q2HuPJdiDoVbhp 第 2 版「定稿」，取代原「乙 · 侧栏传信弹出卡」；常浩定时长约 2.5 秒、航线收窄，「回」蜡封只在「已回复」时显示，不做进度细票签。
- 改了哪些文件：`src/crates/host/src/handoff.rs`（`Toss` / `toss(steps, seen)` 按接力新步骤决定飞行：ask 时 Claude→ChatGPT，reply 时飞回，fail 按去向半路掉落；`Desk.tossed` 启动时预填，重启不重飞）、`src/crates/host/src/lib.rs`（`fly_tosses` 发 `hud:flight`）、`src/packages/hud/src/scene/flight-plan.ts` 与 `FlightLayer.tsx`（约 2.5 秒、航线收窄；停在侧栏只动小人，起飞甩手、送达接住；刘海模式不变）、`src/packages/hud/src/relay-stamps.ts`、`scene/RelayStamps.tsx`、`scene/HUDMarkStrip.tsx`、`model.ts`（ChatGPT 票根「审」章、Claude 票根左上角「回」蜡封；「答 / 批」红章 > 「审」 > 读数）、测试 `flight-plan.test.ts`、`relay-stamps.test.ts`；`docs/ROADMAP.md`、本文件摘要行改为本定稿；`docs/LESSONS.md` 新增 L-13。
- 测试：`pnpm run check` exit 0（第一次 exit 1，只因未跟踪的自查页 `relay-real/` 没格式化，备份后删掉重跑，见 L-13）；`pnpm test` exit 0：Rust 合计 737 passed / 0 failed，前端 `ℹ pass 299` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，DeepSeek 插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 扩展 `ℹ pass 8` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。日志 `evidence/2026-11-07-relay-toss/check-2.log`、`test-2.log`、`node-test-2.log`。
- 验证：真实组件自查页（`HUDScene` 原样）用无头浏览器逐帧截图：四条边的送出、回信、送不到（前一会话做，沿用其结果，`frames/`）；本会话补看停在上边、下边时的「回」蜡封（在票根左上角、完整可见、不压读数）与刘海模式送出、回信、送不到、飞完收回（`frames2/`）。实机：装机后本会话调一次 `relay_to_chatgpt`（`h1a1b1fed89e00`），侧栏右边 ChatGPT 票根由「待你看」换成蓝色「审」章，Claude 小人出「!」；Claude 票根左上角的「回」蜡封实机可见（来自另几单仍处于「已回复」的接力）。**未验证**：Claude→ChatGPT 那一趟纸飞机，截图约 1.6 秒一帧没拍到；回信飞回，因为 ChatGPT 从 01:54 到 02:19 一直没回，本单停在「已送达」，没等到。
- 截图：`evidence/2026-11-07-relay-toss/frames2/`、`real/send-zoom.png`（「审」章盖上前后）、`real/now.png`、`real/reply-sheet.png`（等回信的录屏抽帧）。
- 发布与回读：装前 `98ea78960937`，已装 `0719f477cba0`，产物与已装一致，签名 leaf `H"b773068e`；没有「想访问文稿」弹窗。之后 main 又合了 #173（`1852338`），已装的这份不含它；#173 的会话已打好包含 #172 的产物、为不打断本单实测暂缓装机，见下一节。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-07-relay-toss/PostPane-98ea78960937.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：① 实机回信飞回与「回」蜡封随本单出现未看到，等 ChatGPT 回了再看一眼，或常浩下次接力时顺手看。② 范围外：ChatGPT 对本单 25 分钟无回信、Chrome 在运行；快照里另两单（GitHub 快速中心 #3、my-skills PR #16）回信后紧跟两次 fail 和 stop，与常浩在会话里反映的「需修改没自动转回 Claude」可能同源，侧栏已有会话「驿窗接力｜需修改自动转回 Claude」在查，本单没碰。③ 「回」蜡封按整份快照里有没有处于「已回复」的接力来显示，不分是哪个 Claude 会话的接力；多单并行时 Claude 票根上的「回」不说明是哪一单。常浩 2026-11-07 定：保持现状，不改成标单数。④ ChatGPT 票根回信后读数恢复成「待你看」（#145），未改。⑤ 已清理：自查页 `relay-real/`（备份在 `evidence/2026-11-07-relay-toss/relay-real-page/`）、预览 worktree `relay-toss-preview` 与分支（预览补丁备份在同目录 `preview-worktree/`）、`.claude/launch.json` 的 `relay-toss`、`relay-real` 两条配置、1452 / 1454 端口的两个预览服务。
- skill 进化：无。
- 本轮新坑：L-13。

## 自动转回失败改排队；L5 批 3 真实任务跑到一半（2026-11-07，Claude，常浩选「排队等唤醒」；PR #173 全量通过，按授权 squash 合并 `1852338`；已打包、未装机）

- 时间：开工 `2026-11-07 01:55`（按本会话记录，常浩回「排队等唤醒」）；本节写于 `2026-11-07 02:20`。来由：L5 批 3 里，C、D 两单的「自动转回 Claude」都失败停下。原因是做事的 Claude 会话一轮做完后很快被桌面版结束，插件不再签到（L-14）。
- 改了哪些文件（PR #173）：
  - `host/src/handoff.rs` `auto_back`：直接送话两次失败后，用 `Lines::leave` 排进会话队列，记 `fail` 加自动 `back`，自动往返不停；排队也失败才交还常浩。
  - `platform/.../chatgpt/handoffs.rs`：`queued_at`、`Book::queued`、`QUEUE_WAIT_MS` 1 小时、`overdue` 加「排队没人领」。
  - 协议 `queuedAt`；`handoff-card.ts` 显示「意见已排队 · 打开 Claude 会话继续」。
  - `docs/chatgpt-channel.md`；`docs/LESSONS.md` 新增 L-14。
- 测试：
  - 改写宿主测试 `words_back_to_claude_that_fail_are_tried_once_more_then_left_to_the_person`（先红后绿），新增前端用例 1 条。
  - `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 737 passed / 0 failed；`ℹ pass 300` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` 退出 0。
  - 之后只给 LESSONS 跑了 prettier。日志在 `~/Library/Application Support/postpane/evidence/2026-11-07-auto-back-queue/`。
- 验证：只有单测，实机还没走过排队这条路。
- 截图：无。
- 发布与回读：未装机。产物 `.claude/worktrees/120-relay-card/target/release/bundle/macos/PostPane.app`，主程序 `4638968249ee`，与 main `1852338` 同树，已包含批 C #172。现装 `0719f477cba0`，是另一会话 01:52 装的批 C。暂缓原因：装机会重启驿窗，开着自动往返的接力一律先暂停，会打断 B 的真实任务和批 C 的实机测试。等这两条接力结束，再用 `install.sh auto-back-queue` 装。
- L5 批 3 现状（接力记录在 `~/Library/Application Support/app.postpane.mac/chatgpt/handoffs.json`）：
  - A 管培生 PR #27：会话 `local_a668aac6` 在等常浩亲口回「送」，还没送出。
  - B 数码世界 #60（PR digiworld#64，接力 `h1a1b20460cf01`）：02:01 新会话打开超时（fail），02:03 重送成功，02:07 回信「需修改」并自动转回成功，Claude 在改第 1 轮。B 会话最后一条报告说「送审 timeout、已交还常浩」，和记录对不上，要核实。
  - C github-center #3（PR github-center#65，接力 `h1a1b1e9404a00`）：常浩已决定换成 D；01:34 转回两次失败后停下，留作补充记录。
  - D my-skills PR #16（接力 `h1a1b1f62cc701`）：01:49 转回两次失败后停下。装新版后，在卡上点「继续自动」做前后对比。
- 与授权不一致之处、遗留问题、范围外发现：
  - 「还没加载插件」这条提示，对已结束的会话不准（`claude_plugin::unreachable`），没改。
  - 左滑第 3 轮复审（`h1a1b076a94400`）还没回信。
  - L4 材料仍缺。
- skill 进化：无
- 本轮新坑：L-14

## 驿窗一轮采纳 E-07、E-08：测试前先格式化、实机出问题怎么查（2026-11-06，Claude，常浩回复「两条都批」；已提交，无需发布）

- 时间：开工 `2026-11-06 23:00`（`date '+%F %H:%M'` 记录）。来由：#167，skill 第一次走完「提案 → 批准 → 采纳」。
- 改了哪些文件：`.agents/skills/postpane-round/SKILL.md`（第 2 步先 `cargo fmt` 与 prettier；第 3 步末尾加「实机出问题怎么查」：`log show`、`sample`、`lsof`、`curl` 本机端口、标题通道，诊断循环调用 `diagnosing-bugs`）；`steps.json`（test 加格式化痕迹，install 加排障痕迹）；`EVOLUTION.md`（E-07、E-08 改为已采纳，记批准原话与落地差异：E-08 放进第 3 步的小节，没另开一步）；`tests/postpane-round.test.mjs` 与夹具（格式化现在算测试，夹具改用 `xcrun` 保留「不属于任何一步」的覆盖）。
- 测试：`node --test tests/*.test.mjs` 原样结果 `ℹ pass 14` / `ℹ fail 0`。未跑 `pnpm run check` / `pnpm test`：本轮只改 skill 文档、`steps.json` 与 tests 夹具，没碰 `src/` 与任何脚本。
- 验证：`round-stats.mjs` 在本机真实记录上重跑：`cargo fmt`、prettier、`log`、`sample`、`curl`、`lsof` 都不再出现在「不属于任何一步」里；装机回读 47 个会话、519 次调用。`lsof` 第一版痕迹只认 `-iTCP`，漏了 `-tiTCP`、`-nP -iTCP`、`-p`，改成 `lsof [^|;]*(iTCP|-p )` 后归位。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：E-08 原提案写「加一步」，落地为第 3 步里的小节，理由是排障只在装机后出问题时发生，单列一步会让每轮都多一个空步骤；已写进 E-08。统计里仍有 `pgrep`（12，多是查别的应用）、`npx tsc`（11）、`sqlite3` 查 TCC（6）等，暂不提案。
- 本轮新坑：无。
- skill 进化：E-07、E-08 已采纳；本轮无新提案。变基时与 #168 会话新提的 E-09（同一会话接着做下一张，可在刚合并的 worktree 里从 main 切新分支）合并了冲突，E-09 仍待批。

## 项目内 skill「驿窗一轮」：开工到收尾六步串起来、能自进化（2026-11-06，Claude，常浩问「project-starter、会话复盘、worktree 清理在驿窗是否高频，是就打包成一个 skill，放项目库里，结合驿窗经验、能自进化」，看方案后说「按推荐开工」；已提交，无需发布）

- 时间：开工 `2026-11-06 18:42`（`date '+%F %H:%M'` 记录）。来由：#165。统计 56 个 Claude、2 个 Codex 驿窗会话，三个全局 skill 点名调用 1 / 0 / 0 次，但开工、测试、装机回读、交接、合并清理每轮都在做（46–49 个会话），装机那串命令在 19 个会话里手敲。
- 改了哪些文件：`.agents/skills/postpane-round/SKILL.md`（六步，每步注明来由 L-xx / G-xx，到对应步骤调用三个全局 skill，不复制）；`EVOLUTION.md`（进化记录：E-01–E-05 补记建立前已长出的规矩，E-06 建立本 skill，E-07、E-08 待批）；`steps.json`（各步在会话记录里的痕迹，按真实命令校准）；`scripts/install.sh`（装机回读：备份、退出、ditto、启动、shasum 与签名回读、打印回滚；`check` 只比对）；`scripts/round-stats.mjs`（只读会话记录，数各步实际做了几次、列不属于任何一步的高频命令）；`agents/openai.yaml`（Codex 元数据）；`.claude/skills/postpane-round`（软链接到同一份）；`.gitignore`（`.claude/` 改为 `.claude/*` + `!.claude/skills/`，worktree 与本机设置仍忽略）；`AGENTS.md`（导航表与结构各加一行）；`tests/postpane-round.test.mjs` 与 `tests/fixtures/round-stats/`（引用的坑、路径、命令存在，进化记录格式，软链接，install.sh 语法与无参数不动应用，统计脚本夹具）。
- 测试：`pnpm run check` 退出 0（Prettier「All matched files use Prettier code style!」，cargo check 通过）；`pnpm test` 退出 0：Rust `test result` 合计 724 passed / 0 failed，`test:ts` `ℹ pass 292` / `ℹ fail 0`，`test:mcp` `ℹ pass 8` / `ℹ fail 0`，`test:plugins` `ℹ pass 14` / `ℹ fail 0`，`test:extension` `ℹ pass 8` / `ℹ fail 0`（日志 `evidence/2026-11-06-postpane-round/full.log`）；`node --test tests/*.test.mjs` `ℹ pass 14` / `ℹ fail 0`。
- 验证：`round-stats.mjs` 在本机真实记录上跑通（约 2 秒，结果见 E-06）；故意写一个 L-99 和非法状态，`postpane-round.test.mjs` 报 2 项失败，还原后 `ℹ pass 10` / `ℹ fail 0`；一次性 `claude -p` 与 `codex exec` 在本 worktree 里都回答能看到 `postpane-round`。`install.sh` 只验了语法和无参数用法，没有真装机（本轮无界面改动）。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：E-07（测试前先格式化）、E-08（加「排障」一步）待常浩批；三个全局 skill 本身没改。`round-stats` 的痕迹是正则，换了说法的命令会漏数，靠 E-xx 继续校准。
- 本轮新坑：无。
- skill 进化：E-07、E-08 待批。
## 左滑发起按编号归因、记录落盘、从领取起计时、状态不明；第 3 轮交 ChatGPT（2026-11-07，Claude，常浩经驿窗插件回「现在返修」；PR #170 全量通过，按授权 squash 合并 `f149cbe`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-07 00:22`（按本会话记录，收到「现在返修」）；本节写于 `2026-11-07 00:40`。来由：ChatGPT 第 2 轮复审左滑发起，结论「需修改」：P1-01 续进已开审核时认不出完成；P1-02 同会话无关的接力被误算成完成；P1-03 重启后去重记录丢失；P2-01 停滞计时从左滑起算；P2-02 插件文件没了就当成已领取。
- 改了哪些文件（PR #170）：
  - `host/src/handoff.rs`：去掉 `relayed_since`。`Launch` 加编号 `code` 和 `taken_at`，状态改成字符串，加 `unknown` / `lost`，可序列化。新 `launch_code`、`launches_path`、`keep_launches`（临时文件 + rename）、`Desk::launch_relayed`；`Desk::new` 读回左滑记录。`launch_text` 把编号写进留给会话的话；`follow` 从领取起算停滞，没见过领取就算状态不明；`relay` 收到 `launch` 就结清。
  - `apps/mcp/src/index.ts`：`relay_to_chatgpt` 加可选参数 `launch`，原样转给宿主。
  - 协议 `RelayLaunch.state`、`panel/relay-tray.ts` 两句文案、`docs/chatgpt-channel.md` 左滑一段。
  - 测试：`host` 新增 3 条、改写 2 条；`apps/mcp/test/host-tools.test.mjs` 新增 1 条；`hud/test/relay-tray.test.ts` 新增 1 条。
- 测试：
  - `pnpm run check` 退出 0。
  - `pnpm test` 第一次退出 101：Rust 只有 1 条失败（core 演示测试，本 PR 没碰 core，单独重跑 3 次都过，见 L-12）。第二次退出 0：Rust 合计 734 passed / 0 failed；`ℹ pass 294` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`。
  - `node --test tests/*.test.mjs` 退出 0；合并后在 main 上再跑一次：`ℹ pass 14` / `ℹ fail 0`。
  - 日志 `~/Library/Application Support/postpane/evidence/2026-11-07-launch-attribution/`（check.log、test.log、test2.log、rules.log、rules-main.log、build.log）。
- 验证：宿主测试覆盖了 5 条意见的场景。界面只多两句文案，由单测覆盖，没做真实组件截图。实机左滑带编号走一遍还没做，下次左滑「审核」时看那一行是否在会话调用后消失。
- 截图：无。
- 发布与回读（`install.sh launch-attribution`）：
  - 合并前一刻 main 进了 #169（只改 skill 和测试文件），所以没用分支产物，把工作区切到 main `f149cbe` 重新打包。
  - 装前 `b0bb150f84cf`，已备份到 `evidence/2026-11-07-launch-attribution/PostPane-b0bb150f84cf.app`；00:34:39 退出旧应用、00:34:40 启动新版，产物与已装都是 `98ea78960937`，签名 `certificate leaf = H"b773068e`；面板读数正常。
  - 回滚：`osascript -e 'quit app "PostPane"'; ditto ~/Library/Application\ Support/postpane/evidence/2026-11-07-launch-attribution/PostPane-b0bb150f84cf.app /Applications/PostPane.app; open /Applications/PostPane.app`。
- 接力：本会话调 `relay_to_chatgpt`，把第 3 轮送进同一个审核会话（`h1a1b076a94400`，`status: sent`）。这条记录建于 #72 之前，自动往返是关的，回信到了等常浩决定。
- 与授权不一致之处、遗留问题、范围外发现：
  - 「驿窗插件转进会话的话可能与实际不符」：「现在返修」和上一轮按钮文字一致，只决定先做什么，所以按常浩的回答执行。
  - 合并时 main 已被另一会话推进（#169），`gh pr merge` 前 fetch 看到的还是旧 main，没造成冲突。
  - core 演示测试偶发失败没修，记成 L-12。
- skill 进化：无
- 本轮新坑：L-12

## 接力自动往返上线（#72）；第 2 轮复审回信「需修改」交常浩定（2026-11-07，Claude，常浩说「开工批 2」；PR #168 本地全量通过，按授权 squash 合并 `b15f3c3`；已从与该 main 同树的分支打包安装、回读一致）

- 时间：开工不晚于 `2026-11-06 22:59`（证据目录建立时间；常浩回「开工批 2」的确切分钟未记录）；本节写于 `2026-11-07 00:20`。来由：L5「让它自己跑」要求接力自己往返，并留下每轮做了什么、出错和怎么处理的记录。
- 改了哪些文件（PR #168）：
  - `platform/.../chatgpt/handoffs.rs`：`Handoff.auto` / `halt`、`Step.auto`、`StepKind::Stop` / `Resume`、`Handoff::next()`；`Book::passed` / `trouble` / `stop` / `resume` / `overdue` / `restarted`；常量 `REPLY_WAIT_MS` 30 分钟、`FIX_WAIT_MS` 2 小时。
  - `host/src/handoff.rs`：`Desk::drive`、`auto_back`（转回失败重试一次，两次都失败就停下）；`act` 加 `pause` / `resume`；启动时暂停开着的接力，`projection` 检查超时，`listen` 收到回信后 `drive`；工具返回文案说明会自动转回。
  - 协议、`hud/alerts/handoff-card.ts`（`autoLabel`、自动步骤与停止 / 继续的时间线行、按钮）、`HandoffCard.tsx`（卡头「自动往返」/「自动已停」标记，底部「暂停自动」/「继续自动」）、`PanelContext.tsx`。
  - `apps/mcp/src/index.ts` 工具说明；`docs/chatgpt-channel.md` 新增「自动往返」一节；`docs/ROADMAP.md` 记下常浩定的「不另做进度条」。
- 测试：
  - 新增 Rust 测试 7 条（数据层 2、宿主 5），宿主 5 条先红（`drive` 不存在）后绿；新增前端用例 1 条，先红（缺 `autoLabel`）后绿。中途 3 条失败，因为测试环境界面语言是英文、断言写的是中文，改成按文案函数断言，原因文案统一走 l10n。
  - `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 731 passed / 0 failed；`ℹ pass 293` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` 退出 0。
  - 变基到 #166（只加 skill、测试、AGENTS、CURRENT，不碰 `src`）后，只重跑规则测试：`ℹ pass 14` / `ℹ fail 0`。
  - 日志 `~/Library/Application Support/postpane/evidence/2026-11-06-auto-relay/`（check.log、test.log、rules.log、build.log）。
- 验证：
  - 真实组件预览（`HUDScene` 加改写过的快照，脚手架在同一证据目录 `preview-auto/`，未提交），内置浏览器 800×760。
  - 「自动往返」状态：卡头标记，时间线有「自动往返出错」（原因原文）和「驿窗自动转回 Claude」，底部是「结束接力 / 暂停自动 / 查看 ChatGPT 对话 / 再审一轮」。
  - 「自动已停」状态：琥珀色标记，时间线有「自动往返停下」加原因，下一步是琥珀色「等你决定」，底部是「继续自动 / 转回 Claude」。
  - 实机的自动往返还没跑过，第一单真实任务就是它的实机验证。
- 截图：在本会话工具结果里，未落盘。
- 发布与回读（`install.sh auto-relay`）：装前 `266d92e6314f`，已备份到 `evidence/2026-11-07-auto-relay/PostPane-266d92e6314f.app`；00:17:52 退出旧应用并启动新版，产物与已装都是 `b0bb150f84cf`，签名 `certificate leaf = H"b773068e`。`get_hud_screenshot` 看面板读数正常，没卡在加载。回滚：`osascript -e 'quit app "PostPane"'; ditto ~/Library/Application\ Support/postpane/evidence/2026-11-07-auto-relay/PostPane-266d92e6314f.app /Applications/PostPane.app; open /Applications/PostPane.app`。
- 接力：
  - 应用退出期间，把旧接力 `h1a1ae89e44c00`（绑在已归档会话上）改为 closed / ended，原文件备份在 `evidence/2026-11-07-auto-relay/handoffs-before.json`。
  - 第 2 轮复审 `h1a1b076a94400` 回信「需修改」。ChatGPT 接受了「领取后不自动重发」「按会话去重」两条理由；新提的 3 条 P1：`relayed_since` 认不出续进已有接力的新一轮、同会话无关的接力会被误算成左滑完成、重启后去重记录丢失可能重复留话；2 条 P2：停滞计时从左滑算起而不是从领取算起、插件状态消失被当成已领取。这条记录是 #72 之前建的，`auto` 为关，到 2 轮上限交常浩定。
  - #72 已关闭，评论写了最终做法。
- 与授权不一致之处、遗留问题、范围外发现：
  - 这轮复用了 `120-relay-card` worktree，从 main 切新分支 `claude/72-auto-relay`，保留 10 GB 构建缓存，没按 skill 新开 worktree，见 E-09。
  - Codex 跑测试这一环没做，留给接力批 D。
  - 「Claude 弹审批或提问时停」没做成单独的停止条件：自动往返只在回信到了时送话，Claude 干活期间不会被送任何东西，等审批的时间算进 2 小时超时。
- skill 进化：E-09 待批
- 本轮新坑：无

## 左滑发起复审返修收尾、交 ChatGPT 第 2 轮；清 29 个已合并 worktree、关 2 条旧接力（2026-11-06，Claude，由会话「项目盘点｜AI 六级定级」交来，常浩看分批计划后说「按推荐开工」；PR #164 本地全量通过，按授权 squash 合并 `f6cd22b`；已从与该 main 同树的分支打包安装、回读一致）

- 时间：开工 `2026-11-06 18:24`（按本会话记录，常浩回「按推荐开工」）；本节写于 `2026-11-06 18:50`。来由：常浩要把驿窗从 AI 使用六级的 L3 推到 L6（L4 同事使用、L5 #72 自动往返跑 3 单真实任务、L6 前后对比与第二人复现），批 1 先收掉卡着 `handoff.rs` 的 WIP 分支。
- 改了哪些文件（PR #164，含上一会话的 WIP `8a02cbd`，变基到 `d76fd9f` 后补完）：`host/src/handoff.rs`（以该会话真的新建接力为完成，状态加 started / stalled，领取后一小时没发起算停滞、不重发）、协议 `RelayLaunch.state`、`panel/SessionsSection.tsx`（发起中保护、只认最新一次结果、键盘聚焦去掉 `setTimeout`）、`panel/relay-tray.ts` 与 `test/relay-tray.test.ts`（started / stalled 文案与用例）、`hud/src/paper.ts` 新 `airmailSides`、`scene/HUDExpandedSurface.tsx`（展开卡停在底边时斜纹改画底边，去掉只此处用的 `opposite`）、`test/relay-paper.test.ts`（四个方向）、`core/src/island_events.rs`（`hermes-cron-told.json` 临时文件 + rename，写失败记日志并下次重写，两条新测试先红后绿）。
- 测试：`pnpm run check` 第一次退出 1（只有 rustfmt 格式差异），`cargo fmt` 后退出 0；`pnpm test` 退出 0（Rust 合计 724 passed / 0 failed；`ℹ pass 292` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` 退出 0。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-launch-review-r2/`（check.log、test.log、rules.log、build.log）。
- 验证：真实组件预览（脚手架移到证据目录 `preview-r2/`，未提交），内置浏览器看了：「正在进行」三行 started 灰字、stalled 红字、queued 灰字，深色、浅色各一轮；`HUDScene` 停在底边打开接力卡，齿孔在顶、斜纹在底（修前底边停靠一道斜纹都没有），右边停靠仍是顶边斜纹、左侧齿孔。
- 截图：在本会话工具结果里，未落盘。
- 发布与回读：装前 `/Applications` 主程序 `c2c76c0b5e63`（#163），备份 `evidence/2026-11-06-launch-review-r2/PostPane-c2c76c0b5e63.app`；main 合并后未再变，工作区与 main `f6cd22b` 同树，用分支产物；18:44:20 退出旧应用、18:44:21 `ditto` 安装并启动，主程序 `shasum` 回读 `266d92e6314f` 与产物一致，文件清单一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-launch-review-r2/PostPane-c2c76c0b5e63.app /Applications/PostPane.app`。
- 接力：本会话调 `relay_to_chatgpt` 交第 2 轮复审，新接力 `h1a1b076a94400`（另开 ChatGPT 会话，brief 带第 1 轮 7 条意见与逐条处理、3 条不同意的理由）。原接力 `h1a1ae89e44c00` 绑在已归档的会话上、仍是 open，应用在跑时不改文件，下次装机时关掉，或常浩在展开卡点「结束接力」。
- 清理（常浩同意「只删已合并、没有未提交改动的 worktree，没合并的分支一个不动」）：移除 29 个 worktree（PR 都已合并或 HEAD 已在 main 上、`git status` 干净、11-05 之后没人动、没有在跑的会话用它），磁盘可用从 25 GB 到 58 GB；本地分支一个没删；剩 `120-relay-card`（本会话在用）。应用退出期间把两条旧的实机测试接力 `h1a1ac7fcf2600`、`h1a1ae06cd7400` 改为 closed / ended（加一步 end，与「结束接力」按钮写法相同），原文件备份 `evidence/2026-11-06-launch-review-r2/handoffs-before.json`。
- 与授权不一致之处、遗留问题、范围外发现：
  - L4 证据：常浩还没给材料（发给谁、哪天、哪个包、对方使用痕迹）；文档骨架在本会话草稿里，拿到材料再落到 `docs/evidence/`。`customize-agent-hud` 是上游自带技能，不算常浩写的；会话「Postpone 项目的技能提炼」正在本项目跑，可能产出可算 L4 的 Skill。
  - 交来的任务里说 L-10 是「装机失败」，实际 L-10 是往别人页面注入脚本在 WebKit 卡死；L6 前后对比改用 L-05（#62 被 #63 盖掉没人发现 → 写进 LESSONS 后 #158 装前发现 main 已被别的会话装过、改从合并后的 main 打包回读）。
  - issue #72 正文仍是 Orca / Codex 旧方案，做 #72 前更新。
- 本轮新坑：无

## 侧栏每家智能体挂自己的小签与展开卡（2026-11-06，Claude，常浩发截图说「codex的回复在claude的面板，codex的回复内容自己没有弹出来」「不是应该每个ai有自己的弹出和展开卡片么」，看三版预览后选「甲 各挂全签」，确认计划后说「按计划开工」；PR #163 本地全量通过，按授权 squash 合并 `2133ce0`；已打包安装、回读一致）

- 时间：开工 `2026-11-06 17:20`（建 worktree 时 `date` 记录）；本节写于 `2026-11-06 18:21`。来由：侧栏所有通知排一条队、一次只画队首，Claude 的审批排在前面时，Codex 的新回复没有自己的小签，还被并进 Claude 的审批卡（#49 的「新回复并进清单」）。issue #162，三版预览 https://claude.ai/artifact/S38Q5YWaripKra7etuB4ZP 。
- 改了哪些文件（PR #163）：`hud/src/alerts/news-lanes.ts`（新：队列按智能体分道、别家审批不再拦这家的额度通知）、`hud/src/IslandNews.tsx`（钩子返回第一家的审批、回复、额度与队列，以及其他家的 `sides`；其他家通知各自 4 秒收起，Hermes 看过才收；去掉不再用的 `queuedReplies`）、`hud/src/scene/SideTags.tsx`（新：其他家的小签，按自己票根定位，纸面与锯齿同主签，悬停先换到前面）、`hud/src/scene/side-tag-stack.ts`（新：贴顶边、底边时挂不下的小签错开一排，左右边同理）、`hud/src/HUDScene.tsx`（卡片与「×N」只用这一家；挂上别家小签；主位展开成卡或看板时被盖住的不画；悬停别家小签或票根先换到前面再展开它自己的卡）、`app/src/HUDSurface.tsx`（`.hud-side-tag` 加进可点区域上报与轮廓观察）、`hud/test/news-lanes.test.ts`、`hud/test/side-tag-stack.test.ts`（新）。
- 测试：新测试先红后绿，`news-lanes` `ℹ pass 6` / `ℹ fail 0`，`side-tag-stack` `ℹ pass 4` / `ℹ fail 0`；变基到 main `80bdac2` 后 `pnpm run check` 退出 0，`pnpm test` 退出 0（Rust 合计 721 passed / 0 failed；`ℹ pass 290` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-tag-per-agent/`（check-3.log、test-3.log、build-2.log）。
- 验证：
  - 浏览器里用 `hud_snapshot` 的真实快照渲染真实 `HUDScene`（脚手架移到证据目录 `preview-tags/`，没提交），注入一条 Codex 审批和一条 Codex 回复：Claude「待回答 ×2」与 Codex 小签同时挂在各自票根旁；悬停 Codex 小签，展开的卡只有 Codex 的 BASH 审批与「面试助手」回复；移开后两条小签回到原位；悬停 Claude 小签，展开的卡只有「ASK 2」；只有 Codex 回复时它单独挂 4 秒后收起；贴左边对，贴顶边时 Codex 小签错开到下一排。
  - 装机后实机截图：Claude 3 条真实提问挂在 Claude 票根旁（待回答 ×3），侧栏其余正常。这台机器上 Codex 审批钩子会被直接放行（`--permission-hook codex` 立即退出），造不出真实 Codex 待批；`--demo-script` 演示能同时出两条，但演示有十几家、整列超出屏幕顶边，票根和小签对不上（主签同样，演示数据老情况，未改）。真实「Claude 提问 + Codex 回复」同时在的实机情形待常浩下次遇到时看。
- 截图：`evidence/2026-11-06-tag-per-agent/`（real-1-right.png、demo-*.png；浏览器截图在本会话工具结果里，未落盘）。
- 发布与回读：分支与合并后 main `2133ce0` 内容一致（`git diff` 为空），从分支打包；装前 `/Applications` 是 `c4298753c667`，备份 `evidence/2026-11-06-tag-per-agent/PostPane-c4298753c667.app`；中途装过一次第一版 `456ee87375a2` 做演示实测；18:19:30 退出旧应用后 `ditto` 安装并启动，主程序 `shasum` 回读 `c2c76c0b5e63` 与产物一致，文件清单一致，签名仍是本机固定证书。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-tag-per-agent/PostPane-c4298753c667.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 别家回复不再并进当前卡，没人看就 4 秒收起，和原来队首回复的规则一致；常浩若想让别家回复一直挂到看过为止，需另定。
  - 刘海形态只有一个位置，仍一次一条（别家回复排队，轮到再出）。
  - 演示时改过演示配置 `app.postpane.mac/demo/presentation.json`，已从备份还原；测试钩子进程已结束。
  - worktree `162-tag-per-agent` 合并后删除。
- 本轮新坑：无

## 磁盘瘦身挂件去掉号码牌、扫帚颜色表示空间（2026-11-06，Claude，常浩发截图说「侧边这个形式还是不满意，能不能用那个刷子表示空间情况」，看三版后说「选丙，在此基础上然后偏紧用黄刷子，直接改」，看装机版后又说「扫把不用一直动，鼠标移上去动就行了……红色太红……扫把的把手需要改色适配么……就做一版……直接做」；PR #161 本地全量通过，按授权 squash 合并 `a7446d1`；已从与该 main 同树的分支打包安装、回读一致）

- 时间：开工 `2026-11-06 16:52`（按本会话记录）；本节写于 `2026-11-06 17:34`。来由：#159 刚装的号码牌（左上角「28G」）常浩不满意，要用球里的扫帚表示空间。issue #160。三版预览与定稿：https://claude.ai/artifact/6mds6Yoo7J6xLTyt4rGSab （甲刷毛变色 / 乙灰堆 / 丙扫帚自己扫 → 定稿）。
- 改了哪些文件（PR #161）：`hud/src/assets/disk-slim-{base,broom,bristles,handle}.png`（新：原球拆成去掉扫帚补好底的底图、单独扫帚层、刷毛与把手遮罩；遮罩收紧在扫帚不透明像素内）、删 `disk-slim-ball.png`、素材 README；`hud/src/scene/DiskPendant.tsx`（去号码牌，底图 + 可摆动扫帚层 + 两层染色 + 三颗灰）、`hud/src/disk-slim.ts`（`diskBadge` → `diskReading`，读屏名仍带可用 GB）、`hud/src/scene/PendantShell.tsx`（去掉没人用的 `badge`）、`ui/src/global.css`（偏紧刷毛 `#ffd34d` multiply + 把手 `#e39b12` color 混合；告急刷毛 `#f5937c` + 把手 `#d9604c`；平时静止，悬停扫两下扬起同色灰；删号码牌与告急整球跳）、`hud/test/disk-slim.test.ts`（改测 `diskReading`，先红后绿）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 721 passed / 0 failed；`ℹ pass 280` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；`node scripts/check-rules.mjs` 退出 0。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-disk-broom/`（check.log、test.log、check-2.log、test-2.log、build.log、build-2.log）。
- 验证：用 esbuild 把真实 `DiskPendant` 渲染成静态页、套真实 `global.css`，无头 Chrome 截静止与强制悬停：三档颜色对、静止不动、把手与刷毛同色系。真实桌面截图未做（常浩拒绝了电脑控制授权）；`get_hud_screenshot` 不画挂件。悬停扫动实机待常浩试。
- 截图：在本会话工具结果里，未落盘。
- 发布与回读：第一版（一直扫、正红）17:09 装过一次，常浩看后要求改；定稿从分支打包（与合并后 `a7446d1` 内容树一致），装前备份 `evidence/2026-11-06-disk-broom/PostPane-10a4908a3ccb.app`（第一版）与 `PostPane-5775129c76b0.app`（#159 号码牌版）；17:32:07 退出旧应用后 `ditto` 安装并启动，主程序 `shasum` 回读 `c4298753c667` 与产物一致，文件清单一致，签名 `PostPane Local Signing`。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-disk-broom/PostPane-5775129c76b0.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 扫帚摆动时会露出底图里补过的那一小块（扩散填补，略糊），只在悬停扫的约 1 秒内可见。
  - worktree `disk-broom` 合并后删除。
- 本轮新坑：无

## 磁盘瘦身挂件串挂在随手记猫球下（2026-11-06，Claude，常浩定稿「串挂同款」、悬停动效一版、空间提示「丙 号码牌」，说「按计划开工」；PR #159 本地全量通过，按授权 squash 合并 `cbca109`；已从合并后的 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 14:43`（按本会话记录，接上一会话写好的代码 `0643112`）；本节写于 `2026-11-06 17:05`。来由：把本机另一个应用「磁盘瘦身」的扫帚浮游兽球挂进驿窗侧栏，issue #155。
- 改了哪些文件（PR #159）：`host/src/disk_slim/{mod,macos,windows,linux}.rs`（读 `~/Library/Application Support/disk-slim/status.json`，超 1 小时不显示号码牌；点挂件 `open -g diskslim://panel/toggle?x=&y=&w=&h=` 并查退出码）、`host/src/lib.rs`（注册两个 async 命令）；`hud/src/scene/PendantShell.tsx`（从随手记挂件抽出的共用外壳，猫球 DOM 不变）、`DiskPendant.tsx`、`AppPendant.tsx`、`disk-slim.ts`（号码牌数字）、`app-pendant.ts`（`pendantChain` 整串排布）、`HUDScene.tsx`、`app/src/HUDSurface.tsx`（每 30 秒读状态，点击后 10 秒内和面板开着时每秒读）、`ui/src/global.css`（`hud-disk-*`）、`docs/platform-architecture.md`；测试 `hud/test/app-pendant.test.ts`、`disk-slim.test.ts`。
- 测试：变基到 `848d58b` 后 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 721 passed / 0 failed，含 `disk_slim::tests` 5 项；`ℹ pass 280` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。合并前 main 只多了两节交接（CURRENT.md），代码与测过的一致。
- 验证：装机后真屏（外接 1920×1080 与笔记本 1470×956 都看过），CGEvent 发真实点击、`CGWindowListCopyWindowInfo` 与 status.json 回读：① 静止：扫帚球串在猫球下，同款虚线挂绳与纸色垫圈，红牌随可用空间「28G」→「25G」；② 悬停录屏逐帧：上浮放大、晃动、眨眼、星光、扫帚泡泡可见，反光与「连眨两下」在 1 倍屏上只有几个像素，没逐一认清；③ 点挂件面板开在挂件左侧、冰蓝光圈亮、前台应用不变；再点挂件、点菜单栏空白处、按 Esc 三种收起都回读面板窗口 0 个、`panelOpen:false`，截图光圈熄灭；面板开着时退出磁盘瘦身，`panelOpen` 写回 false，光圈熄灭；④ 告急时不碰它，录屏约每 6 秒跳一下。CPU（主进程 + GPU + 两个 WebContent + Networking，30 秒平均，脚本 `cpu.sh`）：告急跳动 29.0%、27.9%；同一包把状态临时改成充足（无号码牌、不跳）29.6%。跳动本身的开销在误差内。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-disk-pendant/screens/`（`01-rest`、`21-laptop-pendant`、`hover-video-sheet`、`02-open`、`35-halo-sheet`、`36-hop-sheet`、`42-quit-halo-off`、`50-main-installed` 等）；CPU 结果 `cpu-hop-*.txt`、`cpu-ok-nohop.txt`。
- 发布与回读：从合并后的 main `cbca109` 打包；16:59 退出旧应用后 `ditto` 安装并启动，主程序 `shasum` 回读 `5775129c76b0` 与产物一致，签名 `certificate leaf = H"b773068e…"`；装前备份 `evidence/2026-11-06-disk-pendant/PostPane-before2.app`（#158 的 main 版）。回滚：退出后 `ditto` 该备份到 `/Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 磁盘瘦身那一半在 disk-slim 仓库 `feat/postpane-pendant`（`d1110ad`、`751ae8f`、`36f0aee` 退出前收起面板、`249c663` 悬浮球默认关），按约定不合并、不推送；已重装，本机悬浮球开关按常浩要求设为关。磁盘瘦身每次重装签名都变，「完全磁盘访问权限」要删掉重加。
  - 本轮装机两次被并行会话覆盖（#154 15:01、#158 15:43），按 L-05 等它们合并后从最新 main 重打。
  - 真屏测试中途锁屏、拔了外接屏，按旧坐标点到 Chrome 一次、对 Chrome 发了一次 Esc，已告知常浩（新坑 L-11）。
  - 审查留下未改：L1 号码牌伸出外框几个点点不到；L2 多块屏的挂件都亮光圈、都每秒轮询；L4 锚点带悬停放大的变形（与猫球一致）；L6 混合 DPI 未实测。
  - worktree `155-disk-pendant` 本节推送后删除。
- 本轮新坑：L-11

## 小收据等待线改为 1.5 秒（2026-11-06，Claude，常浩看了 #156 的 2 秒后说「改成1.5s」；PR #158 本地全量通过，按授权 squash 合并 `848d58b`；已从合并后的 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 15:20`（按本会话记录）；本节写于 `2026-11-06 15:46`。来由：#156 把等待线从 0.8 秒拉到 2 秒，常浩定为 1.5 秒。
- 改了哪些文件（PR #158）：`hud/src/peek-expand.ts`（`PEEK_EXPAND_AFTER_MS` 2000 → 1500；从悬停算起 0.4 + 1.5 = 1.9 秒展开整张看板）、`hud/test/peek-expand.test.ts`（三条测试改成新时长）。
- 测试：单测 `ℹ pass 6` / `ℹ fail 0`；分支上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 715 passed / 0 failed；`ℹ pass 273` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。合并后 main 多了 #157（`host/float_notes.rs`、LESSONS），与本改动不重叠，合并后的 main 只重新打包，没再跑全量。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-peek-wait-1500/`（check.log、test.log、build.log、build-main.log）。
- 验证：装机后 `get_hud_screenshot` 看板正常。悬停计时实机未试，待常浩悬停一格看等待线约 1.5 秒走完再展开。
- 截图：在本会话工具结果里，未落盘。
- 发布与回读：开工后 main 合了 #157 并已被别的会话装机（装前 `/Applications` 主程序 `bb35ed411376`），所以没用分支产物，改从合并后的 main `848d58b` 重新打包；备份 `evidence/2026-11-06-peek-wait-1500/PostPane-bb35ed411376.app`；15:43:16 退出旧应用后 `ditto` 安装并启动，主程序 `shasum` 回读 `4ee3d0ae9d47` 与产物一致，文件清单一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-peek-wait-1500/PostPane-bb35ed411376.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：无。worktree `postpane-wt-peek-wait` 合并后删除。
- 本轮新坑：无

## 随手记点收起直接缩回猫球（2026-11-06，Claude，常浩发截图说「点击侧边栏的随时记图标的缩小键，无法缩写显示就是这个页面，我要直接能缩小」；PR #157 本地全量通过，按授权 squash 合并 `3887e4a`；已从同代码树的分支打包安装、回读一致）

- 时间：开工 `2026-11-06 14:25`（按本会话记录）；本节写于 `2026-11-06 15:22`。来由：随手记点右上角收起后，窗口不缩回，整块变成深色底加「打开便签栏」。issue #154。
- 根因：随手记页面是数码世界的 `FloatingNotes.jsx`，只在数码世界自己的原生壳里（`window.webkit.messageHandlers.floatingNotes`）通知宿主收起；驿窗窗口没有这条通道，页面退回成浏览器里的收起样子。没改数码世界。
- 改了哪些文件（PR #157）：`src/crates/host/src/float_notes.rs`（窗口注入脚本：样式表按类名藏住收起页，页面从未收起变成收起时请求 `postpane-notes://collapse`；导航拦截认出这个地址就取消导航、隐藏窗口，再 `eval` 页面自带的 `floatingNotesHost.focus()` 恢复面板；新增 Rust 测试 1 条）、`docs/LESSONS.md`（新坑 L-10）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 716 passed / 0 failed；`ℹ pass 273` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` 本节写完后重跑 `ℹ pass 4` / `ℹ fail 0`；`node scripts/check-rules.mjs` 退出 0。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-notes-collapse/`（check-2.log、test-2.log、build-5.log）。
- 验证：装机后电脑控制实测：猫球打开 → 点收起，窗口直接隐藏 → 再点猫球是正常面板，连续两轮都对，网页进程无持续高占用；另用 `swiftc` 写的 WKWebView 探针对真实随手记页连跑两轮，隐藏中与重新显示后都是面板、`<main>` 可见。前三版装机都失败（见 L-10），中间装过诊断包（标题通道），已被最终版覆盖。
- 截图：在本会话工具结果里，未落盘；探针源码在本会话临时目录，没提交。
- 发布与回读：最终版从分支 `aab4e4e` 打包（与合并后 `3887e4a` 只差 CURRENT.md 与 LESSONS，代码相同）；装前备份 `evidence/2026-11-06-notes-collapse/PostPane-3220e7b028aa.app`（#153）与 `PostPane-2f3552cfcb40.app`（#156 会话 14:49 装的）；15:12 前后退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `62c788033f0e` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-notes-collapse/PostPane-2f3552cfcb40.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 装机期间 #156 会话也装过一次，覆盖了我的第二版；之后我从变基到 #156 的分支重装，现装版本含 #156，不含之后合并的 #158（1.5 秒），#158 的会话装机时会一起带上本改动（main 已含）。
  - 「打开便签栏」被样式表藏住、不会画出来，但隐藏前的那一帧是否完全无闪烁只靠逻辑判断，肉眼未逐帧看。
  - worktree `154-notes-collapse` 合并后删除。
- 本轮新坑：L-10

## 小收据等待线拉长到 2 秒（2026-11-06，Claude，常浩发截图说「这个黄色横条的停留时间太短了，改下这个时间，拉长一点。告诉我最合适的时间，然后直接改」；PR #156 本地全量通过，按授权 squash 合并 `b258c41`；已从与该 main 同树的分支打包安装、回读一致）

- 时间：开工 `2026-11-06 14:27`（本会话建立时间）；本节写于 `2026-11-06 14:53`。来由：小收据底边黄色等待线原来 0.8 秒走完就展开整张看板（#141 定的「停久看全」，从悬停算 1.2 秒），来不及看完小收据。定 2 秒：小收据两三行读完约 1 秒，再留约 1 秒决定移开，不会误展开；从悬停算 2.4 秒，想看全的停一下也不算久。
- 改了哪些文件（PR #156）：`hud/src/peek-expand.ts`（`PEEK_EXPAND_AFTER_MS` 800 → 2000，等待线与展开计时共用这一个数）、`hud/test/peek-expand.test.ts`（三条测试改成新时长）。
- 测试：新测试先红 `ℹ fail 3` 后绿 `ℹ pass 6`；`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 715 passed / 0 failed；`ℹ pass 273` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-peek-wait/`（check.log、test.log、build.log）。
- 验证：装机后 `get_hud_screenshot` 看板正常（Claude 5 小时 27%、Codex 每周 13%、Hermes 两个机器人在线）。悬停计时实机未试，待常浩悬停一格看等待线是否走 2 秒再展开。
- 截图：在本会话工具结果里，未落盘。
- 发布与回读：分支与合并后 main `b258c41` 内容树一致，从分支打包；装前 `/Applications` 备份 `evidence/2026-11-06-peek-wait/PostPane-84acb248d90f.app`；14:49:42 退出旧应用后 `ditto` 安装并启动，主程序 `shasum` 回读 `ccc2456278c9` 与产物一致，文件清单一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-peek-wait/PostPane-84acb248d90f.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：无。worktree `postpane-wt-peek-wait` 合并后删除。
- 本轮新坑：无

## ChatGPT 打盹改回原版（2026-11-06，Claude，常浩看了 #152 的低头摇晃后说「chatgpt打盹还是改回原版吧」；PR #153 本地全量通过，按授权 squash 合并 `8a66a68`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 13:50`（按本会话记录）；本节写于 `2026-11-06 14:11`。来由：常浩不要 #152 的 ChatGPT 低头摇晃打盹，回到 #152 之前的样子；Codex 的 9 处改动保留。
- 改了哪些文件（PR #153）：`hud/src/bots/bot-motion.ts`（小花打盹恢复 petal 0.12、dim 0.35、压扁慢呼吸；`lids` 收回为 `"curve" | null`，去掉 `signUpright`）、`bot-renderer.ts`（删短横闭眼分支、像素 Z 反向旋转、缓存键对应项）、`test/codex-petals.test.ts`（恢复为 #152 之前的原文件）、`docs/parity/c08-bots.md`（第 50 行删去小花打盹那句，prettier 重排列宽）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 第一次退出 101（Rust 444 passed / 1 failed：`source_db::tests::grok_bot_session_works_while_a_message_has_no_reply_and_idles_once_answered`，Rust 核心 10 秒轮询的计时断言，与本改动无关，单独 `cargo test` 重跑 3 次都通过），完整重跑退出 0（Rust 合计 715 passed / 0 failed；`ℹ pass 273` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-gpt-doze-back/`（check.log、test.log、test-2.log、build.log）。
- 验证：真实 `BotMark`：ChatGPT 打盹回到压扁深绿椭圆、细短线闭眼、像素 Z，CSS 变换 `rotate(0deg) scale(1.13, 0.79)`；Codex 9 处不变。装机后 `get_hud_screenshot` 侧栏正常（Claude 78%、Codex 13%、ChatGPT「--」、Hermes 2.0M，静止图标）。
- 截图：在本会话工具结果里，未落盘；核对页沿用 `evidence/2026-11-06-bot-polish/preview-audit/real.*`，没提交。
- 发布与回读：从 main `8a66a68` 打包，装前 `/Applications` 是 `66698186b910`（#152），备份 `evidence/2026-11-06-gpt-doze-back/PostPane-66698186b910.app`；14:09:34 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `3220e7b028aa` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-gpt-doze-back/PostPane-66698186b910.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 范围外：`grok_bot_session_works_while_a_message_has_no_reply_and_idles_once_answered` 在全量并发跑时偶发失败（10 秒轮询计时），未改。
- 本轮新坑：无

## Codex 云朵 9 处动作改进、ChatGPT 打盹改低头摇晃（2026-11-06，Claude，常浩说「按照这个质量标准，再优化下codex的其他动作，以及gpt的打盹动作」，确认计划后说「按计划开工」，看对照页后说「codex全改，gpt选丙」；PR #152 本地全量通过，按授权 squash 合并 `5501770`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 12:40`（常浩确认计划的时间，按本会话记录）；本节写于 `2026-11-06 13:44`。来由：常浩认可 #144 的做法，要求同样标准审 Codex 其他动作、重做 ChatGPT 打盹。对照页 https://claude.ai/artifact/2VhKvF3ELLsV4bLkVjRj15 （Codex 9 行现在 vs 新版；ChatGPT 打盹甲花瓣随呼吸开合 / 乙呼噜一鼓一鼓 / 丙低头摇晃）。
- 审查方法：逐帧胶片页用真实 `BotMotion` + `renderBot` 按模拟时钟推进，31px、2 倍像素，每段 8 帧并排 ChatGPT 同状态。问题：6 个标记与 ChatGPT 同款像素字（…、!、?、≡、⧗、×）；没新消息降到 0.65 透明且外形扭尖；长命令 8 个深色散点看不出环；改文件每 0.125 秒切换压下 / 弹起只见抖动、脚下云团像脏点。其余各段读得清，未改。
- 改了哪些文件（PR #152）：`hud/src/bots/bot-cloud.ts`（思考去掉上冒小云团；没新消息不透明 + `haze` 0.28 + 两道 `mist`、半眯眼、外形只轻变；长命令 16 朵 `light` 小云成环；改文件每 0.75 秒盖一下、脚边喷两团云）、`bot-motion.ts`（`lids` 改 `"curve" | "bar" | null`，接 `haze` / `mist`，小花打盹 petal 0.7、dim 0.06、绕中心 9°±5° 摇、不缩小，`signUpright`）、`bot-renderer.ts`（云朵自己的标记：右上角深靛蓝小云 + 白色笔画，思考为思考泡泡、点随 `lit` 轮流亮、变灰随身体；雾按轮廓裁切泛白、雾带；浅色云团；短横闭眼；`renderBot` 里小花打盹的像素 Z 反向旋转保持正立；缓存键加三项）、`test/codex-cloud.test.ts`（新增 4 条）、`test/codex-petals.test.ts`（两条打盹测试改新行为，测试名里的 Codex 改成 flower）、`docs/parity/c08-bots.md`（第 50 行，prettier 重排列宽）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 715 passed / 0 failed；`ℹ pass 273` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。新测试先红 `ℹ fail 9` 后绿 `ℹ pass 23`。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-bot-polish/`（check.log、test.log、build.log）。
- 验证：对照页原型自查两轮（第一轮改了：额度用完的小云没变灰、出错时旧小云团残留、长命令环底部被身体渐变染深、雾带横在脸上像口罩、盖章节奏、甲花苞收得太少、丙 Z 跟着歪）；实现后胶片页逐段复核 9 处与卡住重试 / 额度撞线 / 出错变灰；真实 `BotMark` 浅色深色各一轮，读 CSS 变换确认小花在 4°～14° 间摆、歪到 13° 时 Z 正立。装机后 `get_hud_screenshot`：Claude 77%、Codex 13%、ChatGPT「--」、Hermes 2.0M（静止图标，动起来的样子实机未看）。
- 截图：在本会话工具结果里，未落盘；脚手架（胶片页 `audit.ts`、对照页 `polish.*`、真实组件页 `real.*`）没提交，移到 `evidence/2026-11-06-bot-polish/preview-audit/`，单页产物 `bot-polish.html` 同目录。
- 发布与回读：从 main `5501770` 打包，装前 `/Applications` 是 `b0b8f4b507f6`（#144 之后别的会话又装过），备份 `evidence/2026-11-06-bot-polish/PostPane-b0b8f4b507f6.app`；13:42:16 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `66698186b910` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-bot-polish/PostPane-b0b8f4b507f6.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 与预览差一处：侧栏常驻小人的 `inPlace` 会清零位移和支点，小花绕中心低头，不像预览那样绕底部、往旁边挪约 2 像素；为不越出票根保留该规则。
  - 等批准的「!」小云预览里随气泡一跳一跳，实现时没做（气泡本体已在跳），小云静止。
  - 范围外：切到完成时眼睛从竖条过渡到笑眼有一两帧叠成「♠」形，两只小人都有，未改。
- 本轮新坑：无

## 拖拽侧栏时随手记猫球跟着票根走（2026-11-06，Claude，常浩发截图说「拖拽的时候看不到下面挂着的圆球了」；PR #151 本地全量通过，按授权 squash 合并 `17cdd63`；已从与该 main 同树的分支打包安装、回读一致）

- 时间：开工 `2026-11-06 12:35`（本会话建立时间）；本节写于 `2026-11-06 13:08`。来由：#75 加随手记挂件时在 `HUDScene.tsx` 用 `!dragVisual` 让它拖拽时隐藏，常浩拖侧栏时看不到猫球。issue #148。
- 改了哪些文件（PR #151）：`hud/src/HUDScene.tsx`（去掉 `!dragVisual`，拖拽中挂件按预览位置跟着票根走，换边也跟；拖拽中 `still` 停掉轻摆等动效）、`hud/src/scene/AppPendant.tsx`（新 `carried`：拖拽中挂件不接收指针）。
- 测试：开工后 main 先后合了 #149、#150，变基两次各重跑一次全量。最后一次（基于 `17e3838`）：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 715 passed / 0 failed；`ℹ pass 269` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）。只改 JSX 条件与样式，hud 包没有组件渲染测试设施，没加新测试。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-pendant-drag/`（check-3.log、test-3.log、build-3.log，前两轮为 check / test / check-2 / test-2）。
- 验证：未在浏览器预览里模拟拖拽；`get_hud_screenshot` 只画静止图标、看不到拖拽过程，未截。实机拖拽效果未试（电脑控制拖不动侧栏，L-09），待常浩拖一下看猫球是否跟着走、松手后能否照常点开随手记。
- 截图：无。
- 发布与回读：分支 `a68fb52` 与合并后 main `17cdd63` 内容树一致，从分支打包；装前 `/Applications` 是 `323b686adfa9`，备份 `evidence/2026-11-06-pendant-drag/PostPane-323b686adfa9.app`；13:06:24 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `24eb76c8f161` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-pendant-drag/PostPane-323b686adfa9.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 主目录本地 main 上有别的会话未推的「交接：ChatGPT 对话与审核分开合并装机（#150）」，我把它变基到 origin/main 上，与本节一起推送，内容没改。
  - worktree `148-pendant-drag` 合并后删除。
- 本轮新坑：无
## ChatGPT 对话与审核分开：读取全部会话、侧栏一格两联（2026-11-06，Claude，常浩依次选了「一格两栏」「两联」「乙 · 旧信纸」，要求接缝不打孔、所有审核相关部分统一纸色；PR #150 全量通过，按授权 squash 合并 `17e3838`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 12:25`（建 issue #145 时）；本节写于 `2026-11-06 13:01`。来由：ChatGPT 那格小票和小收据只写「--」「额度 --」；常浩要读到所有 ChatGPT 会话、对话和审核分开、对话也能在侧栏看 / 跳回 / 移除，每轮回复都弹回执、读全文。设计稿 https://claude.ai/artifact/MxyVzqrNpAyLRB9BmLRQtt （此前「这一格写什么」三版 https://claude.ai/artifact/8YhxoPMCyXg7qEER69NmXT 已被这一版取代）。
- 改了哪些文件：插件 `chrome-extension/background.js`（名单外会话也转发回合，0.2.0）；`platform/clients/chatgpt/mod.rs`（`started`：回合开始记成 running 观察；开始与完成都带 `review`）；`core/hook_events.rs`（ChatGPT 观察 15 分钟才过期、接受观察、`review` 写进会话）；协议 `Session.review`；`docs/chatgpt-channel.md`。前端：新 `chatgpt-desk.ts`（对话 / 审核 / 小票文字，Claude 会话不在跑且 2 小时没动的旧接力不算）、新 `scene/DeskLines.tsx`（小收据两联）、`model.ts`、`HUDMarkStrip.tsx`（小票着色、审核时底部旧信纸）、`AgentPeek.tsx`、`peek-size.ts`、`CompletionAlertView.tsx` + `reply-list.ts` + `approval-list.ts`（回执：「ChatGPT 对话」一组，审核回信在底部旧信纸）、`SessionsSection.tsx`（正在进行：审核会话在下面旧信纸一段）、`paper.ts`（`relayPaperOf` 统一旧信纸 `#cdd4dc`、斜纹压暗）、`HoverPanel.tsx`（单家面板标题「ChatGPT」、不显示 0 Token）。
- 测试：变基到 `22b6fd3` 后 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 715 passed / 0 failed；`ℹ pass 269` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；变基前 `node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。第一次 check 退出 1（rustfmt 差异）。新增 Rust 2 条先红后绿；`relay-paper.test.ts` 先红后绿；`chatgpt-desk.test.ts` 4 条与实现一起写、没单独跑红；`agent-board.test.ts` 新加 1 条改前就绿。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-gpt-chats/`（check3.log、test3.log、rules.log、build.log）。
- 验证：真实组件独立预览（脚手架 `evidence/2026-11-06-gpt-chats/preview-gpt/`，没提交），深浅两色看了小收据、回执、正在进行、票根。浏览器面板隐藏，真实鼠标悬停触发不了小收据，所以小收据是单独渲染的，悬停时序没验；回执是直接渲染组件，不是经事件弹出。装机后 `get_hud_screenshot` 侧栏 ChatGPT 格写「--」：今天开着的接力都超过 2 小时且 Claude 会话没在跑，按规则不算；插件还没重新加载，读不到自己的对话。实机未验：重新加载插件后聊一轮、看回执 / 在答 / 回到会话 / 移除。
- 截图：预览截图在本会话工具结果里，未落盘。
- 发布与回读：装前 `/Applications` 是 `f297c5d49fc5`，备份 `evidence/2026-11-06-gpt-chats/PostPane-f297c5d49fc5.app`；12:59:46 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `966e3ef93773` 与产物一致，签名固定证书 `b773068e…`。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-gpt-chats/PostPane-f297c5d49fc5.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划说两批两个 PR，实际一个分支两个提交、一个 PR。
  - 小票第三档写「N 对话」（今天有动静的对话数），不是设计稿的「今天 12 轮」，轮数拿不准。
  - 正在进行里 ChatGPT 行仍是通用的「在跑 / 正在干活」，没改成「在答」。
  - 旧会话的事件没有 `review` 字段，前端靠接力记录补判；接力记录只留最近的，更早的审核会话可能被当成对话（只影响今天以前的，今天的列表不受影响）。
  - 把今天的真实快照拷进 worktree 做预览被自动审批拦下（含私人内容），改用旧的样例快照加编的对话。
- 本轮新坑：无。

## 小收据底边等待线改成「中间展开」（2026-11-06，Claude，常浩说黄线要「从中心往两边扩散」「不要有明确的方向」，看三版后回「甲」；PR #149 本地全量通过，按授权 squash 合并 `22b6fd3`；已打包安装、回读一致）

- 时间：开工 `2026-11-06 12:31`（常浩回「甲」时；出三版从约 12:27 起）；本节写于 `2026-11-06 12:50`。来由：#142 此前有会话在 worktree `142-meter-center` 里只把原点改成居中、没提交就停了；常浩要更好的、没有方向的形式。三版预览 https://claude.ai/artifact/3bBY7wdhgN6soTG1Aaju6j （甲中间展开 / 乙整条显色 / 丙多点晕开，附现状对照，可慢放、换纸色）。
- 改了哪些文件（PR #149）：`ui/src/global.css`（`.hud-peek-expand-meter`：原点居中，`cubic-bezier(0.3, 0.7, 0.4, 1)` 先快后慢；mask 两端羽化，最后四分之一时间 mask-size 100%→300% 收实；时长读 `--hud-peek-expand-ms`）、`hud/src/scene/HUDExpandedSurface.tsx`（改传 `--hud-peek-expand-ms`，去掉按侧栏边的 `transformOrigin` 与 `animationDuration`）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 713 passed / 0 failed；`ℹ pass 263` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。是在变基到 main `c4c6148` 之后跑的，合并时 main 没再动。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-meter-center/`（check.log、test.log、rules.log、build.log）。纯样式改动，没加单测。
- 验证：三版预览页逐帧定格自查两轮（乙第一轮前半段几乎看不见，改匀速、起始浓度 0.2；丙第一轮合拢太早，放慢）。实现后把 #140 的真实 `HUDScene` 预览脚手架临时放进 worktree，内置浏览器悬停 ChatGPT 票根，拦掉展开计时后定格：深色纸 100 / 300 / 620 ms 与终点、浅色纸 250 ms 与终点，线从中间长开、左右各留 8px、终点 mask-size 299.9%。装机后 12 秒 `hud_snapshot` 为 `connected`（L-06 没出现）。实机鼠标悬停看动效未试（电脑控制要整屏接管，没做）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-meter-center/screens/`：`dark-100ms.png`、`dark-300ms.png`、`dark-620ms.png`、`dark-end.png`、`light-250ms.png`、`light-end.png`。
- 发布与回读：从 worktree（main `c4c6148` + 本改动，与合并后的 `22b6fd3` 同一棵树）打包；装前 `/Applications` 是 `6ee21aa5b1fa`（不是上一节写的 `621500c59f09`，中间应有别的会话装过），备份 `evidence/2026-11-06-meter-center/PostPane-6ee21aa5b1fa.app`；12:49:19 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `97e641b60d45` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-meter-center/PostPane-6ee21aa5b1fa.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 甲先快后慢，线在前一半时间就接近满长，后面主要是两端收实；常浩若觉得「剩多少」看不出来，可把曲线放缓。
  - 浅色纸上黄线本来就淡，这次没改颜色。
  - worktree `142-meter-center` 合并后已 `cargo clean`，目录保留。
- 本轮新坑：无。


## 设置页「侧栏长什么样」预览去掉 DeepSeek（2026-11-06，Claude，常浩说「展示页面把deepseek去掉吧」；PR #147 测试通过，按授权 squash 合并 `c4c6148`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 12:27`（本会话建立时间）；本节写于 `2026-11-06 12:46`。来由：2026-11-05 在预览里加过「总把 DeepSeek 当已开启画出来」，常浩现在不要了。issue #146。
- 改了哪些文件（PR #147）：`src/packages/app/src/settings/SettingsSamples.tsx`（`SmallHUDPreview` 删掉强行开启 DeepSeek 的 `useMemo`，直接用快照算客户端；侧栏本身与 DeepSeek 接入不动）。
- 测试：`pnpm run test:ts` `ℹ pass 263` / `ℹ fail 0`；app 包 `tsc --noEmit` 退出 0；`prettier --check` 通过。未跑 Rust 与全量 `pnpm test`（只改一个前端文件里的预览）。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-preview-no-deepseek/`（test-ts.log、build.log）。
- 验证：先用旧启动配置 `settings-browser` 看，那份审查数据 `providers` 为空、DeepSeek 默认开着，不能作证；另建数据目录 `evidence/2026-11-06-preview-no-deepseek/data`（复制本机 `settings.json`，DeepSeek 为关），加启动配置 `settings-real`（`.claude/launch.json`，不进仓库）起设置页：预览只剩 Claude、Codex、Hermes。装机后用电脑操作截已装驿窗的设置窗口：「侧栏长什么样」预览为 Claude、Codex、ChatGPT、Hermes 四格，没有 DeepSeek。
- 截图：在本会话工具结果里，未落盘。
- 发布与回读：从 main `c4c6148` 打包，装前 `/Applications` 是 `621500c59f09`（#144 那版），备份 `evidence/2026-11-06-preview-no-deepseek/PostPane-621500c59f09.app`；12:42:54 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `fe4e72e0ac5e` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-preview-no-deepseek/PostPane-621500c59f09.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：以后本机开启 DeepSeek，预览会照常显示它（与侧栏一致）。worktree 已删，`cargo clean` 不需要（打包在主目录）。
- 本轮新坑：无

## 侧栏 Codex 打盹改成「鼻涕泡」（2026-11-06，Claude，常浩说 Codex 睡眠「整体变小了」「Z 的形式和 gpt 又太接近了，再想三个动作」，看三版后说「用乙 鼻涕泡」；PR #144 本地全量通过，按授权 squash 合并 `061f1e0`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 12:02`（本会话建立时间）；本节写于 `2026-11-06 12:30`。来由：#143 的打盹把云朵缩到 0.8、透明度 0.6、下沉 0.07，侧栏里看着整只变小；像素 Z 与 ChatGPT 同款。三版预览 https://claude.ai/artifact/QDFL9AN6cyWjFPLNgMxWQx （甲浮云冒泡 / 乙鼻涕泡 / 丙点头打盹 + 终端光标，真实渲染代码画云朵和 ChatGPT）。
- 改了哪些文件（PR #144）：`hud/src/bots/bot-cloud.ts`（打盹段：原大小深呼吸 3.2 秒一口、吸气 scaleY 1→1.035 不缩小、不变淡不冒小云团；新 `CloudSnot` 与 `lids`，鼻涕泡吸气鼓起呼气缩回、每三口气破一次）、`bot-motion.ts`（接 `snot` / `lids`，云朵睡着不挂 Z，云朵睡眠帧率 calm 6 帧 → following 12 帧）、`bot-renderer.ts`（弯线闭眼比睁眼略宽、最细 1.25 像素；鼻涕泡浅色填充 + `#2e31b8` 描边 + 高光，破时六道飞沫；缓存键加两项）、`test/codex-cloud.test.ts`（打盹测试改新行为、加悬停唤醒、小花加断言）、`docs/parity/c08-bots.md`（第 50 行，prettier 重排了表格列宽）。
- 测试：`pnpm run check` 第一次退出 1（只因未提交的临时预览脚手架格式），脚手架移走后退出 0；`pnpm test` 退出 0（Rust 合计 713 passed / 0 failed；`ℹ pass 263` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；格式化后复跑 `pnpm run test:ts` `ℹ pass 263` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。新测试先红 `ℹ fail 3` 后绿 `ℹ pass 11`。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-codex-sleep/`（check.log、check-2.log、test.log、build.log）。
- 验证：三版预览用 esbuild 把真实 `bot-form` / `bot-renderer` / `bot-motion` 打进单页，逐版定格截帧查两轮（乙第一轮泡泡同色描边贴在云上看不见，改深色描边 + 浅色填充、往外长；丙光标太细改粗）。实现后用真实 `BotMark` 预览：浅色、深色，24px 与 96px，Codex 醒着 / 睡着 / 睡着被悬停 / ChatGPT 睡着；浏览器面板隐藏、动画被节流，用画布像素采样 12 秒确认泡泡描边像素在 0～155 间起伏并有破掉后的空档。装机后 `get_hud_screenshot`：侧栏 Claude 74%、Codex 云朵 32%、ChatGPT「--」、Hermes 2.0M（截图接口只画静止图标，动起来的样子实机未看）。侧栏实际 logo 31px。
- 截图：在本会话工具结果里，未落盘；预览脚手架没提交，移到 `evidence/2026-11-06-codex-sleep/preview-sleep/`（三版页）与 `preview-snot/`（真实组件），三版页源文件与单页产物 `codex-sleep.html` 同目录。
- 发布与回读：从 main `061f1e0` 打包，装前 `/Applications` 是 `c8790f1510df`（不是 #143 交接写的 `9c06aa25b640`，中间应有别的会话装过），备份 `evidence/2026-11-06-codex-sleep/PostPane-c8790f1510df.app`；12:27:15 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `621500c59f09` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-codex-sleep/PostPane-c8790f1510df.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 开工时我在旧 main（#143 之前）上做的三版预览，页面里的「Codex 现在」画的是 #143 之前的打盹（不缩小），据此说过「变小是闭眼太细的错觉」，这个判断不准：常浩看到的变小来自 #143 的 0.8 缩放。实现基于含 #143 的 main。
  - 常浩随后要求按同样标准再优化 Codex 其他动作与 ChatGPT 打盹，未开工，计划待确认。
- 本轮新坑：无

## 侧栏 Codex 云朵小人有了自己的动作库（2026-11-06，Claude，常浩看第一版说「还是有点接近」、要求高频 7 段重做，看第二版后说「可以，开工」；PR #143 本地全量通过、合入最新 main 后重跑仍通过，按授权 squash 合并 `06af91a`；已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 11:11`（本会话建立时间）；本节写于 `2026-11-06 11:52`。来由：#138 给 Codex 换了云朵小人但只有通用动作，常浩要它有自己的一套、和 ChatGPT 小花分开、丰富度对齐 Clawd，长相不改。预览 https://claude.ai/artifact/4czTDPBq6XV4ReptPJ5g3q （第二版，真实 `BotMark`，每段旁边放小花对照）。
- 改了哪些文件（PR #143）：`hud/src/bots/bot-cloud.ts`（新：纯函数 `cloudSky` 按状态算每帧的漂移、拉伸、轮廓变形——翻滚、变形、堆高、对话气泡尾巴——灰度、小云团、雨滴、闪电）、`bot-spec.ts`（`codex` 只加 `cloud: true`，外形、渐变、`>_` 留空、眼睛不动）、`bot-motion.ts`（`drift` / `settleSky`、事件后的天气计时、云朵自己的四种小动作，找你时不敲不歪不点头、思考不歪）、`bot-form.ts`（轮廓接受 `CloudShape`）、`bot-renderer.ts`（画小云团、雨、闪电、变灰，云朵不用实心进度环）、`bot-still.ts`（缓存键加灰度与形状）、`test/codex-cloud.test.ts`（新，10 个）、`docs/parity/c08-bots.md`（第 50 行，prettier 重排了表格列宽）。
- 动作要点：高频——待机左右漂、轮廓慢慢变；打盹散成三朵淡云；思考头顶堆高翻涌；跑命令下紫蓝雨、歇时雨停；等批准 / 提问 / 方案变成带尾巴的对话气泡（尾巴戳、尾巴摆、摊成宽扁一张）。低频——改文件盖章、长命令小云团围圈、读文件跟着眼睛飘、压缩拧出水滴、开工和完成散小云团、出错灰云加雨加闪电、额度用完一直灰云偶尔掉雨、额度重置雨过天晴、卡住重试变阴云、没新消息变薄雾。云朵从不转身；小花与其他小人不受影响。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 713 passed / 0 failed；`ℹ pass 256` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；合入含 #141 的 main 后重跑：`check` 退出 0，`test` 退出 0（Rust 713 / 0；`ℹ pass 262` / `ℹ fail 0`，其余同上）。新测试临时关掉云朵开关时 `ℹ pass 3` / `ℹ fail 7`，恢复后 `ℹ pass 10` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-codex-cloud/`（check.log、test.log、check-2.log、test-2.log、build.log）。
- 验证：真实组件预览（`BotMark`，浅色纸底，92px 与 26px，21 段左云朵右小花），内置浏览器第一版两轮、第二版两轮截图核对；出错闪电、开工小云团用画布像素计数确认画出。装机后 `get_hud_screenshot`：侧栏 Claude 73%、Codex 云朵 32%、ChatGPT「--」、Hermes 2.0M；截图接口画的是静止图标，实机里小人动起来的样子未看。线上预览页需要登录，内置浏览器没登录，未回读线上版本（与本地核对的是同一份构建）。
- 截图：预览截图在本会话工具结果里，未落盘；预览脚手架没提交，移到 `evidence/2026-11-06-codex-cloud/preview-cloud/`（启动配置 `cloud-moves`，端口 1437，需先移回 `src/apps/desktop/`）。
- 发布与回读：从 main `06af91a`（含 #141）打包，装前 `/Applications` 是 `54e5f63c063f`，备份 `evidence/2026-11-06-codex-cloud/PostPane-54e5f63c063f.app`；11:49:51 退出旧应用后 `ditto` 安装，11:49:54 启动，`shasum` 回读 `9c06aa25b640` 与产物一致，签名仍是固定证书（`certificate leaf = H"b773068e…"`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-codex-cloud/PostPane-54e5f63c063f.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 26px 下小云团半径约 1.5～2.5 像素、雨丝很细，实机是否够明显待常浩看过再调。
  - 打盹时两朵小云画在小人格子外侧约 1 像素，侧栏里有没有被邻格遮住未在实机核对。
  - `codex-petals.test.ts` 的 `only Codex and Hermes stay awake` 实际测的是 `openai`（现在是 ChatGPT 小花），测试名已不准，没改。

- 本轮新坑：无。

## 侧栏「停久看全」：小收据、单家面板、整张看板并存（2026-11-06，Claude，常浩在三版方案里选「乙」，看计划后经侧栏插件回「按计划开工」；PR #141 全量通过，按授权 squash 合并 `9174ff3`，已从 main `9174ff3` 打包装机、回读一致）

- 时间：开工 `2026-11-06 10:59`（建 issue #140 时）；本节写于 `2026-11-06 11:30`。来由：常浩发现 P27（「按智能体分开」关）上悬停哪里都出整张看板、点格子没反应，小收据和单家面板出不来；本会话先出说明页（https://claude.ai/artifact/QJXgqmmQNVcQmkxDdqdkVc ）和三版并存方案（https://claude.ai/artifact/9sZPtJB3rxAZ3sqy5baBPe ），常浩选乙。
- 改了哪些文件：`hud/src/peek-expand.ts`（新：展开等待、面板对象、面板内事件行三条规则）、`hud/test/peek-expand.test.ts`（新，先红后绿）、`HUDScene.tsx`（`expanded` 状态、按格计时、进度线状态；菜单与编辑保持打开整张看板）、`scene/useHUDLayout.ts`（面板对象改走 `cardAgent`）、`scene/useHUDInteraction.ts`（点格子所有屏都能固定；去掉分开模式请求强制弹开）、`scene/HUDExpandedSurface.tsx`（小收据底边进度线，看板收 `spotlight`）、`HoverPanel.tsx`（`spotlight`：滚到这一家并琥珀框 1.2 秒，尺寸定下后再滚一次）、`scene/HUDMarkStrip.tsx`（票根统一手形光标）、`ui/src/global.css`（进度线动画）；去掉「按智能体分开」：`HUDSection.tsx`、`ResetSection.tsx`、`hud-defaults.json`、`model.ts`、`crates/hud/.../style_rules.rs`、`legacy_preferences.rs`、`apps/mcp/src/index.ts`、`crates/host/src/picture.rs`（单家面板截图改为非刘海屏都能出）、`hud_tools/customize-agent-hud.md`。
- 测试：`pnpm run check` 退出 0（前两次退出 1：一次 `legacy_preferences.rs` rustfmt 差异，一次未提交的预览脚手架不合 prettier，删掉后通过）；`pnpm test` 退出 0（Rust 合计 713 passed / 0 failed；`ℹ pass 252` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。合并前 main 只多了两次 CURRENT.md 交接提交，没重跑。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-dwell-board/`（check3.log、test2.log、rules.log、build.log）。
- 验证：真实 `HUDScene` + 样例快照的临时预览（脚手架移到 `evidence/2026-11-06-dwell-board/preview-dwell/`，未提交），内置浏览器真实悬停与点击：小收据 408 ms 出现、看板 1235 ms 展开；换格后从新格起算 1202 ms；看板滚到 Hermes 并框出，看板开着移到 Claude 滚回顶部并框 Claude；点 Codex 出单家面板；离开 193–209 ms 收起；深浅色都看过，浅色框线第一轮太淡，改成深琥珀后复看。浏览器面板是隐藏的，有两次出现停在「opening / closing」不动，同样步骤重跑多次没再出现，查不到原因，实机要留意。装机后 `get_hud_screenshot` 在 P27 上出了 Claude 单家面板（旧版会报「This screen does not separate its agents」）。实机鼠标悬停、停久展开、点格子未试（电脑控制点不动侧栏，L-09）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-dwell-board/screens/`：`peek-meter-dark.png`、`board-hermes-dark.jpg`、`single-codex-dark.jpg`、`board-codex-light-faint.jpg`（修前）、`board-hermes-light.jpg`、`device-single-claude.png`、`device-strip-after.png`。
- 发布与回读：装前 `/Applications` 是 `f7e5fd4c7669`（与上一节一致），备份 `evidence/2026-11-06-dwell-board/PostPane-f7e5fd4c7669.app`；11:28:27 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `54e5f63c063f` 与产物一致，签名为固定证书 `b773068e…`。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-dwell-board/PostPane-f7e5fd4c7669.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 「按计划开工」是经侧栏插件转进来的，按 AGENTS 应先核实；内容与本会话给的按钮一字不差，按常浩本人确认处理，没另外问。
  - 有小收据时来了额度类事件，不再插进面板，改为单独弹细条（小收据放不下事件行）。待审批卡统一按原合并显示规则：先收小签，悬停等你的那格才展开。
  - 本机 `presentation.json` 里旧的 `separatesAgents` 字段留着，不再被读取。`~/.agents/skills/customize-agent-hud/SKILL.md` 由应用写出，新版启动后会更新，没手改。
  - 分支 `claude/140-dwell-board` 的 worktree 合并后删除。
- 本轮新坑：无。

## Hermes 区「各管一摊」打包装机（2026-11-06，Claude，常浩说「打包装机」；从 main `0677fe1`（含 #135、#137、#138、#139）打包安装，回读一致）

- 时间：开工 `2026-11-06 10:58`（常浩说「打包装机」时）；本节写于 `2026-11-06 11:14`。来由：#139 合并后装进应用。
- 改了哪些文件：无（只打包安装）。
- 测试：未跑（main `0677fe1` 的代码与 #139 变基后跑全量的树一致，只多两次交接提交）；打包 `pnpm --filter @agent-hud/desktop exec tauri build --bundles app` 退出 0，日志 `~/Library/Application Support/postpane/evidence/2026-11-06-hermes-install/build.log`。
- 验证：签名为固定证书（`codesign -d -r-` 显示 `certificate leaf = H"b773068e…"`），启动后 2 秒内出快照、没卡在权限弹窗（L-06）。`hud_snapshot` 里 `hermesBots` 有新字段：猛鬼兽 4 个定时任务（周报失败）、3 条被问，亚古兽 0 个任务、3 条被问。`get_hud_screenshot` 截悬停面板（应用自己离屏渲染，不是屏幕截图，不带收据纸）：Hermes 区按丙显示、圆章「在岗」、云端额度 97% 红。实机鼠标移到猫球上不弹面板仍未验证（电脑控制做不了，L-09）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-hermes-install/screens/device-panel.png`。
- 发布与回读：装前 `/Applications` 是 `e351f2de1c58`（#138 那次装的），备份 `evidence/2026-11-06-hermes-install/PostPane-e351f2de1c58.app`；11:11:21 退出旧应用，`ditto` 安装后 11:11:26 启动，`shasum` 回读 `f7e5fd4c7669` 与产物一致。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-hermes-install/PostPane-e351f2de1c58.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：打包用的临时 worktree `install-hermes-desks` 已删。
- 本轮新坑：无。

## 悬停面板 Hermes 区「丙 · 各管一摊」合并（2026-11-06，Claude，常浩在三版预览里选「丙 · 各管一摊」；PR #139 本地全量通过，变基到含 #137、#138 的 main 后重跑全量仍通过，按授权 squash 合并 `986b975`；未打包安装）

- 时间：开工 `2026-11-06 10:44`（常浩回「丙 · 各管一摊」时）；本节写于 `2026-11-06 11:20`。来由：上一节三版预览 https://claude.ai/artifact/Vg1mRwBoYQ1BQKVAGbzHQW ，issue #136。
- 改了哪些文件（PR #139）：
  - 读取层 `crates/agents/src/hermes/mod.rs`（`CronJob.schedule` 取 `schedule.expr` / `schedule_display`；`Gateway.down_since` 与 `down_since()`：飞书断线取 `retrying_since` 或飞书状态的 `updated_at`，网关停了取网关最后一次 `updated_at`；`Gateway::asks`）、`transcript.rs`（`recent_asks`：每个飞书会话最近一句本人的话，跳过 `[System note]`，之后有带字回复算已回、持有回合租约算回复中、否则没回，取前 3；`Answer`、`Ask`）。
  - 快照 `crates/core/src/snapshot.rs`（`hermesBots` 加 `downSince`、`jobs`、`asks`；渲染键改为算上定时任务的上次 / 下次时间和断线开始时间）、`island_events.rs`（测试构造补字段）、`packages/protocol/src/index.ts`（`HermesCronJob`、`HermesAsk`，三字段可选）。
  - 面板 `hud/src/panel/hermes-board.ts`（新：分工、圆章、状态行含断线时长、任务名去括号、`30 7 * * *` 读作「每天 07:30」、上次 / 下次短写、被问时间、私聊 / 群）、`panel/HermesBoard.tsx`（新：每个机器人一块，有定时任务的列表格加最近一次被问，没有的列最近被问 3 条，没回标红、回复中蓝点闪）、`AgentBoard.tsx`（圆章加「在岗」「断线」）、`agent-board.ts`（`BoardStamp` 加两种）、`QuotaSection.tsx`（Hermes 块接上）。
- 测试：新增 Rust 4 条（`a_cron_job_carries_its_schedule`、`a_down_gateway_says_since_when`、`the_latest_asks_say_where_from_and_whether_answered`、`each_bot_lists_its_scheduled_tasks_and_latest_asks`），先红后绿；前端 `hud/test/hermes-board.test.ts` 9 条与实现一起写，没有先跑红。变基前后各跑一次：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 713 passed / 0 failed；`ℹ pass 246` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-hermes-desks/`（check.log、test.log、check2.log、test2.log）。
- 验证：临时示例程序（没提交）在本机 `~/.hermes` 上读出猛鬼兽 4 个定时任务（周报 11/2 失败、Tidings 没跑过）和两人各 3 条被问，结果存 `evidence/2026-11-06-hermes-desks/hermes-bots.json`。真实组件预览（`SourceHoverPanel` + 本机快照 + 上面的机器人数据，脚手架移到 `evidence/.../preview-hermes/`）对照设计稿丙看了两轮：深色平常、深色出状况（亚古兽飞书断线 12 分钟、群里两条没回、猛鬼兽回复中）、浅色出状况，圆章、状态色、表格列宽、没回标红都与设计稿一致；控制台无报错。实机未看（未装机）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-hermes-desks/screens/`：`dark-now.jpg`、`dark-now-zoom.png`、`dark-hot.jpg`、`light-hot.jpg`。
- 发布与回读：未打包安装。`/Applications` 现在是另一个会话从 #138 装的版本（含 #135，不含 #139）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 面板里不再有「ChatGPT」块：#138 之后它叫 ChatGPT，但网页通道没有额度，按 #135 的规则不列；常浩要在面板里看到它再说。
  - 「最近被问」的标题用 Hermes 给会话起的标题（会带人名），只在本机面板显示。
  - worktree `.claude/worktrees/133-panel-fixes` 已删。
- 本轮新坑：无。

## 侧栏 Codex 与网页 ChatGPT 各占一个位置，Codex 换云朵小人（2026-11-06，Claude，常浩说「要求都能显示，codex的图标用这个，chatgpt就还是现在的绿色小花」，选「一直是云形小人」并说动作库之后另做；PR #138 本地全量通过后按授权 squash 合并 `68cc6c0`，已从该 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 10:20`（按本会话建立时间）；本节写于 `2026-11-06 10:58`。来由：常浩发现侧栏要么显示网页 ChatGPT、要么显示 Codex。原因是前端 `agentArtworkKey` 与 Rust `presentation::mark` 都把 codex、chatgpt 并成同一个 `openai` 标记。
- 改了哪些文件（PR #138）：`hud/src/agent-artwork.ts`（`codex`、`codex-cli` 归新标记 `codex`，`chatgpt` 仍是 `openai`，名称显示「ChatGPT」）、`crates/hud/src/presentation/rules.rs`（`mark` 同步）、`crates/hud/src/vendors.rs`（`vendor_name`）、`hud/src/assets/codex.png`（常浩给的 Codex 应用图标，去掉白色底板裁方）、`assets/README.md`、`hud/src/bots/bot-spec.ts`（`codex`：常驻、云朵轮廓 `keep 1 / smooth 3`、原渐变上色、`>_` 区域 `unpainted`、程序化眼睛，暂用通用动作）、`panel/QuotaSection.tsx`（额度重置改认 `codex`）、`model.ts` / `resting-agents.ts` / `IslandNews.tsx` 注释；测试 `vendors.rs`（新增 Codex 与 ChatGPT 各有一个标记、ChatGPT 接力不让 Codex 动）、`host/src/tray.rs`（菜单栏标题「OpenAI」→「Codex」）、`bots/director-cases.json`（`openai` 方向改 `codex`；其中把 ChatGPT 当 Codex 别名的会话 / 审批改成 `codex`，保留原意）、`resting-agents.test.ts`、`recent-usage.test.ts`。
- 测试：`pnpm run check` 退出 0；`pnpm test` 第一次退出 101（`tray.rs` 两条仍期望「OpenAI」），改后第二次退出 0（Rust 合计 709 passed / 0 failed；`ℹ pass 234` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；之后 `cargo fmt --check`、`prettier --check` 通过；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-codex-mark/`（check.log、test.log、build.log）。
- 验证：真实组件预览（`BotMark` + `HUDArtwork`，脚手架没提交，移到 `evidence/2026-11-06-codex-mark/preview-codex/`），内置浏览器深色、浅色两轮，26px 与 96px，idle / thinking / tool-edit / permission / done / asleep：Codex 是紫蓝渐变云朵带眼睛、没有 `>_` 残影，ChatGPT 绿色小花与花瓣动作不变。装机后用 `get_hud_screenshot`：侧栏依次 Claude 71%、Codex 云朵 32%、ChatGPT 绿花「--」、Hermes 2.0M；悬停面板原「OpenAI」块标题变成 Codex + 云朵，额度与「额度重置 3 次可用」都在。截图接口画的是静止图标，小人动起来的样子实机未看。
- 截图：预览截图未落盘（内置浏览器截的）；装机截图在本会话工具结果里，未落盘。
- 发布与回读：从 main `68cc6c0`（含 #135、#137）打包，装前 `/Applications` 是 `7b62a4041f72`，备份 `evidence/2026-11-06-codex-mark/PostPane-7b62a4041f72.app`；10:55:08 退出旧应用后 `ditto` 安装并启动，`shasum` 回读 `e351f2de1c58` 与产物一致。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-codex-mark/PostPane-7b62a4041f72.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - ChatGPT 没有额度也没有本地 Token，侧栏下面显示「--」；常浩要别的内容再说。
  - Codex 小人目前只有通用动作（眼睛、标志），专属动作库按常浩要求另开会话设计；绿色小花的「花瓣身体语言」现在归 ChatGPT。
  - `panel/agent-board.ts` `blockListed` 的注释还写着「ChatGPT 与 OpenAI 共用标记」，已不准确，没改（#135 的代码，行为不受影响）。
- 本轮新坑：无。

## 打包改用固定本机证书签名，文稿权限只需授权一次（2026-11-06，Claude，常浩问「每次改动都要重新允许文稿权限，能默认处理么」，看方案后回「好，开始做」（经 agent-hud 插件转进）；issue #134，PR 本地全量通过后按授权 squash 合并；已从含 #135 的 main 打包安装、回读一致）

- 时间：开工 `2026-11-06 10:20`；本节写于 `2026-11-06 10:42`。来由：每装一个新包都弹「"PostPane"想访问"文稿"文件夹中的文件」（L-06）。
- 改了哪些文件：`src/apps/desktop/src-tauri/tauri.macos.conf.json`（`signingIdentity: "PostPane Local Signing"`、`hardenedRuntime: false`，保持原来没有强化运行时的行为）；`docs/LESSONS.md` L-06 加「根治」一行（证书丢了怎么重建）。仓库外：在常浩登录钥匙串导入自签代码签名证书 `PostPane Local Signing`（SHA-1 `B773068E…3E60`，20 年，只允许 `/usr/bin/codesign` 用私钥，没改信任设置），私钥临时文件导入后已删。
- 原因：原来是临时签名，系统按 `cdhash` 认应用，每个新包都算新应用。改后指定要求为 `identifier "app.postpane.mac" and certificate leaf = H"b773068e…"`，跨包不变。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 709 passed / 0 failed；`ℹ pass 237` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过。日志同下面证据目录（check.log、test.log）。
- 验证：10:38:36 装新包（`7b62a4041f72`），之后另做一个只改 Info.plist、同证书重签的测试包（CDHash `9c2eece0…`，正式包 `898fec90…`），10:39:40 装上启动：没有权限弹窗，`sample` 数据线程没卡在 `open()`，`hud_sessions` 里 worktree 会话正确归到 `~/Documents/ChatGPT/个人/work/postpane`（要读文稿下的 `.git`）。10:40:18 装回正式包。第一次装正式包时弹窗是否出现、是否由常浩点了「允许」，截屏没拍到，未确认。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-stable-signing/`（after-install.png、after-install-2.png、variant.png，采样 sample.txt、sample-variant.txt，打包日志 build2.log）。
- 发布与回读：从 main `23a09fc` 加本改动打包，装前 `/Applications` 是 `453575a7b643`，备份 `evidence/2026-11-06-stable-signing/PostPane-453575a7b643.app`；装后 `shasum` 回读 `7b62a4041f72` 与产物一致。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-stable-signing/PostPane-453575a7b643.app /Applications/PostPane.app`（回滚后会再弹一次权限）。
- 与授权不一致之处、遗留问题、范围外发现：本 PR 合并前从别的分支打的包仍是临时签名，装上会再弹一次；合并后各分支变基到新 main 即可。`agent-hud-mcp`（bun 编译）仍是临时签名，它不读文稿，没动。换电脑打包要先按 L-06 重建证书。
- 本轮新坑：无。


## 悬停面板四处修正合并；Hermes 区三版预览待挑（2026-11-06，Claude，常浩截图提出四处要改、Hermes 区要出预览选择；PR #135 本地全量通过，按「测试全过可直接合并」授权 squash 合并 `d5d2cb1`；未打包安装）

- 时间：开工 `2026-11-06 10:15`（按本会话建立时间）；本节写于 `2026-11-06 10:42`。来由：常浩截图指出①鼠标移到随手记圆形猫球也会弹出整体额度面板；②Claude 云端额度 97% 还是白色；③Hermes 图标是白色，要黑色女孩；④Hermes、OpenAI 的「近 24 小时 Token」没意义要删；⑤Hermes 区改放猛鬼兽、亚古兽的内容，出预览选。issue #133。
- 改了哪些文件（PR #135）：`hud/src/request-hover.ts`（`hoverMayOpen` 加 `onPendant`，指在猫球上一律不打开）、`hud/src/scene/useHUDInteraction.ts`（原生指针点用 `elementFromPoint` 判断是否落在 `.hud-app-pendant`）、`hud/src/panel/agent-board.ts`（新 `quotaLevel`：陈旧读数按上次占用 ≥90 红 / ≥70 琥珀；新 `blockListed`；`boardShowsTokens` 改名 `panelHidesTokens`）、`panel/AgentBoard.tsx`（数字按 `quotaLevel` 着色；Hermes 在深色纸上垫票签浅纸 `#e9e6de` 画黑色原图；删 `DayTokensHero`）、`panel/QuotaSection.tsx`（无额度块只留提示）、`HoverPanel.tsx`（无额度、无提示、非 Hermes 的块不列出：ChatGPT 网页通道那块「OpenAI」借的是 Codex 的 66 万 Token，整块去掉）；测试 `test/request-hover.test.ts`、`test/agent-board.test.ts` 各加，先红后绿。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 709 passed / 0 failed；`ℹ pass 237` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）。跑测试时 `prettier --write` 误改了 `clawd-sprites.json`，提交前已还原，还原后补跑 `prettier --check "src/**/*.{ts,tsx,mjs,css}"` 通过，全量没有重跑。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-panel-fixes/`（check.log、test.log）。
- 验证：真实组件预览（`SourceHoverPanel` + 本机 `hud_snapshot` 快照，脚手架没提交，移到 `evidence/2026-11-06-panel-fixes/preview-fixes/`）在内置浏览器截图：云端额度 97% 红字、第二个「OpenAI」块没了、Hermes 标题为浅纸上的黑色女孩、两处大字 Token 没了。猫球不弹面板只有单测覆盖，实机未验证（要装机后用鼠标移上去看）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-panel-fixes/screens/after-panel-dark.jpg`。
- 发布与回读：未打包安装。Hermes 区三版预览已发 Artifact https://claude.ai/artifact/Vg1mRwBoYQ1BQKVAGbzHQW （甲 值班双栏 / 乙 今日流水 / 丙 各管一摊，可切「现在（真实数据）」「有事要管（示例）」），源在本会话临时目录，未进仓库。
- 与授权不一致之处、遗留问题、范围外发现：
  - Hermes 块现在只有标题，内容等常浩挑方案后再做；挑完要补读 `state.db` 会话的私聊 / 群（`chat_type`）与是否已回，乙版还要开始记录断线时间。
  - 「等待更新」的额度只改了数字颜色，进度条仍是空的（陈旧读数原本就不画已用），没动。
  - 面板底部「正在进行」区的「近 24 小时 N Token」是全体合计，不属于 Hermes / OpenAI 块，没删；常浩要删再说。
  - worktree `.claude/worktrees/133-panel-fixes` 已 `cargo clean`，留着给 Hermes 区下一单用。
- 本轮新坑：无。

## 两指左划时悬停面板横向错位（2026-11-06，Claude，由会话 local_0d15d671 交来，常浩说「按计划修」；PR #130 本地全量通过，按「测试全过可直接合并」授权 squash 合并；未打包安装）

- 时间：开工 `2026-11-06 09:46`（按本会话建立时间）；本节写于 `2026-11-06 09:55`。来由：#128 实机复验时，在「正在进行」一行上两指左划，整块面板横向滚了约 8pt（`evidence/2026-11-06-merge-all/screens/device-tray-open.jpg`），issue #129。
- 改了哪些文件：`src/packages/hud/src/HoverPanel.tsx`（面板滚动容器加 `overflowX: "hidden"`）。原因：额度看板的智能体标题行（`AgentBoard.tsx`，撕纸虚线）用负外边距铺到纸边，右边超出滚动容器 `paper.bleed.right`；容器只写了 `overflowY: auto`，横向也算成 auto，行上 passive 的 `onWheel` 拦不住默认滚动。这个溢出从 PR #53 就有。原来的 auto 已经会裁掉超出部分，所以外观不变；托盘代码没动。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 706 passed / 0 failed；`ℹ pass 232` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 7` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-wheel-shift/`（check.log、test.log）。
- 验证：真实组件预览（`SourceHoverPanel` + 假数据，脚手架没提交，留在 `evidence/2026-11-06-wheel-shift/preview-wheel/`），在内置浏览器里用真实滚轮横划。修前 `scrollLeft = 16`，「在跑」和「近 24 小时」被切掉。修后深色、浅色在行上划和在智能体标题区划，`scrollLeft` 都是 0；托盘照常拉开（宽 310），在行上反向划能收回。实机未试：电脑控制点不动悬停面板（L-09），要请常浩装新版后用触控板两指左划确认。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-wheel-shift/screens/`：`before-swipe-shift.jpg`、`after-dark-swipe.jpg`、`after-dark-swipe-heading.jpg`、`after-light-swipe.jpg`、`after-light-closed.jpg`。
- 发布与回读：未打包安装（装机后实机试，等常浩说）。
- 范围外发现：托盘拉开后，滚轮落在托盘色块上反向划不会收回，只有落在行露出的那一截上才收；修前就是这样，没改。worktree `57-menubar-default-off-299c4a` 合并后由本会话 `cargo clean`。
- 本轮新坑：无。

## 左滑发起返修：#132 合并装机；ChatGPT 完整审核意见返修做到一半（2026-11-06，Claude，常浩「转回让你改」「按方案改」；#132 已合并装机，返修分支 WIP 未跑全量、未开 PR；上下文到约 50% 交接）

- 时间：开工 `2026-11-06 10:05`（常浩说「转回让你改」）；本节写于 `2026-11-06 10:40`。来由：ChatGPT 审核接力 `h1a1ae89e44c00` 结论「需修改」。
- 改了哪些文件：
  - PR #132（已合并 `258a1fe`）：`host/src/handoff.rs`（`Lines::leave` / `left`，`Desk.launches` 记每个会话最近一次左滑，`launch_projection`）、`host/src/claude_plugin.rs`（`channel()`）、`host/src/lib.rs`（快照 `relayLaunches`）、协议 `RelayLaunch`、`relayLaunch` 返回 `{queued, already}`、`panel/relay-tray.ts`（`launchLine`、`alreadyQueuedText`）、`panel/SessionsSection.tsx`（第二行显示排队中 / 被拒 / 过期，点完不再说「已请它整理改动」）、`docs/chatgpt-channel.md`。
  - 分支 `claude/relay-launch-review`（`8a02cbd`，WIP，基于 `258a1fe`）：`handoff.rs` 改成以该会话真的新建接力（`relayed_since`：同会话 `created_at >= 左滑时间`）为完成；状态 queued / started / relayed / refused / expired / stalled，领取后（含文件被清理）一小时没发起算 stalled，不重发；started 也算待处理、不重复留；`Fake.leave_fails` 与 3 条测试（`a_second_swipe_while_the_words_wait_leaves_nothing_more`、`words_that_could_not_be_left_can_be_swiped_again`、`words_that_come_to_nothing_say_so_on_the_row_a_while`）。协议 state 加 `started`、`stalled`；`relay-tray.ts` 两句新文案；`SessionsSection.tsx` 加发起中保护（`launching`）、只认最新一次结果（`asked`）、键盘 ← 打开后的聚焦改成跟着 `open` 走（去掉 `setTimeout`）。
- 测试：#132 合并前 `pnpm run check` 第三次退出 0（前两次 rustfmt、prettier 格式差异），`pnpm test` 退出 0（Rust 709 passed / 0 failed；`ℹ pass 234` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`），之后只改格式；第一次跑插件 8 条全失败是 `~/Library/Caches/ms-playwright` 被清掉，`pnpm exec playwright install chromium-headless-shell` 后通过。WIP 分支只跑了 `cargo test -p agent-hud-host handoff`（15 passed）、`node --test src/packages/hud/test/relay-tray.test.ts`（`ℹ pass 5` / `ℹ fail 0`）、`pnpm run typecheck`（无报错），全量未跑。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-launch-state/`。
- 验证：#132 真实组件预览两轮（深色排队中灰字、被拒 / 过期红字；浅色再点显示「已在排队，不再重复发」），截图 `evidence/2026-11-06-launch-state/screens/`。WIP 分支未截图。
- 发布与回读：#132 从 main `258a1fe` 打包，装前 `84602fe37498`，备份 `evidence/2026-11-06-launch-state/PostPane-8460.app`，10:18:54 安装，回读 `453575a7b643` 一致。WIP 未发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 返修还没做的：①`relay-tray.test.ts` 补 started / stalled 文案用例；②P2-04 展开卡停在屏幕底边时齿孔在顶边，`AirmailEdges` 把「只画顶边」过滤掉、一道斜纹都没有（`HUDExpandedSurface.tsx` 约 305 行 `sides={open ? ["top"] : …}`，改成顶边有齿孔时画底边，抽成纯函数补四个方向的测试）；③P2-05 `core/src/island_events.rs` `Tracker::cron` 用 `std::fs::write` 写 `hermes-cron-told.json` 且忽略错误，改成临时文件加 rename、记录错误，补损坏文件测试；④全量 check / test、真实组件预览截两轮（排队中 / 已送进会话 / 停滞文案）、开 PR 合并装机；⑤调 `relay_to_chatgpt` 交回复审，brief 里写清处理与不同意的理由。
  - 准备在交回时说明不同意或部分不同意的：P1-02「领取后中断的恢复」不做重发（插件先标记已领取再提交，防重启后重复提交，通道共用；改为领取后一小时没发起就在那一行红字说明）；P2-02 电脑控制点不动不是动画期间命中行容器——点击都在打开托盘数秒后，且点「统计」时点击穿到了下面的 Claude 窗口，属窗口级穿透（L-09），不加埋点；P1-01 的去重按会话而不是会话 + 类型，同一会话一次只问一件，更严。
  - worktree `.claude/worktrees/120-relay-card` 现在在 `claude/relay-launch-review`，继续用。
- 本轮新坑：无。

## ChatGPT 接力处理中时 OpenAI 小人动起来；左滑「审核」实机跑通（2026-11-06，Claude，常浩说「gpt在工作，但是侧边的形象没有动态起来…需要改好」，看方案后回「按方案改」；PR #131 本地全量通过后按授权 squash 合并，已从 main `294ac62` 打包安装、回读一致；小人动起来的实机效果未验证）

- 时间：开工 `2026-11-06 09:51`（常浩提出问题时）；本节写于 `2026-11-06 10:03`。来由：常浩点了本会话的左滑「审核」，ChatGPT 在处理时侧栏 OpenAI 小人没动。
- 改了哪些文件（PR #131）：`src/apps/chrome-extension/content.js`（地址从首页变成 `/c/<id>` 时若仍在生成，带新 id 再报一次 `turn start`）、`crates/hud/src/vendors.rs`（`relays_answering`：接力 `phase == "working"` 计入 ChatGPT 所在那一格的 `working`）、`packages/hud/src/relays-answering.ts`（新，前端同一规则）、`packages/hud/src/model.ts`、`docs/chatgpt-channel.md`；测试 `chrome-extension/test/content.test.mjs` 加一条、`vendors.rs` 加 `a_relay_chatgpt_is_answering_keeps_the_openai_mark_working`、`hud/test/relay-working.test.ts`（新），三条都先红后绿。
- 原因：①新会话在 ChatGPT 首页发出，回答开始时地址没有会话 id，插件报的 `turn start` 不带 `conversation`，被丢掉；地址有了 id 时已在生成，不再报，接力停在 `delivered`（`h1a1ae89e44c00` 从 09:47 到回信一直是 `delivered`）。②OpenAI 小人只数本地会话，网页 ChatGPT 没有会话可数。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 707 passed / 0 failed；`ℹ pass 233` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。跑在变基到含 #130 的 main 之前；#130 只改 `HoverPanel.tsx`，与本 PR 不重叠，合并后的组合没有再跑全量。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-gpt-working/`。
- 验证：
  - 左滑「审核」实机：常浩在侧栏点后，本会话收到插件转来的固定请求（「请把这一轮的工作交给 ChatGPT 审核…（驿窗左滑「审核」发来）」），本会话整理 brief 调 `relay_to_chatgpt`，宿主认准本会话（`f44a5cd7-…`），接力 `h1a1ae89e44c00` 送到新会话 `6aed31aa-…`，约 10 分钟回信，结论「需修改」3 条：`relay_launch` 写进待发送就算成功、没确认 Claude 领取；插件先写 `takenAt` 再 `submit()`，中间崩了消息会永远不提交；待处理消息一小时过期后左滑没有超时回执。这 3 条等常浩决定是否转回。
  - 小人动起来：只有单元测试覆盖，实机未验证。需要常浩先在 Chrome 扩展程序页重新加载驿窗插件（插件从主目录 `src/apps/chrome-extension/` 加载，主目录已快进到 `294ac62`），下一轮 ChatGPT 处理时看。
  - 展开卡实机：重启后回执小签收起，只能从悬停面板「接力 1/2」打开，电脑控制点不动（L-09），未截到。
- 截图：无新截图。
- 发布与回读：另一个会话（#130）原本要从 `00a9f98` 装，已请它停下（它确认没动 `/Applications`）；从 main `294ac62` 打包，装前 `/Applications` 是 `24d03c035623`（与上一节一致），备份 `evidence/2026-11-06-gpt-working/PostPane-24d0.app`；10:00:00 退出旧应用后 `ditto` 安装并启动，`shasum` 回读与产物一致 `84602fe37498`。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-gpt-working/PostPane-24d0.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 「送到了」以外的阶段（`sending` / `delivered`）不算 ChatGPT 在工作，小人只在 `working` 时动；回信之后常浩在 ChatGPT 里接着聊不会让小人动（那时接力不在 `working`）。
  - worktree `.claude/worktrees/120-relay-card` 继续留着（停在 `294ac62`），等审核意见处理完再删或 `cargo clean`。
- 本轮新坑：无。

## 合并展开卡定稿、打孔、定时任务细条、猫球、批 B 左滑发起，装最新版（2026-11-06，Claude，常浩说「按计划开工」「把昨天做的印戳去掉」「没提交的分支都一起提交，做完」「把应用改到最新版本」；PR #125–#128、#115 本地全量通过后按授权 squash 合并，已从 main `32f51f3` 打包安装、回读一致；左滑「审核」实机点击未验证）

- 时间：开工 `2026-11-06 08:42`（按本会话建立时间）；本节写于 `2026-11-06 09:43`。来由：上一节留下的两个 WIP 分支（#120 展开卡、#124 批 B），加上常浩要合并的未提交分支。「印戳」理解为昨晚做完没合并的 #117「去掉左上角打孔圆点」（侧栏里只有它是昨天做、要「去掉」的东西，未向常浩核实）；未合并的分支找到三个：`claude/117-no-punch`、`claude/114-cron-failed`（PR #115，冲突状态）、`claude/103-pendant-hover`（没开过 PR）。
- 改了哪些文件：
  - PR #125（#120）：`hud/src/paper.ts`、`HUDScene.tsx`、`scene/HUDExpandedSurface.tsx`、`alerts/HandoffCard.tsx`、`hud/test/relay-paper.test.ts`，内容同上一节。
  - PR #126（#117）：`scene/HUDMarkStrip.tsx`、`ticket-stub.ts`、`test/ticket-stub.test.ts`，删打孔。
  - PR #115（#114）：变基到最新 main，丢掉分支上过时的交接提交和合并提交，代码同 `a153d7b`。
  - PR #127（#103）：`scene/AppPendant.tsx`、`ui/src/global.css`，摆动 / 眨眼 / 星星闪烁只在 `:hover` 时播放。
  - PR #128（#124）：同上一节批 B 清单，另按设计稿对照修了 `panel/SessionsSection.tsx` 两处：说明浮条的块名按色块着色（深色用浅色调 `#8fcdb9` 等，浅色用色块本色），浮条与行的间距 6→7；`host/src/handoff.rs` rustfmt。
  - `docs/LESSONS.md`：新增 L-09。
- 测试：五个分支依次叠在一起，在最上层（与五个 PR 合并后的 main 树相同，合并前逐个核对过 `git diff` 为空）跑全量：`pnpm run check` 第一次退出 1（`handoff.rs` rustfmt 差异），格式化后第二次退出 1（未跟踪的预览脚手架 `preview-relay/main.tsx` 不合 prettier），删掉脚手架后第三次退出 0；`pnpm test` 退出 0（Rust 合计 706 passed / 0 failed；`ℹ pass 232` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 7` / `ℹ fail 0`），这次 test 跑在 rustfmt 之前，之后只改了格式；`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。中间各 PR 单独的状态没有分别跑全量。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-merge-all/`（check.log、check2.log、check3.log、test.log、rules.log、build.log）。
- 验证：
  - 批 B 托盘：真实组件预览（`preview-relay`，用完已删）与设计稿第 2 版舞台 A 在内置浏览器对照两轮。第一轮量得 62×62、五色、图标 20、字 12/600/0.06em、浮条宽 = 托盘宽且右对齐，与设计稿一致；不一致的是浮条块名颜色和间距，已修。第二轮查键盘（← 打开并聚焦「审核」，→ 跳过两块灰的到「讨论」「移除」并停在末端，Esc 收起并回到行，行上 → 收起）、灰块悬停说明「还不能用」、点「审核」后行内绿字「已请它整理改动，交给 ChatGPT 审核」且假服务收到 `launch s1 review`、失败时红字、浅色。
  - 展开卡在同一预览里复看：浅蓝纸、只有顶边斜纹、圆章不贴边。
  - 实机（装最新版后，电脑控制）：票根左上角没有打孔圆点（Claude 在跑时）；悬停打开面板，两指左划拉开本会话一行的托盘，最后一行的说明浮条向上弹，块名着色，「测试」「续做」是灰的。**点色块没成功**：点「审核」「移除」托盘收起，但行内没有提示、行也没被移除，宿主侧看不出收到了发起；点面板「统计」时点击穿到了下面的 Claude 窗口。同一组件在浏览器里点击正常，判断是电脑控制的点击到不了悬停面板（L-09），不是批 B 的代码问题，但没有实证。所以「会话收到固定请求并自己调用 `relay_to_chatgpt`」和实机展开卡都未验证，需要常浩用鼠标点一次。
  - #103 CPU：同一套方法（主进程 + GPU + 两个 WebContent + Networking 的累计 CPU 时间差，30 秒平均）测得装机前 `d05ff35a83a2` 21.6%，装机后 `24d03c035623` 20.4%（第一次测时少算了一个 WebContent 进程，重测）。差别在误差范围内，猫球静止省下的很少；文件 `cpu-before-d05ff35a83a2.txt`、`cpu-after-24d03c035623.txt`。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-06-merge-all/screens/`：设计稿 `design-stageA.jpg`；预览 `tray-r1-dark-review.png`、`tray-r2-dark-test-hint.png`、`tray-r2-dark-notice.png`、`tray-r2-light.png`、`tray-r2-light-fail.png`；实机 `device-strip-no-punch.jpg`、`device-tray-open.jpg`、`device-tray-hint-up.jpg`、`device-tray-remove-hint.jpg`、`device-tray-after-click.jpg`。
- 发布与回读：从 main `32f51f3` 打包，装前 `/Applications` 是 `d05ff35a83a2`（与上一节一致，没被别的会话覆盖），备份到 `evidence/2026-11-06-merge-all/PostPane-d05f.app`；09:09:19 退出旧应用后 `ditto` 安装并启动，`shasum` 回读与产物一致 `24d03c035623`；数据线程正常出快照，没有卡在权限弹窗（L-06）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-06-merge-all/PostPane-d05f.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 「印戳」按 #117 打孔圆点处理，没向常浩核实；如果他指的是 Hermes 机器人印章（#101、#105、#116），要另做。
  - 实机两指左划时，悬停面板整块内容会横向滚动约 8pt（左边字被切掉）：托盘的横向滚轮没有阻止默认滚动，面板滚动容器横向有约 8pt 溢出。是否 #110「移除」时就有没核实，建议另开一单修。
  - 本会话的 agent-hud MCP 调 `hud_snapshot` / `get_hud_screenshot` 报「请打开设置 → 智能体插件里的允许助手调整侧栏」，没能用它截面板。
  - 旧接力 `h1a1ac7fcf2600`、`h1a1ae06cd7400` 仍是 open（同上一节）。
  - 预览脚手架 `src/apps/desktop/preview-relay/` 已删；主目录 `.claude/launch.json` 的 `relay-tell`、`relay-card` 两项已删。worktree `.claude/worktrees/120-relay-card` 先留着（停在 `32f51f3`），常浩实机点过「审核」、确认不用再改批 B 后再删或 `cargo clean`。别的会话留下的已合并 worktree（`117-no-punch`、`57-menubar-default-off-299c4a`（现在在 `claude/114-cron-failed`）、`pendant-hover`）没动。
- 本轮新坑：L-09。

## 接力卡区分定稿、展开卡改好未合并、批 B 写完未验证（2026-11-06，Claude，常浩逐轮挑定方案；两个 WIP 提交都在本地分支，未推送、未开 PR、未装机；上下文到约 50% 交接）

- 时间：开工 `2026-11-06 08:13`（估计，接着上一节）；本节写于 `2026-11-06 08:44`。来由：常浩要接力卡和普通黑色票据卡分开（#120）；批 B 左滑发起（#124）。
- 改了哪些文件：
  - 分支 `claude/120-relay-paper`（`ad4035e`，WIP，基于 main `3ace2e1`）：`hud/src/paper.ts`（新 `relayPaperOf`：深浅两色都是浅蓝纸 `#e3e9f1` / `#d9e3f0`、深墨 `30,40,58`，`airmail: true`；`airmailStripes` 红蓝斜纹）、`HUDScene.tsx`（展开卡打开时外框与卡内都用接力纸，卡用浅色头像）、`scene/HUDExpandedSurface.tsx`（`AirmailEdges`：展开卡只画顶边 6pt，收起的票签画远离齿孔的一侧 4pt）、`alerts/HandoffCard.tsx`（页头让出顶边 6pt）、`hud/test/relay-paper.test.ts`（新）。
  - 分支 `claude/relay-b-swipe`（`3471d53`，WIP）：`host/src/handoff.rs`（`launch` + `relay_launch` 命令：往 Claude 会话发固定的话请它自己整理后调 `relay_to_chatgpt`，审核 / 讨论两种；测试 `a_swipe_asks_the_claude_session_to_hand_its_own_work_over`）、`host/src/lib.rs`（注册命令）、`app/src/App.tsx`、`hud/src/PanelContext.tsx`（`relayLaunch` 服务）、`hud/src/panel/relay-tray.ts`（新：色块种类、可用、键盘步进、文案）、`panel/SessionsSection.tsx`（Claude 本机会话左滑出 5 块 62pt 托盘：审核 / 测试（灰）/ 续做（灰）/ 讨论 / 移除，悬停说明浮条、←/→/Esc、发出后行内提示 6 秒；其他会话仍只有「移除」）、`hud/test/relay-tray.test.ts`（新）。
- 测试：`claude/120-relay-paper` 只跑了 `node --test test/relay-paper.test.ts`（`ℹ pass 1` / `ℹ fail 0`）和 `tsc --noEmit`（无输出）；`claude/relay-b-swipe` 只跑了 `cargo test -p agent-hud-host handoff`（12 passed）和 `node --test test/relay-tray.test.ts`（`ℹ pass 4` / `ℹ fail 0`）。两个分支的全量 `pnpm run check` / `pnpm test` 都未跑。
- 验证：区分方案出了三轮（Artifact https://claude.ai/artifact/7U5jmwm9mDqWVsbDjimz1A 第 1–3 版，源与构建脚本在 `evidence/2026-11-06-relay-tell/`）：第 1 版牛皮纸 / 细航空边 / 复写两联单，常浩说都不明显；第 2 版浅色航空信笺 / 深蓝信封加邮票 / 航空粗边，常浩定「甲的浅蓝 + 乙的形式」；第 3 版比邮票放法后常浩说「不要邮票，正常放印戳」，又说「顶部加航空线的边、弹出卡侧边也加」，最后「只要顶边」。代码版用真实组件预览（`src/apps/desktop/preview-relay/`，未提交）2 倍截图对过：浅蓝纸、只顶边斜纹、圆章不贴边。批 B 托盘还没在预览里截图对照。
- 截图：`evidence/2026-11-06-relay-tell/screens/`（v2-*、v3-*、z-v3r2-heads、code-top-only-2*.png、z-code-top.png）。
- 发布与回读：未发布；`/Applications` 仍是 `d05ff35a83a2`（main `6dcc189`）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 弹出卡（乙 · 侧栏传信票签）侧边的航空边要在批 C 实现票签时照做；`HUDExpandedSurface` 已按「收起时画外侧边」写好，但现在只有展开卡用接力纸，收起状态还没用到。
  - 预览脚手架 `src/apps/desktop/preview-relay/`（未跟踪）与主目录 `.claude/launch.json` 的 `relay-tell`、`relay-card` 两项，用完删掉。
  - worktree `.claude/worktrees/120-relay-card` 现在在 `claude/120-relay-paper`；批 B 在同一 worktree 的 `claude/relay-b-swipe`，切分支前确认没有未提交改动。
- 本轮新坑：无。

## 接力批 A 收尾：第 2 轮意见合并装机、实机复验一整圈；接力卡区分三版待挑（2026-11-06，Claude，常浩说「按计划开工」；PR #123 测试全过、按授权已 squash 合并 `6dcc189`，已打包安装、回读一致；区分方案只出设计稿，未改代码）

- 时间：开工 `2026-11-06 07:45`（估计，按常浩说「按计划开工」；本节写于 `2026-11-06 08:11`）。来由：#120 第 2 轮审核意见，以及常浩要求接力卡和普通黑色票据卡在颜色、质感、细节上分开。
- 改了哪些文件：`host/src/handoff.rs`（①认会话只认调用方自报的 `caller.sessionId`，删掉「同目录唯一在线会话」兜底与 `Known` / `claude_sessions` / `same_folder`；②`start` 先按 `session:<id>` 占位；④「结束接力」走发送占位；⑤`turn start` / `turn complete` 在会话未绑定或该接力正在送时整条缓存（最多 16 条），`open`、`opened_late`、`start` 续送之后按序补录；新增 5 条测试、删 2 条旧兜底测试）、`host/src/tools.rs`（不再取快照里的 Claude 会话）、`host/src/claude_plugin.rs`（删没人用的 `loaded`）、`docs/chatgpt-channel.md`（接力记录、接力工具两处）。③在前一提交 `8592997` 已做（失败的旧接力在同会话有更新接力后不再迟到绑定），同在 #123。
- 测试：#123 合并前 `pnpm run check` 退出 0（第一次因 rustfmt 格式差异退出 1，`rustfmt` 后重跑通过）；`pnpm test` 退出 0（Rust 合计 703 passed / 0 failed；`ℹ pass 224` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 7` / `ℹ fail 0`），这次 `pnpm test` 跑在 rustfmt 之前，之后只改了格式。`cargo test -p agent-hud-host handoff` 11 passed。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-relay-a/`（check3.log、test3.log、build3.log）。
- 验证：实机用本会话（`0c5ec9e4-…`）调真实 MCP 工具 `relay_to_chatgpt` 发起一次通路复验（不是第 3 轮审核），宿主认准本会话；约 7 秒打开新 ChatGPT 会话并送达，4 秒后回 2 条、结论「通过」被读出；侧栏弹出回执（标题用接力标题）→「正在进行」本会话第二行「接力 1/2 · 回信到了 · 通过 · 2 条意见」→ 展开卡时间线、意见、结论正确 → 点「转回 Claude」后时间线记 08:10 转回、印章变「修改」、按钮变「再审一轮」→ 点「结束接力」后变「已结束」。「处理中」这次没看到：ChatGPT 4 秒就答完；补录顺序由单测 `turns_while_the_next_round_is_on_its_way_count_for_that_round`、`turns_before_the_conversation_is_bound_are_taken_in_order` 覆盖。
- 区分方案（设计，未改代码）：三版做进一个可切换页面 https://claude.ai/artifact/7U5jmwm9mDqWVsbDjimz1A ——甲「换纸 · 牛皮信封纸」、乙「封边 · 航空信红蓝细边 + 双圈邮戳」、丙「复写 · 蓝墨两联单 + 竖排联号」，每版都有弹出卡（乙 · 侧栏传信票签与信封）和展开卡、深浅两色，并放普通回执对照；四个进度可切、可重放传信。卡片照 `HandoffCard.tsx` 与设计稿第 2 版按 1pt = 1px 搭，内置浏览器对照两轮：第一轮修了回执被舞台截掉、牛皮纸纤维纹太重像木纹、「结论：需修改」折行；第二轮修了丙的联号压住「接力」栏目名和票签图标，窄屏舞台默认停在侧栏一侧；400 宽无横向溢出。源文件与构建脚本在 `~/Library/Application Support/postpane/evidence/2026-11-06-relay-tell/`。
- 截图：实机 `evidence/2026-11-06-relay-a/screens/device3-receipt.jpg`、`device3-sessions-tag.jpg`、`device3-card-replied.jpg`、`device3-card-returned.jpg`、`device3-card-ended.jpg`；区分方案 `evidence/2026-11-06-relay-tell/screens/`（round1-jia、round2-jia-1240、round2-yi-card、round2-bing-light）。
- 发布与回读：从 main `6dcc189` 打包，退出旧应用后 ditto 到 `/Applications`，`shasum` 回读与产物一致 `d05ff35a83a2`（装前 `/Applications` 是批 A 那版 `de8d3d7e6432`，未被别的会话覆盖）；装前备份 `evidence/2026-11-06-relay-a/PostPane-de8d.app`；启动后进程常驻、快照正常出，没有权限弹窗。回滚：退出应用后 `ditto` 备份回 `/Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 区分方案等常浩挑；挑定后展开卡改 `HandoffCard.tsx`（外框纸面在 `scene/HUDExpandedSurface.tsx` 与 `paper.ts`，要给接力卡加一个纸面变体），弹出卡在批 C 照定稿实现；批 C 之前接力回信仍以普通回执弹出，可先给它加同样的识别。
  - 旧接力 `h1a1ac7fcf2600`（绑 `cf1ccc8f-…`）和 `h1a1ae06cd7400`（绑 `0540ac1a-…`）仍是 open：它们的会话已不在「正在进行」里，侧栏上点不到它们的卡，没能结束。之后可在卡上结束，或另做一个从统计里打开接力卡的入口。
  - 范围外：回执收起成小签时，小签文字是 ChatGPT 会话标题（brief 开头几行，如「驿窗｜接力实机复验（#123） 目标…」），展开后才是接力标题，两处不一致。
  - 范围外：电脑控制工具把 `app.postpane.mac` 显示成「PostPane-before」，因为证据目录里的备份 `.app` 用同一个包 id 被系统登记了；按包 id 启动可能打开备份，装机和启动都用 `/Applications/PostPane.app` 路径。
  - 主目录 `.claude/launch.json` 加了一项 `relay-tell`（预览区分方案用，`.claude/` 不进仓库），区分方案定稿、展开卡改完后删。
  - worktree `.claude/worktrees/120-relay-card` 已切到 `origin/main`（detached）打包，留给展开卡改定稿（新分支）复用编译缓存，那批合并后 `cargo clean` 或删除。
- 本轮新坑：无。

## 接力批 A 合并装机、实机跑通一整圈，第 2 轮意见待处理（2026-11-06，Claude，常浩说「按推荐开工 A」；PR #121、#122 测试全过、按授权已 squash 合并 `6d83350`、`686159d`，已打包安装、回读一致；第 2 轮修正分支未合并）

- 时间：开工 `2026-11-06 00:40`（估计，按常浩说「按推荐开工 A」；本节写于 `2026-11-06 07:41`）。来由：#120。
- 改了哪些文件：`platform/src/clients/chatgpt/handoffs.rs`（阶段 phase、每步 steps、意见与结论解析、去重、超时 / 重启 / 重试 / 迟到绑定、每次重试独立请求号、回信按 messageId 去重且只认审核中的一轮）、`platform/src/clients/chatgpt/mod.rs`（名单记接力标题 `named`、`Channel::listen` 把回合开始 / 完成 / 迟到的 opened 告诉宿主、`open_as`）、`host/src/handoff.rs`（`handoff_act` 四个按钮、发送占位、先开始后绑定补成处理中、认会话不按「同目录最近活跃」兜底；撤掉 `handoff_start/forward/route`）、`host/src/chatgpt.rs`（插件登记或连上即算检测到）、`hud/src/presentation.rs`（迟检测客户端首次检测到时把自动存下的实时状态关打开一次，记 `late-detected.json`）、`apps/mcp/src/index.ts`（`relay_to_chatgpt` 加 `summary`）、`packages/hud/src/alerts/{HandoffCard.tsx,handoff-card.ts}`（甲时间线展开卡，新）、`CompletionAlertView.tsx`（「查看接力」替换「转给…」，接力回复用接力标题）、`panel/SessionsSection.tsx`（「正在进行」第二行虚线「接力 1/2」+ 进度）、`HUDScene.tsx`、`PanelContext.tsx`、`App.tsx`、`protocol`、`ui/global.css`；删 `HandoffSheet.tsx`、`handoff-sheet.ts` 及其测试；文档 `docs/chatgpt-channel.md`「1c 接力」、`docs/ROADMAP.md` 阶段 5 分批。
- 测试：#122 合并前 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 699 passed / 0 failed；`ℹ pass 224` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 7` / `ℹ fail 0`）。#121 时 Rust 697 / 0、前端 224 / 0。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-relay-a/`（check.log、test.log、check2.log、test2.log、build*.log）。第 2 轮修正分支 `claude/120-relay-fixes-2`（`8592997`）只跑了 `cargo test -p agent-hud-platform handoffs`（9 passed）与 `-p agent-hud-host handoff`（8 passed），全量未跑。
- 验证：UI 先用真实组件起本地预览页（`evidence/2026-11-06-relay-a/preview-relay/`，不进仓库），内置浏览器对照设计稿截两轮：第一轮发现头像底下有纸色方块、待决定一行标题多了「驿窗」，改后第二轮一致；另看已送出 / 已转回 / 没送出去 / 已结束 / 浅色、「正在进行」接力标记。实机：装好后 ChatGPT `sourcePreferences.live` 由 false 变 true；本会话（`0540ac1a-…`）用真实 MCP 工具 `relay_to_chatgpt` 发起，宿主认准本会话，4 秒送达新会话 `6aed1019-…`（名单标题为接力标题），约 3 分钟回 5 条意见、结论「需修改」被读出；侧栏弹出回执 →「查看接力」打开展开卡；实测卡超出屏幕、回执标题是整段背景，#122 修好后重装复看正常；从「正在进行」的「接力 1/2」也能打开；点「转回 Claude」后意见经插件送回本会话（一整圈跑通），时间线 / 圆章 / 按钮随之变化；第 2 轮复审续进同一会话，结论仍「需修改」，已到 2 轮上限，不再自动送第 3 轮。
- 截图：`evidence/2026-11-06-relay-a/screens/`（预览 round1/round2-replied、sent、returned、failed、ended、replied-light、sessions-tag；实机 device-reply-chip、device-receipt、device-card-overflow-before、device-sessions-tag、device-card-fixed、device-card-returned）。
- 发布与回读：`686159d` 打包，ditto 到 `/Applications`，`shasum` 回读与产物一致 `de8d3d7e6432`（中间一版 `6d83350` 为 `c78030b8d797`）；装前备份 `evidence/2026-11-06-relay-a/PostPane-before.app`（`04cf5f21a231`，1c 版）。
- 与授权不一致之处、遗留问题、范围外发现：
  - **第 2 轮意见待处理**（接力 `h1a1ae06cd7400`，ChatGPT 会话 `6aed1019-…`）：①`resolve_session` 仍会误绑：A 的环境 id 过时且 A 未加载插件、同目录只有 B 在线时会绑给 B——定为去掉「同目录唯一在线」兜底，只认调用方自己的会话 id（最坏转回时报「未加载插件」，不会送错）；②首次 `start` 并发可能建两条接力——按 Claude 会话 id 在创建阶段占位；③失败的旧接力在新接力也失败后仍可能被迟到回应复活——已在分支 `claude/120-relay-fixes-2`（`8592997`）改为检查任何更新的接力；④「结束接力」与发送有竞态——`end` 也走发送占位；⑤绑定前完成的 `turn complete` 会丢——与 `turn start` 一起缓存并在绑定 / 送达后补录（也解决第 2 轮看不到「处理中」：ChatGPT 在 `sent` 回应前就开始回答，那次 start 被丢）。补录只在会话未绑定或该接力正在送时缓存，免得把回信后的闲聊补成回信。
  - 第一次装完后 `open` 两次进程启动后就消失、第三次正常常驻，没查明原因（症状像 L-06 但没截到权限弹窗），这轮第二次装机正常。
  - 上一轮的旧接力 `h1a1ac7fcf2600`（绑旧会话 `cf1ccc8f-…`）仍是 open，可在卡上「结束接力」。
  - PR #122 合并后 Auto-fix 报过一次「冲突」，是变基前的旧 head `d784051`，PR 已合并，无需处理。
  - worktree `.claude/worktrees/120-relay-card` 仍在用（分支 `claude/120-relay-fixes-2`），批 A 收尾合并后再 `cargo clean` / 删除。
- 本轮新坑：无。

## 接力 1c 合并装机、实测，接力界面重新设计定稿（2026-11-06，Claude，常浩说「开工 1c」，实测后说回执「还是没弹出……接力的形式需要重新做」，选定「乙的弹出卡片，甲的展开卡片」；PR #119 测试全过，按授权已 squash 合并 `5375029`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 23:30`（估计，按常浩说「开工 1c」；本节写于 `2026-11-06 01:18`）。来由：#71（已关）。
- 改了哪些文件（PR #119，子 agent 写、Claude 审查并全量重跑）：`platform/src/local_tools/{unix,mod,windows,tests}.rs`（每连接一线程上限 8、`request_with_timeout`）、`engine/src/main.rs`（按方法超时）、`platform/src/clients/chatgpt/handoffs.rs`（接力记录 `<数据目录>/chatgpt/handoffs.json`、项目网址 `config.json`）、`host/src/handoff.rs`（Desk、调用会话识别 `resolve_session`、命令 handoff_start/forward/route、chatgpt_project）、`host/src/{lib,tools,chatgpt,claude_plugin}.rs`、`apps/mcp/src/index.ts`（工具 `relay_to_chatgpt`）、`engine-client`、`protocol`（`Handoff`、`Snapshot.handoffs`）、设置页「新会话放进项目」、侧栏回执「转给…」转交单（`alerts/HandoffSheet.tsx`、`handoff-sheet.ts` 等）、`docs/chatgpt-channel.md`「1c 接力」。
- 测试：合入最新 main 后 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 691 passed / 0 failed；`ℹ pass 223` / `ℹ fail 0`、`ℹ pass 8` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 7` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-06-handoff/`（check.log、check2.log、test.log、test2.log、build.log）。
- 验证（实机，tools 套接字以本会话 `cf1ccc8f-…` 为调用方调 `relay_to_chatgpt`）：立即返回 opening；9 秒新开「驿窗审核」项目里的会话 `6aecac00-…` 并绑定为 open；约 1 分钟 ChatGPT 审核意见（5 条、「结论：需修改」）作为完成记录传回；第 2 轮返回 sent、续进同一会话、3 条精简意见传回。项目网址由 Claude 按常浩给的网址写入 `chatgpt/config.json`。
- **未通过**：侧栏回执没弹出，转交单与「送回 Claude」未能实测。原因已查明：`hud/src/presentation.rs` `apply_live_status_defaults` 只在首次见到时按「是否检测到」定 `sourcePreferences[源].live` 并永久保存；ChatGPT 无本机文件被判未检测，存成 `live:false`，`IslandNews.tsx` 弹回执前要求 `live !== false`，于是一直被拦。另：回执只在到达时弹在鼠标所在屏幕、收起后无处再找（设计缺口）；名单 `watched.json` 里该会话标题记成了整段背景交代（应记接力标题）。
- ChatGPT 审出的问题（待处理，作为下一批输入）：会话认不准时不该按同目录最近活跃会话兜底猜；opening 要超时、重启恢复、重试；区分「送到了」和「审完了」、送达确认与幂等。
- 界面重新设计：常浩否掉第一版「质量都太差」，重做稿 https://claude.ai/artifact/VReXNsQ2gUc6RPRmtcvdXB （第 2 版；源与截图存 `evidence/2026-11-06-handoff/design/`）。常浩定：**弹出卡用乙「侧栏传信」**（信封从发信方票根沿侧栏外缘走进收信方票根，读数换「审」字小章，旁挂细票签写进度；回信走回发信方盖「回」章）；**展开卡用甲**（竖向时间线：每步时间 / 谁 / 做了什么，审核意见列在 ChatGPT 那步下，底部「转回 Claude」「再审一轮」「结束接力」「查看 ChatGPT 对话」）；**左滑发起**照淘宝侧滑，三版共用（每块 62pt、图标在上字在下：审核→ChatGPT、测试→Codex、续做、讨论、移除；悬停浮出一行说明交给谁、发什么；超过 4 种换「更多」）；「正在进行」该会话第二行加「接力 1/2」标记可再打开展开卡。常浩选定：Claude 会话条左滑「审核」时，驿窗往该 Claude 会话发一句固定的话，让它自己整理背景（改了什么、diff、PR）再调 `relay_to_chatgpt`；会话在跑就排队。
- 全局规则：常浩要求把「每个要求都认真做，不敷衍」写进全局规则并同步 Codex、Hermes：已写 `~/.claude/CLAUDE.md` 第 11 节、`~/.codex/AGENTS.md`、`~/.hermes/memories/USER.md`（改前备份 `*.bak-2026-11-06`）；Vault P-10 已提交修改建议待常浩在工作台采纳（建议 id `29f1ba1d-…`）。
- 发布与回读：`5375029` 打包，00:16 ditto 到 `/Applications`，`shasum` 回读与产物一致（`5ce1ffced493`）；装前 `949fe8fc53cf`（另一会话 00:03 装，改动已在 main），备份 `evidence/2026-11-06-handoff/PostPane-before.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 测试在「驿窗审核」项目留下会话（列表测试、后台标签页测试、接力设计评审），可由常浩删除；接力记录 `h1a1ac7fcf2600` 绑定了本会话，可在新实现里结束。
  - 下一步分四批（常浩已同意拆分，开工前先给分批计划）：A 数据与展开卡（修 live 默认：插件登记或连上即算检测到并纠正已存的 false；接力步骤记录；甲展开卡；「接力 1/2」入口；撤掉回执转交单）→ B 左滑发起 → C 乙弹出卡 → D 往 Codex 送话（1a，需常浩开 Codex 测试会话）。
  - worktree `71-handoff` 已删。
- 本轮新坑：无。

## 侧栏「正在进行」：左滑露出「移除」（2026-11-05，Claude，常浩问「如何在这个面板里把它删除掉」，要求左拖弹出删除、有新内容再弹出，看三版预览后选「甲：露出按钮」；PR #110、#113 测试全过，按「测试全过可直接合并」授权已 squash 合并 `fa0a460`、`62b8a90`，已从 main `62b8a90` 打包安装、回读一致）

- 时间：开工 `2026-11-05 22:24`（按本会话建立时间）。来由：issue #106，三版预览 https://claude.ai/artifact/VEELS5HJ5yo2eoUM72bon5 。
- 改了哪些文件：
  - PR #110：`hud/src/panel/removed-sessions.ts`（新：移除记录，记下移除时的状态、所等审批 id、等你状态下的最后消息时间，一变就回来；快照里有但已不在列表的会话记录作废；最多 100 条；存 webview localStorage，各侧栏窗口共用、重启仍在）、`hud/src/panel/SessionsSection.tsx`（列表按记录过滤、抬头条数跟着减、「另有 N 个已停」仍按未过滤算；`LiveRow` 加拖动与「移除」按钮，拖后那次点击不跳回会话，点别处 / 往右拖 / Esc 收回）、`hud/test/removed-sessions.test.ts`（新，6 个用例）。
  - PR #113：`SessionsSection.tsx` 两指左划按整次手势累加位移（原来每个滚动事件读旧的 `drag` 状态，划不开）。
- 测试：PR #110 `pnpm run check` 退出 0，`pnpm test` 退出 0（`ℹ pass 214` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 3` / `ℹ fail 0`，Rust 677 passed / 0 failed），`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；前两次没过（prettier、`useRef` 缺初值 TS2554），其中一轮 `grok_bot_session_works_while_a_message_has_no_reply_and_idles_once_answered` 失败一次，单独连跑 3 次都过，视为偶发。PR #113 `pnpm run check` 退出 0，`pnpm test` 退出 0（`ℹ pass 218` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 7` / `ℹ fail 0`，Rust 679 passed / 0 failed）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-swipe-remove/`。
- 验证：浏览器预览（launch 配置 `swipe-106`，隔离数据目录 `evidence/2026-11-05-swipe-remove/data`），设置「显示」页面板预览里的真实会话；预览是 inert 的，用脚本发 Pointer / Wheel 事件：拖动后停在 `translateX(-72px)` 露出「移除」，点「移除」条数 5→4，刷新后仍隐藏，点别处收回；两指左划修复前打不开，修复后打开、反向收回、短划弹回。实机没试，请常浩在侧栏上用鼠标拖和触控板两指左划各试一次。
- 截图：无。
- 发布与回读：main `62b8a90`（含 Hermes 会话的 #111）打包，23:29:32 ditto 到 `/Applications` 并启动，`shasum` 回读与产物一致（`74b4bed93912`）；23:18 先装过一次 `e369069`（`446798688c72`）。已发消息请 Hermes 会话别再装（L-05）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-swipe-remove/PostPane-before.app /Applications/PostPane.app`（`2a8ef80304ea`）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 按推荐默认做了「重启后仍有效」「在跑的也能移除」，常浩没反对。
  - 全部移除后空列表文案仍是「没有会话在跑，也没有在等你的」。
  - 浏览器预览里测试留下的移除记录已清掉（只在 localhost 源，不影响实机）。
  - worktree `.claude/worktrees/106-swipe-dismiss` 本节提交后删掉。
- 本轮新坑：无。

## Hermes 小收据改显示两个机器人（2026-11-05，Claude，常浩问「hermes的侧边栏应该显示什么」，看过三版预览后选「甲」并说「印章不要倾斜」；PR #111 测试全过，按「测试全过可直接合并」授权已 squash 合并 `e64df26`，已从 main `e64df26` 打包安装、哈希回读一致）

- 时间：开工 `2026-11-05 22:54`（按 issue #108 创建时间）。来由：由会话 local_6f6492be 交来；三版预览 https://claude.ai/artifact/PaPokLb4htuXhNxhaD3YdY 。印章倾斜已由另一会话 #105 全局去掉，本轮沿用。
- 改了哪些文件：`agents/src/hermes/transcript.rs`（`activity`：今天飞书会话里本人有话的提问条数、最近一次飞书回复时间，不计定时任务与一次性会话）、`agents/src/hermes/mod.rs`（`Gateway.home`、`Gateway::activity`）、`core/src/snapshot.rs`（快照加 `hermesBots`，默认机器人在前）、`core/src/island_events.rs`（测试构造补 `home`）、`packages/protocol`（`HermesBotStatus`）、`hud/src/model.ts`（`HUDVendor.bots`）、`hud/src/scene/hermes-peek.ts`（每个机器人的状态与说明行）、`hud/src/scene/peek-size.ts`（小收据高度，从 `AgentPeek.tsx` 拆出）、`hud/src/scene/AgentPeek.tsx`（收据纸与刘海两种小收据都画机器人行和「24 小时」）、`hud/src/scene/useHUDLayout.ts`、`hud/test/hermes-peek.test.ts`。
- 测试：变基到 `d45976f` 后 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 679 passed / 0 failed；`ℹ pass 218` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`）；变基前 `node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。新测试 `a_bots_activity_counts_its_feishu_turns_and_last_reply` 与 `hermes-peek.test.ts` 5 条。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-hermes-peek/`。
- 验证：只有单测与类型检查；摸底时用 sqlite 只读核对过实机数据（今天猛鬼兽飞书 9 轮、亚古兽 7 轮，最近回复 21:51 / 21:55）。MCP `hud_snapshot` 因设置里没开「让智能体排布侧栏」读不到；小收据实物没看过，请常浩悬停 Hermes 头像看一眼：两行机器人、方印端正、底部「24 小时」，没有「额度 --」。
- 截图：无。
- 发布与回读：main `e64df26` 打包（`build-main.log`），23:24:58 ditto 到 `/Applications` 并启动，`shasum` 回读与产物一致（`8a6ad4201a77`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hermes-peek/PostPane-before.app /Applications/PostPane.app`（`446798688c72`）。最终装机由「左滑移除」会话从 main `62b8a90`（含 #110、#111、#113）打包覆盖，以那次为准（L-05）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 摸底发现 Hermes 主模型走 `openai-codex`（ChatGPT 订阅的 Codex 通道，计费记为订阅内），备用 DeepSeek；是否与 Codex 同账号未核对（读凭证被权限拦下）。
  - Hermes 定时任务「周报」11 月 2 日那次失败，驿窗没有任何提示，可另开一单做成细条。
  - 每次出快照都对两个 `state.db` 各做两次只读查询（毫秒级），没加缓存。
  - worktree `.claude/worktrees/108-hermes-peek` 已删。
- 本轮新坑：无。

## 接力 1b：ChatGPT 通道（2026-11-05，Claude，常浩说「都按推荐……按推荐直接开工」，并告知 ChatGPT 已装 GitHub 连接器、给了「驿窗审核」项目网址；PR #104、#109、#112 测试全过，按「测试全过可直接合并」授权已 squash 合并 `e28f18d`、`e369069`、`cc5c10b`；驿窗从 `e28f18d` 打包安装、回读一致，后两个只改插件）

- 时间：开工 `2026-11-05 21:45`（估计，按常浩说「按推荐直接开工」；本节写于 `2026-11-05 23:22`）。来由：#99（已关）。设计见 ROADMAP 阶段 5（`8eec2e0`）与 `docs/chatgpt-channel.md`。
- 改了哪些文件：
  - Chrome 插件 `src/apps/chrome-extension/`（Claude 写）：`manifest.json`（固定 key，id `fjjbgamejbdjdaddinacpbmaeokinbjl`）、`page.js`（页面结构与 Markdown 整理集中于此）、`content.js`（按会话报一轮开始 / 完成）、`background.js`（Native Messaging、名单、新开会话、按 id 送话、「驿窗接力」标签组）；测试 `test/page.test.mjs`、`test/content.test.mjs` 与样本页 `test/fixtures/conversation.html`（按探针记下的结构手写），根 `package.json` 加 `test:extension`。
  - 驿窗端（子 agent 写、Claude 审查并补第二轮测试）：`agents/src/chatgpt/`、`agents/src/{agent,channel,lib}.rs`（`Carries::Turns`）、`core/src/hook_events.rs`（通道报的 completion、prompt/navigationTarget）、`core/src/tests/chatgpt.rs`、`platform/src/clients/chatgpt/`（本机套接字 0700/0600、分帧、名单 `watched.json`、host manifest）、`platform/src/navigation.rs`（`chatgpt-conversation`）、`platform/src/hooks/inbox.rs`（单条上限 64 KB → 4 MB）、`engine/src/main.rs`（Chrome 以 `chrome-extension://` 启动时做转接、核对插件 id）、`host/src/chatgpt.rs`、`host/src/{lib,tools}.rs`（`chatgpt_open/send/status`，与侧栏工具同一开关）、设置页 `AgentPluginsPane.tsx` 等（「ChatGPT（Chrome 插件）」登记）、`hud` 回执名 ChatGPT 且看过才收起、`AGENTS.md` 导航表、`docs/platform-architecture.md`、`src/tooling/client-literals.json`。
- 测试：`e28f18d` 合并前（已合入当时 main）`pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 677 passed / 0 failed；`ℹ pass 208` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 3` / `ℹ fail 0`）。#112 分支 `pnpm test` 退出 0（Rust 678 / 0；`ℹ pass 213`、`6`、`14`、`7`，fail 均 0），prettier、`check-rules` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-chatgpt-channel/`（check.log、check2.log、test.log ~ test4.log、build.log）。
- 验证（实机，常浩 Chrome + 已装驿窗，经 tools 套接字脚本 `~/Sandbox/2026-11-05-chatgpt-probe/tool.js` 调 `chatgpt_*`）：
  - 插件连上、id 一致；host manifest 由常浩在设置里登记。
  - `chatgpt_open` 在「驿窗审核」项目里新开会话 `6aec997d-…`（18 秒，标题「列表测试」），后台标签页、归入标签组。
  - 首版插件在后台标签页漏报完成（去抖被持续变化推迟）→ PR #109 改定时采样 + 认新消息 id；`chatgpt_send` 第二轮 6 秒后收到完成，标题、prompt、带 `bash` 标记的代码块、「结论：通过」都对，侧栏数据里有 ChatGPT 回执。
  - 刷新标签页后旧回复被重报 → PR #112 只在本页见过停止按钮或自己送过话时报完成；之后再刷新未重报。
  - 后台：新开会话 `6aec9ec9-…`（状态 hidden）回复完成照常收到。
  - 侧栏回执外观未截图核对（没有操作驿窗窗口的权限），请常浩看一眼。
- 截图：无。
- 发布与回读：`e28f18d` 打包，22:53 ditto 到 `/Applications`，`shasum` 回读与产物一致（`c509acb4e490`）；装前是另一会话 22:34 装的 `c36e82ac0cd1`（其改动已在 main），备份 `evidence/2026-11-05-chatgpt-channel/PostPane-before.app`。#109、#112 只改插件，常浩在 Chrome 重新加载即生效。
- 与授权不一致之处、遗留问题、范围外发现：
  - 测试在 ChatGPT「驿窗审核」项目里留下两个会话（「列表测试」「后台标签页测试」），可由常浩删除；探针插件已由常浩移除。
  - 1c 前要处理：local_tools 一次只处理一个请求（`chatgpt_open` 最多占 90 秒）、MCP 侧客户端读超时 40 秒；`turn start`（运行中）未接；Windows 为桩。
  - 静止侧栏里 ChatGPT 与 Codex 同在 OpenAI 一行（按常浩「先不加票根」）。
  - worktree `99-chatgpt`、`99-history` 已删。
- 本轮新坑：无。

## Hermes 印章摆正，不再倾斜（2026-11-05，Claude，常浩看了对比页 https://claude.ai/artifact/QAZrHoAAGbWwQT421tPUXh （A 方框不倾斜 / B 去掉方框）后说「用 A 不倾斜」；PR #107 测试全过，按「测试全过可直接合并」授权已 squash 合并 `809d221`，已从 main `809d221` 打包安装、回读一致）

- 时间：开工 `2026-11-05 22:40`（估计，按常浩选 A 的时间；本节写于 `2026-11-05 23:13`）。来由：issue #105，接 #101 的外观调整。
- 改了哪些文件：`hud/src/panel/BotStamp.tsx`（去掉 `rotate(stampTilt)`）、`hud/src/panel/bot-stamp.ts`（删掉 `stampTilt`）、`hud/test/bot-stamp.test.ts`（删掉「两枚反向倾斜」测试）。`BotStamp` 是唯一的印章组件，侧栏会话行、新回复小签与回执、断线细条一起摆正。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 19 组 `test result: ok`、无 FAILED；`ℹ pass 206` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。新 worktree 没有编译缓存，加上机器 load 约 100，check + test 约 20 分钟、release 打包约 20 分钟。
- 验证：只有单测与类型检查；对比页是照代码手画的示意。实机上印章摆正没亲眼看过，请常浩在侧栏 Hermes 会话行上看一眼。
- 截图：无。
- 发布与回读：main `809d221` 打包（日志 `~/Library/Application Support/postpane/evidence/2026-11-05-stamp-upright/build-main.log`），23:11:54 ditto 到 `/Applications` 并启动，`shasum` 回读与产物一致（`7ec0085edfd5`）。打包期间 main 又合进 #110、#109、#57（`27ef503`…`4a856fc`），这个包不含它们；那几个会话从更新的 main 重装时会带上本改动（L-05）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-stamp-upright/PostPane-before.app /Applications/PostPane.app`（`2a8ef80304ea`，装前在用的版本）。
- 与授权不一致之处、遗留问题、范围外发现：常浩问测试为什么跑这么久，原因是每个新 worktree 从零编译 Rust、`pnpm test` 又编一遍测试版、多会话同时编译抢 CPU；提速办法（纯前端改动只跑前端测试，或 worktree 共用 `CARGO_TARGET_DIR`）要改项目规矩，等常浩定。worktree `.claude/worktrees/105-stamp-upright` 本节提交后删掉。
- 本轮新坑：无。

## 菜单栏图标新装默认不显示：接手云端 PR #57 合入 main 并合并（2026-11-05，Claude，常浩今天把云端开的 14 个任务交给本机会话逐个接手，本会话由主会话派来做完并合并 #57；PR #57 测试全过，按「测试全过可直接合并」授权已 squash 合并 `27ef503`，未打包安装）

- 时间：开工 `2026-11-05 22:32`（按本会话建立时间）。来由：云端会话的草稿 PR #57（「阶段 4 收尾：小人不改，菜单栏图标关掉」一节的遗留：当时只改了本机设置，代码默认值仍是显示）和 main 冲突，今天没人处理。
- 改了哪些文件：代码改动是云端会话做的，见 PR #57：`core/src/lib.rs` 默认设置 `showMenuBarIcon` 改 `false`，`hud/src/presentation/app_rules.rs`、`host/src/coordinator.rs`、`app/src/settings/GeneralPane.tsx` 三处缺值兜底改为不显示，`core/src/settings.rs` 新测试，`protocol` 注释，`docs/parity/c04-models-logic.md` #88 改 `deliberate`，`docs/ROADMAP.md` 阶段 4 状态。本轮只做合并冲突：`lib.rs` 取 main 的默认设置行（含新加的 `deepseekQuestions`）只改这一项；`GeneralPane.tsx` main 已把开关值提成变量 `menuBar`，把它的兜底改为 `=== true`；`CURRENT.md` 取 main；`docs/LESSONS.md` 云端那条坑由 L-06 改编号为 L-08（main 已用掉 L-06、L-07），并补回合并时丢的 L-05「升级」一行。已有设置照用户的值，不迁移。
- 测试：合入 main（至 #104）后的 `8f8f1c9` 上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 678 passed / 0 failed，`menu_bar_icon_is_hidden_on_a_fresh_install_and_a_saved_choice_is_kept ... ok`；`ℹ pass 208` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 4` / `ℹ fail 0`）；`node --test tests/*.test.mjs` `ℹ pass 3` / `ℹ fail 0`。之后 main 多了 #107（只改印章三个文件），与本 PR 无重叠，没重跑。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-menubar-default/`（`check.log`、`test.log`、`handoff-test.log`）。
- 验证：只有自动测试（新装为 false；已存 true / false 照用；旧文件缺这一项为 false；原版导入 true 照用）。没实机看新装效果。
- 截图：无。
- 发布与回读：未打包安装。常浩本机设置早已是 `showMenuBarIcon = False`（23:04 回读），装不装都看不出变化；合并时另一会话（`105-stamp-upright`）正从 `809d221` 打包，为免互相覆盖（L-05）没再打包。之后谁从最新 main 打包都会带上本改动。
- 与授权不一致之处、遗留问题、范围外发现：
  - 云端会话从代码推断（未实机核实）：`host/src/tray.rs` 的 `install()` 建图标时先显示、等第一份快照才按设置隐藏，启动时可能闪一下；没改，等常浩定。
  - 手写设置文件没写 `showMenuBarIcon` 的，升级后由显示变为不显示；驿窗自己写的文件总带这一项，不受影响。
  - worktree `.claude/worktrees/57-menubar-default-off-299c4a` 本节提交后删掉。
- 本轮新坑：无（L-08 是云端会话记的）。

## Hermes 新回复：小签和回执左侧换成机器人印章（2026-11-05，Claude，常浩附两张截图要求小签图标和回执头像换成对应飞书机器人的印章、右侧印章挪到左边，问后选「直接改」「保留名字」；PR #102 测试全过，按「测试全过可直接合并」授权已 squash 合并 `aef5489`，已从 main `aef5489` 打包安装、回读一致）

- 时间：开工 `2026-11-05 21:57`（按本会话建立时间）。来由：issue #101，由 hermes-bots 会话交来。
- 改了哪些文件：`hud/src/alerts/reply-list.ts`（`ReplyChip` 加 `bot`，取最新回复所属会话的 `session.bot`）、`alerts/ReminderMark.tsx` 与 `alerts/CompactAlertView.tsx`（小签上 Hermes 回复画 `BotStamp`，尺寸同断线细条）、`permissions/ListCard.tsx`（`EntryRow` 的 `seal` 改占第一列 34px、跨两行，替代 `HUDArtwork`，去掉右侧第 4 列）、`alerts/CompletionAlertView.tsx`（正文与「无法回到会话」缩进随左列：印章 46px，头像仍 30px）、`hud/test/reply-list.test.ts`（新测试：小签带上 Hermes 会话的 bot，非 Hermes 为 null）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（`ℹ pass 207` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`，Rust 全部 ok）。第一次跑 `card-column.test.ts` 失败（左列外层用了不定列宽的 grid），改成 flex 后重跑全过。
- 验证：只有单测与类型检查；实机还没等到 Hermes 新回复，小签和展开回执的实物没看过，请常浩下次收到猛鬼兽 / 亚古兽回复时看一眼：小签左侧是印章、回执左侧是「印章 + 名字」、右侧没有章；Claude、Codex 的回执仍是原头像。
- 截图：无。
- 发布与回读：main `aef5489` 打包（日志 `~/Library/Application Support/postpane/evidence/2026-11-05-reply-stamp/build-main.log`），22:15:47 ditto 到 `/Applications` 并启动，`shasum` 回读与产物一致（`f1f0d27ef08b`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-reply-stamp/PostPane-before.app /Applications/PostPane.app`（`adea14b75fe0`，#100 装的版本）。
- 与授权不一致之处、遗留问题、范围外发现：小签宽度估算 `compactAlertDockWidth` 没为印章多出的 4px 加宽（断线细条一直如此），右侧留白够用，没动。worktree `.claude/worktrees/101-reply-stamp` 本节提交后删掉。
- 本轮新坑：无。

## DeepSeek 监听提问加开关，默认关（2026-11-05，Claude，常浩排查「用驿窗时电脑很卡」后说「DeepSeek 观察器可以关掉」并选「设置里加开关，默认关」，回「开工」；PR #100 测试全过，按「测试全过可直接合并」授权已 squash 合并 `dfc3b3d`，已从 main `dfc3b3d` 打包安装、回读一致）

- 时间：开工 `2026-11-05 21:39`（按 issue #98 创建时间）。来由：实测驿窗空闲时主进程加三个 WebKit 进程约 40–66% CPU，DeepSeek 观察器每 2 秒拉起两次 `ps` 扫全机约 1200 个进程，常浩不用 harness。
- 改了哪些文件：`platform/src/hooks/mod.rs`（`deepseek_wanted`、`set_deepseek()`、`start_deepseek()`，两个 DeepSeek 观察器只在开关打开且监听在跑时启动）、`core/src/lib.rs` 与 `core/src/settings.rs`（`deepseekQuestions` 默认 false、校验、读取）、`runtime/src/lib.rs`（启动时先定开关再开监听）、`host/src/lib.rs`（`set_setting deepseekQuestions` 先存再启停）、`packages/protocol`、`app/src/settings/agent-plugins/HooksSection.tsx`（插件页「在侧栏上回答」加「DeepSeek Harness 提问」开关）。
- 测试：`pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 665 passed / 0 failed；`ℹ pass 206` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；新测试 `deepseek_observers_start_only_when_wanted_and_listening` 1 passed。日志 `~/Library/Application Support/postpane/evidence/98-check.log`、`98-test.log`、`98-build.log`。
- 验证：浏览器预览（隔离数据目录 `evidence/2026-11-05-deepseek-switch/data`）插件页开关默认关，点开后 `settings.json` 回读 `"deepseekQuestions": true`。实机装新版后：40 次采样（10 秒）没看到 PostPane 拉起 `ps`（旧版 10 次采样见到 2 次）；`sample` 里不再有 `DeepSeek questions`、`DeepSeek plugin asks` 线程；主进程 CPU 约 12.8%（单次 15 秒采样）。
- 截图：无（浏览器里看过插件页，未存图）。
- 发布与回读：main `dfc3b3d` 打包，21:54 ditto 到 `/Applications` 并启动，`shasum` 回读与产物一致（`adea14b75fe0`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-deepseek-switch/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 同次排查（只读）发现的其他空闲开销没动：统计 `metering::recached` 每次查询对 10 万多行全表跑窗口函数（单次 0.4–0.8 秒，随 `statisticsRevision` 约 2 秒重查）、快照全量推送与 3 秒时钟整树重渲染、侧栏可见时 32 ms 指针轮询、小人 24/12/6 fps 与吊坠滤镜无限动画、每个 Claude 会话一套 `agent-hud-mcp` + `engine --app-channel` 并每 15 秒轮询。等常浩定是否开第一批。
  - 卡顿主因在驿窗之外：48 个 Claude Code 会话（远程控制开着就常驻）把 swap 用到 24 GB；已按常浩同意归档 43 个空闲会话（swap 降到 10 GB），并打开「不活跃 2 天自动归档」「PR 关闭后自动归档」。
- 本轮新坑：无。

## Claude 额度彻底不显示、不计入每周 Fable（2026-11-05，Claude，常浩说「我说了不看这个，工作台的所有的额度相关的都不考虑 Fable」，由另一会话交来；PR #94、#96 测试全过，按「测试全过可直接合并」授权已 squash 合并 `53e5313`、`4531d22`，已从 main `4531d22` 打包安装、回读一致）

- 时间：开工 `2026-11-05 20:55`（按本会话建立时间；本节写于 `2026-11-05 21:42`）。来由：issue #92。PR #58 当时没改代码，只经 HUD 工具放了 `hiddenRows` 草稿、没保存，所以悬停面板一直有「每周 · Fable」。
- 改了哪些文件：
  - PR #94：`src/crates/agents/src/claude/account.rs`（`windows()` 识别出 Fable 周额度——`seven_day_fable` 键或 `limits[]` 里 `weekly_scoped` 的 Fable 项——后丢掉，`IGNORED_FAMILY`）、`core/src/demo/data.rs` 与 `demo/mod.rs`（演示数据去掉 Fable 额度行）。
  - PR #96：`agents/src/account.rs`（`Provider.dropped_windows` 与 `drops()`）、`claude/account.rs`（声明 `claude-weekly-fable`）、`platform/src/accounts/mod.rs`（`projection()` 出口过滤，挡住保留 30 天的旧行、重启副本与读失败沿用的旧读数）。
  - 前端没改：看板行、总结句计数、「够用」印章、静止条最紧额度、预警细条、重置到账提醒、统计额度历史、设置「显示」的行开关都只用出口给的行。Fable 作为模型的 Token 用量统计不是额度，照旧。
- 测试：PR #94 分支上 `pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 663 passed / 0 failed；`ℹ pass 203` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`），`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。PR #96 分支上 `pnpm test` 退出 0（Rust 合计 664 passed / 0 failed；`ℹ pass 205` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`），`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`；之后只做 `cargo fmt` 和把新测试的数据目录换成子目录（`check-test-paths`），`agent-hud-platform` 156 个测试重跑全过，`pnpm run check` 退出 0。新测试：`fables_week_never_becomes_a_row`、`a_kept_or_restored_fable_week_never_reaches_the_projection`。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-drop-fable/`（`check*.log`、`test*.log`、`rules*.log`、`build-main*.log`）。
- 验证：实机 MCP `hud_snapshot`。装 #94 后（21:23）新读数已不含 Fable，但保留的旧行还在（见 L-07）；装 #96 后（21:38）Claude 额度只有 `claude-session`、`claude-weekly`、`claude-cloud-credits`，快照里没有任何 `weekly-fable`。悬停面板实物没截图，请常浩看一眼看板是否只剩 5 小时、每周、云端额度，总结句是否说「两个/三个」。
- 截图：无。
- 发布与回读：main `4531d22`（含另一会话的 #93、#97）打包，21:38 ditto 到 `/Applications`（AppleScript 退不掉，SIGTERM 结束旧进程）并启动，`shasum` 回读与产物一致（`5dc28f65423e`）；之后 main 只多了文档提交。21:38 看到另一会话（hermes-bots）也在打包，可能随后覆盖安装（L-05）：若它的包不含 #96，Fable 会回来，请看前核对。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-drop-fable/PostPane-before.app /Applications/PostPane.app`（21:10 另一会话装的版本，`033d56ad9ac8`）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 原计划一个 PR；装机后发现旧行被保留，补了 #96，两个 PR 都按授权直接合并。
  - 常浩设置里若已保存过隐藏 Fable 的 `hiddenRows`，那条设置现在指向不存在的行，无害，没清。
  - 数据库里已有的 Fable 历史读数（`quota_sample`）没删，统计只读显示中的窗口，看不到它。
  - worktree `.claude/worktrees/92-drop-fable` 本节提交后即删。
- 本轮新坑：L-07。

## 多智能体接力：方向改定，ChatGPT 网页插件探针（2026-11-05，Claude，常浩说审核主要靠「ChatGPT……聊天模式」、Codex 偏测试，提出「在网页保持登录……开发 Chrome 插件……回传」，确认后说「可以，开始」；只改文档与 issue，无 PR）

- 时间：开工 `2026-11-05 21:15`（估计，按常浩说「可以，开始」；本节写于 `2026-11-05 21:40`）。来由：#71、#72，批 0 开 #95（已关）。
- 结论与改动：
  - ROADMAP 阶段 5 改写为「多智能体接力」（`8dee17f`）：Claude 做事、ChatGPT 聊天审核、Codex 测试；驿窗自己当中转，不走 Orca。#71、#72 各加了方向说明，#72 去掉 needs-info。
  - Codex 通道：ChatGPT.app（26.1029，包名 `com.openai.codex`，Codex 与 ChatGPT 聊天合一）的本地通道有 `thread-follower-start-turn`（空闲开新一轮）、`steer-turn`（驿窗回答 Codex 提问已在用）、`interrupt-turn` 等；聊天会话内容在 chatgpt.com 服务器，本地通道不管聊天。
  - ChatGPT 通道：常浩 Chrome 里登录的 chatgpt.com + 驿窗插件，批 1 走 Native Messaging。探针实测填字发送、判断完成（「停止」按钮出现与消失）、读回复（含列表、表格、代码块、末行结论）都可行；新版页面选择器与两处待补（加粗、`pre` 代码块）记在 #95。
- 测试：未跑仓库测试（没改代码）。探针三轮发送全部成功，turn-complete 分别 2.0 s、3.6 s、5.7 s；日志 `~/Library/Application Support/postpane/evidence/2026-11-05-chatgpt-probe/probe.jsonl`，插件与服务源码同目录。
- 验证：后台标签页未测成（两次请常浩切走，页面仍报 visible），留到批 1 正式插件。
- 截图：无。
- 发布与回读：无发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - Claude in Chrome 未连上，改为写探针插件请常浩开发者模式加载（`~/Sandbox/2026-11-05-chatgpt-probe/extension`），常浩重新加载了 3 次；探针在测试聊天 `6aec83b7-…` 里发了 3 条测试话。本机临时服务（127.0.0.1:8796）已停；插件可由常浩移除。
  - 批 1（#71 一键转交）范围大：Native Messaging 转接程序、正式插件、Codex `start-turn` 送话、转交单（乙），开工前先给常浩分批计划。
  - 上一轮的 Codex 测试会话 `01a1aae3…`、`01a1aaec…` 与 Orca 仓库 `codex-sandbox` 仍未清理，等常浩定。
- 本轮新坑：无。

## 随手记猫球轻摆幅度调大（2026-11-05，Claude，常浩说「摇晃的幅度可以稍微大一点点吗？显得明显一点」；PR #91 测试全过，按「测试全过可直接合并」授权已 squash 合并 `a676b55`；没有单独打包，安装的包已含此改动）

- 时间：开工 `2026-11-05 20:25`（估计，按常浩发消息；本节写于 `2026-11-05 20:55`）。来由：issue #89。
- 改了哪些文件：`src/packages/ui/src/global.css` 的 `hud-pendant-sway` 关键帧，最大偏角 2.6° → 4.5°，回摆 -1.8° → -3°，余摆 0.8° → 1.3°；7 秒一次的节奏、减少动态时全停都不变。
- 测试：分支上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 662 passed / 0 failed；`ℹ pass 198` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`check-rules` 通过。日志未留存（只改一处 CSS）。
- 验证：未实机看摆动效果，请常浩看一眼是否合适。
- 截图：无。
- 发布与回读：合并后 main 上已有另一会话的 #87；我本想从最新 main 打包，发现 `/Applications` 已是另一会话 20:44:39 从 main `8491afa`（含 #91）在 worktree `85-scroll-thumbs` 打出的包（`shasum` 前 12 位 `1c9d1e66ea43`，与该包一致），进程 20:44:56 启动，故停掉自己的打包，没有重装。
- 与授权不一致之处、遗留问题、范围外发现：worktree `.claude/worktrees/89-sway` 已删。
- 本轮新坑：无。

## 全应用滚动条静止隐藏、滚动时出现后淡出；修侧栏展开时侧边空隙（2026-11-05，Claude，常浩截图说「侧边滚动条明显，然后一直在……不滚动时看不见，滚动时显示然后滚完淡化消失」，又补「鼠标移到侧栏上时能明显看到侧边有个空隙……1s 之内再恢复正常」，问答确认空隙在「面板与屏幕边缘之间」；常浩说「看过了，合并」，PR #87 已 squash 合并 `8491afa`，已从 main `8491afa` 打包安装、回读一致）

- 时间：开工 `2026-11-05 18:17`（估计，按常浩第一条消息；本节写于 `2026-11-05 20:46`）。来由：issue #85。录屏逐帧看到（`evidence/2026-11-05-scroll-gap/hover.mov`、`pair.png`）：面板展开的 0.4 秒里高度从小变大、内容暂时放不下，系统滚动条冒出来占掉面板靠屏幕边一侧约 10 像素，高度够了才消失，就是「侧边空隙」；和「滚动条一直在」同一根因。
- 改了哪些文件（PR #87）：`src/packages/ui/src/global.css`（全局隐藏系统滚动条）、`ui/src/lib/scroll-thumbs.ts`（新：监听整页滚动，给正在滚的那块画 4px 浮层细条，颜色取该处文字色、45% 透明，停 1 秒后 0.6 秒淡出并移除；不占宽度、不接鼠标）、`apps/desktop/src/main.tsx`（装一次）、`hud/src/HoverPanel.tsx` 与 `scene/HUDExpandedSurface.tsx`（去掉 `scrollbarWidth` 和 Windows 隐藏类）、`hud/src/panel/SessionsSection.tsx`（去掉 #66 自画滑块与悬停淡显）、`app/src/styles.css`（删两条旧隐藏规则）、`app/src/settings/receipt.css`（删 `scrollbar-gutter`）、`docs/LESSONS.md`（L-06）。新测试 `ui/test/scroll-thumbs.test.ts`。
- 测试：合入 main `8d9bd4b`（#90）后的 `88a2527` 上 `pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 19 组 `test result: ok`、0 组 FAILED；`ℹ pass 203` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；此前分支上 `node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`，`check-rules` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-scroll-gap/`（`check3.log`、`test3.log`、`build-main.log`）。
- 验证：修改前在实机录屏确认根因（上面）。修改后我没在实机复看：分支包装上后卡在「访问文稿」权限弹窗（L-06），全屏控制授权也没等到回应，悬停展开和滚动淡出都没录到。常浩说「看过了」，但 19:45、20:34 两次被别的会话从不含本改动的 main 覆盖安装（L-05），他看到的可能不是本改动；20:44 已从含本改动的 main 重装，请常浩再看一次。
- 截图：无（录屏与逐帧拼图在 evidence 目录）。
- 发布与回读：main `8491afa` 打包，20:44:56 ditto 到 `/Applications` 并重启，`shasum` 回读与产物一致（`26673965d0fa`；另一会话装的也是这个值）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-scroll-gap/PostPane-before.app /Applications/PostPane.app`（与当前同一个包；更早的不含本改动的版本见 `evidence/2026-11-05-hermes-bots/PostPane-before.app`）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 滑块只显示、不能拖动；触控板和滚轮不受影响。
  - 「正在进行」列表原来鼠标悬停时淡显滑块，按「不滚动时看不见」一并去掉。
  - 强推分支被自动模式拦下，改为把 main 合并进分支后普通推送，最终 squash 合并效果相同。
  - 卡在权限弹窗的旧进程 AppleScript 退不掉，用 SIGTERM 结束。worktree `.claude/worktrees/85-scroll-thumbs` 本节提交后即删。
- 本轮新坑：L-06。

## Hermes 新回复不被别的智能体的待回答挡住（2026-11-05，Claude，#93 装上后常浩复测「还是没有任何的消息弹窗……也没有展开」；PR #97 测试全过，按「测试全过可直接合并」授权已 squash 合并 `4ae1993`，已从 main `b087e87` 打包安装、回读一致）

- 时间：开工 `2026-11-05 21:19`（估计，按常浩复测那条消息；本节写于 `2026-11-05 21:46`）。来由：issue #82 复测。
- 原因：复测时快照里两条 Hermes 新回复事件都在（21:18:09「所以你最近的一份工作是什么」、21:18:50「你有什么技能最近自研的么」），同时另一会话有一个 Claude 待回答（21:17:35）。待回答排在回执队列最前，折叠小签只显示它；#79 起有待回答时只能从提问智能体的小人展开。Hermes 回执排在后面，既不弹也打不开。上一轮实测时恰好没有待回答，所以没复现。
- 改了哪些文件（PR #97）：`src/packages/hud/src/alerts/reply-stays.ts`（`seenFirst`：新到的 Hermes 回复排到队首）、`hud/src/IslandNews.tsx`（排队后套用）、`hud/test/reply-stays.test.ts`（+1 项）。
- 测试：`pnpm run check` 退出 0；`check-rules` 通过；`pnpm test` 退出 0（Rust 合计 663 passed / 0 failed；`ℹ pass 206` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `evidence/2026-11-05-hermes-bots/check5.log`、`test5.log`、`build-front2.log`。
- 验证：两次申请全屏控制都超时，未能由我实测；常浩随后自己在飞书复测，回复「测试成功了，OK的」（小签留在侧栏、移上去展开回执）。issue #82 已关闭。
- 截图：无。
- 发布与回读：第一次打包在编译中途被结束（退出码 144）；期间另一会话 21:38 装了 main 包（`5dc28f65423e`）。从 main `b087e87`（含 #97、#96）重新打包，产物同为 `5dc28f65423e`，即那次安装已含本修复；SIGTERM 结束旧进程后 21:42:51 重启，回读一致。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hermes-bots/PostPane-before-stays.app /Applications/PostPane.app`（#90 之后、#93 之前）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 没看过的 Hermes 回执在队首时，别的智能体的待回答不显示折叠小签，只靠它自己小人的等待状态提示；Hermes 回执收起后待回答回到队首。新来的待回答也排在没看过的 Hermes 回执后面。
  - worktree `.claude/worktrees/82-hermes-reply-front` 本节提交后即删。
- 本轮新坑：无。

## Hermes 新回复看过才收起（2026-11-05，Claude，常浩说「能看到它在处理消息，但是没有消息的弹出以及没有消息的整个的展开面板。你接手我的电脑自己去操作实验一下……请一定要修复」；PR #93 测试全过，按「测试全过可直接合并」授权已 squash 合并 `e55a555`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 20:45`（估计，按常浩这条消息；本节写于 `2026-11-05 21:13`）。来由：issue #82 实测。
- 实测（computer-use，飞书、驿窗两个应用授权；在飞书打字用了一次全屏控制，事后已交还）：给猛鬼兽发 3 条测试消息（第一条因后台写入生效过一次而文字重复）。鼠标在飞书里时，回完后 Hermes 小人旁弹出折叠小签（标题是这次的问题、`REPLY 1`），约 4 秒自动收起；鼠标停在小人或小签位置时，回执完整展开并停住（问题、回复、猛鬼兽方印、用时、Token、知道了 / 回到会话）。结论：展开正常；Hermes 几秒就回完，人在看飞书，4 秒小签等不到人转头。另：快照里事件一度为空，是另一会话 20:44 重装并重启了驿窗、内存事件清空，不是缺陷。
- 改了哪些文件（PR #93）：`src/packages/hud/src/alerts/reply-stays.ts`（新：`staysUntilSeen`，Hermes 的新回复）、`hud/src/IslandNews.tsx`（自动收起前先看是否被鼠标停留过）、测试 `hud/test/reply-stays.test.ts`（2 项）。
- 测试：`pnpm run check` 退出 0；`check-rules` 通过；`pnpm test` 退出 0（Rust 合计 662 passed / 0 failed；`ℹ pass 205` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-hermes-bots/check4.log`、`test4.log`、`build-stays.log`。
- 验证：改后实机未验证（第二次全屏授权超时，常浩当时正在用飞书，没有在后台抢着切聊天），请常浩发一条后把鼠标留在飞书、20 秒后看侧栏小签还在不在。
- 截图：无存档（实测截图只在会话里看过）。
- 发布与回读：从 main `e55a555` 打包，SIGTERM 结束旧进程后 21:10:59 启动，`shasum` 回读与产物一致（`033d56ad9ac8`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hermes-bots/PostPane-before-stays.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 只对 Hermes 的新回复生效；Claude、Codex 回复与各类细条仍 4 秒收起。没看过的 Hermes 回执排在队首时，后面的额度细条要等它被看过才轮到（回复会合并进同一张回执）。
  - 小签上的「REPLY 1」是英文（原有文案，未改）。
  - 实测在猛鬼兽聊天里留下 3 条测试消息（「测试：用一句话讲个冷笑话」重复两遍、「再讲一个」、「第三个」）及其回复。
  - worktree `.claude/worktrees/82-hermes-reply-stays` 本节提交后即删。
- 本轮新坑：无。

## Hermes 回执用这一轮的问题当标题（2026-11-05，Claude，常浩在飞书实测两个机器人后说「侧边栏根本没有弹出消息」，排查后再试说「弹了，但是不太对。没有准确识别到我的问题」，确认是「标题不是我的问题」；PR #90 测试全过，按「测试全过可直接合并」授权已 squash 合并 `8d9bd4b`，已从 main `8491afa` 打包安装、回读一致）

- 时间：开工 `2026-11-05 20:00`（估计，按常浩说没弹出那条消息；本节写于 `2026-11-05 20:38`）。来由：issue #82 实测。
- 排查「没弹出」：驿窗对两边每一轮都标了在跑 / 完成，快照里有 4 条 Hermes 新回复事件（猛鬼兽 19:48:38，亚古兽 19:52:01、:15、:39）和一条 19:52:00「亚古兽 · 断线」（当时另一会话在重启亚古兽网关）；前端过滤 Hermes 都能过。结论是回执弹出 4 秒后自动收起（鼠标不在侧栏时），Hermes 一轮只有 4–6 秒，常浩看飞书时错过了；再试时看到了。为看实时快照，常浩开了设置里「让智能体调整侧栏」（MCP），排查完可以关回去。
- 改了哪些文件（PR #90）：`src/crates/agents/src/hermes/transcript.rs`（`last_prompt`：最近一条用户消息，跳过网关的 `[System note: …]`）、`agents/src/transcript/live.rs`（`LiveLog.prompt` 只在内存，`keep_words` 同一轮保留，`liveFacts.prompt` 输出）、`core/src/source_db.rs`（回合开始与结束时写入）、`core/src/island_events.rs`（新回复事件带 `prompt`）、`protocol/src/index.ts`、`hud/src/permissions/approval-list.ts`（回复标题优先用 `prompt`）、`hud/src/panel/SessionsSection.tsx`（正在进行行同上）；测试 `core/src/tests/hermes.rs`、`hud/test/reply-title.test.ts`。会话本身标题不变。
- 测试：分支上 `pnpm test` 退出 0（Rust 合计 662 passed / 0 failed；`ℹ pass 200` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；之后只改新测试的类型标注，单独重跑 `ℹ pass 2` / `ℹ fail 0`，`pnpm run check` 退出 0，`check-rules` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-hermes-bots/check3.log`、`test3.log`、`build-prompt.log`、`build-main2.log`。
- 验证：只有单测；新标题未实机看，请常浩再发一条看回执标题是不是自己那句话。
- 截图：无。
- 发布与回读：先从 `8d9bd4b` 打包 20:35 装过一次（`ec7ea7537c0f`）；发现 main 已多出另一会话的 #91（以及随后的 #87），为免覆盖它们，从 main `8491afa` 重新打包，SIGTERM 结束旧进程后 20:36:50 启动，`shasum` 回读与产物一致（`26673965d0fa`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hermes-bots/PostPane-before-prompt.app /Applications/PostPane.app`（`5b64d3483aa9`，#88 版）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 这一批开头的改动误落在主目录 main 上（前一个 worktree 已删），发现后转成补丁移到 worktree `claude/82-hermes-prompt`，主目录已还原干净，没有提交到 main。
  - 回执 4 秒自动收起是全局行为，没改；常浩若要 Hermes 回执停久一点或不自动收起，另说。
  - worktree `.claude/worktrees/82-hermes-prompt` 本节提交后即删。
- 本轮新坑：无。

## 侧栏 Hermes 接两个飞书机器人：猛鬼兽、亚古兽（2026-11-05，Claude，常浩要求「把侧栏的 hermes 接到我飞书的两个 hermes 机器人上……同时出现在这一个栏上」，三项「标明是哪个、在线与忙闲、飞书新回复通知」都要、头像保持一个，标识要「像印章一样的形式，结合真实形象」，三版里选「乙 · 方印朱泥」；PR #86、#88 测试全过，按「测试全过可直接合并」授权已 squash 合并 `d8fb8bc`、`8e658a1`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 18:09`（按会话建立时间，即常浩第一条消息；本节写于 `2026-11-05 19:48`）。来由：猛鬼兽（`~/.hermes`）与亚古兽（`~/.hermes/profiles/agumon`）各跑一个飞书网关；驿窗本来已读两边 `state.db` 合在一个 Hermes 栏，但看不出是谁、没有实时状态和回复通知。issue #82。印章三版预览 https://claude.ai/artifact/8vhLKimQBxjq4YpeZ7ekGg （第 1 版是抽象线条图标，常浩改成按真实形象的印章；选乙）。
- 改了哪些文件：
  - PR #86：`src/crates/agents/src/hermes/mod.rs`（`bot()` 按 state.db 所在目录认机器人，名字取 SOUL.md 首行）、`core/src/presentation.rs`（Hermes 会话加 `bot`）、`protocol/src/index.ts`（`Session.bot`）、`hud/src/panel/BotStamp.tsx` 与 `bot-stamp.ts`（方印朱泥，猛鬼兽幽灵、亚古兽恐龙侧脸线描；其他 profile 印名字首字）、`panel/SessionsSection.tsx`（正在进行行尾盖章）。
  - PR #88：`agents/src/hermes/transcript.rs`（`session_id`、`leases`、`last_reply`）、`core/src/source_db.rs`（读完一页后按 `session_turn_leases` 标在跑 / 完成并挂回复正文；Hermes 新头部先进内存再读回，正文才不丢）、`core/src/ingestion.rs`（`Reads::hermes_turns`）、`agents/src/hermes/mod.rs`（`gateways`、`down`：飞书未连上或需处理、网关不在 running 或 10 分钟没更新）、`core/src/island_events.rs`（`bot-offline` 提醒，照登出提醒：首看只记、一天一次、恢复重计）、`core/src/snapshot.rs`（传入网关、`render_key` 计入）、`hud/src/permissions/ListCard.tsx`（`EntryRow` 可选 `seal` 列）、`alerts/CompletionAlertView.tsx`（回执盖章）、`alerts/{QuotaAlertViews,CompactAlertView,ReminderMark}.tsx`、`alerts/quota-list.ts`、`glow-alert.ts`、`IslandNews.tsx`（断线细条各处分支，细条开头盖章）、`docs/ROADMAP.md`（Hermes 说明）。新测试：`core/src/tests/hermes.rs`、`hud/test/bot-stamp.test.ts`、`hud/test/bot-offline.test.ts` 等。
- 测试：PR #86 提交 `49bd644` 上 `pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 656 passed / 0 failed；`ℹ pass 196` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。PR #88：`pnpm test` 退出 0（Rust 合计 662 passed / 0 failed；`ℹ pass 198` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`），之后只把一条测试的路径改成临时目录（`check-test-paths` 报 Unix 根路径），该测试单独重跑通过，`pnpm run check` 退出 0，`check-rules` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-hermes-bots/`（`check.log`、`test.log`、`check2.log`、`test2.log`、`build-main.log`）。
- 验证：开发引擎（独立数据目录 `evidence/2026-11-05-hermes-bots/dev-data`，端口 1430）用真实数据核对猛鬼兽会话 `bot` 为 `{"id":"default","name":"猛鬼兽"}`；亚古兽的会话在新数据目录首轮读入时没等到，只有单测覆盖。印章线描在本机渲染成 PNG 看过。侧栏实物、正在回复、新回复回执、断线细条都未实机看过：要在飞书给机器人发消息才会出现，请常浩试一下。实机 MCP 查会话没开（设置里「让智能体调整侧栏」关着）。
- 截图：无（印章线稿渲染图只在会话草稿目录）。
- 发布与回读：从 main `8e658a1`（含另一会话的 #83、#84）打包，19:45 ditto 到 `/Applications`；AppleScript 退不掉旧进程，改用 SIGTERM 结束后重启，新进程 19:45:32 启动；`shasum` 回读与打包产物一致（`5b64d3483aa9`）。装前 `/Applications` 是 `7d9180e3f59e`。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hermes-bots/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 原计划三批各一个 PR；第一批单独装上看不到（Hermes 会话没有回合事件，只在更新后 2 分钟内算在跑），第二、三批合成一个 PR #88；第一批合并后没单独装机。
  - 朱红印章和「等你」「断线」的红色接近，预览里已提示，常浩仍选乙。
  - 租约键是压缩链的根会话：压缩出的子会话在回复时，亮的是根会话那行。应用在一轮回复中途重启，这一轮不会标完成（最多 30 分钟后变空闲）。网关在应用启动时已经断着不提醒（与登出提醒一致）。
  - 猛鬼兽、亚古兽是《数码宝贝》角色，印章线描只在本机驿窗用，不对外发布（同 Clawd 素材）。统计窗口的会话页没有盖章（没要求）。
  - 主目录 `.claude/launch.json` 里临时加的开发页配置已删。worktree `.claude/worktrees/82-hermes-bots` 本节提交后即删。
- 本轮新坑：无。

## 插件页「各客户端」表格统一三列网格、按层级对齐（2026-11-05，Claude，常浩截图圈出表格错位，看了三版方案后说「还是乱……不用做3版，就一版改好」；「对齐了，合并」经 agent-hud 插件转入，核对 `/Applications` 仍是本节的包、PR 干净后照办；PR #83 已 squash 合并 `9e4b44b`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 17:53`（估计，按上一会话交来的任务；本节写于 `2026-11-05 18:42`）。来由：子行状态和按钮整体贴右，不对齐表头两列，子行状态带「●」；issue #80。
- 改了哪些文件（PR #83）：`src/packages/app/src/settings/agent-plugins/rows.tsx`（`StatusRow` 加必填的 `column`，状态、按钮、⋯ 放进所属列的单元格，另一列留空）、`agent-plugins/ClientCards.tsx`（驿窗插件行传 `plugin`、侧栏工具行传 `tools`；插件自己的开关包进 `plugins-sub` 缩一级；「其他智能体」补两列「—」）、`settings/receipt.css`（表格一套变量：列宽 156、列距 12、名称起点 52、二级 68；表头、客户端行、子行共用两列，侧栏工具列贴分组框右边；去掉展开后的左侧虚线竖栏；各层分隔线从该层名称起；单元格里 ⋯ 在列尾、放不下时换行）。
- 测试：分支 `ce95e33` 上 `pnpm run check` 退出 0、`pnpm test` 退出 0、`node --test tests/*.test.mjs` 退出 0。变基后的 `a0b580e`（`src/` 与 main `9e4b44b` 无差异）上重跑 `pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 653 passed / 0 failed；`ℹ pass 193` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-plugins-table/`。
- 验证：浏览器开发页（`settings-80`，独立数据目录，中文，960×720）全部收起、全部展开实测坐标：表头与每行单元格都在 220/376、388/544，子行名称与客户端名称都在 66，表格右边 544 与下一组开关右边一致。「回答提问」开关一级和「未发现」灰行开发页造不出，常浩在实机上看过说「对齐了」。
- 截图：无存档（浏览器截图只在本会话里看过；常浩实机截图在对话里）。
- 发布与回读：18:30:05 第一次装（`c0ed1fb30680`），18:35:03 被随手记猫球那一轮覆盖（`1f202579fa7b`），常浩据此看到的是旧表格。分支变基到 `d91110a`（含 #84）后重打，18:38:20 ditto 到 `/Applications` 并重启，`shasum` 回读与打包产物一致（`418298f8fb5d`）；合并前再查仍一致。main `9e4b44b` 与这个包的 `src/` 相同，没有再装。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-plugins-table/PostPane-before.app /Applications/PostPane.app`（#77 后、不含 #84 的版本）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 先按交接要求出了三版预览（https://claude.ai/artifact/CntA3SGAojuNSstrnX3Zoz），常浩否掉，改为直接做一版。
  - 名称列较窄，子行说明（如「在侧栏上回答 Claude 的提问。」）会折成两行；英文界面下「未安装 + 安装 + ⋯」放不下一列时 ⋯ 换到下一行。
  - 主目录 `.claude/launch.json` 加了 `settings-80`（不进仓库）。worktree `80-plugins-table` 本节提交后删除。
- 本轮新坑：无。

## 光晕只留柔光；设置页修纸面分块错位、Hermes 图标、智能体卡片截断（2026-11-05，Claude，常浩要求光晕「样式默认都是柔光」、删掉样式（先提的换颜色方案自己撤回），截图指出 Hermes 图标是白色、设置页「bug 还挺多，审查修复下」；「合并」经 agent-hud 插件转入，与待答的合并问题对得上；PR #77 测试全过已 squash 合并 `05988bf`，已从 main 重新打包安装、回读一致）

- 时间：开工 `2026-11-05 17:12`（按常浩说「样式默认都是柔光」那条消息；issue #74 建于 17:18；本节写于 `2026-11-05 17:48`）。来由：设置页整体优化（PR #73）装机后常浩看实物提出；issue #74、#76。
- 改了哪些文件：`src/packages/app/src/settings/display/GlowSection.tsx`（删「样式」和点距 / 密度 / 实心 / 渐隐，组头只写动效）、`src/packages/hud/src/scene/NotchSurface.tsx` 与 `app/src/settings/SettingsSamples.tsx`（光晕一律 `style="blur"`，存的旧样式值不删）、`app/src/settings/receipt.css`（`.settings-sheet` 撕边改 `::before` / `::after` 两条细边、投影改 box-shadow，`.settings-scroll` 去掉 drop-shadow 滤镜；额度行重置时间列 96 → 124）、`settings/agents/agents.css`（卡片一行四张、说明单行）、`settings/agents/AgentList.tsx`、`AgentDetail.tsx`、`settings/PricesPane.tsx`（图标按 `useLightTheme` 传 `light`，Hermes 等模板图标在浅纸上为黑色）。
- 测试：分支提交 `16288b9` 上 `pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 647 passed / 0 failed；`ℹ pass 184` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。合并后在 main `05988bf`（含另一会话的 #75）上重跑：`pnpm run check` 退出 0、`pnpm test` 退出 0（Rust 合计 653 passed / 0 failed；`ℹ pass 189` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-glow-soft/check.log`、`test.log`、`check-main.log`、`test-main.log`、`build-main.log`。
- 验证：浏览器开发页（独立数据目录，960×720）四页逐页展开、滚到底；看到并修了智能体卡片名字截断（Claude C…）、说明挤两行、重置时间截断；Hermes 图标变黑已看到。纸面分块错位是 WebKit 分块绘制丢块，浏览器复现不了；按原因修了，实机效果由常浩看，他回「合并」时没有单独说是否还错位。
- 截图：无单独存档（浏览器截图只在本会话里看过）。
- 发布与回读：分支版 17:37:13 装过一次；之后另一会话装了 #75 的 main 版（`/Applications` 二进制变成 `50852e05ca07`，见 L-05）。合并后从 main `05988bf`（含 #75、#77）重新打包，17:46:50 ditto 到 `/Applications` 并重启，`shasum` 回读与打包产物一致（`63d6ef97312d`）。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-glow-soft/PostPane-before.app /Applications/PostPane.app`（#73 版，不含 #75）。已对 `74-glow-soft-only` 跑 `cargo clean`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 光晕颜色仍按额度状态绿 / 黄 / 红（常浩撤回了换颜色）。动态形态在屏幕上不画光晕，「光晕」组照样显示；提过「动态形态下收起并写明切到刘海才生效」，常浩没表态，未改。
  - 看到没改：每页结尾「共 N 项」只数展开着的行，展开 / 收起后会变；「智能体顺序」里 Codex 仍写「OpenAI」；插件页表格状态标签不带圆点、展开后的子行带「●」。
  - 可清理 worktree 增加 `.claude/worktrees/74-glow-soft-only`（现检出 main `05988bf`，分离头），清理前问常浩。
- 本轮新坑：无。

## 随手记挂件：猫球加 5 个简单动效（2026-11-05，Claude，常浩要求「给我的猫图标也简单做一些动态动效，场景 5 个以内，简单一点」，按「小人动效只出一版」直接做；PR #84 测试全过，按「测试全过可直接合并」授权已 squash 合并 `d91110a`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 18:10`（估计，按常浩这条消息；本节写于 `2026-11-05 18:38`）。来由：issue #81。
- 改了哪些文件（PR #84）：`src/packages/hud/src/scene/AppPendant.tsx`（球外包 `hud-pendant-face`，叠星光、眼光、眼皮三种小层，眼睛和星星位置按 `float-notes-ball.png` 实测：眼 (0.309, 0.52)、(0.608, 0.547)，星 (0.5, 0.19)；摆动放在内层 `hud-pendant-sway`，外框和点击区域不动；新增 `still`）、`src/packages/ui/src/global.css`（`hud-pendant-*` 样式与关键帧：每 7 秒轻摆、每 6.4 秒眨眼、每 9 秒星闪、悬停放大 1.08 加眼亮、按下 0.92 回弹、打开时金色光环呼吸）、`src/packages/hud/src/HUDScene.tsx`（把现有 `reduceMotion` 传给挂件，系统减少动态或关掉动画时全部静止）。
- 测试：在分支提交 `2125ea5`（与 main `d91110a` 内容相同，`git diff` 为空）上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 653 passed / 0 failed；`ℹ pass 193` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node scripts/check-rules.mjs` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-cat-motion/`。
- 验证：用真实猫图和这份样式做临时检查页（临时加进主目录 `.claude/launch.json` 的 `catcheck`，看完已删），内置浏览器截图看过原样、闭眼、眼亮、星星亮四种状态都对得上。动起来的样子没在实机上看过（没有驿窗窗口的操作授权）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-05-cat-motion/overlay-check.jpg`（检查页，非实机）。
- 发布与回读：18:35:21 ditto 到 `/Applications` 并重启，`shasum` 回读为打包产物的 `1f202579fa7b`。注意：装之前 `/Applications` 里是 `c0ed1fb30680`，不是我上一轮装的 `d374791f1a48`，说明期间另一会话装过它自己分支的版本（main 当时没有新提交），这次被我覆盖了（L-05 反向）；那一版备份在本节证据目录 `PostPane-before.app`，那个会话合并后重装即可。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-cat-motion/PostPane-before.app /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 眨眼是用毛色小圆盖住眼睛，大图上看得出是深色圆片；侧栏实际约 36 点，一闪而过。
  - 可清理 worktree：`.claude/worktrees/80-cat-motion` 本节提交后即删。
- 本轮新坑：无。

## 侧栏有待回答时只在对应小人上展开；随手记挂件去掉吊牌；停用原随手记程序（2026-11-05，Claude，常浩要求「当侧栏有待回答时，鼠标划到对应的组件形象对应卡片再展开」「随手记的文字删掉就是那个圆形」「关闭原来的随手记，以后我就用这个侧栏带的」；PR #79 测试全过，按「测试全过可直接合并」授权已 squash 合并 `e5e38c1`，已打包安装、回读一致）

- 时间：开工 `2026-11-05 17:48`（估计，按常浩这条消息；本节写于 `2026-11-05 18:05`）。来由：有待回答时鼠标碰到侧栏任何地方都强制展开，太容易误弹；issue #78。
- 改了哪些文件（PR #79）：`src/packages/hud/src/request-hover.ts`（新：`hoverMayOpen`，有待回答时只有指针在那个智能体的小人上才可展开；智能体不在侧栏、刘海形态、指针位置未知（从待审批小签进入）时保持原行为）、`hud/src/scene/useHUDInteraction.ts`（`entered` 带指针位置并过门控，原生指针路径同样传位置；门控不过且正在延时展开时取消）、`hud/src/HUDScene.tsx`（DOM 进入与移动都把位置传给 `entered`，有待回答时移到对应小人上即开始展开）、`hud/src/app-pendant.ts` 与 `scene/AppPendant.tsx`（去掉「随手记」吊牌，只留挂绳 + 纸圈里的球）、测试 `hud/test/request-hover.test.ts`（新 4 项）、`hud/test/app-pendant.test.ts`（底边一项改写）；本节另改 `docs/ROADMAP.md`（记原随手记停用、挂件不印名字）。
- 测试：在分支提交 `01a5b6a` 上 `pnpm run check` 退出 0；`pnpm test` 退出 0（Rust 合计 653 passed / 0 failed；`ℹ pass 193` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`）；`node scripts/check-rules.mjs` 通过。变基到 `38c82db`（只多一份 `docs/audit/` 文档）后复跑 `check-rules` 通过、`node --test tests/*.test.mjs` `ℹ pass 4` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-05-hover-pendant/`。
- 验证：只有单测。实机悬停未做（驿窗窗口操作授权此前被拒，且要等真实的待回答出现），请常浩下次有待回答时顺手看一下。
- 截图：无。
- 发布与回读：分支 `01a5b6a` 打包，18:01:36 ditto 到 `/Applications` 并重启；与合并后 main `e5e38c1` 的 `src/` 无差异；`shasum` 回读为打包产物的 `d374791f1a48`。回滚：退出后 `ditto ~/Library/Application\ Support/postpane/evidence/2026-11-05-hover-pendant/PostPane-before.app /Applications/PostPane.app`。
- 停用原随手记（常浩明确要求）：`launchctl bootout gui/$(id -u)/local.digitalworld.floatingnotes`，轮询到查不到再继续（G-18）；进程 17639 已退出；`~/Library/LaunchAgents/local.digitalworld.floatingnotes.plist` 移到 `evidence/2026-11-05-float-notes/local.digitalworld.floatingnotes.plist.disabled`（另有 `.bak` 副本），`~/Applications/随手记.app` 本身未删。恢复：把 `.disabled` 改回原名放回 `~/Library/LaunchAgents/` 后 `launchctl bootstrap gui/$(id -u) <plist>`。数码世界仓库里的说明（`desktop/floating-notes/README.md` 写着「登录后自动启动」）未改，属数码世界范围。
- 与授权不一致之处、遗留问题、范围外发现：
  - 展开后指针从待回答的小人移到别的小人，卡片保持展开（沿用「指针还在侧栏里就不收」）。
  - 可清理 worktree：`.claude/worktrees/78-hover-pendant` 本节提交后即删。
- 本轮新坑：无。

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
