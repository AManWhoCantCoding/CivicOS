import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mapFocusStatus } from '@/components/map/land-parcel-focus';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const unavailableFocusStates = [
  'loading',
  'empty',
  'forbidden',
  'not-found',
  'geometry',
  'provider',
  'error',
  'stale',
  'offline',
] as const;

describe('T-004 web map state safety', () => {
  it.each(unavailableFocusStates)(
    'does not make a LandParcel polygon renderable in %s',
    (state) => {
      const workspace = readSource('src/components/map/MapWorkspace.tsx');
      const polygonStart = workspace.indexOf(
        '// T-004: LandParcel GeoJSON layer',
      );
      const polygonLayer = workspace.slice(
        polygonStart,
        workspace.indexOf('        });', polygonStart),
      );

      expect(polygonLayer).toContain("focusStatus === 'ready'");
      expect(polygonLayer).toContain('!focusStale');
      expect(polygonLayer).toContain('online');
      expect(polygonLayer).not.toContain(`focusStatus === '${state}'`);
    },
  );

  it('clears the old parcel before exposing stale and keeps the reload boundary', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const revalidation = workspace.slice(
      workspace.indexOf('const revalidateFocusParcel = useCallback'),
      workspace.indexOf('  }, [focusParcelId, focusParcel, focusStatus]);'),
    );

    const staleBranch = revalidation.slice(
      revalidation.indexOf(
        'if (projection.parcel.updatedAt !== focusParcel.updatedAt)',
      ),
    );
    expect(staleBranch.indexOf('setFocusParcel(null)')).toBeLessThan(
      staleBranch.indexOf("setFocusStatus('stale')"),
    );
    expect(workspace).toContain("focusStatus === 'stale'");
    expect(workspace).toContain('Dữ liệu bản đồ có thể đã cũ.');
    expect(workspace).toContain('Polygon cũ không được hiển thị');
    expect(workspace).not.toContain('{focusStale ? (');
    expect(workspace).toContain("cache: 'no-store'");
    expect(workspace).toContain('focusSeq.current !== seq');
    expect(revalidation).toContain("setFocusStatus('geometry')");
    expect(revalidation).toContain(
      'setFocusStatus(mapFocusStatus(response.status, code))',
    );
    expect(revalidation).toContain(
      "setFocusStatus(window.navigator.onLine ? 'error' : 'offline')",
    );
  });

  it('maps locked projection failures to safe UI states', () => {
    expect(mapFocusStatus(401, null)).toBe('forbidden');
    expect(mapFocusStatus(403, 'LAND_ASSIGNMENT_REQUIRED')).toBe('forbidden');
    expect(mapFocusStatus(404, 'LAND_PARCEL_NOT_FOUND')).toBe('not-found');
    expect(mapFocusStatus(400, 'LAND_GEOMETRY_INVALID')).toBe('geometry');
    expect(mapFocusStatus(503, 'MAP_LAYER_FAILED')).toBe('geometry');
    expect(mapFocusStatus(503, 'MAP_PROVIDER_UNAVAILABLE')).toBe('provider');
  });

  it('does not request or render a land polygon while offline', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const loader = workspace.slice(
      workspace.indexOf('const loadFocusParcel = useCallback'),
      workspace.indexOf('  // T-004: revalidate nền'),
    );

    expect(loader.indexOf('if (!window.navigator.onLine)')).toBeLessThan(
      loader.indexOf('fetch(focusApiUrl(parcelId)'),
    );
    expect(workspace).toContain(
      'Đang ngoại tuyến. Không tải polygon thửa đất khi ngoại tuyến.',
    );
    expect(workspace).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
    expect(workspace).toContain("focusStatus === 'offline'");
  });

  it('keeps the no-parcel empty state free of projection requests', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const focusEffect = workspace.slice(
      workspace.indexOf('// T-003: focused parcel projection'),
      workspace.indexOf('// T-003: polygon chỉ online'),
    );

    expect(focusEffect).toContain(
      "if (!focusParcelId) clearFocusParcel('empty');",
    );
    expect(focusEffect).not.toContain('focusApiUrl');
  });

  it('keeps generic Incident and Inspection map behavior separate', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');

    expect(workspace).toContain("'/api/map/config'");
    expect(workspace).toContain("'/api/map/markers'");
    expect(workspace).toContain("marker.aggregateType === 'Incident'");
    expect(workspace).toContain("marker.aggregateType === 'Inspection'");
    expect(workspace).toContain('map-areas-fill');
    expect(workspace).toContain('map-areas-line');
    expect(workspace).toContain('LAND_PARCEL_FOCUS_SOURCE');
  });
});
