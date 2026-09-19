export type GeoPoint = {
  latitude: number;
  longitude: number;
  coordinateReference: 'WGS84';
};

export type GeoArea = {
  points: GeoPoint[];
  coordinateReference: 'WGS84';
};

export function createGeoPoint(latitude: number, longitude: number): GeoPoint {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('INVALID_LATITUDE');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('INVALID_LONGITUDE');
  }
  return { latitude, longitude, coordinateReference: 'WGS84' };
}

export function createGeoArea(points: GeoPoint[]): GeoArea {
  if (points.length < 3) throw new Error('POLYGON_REQUIRES_THREE_POINTS');
  const first = points[0];
  const last = points[points.length - 1];
  if (first.latitude !== last.latitude || first.longitude !== last.longitude) {
    throw new Error('POLYGON_MUST_BE_CLOSED');
  }
  const segments = points.slice(0, -1).map((point, index) => ({
    start: point,
    end: points[index + 1],
  }));
  const orientation = (a: GeoPoint, b: GeoPoint, c: GeoPoint): number =>
    (b.longitude - a.longitude) * (c.latitude - a.latitude) -
    (b.latitude - a.latitude) * (c.longitude - a.longitude);
  const onSegment = (a: GeoPoint, b: GeoPoint, c: GeoPoint): boolean =>
    Math.min(a.longitude, c.longitude) <= b.longitude &&
    b.longitude <= Math.max(a.longitude, c.longitude) &&
    Math.min(a.latitude, c.latitude) <= b.latitude &&
    b.latitude <= Math.max(a.latitude, c.latitude);
  const intersects = (
    firstSegment: (typeof segments)[number],
    secondSegment: (typeof segments)[number],
  ): boolean => {
    const firstOrientation = orientation(
      firstSegment.start,
      firstSegment.end,
      secondSegment.start,
    );
    const secondOrientation = orientation(
      firstSegment.start,
      firstSegment.end,
      secondSegment.end,
    );
    const thirdOrientation = orientation(
      secondSegment.start,
      secondSegment.end,
      firstSegment.start,
    );
    const fourthOrientation = orientation(
      secondSegment.start,
      secondSegment.end,
      firstSegment.end,
    );
    if (
      ((firstOrientation > 0 && secondOrientation < 0) ||
        (firstOrientation < 0 && secondOrientation > 0)) &&
      ((thirdOrientation > 0 && fourthOrientation < 0) ||
        (thirdOrientation < 0 && fourthOrientation > 0))
    ) {
      return true;
    }
    return (
      (firstOrientation === 0 &&
        onSegment(firstSegment.start, secondSegment.start, firstSegment.end)) ||
      (secondOrientation === 0 &&
        onSegment(firstSegment.start, secondSegment.end, firstSegment.end)) ||
      (thirdOrientation === 0 &&
        onSegment(
          secondSegment.start,
          firstSegment.start,
          secondSegment.end,
        )) ||
      (fourthOrientation === 0 &&
        onSegment(secondSegment.start, firstSegment.end, secondSegment.end))
    );
  };
  for (let firstIndex = 0; firstIndex < segments.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < segments.length;
      secondIndex += 1
    ) {
      if (secondIndex === firstIndex + 1) continue;
      if (firstIndex === 0 && secondIndex === segments.length - 1) continue;
      if (intersects(segments[firstIndex], segments[secondIndex])) {
        throw new Error('POLYGON_SELF_INTERSECTS');
      }
    }
  }
  const area = segments.reduce(
    (sum, segment) =>
      sum +
      segment.start.longitude * segment.end.latitude -
      segment.end.longitude * segment.start.latitude,
    0,
  );
  if (area === 0) throw new Error('POLYGON_HAS_NO_AREA');
  return { points, coordinateReference: 'WGS84' };
}
