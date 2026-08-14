export type IssueDisposition = "creating" | "thread-created" | "started" | "ignored";

export interface IssueReference {
  author?: string;
  body: string;
  createdAt?: string;
  id: string;
  number: number;
  repository: string;
  title: string;
  url: string;
}

export interface GithubCliStatus {
  authenticated: boolean;
  installed: boolean;
  login?: string;
  message?: string;
}

export interface GithubRepository {
  description: string | null;
  hasIssuesEnabled: boolean;
  isArchived: boolean;
  isPrivate: boolean;
  nameWithOwner: string;
  pushedAt: string | null;
}

export interface IssueInboxSnapshot {
  github: GithubCliStatus;
  ignoredIssues: IssueDispositionRecord[];
  issues: IssueReference[];
  maxAgeDays: number | null;
  repositories: GithubRepository[];
  selectedRepositories: string[];
  workspaces: Record<string, string>;
}

export interface IssueDispositionRecord {
  issueId: string;
  issueNumber: number;
  repository: string;
  status: IssueDisposition;
  title?: string;
  threadId?: string;
  turnId?: string;
  updatedAt: string;
  url?: string;
  workspace?: string;
}

export interface CodexionConfig {
  issueInbox: {
    maxAgeDays: number | null;
    pollIntervalMinutes: number;
    repositoryWorkspaces: Record<string, string>;
    selectedRepositories: string[];
  };
}

export interface CodexionState {
  issueDispositions: Record<string, IssueDispositionRecord>;
}
