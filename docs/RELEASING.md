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
- `SPARKLE_PRIVATE_KEY`: Ed25519 private key used only to sign update archives and appcasts.

Secrets are imported into an ephemeral keychain on the GitHub-hosted runner and are deleted after
the job. They must never be committed to the repository.

## Release

1. Update `package.json`, `src/index.ts`, and `CHANGELOG.md` to the same version.
2. Run `pnpm lint && pnpm check && pnpm test && pnpm build`.
3. Commit and push the release changes.
4. Create and push the tag: `git tag v0.2.0 && git push origin v0.2.0`.
5. The Release workflow builds, signs, notarizes, staples, verifies, and publishes the DMG, app ZIP,
   SHA-256 checksum, and signed `appcast.xml`.

## Automatic updates

The packaged app embeds Sparkle 2 and checks the latest release appcast while Codexion is running.
Sparkle is pinned and checksum-verified by `scripts/fetch-sparkle.sh`; update archives are signed with
the repository's `SPARKLE_PRIVATE_KEY`, while the matching public key is embedded in the app bundle.

Never rotate the Sparkle key casually: installed copies trust the embedded public key. If rotation is
required, first ship an update containing both the migration strategy and the new trust material.
Users of releases made before Sparkle was introduced must install one newer DMG manually; subsequent
updates can be delivered automatically.

## Local package test

Use an official Node.js 22 distribution because some package-manager builds omit the SEA fuse.

```sh
NODE_BINARY=/path/to/official/node pnpm package:mac
```

Without `CODE_SIGN_IDENTITY`, the local build uses an ad-hoc signature and cannot be distributed.
