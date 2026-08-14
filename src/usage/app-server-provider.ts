import { CodexAppServerClient } from "../app-server/client.js";
import { parseAccountIdentity } from "./account.js";
import { parseWeeklyUsage } from "./parse.js";
import type { UsageProvider, UsageSnapshot } from "./types.js";

export interface AppServerUsageProvider extends UsageProvider {
  close(): void;
}

export async function createAppServerUsageProvider(
  appPath = process.env.CODEXION_APP_PATH ?? "/Applications/ChatGPT.app",
): Promise<AppServerUsageProvider> {
  const client = await CodexAppServerClient.create(appPath);
  return new AppServerUsageClient(client);
}

class AppServerUsageClient implements AppServerUsageProvider {
  constructor(private readonly client: CodexAppServerClient) {}

  async getSnapshot(): Promise<UsageSnapshot | null> {
    const response = await this.client.request("account/rateLimits/read", null);
    const snapshot = parseWeeklyUsage(response);
    if (snapshot === null) return null;

    try {
      const account = parseAccountIdentity(
        await this.client.request("account/read", { refreshToken: false }),
      );
      return { ...snapshot, account };
    } catch {
      return snapshot;
    }
  }

  close(): void {
    this.client.close();
  }
}
