# Security Policy

## Supported versions

Codexion is in early development. Security fixes are provided for the latest `main` revision only.

## Reporting a vulnerability

Do not open a public issue. Use **Security → Report a vulnerability** in this GitHub repository. If
private reporting is unavailable, contact the repository owner and disclose only the minimum
information needed to establish contact.

Include the affected revision, macOS and Codex Desktop versions, reproduction steps, expected and
actual boundary, impact, and possible mitigation. Never include real tokens, cookies, private
account data, or another user's information.

We will acknowledge reports as soon as practical, assess impact, and coordinate remediation and
disclosure timing with the reporter.

## Security model

- CDP binds only to `127.0.0.1`, but CDP itself has no authentication.
- Other processes running as the same local user are part of the threat model.
- Codexion verifies that the CDP listener belongs to the expected Codex PID.
- Usage is read through a local, read-only Codex app-server method.
- Credentials must never be persisted or forwarded.
- Codexion does not modify `app.asar`, binaries, or signed resources.
- Future extension assets and configuration remain untrusted inputs.

Privately report ownership-check bypasses, arbitrary local file reads, credential exposure,
arbitrary script or CSS execution, path traversal, non-loopback exposure, malicious renderer
adoption, or persistent behavior that cannot be completely removed.
