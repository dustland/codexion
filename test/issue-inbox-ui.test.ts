import { describe, expect, it } from "vitest";
import {
  createIssueInboxUpdateExpression,
  INSTALL_ISSUE_INBOX_EXPRESSION,
} from "../src/ui/issue-inbox.js";

describe("Issue Inbox UI", () => {
  it("uses semantic native anchors and exposes reversible actions", () => {
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('"Toggle pinned summary"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('"Toggle bottom panel"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("meterHost.nextSibling");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('nav[aria-label="Settings"]');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("codexion-settings-nav");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("codexion-issue-inbox-overlay");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("--color-background-panel");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("document.body.append(overlayHost)");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("openCodexionSettings");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("handleSettingsNavigation");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("nativePreviousButton");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("__codexionIssueInboxCleanup");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('type:"handle"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('type:"ignore"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("View on GitHub");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('class="header-title"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("<span>Issues</span>");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("--color-token-text-tertiary");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("Current repo");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("Older issues");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("in the last ");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('type:"resolve-current-repo"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("__codexionSetCurrentRepository");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("prefetchCurrentRepository");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("currentRepositoryFetchedAt");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).not.toContain('class="hovercard"');
  });

  it("serializes issue content instead of interpolating executable source", () => {
    const expression = createIssueInboxUpdateExpression({
      github: { installed: true, authenticated: true, login: "hugh" },
      ignoredIssues: [],
      issues: [
        {
          body: "</script>; window.bad = true",
          id: "I_1",
          number: 1,
          repository: "owner/repo",
          title: 'Quoted "title"',
          url: "https://github.com/owner/repo/issues/1",
        },
      ],
      maxAgeDays: 3,
      repositories: [],
      selectedRepositories: ["owner/repo"],
      workspaces: {},
    });
    expect(expression).toContain(JSON.stringify("</script>; window.bad = true"));
    expect(expression).toContain("__codexionUpdateIssueInbox");
  });

  it("supports immediate repository changes and reversible ignores", () => {
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('type:"set-repositories"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('type:"unignore"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('type:"set-max-age"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("Ignored Issues");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("Issue window");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('role="listbox"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain("data-codexion-age-option");
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).not.toContain('<select class="cx-age"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('class="cx-filter-wrap"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('class="cx-card"><div class="cx-filter-wrap"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).toContain('stroke="currentColor"');
    expect(INSTALL_ISSUE_INBOX_EXPRESSION).not.toContain("Save repositories");
  });
});
