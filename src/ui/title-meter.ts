export function formatWeeklyMeter(usedPercent: number | null): string {
  if (usedPercent === null || !Number.isFinite(usedPercent)) {
    return "Weekly —";
  }

  const boundedPercent = Math.min(100, Math.max(0, Math.round(usedPercent)));
  return `Weekly ${boundedPercent}% used`;
}
