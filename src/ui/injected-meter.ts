import type { UsageSnapshot } from "../usage/types.js";

const METER_ID = "codexion-sanity-meter-host";

export const INSTALL_METER_EXPRESSION = `(() => {
  const meterId = ${JSON.stringify(METER_ID)};
  window.__codexionMeterCleanup?.();
  document.getElementById(meterId)?.remove();

  const host = document.createElement("span");
  host.id = meterId;
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.position = "absolute";
  host.style.zIndex = "0";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = \`
    :host {
      border-radius: 6px;
      display: block;
      overflow: hidden;
    }
    .track, .fill {
      bottom: 0;
      left: 0;
      position: absolute;
      top: 0;
    }
    .track {
      background: color-mix(in oklab, currentColor 3%, transparent);
      right: 0;
    }
    .fill {
      background: color-mix(in oklab, currentColor 9%, transparent);
      box-shadow: inset -1px 0 color-mix(in oklab, currentColor 5%, transparent);
      transition: width 180ms ease-out;
      width: 0;
    }
    .label {
      align-items: center;
      bottom: 0;
      color: var(--color-token-text-tertiary, currentColor);
      display: flex;
      font: 550 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
      position: absolute;
      right: 8px;
      top: 0;
    }
    :host([data-level="high"]) .label {
      color: var(--color-token-destructive-foreground, #d45b5b);
    }
    @media (prefers-reduced-motion: reduce) {
      .fill { transition: none; }
    }
  \`;

  const track = document.createElement("span");
  track.className = "track";
  const fill = document.createElement("span");
  fill.className = "fill";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "—";
  shadow.append(style, track, fill, label);

  let currentProfile = null;
  let originalProfileStyles = null;
  let decoratedChildren = [];

  const restoreProfile = () => {
    if (!currentProfile || !originalProfileStyles) return;
    currentProfile.style.position = originalProfileStyles.position;
    currentProfile.style.overflow = originalProfileStyles.overflow;
    currentProfile.style.paddingRight = originalProfileStyles.paddingRight;
    if (originalProfileStyles.ariaDescription === null) {
      currentProfile.removeAttribute("aria-description");
    } else {
      currentProfile.setAttribute("aria-description", originalProfileStyles.ariaDescription);
    }
    for (const child of decoratedChildren) {
      child.element.style.position = child.position;
      child.element.style.zIndex = child.zIndex;
    }
    decoratedChildren = [];
    currentProfile = null;
    originalProfileStyles = null;
  };

  const place = () => {
    const profile = document.querySelector('button[aria-label="Open profile menu"]');
    if (!profile) {
      restoreProfile();
      host.remove();
      return;
    }
    if (currentProfile === profile && host.parentElement === profile) return;

    restoreProfile();
    currentProfile = profile;
    originalProfileStyles = {
      ariaDescription: profile.getAttribute("aria-description"),
      overflow: profile.style.overflow,
      paddingRight: profile.style.paddingRight,
      position: profile.style.position,
    };
    profile.style.position = "relative";
    profile.style.overflow = "hidden";
    profile.style.paddingRight = "48px";
    profile.append(host);

    decoratedChildren = Array.from(profile.children)
      .filter((child) => child !== host)
      .map((child) => ({
        element: child,
        position: child.style.position,
        zIndex: child.style.zIndex,
      }));
    for (const child of decoratedChildren) {
      child.element.style.position = "relative";
      child.element.style.zIndex = "1";
    }
  };

  place();
  const observer = new MutationObserver(place);
  observer.observe(document.body, { childList: true, subtree: true });
  window.__codexionMeterObserver = observer;
  window.__codexionMeterCleanup = () => {
    observer.disconnect();
    restoreProfile();
    host.remove();
  };

  window.__codexionUpdateSanityMeter = (snapshot) => {
    if (!snapshot || typeof snapshot.usedPercent !== "number" || !Number.isFinite(snapshot.usedPercent)) {
      fill.style.width = "0";
      label.textContent = "—";
      host.dataset.level = "unknown";
      currentProfile?.setAttribute("aria-description", "Weekly usage unavailable");
      return;
    }
    const used = Math.max(0, Math.min(100, Math.round(snapshot.usedPercent)));
    const remaining = 100 - used;
    fill.style.width = String(remaining) + "%";
    label.textContent = String(remaining) + "%";
    host.dataset.level = remaining <= 15 ? "high" : remaining <= 40 ? "medium" : "low";
    currentProfile?.setAttribute("aria-description", String(remaining) + "% weekly usage remaining");
  };
  return true;
})()`;

export function createMeterUpdateExpression(snapshot: UsageSnapshot | null): string {
  return `window.__codexionUpdateSanityMeter?.(${JSON.stringify(snapshot)}); true;`;
}
