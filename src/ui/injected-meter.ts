import type { UsageSnapshot } from "../usage/types.js";

const METER_ID = "codexion-sanity-meter-host";

export const INSTALL_METER_EXPRESSION = `(() => {
  const meterId = ${JSON.stringify(METER_ID)};
  window.__codexionMeterCleanup?.();
  document.getElementById(meterId)?.remove();

  const host = document.createElement("span");
  host.id = meterId;
  host.setAttribute("role", "status");
  host.setAttribute("aria-label", "Weekly usage unavailable");
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = \`
    :host {
      align-items: center;
      color: var(--color-token-text-tertiary, currentColor);
      display: inline-flex;
      flex: none;
      height: 28px;
    }
    .meter {
      align-items: center;
      display: flex;
      gap: 5px;
      height: 28px;
      padding: 0 5px;
    }
    svg {
      height: 15px;
      width: 15px;
    }
    .label {
      font: 550 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
      min-width: 27px;
    }
    :host([data-level="high"]) {
      color: var(--color-token-destructive-foreground, #d45b5b);
    }
  \`;

  const meter = document.createElement("span");
  meter.className = "meter";
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 16 16");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.5");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = '<path d="M2.25 11.75a6 6 0 1 1 11.5 0" stroke-linecap="round"/><path d="m8 8 3-2" stroke-linecap="round"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>';
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "—";
  meter.append(icon, label);
  shadow.append(style, meter);

  const place = () => {
    const labels = ["Toggle pinned summary", "Toggle bottom panel", "Toggle side panel"];
    const candidates = labels.flatMap((label) => Array.from(document.querySelectorAll('button[aria-label="' + label + '"]')));
    const anchor = candidates.find((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.x > window.innerWidth / 2;
    }) || candidates[0];
    const group = anchor?.parentElement;
    if (!group) {
      host.remove();
      return;
    }
    if (host.parentElement === group) return;
    group.insertBefore(host, group.firstChild);
  };

  place();
  const observer = new MutationObserver(place);
  observer.observe(document.body, { childList: true, subtree: true });
  window.__codexionMeterObserver = observer;
  window.__codexionMeterCleanup = () => {
    observer.disconnect();
    host.remove();
  };

  window.__codexionUpdateSanityMeter = (snapshot) => {
    if (!snapshot || typeof snapshot.usedPercent !== "number" || !Number.isFinite(snapshot.usedPercent)) {
      label.textContent = "—";
      host.dataset.level = "unknown";
      host.setAttribute("aria-label", "Weekly usage unavailable");
      return;
    }
    const used = Math.max(0, Math.min(100, Math.round(snapshot.usedPercent)));
    const remaining = 100 - used;
    label.textContent = String(remaining) + "%";
    host.dataset.level = remaining <= 15 ? "high" : remaining <= 40 ? "medium" : "low";
    host.setAttribute("aria-label", String(remaining) + "% weekly usage remaining");
  };
  return true;
})()`;

export function createMeterUpdateExpression(snapshot: UsageSnapshot | null): string {
  return `window.__codexionUpdateSanityMeter?.(${JSON.stringify(snapshot)}); true;`;
}
