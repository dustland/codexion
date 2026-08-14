import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CodexionLocalStore } from "../src/github/local-store.js";
import { GithubIssueTaskStarter, type IssueTaskAppServer } from "../src/github/thread-starter.js";
import type { IssueReference } from "../src/github/types.js";

const issue: IssueReference = {
  body: "Details",
  id: "I_kwDO-test",
  number: 42,
  repository: "lyuai/codexion",
  title: "Avoid duplicate work",
  url: "https://github.com/lyuai/codexion/issues/42",
};

describe("GithubIssueTaskStarter", () => {
  it("persists the thread before starting its first turn", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-test-"));
    const store = new CodexionLocalStore(directory);
    const calls: string[] = [];
    const client: IssueTaskAppServer = {
      close: () => undefined,
      request: async <T>(method: string): Promise<T> => {
        calls.push(method);
        if (method === "thread/start") return { thread: { id: "thread-1" } } as T;
        const state = JSON.parse(await readFile(store.statePath, "utf8"));
        expect(state.issueDispositions[issue.id].threadId).toBe("thread-1");
        return { turn: { id: "turn-1" } } as T;
      },
    };

    const result = await new GithubIssueTaskStarter(store, undefined, async () => client).start(
      issue,
      "/workspace",
    );

    expect(calls).toEqual(["thread/start", "turn/start"]);
    expect(result).toEqual({ reusedThread: false, threadId: "thread-1", turnId: "turn-1" });
    expect((await store.getIssue(issue.id))?.status).toBe("started");
  });

  it("reuses a recorded thread after an interrupted first turn", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-test-"));
    const store = new CodexionLocalStore(directory);
    await store.putIssue({
      issueId: issue.id,
      issueNumber: issue.number,
      repository: issue.repository,
      status: "thread-created",
      threadId: "thread-existing",
      updatedAt: new Date().toISOString(),
      workspace: "/workspace",
    });
    const calls: string[] = [];
    const client: IssueTaskAppServer = {
      close: () => undefined,
      request: async <T>(method: string): Promise<T> => {
        calls.push(method);
        return { turn: { id: "turn-2" } } as T;
      },
    };

    const result = await new GithubIssueTaskStarter(store, undefined, async () => client).start(
      issue,
      "/workspace",
    );

    expect(calls).toEqual(["turn/start"]);
    expect(result.threadId).toBe("thread-existing");
    expect(result.reusedThread).toBe(true);
  });
});
