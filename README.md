# Codexion

Codexion is a lightweight local companion for Codex Desktop.

The first feature is **Sanity Meter**: a small title-area indicator showing the
current Codex weekly usage percentage.

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

The CDP attach flow and the live Codex usage adapter are intentionally left as
the next implementation step. The current scaffold establishes their interfaces
without pretending that a local task count is the real Codex weekly usage.
