# Extension development

## Purpose

An extension is a reversible enhancement installed in the Codex main renderer. Extensions may
share a verified CDP session and the companion lifecycle, but they should not share DOM nodes,
configuration, or private state with one another.

A future common contract may look like:

```ts
interface CodexionExtension<TSnapshot = void> {
  id: string;
  install(): Promise<void>;
  update(snapshot: TSnapshot): Promise<void>;
  uninstall(): Promise<void>;
}
```

Extensions without dynamic data can leave `update` empty. Do not rewrite Sanity Meter solely to
introduce an abstraction; extract a registry and shared session when the second extension arrives.

## Recommended layout

```text
src/extensions/
├── registry.ts
├── sanity-meter/
│   ├── extension.ts
│   └── view.ts
└── background/
    ├── config.ts
    ├── extension.ts
    ├── locator.ts
    └── styles.ts
```

Each extension owns its unique node/style IDs, locator, compatibility rules, configuration schema,
install/update/uninstall behavior, unavailable states, and tests.

## Background extension example

### Structured configuration

Do not persist arbitrary CSS. Store a validated model:

```ts
interface BackgroundConfig {
  enabled: boolean;
  imagePath: string;
  opacity: number;
  overlay: "none" | "light" | "dark";
  fit: "cover" | "contain";
  position: "center" | "top" | "bottom";
}
```

Recommended storage:

```text
~/Library/Application Support/Codexion/config.json
~/Library/Application Support/Codexion/assets/
```

Write configuration with a temporary file and atomic replacement, and restrict permissions. Never
write extension state into the Codex bundle or Codex configuration.

### Image import

After the user explicitly selects an image:

1. Resolve the real path and reject missing files or symlink escape.
2. Allow a small set of formats such as PNG, JPEG, and WebP.
3. Enforce file-size and pixel limits to avoid oversized GPU use or decompression bombs.
4. Copy the accepted asset into Codexion's data directory with a stable generated name.
5. Never upload the image or scan unrelated folders automatically.

The renderer may not safely load arbitrary local paths. A future implementation can use a bounded
`data:` URL, a local read-only asset service, or CDP injection with strict size limits. Prefer the
option with the smallest file-reading capability and clearest lifecycle.

### DOM and CSS injection

Install a uniquely identified style element:

```html
<style id="codexion-background-style">…</style>
```

Represent state with namespaced CSS variables:

```css
:root {
  --codexion-background-image: none;
  --codexion-background-opacity: 0.22;
}
```

Selectors must target a verified workspace shell. Avoid `body *`, global opacity, or broad
`!important` rules that can damage dialogs, menus, editors, diffs, and accessibility.

The background layer should use `pointer-events: none`, remain outside keyboard focus, preserve
native dimensions and scroll ownership, maintain contrast in light and dark modes, respect reduced
motion, and stay hidden when its expected shell cannot be located.

### Readability

At minimum, offer opacity, light/dark overlay, `cover`/`contain`, and an immediate native reset.
Verify the composer, code blocks, diffs, menus, and dialogs. Do not compensate for poor contrast
with large real-time blur or shadow effects; prefer stable overlays and existing surface colors.

### Apply and recovery

The extension should support explicit, idempotent operations:

```text
codexion background apply <config>
codexion background disable
codexion background reset
```

- `disable` hides the extension for the current state while retaining configuration.
- `reset` removes generated nodes, styles, and settings to restore the native interface.
- Repeated `apply` updates the same node and never creates duplicates.

On a normal controller shutdown, extensions should uninstall. After an unexpected exit, the next
connection should remove stale versioned nodes before installing the current configuration.

## Locator rules

Preferred order:

1. Stable semantics such as ARIA labels, roles, and verified page URLs.
2. Multiple structural conditions around a semantic anchor.
3. Stable data attributes.
4. Local class tokens only as supporting evidence.

Avoid generated classes, nth-child positions, screen coordinates, localized long text, and any
fallback that expands to the entire `body`. A failed locator should hide the extension and emit a
diagnostic message.

## Security checklist

- [ ] Connect only to the verified main renderer.
- [ ] Give every node and style a unique, versioned ID.
- [ ] Make install and uninstall idempotent.
- [ ] Never execute user-provided JavaScript or raw CSS.
- [ ] Validate local asset type, size, and real path.
- [ ] Do not upload data or collect it implicitly.
- [ ] Do not persist authentication material.
- [ ] Do not obscure native controls or capture unrelated clicks.
- [ ] Verify narrow windows, light/dark modes, menus, and dialogs.
- [ ] Fail closed on DOM incompatibility and provide a native reset.

## Testing

Each extension should cover configuration boundaries, escaping, duplicate installation, isolated
updates, complete removal, locator success/failure, renderer redraw recovery, narrow layouts, and
unavailable states. Visible behavior must also be checked in the real Codex renderer rather than
only through string or unit tests.
