# Architecture

## Purpose

Codexion provides small, reversible local enhancements to Codex Desktop without rebuilding the
application or modifying its bundle, binaries, or signed resources.

The system has two independent paths:

```text
Codex app-server ── account/rateLimits/read + account/read ──> UsageSnapshot
                                                                  │
Codex renderer <──────────────── loopback CDP <────────────── UI renderer
```

App-server provides data. CDP provides a rendering channel. An extension should not scrape data
from the page merely because a CDP connection already exists when a supported local protocol can
provide that data.

## Module boundaries

### `lifecycle`

Responsibilities:

- Resolve the Codex Desktop bundle and main executable.
- Identify a unique main process.
- Request a normal quit and wait for that process identity to disappear.
- Launch with `--remote-debugging-address=127.0.0.1` and the configured port.
- Verify that the CDP listener belongs to the expected PID.
- Provide read-only diagnostics.

Non-responsibilities: account data, renderer connections, and CSS injection.

### `cdp`

Responsibilities:

- Access loopback CDP endpoints only.
- Discover the `app://-/index.html` main renderer.
- Deprioritize auxiliary renderers such as the avatar overlay.
- Provide timeouts, error propagation, and explicit close semantics.

Non-responsibilities: process lifecycle, user settings, and usage response semantics.

### `usage`

Responsibilities:

- Start the Codex-bundled app-server as a child process.
- Initialize the local JSON-RPC session.
- Call the read-only `account/rateLimits/read` and `account/read` methods.
- Convert protocol responses into a stable `UsageSnapshot`.
- Retain only account type, plan type, and email; discard unrelated response fields.
- Tolerate known field variants without mistaking hourly or monthly limits for weekly usage.

Non-responsibilities: CDP, DOM access, and credential persistence.

### `ui`

Responsibilities:

- Install uniquely identified extension nodes.
- Integrate Sanity Meter into the existing profile trigger in the sidebar footer.
- Restore placement after renderer updates.
- Render the remaining weekly percentage and a full-width progress track.
- Preserve the native profile trigger behavior and restore modified inline styles on cleanup.
- Render an honest unavailable state instead of estimating usage.

Non-responsibilities: account requests and process lifecycle decisions.

## Startup sequence

```text
CLI start
  ├─ lifecycle: inspect process and port
  ├─ lifecycle: normal quit when CDP is absent
  ├─ lifecycle: direct launch with loopback CDP
  ├─ lifecycle: verify PID owns port
  ├─ usage: initialize app-server provider
  ├─ cdp: select main renderer
  ├─ ui: install Widget
  └─ refresh loop: UsageSnapshot -> Widget
```

If ownership verification fails, Codexion stops instead of connecting to an unknown listener that
merely looks like CDP.

## Security boundaries

- CDP has no authentication and must bind only to `127.0.0.1`.
- Other processes running as the same local user remain part of the threat model.
- Tokens, cookies, and app-server authentication material must never be printed, stored, or sent.
- Account identity parsing is allowlisted to type, plan type, and email.
- Codexion does not modify `app.asar`, application binaries, signed files, or Codex settings.
- A failed normal lifecycle must not fall back to `kill -9`.
- Renderer DOM and app-server responses are mutable, untrusted inputs.
- Every injected node needs a unique Codexion identity for idempotent updates and complete removal.

## Failure behavior

| Layer | Failure behavior |
| --- | --- |
| Lifecycle | Stop; do not force-terminate or launch a second instance |
| Port ownership | Reject the connection and report a conflict |
| App-server | Show unavailable state and log the error; never estimate usage |
| Renderer discovery | Time out instead of injecting an auxiliary or unknown page |
| DOM anchor | Hide the extension and wait for the expected anchor to return |
| UI refresh | Preserve the latest snapshot and log the refresh failure |

## Why Codexion is not a plugin

Plugin session hooks run after the Codex Desktop process has already started. CDP is a process
startup option and cannot be reliably attached afterward. Attempting to open another instance from
a hook introduces single-instance reuse, dropped arguments, and competing helpers.

A standalone companion makes the lifecycle decision before injection and verifies the result. If a
plugin is offered in the future, it should only document or open the companion; it must not own the
core startup flow.

## Compatibility strategy

- App-server changes stay inside usage providers and parsers.
- DOM changes stay inside extension locators.
- Core lifecycle code never depends on CSS classes or React component names.
- Selectors prefer semantic attributes and stable structure, with a safe failure path.
- Every extension owns its install, update, disable, reset, and status behavior.
