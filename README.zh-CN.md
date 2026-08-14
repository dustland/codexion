<p align="center">
  <img src="assets/codexion-mark.svg" width="88" height="88" alt="Codexion logo">
</p>

<h1 align="center">Codexion</h1>

[English](README.md) | **简体中文**

[![CI](https://github.com/lyuai/codexion/actions/workflows/ci.yml/badge.svg)](https://github.com/lyuai/codexion/actions/workflows/ci.yml)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple)](https://github.com/lyuai/codexion)

Codexion 是一个轻量的 Codex Desktop 本地 Companion。它负责安全地启动或接管
Codex Desktop，并通过本机 Chrome DevTools Protocol（CDP）添加小型、克制的界面增强。

Codexion 目前包含两个功能。**Sanity Meter** 直接增强 Codex 侧边栏底部现有的账户按钮，在右侧
显示周额度剩余百分比，并以整个按钮为 100% 进度轨道。例如 `82%` 表示本周额度还剩
82%。Codex 原有的账户菜单行为保持不变。

**GitHub Issue Inbox** 在右上角原生操作按钮旁增加一个紧凑入口。它通过本机已经登录的
GitHub CLI 轮询用户选择的仓库，排除本人创建或已经回复过的 issue，并提供“处理”和“忽略”。
处理时会在对应的本地 workspace 中创建唯一的 Codex task；本地 issue-thread 映射可避免
刷新或重启后重复创建。

Inbox 顶部的 **Current repo** 开关会直接查询当前 Codex task 对应的 GitHub 仓库，即使
该仓库没有在 Settings 中选中也可以使用。如果当前 task 没有 GitHub 远端，Codexion 会
显示明确的空状态，并且不会修改已经保存的仓库选择。

> Codexion 不是 Codex Plugin。CDP 必须在 Codex Desktop 进程启动时开启，而 Plugin
> 的会话钩子运行得太晚，无法可靠地为当前进程补上启动参数。因此 Codexion 采用独立
> Companion/Launcher 架构。

## 当前状态

- 平台：macOS
- 运行时：Node.js 22 或更高版本
- Codex Desktop 默认位置：`/Applications/ChatGPT.app`
- CDP 默认地址：`127.0.0.1:9341`
- 数据源：用量来自 Codex app-server，Issue 来自本机 `gh` CLI
- 更新频率：用量每 60 秒，Issue 每 3 分钟

Codexion 不修改 `app.asar`、应用二进制文件或签名资源，不创建第二份浏览器配置，
也不要求用户重新登录。

Issue Inbox 是可选功能，需要安装 [GitHub CLI](https://cli.github.com/) 并完成
`gh auth login`。Codexion 不保存 GitHub token。

## 快速开始

### macOS App

带版本 tag 的 Release 会提供经过签名和公证的 Apple Silicon `Codexion.app` DMG。请从
[GitHub Releases](https://github.com/lyuai/codexion/releases) 下载 DMG，将 Codexion 拖入
Applications 后打开。它是后台启动器与 companion，不会增加第二套设置窗口或 Dock UI。

### 从源码运行

### 从源码运行

```sh
git clone https://github.com/lyuai/codexion.git
cd codexion
pnpm install
pnpm start
```

也可以在完成 `pnpm install` 后双击：

```text
scripts/start.command
```

首次启动或 Codex 当前没有开启 CDP 时，Codexion 会请求 Codex Desktop 正常退出，
随后带本地调试参数重新打开。当前任务应先保存；整个过程不会强制结束进程。

### 自定义端口或应用位置

```sh
CODEXION_CDP_PORT=9342 scripts/start.command

pnpm start -- \
  --app /Applications/ChatGPT.app \
  --port 9342
```

`CODEXION_APP_PATH` 也可用于设置默认应用路径。

## 它如何工作

`codexion start` 执行一个完整、可验证的生命周期：

1. 定位 Codex Desktop 主进程。
2. 检查 CDP 端口是否已开启，并验证端口归属。
3. 如果现有 Codex 已正确开启 CDP，直接复用。
4. 否则通过 macOS 应用 API 请求 Codex 正常退出。
5. 直接启动受信任的 Codex 可执行文件，并只将 CDP 绑定到 `127.0.0.1`。
6. 等待端口就绪，再次确认监听者就是新启动的 Codex 进程。
7. 连接主 renderer，而不是头像浮层等辅助 renderer。
8. 通过 Codex app-server 获取标准化的周用量快照和非敏感账户身份。
9. 每分钟更新账户按钮中的剩余百分比和进度填充。
10. 轮询选定的 GitHub 仓库，并在右上角显示未处理 issue。

数据读取与 UI 注入相互独立：app-server 负责用量，CDP 只负责显示。这避免了依赖
renderer 内部、容易变化的私有 HTTP URL。

## GitHub Issue Inbox

1. 确认已经安装 `gh`，并在需要时运行 `gh auth login`。
2. 打开 Codex Settings。
3. 在 **Integrations** 分组底部选择 **Codexion**。
4. 搜索并多选需要监控的仓库，选择会立即生效。

`Issue age` 可以筛选最近 3、7、14、30 天或全部 open issues，默认最近 3 天。Inbox 中
每个 issue 的右上角会显示距今时间。

Inbox 顶部的 **Current repo** 可临时查询当前 Codex task 对应的仓库，无需先在上面选中，
也不会更改已经保存的监控仓库。主列表仍遵循已配置的时间范围；更早且仍符合条件的 issue
会显示在 **Older issues** 区域，默认展示最新的 3 条，其余可按需展开。空状态也会明确说明
当前时间范围。Codexion 会在当前 task 变化时预取对应仓库，并使用短时本地缓存，因此打开
面板通常无需等待；缓存过期时会保留旧结果并在后台更新，Refresh 会跳过缓存强制刷新。
Codexion Settings 使用的仓库目录也会在启动时预取并缓存 5 分钟，仓库选择仍会实时生效。

Codexion 会读取 Codex 已知 workspace，并根据 GitHub `origin` 自动匹配仓库。没有匹配
workspace 的 issue 仍会显示，但“处理”会给出明确错误且不会创建 task。

被忽略的 issue 会显示在同一设置页的 **Ignored Issues** 区域。选择 **Unignore** 即可
恢复；如果它仍为 open 且符合其他筛选条件，会在刷新后重新进入 Inbox。

处理和忽略记录保存在：

```text
~/Library/Application Support/Codexion/state.json
```

处理动作会把 issue 编号、标题和 URL 发给新 task，要求 Codex 复现问题、实现修复并运行
相关测试，同时明确禁止未经批准直接回复 GitHub 或关闭 issue。issue node ID 会在 task
创建前后持久化；中断后的重试会复用已经创建的 thread。

## CLI

```text
codexion start   准备或复用 CDP-enabled Codex，然后启动 Sanity Meter
codexion attach  只连接现有 CDP-enabled Codex，不负责重启
codexion doctor  输出应用、进程和 CDP 诊断信息
```

在仓库中对应的命令为：

```sh
pnpm start
pnpm attach
pnpm doctor
```

## 日志和诊断

一键启动脚本将运行状态写入：

```text
~/Library/Application Support/Codexion/codexion.log
~/Library/Application Support/Codexion/codexion.pid
```

诊断当前状态：

```sh
pnpm doctor
curl http://127.0.0.1:9341/json/version
```

常见情况：

| 现象 | 原因与处理 |
| --- | --- |
| 账户按钮中没有百分比 | 运行 `pnpm doctor`，确认 CDP 已开启且目标是主 renderer |
| 账户按钮显示 `—` | 用量接口暂不可用或响应无法识别；查看日志，不会用本地任务数量估算 |
| 端口已占用 | 更换 `CODEXION_CDP_PORT`，或关闭占用该端口的本地进程 |
| 检测到多个 Codex 主进程 | 正常退出所有 Codex Desktop 窗口后重新运行 |
| Codex 无法正常退出 | Codexion 会停止操作，不会强杀或再启动第二个实例 |

## 项目结构

```text
src/
├── lifecycle/  进程识别、正常退出、启动和端口归属验证
├── cdp/        本机 target discovery 与 CDP session
├── app-server/ 共用的 Codex app-server JSON-RPC client
├── github/     gh 适配、仓库/workspace 发现、状态与 task 调度
├── usage/      app-server provider、响应适配和 UsageSnapshot
└── ui/         Widget 安装、位置、样式和快照渲染

scripts/
├── start.command   双击启动入口
└── doctor.command  双击诊断入口
```

更详细的设计与约束见 [架构说明](docs/ARCHITECTURE.md)。

## 后续定制功能

Codexion 可以继续添加背景、主题、状态提示或其他小型桌面增强，但这些能力应作为独立
extension 构建，而不是继续扩张 Sanity Meter 或生命周期模块。

以“更换背景”为例，推荐流程是：

1. 新建 `src/extensions/background/`，包含配置解析、CSS 生成和安装/卸载逻辑。
2. 图片只接受用户明确选择的本地文件，校验类型、大小和真实路径。
3. 通过 CDP 注入带唯一 ID 的 `<style>` 或受控 DOM 节点。
4. 使用 CSS 变量和窄范围选择器覆盖背景，不替换原生 React 组件。
5. 提供 `apply`、`disable` 和 `reset`，确保一键恢复原生界面。
6. 将用户配置保存到 Codexion 自己的数据目录，不写入 Codex 安装包。
7. Codex renderer 更新后找不到目标节点时，应安全失效，而不是扩大选择器范围。

完整的扩展接口建议、背景功能示例和安全要求见
[扩展开发指南](docs/EXTENSIONS.md)。

## Roadmap

- [x] 安全的一键 CDP 生命周期
- [x] app-server 周用量 provider
- [x] 当前账户旁的原生风格 Sanity Meter
- [x] 支持仓库多选和幂等 task 调度的 GitHub Issue Inbox
- [x] Codex Settings 中的 Codexion 页面
- [x] `doctor` 诊断命令
- [ ] 可安装的稳定 macOS Companion `.app`
- [ ] extension registry 和统一启用/禁用机制
- [ ] 本地背景与主题扩展
- [ ] 所有 extension 的一键恢复原生界面
- [ ] renderer/app-server 兼容性测试矩阵

Roadmap 表示方向，不承诺发布日期。具体设计应先通过 Issue 讨论。

## 开发

```sh
pnpm install
pnpm format
pnpm lint
pnpm check
pnpm test
pnpm build
```

提交前至少运行：

```sh
pnpm check
pnpm test
pnpm build
```

## 设计原则

- Local first：数据、CDP 和控制服务只在本机工作。
- Verify ownership：不能只判断端口“能访问”，还要验证属于目标 Codex 进程。
- Normal lifecycle：优先正常退出，拒绝强杀和不受控的第二实例。
- Adapter boundaries：Codex 协议和 DOM 变化限制在 provider/extension 内。
- Honest status：没有真实数据就显示不可用，不生成看似可信的估算值。
- Reversible UI：所有界面增强都应可单独关闭，并能恢复原生界面。
- Minimal surface：不内嵌浏览器、不复制 Codex、不修改签名资源。

## 参与贡献

欢迎提交问题、兼容性报告、文档和代码改进。开始前请阅读：

- [贡献指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)
- [行为准则](CODE_OF_CONDUCT.md)

较大的功能（尤其是背景、主题、常驻控制器和跨平台支持）请先创建 Feature Request，
确认边界后再实现，避免出现无法安全卸载或与 Codex 更新强耦合的方案。

## License

Codexion 使用 [MIT License](LICENSE)。Codex、ChatGPT、OpenAI 及其相关名称和标识
属于各自权利人。Codexion 是独立的社区项目，与 OpenAI 无隶属或官方背书关系。
