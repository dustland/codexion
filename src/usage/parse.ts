import type { UsageSnapshot } from "./types.js";

const WEEK_IN_SECONDS = 6 * 24 * 60 * 60;

interface UsageWindow {
  path: string;
  usedPercent: number;
  remainingPercent: number;
  resetAt: Date | null;
  windowSeconds: number | null;
}

export function parseWeeklyUsage(payload: unknown): UsageSnapshot | null {
  const windows = collectUsageWindows(payload);
  const weekly = windows
    .filter(
      (window) =>
        isRateLimitWindow(window.path) &&
        (window.windowSeconds === null || window.windowSeconds >= WEEK_IN_SECONDS),
    )
    .sort((left, right) => {
      const pathPriority =
        Number(right.path.endsWith("rateLimits.primary")) -
        Number(left.path.endsWith("rateLimits.primary"));
      if (pathPriority !== 0) return pathPriority;
      if (left.windowSeconds === null) {
        return right.windowSeconds === null ? 0 : -1;
      }
      if (right.windowSeconds === null) {
        return 1;
      }
      return right.windowSeconds - left.windowSeconds;
    })[0];

  if (weekly === undefined) {
    return null;
  }

  return {
    usedPercent: weekly.usedPercent,
    remainingPercent: weekly.remainingPercent,
    resetAt: weekly.resetAt,
    observedAt: new Date(),
  };
}

function collectUsageWindows(payload: unknown): UsageWindow[] {
  const windows: UsageWindow[] = [];
  visit(payload, "", windows);
  return windows;
}

function visit(value: unknown, path: string, windows: UsageWindow[]): void {
  if (typeof value !== "object" || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      visit(item, `${path}[${index}]`, windows);
    });
    return;
  }

  const record = value as Record<string, unknown>;
  const usageWindow = readUsageWindow(record, path);
  if (usageWindow !== null) {
    windows.push(usageWindow);
  }

  for (const [key, child] of Object.entries(record)) {
    visit(child, path === "" ? key : `${path}.${key}`, windows);
  }
}

function readUsageWindow(record: Record<string, unknown>, path: string): UsageWindow | null {
  const usedPercent = asPercent(record.usedPercent ?? record.used_percent);
  const remainingPercent = asPercent(record.remainingPercent ?? record.remaining_percent);
  const explicitSeconds = asNumber(record.limit_window_seconds);
  const windowMinutes = asNumber(record.windowDurationMins);
  const windowSeconds = explicitSeconds ?? (windowMinutes === null ? null : windowMinutes * 60);

  if (usedPercent === null && remainingPercent === null) {
    return null;
  }

  const normalizedUsed = usedPercent ?? 100 - (remainingPercent ?? 100);
  const normalizedRemaining = remainingPercent ?? 100 - normalizedUsed;
  if (!Number.isFinite(normalizedUsed) || !Number.isFinite(normalizedRemaining)) {
    return null;
  }

  return {
    path,
    usedPercent: clampPercent(normalizedUsed),
    remainingPercent: clampPercent(normalizedRemaining),
    resetAt: parseDate(record.resetsAt ?? record.reset_at),
    windowSeconds,
  };
}

function isRateLimitWindow(path: string): boolean {
  return (
    path.endsWith("rate_limit.primary_window") ||
    path.endsWith("rate_limit.secondary_window") ||
    path.endsWith("rateLimits.primary") ||
    path.endsWith("rateLimits.secondary") ||
    path.endsWith(".primary") ||
    path.endsWith(".secondary")
  );
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asPercent(value: unknown): number | null {
  const number = asNumber(value);
  return number === null || number < 0 || number > 100 ? null : number;
}

function parseDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
