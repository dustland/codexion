# Changelog

All notable changes to Codexion will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/) once public releases begin.

## Unreleased

## 0.2.4 - 2026-08-14

### Added

- Add a compact tooltip to the GitHub Issue trigger and a richer quota tooltip with the active
  account, email, remaining weekly allowance, plan, reset time, and a link to Tibo on X.

### Fixed

- Place only the quota meter before every native control group in the complete right-side title-bar
  action rail, while keeping the GitHub Issue Inbox in its original control group.
- Isolate the GitHub Issue trigger from the native pinned-summary tooltip wrapper so hovering it
  cannot open a misplaced native tooltip.

## 0.2.3 - 2026-08-14

### Fixed

- Keep the quota meter at the left edge of the right-side title-bar action group, followed by the
  GitHub Issue Inbox and then Codex's native controls.

## 0.2.2 - 2026-08-14

### Fixed

- Keep the quota meter and Issue Inbox attached to the visible right-side title-bar action group
  across both the previous and current Codex Desktop button layouts.

## 0.2.1 - 2026-08-14

### Fixed

- Locate Homebrew GitHub CLI installations when Codexion is launched from Finder with the minimal
  macOS GUI `PATH`.
- Show the installed Codexion version at the bottom of its Settings page.

## 0.2.0 - 2026-08-14

### Added

- Signed Sparkle 2 automatic updates for packaged macOS releases.
- Checksum-pinned Sparkle dependency retrieval and signed appcast generation in the release workflow.

### Changed

- Moved the weekly quota indicator from the crowded sidebar footer to the native title-bar action
  group, using a compact speedometer icon and remaining percentage.
- Made Developer ID signing resilient to transient Apple timestamp service failures.

## 0.1.0 - 2026-08-14

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
