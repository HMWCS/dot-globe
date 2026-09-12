import { describe, expect, it } from "vitest";
import {
  latitudeForRow,
  longitudeForPoint,
  nearestLatitudeIndex,
  nearestLongitudeIndex,
} from "../gridCoordinates.js";

describe("staggered grid coordinates", () => {
  it("offsets every second latitude row by half a longitude cell", () => {
    const longitudeBands = 128;
    const cellWidth = 360 / longitudeBands;

    expect(
      longitudeForPoint(1, 0, longitudeBands) -
        longitudeForPoint(0, 0, longitudeBands),
    ).toBeCloseTo(cellWidth / 2, 8);
  });

  it("round-trips every point index across the antimeridian", () => {
    const latitudeBands = 64;
    const longitudeBands = 128;

    for (
      let latitudeIndex = 0;
      latitudeIndex < latitudeBands;
      latitudeIndex += 7
    ) {
      const latitude = latitudeForRow(latitudeIndex, latitudeBands);
      expect(nearestLatitudeIndex(latitude, latitudeBands)).toBe(latitudeIndex);

      for (
        let longitudeIndex = 0;
        longitudeIndex < longitudeBands;
        longitudeIndex += 13
      ) {
        const longitude = longitudeForPoint(
          latitudeIndex,
          longitudeIndex,
          longitudeBands,
        );
        expect(
          nearestLongitudeIndex(longitude, latitudeIndex, longitudeBands),
        ).toBe(longitudeIndex);
      }
    }
  });
});
