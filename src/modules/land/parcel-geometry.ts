// GeoJSON Polygon with SRID 4326 for the parcel geometry seam.
export type PolygonGeometry = {
  type: 'Polygon';
  coordinates: number[][][];
};

function isFinitePosition(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    value.every((axis) => typeof axis === 'number' && Number.isFinite(axis))
  );
}

// Validate GeoJSON Polygon rings, rejecting Point and invalid shapes.
export function validateParcelPolygon(
  geometry: unknown,
): asserts geometry is PolygonGeometry {
  if (
    typeof geometry !== 'object' ||
    geometry === null ||
    (geometry as { type?: unknown }).type !== 'Polygon'
  )
    throw new Error('GEOMETRY_INVALID');
  const { coordinates } = geometry as { coordinates?: unknown };
  if (!Array.isArray(coordinates) || coordinates.length < 1)
    throw new Error('GEOMETRY_INVALID');
  for (const ring of coordinates) {
    if (!Array.isArray(ring) || ring.length < 4)
      throw new Error('GEOMETRY_INVALID');
    for (const position of ring) {
      if (!isFinitePosition(position)) throw new Error('GEOMETRY_INVALID');
    }
    const first = ring[0] as number[];
    const last = ring[ring.length - 1] as number[];
    if (
      first.length !== last.length ||
      !first.every((axis, index) => axis === last[index])
    )
      throw new Error('GEOMETRY_INVALID');
  }
}

// Serialize a Polygon for the parameterized PostGIS seam.
export function toGeometryParam(geometry: PolygonGeometry): string {
  return JSON.stringify(geometry);
}

// Parse ST_AsGeoJSON output back into a validated Polygon.
export function fromGeometryJson(value: string): PolygonGeometry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('GEOMETRY_INVALID');
  }
  validateParcelPolygon(parsed);
  return parsed;
}
