import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LAND_PARCEL_FOCUS_FILL,
  LAND_PARCEL_FOCUS_LINE,
  LAND_PARCEL_FOCUS_SOURCE,
  focusMapUrl,
  focusParcelDetailUrl,
  isFocusPolygonGeometry,
  mapFocusStatus,
  readFocusProjection,
} from '@/components/map/land-parcel-focus';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const workspace = () => readSource('src/components/map/MapWorkspace.tsx');

function focusLayerBlock(source: string): string {
  const start = source.indexOf('// T-004: LandParcel GeoJSON layer');
  const end = source.indexOf('// T-008: discovery polygons', start);
  return source.slice(start, end);
}

const EXTERIOR = [
  [105.98, 20.95],
  [105.982, 20.95],
  [105.982, 20.952],
  [105.98, 20.952],
  [105.98, 20.95],
];

const HOLE = [
  [105.9805, 20.9505],
  [105.981, 20.9505],
  [105.981, 20.951],
  [105.9805, 20.951],
  [105.9805, 20.9505],
];

function parcelBody(overrides: Record<string, unknown> = {}) {
  return {
    parcel: {
      id: 'parcel-001',
      parcelCode: 'PARCEL-001',
      mapSheetNumber: '12',
      parcelNumber: '34',
      status: 'active',
      geometry: { type: 'Polygon', coordinates: [EXTERIOR, HOLE] },
      updatedAt: '2026-10-02T00:00:00.000Z',
    },
    simulated: true,
    projection: 'land-parcel-map',
    ...overrides,
  };
}

// T-010 AC-1: ready renders exactly the existing focused projection and keeps
// the existing route/back context.
describe('T-010 map safe states', () => {
  it('renders one focused polygon only in ready state', () => {
    expect(LAND_PARCEL_FOCUS_SOURCE).toBe('land-parcel-focus');
    expect(LAND_PARCEL_FOCUS_FILL).toBe('land-parcel-focus-fill');
    expect(LAND_PARCEL_FOCUS_LINE).toBe('land-parcel-focus-line');
    const block = focusLayerBlock(workspace());
    expect(block).toContain("focusStatus === 'ready'");
    expect(block).toContain('!focusStale');
    expect(block).toContain('online');
    expect(block).toContain('focusParcelId');
    expect(block).toContain('focusParcel');
    expect(block).toContain('geometry: focusParcel.geometry');
    expect(block).toContain('LAND_PARCEL_FOCUS_SOURCE');
    expect(block).not.toContain('map-areas');
    expect(block).not.toContain('DISCOVERY_SOURCE');
    expect(block.match(/type: 'Feature'/g) ?? []).toHaveLength(1);
  });

  it('reads one focused projection preserving holes and multiple rings', () => {
    const projection = readFocusProjection(parcelBody());
    expect(projection?.parcel.id).toBe('parcel-001');
    expect(projection?.parcel.geometry.coordinates).toEqual([EXTERIOR, HOLE]);
    expect(projection?.simulated).toBe(true);
    expect(projection?.projection).toBe('land-parcel-map');
    expect(isFocusPolygonGeometry(parcelBody().parcel.geometry)).toBe(true);
  });

  it('keeps retry/back/parcel focus destinations on the existing routes', () => {
    expect(focusMapUrl('parcel-001')).toBe('/map?parcelId=parcel-001');
    expect(focusParcelDetailUrl('parcel-001')).toBe('/land/parcels/parcel-001');
    const source = workspace();
    expect(source).toContain('Mở chi tiết thửa');
    expect(source).toContain('focusParcelDetailUrl');
    expect(source).toContain('Quay lại danh sách thửa');
    expect(source).toContain('href="/land/parcels"');
    expect(source).toContain('Thử lại');
    expect(source).toContain('Tải lại dữ liệu');
  });

  it.each([
    'loading',
    'empty',
    'offline',
    'forbidden',
    'not-found',
    'stale',
    'provider',
    'geometry',
    'error',
  ])('renders zero polygons for safe state %s', (state) => {
    const block = focusLayerBlock(workspace());
    expect(block).not.toContain(`focusStatus === '${state}'`);
    expect(block).not.toContain(`discoveryStatus === '${state}'`);
  });

  it('clears the old parcel before exposing stale and keeps the reload boundary', () => {
    const source = workspace();
    const revalidation = source.slice(
      source.indexOf('const revalidateFocusParcel = useCallback'),
      source.indexOf('  }, [focusParcelId, focusParcel, focusStatus]);'),
    );
    const staleBranch = revalidation.slice(
      revalidation.indexOf(
        'if (projection.parcel.updatedAt !== focusParcel.updatedAt)',
      ),
    );
    expect(staleBranch.indexOf('setFocusParcel(null)')).toBeLessThan(
      staleBranch.indexOf("setFocusStatus('stale')"),
    );
    expect(source).toContain('Dữ liệu bản đồ có thể đã cũ.');
    expect(source).toContain('Polygon cũ không được hiển thị');
  });

  it('does not request or render a land polygon while offline', () => {
    const source = workspace();
    const loader = source.slice(
      source.indexOf('const loadFocusParcel = useCallback'),
      source.indexOf('  // T-004: revalidate nền'),
    );
    expect(loader.indexOf('if (!window.navigator.onLine)')).toBeLessThan(
      loader.indexOf('fetch(focusApiUrl(parcelId)'),
    );
    expect(source).toContain(
      'Đang ngoại tuyến. Không tải polygon thửa đất khi ngoại tuyến.',
    );
    expect(source).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
    expect(source).toContain("focusStatus === 'offline'");
  });

  it('maps locked projection failures to safe UI states', () => {
    expect(mapFocusStatus(401, null)).toBe('forbidden');
    expect(mapFocusStatus(403, 'LAND_ASSIGNMENT_REQUIRED')).toBe('forbidden');
    expect(mapFocusStatus(404, 'LAND_PARCEL_NOT_FOUND')).toBe('not-found');
    expect(mapFocusStatus(400, 'LAND_GEOMETRY_INVALID')).toBe('geometry');
    expect(mapFocusStatus(503, 'MAP_LAYER_FAILED')).toBe('geometry');
    expect(mapFocusStatus(503, 'MAP_PROVIDER_UNAVAILABLE')).toBe('provider');
    const source = workspace();
    expect(source).toContain('Không được phép xem thửa đất này');
    expect(source).toContain('Không tìm thấy thửa đất');
    expect(source).toContain('Không thể hiển thị hình học thửa đất');
    expect(source).toContain('Bản đồ nền hiện không khả dụng');
  });

  it('keeps Light/Blue presentation with announcements, 44px controls and simulated wording', () => {
    const source = workspace();
    const text = source.replace(/\s+/g, ' ');
    expect(source).toContain('var(--civicos-');
    expect(source).not.toMatch(
      /slate-(950|900|800|700)|cyan-(300|200)|amber-(400|300|200|100)|emerald-(400|300|200)|rose-(400|300|200|100)/,
    );
    expect(source).not.toMatch(/gradient|neon|glow/i);
    const hexes = new Set(source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []);
    for (const hex of hexes) {
      expect(['#38BDF8', '#075985']).toContain(hex);
    }
    expect(source).toContain('role="status"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live');
    expect(source).toContain('sr-only');
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('internal / simulated');
    expect(text).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
    expect(source).not.toContain('certified');
    expect(source).not.toContain('legal boundary');
  });

  it('preserves provider/CRS/projection allowlist, guards and non-land map behavior', () => {
    const source = workspace();
    expect(source).toContain("cache: 'no-store'");
    expect(source).toContain('focusSeq.current !== seq');
    expect(source).toContain('isFocusPolygonGeometry');
    expect(source).toContain('readFocusProjection');
    expect(source).toContain('CADN_BOUNDS');
    expect(source).toContain("'/api/map/config'");
    expect(source).toContain("'/api/map/markers'");
    expect(source).toContain("marker.aggregateType === 'Incident'");
    expect(source).toContain("marker.aggregateType === 'Inspection'");
    expect(source).toContain('map-areas-fill');
    expect(source).toContain('map-areas-line');
    expect(source).toContain('MAP_OFFLINE_WRITE_BLOCKED');
    expect(source).not.toContain('organizationId');
    expect(source).not.toContain('policyOverride');
  });
});
