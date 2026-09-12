import { describe, expect, it } from "vitest";
import { resolvePointColor } from "../dotGlobeTheme.js";

describe("dot globe theme", () => {
  it("provides a point color for each theme", () => {
    expect(resolvePointColor("light", undefined)).toBe("#7382a3");
    expect(resolvePointColor("dark", undefined)).toBe("#b7c5e5");
  });

  it("lets an explicit point color override the theme", () => {
    expect(resolvePointColor("dark", "#ffffff")).toBe("#ffffff");
  });
});
