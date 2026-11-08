---
name: postpane-round
description: 「驿窗一轮」：驿窗 PostPane 每一轮改动从开工到收尾的做法——开 worktree、测试、装机回读、交接、合并清理、复盘进化，每一步写的都是本项目实际踩出来的规矩（L-xx / G-xx）。在驿窗仓库里开工一张 issue、要打包装机、写交接、合并收尾、清 worktree，或常浩说「按推荐开工」「合并装机」「复盘一下这阵子」「这个 skill 该改什么」时使用。项目起步、会话复盘、worktree 清理三个全局 skill 在对应步骤里调用，不在这里重写。
---

# 驿窗一轮

驿窗的每个 PR 都走同一条线：开工 → 测试 → 装机回读 → 交接 → 合并与清理 → 复盘与进化。这条线不是事先设计的，是 2026-11-04 起几十轮里一次次返工、被覆盖、被纠正后留下来的；每一步后面括号里的编号就是它的来由，细节去 `docs/LESSONS.md`（L-xx）或全局坑 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md`（G-xx）看。

这份 skill 自己也会长：每轮结束按第 6 步把「这次和 skill 对不上的地方」记进 `EVOLUTION.md`，常浩批了才改这里。

先读 `AGENTS.md` 和 `CURRENT.md`；这里不重复它们，只管一轮怎么走。

## 1. 开工（start）

- 先记开工时间：`date '+%F %H:%M'`。早于它的构建、截图、测试结果不算本轮的（`docs/OPERATIONS.md`「报告与验收」第 2 条）。
- 一张 issue 一个分支，从 `origin/main` 拉，开在独立 worktree：
  `git fetch -q origin && git worktree add .claude/worktrees/<号>-<短名> -b claude/<号>-<短名> origin/main`。
  并行会话不共用目录（G-04）。
- 同一会话接着做下一张、上一张已合并且原 worktree 干净（`git status --short` 为空）时，可以留在原 worktree 里从最新 main 切新分支，保留构建缓存，省掉一次从头编译：`git fetch -q origin && git switch -c claude/<号>-<短名> origin/main`。目录名对不上新号没关系，合并后照第 5 步清理。别的会话还在用的 worktree 不碰，并行会话仍各开各的（E-09）。
- 新 worktree 先备环境：`source ~/.cargo/env; export PATH=~/.bun/bin:$PATH; pnpm install; node src/tooling/package-resources.mjs`。不生成资源目录，`cargo test` 一项都跑不起来（L-01）。
- 并行 worktree 各用自己的构建目录。磁盘不够非共用 `CARGO_TARGET_DIR` 时，每次测试前把本 worktree 的 `.rs`、`Cargo.toml` 修改时间改到未来，并核对 `Compiling` 行是本 worktree 路径、新测试名出现、通过总数 = 基线 + 新增；否则跑的可能是别的 worktree 的代码（L-26、G-23、E-11）。
- 排障、改脚本、装 launchd 之前，先 `grep -n 关键词 docs/LESSONS.md`，再搜全局坑。
- 驿窗的协作骨架 2026-11-04 已由 `project-starter` 铺好，不再重铺；发现骨架（交接模板、格式测试、`scripts/check-rules.mjs`）本身该改，按 `project-starter` 的「骨架怎么进化」出提案。

## 2. 测试（test）

- 先格式化再测：`cargo fmt --all`，改过的前端文件 `pnpm exec prettier --write <文件>`。不先做，`pnpm run check` 常卡在格式检查（E-07）。
- 三条全跑：`pnpm run check`、`pnpm test`、`node --test tests/*.test.mjs`。改了任何脚本也跑全量，不只验一条路径（G-03）。
- 多个 PR 连着合并后，在主目录用 main 自己的构建目录再跑一次三条全量，过了再打包装机（E-11）。
- 报告时照抄原样结果（通过数、失败数那两行），不改写成「测试通过」（`docs/OPERATIONS.md`「报告与验收」第 3 条）。
- bun 编译出的程序在 macOS 上要 `codesign --force --sign -` 补签，否则一运行就被杀（L-02）。
- 云端 Linux 容器里失败，先看是不是缺 GTK / WebKit 库或 Node 不到 24，不是代码问题（L-08）。

## 3. 装机回读（install）

有界面或应用行为改动时做；纯文档、纯测试改动跳过，并在交接里写「无需发布」。

1. 打包：`pnpm --filter @agent-hud/desktop exec tauri build --bundles app`（不用 `--bundle`，生成 DMG 会自动启动应用）。
2. 打包前看一眼 main 有没有在你开工后合进别的界面改动、别的会话装过没有：有就先变基到最新 main 再打，否则你装上去的包不含它们（L-05）。
3. 装：`bash .agents/skills/postpane-round/scripts/install.sh <证据目录短名>`。脚本按顺序做：备份旧版到 `evidence/<今天>-<短名>/`（G-01）→ 退出旧应用，只认主程序本体 → `ditto` 覆盖、不先删（L-03）→ 启动 → 比对产物与已装的 `shasum`、读签名证书（L-06）→ 打印回滚命令。把它的输出原样写进交接的「发布与回读」。
4. 装完截屏看有没有「想访问文稿」的权限弹窗，有就请常浩点允许，不要误判成改坏了、也不要反复重装（L-06）。
5. 实机点击验证：每组真实点击前查锁屏和显示器没变（L-11）；侧栏悬停面板里的按钮电脑控制点不动，逻辑在浏览器预览里用真实组件点，实机那一下留给常浩（L-09）。往别人的页面注入脚本，浏览器里测过不算，要在驿窗的 WebKit 窗口里实测（L-10）。
6. 请常浩看实物前再跑一次 `bash .agents/skills/postpane-round/scripts/install.sh check`：不一致说明被并行会话覆盖了，先重装（L-05）。

### 实机出问题怎么查（E-08）

装完不对劲时，先查实再改代码；诊断循环照全局 `diagnosing-bugs` 走，这里只列驿窗现成的手段：

- 应用日志：`log show --last 5m --predicate 'process == "PostPane"' --style compact`。
- 卡住、不响应：`sample <pid> 1 -file <证据目录>/sample.txt`，看哪个线程停在哪；L-06 就是这样查到数据线程卡在文稿权限上的。
- 本机服务是否在听、端口对不对：`lsof -iTCP:<端口> -sTCP:LISTEN`，再用 `curl` 打 `127.0.0.1` 看返回。
- 注入到 WebKit 窗口里的脚本：让页面把状态写进 `document.title`，壳落盘后读（L-10 的标题通道）。
- 诊断输出一律放证据目录，不放 `/tmp`（G-01）。

## 4. 交接（handoff）

- 先写盘再报告：PR 描述按 `.github/pull_request_template.md` 写，`CURRENT.md` 顶部按 `docs/templates/handoff.md` 新增一节；对话里说了、文件里没有的按没做算（`docs/OPERATIONS.md`「报告与验收」第 1 条）。
- 本轮踩到的新坑先写进 `docs/LESSONS.md`（L-xx），交接里「本轮新坑」写编号；没有写「无」。`tests/handoff-format.test.mjs` 会查。
- 换个项目也成立的坑，在交接里写「可提议提升为全局坑」，出提案等常浩批，不直接改全局 LESSONS。
- 沿用别人的测试或截图要明说，没做的写「未做」。

## 5. 合并与清理（merge-clean）

- 常浩已授权：驿窗测试全过的 PR，写好交接后由 Claude 直接 squash 合并；测试有失败、范围有疑问、要他拍板（UI 三选一）或动手（隐私权限、真实审批）时停下来问。
- 合并顺序照全局工程流程第 5 节：推送前检查 `origin/main..main` → 变基、重跑测试 → `gh pr merge <号> --squash` → 主目录 `git pull --ff-only`。
- 几个界面 PR 前后脚合并后，从最新 main 重打、重装一次，让实机包含全部改动（L-05）。
- 合并后马上清：不再用的 worktree 直接 `git worktree remove`，还要接着用的跑 `cargo clean`，不把 6–9 GB 的 `target/` 留着（AGENTS.md「规则」）。
- 攒了一堆、拿不准哪些能删时，调用 `worktree-sweep`：它判断分支是否已合并（含 squash），没提交、没推送的一行不丢。漏网的由磁盘瘦身兜底。

## 6. 复盘与进化（retro）

每轮收尾都做前两条；第三条攒到十来轮或常浩说「复盘一下」时做。

1. 对照本轮：这次实际怎么走的，和上面五步哪里对不上——缺了一步、某步写错了、某步这次没必要、某个命令换了。有就在 `EVOLUTION.md` 末尾追加一条 E-xx（格式见该文件开头），状态写「待批」；没有就不记。**不直接改 SKILL.md。**
2. 交接里写一句「skill 进化：无 / E-xx 待批」。
3. 定期看数据：
   - `node .agents/skills/postpane-round/scripts/round-stats.mjs --since <日期>`：从本机 Claude 与 Codex 会话记录里数每一步实际做了几次，以及哪些高频命令不属于任何一步——前者用来删、合并步骤，后者是新步骤的候选。
   - 调用 `session-retro`，范围只取驿窗：找常浩反复纠正、连续失败、被拒绝的地方，出规则 / 坑 / 决定提案。
   - 两者的结论都落成 E-xx 待批。

常浩批了某条 E-xx：改 `SKILL.md`，涉及步骤痕迹的同步改 `steps.json`，把这条的状态改成「已采纳」并写上提交号，跑 `node --test tests/postpane-round.test.mjs`。否掉的改成「已否」并写一句理由，留着防止下次再提。

## 不做

- 不重写 `project-starter`、`worktree-sweep`、`session-retro` 的内容；它们改了，这里只改调用方式。
- 不替常浩点隐私权限弹窗、不替他做 UI 三选一。
- 授权范围外的问题记进交接，不顺手修。
