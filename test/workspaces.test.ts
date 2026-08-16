import { describe, expect, it } from "vitest";
import { isMacOSProtectedWorkspaceRoot, normalizeGithubRemote } from "../src/github/workspaces.js";

describe("normalizeGithubRemote", () => {
  it.each([
    ["git@github.com:lyuai/codexion.git", "lyuai/codexion"],
    ["ssh://git@github.com/lyuai/codexion.git", "lyuai/codexion"],
    ["https://github.com/lyuai/codexion.git", "lyuai/codexion"],
  ])("normalizes %s", (remote, expected) => {
    expect(normalizeGithubRemote(remote)).toBe(expected);
  });

  it("rejects non-GitHub remotes", () => {
    expect(normalizeGithubRemote("git@gitlab.com:lyuai/codexion.git")).toBeNull();
  });
});

describe("isMacOSProtectedWorkspaceRoot", () => {
  it("recognizes macOS user-protected folders without touching them", () => {
    expect(isMacOSProtectedWorkspaceRoot("/Users/test/Documents/project", "/Users/test")).toBe(
      true,
    );
    expect(isMacOSProtectedWorkspaceRoot("/Users/test/Desktop", "/Users/test")).toBe(true);
    expect(isMacOSProtectedWorkspaceRoot("/Users/test/src/project", "/Users/test")).toBe(false);
  });
});
