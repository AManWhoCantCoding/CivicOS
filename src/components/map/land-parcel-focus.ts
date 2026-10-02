// T-003 focused LandParcel helpers cho web map (phase-02).
// Nguồn: docs/design/land-parcel-map (api-contract allowlist, screen-02/07/12).
// Chỉ navigation context parcelId; quyền do route T-002 quyết định.
// Không geometry/PII/token trong URL, không mutation, không legal claim.

export const LAND_PARCEL_MAP_API = '/api/map/land-parcels';
export const LAND_PARCEL_FOCUS_SOURCE = 'land-parcel-focus';
export const LAND_PARCEL_FOCUS_FILL = 'land-parcel-focus-fill';
export const LAND_PARCEL_FOCUS_LINE = 'land-parcel-focus-line';

export type FocusPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type FocusParcel = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  geometry: FocusPolygon;
  updatedAt: string;
};

export type FocusProjection = {
  parcel: FocusParcel;
  simulated: true;
  projection: 'land-parcel-map';
};

export type FocusStatus =
  | 'empty'
  | 'loading'
  | 'ready'
  | 'stale'
  | 'forbidden'
  | 'not-found'
  | 'geometry'
  | 'provider'
  | 'offline'
  | 'error';

// Entry /map chỉ giữ navigation context parcelId.
export function focusMapUrl(parcelId: string): string {
  return `/map?parcelId=${encodeURIComponent(parcelId)}`;
}

export function focusParcelDetailUrl(parcelId: string): string {
  return `/land/parcels/${encodeURIComponent(parcelId)}`;
}

export function focusApiUrl(parcelId: string): string {
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

// Kiểm tra Polygon đã hợp lệ, giữ nguyên mọi ring (holes/multiple rings).
// Không tự đóng ring, không sửa geometry — invalid thì caller báo
// geometry-unavailable.
export function isFocusPolygonGeometry(value: unknown): value is FocusPolygon {
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

// Đọc projection T-002, chỉ giữ allowlist map đã lock.
export function readFocusProjection(body: unknown): FocusProjection | null {
  if (!isRecord(body) || !isRecord(body.parcel)) return null;
  const parcel = body.parcel;
  if (
    typeof parcel.id !== 'string' ||
    typeof parcel.parcelCode !== 'string' ||
    typeof parcel.mapSheetNumber !== 'string' ||
    typeof parcel.parcelNumber !== 'string' ||
    typeof parcel.status !== 'string' ||
    typeof parcel.updatedAt !== 'string'
  ) {
    return null;
  }
  if (!isFocusPolygonGeometry(parcel.geometry)) return null;
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

// Ánh xạ HTTP status sang state UI (screen-03/04/05).
export function mapFocusStatus(
  status: number,
  code: string | null,
): Exclude<FocusStatus, 'empty' | 'loading' | 'ready' | 'stale' | 'offline'> {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 503 && code === 'MAP_PROVIDER_UNAVAILABLE') return 'provider';
  if (status === 400 && code === 'LAND_GEOMETRY_INVALID') return 'geometry';
  if (status === 503 && code === 'MAP_LAYER_FAILED') return 'geometry';
  return 'error';
}

// Nhãn screen reader cho selection (screen-07/12).
export function focusScreenReaderLabel(parcel: FocusParcel): string {
  return `Thửa ${parcel.parcelCode}, tờ ${parcel.mapSheetNumber}, thửa ${parcel.parcelNumber}, trạng thái ${parcel.status}, dữ liệu mô phỏng nội bộ`;
}

// Tâm bbox qua mọi ring để focus/zoom; null khi không có vị trí hợp lệ.
export function focusBoundsCenter(
  geometry: FocusPolygon,
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
