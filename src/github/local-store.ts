import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { CodexionConfig, CodexionState, IssueDispositionRecord } from "./types.js";

const DATA_DIRECTORY = join(homedir(), "Library", "Application Support", "Codexion");

export const DEFAULT_CONFIG: CodexionConfig = {
  issueInbox: {
    inspectedWorkspaceRoots: [],
    maxAgeDays: 3,
    pollIntervalMinutes: 3,
    repositoryWorkspaces: {},
    selectedRepositories: [],
  },
};

const DEFAULT_STATE: CodexionState = { issueDispositions: {} };

export class CodexionLocalStore {
  readonly configPath: string;
  readonly statePath: string;

  constructor(directory = DATA_DIRECTORY) {
    this.configPath = join(directory, "config.json");
    this.statePath = join(directory, "state.json");
  }

  async readConfig(): Promise<CodexionConfig> {
    const value = await readJson<Partial<CodexionConfig>>(this.configPath, {});
    const inbox = value.issueInbox;
    return {
      issueInbox: {
        inspectedWorkspaceRoots: Array.isArray(inbox?.inspectedWorkspaceRoots)
          ? inbox.inspectedWorkspaceRoots.filter((item): item is string => typeof item === "string")
          : [],
        maxAgeDays:
          inbox?.maxAgeDays === null
            ? null
            : typeof inbox?.maxAgeDays === "number" && [3, 7, 14, 30].includes(inbox.maxAgeDays)
              ? inbox.maxAgeDays
              : DEFAULT_CONFIG.issueInbox.maxAgeDays,
        pollIntervalMinutes:
          typeof inbox?.pollIntervalMinutes === "number"
            ? Math.max(1, Math.min(60, inbox.pollIntervalMinutes))
            : DEFAULT_CONFIG.issueInbox.pollIntervalMinutes,
        repositoryWorkspaces: isStringRecord(inbox?.repositoryWorkspaces)
          ? inbox.repositoryWorkspaces
          : {},
        selectedRepositories: Array.isArray(inbox?.selectedRepositories)
          ? inbox.selectedRepositories.filter((item): item is string => typeof item === "string")
          : [],
      },
    };
  }

  async writeConfig(config: CodexionConfig): Promise<void> {
    await writeJson(this.configPath, config);
  }

  async readState(): Promise<CodexionState> {
    const value = await readJson<Partial<CodexionState>>(this.statePath, DEFAULT_STATE);
    return {
      issueDispositions: isDispositionRecord(value.issueDispositions)
        ? value.issueDispositions
        : {},
    };
  }

  async getIssue(issueId: string): Promise<IssueDispositionRecord | undefined> {
    return (await this.readState()).issueDispositions[issueId];
  }

  async putIssue(record: IssueDispositionRecord): Promise<void> {
    const state = await this.readState();
    state.issueDispositions[record.issueId] = record;
    await writeJson(this.statePath, state);
  }

  async deleteIssue(issueId: string): Promise<void> {
    const state = await this.readState();
    delete state.issueDispositions[issueId];
    await writeJson(this.statePath, state);
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isDispositionRecord(value: unknown): value is Record<string, IssueDispositionRecord> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
