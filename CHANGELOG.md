# Changelog

All notable changes to Codexion will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/) once public releases begin.

## Unreleased

## 0.3.1 - 2026-08-15

### Added

- Add a native-style Maintenance section to Codexion Settings with the installed Core version and
  a one-click action to restart the Codexion background companion without restarting Codex Desktop.

### Fixed

- Enforce that the Settings/Core version matches `package.json` during CI so packaged releases
  cannot display a stale hard-coded version again.

## 0.3.0 - 2026-08-15

### Added

- Automatically detect when Codex restarts without its CDP endpoint, restore the required launch
  configuration, reconnect to the new renderer, and rehydrate quota and Issue Inbox state.
- Restart the companion Core when an already-running Codexion app is opened again, and write its
  diagnostics to `~/Library/Application Support/Codexion/codexion.log`.

### Changed

- Place quota and Issues inside the native Open in action container with full rectangular hit areas,
  native spacing, and explicit non-draggable title-bar behavior.
- Make Issue window changes immediate and persistent, and use Codex's native right-aligned checkmark
  instead of a selected-row background in its dropdown.
- Reduce and offset the Issues count badge so the circle-dot symbol remains clearly visible.

### Fixed

- Preserve the Codexion Settings page and its single native sidebar selection while Codex rebuilds
  the Settings navigation.
- Fall back to a forced application restart when Codex accepts but does not complete a normal quit,
  allowing Codexion to restore CDP reliably.
- Keep quota hovercards and Issues hover and click behavior active across the complete control bounds.

## 0.2.8 - 2026-08-15

### Fixed

- Anchor quota and GitHub Issues before the native Open in control so all three participate in the
  same dynamically sized title-bar action group when the side panel opens or closes.
- Keep the GitHub Issues trigger interactive inside the title bar's pointer-transparent layout
  container so its tooltip and menu continue to work with the side panel visible.
- Use the circle-dot Issues symbol for the inbox trigger and panel title, reserving the GitHub mark
  for actions that actually open GitHub.
- Reuse Codex's native Usage speedometer geometry for the quota indicator.

## 0.2.7 - 2026-08-15

### Fixed

- Give the GitHub Issue trigger a real 28px flex footprint so it cannot overlap adjacent title-bar
  controls when the side panel changes the available layout.
- Anchor the quota hovercard below the quota's right edge so it expands left and remains fully
  visible with either side-panel state.

## 0.2.6 - 2026-08-14

### Fixed

- Make the quota hovercard deterministic in the draggable title bar by tracking the pointer against
  the complete quota and hovercard bounds instead of relying on fragile enter and leave events.

## 0.2.5 - 2026-08-14

### Fixed

- Bind the rich quota tooltip to the full quota trigger hit area so it appears reliably in the
  native title bar, and reduce its hover delay.

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
