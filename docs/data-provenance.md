# Geographic Data Provenance

## Source

The generated masks use [Natural Earth 1:10m Physical Vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/), which Natural Earth provides in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/). The source repository is pinned to commit `ca96624a56bd078437bca8184e78163e5039ad19` of `nvkelso/natural-earth-vector`.

Sources were retrieved and verified on 2026-08-09.

| Role             | File                           | Version | SHA-256                                                            |
| ---------------- | ------------------------------ | ------- | ------------------------------------------------------------------ |
| Continental land | `ne_10m_land.geojson`          | 5.1.1   | `1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416` |
| Minor islands    | `ne_10m_minor_islands.geojson` | 4.1.0   | `8c933ca7a4760256bdc46408355706e39764b0fa01c160c28888b90b4faec29f` |
| Inland water     | `ne_10m_lakes.geojson`         | 5.0.0   | `2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9` |

The exact immutable URLs and checksums are also embedded in `scripts/geodata/generate-land-mask.mjs` and the generated mask metadata.

## Transformation

1. Download each immutable GeoJSON file into the operating system's temporary directory.
2. Reject any source whose SHA-256 digest differs from the pinned value.
3. Flatten polygon and multipolygon features and index them by latitude.
4. Sample latitude-longitude grids at cell centers using spherical `d3-geo` containment, shifting every second latitude row by half a longitude cell.
5. Classify a point as land when it is in the land or minor-island source and not in a lake.
6. For any land polygon of at least 1,000 km² that contains no grid center, append a deterministic representative coordinate verified to be inside that polygon and outside every lake.
7. Encode each base lattice as a compact bitset and record SHA-256 digests for both the bitset and exact island-coordinate list.

The committed result is `packages/dot-globe/src/globe/generated/land-mask.json`. No downloaded GeoJSON or third-party visual asset is shipped.

| Quality | Grid      | Base points | Exact island points | Stored samples | Weighted land ratio | Mask SHA-256                                                       |
| ------- | --------- | ----------: | ------------------: | -------------: | ------------------: | ------------------------------------------------------------------ |
| Low     | 64 × 128  |       8,192 |                 252 |          8,444 |            0.283024 | `508af9c1dd65c89b6a4a405f316a9cc1a218beb03e41fa45d441f0d34ee0f0e8` |
| Medium  | 96 × 192  |      18,432 |                 235 |         18,667 |            0.284142 | `791ff97d09604c5414cdd9b5eea18530d21b22b0877cf3e42aae7f6f107a5c01` |
| High    | 128 × 256 |      32,768 |                 196 |         32,964 |            0.284688 | `8cf13d0eba26a476618df0d417e13088a828853a5ad2dc4be8a2f543a061ad9f` |

## Verification and limits

At the current view and point size, overlapping supplemental island symbols are omitted while their original coordinates remain stored. A larger globe or smaller dots can resolve nearby islands; the visible subset can change with the view. Counts above describe samples, not guaranteed visible islands. Polar compression and front/back projection overlap remain properties of the globe projection.

`pnpm verify:geodata` verifies schema, staggered layout metadata, output checksums, grid dimensions, exact island-coordinate metadata, plausible weighted land ratios, every continent, Hawaii, five major oceans, orientation mirrors, Lake Michigan, and the Caspian Sea. Unit tests additionally cover alternating row offsets, longitude wrapping, poles, point radius, and deterministic indexing. The demo exposes default, Pacific, Atlantic, Americas, and polar views for browser inspection.

This is a deliberately sampled physical map, not a navigation or boundary dataset. The main lattice follows staggered latitude rows; geographically exact representatives for otherwise missed islands are deliberate exceptions. Islands below 1,000 km² and narrow channels can still disappear. Coastlines are limited by both Natural Earth's documented geometry and the selected point tier. Political and disputed borders are excluded by design.
