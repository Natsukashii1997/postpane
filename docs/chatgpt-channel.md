# ChatGPT 通道（接力 1b，#99）

驿窗经常浩自己 Chrome 里登录的 chatgpt.com 接通 ChatGPT 聊天。三段：

```
chatgpt.com 标签页（内容脚本）⇄ 插件后台 ⇄ Chrome Native Messaging ⇄ 转接程序 ⇄ 驿窗（本机套接字）
```

## 固定标识

| 项                     | 值                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 插件目录               | `src/apps/chrome-extension/`（开发者模式「加载已解压的扩展程序」）                                                                                                          |
| 插件 id                | `fjjbgamejbdjdaddinacpbmaeokinbjl`（manifest 的 `key` 固定，换目录加载 id 不变）                                                                                            |
| Native host 名         | `com.postpane.chatgpt`                                                                                                                                                      |
| host manifest（macOS） | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.postpane.chatgpt.json`，`allowed_origins` 只写 `chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/` |
| 转接程序               | 随驿窗打包；Chrome 启动它时第一个参数是 `chrome-extension://<id>/`                                                                                                          |
| 驿窗套接字             | `<数据目录>/chatgpt/extension.sock`（目录 0700、套接字 0600，同 local_tools）                                                                                               |

## 分帧

两段都用同一种分帧：4 字节小端长度 + UTF-8 JSON（Chrome Native Messaging 的格式；驿窗到 Chrome 一帧不超过 1 MB）。转接程序只原样搬运，不解析内容。

## 消息

每条都是带 `type` 的 JSON 对象。时间一律毫秒时间戳（`at`）。

### 插件 → 驿窗

| type     | 字段                                                                                          | 说明                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hello`  | `version`, `extensionId`                                                                      | 插件后台连上后第一条                                                                                                                                                                                                      |
| `tabs`   | `conversations: [{id, open, hidden}]`                                                         | 名单里各会话标签页状态，变化时发                                                                                                                                                                                          |
| `turn`   | `phase: "start" \| "complete"`, `conversation`, `title`, `prompt`, `reply`, `messageId`, `at` | 任一会话一轮开始 / 完成（#145 起不限名单；还没有会话 id 的新会话不报）。`complete` 时 `reply` 是整理好的 Markdown 全文，`prompt` 是这一轮用户消息全文，`title` 是会话标题（标签页标题去掉「 - ChatGPT」等后缀，可能为空） |
| `opened` | `requestId`, `ok`, `conversation?`, `title?`, `reason?`                                       | 回应 `open`                                                                                                                                                                                                               |
| `sent`   | `requestId`, `ok`, `reason?`                                                                  | 回应 `send`                                                                                                                                                                                                               |

### 驿窗 → 插件

| type    | 字段                                | 说明                                                                                                                                                    |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `watch` | `conversations: [id]`               | 名单整体替换。名单只决定哪些会话能送话、算「审核」                                                                                                      |
| `open`  | `requestId`, `text`, `project?`     | 新开会话（`project` 是 ChatGPT 项目页网址，给了就在项目里新建），填 `text` 发出，拿到 `/c/<id>` 后回 `opened`，并把它自行加进名单（不等下一条 `watch`） |
| `send`  | `requestId`, `conversation`, `text` | 给名单里的会话送话；标签页没开就在后台打开 `https://chatgpt.com/c/<id>` 再送                                                                            |
| `focus` | `conversation`                      | 把这个会话的标签页切到前台（没开就打开）                                                                                                                |

`reason` 取值：`not-watched`、`no-composer`、`busy`（正在生成）、`send-failed`、`timeout`、`tab-closed`。

## 驿窗这一端

- ChatGPT 作为一个客户端（`agents/src/chatgpt`，id `chatgpt`），会话 id 为 `chatgpt:<会话id>`，回跳目标 `chatgpt-conversation`（交给插件 `focus`，插件不通时用浏览器打开 `https://chatgpt.com/c/<id>`）。
- `turn complete` 变成一条 completion 事件，侧栏照常弹「新回复」回执；回复全文不截断。
- `turn start` 变成一条 running 的 session-observation，会话显示「在答」，直到回复完成；ChatGPT 只报一次开始，没有心跳，15 分钟还没完成（多半是标签页关了）就不再算在答。它和回复一样写进 hook 收件箱（ChatGPT 没有直连应用的钩子通道，收件箱是唯一的路）；收件箱只为「自己的通道报回合」的客户端收这类记录（#206 之前一律拒收，「在答」从没显示过）。
- 对话与审核（#145）：名单里的会话（驿窗经 `open` 开的）算「审核」，其余是常浩自己开的「对话」；两种事件都带 `review`，快照里的 ChatGPT 会话带 `review: true | false`。只读得到 Chrome 里 chatgpt.com 的对话，手机端、Mac 桌面应用看不到。
- 插件装上、更新或重新加载时（#206）：Chrome 不给已开着的 chatgpt.com 标签页装新内容脚本，旧脚本跟插件断开，这些标签页里的对话就一直报不上来（接力会话由插件新开标签页，不受影响）。所以插件后台在 `runtime.onInstalled` 时给每个已开的 chatgpt.com 标签页补装 `page.js`、`content.js`（要 `scripting` 权限）；同一页面再装一次时，旧的一份先停下、新的一份接手，不重复报；断开的旧脚本发消息出错就自己停下。
- 新会话在首页发出，ChatGPT 开始回答时地址里还没有会话 id，那次 `turn start` 不带 `conversation`；地址变成 `/c/<id>` 时若仍在生成，插件带上新 id 再报一次 `turn start`，接力才会进入 `working`。
- 名单 = 驿窗经 `open` 新开过的会话，存 `<数据目录>/chatgpt/watched.json`（1c 的接力会话也在其中，见下）。
- 设置 · 智能体插件页有「ChatGPT（Chrome 插件）」一行：登记 host manifest、显示是否连上。

## 1c 接力（#71）

一个 Claude Code 会话把工作交给一个 ChatGPT 会话审核，两边绑成一组「接力」（代码里叫 handoff，避开已经指 API 中转站的 relay），之后的往返都在这两个会话里接着聊。

### 接力记录

- 存 `<数据目录>/chatgpt/handoffs.json`（目录 0700、文件 0600，整份替换写），保留最新 200 条：`{id, title, claudeSession, cwd, chatgptConversation, status, error?, createdAt, updatedAt, rounds, phase, phaseAt, steps, brief?}`，时间是毫秒时间戳。
- `status`：`opening`（新会话正在打开）→ `open`（已绑定会话）或 `failed`（打开失败，`error` 写原因）；同一个 Claude 会话发起新审核、或常浩点「结束接力」时改成 `closed`。一个 Claude 会话、一个 ChatGPT 会话同时只属于一条未结束（opening / open）的接力。
- `phase`（批 A，#120）：`sending`（正在送，新会话在开）→ `delivered`（插件确认已送到，对方没开始）→ `working`（插件报这一轮开始）→ `replied`（回信到了，等常浩决定）→ `returned`（已转回 Claude）；另有 `ended`、`failed`。`phaseAt` 是进入这一阶段的时间。「送到了」只认插件的 `opened` / `sent` 回应，「审完了」只认 `turn complete`。
- 侧栏小人：网页 ChatGPT 没有会话可数，接力处于 `working`（ChatGPT 正在回答）时，算作 ChatGPT 所在那一格（与 Codex 共用的 OpenAI 小人）在工作，播「工作中」；回信到了、失败或结束就停（`crates/hud/src/vendors.rs` 的 `relays_answering`、前端 `packages/hud/src/relays-answering.ts`）。
- 左滑发起（批 B，#124；归因与持久化 2026-11-07）：「正在进行」里本机 Claude 会话左滑点「审核」「讨论」，宿主经 Claude Code 插件给该会话留一段固定的话，请它自己整理后调 `relay_to_chatgpt`。每次左滑有自己的编号（`L` 开头），写在留的话里，请会话调用时填进 `launch` 参数；只有带着这个编号、来自同一会话的调用才算这次左滑办了，新开审核或续进已开的审核都算，同会话别的接力不算。左滑记录存在 `chatgpt/launches.json`，驿窗重启后照样认得，排队中的不会再留一次。状态：等待或已领取算「排队中」，会话开始处理算「已送进会话」；插件文件在被看到领取之前就没了，算「状态不明」，不说成已领取；一小时没领取算过期；领取后一小时（从领取时算）没发起接力算停滞；状态不明一小时没等到接力算「没等到」。这几种结局在那一行显示半小时，之后可以再左滑。快照字段 `relayLaunches`。插件「先标记已领取再提交」保持不变，防止重启后重复提交，领取后中断也不自动重发。
- `steps`：每一步 `{at, kind, text?, points?, verdict?}`。`work` Claude 做完一轮（`text` 是 `summary`，没给就用标题）、`ask` 驿窗送给 ChatGPT 且已送到（`text` 是原话摘录）、`reply` ChatGPT 回信（`points` 是回信里编号列出的意见，最多 12 条；`verdict` 从最后的「结论：通过 / 需修改」读出 `pass` / `revise`；最新一条回信全文保留，最多 64 KB，供「转回 Claude」用）、`back` 转回 Claude、`again` 请 Claude 交回复审、`fail` 没送出去、`end` 结束。快照里的步骤只带 600 字以内的摘录，不带原话指纹。
- 去重：同一段文字刚送到 ChatGPT、还没回信时，再送一次（Claude 等超时重试）不重复发，返回 `status: "repeated"`；转回 Claude 同理。同一条接力同一时间只有一段话在路上，并排的第二次直接拒绝（「上一段还在送」）；同一个 Claude 会话同一时间只能发起一次，「结束接力」也要等路上那段送完。
- 回信只认审核中的那一轮：接力在 `sending` / `delivered` / `working` 时的 `turn complete` 才记成回信，同一 `messageId` 只记一次；回信之后常浩在 ChatGPT 里接着聊不算审核。ChatGPT 常在宿主拿到 `opened` / `sent` 回应之前就开始、甚至答完：会话还没绑上，或这条接力的那段话还在路上时，`turn start` / `turn complete` 先整条记下（最多 16 条），绑上或送完后按顺序补录；已绑定、没在送的会话直接记，所以回信之后的闲聊不会补成回信。
- 打开超时与恢复：`opening` 超过 2 分钟算失败（「ChatGPT 新会话两分钟没打开」）；驿窗重启时还在 `opening` 的改成失败（「驿窗重启时 ChatGPT 新会话还在打开」）。失败的接力保留 `brief`（只留最新 3 条），卡上「重试」原样再开。打开请求的 `requestId` 是「接力 id~第几次」（`attempt`，每次重试加 1）：超时后插件迟到的 `opened` 只有属于当前这一次、且这个 Claude 会话还没开新接力时才绑上。
- `rounds`：第一次交代之后，两边每转一次加 1。卡上的「第 n / 2 轮」按 `ask` 步数算，最多 2 轮（可以超）。
- 回合日志：宿主每收到一条 `turn` 就在 `<数据目录>/chatgpt/turns.jsonl` 记一行 `{at, conversation, phase, messageId, replyChars, outcome}`，不记回复原文。`outcome`：`taken` 直接记入、`early` 先存着、`caught-up` 绑上后补录、`unused` 没用上（不是审核中的那一轮，或回复是空的）、`evicted` 存满 16 条被挤掉。文件超过 1 MB 改名为 `turns.old.jsonl` 后重新记。回信丢了先查这里：没有那一行，是插件那一侧没报；有那一行，看 `outcome` 就知道宿主为什么没用。
- 快照 `handoffs` 带未结束的和最近一天失败或结束的，不带 `brief`；记录一变，宿主当场重发快照，不等下一轮采集。ChatGPT 通道把 `turn start` / `turn complete` / 迟到的 `opened` 告诉宿主（`Channel::listen`），接力当场前进。
- 新会话放进的 ChatGPT 项目存 `<数据目录>/chatgpt/config.json`：`{"project": "https://chatgpt.com/g/<id>/project"}`，只认这种项目页网址（去掉 `?`、`#` 和末尾 `/`）。在设置 · 智能体插件 ·「ChatGPT（Chrome 插件）」登记后出现「新会话放进项目」一行，粘贴保存；不填就开在 ChatGPT 首页。
- 名单（`watched.json`）：接力的会话都是驿窗经 `open` 新开的，开好就在名单里，记的是接力标题（`named: true`），不是插件报的标签页标题；它的回信回执也先用接力标题。

### 从 Claude 发起：`relay_to_chatgpt`

- 驿窗 MCP 的内置工具，参数 `{title, summary?, brief}`（`summary` 一句话写这一轮做了什么，显示在接力卡时间线上）；MCP 自己补上 `caller`（Claude Code 的 `CLAUDE_CODE_SESSION_ID`）、`cwd`（MCP 进程的目录，就是 Claude 的工作目录）和 `parent`。工具说明写明 brief 要带的六项：任务名与目标、改了什么和为什么、分支和 PR 链接、改动本身（`git diff`，太长写摘要 + 关键片段）、重点看哪里、请 ChatGPT 最后一行写「结论：通过」或「结论：需修改」。
- 宿主只认调用方自己报的会话：`caller.sessionId` 格式合法就用它，不看哪些会话在线，也不按同目录去猜；没有就拒绝。id 过时（`/clear`、续会话后）时照样记在它名下，最坏是「转回 Claude」报这个会话没加载插件，不会送错会话。别的客户端调用一律拒绝。
- 不受「让智能体整理 HUD」开关管，但 ChatGPT 插件必须连着，否则返回中文原因。登记了 ChatGPT 插件（host manifest 在）时，本机工具通道也会监听，好让这个工具够得着。
- 这个会话已有 `open` 的接力：直接把 brief 送进那个 ChatGPT 会话（等插件回话，最多 30 秒），返回 `{handoffId, status: "sent", conversation}`；还在 `opening`：拒绝，等它打开。否则新建一条 `opening`，在后台线程 `open`（带项目），立即返回 `{handoffId, status: "opening"}`；打开后改 `open` 或 `failed`。返回里另有 `message`，一句给 Claude 看的中文。
- 单条文字超过 768 KB 拒绝（Chrome 发往插件一帧不能超过 1 MB，超了会断开插件）。

### 接力卡（批 A，#120，设计「甲」时间线展开卡）

- 设计稿 https://claude.ai/artifact/VReXNsQ2gUc6RPRmtcvdXB （第 2 版）「甲 · 卡内交接」的展开卡；源与截图在 `~/Library/Application Support/postpane/evidence/2026-11-06-handoff/design/`。
- 打开方式：ChatGPT 或 Claude 的新回复回执上，属于某条接力的多一个「查看接力」；侧栏「正在进行」里该会话的第二行换成虚线框「接力 1/2」加一句进度，点框打开。卡占侧栏卡片位，Esc 或侧栏收起即关。
- 卡头「接力 · 第 n / 2 轮 · 圆章」（接力 / 回信 / 需改 / 修改 / 未送 / 已结束），任务名带回到 Claude 会话的 ↗，下一行「Claude ⇄ ChatGPT · 审核 · 发起时间」；中间竖向时间线：每步时间、谁（Clawd / ChatGPT / 「驿」章）、做了什么，回信下列意见与结论，当前一步带绿点，等常浩决定的一步琥珀色，之后的步骤虚线淡出。
- 底部按阶段：送出与处理中「结束接力」「查看 ChatGPT 对话」；回信到了加「转回 Claude」（把回信全文连同处理要求经插件送回 Claude 会话，会话在跑就排队）；已转回加「再审一轮」（请 Claude 改完调 `relay_to_chatgpt` 复审，第 2 轮后不再出现）；失败「重试」；结束「知道了」。
- 命令：`handoff_act {id, action: "back" | "again" | "end" | "retry" | "pause" | "resume"}`。旧的转交单（`handoff_start`、`handoff_forward`、`handoff_route`）已撤掉。

- 侧栏票根上的章（2026-11-07 常浩定，`packages/hud/src/relay-stamps.ts`）：ChatGPT 票根的蓝色「审」只在 ChatGPT 真的在看时盖——接力开着、处于 `delivered` / `working`、没被停（`halt` 为空）、送达不到 `REPLY_WAIT_MS`（30 分钟）；被停掉或交还常浩的不盖。送达超过 30 分钟还没回信的（不论停没停）改盖红色「未审」，点 ChatGPT 那一格直接打开那个 ChatGPT 对话（悬停照旧出面板）。「未审」让位（#213）：ChatGPT 格有更要紧的事要说——在答（常浩自己的对话或接力在答）、有回信待你看——时不盖「未审」，脚注照常显示；空下来再盖回去。「未审」挂满 `LINGERS_MS`（2 小时，同悬停面板不再列出该审核的 `STALE_REVIEW`）不退场，边框像「审」在答时那样向外发散（蜡红、长方框），直到接力结束。Claude 票根的红蜡「回」：有接力处于「已回复」等常浩处理时显示；判了通过的会自动结束，所以只剩「需修改」交还常浩、还没处理的，卡上点「结束接力」或转回 Claude 后撤掉。

### 自动往返（批 2，#72）

- 开关：新接力默认开（`auto: true`）；#72 之前的记录读进来是关的。卡头「接力」旁标「自动往返」，停了标琥珀色「自动已停」（悬停看原因），底部多一个「暂停自动」/「继续自动」。
- 回信到了（`replied`）且开着时，驿窗按结论自己走（`Desk::drive`，插件报 `turn complete` 后立即跑）：
  - 「结论：通过」：自动结束接力，`end` 步带 `auto`；自动往返关着或已停时也照样结束（2026-11-07 常浩定：判了通过的接力一直开着，Claude 票根上的「回」撤不掉）；
  - 「结论：需修改」且审过不到 `ROUNDS`（2）轮：把回信全文转回 Claude（与「转回 Claude」同一段话），`back` 步带 `auto`；Claude 改完自己调 `relay_to_chatgpt`，进入下一轮；
  - 第 2 轮仍「需修改」，或回信没写结论：停下交还常浩（`stop` 步，`halt` 写原因），卡上照常可「转回 Claude」「结束接力」。
- 出错与处理：转回 Claude 失败马上重试一次，两次的错误各记一条 `fail` 步（`auto`）。两次都失败（最常见的是 Claude 桌面版在会话一轮做完、空闲几分钟后把它暂停了，插件不再签到；2026-11-07 L5 第一单实测碰到），改为把同一段话排进该会话的待发送队列（与左滑发起同一机制），记 `queuedAt`，阶段照常是 `returned`、自动往返不停。常浩在 Claude 里打开那个会话，插件就会提交，卡上和「正在进行」写「意见已排队 · 打开 Claude 会话继续」。排队失败才停下交还常浩；排队 `QUEUE_WAIT_MS`（1 小时，与插件的留话寿命一致）没被领走也停下交还常浩。Claude 再调 `relay_to_chatgpt` 交回复审时清掉 `queuedAt`。ChatGPT 30 分钟没回信（`delivered` / `working` 超过 `REPLY_WAIT_MS`）、Claude 2 小时没交回复审（`returned` 超过 `FIX_WAIT_MS`）都停下交还常浩，在生成快照时检查。驿窗重启时开着的一律先暂停（「驿窗重启，自动往返先暂停」），防止重启前后重复送；常浩点「继续自动」后，等着的回信立即处理。
- 记录：每一步的 `at`、谁做的（`auto` 表示驿窗自动做的，没有就是常浩点的）、出错原文与处理方式（`fail` / `stop` 的 `text`）都在 `handoffs.json`，每轮耗时由相邻步骤的时间相减得出。

### 本机工具通道

- 一条连接一个线程，同时最多 8 个，超了立即回「忙」；一个慢请求（等 ChatGPT）不挡别的。
- 转接程序（`agent-hud-engine --app-channel`）按方法定等待（`request_with_timeout`）：`chatgpt_open` 100 秒（打开最多 90 秒再留 10 秒），`chatgpt_send`、`relay_to_chatgpt` 40 秒（送话最多 30 秒），其余照旧 40 秒；转接程序也把应用没认出 id 的回答（如「忙」）补上请求的 id。MCP 那头 `relay_to_chatgpt` 等 55 秒（`EngineClient.request` 新增的 `timeoutMs`，默认仍 45 秒）。

## 页面结构（2026-11 新版 chatgpt.com，探针 #95）

- 一轮 `[data-turn-key]`；回复 `[data-chatgpt-search-unit-key$=":assistant"]`；用户消息 `[data-user-message-bubble]`；读屏标题 `h4[data-conversation-role]`、`.sr-only` 整理时跳过。
- 正文组件 `data-d-component`：text / title / list / list-item / code / table / table-row / table-cell；加粗 `[data-d-default-strong]`。
- 代码块两种画法：CodeMirror `.cm-content[data-language]`（行是 `.cm-line`），或 `pre > code`（语言在块头文字里）。
- 输入框 `.ProseMirror[contenteditable=true]`；发送 `form button[type=submit]`；生成中同位置是「停止」按钮。
- 新回复先出一个空的占位块，答案随后写进同一个块、同一个 `messageId`。插件只在回复不为空、而且 600 毫秒内没再变化时才报 `turn complete`；否则占位块会被当成答完，同一 `messageId` 的真回复随后被当成已报过而丢掉（2026-11-07 接力 `h1a1b1fed89e00`，L-18）。
- 页面选择器只写在 `src/apps/chrome-extension/page.js` 一处；改版失效时插件报 `no-composer` 等原因，驿窗退回半自动。
