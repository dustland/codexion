# Changelog

All notable changes to Codexion will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/) once public releases begin.

## Unreleased

### Added

- Safe macOS lifecycle coordinator for launching Codex Desktop with loopback CDP.
- `start`, `attach`, and `doctor` CLI commands.
- Codex app-server provider using `account/rateLimits/read` and `account/read`.
- Native-style weekly usage enhancement integrated into the sidebar profile trigger.
- GitHub Issue Inbox backed by the local authenticated `gh` CLI.
- Codexion Settings page with repository filtering, multi-selection, and workspace detection.
- Durable issue-to-thread mapping with interrupted task-start recovery.
- Contributor, security, extension, and architecture documentation.

### Changed

- Repositioned Codexion from a Codex Plugin to an independent local Companion.
- Separated usage data retrieval from CDP UI injection.
- Reconnect to the main renderer after CDP session loss and reinstall the Widget automatically.
- Restart the owned app-server usage provider after failures and prevent stderr backpressure.
- Show the remaining weekly percentage over a full-width progress track while preserving the
  native profile menu behavior.
- Read the current non-secret account identity without retaining authentication material.

### Removed

- Plugin manifests and `SessionStart` hook launcher.
- Renderer request to the obsolete `/wham/usage` endpoint.
