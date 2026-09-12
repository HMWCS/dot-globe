import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { geoArea, geoBounds, geoCentroid, geoContains } from "d3-geo";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const outputPath = join(
  repositoryRoot,
  "packages/dot-globe/src/globe/generated/land-mask.json",
);
const cacheDirectory = join(tmpdir(), "dot-globe-geodata");
const sourceCommit = "ca96624a56bd078437bca8184e78163e5039ad19";
const sourceBaseUrl = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${sourceCommit}/geojson`;
const earthRadiusKm = 6371.0088;
const minimumPreservedIslandAreaKm2 = 1000;
const minimumPreservedIslandArea =
  minimumPreservedIslandAreaKm2 / earthRadiusKm ** 2;

const sources = {
  land: {
    file: "ne_10m_land.geojson",
    version: "5.1.1",
    sha256: "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416",
  },
  minorIslands: {
    file: "ne_10m_minor_islands.geojson",
    version: "4.1.0",
    sha256: "8c933ca7a4760256bdc46408355706e39764b0fa01c160c28888b90b4faec29f",
  },
  lakes: {
    file: "ne_10m_lakes.geojson",
    version: "5.0.0",
    sha256: "2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9",
  },
};

const qualityDefinitions = {
  low: { latitudeBands: 64, longitudeBands: 128 },
  medium: { latitudeBands: 96, longitudeBands: 192 },
  high: { latitudeBands: 128, longitudeBands: 256 },
};

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function loadSource(source) {
  await mkdir(cacheDirectory, { recursive: true });
  const cachePath = join(cacheDirectory, source.file);
  let content;

  try {
    content = await readFile(cachePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (!content || sha256(content) !== source.sha256) {
    const response = await fetch(`${sourceBaseUrl}/${source.file}`);
    if (!response.ok) {
      throw new Error(
        `Failed to download ${source.file}: HTTP ${response.status}`,
      );
    }
    content = Buffer.from(await response.arrayBuffer());
    const actualHash = sha256(content);
    if (actualHash !== source.sha256) {
      throw new Error(
        `Checksum mismatch for ${source.file}: expected ${source.sha256}, received ${actualHash}`,
      );
    }
    await writeFile(cachePath, content);
  }

  return JSON.parse(content.toString("utf8"));
}

function polygonFeatures(featureCollection) {
  const polygons = [];

  for (const feature of featureCollection.features) {
    const { geometry } = feature;
    if (geometry.type === "Polygon") {
      polygons.push({ type: "Feature", properties: {}, geometry });
      continue;
    }
    if (geometry.type === "MultiPolygon") {
      for (const coordinates of geometry.coordinates) {
        polygons.push({
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates },
        });
      }
    }
  }

  return polygons;
}

function buildLatitudeIndex(featureCollection) {
  const buckets = Array.from({ length: 180 }, () => []);

  for (const feature of polygonFeatures(featureCollection)) {
    const bounds = geoBounds(feature);
    const south = Math.max(-90, bounds[0][1]);
    const north = Math.min(90, bounds[1][1]);
    const firstBucket = Math.max(0, Math.min(179, Math.floor(south + 90)));
    const lastBucket = Math.max(0, Math.min(179, Math.floor(north + 90)));
    const indexedFeature = { feature, bounds };

    for (let bucket = firstBucket; bucket <= lastBucket; bucket += 1) {
      buckets[bucket].push(indexedFeature);
    }
  }

  return buckets;
}

function longitudeWithinBounds(longitude, west, east) {
  if (west <= east) return longitude >= west && longitude <= east;
  return longitude >= west || longitude <= east;
}

function contains(index, longitude, latitude) {
  const bucket = Math.max(0, Math.min(179, Math.floor(latitude + 90)));

  for (const candidate of index[bucket]) {
    const [[west, south], [east, north]] = candidate.bounds;
    if (latitude < south || latitude > north) continue;
    if (!longitudeWithinBounds(longitude, west, east)) continue;
    if (geoContains(candidate.feature, [longitude, latitude])) return true;
  }

  return false;
}

function setBit(bytes, index) {
  bytes[index >> 3] |= 1 << (index & 7);
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function latitudeForRow(latitudeIndex, latitudeBands) {
  return -90 + ((latitudeIndex + 0.5) * 180) / latitudeBands;
}

function longitudeForPoint(latitudeIndex, longitudeIndex, longitudeBands) {
  const rowOffset = latitudeIndex % 2 === 0 ? 0.5 : 1;
  const longitude =
    -180 + ((longitudeIndex + rowOffset) * 360) / longitudeBands;
  return longitude >= 180 ? longitude - 360 : longitude;
}

function hasGridPoint(feature, quality, lakeIndex) {
  const [[west, south], [east, north]] = geoBounds(feature);
  const firstLatitude = Math.max(
    0,
    Math.ceil(((south + 90) * quality.latitudeBands) / 180 - 0.5),
  );
  const lastLatitude = Math.min(
    quality.latitudeBands - 1,
    Math.floor(((north + 90) * quality.latitudeBands) / 180 - 0.5),
  );
  for (
    let latitudeIndex = firstLatitude;
    latitudeIndex <= lastLatitude;
    latitudeIndex += 1
  ) {
    const latitude = latitudeForRow(latitudeIndex, quality.latitudeBands);
    for (
      let longitudeIndex = 0;
      longitudeIndex < quality.longitudeBands;
      longitudeIndex += 1
    ) {
      const longitude = longitudeForPoint(
        latitudeIndex,
        longitudeIndex,
        quality.longitudeBands,
      );
      if (!longitudeWithinBounds(longitude, west, east)) continue;
      if (
        geoContains(feature, [longitude, latitude]) &&
        !contains(lakeIndex, longitude, latitude)
      )
        return true;
    }
  }

  return false;
}

function interpolateLongitude(west, east, fraction) {
  const span = west <= east ? east - west : 360 - west + east;
  return modulo(west + span * fraction + 180, 360) - 180;
}

function findRepresentativePoint(island, lakeIndex) {
  const isValid = ([longitude, latitude]) =>
    geoContains(island, [longitude, latitude]) &&
    !contains(lakeIndex, longitude, latitude);
  const centroid = geoCentroid(island);
  if (isValid(centroid)) return centroid;

  const [[west, south], [east, north]] = geoBounds(island);
  for (const resolution of [3, 7, 15, 31, 63]) {
    for (
      let latitudeIndex = 0;
      latitudeIndex < resolution;
      latitudeIndex += 1
    ) {
      const latitude =
        south + ((latitudeIndex + 0.5) * (north - south)) / resolution;
      for (
        let longitudeIndex = 0;
        longitudeIndex < resolution;
        longitudeIndex += 1
      ) {
        const longitude = interpolateLongitude(
          west,
          east,
          (longitudeIndex + 0.5) / resolution,
        );
        const candidate = [longitude, latitude];
        if (isValid(candidate)) return candidate;
      }
    }
  }

  throw new Error(
    "Unable to place a preserved island point inside its source polygon.",
  );
}

function preserveIslands(quality, islands, lakeIndex) {
  const preservedPoints = [];
  const coordinateKeys = new Set();

  for (const island of islands) {
    if (
      geoArea(island) < minimumPreservedIslandArea ||
      hasGridPoint(island, quality, lakeIndex)
    )
      continue;

    const coordinates = findRepresentativePoint(island, lakeIndex).map(
      (value) => Number(value.toFixed(6)),
    );
    if (
      !geoContains(island, coordinates) ||
      contains(lakeIndex, ...coordinates)
    ) {
      throw new Error(
        "Rounded preserved island point left its source polygon.",
      );
    }
    const coordinateKey = coordinates.join(",");
    if (coordinateKeys.has(coordinateKey)) continue;
    coordinateKeys.add(coordinateKey);
    preservedPoints.push(coordinates);
  }

  return preservedPoints;
}

function createMask(quality, indexes, islands) {
  const { latitudeBands, longitudeBands } = quality;
  const pointCount = latitudeBands * longitudeBands;
  const bytes = Buffer.alloc(Math.ceil(pointCount / 8));
  let landCount = 0;
  let weightedLand = 0;
  let weightedTotal = 0;

  for (
    let latitudeIndex = 0;
    latitudeIndex < latitudeBands;
    latitudeIndex += 1
  ) {
    const latitude = latitudeForRow(latitudeIndex, latitudeBands);
    const latitudeWeight = Math.cos((latitude * Math.PI) / 180);

    for (
      let longitudeIndex = 0;
      longitudeIndex < longitudeBands;
      longitudeIndex += 1
    ) {
      const longitude = longitudeForPoint(
        latitudeIndex,
        longitudeIndex,
        longitudeBands,
      );
      const pointIndex = latitudeIndex * longitudeBands + longitudeIndex;
      const isLand =
        (contains(indexes.land, longitude, latitude) ||
          contains(indexes.minorIslands, longitude, latitude)) &&
        !contains(indexes.lakes, longitude, latitude);

      weightedTotal += latitudeWeight;
      if (!isLand) continue;
      setBit(bytes, pointIndex);
      landCount += 1;
      weightedLand += latitudeWeight;
    }
  }

  const preservedPoints = preserveIslands(quality, islands, indexes.lakes);

  return {
    latitudeBands,
    longitudeBands,
    pointCount,
    landCount,
    preservedIslandPointCount: preservedPoints.length,
    preservedPoints,
    preservedPointsSha256: sha256(JSON.stringify(preservedPoints)),
    weightedLandRatio: Number((weightedLand / weightedTotal).toFixed(6)),
    maskSha256: sha256(bytes),
    maskBase64: bytes.toString("base64"),
  };
}

const loadedSources = Object.fromEntries(
  await Promise.all(
    Object.entries(sources).map(async ([name, source]) => [
      name,
      await loadSource(source),
    ]),
  ),
);

const indexes = {
  land: buildLatitudeIndex(loadedSources.land),
  minorIslands: buildLatitudeIndex(loadedSources.minorIslands),
  lakes: buildLatitudeIndex(loadedSources.lakes),
};
const islands = [
  ...polygonFeatures(loadedSources.land),
  ...polygonFeatures(loadedSources.minorIslands),
];

const qualities = {};
for (const [name, definition] of Object.entries(qualityDefinitions)) {
  console.log(`Generating ${name} geography mask...`);
  qualities[name] = createMask(definition, indexes, islands);
}

const output = {
  schemaVersion: 2,
  source: {
    repository: "nvkelso/natural-earth-vector",
    commit: sourceCommit,
    license: "Public domain",
    files: Object.fromEntries(
      Object.entries(sources).map(([name, source]) => [
        name,
        {
          file: source.file,
          version: source.version,
          sha256: source.sha256,
          url: `${sourceBaseUrl}/${source.file}`,
        },
      ]),
    ),
  },
  islandPreservation: {
    minimumAreaKm2: minimumPreservedIslandAreaKm2,
    method:
      "Append a verified in-polygon point for an otherwise unsampled island",
  },
  grid: {
    layout: "staggered latitude rows",
    rowOffset: "Every second row is shifted by half a longitude cell",
  },
  qualities,
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
