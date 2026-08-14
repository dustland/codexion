import type { UsageSnapshot } from "../usage/types.js";

const METER_ID = "codexion-sanity-meter-host";

export const INSTALL_METER_EXPRESSION = `(() => {
  const meterId = ${JSON.stringify(METER_ID)};
  window.__codexionMeterObserver?.disconnect();
  document.getElementById(meterId)?.remove();

  const host = document.createElement("div");
  host.id = meterId;
  host.style.display = "none";
  host.style.flex = "0 0 auto";
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = \`
    :host {
      color: inherit;
      display: inline-flex;
      height: 28px;
    }
    .meter {
      align-items: center;
      display: inline-flex;
      font: 500 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      height: 28px;
      opacity: .58;
      padding: 0 5px;
      white-space: nowrap;
    }
    .meter[data-level="medium"] { opacity: .78; }
    .meter[data-level="high"] {
      color: var(--color-token-destructive-foreground, #d45b5b);
      opacity: 1;
    }
    @media (max-width: 900px) {
      :host { display: none !important; }
    }
  \`;

  const meter = document.createElement("div");
  meter.className = "meter";
  meter.dataset.level = "unknown";
  meter.innerHTML = '<span class="label">Weekly —</span>';
  shadow.append(style, meter);
  document.documentElement.append(host);

  const findActionGroup = () => {
    const anchor = document.querySelector('button[aria-label="Toggle pinned summary"]');
    let candidate = anchor?.parentElement ?? null;
    while (candidate && candidate !== document.body) {
      if (candidate.classList.contains("ms-auto") && candidate.classList.contains("items-center")) {
        return candidate;
      }
      candidate = candidate.parentElement;
    }
    return null;
  };

  const place = () => {
    const group = findActionGroup();
    if (!group) {
      host.style.display = "none";
      return;
    }
    if (host.parentElement !== group) group.prepend(host);
    host.style.display = "inline-flex";
  };

  place();
  const observer = new MutationObserver(place);
  observer.observe(document.body, { childList: true, subtree: true });
  window.__codexionMeterObserver = observer;

  window.__codexionUpdateSanityMeter = (snapshot) => {
    const label = meter.querySelector(".label");
    if (!label) return;
    if (!snapshot || typeof snapshot.usedPercent !== "number" || !Number.isFinite(snapshot.usedPercent)) {
      label.textContent = "Weekly —";
      meter.dataset.level = "unknown";
      return;
    }
    const used = Math.max(0, Math.min(100, Math.round(snapshot.usedPercent)));
    label.textContent = \`Weekly \${used}%\`;
    meter.dataset.level = used >= 85 ? "high" : used >= 60 ? "medium" : "low";
    const reset = snapshot.resetAt ? new Date(snapshot.resetAt) : null;
    const updated = snapshot.observedAt ? new Date(snapshot.observedAt) : null;
    const details = [];
    if (reset && !Number.isNaN(reset.getTime())) details.push(\`Resets \${reset.toLocaleString()}\`);
    if (updated && !Number.isNaN(updated.getTime())) details.push(\`Updated \${updated.toLocaleTimeString()}\`);
    meter.title = details.join(" · ");
  };
  return true;
})()`;

export function createMeterUpdateExpression(snapshot: UsageSnapshot | null): string {
  return `window.__codexionUpdateSanityMeter?.(${JSON.stringify(snapshot)}); true;`;
}
