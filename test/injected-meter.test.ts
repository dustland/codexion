import { describe, expect, it } from "vitest";
import { createMeterUpdateExpression, INSTALL_METER_EXPRESSION } from "../src/ui/injected-meter.js";

describe("injected sanity meter", () => {
  it("places a compact speedometer before the native title-bar actions", () => {
    expect(INSTALL_METER_EXPRESSION).toContain('"Toggle pinned summary"');
    expect(INSTALL_METER_EXPRESSION).toContain('"Toggle bottom panel"');
    expect(INSTALL_METER_EXPRESSION).toContain("rect.x > window.innerWidth / 2");
    expect(INSTALL_METER_EXPRESSION).toContain("host.nextSibling === issueHost");
    expect(INSTALL_METER_EXPRESSION).toContain('classList?.contains("ms-auto")');
    expect(INSTALL_METER_EXPRESSION).toContain('viewBox", "0 0 20 20"');
    expect(INSTALL_METER_EXPRESSION).toContain("M10.8343 12.0693");
    expect(INSTALL_METER_EXPRESSION).toContain("Weekly usage unavailable");
    expect(INSTALL_METER_EXPRESSION).toContain("Account email unavailable");
    expect(INSTALL_METER_EXPRESSION).toContain('class="key">Resets');
    expect(INSTALL_METER_EXPRESSION).toContain("https://x.com/thsottiaux");
    expect(INSTALL_METER_EXPRESSION).not.toContain("profile.append");
    expect(INSTALL_METER_EXPRESSION).not.toContain("paddingRight");
  });

  it("updates the remaining weekly percentage", () => {
    const expression = createMeterUpdateExpression({
      account: null,
      usedPercent: 17,
      remainingPercent: 83,
      resetAt: null,
      observedAt: new Date("2026-08-14T00:00:00.000Z"),
    });

    expect(expression).toContain('"usedPercent":17');
    expect(expression).toContain("__codexionUpdateSanityMeter");
  });
});
