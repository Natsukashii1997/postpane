# 接力（handoff）代码怎么放

一张接力分两半：**记录**（`Book`、`Handoff`：状态、步骤、落盘，原在 platform，7a 批 2 搬来）和**宿主**（`Desk`：何时送、何时转回、通知谁）。7a 批 3 起按概念放目录，一个概念的两半放在一起：

| 目录 | 管什么 | 记录一侧 | 宿主一侧 |
|---|---|---|---|
| `gate/` | 审核门：上限、计轮、审查链、受审版本、到顶未了结 | `book.rs`、`book_io.rs`、`book_chain.rs`、`book_guard.rs`、`book_leave.rs`、`book_pull_request.rs` | `desk.rs`、`desk_guard.rs` |
| `back/` | 转回与续接：回信转回会话、停着时到的回信、后台续接、闲置收尾、结束后关标签页（#542） | `book_held.rs`、`book_wake.rs`、`book_idle.rs` | `desk.rs`、`desk_held.rs`、`desk_wake.rs`、`desk_texts.rs`、`desk_ended.rs` |
| `answers/` | 收信：回信归谁、重读、没画出、读线程只记账 | `book_asked.rs` | `desk_belongs.rs`、`desk_reread.rs`、`desk_undrawn.rs`、`desk_driver.rs` |
| `sending/` | 送审：送进 ChatGPT 的话、没确认送到的话、谁做这一轮 | `book_unsure.rs`、`book_mending.rs`、`book_doer.rs` | `desk_asking.rs`、`desk_lines.rs` |
| `notice/` | 出错通知：没打开、没回信时告诉发起的会话 | `book.rs` | `desk.rs` |

顶层留着两半的核心：`../handoff.rs`（`Desk`、发起、按钮、自动往返）和 `book.rs`（数据类型与 `Book` 的基本移动）；`settings.rs` 是设置页的两项；`tests.rs` 与 `tests/` 是测试。

**注意：目录不等于模块。** 文件用 `#[path]` 挂在原来的模块下：记录一侧仍是 `book::gate`、`book::held` 这些模块（能用 `Book` 的私有方法），宿主一侧仍是 `handoff::gate`、`handoff::held`。找代码按目录，读 `use` 路径按模块名。对照表在 `book.rs` 和 `../handoff.rs` 开头的 `#[path]` 声明里。

状态、转移和不变量见 `docs/chatgpt-channel.md`「接力状态」，测试在 `tests/book_states.rs`。
