import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const maskPath = resolve(
  repositoryRoot,
  "packages/dot-globe/src/globe/generated/land-mask.json",
);
const data = JSON.parse(await readFile(maskPath, "utf8"));

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function nearestPointIndex(mask, longitude, latitude) {
  const latitudeIndex = Math.max(
    0,
    Math.min(
      mask.latitudeBands - 1,
      Math.round(((latitude + 90) * mask.latitudeBands) / 180 - 0.5),
    ),
  );
  const wrappedLongitude = modulo(longitude + 180, 360) - 180;
  const rowOffset = latitudeIndex % 2 === 0 ? 0.5 : 1;
  const longitudeIndex = modulo(
    Math.round(
      ((wrappedLongitude + 180) * mask.longitudeBands) / 360 - rowOffset,
    ),
    mask.longitudeBands,
  );
  return latitudeIndex * mask.longitudeBands + longitudeIndex;
}

function longitudeDistance(first, second) {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

function isNearPreservedPoint(mask, longitude, latitude) {
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

function isLand(mask, bytes, longitude, latitude) {
  const index = nearestPointIndex(mask, longitude, latitude);
  return (
    (bytes[index >> 3] & (1 << (index & 7))) !== 0 ||
    isNearPreservedPoint(mask, longitude, latitude)
  );
}

if (data.schemaVersion !== 2)
  throw new Error("Unsupported geography mask schema.");
if (data.islandPreservation?.minimumAreaKm2 !== 1000)
  throw new Error("Unexpected island-preservation threshold.");
if (data.grid?.layout !== "staggered latitude rows")
  throw new Error("Unexpected point-grid layout.");

for (const [name, mask] of Object.entries(data.qualities)) {
  const bytes = Buffer.from(mask.maskBase64, "base64");
  const expectedBytes = Math.ceil(mask.pointCount / 8);
  if (bytes.length !== expectedBytes) {
    throw new Error(
      `${name}: expected ${expectedBytes} bytes, received ${bytes.length}.`,
    );
  }
  if (sha256(bytes) !== mask.maskSha256) {
    throw new Error(`${name}: geography mask checksum mismatch.`);
  }
  if (
    sha256(JSON.stringify(mask.preservedPoints)) !== mask.preservedPointsSha256
  ) {
    throw new Error(`${name}: preserved-point checksum mismatch.`);
  }
  if (mask.pointCount !== mask.latitudeBands * mask.longitudeBands) {
    throw new Error(`${name}: point-grid dimensions are inconsistent.`);
  }
  if (mask.weightedLandRatio < 0.27 || mask.weightedLandRatio > 0.31) {
    throw new Error(
      `${name}: implausible weighted land ratio ${mask.weightedLandRatio}.`,
    );
  }
  if (mask.preservedIslandPointCount < 1) {
    throw new Error(`${name}: expected preserved island points.`);
  }
  if (mask.preservedIslandPointCount !== mask.preservedPoints.length) {
    throw new Error(`${name}: preserved-point count mismatch.`);
  }
  const uniquePreservedPoints = new Set(
    mask.preservedPoints.map((coordinates) => coordinates.join(",")),
  );
  if (uniquePreservedPoints.size !== mask.preservedPoints.length) {
    throw new Error(`${name}: duplicate preserved island points.`);
  }
  if (
    mask.preservedPoints.some(
      ([longitude, latitude]) =>
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude >= 180 ||
        latitude < -90 ||
        latitude > 90,
    )
  ) {
    throw new Error(`${name}: invalid preserved island coordinates.`);
  }
  let bitCount = 0;
  for (const byte of bytes) {
    bitCount += byte.toString(2).replaceAll("0", "").length;
  }
  if (bitCount !== mask.landCount) {
    throw new Error(`${name}: land-count metadata mismatch.`);
  }
}

const high = data.qualities.high;
const highBytes = Buffer.from(high.maskBase64, "base64");
const expectations = [
  ["North America", -100, 40, true],
  ["South America", -60, -15, true],
  ["Africa", 20, 0, true],
  ["Europe", 15, 50, true],
  ["Asia", 100, 40, true],
  ["Australia", 135, -25, true],
  ["Greenland", -42, 72, true],
  ["Madagascar", 47, -20, true],
  ["Hawaii", -155.5, 19.6, true],
  ["Antarctica", 0, -80, true],
  ["Pacific Ocean", -140, 0, false],
  ["Atlantic Ocean", -30, 0, false],
  ["Indian Ocean", 80, -20, false],
  ["Southern Ocean", 0, -60, false],
  ["Arctic Ocean", 0, 85, false],
  ["Australia mirror check", -135, -25, false],
  ["Africa mirror check", -20, 0, false],
  ["Lake Michigan", -87, 44, false],
  ["Caspian Sea", 50, 42, false],
];

for (const [label, longitude, latitude, expected] of expectations) {
  const actual = isLand(high, highBytes, longitude, latitude);
  if (actual !== expected) {
    throw new Error(
      `${label}: expected land=${expected}, received land=${actual}.`,
    );
  }
}

console.log(
  `Verified ${Object.keys(data.qualities).length} geography masks and ${expectations.length} geographic anchors.`,
);
