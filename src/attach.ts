import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { waitForMainRenderer } from "./cdp/discovery.js";
import { CdpSession } from "./cdp/session.js";
import { GithubIssueInboxService } from "./github/inbox-service.js";
import { createMeterUpdateExpression, INSTALL_METER_EXPRESSION } from "./ui/injected-meter.js";
import {
  createIssueInboxErrorExpression,
  createIssueInboxUpdateExpression,
  DRAIN_ISSUE_ACTIONS_EXPRESSION,
  INSTALL_ISSUE_INBOX_EXPRESSION,
  type IssueInboxAction,
} from "./ui/issue-inbox.js";
import {
  type AppServerUsageProvider,
  createAppServerUsageProvider,
} from "./usage/app-server-provider.js";
import type { UsageProvider, UsageSnapshot } from "./usage/types.js";

const USAGE_POLL_INTERVAL_MS = 60_000;
const ISSUE_POLL_INTERVAL_MS = 3 * 60_000;
const ACTION_POLL_INTERVAL_MS = 750;
const RENDERER_HEALTH_INTERVAL_MS = 2_000;
const execFile = promisify(execFileCallback);

interface AttachOptions {
  appPath?: string;
  log?: (message: string) => void;
  recoverRenderer?: () => Promise<boolean>;
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
  const issueInbox = new GithubIssueInboxService();
  let actionRunning = false;
  let rendererRecoveryRunning = false;

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
    await connected.evaluate(INSTALL_ISSUE_INBOX_EXPRESSION);
    session = connected;
    targetUrl = target.url;
    log(`Sanity Meter attached to ${target.url}`);
    return connected;
  };

  const updateIssueInbox = async (includeRepositories = false): Promise<void> => {
    const snapshot = await issueInbox.snapshot(includeRepositories);
    let connected = session ?? (await connectRenderer());
    try {
      await connected.evaluate(createIssueInboxUpdateExpression(snapshot, includeRepositories));
      if (includeRepositories) {
        await connected.evaluate(createIssueInboxUpdateExpression(snapshot, false));
      }
    } catch {
      connected.close();
      session = null;
      connected = await connectRenderer();
      await connected.evaluate(createIssueInboxUpdateExpression(snapshot, includeRepositories));
      if (includeRepositories) {
        await connected.evaluate(createIssueInboxUpdateExpression(snapshot, false));
      }
    }
  };

  const handleIssueActions = async (): Promise<void> => {
    if (closed || actionRunning || session === null) return;
    const actions = await session.evaluate<IssueInboxAction[]>(DRAIN_ISSUE_ACTIONS_EXPRESSION);
    if (!Array.isArray(actions) || actions.length === 0) return;
    actionRunning = true;
    let settingsChanged = false;
    try {
      for (const action of actions) {
        if (action.type === "load-settings") await updateIssueInbox(true);
        if (action.type === "refresh") await updateIssueInbox(false);
        if (action.type === "restart-codexion") {
          await execFile("/usr/bin/open", ["-b", "ai.lyu.codexion"]);
          return;
        }
        if (action.type === "resolve-current-repo" && action.threadId !== undefined) {
          const result = await issueInbox.currentRepositoryIssues(action.threadId, action.force);
          await session?.evaluate(
            `window.__codexionSetCurrentRepository?.(${JSON.stringify(action.threadId)}, ${JSON.stringify(result.repository)}, ${JSON.stringify(result.issues)}); true;`,
          );
        }
        if (action.type === "ignore" && action.issueId !== undefined) {
          await issueInbox.ignore(action.issueId);
          await updateIssueInbox(false);
        }
        if (action.type === "unignore" && action.issueId !== undefined) {
          await issueInbox.unignore(action.issueId);
          await session?.evaluate(
            `window.__codexionIssueUnignored?.(${JSON.stringify(action.issueId)}); true;`,
          );
          await updateIssueInbox(false);
        }
        if (action.type === "handle" && action.issueId !== undefined) {
          await issueInbox.handle(action.issueId);
          await updateIssueInbox(false);
        }
        if (action.type === "set-repositories" && action.repositories !== undefined) {
          await issueInbox.setSelectedRepositories(action.repositories);
          settingsChanged = true;
        }
        if (action.type === "set-max-age" && action.maxAgeDays !== undefined) {
          await issueInbox.setMaxAgeDays(action.maxAgeDays);
          settingsChanged = true;
        }
      }
      if (settingsChanged) await updateIssueInbox(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Issue Inbox action failed: ${message}`);
      await session?.evaluate(createIssueInboxErrorExpression(message));
    } finally {
      actionRunning = false;
    }
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

  const recoverRenderer = async (): Promise<void> => {
    if (closed || rendererRecoveryRunning) return;
    rendererRecoveryRunning = true;
    try {
      if (session !== null) {
        try {
          await session.evaluate("true");
          return;
        } catch {
          session.close();
          session = null;
          log("Codex renderer disconnected; waiting for its replacement");
        }
      }
      if (options.recoverRenderer && !(await options.recoverRenderer())) return;
      const connected = await connectRenderer();
      if (latestSnapshot !== null) {
        await connected.evaluate(createMeterUpdateExpression(latestSnapshot));
      }
      const issueSnapshot = await issueInbox.snapshot(false);
      await connected.evaluate(createIssueInboxUpdateExpression(issueSnapshot, false));
      log("Codexion features restored after Codex restarted");
    } catch (error) {
      log(`Renderer recovery pending: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      rendererRecoveryRunning = false;
    }
  };

  await connectRenderer();
  const actionTimer = setInterval(() => {
    void handleIssueActions().catch((error: unknown) => {
      log(
        `Issue Inbox action polling failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }, ACTION_POLL_INTERVAL_MS);
  const initialIssueInbox = updateIssueInbox(true).catch((error: unknown) => {
    log(`Issue Inbox refresh failed: ${error instanceof Error ? error.message : String(error)}`);
  });
  await refresh();
  await initialIssueInbox;
  const timer = setInterval(() => {
    void refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`Sanity Meter refresh failed: ${message}`);
    });
  }, USAGE_POLL_INTERVAL_MS);
  const issueTimer = setInterval(() => {
    void updateIssueInbox(false).catch((error: unknown) => {
      log(`Issue Inbox refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, ISSUE_POLL_INTERVAL_MS);
  const rendererHealthTimer = setInterval(() => {
    void recoverRenderer();
  }, RENDERER_HEALTH_INTERVAL_MS);
  return {
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(timer);
      clearInterval(issueTimer);
      clearInterval(actionTimer);
      clearInterval(rendererHealthTimer);
      session?.close();
      session = null;
      ownedProvider?.close();
    },
    refresh,
    targetUrl,
  };
}
