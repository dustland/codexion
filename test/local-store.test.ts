import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GithubCli } from "../src/github/gh-cli.js";
import { GithubIssueInboxService } from "../src/github/inbox-service.js";
import { CodexionLocalStore } from "../src/github/local-store.js";

describe("CodexionLocalStore", () => {
  it("removes an ignored issue so it can return to the inbox", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-store-"));
    const store = new CodexionLocalStore(directory);
    await store.putIssue({
      issueId: "I_ignored",
      issueNumber: 7,
      repository: "owner/repo",
      status: "ignored",
      title: "Come back later",
      updatedAt: new Date().toISOString(),
    });

    await new GithubIssueInboxService(store).unignore("I_ignored");

    expect(await store.getIssue("I_ignored")).toBeUndefined();
  });

  it("defaults the inbox age filter to three days", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-store-"));
    const config = await new CodexionLocalStore(directory).readConfig();
    expect(config.issueInbox.maxAgeDays).toBe(3);
  });

  it("caches the repository catalog used by settings", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-store-"));
    const store = new CodexionLocalStore(directory);
    let repositoryRequests = 0;
    const github = new GithubCli(async (arguments_) => {
      if (arguments_[0] === "--version" || arguments_[0] === "auth") return "";
      if (arguments_[0] === "api" && arguments_[1] === "user") return "hugh";
      if (arguments_[0] === "api" && arguments_[1] === "--paginate") {
        repositoryRequests += 1;
        return "[[]]";
      }
      throw new Error(`Unexpected gh command: ${arguments_.join(" ")}`);
    });
    const service = new GithubIssueInboxService(store, github);

    await service.snapshot(true);
    await service.snapshot(true);

    expect(repositoryRequests).toBe(1);
  });

  it("does not repeatedly inspect the same workspace roots", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-store-"));
    const store = new CodexionLocalStore(directory);
    const github = new GithubCli(async (arguments_) => {
      if (arguments_[0] === "--version" || arguments_[0] === "auth") return "";
      if (arguments_[0] === "api" && arguments_[1] === "user") return "hugh";
      throw new Error(`Unexpected gh command: ${arguments_.join(" ")}`);
    });
    let inspections = 0;
    const service = new GithubIssueInboxService(
      store,
      github,
      undefined,
      async () => ["/tmp/workspace"],
      async () => {
        inspections += 1;
        return [];
      },
    );

    await service.snapshot();
    await service.snapshot();

    expect(inspections).toBe(1);
    expect((await store.readConfig()).issueInbox.inspectedWorkspaceRoots).toEqual([
      "/tmp/workspace",
    ]);

    await service.rescanWorkspaces();
    expect(inspections).toBe(2);
  });

  it("defers protected workspace inspection until an explicit rescan", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codexion-store-"));
    const store = new CodexionLocalStore(directory);
    let inspections = 0;
    const service = new GithubIssueInboxService(
      store,
      new GithubCli(async () => {
        throw new Error("gh should not be needed");
      }),
      undefined,
      async () => [join(process.env.HOME ?? "/Users/test", "Documents", "workspace")],
      async () => {
        inspections += 1;
        return [];
      },
    );

    await service.snapshot();
    expect(inspections).toBe(0);

    await service.rescanWorkspaces();
    expect(inspections).toBe(1);
  });
});
