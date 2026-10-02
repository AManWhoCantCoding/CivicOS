import { ApiError, requestJson } from './client';

export const LAND_PARCEL_MAP_API = '/api/map/land-parcels';

export type LandParcelMapPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type LandParcelMapParcel = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  geometry: LandParcelMapPolygon;
  updatedAt: string;
};

export type LandParcelMapProjection = {
  parcel: LandParcelMapParcel;
  simulated: true;
  projection: 'land-parcel-map';
};

export type LandParcelMapErrorState =
  'forbidden' | 'not-found' | 'geometry' | 'provider' | 'offline' | 'error';

export function landParcelMapUrl(parcelId: string): string {
  return `${LAND_PARCEL_MAP_API}/${encodeURIComponent(parcelId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFinitePosition(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    value.every((axis) => typeof axis === 'number' && Number.isFinite(axis))
  );
}

// Closed-ring Polygon only; holes and multiple rings are preserved as-is.
// Never repairs geometry: an invalid value fails closed at the caller.
export function isLandParcelMapPolygon(
  value: unknown,
): value is LandParcelMapPolygon {
  if (!isRecord(value) || value.type !== 'Polygon') return false;
  const coordinates = value.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 1) return false;
  return coordinates.every((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    if (!ring.every(isFinitePosition)) return false;
    const first = ring[0] as number[];
    const last = ring[ring.length - 1] as number[];
    return (
      first.length === last.length &&
      first.every((axis, index) => axis === last[index])
    );
  });
}

// Reads the shared P0 projection, keeping only the locked allowlist.
// Unknown or extra fields are dropped; malformed input returns null so the
// caller renders a safe state instead of geometry.
export function readLandParcelMapProjection(
  body: unknown,
): LandParcelMapProjection | null {
  if (!isRecord(body) || !isRecord(body.parcel)) return null;
  const parcel = body.parcel;
  if (
    typeof parcel.id !== 'string' ||
    !parcel.id ||
    typeof parcel.parcelCode !== 'string' ||
    !parcel.parcelCode ||
    typeof parcel.mapSheetNumber !== 'string' ||
    !parcel.mapSheetNumber ||
    typeof parcel.parcelNumber !== 'string' ||
    !parcel.parcelNumber ||
    typeof parcel.status !== 'string' ||
    !parcel.status ||
    typeof parcel.updatedAt !== 'string' ||
    !parcel.updatedAt
  ) {
    return null;
  }
  if (!isLandParcelMapPolygon(parcel.geometry)) return null;
  if (body.simulated !== true || body.projection !== 'land-parcel-map') {
    return null;
  }
  return {
    parcel: {
      id: parcel.id,
      parcelCode: parcel.parcelCode,
      mapSheetNumber: parcel.mapSheetNumber,
      parcelNumber: parcel.parcelNumber,
      status: parcel.status,
      geometry: parcel.geometry,
      updatedAt: parcel.updatedAt,
    },
    simulated: true,
    projection: 'land-parcel-map',
  };
}

export function landParcelMapStateForError(
  error: unknown,
): LandParcelMapErrorState {
  // client.ts surfaces ApiError.code from body.error, so read the stable
  // body.code first to honor the real shared error-body shape.
  const bodyCode =
    error instanceof ApiError ? apiErrorBodyCode(error.body) : null;
  const code = bodyCode ?? (error instanceof ApiError ? error.code : null);
  if (error instanceof ApiError && (error.status === 0 || code === 'OFFLINE'))
    return 'offline';
  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  )
    return 'forbidden';
  if (error instanceof ApiError && error.status === 404) return 'not-found';
  if (error instanceof ApiError && error.status === 503)
    return code === 'MAP_PROVIDER_UNAVAILABLE' ? 'provider' : 'geometry';
  if (code === 'MAP_LAYER_FAILED' || code === 'LAND_GEOMETRY_INVALID')
    return 'geometry';
  return 'error';
}

function apiErrorBodyCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return null;
  }
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' && code ? code : null;
}

// Bbox center over every ring (holes and multiple rings preserved) for camera
// focus; null when no valid position exists. Never derives business area.
export function landParcelBoundsCenter(
  geometry: LandParcelMapPolygon,
): { longitude: number; latitude: number } | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const ring of geometry.coordinates) {
    for (const position of ring) {
      const [lng, lat] = position;
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return { longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2 };
}

export function isLandParcelFocusOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Shared P0 route used by web and mobile. Credentials ride along via
// requestJson; parcelId is focus context only, never an authorization grant.
// No offline polygon fallback: offline and malformed responses throw and the
// caller must hide geometry.
export async function getLandParcelMapProjection(
  parcelId: string,
): Promise<LandParcelMapProjection> {
  const body = await requestJson<unknown>(landParcelMapUrl(parcelId));
  const projection = readLandParcelMapProjection(body);
  if (!projection) throw new ApiError(500, 'MAP_LAYER_FAILED', body);
  return projection;
}
