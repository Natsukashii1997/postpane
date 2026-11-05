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

## L-02 bun 编译出的程序在 macOS 上一运行就被杀（2026-11-04）

- 现象：`pnpm run test:mcp` 6 项全部失败，报 `Tool some_tool not found`、`Cannot read properties of undefined (reading 'description')`；打包出的 `agent-hud-mcp` 也出现过一运行就退出。
- 根因：`bun build --compile` 产出的程序签名无效（`codesign -v` 报 `invalid signature`），macOS 启动即杀，退出码 137。测试里的替身程序起不来，中转程序就拿不到工具列表。
- 正确做法：凡是 bun 编译出的程序，在 macOS 上编译后立刻 `codesign --force --sign - <文件>`。已在 `src/tooling/package-resources.mjs` 和 `src/apps/mcp/test/host-tools.test.mjs` 补上。
- 证据：2026-11-04 实测，未签名的 bun 程序退出码 137，补签后正常输出；补签后 `test:mcp` 由 `ℹ fail 6` 变为 `ℹ pass 6` / `ℹ fail 0`。
- 升级：未升级。换个项目也成立，可提议提升为全局坑。

## L-03 安装时先删旧版，打包路径读错导致应用被删（2026-11-04）

- 现象：脚本从 `tauri build` 输出里取「Finished 1 bundle at:」下一行当 `.app` 路径，先 `rm -rf /Applications/PostPane.app` 再 `ditto`；`ditto` 报 `Cannot get the real path for source '…/PostPane.app (106.23 MiB)'`，`/Applications` 里一度没有应用。
- 根因：那一行末尾带了大小「(106.23 MiB)」，路径不对；删旧版放在复制成功之前。另外 `pgrep -f "/Applications/PostPane.app/Contents/MacOS"` 会匹配到各会话起的 `agent-hud-mcp`、`agent-hud-engine`，不能用来判断应用本体是否已退出。
- 正确做法：打包产物用固定路径 `target/release/bundle/macos/PostPane.app`（在 worktree 根目录下）；不先删，直接 `ditto <新版> /Applications/PostPane.app` 覆盖；判断本体是否退出用 `pgrep -f "Contents/MacOS/PostPane$"`。
- 证据：2026-11-04 本轮安装，补跑 `ditto` 后成功，应用 22:25:58 重新启动；旧版备份在 `evidence/2026-11-04-receipt-quota/PostPane-before.app`。
- 升级：未升级。

## L-04 云端 Linux 容器跑 check / test，失败的原因是环境不是代码（2026-11-05）

- 现象：云端会话里 `pnpm run check` 在最后的 `cargo check --workspace` 报 `failed to run custom build command for gdk-sys`（缺 `gdk-3.0`），装上后又缺 `gtk-layer-shell-0`；`pnpm test` 的 DeepSeek 插件测试 `ℹ pass 6` / `ℹ cancelled 8`，报 `Promise resolution is still pending but the event loop has already resolved`。
- 根因：容器默认没装 Tauri 在 Linux 上要的 GTK/WebKit 开发库；默认 Node 是 v22，项目要求 24+（docs/development.md「Run the workspace」），插件测试在 Node 22 下被取消。未改动的 main 上结果相同。
- 正确做法：云端 Linux 先 `apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-layer-shell-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libxdo-dev`；Node 不是 24 时在临时目录 `npm i node@24`，把它的 `node_modules/node/bin` 放到 PATH 最前再跑。
- 证据：PR #57 会话，装库后 `pnpm run check` 退出 0；Node 24.22.2 下插件测试 `ℹ pass 14` / `ℹ fail 0`，`pnpm test` 退出 0。
- 升级：未升级。
