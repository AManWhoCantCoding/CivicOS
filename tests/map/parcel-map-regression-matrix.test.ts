import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  focusApiUrl,
  focusBoundsCenter,
  isFocusPolygonGeometry,
  mapFocusStatus,
  readFocusProjection,
} from '@/components/map/land-parcel-focus';
import {
  LAND_PUBLIC_LOOKUP_URL,
  fetchPublicLandLookup,
} from '@/components/land/land-api';
import {
  MAP_ERRORS,
  MAP_PROJECTION_SOURCE_AGGREGATES,
  assertMapWriteAllowed,
  projectToMapMarkers,
  resolveMapPermission,
  toMapAreaGeoJson,
  toMapMarker,
} from '@/modules/platform/map';
import { createGeoArea, createGeoPoint } from '@/modules/platform/geo';
import { GET as getMapConfig } from '@/app/api/map/config/route';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

function parcelBody(
  geometry: unknown,
  overrides: Record<string, unknown> = {},
) {
  return {
    parcel: {
      id: 'parcel-001',
      parcelCode: 'PARCEL-001',
      mapSheetNumber: '12',
      parcelNumber: '34',
      status: 'active',
      geometry,
      updatedAt: '2026-10-02T00:00:00.000Z',
    },
    simulated: true,
    projection: 'land-parcel-map',
    ...overrides,
  };
}

// T-007 AC-2: projection/geometry/privacy matrix on the web client seam.
// EC-LPM-06/07/08, DR-LPM-04/05/10.
describe.each([
  {
    name: 'valid Polygon',
    geometry: { type: 'Polygon', coordinates: [EXTERIOR] },
    accepted: true,
    rings: 1,
  },
  {
    name: 'Polygon with holes',
    geometry: { type: 'Polygon', coordinates: [EXTERIOR, HOLE] },
    accepted: true,
    rings: 2,
  },
  {
    name: 'Point instead of Polygon',
    geometry: { type: 'Point', coordinates: [105.98, 20.95] },
    accepted: false,
    rings: 0,
  },
  {
    name: 'open ring',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105.98, 20.95],
          [105.981, 20.95],
          [105.981, 20.951],
        ],
      ],
    },
    accepted: false,
    rings: 0,
  },
  {
    name: 'non-finite position',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105.98, 20.95],
          [null, 20.95],
          [105.981, 20.951],
          [105.98, 20.95],
        ],
      ],
    },
    accepted: false,
    rings: 0,
  },
])('T-007 AC-2 projection safety $name', ({ geometry, accepted, rings }) => {
  it(
    accepted ? 'renders every ring as-is' : 'fails closed without geometry',
    () => {
      const projection = readFocusProjection(parcelBody(geometry));
      if (!accepted) {
        expect(projection).toBeNull();
        expect(isFocusPolygonGeometry(geometry)).toBe(false);
        return;
      }
      expect(projection?.parcel.geometry.coordinates).toEqual(
        (geometry as { coordinates: unknown }).coordinates,
      );
      expect(projection?.parcel.geometry.coordinates).toHaveLength(rings);
      expect(projection?.simulated).toBe(true);
      expect(projection?.projection).toBe('land-parcel-map');
    },
  );
});

describe('T-007 AC-2 simulated and allowlist safety', () => {
  it('drops non-simulated or foreign projections', () => {
    expect(
      readFocusProjection(
        parcelBody(
          { type: 'Polygon', coordinates: [EXTERIOR] },
          { simulated: false },
        ),
      ),
    ).toBeNull();
    expect(
      readFocusProjection(
        parcelBody(
          { type: 'Polygon', coordinates: [EXTERIOR] },
          { projection: 'something-else' },
        ),
      ),
    ).toBeNull();
  });

  it('keeps only allowlisted keys and centers every ring', () => {
    expect(
      readFocusProjection({ simulated: true, projection: 'land-parcel-map' }),
    ).toBeNull();

    const valid = readFocusProjection(
      parcelBody({ type: 'Polygon', coordinates: [EXTERIOR, HOLE] }),
    );
    expect(valid).not.toBeNull();
    if (!valid) return;
    expect(Object.keys(valid).sort()).toEqual(
      ['parcel', 'projection', 'simulated'].sort(),
    );
    expect(Object.keys(valid.parcel).sort()).toEqual(
      [
        'geometry',
        'id',
        'mapSheetNumber',
        'parcelCode',
        'parcelNumber',
        'status',
        'updatedAt',
      ].sort(),
    );
    expect(focusBoundsCenter(valid.parcel.geometry)).toEqual({
      longitude: (105.98 + 105.982) / 2,
      latitude: (20.95 + 20.952) / 2,
    });
    expect(focusApiUrl('parcel-001')).toBe('/api/map/land-parcels/parcel-001');
  });
});

// T-007 AC-2: provider/layer/stale/offline states map to safe UI states.
describe.each([
  { status: 401, code: null, expected: 'forbidden' },
  { status: 403, code: 'LAND_FORBIDDEN', expected: 'forbidden' },
  { status: 403, code: 'LAND_ASSIGNMENT_REQUIRED', expected: 'forbidden' },
  { status: 404, code: 'LAND_PARCEL_NOT_FOUND', expected: 'not-found' },
  { status: 400, code: 'LAND_GEOMETRY_INVALID', expected: 'geometry' },
  { status: 503, code: 'MAP_LAYER_FAILED', expected: 'geometry' },
  { status: 503, code: 'MAP_PROVIDER_UNAVAILABLE', expected: 'provider' },
  { status: 500, code: 'UNKNOWN', expected: 'error' },
] as const)(
  'T-007 AC-2 error state $status $code',
  ({ status, code, expected }) => {
    it(`maps to ${expected} without exposing geometry`, () => {
      expect(mapFocusStatus(status, code)).toBe(expected);
    });
  },
);

describe('T-007 AC-2 provider error and stale/offline boundaries', () => {
  it('serves the basemap provider without land content and fails to sealed 503', async () => {
    for (const key of [
      'MAP_TILE_BASE_URL',
      'MAP_TILE_STYLE_URL',
      'MAP_TILE_ATTRIBUTION',
    ]) {
      delete process.env[key];
    }
    const healthy = await getMapConfig();
    const healthyBody = (await healthy.json()) as {
      provider: { styleUrl: string };
      official: boolean;
    };
    expect(healthy.status).toBe(200);
    expect(healthyBody.official).toBe(false);
    expect(JSON.stringify(healthyBody)).not.toMatch(/parcel|land/i);

    process.env.MAP_TILE_BASE_URL = 'ftp://tiles.local';
    try {
      const failed = await getMapConfig();
      expect(failed.status).toBe(503);
      expect(await failed.json()).toEqual({
        error: MAP_ERRORS.providerUnavailable,
      });
    } finally {
      delete process.env.MAP_TILE_BASE_URL;
    }
  });

  it('clears the old polygon before stale and never requests offline', () => {
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
    expect(workspace).toContain("cache: 'no-store'");
    expect(workspace).toContain('focusSeq.current !== seq');

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
  });
});

// T-007 AC-3: generic Incident/Inspection map, land detail/public lookup and
// basemap offline behavior do not regress.
describe('T-007 AC-3 generic map regression', () => {
  it('keeps projection sources on Incident/Inspection only', () => {
    expect([...MAP_PROJECTION_SOURCE_AGGREGATES]).toEqual([
      'Incident',
      'Inspection',
    ]);
    const markersRoute = readSource('src/app/api/map/markers/route.ts');
    expect(markersRoute).not.toContain('land-parcels');
    expect(markersRoute).not.toContain('LandParcel');
    const platform = readSource('src/modules/platform/map/index.ts');
    expect(platform).not.toContain('land-parcels');
  });

  it('renders generic areas from GeoArea and never infers land polygons', () => {
    const area = toMapMarker({
      id: 'Inspection:area-1',
      aggregateType: 'Inspection',
      title: 'Vùng kiểm tra',
      latitude: 20.96,
      longitude: 105.98,
      geometry: createGeoArea([
        createGeoPoint(20.95, 105.97),
        createGeoPoint(20.95, 105.99),
        createGeoPoint(20.97, 105.98),
        createGeoPoint(20.95, 105.97),
      ]),
      status: 'scheduled',
      updatedAt: '',
    });
    expect(toMapAreaGeoJson([area]).features).toHaveLength(1);
    const point = toMapMarker({
      id: 'Incident:point-1',
      aggregateType: 'Incident',
      title: 'Tin báo',
      latitude: 20.95,
      longitude: 105.98,
      status: 'received',
      updatedAt: '',
    });
    expect(toMapAreaGeoJson([point]).features).toHaveLength(0);
    expect(
      projectToMapMarkers([
        { aggregateType: 'Incident', aggregateId: 'a', state: {} },
      ]),
    ).toHaveLength(0);
  });

  it('preserves map permission and offline-write guards', () => {
    expect(resolveMapPermission(null)).toBe('masked');
    expect(
      resolveMapPermission({ id: 'user-1', roles: ['field_officer'] }),
    ).toBe('ok');
    expect(() => assertMapWriteAllowed(false)).toThrow(
      MAP_ERRORS.offlineWriteBlocked,
    );
    expect(() => assertMapWriteAllowed(true)).not.toThrow();
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('MAP_OFFLINE_WRITE_BLOCKED');
    expect(workspace).toContain('map-areas-fill');
    expect(workspace).toContain('map-areas-line');
  });
});

describe('T-007 AC-3 land detail and public lookup regression', () => {
  it('keeps parcel detail behind land policy, never public lookup', () => {
    const detailRoute = readSource(
      'src/app/api/land/parcels/[parcelId]/route.ts',
    );
    expect(detailRoute).toContain('requireLandActor');
    expect(detailRoute).toContain('getParcelDetail');
    expect(detailRoute).not.toContain('public');
    const detailService = readSource(
      'src/modules/land/parcel-detail-service.ts',
    );
    expect(detailService).toContain('requireParcelDetailAccess');
  });

  it('keeps public lookup on eight fields with no polygon', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            lookup: {
              applicationCode: 'APP-001',
              parcelCode: 'PARCEL-001',
              mapSheetNumber: '12',
              parcelNumber: '34',
              status: 'completed',
              submittedAt: '2026-09-30T00:00:00.000Z',
              updatedAt: '2026-09-30T01:00:00.000Z',
              completedAt: '2026-09-30T02:00:00.000Z',
              polygon: { type: 'Polygon' },
              partyName: 'Must not reach the UI',
            },
            simulated: true,
          },
          200,
        ),
      ),
    );

    const result = await fetchPublicLandLookup('applicationCode', ' APP-001 ');

    expect(result.lookup).toEqual({
      applicationCode: 'APP-001',
      parcelCode: 'PARCEL-001',
      mapSheetNumber: '12',
      parcelNumber: '34',
      status: 'completed',
      submittedAt: '2026-09-30T00:00:00.000Z',
      updatedAt: '2026-09-30T01:00:00.000Z',
      completedAt: '2026-09-30T02:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toMatch(/polygon|partyName/i);
    expect(LAND_PUBLIC_LOOKUP_URL).toBe('/api/public/land/lookup');
  });
});
