import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface GlobalState {
  "active-workspace-roots"?: unknown;
  "electron-saved-workspace-roots"?: unknown;
  "thread-workspace-root-hints"?: unknown;
}

export interface GithubWorkspace {
  path: string;
  repository: string;
}

export async function knownCodexWorkspaceRoots(
  statePath = resolve(homedir(), ".codex", ".codex-global-state.json"),
): Promise<string[]> {
  let state: GlobalState;
  try {
    state = JSON.parse(await readFile(statePath, "utf8")) as GlobalState;
  } catch {
    return [];
  }

  const roots = new Set<string>();
  addStrings(roots, state["electron-saved-workspace-roots"]);
  addStrings(roots, state["active-workspace-roots"]);
  addStrings(roots, state["thread-workspace-root-hints"]);

  return [...roots];
}

export async function discoverGithubWorkspaces(
  roots?: readonly string[],
): Promise<GithubWorkspace[]> {
  const candidates = roots ?? (await knownCodexWorkspaceRoots());
  const workspaces = await Promise.all(
    candidates.map(async (path): Promise<GithubWorkspace | null> => {
      try {
        const { stdout } = await execFileAsync("git", ["-C", path, "remote", "get-url", "origin"], {
          timeout: 3_000,
        });
        const repository = normalizeGithubRemote(stdout.trim());
        return repository === null ? null : { path, repository };
      } catch {
        return null;
      }
    }),
  );
  return workspaces.filter((item): item is GithubWorkspace => item !== null);
}

export function isMacOSProtectedWorkspaceRoot(path: string, home = homedir()): boolean {
  const protectedRoots = ["Desktop", "Documents", "Downloads"].map((directory) =>
    resolve(home, directory),
  );
  return protectedRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

export async function repositoryForWorkspace(path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", path, "remote", "get-url", "origin"], {
      timeout: 3_000,
    });
    return normalizeGithubRemote(stdout.trim());
  } catch {
    return null;
  }
}

export async function workspaceHintForThread(
  threadId: string,
  statePath = resolve(homedir(), ".codex", ".codex-global-state.json"),
): Promise<string | null> {
  try {
    const state = JSON.parse(await readFile(statePath, "utf8")) as GlobalState;
    const hints = state["thread-workspace-root-hints"];
    if (typeof hints !== "object" || hints === null || Array.isArray(hints)) return null;
    const value = (hints as Record<string, unknown>)[threadId.replace(/^local:/, "")];
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function normalizeGithubRemote(remote: string): string | null {
  const trimmed = remote.trim().replace(/\.git$/, "");
  const match = trimmed.match(
    /^(?:git@github\.com:|ssh:\/\/git@github\.com\/|https?:\/\/github\.com\/)([^/]+\/[^/]+)$/i,
  );
  return match?.[1] ?? null;
}

function addStrings(target: Set<string>, value: unknown): void {
  if (typeof value === "string") target.add(value);
  if (Array.isArray(value)) {
    for (const item of value) addStrings(target, item);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) addStrings(target, item);
  }
}
