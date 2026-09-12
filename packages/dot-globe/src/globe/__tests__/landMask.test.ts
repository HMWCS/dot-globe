import { describe, expect, it } from "vitest";
import { getGeographyMask, isLandAt } from "../landMask.js";

describe("generated geography mask", () => {
  it("has deterministic bounded quality tiers", () => {
    expect(getGeographyMask("low").pointCount).toBe(8_192);
    expect(getGeographyMask("medium").pointCount).toBe(18_432);
    expect(getGeographyMask("high").pointCount).toBe(32_768);
  });

  it.each([
    ["North America", -100, 40],
    ["South America", -60, -15],
    ["Africa", 20, 0],
    ["Asia", 100, 40],
    ["Australia", 135, -25],
    ["Greenland", -42, 72],
    ["Madagascar", 47, -20],
    ["Hawaii", -155.5, 19.6],
    ["Antarctica", 0, -80],
  ])("places %s on land", (_label, longitude, latitude) => {
    expect(isLandAt("high", longitude, latitude)).toBe(true);
  });

  it.each([
    ["Pacific Ocean", -140, 0],
    ["Atlantic Ocean", -30, 0],
    ["Indian Ocean", 80, -20],
    ["Southern Ocean", 0, -60],
    ["Lake Michigan", -87, 44],
    ["Caspian Sea", 50, 42],
  ])("places %s on water", (_label, longitude, latitude) => {
    expect(isLandAt("high", longitude, latitude)).toBe(false);
  });

  it("does not mirror Australia or Africa", () => {
    expect(isLandAt("high", 135, -25)).toBe(true);
    expect(isLandAt("high", -135, -25)).toBe(false);
    expect(isLandAt("high", 20, 0)).toBe(true);
    expect(isLandAt("high", -20, 0)).toBe(false);
  });

  it.each(["low", "medium", "high"] as const)(
    "preserves Hawaii at %s quality",
    (quality) => {
      expect(isLandAt(quality, -155.5, 19.6)).toBe(true);
    },
  );
});
