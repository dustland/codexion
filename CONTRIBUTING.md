# Contributing to Codexion

Thank you for improving Codexion. Because the project controls the local Codex Desktop lifecycle
and connects to CDP, reversibility, process ownership, compatibility, and explicit security
boundaries take priority over convenience.

## Before you begin

- Bug fixes, documentation, and focused tests can go directly to a pull request.
- Discuss features, platform support, persistent controllers, and new UI extensions in an issue first.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
- Participation is subject to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local development

macOS, Node.js 22+, and pnpm 10 are currently required.

```sh
git clone https://github.com/lyuai/codexion.git
cd codexion
pnpm install
pnpm check
pnpm test
pnpm build
```

Run the real integration with `pnpm start`. This may ask Codex Desktop to quit normally and reopen;
save active work before testing.

## Branches and commits

- Create a short-lived branch from the latest `main`.
- Keep each pull request focused on one problem.
- Use a concise imperative commit subject, such as `Add app-server usage provider`.
- Do not commit `dist/`, `node_modules/`, logs, user settings, or local assets.
- Preserve unrelated user and repository changes.

## Code requirements

- Use strict TypeScript and Node.js built-ins before adding dependencies.
- Give process, port, protocol, and I/O operations explicit errors and timeouts.
- Never expose CDP on a non-loopback address.
- Never read, print, persist, or forward credentials.
- Never modify Codex `app.asar`, binaries, or signed resources.
- Do not force-kill the app or silently launch a second instance after lifecycle failure.
- Give injected DOM a unique identity, idempotent installation, and complete removal path.
- Isolate private Codex dependencies in adapters, providers, or extension locators.

## Verification

```sh
pnpm lint
pnpm check
pnpm test
pnpm build
```

New behavior should cover success, rejection, and unavailable or timeout paths. Visible changes must
also be verified in the real main renderer, including repeated installation and narrow layouts.

## Pull requests

Describe the user problem, approach, alternatives, safety and compatibility impact, verification,
screenshots for visible changes, and any required restart or migration. Maintainers may request a
narrower selector, stronger ownership check, explicit reset behavior, or a smaller feature split.
