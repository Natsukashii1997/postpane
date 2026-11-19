# 当前状态

当前阶段目标：ROADMAP 阶段 5「多智能体接力」做完并实机验收。（2026-11-08 常浩确认，digital-twin#114）

更新：2026-11-06。阶段 0 至阶段 2 全部完成；阶段 4 静止侧栏为「撕角票」、审批横条与展开框为「票签」（PR #27）、额度面板为「收据」（PR #31）、悬停小卡为「小收据」（PR #33）、新回复等通知为「回执」（PR #35），所有屏幕默认动态形态（PR #29），菜单栏图标本机关掉、新装或缺这项设置时默认也不显示（PR #57）；侧栏 Codex 小人改为常驻并补齐「花瓣身体语言」动作（PR #43），第二版打盹加强、各动作更明显（PR #47），Hermes 改为头像常驻加 9 个带颜色的细微动作（PR #45），其他小人之后各做一版；侧栏面板内容逐个梳理，面板清单见 https://claude.ai/artifact/P2u7uDGFzNy4ivv5QhDsKc ，第一个待审批卡已改成「清单卡」（PR #49），侧栏静止条不再显示金额、无额度智能体改显示 24 小时 Token（PR #51），悬停面板改成额度看板（PR #53），新回复通知卡改成「清单回执」（PR #55），额度预警卡改成「细条」（PR #62），重置到账、登出提醒与面板事件行并入细条、待审批小签显示会话标题、侧栏各处不显示面板设置里隐藏的额度行（PR #65），面板清单 17 项至此全部定完（02 悬停小卡、04 合并面板不改），「正在进行」加入 Claude 云端会话、超过 5 条可滚动（PR #63），Claude 额度看板加「云端额度」（PR #58），每周 Fable 从读取层与额度出口彻底去掉、各处不显示不计入（PR #94、#96）；后台页面换「热敏小票」分 4 批，第 1 批设置窗口外框（PR #37）、第 2 批设置四页正文与网纹框滑块（PR #39）、第 3 批统计窗口外壳与用量页（PR #41）已合并，批次见 [docs/ROADMAP.md](docs/ROADMAP.md)。设置页页头与正文对齐、「显示」页 HUD 预览改成壁纸入框与四联票、形态去掉「简约」、「正在进行」滚动条停下淡出（PR #67）。设置页整体优化：外框统一收据、内容分组框加控件右齐、面板真实预览，设置里「HUD」改叫「侧栏」（PR #73）。光晕只留柔光，设置页修纸面滚动分块错位、Hermes 图标、智能体卡片截断（PR #77）。插件页「各客户端」表格统一成一套三列网格、按层级对齐（PR #83）。侧栏 Hermes 接两个飞书机器人猛鬼兽、亚古兽：会话、回执、断线细条盖各自的方印，按回合租约判断正在回复与回复完成，网关断线出细条（PR #86、#88），回执与正在进行用这一轮的问题当标题（PR #90），Hermes 新回复看过才收起（PR #93）、不被别的智能体的待回答挡住（PR #97），新回复的小签和回执左侧换成机器人印章（PR #102）、印章摆正不再倾斜（PR #107）。侧栏悬停 Hermes 的小收据不再显示「额度 --」，改为两个机器人各自的在线 / 正在回复 / 断线、最近一次回复与今天轮数，加 24 小时 Token（PR #111）。随手记猫球轻摆幅度调大（PR #91）。DeepSeek 监听提问加开关、默认关，不再每 2 秒扫全机进程（PR #100）。侧栏「正在进行」会话可左滑露出「移除」，拿掉不想回复的会话，有新内容时自动回来（PR #110、#113）。多智能体接力批 A 已收尾（PR #121、#122、#123）。接力展开卡改浅蓝航空信纸、只留顶边航空斜纹（PR #125）；侧栏票根去掉左上角打孔圆点（PR #126）；Hermes 定时任务失败时侧栏弹一次细条（PR #115，此前交接写了已合并，实际今天才合并）；随手记猫球只在悬停时动（PR #127）；批 B「正在进行」本机 Claude 会话左滑发起审核 / 讨论（PR #128）。两指左划拉托盘时整个悬停面板不再横向错位（PR #130）。悬停面板两指左划不再横向错位（PR #130）。ChatGPT 接力处理中时侧栏 OpenAI 小人动起来（PR #131）。左滑「审核」实机已跑通：常浩点后本会话收到固定请求并调用 `relay_to_chatgpt`，ChatGPT 回信「需修改」3 条。左滑发起跟进留给会话的话、排队中 / 被拒 / 过期写在那一行（PR #132，已装机 `453575a7b643`）。侧栏 Codex 与网页 ChatGPT 改为各占一个位置，Codex 换云朵小人（PR #138），Codex 云朵有了自己的 21 段动作：待机漂移变形、打盹散成三朵、思考往上堆、跑命令下雨、找你变对话气泡（PR #143，已装机 `9c06aa25b640`）；打盹按常浩选的乙改成「满尺寸呼吸 + 鼻涕泡」、弯线闭眼、不挂 Z（PR #144，已装机 `621500c59f09`）；Codex 标记改成自己的小云 / 思考泡泡、没新消息改雾、长命令云环、盖章放慢（PR #152）；ChatGPT 打盹按常浩要求改回原版（PR #153，已装机 `3220e7b028aa`）。随手记点收起直接缩回猫球，不再留「打开便签栏」（PR #157，已装机 `62c788033f0e`）。侧栏每家智能体挂自己的小签、点开是自己的展开卡，常浩选甲「各挂全签」（PR #163，已装机 `c2c76c0b5e63`）。左滑发起复审返修收尾（PR #164）。接力自动往返上线（#72，PR #168，已装机 `b0bb150f84cf`）：需修改未满 2 轮自动转回 Claude、通过自动结束、到上限 / 无结论 / 送话失败两次 / 超时交还常浩，重启先暂停。ChatGPT 第 2 轮复审左滑发起的 5 条，常浩说「现在返修」：按编号归因、记录落盘、从领取起计时、状态不明（PR #170，已装机 `98ea78960937`），第 3 轮已交回同一个审核会话（`h1a1b076a94400`，#72 之前的记录，不自动往返，回信由常浩定）。#173 自动转回失败改排队已装机 `4638968249ee`；L4–L6 证据整理进 `docs/evidence/`，给第二人的说明是 `docs/安装与使用.md`（见下节索引表）。唯一下一步：L-14 排队等下一单自然触发后，核对 `handoffs.json` 补进 L6 文档（常浩定，C 单不再手动验证）；补 L4 同事使用材料；约第二人照说明复现；常浩还要在 Chrome 扩展程序页重新加载驿窗插件，下一轮 ChatGPT 处理时看 OpenAI 小人动；接力批 C 传信动效按 2026-11-07 定稿「纸飞机 + 票根印章」做完（#171）；后台第 4 批「统计会话」与其他小人各做一版仍待做。悬停面板：随手记猫球不再弹面板、「等待更新」的额度按占用变红、Hermes 标题图标改黑色女孩、去掉 Hermes 与 OpenAI 的「近 24 小时 Token」（PR #135，已随 #138 装机）；Hermes 区按常浩选定的丙「各管一摊」做完：猛鬼兽定时任务表、亚古兽最近被问、在岗 / 断线圆章（PR #139，已从 main `0677fe1` 打包装机，回读一致）。侧栏小收据、单家面板、整张看板在同一块屏并存，常浩选乙「停久看全」：悬停一格 0.4 秒出小收据，同一格停满 1.2 秒展开成整张看板并滚到这一家（PR #158 起小收据出现后再等 1.5 秒，即悬停 1.9 秒才展开），点一格出单家面板，「按智能体分开」开关去掉（PR #141，已装机 `54e5f63c063f`，实机鼠标操作待常浩试）。小收据底边等待线按常浩选的甲改成从中间展开、两端羽化（PR #149，已装机 `97e641b60d45`）。ChatGPT 读取全部会话：常浩自己在 Chrome 里开的「对话」和驿窗发起的「审核」分开，侧栏按常浩选的「一格两栏 · 两联 · 旧信纸」显示，所有审核纸统一成旧信纸（PR #150，已装机 `966e3ef93773`；常浩要在 Chrome 扩展程序页重新加载驿窗插件 0.2.0 后实测）。

## 长 brief 不再被 ChatGPT 转成附件，回信能收回（#429）（2026-11-19，Claude，新规则冒烟中发现；常浩回「开 issue 并修」「按方案改」，看 Fable 5.2 评估清单后回「按清单做」（经上级会话转达）；已提交、PR 见下、未发布）

- 时间：开工 `2026-11-19 20:41`（`date '+%F %H:%M'` 记录）。来由：#429。#348 解冲突 L1 复核（接力 `h1a1f38f8b6200`）的 brief 11516 个字符，被 ChatGPT 转成附件「粘贴的文本.txt」：页面上没有用户消息气泡、也没有原文，插件不报 `turn complete`，回信 9 分钟就到了，驿窗却报「30 分钟没回信」（L-59）。
- 改了哪些文件：
  - 常浩要求的：
    - `src/apps/chrome-extension/page.js`：`pieces()` 按行切成每段不超过 6000 字（单行超长在行内切，不切开 emoji 这类双码元字符）；`paste()` 逐段贴到末尾，每段等输入框（去空白）净增长到这段的全部可见字才贴下一段（只有空白的一段并进下一段，不在 `\r\n` 中间切，#435 审查 P1-01）；贴完要求输入框去空白后与原文是同样的字；`holds()` 加下限，退回整段 `insertText` 时输入框与原文（去空白）相差超过 40 字就不算装下；`submit()` 在贴之前输入框空着、发送键却亮着（上次留下的附件）就报 `composer-mismatch` 不发，贴完没装下而发送键亮着也报 `composer-mismatch` 不发。
    - `src/apps/chrome-extension/test/page.test.mjs`：仿 ChatGPT 的输入框替身（单次超上限或第 n 段起转附件、可预置残留附件），新增 5 条：长文分段（拼回等于原文、除末段外在换行处切开、每段不超 6000、无附件）、单行超长行内切、不切开 emoji、第 2 段才转附件不发、已有残留附件不发；原「装不下不发」1 条。
    - 文档：`docs/chatgpt-channel.md` 原因码加 `composer-mismatch` 及重试清不掉附件、「驿窗这一端」加分段粘贴与阈值；`docs/LESSONS.md` 新增 L-59。
  - 我顺手改的：无（Fable 评估里建议进本 PR 的几项都经常浩「按清单做」确认，算要求的）。
  - **改变了已有行为的**：① 送话超过 6000 字时分几次粘贴（原来一次贴完、超过阈值由 ChatGPT 转成附件，#99 起的注释写着这是有意的；没找到常浩定过它的记录）；② 有一段没贴全、贴完字不同（或兜底时相差超过 40 字）、发送键却亮着时不发，报 `composer-mismatch`（原来照样发出）；③ 贴之前输入框空着、发送键却亮着时不发（原来会带着残留附件一起发出）。插件收到 `composer-mismatch` 仍按原逻辑切前台重试一次，留着附件时两次都失败，交常浩到页面上移除。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」：cargo 合计 `1058 passed` / `0 failed`，前端 `ℹ pass 486` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、Chrome 插件 `ℹ pass 43`（main 32 + 本 PR 新增 11）、注入脚本 `ℹ pass 11`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`。以上是 ChatGPT 第 1 轮审查返修后、合并 main（含 #430、#437）的结果（`check-6.txt`、`test-6.txt`、`skeleton-6.txt`）；之前几次（cargo 1051 / 1058，Chrome 插件 34 / 38）同样全过。返修新增 5 条，其中 4 条先红：`red-round3.txt`、`red-round3b.txt`（另 1 条「旧稿 + 残留附件」在返修前已成立）。实现前先红：`red-before.txt`（长文分段、装不下不发 2 条）、`red-round2.txt`（不切开 emoji、残留附件 2 条；另 2 条在第一版实现下已成立）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-429-long-brief/`（`check-2.txt`、`test-2.txt`、`skeleton-2.txt`）。
- 验证：Chrome 里 ChatGPT 临时对话，只粘贴不发送：① 单次粘贴 2000 / 4000 / 6000 / 8000 字留为正文，10000 字转附件；② 分两次各 7000 字，输入框 13534 字符、无附件；③ 用修复同款切分粘贴约 1.46 万字合成 brief（5999 / 5993 / 4681 三段，第一个切点落在 ```` ```diff ```` 块里），无附件、输入框原样保留（`data-prompt-literal-paste`，不画代码块）、去空白后与原文相等、逐行 369 / 369 一致。④ 返修后（#435 审查 P2-01）：19007 字文本含一条 13000 字的单行（中文 + emoji + ZWJ 组合 emoji，emoji 正好跨第 6000 字）、`\r\n` 和切点处的空行，切成 6000 / 6000 / 1002 / 6000 / 5 五段，每段都净增长到全部可见字，去空白后与原文相等，emoji 930 / 930、ZWJ 组合 928 / 928、替换字符 0、无附件。只在前台标签页验证。根因证据：页面 `[data-user-message-bubble]` 为 0，用户单元正文只有文件名（`evidence/2026-11-19-golive-smoke/root-cause-attachment.md`）。Fable 5.2 High 只读评估过整体方案（结论：方向对，补真实页面验证和两处小改，均已做）。ChatGPT L1 审查（接力 `h1a1f45adbcf00`）第 1 轮返修：P1-01 分段粘贴不能保证内容完整（空白段被跳过、逐段只看变长、八成下限偏松）已修；P2-01 超长单行与 CRLF 真实页面验证已补（上面 ④）。**未验证**：装机后用超过 1 万字的真实 brief 走一张接力、回信自动转回（插件要常浩在 Chrome 扩展程序页重新加载才生效）；后台标签页里的分段粘贴。
- 截图：无界面改动，无。
- 发布与回读：未发布。Chrome 插件改动不经驿窗安装包生效，合并后要在 Chrome「扩展程序」页重新加载驿窗插件。
- 与授权不一致之处、遗留问题、范围外发现：
  - 审核门新规则冒烟（接力 `h1a1f38f8b6200`，#348 解冲突 L1 复核）结果：送出跑通（工具说明是新规则，账本 `limit` 5、`risk` L1、`head` 5ad81cb、审查链 `r1a1f38f8b6200` 都对，30 分钟没回信按规则停下并通知到发起会话），ChatGPT 判通过（受审版本 5ad81cb7a56fa94b2869e948ee0a944e64161bc4，未决 P0 0、P1 0，审查出口「通过」，台账只有 P2-01「Format 正向归属缺直接测试」范围外转单 → #434），但回信当时没被驿窗收到：brief 以附件形式进了页面，插件没报 `turn complete`（`turns.jsonl` 这个会话只有两条 `start`），19:57 被判「30 分钟没回信」。#437（按提问编号认领，含附件兜底）装机、插件重新加载后，23:04:48 驿窗自动认领（`turns.jsonl` `taken`），记第 1 轮、`verdict: pass`，自动转回发起会话（`back` 带 `auto`），回读 PR #348 head 仍是 5ad81cb 后按通过自动结束（`closed`），回信全文存 `replies/h1a1f38f8b6200-01-7b876d5c.md`。至此新规则冒烟各项都实机验到（卡上「第 1 轮 / 上限 5」的显示没截图看）。PR #348 先后两条评论：手动读到时写「复核通过」，认领后补更正。
  - 旧接力 `h1a1ed39518503` 第 2 轮回信被判 `unmatched` 约 470 次，11-19 20:49 被自动结束，digital-twin PR #210 第 2 轮回信没转回发起会话（#432）。
  - 与 #437 的关系：#437 从接收侧认附件形式的提问、按提问编号认领，本 PR 从发送侧让送审保持正文（ChatGPT 审的是正文，页面上也看得到原文）；两者互补，合并 main 时 `submit()` 两边都保留（先分段粘贴和拒发，送出后取提问编号）。#431 的「提问读不到」一部分已由 #437 覆盖，剩下的范围要在 #431 里重新核对。
  - 另开：#431 接收侧「提问读不到」提示与提问指纹、#433 插件等待按真实时间计与重读退避、#434 原因码人话与 Format 正向归属测试（#348 复核 P2-01）。
- 本轮新坑：L-59
- skill 进化：无。

## 接力回信按 ChatGPT 提问编号认领，长送审变附件也认得（#410 甲）（2026-11-19，Claude，常浩选「甲：按编号认」、回「按计划开工」（含救旧单的附件兜底）；已提交、PR 见下、未发布）

- 时间：开工 `2026-11-19 22:05`（本会话记录推算，未用 `date` 记）。来由：S1 上线后 19:27「#348 解冲突定向复核」仍「30 分钟没回信」；只读打开对话，ChatGPT 9 分钟就答完了，但长送审被 ChatGPT 变成附件「粘贴的文本 (1)(1).txt」，页面没有提问气泡，插件从不上报、驿窗也对不上原文。17:55 的 0B-4c-2 同样只有「开始答」、没有「答完」。
- 改了哪些文件：
  - 常浩要求的：
    - 插件（0.2.3）：`page.js` 提问格子有自己的文字（附件名）也算提问，新增 `lastPromptId`（读格子的 `data-chatgpt-search-message-ids`），`submit` 送出后最多等 3 秒回报新提问编号；`content.js` 开始、答完、状态都带 `promptId`；`background.js` 新开会话把编号带回。
    - 驿窗：步骤加 `askedId`（`platform/.../handoffs/asked.rs`：`Book::asked_as`、`Handoff::last_asked`）；送审、新开会话、补格式、迟到的 `sent` / `opened` 都记编号；`Lines::open/send` 回传编号，通道 `open_as/send_as` 透传；`handoff/belongs.rs` 有编号就只比编号，缺编号才比文字，并加附件兜底（只有「粘贴的文本 … .txt」的提问、送审长到被截断时算）。
    - 文档：`docs/chatgpt-channel.md` 消息表加 `promptId`、写明编号怎么读和认领规则；`docs/LESSONS.md` L-51 补「长送审变附件」。
  - 我顺手改的：
    - `handoff.rs` 超行数上限，把 `asking()`、`went_in()` 原样挪到新文件 `handoff/asking.rs`。
    - `background.js` 新开会话读标签页状态时，状态为空不再报错（原写法遇到空回应会抛错）。
    - 平台通道测试 `tests_unix.rs` 两处断言改成同时核对 `promptId` 透传。
  - **改变了已有行为**（开工前已列出、常浩确认）：认领从比对提问文字改为比对编号（缺编号时照旧比文字）；只有附件的提问以前不算提问，现在算；缺编号的长送审遇到附件提问也认。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」，cargo 合计 `1058 passed`，前端 `ℹ pass 484` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、Chrome 插件 `ℹ pass 32`、注入脚本 `ℹ pass 11`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`。新增：插件 4 条（附件提问、最新提问编号、`submit` 回报编号、内容脚本上报带编号），在旧插件代码上 4 条失败（`ext-red.log`）；驿窗 6 条（`handoff/tests/asked_id.rs`：按编号认、同样文字编号不同不认、下一轮只认自己的编号、迟到确认补记编号、附件兜底只对长送审、回放 19:27 #348 那单），关掉新规则时 6 条全失败（`host-red.log`）；平台 1 条（`asked.rs`）。变基到 main `de849fa`（#436）后三条重跑：`pnpm run check` 退出码 0，`pnpm test` 6 套 0 失败（cargo `1058 passed`，前端 `ℹ pass 486` / `ℹ fail 0`，Chrome 插件 `ℹ pass 32`），`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（`*-2.log`）。日志 `~/Library/Application Support/postpane/evidence/410-relay-turn/`。
- 验证：Claude in Chrome 只读打开真实对话（自己的标签页，读完关掉，没触发认领）：4 轮的已结束接力 `6afe920b…` 刷新前后编号一致、同轮提问与回答共用前缀、回答编号与账本一致；卡住的 `6afedd1d…` 附件提问格子有编号 `6482f36e…`、文件名在普通文字里。送出时新提问是否马上带编号，要装机后用下一次真实送审确认。
- 截图：无界面改动。
- 发布与回读：PR #437 合并为 main `a99af02`（变基到 `de849fa` 后合并，代码树与测过的 `9d71d1c` 一致）。装前按 L-55 备份 `chatgpt/`（`evidence/410-relay-turn/chatgpt-before/`，`handoffs.json` `cmp` 一致）。`install.sh 410-relay-turn --takeover`（原装的是 #430 `fold-measure` 的包 `51c89b1dbbce`，其 PR #436 已合进 main）：产物 `f125b9dbbacb` / 已装 `f125b9dbbacb`，签名证书一致；冒烟侧栏在动，装前装后差异只在小人与 Hermes 回复小签（隔 2 秒那对差得多，是 Claude 悬停面板开着、内容在变）。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-19-410-relay-turn/PostPane-51c89b1dbbce.app" /Applications/PostPane.app; open /Applications/PostPane.app`。常浩在 Chrome 重新加载主目录那份插件（0.2.3）。
- 装后回读：卡住的 `h1a1f38f8b6200`（#348 解冲突定向复核）在 23:04:48 被认领（`turns.jsonl` 该会话第一次出现 `complete taken`，此前 3 个多小时只有 `start`），同一秒自动转回发起会话（`back` 带 `auto`，送达「已领取」），回信结论「通过」，自动结束。`h1a1f33b25e300`（0B-4c-2）21:15 已被结束，没救。还没验证：新插件送出时能否马上读到提问编号、记上 `askedId`，要等下一次真实送审。
- 与授权不一致之处、遗留问题、范围外发现：
  - 卡住的两单（`h1a1f38f8b6200` #348 复核、`h1a1f33b25e300` 0B-4c-2）装好、插件重新加载后，靠重读和附件兜底认领，再按 S1 转回各自会话。
  - 附件兜底的已知风险：缺编号的长送审之后，常浩自己在同一审核对话里贴长文本被变成附件时，可能被当成审核回信（很少见）。
- 本轮新坑：无（补在 L-51）

## 展开「其余 n 条」后卡片跟着长高（#430）（2026-11-19，Claude，常浩截图说 ChatGPT 卡展开后快 10 条、框还是很短在里面滚，要多任务时展开卡和 Claude 卡一样长宽；看分批计划后回「开始」，看完 PR #436 后回「合并装机」；已提交、已 squash 合并、已发布 `51c89b1dbbce` 回读通过）

- 时间：开工 `2026-11-19 21:16`（issue #430 建立时间；上一会话查根因、写修复时没用 `date` 记，本会话收尾 `2026-11-19 21:36` 起）。来由：#430。宽度四家本来都是 470（#368），问题在高度：侧栏每个面板画两份，框高按隐藏的测高副本定，「展开其余 n 条」的开合是各组件自己的 `useState`，只展开了看得见的那份，测高副本一直折着（L-58）。
- 改了哪些文件：
  - 常浩要求的：
    - `hud/src/panel/fold-store.ts`（新）：`foldStore()` 建一份两边共读的开合状态（`useSyncExternalStore`，带服务端快照），`cardFolds` 是展开卡用的那份，可 `reset()`。
    - `panel/WorkSections.tsx`：`Folded` 改用 `cardFolds.use(foldKey)`，键是 `<哪家>:waiting` / `<哪家>:running`；`panel/SourceSessions.tsx` 传 `place={focusVendor}`。
    - `permissions/ApprovalContent.tsx`（提问 / 审批列表，键 `approvals`）、`alerts/CompletionAlertView.tsx`（回复列表，键 `replies`）同样改用 `cardFolds`；`permissions/FoldButton.tsx` 再导出 `cardFolds`。
    - `scene/close-with-sidebar.ts`（新）：`useCloseWithSidebar(shown)` 侧栏收起时关接力卡、`cardFolds.reset()`，替换 `HUDScene.tsx` 原来只关接力卡的那段 effect。
  - 我顺手改的：
    - `panel/PlaceRows.tsx`：看板「在跑」超过 3 条的折叠也改用 `foldStore()` 的另一份（不随侧栏收起复位），和展开卡共用一套实现，行为不变。
    - `src/tooling/file-size-baseline.json`：`HUDScene.tsx` 变短，收紧 300 行棘轮基线。
    - `docs/LESSONS.md` 加 L-58。
  - **改变了已有行为的**：展开「其余 n 条」后框跟着长高（最多屏幕高 - 80，屏幕放得下就不在框里滚），ChatGPT、Claude 等各家展开卡的「等待处理」「正在进行」、提问列表、回复列表都算；展开状态在侧栏收起时折回，下次打开仍默认 4 / 6 条（#374、#382 不变）。宽度 470、折叠按钮样子、看板折叠都不变。
- 测试：`pnpm run check` 退出码 0（第一次提示 `HUDScene.tsx` 比基线短，`--update` 后基线收紧）；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」：cargo 合计 `1051 passed` / `0 failed`，前端 `ℹ pass 486` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、Chrome 插件 `ℹ pass 28`、注入脚本 `ℹ pass 11`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（交接写好前那次）。新测试 `test/fold-store.test.ts`，实现前先红（`red.txt`：`WorkSections.tsx` 不含 `cardFolds.use(foldKey)`）；`unified-card.test.ts` 两条断言改成新写法。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-430-fold-measure/`（`check.txt`、`pnpm-test.txt`、`node-tests.txt`）。
- 验证：场景预览台（本 worktree，127.0.0.1:1491，`?still`，视口 1440×1600）：`chatgpt-nine-relays` 点 ChatGPT 票根，展开卡 666，点「展开其余 3 条」后测高副本与可见框都到 849，等待处理 7 条全显示；`claude-many-asks` 点 Claude 票根，展开卡 790，点「展开其余 4 条」后都到 1089，8 条全显示。视口 1440×900 时 Claude 卡展开前已顶到上限 764，展开后测高 1089、可见框仍 764、超出部分卡内滚动（屏幕放不下，符合上限）。上一会话改前对照：展开后 ChatGPT 测高仍 665、Claude 仍 790。记录见 `preview-measure.md`。**未验证**：侧栏收起再打开后折回（只有 `fold-store.test.ts` 守着，没在预览台点过）；实机悬停面板里点展开（L-09），留给常浩。
- 截图：同一证据目录 `before-chatgpt-expanded.jpg`、`after-chatgpt-expanded.jpg`（上一会话）、`after-chatgpt-nine-relays-1600.jpg`、`after-claude-many-asks-1600.jpg`。
- 发布与回读：常浩回「合并装机」后从本分支打包（开工后 main 没有新提交，代码与合并后一致）。`install.sh 430-fold-measure` 第一次停下：装着的是 #427 worktree 的包（L-05）；核实 #428 已合并为 `8afa990`、本分支含它后加 `--takeover`。装前 `dd310b3d79ed`（已备份），22:27:10 退出并启动，产物 `51c89b1dbbce` / 已装 `51c89b1dbbce`，签名 leaf `H"b773068e`；冒烟：侧栏在动，装前装后 0.06% 像素不同，落在侧栏区；整屏截图 `after-install-screen.png` 没有「想访问文稿」弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-19-430-fold-measure/PostPane-dd310b3d79ed.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 范围外，未核实：`CompletionAlertView` 里「点开的那条回复」`chosen` 也是本地状态，可能同类问题，没顺手扩。
  - ADR-0001 第 5 条「多条给列表」与 #359 不一致，之前已报告，没改。
- 本轮新坑：L-58
- skill 进化：无。


## ChatGPT 面板：接力并进「等待处理 / 正在进行」，小收据同一份名单，接力卡能切单（#427）（2026-11-19，Claude，常浩看三版预览 https://claude.ai/artifact/KmRLtP44LmBG37UbfK1zVi 后选「甲」，看改动确认（改 #368「审核纸条和闲着的接力行不再列，接力只从纸飞机进」）后回「改，按计划开工」，看完 PR #428 后回「合并装机」；已提交、已 squash 合并、已发布 `dd310b3d79ed` 回读通过）

- 时间：开工 `2026-11-19 20:15`（`date '+%F %H:%M'` 记录）。来由：#427。常浩说小卡片能看到正在审什么，停 1.5 秒展开成大卡片后接力全不见，只能经纸飞机进最近一单，八九条接力不知道怎么切。根子：同一批接力三层三套数法（小收据丢掉 2 小时没动静的，纸飞机数全部，大卡不列），展开反而变少，接力卡没有去别的单子的路，「等你 · 在跑」不算接力。
- 改了哪些文件：
  - 常浩要求的：`hud/src/relay-groups.ts`（新，一份名单三组排法：要你管 → 在动 → 静着）；`chatgpt-desk.ts`、`scene/DeskLines.tsx`、`scene/peek-size.ts`（小收据全列、最多 4 条加「另 n 条」、标签「开着 n 条 · 要你管 n」）；`workspace.ts`（ChatGPT「等你 · 在跑」按接力分组计）；`panel/SourceSessions.tsx`、`panel/WorkSections.tsx`、`panel/RelayRows.tsx`（新，ChatGPT 大卡两段里的接力行）；`alerts/RelaySwitch.tsx`（新，接力卡上一单 / 下一单）、`alerts/HandoffCard.tsx`、`alerts/RelayToggle.tsx`（纸飞机打开时带上名单）；场景 `chatgpt-nine-relays`。
  - 我顺手改的：`panel/RelayTag.tsx`（新，会话行「接力 n/m」小签抽成共用，样子不变）；为 300 行棘轮拆出 `alerts/handoff-store.ts`、`scene/desk-words.ts`，`handoff-doer.ts` 加 `chatgptTarget`，基线收紧；删掉没人用的 `quietRelays` 及其测试；`GLOSSARY.md` 加「要你管 / 在动 / 静着」、补「内层接力卡」入口。
  - **改变了已有行为的**：ChatGPT 大卡出现接力行；小收据不再藏 2 小时没动静的接力、改按三组排、超过 4 条折起；小收据 ChatGPT「等你 · 在跑」算上接力（场景 `mixed` 从 0 · 1 变 0 · 2）；接力卡多一行切单。票根（待你看 / 在答）、1.5 秒展开、纸飞机样子和「进最近一单 + 红数字」、Claude / Codex 卡都不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」：cargo 合计 `1051 passed` / `0 failed`，前端 `ℹ pass 484` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、Chrome 插件 `ℹ pass 28`、注入脚本 `ℹ pass 11`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（交接写好前那次）。新测试 `relay-groups.test.ts` 8 条，`chatgpt-desk`、`board-sessions` 改写预期；实现前先红（`red-relay-groups.txt`、`red-chatgpt-desk.txt`、`red-peek-work.txt`、`red-card.txt`）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-427-relay-ia/`。
- 验证：场景预览台（本 worktree，127.0.0.1:1487）`chatgpt-nine-relays`：悬停 ChatGPT 票根出小收据「等你 5 · 在跑 3 · 接力 9」「开着 9 条 · 要你管 5」4 行加「另 5 条」；1.5 秒后长成大卡「等待处理 · 7」（5 单接力在前，4 条后「展开其余 3 条」）、「正在进行 · 4」；点 #348 那行进接力卡「在动 · 第 6 单，共 9 单」，下一单到第 7、上一单两次到第 5「要你管」，纸飞机按下回到大卡。改前对照（主目录预览台 1488）：`chatgpt-reviews` 的 Codex 卡「接力 1/5」小签前后一样。
- 截图：同一证据目录 `peek-nine.jpg`、`card-nine.jpg`、`relay-card-switch.jpg`、`codex-card-tag.jpg`、`before-codex-card-tag.jpg`、`before-chatgpt-card.jpg`。
- 发布与回读：常浩回「合并装机」后从本分支打包（开工后 main 没有新提交，代码与合并后一致）。`install.sh 427-relay-ia` 第一次停下：装着的是 #424 worktree 的包（L-05）；核实 #426 已合并、本分支已含 `d73c9ad` 后加 `--takeover`。装前 `6a849670c973`（已备份），20:37:43 退出并启动，产物 `dd310b3d79ed` / 已装 `dd310b3d79ed`，签名 leaf `H"b773068e`；冒烟：侧栏在动，装前装后 0.07% 像素不同，落在票根区。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-19-427-relay-ia/PostPane-6a849670c973.app" /Applications/PostPane.app; open /Applications/PostPane.app`。**未验证**：整屏有没有「想访问文稿」弹窗（冒烟截图只截侧栏，L-06）；实机侧栏里悬停 ChatGPT、点接力行、切单（L-09），留给常浩。
- 与授权不一致之处、遗留问题、范围外发现：ADR-0001 第 5 条仍写纸飞机「多条给列表」，与 #359 定的「不改成列表」不一致，没改；驿窗还没有 `docs/DECIDED.md`；悬停面板里的真实点击留给常浩（L-09）。
- 本轮新坑：无
- skill 进化：无。

## Hermes 待处理 / 正在进行 / 回执行点 ↗ 跳回飞书聊天（#424）（2026-11-19，Claude，常浩截图说「hermes 这个侧栏页面又无法跳转到飞书会话了」，看排查后回「按 A 开工」；已提交、PR 见下、已发布 `6a849670c973` 回读通过）

- 时间：开工 `2026-11-19 18:16`（`date '+%F %H:%M'` 记录）。来由：#424。两处原因：① #371 起有待处理时展开卡不画额度区块，Hermes 唯一能跳飞书的「最近被问」画在那个位置，一起不见了；待处理 / 正在进行 / 回执里的 Hermes 会话 `navigationTarget` 一直为空（#196 遗留），↗ 是暗的（L-56）。② 亚古兽 11-19 的私聊 `user_id` 记成 `e9cgcf77`，只比用户 id 认本人，`chatId` 为空（L-57）。
- 改了哪些文件：
  - 常浩要求的（方案 A）：
    - `src/crates/agents/src/hermes/chats.rs`（新）：`Gateway::session_chats()` 给出每个会话在飞书的去向（按 `hermes:…` 会话 id）：飞书会话 → 它的聊天（同事私聊不给）；定时任务的一次运行（`cron_<任务 id>_<时间>`）→ 该任务 `jobs.json` 的 `deliver: feishu:oc_…`；工具 / 一次性会话不给。`HomeChannel::opens` 认本人私聊：用户 id 相同，或聊天 id 就是 `home_channel.chat_id`，满足一条即可。`asks_with_chats`、`places` 一并搬来。
    - `src/crates/agents/src/hermes/mod.rs`：`CronJob` 加 `delivers_to`；`owner()` 换成 `home_channel()`（同时读 `user_id`、`chat_id`）。
    - `src/crates/core/src/presentation/hermes.rs`（新）：`stamp_hermes` 盖机器人章（原样搬来），并按 `session_chats` 给 Hermes 会话填 `navigationTarget`（`feishu-chat`）；每个 `Presentation` 只在第一个 Hermes 会话时读一次（`OnceCell`）。`presentation.rs` 改调它。
    - 前端不改：会话行和回执的 ↗ 本来就是有跳转目标才亮，点了走 `open_session` → 外壳 `feishu://` 打开飞书（#198）。
  - 我顺手改的：两处新增让 `hermes/transcript.rs`、`presentation.rs` 超出 300 行棘轮，按接缝拆成上面两个新文件；`core/src/island_events.rs` 两处测试里手写的 `CronJob` 补 `delivers_to: None`。
  - **改变了已有行为的**：Hermes 飞书会话和定时任务会话在「等待处理」「正在进行」、回执里的 ↗ 从暗着点不了，变成打开飞书对应聊天；亚古兽「最近被问」里用户 id 换了格式的本人私聊也能点了。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」：cargo 合计 `1051 passed` / `0 failed`（原 1049 + 新增 2），前端 `ℹ pass 476` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、Chrome 插件 `ℹ pass 28`、注入脚本 `ℹ pass 11`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（交接写好后重跑见 `node-test-2.log`）。新增 `a_session_opens_its_feishu_chat_or_where_its_scheduled_task_delivers`（agents）、`a_hermes_session_goes_back_to_its_feishu_chat`（core），`an_ask_opens_its_group_or_the_owners_own_private_chat` 加 `alias` 一行；实现前三处都先红（`red-agents.log`：`left: []`、`("alias", None)`；`red-core.log`：`left: Null`）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-424-hermes-jump/`（`check.log`、`test.log`、`node-test.log`、`build.log`、`install.log`）。
- 验证：装机后用 MCP 读实机会话（18:44:25）：亚古兽「确认沟通无误」（`user_id` `e9cgcf77`）`navigationTarget` = `feishu-chat` `oc_aa36…`；猛鬼兽「询问回答速度及变慢原因」= `oc_ce2c…`；亚古兽定时任务 `cron_da4fac30ca49_…`（需求反馈）= `oc_aa36…`；猛鬼兽日报 #6、#7（工具会话）仍为空。**未验证**：实机侧栏里点 ↗ 飞书是否打开到对的聊天（悬停面板电脑控制点不动，L-09），留给常浩点一次。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-19-424-hermes-jump/`：`after-install-screen.png`（无文稿权限弹窗）、`smoke-*.png`（装前装后差异落在装前开着的 Claude 展开卡，侧栏一致；本轮没有界面代码改动）。
- 发布与回读：`install.sh 424-hermes-jump`：装前 `b915fa96a368`（S1 那版，已备份），18:44:01 退出并启动，产物 `6a849670c973` / 已装 `6a849670c973`，签名 leaf `H"b773068e`；`install.sh check` 一致。包从本分支打，开工后 main 只多了 `bc131a8`（只改 CURRENT.md），代码与合并后一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-19-424-hermes-jump/PostPane-b915fa96a368.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 工具 / 一次性会话（如数字分身调起的「你是猛鬼兽…」、日报写稿）没有对应的飞书聊天，↗ 照旧不亮。
  - 话题群仍只能跳到群（#196 遗留，未动）。
  - 范围外：术语表写 Hermes「不进『等你』」，实际有新回复时 Hermes 会话会进「等待处理」（截图里 4 条），本轮没动，没核实哪边是现行定稿。
  - Hermes 为什么把私聊用户记成 `e9cgcf77` 未核实。
- 本轮新坑：L-56、L-57
- skill 进化：无。

## S1 回信认领了就一定送回发起会话（#410）（2026-11-19，Claude，常浩选「S1 按推荐做」、确认三批计划，本会话回「按计划开工」（回章按推荐：已转回、停着的都盖）；已提交、PR 见下、未发布）

- 时间：开工 `2026-11-19 17:28`（本会话创建时间；第 1 批前半由上一会话做到 `f056723`）。来由：Fable 5.2 评估「等不到回信」22 单里 16 单是回信认领了、但自动往返停过，回信停在侧栏等常浩点「转回」，发起会话不知道。
- 改了哪些文件：
  - 常浩要求的：
    - 停着时到的回信照样转回：`platform/.../handoffs/held.rs`（新）`Handoff::held_answer`（开着、`replied`、自动往返关、`next()` 不管、这封回信之后没 `fail`）、`stopped_by_itself`、`paused_by_person`、`resume_for_ask`；`host/.../handoff/held.rs`（新）`hand_back`（手动与自动转回共用一条路）、`hand_held`（转不进去记 `trouble`、不自动重试）、`relay_gate`；`handoff.rs` 的 `drive` / `catch_up` 处理这类回信；`back.rs` 转回文字加「驿窗的自动往返停着（停因），这封回信照样转给你，下一步交常浩决定」，通过照旧结束、思维评审收口照常。
    - 新送审重开：驿窗自己停的，下一轮送审确认送到时（`Book::asked`）先记一步自动 `resume`、清 `halt`；常浩手动暂停的不动。`went_in` 里证据补齐和送审的顺序跟着调。到上限无授权的送审本来就收不进，不会绕开。
    - `relay_to_chatgpt` 返回：常浩手动暂停时如实写「回信到了照样转回，但下一步等常浩决定」。
    - 侧栏「回」章：`hud/src/relay-stamps.ts` 在 `returned`、`auto` 关、有 `halt` 时也给发起方盖「回」，到顶的不算（那是 ChatGPT 的「停」，#409 已定 Claude 那边保持原样）；场景 `relay-held-back`（`test/scenes/relay-gate.ts`）。
    - 文档：`docs/chatgpt-channel.md` 自动往返加「停着时到的回信」「新送审重开」两条，阶段、插话重算、#318 通知、票根章四处同步；`docs/LESSONS.md` L-51 补 S1 与不做切前台分支的理由。
  - 我顺手改的：
    - 第 1 批让 `handoff.rs`、`handoffs.rs`、`texts.rs` 超出行数上限，把新增的转回逻辑拆到两个 `held.rs` 子模块，三份回到上限内。
    - 「ChatGPT 30 分钟没回信」发给会话的通知（`handoff/notice.rs`）原写「其他结论要常浩点『转回』才会转过来」，S1 后不对，改成「回信会照样转回这里，通过的结束接力，其他结论写明下一步等常浩决定」（**改了发给会话的文字**）；去掉了不再需要的 `by_doer`。
    - `relay` 判断「常浩暂停」从「自动往返关着」收紧为 `paused_by_person`（驿窗自己停的会被这次送审重开，不算暂停）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」：cargo 合计 `1049 passed`，前端 `ℹ pass 476` / `ℹ fail 0`，MCP `ℹ pass 9`、插件 `ℹ pass 14`、Chrome 插件 `ℹ pass 28`、注入脚本 `ℹ pass 11`，均 `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（`collab.log`）。新增 `host/.../handoff/tests/held_back.rs` 6 条（停因 5 种 × 回信结论 4 种每格恰好转回一次、三单真实步骤回放 `h1a1f09f8a3f02` `h1a1f1cdd3f600` `h1a1f26a454202`、新送审重开、暂停不清、到上限无授权不重开、转不回不自动重试），把 `held_answer` 和 `resume_for_ask` 临时关掉时其中 4 条失败（另 2 条守原本不变的行为，照样过）；`relay-stamps.test.ts` 加 1 条；改了 6 条旧测试的预期（4 条上一会话改、2 条通知文字）。日志 `~/Library/Application Support/postpane/evidence/410-relay-deliver/`（`check.log`、`test.log`）。
- 验证：场景预览台（127.0.0.1:1480，本 worktree，1440×900）：改前 `relay-held-back` 没有章、改后有「回」；`relay-paused` 与 `relay-held-back` 的「回」静态终态一致（字、颜色 rgb(153, 89, 26)、位置 1406,290、21×21），每 250 ms 取样 28 次序列相同；`relay-stopped` 仍只有 ChatGPT「停」。预览窗当时隐藏，动画以实机装机对比为准。
- 截图：`~/Library/Application Support/postpane/evidence/410-relay-deliver/`（`still-relay-paused.png`、`still-relay-held-back.png`、`batch2-stamp-compare.md`）。
- 发布与回读：PR #423 合并为 main `8e8f984`；主目录 main 上三条全量重跑通过（`pnpm run check` 退出码 0；`pnpm test` 「全量测试汇总：6 套，失败 0 套」，cargo `1049 passed`、前端 `ℹ pass 476` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`，日志 `evidence/410-relay-deliver/main-*.log`）。装前按 L-55 备份 `chatgpt/`（`evidence/410-relay-deliver/chatgpt-before/`，`handoffs.json` `cmp` 一致）。`install.sh 410-relay-deliver`：装前 `d074d92e787e`（已备份），产物 `b915fa96a368` / 已装 `b915fa96a368`，签名证书一致；冒烟侧栏在动（隔 2 秒 597 像素不同），装前装后差异只在小人和 Hermes 回复小签（重启后没有新回复，自己收起，本轮没改 Hermes）；没有「想访问文稿」弹窗；`install.sh check` 一致：已装的是主目录 main `8e8f98483844`。回滚：`osascript -e 'quit app "PostPane"'; ditto "~/Library/Application Support/postpane/evidence/2026-11-19-410-relay-deliver/PostPane-d074d92e787e.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 装后回读：两单停着的接力 `h1a1ed56ea0e00`（数字分身 0B-4b）、`h1a1f09f8a3f02`（#409 L2 第 2 轮）在 18:20:29 各记一步 `back`（`auto`，送达「已开始」），阶段 `returned`，自动往返仍关着，各只转回一次。常浩看过「#409 那单在侧栏看不到」后选「直接装」：它 6 小时没动静、原会话不在列表里，「审核」列表按 `STALE_REVIEW` 不列，「接力 8」只是计数点不开，侧栏无从结束。实机「回」章这次没看到：Claude 票根同时有待答，按 #218「答优先」，「回」让开。
- 与授权不一致之处、遗留问题、范围外发现：
  - 常浩手动暂停时到的回信也照样转回（原来留在侧栏等点「转回」），开工前已在消息里列出，常浩回「按计划开工」。
  - 「回」章范围按推荐扩大到所有「已转回、停着」的接力（例如「回信没写结论，已转回，自动往返停下」以前不盖），到顶的除外，保 #409。
  - 已开着、自动往返停着、回信在侧栏等的两单（`h1a1ed56ea0e00`、`h1a1f09f8a3f02`，后者是 #411 L2 审查那单）：装上新版后会被自动转回各自的发起会话。
  - 切前台分支 `claude/410-relay-front2`（`f5bf0d2`）不合并，删分支和 worktree；S3（改读 ChatGPT 对话接口）这次不做。
- 本轮新坑：无（补在 L-51）

## 接力审核门生效上线：四处规则、#348、#411 合并，从 main 打包装机，MA-02 v0.3 生效（2026-11-19，Claude，常浩回「三件都按推荐」、旧接力已在侧栏结束，此前授权「按推荐开工」含合并装机；已提交、已发布 `d074d92e787e` 回读通过）

- 时间：开工 `2026-11-19 17:20`（会话记录推算，未用 `date` 记）。来由：常浩 11-19「抓紧把任务完成上线，运行新的规则」；生效门合并前四项（第 2 批 L3、第 3 批、第 4 批模拟台账、四处规则复核）齐了。
- 改了哪些文件：
  - 常浩要求的：
    - 合并：multi-agent#7 `2cc1f34`、agent-kit#71 `587de56`、digital-twin#185 `8fccc17`、my-skills#97 `f11e44d`（四个本机主目录已 `pull`）→ postpane #348 `360eedb`（PR 上写「解冲突未复审」）→ #411 `3d97f61`（基线改 main 后显示冲突：#411 叠在 #348 上、#348 squash 合并后的假冲突；核过 main 上 #348 的树与 #411 所含的完全一致，`-s ours` 并入，内容不变）。
    - MA-02 第 7 节写 v0.3 生效记录与切换时开着的接力轮数，`runs/runs.jsonl` 补 R-20261119-01～03：multi-agent#10 `2628966`。
    - 本节交接；`docs/LESSONS.md` L-55。
  - 我顺手改的：无。
- 测试：主目录 main `3d97f61` 三条全量：`pnpm run check` 退出码 0；`pnpm test` 退出码 0（cargo 合计 `1043 passed`，前端 `ℹ pass 475` / `ℹ fail 0`，MCP `ℹ pass 9`，插件 `ℹ pass 14`，扩展 `ℹ pass 28`，另一组 `ℹ pass 11`）；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-19-golive/main-*.log`。multi-agent `node --test tests/*.test.mjs` `ℹ pass 19` / `ℹ fail 0`。
- 验证：装后新版读旧账本（89 张）没生成 `unreadable` 备份；开着的 6 张工程审查各记一步「按审核门续审：本次授权周期已审 N 轮」并分到审查链，思维评审那张不挂链；`config.json` 没写上限，即默认 5。装后侧栏截图正常、无系统弹窗。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-19-review-gate-golive/`（`smoke-before-*`、`smoke-after-*`、`smoke-motion-1.png`、`smoke-before-after-1.png`）。
- 发布与回读：`install.sh review-gate-golive --takeover`（原装的是 #419 worktree 的包，#420 已合并、内容在 main 里）：产物 `d074d92e787e` / 已装 `d074d92e787e`，签名证书一致；`install.sh check` 一致，已装来自主目录 main `3d97f61a7ec4`。装前备份 `chatgpt/` 在同目录 `chatgpt-before/`（`handoffs.json` 与原件 `cmp` 一致）。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-19-review-gate-golive/PostPane-25b994117bc8.app" /Applications/PostPane.app; open /Applications/PostPane.app`，回退前先把 `chatgpt-before/` 的普通文件拷回数据目录（旧版读不懂新账本会清空，MA-02 第 5.6 节）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 常浩回「已结束」时账本里 #411 的两张（`h1a1f09f8a3f02`、`h1a1f265307d01`）仍开着；没人再往里送审，放 24 小时会被驿窗自动结束。冒烟接力改从新会话发起，不续进它们。
  - 迁移给每张旧接力单独开审查链，「审查链总轮数」只数本张的回信（#411 链上记 1 轮、实际共 3 轮；授权周期轮数是对的），只影响展示与运行记录，已写进 MA-02 第 7 节。
  - 第 4 批报告的旧版现象：决策升级后续送的回信不自动转回（旧版自动往返停下后没再打开，属预期）；轮数多记一轮，留新版冒烟复验。
  - Fable 5.2 评估提的后续：闲置自动结束的到顶接力常浩无法手动了结（`end()` 只认还开着的），发起目录已删时会一直留在快照里——另开单；`docs/DECIDED.md` 还没建，11-19 定的停章甲、上限 1–9、「过」章没登记。
  - 已在用的会话要重开或重连 MCP，旧 MCP 进程的工具说明还是旧规则。
  - skill 进化：`postpane-round` 装机一步可补「生效切换类手动备份数据目录照 L-55」，未改，待常浩点头。
- 本轮新坑：L-55


## #411 L2 第 2、3 轮返修：停章按审查类型了结、到顶未了结的不受一天限制、「审核通过」和下一轮预告看后台放行（2026-11-19，Claude，常浩回「按推荐开工」：补做第 4 批、授权第 3 轮复审、四份草稿送一轮合并复核、别项目开着的接力只备份不动；第 3 轮后回「修，补改未复审」；已提交、未发布）

- 时间：开工 `2026-11-19 13:50`（会话记录推算，未用 `date` 记）。来由：L2 第 2 轮（驿窗 `h1a1f09f8a3f02`，审 `b520036`）返修，剩 P2-02a、P2-02b、P2-05。
- 改了哪些文件：
  - 常浩要求的：
    - P2-02a：`hud/src/alerts/relay-stop.ts` 加 `thinking()`（同 Rust `handoffs.rs` 的 `thinking`：标题去掉开头空白后以「思维评审｜」或「思维评审|」开头），`settledSince()` 只认同类新接力才算了结，和 `guard.rs` `unsettled_top` 一致。
    - P2-02b：`platform/.../handoffs/guard.rs` 加 `Book::holds_back()`（单张接力是否到顶未了结，和 `unsettled_top` 同口径：`notice=top`、还开着或被驿窗闲置结束、之后同会话或同目录没开过同类接力）与 `Book::in_sight()`（快照里留不留：在途；失败或结束一天内；或 `holds_back`）；`unsettled_top` 抽出 `open_top()`、`top_at()` 两个小函数共用。`host/src/handoff.rs` `projection()` 改调 `in_sight`，到顶未了结的不论多久都留在快照里，普通已结束的照旧一天后清走。
    - P2-05：`relay-stop.ts` `endWords()` 改看 `handoff.notice === "passed"`（后台真正放行才记），不看回信的 verdict；思维评审收口写「思维评审收口，自动结束接力」。
    - 测试：`relay-stamps.test.ts` 加四个方向的类型隔离（工程停后开思维评审不算了结、反过来也不算、同类算、ASCII 竖线与开头空格也认）；`handoff-card.test.ts` 加版本核对拦下后闲置结束、思维评审收口两种结束文字，原「通过」用例补 `notice: "passed"`；`guard.rs` 测试加闲置结束后一年仍 `in_sight`、开思维评审仍在、开工程审查后不在；`handoff.rs` 思维评审到顶测试加「过了两天仍在快照里、常浩开口新开一张后一天就清走」。
    - 场景预览台：`test/scenes/relay-gate.ts` 加 `relay-stop-other-kind`（工程停后同会话开思维评审，「停」还在）、`relay-stale-idle`（旧版本通过被拦后闲置结束，不写「审核通过」），登记进 `scenes.ts`。
    - 文档：`docs/chatgpt-channel.md` 到顶界面一条补「同类才算了结」「不受快照一天限制」「自动结束写不写通过看 notice」，快照一条补「到顶还没了结的」。
    - L2 第 3 轮（驿窗 `h1a1f265307d01`，审 `f0d1e75`，常浩授权，`extra` 写他的原话）：P2-02a、P2-02b、P2-05 关闭，未发现新回归；新增 P2-06（下面），出口返修，预算用完交常浩。常浩回「修，补改未复审」。
    - P2-06：`handoff-card.ts` 时间线「接下来」判通过改为 `notice === "passed"`，或 `replied` 阶段回信写通过（驿窗还没处理）；被版本核对转回的照常预告「第 N 轮：ChatGPT 再审核」。照审查人给的修法。`handoff-card.test.ts` 加回归测试（转回仍预告、刚到不预告、已放行不预告），撤修复时该测试失败、还原后通过。场景 `relay-stale-back`。文档 `chatgpt-channel.md` 同步一句。补改未复审。
  - 我顺手改的：无。
- 测试：`pnpm run check` 退出码 0（`check-5.log`）；`pnpm test` 退出码 0：cargo 合计 `1041 passed; 0 failed`（没加新测试函数，断言加在已有函数里），前端 `ℹ pass 473` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-19-409-review-gate-ui/*-4.log`、`check-5.log`。加场景后单跑侧栏 `ℹ pass 398` / `ℹ fail 0`。 P2-06 后再跑一次：`pnpm run check` 退出码 0，`pnpm test` 退出码 0（cargo `1041 passed`、前端 `ℹ pass 474` / `ℹ fail 0`、MCP 9、插件 14、扩展 23），`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`*-6.log`）。
- 验证：场景预览台（127.0.0.1:1480，本 worktree）：`relay-stop-other-kind` 隔 2 秒两张，ChatGPT 票根红色「停」章都在；`relay-stale-idle` 开卡滚到底两张，末步「驿窗自动结束接力」+「等常浩处理 24 小时没动静，驿窗自动结束接力」；回查 `relay-passed` 末步仍是「审核通过，自动结束接力」。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-19-409-review-gate-ui/shots-r3/`（`stop-other-kind-{1,2}.png`、`stale-idle-{1,2}.png`、`passed-regression.png`、P2-06 的 `stale-back-{1,2}.png`）。
- 发布与回读：未发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 常浩 11-19 回「按推荐开工」，四项照推荐：补做第 4 批模拟台账；授权 #411 第 3 轮复审（`extra` 写常浩原话）；四份规则草稿送一轮合并定向复核；本机别项目开着的接力只备份、不动、记下已累计轮数。
  - #348 现在和 main 冲突（`docs/LESSONS.md`、`src/crates/host/src/handoff/belongs.rs`），合并前要解，只解冲突、不改已审过的判定；之后 #411 跟着变基。
  - skill 进化：无。
- 本轮新坑：无

## 接力审核门第 3 批：上限 1–9、到上限「停」、未完暂停、回执「过」章、设置入口、三个场景（#409）（2026-11-19，Claude，常浩回「按修订计划开工」，11-19 另定上限 1–9 默认 5、到上限显示「停」、别的停下叫「未完暂停」，侧栏提醒选甲「票根停章」；已提交、未发布，PR 待 L2 审查，不合并、不装机，等生效切换）

- 时间：开工 `2026-11-19 05:10`（`date '+%F %H:%M'` 记录）。来由：生效门还差第 3 批界面；分支 `claude/409-review-gate-ui` 从 `claude/347-review-gate`（`5c21f84`）切出。
- 改了哪些文件：
  - 常浩要求的：
    - 上限：`platform/.../handoffs/gate.rs` `LIMIT_MAX` 5 → 9（默认 `LIMIT` 仍 5），测试改为 9 可设、10 拒收；新命令 `chatgpt_review_limit`（`host/src/handoff/settings.rs`，读写 1–9，回传 max 与默认）；设置「智能体插件」ChatGPT 行「新会话放进项目」下面加「审核轮数上限」下拉（`agent-plugins/ChatGptRows.tsx`、`lib/review-limit.ts`、`services.ts`）；「AI 接入」页「最多 2 轮」与 config.json 的说法改成新口径；`relay.ts` 与 `handoff.rs` 的工具说明改成「在设置里调，1–9 轮」。
    - 后端：思维评审收口也记 `notice=passed`（`handoff.rs` 的 `Next::Close` 与 `Next::Pass` 合并一个分支）；`Handoff::shown()` 去掉在途 `pending` / `mending` 的 `words` 与 `key`；TS 类型补 `mending`、`HandoffPending`。
    - 接力卡（`alerts/handoff-card.ts`、`handoff-actions.ts`、`HandoffCard.tsx`）：到上限（`notice=top`、自动往返关着、到顶后没再送审或续审）圆章红色「停」，时间线最后一步「已停：审满 N 轮」+ 琥珀色「等你决定：在会话里说一句再续审，或结束接力」，卡底「结束接力」「查看 ChatGPT 对话 ↗」「去会话里说一句 ↗」（主按钮，跳回发起会话），不出「再审一轮」「继续自动」；别的原因停下的小标「自动已停」改「未完暂停」（英文 `PAUSED`），「正在进行」一行同步。
    - 侧栏（甲）：`relay-stamps.ts` 加 `stopped`，ChatGPT 票根盖蜡红「停」章，压过「审」「未审」、不让位、不涟漪，结束或续审才收；`scene/RelayStamps.tsx` 的 `ReviewStamp` 改为收整份印章状态。
    - 回执：通过的那封 ChatGPT 回信盖蓝色「过」章（`alerts/relay-pass.ts` 判定、`RelayStamps.tsx` 的 `PassStamp`），只盖放行的那封，回执停留规则不变。
    - 场景预览台：`test/scenes/relay-gate.ts` 加 `relay-stopped`、`relay-passed`、`relay-paused`；`build.ts` 的 `relay()` 加 `reviews`、`limit`、`verdict`、`auto`、`halt`、`notice`、`status`。
    - 文档：`docs/chatgpt-channel.md`（上限、到顶界面、「再审一轮」、「未完暂停」）、`AGENTS.md`「AI 接入」功能行。
    - 四份规则草稿改成「1–9 可调、默认 5」，设置名「审核轮数上限」：multi-agent#7 `7b205c8`、agent-kit#71 `5970a60`、digital-twin#185 `f273258`、my-skills#97 `57bd86a`，各 PR 留了「补改未复审」。
  - 我顺手改的：
    - **改变了行为的（只影响预览台）**：`hud/preview/main.tsx` 场景里的通知改为页面打开约 0.4 秒后才到。原来一打开就塞进去，侧栏只显示之后才到的通知，所以 `replies` 等场景的回执从来看不到。
    - 拆文件（行为不变，为守行数上限）：卡底按钮与 `pointMarkColumn` → `handoff-actions.ts`；回执航空框 → `RelayFrame.tsx`；航空框图例 → `relay-legend.ts`；「新会话放进项目」行 → `ChatGptRows.tsx`；`chatgpt_project` 命令 → `handoff/settings.rs`。基线与允许名单收紧（`handoff-card.ts` 612 → 582，`handoff.rs` 2001 → 1986）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `1041 passed; 0 failed`（比 #348 的 1040 多 1 条上限测试），前端 `ℹ pass 467` / `ℹ fail 0`（多 5 条：「停」、续审后不算停、回执「过」章、票根「停」章、上限选项），MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展两组各 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-409-review-gate-ui/`（第一批 `*-1.log`，甲版之后 `*-2.log`）。四份草稿：multi-agent `ℹ pass 17`、agent-kit `ℹ pass 78`、my-skills `ℹ pass 15`，均 `ℹ fail 0`；digital-twin 没有测试脚本。
- 验证：场景预览台（127.0.0.1:1480，本 worktree）逐个看了 `relay-stopped`（卡头「停」、卡底时间线与按钮、票根「停」章）、`relay-paused`（卡头「未完暂停」）、`relay-passed`（回执「过」章，第二轮下移 2px 后与标题行居中）、`two-relays`（「审」「回」章颜色不变）。未装机、未实机走一次（留到生效切换）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-19-409-review-gate-ui/`（`scene-relay-stopped-*`、`scene-relay-paused-card.jpg`、`scene-relay-passed-receipt*.{jpg,png}`、`scene-two-relays-stamps-unchanged.jpg`）；三版预览 https://claude.ai/artifact/5NofQ1gLTRfZ6jS3g3E4ih（源文件主目录 `docs/design/接力停章侧栏提醒三版预览-2026-11-19.html`，未入库）。
- 发布与回读：未发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 后台续审（`allow_extra`）不清 `notice=top`，界面上的「停」按「自动往返关着且到顶后没再送审或续审」判定；后台本身没改（#348 已审过的逻辑）。
  - MA-02 第 5.5 节「各轮回顾」：常浩 11-19 回「改契约」，改为接力卡时间线逐轮的意见和结论，不另统计每轮新增与关闭的问题数（multi-agent#7 已补改，未复审）。
  - 另开单仍未做：上限那一轮遇到版本问题不记到顶；`extra` 的说明写窄。
  - 四份草稿补改后要送一次定向复核；PR 的基线是 `claude/347-review-gate`，#348 合并后要改基线到 main。
  - L2 审查第 1 轮（驿窗 `h1a1f09f8a3f02`，审 `7e8d9b6`）：返修，P2 ×4，无 P0/P1；拆文件、设置权限、思维评审收口记 passed 都判通过。四条已对照代码核实属实，代码未改，交新会话返修：
    - P2-01 回执「过」章只按时间下界匹配，通过之后同一对话的新回复、相邻 2 分钟内的返修回信都会误盖；要按回信的稳定标识（或回信步骤与完成事件的对应）唯一匹配，时间只作辅助。
    - P2-02 闲置 24 小时自动结束（`idle.rs`，末步 `End` 且 auto）后台 `unsettled_top` 仍算到顶未了结，前端 `stopped()` 要求 live、`relayStamps` 只看 open，「停」消失、卡只剩「知道了」；快照对已结束接力只留 24 小时（`FAILED_SHOWN_MS`）。要区分本人结束与闲置自动结束。
    - P2-03 `Desk::new` 重启恢复里自动通过的分支（`handoff.rs` 约 346–357 行 `book.passed(id, &passed(chinese), now)`）没先 `book.note(id, Notice::Passed, now)`。
    - P2-04 停卡的「去会话里说一句」在 `doerSession()` 找不到会话时仍可点、点了无反应（`go()` 静默返回）；标题行已用 `canGo` 处理，底部按钮要同步置灰并说明。
  - L2 第 1 轮返修（`ec2afe9`，常浩选「就在这里做」）：P2-01「过」章改按 ChatGPT 消息 id 对应（`shown()` 保留回信步骤的 `key`，回执 `turnId` 一一对应，无 id 时前后 2 分钟）；P2-02 闲置一天被驿窗自动结束、仍在上限的接力继续显示「停」（卡底「知道了」「去会话里说一句」，票根「停」章，同一会话或目录之后开了新审核才收），判定搬到 `alerts/relay-stop.ts`；P2-03 `Desk::new` 重启恢复的自动通过先记 `Notice::Passed`；P2-04 原会话不在时按钮置灰、写「原会话已不在」。顺手改（**改变了行为**）：时间线里驿窗自动结束不再一律写「审核通过，自动结束接力」，前一封回信是通过才这样写，否则写「驿窗自动结束接力」并附原因；「停」时票根下半也用航空纸。新增场景 `relay-idle-stopped`，截图两轮 `l2r1-idle-stopped-round{1,2}.jpg`。测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，cargo `1041 passed; 0 failed`，前端 `ℹ pass 472` / `ℹ fail 0`，MCP 9、插件 14、扩展 23 全过；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（证据目录 `*-3.log`）。
  - skill 进化：无。
- 本轮新坑：无

## 接力审核门第 3 批开工准备：现状摸清、计划与常浩的选择记进 #409（2026-11-19，Claude，常浩回「做第 3 批」「按推荐改」；只开了 issue，代码未改）

- 时间：开工 `2026-11-19 00:10`（会话记录时间，未用 `date` 记）。来由：#348 与四份规则草稿审查都已通过，生效门还差第 3 批界面与第 4 批模拟台账；常浩选先做第 3 批。
- 改了哪些文件：无代码改动。计划、现状、常浩 11-19 对 3 处已定内容的选择（圆章加红色「到顶」；侧栏到顶提醒先出三版预览；回执接力单加蓝色「过」章）写进 issue #409。
- 测试：未跑（没有代码改动）。
- 验证：只读调研（子 agent）对照代码。
- 截图：无。
- 发布与回读：未发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 本会话上下文已过半，第 3 批的三版预览与实现建议在新会话里做：从 `claude/347-review-gate` 切 `claude/409-review-gate-ui`，先读 #409 和本节。
  - 侧栏「到顶」提醒（甲 / 乙 / 丙）要出三版预览、常浩挑定后才实现；其余照 #409 直接做。
  - skill 进化：无。
- 本轮新坑：无

## 接力审核门：上限只能调低到 1–5，四份规则草稿对齐 #348 实现（2026-11-18，Claude，常浩回「按推荐办」：上限改 1–5、四份合并送一轮 L1；已提交、未发布；L1 审查补改后定向复核已通过）

- 时间：开工 `2026-11-18 23:28`（`date '+%F %H:%M'` 记录）。来由：常浩选「先对齐规则文档」；对齐计划经 Fable 5.2（High）独立评估，指出上限 1–9 放宽了常浩 11-14「最高走审核 5 轮」、DT-ORC 写进架构基线的规则不算 L0，常浩回「按推荐办」。
- 改了哪些文件：
  - 驿窗：`platform/.../handoffs/gate.rs` `LIMIT_MAX` 9 → 5，测试改为 6 拒收、5 可设；`docs/chatgpt-channel.md` 上限一句。提交 `716c472`。
  - multi-agent#7（`765b1b0`）：MA-02 第 4 节（`head` / `chain`、送出前拒收、版本问题转回重送不停、送达未确认、补格式细节）、5.2（issue 由 ChatGPT 核）、5.3（通过后补改）、5.4（计轮细化、继承与信任边界）、5.5（上限只能调低、最后一轮预警与到顶的确切条件、第 3 批界面、`extra` 口径与到顶未了结）、5.6 生效门（第 2–4 批、合并顺序、回退先还原数据目录）、落地边界表；MA-01 第 6 节；`docs/runs.md` 的 `over_budget`。分工写明本契约写语义，驿窗 `docs/chatgpt-channel.md`「审核门」写机械细节。
  - agent-kit#71（`f6a1cfd`）：《工程流程》第 8 节第 3 条改为摘要并指向 MA-02 与驿窗通道文档。
  - digital-twin#185（`345021e`）：DT-ORC 3.3 工具参数与 Codex 发起、6.2 表（补送达未确认、读不到 PR 当前 HEAD，版本问题转回重送，证据不足暂停写明驿窗做法）、6.4。
  - my-skills#97（`f2a84ff`）：thinking-review 1.1.2，`references/relay.md`（上限、到顶条件、补格式会转回、到顶后续审与新开、送达未确认）、SKILL.md 版本、CHANGELOG。
- 测试：驿窗合入 main（#393–#406）后 `pnpm run check` 退出码 0；`pnpm test` 第一次 cargo 1 条失败（`core` 的 `demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes`，按当前时间判断，单独跑 3 次都过，属机器忙时偶发），重跑退出码 0，cargo 合计 passed 1040 failed 0，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`（`pnpm-test-8.log`）；`node scripts/check-rules.mjs` 通过；multi-agent `node --test tests/*.test.mjs` `ℹ pass 17` / `ℹ fail 0`、规则检查通过；agent-kit `ℹ pass 78` / `ℹ fail 0`；my-skills `ℹ pass 15` / `ℹ fail 0`；digital-twin 没有测试脚本。四仓旧说法扫描只剩历史记录（`rules/old-phrase-sweep.log`）。
- 验证：只做了文字核对与各仓测试；未装机。
- 截图：无（无界面改动）。
- 发布与回读：未发布。四份草稿保持草稿，等生效切换。
- 与授权不一致之处、遗留问题、范围外发现：
  - Fable 另指出两处 #348 代码问题，按它的建议另开单、本轮不改：到上限那一轮遇到版本问题，自动往返不停也不记到顶，但重送会被拒；`relay.ts` 与 `texts.rs` 里 `extra` 的说明写窄了。
  - digital-twin 草稿分支落后 main 56 个提交，合并时要变基。
  - L1 审查（驿窗 `h1a1ef4f4d7200`）：返修，P1-01（三处摘要把 `extra` 的外部消息口径写窄了）、P2-01（续审与新开的 `extra` 要求没分开）、P2-02（DT-ORC 漏「新发现的」）；没有改到常浩已裁决的内容。已补改并推送（multi-agent `4d3a0d5`、agent-kit `c43536d`、digital-twin `8b2f950`、my-skills `ee6953a`），四个 PR 写了「补改未复审」；常浩回「送定向复核」，定向复核（驿窗 `h1a1ef59ed7101`）通过，P1-01、P2-01、P2-02 已验证关闭，未决 P0 0、P1 0，无非阻断意见；四份保持草稿等生效切换。
  - skill 进化：无。
- 本轮新坑：无

## 接力审核门 #348 第 5 轮返修：补格式失败也补收回信、送达记录没记上不发、迟到确认去重（2026-11-18，Claude，常浩回「修并续审」；已提交、未发布；L3 专项续审已通过，PR 先不合并，等生效切换）

- 时间：开工 `2026-11-18 14:04`（`date '+%F %H:%M'` 记录）。来由：第 5 轮专项续审（接力 `h1a1ed14e5b302`，受审 `1bcd955`）判返修：P1-10、P1-11、P1-13、P1-14、P1-15 关闭，新增 P1-17、P1-18，P2-16 部分关闭。
- 改了哪些文件：`host/handoff/gate.rs`（`ask_format` 发送成功或失败都 `caught_up`，P1-17）；`host/handoff.rs`（送审 `change_kept` 返回 false 就不发，P1-18；测试替身加 `on_opener` 钩子）；`host/handoff/guard.rs`（`moved_meanwhile` 话术）；`platform/.../handoffs/unsure.rs`（`Pending.noted`，迟到确认只记一次，P2-16）；`docs/chatgpt-channel.md` 同步。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，cargo 合计 passed 1042 failed 0（host 155、platform 289），前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。新增测试 2 项（补格式发送期间回信先到再失败、送审准备期间接力被关掉），重启测试补「同一确认来两次、跨重启再来」；撤修复验证 3 处各自对应测试失败。日志 `*-5.log`。合入 main #392 后另跑一次全量，见 PR。
- 验证：只做了单元与集成测试；未装机、未实机走接力。
- 截图：无（无界面改动）。
- 发布与回读：未发布，切换条件同前。
- 续审结果：专项续审（受审 `d6210fd`）通过，P1-17、P1-18、P2-16 关闭，未决 P0 0、P1 0，无非阻断意见；第 4、5 轮台账全部关闭。复审写明不等于授权装机或启用。
- 与授权不一致之处、遗留问题、范围外发现：PR #348 先不合并（合进 main 后下次打包就带上审核门）；剩下第 3 批界面、四份规则草稿对齐、第 4 批模拟台账与实机、生效切换，都要常浩另行点头。skill 进化：无。
- 本轮新坑：无

## 接力审核门 #348 第 4 轮返修：补格式与送审分开记、送审第一行写请求号、思维评审续审把关、送达未知通知（2026-11-18，Claude，常浩回「按推荐返修并续审」；已提交、未发布，等 L3 专项续审）

- 时间：开工 `2026-11-18 13:32`（`date '+%F %H:%M'` 记录）。来由：L3 返修复审（接力 `h1a1ed14e5b302`，受审 `6e68292`）判返修：P1-10、P1-11 未关，新增 P1-13、P1-14、P1-15、P2-16，P1-12 核心关闭；按旧规则预算已用完，常浩授权按推荐返修并续审一次。
- 改了哪些文件：
  - `platform/.../handoffs/unsure.rs`（新，送达记录逻辑从 `guard.rs` 挪来）：`Gate.mending` 与送审的 `pending` 分开（P1-10），确认补格式只清 mending；`tagged` / `untagged`（续审、补格式第一行「【驿窗送审 请求号】」，指纹去掉这一行，P1-11）；`ask_mending`（Format 步与待确认一次改，P1-15）；`unconfirmed(…, tell)` 给停下那一步打 `Cause::Unconfirmed`（P1-14）。
  - `handoffs/notice.rs`：`Cause::Unconfirmed`、`Trouble::Unconfirmed`，接力开着且仍有未答待确认才报。`handoffs/guard.rs`：`unsettled_top` 加审查种类参数（P1-13）。`handoffs/gate.rs`：`mending` 字段。`handoffs.rs`：Ask 步指纹去请求行，导出新模块。
  - `host/handoff.rs`：续审带请求行；`extra` 入口不再只给工程审查、思维评审也查到顶未了结（P1-13）；`went_in` 找不到本次运行的请求时按磁盘记录补记迟到确认（P2-16）。`host/handoff/gate.rs`：补格式走 `ask_mending`、请求行、发不出去时通知；`pass_blocked` 用 `unsure()`。`host/handoff/guard.rs`：`change_kept`（返回 `Result<bool>`，从 `handoff.rs` 挪来守住行数上限）。`host/handoff/notice.rs`：送达状态未知的通知话术。
  - `docs/chatgpt-channel.md` 同步；PR 评论 `issuecomment-6970293402` 记复审与返修对照。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，cargo 合计 passed 1040 failed 0（host 153），前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。新增 host 测试 6 项（补格式不清送审、前 600 字相同三轮、思维评审到顶要常浩开口、重启后通知与迟到确认、回信先到不通知、补格式落不了盘不发）；撤修复验证 7 处各自对应测试失败（`revert-checks.log`「第 4 轮返修」）。日志 `*-3.log`。
- 验证：只做了单元与集成测试；未装机、未实机走接力。
- 截图：无（无界面改动）。
- 发布与回读：未发布，切换条件同上一节。
- 与授权不一致之处、遗留问题、范围外发现：
  - P1-11 没照复审原话做「全文指纹」：页面读到的提问会渲染 Markdown（#366 反引号连判 35 次 unmatched），送审包常有代码块，全文逐字比对容易拒掉正常回信；改用第一行请求号让前缀按请求唯一，送审时说明理由。
  - 新会话第一段（open 路径）不加请求行：那时会话里没有更早的轮次。
  - skill 进化：无。
- 本轮新坑：无

## 接力审核门 #348 返修：送达未确认收成一条规则、按 Fable 评审修五处、合入 main（2026-11-18，Claude，常浩回「按推荐返修」；已提交、未发布，等 L3 复审）

- 时间：开工 `2026-11-18 12:25`（`date '+%F %H:%M'` 记录）。来由：常浩问上限 5 为什么没生效，查明 #348 没合并、11-14 18:11 的 L3 P1-10 定向复核（接力 `h1a1d98406d000`，受审 `e9cfca3`）判返修却没记下；常浩请 Fable 5.2（High）独立评审，结论是还不能合并与切换，常浩选「按推荐返修」。
- 改了哪些文件：
  - 补记：PR #348 评论 `issuecomment-6969031048`（P1-10 未关、新增 P1-11、P1-12）；worktree 里未提交的半截修复（`guard.rs` +61 行）备份为证据目录 `wip-guard-before-simplify.diff` 后撤掉。
  - 合入 main（`6e89124`，#364–#386；推送前 main 又合进 #365（#318 接力出错通知发起会话）、#388（清理历史包袱），再合一次，冲突在 `AGENTS.md`、`CURRENT.md`、`mcp/src/index.ts`、`handoff.rs`、`handoffs.rs`，两边都留，#365 新加的那句「打不开或 30 分钟没回信也通知」并进 `relay.ts`）：`CURRENT.md` 两边交接都留；`docs/chatgpt-channel.md` 回信核对同时写去反引号（#366）和只认未确认的话；`handoffs.rs` 导出合并（`idle`）。
  - `platform/.../handoffs/guard.rs`：`Pending` 加 `key`、`booked`、`answered`；`in_flight` 算上未答的 pending；`answer_pending`（回信入账前补「送审」一步、计一轮）、`confirmed_late`、`unconfirmed`（停下）；`pending_at_restart` 改为停下；`unsettled_top` 把闲置自动结束（#368）的到顶接力仍算未了结。`handoffs.rs`：`replied` 只收未答的 pending、调 `answer_pending`；`sent_back` 去掉投递标签（`unlabelled`，手机标签除外）；`allow_extra` 不再排除思维评审。`gate_io.rs`：台账按标题级别截取。
  - `host/handoff.rs`：送审时同一段未确认的话返回 `repeated`、别的话拒收；`change_kept` 先落盘再发；发送失败停下并报 `sent_unknown`；`went_in` 先认迟到确认；思维评审到顶同样拒收；`auto_back` 对可重送的拦下（PR 新提交、没记受审提交）和 `Stale` 不停；再审 / 左滑话术改成「问题台账 + 末四行」；去掉「通知常浩」。`handoff/belongs.rs`：有未答 pending 时只认它。`handoff/gate.rs`：`pass_blocked` 返回 `Held { why, resend }`、补格式记 pending。`handoff/guard.rs`：`Held`、收口也拦、新话术。`handoff/back.rs`：拦下时按可否重送分两种话术，思维评审另写。
  - `src/apps/mcp/src/relay.ts`：上限说成默认 5、可在 config.json 改，去掉「通知常浩」，写明 PR 有新提交时转回请重送。`docs/chatgpt-channel.md`：审核门一节、自动往返终局一段同步。`docs/LESSONS.md`：L-54（原写 L-51，并入 main 时已被 #410 占用，改号）。
- 测试：第二次合入 main 之后（`0b814b6`）`pnpm run check` 退出码 0；`pnpm test` 退出码 0，cargo 合计 passed 1034 failed 0（platform 289、host 147 等），前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过。第一次合入后也全过（cargo 1020/0、前端 463/0）。日志（`*-2.log` 为第二次） `~/Library/Application Support/postpane/evidence/2026-11-18-347-review-gate/`。新增测试：host 6 项（未确认的话一整套、思维评审收口被拦、补格式未确认不放行、落不了盘不发、受审版本不符转回重送、思维评审到顶拒收），platform 断言 3 处（带标签 / 手机标签插话、闲置结束不算了结、分组台账）。撤修复验证 8 处各自对应测试失败（`revert-checks.log`）。
- 验证：只做了单元与集成测试；未装机、未实机走接力。
- 截图：无（无界面改动）。
- 发布与回读：未发布。按生效门要和第 3 批、四份规则 PR 一起切换；切换步骤（查开着的接力、先备份 `<数据目录>/chatgpt/`、回滚先还原备份再装旧版）写在 PR #348 描述。
- 与授权不一致之处、遗留问题、范围外发现：
  - Fable 第 4 条（Codex 转回带标签导致每轮重算）实查 11-09 的 Codex 会话记录，转回的话没带标签，这条按防守做了。
  - 「送达未确认」照 Fable #14 收成一条，但没删 `Pending` 字段：「迟到确认只补记」和「补格式不计轮」需要 `answered`、`booked` 两个标记。
  - 还没做：第 3 批界面（到顶 / 通过通知、上限设置入口、到顶卡出口，Fable #2、#3）；四份规则草稿对齐实现（Fable #11）；第 4 批模拟台账与实机走一次（Fable #13）。挂起：链总轮数兜底（#10）、授权改卡上按钮（#15，涉及常浩 11-14 定的 P1-06 口径，要先单独确认）、有 PR 时只认 `head`（#16）。
  - 本机现开着 5 张接力（3 张在答），切换前要处理。
  - skill 进化：无。
- 本轮新坑：L-54（原编 L-51，并入 main 时改号）







## 随手记：数码世界换版后，再打开驿窗侧边随手记自动换成新版（#419）（2026-11-19，Claude，常浩回「按推荐开工」批了分批计划；已提交、已发布 `25b994117bc8` 回读通过）

- 时间：开工 `2026-11-19 16:16`（`date '+%F %H:%M'` 记录）。来由：数码世界 11-19 11:59 发布 `wb-20261119-pr89`（随手记待办行距收紧），驿窗 05:49 启动后随手记窗口从没重新加载，侧边随手记一直是旧样式，常浩只能重启驿窗。
- 改了哪些文件：
  - 常浩要求的：
    - `src/crates/host/src/float_notes_refresh.js`（新）：每次打开随手记时在页面里跑。用 `fetch("/", { cache: "no-store" })` 拿 5178 最新首页，取里面的 `/assets/index-*.js`、`/assets/index-*.css`，有一个不在当前页面的 `script[src]` / `link[href]` 里就算换版（只改样式的发版 JS 名不一定变，所以两种都比；运行中页面自己插进来的文件不算）。换版时：有便签在编辑（`.sn.is-edit` 或 `[contenteditable="true"]`）就这次不重载；否则先调页面自己的 `window.floatingNotesHost.prepareCollapse()` 把草稿落本机，返回 `ok:false` 或抛错就不重载，成了再查一遍没在编辑才 `location.reload()`。取不到首页、首页里看不出版本都不重载。只读页面、不改 DOM（L-10）。
    - `src/crates/host/src/float_notes.rs`：`include_str!` 引入上面的脚本；窗口已存在、显示的是数码世界页面时，打开就 `eval` 它；away 页（数码世界没启动）不跑。补 Rust 测试一条。
    - `src/crates/host/src/float_notes_refresh.test.mjs`（新）：node:test 在 `vm` 替身页面里跑真脚本，11 条：没换版不重载、每次 `no-store`、只换 CSS 重载、换 JS 重载、完整地址也认得出、在编辑不重载也不碰草稿、`prepareCollapse` 返回失败 / 抛错不重载、页面没收尾接口直接重载、取不到首页不重载、首页看不出版本不重载。
    - `package.json` 新增 `test:host`；`src/tooling/test-all.mjs` 加第六套「注入脚本」；`tests/test-all.test.mjs` 跟着改。
  - 顺手改的：`AGENTS.md`「运行」里 `pnpm test` 那行注释改成「六套都跑完再汇总」。
  - **改变了已有行为的**：① 驿窗侧边随手记：原来只在第一次打开时加载页面，之后只显示 / 隐藏；现在每次打开都向 5178 要一次首页（本机、`no-store`），发现换版且没有便签在编辑时重载一次，换版后的第一次打开会先闪一下旧页再换新页。② `pnpm test` 从五套变六套。
- 测试：先跑红：脚本挪走时 `node --test src/crates/host/src/float_notes_refresh.test.mjs` `ℹ pass 0` / `ℹ fail 1`（ENOENT，`red/no-script.log`）。最终：`pnpm run check` 退出码 0（`check.log`）；`pnpm test` 退出码 0，「全量测试汇总：6 套，失败 0 套」，Rust 合计 `1002 passed; 0 failed`（含 `float_notes::tests::reopening_checks_for_a_new_build_without_touching_a_note_being_written ... ok`），前端 `ℹ pass 463` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 28` / `ℹ fail 0`，注入脚本 `ℹ pass 11` / `ℹ fail 0`（`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（`rules.log`）。
- 验证：
  - WKWebView 探针（L-10，`probe/probe.swift`、`probe/run.log`）：同一套 WebKit 加载真实 `http://127.0.0.1:5178/?floatingNotes=1#/float`，跑真脚本。没换版 → `current`、加载 1 次；把页面的 CSS 入口改成旧文件名（等于页面旧、服务新）→ `reloaded`、加载 2 次；重载后再跑 → `current`、仍 2 次，不会反复重载。
  - 真实驿窗（装 `25b994117bc8` 后）：点猫球打开随手记，展开第一张便签全文做记号；点猫球收起（`app_list_windows` 里随手记窗口消失，确认真的隐藏了），再打开，便签仍是展开的，页面没重载。截图 `real-1-opened.jpg`、`real-2-expanded.jpg`、`real-3-reopened-still-expanded.jpg`。
  - **未做**：真实驿窗里的「数码世界换版后再打开就是新版」。不能动数码世界的文件，5178 本轮没有新发版；换版路径由上面的 WKWebView 探针和 11 条脚本测试覆盖，等数码世界下次发版后打开随手记回看。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-19-419-notes-refresh/`（`real-*.jpg`、`smoke-*.png`）。
- 发布与回读：`install.sh 419-notes-refresh`：装前 `08256f49a34b` 已备份到证据目录，16:33:50 退出并启动，产物 `25b994117bc8` / 已装 `25b994117bc8`，冒烟：侧栏在动。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-19-419-notes-refresh/PostPane-08256f49a34b.app" /Applications/PostPane.app; open /Applications/PostPane.app`。装的包基于 main `b9c8b7f`，开工后 main 没有新提交。
- 与授权不一致之处、遗留问题、范围外发现：
  - 无不一致。遗留：真实换版的回看（见上）。
  - 范围外发现：装机重启后设置窗口会自己弹出来（装前它是最小化的），本轮没查原因，也没改。
  - 草稿保护的边界：重载前用的是数码世界页面自带的 `prepareCollapse`，它在驿窗里把草稿写进页面的 localStorage，重载后由页面自己恢复；在编辑的便签一律不重载，所以不会丢光标或正在打的字。
  - skill 进化：无。
- 本轮新坑：无

## 积压清单第二批（组 12）：`pnpm run check` 第一步查 `src/` 下没提交的文件，预览只用场景预览台（2026-11-19，Claude 子 agent，常浩 11-19 回「全部按推荐」批了积压清单组 12；已提交、无需发布）

- 时间：开工 `2026-11-19 11:37`（`date '+%F %H:%M'` 记录）。来由：跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 12：L-13、L-43 两次都是 `src/` 下没提交的自查页 / 预览脚手架把 `pnpm run check` 拦在格式或包边界检查上；E-18 预览统一用场景预览台。同批的 #416（坑记录与 SKILL）先合，本 PR 合并前要变基。
- 改了哪些文件：
  - 常浩要求的：
    - `src/tooling/check-untracked.mjs`（新）：`git ls-files --others --exclude-standard -- src`，有就列出文件、写明正确做法（场景预览台；一次性页面放 `src/` 外；要提交的先 `git add`），退出 1。`package.json`：新增 `check:untracked`，放在 `check` 第一步。
    - `tests/check-untracked.test.mjs`（新）：L-13 的 `src/apps/desktop/relay-real/`、L-43 的 `src/apps/desktop/preview-328/` 两个样本各报一次错，忽略的构建产物、已 `git add` 的新文件、`src/` 外的草稿放行，并查 `check` 第一步是它。
    - E-18：`.agents/skills/postpane-round/SKILL.md` 第 3 步第 5 条改指场景预览台（命令、端口、参数、缺场景在哪补）；`docs/LESSONS.md` L-13、L-43 的「正确做法」改成场景预览台（原来「对自查页也 prettier」「截完图挪走再跑 check」两种旧做法写明作废），L-09 的「浏览器预览」补一句只用场景预览台；`EVOLUTION.md` E-18 改「已采纳（本 PR，#417）」。
    - `docs/LESSONS.md` L-13、L-43 升级行改成「〔提醒〕部分升级」（子 agent 原标〔机检〕；`pnpm run check` 靠约定去跑，常浩 11-19 定降一层）。
  - 顺手改的：`AGENTS.md`「运行」里 `pnpm run check` 那行注释补「先查 src/ 下有没有没提交的文件」。
  - **改变了已有行为的**：`pnpm run check` 原来不管 `src/` 下有没有没提交的文件，直接从格式检查开始；现在第一步先查，有没提交、也没被 `.gitignore` 忽略的文件就退出 1、后面都不跑。连本轮新写、还没 `git add` 的源文件也会被拦（本轮自己就碰上了：新脚本没 add 时被列出来），报错里写了「先 git add」。
- 测试：改动前（origin/main `0e5083c`）`node --test tests/*.test.mjs` `ℹ pass 51` / `ℹ fail 0`，`pnpm run check` exit 0，`pnpm test` exit 0（汇总「5 套，失败 0 套」：cargo 合计 `1001 passed; 0 failed`，前端 `ℹ pass 463` / `ℹ fail 0`，MCP 9/0，插件 14/0，Chrome 插件 28/0）。新测试先在旧代码上红：`tests/check-untracked.test.mjs` 对着 origin/main 跑 `ℹ pass 0` / `ℹ fail 4`（`red/check-untracked-old-code.log`）。改动后 `node --test tests/*.test.mjs` `ℹ pass 55` / `ℹ fail 0`（+4 条新测试），`pnpm run check` exit 0（第一步打印「src/ 下没有未提交的文件。」），`pnpm test` exit 0，各项与改动前相同。和 #416 共用构建目录 `~/Sandbox/worktrees/postpane-b2-target`（两边 Rust 代码相同）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-b2-batch/`（`baseline-*`、`pr2-final-*`、`red/`）。
- 验证：真实样本放回 `src/` 跑 `pnpm run check`（样本是证据目录里当时的 `relay-real-page/`、`preview-328/` 的 `index.html`、`main.tsx`、`vite.config.ts`，不含私人快照；跑完删掉，`git status` 核过）：旧代码上 L-13 样本 8 秒后挂在 `format:check`（`[warn] src/apps/desktop/relay-real/main.tsx` 等，和当时一样），L-43 样本格式化后 19 秒挂在 `check:packages`（`preview-328/main.tsx:11: ../../../packages/hud/src/HUDScene leaves the package` 等 4 处，和当时一样）；新代码上两份样本都在第一步、2 秒内停下，列出文件和正确做法。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-b2-batch/red/`（`old-code-*`、`new-code-*`）。
- 截图：无（没有界面改动）。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 删旧脚手架：仓库里已没有旧脚手架的代码（只在证据目录），能删的是指向它的文字，即 L-13、L-43 的旧做法；`docs/history/` 里的历史交接照原样留。主目录本机的 `.claude/launch.json`（不进仓库）还有 `preview-243`～`preview-341` 等十几项旧脚手架启动配置，有几项写着「用前放回 src/apps/desktop/」，按规矩不动主目录，建议删掉只留 `scenes`。
  - 预览台、固定场景都是 ADR-0001（`docs/adr/0001-工作场所契约.md` 第 8 条）已定的做法，本 PR 只是让 SKILL 和 LESSONS 跟它一致，没改预览台本身；本项目没有 `docs/DECIDED.md`。
  - L-13、L-43 原标〔机检〕，常浩 11-19 定降为〔提醒〕部分升级：新检查接在 `pnpm run check` 里，坑只在跑这条命令时出现，跑它就一定先查；单独跑 `format:check`、`check:packages` 等子步骤不经过它。
  - skill 进化：E-18 已采纳（本 PR）；无新 E 条目。
- 本轮新坑：无

## 积压清单第二批（坑记录与 SKILL）：提升行补全局编号、组 15 关闭、组 16 不升级、E 条目采纳（2026-11-19，Claude 子 agent，常浩 11-19 回「全部按推荐」批了积压清单组 3、7～17；已提交、无需发布）

- 时间：开工 `2026-11-19 11:37`（`date '+%F %H:%M'` 记录）。来由：跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）第二批里驿窗不改代码的部分。组 12 的代码改动（`pnpm run check` 查 `src/` 下没提交的文件、E-18）在同批另一个 PR，那边要等本 PR 合并后变基。
- 改了哪些文件：
  - 常浩要求的：
    - `docs/LESSONS.md`「提升」行，编号照主会话定死的表：L-10 → G-33（L-35 并入 G-33，是同类第二例）、L-30 → G-34、L-23 → G-35、L-18 → G-36、L-09 与 L-11 → G-37、L-32 → G-40；组 13：L-29 并入 G-11、L-38 并入 G-26。PR 号先写「agent-kit#83」，主会话合并时统一替换。这几条的升级行把「待批：…提升为全局坑」改成「已批：…见下方『提升』」，层级不变。
    - 组 15 关闭（每条核过证据，见 PR）：L-02、L-03、L-06、L-45 →「〔结构〕已升级，关闭」；L-44 →「〔机检〕已升级，关闭」；L-46 →「〔提醒〕部分升级，关闭」，写明靠测试 `claude::background::tests` 守住、未接进必经检查。
    - 组 16「〔提醒〕不升级」并写理由：L-07、L-08、L-31、L-40、L-42、L-50。L-07 照积压清单第 4 节第 2 点选了不升级，理由里写了「也可以从结构上消除，改动面没评估」。
    - `.agents/skills/postpane-round/SKILL.md`：组 17 采纳 E-19（第 1 步：要改的文件正被别的分支改着时从那支接）、E-14（第 2 步：先写测试跑出红；性能不在隐藏面板里量）、E-10（第 3 步第 2 条：变基一次后不再追）、E-12（第 4 步：多张并行时子 agent 不写 CURRENT、不占坑编号、不装机）。
    - `.agents/skills/postpane-round/EVOLUTION.md`：E-10、E-12、E-14、E-19 改「已采纳（本 PR，#416）」并加「批准」行；E-16 改「已否（被 E-18 取代…）」（组 12）。
  - 顺手改的：`docs/LESSONS.md`「怎么升级」加一句「关闭」「不升级」怎么写。
  - **改变了已有行为的**：无（只改文档和 skill 文字）。`steps.json` 没改：四条 E 加的都是判断和顺序，没有新的命令痕迹（E-19 的 `git worktree list` 开工、清理都用，算进开工会把清理也数成开工）。
- 测试：改动前（origin/main `0e5083c`）`node --test tests/*.test.mjs` `ℹ pass 51` / `ℹ fail 0`，`pnpm run check` exit 0，`pnpm test` exit 0（汇总「5 套，失败 0 套」：cargo 合计 `1001 passed; 0 failed`，前端 `ℹ pass 463` / `ℹ fail 0`，MCP 9/0，插件 14/0，Chrome 插件 28/0）。改动后 `node --test tests/*.test.mjs` `ℹ pass 51` / `ℹ fail 0`（`postpane-round.test.mjs` 查 EVOLUTION 状态写法、SKILL 与 `steps.json` 对应，`check-rules` 的 lessons 规则查新升级行，都过），`pnpm run check` exit 0，`pnpm test` exit 0，各项与改动前相同。两个 PR 共用构建目录 `~/Sandbox/worktrees/postpane-b2-target`（两边 Rust 代码相同）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-b2-batch/`（`baseline-*`、`pr1-final-*`）。
- 验证：只改文档，没有界面与应用改动。组 15 每条关闭前都对着当前代码核了证据（文件、行号见 LESSONS 各条），没有对不上的。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - E-12 写的「子 agent 不写 CURRENT」和这次的做法对不上：这次主会话让子 agent 各自写交接，两个 PR 都写了 CURRENT 顶部，合并时 CURRENT 会冲突，两节都留即可。
  - L-45 关闭的「不覆盖」：主目录本机的 `.claude/launch.json`（不进仓库）还留着 `preview-243`～`preview-341` 等十几项旧脚手架的启动配置，有几项写着「用前放回 src/apps/desktop/」；按规矩不动主目录，建议常浩或下一个在主目录干活的会话删掉，只留 `scenes`。
  - 本项目没有 `docs/DECIDED.md`；本 PR 不碰界面。
  - skill 进化：E-10、E-12、E-14、E-19 已采纳，E-16 已否（本 PR）；无新 E 条目。
- 本轮新坑：无

## 积压清单 B 批：时间敏感测试固定时钟、MCP 替身预热、全量测试跑完再汇总、TS 小人导演对拍、check 按归属记录比、备环境脚本（2026-11-19，Claude 子 agent，常浩批了积压清单组 1、2、4、5；已提交、无需发布）

- 时间：开工 `2026-11-19 11:01`（`date '+%F %H:%M'` 记录）。来由：跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 1（L-12、L-17、L-47）、组 2（L-49）、组 4（E-15、E-20）、组 5（L-34、E-13）的项目内改动。依赖 PR #414（LESSONS 补层级词）：#414 合并后本 PR 要变基，LESSONS 同几行会冲突，以本 PR 的为准。
- 改了哪些文件：
  - 常浩要求的：
    - L-12：`src/crates/core/src/demo/mod.rs` 的 `a_pass_with_nothing_new_renders_nothing_until_something_changes` 改用固定时钟 `snapshot::PINNED_CLOCK`，末尾补一句「到时限照样重画」。
    - L-17：`src/crates/core/src/lib.rs`（`look`）、`source_db.rs`（记下次轮询时间）改读 `snapshot::wall_clock_ms()`（正式运行就是真实时间）；`source_db/tests.rs` 的 Grok 测试固定时钟，验「差 1 毫秒不到点、满 10 秒到点」，去掉原来把到点时间改成 0 的写法；`snapshot.rs` 注释同步。
    - L-47：`src/apps/mcp/test/host-tools.test.mjs` 替身引擎编完先单独启动一次（给 120 秒），中转等引擎的 45 秒只算请求；新增 `src/tooling/test-all.mjs`，`package.json` 的 `test` 改成它：五套依次跑完再汇总；测试 `tests/test-all.test.mjs`。
    - L-49：新增 `src/packages/hud/test/director-cases.test.ts`，TS 导演回放 `src/crates/hud/src/bots/director-cases.json`，和 Rust 那条回放同一份用例；`mark-director.ts` 经 Vite 加载（L-53）。
    - E-15、E-20：`.agents/skills/postpane-round/scripts/install-guard.sh` 加 `check_record`、`main_worktree`，`install.sh check` 不给产物路径时调它；`tests/install-guard.test.mjs` 加两条。
    - L-34、E-13：新增 `scripts/setup-worktree.sh`，测试 `tests/setup-worktree.test.mjs`；`AGENTS.md`「运行」、「结构」和 `SKILL.md` 第 1 步指向它，`steps.json` 的 start 痕迹加它。
    - `docs/LESSONS.md`：L-05、L-12、L-17、L-34、L-47、L-49 的升级行改成实际结果；`EVOLUTION.md`：E-13、E-15、E-20 改「已采纳」并写批准与落地。
  - 顺手改的：`AGENTS.md`「运行」里 `pnpm test` 那行注释补「五套都跑完再汇总」。
  - **改变了已有行为的**：① `pnpm test` 原来 `&&` 串联、一套失败后面不跑；现在五套都跑，最后打印汇总，任何一套失败整体退出码 1（以前是失败那一套自己的退出码，如 cargo 的 101）。② `install.sh check` 不给产物路径时，原来拿当前目录下的产物比；现在按归属记录比：功能 worktree 只认自己装的，主目录还认已合进 main 的，没有记录就让带产物路径；带产物路径的用法不变。③ MCP 测试每个替身多启动一次（每次零点几秒）。
- 测试：改动前（origin/main `a342c1c`）`node --test tests/*.test.mjs` `ℹ pass 43` / `ℹ fail 0`，`pnpm run check` exit 0，`pnpm test` exit 0（cargo 合计 `1001 passed; 0 failed`，前端 462/0，MCP 9/0，插件 14/0，Chrome 插件 28/0）。改动后见下一行。每项改前都在旧代码上红过一次：L-12、L-17 注入「机器忙」的延时，旧代码两条都失败、新代码同样注入两条都过；L-47 注入「替身第一次启动停 50 秒」，旧代码 45 秒后 `Cannot read properties of undefined (reading 'description')`、新代码通过；L-49 把 TS 的 failed 提示改成 limit-hit，原有前端 462 条全绿、新回放测试变红；E-15/E-20、备环境脚本、汇总脚本的新测试先在旧代码上跑出红。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-b-batch/`（`red/` 是验红，`*-baseline.log`、`*-final.log` 是全量）。
- 改动后全量：`node --test tests/*.test.mjs` `ℹ pass 50` / `ℹ fail 0`（+7：装机守卫 2、备环境 3、汇总 2）；`pnpm run check` exit 0；`pnpm test` exit 0，汇总「5 套，失败 0 套」：cargo 合计 `1001 passed; 0 failed`（改的是现有测试，条数不变），前端 `ℹ pass 463` / `ℹ fail 0`（+1 回放），MCP 9/0，插件 14/0，Chrome 插件 28/0。前两次改动后全量没过、已修：第一次 EVOLUTION 编号少写「#」，跑到生成资源就按进程号停了（`aborted-*`）；第二次 `check:file-size`（`snapshot.rs` 注释多一行，超了棘轮基线）和 `check:packages`（回放测试用 `new URL("..")` 算越出包，记进 L-53）失败，`node --test` 也因棘轮挂 1 条（`run2-failed-*`）；修好后第三次即上面的结果。
- 验证：全在测试里；`install.sh` 只在 `tests/install-guard.test.mjs` 的临时目录和替身里跑，没有对 `/Applications` 装机。
- 截图：无（没有界面改动）。
- 发布与回读：无需发布（测试、脚本和文档）。
- 与授权不一致之处、遗留问题、范围外发现：
  - L-49 积压清单目标是〔机检〕，驿窗没有必经检查，只能标〔提醒〕部分升级；`model.ts` ↔ `vendors.rs`、`stale.ts` ↔ `stale.rs` 两对没有对拍。
  - SKILL.md 第 1 步按组 5 已批改了（E-13 落地）；E-15/E-20 改做〔机检〕，SKILL.md 不用改。
  - 本项目没有 `docs/DECIDED.md`，本 PR 不碰界面。
  - skill 进化：E-13、E-15、E-20 已采纳（本 PR）。
- 本轮新坑：L-53

## LESSONS 升级行补层级词，规则检查加 lessons 规则（2026-11-19，Claude 子 agent，常浩批了积压清单组 1、2、4、5 和「LESSONS 升级行一次补齐」；已提交、无需发布）

- 时间：开工 `2026-11-19 10:47`（`date '+%F %H:%M'` 记录）。来由：跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）第 4 节：项目 LESSONS 的升级行不带〔结构〕〔机检〕〔体检〕〔文字〕〔提醒〕层级词，L-29 之后 13 条干脆没有升级行。
- 改了哪些文件：
  - 常浩要求的：`docs/LESSONS.md` 52 条全部补层级词，原文字保留（状态变了的放「原记录：」后面），缺的 13 条（L-29～L-35、L-37、L-38、L-40、L-42～L-44）新写一行；补「提升」：L-19 → G-31、L-33 → G-32、L-48 → G-30，L-49 并入 G-31，L-37 另并入 G-32（agent-kit#82）；「怎么升级」一节补层级词约定，并写明本项目没有提交前钩子和 CI，只写成测试的算〔提醒〕部分升级，`install.sh` 里必经的步骤和本机 Bash 预检钩子算〔机检〕。`scripts/check-rules.mjs` 照剪藏插件 #10 那一版加 `lessons` 规则；`tests/check-rules.test.mjs` 加一条：真实样本 L-29（缺行）、L-52（不带层级词）各报一次，借剪藏插件 L-02 的标题（反引号里 `<all_urls>`）验不被当成占位跳过，L-41 缩进的「  - 升级：」不顶替顶层那一行。
  - 顺手改的：L-48 与 L-49 之间补了一个空行。
  - **改变了已有行为的**：`node scripts/check-rules.mjs` 和 `node --test tests/*.test.mjs` 多查一项，LESSONS 新条目没有带层级词的升级行就报错。
- 测试：见 PR 正文与下面的证据目录；改动前 `node --test tests/*.test.mjs` `ℹ pass 43` / `ℹ fail 0`，`pnpm run check` exit 0，`pnpm test` exit 0（cargo `1001 passed; 0 failed`，前端 462/0，MCP 9/0，插件 14/0，Chrome 插件 28/0）。补齐前在真实 LESSONS 上跑新规则：`通用规则检查未通过：52 处`（13 条缺行、39 条不带层级词，`check-rules-red-before.log`）；补齐后 `通用规则检查通过`。变异检查：去掉「反引号里的尖括号先剥掉」，新测试变红（`mutation-no-backtick-strip.log`），还原后 `cmp` 一致。改动后：`node --test tests/*.test.mjs` `ℹ pass 44` / `ℹ fail 0`（+1），`pnpm run check` exit 0，`pnpm test` exit 0，各项与基线相同（cargo `1001 passed; 0 failed`，前端 462/0，MCP 9/0，插件 14/0，Chrome 插件 28/0）。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-lessons-levels/`。
- 验证：只改文档和规则检查，没有界面与应用改动。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 层级按条目现状选，拿不准的选低一层，列在 PR「拿不准的」。组 1、2、4、5 里 PR 2 才实现的条目（L-12、L-17、L-34、L-47、L-49）这里先标目标层级加「未升级（已批…待实现）」。
  - L-49 的目标层级是〔机检〕，但驿窗没有 CI 和提交前钩子，回放测试写好也只算〔提醒〕部分升级，PR 2 照实标，要常浩定要不要给驿窗加必经检查。
  - 本项目没有 `docs/DECIDED.md`。
  - E 条目本 PR 没动。skill 进化：无。
- 本轮新坑：无

## 装机脚本加锁和归属记录，装后自动冒烟（#401）（2026-11-18，Claude 子 agent，常浩在月度复盘后批准本批；已提交、未发布：按授权不做真实装机，冒烟未实机验证）

- 时间：开工 `2026-11-18 22:17`（`date '+%F %H:%M'` 记录）。来由：月度复盘两条——L-05 之后并行装机又互相覆盖多次（交接里记着「装前是别的会话装的包，被覆盖」），现有防线只有事后比 shasum；L-35 小人变静态图靠人眼 6 小时后才发现，`AGENTS.md`「已定内容」的「隔 2 秒截两张、和改前对比」是手工步骤。
- 改了哪些文件：
  - 常浩要求的：`.agents/skills/postpane-round/scripts/install-guard.sh`（新，被 `install.sh` source）：装机锁 `~/Library/Application Support/postpane/install/lock/`（`mkdir` 原子拿锁，`owner` 记 worktree、分支、提交、是否有没提交的改动、进程号、时间；持锁进程不在、锁超过 30 分钟、或一分钟还没写下是谁，算死锁，经 `takeover/` 小锁串行接管）；归属记录 `installed.txt`（每次装成功记来源、包的 shasum、时间、证据目录）；装前归属检查（装着的包既不是 main 构建的、也不是本 worktree 上次装的就 exit 5，写清是谁、什么时候装的，出口是确认对方的包不再需要后加 `--takeover`；「main 构建的」= 记录里没有未提交改动，且提交已在 origin/main 里或整支已 squash 合进 main）。`install.sh`：拿锁 → 查归属 → 原有的接力检查 → 备份 → 截装前侧栏 → 退出 → 覆盖 → 启动 → 回读 → 记归属 → 装后冒烟；`check` 多打一行「已装的是谁的」；新增 `--takeover`、退出码 4/5/6；`POSTPANE_INSTALL_APP` 仅供测试换安装位。`smoke.mjs`（新）：用系统窗口表找 PostPane 层级大于 0 的侧栏窗口，`screencapture -x -o -l <窗口号>` 只截侧栏窗口；装后等窗口出现、再等 8 秒加载，隔 2 秒最多截 6 张，任一张和基准差 ≥50 像素就算在动（布局变了的一对不算、换基准），写 `smoke-motion-<n>.png`；和装前 `smoke-before-<n>.png` 对比写 `smoke-before-after-<n>.png`（前 / 后 / 标红三联）；`compare` 子命令单独比两张图。`png-diff.mjs`（新）：只用 Node 自带 zlib 的 PNG 读写、像素比较、差异图。测试 `tests/install-guard.test.mjs`（12 条）、`tests/smoke-diff.test.mjs`（9 条）、替身工具 `tests/install-stubs.mjs`。
  - 顺手改的：`tests/postpane-round.test.mjs` 第 129 行注释原写「不在测试里真跑 install.sh」，现在有带替身的整体跑法，改成指向 `install-guard.test.mjs`；`docs/LESSONS.md` 加 L-52（原写 L-51，变基时 #410 已占用，改号）；`EVOLUTION.md` 加 E-22（待批；E-21 已被 #403 用掉，变基时改号）。
  - **改变了已有行为的**：① 原来两个会话可以同时跑 `install.sh`、交错执行；现在后到的直接 exit 4，打印持锁者。② 原来能直接覆盖任何人装的包；现在装着的包既不是 main 构建的、也不是本 worktree 上次装的（含不在记录里的，如旧版脚本装的、手动 ditto / 回滚过的）就 exit 5，要加 `--takeover`。第一次用（还没有记录）照装。③ 原来回读一致就 exit 0；现在还要装后冒烟通过，截不到图或小人没动 exit 6（包已经装上、归属照记，回滚命令在冒烟之前打印）。④ 装前多截一张侧栏（截不到不拦）。⑤ `check` 多一行输出。
- 测试：改动前 `node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；基线（origin/main `5967bba`）`pnpm run check` exit 0，`pnpm test` exit 0（cargo 合计 `1000 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`）。改动后：`pnpm run check` exit 0；`pnpm test` exit 0，各项与基线相同（cargo `1000 passed; 0 failed`，前端 462/0，MCP 9/0，插件 14/0，Chrome 插件 23/0）；`node --test tests/*.test.mjs` `ℹ pass 43` / `ℹ fail 0`（+21 条新测试）。没有偶发失败。本 worktree 自己的 `target`，没共用构建目录。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-401-install-guard/`（`*-baseline.log`、`*-final.log`、`node-test-pre.log`，脚本 `run-full.sh`，后台跑，L-37）。另做两次变异检查：去掉 squash 判断，对应测试变红，还原后 `cmp` 一致；并发测试断言三轮里至少一轮被锁挡下（确认两边真重叠）。
- 验证：所有装机测试都在临时目录里：HOME、安装位、git 仓库（bare origin + main + 两个 worktree）都是临时的，`osascript`、`pgrep`、`open`、`codesign`、`screencapture` 是替身，`sandbox()` 先核对替身生效才跑。**没有对 `/Applications` 跑过 install.sh，没有退出或重启驿窗。** 只读试了截图那一步：在正在运行的驿窗上跑 `smoke.mjs shot` 和 `smoke.mjs after`（不装机，只截侧栏窗口），判「在动」，1356 个像素不同、范围落在小人上；装前装后差异图把截第一张时展开着的卡片标了出来。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-18-401-install-guard/smoke-live/`（`smoke-before-1.png`、`smoke-after-1-1.png`、`smoke-after-2-1.png`、`smoke-motion-1.png`、`smoke-before-after-1.png`）。
- 发布与回读：未发布（纯脚本与测试，按授权不做真实装机）。实机验证要常浩同意后做：合并后在 main 打包，`bash .agents/skills/postpane-round/scripts/install.sh 401-install-guard`（第一次没有记录照装；之后看证据目录 `smoke-*.png`）；再从一个别的 worktree 跑一次，确认 exit 5 的提示；最后 `install.sh check`。
- 与授权不一致之处、遗留问题、范围外发现：
  - 任务说明写的路径 `scripts/install.sh` 不存在，实际在 `.agents/skills/postpane-round/scripts/install.sh`，照实际改。
  - SKILL.md 第 3 步没改：SKILL.md 第 6 步规定改它要先记 E-xx、常浩批了才改，已记 E-22 待批。`AGENTS.md`「已定内容」的手工截图要求没改。
  - 冒烟比的是整个侧栏窗口，不只是小人：侧栏里还有别的动画（如运行中的加载动画）时，小人变静态也可能被它「带过」。要只看小人，得让应用给出小人的位置（建议另开 issue）。
  - 冒烟要终端有屏幕录制权限（这台机器上 Claude 已经有，`screencapture` 能截）；锁屏、显示器休眠时截不到，退出码 6 并说明，不当成改坏了。
  - 开工时本仓库 `AGENTS.md`「分工」写「不顺手修」、全局第 3 节写可以顺手修；变基时 main 已合进 #403（改为与全局一致），不再冲突。本轮顺手改的只有上面三处。
  - skill 进化：E-22 待批。
- 本轮新坑：L-52



## 重读遇到后台标签页里没画出的回信：短暂切到前台再读（#410 续）（2026-11-19，Claude，#412 装机实测发现后台标签页不渲染，常浩切到前台验证成立，按上轮说的推荐做法补；已提交、无需发布驿窗本体，插件要重新加载）

- 时间：开工 `2026-11-19 10:18`（`date '+%F %H:%M'` 记录）。来由：#412 合并后实测，#318 那单旧接力不再误报旧回信，但回信一直没上报；常浩把那个 ChatGPT 标签页切到前台后，10:16:51 那次重读立刻 `taken`（2008 字）。ChatGPT 不在后台标签页里渲染新回信，光滚到底不够。
- 改了哪些文件：
  - 常浩要求的：`src/apps/chrome-extension/content.js`：重读时最新一轮已答、回信没画出来，回复里带 `undrawn: true`。`src/apps/chrome-extension/background.js`：收到 `undrawn` 且标签页不在前台，就把它在自己窗口里切到前台，最多再问 3 次、每次隔 1.5 秒，问到就停；然后切回原来在前台的标签页（这期间常浩自己换过标签就不动）；不把 Chrome 窗口提到最前。
  - 顺手改的：`docs/chatgpt-channel.md` 的 `reread` 一行补上 #410 两轮的做法；`docs/LESSONS.md` L-51 补「后台标签页不渲染」和「插件目录要核对」。
  - **改变了已有行为的**：重读时，回信只在后台标签页里没画出来，驿窗会把那个 ChatGPT 标签页短暂切到前台再切回。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `1001 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 28` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-410-relay-front/`。新增的后台测试先在旧代码上确认失败。
- 验证：#412 装机后在常浩的 Chrome 里实测：重新添加主目录那份插件后，#318 那单不再报旧回信；常浩手动切到前台后下一次重读 `taken`。本轮的自动切前台还没在真实接力里跑过。
- 截图：无。
- 发布与回读：只改 Chrome 插件，驿窗本体无需发布；合并后常浩在 `chrome://extensions` 重新加载驿窗插件（来源须是主目录 `src/apps/chrome-extension/`）。
- 与授权不一致之处、遗留问题、范围外发现：0E-1 第 2 轮那单（`h1a1ed39518503`）的提问是昨天旧代码拼成的「第 1 轮 + 第 2 轮」，开头对不上，新代码也认不了，要常浩手动处理；以后新发的不会再拼。skill 进化：无。
- 本轮新坑：L-51（补充）

## 接力回信认不出导致「30 分钟没回信」：读错最新一轮、代码块、输入框旧稿（#410）（2026-11-19，Claude，常浩问「驿窗超时如何根治」，看过原因与三处修法后回「按方案开工」；已提交、发布见下）

- 时间：开工 `2026-11-19 05:28`（`date '+%F %H:%M'` 记录）。来由：接力反复「ChatGPT 30 分钟没回信」，实际 ChatGPT 一两分钟就回了，`turns.jsonl` 记的是 `complete unmatched`：驿窗没认出这是这次送审的回信。三处原因见 L-51。
- 改了哪些文件：
  - 常浩要求的：
    - `src/apps/chrome-extension/page.js`：`lastPrompt` / `lastReply` / `answered` 不再取页面最后一个节点，改按单元键第一次出现的顺序定最新一轮，读它最后一份（显示的那份）；新增 `reveal` 把对话滚到底。`submit` 输入框有字先清空、等发送键灭了再粘贴，点发送前核对输入框没多出旧字，多了报 `composer-mismatch`。
    - `src/apps/chrome-extension/content.js`：重读时最新一轮已答、回信只在隐藏那份里，滚到底让它画出来，这次不报。
    - `src/apps/chrome-extension/background.js`：`composer-mismatch` 和 `send-failed` 一样把标签页提到前面再试一次。
    - `src/crates/host/src/handoff/belongs.rs`：比对提问两种归一都试（去掉代码块标记行 / 只去反引号），任一对上算这次的回信。
  - 顺手改的：无。
  - **改变了已有行为的**：插件认「最新一轮」的方式；发送前会清空输入框里已有的文字；重读时会把 ChatGPT 页面滚到底；开头带代码块的送审现在能被认领。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `1001 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 27` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-19-410-relay-unmatched/`。新增 4 条插件测试、1 条 Rust 测试，都先在旧代码上跑过、确认失败。
- 验证：Chrome 里只读打开 5 个出过事的 ChatGPT 会话核对 DOM（不发送），记录在证据目录 `page-checks.md`；把新取数逻辑注入 #318 专项复核那个会话：旧逻辑取到第 2 轮的提问和回信，新逻辑取到「专项复核」，滚到底 3 秒后它的回信（1558 字）画出来。
- 截图：无（没有界面改动）。
- 发布与回读：打包前 main 仍是 `7a4b3d9`。`tauri build --bundles app` 退出码 0；`install.sh 410-relay-unmatched`：装前 `aaa1ba79c85d`（已备份），退出于 05:49:55、启动于 05:49:55，产物 `08256f49a34b` / 已装 `08256f49a34b`，签名照常（`H"b773068e`）；应用日志无报错。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-19-410-relay-unmatched/PostPane-aaa1ba79c85d.app" /Applications/PostPane.app; open /Applications/PostPane.app`。Chrome 插件从主目录 `src/apps/chrome-extension/` 加载，合并后要在 `chrome://extensions` 重新加载一次才换上新版。
- 与授权不一致之处、遗留问题、范围外发现：「插件没能完成：timeout」（打开或发送那一步失败，83 次里 2 次）不在本轮。另提过一项兜底「回信到了但认不出时几分钟内提醒」，属新功能，常浩没说要做，未做。skill 进化：无。
- 本轮新坑：L-51

## 侧栏调整说明书（customize-agent-hud）删掉简约形态（#404）（2026-11-18，Claude，常浩问清这份 skill 是什么后回「删掉简约形态」；已提交、已发布 `aaa1ba79c85d` 回读通过）

- 时间：开工 `2026-11-18 22:34`（`date '+%F %H:%M'` 记录）。来由：#397 已让侧栏工具拒绝简约形态，但驿窗写给智能体的侧栏调整说明书还有 5 处把它当可选项。上一轮交接说这份文件「不在本仓库」是错的：源文件是 `src/crates/platform/src/hud_tools/customize-agent-hud.md`，编进应用，装侧栏工具时写进各客户端的 skill 目录，驿窗每次启动（`mcp_clients::repair_on_launch`）把旧版副本换成新版。
- 改了哪些文件：
  - 常浩要求的：`src/crates/platform/src/hud_tools/customize-agent-hud.md`：形态只列 `notch`、`dynamic`；「`dynamic` and `simple`」的 `edge`、`position` 并进「`dynamic` only」一行；删掉「`simple` only」那一行（5 个参数和用量样式说明）；光晕一节去掉「not drawn in `simple`」；单家面板截图的条件改为只要 `dynamic`。净减 2 行，全文不再出现 `simple` 形态。
  - 顺手改的：无。
  - **改变了已有行为的**：智能体读到的说明书不再列简约形态和它的参数；侧栏界面不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0（一次通过）：cargo 合计 `1000 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-404-skill-no-simple/`（`check-1.log`、`test-1.log`、`node-test-1.log`）。
- 验证：装前两份副本（`~/.claude/skills/customize-agent-hud/SKILL.md`、`~/.agents/skills/customize-agent-hud/SKILL.md`，11-09 08:16 写入）各有 5 行提到 `simple`；装机后驿窗 22:44:54 启动，22:44:56 两份都被重写，`simple` 行数 0，与仓库源文件逐字一致；应用日志没有报错（`skill-copies.txt`）。
- 截图：无（没有界面改动）。
- 发布与回读：打包前 main 仍是 `52c2be7`。`tauri build --bundles app` 退出码 0；`install.sh 404-skill-no-simple`：装前 `32a5ebaa4109`（已备份），退出于 22:44:54、启动于 22:44:54，产物 `aaa1ba79c85d` / 已装 `aaa1ba79c85d`，签名照常（`H"b773068e`）。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-18-404-skill-no-simple/PostPane-32a5ebaa4109.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：已经开着的智能体会话加载的是旧版说明书，重开会话后才读到新版；照旧版提议简约形态会被后端拒绝（#397）。废纸篓里约 19 GB 旧备份（#399）等常浩自己清空。skill 进化：无。
- 本轮新坑：无

## 项目规则改为与全局一致：看到的相关问题可以顺手修，守三条底线（#402）（2026-11-18，Claude，历史包袱清理收尾时报了规则冲突，常浩回「以全局为准，测试先不修」；已提交、无需发布）

- 时间：开工 `2026-11-18 22:29`（`date '+%F %H:%M'` 记录）。来由：项目 `AGENTS.md`「分工」和 `postpane-round`「不做」写「范围外的问题记进交接，不顺手修」，全局 `~/.claude/CLAUDE.md` 第 3 节（2026-11-10 常浩定）写「代码库归你」、可以直接修看到的相关问题。两边对不上，常浩定以全局为准。
- 改了哪些文件：
  - 常浩要求的：`AGENTS.md`「分工」前两条改写：保留「不做没要求的新功能」，改为可以直接合并重复实现、清死代码、修看到的相关问题、补测试和文档，并写明三条底线（已定内容先单独确认；改变已有行为先列出来；交付时分两栏列全部改动）和「顺手改的同样跑全量测试」。`.agents/skills/postpane-round/SKILL.md`「不做」第 3 条同步改写。
  - 顺手改的：`.agents/skills/postpane-round/EVOLUTION.md` 追加 E-21（来由、证据，状态「已采纳（本 PR，#402）」），因为 SKILL.md 改动按该文件规矩要有一条记录。
  - **改变了已有行为的**：以后在这个项目里，看到的相关问题、重复实现、死代码会直接修，交付时单列「我顺手改的」；原来只记进交接。
- 测试：纯文档改动。`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（含交接格式、通用规则、`postpane-round` 的 SKILL/EVOLUTION 格式检查）；`node scripts/check-rules.mjs` 输出「通用规则检查通过」。`pnpm run check`、`pnpm test` 未跑：没有改任何代码或脚本。
- 验证：全仓搜「顺手修」「范围外的问题」，项目规则里只剩改后的写法；`CURRENT.md` 和 `docs/history/` 里的旧交接按原样保留。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：常浩同时定「测试先不修」：`core` 的 `tests::ingestion::the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry`（高负载下 10 秒余量不够，#393 那轮碰到一次）不在本轮修，以后再出现按新规则可以顺手修。`~/.claude/skills/customize-agent-hud/SKILL.md` 还写着简约形态，常浩还没定改不改。废纸篓里约 19 GB 旧备份（#399 移过去的）等常浩自己清空。skill 进化：E-21 已采纳。
- 本轮新坑：无

## 删上游原版说明与宣传素材：`docs/upstream/` 与 videos、screenshots、badges、buttons（#399）（2026-11-18，Claude，常浩看过改动确认后选「乙：连目录一起删」；已提交、无需发布）

- 时间：开工 `2026-11-18 21:46`（`date '+%F %H:%M'` 记录）。来由：历史包袱清理（#387）第二档最后一项。2026-11-04 阶段 1-4（`2ecdc51`）把上游原版 README 移到 `docs/upstream/` 留作对照；查过上游宣传素材只被这两份 README 引用，内容多是驿窗已删的功能（iPhone、手表、Remote、简约形态），Apache 2.0 只要求留 `LICENSE`、`NOTICE`。
- 改了哪些文件：
  - 常浩要求的：删 `docs/upstream/`（`README.md`、`README.zh-CN.md`）和 `docs/videos/`（7 张动图，11 MB）、`docs/screenshots/`（11 张）、`docs/badges/`（4 个）、`docs/buttons/`（5 个），共 29 个文件约 11.5 MB。`README.md` 第 12 行改为「上游原版说明见上游仓库提交 `917df21`」并链到上游；`AGENTS.md` 结构一节去掉 `upstream/` 一行；`docs/ROADMAP.md` 1-4 补记 2026-11-18 常浩改定（#399）。
  - 顺手改的：无。
  - 改变了已有行为的：无（纯文档）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `1000 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` 交接写好后重跑 `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-399-drop-upstream/`（`check.log`、`test.log`、`node-test.log`、`node-test-2.log`）。
- 验证：`git grep` 查 `docs/upstream`、`upstream/README`、`docs/(videos|screenshots|badges|buttons)`，除 ROADMAP 1-4 的历史记述外没有引用（`docs/history/` 和 CURRENT 旧节是历史记录，不改）。
- 截图：无（没有界面改动）。
- 发布与回读：无需发布（纯文档）。
- 与授权不一致之处、遗留问题、范围外发现：主线第 9 项「磁盘清单」同轮只读做完，没删任何东西，清单见下一条。worktree（`worktree-sweep list --fetch` 加人工核对）：`353-bg-reply`、`356-chatgpt-reread` 脚本判可安全删除（838 MB）；`nostalgic-bartik-8bdeee`（#365）、`interesting-hugle-7778fb`（#360）只多一份过时的 `.claude/launch.json`，主目录那份更全；`359-board-peek` 没推送的「第 3 批之二」`0f40a3b` 已随 PR #369（`695fd5b`）进 main；`relay-inline-code`（`build/366-with-318`）的 3 个提交是 #318（PR #365）加合并提交，#366 已由 PR #367 合入。这四个人工核对后可删（约 1.7 GB）。保留：`347-review-gate`（PR #348 开着，10.8 GB）、`codex-audit-fix-1112`（PR #315 开着）。证据目录 21 GB，其中 187 个装机备份 `.app` 共 19.7 GB；只留最近 5 个（397、395、391、384、318-r4），其余 182 个共 19.2 GB 可移到废纸篓；次大的是 `2026-11-05-panel-inventory` 974 MB（帧截图）。删不删、删哪些等常浩逐项定。skill 进化：无。
- 磁盘清理结果（合并后，常浩经侧栏回「删甲乙，丙不动」，与给出的按钮一致）：甲，6 个 worktree 都删了（`353-bg-reply`、`356-chatgpt-reread` 用 `worktree_sweep.py sweep --confirm`；另外 4 个用 `git worktree remove`，都没加 `--force`），本地分支一并删掉，找回命令在 `~/.cache/worktree-sweep/sweep-20261118-215601.json` 和 `evidence/2026-11-18-disk-sweep/branches-removed.txt`，远端没动；两份旧 `launch.json` 备份在同一目录。乙，182 个旧备份 `.app` 移到废纸篓 `~/.Trash/postpane-备份-2026-11-18/`（19 GB，0 个失败，清单 `trashed.txt`，留下的 5 个见 `kept.txt`），证据目录从 21 GB 降到 2.2 GB；废纸篓没清空，空间要常浩清空废纸篓后才真正腾出。丙不动。剩下的 worktree：`347-review-gate`、`codex-audit-fix-1112`。
- 本轮新坑：无

## 侧栏工具不再能切到简约形态：只堵入口，渲染代码不动（#397）（2026-11-18，Claude，常浩看过改动确认后回「乙 只堵入口」，中途交接卡没能远程启动，常浩回「继续在这里做完 #397」；已提交、已发布 `32a5ebaa4109` 回读通过）

- 时间：开工 `2026-11-18 21:10`（`date '+%F %H:%M'` 记录）。来由：历史包袱第二档（#387 的后续）。设置页 2026-11-05（#66 / PR #67）已去掉「简约」形态，但侧栏工具（MCP「agent-hud」的 `draft_hud`）仍接受 `mode: "simple"`，智能体被要求改侧栏时可能把它切回来。
- 改了哪些文件：
  - 常浩要求的：`src/crates/hud/src/presentation/style_rules.rs` 的 `MODES` 去掉 `simple`（所有入口都经过这一层）；没有刘海时的提示从「可以用 dynamic 或 simple」改为只推荐 dynamic；只在简约形态生效的参数（`simpleSize`、`simpleGap`、`ringWidth`、`simpleStyle`、`showNumbers`）被提议时，拒绝文字改由 `src/crates/hud/src/presentation/simple_style.rs` 新函数 `refusal` 生成，说「别填：驿窗已不提供简约形态」，不再叫人切到 simple。`src/apps/mcp/src/index.ts` 的 `mode` 枚举去掉 `simple`。
  - 顺手改的：`tool_tests.rs` 改一条旧断言（没刘海的提示），原来「简约形态不画光晕」那条移到新测试 `a_screen_saved_as_simple_keeps_its_rules`（存为简约的屏幕照旧拒光晕、照旧能调 `simpleSize`、能切回 dynamic）；新增 `the_simple_hud_is_no_mode_to_propose`。拒绝文字挪进 `simple_style.rs` 是为了守 300 行棘轮：第一版直接写在 `style_rules.rs` 里，从 719 行涨到 728 行，`check` 和 `check-file-size.test.mjs` 因此失败；挪走后降到 717 行，基线已 `--update`。
  - **改变了已有行为的**：智能体经侧栏工具提议简约形态、或在非简约屏幕上提议简约专用参数，原来前者会被接受，现在都被拒绝。设置页和侧栏显示不变；已存为简约形态的屏幕（本机两块屏幕都是动态，没有）照旧显示。
- 测试：第一次全量 `pnpm run check` 退出码 1（`check-file-size`：`style_rules.rs` 728 行超基线 719），`pnpm test` 退出码 0（cargo `1000 passed; 0 failed`），`node --test tests/*.test.mjs` `ℹ pass 21` / `ℹ fail 1`（同一个棘轮）。修好后最终版本：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `1000 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-397-no-simple/`（`check-1.log`、`test-1.log`、`node-test-1.log` 是第一次，`check-2.log`、`test-2.log`、`node-test-2.log` 是最终版）。
- 验证：实机（装机后）经 MCP `draft_hud` 对内屏 `37D8832A` 提议两次：`{"mode":"simple"}` 返回 `Nothing was changed. hud.mode is one of "notch", "dynamic".`；`{"simpleSize":30}` 返回 `... would be "dynamic". Leave it out: PostPane no longer offers the "simple" HUD.`。本会话的 MCP 连接是装机前起的旧进程（参数定义仍含 simple），所以两次都穿过了旧的参数校验，由新应用的后端规则拒绝，验的正是最终那一层；新包里 `agent-hud-mcp` 的参数定义已是 `enum(["notch", "dynamic"])`。之后读 `presentation.json` 两块屏幕仍是 `logos`，数据目录 21:30 有更新，应用日志没有报错（`draft-hud-check.txt`）。渲染代码没动，没有做截图对比。
- 截图：无（没有界面改动）。
- 发布与回读：打包前 main 仍是 `2713381`。`tauri build --bundles app` 退出码 0；`install.sh 397-no-simple`：装前 `4d81bf2fb2ca`（已备份），退出于 21:29:46、启动于 21:29:46，产物 `32a5ebaa4109` / 已装 `32a5ebaa4109`，签名照常（`H"b773068e`）。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-18-397-no-simple/PostPane-4d81bf2fb2ca.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：本机 `~/.claude/skills/customize-agent-hud/SKILL.md` 第 82、85、87、89 行仍写着 `simple` 形态和它的参数，它不在本仓库（也不在 `my-skills`），没改；智能体照它提议会被拒并看到说明，要不要改那份文档由常浩定。已经开着的智能体会话里的 MCP 连接是旧进程，参数定义还含 simple，重开会话后才换新，但后端照样拒绝。历史包袱清理的第二档还剩一项要单独确认：`docs/upstream/` 与上游宣传素材。skill 进化：无。
- 本轮新坑：无

## 删更新通知链：设置「更新」页、托盘「发现新版本」、面板页脚更新箭头（#395）（2026-11-18，Claude，常浩看过改动确认后回「甲 只删更新链路」；已提交、已发布 `4d81bf2fb2ca` 回读通过）

- 时间：开工 `2026-11-18 14:38`（`date '+%F %H:%M'` 记录）。来由：历史包袱第二档（#387 的后续）。更新通知只能由产品扩展发出，驿窗启动时传的扩展是空的（`main.rs` 传 `None`），这条链永远走不到。扩展口本身还被接力（`Flight`）、互发消息（`Delivery`）和 MCP 工具通道在用，按常浩选的甲不动。
- 改了哪些文件：
  - 常浩要求的：删 `src/packages/app/src/settings/UpdatesPane.tsx`；`src/packages/app/src/App.tsx` 去掉 `updates` 页定义、`hiddenPages` 里的 `updates`、渲染判断里的 `updates` 和不再用的 `Download` 图标；`SettingsPanes.tsx` 去掉对应分支；`src/crates/host/src/tray.rs` 去掉 `tray-update` 菜单项、点击处理、托盘状态里的 `update` 和 `project` 的 `update` 参数；`src/crates/host/src/coordinator.rs` 去掉通知状态、`UPDATE` 标志、`update_notice`、`current_notice`、`open_update_page`、`hud_update_notice`、`open_update` 和发 `hud:update` 那段；`src/crates/host/src/lib.rs` 去掉两条命令登记和扩展口上下文里的 `update`；`src/crates/host/src/extension.rs` 去掉 `UpdateNotice`、`ShowUpdate` 和 `HostContext.update`；`src/packages/hud/src/model.ts` 去掉 `HUDUpdateNotice`；`HUDScene.tsx`、`HoverPanel.tsx`、`src/packages/app/src/HUDSurface.tsx` 去掉页脚更新箭头和一路传下来的 `update` / `onUpdate`，以及跟着不再用的 `CircleArrowDown`、`motion` 导入。
  - 顺手改的：`coordinator.rs` 开头说明去掉「the product's update notice」；它的测试 `callbacks_before_the_window_worker_starts_keep_their_initial_facts` 去掉通知那半、保留快照不被降级的断言；托盘测试 `an_update_notice_redraws_the_menu` 随功能删掉；`file-size-baseline.json` 收紧（`coordinator.rs` 降到 300 行以下出了基线，`tray.rs` 454→436、`App.tsx` 1022→1012、`HUDSurface.tsx` 713→684、`HUDScene.tsx` 1459→1438、`HoverPanel.tsx` 605→552、`model.ts` 337→330）。
  - **改变了已有行为的**：无可见变化。设置「更新」页本来就藏着；托盘「发现新版本…」和页脚箭头只在有通知时出现，而驿窗从来发不出通知。
- 测试：`pnpm run check` 退出码 0。`pnpm test` 退出码 0（新 worktree 首轮一次通过）：cargo 合计 `998 passed; 0 failed`（比上一轮少的 1 条是删掉的托盘测试），前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`。`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-395-update-notice/`（`check-1.log`、`test-1.log`、`node-test-1.log`）。
- 验证：
  - 场景预览台：改前用主目录（`53092f9`，和本分支同一基点）、改后用本 worktree，各量三处面板页脚的 outerHTML：暗色 `all-running`、`claude-many-asks` 都是 len 3018 / hash 600255833，浅色 `hermes-desks` 是 len 3013 / hash 804948324，改前改后逐字一致，按钮都只有「设置 / 用量统计」；控制台没有报错（`footer-compare.txt`）。
  - 实机（装机后）：MCP 截面板，页脚仍是「设置 / 统计 ↗」，版面和改前（`00-panel-before.png`）一致；真实屏幕隔 2 秒截两张侧栏（`01-strip-a.png`、`02-strip-b.png`），Claude 头上的问号、Codex 的鼻涕泡、DeepSeek 的水泡都在变，小人是动的，两个挂件都在（L-35）；数据目录 21:05 有更新，应用日志没有报错。MCP 的离屏截图（`show: hud`）两次一样，它画的是静态帧，不能用来判断动没动。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-18-395-update-notice/`：`00-panel-before.png`（改前面板）、`01-strip-a.png`、`02-strip-b.png`（改后真实屏幕右侧侧栏，已裁掉别的窗口）。
- 发布与回读：打包前 main 仍是 `53092f9`。第一次打包在会话重启时被中断（`build-1.log` 里 `Command was killed with SIGTERM`），没有产出；重打 `build-2.log` 退出码 0。`install.sh 395-update-notice`：装前 `2fd869f9082b`（已备份），退出于 21:04:59、启动于 21:04:59，产物 `4d81bf2fb2ca` / 已装 `4d81bf2fb2ca`，签名照常（`H"b773068e`）；合并前 `install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-18-395-update-notice/PostPane-2fd869f9082b.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：设置页分组里的 `about` 现在没有自带页面了（`updates` 原本是它唯一的一页，本来就藏着），分组定义没动，扩展页面默认还会落到这一组。`model.ts` 里 `HUDConfig` 上方有一段讲「Per-screen placement」的注释原本就摆错了位置，没动。第二档还剩两项要单独确认：简约形态代码、`docs/upstream/` 与宣传素材。skill 进化：无。
- 本轮新坑：无

## 修偶发失败的引擎客户端测试：替身引擎启动慢时第二个被当成第一个（#393）（2026-11-18，Claude，常浩回「修偶发测试」；已提交、无需发布）

- 时间：开工 `2026-11-18 14:05`（`date '+%F %H:%M'` 记录）。来由：#389、#391 两个新 worktree 的首轮 `pnpm test` 都在 `src/packages/engine-client/test/late-output.test.ts` 失败，46 秒后 `Engine request timed out`，重跑都过。#391 那一轮查出原因并复现，常浩让修。
- 改了哪些文件：
  - 常浩要求的：`src/packages/engine-client/test/late-output.test.ts`。原来靠标记文件分「第一个 / 第二个」替身引擎，替身的启动算在要验的 1.5 秒超时里；启动一慢，第一个还没写标记就被杀，第二个被当成第一个、不回话。现在第一个替身先回一次话表示已启动（这一步给 60 秒），之后才开始计 1.5 秒；第二个的回话也给 60 秒。要验的东西没变：超时后旧引擎晚到的半行不能混进新引擎的缓冲。
  - 顺手改的：`docs/LESSONS.md` 的 L-48 下补记这次再现和「用标记文件分角色的替身，要先确认第一个真的跑起来了」。
  - **改变了已有行为的**：无（只改测试）。
- 测试：`pnpm run check` 退出码 0。`pnpm test` 第一次退出码 101：cargo `496 passed; 1 failed`，失败的是 `core` 的 `tests::ingestion::the_next_pass_is_due_at_the_folder_walk_or_a_failed_reads_retry`（`ingestion.rs:710`，断言下一次扫目录在 290–300 秒后，实测 `273.253120375s`），前端几组因此没跑；当时 `uptime` 负载 62–70，另一个会话在 `347-review-gate` 跑测试。完整重跑退出码 0：cargo `999 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；重跑开始时负载 62、结束时 24。`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-393-late-output/`（`check-1.log`、`test-1.log`、`test-2.log`、`node-test-1.log`）。
- 验证：四项，都在本 worktree。① 正常连跑 3 次全过（2.0、2.5、6.1 秒，当时后台在编译）。② 临时撤掉 #351 B14 的修复（`git show 110f321 -- src/packages/engine-client/src/index.ts | git apply -R`），测试失败并报 `Engine returned an invalid protocol frame`，说明没有变成空过；随后 `git checkout` 恢复。③ 两个替身启动前都忙等 2 秒（旧写法必败），通过，6.6 秒（`slow-start-fixed.test.ts`）。④ 边批量新建并执行程序边连跑 20 次（`load-393.sh`），20 过 0 败，耗时 1.9–5.6 秒，其中多次启动超过 1.5 秒；压测进程已确认没有残留。
- 截图：无。
- 发布与回读：无需发布（只改测试和文档）。
- 与授权不一致之处、遗留问题、范围外发现：`core` 那条 `the_next_pass_is_due_...` 是另一种对时间敏感的断言（留 10 秒余量，机器负载 60 以上时一次快照就能超过），这次只碰到一次、重跑通过，没改，再出现建议把窗口放宽或改成注入时钟。同目录的 `utf8-chunks.test.ts` 也用替身脚本，但没有短超时，不受影响。历史包袱清理的第二档还剩三项要单独确认：更新链路与扩展口、简约形态代码、`docs/upstream/` 与宣传素材。skill 进化：无。
- 本轮新坑：无（L-48 再次出现，已在该条下补记）

## 删数据目录迁移：数据目录固定为 `app.postpane.mac`，启动时不再看旧目录（#391）（2026-11-18，Claude，常浩看过改动确认后回「甲 只删目录迁移」；已提交、已发布 `2fd869f9082b` 回读通过）

- 时间：开工 `2026-11-18 13:31`（`date '+%F %H:%M'` 记录）。来由：历史包袱第二档（#387 的后续）。迁移是阶段 2 的交付物，11-04 已搬完；之后它每次启动仍把旧目录 `app.agenthud.mac` 里驿窗没有的文件并进来，新目录没锁时还会直接改用旧目录。排查发现 11-08 深夜另一个会话用演示模式跑过下载的上游 0.6.0 应用，往旧目录写了演示数据（这次没并进来，只因为同名文件驿窗都有）。旧目录已于当天 13:19 移到 `evidence/2026-11-18-agenthud-old-data-folder/`。
- 改了哪些文件：
  - 常浩要求的：`src/crates/platform/src/data_folder.rs` 去掉 `resolve`、`earlier`、`adopt`、`merge` 和三个系统的旧目录名，只留目录名和锁文件名；`src/crates/platform/src/lib.rs` 的 `data_dir` 直接取自己的目录，去掉 `earlier_data_dir`、`adopt_earlier_data`；`os/{macos,linux,windows}/mod.rs` 去掉 `EARLIER_FOLDER`；`src/crates/runtime/src/lib.rs` 的 `claim_collector` 不再调迁移；`docs/ROADMAP.md` 阶段 2 补记。
  - 顺手改的：`data_folder.rs` 新增测试 `another_apps_folder_beside_it_is_neither_used_nor_touched`（旁边有 `app.agenthud.*` 且自己还没锁时，仍用自己的目录、不动对方文件）；原来 4 条迁移测试随代码删掉；`file-size-baseline.json` 跑了一次 `--update`（没有变化）。
  - **改变了已有行为的**：启动时不再把 `~/Library/Application Support/app.agenthud.mac` 里的文件并进数据目录；新目录没有锁文件时也不再改用旧目录。原来两样都会做。从上游 Agent HUD 换到驿窗不再自动搬数据。旧版 Swift 应用的偏好与额度库导入没动。
- 测试：`pnpm run check` 退出码 0。`pnpm test` 第一次退出码 1：cargo 合计 `999 passed; 0 failed`（比上一轮 1002 少 4 条迁移测试、多 1 条新测试），前端 `ℹ pass 461` / `ℹ fail 1`，失败的仍是 `engine-client/test/late-output.test.ts`，46 秒后 `Engine request timed out`。完整重跑退出码 0：cargo `999 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`。`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-391-data-folder/`（`check-1.log`、`test-1.log`、`test-2.log`、`node-test-1.log`）。
- 验证：实机（装机后）。数据目录 `app.postpane.mac` 的 `instance.lock` 14:01:00、`ingestion.sqlite` 14:01:06 更新；`app.agenthud.mac` 没有被重新建出来；经 MCP `hud_sessions` 读运行中的应用，14:01:28 出数：93 个会话、本会话显示在跑、11-12 以来每天的用量都在；应用日志近 2 分钟没有报错。没有截屏看文稿权限弹窗：L-06 的表现是数据线程卡住出不了数，这次在出数。
- 截图：无（没有界面改动）。
- 发布与回读：打包前 main 是 `1c16f4b`，没有别的提交。`tauri build --bundles app` 退出码 0；`install.sh 391-data-folder`：装前 `e8cd0d31fe20`（已备份），退出于 14:00:59、启动于 14:01:00，产物 `2fd869f9082b` / 已装 `2fd869f9082b`，签名照常（`H"b773068e`）。回滚：`osascript -e 'quit app "PostPane"'; ditto "$HOME/Library/Application Support/postpane/evidence/2026-11-18-391-data-folder/PostPane-e8cd0d31fe20.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：`late-output.test.ts` 这次查了原因并复现（`late-output-slow-start-repro.test.ts`，在证据目录）：测试靠一个标记文件区分「第一个引擎」和「第二个引擎」，第一个替身引擎启动慢于 1.5 秒时还没写标记就被超时杀掉，第二个被当成第一个、不回话，45 秒后超时。新 worktree 首轮全量测试两次都碰到，重跑都过。这是 L-48 在另一条测试上再次出现，没在本轮修，建议另开一张按 L-48 的做法改（起替身给足时间，要验的截止单独设短）。`~/Sandbox/2026-11-08-agent-hud-open/release/Agent HUD.app` 还在，别直接双击（会和驿窗抢钩子锁）。第二档还剩三项各自要单独确认：更新链路与扩展口、简约形态代码、`docs/upstream/` 与宣传素材。skill 进化：无。
- 本轮新坑：无（`late-output.test.ts` 超时是 L-48 再次出现）

## 删上游对照台账与 Swift 对照工具，留格式用例（#389）（2026-11-18，Claude，常浩看过改动确认后回「甲 删台账留用例」；已提交、无需发布）

- 时间：开工 `2026-11-18 12:58`（`date '+%F %H:%M'` 记录）。来由：历史包袱第二档第一项（#387 的后续）。台账是上游把 Swift 原生版移植到 Tauri 时的工作底稿，目标是追平 Swift 版 `014524c`；驿窗 11-04 已定不再同步，14 天里未追平数一直是 494，检查只验总表算术。
- 改了哪些文件：
  - 常浩要求的：删 `docs/parity/`（15 个文件、1,220 条）、`src/tooling/parity-ledger.mjs`、`src/tooling/parity-oracle/`；`package.json` 的 `check` 去掉台账一步，去掉 `parity:ledger`、`parity:oracle` 两个脚本；`src/fixtures/parity/README.md` 重写成「格式回归用例」的说明，358 条用例、`decisions.json` 和两份测试没动；`AGENTS.md`「改小人」改指 `src/packages/hud/src/bots/`、`src/crates/hud/src/bots/` 和各小人的测试，结构一节去掉 `parity/` 一行；`docs/ROADMAP.md` 第 38 行补记这次改定；`docs/accounts.md` 把台账里那段 Antigravity 账户调查（31 行）原样接到文末、链接改指文内；`docs/development.md` 两处台账链接改成说明。
  - 顺手改的：`docs/upstream/` 两份上游说明里指向台账的 4 个链接改成纯文字或去掉（不然是断链）；`src/packages/hud/src/HUDScene.tsx` 去掉一行指向不存在的 `docs/parity-audit.md` 的注释，`file-size-baseline.json` 跟着从 1460 收到 1459。
  - **改变了已有行为的**：应用行为无。开发流程上 `pnpm run check` 少了台账计数这一步（原来 0.18 秒，只核对总表数字）。
- 测试：`pnpm run check` 退出码 0。`pnpm test` 第一次退出码 1：cargo 合计 `1002 passed; 0 failed`，前端 `ℹ pass 461` / `ℹ fail 1`，失败的是 `src/packages/engine-client/test/late-output.test.ts`「an old engine's late output leaves the new engine alone」，46 秒后报 `Engine request timed out`，后面三组因此没跑。紧接着单独重跑前端四组，退出码 0：前端 `ℹ pass 462` / `ℹ fail 0`（那一条 1.8 秒通过），MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`。合并前 `pnpm test` 完整再跑一遍，退出码 0：cargo 合计 `1002 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP 9、插件 14、Chrome 插件 23 均 `ℹ fail 0`。`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-389-parity-ledger/`（`check-1.log`、`test-1.log`、`test-2-frontend.log`、`test-3.log`、`node-test-1.log`）。
- 验证：删前逐行看了驿窗自己写进台账的 8 行（c04 第 88 行、c05 第 20 / 22 / 23 行、c06 第 92 / 94 行、c08 第 50 / 51 行），内容在归档交接的 #43、#45、#47、#52、#57 各节都有，没有要挪的；删后全仓搜 `docs/parity`、`parity-ledger`、`parity-oracle`，只剩 ROADMAP、`development.md` 的说明文字和历史交接里的记载。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：`late-output.test.ts` 第一次超时、重跑通过，这次没改引擎和它的客户端，第一次是紧跟着整仓从头编译跑的，原因没查，只出现这一次所以没记成坑，再出现要查。第二档还剩四项，每项要单独发改动确认：② 更新链路与扩展口 ③ 简约形态代码 ④ `docs/upstream/` 与宣传素材 ⑤ 旧数据迁移与旧版 Swift 应用导入（动之前先查清旧数据目录 `app.agenthud.mac` 为什么 11-08～09 又出现）。skill 进化：无。
- 本轮新坑：无

## 接力还没回信就出错也通知发起会话：打不开、重启中断、30 分钟没回（#318）（2026-11-12 开工、11-14 续做，Claude，常浩在 #316 收尾时回「接着做」，看完计划回「按计划开工」；已提交；11-18 新会话按第 1 轮审查返修完，3 条 P2、3 条 P3 全修，常浩看完返修计划回「按计划开工」；装机与第 2 轮复审见本节末尾；第 2 轮判「决策升级」，常浩选「甲：两条都修再专项复核」；专项复核「通过」，已 squash 合并）

- 时间：开工 `2026-11-12 12:50`。来由：#316（PR #317）之后回信到了的终局都会转回发起会话，但还没回信就出的错仍只停在侧栏：新会话打不开（当场失败 / 2 分钟没打开 / 驿窗重启时还在打开）、ChatGPT 30 分钟没回信。
- 改了哪些文件：
  - `platform/src/clients/chatgpt/handoffs.rs`：`Handoff` 加 `told`（已通知过的出错步序号，空时不写）；挂上新模块。
  - `platform/src/clients/chatgpt/handoffs/notice.rs`（新）：`Trouble`（打不开 / 没回信）、`Book::untold(since, no_answer)`（最新一步是出错、发生在驿窗启动之后、还没通知过）、`Book::told`（记下已通知，在那一步的说明和 `halt` 末尾补去向）。
  - `host/src/handoff/notice.rs`（新）：`Desk::tell` 先跑超时检查，再逐个通知：走转回同一条通道，id `<接力>-n<步序>`，送不进去排队，不后台续接；通知文字写出了什么错、接力状态、会话该做什么（不要自己重送、向常浩说明；打不开的等常浩点重试；没回信的，之后回信照常收，工程审查的「通过」照常自动转回，思维评审要常浩点）。
  - `host/src/handoff.rs`：`Desk` 记启动时间 `since`（之前的出错不补发）；超时检查抽成 `late`；快照（`projection(app, desk)`）里调 `tell`。新增 4 条测试，测试用 `desk()` 把 `since` 设 0。
  - `apps/mcp/src/index.ts`（工具说明）、`docs/chatgpt-channel.md`、`docs/安装与使用.md`：同步。
  - 侧栏不加新行、不加动画：本想加一种新步骤，发现失败类步骤会触发纸飞机下落动画（已定内容），改为只在原来那一行说明末尾补「已告诉 Claude / 已排进 Claude 会话的待发送队列 / 没能告诉 Claude：原因」。
- 测试：11-12 第一次全量跑到一半，会话中断时进程被杀（日志停在 platform 测试中途，已跑完的 Rust 683 条全过），不算数。11-14 变基到 main `b0557d3`（中间合进 #356 接力重读、重启后自动往返接着跑等 27 个提交；`handoff.rs`、`CURRENT.md` 冲突两边都保留，核对 main 原有 71 条接力测试一条不少）后重跑：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `989 passed; 0 failed`，前端 `ℹ pass 452` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-14-318-{check,test}.log`。变基后顺手改：Codex 会话收到的「没回信」通知里按钮名写成「转回 Codex」（卡上就叫这个）。
- 验证：单测覆盖打不开（当场失败、2 分钟超时、重试后再失败再通知一次）、重启中断（通知；启动前的旧出错不补发；再重启不重发）、30 分钟没回（通知一次、`halt` 带去向、迟到的「通过」照常收并自动转回结束；思维评审文字不同）、送不进去排队、排队也失败（说明原因、不反复重试）、Codex 会话进它自己的队列且卡上写 Codex。
- 截图：无（只改了已有那一行的说明文字）。
- 发布与回读：`a4f1a3f5e3f5`（本分支 `12e04be`，含 main `b0557d3`），`install.sh` 回读一致、签名证书照常；装前没有开着自动往返的接力。启动 20 秒后查 `handoffs.json`：63 张旧接力 `told` 全空，没给旧单补发；应用日志无报错。回滚到本轮之前：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-318-error-notice/PostPane-d7a5344be952.app" /Applications/PostPane.app; open /Applications/PostPane.app`。没截屏查「想访问文稿」弹窗（未做）。
- 送审：L2，接力 `h1a1d99b32c700`。ChatGPT 18:39 已答完（5421 字），但被 #356 的匹配规则判成别的提问（原文前 600 字有 12 个反引号），19:00 按「30 分钟没回信」停下——**#318 实机第一次触发**，本会话收到了通知，卡上那行补了「；已告诉 Claude」。另一次实机触发：19:44 digital-twin 一单思维评审（`h1a1d9debdaf01`）打不开，卡上为「ChatGPT 插件没能完成：timeout；已告诉 Claude」。误判由别的会话在 #366（PR #367，main `0dc0ba5`）修了（比对去反引号）。
- 合并 main：Auto-fix 报 PR 与 main 冲突，按授权 `git merge FETCH_HEAD`（`df4170c`），只冲突 `CURRENT.md`（两节都留）；合并后接力测试 `76 passed; 0 failed`。合并后没重跑全量（未做）。
- 第二次装机：`c4501330017c`（`df4170c`，含 main 的 #366 和本 PR），装前已装的是 #366 会话装的 `55b028cf8046`，回读一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-318-error-notice-r2/PostPane-55b028cf8046.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 审查现状（22:30）：`h1a1d99b32c700` 仍是 open / working、自动往返已停；重读要 Chrome 插件在线，19:51 之后一次都没重读（插件没连上），所以 #366 的修复还没机会收下这份回信，审查结论尚未拿到。注意：main 合进的 #368「接力闲置 24 小时自动结束」会在约 11-15 19:00 结束这单，结束后不再重读，要在那之前拿到结论。更新（11-15 07:42）：03:30 Chrome 插件连上后驿窗重读、按 #366 收下回信（`taken`，#366 实机生效），第 1 轮「审查出口：返修 / 结论：需修改」，无 P0/P1；自动往返已停，按设计没有自动转回，本会话从 `handoffs.json` 直接读的。要本轮修的 P2：P2-01「打不开」通知断言「不会有回信」过度（迟到的 opened 仍可恢复）；P2-02 `since` 每次启动重置，上一进程里新出错、还没通知就重启的会永久丢；P2-03 发送前没二次核对状态，常浩同时重试或继续自动时会收到过期指示。可顺手修的 P3：P3-01 只看最新一步会漏（超时 Stop 后又追加无关 Fail）；P3-02 用本地化文字认 NoAnswer 脆弱；P3-03「已告诉 Claude」措辞强于送达保证。L2 还剩 1 轮。返修未做（上下文过半，待新会话）。
- 返修（11-18 开工 `2026-11-18 11:12`，新会话接手；提交 `3862617`、`c838da2`、`7bcf7d5`、`71e76e8`）：
  - P3-01、P3-02（`3862617`）：`Step` 加结构化标记 `cause`（`notOpened` 由 `failed` 写、`noAnswer` 由 `overdue` 写），新增 `Handoff::untold`：认最近一条带标记、之后只追加过 `fail`、状态还停在那里的步；不再拿说明文字比对。红测 `a_failure_after_the_stop_does_not_hide_it`、`a_stop_is_known_whatever_the_language` 先红后绿；`trouble_moved_on_from_is_not_told` 守住回信、继续自动之后不补发。顺手：`replied` 里的 `Step` 字面量改用 `..Step::new`，省掉 platform `handoffs.rs` 行数（上限 1583，现 1574）。
  - P2-02（`c838da2`）：通知起点 `notices_since` 存进 `<数据目录>/chatgpt/notices.json`，新版第一次启动时写下、之后沿用；`Desk.since` 取它。红测 `trouble_a_stop_left_untold_is_told_after_the_restart`（出错存盘、没通知就重启 → 补发一次，再重启不重发）先红后绿。AGENTS.md「AI 接入」的写到哪里补上这个文件；设置页那一栏原本就只列 `handoffs.json`，没改。
  - P2-03（`7bcf7d5`）：`tell` 拆出 `tell_one`，占住 `claim` 后按当前状态再算一遍，和候选不一致就不发；「重试」「继续自动」也先占 `claim`（继续自动在 `drive` 之前放掉）。红测 `trouble_moved_on_from_before_it_is_told_is_not_told` 先红后绿。**行为变化**：通知正在发的那一瞬间点这两个，会提示「上一段还在送，等它送完再试。」，和「结束接力」原来一样。
  - P2-01、P3-03（`71e76e8`）：打不开的通知改为「驿窗没能确认 ChatGPT 审核会话已打开……目前记为失败，先别等它的回信。Chrome 插件之后若报来打开成功，驿窗会接回这次接力，回信照常转回这里」；侧栏后缀「已告诉 Claude」改「已发到 Claude 会话」，「没能告诉 Claude」改「没能通知 Claude」（常浩确认计划时同意）。红测 `an_opening_told_of_that_comes_late_still_carries_on`（超时 → 通知 → 迟到 opened → open → 「通过」转回并结束）先红后绿。接回后不另发通知（审查说不需要）。
  - 文档：`docs/chatgpt-channel.md` 那一段改写；`docs/安装与使用.md`、MCP 工具说明原文仍准确，没改。
- 返修测试：`pnpm run check` 退出码 0；`pnpm test` Rust 合计 `998 passed; 0 failed`，前端 `ℹ pass 463` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`；最后一组 Chrome 插件 `ℹ pass 3` / `ℹ fail 20`，报 Playwright 浏览器不存在，`~/Library/Caches/ms-playwright/` 整个没了，照 L-16 补装 `chromium-headless-shell` 后重跑 `pnpm run test:extension` `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-18-318-r1-{check,test,playwright-install,test-extension,node}.log`。
- 第 2 轮复审（11-18，接力 `h1a1ecb8e84700`，HEAD `53ca8c8`）：P2-01、P2-02、P3-01、P3-02、P3-03 关闭；P2-03 只关了一部分（插件报来的迟到打开、回信经 `observe` 改账本，不受 claim 管）；新增 P2-04（同一会话已开新接力，旧接力的打不开通知照发）。审查出口「决策升级」。我核实两条都属实：`listen` 线程调 `observe`；失败的接力不算 live，`begin` 不关它。常浩选「甲：两条都修再专项复核」。
- 第 2 轮返修（提交 `38b3bca`、`210eab2`）：
  - P2-04（`38b3bca`）：`Book::untold_of(id, since)` 先查 `superseded`，`untold` 和 `tell_one` 的复核都走它。红测 `trouble_of_a_handoff_handed_over_again_is_not_told` 先红后绿。
  - P2-03（`210eab2`）：`Desk` 加 `telling` 计数和 `told_out` 条件变量；`change()`、`late()`、`start` 里的 `expire` 改账本前先 `quiet()`，有通知正在发就等它发完；`tell_one` 占住 claim 后 `Telling::begin`，复核到发完都挡着别的改动，发完放开再记 `told`，然后 `caught_up(对话)`，把这期间被 `turn_waits` 压进暂放区的回合补收。这一步修掉了第 1 轮给通知加 claim 时带进来的问题：通知发送期间到的回信会卡在暂放区，要等下一次往这个对话发话才被收下。第 1 轮给「重试」「继续自动」加的 claim 拿掉，改为等通知发完再生效（不再提示「上一段还在送」，回到原来的体验）。新测 `Held` 替身（`reply` 卡住直到放行）加 `while_told`：`an_opening_reported_while_its_failure_is_told_waits_for_it`、`an_answer_that_comes_while_no_answer_is_told_waits_for_it`、`a_retry_while_its_failure_is_told_waits_for_it`，修前前两条红（状态被改成 Open、回信卡在暂放区）；修后临时拿掉补收或加闸，对应测试都会变红；三条连跑 20 遍 20 过。
  - 没做：审查的 P3 建议（`overdue` 的 late 集合直接带结构化原因），审查说不卡合并，留着。
- 第 2 轮返修测试：`pnpm run check` 退出码 0；`pnpm test` Rust 合计 `1002 passed; 0 failed`，前端 `ℹ pass 463` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`；Chrome 插件组 `ℹ pass 3` / `ℹ fail 20`，Playwright 缓存一小时内又被清掉（L-16），补装后 `pnpm run test:extension` `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-18-318-r2-*.log`。
- 装机：`e8cd0d31fe20`（`745966b`），`install.sh` 回读一致；`notices.json` 沿用 `1794972821711`，74 张接力没有补发；截屏无权限弹窗。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-18-318-error-notice-r4/PostPane-673afe926468.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 专项复核（常浩授权，`extra` 写明「只复核 P2-03、P2-04」，同一接力 `h1a1ecb8e84700`）：ChatGPT 12:46 答完「审查出口：通过 / 结论：通过」，两条都关闭，唯一非阻断观察是 `telling` 为全局计数，单条通知慢时别的接力也要等（出现延迟再考虑按会话隔离）。驿窗没收下这条回信：对话里每次重读都记 `unmatched`（`turns.jsonl`，messageId `b7742406…`，4152 字），12:53 按「30 分钟没回信」停下，并经本 PR 的通知告诉了本会话（#318 实机第三次触发，后缀「已发到 Claude 会话」）。我经 Chrome 打开该对话读到原文，存 `evidence/2026-11-18-318-special-review.md`。接力卡停在「30 分钟没回信」，可由常浩点「结束接力」，或等 24 小时闲置自动结束。
- 遗留：Claude 2 小时没交回复审、转回排队 1 小时没领不通知（前者卡在会话自己，后者会话本就收不到）。范围外发现：① 专项复核的回信被 #356 匹配规则判 `unmatched`，原因没查清（同一对话第 2 轮能对上；页面上提问原样显示、行内代码去掉了反引号，和前 600 字比对的规则看不出差别），值得另开一单查；② `~/Library/Caches/ms-playwright/` 一天内被清两次，第一次装机后截屏看到 DiskSlim（磁盘瘦身）在要「下载」文件夹权限，怀疑是它在清缓存（推断，未核实）。
- 本轮新坑：无

## 清理历史包袱第一档：零引用文件、过期文档、CURRENT 旧节归档（#387）（2026-11-18，Claude，常浩看过三档清单后回「清第一档」；已提交、无需发布）

- 时间：开工 `2026-11-18 12:39`（`date '+%F %H:%M'` 记录）。来由：常浩要求盘点 Git 历史里哪些是有意设计、哪些是遗留、哪些能安全移除；第一档是不改行为、不碰已定内容的那部分。
- 改了哪些文件：
  - 常浩要求的：删 `updates/`（上游的更新源，零引用）、`.github/workflows/`（Actions 已停用）、`CONTRIBUTING.md`（写着以上游 Swift 应用为规格，和 NOTICE、ROADMAP 矛盾）；删 `src/packages/ui/src/ui/` 的 `accordion`、`scroll-area`、`sheet`、`skeleton`、`toggle-group`；删 `src/packages/hud/src/panel/session-filters.ts` 和 `panel-sections.test.ts` 里只测它的那一条（调用方在 #52 改额度看板时就没了）；`docs/ROADMAP.md` 去掉 11-05 `8eec2e0` 误粘进来的阶段 1–5 旧副本（53 行）；`CURRENT.md` 2026-11-12 及以前的 149 节原样移到 `docs/history/CURRENT-2026-11-04至2026-11-12.md`，本文件留 11-14 以后的，末尾加指路。
  - 顺手改的：同一目录另外 7 个零引用组件 `toggle`（只被 `toggle-group` 用）、`label`、`progress`、`badge`、`checkbox`、`separator`、`table`（第一遍扫描漏了，按导入路径逐个数过）；随之删掉没有元素在用的样式：`global.css` 的 `badge`、`accordion-*`、`separator` 三段，`receipt.css` 选择器里的 `[data-slot="badge"]`；`docs/platform-builds.md` 去掉讲 Windows 工作流的两段、表格里改成「Actions 已关」；ROADMAP 旧副本里阶段 5 的「风险」一行是新副本没有的，留下接在阶段 5 末尾。
  - **改变了已有行为的**：无。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `988 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`（比上一轮少 1，就是删掉的那条），MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-18-387-legacy-cleanup/`（`check-1.log`、`test-1.log`、`node-test-1.log`）。
- 验证：删前逐项查过引用（`grep` 导入路径和 `data-slot`）；删后类型检查和前端构建通过。没有在真实界面里看，因为删的都是没人引用的文件和没有元素命中的选择器。
- 截图：无。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：比清单多删 7 个组件和 4 处死样式，见「顺手改的」。第二档没动，每项都碰到定过的内容，要逐项发改动确认：① 上游对照台账与 Swift 对照工具（`docs/parity/`、`parity-ledger --check`、`src/tooling/parity-oracle`；`fixtures/parity/contracts` 的测试用例留）② 更新链路与扩展口（`UpdatesPane`、托盘「New Version…」、`ProductExtension`）③ 简约形态代码 ④ `docs/upstream/` 与宣传素材（约 11.5 MB）⑤ 旧数据迁移与旧版 Swift 应用导入（`data_folder.rs`、`core/src/legacy/`）。范围外发现：旧数据目录 `~/Library/Application Support/app.agenthud.mac` 在 11-08～09 又被建出来（`demo`、`demo-run`、`hooks`），是谁建的没查清，动第 ⑤ 项前要先查；证据目录已 21 GB。skill 进化：无。
- 本轮新坑：无

## Hermes 卡定时任务表：隐藏没写原因就关掉的任务、去掉「下次」、「多久一次」改口语、任务表装框（#384）（2026-11-18，Claude，常浩提三条，看三版预览 https://claude.ai/artifact/8reLtXF5coyTEWjxxyRVVG 后回「甲，丙（只给任务表装框就行了，不需要加额外注脚，还是之前的私和群的标识）」；PR 已 squash 合并、已发布 `9fa6402761e2` 回读通过）

- 时间：开工 `2026-11-18 10:37`（`date '+%F %H:%M'` 记录）。来由：常浩说停用的任务不要出现（除非明确暂停）、删「下次」、「多久一次」要清晰（举例「5d / 次」）、对话和定时任务混在一起分不清。
- 改了哪些文件：
  - 常浩要求的：`src/crates/agents/src/hermes/mod.rs` 读任务的 `paused_reason`；`src/crates/core/src/snapshot.rs` 快照带 `pausedReason`；`src/packages/protocol/src/index.ts` 加字段。`src/packages/hud/src/panel/hermes-board.ts` 关掉且没写暂停原因的任务不进表，写了原因的「执行情况」显示「已暂停」（悬停看原因）；去掉 `next`；`hermes-cadence.ts`（新）把排期写成口语：每天 09:50、工作日 09:45、每周一 07:45、每月 1 日 10:30、每 5 天 08:00、每 15 分钟、每 30 分钟（9–23 点）、每 2 小时、每小时、Hermes 的 `every 5m` → 每 5 分钟，读不出的照原样。`HermesBoard.tsx` 表只剩「定时任务 / 多久一次 / 执行情况」三列，装进细线框（圆角 7、`inks.divider` 边），对话行（私 / 群）不变。
  - 顺手改的：任务表改成固定列宽（134 / 58），两个机器人的表竖着对齐，多久一次过长时省略并带悬停全文；`shortWhen` 只剩过去时间（「下次」去掉后将来时间那半没人用）；场景预览台加 `hermes-desks` 场景（合成数据：3 个没写原因的暂停任务、1 个写了原因的、1 个失败的、两步合一行的）；`hermes-board.test.ts` 改写 4 条、加 1 条，Rust 加 1 条；行数基线收紧（`HermesBoard.tsx` 386 → 382）。
  - **改变了已有行为的**：关掉（`enabled: false`）但没写暂停原因的任务不再显示（原来显示「停用」）；「下次」列没了；「上次」改叫「执行情况」；「多久一次」原来只认每天 / 工作日 / 单个星期几，其余照抄 cron（如 `*/15 * * * *`），现在都写成口语，单个星期几从「周一 07:45」变「每周一 07:45」；任务表有了外框，表下对话行离表略远（上移从 -4 改 -2）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `988 passed; 0 failed`，前端 `ℹ pass 463` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`（`check-3.log`、`test-3.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`node-test-3.log`）。中途一次 Chrome 插件 20 条挂，照 L-16 补装 `chromium-headless-shell` 后全过（`test.log`、`test-extension-2.log`）。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，`scenes-384`）真实点击 `hermes-desks` 的 Hermes 票根：机器人甲 3 个没写原因的暂停任务不出现、「学习报告」显示灰「已暂停」、「周会纪要」红「✗ 11/9」、项目日报两步合一行；两张表三列竖线对齐（页面脚本量列左边两表相同），最长「每 30 分钟（9–23 点）」不截断；对话行「私 / 群」样式没变；浅色纸、整张看板都看过。真实数据：用本机两份 `jobs.json` 跑 `jobRows`，猛鬼兽 5 行（Tidings 周报卡片 每 15 分钟、skill 月度体检 每月 1 日 10:30、个人项目日报 每天 10:00、AI HOT 热点榜 工作日 09:45、AI 前沿群学习报告 每天 10:45），亚古兽 1 行（记忆日报 每天 07:30），工程自检、影子合并官、multica 夜跑主控三个暂停任务（都没写原因）不出现。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-18-384-hermes-jobs/`：`00-card-before-fixed-columns.jpg`（改固定列宽前，两表没对齐）、`01-card-dark.jpg`、`02-card-light.jpg`、`03-board-light.jpg`。
- 发布与回读：打包前 main 仍是 `11de767`，没有别的提交。`tauri build --bundles app` 退出码 0；`install.sh 384-hermes-jobs`：装前 `7eec140627cc`，产物 `9fa6402761e2` / 已装 `9fa6402761e2`，签名照常（`H"b773068e`）。实机截屏看过：无文稿权限弹窗，侧栏在右边运行；截屏里有常浩的私人内容，看完已删。实机点开 Hermes 卡未做（L-09），留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-18-384-hermes-jobs/PostPane-7eec140627cc.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：「暂停时写了原因才算明确暂停」是我的推断（Hermes 只有暂停一种关闭状态），预览页上写明了，常浩没提异议；以后想留着显示某个暂停任务，让 Hermes 暂停时带原因。悬停小收据（AgentPeek）不显示任务，没动。定时任务失败的细条（`island_events`）仍按所有任务判断，暂停的任务不会再跑，不影响。
- 本轮新坑：无

## 卡片「还有 n 条」改成贴着列表的一行小字「展开其余 n 条 ⌄」（#382）（2026-11-15，Claude，常浩说「还有 n 条」那一行（上面点线 + 下面大块留白）突兀，看三版预览 https://claude.ai/artifact/8eBxUJbGCj3zfajbRLKKQw 后回「按乙开工」；PR 已 squash 合并、已发布 `7eec140627cc` 回读通过）

- 时间：开工 `2026-11-15 10:15`（`date '+%F %H:%M'` 记录）。来由：折叠入口自成一块（上边 1px 点线、上下各 12px 留白），夹在「等待处理」和「正在进行」两段中间显得突兀。
- 改了哪些文件：
  - 常浩要求的：`src/packages/hud/src/permissions/FoldButton.tsx` 去掉上边点线和上下大留白，改成贴着最后一条（上移 4px）、从文字线（`GRID.text`）起的一行小字（12px、淡一档）「展开其余 n 条 ⌄」，展开后「收起 ⌃」；按钮宽度只包住文字。它是唯一的折叠入口，等待处理（待答 / 待批 / 新回复列表、单家卡等待处理会话行）和正在进行三处一起变。
  - 顺手改的：`unified-card.test.ts` 那条加断言（新文案、`GRID.text` 内边距、没有点线和旧留白）；`test/scenes/scenes.ts` 两个场景标题里的「还有 n 条」改成新文案。
  - **改变了已有行为的**：入口文案「还有 n 条」→「展开其余 n 条 ⌄」、「收起」→「收起 ⌃」，字号 12.5 → 12，可点范围从整行变成只有文字那一段；入口和列表、下一段之间的空白变小。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `987 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`（`check.log`、`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`node-test.log`）。中途一次：新断言的 `dotted` 撞上 FoldButton 注释里的字，收紧成样式写法；Chrome 插件测试 20 条因 Playwright 浏览器缓存被清掉挂了，照 L-16 补装 `chromium-headless-shell` 后全过。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，`scenes-382`，用完已撤）真实点击：`claude-many-asks` 点 Claude 出有待处理的卡，列 4 条下面「展开其余 4 条 ⌄」，点开 8 条全列、末尾「收起 ⌃」，点收起回到 4 条；`claude-busy` 单家卡正在进行列 6 个加「展开其余 2 条 ⌄」，展开 8 个、收起回 6 个。页面脚本量左边：入口文字和同卡标题都在同一条文字线（两份渲染各自相等：48 / 48、801 / 801）；入口文字离上一条副标题 6px。浅色纸也看过。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-15-382-fold-entry/`：`many-asks-1-folded.jpg`、`many-asks-2-unfolded.jpg`、`many-asks-3-refolded.jpg`、`busy-1-folded.jpg`、`busy-2-unfolded.jpg`、`busy-3-refolded.jpg`、`many-asks-light-folded.jpg`。
- 发布与回读：分支和 main（`b66f58d`）之间没有别的提交。`tauri build --bundles app` 退出码 0；`install.sh 382-fold-entry`：装前 `ae8f61c7bda2`，产物 `7eec140627cc` / 已装 `7eec140627cc`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏看过：无文稿权限弹窗，侧栏在顶边运行；截屏里有常浩的私人聊天，看完已删。实机点卡未做（L-09），留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-15-382-fold-entry/PostPane-ae8f61c7bda2.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：预览里乙版悬停时字变亮，驿窗卡片按钮都是行内样式、没有悬停样式，这次没加。看板各家区块的「在跑 n」整行折叠不在本次范围，没动。
- 本轮新坑：无

## 卡片整体一套左对齐线（应用级设计规范）（#380）（2026-11-15，Claude，常浩原话「你刚才只是把首行和下面的待处理对齐了，再下面的正在跑就没对齐。那这个对齐是整体的应用级别的要求，这是设计规范」；「等你」行选「章留在图标列」；PR 已 squash 合并、已发布 `ae8f61c7bda2` 回读通过）

- 时间：开工 `2026-11-15 09:49`（`date '+%F %H:%M'` 记录，取 issue 创建时间）。来由：#376 只让卡头对齐了待处理列表，正在进行的行、分段标题、额度、余额、空状态各用各的缩进（图标 +6、标题 +4 左右）。
- 改了哪些文件：
  - 常浩要求的：`src/packages/hud/src/panel/theme.ts` 新增 `GRID`（图标列 18、间隔 12、文字线 30），规范写进 `docs/design/卡片版式规范.md`。各块改用它：`SessionsSection.tsx` 会话行（`LiveRow`、`RepliedRow`）图标列固定 18、去左内边距；`PlaceRows.tsx` 在跑折叠行同样处理，分段标题去左内边距；`WorkSections.tsx`「暂无…」放文字线；`AgentBoard.tsx` 额度说明、额度行、图例去左内边距；`HermesBoard.tsx` 去左内边距；`BoardHeading.tsx` 卡头（单家卡和看板）标记占 `GRID.text - 10` 一列、去左内边距，家名落在文字线；余额区块在单家卡上从图标线起，看板上自带小标题时对齐小标题（`paddingLeft: headed ? 0 : GRID.text`）。
  - 顺手改的：余额区块 `SourceBalances` 从 `QuotaSection.tsx`（570 行，到棘轮上限）拆到 `panel/SourceBalances.tsx`，`QuotaSection.tsx` 降到 324 行，`board-blocks.tsx` 改导入；删掉 `tagWide`（#312 让在跑行标题对齐「等你」行标题的占位，规范下不再需要）；`AGENTS.md` 导航表加「改卡片 / 面板版式」一行；`unified-card.test.ts` 加一条、改一条；行数基线收紧。
  - **改变了已有行为的**：所有卡片和看板里，正在进行的行、在跑折叠行、分段标题、额度、余额整体左移约 6px，在跑行标题左移约 4px；卡头标记左移 6px、家名跟着落在文字线；看板各家卡头标记从 +6 移到 0；「暂无…」右移到文字线；「等你」「已回」行的标题不再和在跑行对齐（章留在图标列，常浩选的）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `987 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`（`check.log`、`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`rules.log`）。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，`scenes-380`）用页面脚本量左边（页面坐标）。改前（main `cf73f8e`）`claude-busy` 单家面板：卡头小人 13.8、家名 45，分段标题 / 在跑点阵 / 额度 / 「等你」章都在 14，在跑标题 42，「还有 n 条」文字 38。改后：`claude-busy` 单家面板 图标线 8（小人 6.8、分段标题、点阵、额度、「等你」章）、文字线 38（家名、在跑标题和副标题、「还有 n 条」），「等你」行标题 57.9；`claude-many-asks` 有待处理的卡 图标线 18（列表图标、分段标题、点阵，小人 16.8）、文字线 48（家名、列表标题、在跑标题）；`all-running` DeepSeek 图标线 18（余额、分段标题、点阵）、文字线 48（家名、在跑标题、「暂无…」）；`chatgpt-reviews` ChatGPT 卡「已回」章在图标线、「暂无在跑的会话」在文字线；Hermes 机器人印章在图标线、名字被印章推到 +34（同「等你」规则），任务表和说明行从图标线起；`claude-busy` 看板 图标线 412（标记、额度、分段标题、点阵）、文字线 442（家名、「在跑 8」）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-15-380-one-grid/`：`01-busy-panel.jpg`、`02-many-asks-card.jpg`、`03-chatgpt-card.jpg`、`04-deepseek-card.jpg`、`05-hermes-card.jpg`、`06-board.jpg`。
- 发布与回读：分支和 main（`cf73f8e`）之间没有别的提交。`tauri build --bundles app` 退出码 0；`install.sh 380-one-grid`：装前 `29af8701ab1a`，产物 `ae8f61c7bda2` / 已装 `ae8f61c7bda2`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏看过：无文稿权限弹窗，侧栏在跑（当时常浩把侧栏放在顶边、开着设置「显示」页）；截屏里有常浩的飞书文档列表，看完已删。实机点票根看卡未做（L-09），留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-15-380-one-grid/PostPane-29af8701ab1a.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：额度行有悬停底色时，底色左边和文字贴齐（原来留 6px），行数棘轮不允许多加一行负外边距，先这样。待处理列表（`ListCard`、`ApprovalContent`、`CompletionAlertView`）本来就在这套线上，数值没改成引用 `GRID`（文件到行数上限），测试锁住它们和 `GRID` 一致。设置窗口、统计窗口不在本轮范围。
- 本轮新坑：无

## 所有面板去掉底部「近 24 小时 Token / 另有 n 个会话已停」，只留设置和统计；有待处理的卡「设置」能点了（#378）（2026-11-15，Claude，常浩原话「对齐了这块没问题，所有面板如图1这里删除，不要在面板上展示；最下面只保留如图2的设置和统计，但是我发现设置目前无法点击」；PR 已 squash 合并、已发布 `29af8701ab1a` 回读通过）

- 时间：开工 `2026-11-15 09:37`（`date '+%F %H:%M'` 记录，取 issue 创建时间）。来由：常浩不要面板底部那块日 Token、已停会话和小柱图；有待处理的卡上「设置」点不动。
- 改了哪些文件：
  - 常浩要求的：`src/packages/hud/src/panel/SourceSessions.tsx` 删掉底部那块（「近 24 小时 n Token / 另有 n 个会话已停 · 去统计看全部」、ChatGPT 的「今天 n 个对话 · 近 24 小时 n 个审核」和右侧小柱图），连同它的取数（会话总数查询、日 Token 查询）。修「设置」：`scene/NewsCard.tsx` 原来只给面板传了统计回调，改为 `links`（统计和设置一起），`HUDScene.tsx` 传 `{ onStats: showPanelStats, onConfigure: configurePanel }`。
  - 顺手改的：看板时会话区只剩那块，现在整块不画（`HoverPanel.tsx` 会话块加 `!split`，`SourceSessions` 去掉 `split`、`showTokens`、`tokenAgents`、`active` 参数）；删掉只为那块服务的死代码：`HoverPanel` 的 `tokensAbove`，`agent-board.ts` 的 `stoppedCount`、`panelHidesTokens`，`AgentBoard.tsx` 的 `useDayTokens`、`DayBars`，`chatgpt-desk.ts` 的 `reviewsInDay`，以及测它们的 4 条测试；场景预览台 `preview/main.tsx` 给 `HUDScene` 接上设置 / 统计回调（只打日志），预览台里底部两个按钮能点；`file-size-baseline.json` 收紧（`AgentBoard.tsx` 等变短）；`unified-card.test.ts` 加一条。
  - **改变了已有行为的**：所有面板（单家卡、单家面板、整张看板、ChatGPT 卡）底部不再显示日 Token、已停会话数、今天对话 / 审核数和小柱图，点那块进统计的入口没了（底部「统计」还在）。有待处理的卡上「设置」从禁用变成可点（修 bug）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `987 passed; 0 failed`，前端 `ℹ pass 461` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`（`check.log`、`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`rules.log`）。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，`scenes-378`）：`claude-many-asks` 点 Claude，底部只剩「设置」「统计」，两个按钮都可点（`disabled: false`），真实点击「设置」控制台打出「[预览台] 打开设置」；接上回调前同一处两个按钮都是禁用（预览台原来没传回调）。`all-running` 切看板：页面里没有「近 24 小时」「个会话已停」字样，底部「设置」「统计」。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-15-378-panel-foot/`：`01-card-foot-no-token.jpg`、`02-card-foot-settings-enabled.jpg`、`03-board.jpg`。
- 发布与回读：分支和 main（`4de9a64`）之间没有别的提交。`tauri build --bundles app` 退出码 0；`install.sh 378-panel-foot`：装前 `ba843c778e05`，产物 `29af8701ab1a` / 已装 `29af8701ab1a`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏看过：无文稿权限弹窗，侧栏在跑；截屏里有常浩的私人聊天，看完已删，不留档。实机点「设置」未做（L-09），留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-15-378-panel-foot/PostPane-ba843c778e05.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：悬停小收据（AgentPeek）里的「24 小时 Token」不是面板，没动。设置里「Token 用量」开关（`tokenUsage`）现在只管自定义布局的 Token 图表。
- 本轮新坑：无

## 单家卡卡头和下面内容左对齐（#376）（2026-11-15，Claude，常浩看 #374 实机后说「这行和下面的内容左对齐，现在有点不对齐看着」；PR 已 squash 合并、已发布 `ba843c778e05` 回读通过）

- 时间：开工 `2026-11-15 09:23`（`date '+%F %H:%M'` 记录，取 issue 创建时间）。来由：#374 后卡头小人框从卡片内容左边 6px 起、家名在 42px，而有待处理那张卡的列表行图标在 0、标题在 30（以下都按卡片内容左边算），整行看着往右偏。
- 改了哪些文件：
  - 常浩要求的：`src/packages/hud/src/panel/BoardHeading.tsx` 单家卡上卡头左内边距按下面的内容定：有待处理的卡（有 `NewsSeal`）为 0，小人占一列 `MARK_COLUMN`（20px，内缩 2px），小人墨迹从 -1px 起、家名在 30px，对齐列表行的图标（0）和标题（30）；其他单家卡为 7，小人墨迹从 6px 起，对齐额度文字、「等你」标签、在跑行图标（都在 6px）。卡头小人 26 → 24 号，放得进那一列。
  - 顺手改的：`test/unified-card.test.ts` 卡头断言跟着改。
  - **改变了已有行为的**：单家卡卡头整行左移（有待处理的卡移约 6～12px，其他单家卡小人移约 1px、家名左移 5px），小人略小一号。看板不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `987 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`（`check.log`、`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`rules.log`）。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，`scenes-376`）用页面脚本量小人画布的墨迹左边和各元素左边（相对页面）：`claude-many-asks` 点 Claude，改前小人墨迹 ≈ 14、家名 50，列表行图标 8、标题 38；改后小人 6.8、家名 38。`claude-busy` 点 Claude（带额度的单家面板）：改后小人 13.8、家名 45，额度文字、「等你」标签都在 14。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-15-376-card-head-align/`：`01-before.png`、`02-after-many-asks.png`、`03-after-panel-quota.png`。
- 发布与回读：分支和 main（`abcedd7`）之间没有别的提交。`tauri build --bundles app` 退出码 0；`install.sh 376-card-head-align`：装前 `300533126324`，产物 `ba843c778e05` / 已装 `ba843c778e05`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏 `04-installed-screen.png`：无文稿权限弹窗，侧栏在跑（当时常浩开着设置「显示」页、侧栏在左边，是他自己的操作）。实机点票根看卡未做（L-09），留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-15-376-card-head-align/PostPane-300533126324.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：卡片里有两套左对齐线：待答 / 待批 / 新回复列表（图标 0、标题 30）和会话行、额度、分段标题（6 / 34），本轮卡头跟着各自卡片下面那套走，没有把两套并成一套（并成一套要改待处理列表的版式，那是 #368 定过的，要先问）。
- 本轮新坑：无

## 外层展出卡：卡头换小签小人、去卡头虚线、等待处理 4 条 / 正在进行 6 条后折叠、两段常驻带「暂无」（#374）（2026-11-15，Claude，常浩原话「最上面这个图标用小票签上的图标，和下面的图标区别开。然后删除那条虚线，直接进入到等待处理。然后等待处理默认展示4个，正在进行默认展示6个，其他都折叠。正在进行如果没有正在跑的，那正在进行的那条线也需要在」，范围、折法、空状态三问选「外层展出卡都改」「先列 6 个＋还有 n 条」「两段都常驻」；PR 已 squash 合并、已发布 `300533126324` 回读通过）

- 时间：开工 `2026-11-15 08:57`（`date '+%F %H:%M'` 记录，取 issue 创建时间）。来由：卡头的品牌标记（Claude 橙色星芒）和下面每行会话的标记一样，分不清；卡头下的撕线多余；等待处理、正在进行条数太多。
- 改了哪些文件：
  - 常浩要求的：`src/packages/hud/src/panel/BoardHeading.tsx` 新增 `OnCard`（上下文）和 `card` 参数，在单家卡上卡头标记换成小签同款 `BotMark`（26 号，静止姿态），不画卡头下的撕线；`panel/board-blocks.tsx` 有 `focusVendor` 时给额度区块包 `OnCard`，只剩余额的家卡头传 `card`；`panel/SourceSessions.tsx` 卡头传 `card`，会话区改传 `card`（不再传 `fold`）。`panel/WorkSections.tsx` 加 `card` 模式：两段标题常驻，空时分别写「暂无等待处理的事」「暂无在跑的会话」；等待处理列 `SHOWN_ENTRIES` 条、正在进行列 `RUNNING_SHOWN` 条，其余收进「还有 n 条」，展开后「收起」（新组件 `Folded`，沿用 `permissions/FoldButton.tsx`）。`permissions/approval-list.ts` `SHOWN_ENTRIES` 5 → 4（待答 / 待批 / 新回复列表跟着变）；`panel/place-sessions.ts` 新增 `RUNNING_SHOWN = 6`。
  - 顺手改的：`NothingYet` 只剩全家列表用，去掉不再走得到的 ChatGPT「今天还没有对话」分支；场景 `claude-busy` 在跑从 4 个加到 8 个（单家卡看得到「还有 2 条」），`board-sessions.test.ts`、`unified-card.test.ts` 跟着改；`approval-list.test.ts` 按 4 条改写，排序那条显式传 `Infinity`，和默认条数脱钩；`relay-toggle.test.ts` 卡头断言加 `card`；`unified-card.test.ts` 新增一条。
  - **改变了已有行为的**：① 单家卡（有待处理的卡和单家面板）卡头图标从品牌标记换成小人；② 单家卡卡头下没有撕线；③ 待答 / 待批 / 新回复列表默认 4 条（原 5 条）；④ 单家卡正在进行超过 6 个时列 6 个加「还有 n 条」（原超过 3 个整段收成「在跑 n」）；⑤ 单家卡两段常驻，空时写「暂无」，全空时不再写「没有会话在跑，也没有在等你的」。整张看板不变（品牌标记、撕线、「在跑 n」照旧）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `987 passed; 0 failed`，前端 `ℹ pass 462` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`（`check.log`、`test.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`rules.log`）。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，本机 `.claude/launch.json` 加了 `scenes-374`）：`claude-many-asks` 点 Claude：卡头小螃蟹 + MAX + 待答，没有撕线，等待处理 · 8 列 4 条 +「还有 4 条」，正在进行 · 1。`claude-busy` 点 Claude（单家面板带额度）：卡头小螃蟹、没有撕线，正在进行 · 8 列 6 个 +「还有 2 条」，真实点击展开后 8 个都在、变「收起」。`all-running` 点 Codex：等待处理 · 0 下写「暂无等待处理的事」。`claude-busy` 切看板：Claude、Codex 区块仍是品牌标记、卡头下有撕线、正在进行收成「在跑 8」。卡头小人先试 22 号偏小，改 26 号。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-15-374-card-head-tidy/`：`01-many-asks-head-waiting4.jpg`、`02-many-asks-running.jpg`、`03-busy-panel-head-bot26.jpg`、`04-busy-running6-more2.jpg`、`05-busy-unfolded-fold-back.jpg`、`06-all-running-codex-empty-waiting.jpg`、`07-board-unchanged.jpg`。
- 发布与回读：分支和 main（`25a55f3`）之间没有别的提交，打包用的树即合并后的树。`tauri build --bundles app` 退出码 0（`build.log`）；`install.sh 374-card-head-tidy`：装前 `dc8d9adcf909`，产物 `300533126324` / 已装 `300533126324`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏 `08-installed-screen.png`：无文稿权限弹窗，侧栏在跑。实机点票根看卡未做：常浩当时在用飞书，悬停面板电脑控制点不动（L-09），留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-15-374-card-head-tidy/PostPane-dc8d9adcf909.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：卡头小人不跟设置里「小人 / 品牌标记」开关（`botLogos`）走，一律画小人（卡头组件拿不到设置）；常浩开着小人，没影响。ChatGPT 卡的「等待处理」（今天已回的对话）也按 4 条折叠。范围外：「另有 0 个会话已停」0 个时也显示，没动。
- 本轮新坑：无

## 有待处理时的展开卡去掉额度区块，卡头补回套餐标签（#371）（2026-11-15，Claude，常浩原话「去掉图一的额度展现形式，只保留图2底层的水印数字，以及侧边票根下方的数字，都是周度额度」，后选「顺带补回套餐标签」；PR 已 squash 合并、已发布 `dc8d9adcf909` 回读通过）

- 时间：开工 `2026-11-15 07:15`（`date '+%F %H:%M'` 记录；WIP 提交 `b23aaed` 时间，本会话 07:23 接手）。来由：#368 把待审批卡并进单家面板后，有待处理时卡上多了一大块额度区块，常浩要去掉，只留卡底周额度暗印（#319）和票根脚上的数字（本来就是周额度，#174，不用改）。上一节「待常浩定」的暗印问题就此定了：保留。
- 改了哪些文件：
  - 常浩要求的：`src/packages/hud/src/HoverPanel.tsx` 有 `news` 时不画额度区块（`blocks`）和 Token 图表两段，`bare` 改为 `Boolean(focusVendor) && (!blocks.length || Boolean(news))`，让会话区画统一卡头（`panel/SourceSessions.tsx` 的 `BoardHeading`，带纸飞机和印章）。卡头补回套餐标签：`panel/account-labels.ts` 新增 `soleAccount(rows, accounts, vendor?)`（这家额度行只属于一个已知账户时返回它），`SourceSessions.tsx` 用它给卡头传 `plan`。
  - 顺手改的：`panel/QuotaSection.tsx` 原来的「只有一个账户」判断也改用 `soleAccount`（两处卡头读同一个判断），账户小标题显示条件 `named` 改为 `!only`（等价）；删掉不再用的 `agent-board.ts` 的 `showsAccountNames`，它的测试改写成 `soleAccount` 的测试（`test/agent-board.test.ts`）。场景预览台数据 `test/scenes/build.ts` 给 Claude、Codex 各加一个账户（套餐 Max / Pro），场景里才看得到套餐标签。`test/unified-card.test.ts` 加一条读源码断言。`file-size-baseline.json` 收紧 `agent-board.ts` 415 → 407。
  - **改变了已有行为的**：有待答 / 待批 / 新回复时点票根出的卡，不再有额度条、「照现在的速度……」说明、图例和 Token 图表；只剩余额的家（DeepSeek）有待处理时也不再显示余额区块。没有待处理时的单家面板不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 `987 passed; 0 failed`，前端 `ℹ pass 461` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`check.log`、`test.log`、`rules.log`）。这一轮跑到一半时又改了场景数据和测试，提交 `2951fda` 后补跑：`pnpm run check` 退出码 0（`check-2.log`），`test:ts` `ℹ pass 461` / `ℹ fail 0`（`test-ts-2.log`），交接写好后 `node --test tests/*.test.mjs` 见 `rules-2.log`；没改 Rust，cargo 没重跑。`late-output` 这次没挂。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，本机 `.claude/launch.json` 加了 `scenes-371`）：`mixed` 点 Codex：卡头「Codex PRO + 纸飞机 + 待批」，等待处理 · 1、正在进行 · 1，没有额度区块，卡底 40% 暗印在；点 DeepSeek：卡头 + 待批，没有余额区块。`claude-many-asks` 点 Claude：卡头「Claude MAX + 待答」，等待处理 · 8，没有额度区块，35% 暗印在。`all-running` 点 Codex（没有待处理）：单家面板照旧带「5 小时 / Current week」两条额度，卡头 PRO（走 `QuotaSection` 的 `soleAccount`）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-15-371-news-card-no-quota/`：`01-mixed-codex.jpg`（补套餐前）、`02-mixed-codex-plan.jpg`、`03-mixed-deepseek.jpg`、`04-many-asks-claude.jpg`、`05-all-running-codex-quota.jpg`。
- 发布与回读：分支和 main（`0010f2e`）之间没有别的提交，打包用的树即合并后的树。`tauri build --bundles app` 退出码 0（`build.log`）；`install.sh 371-news-card-no-quota`：装前 `67da9fd79eba`，产物 `dc8d9adcf909` / 已装 `dc8d9adcf909`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏 `06-installed-screen.png`：无文稿权限弹窗，侧栏在跑（Claude 票根「答」）。实机点票根看卡：常浩当时正在 ChatGPT 里打字，悬停面板电脑控制点不动（L-09），留给常浩；合并装机后常浩点了 Claude 票根，回「看过没问题」（2026-11-15）。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-15-371-news-card-no-quota/PostPane-67da9fd79eba.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：DeepSeek 有待处理时余额区块一并去掉（父会话验收就是这么写的，常浩原话说的是额度）。范围外：单家面板底部「另有 0 个会话已停」在 0 个时也显示，没动。
- 本轮新坑：无

## 各家展开卡统一：卡头带纸飞机和印章、额度、等待处理 / 正在进行，一律 470 宽；接力闲置 24 小时自动结束（#368）（2026-11-14，Claude，常浩看三版预览后回「甲，纸飞机方块放在卡顶一行的名称；2 说的是展开面板没有额度；3 甲」；PR #369 已 squash 合并 `2603d44`、已发布 `67da9fd79eba` 回读通过）

- 时间：开工 `2026-11-14 22:20`（`date '+%F %H:%M'` 记录）。来由：常浩 7 条意见（额度数字不在、Claude 卡和 Codex/GPT 不一样宽、待审批不要按项目分区、「还有 n 条」收不回去、待审批改「等待处理 · n」加横线、卡顶重排纸飞机单独放、其他家同理）。三版预览 https://claude.ai/artifact/HFgt5oHxTULFSoizf8bSaN 。本分支从 `claude/359-board-peek` 的 `0f40a3b`（第 3 批之二，另一会话已提交、未开 PR）往下接，改的是同一批文件。
- 改了哪些文件：
  - 常浩要求的：`scene/NewsCard.tsx`（新）有待答 / 待批 / 新回复时，卡片就是这家的单家面板（`SourceHoverPanel` 带 `news`），卡头印章由 `permissions/PaperSeal.tsx`（新）的 `NewsSealContext` 换成「待答 / 待批 / 切换 / 已回」，额度区块照常在；其他通知（额度细条等）照旧。`HUDScene.tsx` 改用它。`permissions/ApprovalContent.tsx`、`alerts/CompletionAlertView.tsx` 去掉「待审批 / 新回复」那行卡头（含 ASK n、REPLY n 计数和纸飞机）和项目分区，「全部知道了」挪到列表底部右侧；`alerts/reply-list.ts` 不再分「ChatGPT 对话」等区。`permissions/ListCard.tsx` 的 `FoldButton` 展开后变「收起」可折回。`panel/WorkSections.tsx`（新）把一家的会话分成「等待处理 · n」「正在进行 · n」两段，有待答时等待处理段就是那张列表；`panel/SourceSessions.tsx`（单家）和 `panel/PlaceRows.tsx` 的 `BlockSessions`（整张看板各家区块）都用它；`SessionsHeading` 改成「名称 · 数量」接横线。没有额度区块的家（ChatGPT）在会话区顶上画同一个 `BoardHeading`（带纸飞机），只有余额的家（DeepSeek）在余额区块上方画它，余额区块自己的小名字在单家卡里隐藏（`QuotaSection.tsx` 的 `headed`）。ChatGPT 单家卡：「今天的对话」改成「等待处理」（今天已回的对话）+「正在进行」，审核纸条和闲着的接力行不再列，接力只从纸飞机进。`scene/useHUDLayout.ts` 单家面板宽度从 `max(440, 面板宽 - 100)` 改为和消息卡同一个 `HUD_METRICS.alertWidth`（470），`model.ts` 删掉两个不再用的常量。接力：`crates/platform/src/clients/chatgpt/handoffs/idle.rs`（新）`IDLE_END_MS`（24 小时）与 `Book::idle`（`handoffs.rs` 挂上模块、加测试），`crates/host/src/handoff.rs` 生成快照时调用，`handoff/texts.rs` 加结束原因；`docs/chatgpt-channel.md` 同步。
  - 顺手改的：`panel/BoardHeading.tsx` 加 `place` 参数（ChatGPT 的标记名换算成 `openai`，按来源 id 筛接力，L-50）；守 300 行棘轮，余额三个指标按钮拆到 `panel/BalanceMetrics.tsx`（新）、折叠按钮拆到 `permissions/FoldButton.tsx`（新）、空状态拆到 `WorkSections.tsx` 的 `NothingYet`、`splitWork` 放 `place-sessions.ts`；删掉不再用的 `permissions/ListHead.tsx` 和 `approval-list.ts` 的 `tagCounts`（及其测试）；场景预览台加 `claude-many-asks`（8 条待答）。测试：`reply-list.test.ts`、`relay-toggle.test.ts` 按新行为改写，新增 `unified-card.test.ts`（4 条）、`handoffs.rs` 新测试 `handoffs_left_a_day_untouched_end_themselves`。
  - **改变了已有行为的**：① 有待答 / 待批 / 新回复时点票根，卡片多了家名卡头、额度和「正在进行」下的 Token 与设置 / 统计脚；② 等待处理不分项目区、没有 ASK n / REPLY n 计数；③ 整张看板各家区块里「等你」的会话单列「等待处理 · n」，所有分段标题的数量从横线右端挪到名称后面；④ ChatGPT 单家卡不再列今天全部对话和审核纸条；⑤ 单家面板 440 → 470 宽；⑥ 交给常浩的接力放 24 小时自动结束。
- 测试：`pnpm test` 退出码 0：Rust 合计 `986 passed; 0 failed`，前端 `ℹ pass 460` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`。`pnpm run check` 第 1 次只因新测试一行没过 `cargo fmt` 失败（`check.log`），格式化后重跑见 `check-2.log`；`node --test tests/*.test.mjs` 第 1 次在交接写好前跑、交接格式那条失败（`rules.log`），写好后重跑见 `rules-2.log`。第 2 次 `check-2.log` 卡在行数棘轮（`handoffs.rs`、`ListCard.tsx`、`useHUDLayout.ts` 变长），拆分后 `check-file-size.mjs --update` 收紧基线 6 项，第 3 次全量重跑：`pnpm run check` 退出码 0（`check-3.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`（`rules-3.log`）；`pnpm test`（`test-2.log`）Rust 合计 `986 passed; 0 failed`，前端 `ℹ pass 459` / `ℹ fail 1`，挂的是 `engine-client/test/late-output.test.ts`（46.5 秒等引擎超时），`&&` 串联使后面三组没跑；负载 6.6 时补跑 `test:ts` 同一条又挂（`test-ts-3.log` `ℹ pass 459` / `ℹ fail 1`），`test:mcp` `ℹ pass 9` / `ℹ fail 0`、`test:plugins` `ℹ pass 14` / `ℹ fail 0`、`test:extension` `ℹ pass 23` / `ℹ fail 0`。这条单独跑在本分支、main（`0dc0ba5`）、`359-board-peek` 都是 `ℹ pass 1` / `ℹ fail 0`，第 1 次全量里也过了；本轮没碰 `engine-client`，按 L-48 那类机器忙时替身程序起得慢的偶发失败处理，没改代码。**变基到 main `0dc0ba5`（含 #367）后最终一轮**：`pnpm run check` 退出码 0；`cargo test --workspace` 合计 `987 passed; 0 failed`；`test:ts` `ℹ pass 460` / `ℹ fail 0`，`test:mcp` `ℹ pass 9` / `ℹ fail 0`，`test:plugins` `ℹ pass 14` / `ℹ fail 0`，`test:extension` `ℹ pass 23` / `ℹ fail 0`（`*-rebased*.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-14-369-unified-card/`。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，本机 `.claude/launch.json` 加了 `scenes-369`）：`mixed` 点 Codex 出 Codex 卡（卡头 Codex + 纸飞机 + 待批、额度两条、等待处理 · 1 展开审批、正在进行 · 1）；点 DeepSeek 只有一行卡头（之前两行，已修）、余额、等待处理 · 1、正在进行 · 1；点 ChatGPT 卡头纸飞机带 2（之前筛空，已修，L-50）。`claude-many-asks` 点 Claude：等待处理 · 8 一条列表，真实点击「还有 3 条」展开后变「收起」，再点折回。改前对照：切到 `scenes-359b`（`0f40a3b`）看 ChatGPT 卡（今天的对话 + 审核纸条，440 宽）。回复卡在预览台看不到实物（场景回复事件已过期），靠测试。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-369-unified-card/`：`before-chatgpt-panel.jpg`、`before-codex-panel-440.jpg`、`after-codex-news-card.jpg`、`after-deepseek-card.jpg`、`after-chatgpt-card-plane.png`、`after-claude-waiting-8.jpg`、`after-claude-unfolded-fold-back.jpg`。
- 发布与回读：常浩回「合并并装机」（PR 连带第 3 批之二 `695fd5b` 一起进 main）。`gh pr merge 369 --squash` → `2603d44`，与打包用的树一致；`tauri build --bundles app` 退出码 0；`install.sh 369-unified-card`：装前 `c4501330017c`，产物 `67da9fd79eba` / 已装 `67da9fd79eba`，签名照常（`H"b773068e`），`install.sh check` 一致。实机截屏 `after-installed-claude-card.png`：无文稿权限弹窗；Claude 卡卡头「Claude ULTRA + 纸飞机 10 + 待答」、额度三条、等待处理 · 7、正在进行 · 2。接力闲置自动结束当场生效：`handoffs.json` 里 12 单带「没动静」的自动结束步（Claude 11、Codex 1），Claude 开着的从 21 降到 10。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-369-unified-card/PostPane-c4501330017c.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：预览甲版里印章画的是「待答」，实现照做（消息卡盖待答 / 待批 / 已回，平时盖额度的够用 / 吃紧 / 未知）。**待常浩定**：消息卡上的周额度暗印（#319，11-12 选甲）原是因为卡片盖住了面板看不到额度，现在卡上直接有额度条，暗印和「本周」那行重复，本轮没动。实机未验。
- skill 进化：E-19 待批（开工时要改的文件正被别的未合并分支改着怎么办）。
- 本轮新坑：L-50

## ChatGPT 接力：送审原文带行内代码时回信不再被判成别的提问（#366）（2026-11-14，Claude，常浩说「继续推进」，巡检时查出 #356 返修引入的误判，属修 bug 回到原定行为；已提交、发布见下）

- 时间：开工 `2026-11-14 21:30`（`date '+%F %H:%M'` 记录）。来由：PR #365（#318）的 L2 审查 18:39 已答完，驿窗每 2 分钟重读、连续 35 次记 `unmatched`，19:00 按 30 分钟没回信停下自动往返。对比今天 17 点后新规则下收下的几单：原文带 `##` 标题、`-` / `1.` 列表、`**加粗**`、表格竖线的都对上了，唯一对不上的 `h1a1d99b32c700` 前 600 字有 12 个反引号。页面把行内代码画成代码样式，插件取的 `textContent` 没有反引号。没有打开那次 ChatGPT 对话核对页面（#318 会话问过常浩要不要用他的 Chrome 读，他还没回），靠下面装机后重读是否收下来验证。
- 改了哪些文件：
  - 常浩要求的（修 bug）：`src/crates/host/src/handoff/belongs.rs` 的 `bare` 比对时两边都去掉反引号（原来只去空白），模块说明补来由；`docs/chatgpt-channel.md` 核对规则一句同步。
  - 测试：`src/crates/host/src/handoff.rs` 新增 `a_prompt_drawn_without_its_inline_code_marks_is_still_the_review`（短原文带行内代码：页面去掉反引号的同一段收下，后面多一句的不收；超长原文按摘录前缀收下）。
  - 顺手改的：无。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，cargo 合计 passed 986 failed 0，前端 `ℹ pass 452` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。撤修复验证：去掉反引号过滤，新测试失败（`revert-check.log`）。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-relay-inline-code/`。
- 验证：单元测试；实机见「发布与回读」。
- 截图：无（无界面改动）。
- 发布与回读：见本节末追记。
- 与授权不一致之处、遗留问题、范围外发现：只去反引号，没有一并去 `*`、`_` 等记号：本机数据显示页面保留加粗记号和表格竖线，没有证据就不放宽。代码块（三个反引号围起来的）在页面上可能带语言名、「复制」按钮文字，仍会对不上，暂未见实例。
- 本轮新坑：无

## 第 3 批之一：点哪家的票根出哪家的卡；纸飞机加到新回复卡和单家面板（#359）（2026-11-14，Claude，常浩看三版预览后回「都选甲」，改动确认四处回「都按推荐」；已提交、已发布 `d7a5344be952` 回读通过）

- 时间：开工 `2026-11-14 17:48`（`date '+%F %H:%M'` 记录）。来由：ADR-0001 第 3 批界面统一。三版预览 https://claude.ai/artifact/VpJfiLCmuXyNgZj1tN6Jp7 （第 1 版多开关，常浩说「太复杂了看不懂」，第 2 版改成「只有两处要你挑」），常浩回「都选甲」：① 看板会话分到各家下面、某家在跑超过 3 条收成一行；② 出错单独一张回执。随后改动确认四处，常浩回「都按推荐」：**纸飞机多单仍「进最近一单 + 红数字」，不改成列表（保 #344）；额度细条不加纸飞机（保 #62/#65）；看板在跑超过 3 条收成一行（替代 #63 的「5 条 + 滚动」，只用在分家后的各家区块）；小收据加「等你 · 在跑 · 接力」一行，「看不清」第一版不做（后台还没有「这家看不到了」的数据）**。第 3 批分三个 PR：本 PR（点击 + 纸飞机）→ 看板分家 + 小收据一行 → 出错回执。
- 改了哪些文件：
  - 常浩要求的：`hud/src/request-hover.ts` 新 `clickMayPin`：点别家票根照常钉住、长成那家的面板，只有点「前卡那一家」自己的票根或刘海形态才不动（原来只要有任何消息卡就一律不动）；`scene/useHUDInteraction.ts` 的 `pin` 用它；`HUDScene.tsx` 侧栏「替谁说话」在没有指针时（预览台、键盘）也认被点的那家（`pinned && hovered`）。纸飞机：`alerts/CompletionAlertView.tsx` 新回复卡卡头加 `EnterRelay`（`cardRelays` 按回复的来源，只进本家参与的接力）；单家面板卡头拆出新文件 `panel/BoardHeading.tsx`，印章左边加 `EnterRelay`（`relaysOf(本家)`），`QuotaSection.tsx` 传 `handoffs`。样子和多单行为沿用 #344。
  - 顺手改的：守 300 行棘轮——「知道了 / 全部知道了」按钮拆到新 `alerts/DismissAll.tsx`；`BoardHeading`、`Stamp` 从 `AgentBoard.tsx` 搬到 `panel/BoardHeading.tsx`；`QuotaSection.tsx` 一处两行注释压成一行；基线收紧 2 项（`CompletionAlertView.tsx` 571→567、`AgentBoard.tsx` 672→513）。测试：`request-hover.test.ts` 加 1 条（点击何时钉住），`relay-toggle.test.ts` 加 1 条（两张卡接上纸飞机、在印章左边），`workplace-contract.test.ts` 加 1 条（回复卡、单家面板只进本家接力：Claude→h-claude、Codex→h-codex、DeepSeek/Hermes 无）。
  - **改变了已有行为的**：有消息卡时点别家票根，现在会长成那家自己的面板（原来点了没反应，场景预览台里还会出前卡）；新回复卡、Claude/Codex 的单家面板卡头出现纸飞机（只在本家有开着的接力时）。ChatGPT 单家面板没有 `BoardHeading`，不加飞机（它的审核纸条本来就列着接力）；DeepSeek、Hermes 没有接力，不出现。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `985 passed; 0 failed`，前端 `ℹ pass 452` / `ℹ fail 0` / `ℹ todo 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。跑了两遍：第一遍基于 `330a5d5`（Rust 981、前端 452、Chrome 插件 17，全过）；main 随后合进 #363，变基后重跑，结果即上。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-359-click-plane/`：`check*.txt`、`test*.txt`、`node*.txt`。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，本机 `.claude/launch.json` 加了 `scenes-359`）`two-relays`：直接点 ChatGPT 票根，出 ChatGPT 自己的面板（今天的对话 + 审核纸条），第 1 批证据 `finding-chatgpt-click-shows-deepseek-card.jpg` 里改前是 DeepSeek 的审批卡；点 Claude 出 Claude 面板；点 DeepSeek 出它自己的审批卡；悬停 ChatGPT 仍出 ChatGPT 面板（#243 不变）。Claude 面板卡头「未知」印章左边出现白色纸飞机，点它进 Claude 那一单「整理导入流程」，接力卡卡头飞机为按下态。L-35：装前装后静止侧栏逐字节相同（`a3911c05bff7`）。**未做**：实机悬停面板里点纸飞机、实机点别家票根（L-09，电脑控制点不动悬停面板），留给常浩；装完截整屏看「想访问文稿」弹窗（L-06）。
- 截图：证据目录 `~/Library/Application Support/postpane/evidence/2026-11-14-359-click-plane/`：`click-chatgpt-own-panel.jpg`、`click-claude-own-panel.jpg`、`claude-panel-plane.png`、`claude-plane-into-relay.jpg`、`before-hud.png`、`after-hud.png`。
- 发布与回读：`install.sh 359-click-plane`：装前 `3419f5ba1910`（别的会话装的，本包已变基含 #363），产物 `d7a5344be952` / 已装 `d7a5344be952`，签名证书照常（`H"b773068e`），`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-359-click-plane/PostPane-3419f5ba1910.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：常浩的「都选甲」「都按推荐」是侧栏回复转进会话的，和给出的按钮 / 推荐一致，按常浩本人的回答处理。新回复卡的飞机只在场景预览台的代码层验证（预览台里场景回复事件已过期，看不到实物卡），靠 `relay-toggle.test.ts` 钉住；实机下一次有接力回信时再看。下一步：第 3 批之二「看板分家 + 小收据一行」。
- 本轮新坑：无

## 接力审核门第 2 批：驿窗判定实现（#347）（2026-11-14，Claude，常浩回「按推荐开工」批准第 2 批计划与三项推荐；已提交、未发布，等 L3 审查）

- 时间：开工 `2026-11-14 12:09`。来由：接力审核门 v1.1（决策记录 #343、勘误 #345；规则 multi-agent#7、agent-kit#71、digital-twin#185、my-skills#97 均为草稿）第 2 批，把「按风险级 1/2 轮」换成审核门。
- 改了哪些文件：
  - `src/crates/platform/src/clients/chatgpt/handoffs/gate.rs`（新）：上限（`reviewLimit`，默认 5）、计轮（证据不足暂停计、补格式不计）、判定 `decide()`（`Format` / `Stale` / 到顶 `Limit`）、`Gate` 字段（limit、chain、chainCarried、head、notice）。
  - `handoffs/chain.rs`（新）：审查链继承 `Book::earlier`、未知链校验、`format_asked`、第 2 轮起的「【驿窗附注】」（轮次 + 上一轮问题台账原文）。
  - `handoffs/gate_io.rs`（新）：台账截取、受审版本 / brief 里 head 的解析、`config.json` 读写（`set_project` 改为保留其他键）、回信全文存档 `replies/`。
  - `handoffs.rs`：去掉 `ROUNDS`、`Risk::reviews`、`Next::Settle`；新增 `StepKind::Format`、`Next::Format`、`Next::Stale`、`Flaw::NoVersion`；`rule()` 接审查链；`allow_extra` 改为开新授权周期；被补格式的那封回信保留全文。
  - `src/crates/host/src/handoff/gate.rs`（新）：发补格式请求、通过前 `git ls-remote` 回读 PR 当前提交、相关话术。`handoff.rs`：发送入口读上限 / head / 链并附注、`drive` 走补格式、`auto_back` 通过前核版本并记通知、回信存档、`relay` 返回 `chain`。`back.rs`、`texts.rs`：到顶、第 4 轮预警、版本不符、去掉 L1「补改未复审」。`lines.rs`：`pr_head`。
  - `src/apps/mcp/src/relay.ts`（新）：工具说明与参数（新增 `head`、`chain`，`extra` 改义），`index.ts` 引用它（基线 661→619）。
  - `src/packages/protocol/src/handoffs.ts`、`src/packages/hud/src/alerts/handoff-card.ts`：`format` 步、`limit` 等字段，卡上轮数按新口径算，时间线加「请 ChatGPT 补写末尾几行（不算一轮）」一行（沿用现有行样式）。
  - `docs/chatgpt-channel.md`「审核门」、`AGENTS.md`「AI 接入」、设置 →「AI 接入」页（`AiAccessPane.tsx`）读写说明同步。
- 会改变的现有行为（开工前已向常浩列出并获批）：上限 1/2 → 设置值（默认 5）；L1 补改不复审 → 复核；证据不足暂停不计 → 计；`extra` 加 1 轮 → 新授权周期；末尾认不出直接交常浩 → 先自动补一次；没写「审查出口」只看结论 → 先补格式。
- 测试：`pnpm run check` 通过；`pnpm test` 原样结果：cargo 合计 passed 947 failed 0；前端 `ℹ pass 433` / `ℹ fail 0`；MCP `ℹ pass 9` / `ℹ fail 0`；插件 `ℹ pass 14` / `ℹ fail 0`；扩展 `ℹ pass 13` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-347-review-gate/pnpm-test.log`。`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过。新增测试：platform `gate.rs` 4 项（五轮到顶与第五轮通过、证据不足计轮与预警、跨 PR 审查链与新周期、版本锚点与补格式、解析与设置读写），host 2 项（通过前回读 PR：一致 / 已变 / 读不到；未知链拒收、到顶标记、回信存档）。
- 验证：只做了单元与集成测试；未装机、未实机走接力。
- 截图：无（界面只多一行时间线文字，外观改动在第 3 批）。
- 发布与回读：未发布。按生效门，四个规则 PR 与本 PR 装机要一起切换；装机前确认没有开着的自动往返接力。
- 与授权不一致之处：计划写「`chains.json`」，实际没另建文件：审查链标识和累计数记在每张接力上（`chain`、`chainCarried`），新接力从同链最近一张继承，避免两份记录对不上；接力记录只留最近 200 张，链上最后一张被挤掉后再填这个 `chain` 会被拒收。「未决」行缺失不触发补格式（只展示）。转单 issue 是否存在驿窗不核（常浩选的推荐）。
- L3 第 1 轮返修（驿窗 `h1a1d854efb902`，返修，P1 ×7、P2 ×4）：P1-01 重启时有 PR / 受审提交的通过不再直接结束，留给自动往返先回读；P1-02 有 PR 的工程送审必须带 40 位受审提交，否则拒收；P1-03 「已通过」改看驿窗确认的 `notice=passed`，被版本闸拦下的通过照样继承轮数；P1-04 同一审查链新接力加入时关掉同链其他开着的接力（每步记「同一审查链转到新接力」）；P1-05 下一轮台账取最近一封实质回信（跳过补格式那封），优先读 `replies/` 存档原文；P1-07 `handoffs.json` 读不了就改名挪开、不再被空账本覆盖，结束的接力回信只留摘录；P2-01 补格式先记步再发，发完补收提前到的回信；P2-02 存档存原始回信（截断前）；P2-03 `git ls-remote` 超时真正结束子进程，凭据不交互；P2-04 旧的开着的接力启动时分配审查链并记一步「按审核门续审：已审 n 轮」。**P1-06（`extra` 凭文字就能开新授权周期）未改**：要改 #217 定下的授权方式，已单独发改动确认给常浩。测试：cargo 合计 passed 951 failed 0；前端 433/0、MCP 9/0、插件 14/0、扩展 13/0；`node --test tests/*.test.mjs` 22/0；新增反向测试 platform 3 项、host 1 项。日志 `evidence/2026-11-14-347-review-gate/pnpm-test-r1.log`。补改未复审（L3 第 2 轮待 P1-06 定了再送）。
- P1-06 落地（常浩 2026-11-14 先选「核实本人开头」，后定口径「外面进来的话开头就算数，只拦 Claude 自己写 extra」：他开「以我的身份发送」就是授权智能体替他说话，不想要就关掉开关）：新增 `platform/.../handoffs/leave.rs` 的 `Book::leave_spoken`，在 #258 `spoke_up` 之上再排除任何一张接力转回过的原话；`start_ruled` 新开一张到顶后的续审、`ask` 续审开着的那张，带 `extra` 时都读发起会话当前这一轮的开头（Codex 读它自己的会话记录），不是这条链最近一次转回之后、外面的话开的头就拒收，提示「请常浩在会话里说一句再送」（`texts.rs` `leave_unheard`）；核实通过时照样记「专项续审：…」并打开自动往返。`relay.ts` 的 `extra` 说明、`docs/chatgpt-channel.md`「审核门」同步。测试：两条旧的 extra 测试先在新实现下跑红（Claude 单方面写 extra 被拒），再改成正反两面（读不到开头、转回原话、转回之前开头都拒；常浩打字、插件进来的话放行并从 1 重计；Codex 读 `codex|会话`）；平台新增 1 项（跨接力的转回原话也不算）。`pnpm run check` 第 1 次只因 `cargo fmt` 失败，格式化后退出码 0；`pnpm test` 退出码 0：cargo 合计 passed 952 failed 0，前端 `ℹ pass 433` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-14-347-review-gate/{check-p106,check-p106-2,pnpm-test-p106,rules-p106}.log`。补改未复审，送 L3 第 2 轮。
- L3 第 2 轮（驿窗 `h1a1d872e80203`，返修；旧规则下 L3 最后一轮，交常浩）：P1-03、P1-05、P1-06、P1-07、P2-01～P2-04 关闭；P1-01、P1-02、P1-04 未关全，新增 P1-08、P1-09、P2-05、P2-06。常浩回「按推荐做」（七项全修，P1-08 用推荐做法，修完由他授权再审一轮）。返修：P1-02 续审时 brief 里新出现或换了的 PR 改绑到接力（`Book::set_pr`），同样要完整 SHA；P1-01 有 PR、没记受审提交的旧接力，通过一律不放行（宿主 `guard::no_anchor`）；P1-09 手动「转回 Claude」送通过的回信改走 `auto_back`，同样回读版本、对得上才结束（这一步卡上记成自动做的），非通过回信的文字也走同一个 `back_words`；P1-04 同链上一张还在等 ChatGPT 回信时拒收新接力（`Handoff::in_flight`、`guard::chain_busy`）；P1-08 同一会话或工作目录里有到顶未了结的工程接力，新开工程接力不论填不填 chain 都要外面的话开头（`Book::unsettled_top`、`guard::top_unsettled`），换会话又换目录且不填 chain、不写同 PR 的写明为信任边界；P2-05 结束接力的回信先确认 `replies/` 有全文（没有当场补存）才截，存不进去保持全文，旧记录读入时同样处理（`slim_kept`，从 `Book::trim` 挪到宿主保存前和 `load`）；P2-06 证据不足补证续审不再绕过当时的上限。新文件 `platform/.../handoffs/guard.rs`、`host/src/handoff/guard.rs`；`relay.ts` 的 `chain` 说明、`docs/chatgpt-channel.md`「审核门」同步。测试：宿主新增 6 项、平台新增 2 项；先改代码后写测试，逐项把修复撤掉重跑，每次恰好对应那条测试失败（P2-05 同样验过），恢复后全过；旧测试 `words_back_to_claude_wait_for_an_answer_and_a_way_there` 的回信从「通过」改成「返修」（手动转回通过改走自动往返，是 P1-09 定的新行为）。`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 passed 960 failed 0，前端 `ℹ pass 433` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-14-347-review-gate/{check-r2,pnpm-test-r2,rules-r2}.log`。补改未复审，等常浩授权再审一轮。
- L3 专项续审（常浩在会话里授权「再审一轮」，同一接力 `h1a1d872e80203`，受审 `8c10ecc`；返修）：P1-01、P1-02、P1-08、P2-05、P2-06 关闭；P1-04、P1-09 未关全；新增 P2-07～P2-10。回信 14:34 已到，但装着的旧版驿窗授权续审后没重开自动往返，回信卡在侧栏约 40 分钟，常浩问起才从 `handoffs.json` 读出（新代码的 `allow_extra` 会重开自动往返）。常浩回「按推荐做」：六项全修，修完授权一次只看这六项的定向复核。返修：P1-04 新接力接链时，同链打开失败、还可能晚到的那张（failed 且留着 brief）在 `close_others` 里去掉 brief，晚到的打开不能救活它；P1-09 版本没放行时转回整段改用 `held_back_text`（「回信写了通过，但驿窗没有放行……没有通过、没有结束」），不再先写已通过再补否定；顺手：后台续接 `wake_queued` 改发排队时的原文（无专门测试）；P2-07 `note` 带时间、到顶记 `topAt`，`unsettled_top` 以它为界（旧记录退回 `updatedAt`）；P2-08 续审的 PR、提交号、上限放进 `Asking.anchor`，只在 `went_in` 时记到接力上，额度、授权检查和附注用套上新锚点的副本算；P2-09 手动转回通过没执行且仍待转时报 `back_not_done`；P2-10 回信入账和存全文放进同一次 `change`，`archived` 取最长那份。测试新增宿主 3 项、平台 3 项，改了 3 条旧断言（「驿窗没有按通过结束」→「驿窗没有放行」且不得含「驿窗已结束这次接力」）。逐项撤掉修复重跑：P1-04、P1-09、P2-07、P2-08、P2-09 各自对应测试失败；P2-10 第一版测试撤修复仍过（读目录顺序碰巧先给长的），改成 12 组后撤修复失败。第一次撤修复验证时 tar 还原了旧修改时间、cargo 没重编，结果串了，改 `tar xmf` 重跑。还原后平台单测有一次 `268 passed; 1 failed`，没记下是哪条，之后连跑 4 次 269/0，原因未查明。`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 passed 965 failed 0，前端 `ℹ pass 433` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-14-347-review-gate/{check-r3,pnpm-test-r3,rules-r3}.log`。补改未复审，等常浩授权定向复核。
- L3 定向复核（常浩授权，同一接力，受审 `80601ca`；返修）：P1-04、P1-09、P2-07、P2-09、P2-10 关闭，P2-08 未关全并新增 P1-10（发送确认前重启，可能用旧锚点放行新 PR 的审查）。回信 15:36 已写完，但插件没报 `turn complete`（另一个会话 15:32:50 装机让驿窗 15:33:29 重启；`turns.jsonl` 和收件箱都没有那条），从常浩 Chrome 读出原文；漏报另开 #356 修。常浩回「按计划做」。P1-10 返修：送审前把请求号、PR、提交号、上限记成 `gate.pending`（落盘，`handoffs/guard.rs` 的 `Pending`），`went_in` 确认送到才清；`pending` 在时到的回信照样入账计一轮（`replied` 放宽，哪怕已转回 Claude），但 `pass_blocked` 一律拦下（`guard::unconfirmed`）；重启时有 `pending` 的卡上记一步（`pending_at_restart`），重启直接结束的通过排除有 `pending` 的；同一接力已送达 / 正在答时不收另一段不同的话（`guard::still_waiting`，同一段重送照旧）。协议类型补 `topAt`、`pending`。两条旧测试（`the_first_brief_opens_a_review_and_the_next_goes_into_it`、`a_swipe_is_done_only_by_the_handoff_that_names_it`）原来在第一段未回信时就送第二段，改为先回信再送（后者把上限设为 5）；新增 2 项：发送没确认 → 重启 → 回信通过：计一轮、不放行；在途拒收不同的话、同一段重送照旧、送到后 pending 清掉。逐项撤修复（拦通过、放宽入账、在途拒收、送前落盘）各自对应测试失败。`pnpm run check` 退出码 0；`pnpm test` 退出码 0：cargo 合计 passed 967 failed 0，前端 `ℹ pass 433` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `evidence/2026-11-14-347-review-gate/{check-r4,pnpm-test-r4,rules-r4}.log`。补改未复审，按复核意见只需针对 P1-10 做一次对应验证，是否再送审由常浩定。
- 合入 main（含 #356 的 #361、#363）（2026-11-14，常浩回「授权送审 P1-10」后做，为送审准备最终版本）：`CURRENT.md`、`docs/chatgpt-channel.md`、`handoff.rs` 有冲突，按两边意图合并：`take` 在同一次 `change` 里先 `belongs::fits` 再 `replied`、收下后存全文（#347 P2-10）；测试手写回信都带上提问。合并时发现两处要补：
  - #348 原有的缺陷：同链新接力开新对话时，`extend_brief` 把「【驿窗附注】」拼进了登记的原文，但 `open_away` 发出去的是调用方传入的原始 brief，附注只记在驿窗、没进 ChatGPT。改为 `Desk::open` 发出登记的原文（`h.brief`）。测试：跨会话续审那条加断言「开新对话的原文带【驿窗附注】」。
  - #356 的核对与 P1-10 衔接：核对认最近的「送审」或「补格式」（`Format`，#347 的补格式请求）步骤；还没确认送达的那段话存进 `gate.pending.words`（落盘前按 600 字截成摘录），也参与核对，回信照 P1-10 计一轮、不放行。不这样做，P1-10 的「重启后到的回信照样计一轮」会被 #356 当成别人的回信拒收。
  - 撤修复验证：两处撤掉各自对应测试失败（`evidence/2026-11-14-347-review-gate/revert-merge356.log`）。
  - 全量（合并后）：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，cargo 合计 passed 1011 failed 0，前端 `ℹ pass 449` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；规则检查通过（`*-merged.log`）。
- 本轮新坑：无。
## #356 返修：补报的回信必须是这一轮的、正文写完再报、发送失败 15 秒重试（2026-11-14，Claude，PR #361 合并后补做 L2 审查（接力 `h1a1d954523b00`）返修 P1 ×2、P2 ×3，常浩回「按推荐做 P1」，第 2 轮后回「甲，授权专项续审」，专项续审通过；已提交、未发布）

- 时间：开工 `2026-11-14 17:18`（ChatGPT 回信转回的时间，取自 `turns.jsonl`，没用 `date` 记）。来由：#361 合并后送 ChatGPT 做 L2 工程审查，结论返修；P2 只动 #356 新加的重读代码，直接改；P1 两条会让原有的正常上报变严，先向常浩列出、他回「按推荐做 P1」再改。
- 改了哪些文件：
  - `src/crates/host/src/handoff/belongs.rs`（新）：P1-01，收回信前核对这一轮的提问（插件报的 `prompt`）就是这张接力最近送出的原文（取最近一个 `ask` 步骤，两边去掉空白比开头 100 字）；对不上或读不到提问不收，回合日志记 `unmatched`。比对口径先拿真实数据核过：17:12 那次 6887 字的送审原文，页面上的提问去掉空白后与记录里的 600 字摘录逐字一致。没接力、没送过话的照旧交给 `Book::replied` 判断。
  - `src/crates/host/src/handoff.rs`：`take` 先过 `unmatched`；`observe`、`caught_up` 的回合日志用 `outcome`（多一个 `unmatched`）。测试：`Fake` 送话时记下原文，`turn()` 和手写回信带上它作为提问（像真实页面那样）；`ruled` 测试工具改成 `open` 送的就是登记的原文（之前两处不一致）；「绑上前就答完」那条先让页面显示原文。
  - `src/crates/host/src/handoff/reread.rs`：P2-03，交给插件失败不记满 2 分钟，15 秒后再试（`RETRY_MS`）。
  - `src/apps/chrome-extension/page.js`：P1-02，`answered()` 页面还没有用户消息时为假。
  - `src/apps/chrome-extension/content.js`：P1-02，正常上报也要 `answered()`；P2-01，重读等正文 600 毫秒不变再报（和正常上报同一标准），还在变就这次不报；P2-02，命令带对话 id，标签页先核对，回 `loaded` 说页面历史画出来没有。
  - `src/apps/chrome-extension/background.js`：P2-02，重读带上对话 id；回 `loaded: false` 就每 2 秒再问，最多再问 5 次。
  - `docs/chatgpt-channel.md`：提问核对、`unmatched`、重读的稳定与重试。
- 测试：`pnpm run check` 第 1 次只因新测试几行没过 `cargo fmt` 失败（`check.log`），格式化后退出码 0（`check-2.log`），格式化后单独重跑宿主测试 114/0；`pnpm test` 退出码 0，cargo 合计 passed 983 failed 0，前端 `ℹ pass 449` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 22` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-356-reread-fixes/`。新增：宿主 2 项（另一轮提问的回答与读不到提问的都不收、日志记 `unmatched`、本轮回答重读后照收；发送失败 15 秒重试），扩展 4 项（正文还在变不报、标签页核对对话与 `loaded`、停止按钮误判时旧回复不报、没有用户消息不算答完），后台 1 项（历史没画出来短间隔再问，最多 5 次）。撤修复验证：P1-01、P1-02（两处）、P2-01、P2-02（两处）、P2-03 逐项撤掉，各自对应测试失败（`evidence/2026-11-14-356-reread-fixes/revert-checks.log`）。
- 验证：只做了单元与集成测试；实机未做。
- 截图：无（无界面改动）。
- 发布与回读：未发布。
- 与授权不一致之处、遗留问题、范围外发现：
  - 中途误用 prettier 格式化了插件的三个 `.js`（它们不在格式检查范围、原本不是 prettier 排法），已恢复原排版、只保留实际改动，并在最终版本上复验了 P2 的撤修复。
  - ChatGPT 建议用用户消息 id 绑定轮次；驿窗送话时拿不到这条消息的 id（要改插件的发送流程），本次只用原文开头核对，同样的话在不同轮重送时靠 `messageId` 去重兜住。
  - 上一轮实机：17:12 那次接力回信 17:17 进了驿窗，常浩是否在 ChatGPT 写的过程中重新加载了插件，待他确认。
- 第 2 轮复审（同一接力，受审 `3a15b2f`：返修，预算用完交常浩）：P1-02、P2-01、P2-03 关闭；P1-01 未关（只比开头 100 字，开头相同、后文不同的提问会错收；核对和记下回信分两次加锁），P2-02 部分关闭（只画出提问就算加载完，短间隔重试提前结束），新增 P2-04（没有送出原文时放行）。常浩回「甲，授权专项续审」。补修：
  - `belongs.rs`：送出的话不超过 600 字（`EXCERPT`，改为 `pub`）整段去空白后相同才算，超过的提问要以摘录的 600 字开头；没有原文或原文为空拒收（P2-04）；`fits` 供 `take` 在同一次 `change` 里先核对再 `replied`。
  - `content.js`：`loaded` 改为「最新提问之后的回复已画出」或「正在生成」。
  - 测试：宿主新增 2 项（短原文被以它开头的提问冒用、前 100 字以上相同后文不同、超长原文按摘录前缀对上；没有原文拒收），扩展新增 1 项（只有提问时 `loaded: false`，回复画出后补报），两条旧测试的 `loaded` 改为 `false`。撤修复验证 4 处各自对应测试失败（`revert-checks.log` 末尾）。核对与记回信同一次加锁靠结构保证，没有并发测试。
  - 全量：`pnpm run check` 退出码 0（`check-r3.log`）；`pnpm test` 退出码 0，cargo 合计 passed 985 failed 0，前端 `ℹ pass 449` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 23` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；规则检查通过（`*-r3.log`）。
  - 剩下认不出的（写进 `docs/chatgpt-channel.md`）：同一段话原样送两次且前一次回信漏报；常浩自己的话以送出原文全部或前 600 字开头；漏报后常浩又问了一轮，插件只读最新回复，早先那条审核回信找不回。
- 专项续审（同一接力，受审 `61b6ca2`，常浩授权）：通过，P1-01、P2-04、P2-02 关闭，驿窗已结束接力。非阻断：发布前实机验证正常短提问、含 Markdown 的短提问、超长提问、插件中途重新加载、后台标签页延迟显示历史，重点看 `turns.jsonl` 有没有正常回信被记成 `unmatched`；三条已接受的边界不再开代码审查。
- 本轮新坑：无

## ChatGPT 接力：插件漏报「答完」时驿窗主动重读（#356）（2026-11-14，Claude，常浩回「按计划做」定三条做法、交接会话里回「按计划开工」；已提交、未发布，实机验证待做）

- 时间：开工 `2026-11-14 16:10`（本会话创建时间，取自会话信息，没用 `date` 记）；插件第一部分由上一会话提交 `05ea0cf`。来由：L3 定向复核（接力 `h1a1d872e80203`）15:36 的回信插件漏报「答完」，回信卡在 ChatGPT 里，常浩从 Chrome 读出原文才接上（#356）。
- 改了哪些文件：
  - `src/apps/chrome-extension/content.js`、`background.js`（`05ea0cf`）：注入时页面正在写，不把正在写的回复记成已报；新增 `reread` 命令，后台按上报 / 地址找标签页，找不到就后台新开，脚本断了先补注入。
  - `src/apps/chrome-extension/page.js`、`content.js`（本会话）：新增 `answered()`，最新一条回复排在最新一条提问之后才补报；否则那是上一轮的旧回信（同对话里别的接力的回信按 `messageId` 去重挡不住）。
  - `src/crates/platform/src/clients/chatgpt/commands.rs`（新）：`Channel::reread`（只发不等回应），`focus` 从 `mod.rs` 挪来；`mod.rs` 651→635 行，基线已收紧（顺带收紧了 main 上已变短的 `agents/src/transcript/live.rs` 677→676）。
  - `src/crates/host/src/handoff/reread.rs`（新）：`Desk::reread`，活着的接力在 `delivered` / `working` 阶段满 3 分钟、离上次重读满 2 分钟就请插件重读；插件没连上不发、不记。`handoff.rs`：`Lines::reread`、`Desk.reread_at`、app 层 `projection()` 调用；`handoff/lines.rs`：`AppLines::reread`。
  - `docs/chatgpt-channel.md`：协议表加 `reread`、`turn` 的 `reread: true`，接力一节加「漏报补救」。
- 测试：`pnpm run check` 第 1 次只因新测试文件没过 Prettier 失败（`check.log`），格式化后退出码 0（`check-2.log`）；`pnpm test` 退出码 0，cargo 合计 passed 970 failed 0，前端 `ℹ pass 442` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，扩展 `ℹ pass 17` / `ℹ fail 0`（格式化后单独重跑扩展仍 17/0，`extension-2.log`）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`；`node scripts/check-rules.mjs` 通过。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-356-chatgpt-reread/`。新增测试：宿主 2 项（满 3 分钟重读、2 分钟内不重复、重启后立刻重读、开始答后重新计时、补报回信只记一次、答完不再重读；插件没连上不发且不算一次）、平台 1 处（`reread` 帧、坏 id 拒收、断开后报错）、扩展 1 项（最新提问还没回时不补报）。撤修复验证：3 分钟门槛、2 分钟间隔、连接检查、阶段过滤、插件 `answered`、平台 id 检查，逐项撤掉各自对应测试失败（`revert-checks.log`，`tee` 打开失败，内容事后补存），还原用 `tar xmf`。app 层 `projection()` 里那一行调用没有测试覆盖（要 Tauri 运行时），靠实机验证。
- 验证：只做了单元与集成测试；**实机未做**（ChatGPT 写到一半时重新加载插件，回信照样进驿窗），要装机并请常浩重新加载插件。
- 截图：无（无界面改动）。
- 发布与回读：未发布。实机要从 main（不含 #348）打包装机：#348 合进 main 后再打包会把审核门一起装上，审核门要等生效切换。
- 与授权不一致之处、遗留问题、范围外发现：
  - 计划写「`chatgpt/reread.rs`」，实际叫 `commands.rs`，并把 `focus` 一起挪过去，免得 `mod.rs` 涨行数。
  - issue 写「插件重连、驿窗启动时重读」，没单独写：重启后阶段早已过 3 分钟，第一次刷新就重读；重连后最迟 2 分钟内重读。
  - 范围外发现：#357 会话（worktree `interesting-hugle-7778fb`）负载测试留下约 2600 个 `/usr/bin/env python3` 进程，打满每用户 4000 进程上限，本会话一度 `fork failed`；没动它。
- 本轮新坑：无
## 第 2 批补漏：实机的小人导演（Rust）也认「待核对」（#354 后续）（2026-11-14，Claude，第 2 批「按计划开工」范围内的补漏；已提交、已发布 `c1715a5c603b` 回读通过）

- 时间：开工 `2026-11-14 16:24`（`date '+%F %H:%M'` 在 16:29 记录，开工约早 5 分钟）。来由：#358 合并后核对上一会话转来的子 agent 要点时发现，应用里的小人指令走 Rust（`hud_bot_directions`，`src/crates/hud/src/bots.rs`），TS 的 `mark-director.ts` 只在浏览器预览用；#358 只改了 TS，实机小人仍把待核对会话当等你、摆「问你」，票根 working 也照算。
- 改了哪些文件：
  - 补漏（第 2 批本该包含的）：新 `src/crates/hud/src/stale.rs`（`is_stale`、`busy`，移植 `stale.ts`，含测试）；新 `src/crates/hud/src/bots/facts.rs`（`facts::of`：会话交给导演时，待核对且没有审批卡的当空闲、不带请求，移植 `session-facts.ts`）；`bots.rs` 改用它、加测试 `a_stale_session_rests_its_bot_unless_a_card_stands`；`vendors.rs` 的 working 改用 `busy`；`lib.rs` 登记 `stale`。
  - 顺手改的：行数基线收紧 3 项（`live.rs` 677→676、`bots.rs` 662→635、`vendors.rs` 420→417）。
  - 改变了已有行为的：实机上，待核对的会话不再让小人摆「问你」、不再算这家在干活（与 #358 里 TS 的行为一致，是 #358 原定行为在实机补齐）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `979 passed; 0 failed`，前端 `ℹ pass 449` / `ℹ fail 0` / `ℹ todo 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。跑了两遍：第一遍基于 `b0dd2b3`，结果同上；main 随后合进 #360（`stdio.rs`），变基后重跑仍同上（L-47 照做，测试和打包不并行）。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-354-bot-stale/`：`check*.txt`、`test*.txt`、`node*.txt`。
- 验证：新测试覆盖三种：待核对无卡 → 空闲、无请求、不在干活；待核对有卡 → 等你、带卡；没过半小时 → 等你、在干活。`directs_as_the_typescript_director_did`（TS/Rust 对拍）照常通过。L-35：装前装后静止侧栏逐字节相同（`795a0cea4c69`）。**未做**：实机看到小人对待核对会话不再摆「问你」（此刻本机没有静默 30 分钟以上的提问会话）；装完截整屏看「想访问文稿」弹窗（L-06）。
- 截图：证据目录 `before-hud.png`、`after-hud.png`。
- 发布与回读：`install.sh 354-bot-stale`：装前 `4b34a5507b3f`（#360 会话装的，本包已变基含 #360），产物 `c1715a5c603b` / 已装 `c1715a5c603b`，签名证书照常（`H"b773068e`），`install.sh check` 一致。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-354-bot-stale/PostPane-4b34a5507b3f.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：上一会话转来 B1 子 agent 没把握的四点，结论：① 待核对口径用「请求后日志静默满 30 分钟」，已按此实现（#358）；② **B1 修不到「Codex App 等审批掉出侧栏」**：Codex 等审批时那次调用在会话记录里不带 request，靠原生等待与 `PermissionRequest` 钩子那条路，不归 B1；③ **驿窗重启后，重启前就正常退出的 Claude 会话认不出已结束**（`gone` 只记本次运行看到的退出），若它留着没答的提问，1 天内会显示「等你 · 待核对」，可左滑「移除」；Windows 上一直如此；④ 桌面「下一步」常驻提问在 `facts.requests` 里会出现两条同 id，#358 之前就这样；前端 `isStale` 用「全部 stale」不受影响，导演合并请求按 id 去重，`presentation.rs` 只替换不计数，暂不改。clippy 两条旧警告（`hermes/transcript.rs:364`、`claude_desktop.rs:29`）仍在，非本批。
- 本轮新坑：L-49

## 修偶发失败的投递测试：握手和要验的写入截止分开计时（#357）（2026-11-14，Claude，由 #353 的会话开卡交办；已提交、无需发布）

- 时间：开工 `2026-11-14 16:05`（`date '+%F %H:%M'` 记录）。来由：#353 第一遍全量测试里 `platform` 的 `delivery::tests::native::a_write_to_an_app_server_that_stopped_reading_ends_at_the_deadline` 报 `TimedOut`，单独重跑 3 次 2 过 1 败；当轮按范围外未修，单开这张。issue #357。
- 改了哪些文件：
  - 交办的：`src/crates/platform/src/delivery/process/stdio.rs`（加仅测试编译的 `set_timeout`，握手完再改请求超时）；`src/crates/platform/src/delivery/tests.rs`（这项测试 `StdioServer::open` 的握手超时 3 秒 → 30 秒，握手完 `set_timeout(3 秒)`，要验的「写给不再读的 app server 3 秒截止、返回 AcceptanceUncertain、10 秒内结束」不变；同文件另一项起 python 替身的 `enqueue_without_a_daemon_goes_through_a_short_lived_app_server`，service 超时 10 秒 → 30 秒，它验的是正常入队，超时只在失败时才用到）。
  - 顺手改的：`docs/LESSONS.md` 新增 L-48（#358 同时占了 L-47，变基后改号）。
  - 改变了已有行为：无（生产代码只多一个 `#[cfg(test)]` 方法）。
- 测试：复现：只把 CPU 打满跑 8 次、32 个并发都全过，复现不出；一边批量新建并执行几百个 python 脚本、一边并发跑 16 次，修复前 16 次全败（都在 3.06 秒报 `TimedOut`），入队那项在更重的压测下也 16 次全败（10.12 秒）。修复后同样压测两项各 16 次全过。验收：这项测试单独连跑 20 次 `pass=20 fail=0`，每次 `finished in` 3.23–3.88 秒（写入截止仍是 3 秒在起作用）。三条全量：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `968 passed; 0 failed`，前端 `ℹ pass 442` / `ℹ fail 0` / `ℹ todo 3`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。开 PR 后 main 合进 #358，变基（CURRENT、LESSONS 冲突，L-47 被 #358 占用，本轮改用 L-48）后重跑：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `977 passed; 0 failed`，前端 `ℹ pass 449` / `ℹ fail 0` / `ℹ todo 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` 第一次 `ℹ pass 21` / `ℹ fail 1`（冲突合并时两节交接的末行错位，顶部一节缺「本轮新坑」），理顺后 `ℹ pass 22` / `ℹ fail 0`。日志在 `~/Library/Application Support/postpane/evidence/2026-11-14-357-flaky-stdio/`（`run-1..20.txt`、`loop-summary.txt`、`check.txt`、`test.txt`、`node-test.txt`、`exits.txt`；变基后 `*-2-rebased.txt`、`exits2.txt`、`node-test-3-fixed.txt`）。
- 验证：纯测试改动，靠上面的压测与连跑验证；Compiling 行确认是本 worktree 路径。
- 截图：无（无界面改动）。
- 发布与回读：无需发布。
- 与授权不一致之处、遗留问题、范围外发现：生产里 `StdioServer` 的握手与请求仍共用一个超时（Codex 入队、新开线程走 10 / 20 秒），真实 codex 冷启动慢时同样会占掉请求的时间，本轮没动。压测时 8×400 个脚本留下 2800 多个卡在系统扫描上的进程、顶到每用户进程数上限，已 `pkill -f` 清干净（写进 L-48）。skill 进化：无。
- 本轮新坑：L-48

## 工作场所契约第 2 批：等你三态与统一工作场所视图（#354）（2026-11-14，Claude 两个会话 + 1 个子 agent，常浩回「按计划开工」；已提交、已发布 `3b6524467f30` 回读通过）

- 时间：开工 `2026-11-14 15:37`（取自分支创建时间 `git reflog`；上一会话做到一半因上下文到 50% 交接，本会话 15:45 接手）。来由：ADR-0001 第 2 批，统一数据与状态。上一会话写了前端（提交 `b02a697`）并派子 agent 改后端；本会话等子 agent 停笔后审它的改动，补完前端，契约测试转正，跑测试、装机、交接。issue #354。
- 改了哪些文件：
  - 常浩要求的（B1，后端，子 agent 写、本会话审）：`agents/src/transcript/live.rs`：会话记录里仍开着的提问（`AskUserQuestion`、Codex `request_user_input`、桌面应用「下一步」提问）不再因 30 分钟没新日志就当放弃，一直算 waiting；静默满 30 分钟的请求事实带 `stale: true`（「待核对」），到点不用新事件也会刷新。`agents/src/claude/processes.rs`：已退出的 Claude 进程不再过一小时就忘（请求不再自己过期，忘了会让等你冒回来），#251 进程已死照旧撤。`core/src/database/checkpoints.rs`：等你的会话不再无视一天的列表窗口（不然几天前没答的提问会回来）。新测试 `agents/src/transcript/open_request_tests.rs`（6 条：45 分钟仍等且 stale、10 分钟不 stale、答了不再等、没提问的安静回合照旧变空闲、到 30 分钟那一刻转 stale、桌面「下一步」提问一小时后仍等），`claude/processes_tests.rs` 1 条（干净退出的会话一天后仍算结束），`core/src/presentation/tests.rs` 2 条（进程没了就不等，#251；超过一天的提问不回列表）。
  - 常浩要求的（前端）：`hud/src/workspace.ts`（每家一份工作场所视图 `workspaceOf`：等你（待核对排后）/ 在跑 / 出错 / 接力；`relaysOf`、`cardRelays`）；`hud/src/stale.ts`（`isStale`、`isBusy`）；协议 `AttentionFact.stale`；卡底「正在进行」改从 `workspaceOf` 取，没审批卡的等你也列（B3）；待审批卡纸飞机只进本家参与的接力（B4，C2）；看板会话行遇待核对显示「待核对：很久没有新动静」；待核对不算 working，小人导演把它当空闲、不带请求（有审批卡时卡就是证据，仍算等你）。契约测试 `hud/test/workplace-contract.test.ts`：B3、B4、B9 转正，新增 B1 一条（12 条全过、0 todo）；场景 `codex-stale`（`test/scenes/scenes.ts`、`build.ts` 加 `stale`）。
  - 顺手改的：300 行棘轮（上一会话的 WIP 提交让 3 个文件超基线）：小人导演看会话的那段（`Facts`、`time`、请求合并）从 `bots/mark-director.ts` 拆到新 `bots/session-facts.ts`（`factsOf`，加测试 `hud/test/session-facts.test.ts` 3 条）；`liveSessionLine` 从 `panel/agent-board.ts` 拆到新 `panel/live-line.ts`，`SessionsSection.tsx`、`test/agent-board.test.ts` 改导入；`model.ts` 的 working 改用 `isBusy`；基线收紧 3 项（只减）。拆的时候修了上一会话前端的一个漏洞：原来只把待核对会话的 phase 改成 idle，它的请求仍进小人的请求队列，小人照样摆「问你」。
  - **改变了已有行为的**：只在会话记录里的提问（没有审批卡）超过 30 分钟不再消失，挂成「待核对」，直到答复、Claude 进程确认已死、或离开一天的列表窗口；手动忽略用现有左滑「移除」（C4 不做 24 小时折叠）。卡底「正在进行」现在也列没审批卡的等你。待审批卡上的纸飞机只进本家参与的接力，角标数随之变小（DeepSeek 卡不再出现纸飞机）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `973 passed; 0 failed`，前端 `ℹ pass 449` / `ℹ fail 0` / `ℹ todo 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。第一次 `pnpm run check` 没过：上一会话的 WIP 提交让 `mark-director.ts`（504/502）、`model.ts`（353/350）、`agent-board.ts`（459/445）超基线（`check-1-file-size.txt`），拆文件后重跑三条全过。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-354-workplace-state/`：`check.txt`、`test.txt`、`node-tests.txt`。 **合并前 #353 先进了 main，变基后重跑**（`live.rs` 两处冲突：保留 #353 的 `with_background`，叠上本批的请求逻辑）：`pnpm run check` 退出码 0；`pnpm test` Rust 合计 `977 passed; 0 failed`、前端 `ℹ pass 449` / `ℹ fail 0` / `ℹ todo 0`，MCP 第一次 `ℹ fail 2`（和打包同时跑、负载 15–20，两条各卡 45 秒、100 秒），补跑又换一条 `ℹ pass 8` / `ℹ fail 1`，负载降下来单独跑 `ℹ pass 9` / `ℹ fail 0`（L-47）；插件 `ℹ pass 14` / `ℹ fail 0`、Chrome 插件 `ℹ pass 13` / `ℹ fail 0` 是补跑的（`pnpm test` 在 MCP 处就停了）；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。日志 `check-rebased.txt`、`test-rebased.txt`、`test-rebased-rest.txt`、`test-mcp-3.txt`、`test-rebased-plugins.txt`、`node-rebased.txt`。
- 验证：场景预览台（本 worktree，127.0.0.1:1480，本机 `.claude/launch.json` 加了 `scenes-354`）`codex-stale` 场景开看板：Codex「正在进行 · 2」，「改日志格式 · 等你回复」在前，「清理旧的构建缓存 · 待核对：很久没有新动静」在后；拆文件后复查同一行仍在。L-35：装机前隔 2 秒两张静止侧栏逐字节相同（`897b6d7b5f4a`）；装后约 30 秒、再隔 2 秒的两张逐字节相同（`795a0cea4c69`）。装前装后 Claude、Codex、Hermes、DeepSeek 四张票根一样，ChatGPT 票根从「审」印章变成「在答」：装机前 2 分钟（16:04）接力单 `h1a1d90c43af00` 返回、只剩 `h1a1d872e80203` 在答，是真实状态变了，本轮没碰 `relay-stamps.ts`、`chatgpt-desk.ts`、`HUDMarkStrip.tsx`。**未做**：实机看「待核对」那一行（此刻本机没有静默 30 分钟以上的提问会话）、装完截整屏看「想访问文稿」弹窗（L-06）。
- 截图：证据目录 `scene-codex-stale-panel.jpg`。`before-hud-1/2.png`、`after-hud-0s.png`、`after-hud-1/2.png`。
- 发布与回读：第一次（变基前）装 `7d3823d6853d`，装前 `bf91100ccab6` 是并行 #353 会话装的测试包，被覆盖。#353 随后合进 main，本分支变基后从含 #353 的代码重打重装：`install.sh 354-workplace-state` 装前 `7d3823d6853d`，产物 `3b6524467f30` / 已装 `3b6524467f30`，签名证书照常（`H"b773068e`），`install.sh check` 一致；L-35：变基包装前装后静止侧栏逐字节相同（`795a0cea4c69`，`rebased-before-hud.png`、`rebased-after-hud.png`）。实机现在同时含 #353 和本批。回滚到变基前的包：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-354-workplace-state/PostPane-7d3823d6853d.app" /Applications/PostPane.app; open /Applications/PostPane.app`；回到 #353 的包把路径换成同目录 `PostPane-bf91100ccab6.app`。
- 与授权不一致之处、遗留问题、范围外发现：常浩的「按计划开工」是经 agent-hud 插件转进本会话的侧栏回复，和上一轮给的按钮一字不差，按常浩本人的回答处理。**撤下一条**：审核报告里「补 Codex 完成、提醒钩子」不做——Claude 的「完成」同样是 `None`、从会话记录判断，Codex 等审批已由 `PermissionRequest` 钩子加桌面观察器覆盖（issue #354 第 3 条）。看板目前仍是全局「正在进行」列表、没从 `workspaceOf` 取，归第 3 批 C1 看板分家。B9 只做了数据层（`workspaceOf().failed`），出错回执归第 3 批 C6。范围外发现（上一批记过）：有待审批卡时点任何一家票根都先弹那张卡，归第 3 批。下一步：第 3 批界面统一，先出三版预览。skill 进化：无。
- 本轮新坑：L-47

## Claude 会话挂着后台命令时侧栏不再误报 REPLY（#353）（2026-11-14，Claude，常浩截图指出「明明是后台在跑，但是显示的反而是回复，这不合理」；已提交、已发布 `bf91100ccab6` 回读通过）

- 时间：开工 `2026-11-14 15:35`（`date '+%F %H:%M'` 记录）。来由：一个 Claude 会话用 `run_in_background` 跑全量测试、说完「等测试结果出来补上数字」就停下，侧栏立刻出 REPLY，当成回复完成。issue #353。
- 改了哪些文件：
  - 常浩要求的：`src/crates/agents/src/claude/background.rs`（新文件：记下没收到通知的后台命令——`toolUseResult.backgroundTaskId` 记入，`<task-notification>` 的 `<task-id>` 或 `TaskStop` 移除；把它并进「子活动」时间；回合已结束时看板读到 `work: shell`；4 项测试）；`src/crates/agents/src/transcript/live.rs`（`LiveLog` 加 `background` 字段，`session_state`、`next_change`、`facts` 三处并入后台命令，`delegating` 仍只看子 agent，Claude 行入口改走 `claude_line`）；`src/crates/agents/src/claude/mod.rs`（声明模块）。
  - 顺手改的：`live.rs` 里 `keep_words` 两段同条件的复制合成一个循环、`new` 里文件名取两次合成一次（行为不变，为守 300 行棘轮腾出行数）；`ABANDONED_MS` 改为 `pub(crate)` 供新模块用；`docs/LESSONS.md` 新增 L-46。
  - 改变了已有行为：Claude 会话一轮结束时还有没收到通知的后台命令，侧栏判为「在跑」（看板写「正在跑命令」），不出 REPLY；通知回来、Claude 最后真正停下才出 REPLY。兜底：后台命令启动 30 分钟（与子 agent 同一时限 `ABANDONED_MS`）仍没通知，照原样算完成、出 REPLY。代价：用后台命令起的常驻服务（如开发服务器）在启动后 30 分钟内，那几轮的回复会被压住。
- 测试：第一遍 `pnpm run check` 退出码 0；`pnpm test` Rust `962 passed; 1 failed`，失败项是 `platform` 的 `a_write_to_an_app_server_that_stopped_reading_ends_at_the_deadline`（启动 python 替身用 3 秒握手超时，机器忙时 `TimedOut`；单独重跑 3 次 2 过 1 败，与本改动无关）。补看板文字后第二遍全量：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `968 passed; 0 failed`，前端 `ℹ pass 442` / `ℹ fail 0` / `ℹ todo 3`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。去掉修复后新测试 4 项里 2 项变红，确认能抓到原问题。日志在 `~/Library/Application Support/postpane/evidence/2026-11-14-353-bg-reply/`（`check*.txt`、`test*.txt`、`node*.txt`、`build*.txt`）。
- 验证：装机后在 `~/.claude/projects/` 写一份临时探针记录（挂后台命令后 `end_turn`），用 MCP `hud_sessions` 读驿窗实机：`state: running`、`outcome: null`、`activity.work: shell`、`delegating: false`；验完删除探针。收到通知后再结束出 REPLY、30 分钟兜底由单测覆盖，实机未等。
- 截图：无（侧栏外观未改，判定变化用实机读数验证）。
- 发布与回读：先装 `05d6f7df85f9`，补看板文字后重装 `bf91100ccab6`，产物与已装一致、签名证书 `H"b773068e`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-353-bg-reply/PostPane-0df35d5631a3.app" /Applications/PostPane.app; open /Applications/PostPane.app`（回到本轮之前的 `0df35d5631a3`）。
- 与授权不一致之处、遗留问题、范围外发现：上面那项 `platform` 投递测试偶发超时，属范围外，未修（项目规定范围外不顺手修，全局 CLAUDE.md 第 3 节则允许顺手修相关问题，两边冲突，已报告常浩）。改动前的旧解析检查点没有 `background` 字段，按默认空读入，装机那一刻已挂着的后台命令识别不到，之后新挂的都认。skill 进化：无。
- 本轮新坑：L-46

## 工作场所契约第 1 批：修与契约无关的 13 个缺陷（#351）（2026-11-14，Claude 主会话 + 2 个子 agent，常浩回「开工第 1 批」；已提交、已发布 `0df35d5631a3` 回读通过）

- 时间：开工 `2026-11-14 15:05`（`date '+%F %H:%M'` 记录）。来由：ADR-0001 第 1 批，修审核报告与 Codex 11-11 两份审计里和契约无关的缺陷，不改已定行为。分三组：子 agent 甲修额度引擎（B12、B13、B17），子 agent 乙修送话与 DeepSeek 观察器（B5–B7、B18、B19），主会话修 B14、B15、B16、B22、H2 并审两组改动。每项先写失败测试再修。接力文件里的 B10、B11、B20、B21 等 #347 合并后再做。issue #351。
- 改了哪些文件：
  - 常浩要求的：B5 `core/src/requests.rs` + 新 `requests/native_waiting.rs`（等待标记按「来源 + 观察器」分开存、读时取并集），`clients/deepseek/questions.rs`、`deepseek_plugin/asks.rs` 各用自己的观察器名；B6 `deepseek_plugin/asks.rs` + 新 `asks/card.rs`（侧栏答过或交不出就不再算等待，宿主不再报到且过 5 秒宽限就撤卡删文件）；B7 `questions.rs`（投递失败也移出 pending 并重新发布）；B12 `platform/src/accounts/mod.rs`（外部读取移到锁外，只在写结果时短暂取锁，单工作线程不重入）；B13 `accounts/engine.rs`、`os/{mod,unix/mod,windows/mod}.rs`（Unix 引擎自成进程组，结束时只杀本次启动的组；Windows 维持原样）；B14 `packages/engine-client/src/index.ts`（每个子进程自己的缓冲区，被换下的子进程输出不再处理）；B15 `platform/src/hooks/endpoint.rs`（按字节解分块后再解码 JSON，坏分块读作无）；B16 `agents/src/claude/cloud.rs`（200 但没有 `data` 列表算读取失败，不当空列表）；B17 新 `agents/src/redact.rs`，接到 `claude/account.rs` 的 `engine_failed`、`engine.rs` 的 stderr 片段；B18 `delivery/{journal,mod,service}.rs`（终态回执只读一次、按修改时间缓存，7 天后删除，7 天内同 id 不重投）；B19 `delivery/sending.rs`（会话锁表存 `Weak`，新建时清理无人持有的项）；B22 `hud/src/panel/ReviewSlip.tsx`（纸条里的行改读审核纸本身的墨，L-42 漏的那处）；H2 `hud/src/panel/QuotaSection.tsx`（重置额度按账户有没有这项读数显示，不按 Codex 名字）。新增测试：`engine-client/test/late-output.test.ts`、`accounts/engine_tests_unix.rs`，各文件内测试若干（见 PR）。
  - 顺手改的：子 agent 甲在 `accounts/mod.rs` 的 `failed_reading` 对所有来源的失败说明统一脱敏（超出点名范围）；`engine_failed` 改写法守行数，输出文字不变；原测试 `readings_run_one_at_a_time_and_never_beside_a_local_pass` 按新规则改名 `..._land_between_local_passes`，`restored_accounts_keep_...` 的假读取器改为返回错误。我改了 `runtime/src/lib.rs`、`host/src/lib.rs`、`engine/src/main.rs` 三处过时注释（原写「账户读取占着锁」）；`hud/test/scenes/scenes.ts` 加 `chatgpt-reviews` 场景（看审核纸条）；子 agent 的新测试按 `check-test-paths` 改用私有子目录或标 `// plain directory`；`src/tooling/file-size-baseline.json` 收紧 6 项（只减）。
  - **改变了已有行为的**：额度读取可以和本地采集同时进行，只有写结果避开采集；账户失败说明里的令牌、key、敏感 URL 参数显示成 `***`；DeepSeek 投递失败后不再显示「等你」；DeepSeek 宿主崩溃后问题文件和卡在约 20 秒内撤掉（原来等到侧栏时限、文件留 24 小时）；终态送话回执 7 天后删除（含 Codex 停在「不确定」的那种），之后同 id 可重投。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `964 passed; 0 failed`，前端 `ℹ pass 442` / `ℹ fail 0` / `ℹ todo 3`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。前两次没过：第一次 `runtime/src/lib.rs` 注释多一行超白名单上限（`check-1-runtime-505.log`），第二次子 agent 新测试把临时目录本身交给私有目录代码（`check-2-test-paths.log`），改后重跑三条全过。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-351-batch1-fixes/`。
- 验证：B22 在场景预览台 `chatgpt-reviews` 场景点 ChatGPT 票根，纸条行标题修复前 `rgb(236, 231, 220)`（浅字压浅纸）、修复后 `rgb(38, 48, 63)`；装机后真实悬停看板底部审核纸条那一行同样是深字。B12：装机后看板 Claude、Codex 额度照常读出。其余后端项靠单元测试，没有实机复现（宿主崩溃、引擎后代持管道、云端返回坏结构等不便在本机制造）。**未做**：装完没截整屏看「想访问文稿」弹窗（L-06）。
- 截图：证据目录 `b22-slip-before.png`、`b22-slip-after.jpg`、`before-hud.png`、`after-hud.png`（两张逐字节相同 `59dcabeb77cd`）、`after-panel.png`、`finding-chatgpt-click-shows-deepseek-card.jpg`。
- 发布与回读：`install.sh` 回读产物与已装一致 `0df35d5631a3`，签名照常；装前 `345fe1c63fbf`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-351-batch1-fixes/PostPane-345fe1c63fbf.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题、范围外发现：B6 里 DeepSeek 提问「过期」不算解决（过期是交回 Harness 自己的卡，Harness 仍在等），和「留给 Harness」一致；B18 没有在互发消息关闭时跳过维护，因为接力也走同一个送话服务。范围外发现：有待审批卡时点任何一家的票根都先弹那张卡（`two-relays` 场景点 ChatGPT 弹出 DeepSeek 的审批卡，纸飞机标 2），归第 3 批界面统一；`hermes/transcript.rs:364`、`core/src/clients/claude_desktop.rs:29` 有两条 clippy 警告（非本批改动，`pnpm run check` 未拦）；Windows 引擎后代、`setsid` 跳出进程组的后代仍收不到；脱敏按规则匹配，`Authorization:` 同行后面的字会一起藏。下一步：第 2 批统一数据与状态（B1–B4、B8、B9、Codex「完成」「提醒」钩子）。skill 进化：无。
- 本轮新坑：无

## 工作场所契约 Lite 第 0 批：契约规范、四家固定场景、场景预览台（#349）（2026-11-14，Claude，常浩要求全面审核侧栏结构，看审核报告后要求「先送 GPT 评审」，评审成熟退出后在侧栏回「按修订推荐开工」；已提交、无需发布）

- 时间：开工 `2026-11-14 14:49`（`date '+%F %H:%M'` 记录）。来由：常浩说 Claude、Codex、ChatGPT、DeepSeek「本质上是一种性质，都是我的工作场所，而 hermes 单独是一个」，要求深度审核、把 bug 和底层设计问题都改好。审核报告 https://claude.ai/artifact/93PYbCRqfK2rsgvAnpaWwd （第 2 版顶部是评审后修订）；ChatGPT 思维评审接力单 `h1a1d8c8a62905` 成熟退出，决策记录 `docs/design/2026-11-14-工作场所契约.md`；C1–C7 常浩按修订推荐定（C7 暂缓）。本批只打地基，界面和行为不变。issue #349。
- 改了哪些文件：
  - 常浩要求的：`docs/adr/0001-工作场所契约.md`（契约：结构、身份分层、等你三态、能力四态、界面约定、白名单、C1–C7、分批）；`GLOSSARY.md`（领域术语）；`src/packages/hud/test/scenes/`（`base.json` 脱敏骨架 + `build.ts` 构造函数 + `scenes.ts` 8 个合成场景）；`src/packages/hud/test/workplace-contract.test.ts`（11 条契约，3 条 `todo` 注 B3、B4、B9）；`src/packages/hud/preview/`（场景预览台：`main.tsx`、`vite.config.ts`、`preview.css`、`index.html`，`pnpm --filter @agent-hud/hud run scenes` → 127.0.0.1:1480）；`src/packages/hud/package.json`（`scenes` 脚本、devDependencies 加 workspace 的 `@agent-hud/vite-config`）、`tsconfig.json`（纳入 `preview`）、`pnpm-lock.yaml`（随之 3 行）。
  - 顺手改的：`docs/design/驿窗结构审核-2026-11-14.html`、`docs/design/2026-11-14-工作场所契约.md` 从主目录未跟踪文件移进本分支入库；`AGENTS.md` 导航表加一行（改侧栏结构先读 ADR-0001、跑契约测试、用预览台）；`docs/LESSONS.md` 新增 L-45。本机 `.claude/launch.json` 加 `scenes-349`（不进仓库）。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `941 passed; 0 failed`，前端 `ℹ pass 441` / `ℹ fail 0` / `ℹ todo 3`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 22` / `ℹ fail 0`。第一次 `pnpm run check` 预览台放在 `src/apps/desktop/preview-scenes/`，包边界检查报 8 处越界（L-43），日志 `check-1-desktop-layout.log`；挪进 hud 包后重跑通过。日志在 `~/Library/Application Support/postpane/evidence/2026-11-14-349-workplace-scenes/`：`check.log`、`test.log`、`rules.log`。
- 验证：内置浏览器打开预览台 8 个场景（`?panel&still`），每个都渲染出真实 `HUDScene` 和看板、页面脚本无报错、小人画布 5–7 个（脚本逐个场景开 iframe 读的）。挪位后在 `two-relays` 场景复查：样式一致、`matchMedia` 代理带 `addEventListener`、按钮字色正常。场景里能直接看到审核时说的现状：Claude、Codex 区块没有会话，全局「正在进行」排在最后。
- 截图：证据目录 `preview-mixed-panel.png`、`preview-two-relays-panel.png`；应用本身无界面改动。
- 发布与回读：无需发布（应用代码未改，只加了测试、预览台和文档）。
- 与授权不一致之处、遗留问题、范围外发现：常浩的「按修订推荐开工」是经 agent-hud 插件转进本会话的侧栏回复，内容和上一轮给的选项一字不差，按常浩本人的回答处理。审核发现 6 个 Claude 桌面版会话挂着「等你回复」最长 5 天，来源是桌面版「下一步」提问框（`mcp__ccd_turn__wrap_up` 被认作提问），第 2 批做 C4 时一并处理。下一步：第 1 批修与契约无关的 bug（B5–B7、B12–B19、B22、H2）；接力文件里的 B10、B11、B20、B21 等 #347 合并后。skill 进化：E-18 待批（预览统一用场景预览台，见 EVOLUTION）。
- 本轮新坑：L-45

## 装机脚本拒收带日期的短名（E-17），全局坑新增 G-28（2026-11-14，Claude，常浩对 #341 收尾的两条提案回「都加」；已提交、无需发布）

- 时间：开工 `2026-11-14 11:51`（取自分支创建时间 `git reflog`，开工时没跑 `date` 记录）。来由：#341 装机时把带日期的全名当短名传给 `install.sh`，备份落进日期重复的目录；#341 预览页因脚本里的全局变量 `claude` 与 Artifact 宿主重名而空白。两条在 #341 收尾时提案，常浩回「都加」。
- 改了哪些文件：`.agents/skills/postpane-round/scripts/install.sh`（短名以 `YYYY-MM-DD-` 开头就报错退出 2，提示去掉日期后的写法，在查接力、备份、退出应用之前）；`SKILL.md` 第 3 步第 3 条写明短名不带日期；`EVOLUTION.md` E-17 改为「已采纳」；`tests/postpane-round.test.mjs` 加一条（传 `2026-11-14-341-relay-toggle` 得退出码 2、提示「用 341-relay-toggle」）。全局坑在 agent-kit：`LESSONS.md` 新增 G-28（agent-kit PR #72，`76aa37e`），触发词 `/\b(const|let|var|function|class)\s+claude\b/`，已在 agent-kit main 上重跑 `node tools/install.mjs --only claude --apply`，运行时副本 `~/Library/Application Support/agent-kit/runtime/LESSONS.md` 含 G-28。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `941 passed; 0 failed`，前端 `ℹ pass 433` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` 第 1 次 `ℹ pass 21` / `ℹ fail 1`（E-17 状态写成「已采纳（本 PR，常浩回「都加」）」，测试要求「已采纳（本 PR，#编号）」，日志 `rules-1-status-format.log`），先开 PR 拿到 #346 回填后 `ℹ pass 22` / `ℹ fail 0`。`node --test tests/postpane-round.test.mjs` `ℹ pass 14` / `ℹ fail 0`。agent-kit `node --test tests/*.test.mjs` `ℹ pass 78` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-e17-install-name/`：`check.log`、`test.log`、`rules.log`。
- 验证：新测试真跑脚本、不动应用（拒绝发生在查接力与备份之前）。没有真装机。
- 截图：无
- 发布与回读：无需发布（只改装机脚本、skill 文字与测试）。
- 与授权不一致之处、遗留问题、范围外发现：无。skill 进化：E-17 已采纳。
- 本轮新坑：无

## 侧栏进出接力改成卡头同一个白色纸飞机方块，拿掉标题行 ×（#341）（2026-11-14，Claude，常浩说 #334 的「可退出没做好，应该是一个单独按钮」，三版预览里选丙，装机后又要求「飞机要单独的颜色，不要蓝色，可以白色」；已提交、已发布 `345fe1c63fbf` 回读通过）

- 时间：开工 `2026-11-14 11:25`（`date '+%F %H:%M'` 记录）。来由：常浩反馈 #334 标题行「×」没做好，进接力和退接力应是同一个按钮。三版预览 https://claude.ai/artifact/3Ya3jFccSdcF7GPFkgfqiz （甲 文字按钮 / 乙 拨动开关 / 丙 方块图标），常浩回「选丙」。多单时进哪一单常浩没另说，按预览页推荐做：进最近有动静的一单（`phaseAt || updatedAt` 最新），角上标单数。issue #341。
- 改了哪些文件：
  - 常浩要求的：`hud/src/alerts/RelayToggle.tsx`（新）：`EnterRelay`（待审批卡，有开着的接力才出现，点了开最新那单，多单标数字）、`LeaveRelay`（接力卡，按下态，点了回侧栏原来显示的内容）。`hud/src/alerts/plane-inks.ts`（新）：飞机配色，深色纸与刘海白框白飞机，接力卡按下态纸墨底白飞机，浅色纸未按下用纸墨（白色看不见）。`hud/src/GoButton.tsx`：去掉 ×，加纸飞机图标、按下态（`aria-pressed`）、角标。`ui/src/global.css`：按下态悬停变亮。`hud/src/alerts/HandoffTitleRow.tsx`：拿掉 ×，只留 ↗。`hud/src/permissions/ApprovalContent.tsx`、`HUDScene.tsx`：把 `snapshot.handoffs` 交给待审批卡。
  - 顺手改的：`hud/src/alerts/handoff-doer.ts` 新增 `liveHandoffs`（开着的接力按最近动静排序），`chatgpt-desk.ts` 的 `quietRelays` 改用它，行为不变。300 行棘轮：`ListHead` 从 `ListCard.tsx` 拆到 `permissions/ListHead.tsx`（加了按钮位，在计数标签之后、印章之前），接力卡卡头从 `HandoffCard.tsx` 拆到 `alerts/HandoffHead.tsx`，`RequestDeliveryNotice` 从 `ApprovalContent.tsx` 拆到 `permissions/RequestDeliveryNotice.tsx`；`CompletionAlertView.tsx`、`scene/HUDExpandedSurface.tsx` 改导入；基线收紧（`src/tooling/file-size-baseline.json`）。测试 `hud/test/handoff-card-close.test.ts`（#334 的 × 测试）换成 `hud/test/relay-toggle.test.ts`（7 条：排序、白色配色、两张卡的按钮位、进出行为、× 已去掉、鼠标移开不关卡）。
- 测试：第一版变基到含 #342 的 main 后 `pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `941 passed; 0 failed`，前端 `ℹ pass 432` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 21` / `ℹ fail 0`。白色飞机版：`pnpm run check` 退出码 0；`pnpm test` 退出码 0：Rust 合计 `941 passed; 0 failed`，前端 `ℹ pass 433` / `ℹ fail 0`，MCP `ℹ pass 9` / `ℹ fail 0`，插件 `ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 21` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-341-relay-toggle/`：`check-rebased.log`、`test-rebased.log`、`rules-rebased.log`、`check-white.log`、`test-white.log`、`rules-white.log`、`build.log`、`build-white.log`、`install.log`、`install-white.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1473，沿用 #334 的 2026-11-14 08:46 真实快照，脚手架挪回证据目录 `preview-341/`，没提交）。真实点击：待审批卡卡头 ASK 7 与「待答」印章之间出现纸飞机方块，角标 15（快照里 15 单开着），点它进入「digital-twin｜#131 托管状态底座」接力卡；接力卡同一位置是按下的方块，标题行只剩 ↗；再点回到待审批卡。浅色纸同样。白色版：待审批卡白框白飞机，接力卡按钮计算值底 `rgb(38, 48, 63)`、飞机 `rgb(255, 255, 255)`、`aria-pressed="true"`。L-35：装机前后 `get_hud_screenshot` 静止侧栏各隔 2 秒两张，四张逐字节相同（`a6c410cc7bc9`），票根、小人、印章没变。**未做**：实机悬停面板里点纸飞机（L-09，电脑控制点不动悬停面板），留给常浩；装完没截整屏看「想访问文稿」弹窗（L-06）。
- 截图：证据目录 `preview-waiting-card-plane.jpg`、`preview-relay-card-pressed.jpg`、`preview-back-to-waiting.jpg`、`preview-light-head.png`（蓝色第一版），`preview-white-plane-waiting.jpg`、`preview-white-plane-relay.jpg`（白色版），`before-hud-1/2.png`、`after-hud-1/2.png`、`after-white-hud-0s.png`、`after-white-hud-1/2.png`。
- 发布与回读：两次装机。第一版（蓝色飞机）`236b2dcb0280`，装前 `8df314f44148`（#342 的包）。常浩要求改白色后第二版 `345fe1c63fbf`（从本分支打包，基于含 #342 的 main；打完 main 又合进 #343，只有一份决策文档，不影响应用），`install.sh` 回读产物与已装一致、签名证书照常（`H"b773068e`）。回滚到第一版：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-341-relay-toggle/PostPane-236b2dcb0280.app" /Applications/PostPane.app; open /Applications/PostPane.app`；回到 #342 的包把路径换成同目录 `PostPane-8df314f44148.app`。白色版装完立刻截的静止侧栏顺序不同、DeepSeek 显示 `29M`（`after-white-hud-0s.png`，刚启动数据没读完），约 40 秒后隔 2 秒两张与装前逐字节相同（`after-white-hud-1/2.png`）。
- 与授权不一致之处、遗留问题、范围外发现：第一次装机把证据目录短名写成带日期的全名，脚本又加了一次日期，备份落进 `2026-11-14-2026-11-14-341-relay-toggle/`；已挪回本轮目录，并把 `install.log` 里回滚命令的路径改成挪后的路径（日志里这一处是事后改的）。预览页第一次发布打开是空白：页面脚本里全局变量 `claude` 和 Artifact 宿主自带的 `window.claude` 重名，整段脚本报错不执行；改名并包进自己的作用域后修好。可提议提升为全局坑（Artifact 页面脚本不用 `claude` 等宿主占用的全局名，顶层代码包进函数作用域），待常浩批。skill 进化：E-17 待批（装机短名带了日期，建议脚本拒绝）。
- 本轮新坑：无

## 接力：重启后自动往返接着跑、专项续审从授权时重新计时、设置页写明互发消息不管接力、装机保护收窄（2026-11-14，Claude，常浩要求「深度思考优化」接力总要他操作，看数据后选「重启接着跑」「以我的身份不管接力」，设计稿回「都按推荐」含装机保护选甲；已提交、已发布 `8df314f44148` 回读通过）

- 时间：开工 `2026-11-14 11:04`（`date '+%F %H:%M'` 记录）。来由：常浩在设置里开了「以我的身份发送」、把「连续来回上限」设成 10，接力仍写「第 2/2 轮」、时不时要他点「继续自动」。查明互发消息三项只管 `crates/messaging`，接力不读；11-07 以来 48 单接力自动往返停 36 次：审满 2 轮 11、重启暂停 7、转回失败两次 6（全在 #173 之前）、没写结论 6（11-09 一阵测试）、Claude 2 小时没交回 2（今天，专项续审 bug）等。审核门（AI 判断轮数、上限 5）另出设计稿 https://claude.ai/artifact/YQd8AFtBR5stBru4vZ65Wc ，常浩回「都按推荐」，先送 ChatGPT 思维评审，本轮未实施。
- 改了哪些文件：
  - `platform/src/clients/chatgpt/handoffs.rs`：`restarted()` 不再停自动往返，只忘掉重启前的后台续接（常浩选「接着跑」，改 #72 的「重启先暂停」）；`allow_extra` 像 `resume` 一样重置 `phase_at` / `queued_at`（修专项续审重开旧单当场报「Claude 2 小时没交回复审」，今天两单）。
  - `host/src/handoff.rs`：新增 `Desk::catch_up`，有回信等着推进时调一次 `drive`；app 层 `projection`（快照刷新）先调它，重启前到了还没转回的回信重启后接着转回、只转一次。`host/src/handoff/texts.rs`：删掉不再用的 `restart_paused`。
  - `app/src/settings/agent-plugins/AgentMessagesRow.tsx`：「智能体互发消息」说明加「这几项只管互发消息，不管 ChatGPT 接力」（常浩选「不管」）。
  - 装机保护收窄（常浩选甲）：`.agents/skills/postpane-round/scripts/live-auto-relays.mjs` 只列 `auto` 且 `open` 且 `phase` 为 `replied`（回信刚到、正在转回）的接力；`install.sh` 提示文字、SKILL.md 第 3 步、LESSONS L-44 跟着改；`tests/postpane-round.test.mjs` 改写那条（改前 `ℹ pass 12` / `ℹ fail 1`）。
  - 测试：平台层新增「专项续审从授权时重新计时」（先红后绿）、重启测试改成「保持开着」；宿主层「重启后接着转回、只转一次」「思维评审重启后由 catch_up 送到 Claude 再结束」、语言测试去掉暂停文字。重启几条和实现同时写，没先单独跑红。
  - 文档：`docs/chatgpt-channel.md`、`docs/安装与使用.md` 的重启说法。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `941 passed; 0 failed`，前端 `ℹ pass 430` / `ℹ fail 0`，`ℹ pass 9` / `ℹ fail 0`，`ℹ pass 14` / `ℹ fail 0`，`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 21` / `ℹ fail 0`（收窄后再跑一次仍 21/0；收窄只动 skill 脚本与文档，`pnpm test` 不覆盖、未重跑）。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-relay-restart/`。
- 验证：装机前单独查过，没有开着自动往返的接力；重启后 `handoffs.json` 没有新记的停止步骤。**这次没有开着的自动往返，「重启后接着跑」未在实机上验证**，等下次有接力在跑时装机或重启再看。设置页说明未截图（未做）。
- 截图：无。
- 发布与回读：`8df314f44148`（从本分支打包，打包前 main 无新合并），`install.sh` 回读一致、签名证书照常（`H"b773068e`）；装前 `c8eb178c2ecf`。启动 1 分钟日志无 error。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-relay-restart/PostPane-c8eb178c2ecf.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题：
  - 审核门本轮未实施：先送 ChatGPT 思维评审，评审后定稿，再分批改 MA-02、agent-kit、DT-ORC 与驿窗。
  - 范围外发现：thinking-review skill 的 `references/relay.md` 第 4 节仍写「驿窗重启后自动往返默认暂停」「工程审查最多 2 轮」，已过期，待随审核门一起改（my-skills 仓库）。skill 进化：无。
- 本轮新坑：无

## 装机脚本：有开着的自动往返接力就拒装（L-44）（2026-11-14，Claude，#336 装机时没停下暂停了一单自动往返，常浩回「加上」；已提交、无需发布）

- 时间：开工 `2026-11-14 10:58`（`date '+%F %H:%M'` 记录）。来由：#336 把查接力和 `install.sh` 写进同一条命令，查出 `h1a1d7a90d8e00` 开着自动往返也照装，重启把它暂停了（见 #336 一节）。常浩回「加上」。
- 改了哪些文件：
  - `.agents/skills/postpane-round/scripts/live-auto-relays.mjs`（新）：读 `<数据目录>/chatgpt/handoffs.json`，每行列出 `auto` 且状态 opening / open 的接力（和 `handoffs.rs` 的 `restarted` 暂停条件一致）；文件不存在算没有，读坏了 `exit 1`。
  - `.agents/skills/postpane-round/scripts/install.sh`：在备份、退出旧应用之前调它，有就列出来、`exit 3`、什么都不动；读不了也 `exit 3`；加 `--force`（放哪都行）才照装，照装时列出会被暂停的单。`check` 模式不受影响。
  - `.agents/skills/postpane-round/SKILL.md` 第 3 步写上这一步；`docs/LESSONS.md` 新增 L-44。
  - `tests/postpane-round.test.mjs` 新增 3 条：只列该列的、没文件 / 坏文件、保护在备份和退出之前（改前 `ℹ pass 10` / `ℹ fail 3`，改后 `ℹ pass 13` / `ℹ fail 0`）。测试不真跑 `install.sh`，免得退出正在用的驿窗。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 430` / `ℹ fail 0`，`ℹ pass 9` / `ℹ fail 0`，`ℹ pass 14` / `ℹ fail 0`，`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 21` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-install-auto-guard/{check,test,rules}.log`。
- 验证：临时 HOME 放一份含 1 单自动往返的假接力记录、假产物，跑 `install.sh guard-demo <假产物>`：`exit 3`，列出「假接力｜自动往返中」，没建证据目录，驿窗一直在跑、已装仍 `c8eb178c2ecf`（`guard-run.log`）。真实记录跑 `live-auto-relays.mjs` 为空。
- 截图：无（脚本改动）。
- 发布与回读：无需发布（只改 skill 脚本与文档，应用不变）。
- 与授权不一致之处、遗留问题：无。范围外发现：无。skill 进化：本轮即 #336 一节提的那条，已落地。
- 本轮新坑：L-44

## 接力纸折成窄签时去掉侧边航空条，和普通窄签一样（#338）（2026-11-14，Claude，常浩截图要求「侧卡要大小一致，然后接力卡侧边的彩色条去除」，大小问清后选「接力签和普通签一样」；已提交、已发布 `c8eb178c2ecf` 回读通过）

- 时间：开工 `2026-11-14 10:40`（`date '+%F %H:%M'` 记录）。来由：侧栏开着接力卡时收起，前面那一家折成的签用浅蓝航空纸，背对打孔的长边多一道 4px 红蓝航空条（2026-11-06 定的「收起的签沿侧边」），和平时的窄签看着不一样。常浩这轮点名去掉。大小有两种理解（接力签对普通签 / 窄签对票根 51×66），问后常浩选前者。issue #338，PR #339。
- 改了哪些文件：
  - `hud/src/paper.ts`：`airmailSides(edge, false)` 返回空，收起不画航空条；展开照旧顶边（停靠屏幕底边时为底边）。
  - `hud/src/scene/HUDExpandedSurface.tsx`：收起用的 4px 条宽不再用，条宽固定 6px。
  - `hud/test/relay-paper.test.ts`：展开四种停靠各一道、不在打孔边；新增「收起没有航空条」（改前 `ℹ pass 3` / `ℹ fail 1`，改后 `ℹ pass 4` / `ℹ fail 0`）。
  - 不动：展开接力卡顶边航空条（#125）；接力签仍用浅蓝航空纸（颜色常浩没提，未改）；窄签尺寸 `narrowTagSize` 不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 430` / `ℹ fail 0`，`ℹ pass 9` / `ℹ fail 0`，`ℹ pass 14` / `ℹ fail 0`，`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-side-slip-size/{check,test,rules,build,install}.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1473，沿用 #331 的 2026-11-14 08:46 真实快照，深色）。改前：普通窄签 28×53；开接力卡再移开，折成的窄签 28×53，内含 x=969–973 一道 4px 航空条。改后：普通窄签 28×53；接力签 28×53、航空条 0 道；展开接力卡顶边航空条仍在。常浩截图里接力签比普通签高约 8%，预览没复现（两种外框同为 `narrowTagSize`），实机未看，留给常浩。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-side-slip-size/`：`before-relay-slip-side-band.png`、`after-normal-slip.png`、`after-relay-slip-no-band.png`、`after-open-card-top-band.jpg`；脚手架 `preview-slip/`（未提交）。
- 发布与回读：`c8eb178c2ecf`（从本分支打包，打包前 main 无新合并），`install.sh` 回读产物与已装一致、签名证书照常（`H"b773068e`）；装前 `aa6459aad6dd`。装前单独查过：没有开着自动往返的接力（最近一单「Matt 技能指南｜内容深度审核」10:54 已转回 Claude，`auto` 原本就关）。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-side-slip-size/PostPane-aa6459aad6dd.app" /Applications/PostPane.app; open /Applications/PostPane.app`。装完没截屏查「想访问文稿」弹窗（未做）。
- 与授权不一致之处、遗留问题：
  - 实机接力签与普通签高度是否一致未验证（预览一致）。
  - 范围外发现：无。skill 进化：同 #336，建议 `install.sh` 有开着的自动往返就拒装（待批）。
- 本轮新坑：无

## 接力卡 ChatGPT 意见第 10 条起序号不再挤进正文（#336）（2026-11-14，Claude，#334 收尾时报的范围外发现，常浩回「修序号」；已提交、已发布 `aa6459aad6dd` 回读通过）

- 时间：开工 `2026-11-14 10:20`（`date '+%F %H:%M'` 记录）。来由：常浩截图里接力卡第 10 条起「10异常传播…」序号压在正文上。根因：意见列表每行 `gridTemplateColumns: "16px 1fr"`，序号列写死 16px。issue #336，PR #337。
- 改了哪些文件：
  - `hud/src/alerts/handoff-card.ts`：新增 `pointMarkColumn(count)`，一位数仍 16px，每多一位数字加 1ch（等宽数字）。
  - `hud/src/alerts/HandoffPoints.tsx`（新）：意见列表从 `HandoffCard.tsx` 挪来，用上面的列宽。
  - `hud/src/alerts/HandoffCard.tsx`：改用 `HandoffPoints`，717 → 677 行，基线收紧（`src/tooling/file-size-baseline.json`）。
  - 测试：`hud/test/handoff-card.test.ts` 新增 2 条（改前 `ℹ pass 0` / `ℹ fail 1`，改后 `ℹ pass 19` / `ℹ fail 0`）。
- 测试：`pnpm run check` 退出码 0；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。`pnpm test` 第 1 次退出码 101：`agent-hud-platform` 的 `a_write_to_an_app_server_that_stopped_reading_ends_at_the_deadline` 打开测试用 python 脚本 3 秒超时（`TimedOut`，当时负载 15–17），单独重跑 `1 passed`。第 2 次退出码 1：Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 429` / `ℹ fail 0`，`ℹ pass 9` / `ℹ fail 0`，`ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 1` / `ℹ fail 12`：`~/Library/Caches/ms-playwright/` 又被清掉（L-16）。常浩回「下载并补跑」后 `pnpm exec playwright install chromium-headless-shell`（连带 ffmpeg，共 209 MB），`pnpm run test:extension` `ℹ pass 13` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-336-point-numbers/`：`check.log`、`test-1-platform-timeout.log`、`test.log`、`test-extension.log`、`playwright-install.log`、`rules.log`、`build.log`、`install.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1472，沿用 #331 的 2026-11-14 08:46 真实快照）。「digital-twin｜#131 托管状态底座」12 条意见：「10.」本身 19.4px，列宽 16 → 23.9px，10–12 条与正文分开、换行对齐；4 / 6 / 7 条意见的卡列宽仍 16px。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-336-point-numbers/`：`before-preview-10-overlaps.jpg`（改前，#334 预览）、`after-preview-10-12.jpg`；脚手架 `preview-336/`（未提交）。
- 发布与回读：`aa6459aad6dd`（从本分支打包，打包前 main 无新合并），`install.sh` 回读产物与已装一致、签名证书照常（`H"b773068e`）；装前 `6910f354edcc`。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-336-point-numbers/PostPane-6910f354edcc.app" /Applications/PostPane.app; open /Applications/PostPane.app`。实机看序号未做，装完没截屏查「想访问文稿」弹窗（未做）。
- 与授权不一致之处、遗留问题：
  - **装机前没停下**：把「查有没有开着的自动往返接力」和 `install.sh` 写进同一条命令，查出 `h1a1d7a90d8e00`（digital-twin｜PR #175 专项复审，10:39:33 刚把请审核送给 ChatGPT）开着自动往返也照装了；10:39:58 重启后这单记「驿窗重启，自动往返先暂停」，`auto` 变 false。ChatGPT 回信不会自动转回 Claude，要常浩在卡上点「转回 Claude」或「继续自动」。已在会话里如实报告。
  - 范围外发现：无。skill 进化：建议 `install.sh` 发现开着的自动往返接力就拒装、要加 `--force` 才装（未做，待批）。
- 本轮新坑：无

## 侧栏接力卡加「×」返回，接力进行中也能回到待审批卡（#334）（2026-11-14，Claude，常浩截图反馈「点进接力看板就再也切不出去」，看根因后在三种做法里选「乙 卡上加返回」；已提交、已发布 `6910f354edcc` 回读通过）

- 时间：开工 `2026-11-14 09:58`（`date '+%F %H:%M'` 记录）。来由：侧栏点开接力卡后，接力没结束时回不到待审批卡。根因：接力卡只在按 Esc（侧栏通常没有键盘焦点）或侧栏完全收起时关，「完全收起」是 `open || event || request` 为假（`HUDScene.tsx`）；待回答的 ASK 一直挂着（#184），`request` 一直有值，卡永远关不掉；卡底接力结束前没有「知道了」。列了甲（鼠标移开就收）/ 乙（卡上加返回）/ 丙（两样都要），常浩选乙。issue #334，PR #335。
- 改了哪些文件：
  - `hud/src/alerts/HandoffTitleRow.tsx`（新）：接力卡标题行（标题、↗ 回到发起方会话、×「返回」），连同 `splitTitle` 从 `HandoffCard.tsx` 挪来；× 调 `onClose`，回到侧栏原来显示的内容。
  - `hud/src/alerts/HandoffCard.tsx`：改用 `HandoffTitleRow`，757 → 717 行，基线收紧（`src/tooling/file-size-baseline.json`）。
  - `hud/src/GoButton.tsx`：加 `icon: "go" | "close"`，× 与 ↗ 同一套悬停 / 按下效果；原有 ↗ 不变。
  - 测试：`hud/test/handoff-card-close.test.ts` 新增 4 条（改前 `ℹ pass 1` / `ℹ fail 3`，改后 `ℹ pass 4` / `ℹ fail 0`）。
  - 不动：鼠标移开不关卡（乙）；Esc 照旧；侧栏收起时关卡照旧；卡底按钮不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 427` / `ℹ fail 0`（原 423 + 新增 4）、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。先跑完三条全量再搭预览（L-43）。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-334-handoff-close/{check,test,rules,build,install}.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1471，沿用 #331 的 2026-11-14 08:46 真实快照：7 条 Claude ASK、15 单进行中接力）。悬停 Claude 票根，从「正在进行」点「接力 2/2」打开接力卡，卡头 ↗ 右边出现 ×；真实鼠标点 × 回到「待审批 ASK 7」卡；脚本打开另一单（#131 托管状态底座）再点 × 同样回到待审批卡。实机点 × 未做（悬停面板里电脑控制点不动，L-09），留给常浩。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-334-handoff-close/`：`preview-card-with-close.jpg`、`preview-after-close-approvals.jpg`、`preview-card-from-running-tag.jpg`、`preview-after-close-2.jpg`；脚手架 `preview-334/`（未提交）。
- 发布与回读：`6910f354edcc`（从本分支打包，打包前 main 无新合并），`install.sh` 回读产物与已装一致、签名证书照常（`H"b773068e`）；装前 `1866647830f4`。装前确认没有开着的自动往返接力。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-334-handoff-close/PostPane-1866647830f4.app" /Applications/PostPane.app; open /Applications/PostPane.app`。装完没截屏查「想访问文稿」弹窗（未做）。
- 与授权不一致之处、遗留问题：
  - 范围外发现：接力卡里 ChatGPT 意见第 10 条起序号挤进正文（常浩截图里「10异常传播…」、预览里「1021:00 飞书手动开启」），两位数编号没留宽度，未修。skill 进化：无。
- 本轮新坑：无

## 侧栏待审批卡：只能去 Claude 里回答的提问沉底并默认收起（#331）（2026-11-14，Claude，常浩在四种做法里选「甲 沉底折叠」；已提交、已发布 `1866647830f4` 回读通过）

- 时间：开工 `2026-11-14 09:30`（`date '+%F %H:%M'` 记录）。来由：常浩截图里进程已停、几天前的 ASK 一直囤着。查明这些是 Claude 桌面应用的「下一步」框，「等待回答」设成一直等（#184，本机 `approvalWaitMinutes = 0`），框在 Claude 里没回答就一直挂着，进程停了只会变成「请到 Claude 里回答」。列了甲（沉底折叠）/ 乙（超 24 小时收起）/ 丙（一键清旧）/ 丁（不改），常浩选甲。issue #331。
- 改了哪些文件：
  - `hud/src/permissions/approval-list.ts`：新增 `answersElsewhere`（Core 标 `answersQuestion: false`、即卡上写「请到 X 里回答」的请求；START 交接卡不算）；`orderEntries` 排序变成「能在侧栏回答的请求 → 回复 → 只能去客户端回答的请求」，各自新到旧；`approvalGroups` 收起时这类始终收进「还有 n 条」，哪怕总数不到 5 条，全部都是这类时照常显示；点开「还有 n 条」照常全列。
  - `hud/src/alerts/news-lanes.ts`：队列里的请求卡带 `elsewhere`（新增 `requestCard`）；`promoteNewestWaiting` 先取最新的能在侧栏回答的请求，没有才取这类；别家小签同样。
  - `hud/src/IslandNews.tsx`：入队改用 `requestCard`。376 → 373 行，基线收紧。
  - 测试：`approval-list.test.ts` 新增 3、`news-lanes.test.ts` 新增 1、`reply-queue-keep.test.ts` 新增 1（注入改成 `requestCard`）。先跑出缺导出的红，再写实现。
  - 不动：不撤卡、不改「一直等」；卡头 ASK 计数、小签上的 ANSWER 计数仍算上它们；「正在进行」里这些会话的「等你」行不动。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 423` / `ℹ fail 0`（原 418 + 新增 5）、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。改实现前三个测试文件 `ℹ pass 11` / `ℹ fail 3`（缺导出），改后 `ℹ pass 40` / `ℹ fail 0`。开工后 main 没有新合并。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-331-sink-elsewhere/{check,test,build}.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1470，沿用 #325 的 2026-11-14 08:46 真实快照，7 条 Claude ASK 里 4 条 `answersQuestion: false`；这次先跑完三条全量再搭预览，照 L-43）：小签仍是最新的「Codex 额度｜到期前派单审查」；悬停 Claude 票根，卡里只列能在侧栏回答的 3 条（1 小时 1 分、1 小时 5 分、45 小时），「还有 4 条」；点开后进程已停的 4 条排在后面（2027战略会 42 小时、Mac 合盖 74 小时、数字分身 15 小时、月度用户策略 105 小时）。两种状态导出成网页文字，和改前截图一起放进对照页 https://claude.ai/artifact/8v49shS28VcbBqMbH669hK （第 2 版）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-331-sink-elsewhere/`：`preview-card-folded.jpg`、`preview-card-unfolded.jpg`；导出的卡片 `html/card-folded.html`、`html/card-unfolded.html`；脚手架 `preview-331/`（未提交）。
- 发布与回读：`1866647830f4`（从本分支打包，合并后 main `b95434f` 与之内容相同，期间 main 没有新合并），`install.sh` 回读一致、签名证书照常（`H"b773068e`）；装前 `50363ed03c36`。打包后一度没装：接力 `h1a1d7a90d8e00`（digital-twin｜PR #175 身份闸第 2 轮）开着自动往返、刚把「需修改」转回发起会话；常浩看过说明后回「现在就装」，09:51 装好。重启后这单记了「驿窗重启，自动往返先暂停」，`auto` 变 false；发起会话重启前已收到回信（delivery started），下一次回信要常浩手动转回或重开自动往返。装后 1 分钟日志无 error；没截屏查「想访问文稿」弹窗（未做）；实机悬停看收起未做，留给常浩。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-331-sink-elsewhere/PostPane-50363ed03c36.app" /Applications/PostPane.app; open /Applications/PostPane.app`。
- 与授权不一致之处、遗留问题：
  - 侧栏小签 / 卡头的 ASK 计数仍算上收起的这几条（issue 里写明不动）；要不要只数能答的，没问常浩，留作可选。
  - 范围外发现：「正在进行」里进程已停会话仍显示「等你」。skill 进化：无（E-16 待批照旧）。
- 本轮新坑：无

## 侧栏待审批卡展开最新一条，小签跟着显示最新（#328）（2026-11-14，Claude，#325 后发改动确认，常浩回「改成最新」；已提交、已发布 `50363ed03c36` 回读通过）

- 时间：开工 `2026-11-14 09:02`（`date '+%F %H:%M'` 记录）。来由：#325 把列表改成新的在上后，展开的那条仍是队首、默认等得最久的一条（#48 定稿），105 小时前的那条仍展开着。按「已定内容要改」发改动确认（原定思路、要改成什么、代价是小签一起变、请选），常浩回「改成最新」：卡里展开的和侧栏小签都换成最新的。issue #328。
- 改了哪些文件：
  - `hud/src/alerts/news-lanes.ts`：`promoteOldestWaiting` 改成 `promoteNewestWaiting`（最新等着的请求排到队首，仍在通知前面）；新增 `newestAskFirst`、`askedInFront`（有新请求到达且队首是请求时，最新的排到前面；没有新到的不动，常浩点开的旧行保持展开；队首是回复通知时不抢）；`liveQueue` 答完后取最新；别家小签 `newsLanes` 的领头请求改取最新。从 `IslandNews.tsx` 挪来 `dismissIslandCard`、`dropIslandCards`、`laneRequests`（纯函数，行为除取最新外不变）。
  - `hud/src/IslandNews.tsx`：用上面这些；按住（指针在侧栏上、正在打字）时新来的请求不抢前，记下来，松开后再排到前面（和 #221 回复的做法一致）。文件 387 → 376 行。
  - `src/tooling/file-size-baseline.json`：`--update` 收紧（`IslandNews.tsx` 376；`panel/SessionsSection.tsx` 是 #321 已变短、这次一并收紧）。
  - 测试：`hud/test/news-lanes.test.ts`（别家小签领头最新、最新请求排到通知前、新到请求排前三种情形、答完让给最新，共改 1 新增 3）、`hud/test/reply-queue-keep.test.ts`（改为注入 `promoteNewestWaiting`、取片段终点改到 `export type SideNews`、新增「知道了后让给最新」）。先跑出缺导出的红，再改实现。
  - `docs/LESSONS.md`：新增 L-43。
  - 不动：点卡里别的行就地展开（`select`）；列表排序（#325）；`ApprovalContent`。
- 测试：变基到含 #329 的 main（`13b1c6c`）后：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 418` / `ℹ fail 0`（#329 新增 3、本轮新增 4）、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`；`tests/postpane-round.test.mjs` `ℹ pass 10` / `ℹ fail 0`。变基前：第一次 `pnpm run check` 退出码 1（预览脚手架在工作区里，包边界检查报 4 处越界，见 L-43），挪走后通过；两次 `pnpm test` 同写一个日志，又单独干净跑一次 `ℹ pass 415` / `ℹ fail 0`、Rust `940 passed; 0 failed`。改实现前 `news-lanes`、`reply-queue-keep` 两个测试文件因缺导出 `ℹ fail 2`，改后两文件 `ℹ pass 18` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-328-newest-open/{check,test,build}.log`，变基前的带 `-before-rebase`、`check-1-preview-in-tree`、`test-mixed-two-runs` 后缀。
- 验证：浏览器预览真实 `HUDScene`（端口 1469，沿用 #325 的 2026-11-14 08:46 真实快照，脚手架已挪到证据目录 `preview-328/`、未提交）：侧栏小签显示最新的「Codex 额度｜到期前派单审查」（原来是 105 小时前的「月度用户策略」）；悬停 Claude 票根，卡顶展开的就是这条（带选项、跳过 / 提交），下面依次 32 分钟、42 小时、44 小时、数字分身 14 小时，「还有 2 条」收起 73、105 小时两条；点「2027战略会」那行就地展开，顺序不变。按住时新请求不抢前、松开再到前由单测之外的 `IslandNews` 逻辑实现，预览里没造出「按住时新来一条」的场景，**未在预览里看到**。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-328-newest-open/`：`preview-tag-newest.jpg`、`preview-card-newest-open.jpg`、`preview-card-select-older.jpg`。
- 发布与回读：`50363ed03c36`（从变基到最新 main 的本分支打包），`install.sh` 回读一致、签名证书照常（`H"b773068e`）；装前 `c4e1930394b2`（#329 那轮装的）。装前确认没有开着且没结束的自动往返接力。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-328-newest-open/PostPane-c4e1930394b2.app" /Applications/PostPane.app; open /Applications/PostPane.app`。实机悬停看展开哪条、小签显示哪条未做（截图工具画不出悬停卡），留给常浩；装完没截屏查「想访问文稿」弹窗（未做）。
- 与授权不一致之处、遗留问题：
  - 「进程已停、几天前的 ASK 一直囤着」的四个做法（甲沉底折叠 / 乙超 24 小时收起 / 丙一键清旧 / 丁不改）常浩还没选，未做。
  - 范围外发现：无。skill 进化：E-16 待批（预览脚手架与全量测试的先后，见 L-43）。
- 本轮新坑：L-43

## Hermes 定时任务表：同一件事的几步合成一行（#326）（2026-11-14，Claude，常浩截图问猛鬼兽任务后要求「侧边应该显示是一个任务，叫做个人项目日报，而不是分为写稿和发送，一个任务是一条」，看方案后回复「按方案改」；已提交、已发布 `c4e1930394b2` 回读通过）

- 时间：开工 `2026-11-14 08:57`（`date '+%F %H:%M'` 记录）。来由：digital-twin #159 把个人项目日报拆成 09:15 写稿、10:00 发送两个 Hermes 定时任务，侧栏悬停面板猛鬼兽表随之显示成「个人项目日报·写稿」「个人项目日报·发送」两行；常浩要一件事一行。方案在 digital-twin 会话里列出、常浩确认后开 issue #326。
- 改了哪些文件：
  - `hud/src/panel/hermes-board.ts`：`jobRows` 先按名字分组：去掉括号注释后名字带「·」的，按「·」前那段归成一件事，两步及以上合成一行（行名取「·」前那段），位置在第一步原来的位置；不带「·」、或带「·」但只有一步的照旧一行。合成的行：多久一次和下次取当天时间最晚的一步（发送），排序看 cron 的时分、取不到时分的按 Hermes 原顺序；上次任一步失败就显示 ✗ 和失败那步的日期，否则看最后一步（没跑过就是没跑过）；任一步停用就显示停用；悬停提示逐行列出每一步的全名、多久一次、上次结果。行 id 用各步 id 以「+」连起来。文件 295 行，未过 300 行棘轮。
  - `hud/test/hermes-board.test.ts`：新增 3 条（合成一行且按当天时间取最后一步、失败 / 停用 / 没跑过、只有一步带「·」不合并），先跑出 `ℹ fail` 再改实现。
  - 行为改动（常浩本轮点名要改的那一项，已在 digital-twin 会话先列出）：原来一个定时任务一行，改成同一件事的几步一行。Hermes 那边两个定时任务没动。
- 测试：变基到含 #327 的 main（`27f148d`）后跑：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 414` / `ℹ fail 0`（比 #325 的 411 多新增 3 条），其余几组 `ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` `ℹ pass 18` / `ℹ fail 0`。原样输出在证据目录 `check.txt`、`test.txt`、`rules.txt`。
- 验证：浏览器预览真实 `HUDScene`（端口 1467，沿用 #308 的 11-08 快照，猛鬼兽定时任务换成 2026-11-14 09:1x 读的真实 `~/.hermes/cron/jobs.json` 八个任务，按 Rust `cron_jobs` 同样的字段映射；脚手架 `preview-326/` 未提交）。按 ref 点 Hermes 一格（L-29，面板隐藏时用 JS 读文字），猛鬼兽表 7 行：工程自检 / Tidings / 影子合并官 / multica / skill 体检 / **个人项目日报 · 每天 10:00 · ✓ 昨天 · 10:00** / AI HOT；该行 `title` 为两行（写稿 09:15 ✓ 昨天、发送 10:00 ✓ 昨天）。其余行与常浩截图一致。实机悬停提示未看（悬停面板里电脑控制点不动，L-09）。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-326-job-group/`：`before-owner-screenshot.webp`（常浩改前截图）、`preview-hermes-dark.jpg`（预览改后）。
- 发布与回读：`c4e1930394b2`（从本分支打包，已变基到含 #327 的 main，打包前 main 无新合并），`install.sh` 回读产物与已装一致、签名证书照常（`H"b773068e`）；装前 `95d5c1bd61c4`（#325 的包），备份在证据目录。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-326-job-group/PostPane-95d5c1bd61c4.app" /Applications/PostPane.app; open /Applications/PostPane.app`。装后 `get_hud_screenshot` 拍整张悬停面板（真实数据）：猛鬼兽表 7 行，「个人项目日报 · 每天 10:00 · ✓ 昨天 · 10:00」一行，亚古兽「记忆日报」不变，存为 `after-install-panel.png`。整屏截图看权限弹窗未做（没有截屏权限），面板能正常取数说明数据线程没卡（L-06）。
- 与授权不一致之处、遗留问题、范围外发现：
  - 范围外发现：预览里 Tidings 一行「下次」显示「今天」，是快照读取时下次运行时间（09:00）已过、还没被 Hermes 刷新的旧值，改前就这样，没动。
  - skill 进化：无。
- 本轮新坑：无

## 侧栏待审批卡改成最新的在上面（#325）（2026-11-14，Claude，常浩截图要求「最新的通知在上面」，由 #321 那个会话派单；已提交、已发布 `95d5c1bd61c4` 回读通过）

- 时间：开工 `2026-11-14 08:47`（`date '+%F %H:%M'` 记录）。来由：常浩截图里待审批卡旧的在上：牛马之家「月度用户策略」105 小时排第一，未分区 73 / 44 / 41 小时，数字分身 14 小时排最后，「还有 7 条」截掉的反而是新的。issue #325。
- 查到的现状：`hud/src/permissions/approval-list.ts` 的 `orderEntries` 把请求按「等得最久」在前、回复排在请求后也是旧到新；`approvalGroups` 按组首次出现的顺序排组（等于按组里最旧一条，#49 交接里写的「实现时自定」），截前 5 条，所以「还有 n 条」截掉的是最新的。新回复卡（`reply-list.ts` 的 `newestFirst`）、额度细条（`quota-list.ts`）、「正在进行」（`agent-board.ts`）本来就是最新在上，不用改。
- 改了哪些文件：
  - `hud/src/permissions/approval-list.ts`：`orderEntries` 改成请求最新在上、回复仍排在请求后面也最新在上，读不出时间的排在同类最后；组的先后因此变成按组里最新一条；「还有 n 条」截掉最旧的。注释同步。
  - `hud/test/approval-list.test.ts`：改写三条（排序、分组顺序、折叠），先跑出 `ℹ fail 3` 再改实现。
  - 不动（已定内容）：展开的那条仍是队首、默认等得最久的一条（#48 定稿「展开的那条（默认等得最久的一条）」），所以它现在排在已显示各行的最后；侧栏小签、队列、`tagCounts` 不变。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 退出码 0，Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 411` / `ℹ fail 0`（改写 3 条、条数不变）、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`、`ℹ pass 13` / `ℹ fail 0`；`node --test tests/*.test.mjs` 写交接前 `ℹ pass 18` / `ℹ fail 0`。改实现前 `node --test test/approval-list.test.ts` 为 `ℹ pass 14` / `ℹ fail 3`，改后 `ℹ pass 17` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-325-newest-first/{check,test,build}.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1468，2026-11-14 08:46 驿窗 MCP 取的真实快照，7 条 Claude ASK，保留真实提问时间；脚手架 `src/apps/desktop/preview-325/` 未提交，快照含私人数据也不提交）：悬停 Claude 票根，卡里依次是 未分区（12 分钟、16 分钟、42 小时）→ 数字分身（14 小时）→ 牛马之家（105 小时，展开的那条），「还有 2 条」；点开后未分区补上 44 小时、73 小时，仍是新到旧。浅色纸同样。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-325-newest-first/`：`before-owner-screenshot.webp`（常浩改前截图）、`preview-claude-card-dark.jpg`、`preview-claude-card-light.jpg`。
- 发布与回读：`95d5c1bd61c4`（从本分支打包，开工后 main 没有新合并），`install.sh` 回读一致、签名证书照常（`H"b773068e`）；装前 `f67b71c33021`。装后补查 `handoffs.json`：开着自动往返的 24 单都已结束，重启没打断接力（装前那次检查脚本写错了状态字段，事后补查）。回滚：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-325-newest-first/PostPane-f67b71c33021.app" /Applications/PostPane.app; open /Applications/PostPane.app`。驿窗 MCP 截图画不出悬停待审批卡，实机悬停看排序未做，留给常浩；装完没截屏查「想访问文稿」弹窗（未做）。
- 与授权不一致之处、遗留问题：
  - 待常浩定（已发改动确认）：展开的那条要不要也改成最新一条（动 #48 定稿，连带侧栏小签显示哪条）。
  - 待常浩定：几天前、进程已停的 ASK 为什么一直囤着——这些是 Claude 桌面应用「下一步」框（`claude-desktop-ask:`），常浩 11-07 选了「等待回答：一直等」（#184，本机 `approvalWaitMinutes = 0`），框在 Claude 里没回答、会话没归档就一直算等着；进程停了只是变成「请到 Claude 里回答」，不会撤。可选做法列在给常浩的答复里，未做。
  - 范围外发现：无。skill 进化：无。
- 本轮新坑：无

## 侧栏「在跑」标记换成纯加载：3×3 方点斜扫（#321）（2026-11-14，Claude，常浩要求「在跑的加载标识重新做三版，有点创意，不要带原图标，纯是加载的样式」，看三版预览后回复「乙」；已提交、发布 `f67b71c33021` 回读通过）

- 时间：开工 `2026-11-14 08:28`。来由：#313 定的在跑标记是「这一家的图标 + 外圈转动细弧」，常浩要求去掉图标、只留加载样式。三版预览 https://claude.ai/artifact/8PQ622sNJyNriFFpdwqTM6 （甲驿路绕行 / 乙信号灯阵 / 丙笔尖写信，附现状对照），常浩选乙；常浩本轮点名要改，不另发改动确认。issue #321。
- 改了哪些文件：
  - `hud/src/panel/RunningMark.tsx`：去掉 `HUDArtwork` 图标和外圈细弧，改成 3×3 小方点（3 点见方、间距 2.5 点、圆角 0.8），整格仍 18×18、颜色仍是面板绿 `inks.green`；九个点按对角线位置（0–4）各延迟 0.13 秒，光从左上斜扫到右下。组件不再要 `source`、`light` 两个参数。
  - `hud/src/panel/SessionsSection.tsx`：`LiveRow` 调 `RunningMark` 时去掉这两个参数。各家面板和卡底「正在进行」都走 `LiveRow`，所以所有智能体同一个样子。
  - `ui/src/global.css`：`.hud-running-ring` 换成 `.hud-running-grid > span`：平时不透明度 0.18，`hud-running-sweep` 1.3 秒一趟（35% 亮到 1、60% 回 0.4）；减少动态效果时不动、九个点停在 0.55。`loading-state-spin` 仍给设置页的 `LoadingState` 用，保留。
  - 不动：「等你」红章、`tagWide` 对齐、右侧「已 n 分钟」、第二行文字。
- 测试：`pnpm run check` 退出码 0；`pnpm test` 第一次退出码 1：Rust 合计 `940 passed; 0 failed`，前端 `ℹ pass 411` / `ℹ fail 0`、`ℹ pass 9` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0`，Chrome 插件 `ℹ pass 1` / `ℹ fail 12`，全是 `browserType.launch: Executable doesn't exist at ~/Library/Caches/ms-playwright/chromium_headless_shell-1248/...`，`~/Library/Caches/ms-playwright/` 整个没了，和 L-16 相同；照 L-16 在 `src/apps/chrome-extension` 跑 `pnpm exec playwright install chromium-headless-shell` 补回后 `pnpm run test:extension` `ℹ pass 13` / `ℹ fail 0`。`node --test tests/*.test.mjs` 写交接前 `ℹ pass 18` / `ℹ fail 0`。日志 `~/Library/Application Support/postpane/evidence/2026-11-14-321-running-grid/{check,test,test-extension-2,playwright-install,rules}.log`。
- 验证：浏览器预览真实 `HUDScene`（端口 1467，沿用 #319 的 2026-11-12 真实快照，脚手架挪到证据目录 `preview-321/`，没提交）：悬停 Claude 票根，待审批卡底「正在进行 · 1」那一行左格是九个绿方点，计算结果 18×18、`hud-running-sweep` 1.3 秒、延迟 `0s,0.13s,0.26s,0.13s,0.26s,0.39s,0.26s,0.39s,0.52s`，同一时刻九个点不透明度从 0.27 到 0.91 不等，确认在扫；没有图标。浅色纸同样；`?codex` 把请求换成 Codex 的，卡底 Codex 在跑行也是方点阵。标记与标题的间距和 #313 一致（整格仍 18 点宽）。装机后用驿窗 MCP `get_hud_screenshot` 截 Claude 面板，「正在进行 · 8」前 5 行都是「等你」，在跑行要滚动才看得到，截图工具滚不动，实机面板里的在跑行截图工具没看到，由常浩 2026-11-14 实机悬停确认；Codex 此刻没有在跑会话。
- 截图：`~/Library/Application Support/postpane/evidence/2026-11-14-321-running-grid/`：`before-claude-panel.png`（改前 Claude 面板）、`preview-claude-card-dark.jpg`、`preview-claude-card-light.png`、`preview-codex-card-dark.jpg`。三版预览页源文件 `docs/design/running-loader-preview.html` 未提交（和之前几轮的预览页一样留在主目录）。
- 发布与回读：`f67b71c33021`（从本分支打包，开工后 main 没有新合并），`install.sh` 回读一致、签名证书照常（`H"b773068e`）；装前确认没有开着自动往返的接力（15 单 open 全是 `auto: false`）。回滚到本轮之前：`osascript -e 'quit app "PostPane"'; ditto "/Users/nat/Library/Application Support/postpane/evidence/2026-11-14-321-running-grid/PostPane-dac821cde448.app" /Applications/PostPane.app; open /Applications/PostPane.app`。装完没截屏查「想访问文稿」弹窗（未做，电脑控制没申请），以 MCP 截图能正常渲染面板作旁证。
- 与授权不一致之处、遗留问题：常浩 2026-11-14 实机悬停看过在跑行的方点阵，回复「看过了，没问题」。范围外发现：无。skill 进化：E-15 待批（合并后先删 worktree 再跑 install.sh check 会拿主目录旧产物比，报假的不一致；已装的仍是 `f67b71c33021`）。已合并 PR #322（main `896e78f`），worktree 已删。
- 本轮新坑：无（Playwright 缓存被清是 L-16 再次出现）

## 更早的交接

2026-11-04 至 2026-11-12 的交接已归档到 [docs/history/CURRENT-2026-11-04至2026-11-12.md](docs/history/CURRENT-2026-11-04至2026-11-12.md)，内容原样没改。查常浩定过什么时，两处一起搜。
