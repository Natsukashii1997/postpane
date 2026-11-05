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
- 名单（1b 阶段）= 驿窗经 `open` 新开过的会话，存 `<数据目录>/chatgpt/watched.json`；1c 起由接力决定。
- 设置 · 智能体插件页有「ChatGPT（Chrome 插件）」一行：登记 host manifest、显示是否连上。

## 页面结构（2026-11 新版 chatgpt.com，探针 #95）

- 一轮 `[data-turn-key]`；回复 `[data-chatgpt-search-unit-key$=":assistant"]`；用户消息 `[data-user-message-bubble]`；读屏标题 `h4[data-conversation-role]`、`.sr-only` 整理时跳过。
- 正文组件 `data-d-component`：text / title / list / list-item / code / table / table-row / table-cell；加粗 `[data-d-default-strong]`。
- 代码块两种画法：CodeMirror `.cm-content[data-language]`（行是 `.cm-line`），或 `pre > code`（语言在块头文字里）。
- 输入框 `.ProseMirror[contenteditable=true]`；发送 `form button[type=submit]`；生成中同位置是「停止」按钮。
- 页面选择器只写在 `src/apps/chrome-extension/page.js` 一处；改版失效时插件报 `no-composer` 等原因，驿窗退回半自动。
