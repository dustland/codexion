# Codexion

Codexion is a lightweight local companion for Codex Desktop.

The first feature is **Sanity Meter**: a small title-area indicator showing the
current Codex weekly usage percentage.

## Run

要求 Node.js 22+。

1. 完全退出 ChatGPT/Codex Desktop。
2. 运行 `./scripts/launch-debug.command`，以本机 CDP 端口启动应用。
3. 在另一个终端运行：

   ```sh
   pnpm install
   pnpm attach
   ```

也可以手动指定端口：

```sh
CODEXION_CDP_PORT=9342 ./scripts/launch-debug.command
pnpm attach --port 9342
```

Codexion 会在 Codex Desktop 页面上下文里请求已有的 `/wham/usage` 接口，
复用应用当前登录态，只读取 rate-limit 使用数据。拿不到真实数据时显示
`WEEKLY —`，不会用本地任务数量进行估算。

## Codex plugin mode

仓库现在也包含一个 Codex plugin manifest。启用并信任插件 hook 后，每次
Codex session 启动时会检查本机 CDP；如果 `9341` 不可用，会启动一个新的
CDP-enabled ChatGPT/Codex Desktop 实例。插件无法给已经启动的 renderer 事后
补开 CDP，因此实际注入仍由独立的 `pnpm attach` helper 完成。

插件 hook 文件位于 `hooks/hooks.json`，不需要把 hook 路径重复写进
`.codex-plugin/plugin.json`。首次启用时请在 Codex 的插件安全提示中审阅并信任
该 hook；这是插件执行本机启动命令所必需的授权。

## Principles

- Use the local Chrome DevTools Protocol (CDP) connection exposed by Codex Desktop.
- Use Node.js built-ins (`fetch` and `WebSocket`) before adding runtime dependencies.
- Inject only the UI and behavior needed by Codexion; do not modify `app.asar` or signed application resources.
- Keep usage data local. Do not persist or forward session credentials.
- Treat usage data as an adapter boundary so changes in Codex's UI or data shape do not leak through the rest of the app.

Codexion is intentionally a companion script, not a replacement desktop app: no
Electron shell, React renderer, browser bundle, or embedded Chromium runtime.

## Project layout

```text
src/
├── cdp/       CDP connection and protocol code
├── usage/     Usage data types and provider adapters
└── ui/        Title meter formatting and injected UI
```

## Development

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```
