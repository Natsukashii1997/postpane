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
- 状态：已采纳（本 PR，#416）
- 批准：常浩 2026-11-19 回「全部按推荐」，批了跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 17，主会话转达：采纳进 SKILL.md（〔文字〕）。落地：第 3 步第 2 条补「变基一次后不再追」。

## E-11 多个子 agent 并行修多张 issue：各用各的构建目录，合并前在主目录用 main 自己的构建目录跑全量（2026-11-08）

- 步骤：test
- 发生了什么：5 个子 agent 并行修 #220–#224，为省磁盘共用一个 `CARGO_TARGET_DIR`。cargo 按 dep-info 里记的别的 worktree 路径判断是否重编，#227 报的「Rust 761 passed」其实没含它新增的 4 条，测的是别人的代码（L-26）。靠在主目录用 main 自己的构建目录补跑全量才查实（765 = 761 + 4）。
- 建议：第 1 步加一句：并行 worktree 各用自己的构建目录；磁盘不够非共用不可时，每次测试前把本 worktree 的 `.rs`、`Cargo.toml` 修改时间改到未来，并核对 `Compiling` 行路径、新测试名、通过总数 = 基线 + 新增。第 2 步加一句：多个 PR 连着合并时，最后在主目录用 main 自己的构建目录跑一次三条全量，再打包装机。
- 证据：L-26；`evidence/2026-11-07-fix-220/main-f441f73-cargo-test.log`；`evidence/2026-11-08-ops-fixes/test-fb62a6a.log`（784 passed）。
- 状态：已采纳（本 PR，#237）
- 批准：常浩 2026-11-08 经驿窗侧栏回复「都采纳」（同时批了 L-25、L-26 提升为 G-22、G-23）。

## E-12 一次授权多张 issue 并行做：子 agent 不写 CURRENT / LESSONS、不装机，主会话审完逐张合并后统一收尾（2026-11-09）

- 步骤：handoff
- 发生了什么：常浩一句「都做，一口气全做了」批了 #257–#265。主会话分两批开 7 个子 agent，各开 worktree、各开一张 PR（#266–#273）。为免几张 PR 同时改 CURRENT.md 顶部和 LESSONS 编号而互相冲突，子 agent 只在 PR 正文和报告里交接、提新坑草稿，不装机不合并；主会话逐张审 diff 后 squash 合并，最后一张收尾 PR 统一写 CURRENT 一节和 L-31～L-34，再从 main 打包装机一次。#269（300 行棘轮）会挡住加长基线文件的 PR，所以放在最后合，合前按当时的 main 重新生成基线。
- 建议：第 4 步加一段「多张并行」：子 agent 的交接写进 PR 正文；CURRENT、LESSONS、装机由主会话在最后一张收尾 PR 里统一做；会改仓库检查规则的 PR（如棘轮）最后合。
- 证据：PR #266–#273、#269 合并记录；本条所在的收尾 PR。
- 状态：已采纳（本 PR，#416）
- 批准：常浩 2026-11-19 回「全部按推荐」，批了跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 17，主会话转达：采纳进 SKILL.md（〔文字〕）。落地：第 4 步加「多张并行」一条。

## E-13 第 1 步备环境：共用构建目录时先导出 CARGO_TARGET_DIR 再跑 package-resources（2026-11-09）

- 步骤：start
- 发生了什么：#260 的 worktree 先跑 `package-resources` 后导出变量，生成了 387 MB 的自己的 `target`（L-34）。
- 建议：第 1 步「新 worktree 先备环境」那句改成：要共用构建目录时，先 `export CARGO_TARGET_DIR=…`，再 `pnpm install`、`package-resources`；`pnpm install` 统一写 `--frozen-lockfile`（#261 报 skill 与批量规矩写法不一致）。
- 证据：L-34；#261 子 agent 报告。
- 状态：已采纳（本 PR，#415）
- 批准：常浩批了跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 5，主会话 2026-11-19 转达：与 L-34 合并，改做〔结构〕。落地：不是只改 SKILL.md 的一句话，而是新增 `scripts/setup-worktree.sh`，顺序写死（先定构建目录，再 `pnpm install --frozen-lockfile`、`package-resources`）；SKILL.md 第 1 步和 AGENTS.md「运行」改为调用它，`steps.json` 的 start 痕迹加 `setup-worktree.sh`。

## E-14 第 2 步测试：先写测试、跑出红，再写实现；性能测量不在隐藏面板里做（2026-11-09）

- 步骤：test
- 发生了什么：#257 把测试和实现一起写好才跑，第一次就全绿，只能临时去掉新行为补红，还因命令超时差点留下改过的文件（L-32）。#264 在隐藏的内置浏览器面板里测长任务，rAF 和 longtask 都不出数，改用无头 Chrome（L-29 补充）。
- 建议：第 2 步加两句：一、新测试先单独跑出红并存输出，再写实现；二、性能或动画时长的测量不在隐藏的内置浏览器面板里做，见 L-29 的补充。
- 证据：L-32；L-29 补充；`evidence/2026-11-09-264-deferred-measure/measure.md`。
- 状态：已采纳（本 PR，#416）
- 批准：常浩 2026-11-19 回「全部按推荐」，批了跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 17，主会话转达：采纳进 SKILL.md（〔文字〕）。落地：第 2 步加「先写测试、跑出红」「性能不在隐藏面板里量」两条。

## E-15 第 5 步合并清理：请常浩看实物前的 install.sh check 要在删 worktree 之前跑（2026-11-14）

- 步骤：merge-clean
- 发生了什么：#321 合并后先 `git worktree remove`，再在主目录跑 `install.sh check`，脚本默认拿当前目录的 `target/release/bundle/macos/PostPane.app` 比（主目录那份是 11-09 的旧产物 `3600980d505d`），报「不一致：已被别的会话覆盖」，其实已装的就是本轮的 `f67b71c33021`。
- 建议：第 5 步「合并后马上清」前加一句：删 worktree 之前先在这个 worktree 里跑一次 `install.sh check`；已经删了的，用 `install.sh check <证据目录>/…` 不行（证据里只有旧版备份），改为核对 `shasum /Applications/PostPane.app/Contents/MacOS/PostPane` 与装机时打印的「已装」值。
- 证据：本轮会话；`evidence/2026-11-14-321-running-grid/`；PR #322。
- 状态：已采纳（本 PR，#415）
- 批准：常浩批了积压清单组 4，主会话 2026-11-19 转达：与 E-20 合并，改做〔机检〕。落地：不改 SKILL.md 的先后顺序，改 `install.sh check`：不给产物路径时按 #405 的归属记录比，不再拿当前目录（常是主目录的旧产物）比；功能 worktree 只认自己装的，主目录还认已合进 main 的，测试 `tests/install-guard.test.mjs` 两条。

## E-16 第 2、3 步之间：预览脚手架先截完图挪走，再跑全量测试（2026-11-14）

- 步骤：test
- 发生了什么：#328 后台跑 `pnpm run check` 时在 worktree 里搭 `src/apps/desktop/preview-328/`，包边界检查报 4 处越界、`check exit 1`；挪走后重跑通过。两次 `pnpm test` 又同时写进同一个日志，只好再干净跑一次。
- 建议：第 2 步加一句「浏览器预览的脚手架放在 worktree 里会让 `check:package-boundary` 失败：先跑完三条全量再搭预览，或截完图 `preview_stop`、把脚手架挪到证据目录后再跑；重跑前确认上一次后台测试已结束，日志不共用」。
- 证据：L-43；`evidence/2026-11-14-328-newest-open/check-1-preview-in-tree.log`、`test-mixed-two-runs.log`；PR 见 #328。
- 状态：已否（被 E-18 取代：预览统一用常设场景预览台、不再在 src/ 下搭脚手架，就没有「截完图先挪走」这一步；积压清单组 12 关闭，常浩 2026-11-19 批）

## E-17 第 3 步装机：`install.sh` 的短名不带日期，带了就拒绝（2026-11-14）

- 步骤：install
- 发生了什么：#341 把证据目录全名 `2026-11-14-341-relay-toggle` 当短名传给 `install.sh`，脚本又在前面加了日期，备份落进 `2026-11-14-2026-11-14-341-relay-toggle/`，打印的回滚命令也指向那里；事后挪回本轮目录、改了 `install.log` 里的路径。
- 建议：`install.sh` 发现短名以 `YYYY-MM-DD-` 开头就报错退出、提示去掉日期；SKILL.md 第 3 步第 3 条写明「短名不带日期，如 `341-relay-toggle`」。
- 证据：#341 交接一节「与授权不一致之处」；`evidence/2026-11-14-341-relay-toggle/install.log`。
- 状态：已采纳（本 PR，#346）

## E-18 第 3 步实机验证前：界面预览统一用场景预览台，不再每轮另搭 `preview-xxx`（2026-11-14）

- 步骤：install
- 发生了什么：#321–#341 每轮都在 `src/apps/desktop/preview-<号>/` 抄一份脚手架、拿真实快照（含私人标题）渲染，用完挪进证据目录；这些脚手架会被包边界检查拦（L-43、E-16），`?still` 的抄法还会让小人退成静态图（L-45）。#349 把它做成常设的场景预览台 `src/packages/hud/preview/`，用合成的固定场景。
- 建议：第 3 步第 5 条改为「逻辑在场景预览台里用真实组件点：`pnpm --filter @agent-hud/hud run scenes`，127.0.0.1:1480，`?scene=&panel&light&still`；缺场景就在 `src/packages/hud/test/scenes/scenes.ts` 补一个，不另搭脚手架、不用真实快照」；E-16 随之可作废。
- 证据：#349 交接；L-43、L-45。
- 状态：已采纳（本 PR，#417）
- 批准：常浩 2026-11-19 回「全部按推荐」，批了跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 12，主会话转达：采纳，按〔结构〕只留一种做法。落地：SKILL.md 第 3 步第 5 条改指场景预览台；`docs/LESSONS.md` L-13、L-43 里「挪到证据目录再跑」「对自查页也 prettier」两种旧做法改掉；配 L-13、L-43 的机检：`pnpm run check` 第一步 `src/tooling/check-untracked.mjs` 拦 `src/` 下没提交的文件，报错里写正确做法。仓库里没有旧脚手架的代码可删（只在证据目录），E-16 已关（同批另一 PR）。

## E-19 第 1 步开工：要改的文件正被另一会话未合并的分支改着时，从那支的提交往下接，并在 PR 里写明连带关系（2026-11-14）

- 步骤：start
- 发生了什么：#368 要改单家面板，`claude/359-board-peek`（第 3 批之二，另一会话 18:37 提交、没开 PR）正好重写了同一批文件。从 `origin/main` 开工必然冲突，于是从它的 `0f40a3b` 开 worktree；PR #369 因此连带它一起合进 main，合并前单独问了常浩（回「合并并装机」）。SKILL.md 第 1 步只写了「从 `origin/main` 拉」，没写这种情况。
- 建议：第 1 步加一条：开工前 `git worktree list` + 各分支 `git log origin/main..<分支>`，看要改的文件有没有别的分支在改；有且还没合并，从那支提交往下接，PR 描述第一段写明连带，合并前问常浩合并顺序，不擅自替那个会话合；那支合并后，本 PR 自动只剩自己的改动。
- 证据：PR #369、合并提交 `2603d44`，本轮交接「与授权不一致之处」。
- 状态：已采纳（本 PR，#416）
- 批准：常浩 2026-11-19 回「全部按推荐」，批了跨项目复盘积压清单（`~/session-retro/2026-10-18_2026-11-18/积压清单-2026-11-18.md`）组 17，主会话转达：采纳进 SKILL.md（〔文字〕）。落地：第 1 步加「要改的文件正被别的分支改着」一条。

## E-20 第 5 步合并清理：`install.sh check` 要在删 worktree 之前跑，删了以后它拿主目录的旧产物比（2026-11-18）

- 步骤：merge-clean
- 发生了什么：#384 合并后先 `git worktree remove`，再跑 `install.sh check`，报「产物 3600980d505d / 已装 9fa6402761e2，不一致」。已装的就是本轮打的包；不一致是因为 check 默认取当前目录（主目录）下 11 月 9 日的旧产物去比，不是被别的会话覆盖。SKILL.md 第 3 步第 6 条说「请常浩看实物前再跑 check」，第 5 步又说「合并后马上清」，两步先后没写，照第 5 步做就会误报。
- 建议：第 5 步「合并后马上清」前加一句：先在本 worktree 跑一次 `install.sh check`（或删后带产物路径跑；产物已随 worktree 删掉时，只比对已装的 `shasum` 和交接里记的产物值）。
- 证据：PR #385、合并提交 `f553425`，本轮交接「发布与回读」。
- 状态：已采纳（本 PR，#415）
- 批准：同 E-15（积压清单组 4，与 E-15 合并改做〔机检〕）；落地见 E-15。

## E-21 「不做」里的「范围外不顺手修」改成和全局第 3 节一致（2026-11-18）

- 步骤：start
- 发生了什么：历史包袱清理（#387 起）里，`late-output.test.ts` 偶发超时、`core` 的 `the_next_pass_is_due_...` 时间敏感测试都是看到了、查清了原因，但因为 SKILL.md「不做」和 AGENTS.md「分工」写着「范围外的问题记进交接，不顺手修」，只记进交接没修；前者后来常浩另点名才修（#393）。全局 `~/.claude/CLAUDE.md` 第 3 节（2026-11-10 常浩定）已改为「代码库归你」，可以直接修看到的相关问题，守三条底线。两边对不上，常浩 2026-11-18 回「以全局为准」。
- 建议：SKILL.md「不做」第 3 条改为「不做没要求的新功能；看到的相关问题可以顺手修，守 AGENTS.md『分工』三条底线，交接和 PR 里单列『我顺手改的』」；AGENTS.md「分工」同步。
- 证据：issue #402；#391 交接里「项目 AGENTS.md 写范围外不顺手修，全局规则写可以顺手修」的冲突报告；#393、#397 交接。
- 状态：已采纳（本 PR，#402）

## E-22 第 3 步装机回读：install.sh 加了装机锁、归属检查和装后冒烟，SKILL.md 第 3 步要跟着改（2026-11-18）

- 步骤：install
- 发生了什么：#401 按常浩批准的月度复盘结论改了 `install.sh`：同时装机时后到的明确失败（exit 4）；装着的包既不是 main 构建的、也不是本 worktree 上次装的就拒装（exit 5），确认对方的包不再需要后加 `--takeover`；装前截侧栏，装后隔 2 秒截图查小人在动、和装前对比，没过 exit 6。SKILL.md 第 3 步第 3 条只写了旧的步骤顺序和 `--force`，第 6 条「请常浩看实物前再跑 check」和新的归属检查是两道防线，没写它们的关系。
- 建议：第 3 步第 3 条改成新顺序：拿锁（别的会话正在装就停）→ 查归属（拒装时照提示先确认对方的包不再需要，再加 `--takeover`；别为了绕开它自己加）→ 查正在转回的接力（L-44）→ 备份 → 截装前侧栏 → 退出 → `ditto` 覆盖 → 启动 → 回读 → 记归属 → 装后冒烟（证据目录里 `smoke-*.png`，冒烟没过先看图、确认改坏了就回滚）。第 4 条「装完截屏看权限弹窗」保留（冒烟只截侧栏窗口，看不到弹窗）。AGENTS.md「已定内容」那条手工的「隔 2 秒截两张、和改前对比」由冒烟自动做了，但规则文字不改，改不改由常浩定。
- 证据：PR（#401）、`tests/install-guard.test.mjs`、`tests/smoke-diff.test.mjs`。
- 状态：待批

## E-23 第 2 步测试：改「状态怎么分类」的代码，送审前先把每条返回路径列表对一遍（2026-11-20）

- 步骤：test
- 发生了什么：#468（插件报点没点过发送，驿窗据此分「没送成」和「送达未确认」）L2 审了 5 轮到顶。前三轮每轮各找出一条相邻的返回路径没处理对（两个超时竞争、重试准备阶段丢了第一次的回答、说不清被「没点」盖掉），都是只修了回信点到的那一处。第 4 轮送审前照父会话的建议把后台 `send` / `submit`、页面 `submit`、`content.js` 转发的 22 条返回路径逐条列表（谁回话、带什么、最晚什么时候），这一轮起不再有 P1，只剩截止边界的 P2。
- 建议：SKILL.md 第 2 步加一条：改的是「把一件事分成几类、不同类走不同处理」的代码（发送状态、超时归类、错误分级）时，写实现前先列出全部返回路径的表（每条：谁返回、带什么、什么时候），每行配一条测试，表写进 PR 和送审包；边界值（恰好等于截止时刻）单独一行。
- 证据：PR #468 的审查链 `r1a1f72f98fa04`（5 轮回信在 `<数据目录>/chatgpt/replies/h1a1f72f98fa04-*`、`h1a1f79336eb00-*`）；CURRENT.md「送达未确认 ①」一节的五轮回顾。
- 状态：待批

## E-24 第 3 步装机回读：加一条「不动实机先验」的做法，隔离起一份包要连主目录一起换（2026-11-20）

- 步骤：install
- 发生了什么：#486 的日志落盘只有真应用里才验得了（标准错误指向哪、panic 写没写出来），又不想先覆盖常浩正在用的那份。第 3 步只写了「打包 → install.sh 装机」，没有「先隔离验」这一步；照直觉只换 `AGENTHUD_DATA_DIR` 会让隔离实例把正在用的 Claude Code 插件改装到临时目录（L-64）。
- 建议：SKILL.md 第 3 步在「装」之前加一条可选步骤：行为只有真应用里才验得了、又不想先动实机时，用 `env -i HOME=<证据目录下的空文件夹> PATH=/usr/bin:/bin:/usr/sbin:/sbin <包里的主程序>` 另起一份；启动前后比 `~/.claude/plugins/installed_plugins.json` 的校验值；只按记下的进程号停。写明它只验得了不依赖真实数据和登记的行为。
- 证据：#486 这一轮；L-64；`~/Library/Application Support/postpane/evidence/2026-11-20-486-app-log/`。
- 状态：待批

## E-25 第 1 步开工：新 worktree 借主目录已编译好的依赖，用写时复制克隆 `target/debug`，不共用目录（2026-11-22）

- 步骤：start
- 发生了什么：#507 这一轮本机负载 200 以上，`setup-worktree.sh` 里生成打包资源那一步从头编译用了 47 分钟；接着跑 `cargo test` 还要再从头编译一遍调试版。改成先 `cp -Rc <主目录>/target/debug <worktree>/target/debug`（APFS 写时复制，12 GB 几分钟克隆完、不多占盘），第三方依赖直接复用，只重编工作区自己的几个 crate：接力测试 1 分多钟出结果，`pnpm run check` 里 cargo check 3 分 47 秒。克隆出来的是独立副本，不是 L-26、G-23 说的共用构建目录，不会跑到别的 worktree 的代码。
- 建议：SKILL.md 第 1 步在「新 worktree 先备环境」后加一句：主目录有现成的 `target/debug`、当时没有 cargo 在主目录里跑时，可以先克隆它再跑测试；克隆前看一眼 `pgrep -fl cargo`，正在编译的目录不克隆。可以顺便让 `setup-worktree.sh` 接受一个「从哪里克隆」的参数。
- 证据：#507 这一轮；`~/Library/Application Support/postpane/evidence/2026-11-22-507-tab-revive/green-host.log`（200 passed）。
- 状态：待批

