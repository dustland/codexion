import { CodexAppServerClient } from "../app-server/client.js";
import { GithubCli } from "./gh-cli.js";
import { CodexionLocalStore } from "./local-store.js";
import { GithubIssueTaskStarter, type StartedIssueTask } from "./thread-starter.js";
import type { GithubRepository, IssueInboxSnapshot, IssueReference } from "./types.js";
import {
  discoverGithubWorkspaces,
  isMacOSProtectedWorkspaceRoot,
  knownCodexWorkspaceRoots,
  repositoryForWorkspace,
  workspaceHintForThread,
} from "./workspaces.js";

export class GithubIssueInboxService {
  private latestIssues = new Map<string, IssueReference>();
  private repositoryCache: { fetchedAt: number; repositories: GithubRepository[] } | null = null;
  private readonly currentRepositoryCache = new Map<
    string,
    { fetchedAt: number; issues: IssueReference[]; repository: string | null }
  >();
  private workspaceDiscovery: Promise<Record<string, string>> | null = null;

  constructor(
    private readonly store = new CodexionLocalStore(),
    private readonly github = new GithubCli(),
    private readonly starter = new GithubIssueTaskStarter(store),
    private readonly listWorkspaceRoots: () => Promise<string[]> = knownCodexWorkspaceRoots,
    private readonly inspectWorkspaces: (
      roots: readonly string[],
    ) => Promise<Awaited<ReturnType<typeof discoverGithubWorkspaces>>> = discoverGithubWorkspaces,
  ) {}

  async snapshot(includeRepositories = false): Promise<IssueInboxSnapshot> {
    const [config, state, github] = await Promise.all([
      this.store.readConfig(),
      this.store.readState(),
      this.github.status(),
    ]);
    const workspaces = await this.discoverAndRememberWorkspaces();
    let repositories: GithubRepository[] = [];
    let issues: IssueReference[] = [];
    if (github.authenticated && github.login !== undefined) {
      if (includeRepositories) {
        if (
          this.repositoryCache !== null &&
          Date.now() - this.repositoryCache.fetchedAt < 300_000
        ) {
          repositories = this.repositoryCache.repositories;
        } else {
          repositories = await this.github.listRepositories();
          this.repositoryCache = { fetchedAt: Date.now(), repositories };
        }
      }
      if (config.issueInbox.selectedRepositories.length > 0) {
        issues = await this.github.listUnhandledIssues(
          config.issueInbox.selectedRepositories,
          github.login,
        );
      }
    }
    issues = issues.filter((issue) => {
      const status = state.issueDispositions[issue.id]?.status;
      return status !== "started" && status !== "ignored";
    });
    if (config.issueInbox.maxAgeDays !== null) {
      const cutoff = Date.now() - config.issueInbox.maxAgeDays * 24 * 60 * 60 * 1000;
      issues = issues.filter((issue) => {
        const createdAt = issue.createdAt === undefined ? Number.NaN : Date.parse(issue.createdAt);
        return Number.isFinite(createdAt) && createdAt >= cutoff;
      });
    }
    this.latestIssues = new Map(issues.map((issue) => [issue.id, issue]));
    return {
      github,
      ignoredIssues: Object.values(state.issueDispositions)
        .filter((record) => record.status === "ignored")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      issues,
      maxAgeDays: config.issueInbox.maxAgeDays,
      repositories,
      selectedRepositories: config.issueInbox.selectedRepositories,
      workspaces,
    };
  }

  async setSelectedRepositories(repositories: string[]): Promise<void> {
    const config = await this.store.readConfig();
    config.issueInbox.selectedRepositories = [...new Set(repositories)].sort();
    await this.store.writeConfig(config);
  }

  async setMaxAgeDays(maxAgeDays: number | null): Promise<void> {
    if (maxAgeDays !== null && ![3, 7, 14, 30].includes(maxAgeDays)) {
      throw new Error("Unsupported issue age filter");
    }
    const config = await this.store.readConfig();
    config.issueInbox.maxAgeDays = maxAgeDays;
    await this.store.writeConfig(config);
  }

  async currentRepository(threadId: string): Promise<string | null> {
    const normalizedThreadId = threadId.replace(/^local:/, "");
    let workspace = await workspaceHintForThread(normalizedThreadId);
    if (workspace === null) {
      try {
        const client = await CodexAppServerClient.create();
        try {
          const response = await client.request<{ thread?: { cwd?: unknown } }>("thread/read", {
            includeTurns: false,
            threadId: normalizedThreadId,
          });
          workspace = typeof response.thread?.cwd === "string" ? response.thread.cwd : null;
        } finally {
          client.close();
        }
      } catch {
        return null;
      }
    }
    return workspace === null ? null : repositoryForWorkspace(workspace);
  }

  async currentRepositoryIssues(
    threadId: string,
    force = false,
  ): Promise<{ issues: IssueReference[]; repository: string | null }> {
    const cached = this.currentRepositoryCache.get(threadId);
    if (!force && cached !== undefined && Date.now() - cached.fetchedAt < 60_000) {
      for (const issue of cached.issues) this.latestIssues.set(issue.id, issue);
      return { issues: cached.issues, repository: cached.repository };
    }
    const repository = await this.currentRepository(threadId);
    if (repository === null) {
      this.currentRepositoryCache.set(threadId, { fetchedAt: Date.now(), issues: [], repository });
      return { issues: [], repository: null };
    }
    const [state, github] = await Promise.all([this.store.readState(), this.github.status()]);
    if (!github.authenticated || github.login === undefined) return { issues: [], repository };
    let issues = await this.github.listUnhandledIssues([repository], github.login);
    issues = issues.filter((issue) => {
      const status = state.issueDispositions[issue.id]?.status;
      return status !== "started" && status !== "ignored";
    });
    for (const issue of issues) this.latestIssues.set(issue.id, issue);
    this.currentRepositoryCache.set(threadId, { fetchedAt: Date.now(), issues, repository });
    return { issues, repository };
  }

  async setWorkspace(repository: string, workspace: string): Promise<void> {
    const config = await this.store.readConfig();
    config.issueInbox.repositoryWorkspaces[repository] = workspace;
    await this.store.writeConfig(config);
  }

  async rescanWorkspaces(): Promise<void> {
    const config = await this.store.readConfig();
    config.issueInbox.inspectedWorkspaceRoots = [];
    await this.store.writeConfig(config);
    await this.discoverAndRememberWorkspaces(true);
  }

  async ignore(issueId: string): Promise<void> {
    const issue = this.requireIssue(issueId);
    await this.store.putIssue({
      issueId,
      issueNumber: issue.number,
      repository: issue.repository,
      status: "ignored",
      title: issue.title,
      updatedAt: new Date().toISOString(),
      url: issue.url,
    });
    this.latestIssues.delete(issueId);
    this.currentRepositoryCache.clear();
  }

  async unignore(issueId: string): Promise<void> {
    const record = await this.store.getIssue(issueId);
    if (record?.status !== "ignored") throw new Error("Issue is not ignored");
    await this.store.deleteIssue(issueId);
    this.currentRepositoryCache.clear();
  }

  async handle(issueId: string): Promise<StartedIssueTask> {
    const issue = this.requireIssue(issueId);
    const config = await this.store.readConfig();
    const detected = await this.discoverAndRememberWorkspaces();
    const workspace =
      config.issueInbox.repositoryWorkspaces[issue.repository] ?? detected[issue.repository];
    if (workspace === undefined) {
      throw new Error(`No local Codex workspace is mapped to ${issue.repository}`);
    }
    const result = await this.starter.start(issue, workspace);
    this.latestIssues.delete(issueId);
    this.currentRepositoryCache.clear();
    return result;
  }

  private requireIssue(issueId: string): IssueReference {
    const issue = this.latestIssues.get(issueId);
    if (issue === undefined) throw new Error("Issue is no longer in the inbox");
    return issue;
  }

  private async discoverAndRememberWorkspaces(force = false): Promise<Record<string, string>> {
    if (force && this.workspaceDiscovery !== null) await this.workspaceDiscovery;
    if (this.workspaceDiscovery !== null) return this.workspaceDiscovery;
    this.workspaceDiscovery = this.runWorkspaceDiscovery(force);
    try {
      return await this.workspaceDiscovery;
    } finally {
      this.workspaceDiscovery = null;
    }
  }

  private async runWorkspaceDiscovery(force: boolean): Promise<Record<string, string>> {
    const config = await this.store.readConfig();
    const roots = await this.listWorkspaceRoots();
    const knownPaths = new Set(Object.values(config.issueInbox.repositoryWorkspaces));
    const inspected = new Set(config.issueInbox.inspectedWorkspaceRoots);
    const pending = roots.filter(
      (root) =>
        !knownPaths.has(root) &&
        !inspected.has(root) &&
        (force || !isMacOSProtectedWorkspaceRoot(root)),
    );
    if (pending.length === 0) return config.issueInbox.repositoryWorkspaces;

    const discovered = await this.inspectWorkspaces(pending);
    const latestConfig = await this.store.readConfig();
    for (const workspace of discovered) {
      latestConfig.issueInbox.repositoryWorkspaces[workspace.repository] = workspace.path;
    }
    latestConfig.issueInbox.inspectedWorkspaceRoots = [
      ...new Set([...latestConfig.issueInbox.inspectedWorkspaceRoots, ...pending]),
    ].sort();
    await this.store.writeConfig(latestConfig);
    return latestConfig.issueInbox.repositoryWorkspaces;
  }
}
