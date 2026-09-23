// Adapter provider bản đồ OSS và projection marker/polygon thuần túy.
import { createGeoArea, createGeoPoint } from '../geo';
import type { GeoArea } from '../geo';

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

export const CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99] as const;

export const DEFAULT_TILE_BASE_URL = 'http://localhost:8080';

export const MAP_ERRORS = {
  providerUnavailable: 'MAP_PROVIDER_UNAVAILABLE',
  layerFailed: 'MAP_LAYER_FAILED',
  permissionDenied: 'MAP_PERMISSION_DENIED',
  offlineWriteBlocked: 'MAP_OFFLINE_WRITE_BLOCKED',
} as const;

export type MapErrorCode = (typeof MAP_ERRORS)[keyof typeof MAP_ERRORS];

export type MapProviderConfig = {
  providerId: string;
  label: string;
  styleUrl: string;
  tileBaseUrl: string;
  attribution: string;
  bounds: readonly number[];
  official: boolean;
};

export type MapMarker = {
  id: string;
  aggregateType: string;
  title: string;
  latitude: number;
  longitude: number;
  geometry?: GeoArea;
  status: string;
  updatedAt: string;
};

export type MapProjectionRow = {
  aggregateType: string;
  aggregateId: string;
  state: unknown;
};

export const MAP_PROJECTION_SOURCE_AGGREGATES = [
  'Incident',
  'Inspection',
] as const;

const MAP_VIEWER_ROLES: readonly string[] = [
  'commander',
  'superior_commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFiniteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

// Resolve cấu hình provider từ runtime, không đọc secret hard-code.
export function resolveMapProvider(
  overrides: {
    styleUrl?: string;
    tileBaseUrl?: string;
    attribution?: string;
  } = {},
): MapProviderConfig {
  const overrideTile = overrides.tileBaseUrl;
  const envTile = process.env.MAP_TILE_BASE_URL;
  const tileBaseUrl = overrideTile ?? envTile ?? DEFAULT_TILE_BASE_URL;
  const overrideStyle = overrides.styleUrl;
  const envStyle = process.env.MAP_TILE_STYLE_URL;
  const styleUrl =
    overrideStyle ?? envStyle ?? `${tileBaseUrl}/styles/basic/style.json`;
  const overrideAttribution = overrides.attribution;
  const envAttribution = process.env.MAP_TILE_ATTRIBUTION;
  const attribution = overrideAttribution ?? envAttribution ?? OSM_ATTRIBUTION;
  const http =
    styleUrl.startsWith('http://') || styleUrl.startsWith('https://');
  if (!http || !attribution.includes('OpenStreetMap')) {
    throw new Error(MAP_ERRORS.providerUnavailable);
  }
  return {
    providerId: 'oss-tileserver-gl',
    label: 'OSS TileServer GL',
    styleUrl,
    tileBaseUrl,
    attribution,
    bounds: CADN_BOUNDS,
    official: false,
  };
}

// URL kiểm tra sức khỏe TileServer GL.
export function mapTileHealthUrl(config: MapProviderConfig): string {
  return `${config.tileBaseUrl}/health`;
}

// Dựng một marker đã validate GeoPoint/GeoArea, không suy diễn polygon.
export function toMapMarker(input: {
  id: string;
  aggregateType: string;
  title: string;
  latitude: number;
  longitude: number;
  geometry?: GeoArea;
  status: string;
  updatedAt: string;
}): MapMarker {
  const point = createGeoPoint(input.latitude, input.longitude);
  if (!input.geometry) {
    return { ...input, latitude: point.latitude, longitude: point.longitude };
  }
  const area = createGeoArea(input.geometry.points);
  return {
    ...input,
    latitude: point.latitude,
    longitude: point.longitude,
    geometry: area,
  };
}

function toMarkerGeometry(value: unknown): GeoArea | undefined {
  if (!isRecord(value) || !Array.isArray(value.points)) return undefined;
  try {
    const points = value.points.map((entry) => {
      if (!isRecord(entry)) throw new Error('INVALID_GEOMETRY_POINT');
      const latitude = toFiniteNumber(entry.latitude);
      const longitude = toFiniteNumber(entry.longitude);
      if (latitude === undefined || longitude === undefined) {
        throw new Error('INVALID_GEOMETRY_POINT');
      }
      return createGeoPoint(latitude, longitude);
    });
    return createGeoArea(points);
  } catch {
    return undefined;
  }
}

// Chiếu projection rows thành marker bản đồ, bỏ row thiếu tọa độ.
export function projectToMapMarkers(rows: MapProjectionRow[]): MapMarker[] {
  const markers: MapMarker[] = [];
  for (const row of rows) {
    const state = isRecord(row.state) ? row.state : {};
    const latitude = toFiniteNumber(state.latitude);
    const longitude = toFiniteNumber(state.longitude);
    if (latitude === undefined || longitude === undefined) continue;
    try {
      markers.push(
        toMapMarker({
          id: `${row.aggregateType}:${row.aggregateId}`,
          aggregateType: row.aggregateType,
          title: toText(
            state.title ?? state.description,
            row.aggregateId.slice(0, 8),
          ),
          latitude,
          longitude,
          geometry: toMarkerGeometry(state.geometry),
          status: toText(state.status, 'unknown'),
          updatedAt: toText(state.updatedAt ?? state.createdAt, ''),
        }),
      );
    } catch {
      continue;
    }
  }
  return markers;
}

// Vùng polygon chiếu từ GeoArea thật, không suy diễn từ point.
export type MapAreaFeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id: string;
    properties: { id: string; status: string };
    geometry: { type: 'Polygon'; coordinates: [number, number][][] };
  }[];
};

// Chuyển marker có GeoArea thành GeoJSON polygon để vẽ fill.
export function toMapAreaGeoJson(
  markers: MapMarker[],
): MapAreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markers
      .filter((marker) => marker.geometry !== undefined)
      .map((marker) => ({
        type: 'Feature',
        id: marker.id,
        properties: { id: marker.id, status: marker.status },
        geometry: {
          type: 'Polygon',
          coordinates: [
            (marker.geometry?.points ?? []).map(
              (point) => [point.longitude, point.latitude] as [number, number],
            ),
          ],
        },
      })),
  };
}

// Phân loại quyền xem bản đồ theo session và role nghiệp vụ.
export function resolveMapPermission(
  session: { id: string; roles: readonly string[] } | null,
): 'ok' | 'denied' | 'masked' {
  if (!session) return 'masked';
  const allowed = session.roles.some((role) => MAP_VIEWER_ROLES.includes(role));
  return allowed ? 'ok' : 'denied';
}

// Chặn mọi command ghi khi ngoại tuyến, chỉ cho xem basemap/cache.
export function assertMapWriteAllowed(online: boolean): void {
  if (!online) throw new Error(MAP_ERRORS.offlineWriteBlocked);
}

// Che tiêu đề marker khi role thiếu quyền đọc dữ liệu nhạy cảm.
export function maskMapMarker(
  marker: MapMarker,
  canReadSensitive: boolean,
): MapMarker {
  if (canReadSensitive) return marker;
  return { ...marker, title: 'Dữ liệu đã che theo vai trò' };
}
