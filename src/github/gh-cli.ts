import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { promisify } from "node:util";
import type { GithubCliStatus, GithubRepository, IssueReference } from "./types.js";

const execFileAsync = promisify(execFile);

interface GhAuthor {
  login?: unknown;
}

interface GhComment {
  author?: GhAuthor | null;
}

interface GhIssue {
  author?: GhAuthor | null;
  body?: unknown;
  comments?: unknown;
  createdAt?: unknown;
  id?: unknown;
  number?: unknown;
  title?: unknown;
  url?: unknown;
}

type CommandRunner = (arguments_: string[]) => Promise<string>;

export class GithubCli {
  constructor(private readonly run: CommandRunner = runGh) {}

  async status(): Promise<GithubCliStatus> {
    try {
      await this.run(["--version"]);
    } catch (error) {
      return { installed: false, authenticated: false, message: errorMessage(error) };
    }
    try {
      await this.run(["auth", "status", "--hostname", "github.com"]);
      const login = (await this.run(["api", "user", "--jq", ".login"])).trim();
      return { installed: true, authenticated: true, ...(login ? { login } : {}) };
    } catch (error) {
      return { installed: true, authenticated: false, message: errorMessage(error) };
    }
  }

  async listRepositories(): Promise<GithubRepository[]> {
    const output = await this.run([
      "api",
      "--paginate",
      "--slurp",
      "user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=pushed",
    ]);
    const pages = JSON.parse(output) as unknown;
    const items = Array.isArray(pages)
      ? pages.flatMap((page) => (Array.isArray(page) ? page : []))
      : [];
    return items
      .map(parseRepository)
      .filter((item): item is GithubRepository => item !== null)
      .sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
  }

  async listUnhandledIssues(
    repositories: string[],
    viewerLogin: string,
  ): Promise<IssueReference[]> {
    const results = await Promise.all(
      repositories.map(async (repository) => {
        validateRepository(repository);
        const output = await this.run([
          "issue",
          "list",
          "--repo",
          repository,
          "--state",
          "open",
          "--limit",
          "50",
          "--json",
          "id,number,title,body,url,author,comments,createdAt",
        ]);
        const issues = JSON.parse(output) as unknown;
        if (!Array.isArray(issues)) return [];
        return issues
          .map((issue) => parseIssue(issue, repository, viewerLogin))
          .filter((issue): issue is IssueReference => issue !== null);
      }),
    );
    return results.flat().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
}

async function runGh(arguments_: string[]): Promise<string> {
  const { stdout } = await execFileAsync(resolveGhExecutable(), arguments_, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 30_000,
  });
  return stdout;
}

export function resolveGhExecutable(
  configured = process.env.CODEXION_GH_PATH,
  path = process.env.PATH,
): string {
  if (configured) return configured;
  const candidates = [
    ...(path ?? "")
      .split(":")
      .filter(Boolean)
      .map((directory) => `${directory}/gh`),
    "/opt/homebrew/bin/gh",
    "/usr/local/bin/gh",
  ];
  for (const candidate of new Set(candidates)) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue to the next conventional CLI location.
    }
  }
  return "gh";
}

function parseRepository(value: unknown): GithubRepository | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.full_name !== "string") return null;
  return {
    description: typeof item.description === "string" ? item.description : null,
    hasIssuesEnabled: item.has_issues === true,
    isArchived: item.archived === true,
    isPrivate: item.private === true,
    nameWithOwner: item.full_name,
    pushedAt: typeof item.pushed_at === "string" ? item.pushed_at : null,
  };
}

function parseIssue(
  value: unknown,
  repository: string,
  viewerLogin: string,
): IssueReference | null {
  if (typeof value !== "object" || value === null) return null;
  const issue = value as GhIssue;
  if (
    typeof issue.id !== "string" ||
    typeof issue.number !== "number" ||
    typeof issue.title !== "string" ||
    typeof issue.url !== "string"
  ) {
    return null;
  }
  const author = typeof issue.author?.login === "string" ? issue.author.login : undefined;
  if (author?.toLowerCase() === viewerLogin.toLowerCase()) return null;
  if (
    Array.isArray(issue.comments) &&
    issue.comments.some(
      (comment: GhComment) =>
        typeof comment.author?.login === "string" &&
        comment.author.login.toLowerCase() === viewerLogin.toLowerCase(),
    )
  ) {
    return null;
  }
  return {
    ...(author === undefined ? {} : { author }),
    body: typeof issue.body === "string" ? issue.body : "",
    ...(typeof issue.createdAt === "string" ? { createdAt: issue.createdAt } : {}),
    id: issue.id,
    number: issue.number,
    repository,
    title: issue.title,
    url: issue.url,
  };
}

function validateRepository(repository: string): void {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
