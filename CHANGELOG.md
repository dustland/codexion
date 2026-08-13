# Changelog

All notable changes to Codexion will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/) once public releases begin.

## Unreleased

### Added

- Safe macOS lifecycle coordinator for launching Codex Desktop with loopback CDP.
- `start`, `attach`, and `doctor` CLI commands.
- Codex app-server provider using `account/rateLimits/read`.
- Native-style weekly usage Widget in the right title-bar action group.
- Contributor, security, extension, and architecture documentation.

### Changed

- Repositioned Codexion from a Codex Plugin to an independent local Companion.
- Separated usage data retrieval from CDP UI injection.

### Removed

- Plugin manifests and `SessionStart` hook launcher.
- Renderer request to the obsolete `/wham/usage` endpoint.
