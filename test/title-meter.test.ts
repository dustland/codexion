import { describe, expect, it } from "vitest";
import { formatWeeklyMeter } from "../src/ui/title-meter.js";

describe("formatWeeklyMeter", () => {
  it("formats a normal usage percentage", () => {
    expect(formatWeeklyMeter(38.4)).toBe("Weekly 38% used");
  });

  it("bounds values to the usage range", () => {
    expect(formatWeeklyMeter(-10)).toBe("Weekly 0% used");
    expect(formatWeeklyMeter(140)).toBe("Weekly 100% used");
  });

  it("shows an unavailable state when no usage is known", () => {
    expect(formatWeeklyMeter(null)).toBe("Weekly —");
  });
});
