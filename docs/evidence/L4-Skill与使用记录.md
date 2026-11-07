# L4 Skill 与使用记录

L4 要两样东西：驿窗把做法沉淀成别人也能用的 Skill，以及有同事真的用过的记录。第一样有，第二样**缺**。

## 一、Skill 本身（有）

| Skill / 工具 | 在哪 | 提交 | 做什么 |
|---|---|---|---|
| 项目 skill「驿窗一轮」 | `.agents/skills/postpane-round/`（Claude `/postpane-round`，Codex `$postpane-round`） | `12a1a8e`（#166）建立，`7733bc4`（#169）采纳 E-07、E-08 | 一轮改动从开工到收尾的六步：开 worktree、测试、装机回读、交接、合并清理、复盘进化。每一步都注明来自哪条坑（L-xx / G-xx）。装机收成 `scripts/install.sh`，会话统计收成 `scripts/round-stats.mjs` |
| skill 的进化记录 | `.agents/skills/postpane-round/EVOLUTION.md` | 同上 | E-01 至 E-09，每条写清从哪次出事来、改了哪一步 |
| MCP 工具 `relay_to_chatgpt` | `src/apps/mcp/src/index.ts`，说明见 `docs/chatgpt-channel.md` | `b15f3c3`（#168）等 | 任何 Claude Code 会话都能用它把一轮工作交给 ChatGPT 审，审完自动往返。已在 5 个仓库的真实任务上用过，见 [L5 运行记录](L5-运行记录.md) |

**实际使用痕迹（本机，都是常浩自己的会话）**

- `install.sh`：11-07 有 4 轮装机用它完成，每轮的备份和回读都在 `~/Library/Application Support/postpane/evidence/2026-11-07-{auto-relay,launch-attribution,relay-toss,auto-back-queue}/`。
- 本项目的 Claude 会话记录里，有 12 份提到「驿窗一轮 / postpane-round」（`grep -rl` 统计 `~/.claude/projects/-Users-nat-Documents-ChatGPT----work-postpane/*.jsonl`）。
- `relay_to_chatgpt`：`handoffs.json` 里 10 条接力，来自驿窗、github-center、my-skills、digiworld、digital-twin 五个仓库。

这些都是常浩一个人在用，算不上「同事使用」。

## 二、同事使用记录（缺）

本会话查了仓库、本机证据目录和知识库（Vault 搜「驿窗 同事 使用」），没找到任何同事装过或用过驿窗、或这几个 Skill 的记录。按规矩不编，下表留给常浩补。

| 项 | 填写 |
|---|---|
| 发给谁（代称） | 缺 |
| 日期 | 缺 |
| 给的是什么、哪个版本（提交号） | 缺 |
| 对方用过的痕迹（截图、对方的接力编号、对方提的问题或改动） | 缺 |

**要补这一级，先要想清楚一个矛盾**：驿窗定位是「只有常浩本人使用」，侧栏里的 Clawd 小人素材也不能对外分发（AGENTS.md 规则）。所以同事使用，现实里只有两条路：

1. 给同事的是 Skill，不是应用：比如「驿窗一轮」里和驿窗无关的做法（装机前后比对、交接防伪造五条），或者 `relay_to_chatgpt` 这类「Claude 交 ChatGPT 审」的工作流。这需要先把它们从驿窗仓库里抽出来，做成通用 skill。
2. 给同事装应用：先得有一个去掉 Clawd 素材的版本，再按 [安装与使用](../安装与使用.md) 装。这份说明同时也是 L6「第二人复现」用的那份。
