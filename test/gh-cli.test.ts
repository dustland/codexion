import { describe, expect, it } from "vitest";
import { GithubCli } from "../src/github/gh-cli.js";

describe("GithubCli", () => {
  it("filters issues authored or commented on by the viewer", async () => {
    const cli = new GithubCli(async (arguments_) => {
      if (arguments_[0] !== "issue") throw new Error("unexpected command");
      return JSON.stringify([
        issue("new", 1, "someone", []),
        issue("own", 2, "hugh", []),
        issue("replied", 3, "someone", [{ author: { login: "Hugh" } }]),
      ]);
    });

    const result = await cli.listUnhandledIssues(["owner/repo"], "hugh");

    expect(result.map((item) => item.number)).toEqual([1]);
  });

  it("reports a missing gh executable without throwing", async () => {
    const cli = new GithubCli(async () => {
      throw new Error("spawn gh ENOENT");
    });
    expect(await cli.status()).toMatchObject({ installed: false, authenticated: false });
  });
});

function issue(title: string, number: number, login: string, comments: unknown[]) {
  return {
    author: { login },
    body: "Body",
    comments,
    createdAt: `2026-08-${String(number).padStart(2, "0")}T00:00:00Z`,
    id: `issue-${number}`,
    number,
    title,
    url: `https://github.com/owner/repo/issues/${number}`,
  };
}
