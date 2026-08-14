import { waitForMainRenderer } from "./cdp/discovery.js";
import { CdpSession } from "./cdp/session.js";
import { createMeterUpdateExpression, INSTALL_METER_EXPRESSION } from "./ui/injected-meter.js";
import {
  type AppServerUsageProvider,
  createAppServerUsageProvider,
} from "./usage/app-server-provider.js";
import type { UsageProvider, UsageSnapshot } from "./usage/types.js";

const USAGE_POLL_INTERVAL_MS = 60_000;

interface AttachOptions {
  appPath?: string;
  log?: (message: string) => void;
  timeoutMs?: number;
  usageProvider?: UsageProvider;
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
  let ownedProvider: AppServerUsageProvider | null = null;
  let usageProvider: UsageProvider;
  if (options.usageProvider === undefined) {
    ownedProvider =
      options.appPath === undefined
        ? await createAppServerUsageProvider()
        : await createAppServerUsageProvider(options.appPath);
    usageProvider = ownedProvider;
  } else {
    usageProvider = options.usageProvider;
  }
  let closed = false;
  let session: CdpSession | null = null;
  let latestSnapshot: UsageSnapshot | null = null;
  let targetUrl = "";

  const connectRenderer = async (): Promise<CdpSession> => {
    session?.close();
    session = null;
    const target = await waitForMainRenderer(port, options.timeoutMs);
    const webSocketUrl = target.webSocketDebuggerUrl;
    if (webSocketUrl === undefined) {
      throw new Error("The Codex Desktop renderer did not expose a WebSocket debugger URL");
    }
    const connected = await CdpSession.connect(webSocketUrl);
    await connected.evaluate(INSTALL_METER_EXPRESSION);
    session = connected;
    targetUrl = target.url;
    log(`Sanity Meter attached to ${target.url}`);
    return connected;
  };

  const updateMeter = async (snapshot: UsageSnapshot | null): Promise<void> => {
    let connected = session ?? (await connectRenderer());
    try {
      await connected.evaluate(createMeterUpdateExpression(snapshot));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Renderer connection lost; reconnecting: ${message}`);
      connected.close();
      session = null;
      connected = await connectRenderer();
      await connected.evaluate(createMeterUpdateExpression(snapshot));
    }
  };

  const refresh = async (): Promise<UsageSnapshot | null> => {
    if (closed) {
      return latestSnapshot;
    }

    try {
      latestSnapshot = await usageProvider.getSnapshot();
    } catch (error) {
      if (ownedProvider === null) throw error;
      const message = error instanceof Error ? error.message : String(error);
      log(`Usage provider failed; restarting: ${message}`);
      ownedProvider.close();
      ownedProvider =
        options.appPath === undefined
          ? await createAppServerUsageProvider()
          : await createAppServerUsageProvider(options.appPath);
      usageProvider = ownedProvider;
      latestSnapshot = await usageProvider.getSnapshot();
    }
    await updateMeter(latestSnapshot);
    return latestSnapshot;
  };

  await connectRenderer();
  await refresh();
  const timer = setInterval(() => {
    void refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`Sanity Meter refresh failed: ${message}`);
    });
  }, USAGE_POLL_INTERVAL_MS);

  return {
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(timer);
      session?.close();
      session = null;
      ownedProvider?.close();
    },
    refresh,
    targetUrl,
  };
}
