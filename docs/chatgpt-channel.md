# ChatGPT 通道（接力 1b，#99）

驿窗经常浩自己 Chrome 里登录的 chatgpt.com 接通 ChatGPT 聊天。三段：

```
chatgpt.com 标签页（内容脚本）⇄ 插件后台 ⇄ Chrome Native Messaging ⇄ 转接程序 ⇄ 驿窗（本机套接字）
```

## 固定标识

| 项 | 值 |
|---|---|
| 插件目录 | `src/apps/chrome-extension/`（开发者模式「加载已解压的扩展程序」） |
| 插件 id | `fjjbgamejbdjdaddinacpbmaeokinbjl`（manifest 的 `key` 固定，换目录加载 id 不变） |
| Native host 名 | `com.postpane.chatgpt` |
| host manifest（macOS） | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.postpane.chatgpt.json`，`allowed_origins` 只写 `chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/` |
| 转接程序 | 随驿窗打包；Chrome 启动它时第一个参数是 `chrome-extension://<id>/` |
| 驿窗套接字 | `<数据目录>/chatgpt/extension.sock`（目录 0700、套接字 0600，同 local_tools） |

## 分帧

两段都用同一种分帧：4 字节小端长度 + UTF-8 JSON（Chrome Native Messaging 的格式；驿窗到 Chrome 一帧不超过 1 MB）。转接程序只原样搬运，不解析内容。

## 消息

每条都是带 `type` 的 JSON 对象。时间一律毫秒时间戳（`at`）。

### 插件 → 驿窗

| type | 字段 | 说明 |
|---|---|---|
| `hello` | `version`, `extensionId` | 插件后台连上后第一条 |
| `tabs` | `conversations: [{id, open, hidden}]` | 名单里各会话标签页状态，变化时发 |
| `turn` | `phase: "start" \| "complete"`, `conversation`, `title`, `prompt`, `reply`, `messageId`, `at` | 名单里的会话一轮开始 / 完成。`complete` 时 `reply` 是整理好的 Markdown 全文，`prompt` 是这一轮用户消息全文，`title` 是会话标题（标签页标题去掉「 - ChatGPT」等后缀，可能为空） |
| `opened` | `requestId`, `ok`, `conversation?`, `title?`, `reason?` | 回应 `open` |
| `sent` | `requestId`, `ok`, `reason?` | 回应 `send` |

### 驿窗 → 插件

| type | 字段 | 说明 |
|---|---|---|
| `watch` | `conversations: [id]` | 名单整体替换。插件只读、只报名单里的会话 |
| `open` | `requestId`, `text`, `project?` | 新开会话（`project` 是 ChatGPT 项目页网址，给了就在项目里新建），填 `text` 发出，拿到 `/c/<id>` 后回 `opened`，并把它自行加进名单（不等下一条 `watch`） |
| `send` | `requestId`, `conversation`, `text` | 给名单里的会话送话；标签页没开就在后台打开 `https://chatgpt.com/c/<id>` 再送 |
| `focus` | `conversation` | 把这个会话的标签页切到前台（没开就打开） |

`reason` 取值：`not-watched`、`no-composer`、`busy`（正在生成）、`send-failed`、`timeout`、`tab-closed`。

## 驿窗这一端

- ChatGPT 作为一个客户端（`agents/src/chatgpt`，id `chatgpt`），会话 id 为 `chatgpt:<会话id>`，回跳目标 `chatgpt-conversation`（交给插件 `focus`，插件不通时用浏览器打开 `https://chatgpt.com/c/<id>`）。
- `turn complete` 变成一条 completion 事件，侧栏照常弹「新回复」回执；回复全文不截断。
- 名单 = 驿窗经 `open` 新开过的会话，存 `<数据目录>/chatgpt/watched.json`（1c 的接力会话也在其中，见下）。
- 设置 · 智能体插件页有「ChatGPT（Chrome 插件）」一行：登记 host manifest、显示是否连上。

## 1c 接力（#71）

一个 Claude Code 会话把工作交给一个 ChatGPT 会话审核，两边绑成一组「接力」（代码里叫 handoff，避开已经指 API 中转站的 relay），之后的往返都在这两个会话里接着聊。

### 接力记录

- 存 `<数据目录>/chatgpt/handoffs.json`（目录 0700、文件 0600，整份替换写），保留最新 200 条：`{id, title, claudeSession, cwd, chatgptConversation, status, error?, createdAt, updatedAt, rounds}`，时间是毫秒时间戳。
- `status`：`opening`（新会话正在打开）→ `open`（已绑定会话）或 `failed`（打开失败，`error` 写原因）；同一个 Claude 会话发起新审核时，旧的那条改成 `closed`。一个 Claude 会话、一个 ChatGPT 会话同时只属于一条未结束（opening / open）的接力。
- `rounds`：第一次交代之后，两边每转一次加 1。
- 快照 `handoffs` 带未结束的和最近一天失败的；记录一变，宿主当场重发快照，不等下一轮采集。
- 新会话放进的 ChatGPT 项目存 `<数据目录>/chatgpt/config.json`：`{"project": "https://chatgpt.com/g/<id>/project"}`，只认这种项目页网址（去掉 `?`、`#` 和末尾 `/`）。在设置 · 智能体插件 ·「ChatGPT（Chrome 插件）」登记后出现「新会话放进项目」一行，粘贴保存；不填就开在 ChatGPT 首页。
- 名单（`watched.json`）不变：接力的会话都是驿窗经 `open` 新开的，开好就在名单里。

### 从 Claude 发起：`relay_to_chatgpt`

- 驿窗 MCP 的内置工具，参数 `{title, brief}`；MCP 自己补上 `caller`（Claude Code 的 `CLAUDE_CODE_SESSION_ID`）、`cwd`（MCP 进程的目录，就是 Claude 的工作目录）和 `parent`。工具说明写明 brief 要带的六项：任务名与目标、改了什么和为什么、分支和 PR 链接、改动本身（`git diff`，太长写摘要 + 关键片段）、重点看哪里、请 ChatGPT 最后一行写「结论：通过」或「结论：需修改」。
- 宿主认调用的会话：`caller.sessionId` 在 Agent HUD 插件报的在线会话里就用它；否则（`/clear`、续会话后 id 会过时）用同目录下在线的 Claude 会话；再否则用快照认得的那个 id、同目录最近活动的会话；都没有就拒绝。别的客户端调用一律拒绝。
- 不受「让智能体整理 HUD」开关管，但 ChatGPT 插件必须连着，否则返回中文原因。登记了 ChatGPT 插件（host manifest 在）时，本机工具通道也会监听，好让这个工具够得着。
- 这个会话已有 `open` 的接力：直接把 brief 送进那个 ChatGPT 会话（等插件回话，最多 30 秒），返回 `{handoffId, status: "sent", conversation}`；还在 `opening`：拒绝，等它打开。否则新建一条 `opening`，在后台线程 `open`（带项目），立即返回 `{handoffId, status: "opening"}`；打开后改 `open` 或 `failed`。返回里另有 `message`，一句给 Claude 看的中文。
- 单条文字超过 768 KB 拒绝（Chrome 发往插件一帧不能超过 1 MB，超了会断开插件）。

### 侧栏回执上的转交单（设计「乙」）

- 新回复回执（Claude 或 ChatGPT）的按钮行多一个「转给…」，有地方可转时才出现。点开在回复下方展开「转交单」，同一张纸面：
  - 从：来源（CLAUDE / CHATGPT）+ 会话标题；编号 `NO.` + 接力 id 末四位。
  - 到：ChatGPT 回复 → 接力里的 Claude 会话；Claude 回复 → 接力里的 ChatGPT 会话（有就默认选它），以及总有的「新建 ChatGPT 审核」。
  - 用途：请审核 / 按意见处理 / 原样转，各自在消息前加固定开头；默认到 ChatGPT 请审核、到 Claude 按意见处理。换用途只换开头，改过的正文保留。
  - 消息全文可改；送达方式一行写怎么送，或送不到的原因。
  - 「送进会话」/「新建并送出」、「取消」；Esc 取消，⌘↩ 送出；送出后显示结果。转交单开着时回执不收起。
- 命令：`handoff_forward {to: "claude" | "chatgpt", target, text}`（到 Claude 走插件，先查 `reaches`，空闲时自动发；到 ChatGPT 走 `send`）、`handoff_start {session, cwd, title, text}`（新建审核，同上面的新建流程）、`handoff_route {to, target}`（送达方式一行用）、`chatgpt_project {project?}`（只限设置窗口）。

### 本机工具通道

- 一条连接一个线程，同时最多 8 个，超了立即回「忙」；一个慢请求（等 ChatGPT）不挡别的。
- 转接程序（`agent-hud-engine --app-channel`）按方法定等待（`request_with_timeout`）：`chatgpt_open` 100 秒（打开最多 90 秒再留 10 秒），`chatgpt_send`、`relay_to_chatgpt` 40 秒（送话最多 30 秒），其余照旧 40 秒；转接程序也把应用没认出 id 的回答（如「忙」）补上请求的 id。MCP 那头 `relay_to_chatgpt` 等 55 秒（`EngineClient.request` 新增的 `timeoutMs`，默认仍 45 秒）。

## 页面结构（2026-11 新版 chatgpt.com，探针 #95）

- 一轮 `[data-turn-key]`；回复 `[data-chatgpt-search-unit-key$=":assistant"]`；用户消息 `[data-user-message-bubble]`；读屏标题 `h4[data-conversation-role]`、`.sr-only` 整理时跳过。
- 正文组件 `data-d-component`：text / title / list / list-item / code / table / table-row / table-cell；加粗 `[data-d-default-strong]`。
- 代码块两种画法：CodeMirror `.cm-content[data-language]`（行是 `.cm-line`），或 `pre > code`（语言在块头文字里）。
- 输入框 `.ProseMirror[contenteditable=true]`；发送 `form button[type=submit]`；生成中同位置是「停止」按钮。
- 页面选择器只写在 `src/apps/chrome-extension/page.js` 一处；改版失效时插件报 `no-composer` 等原因，驿窗退回半自动。
