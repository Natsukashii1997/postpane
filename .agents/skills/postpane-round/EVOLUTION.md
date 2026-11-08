# 驿窗一轮：进化记录

这份 skill 怎么长出来、往哪长，都记在这里。每轮收尾对照 SKILL.md，有对不上的地方就在末尾追加一条；常浩批了才改 SKILL.md（见 SKILL.md 第 6 步）。

## 怎么写

```markdown
## E-xx <一句话：哪一步、改什么>（YYYY-MM-DD）

- 步骤：start / test / install / handoff / merge-clean / retro（steps.json 里的 id）
- 发生了什么：本轮或统计里看到的实际情况。
- 建议：SKILL.md / steps.json / 脚本具体怎么改。
- 证据：会话、PR、提交号、统计命令与结果、L-xx。
- 状态：待批 / 已采纳 `<提交号>` / 已否（一句理由）
```

编号只增不改；已否的不删，防止下次再提。`tests/postpane-round.test.mjs` 会查每条都有「步骤」「证据」「状态」三行、状态取值合法、步骤 id 存在。

E-01 至 E-05 是这份 skill 建立之前就已经长出来的规矩，补记来由；E-06 起是建立之后的。

## E-01 新 worktree 先生成打包资源目录再跑测试（2026-11-04）

- 步骤：start
- 发生了什么：刚 `pnpm install` 完的目录跑 `cargo test --workspace`，Tauri 构建脚本找不到 `resources/`，整套 Rust 测试一项没跑。
- 建议：开工备环境时加 `node src/tooling/package-resources.mjs`。
- 证据：L-01，提交 `a01724e`；已写进 AGENTS.md「运行」。
- 状态：已采纳 `a01724e`

## E-02 装机不先删旧版、产物用固定路径、只认主程序本体（2026-11-04）

- 步骤：install
- 发生了什么：从构建输出截路径带上了「(106.23 MiB)」，先删旧版后 `ditto` 失败，`/Applications` 里一度没有应用；`pgrep -f …/Contents/MacOS` 误把各会话的 mcp、engine 当成应用本体。
- 建议：产物取 `target/release/bundle/macos/PostPane.app`；直接 `ditto` 覆盖；退出判断用 `pgrep -f "Contents/MacOS/PostPane$"`。
- 证据：L-03，提交 `1093b08`。
- 状态：已采纳 `1093b08`

## E-03 装完比对 shasum，防并行会话覆盖（2026-11-05）

- 步骤：install
- 发生了什么：#62 与 #63 前后 34 秒各自装机，后装的覆盖先装的，常浩看到的实物不含 #62。
- 建议：装完和请常浩看之前都比 `/Applications` 主程序与自己产物的 `shasum`；几个界面 PR 合并后从最新 main 重打一次。
- 证据：L-05，提交 `ebbe0dc`。
- 状态：已采纳 `ebbe0dc`

## E-04 合并后马上清 worktree 的 target（2026-11-05）

- 步骤：merge-clean
- 发生了什么：每个 worktree 留着 6–9 GB 的 `target/`，几十个 PR 后磁盘吃紧。
- 建议：PR 合并后马上 `cargo clean` 或 `git worktree remove`；漏网的由磁盘瘦身兜底。
- 证据：提交 `ee6bcb4`（AGENTS.md「规则」）。
- 状态：已采纳 `ee6bcb4`

## E-05 打包用固定本机证书，文稿权限只点一次（2026-11-06）

- 步骤：install
- 发生了什么：临时签名每次都变，新装的包卡在文稿权限弹窗，侧栏不出现，被误判成改坏了。
- 建议：`tauri.macos.conf.json` 用 `PostPane Local Signing` 签名；装完读 `codesign -d -r-` 应是 `certificate leaf`。
- 证据：L-06，PR #134，提交 `9f9d7a5`。
- 状态：已采纳 `9f9d7a5`

## E-06 建立「驿窗一轮」：六步串起来，装机命令收成脚本（2026-11-06）

- 步骤：retro
- 发生了什么：统计 2026-11-04 至 11-06 的驿窗会话（Claude 56、Codex 2）：`project-starter` 点名调用 1 次，`worktree-sweep`、`session-retro` 0 次，但背后的动作每轮都在做——开工 48 个会话、测试 49、装机回读 46、交接 49、合并与清理 46；同一串「备份 → 退出 → ditto → 启动 → shasum → 签名」装机命令在 19 个会话里手敲。
- 建议：建本 skill；装机收成 `scripts/install.sh`；`steps.json` 的痕迹按真实命令校准（`pgrep`、`osascript … PostPane`、`open /Applications/PostPane.app`、`codesign -d`、`screencapture` 算装机回读；`git rebase` 算合并；`python3 -` 改 `CURRENT.md`、`git push` 算交接；`typecheck`、`tsc --noEmit`、`check-rules` 算测试）。
- 证据：issue #165；`node .agents/skills/postpane-round/scripts/round-stats.mjs`（2026-11-06 18:48）。
- 状态：已采纳（本 PR，#165）

## E-07 测试前先格式化，免得 check 卡在格式上（2026-11-06）

- 步骤：test
- 发生了什么：12 个会话的 `pnpm run check` 因 `Code style issues found` 失败；16 个会话事后补跑 `prettier --write`，17 个跑 `cargo fmt --all`。统计里这两条是「不属于任何一步」的头两名。
- 建议：SKILL.md 第 2 步第一条前加「先 `cargo fmt --all` 与 `pnpm exec prettier --write <改过的前端文件>`，再跑三条」；`steps.json` 的 test 痕迹加 `cargo fmt`、`prettier --write`。
- 证据：`round-stats.mjs`（2026-11-06 18:48）不属于任何一步：`cargo fmt` 17、`npx` 15；会话记录里 `Code style issues found` 12 个会话。
- 状态：已采纳（本 PR，#167）

## E-08 加一步「排障」，把实机诊断手段收拢（2026-11-06）

- 步骤：install
- 发生了什么：装机后出问题时，各会话各自摸索诊断：`log show --predicate 'process == "PostPane"'` 8 个会话、`sample <pid>` 7、`lsof -iTCP` 10、`curl` 本机端口 8；L-06、L-10 都是靠 `sample` 和标题通道查实的。
- 建议：第 3 步后加「实机出问题怎么查」一小节：先 `log show`、再 `sample` 卡住的线程、注入脚本用标题通道；调用全局 `diagnosing-bugs` 的诊断循环，不另写一套。
- 证据：`round-stats.mjs`（2026-11-06 18:48）不属于任何一步：`lsof` 10、`log` 8、`curl` 8、`sample` 7；L-06、L-10。
- 状态：已采纳（本 PR，#167）
- 批准：常浩 2026-11-06 回复「两条都批」（E-07、E-08 同批）。落地时 E-08 没另开一步，放进第 3 步末尾的小节，相应命令计入 install 痕迹，步骤数不变。

## E-09 接着做的下一张 issue，可在刚合并的 worktree 上从 main 切新分支，保留构建缓存（2026-11-07）

- 步骤：start
- 发生了什么：#164 刚合并，`120-relay-card` 里有 10 GB 构建缓存，紧接着做 #72。按第 1 步新开 worktree 要从头编一遍，于是在原 worktree 里 `git switch -c claude/72-auto-relay main`。打包约 4 分钟，全量测试一次就过。
- 建议：第 1 步加一句：同一会话接着做下一张、上一张已合并且 worktree 干净时，可以在原 worktree 里从最新 main 切新分支，代替新开；合并后照第 5 步清理。并行会话仍然各开各的（G-04）。
- 证据：PR #164（`f6cd22b`）合并后在同一 worktree 起 PR #168（`b15f3c3`）；CURRENT.md「接力自动往返上线」一节；日志 `evidence/2026-11-06-auto-relay/build.log`。
- 状态：已采纳（本 PR，#178）
- 批准：常浩 2026-11-07 经驿窗侧栏回复「批 E-09」。落地时把原提案的 `main` 写成 `origin/main`（工程流程第 1 节：不从本地 main 拉），并加上「原 worktree 干净」的判据 `git status --short` 为空；`steps.json` 的 start 痕迹加 `git switch -c claude/`。

## E-10 并行合并频繁时，装机不追变基：先装本分支做实机，合并后从最新 main 重打重装（2026-11-08）

- 步骤：install
- 发生了什么：#217 打包时（每次检查加打包约 20 分钟），main 先后合进 #225、#226、#227、#228、#229。照第 3 步第 2 条「先变基到最新 main 再打」，变基、重跑全量、重打了三轮，每轮打完 main 又多了新提交，追不上。最后先装本分支的包做完实机往返，合并后再从最新 main 重打重装。
- 建议：第 3 步第 2 条补一句：变基一次后 main 又有新的界面提交时，不再追；先装本分支的包把实机做完，在交接里写明「装的包不含 #xx」，合并后按第 5 步「从最新 main 重打、重装一次」补齐。实机前查一眼并行会话是不是正在对它们自己的 PR 做实机，正在做就先错开。
- 证据：#217 证据目录 `evidence/2026-11-07-217-review-budget/`（三次 check/test/build 日志）；L-05。
- 状态：待批

## E-11 多个子 agent 并行修多张 issue：各用各的构建目录，合并前在主目录用 main 自己的构建目录跑全量（2026-11-08）

- 步骤：test
- 发生了什么：5 个子 agent 并行修 #220–#224，为省磁盘共用一个 `CARGO_TARGET_DIR`。cargo 按 dep-info 里记的别的 worktree 路径判断是否重编，#227 报的「Rust 761 passed」其实没含它新增的 4 条，测的是别人的代码（L-26）。靠在主目录用 main 自己的构建目录补跑全量才查实（765 = 761 + 4）。
- 建议：第 1 步加一句：并行 worktree 各用自己的构建目录；磁盘不够非共用不可时，每次测试前把本 worktree 的 `.rs`、`Cargo.toml` 修改时间改到未来，并核对 `Compiling` 行路径、新测试名、通过总数 = 基线 + 新增。第 2 步加一句：多个 PR 连着合并时，最后在主目录用 main 自己的构建目录跑一次三条全量，再打包装机。
- 证据：L-26；`evidence/2026-11-07-fix-220/main-f441f73-cargo-test.log`；`evidence/2026-11-08-ops-fixes/test-fb62a6a.log`（784 passed）。
- 状态：已采纳（本 PR，#237）
- 批准：常浩 2026-11-08 经驿窗侧栏回复「都采纳」（同时批了 L-25、L-26 提升为 G-22、G-23）。
