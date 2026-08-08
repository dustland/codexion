import { waitForMainRenderer } from "./cdp/discovery.js";
import { CdpSession } from "./cdp/session.js";
import { createMeterUpdateExpression, INSTALL_METER_EXPRESSION } from "./ui/injected-meter.js";
import { parseWeeklyUsage } from "./usage/parse.js";
import type { UsageSnapshot } from "./usage/types.js";

const USAGE_POLL_INTERVAL_MS = 60_000;

interface AttachOptions {
  log?: (message: string) => void;
  timeoutMs?: number;
}

interface FetchUsageResult {
  ok: boolean;
  body?: unknown;
}

export interface AttachedCodexion {
  close(): void;
  refresh(): Promise<UsageSnapshot | null>;
  targetUrl: string;
}

export async function attachToCodex(
  port: number,
  options: AttachOptions = {},
): Promise<AttachedCodexion> {
  const log = options.log ?? (() => undefined);
  const target = await waitForMainRenderer(port, options.timeoutMs);
  const webSocketUrl = target.webSocketDebuggerUrl;
  if (webSocketUrl === undefined) {
    throw new Error("The Codex Desktop renderer did not expose a WebSocket debugger URL");
  }

  const session = await CdpSession.connect(webSocketUrl);
  await session.evaluate(INSTALL_METER_EXPRESSION);

  let closed = false;
  let latestSnapshot: UsageSnapshot | null = null;

  const refresh = async (): Promise<UsageSnapshot | null> => {
    if (closed) {
      return latestSnapshot;
    }

    const result = await session.evaluate<FetchUsageResult>(`
      (async () => {
        try {
          const response = await fetch("/wham/usage", {
            cache: "no-store",
            credentials: "include",
          });
          return { ok: response.ok, body: response.ok ? await response.json() : null };
        } catch {
          return { ok: false, body: null };
        }
      })()
    `);

    latestSnapshot = result.ok ? parseWeeklyUsage(result.body) : null;
    await session.evaluate(createMeterUpdateExpression(latestSnapshot));
    return latestSnapshot;
  };

  await refresh();
  const timer = setInterval(() => {
    void refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`Sanity Meter refresh failed: ${message}`);
    });
  }, USAGE_POLL_INTERVAL_MS);

  log(`Sanity Meter attached to ${target.url}`);

  return {
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(timer);
      session.close();
    },
    refresh,
    targetUrl: target.url,
  };
}
