import { CodexAppServerClient } from "../app-server/client.js";
import type { CodexionLocalStore } from "./local-store.js";
import type { IssueDispositionRecord, IssueReference } from "./types.js";

interface ThreadStartResponse {
  thread: { id: string };
}

interface TurnStartResponse {
  turn: { id: string };
}

export interface StartedIssueTask {
  reusedThread: boolean;
  threadId: string;
  turnId: string;
}

export interface IssueTaskAppServer {
  close(): void;
  request<T = unknown>(method: string, params: unknown, timeoutMs?: number): Promise<T>;
}

type AppServerFactory = (appPath?: string) => Promise<IssueTaskAppServer>;

export class GithubIssueTaskStarter {
  constructor(
    private readonly store: CodexionLocalStore,
    private readonly appPath?: string,
    private readonly createClient: AppServerFactory = (path) => CodexAppServerClient.create(path),
  ) {}

  async start(issue: IssueReference, workspace: string): Promise<StartedIssueTask> {
    const existing = await this.store.getIssue(issue.id);
    if (existing?.status === "started" || existing?.status === "ignored") {
      throw new Error(`Issue ${issue.repository}#${issue.number} is already ${existing.status}`);
    }

    const now = new Date().toISOString();
    let threadId = existing?.threadId;
    await this.store.putIssue({
      issueId: issue.id,
      issueNumber: issue.number,
      repository: issue.repository,
      status: threadId === undefined ? "creating" : "thread-created",
      updatedAt: now,
      workspace,
      ...(threadId === undefined ? {} : { threadId }),
    });

    const client = await this.createClient(this.appPath);
    try {
      let reusedThread = true;
      if (threadId === undefined) {
        const response = await client.request<ThreadStartResponse>("thread/start", {
          cwd: workspace,
          runtimeWorkspaceRoots: [workspace],
        });
        threadId = response.thread.id;
        reusedThread = false;
        await this.store.putIssue({
          issueId: issue.id,
          issueNumber: issue.number,
          repository: issue.repository,
          status: "thread-created",
          threadId,
          updatedAt: new Date().toISOString(),
          workspace,
        });
      }

      const response = await client.request<TurnStartResponse>("turn/start", {
        input: [
          {
            type: "text",
            text: createIssuePrompt(issue),
            text_elements: [],
          },
        ],
        threadId,
      });
      const record: IssueDispositionRecord = {
        issueId: issue.id,
        issueNumber: issue.number,
        repository: issue.repository,
        status: "started",
        threadId,
        turnId: response.turn.id,
        updatedAt: new Date().toISOString(),
        workspace,
      };
      await this.store.putIssue(record);
      return { reusedThread, threadId, turnId: response.turn.id };
    } finally {
      client.close();
    }
  }
}

export function createIssuePrompt(issue: IssueReference): string {
  return [
    `Fix GitHub issue #${issue.number} in ${issue.repository}.`,
    "",
    `Issue: ${issue.title}`,
    `URL: ${issue.url}`,
    "",
    "Read the issue and repository context, reproduce the problem, implement an appropriate fix, and run the relevant tests. Do not post to GitHub or close the issue without explicit approval.",
  ].join("\n");
}
