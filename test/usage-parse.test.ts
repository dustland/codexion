import { describe, expect, it } from "vitest";
import { parseWeeklyUsage } from "../src/usage/parse.js";

describe("parseWeeklyUsage", () => {
  it("selects the weekly window over a shorter secondary window", () => {
    const snapshot = parseWeeklyUsage({
      rate_limit: {
        primary_window: {
          used_percent: 27.4,
          reset_at: 1_800_000_000,
          limit_window_seconds: 604_800,
        },
        secondary_window: {
          used_percent: 88,
          reset_at: 1_700_000_000,
          limit_window_seconds: 18_000,
        },
      },
    });

    expect(snapshot?.usedPercent).toBe(27.4);
    expect(snapshot?.remainingPercent).toBe(72.6);
    expect(snapshot?.resetAt?.getTime()).toBe(1_800_000_000_000);
  });

  it("supports a payload that only exposes remaining_percent", () => {
    const snapshot = parseWeeklyUsage({
      rate_limit: {
        primary_window: {
          remaining_percent: 64,
          limit_window_seconds: 604_800,
        },
      },
    });

    expect(snapshot?.usedPercent).toBe(36);
    expect(snapshot?.remainingPercent).toBe(64);
  });

  it("does not turn an hourly-only payload into a weekly reading", () => {
    expect(
      parseWeeklyUsage({
        rate_limit: {
          primary_window: {
            used_percent: 42,
            limit_window_seconds: 3_600,
          },
        },
      }),
    ).toBeNull();
  });

  it("does not mistake a monthly spend-control limit for a weekly window", () => {
    expect(
      parseWeeklyUsage({
        spend_control: {
          individual_limit: {
            remaining_percent: 64,
            reset_at: "2026-09-01T00:00:00.000Z",
          },
        },
      }),
    ).toBeNull();
  });
});
