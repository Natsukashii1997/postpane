# 开发实录与坑

踩过的坑记在这里，Claude 和 Codex 都读。排障、发布、改脚本之前，先搜一遍：`grep -n 关键词 docs/LESSONS.md`；换个项目也成立的坑在全局 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md`（G-xx），也搜一遍。

## 怎么写

- 每轮交接时自问「本轮踩到新坑了吗」：有就在下面追加一条，并在 CURRENT.md 的交接里写「本轮新坑：L-xx」；没有就写「无」。
- 一条一个坑，编号只增不改。写现象、根因、正确做法、证据。证据写到能查的程度（提交号、文件与章节、证据目录）；查不到就写「未核实」，不编。
- 结论被推翻时改条目并注明日期，不删。

## 怎么升级

- 同类坑第 2 次出现：把正确做法写进 AGENTS.md 或 docs/OPERATIONS.md（一句话硬约束进 AGENTS.md，操作细节进 OPERATIONS.md），条目的「升级」改成写到了哪里。
- 能用机器判定的：写成测试或脚本（如 `scripts/check-rules.mjs`），条目注明。
- 换个项目也成立的（不依赖本项目的业务、页面、发布脚本）：提议提升到全局坑 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md`，写成 G-xx；原条目保留，末尾加一行「提升：已提升为全局 G-xx（日期）」。只出提案，用户批准才写。
- 条目超过约 30 条时整理一次：已升级、且之后没再犯的，归档到 `docs/history/`。

---

## L-01 新目录直接跑 cargo test，桌面程序编译失败（2026-11-04）

- 现象：刚 `pnpm install` 完的目录跑 `cargo test --workspace`，报 `failed to run custom build command for agent-hud` 和 ``resource path `resources` doesn't exist``，整套 Rust 测试一项没跑。
- 根因：`src/apps/desktop/src-tauri/tauri.conf.json` 把 `resources/` 打进应用，这个目录由 `src/tooling/package-resources.mjs` 生成，被 `.gitignore` 忽略；新目录里没有它，Tauri 的构建脚本直接失败。打包命令的 `beforeBuildCommand` 会先生成，所以只跑打包时看不出来。
- 正确做法：新目录先跑 `node src/tooling/package-resources.mjs`，再跑 `cargo test` 或 `pnpm test`；已写进 AGENTS.md「运行」。
- 证据：2026-11-04 基线，首轮 `cargo test` 退出码 101；生成资源目录后重跑，退出码 0，662 项通过。
- 升级：已写进 AGENTS.md「运行」。
