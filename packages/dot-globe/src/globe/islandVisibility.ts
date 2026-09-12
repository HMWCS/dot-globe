import { opaquePointRatio } from "./dotGlobeShader.js";
import type { PointGrid } from "./pointGrid.js";

interface ProjectedPoint {
  x: number;
  y: number;
  side: number;
}

function project(
  positions: Float32Array,
  index: number,
  projection: number[],
  view: number[],
  width: number,
  height: number,
): ProjectedPoint {
  const x = positions[index * 3]!;
  const y = positions[index * 3 + 1]!;
  const z = positions[index * 3 + 2]!;
  const w =
    projection[3]! * x +
    projection[7]! * y +
    projection[11]! * z +
    projection[15]!;
  return {
    x:
      (((projection[0]! * x +
        projection[4]! * y +
        projection[8]! * z +
        projection[12]!) /
        w +
        1) *
        width) /
      2,
    y:
      (((projection[1]! * x +
        projection[5]! * y +
        projection[9]! * z +
        projection[13]!) /
        w +
        1) *
        height) /
      2,
    side: view[2]! * x + view[6]! * y + view[10]! * z >= 0 ? 1 : -1,
  };
}

/** Resolves supplemental island symbols at the current display scale without moving samples. */
export function createIslandVisibility(grid: PointGrid) {
  const values = new Float32Array(grid.pointCount).fill(1);
  return {
    values,
    update(
      projection: number[],
      view: number[],
      width: number,
      height: number,
      pointSize: number,
    ) {
      const spacing = pointSize * opaquePointRatio;
      const buckets = new Map<string, ProjectedPoint[]>();
      let changed = false;

      for (let index = 0; index < grid.pointCount; index += 1) {
        if (grid.land[index] === 0) continue;
        const point = project(
          grid.positions,
          index,
          projection,
          view,
          width,
          height,
        );
        const cellX = Math.floor(point.x / spacing);
        const cellY = Math.floor(point.y / spacing);
        let visible = true;
        if (index >= grid.basePointCount) {
          for (let dx = -1; dx <= 1 && visible; dx += 1) {
            for (let dy = -1; dy <= 1 && visible; dy += 1) {
              const nearby = buckets.get(
                `${point.side}:${cellX + dx}:${cellY + dy}`,
              );
              visible = !nearby?.some(
                (other) =>
                  (point.x - other.x) ** 2 + (point.y - other.y) ** 2 <
                  spacing ** 2,
              );
            }
          }
          const next = visible ? 1 : 0;
          changed ||= values[index] !== next;
          values[index] = next;
        }
        if (!visible) continue;
        const key = `${point.side}:${cellX}:${cellY}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(point);
        else buckets.set(key, [point]);
      }
      return changed;
    },
  };
}
