import { describe, expect, it } from "vitest";
import { getGeographyMask } from "../landMask.js";
import { createPointGrid } from "../pointGrid.js";

describe("point grid", () => {
  it("creates one unit-sphere position and land attribute per point", () => {
    const grid = createPointGrid("low");
    expect(grid.positions).toHaveLength(grid.pointCount * 3);
    expect(grid.land).toHaveLength(grid.pointCount);

    for (let point = 0; point < grid.pointCount; point += 137) {
      const index = point * 3;
      const radius = Math.hypot(
        grid.positions[index]!,
        grid.positions[index + 1]!,
        grid.positions[index + 2]!,
      );
      expect(radius).toBeCloseTo(1, 5);
      expect([0, 1]).toContain(grid.land[point]);
    }
  });

  it("is deterministic", () => {
    const first = createPointGrid("low");
    const second = createPointGrid("low");
    expect(second.positions).toEqual(first.positions);
    expect(second.land).toEqual(first.land);
  });

  it("appends preserved islands at their exact land coordinates", () => {
    const mask = getGeographyMask("low");
    const grid = createPointGrid("low");

    expect(grid.pointCount).toBe(
      mask.pointCount + mask.preservedIslandPointCount,
    );
    expect(
      grid.land
        .slice(mask.pointCount)
        .every((classification) => classification === 1),
    ).toBe(true);

    const [longitude, latitude] = mask.preservedPoints[0]!;
    const longitudeRadians = (longitude * Math.PI) / 180;
    const latitudeRadians = (latitude * Math.PI) / 180;
    const positionIndex = mask.pointCount * 3;
    expect(grid.positions[positionIndex]).toBeCloseTo(
      Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
      5,
    );
    expect(grid.positions[positionIndex + 1]).toBeCloseTo(
      Math.sin(latitudeRadians),
      5,
    );
    expect(grid.positions[positionIndex + 2]).toBeCloseTo(
      Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
      5,
    );
  });

  it("keeps the antimeridian spacing continuous and poles finite", () => {
    const grid = createPointGrid("low");
    const longitudeBands = 128;
    const latitudeIndex = 32;
    const seamStart = latitudeIndex * longitudeBands * 3;
    const seamEnd = (latitudeIndex * longitudeBands + longitudeBands - 1) * 3;
    const adjacent = (latitudeIndex * longitudeBands + 1) * 3;

    const seamDistance = Math.hypot(
      grid.positions[seamStart]! - grid.positions[seamEnd]!,
      grid.positions[seamStart + 1]! - grid.positions[seamEnd + 1]!,
      grid.positions[seamStart + 2]! - grid.positions[seamEnd + 2]!,
    );
    const adjacentDistance = Math.hypot(
      grid.positions[seamStart]! - grid.positions[adjacent]!,
      grid.positions[seamStart + 1]! - grid.positions[adjacent + 1]!,
      grid.positions[seamStart + 2]! - grid.positions[adjacent + 2]!,
    );

    expect(seamDistance).toBeCloseTo(adjacentDistance, 5);
    expect(grid.positions.every(Number.isFinite)).toBe(true);
    expect(Math.abs(grid.positions[1]!)).toBeLessThan(1);
    expect(Math.abs(grid.positions.at(-2)!)).toBeLessThan(1);
  });
});
