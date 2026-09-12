import { describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import { createIslandVisibility } from "../islandVisibility.js";

const identity = new Matrix4().elements;

function fixture(baseLand = 1, baseZ = 1) {
  return {
    basePointCount: 1,
    positions: new Float32Array([0, 0, baseZ, 0.01, 0, 1, 0.08, 0, 1]),
    land: new Float32Array([baseLand, 1, 1]),
    pointCount: 3,
  };
}

describe("island visibility at display resolution", () => {
  it("keeps isolated islands and suppresses an overlapping supplemental glyph", () => {
    const grid = fixture();
    const positions = grid.positions.slice();
    const visibility = createIslandVisibility(grid);
    visibility.update(identity, identity, 100, 100, 2.4);
    expect([...visibility.values]).toEqual([1, 0, 1]);
    expect(grid.positions).toEqual(positions);
    expect([...grid.land]).toEqual([1, 1, 1]);
  });

  it("reveals the original samples when the display grows or dots shrink", () => {
    const visibility = createIslandVisibility(fixture());
    visibility.update(identity, identity, 100, 100, 2.4);
    visibility.update(identity, identity, 1000, 1000, 2.4);
    expect([...visibility.values]).toEqual([1, 1, 1]);
    visibility.update(identity, identity, 100, 100, 0.5);
    expect([...visibility.values]).toEqual([1, 1, 1]);
  });

  it("does not let an ocean sample or a back-facing sample hide a front island", () => {
    for (const grid of [fixture(0), fixture(1, -1)]) {
      const visibility = createIslandVisibility(grid);
      visibility.update(identity, identity, 100, 100, 2.4);
      expect([...visibility.values]).toEqual([1, 1, 1]);
    }
  });

  it("chooses supplemental points deterministically without changing their coordinates", () => {
    const grid = fixture(0);
    grid.positions[6] = 0.02;
    const visibility = createIslandVisibility(grid);
    visibility.update(identity, identity, 100, 100, 2.4);
    expect([...visibility.values]).toEqual([1, 1, 0]);
    expect(visibility.update(identity, identity, 100, 100, 2.4)).toBe(false);
  });
});
