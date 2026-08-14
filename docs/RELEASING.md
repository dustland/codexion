# Releasing Codexion

Codexion publishes a signed and notarized Apple Silicon app when a semantic version tag is pushed.
The tag must match `package.json`, for example `v0.2.0` for package version `0.2.0`.

## Required repository secrets

- `MACOS_CERTIFICATE_BASE64`: Base64-encoded `.p12` containing a Developer ID Application
  certificate and its private key.
- `MACOS_CERTIFICATE_PASSWORD`: Password used when exporting the `.p12`.
- `APPLE_ID`: Apple ID used for notarization.
- `APPLE_TEAM_ID`: Ten-character Apple Developer Team ID.
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password created for the Apple ID.

Secrets are imported into an ephemeral keychain on the GitHub-hosted runner and are deleted after
the job. They must never be committed to the repository.

## Release

1. Update `package.json`, `src/index.ts`, and `CHANGELOG.md` to the same version.
2. Run `pnpm lint && pnpm check && pnpm test && pnpm build`.
3. Commit and push the release changes.
4. Create and push the tag: `git tag v0.2.0 && git push origin v0.2.0`.
5. The Release workflow builds, signs, notarizes, staples, verifies, and publishes the DMG, app ZIP,
   and SHA-256 checksum.

## Local package test

Use an official Node.js 22 distribution because some package-manager builds omit the SEA fuse.

```sh
NODE_BINARY=/path/to/official/node pnpm package:mac
```

Without `CODE_SIGN_IDENTITY`, the local build uses an ad-hoc signature and cannot be distributed.
