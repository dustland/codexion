## Summary

<!-- What user-visible problem does this change solve? -->

## Design

<!-- Explain the approach, module boundaries, and alternatives considered. -->

## Safety and compatibility

- [ ] CDP remains loopback-only and port ownership is verified where relevant.
- [ ] No credentials, private account data, or generated local files are committed.
- [ ] UI injection is uniquely identified, reversible, and safely fails when the DOM changes.
- [ ] Existing lifecycle and native Codex behavior remain intact.

## Verification

- [ ] `pnpm lint`
- [ ] `pnpm check`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Real Codex renderer verification completed when UI behavior changed.

## Screenshots

<!-- Required for visible UI changes; otherwise write N/A. -->
