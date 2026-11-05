# 驿窗 Linux 体检报告（2026-11-05）

只读体检：在云端 Linux 容器里按文档实际跑一遍安装、检查、测试和打包，不改任何代码。本文件是这次唯一的改动。

## 结论

- **构建、检查、测试在 Linux 上都能跑通。** 装好系统库、换 Node 24、先生成资源目录之后，7 条命令全部退出 0；打出的 `PostPane` 在虚拟屏上能启动、建好数据目录、连续运行 20 秒不崩。
- **没有发现「文档写了支持却坏了」的问题。** 所有失败都来自环境准备（系统库、Node 版本、资源目录）或一条与平台无关的偶发测试。
- **主要差距不在构建，而在功能。** Linux 宿主代码里有 12 处明写「未实现」的占位（凭据库、应用激活、显示器变化监听、全局快捷键、X11 拖动等），文档本就写明 Linux「未经验证」。能编译不等于能用。
- **共用代码里找到 1 处 macOS 专属路径**，`check:platform` 查不到这类写法，Linux 上目前没有功能影响。

## 环境与做法

| 项 | 值 |
|---|---|
| 代码 | `main` 的 `4379a05`（交接：侧栏新回复通知卡改成清单回执） |
| 系统 | Ubuntu 24.04.5 LTS，x86_64，4 核，15 GB 内存，无图形界面、无 D-Bus 会话 |
| Rust | rustc 1.97.0、cargo 1.97.0（容器自带） |
| Node | 容器自带 v22.23.4；后来另装 v24.22.2（官方 tarball，SHA256 校验通过）放在 `/opt/node24` |
| pnpm / bun | 11.22.0 / 1.4.4（容器自带） |
| 时间 | 北京时间 2026-11-05 12:28 至 12:48 |

先用容器原样环境跑一轮，记下第一次失败的原样报错，再按文档补依赖重跑。日志在云端容器的临时目录里，容器回收后不保留，关键报错已原样摘进本文。

### 装了什么

| 时机 | 装的东西 | 为什么 |
|---|---|---|
| 第一次 `pnpm run check` 失败后 | `apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libgtk-layer-shell-dev` | Tauri 2 官方 Linux 依赖，加上文档点名的 gtk-layer-shell；装后版本：webkit2gtk-4.1 2.52.6、gtk+-3.0 3.24.41、gtk-layer-shell 0.8.2、ayatana-appindicator 0.5.90、librsvg 2.58.0 |
| 插件测试在 Node 22 下失败后 | Node v24.22.2 | 文档要求 Node 24+ |
| 启动冒烟前（任务外的补充） | `xvfb xauth` | 无图形界面的容器需要虚拟屏才能启动应用 |

## Linux 应该支持到什么程度（文档原意）

- `docs/development.md`：`build:linux` 只在 Linux 主机上构建；「Windows/Linux execution and provider acquisition are not yet qualified」，Linux 的数据源路径「已实现但仍需在该系统上验证」。
- `docs/platform-builds.md`：Linux 需要发行版的 C/C++ 工具链、Tauri 2 桌面依赖（WebKitGTK 4.1/GTK、托盘、SVG、打包库）和 gtk-layer-shell，应用直接链接 gtk-layer-shell，没有它就启动不了；只在 niri（Wayland）上手测过；GNOME 的 Wayland 下边缘 HUD 被拒绝；X11 下不支持原生拖动；没有固定安装路径前不装客户端钩子。这段文字来自上游 Agent HUD，驿窗自己从没在 Linux 上验证过。
- `docs/platform-architecture.md`：共用代码不写系统判断；某个系统暂时做不到的能力，也要在该系统的宿主文件里给一个注明缺什么的占位，这些占位就是该系统的待办清单。

所以对 Linux 的合理预期是：**能编译、能过测试；运行层面没承诺。** 本次按这个标准判定。

## 逐条命令结果

| # | 命令 | 环境 | 退出码 | 结果 |
|---|---|---|---|---|
| 1 | `pnpm install` | 原样 | 0 | 426 个包，8.4 秒 |
| 2 | `pnpm run check` | 原样（无系统库） | 101 | 格式、类型、前端构建、各项边界检查都过，最后一步 `cargo check` 因缺 `gdk-3.0` 失败 → 问题 3 |
| 2' | `pnpm run check` | 装好系统库 | 101 | 报资源目录不存在 → 问题 4 |
| 2'' | `node src/tooling/package-resources.mjs` 后再跑 `pnpm run check` | Node 22 | **0** | 全过，无警告；Node 24 下复跑也是 0 |
| 3 | `pnpm run check:platform` | — | **0** | `Platform boundary: shared code selects adapters only through mod/use selectors.` |
| 4 | `pnpm run check:packages` | — | **0** | `Package boundary: 8 packages import each other only by name.` |
| 5 | `pnpm test`（第 1 次） | Node 22 | 101 | Rust 核心库 1 条偶发失败 → 问题 2；后面的前端测试没跑到 |
| 5' | `pnpm test`（第 2 次） | Node 22 | 1 | Rust 633 过；前端 166/166、MCP 6/6 过；插件 14 条里 8 条被取消 → 问题 1 |
| 5'' | `pnpm test`（第 3 次） | Node 24 | **0** | Rust 633 passed / 0 failed；`ℹ pass 166` / `ℹ fail 0`、`ℹ pass 6` / `ℹ fail 0`、`ℹ pass 14` / `ℹ fail 0` |
| 6 | `cargo test --workspace` | — | **0** | 633 passed / 0 failed（Mac 上最近一次是 642，差 9 条，推测是只在 macOS 编译的测试，未逐条核对） |
| 7 | `pnpm run build:linux` | Node 24 | **0** | release 编译 5 分 16 秒，产出 `target/release/PostPane`（39 MB），`ldd` 显示已链接 `libgtk-layer-shell.so.0`、`libwebkit2gtk-4.1.so.0`、`libgtk-3.so.0` |
| 补 | `node --test tests/*.test.mjs`、`node scripts/check-rules.mjs` | Node 24 | 0、0 | `ℹ pass 4` / `ℹ fail 0`；`通用规则检查通过` |
| 补 | 启动冒烟：`xvfb-run -a target/release/PostPane`，20 秒后强制结束 | X11 虚拟屏、无窗口管理器、无 D-Bus | 124（被超时结束，不是崩溃） | 见下文「启动冒烟」 |

`build:linux` 不受资源目录问题影响：`tauri.conf.json` 的 `beforeBuildCommand` 会先跑 `package-resources.mjs`。

## 问题清单（按严重程度排列）

严重程度：**高**＝阻断构建或测试且没有绕过办法；**中**＝阻断或误导，但有绕过办法；**低**＝不阻断；**信息**＝不是缺陷，是已知范围。

### 问题 1：Node 版本只写在文档里，Node 22 下插件测试 8 条被取消，汇总却显示 `fail 0`

- **归类**：缺系统依赖或文档没写清。
- **严重程度**：中。`pnpm test` 退出码非 0，但报错完全不提 Node 版本，容易误判为代码坏了；汇总里 `# fail 0` 还会骗过只看「fail 0」那一行的人。
- **位置**：`src/crates/platform/src/deepseek_plugin/agent-hud.test.mjs` 第 7 至 14 条测试（第 217 行起）。版本要求只写在 `docs/development.md:45` 和 `docs/platform-builds.md:5`（「Node.js 24+」）；根目录 `package.json` 没有 `engines`，也没有 `.nvmrc` / `.node-version`，`pnpm install` 不会提醒。
- **原样报错**（Node v22.23.4）：

  ```text
  not ok 7 - the HUD's answer wins a question and takes the client's card away
    ---
    duration_ms: 3.883855
    type: 'test'
    location: '/home/user/postpane/src/crates/platform/src/deepseek_plugin/agent-hud.test.mjs:217:1'
    failureType: 'cancelledByParent'
    error: 'Promise resolution is still pending but the event loop has already resolved'
    code: 'ERR_TEST_FAILURE'
  ...
  # tests 14
  # pass 6
  # fail 0
  # cancelled 8
  [ELIFECYCLE] Command failed with exit code 1.
  ```

- **验证**：同一份代码换 Node v24.22.2 直接跑这个文件，`ℹ pass 14` / `ℹ fail 0`，退出 0。
- **建议修法**：根目录 `package.json` 加 `"engines": { "node": ">=24" }`，再加 `.npmrc` 写 `engine-strict=true`，让 `pnpm install` 在版本不对时直接报错；`AGENTS.md`「运行」一节补一句 Node 版本要求。交接里的测试行同时记 `ℹ cancelled`，或者以退出码为准。

### 问题 2：Rust 核心库一条测试依赖真实时钟，偶发失败

- **归类**：不属于四类，与平台无关的不稳定测试（Mac 上同样可能出现）。
- **严重程度**：低。重跑能过，但会让 `pnpm test` 偶尔变红，交接里「测试：」一行就可能不真。
- **位置**：`src/crates/core/src/demo/mod.rs:1193` `a_pass_with_nothing_new_renders_nothing_until_something_changes`，失败在第 1216 行（换新额度读数后的第二次「无变化」断言）。这个测试从头到尾用 `Utc::now()`；紧挨着的上一条测试（第 1150 行）用 `crate::snapshot::PINNED_CLOCK` 固定了时钟，这一条没有。
- **原样报错**（第 1 次 `pnpm test`，全量并行跑时）：

  ```text
  thread 'demo::tests::a_pass_with_nothing_new_renders_nothing_until_something_changes' (24140) panicked at src/crates/core/src/demo/mod.rs:1216:9:
  assertion `left == right` failed
    left: Object {"accounts": Array [Object {"checkedAt": String("2026-11-05T04:36:56.316+00:00"), ...（整份快照，略）
   right: Object {"unchanged": Bool(true)}
  test result: FAILED. 159 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 3.69s
  ```

- **复现情况**：这条测试一共跑了 12 次，只失败这 1 次（单独跑 5 次、核心库整体跑 4 次、全量跑 2 次都过）。
- **推测原因（待验证）**：机器忙时两次「采集」之间跨过了某个按真实时间算的到期点，快照重新渲染。
- **建议修法**：照上一条测试的做法，用 `PINNED_CLOCK` 固定时钟，换读数时再手动推进；不要靠重跑碰运气。

### 问题 3：Linux 系统依赖只有一段描述，没有能直接复制的安装命令

- **归类**：缺系统依赖或文档没写清。
- **严重程度**：中。全新 Linux 机器上 `pnpm run check` 必失败，要自己去 Tauri 官网拼包名。
- **位置**：`docs/platform-builds.md:151`（表格里的 Linux 一行），`docs/development.md`「Run the workspace」没提系统库。
- **原样报错**（`pnpm run check` 的最后一步 `cargo check --workspace`）：

  ```text
  error: failed to run custom build command for `gdk-sys v0.18.2`
  ...
    The system library `gdk-3.0` required by crate `gdk-sys` was not found.
    The file `gdk-3.0.pc` needs to be installed and the PKG_CONFIG_PATH environment variable must contain its parent directory.
  [ELIFECYCLE] Command failed with exit code 101.
  ```

- **建议修法**：在 `docs/platform-builds.md` 的 Linux 行下面补一行 Ubuntu/Debian 的安装命令（见文末「要在 Linux 上开发需要先装什么」，本次实测这组包够用）。

### 问题 4：新目录跑 `pnpm run check` 也会因为缺资源目录失败，坑 L-01 只写了 `cargo test`

- **归类**：缺系统依赖或文档没写清。
- **严重程度**：低。已有 L-01 和 `AGENTS.md`「运行」里的注释，照做就能绕过；但注释只说「跑 cargo test 前」，`pnpm run check` 里的 `cargo check` 同样会挂，`docs/development.md` 完全没写。和 Linux 无关，Mac 新开 worktree 一样会碰到。
- **位置**：`AGENTS.md:32`、`docs/LESSONS.md` L-01、`docs/development.md`「Run the workspace」；根因在 `src/apps/desktop/src-tauri/tauri.conf.json:39` 的 `resources`。
- **原样报错**（系统库装好之后的 `pnpm run check`）：

  ```text
  error: failed to run custom build command for `agent-hud v0.1.0 (/home/user/postpane/src/apps/desktop/src-tauri)`
  ...
    resource path `resources` doesn't exist
  [ELIFECYCLE] Command failed with exit code 101.
  ```

- **建议修法**：把 `AGENTS.md:32` 的注释改成「新目录跑 `pnpm run check`、`pnpm test`、`cargo check/test` 前必须先跑」，L-01 补上 `pnpm run check`，`docs/development.md` 的启动步骤加这一行。生成资源要编一次 release 引擎（本机 1 分 50 秒），不建议塞进每次 `check`。

### 问题 5：共用的 agents 层写死了 macOS 的 Claude 桌面版目录

- **归类**：共用代码里混了 macOS 专属判断（没有条件判断，但这个路径只在 Mac 上成立）。
- **严重程度**：低。Linux 和 Windows 上只是多探一个不存在的目录，没有功能损害；平台层已按系统给出正确目录（Linux 是 `~/.config/Claude`，见 `src/crates/platform/src/os/linux/mod.rs:47`）。问题在于违反分层约定，而 `check:platform` 只查 `#[cfg]` 和 `cfg!()`，查不到这种字面量。
- **位置**：`src/crates/agents/src/claude/transcript.rs:1223`

  ```rust
  .map(|home| home.join("Library/Application Support/Claude"))
  ```

  `platform-architecture.md` 规定 agents 层「OS-dependent facts as data」，不放系统条件；`src/crates/core/src/lib.rs:293` 的注释也写着平台给的是「beyond the macOS default」，等于默认值留在了共用层。macOS 适配器 `src/crates/platform/src/os/macos/mod.rs:51` 已经给出同一个目录。
- **原样报错**：无（不报错，靠代码审查发现）。
- **建议修法**：把这段默认值删掉，完全由 `os::claude_desktop_bases` 提供。共用层现在还会从 `CLAUDE_CONFIG_DIR` 推出额外的 home 再拼 Mac 路径，删之前先把「按多个 home 求目录」挪进平台层，否则 Mac 上自定义配置目录的场景会少读。另外可以给 `check:platform` 加一条：共用目录里出现 `Library/Application Support`、`/Applications`、`.app/Contents` 时报警（测试文件除外）。

### 问题 6：单实例接管用的套接字路径过长时静默失效

- **归类**：不属于四类，与平台无关（macOS 的长度上限更短，104 字节）。
- **严重程度**：低。只在数据目录路径很长时出现，本次是我把 HOME 指到很深的临时目录才触发的，正常的 `~/.local/share/app.postpane.linux` 不会碰到；触发后只打印一行，第二次启动不会把已运行的窗口唤到前台。
- **位置**：`src/crates/platform/src/instance/mod.rs:129`（打印这行提示），套接字由 `instance/unix.rs` 建在 `instance.lock` 旁边。
- **原样报错**：

  ```text
  No hand-over endpoint beside /tmp/claude-0/-home-user-postpane/ae90098e-a8fd-52cc-b2f2-c04a34046974/scratchpad/smokehome/.local/share/app.postpane.linux/instance.lock: path must be shorter than SUN_LEN
  ```

- **建议修法**：不急。真要修，可以在路径超长时改用 `$XDG_RUNTIME_DIR` 下按数据目录哈希命名的短路径。

### 问题 7：Linux 宿主里明写「未实现」的能力（文档本就写明不支持）

- **归类**：文档本就写明不支持。
- **严重程度**：信息。不是缺陷，是 Linux 版要「能用」还差的东西。
- **位置与现状**（全部是按约定写好的占位，注释说明了缺什么）：

  | 能力 | 位置 | Linux 上的现状 |
  |---|---|---|
  | 系统凭据库（Secret Service） | `platform/src/os/linux/secrets.rs` | 不读；gh 等客户端退回明文配置；Claude 桌面版的登录 cookie、Electron safe storage 都读不了 |
  | 判断应用在跑、把应用唤到前台 | `platform/src/os/linux/apps.rs` | 一律当作「在跑」，唤起总是失败 |
  | 按 URL 协议找应用 | `platform/src/os/linux/mod.rs:62` | 总是 false |
  | 在应用里打开文件夹 | `platform/src/os/linux/mod.rs:147` | 不做，退回客户端链接 |
  | 读其他进程的环境变量（找 Codex 终端会话） | `platform/src/os/linux/process.rs:54` | 不做，daemon 托管的 Codex TUI 没有可跳回的终端 |
  | 显示器变化监听 | `host/src/screens/linux.rs` | 不监听，每 3 秒轮询一次 |
  | 全局快捷键、Dock 重开 | `host/src/shell/linux.rs` | 没有，只能从托盘菜单开设置 |
  | 启动前的错误弹窗 | `host/src/shell/linux.rs` | 只打印到标准错误 |
  | 首次运行自动登记开机启动 | `host/src/system/linux.rs:86` | 不登记，留给用户 |
  | X11 原生拖动 | `host/src/hud/linux.rs:358` | 不支持 |
  | 无 layer-shell 的 Wayland（GNOME） | `host/src/hud/linux.rs:64`、`:172` | 拒绝显示边缘 HUD |
  | 客户端钩子 | `docs/platform-builds.md:151` | 没有固定安装路径前不安装 |

- **建议修法**：如果哪天真要在 Linux 上用，先决定目标桌面环境（GNOME 还是 wlr 系的 Wayland 合成器），再按「凭据库 → 应用激活 → 显示器监听」的顺序补；GNOME 下边缘 HUD 被拒绝这一点决定了能不能用，应最先确认。

## 已查过、没发现问题的部分

- **`check:platform`、`check:packages` 都通过。** 另外人工搜了共用 Rust 代码和前端里的 `/Applications`、`Library/Application Support`、`osascript`、`.app/Contents`、`process.platform`、`=== "macos"` 等写法：除问题 5 外，命中的都在测试数据里（例如 `src/crates/platform/src/hud_tools/tests.rs:5`），或者是前端按系统换文案、换滚动条样式（如 `src/packages/app/src/sessions/SessionDetailView.tsx:1356` 只在 macOS 显示「在访达中显示日志」，Linux 走通用的「显示日志」），不属于约定禁止的「按系统重新解释数据」。
- **启动冒烟**：在 X11 虚拟屏、没有窗口管理器、没有 D-Bus 的容器里，`PostPane` 启动后建好了 `~/.local/share/app.postpane.linux/`（含 `ingestion.sqlite`、`instance.lock`、`hooks/inbox`、`account-engines/claude`），20 秒内没有崩溃。标准错误里只有容器环境造成的警告：

  ```text
  libEGL warning: DRI3 error: Could not get DRI3 device
  (PostPane:9298): libayatana-appindicator-WARNING **: 04:47:04.426: Unable to get the session bus: Failed to execute child process ?dbus-launch? (No such file or directory)
  ```

  **没看界面**：没截图，没验证 HUD 位置、托盘菜单、设置窗口能不能打开。这一步只证明「能起来、不立刻崩」。

## 汇总表

| # | 问题 | 归类 | 严重程度 | 影响 Linux 独有？ | 建议 |
|---|---|---|---|---|---|
| 1 | Node 22 下插件测试 8 条被取消，汇总显示 `fail 0` | 缺依赖 / 文档没写清 | 中 | 否 | `engines` + `engine-strict`，AGENTS 补版本 |
| 2 | 核心库一条测试用真实时钟，偶发失败（1/12） | 平台无关的不稳定测试 | 低 | 否 | 用 `PINNED_CLOCK` 固定时钟 |
| 3 | Linux 系统库没有可复制的安装命令 | 缺依赖 / 文档没写清 | 中 | 是 | `platform-builds.md` 补一行 apt 命令 |
| 4 | 新目录 `pnpm run check` 缺资源目录失败，L-01 只写了 `cargo test` | 文档没写清 | 低 | 否 | 改 AGENTS 注释、L-01、development.md |
| 5 | agents 层写死 Mac 的 Claude 桌面目录 | 共用代码混了 macOS 专属判断 | 低 | 否（Windows 同样多探一次） | 默认值挪进平台层；`check:platform` 加字面量检查 |
| 6 | 数据目录路径过长时单实例接管静默失效 | 平台无关 | 低 | 否 | 暂不修 |
| 7 | 12 处 Linux 能力占位未实现 | 文档本就写明不支持 | 信息 | 是 | 真要用 Linux 时先定目标桌面环境 |
| — | 文档写了支持却坏了 | — | — | — | **本次没有发现** |

## 要在 Linux 上开发需要先装什么

以下在 Ubuntu 24.04 上实测够用；其他发行版包名不同，对照 [Tauri 官方说明](https://v2.tauri.app/start/prerequisites/)。

1. 系统库（Tauri 2 的 Linux 依赖，加上驿窗直接链接的 gtk-layer-shell）：

   ```bash
   sudo apt-get update
   ```

   ```bash
   sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libgtk-layer-shell-dev
   ```

2. Node.js 24 或更高（Node 22 会让插件测试失败，见问题 1）。
3. pnpm 11（`package.json` 里锁的是 `pnpm@11.22.0`）、Bun（打包 MCP 中转程序用）、稳定版 Rust 工具链。
4. 第一次在新目录里，先生成资源目录，再跑检查和测试：

   ```bash
   pnpm install
   ```

   ```bash
   node src/tooling/package-resources.mjs
   ```

   ```bash
   pnpm run check && pnpm test
   ```

5. 打包：`pnpm run build:linux`（会自己生成资源目录）。
6. 想在无图形界面的机器上试启动：另装 `xvfb`，用 `xvfb-run -a target/release/PostPane`；要让托盘正常还需要 D-Bus 会话（`dbus-x11` 或 `dbus-run-session`），本次没装。

## 本次没做

- 没跑 `pnpm run build:linux -- --bundle`（生成 deb/AppImage 安装包），任务没要求。
- 没跑 `pnpm run lint`（clippy），任务没要求。
- 没在 Wayland 合成器、GNOME、真实显示器上看界面；没接入真实的 Claude Code / Codex 日志和账号。
- 没有改 `CURRENT.md`：任务限定只新增本文件。
- 日志和证据没有按 AGENTS.md 放到 `~/Library/Application Support/postpane/evidence/`（云端 Linux 没有这个目录），容器回收后不保留，关键报错已摘进本文。

## 范围外观察（没有处理）

- `pnpm run check:clients` 输出 `Client ids named outside src/crates/agents: 811 (baseline 772)`，超过基线 39 处但不报错（只有 `--strict` 才会失败）。和 Linux 无关。
- `docs/platform-architecture.md:77` 指向 `crates/share/src/share/os/mod.rs`，仓库里没有 `src/crates/share`，是上游文档残留。
- `docs/platform-builds.md`「Windows builds on GitHub」一节说 Windows 编译和测试在 GitHub Actions 上跑，但 `AGENTS.md` 写明 Actions 已停用，这段描述已经不成立。
