import type { UsageSnapshot } from "../usage/types.js";

const METER_ID = "codexion-sanity-meter-host";

export const INSTALL_METER_EXPRESSION = `(() => {
  const meterId = ${JSON.stringify(METER_ID)};
  if (document.getElementById(meterId)) {
    return true;
  }

  const host = document.createElement("div");
  host.id = meterId;
  host.style.position = "fixed";
  host.style.top = "8px";
  host.style.left = "50%";
  host.style.transform = "translateX(-50%)";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = \`
    :host { color-scheme: dark; }
    .meter {
      align-items: center;
      background: color-mix(in srgb, #171717 92%, transparent);
      border: 1px solid color-mix(in srgb, #f0b24b 55%, transparent);
      border-radius: 999px;
      box-shadow: 0 4px 18px rgb(0 0 0 / 24%);
      color: #f8e7c3;
      display: inline-flex;
      font: 600 11px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      gap: 6px;
      letter-spacing: .02em;
      padding: 4px 9px;
      white-space: nowrap;
    }
    .dot {
      background: #f0b24b;
      border-radius: 50%;
      box-shadow: 0 0 7px rgb(240 178 75 / 70%);
      height: 6px;
      width: 6px;
    }
    .meter[data-level="high"] { border-color: #e97070; color: #ffd1d1; }
    .meter[data-level="high"] .dot { background: #e97070; box-shadow: 0 0 7px rgb(233 112 112 / 70%); }
    .meter[data-level="medium"] { border-color: #e5a64f; }
    .meter[data-level="low"] { border-color: #76c58a; color: #d7f2dd; }
    .meter[data-level="low"] .dot { background: #76c58a; box-shadow: 0 0 7px rgb(118 197 138 / 70%); }
  \`;

  const meter = document.createElement("div");
  meter.className = "meter";
  meter.dataset.level = "unknown";
  meter.innerHTML = '<span class="dot"></span><span class="label">WEEKLY —</span>';
  shadow.append(style, meter);
  document.documentElement.append(host);

  window.__codexionUpdateSanityMeter = (snapshot) => {
    const label = meter.querySelector(".label");
    if (!label) return;
    if (!snapshot || typeof snapshot.usedPercent !== "number" || !Number.isFinite(snapshot.usedPercent)) {
      label.textContent = "WEEKLY —";
      meter.dataset.level = "unknown";
      return;
    }
    const used = Math.max(0, Math.min(100, Math.round(snapshot.usedPercent)));
    label.textContent = \`WEEKLY \${used}% USED\`;
    meter.dataset.level = used >= 85 ? "high" : used >= 60 ? "medium" : "low";
    const reset = snapshot.resetAt ? new Date(snapshot.resetAt) : null;
    meter.title = reset && !Number.isNaN(reset.getTime()) ? \`Resets \${reset.toLocaleString()}\` : "";
  };
  return true;
})()`;

export function createMeterUpdateExpression(snapshot: UsageSnapshot | null): string {
  return `window.__codexionUpdateSanityMeter?.(${JSON.stringify(snapshot)}); true;`;
}
