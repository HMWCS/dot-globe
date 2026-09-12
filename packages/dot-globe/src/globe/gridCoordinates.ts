const fullCircle = 360;

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

/** Returns the latitude at the center of a grid row. */
export function latitudeForRow(latitudeIndex: number, latitudeBands: number) {
  return -90 + ((latitudeIndex + 0.5) * 180) / latitudeBands;
}

/** Returns the longitude for a point in an alternately staggered latitude row. */
export function longitudeForPoint(
  latitudeIndex: number,
  longitudeIndex: number,
  longitudeBands: number,
) {
  const rowOffset = latitudeIndex % 2 === 0 ? 0.5 : 1;
  const longitude =
    -180 + ((longitudeIndex + rowOffset) * fullCircle) / longitudeBands;
  return longitude >= 180 ? longitude - fullCircle : longitude;
}

/** Finds the nearest grid row to a geographic latitude. */
export function nearestLatitudeIndex(latitude: number, latitudeBands: number) {
  return Math.max(
    0,
    Math.min(
      latitudeBands - 1,
      Math.round(((latitude + 90) * latitudeBands) / 180 - 0.5),
    ),
  );
}

/** Finds the nearest point in a staggered row to a geographic longitude. */
export function nearestLongitudeIndex(
  longitude: number,
  latitudeIndex: number,
  longitudeBands: number,
) {
  const wrappedLongitude = modulo(longitude + 180, fullCircle) - 180;
  const rowOffset = latitudeIndex % 2 === 0 ? 0.5 : 1;
  const unwrappedIndex =
    ((wrappedLongitude + 180) * longitudeBands) / fullCircle - rowOffset;
  return modulo(Math.round(unwrappedIndex), longitudeBands);
}
