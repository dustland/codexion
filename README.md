<p align="center">
  <img src="assets/codexion-mark.svg" width="88" height="88" alt="Codexion logo">
</p>

<h1 align="center">Codexion</h1>

**English** | [简体中文](README.zh-CN.md)

[![CI](https://github.com/lyuai/codexion/actions/workflows/ci.yml/badge.svg)](https://github.com/lyuai/codexion/actions/workflows/ci.yml)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple)](https://github.com/lyuai/codexion)

Codexion is a lightweight local companion for Codex Desktop. It safely launches or adopts the
desktop app and uses the loopback Chrome DevTools Protocol (CDP) to provide small, restrained UI
enhancements without modifying the installed application.

Codexion currently includes two extensions. **Sanity Meter** augments the existing profile trigger in the Codex
sidebar footer with the remaining weekly percentage and a full-width progress track. For example,
`82%` means 82% of the weekly allowance remains. The native profile menu behavior is preserved.

**GitHub Issue Inbox** adds a compact trigger beside the native title-bar actions. It polls selected
repositories through the locally installed and authenticated GitHub CLI, excludes issues authored
or already answered by the current user, and offers Handle and Ignore actions. Handling creates one
Codex task in the repository's matching local workspace; a durable issue-to-thread mapping prevents
duplicate task creation across refreshes and restarts.

The Inbox header's **Current repo** switch queries the active Codex task's GitHub remote directly,
even when it is not selected in Settings. If the task has no GitHub remote, Codexion shows a clear
empty state without changing the saved repository selection.

> Codexion is not a Codex plugin. CDP must be enabled when the desktop process starts, while plugin
> session hooks run after that process already exists. A standalone companion can coordinate and
> verify the complete lifecycle instead of attempting to launch a competing second instance.

## Status

- Platform: macOS
- Runtime: Node.js 22 or later
- Default app: `/Applications/ChatGPT.app`
- Default CDP endpoint: `127.0.0.1:9341`
- Data sources: Codex app-server for usage and the local `gh` CLI for selected repositories
- Refresh intervals: 60 seconds for usage; 3 minutes for GitHub issues

Codexion does not modify `app.asar`, application binaries, or signed resources. It does not create
a separate browser profile or require another login.

Issue Inbox is optional. It requires [GitHub CLI](https://cli.github.com/) and an existing
`gh auth login` session. Codexion never stores the GitHub token.

## Quick start

```sh
git clone https://github.com/lyuai/codexion.git
cd codexion
pnpm install
pnpm start
```

After installing dependencies, you can also double-click:

```text
scripts/start.command
```

If the current Codex process does not expose CDP, Codexion asks it to quit normally and opens it
again with loopback debugging enabled. Save active work before the first run. Codexion does not
force-terminate the app.

Use a different port or app location when needed:

```sh
CODEXION_CDP_PORT=9342 scripts/start.command

pnpm start -- \
  --app /Applications/ChatGPT.app \
  --port 9342
```

`CODEXION_APP_PATH` can also set the default application path.

## How it works

`codexion start` performs a complete, verified lifecycle:

1. Locate the Codex Desktop main process.
2. Inspect the CDP endpoint and verify its process owner.
3. Reuse the process when it already owns the requested port.
4. Otherwise request a normal application quit through macOS.
5. Launch the trusted Codex executable with CDP bound only to `127.0.0.1`.
6. Wait for the endpoint and verify that the newly launched PID owns it.
7. Select the main renderer instead of auxiliary views such as the avatar overlay.
8. Read a normalized weekly snapshot and non-secret account identity from the Codex app-server.
9. Update the profile trigger percentage and progress fill every minute.
10. Poll selected GitHub repositories and render unhandled issues in the title bar.

Usage retrieval and UI injection are intentionally separate: app-server provides data, while CDP
only renders the extension. This avoids coupling data access to unstable renderer HTTP routes.

## GitHub Issue Inbox

1. Install `gh` and run `gh auth login` if it is not already authenticated.
2. Open Codex Settings.
3. Choose **Codexion** at the bottom of the **Integrations** section.
4. Filter and select the repositories to monitor. Changes apply immediately.

The Issue age control limits the Inbox to the last 3, 7, 14, or 30 days, or all open issues. The
default is 3 days. Each Inbox item shows its age in the upper-right corner.

Use **Current repo** in the Inbox header to temporarily query the repository associated with the
active Codex task. It does not need to be selected above, and the switch does not change your saved
repository selection. The main list still follows the configured age window; the three newest
older eligible issues appear by default in **Older issues**, with the remainder available on
demand. Empty states name the active window. Codexion prefetches the active task's repository when
the task changes and keeps a short-lived local cache, so opening the panel normally has no loading
step. Expired data remains visible while it refreshes in the background; Refresh bypasses the cache.
The repository catalog used by Codexion Settings is also prefetched at startup and cached for five
minutes, while selections continue to apply immediately.

Codexion detects known Codex workspaces and matches their `origin` remote to `owner/repository`.
An issue without a matching local workspace remains visible, but Handle reports a clear error and
does not create a task. Ignore is local and reversible by editing Codexion state.

Ignored issues appear in the **Ignored Issues** section on the same Settings page. Choose
**Unignore** to restore one; if it is still open and otherwise eligible, it returns on refresh.

Handled and ignored records are stored at:

```text
~/Library/Application Support/Codexion/state.json
```

The Handle action starts a task with the issue number, title, and URL, asks Codex to reproduce and
fix the problem and run relevant tests, and explicitly forbids posting to GitHub or closing the
issue without approval. The issue node ID is persisted before and after task creation so a retry
can reuse a previously created thread instead of opening another one.

## CLI

```text
codexion start   Prepare or reuse Codex with CDP, then run Sanity Meter
codexion attach  Attach to an existing CDP-enabled Codex process
codexion doctor  Print app, process, and CDP diagnostics
```

Repository commands:

```sh
pnpm start
pnpm attach
pnpm doctor
```

## Logs and diagnostics

The double-click launcher stores runtime state at:

```text
~/Library/Application Support/Codexion/codexion.log
~/Library/Application Support/Codexion/codexion.pid
```

Inspect the current environment with:

```sh
pnpm doctor
curl http://127.0.0.1:9341/json/version
```

| Symptom | Cause and recovery |
| --- | --- |
| The profile percentage is missing | Run `pnpm doctor`; confirm CDP is ready and the main renderer is present |
| The profile percentage shows `—` | Usage is unavailable or unrecognized; Codexion never estimates it from local task counts |
| The port is occupied | Select another `CODEXION_CDP_PORT` or stop the unrelated local process |
| Multiple main processes are detected | Quit all Codex Desktop instances normally, then start again |
| Codex does not quit normally | Codexion stops; it does not force-terminate or launch a second instance |

## Project layout

```text
src/
├── lifecycle/  Process identity, normal quit, launch, and port ownership
├── cdp/        Loopback target discovery and CDP session
├── app-server/ Shared Codex app-server JSON-RPC client
├── github/     gh adapter, repository/workspace discovery, state, and task dispatch
├── usage/      App-server provider, response adapters, and UsageSnapshot
└── ui/         Widget installation, placement, styling, and rendering

scripts/
├── start.command   Double-click launcher
└── doctor.command  Double-click diagnostics
```

See [Architecture](docs/ARCHITECTURE.md) for module boundaries and the security model.

## Future customization

Backgrounds, themes, status indicators, and other enhancements should be independent extensions,
not additions to the lifecycle or Sanity Meter modules.

For a background extension, the recommended design is:

1. Create `src/extensions/background/` with configuration, CSS generation, and lifecycle logic.
2. Accept only local files explicitly selected by the user and validate type, size, and real path.
3. Inject a uniquely identified `<style>` or controlled DOM node through CDP.
4. Use narrow selectors and CSS variables; never replace native React components.
5. Provide idempotent `apply`, `disable`, and `reset` operations.
6. Store settings in Codexion's own application data directory, never inside the Codex bundle.
7. Fail closed when a renderer update invalidates the expected anchor or shell.

See [Extension development](docs/EXTENSIONS.md) for a proposed extension interface, a detailed
background example, resource handling, locator rules, and a security checklist.

## Roadmap

- [x] Verified one-click macOS CDP lifecycle
- [x] Codex app-server weekly usage provider
- [x] Native-style Sanity Meter beside the current account
- [x] Local GitHub Issue Inbox with repository selection and idempotent task dispatch
- [x] Codexion page in Codex Settings
- [x] `doctor` diagnostics
- [ ] Installable macOS companion application
- [ ] Extension registry and unified enable/disable behavior
- [ ] Local background and theme extension
- [ ] One-click native reset for all extensions
- [ ] Renderer and app-server compatibility matrix

The roadmap describes direction, not promised release dates. Discuss substantial designs in an
issue before implementation.

## Development

```sh
pnpm install
pnpm format
pnpm lint
pnpm check
pnpm test
pnpm build
```

Before submitting a change, run at least:

```sh
pnpm lint
pnpm check
pnpm test
pnpm build
```

## Principles

- **Local first:** data, CDP, and control remain on the local machine.
- **Verify ownership:** a reachable port is insufficient; it must belong to the target process.
- **Normal lifecycle:** prefer a normal quit and reject force-kills or uncontrolled second instances.
- **Adapter boundaries:** isolate Codex protocol and DOM changes in providers and extensions.
- **Honest status:** show unavailable state when real data is absent; never invent a plausible value.
- **Reversible UI:** every enhancement must be independently removable and restore native behavior.
- **Minimal surface:** do not embed a browser, clone Codex, or modify signed resources.

## Contributing

Issues, compatibility reports, documentation, and code improvements are welcome. Please read:

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

Open a feature request before implementing backgrounds, themes, persistent controllers, or
cross-platform support so the safety and recovery boundaries can be agreed first.

## License

Codexion is available under the [MIT License](LICENSE). Codex, ChatGPT, OpenAI, and related names
and marks belong to their respective owners. Codexion is an independent community project and is
not affiliated with or endorsed by OpenAI.
