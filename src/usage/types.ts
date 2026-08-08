export interface UsageSnapshot {
  usedPercent: number;
  remainingPercent: number;
  resetAt: Date | null;
  observedAt: Date;
}

export interface UsageProvider {
  getSnapshot(): Promise<UsageSnapshot | null>;
}
