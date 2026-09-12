import type { DotGlobeQuality } from "./dotGlobeTypes.js";
import { latitudeForRow, longitudeForPoint } from "./gridCoordinates.js";
import { getGeographyMask, isLandIndex } from "./landMask.js";

export interface PointGrid {
  basePointCount: number;
  land: Float32Array;
  pointCount: number;
  positions: Float32Array;
}

/** Builds the deterministic latitude-longitude point grid used by the renderer. */
export function createPointGrid(quality: DotGlobeQuality): PointGrid {
  const mask = getGeographyMask(quality);
  const pointCount = mask.pointCount + mask.preservedPoints.length;
  const positions = new Float32Array(pointCount * 3);
  const land = new Float32Array(pointCount);

  for (
    let latitudeIndex = 0;
    latitudeIndex < mask.latitudeBands;
    latitudeIndex += 1
  ) {
    const latitude = latitudeForRow(latitudeIndex, mask.latitudeBands);
    const latitudeRadians = (latitude * Math.PI) / 180;
    const latitudeRadius = Math.cos(latitudeRadians);
    const y = Math.sin(latitudeRadians);

    for (
      let longitudeIndex = 0;
      longitudeIndex < mask.longitudeBands;
      longitudeIndex += 1
    ) {
      const longitude = longitudeForPoint(
        latitudeIndex,
        longitudeIndex,
        mask.longitudeBands,
      );
      const longitudeRadians = (longitude * Math.PI) / 180;
      const pointIndex = latitudeIndex * mask.longitudeBands + longitudeIndex;
      const positionIndex = pointIndex * 3;

      positions[positionIndex] = latitudeRadius * Math.sin(longitudeRadians);
      positions[positionIndex + 1] = y;
      positions[positionIndex + 2] =
        latitudeRadius * Math.cos(longitudeRadians);
      land[pointIndex] = isLandIndex(quality, pointIndex) ? 1 : 0;
    }
  }

  for (
    let preservedIndex = 0;
    preservedIndex < mask.preservedPoints.length;
    preservedIndex += 1
  ) {
    const [longitude, latitude] = mask.preservedPoints[preservedIndex]!;
    const latitudeRadians = (latitude * Math.PI) / 180;
    const longitudeRadians = (longitude * Math.PI) / 180;
    const latitudeRadius = Math.cos(latitudeRadians);
    const pointIndex = mask.pointCount + preservedIndex;
    const positionIndex = pointIndex * 3;

    positions[positionIndex] = latitudeRadius * Math.sin(longitudeRadians);
    positions[positionIndex + 1] = Math.sin(latitudeRadians);
    positions[positionIndex + 2] = latitudeRadius * Math.cos(longitudeRadians);
    land[pointIndex] = 1;
  }

  return { positions, land, pointCount, basePointCount: mask.pointCount };
}
