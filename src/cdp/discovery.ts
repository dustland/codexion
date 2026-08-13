import type { CdpTarget } from "./types.js";

const LOOPBACK_HOST = "127.0.0.1";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_POLL_INTERVAL_MS = 250;

export function validateCdpPort(port: number): number {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid CDP port: ${port}`);
  }

  return port;
}

export function isMainRendererTarget(target: CdpTarget): boolean {
  if (target.type !== "page") {
    return false;
  }

  const targetUrl = target.url.split("?", 1)[0];
  return targetUrl === "app://-/index.html" && isLocalWebSocketUrl(target.webSocketDebuggerUrl);
}

export function isLocalWebSocketUrl(value: string | undefined): value is string {
  if (value === undefined) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "ws:" &&
      url.hostname === LOOPBACK_HOST &&
      url.pathname.startsWith("/devtools/page/")
    );
  } catch {
    return false;
  }
}

export async function fetchTargets(port: number, signal?: AbortSignal): Promise<CdpTarget[]> {
  validateCdpPort(port);
  const requestOptions: RequestInit = {};
  if (signal !== undefined) {
    requestOptions.signal = signal;
  }
  const response = await fetch(`http://${LOOPBACK_HOST}:${port}/json/list`, requestOptions);
  if (!response.ok) {
    throw new Error(`CDP target discovery failed with HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("CDP target discovery returned an invalid payload");
  }

  return payload.filter(isCdpTarget);
}

export async function waitForMainRenderer(
  port: number,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
): Promise<CdpTarget> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const targets = (await fetchTargets(port)).filter(isMainRendererTarget);
      const target =
        targets.find((candidate) => candidate.url === "app://-/index.html") ?? targets[0];
      if (target !== undefined) {
        return target;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const suffix = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`Could not find the Codex Desktop renderer on CDP port ${port}.${suffix}`);
}

function isCdpTarget(value: unknown): value is CdpTarget {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const target = value as Record<string, unknown>;
  return (
    typeof target.id === "string" &&
    typeof target.title === "string" &&
    typeof target.type === "string" &&
    typeof target.url === "string" &&
    (target.webSocketDebuggerUrl === undefined || typeof target.webSocketDebuggerUrl === "string")
  );
}
