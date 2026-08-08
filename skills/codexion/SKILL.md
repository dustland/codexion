---
name: codexion
description: Start and use Codexion's local Codex Desktop CDP companion when the user asks for weekly usage, Sanity Meter, or Codex Desktop UI extensions.
---

# Codexion

Codexion is a lightweight local companion for Codex Desktop. Its plugin
`SessionStart` hook checks `127.0.0.1:9341` and launches a CDP-enabled desktop
instance when needed. The hook does not modify the already-running renderer;
the launched instance is the one that exposes CDP.

When the user asks to use the Sanity Meter or another Codexion UI extension:

1. Check that the local CDP instance is reachable.
2. If the project dependencies are installed, run `pnpm attach` from the
   Codexion repository to start the standalone UI helper.
3. Keep the helper local and do not read, persist, or forward credentials.
4. Do not modify `app.asar` or signed application resources.

The CDP port can be changed with `CODEXION_CDP_PORT`. The desktop app path can
be changed with `CODEXION_APP_PATH` when the installed app is not
`/Applications/ChatGPT.app`.
