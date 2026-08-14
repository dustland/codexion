export interface AccountIdentity {
  email: string | null;
  planType: string | null;
  type: string;
}

export interface UsageSnapshot {
  account: AccountIdentity | null;
  usedPercent: number;
  remainingPercent: number;
  resetAt: Date | null;
  observedAt: Date;
}

export interface UsageProvider {
  getSnapshot(): Promise<UsageSnapshot | null>;
}
