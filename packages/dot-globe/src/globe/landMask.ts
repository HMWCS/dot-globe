import geographyDataJson from "./generated/land-mask.json";
import type { DotGlobeQuality } from "./dotGlobeTypes.js";
import {
  nearestLatitudeIndex,
  nearestLongitudeIndex,
} from "./gridCoordinates.js";

interface GeographyMask {
  latitudeBands: number;
  longitudeBands: number;
  pointCount: number;
  landCount: number;
  preservedIslandPointCount: number;
  preservedPoints: Array<[number, number]>;
  preservedPointsSha256: string;
  weightedLandRatio: number;
  maskSha256: string;
  maskBase64: string;
}

interface GeographyData {
  schemaVersion: number;
  qualities: Record<DotGlobeQuality, GeographyMask>;
}

const geographyData = geographyDataJson as unknown as GeographyData;
const decodedMasks = new Map<DotGlobeQuality, Uint8Array>();

function decodeMask(quality: DotGlobeQuality) {
  const cached = decodedMasks.get(quality);
  if (cached) return cached;

  const binary = atob(geographyData.qualities[quality].maskBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  decodedMasks.set(quality, bytes);
  return bytes;
}

/** Returns immutable metadata for a generated point grid. */
export function getGeographyMask(quality: DotGlobeQuality) {
  return geographyData.qualities[quality];
}

/** Returns whether a point-grid index belongs to physical land. */
export function isLandIndex(quality: DotGlobeQuality, pointIndex: number) {
  const bytes = decodeMask(quality);
  return ((bytes[pointIndex >> 3] ?? 0) & (1 << (pointIndex & 7))) !== 0;
}

function longitudeDistance(first: number, second: number) {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

function isNearPreservedPoint(
  mask: GeographyMask,
  longitude: number,
  latitude: number,
) {
  const latitudeStep = 180 / mask.latitudeBands;
  const longitudeStep = 360 / mask.longitudeBands;

  return mask.preservedPoints.some(([pointLongitude, pointLatitude]) => {
    const meanLatitudeRadians =
      (((latitude + pointLatitude) / 2) * Math.PI) / 180;
    const longitudeSteps =
      (longitudeDistance(longitude, pointLongitude) *
        Math.cos(meanLatitudeRadians)) /
      longitudeStep;
    const latitudeSteps = Math.abs(latitude - pointLatitude) / latitudeStep;
    return Math.hypot(longitudeSteps, latitudeSteps) <= 1;
  });
}

/** Samples the nearest generated lattice or exact island point for geographic verification. */
export function isLandAt(
  quality: DotGlobeQuality,
  longitude: number,
  latitude: number,
) {
  const mask = getGeographyMask(quality);
  const latitudeIndex = nearestLatitudeIndex(latitude, mask.latitudeBands);
  const longitudeIndex = nearestLongitudeIndex(
    longitude,
    latitudeIndex,
    mask.longitudeBands,
  );
  return (
    isLandIndex(
      quality,
      latitudeIndex * mask.longitudeBands + longitudeIndex,
    ) || isNearPreservedPoint(mask, longitude, latitude)
  );
}
