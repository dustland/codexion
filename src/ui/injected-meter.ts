import type { UsageSnapshot } from "../usage/types.js";

const METER_ID = "codexion-sanity-meter-host";

export const INSTALL_METER_EXPRESSION = `(() => {
  const meterId = ${JSON.stringify(METER_ID)};
  const tooltipId = meterId + "-tooltip";
  window.__codexionMeterCleanup?.();
  document.getElementById(meterId)?.remove();
  document.getElementById(tooltipId)?.remove();

  const host = document.createElement("span");
  host.id = meterId;
  host.setAttribute("role", "status");
  host.setAttribute("aria-label", "Weekly usage unavailable");
  host.style.pointerEvents = "auto";

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

  const tooltipHost = document.createElement("span");
  tooltipHost.id = tooltipId;
  tooltipHost.style.inset = "0";
  tooltipHost.style.pointerEvents = "none";
  tooltipHost.style.position = "fixed";
  tooltipHost.style.zIndex = "2147483647";
  const tooltipShadow = tooltipHost.attachShadow({ mode: "open" });
  tooltipShadow.innerHTML = \`<style>
    .tooltip { background:var(--color-background-panel,var(--color-token-bg-primary,#fff)); border:1px solid color-mix(in oklab,currentColor 12%,transparent); border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.18),0 2px 7px rgba(0,0,0,.08); color:var(--color-token-text-primary,#202020); display:none; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:11px 12px; pointer-events:auto; position:fixed; width:240px; }
    .tooltip[data-open="true"] { display:block; }
    .name { font-size:13px; font-weight:620; line-height:18px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .identity { color:var(--color-token-text-secondary,#666); font-size:11px; line-height:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rows { border-top:1px solid color-mix(in oklab,currentColor 9%,transparent); display:grid; gap:7px; margin-top:9px; padding-top:9px; }
    .row { align-items:baseline; display:flex; font-size:12px; gap:12px; justify-content:space-between; }
    .key { color:var(--color-token-text-secondary,#666); }
    .value { font-variant-numeric:tabular-nums; text-align:right; }
    .tibo { align-items:center; border-top:1px solid color-mix(in oklab,currentColor 9%,transparent); color:var(--color-token-text-secondary,#666); display:flex; font-size:11px; justify-content:space-between; margin-top:9px; padding-top:9px; text-decoration:none; }
    .tibo:hover { color:var(--color-token-text-primary,#202020); }
  </style><section class="tooltip" role="tooltip"><div class="name"></div><div class="identity"></div><div class="rows"><div class="row"><span class="key">Remaining</span><span class="value remaining">—</span></div><div class="row"><span class="key">Resets</span><span class="value reset">—</span></div></div><a class="tibo" href="https://x.com/thsottiaux" target="_blank" rel="noreferrer"><span>Tibo on X</span><span>@thsottiaux ↗</span></a></section>\`;
  const tooltip = tooltipShadow.querySelector(".tooltip");
  let latestSnapshot = null;
  let tooltipTimer = null;
  let tooltipHideTimer = null;
  const hideTooltip = () => { clearTimeout(tooltipTimer);clearTimeout(tooltipHideTimer);tooltipTimer=null;tooltipHideTimer=null;tooltip.dataset.open = "false"; };
  const scheduleTooltipHide = () => {
    if (tooltipHideTimer) return;
    tooltipHideTimer=setTimeout(()=>{tooltipHideTimer=null;tooltip.dataset.open="false";},220);
  };
  const showTooltip = () => {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
    if (tooltip.dataset.open === "true" || tooltipTimer) return;
    tooltipTimer = setTimeout(() => {
      tooltipTimer = null;
      const account = latestSnapshot?.account;
      const profile = document.querySelector('button[aria-label="Open profile menu"]');
      const profileName = profile?.innerText?.trim()?.split("\\n")[0];
      const email = account?.email || "Account email unavailable";
      tooltip.querySelector(".name").textContent = profileName || account?.email?.split("@")[0] || "Codex account";
      tooltip.querySelector(".identity").textContent = account?.planType ? email + " · " + account.planType : email;
      tooltip.querySelector(".remaining").textContent = typeof latestSnapshot?.remainingPercent === "number" ? Math.round(latestSnapshot.remainingPercent) + "%" : "—";
      const resetAt = latestSnapshot?.resetAt ? new Date(latestSnapshot.resetAt) : null;
      tooltip.querySelector(".reset").textContent = resetAt && Number.isFinite(resetAt.getTime()) ? new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(resetAt) : "Unavailable";
      const rect = meter.getBoundingClientRect();
      document.body.append(tooltipHost);
      tooltip.dataset.open = "true";
      const tooltipRect = tooltip.getBoundingClientRect();
      const left = Math.max(8, Math.min(innerWidth - tooltipRect.width - 8, rect.right - tooltipRect.width));
      const below = rect.bottom + 7;
      const top = below + tooltipRect.height <= innerHeight - 8 ? below : Math.max(8, rect.top - tooltipRect.height - 7);
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }, 80);
  };
  const containsPoint = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const trackPointer = (event) => {
    const overHost = containsPoint(host.getBoundingClientRect(), event.clientX, event.clientY);
    const overTooltip = tooltip.dataset.open === "true" && containsPoint(tooltip.getBoundingClientRect(), event.clientX, event.clientY);
    if (overHost) showTooltip();
    else if (overTooltip) { clearTimeout(tooltipHideTimer);tooltipHideTimer=null; }
    else scheduleTooltipHide();
  };
  document.addEventListener("pointermove", trackPointer, true);
  tooltip.addEventListener("mouseenter",()=>{clearTimeout(tooltipHideTimer);tooltipHideTimer=null;});
  tooltip.addEventListener("mouseleave",scheduleTooltipHide);
  document.body.append(tooltipHost);

  const place = () => {
    const labels = ["Toggle pinned summary", "Toggle bottom panel", "Toggle side panel"];
    const candidates = labels.flatMap((label) => Array.from(document.querySelectorAll('button[aria-label="' + label + '"]')));
    const anchor = candidates.find((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.x > window.innerWidth / 2;
    }) || candidates[0];
    const localGroup = anchor?.parentElement;
    if (!localGroup) {
      host.remove();
      return;
    }
    let group = localGroup;
    for (let element = localGroup; element && element.parentElement; element = element.parentElement) {
      if (element.classList?.contains("ms-auto")) {
        group = element;
        break;
      }
    }
    const issueHost = document.getElementById("codexion-issue-inbox-host");
    const reference = issueHost?.parentElement === group ? issueHost : group.firstChild;
    if (host.parentElement === group && (reference === host || host.nextSibling === issueHost)) return;
    group.insertBefore(host, reference);
  };

  place();
  const observer = new MutationObserver(place);
  observer.observe(document.body, { childList: true, subtree: true });
  window.__codexionMeterObserver = observer;
  window.__codexionMeterCleanup = () => {
    observer.disconnect();
    document.removeEventListener("pointermove", trackPointer, true);
    hideTooltip();
    host.remove();
    tooltipHost.remove();
  };

  window.__codexionUpdateSanityMeter = (snapshot) => {
    latestSnapshot = snapshot;
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
