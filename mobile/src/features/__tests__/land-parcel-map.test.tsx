import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ApiError } from '../../api/client';
import {
  getLandParcelMapProjection,
  isLandParcelFocusOffline,
  landParcelBoundsCenter,
  landParcelMapStateForError,
  landParcelMapUrl,
  readLandParcelMapProjection,
} from '../../api/land-map';

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}

const parcelBody = {
  parcel: {
    id: 'parcel-001',
    parcelCode: 'PARCEL-001',
    mapSheetNumber: '12',
    parcelNumber: '34',
    status: 'active',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105.98, 20.95],
          [105.982, 20.95],
          [105.982, 20.952],
          [105.98, 20.952],
          [105.98, 20.95],
        ],
      ],
    },
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
  simulated: true,
  projection: 'land-parcel-map',
};

function mockOnlineFetch(body: unknown, status = 200) {
  const originalOnline = navigator.onLine;
  const globals = globalThis as typeof globalThis & {
    __CIVICOS_API_BASE_URL__?: string;
  };
  globals.__CIVICOS_API_BASE_URL__ = 'http://10.0.2.2:3000';
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  const fetchSpy = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  return {
    fetchSpy,
    restore() {
      fetchSpy.mockRestore();
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: originalOnline,
      });
      delete globals.__CIVICOS_API_BASE_URL__;
    },
  };
}

// T-005 AC-1: LandScreen parcel summary offers an accessible action only when
// the scoped summary is ready, and carries just the opaque parcelId.
describe('T-005 AC-1 navigation context', () => {
  it('passes only parcelId focus context from LandScreen to MapScreen', () => {
    const land = readSource('../land/LandScreen.tsx');
    expect(land).toContain('Xem trên bản đồ');
    expect(land).toContain('Xem thửa đất trên bản đồ');
    expect(land).toContain('onOpenMap(parcel.id)');
    expect(land).toMatch(/parcelState === 'ready'/);
    expect(land).not.toMatch(/onOpenMap\((?!parcel\.id\))/);
    expect(land).not.toMatch(/geometry|address|policyOverride|token/i);

    const navigatorSource = readSource('../../navigation/AppNavigator.tsx');
    expect(navigatorSource).toContain('setLandParcelId(parcelId)');
    expect(navigatorSource).toContain("setRoute('Map')");
    expect(navigatorSource).toContain('focusParcelId={landParcelId}');
    expect(navigatorSource).toContain('onOpenLandDetail');
    expect(navigatorSource).not.toMatch(
      /geometry|address|token|policyOverride/i,
    );

    // deepLinks.ts stays the force-link seam; the parcel focus travels over
    // local AppNavigator state instead.
    const deepLinks = readSource('../../navigation/deepLinks.ts');
    expect(deepLinks).not.toMatch(/parcel/i);
  });
});

// T-005 AC-2: shared P0 route/response shape, one online Polygon, allowlist
// badge, freshness and the detail action.
describe('T-005 AC-2 online projection', () => {
  it('calls the shared P0 route with credentials and keeps the allowlist', async () => {
    const mocked = mockOnlineFetch(parcelBody);
    try {
      expect(landParcelMapUrl('parcel-001')).toBe(
        '/api/map/land-parcels/parcel-001',
      );
      expect(landParcelMapUrl('parcel 001/ă')).toBe(
        `/api/map/land-parcels/${encodeURIComponent('parcel 001/ă')}`,
      );
      const projection = await getLandParcelMapProjection('parcel-001');
      expect(mocked.fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/map/land-parcels/parcel-001'),
        expect.objectContaining({ credentials: 'include' }),
      );
      expect(Object.keys(projection).sort()).toEqual([
        'parcel',
        'projection',
        'simulated',
      ]);
      expect(Object.keys(projection.parcel).sort()).toEqual(
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
      expect(projection.simulated).toBe(true);
      expect(projection.projection).toBe('land-parcel-map');
    } finally {
      mocked.restore();
    }
  });

  it('renders one online Polygon with shared projection allowlist', () => {
    const projection = readLandParcelMapProjection(parcelBody);
    expect(projection?.parcel.geometry.type).toBe('Polygon');
    expect(projection?.parcel.geometry.coordinates).toEqual(
      parcelBody.parcel.geometry.coordinates,
    );

    const map = readSource('../map/MapScreen.tsx');
    expect(map).toContain('land-parcel-focus-source');
    expect(map).toContain('land-parcel-focus-fill');
    expect(map).toContain('features: [landFeature]');
    // Exactly one focused feature, gated on the ready state only.
    expect(map).toContain("landState === 'ready'");
    expect(map).not.toContain('landParcelFocusItems');
    // Bottom sheet allowlist, freshness and the detail action.
    expect(map).toContain('internal / simulated');
    expect(map).toContain('Mở chi tiết thửa');
    expect(map).toContain('onOpenLandDetail?.(landParcel.parcel.parcelCode)');
    expect(map).not.toContain('onOpenLandDetail?.(landParcel.parcel.id)');
    expect(map).toContain('Cập nhật');
    // JSX folds whitespace when rendered, so normalize before asserting copy.
    expect(map.replace(/\s+/g, ' ')).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
    // No mobile-only DTO and no merge into the generic RelatedInfo contract.
    expect(map).not.toContain('organizationId');
    expect(map).not.toMatch(/[aA]ddress/);
    expect(map).not.toContain('Evidence');
    expect(map).not.toMatch(/party/i);
    expect(map).not.toMatch(/rights/i);
    const generic = readSource('../../api/map.ts');
    expect(generic).not.toContain('land-parcel');
    expect(generic).not.toContain('parcel');
  });

  it('drops extra fields without widening the projection', () => {
    const projection = readLandParcelMapProjection({
      ...parcelBody,
      parcel: {
        ...parcelBody.parcel,
        organizationId: 'ou-secret',
        address: 'secret address',
      },
      extraTop: 'secret',
    });
    expect(projection).not.toBeNull();
    expect(JSON.stringify(projection)).not.toMatch(
      /organizationId|address|extraTop/i,
    );
  });
});

// T-005 AC-3: 401/403/404/503 and invalid projection hide geometry without
// leaking resource detail.
describe('T-005 AC-3 access and error states', () => {
  it.each([
    [401, 'LAND_UNAUTHENTICATED', 'forbidden'],
    [403, 'LAND_FORBIDDEN', 'forbidden'],
    [403, 'LAND_ASSIGNMENT_REQUIRED', 'forbidden'],
    [404, 'LAND_PARCEL_NOT_FOUND', 'not-found'],
    [503, 'MAP_PROVIDER_UNAVAILABLE', 'provider'],
    [503, 'MAP_LAYER_FAILED', 'geometry'],
  ])('hides geometry for %s', (status, code, expected) => {
    expect(landParcelMapStateForError(new ApiError(status, code, null))).toBe(
      expected,
    );
    const map = readSource('../map/MapScreen.tsx');
    // Error branches clear the projection; the layer only renders when ready.
    expect(map).toContain('setLandParcel(null)');
    expect(map).toContain("landState === 'ready'");
  });

  it('fails closed on malformed or non-Polygon geometry', async () => {
    expect(
      readLandParcelMapProjection({
        ...parcelBody,
        parcel: {
          ...parcelBody.parcel,
          geometry: { type: 'Point', coordinates: [105.98, 20.95] },
        },
      }),
    ).toBeNull();
    expect(
      readLandParcelMapProjection({
        ...parcelBody,
        parcel: {
          ...parcelBody.parcel,
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
        },
      }),
    ).toBeNull();
    expect(
      readLandParcelMapProjection({ ...parcelBody, simulated: false }),
    ).toBeNull();
    expect(
      readLandParcelMapProjection({
        ...parcelBody,
        projection: 'something-else',
      }),
    ).toBeNull();

    const mocked = mockOnlineFetch({
      ...parcelBody,
      parcel: { ...parcelBody.parcel, geometry: { type: 'Point' } },
    });
    try {
      await expect(
        getLandParcelMapProjection('parcel-001'),
      ).rejects.toMatchObject({ code: 'MAP_LAYER_FAILED' });
      expect(
        landParcelMapStateForError(new ApiError(500, 'MAP_LAYER_FAILED', null)),
      ).toBe('geometry');
    } finally {
      mocked.restore();
    }

    const map = readSource('../map/MapScreen.tsx');
    expect(map).toContain('Không thể hiển thị hình học thửa đất');
    expect(map).toContain('Không được phép xem thửa đất này');
    expect(map).toContain('Không tìm thấy thửa đất');
    expect(map).toContain('Bản đồ nền hiện không khả dụng');
    expect(map).toContain('Đang tải dữ liệu thửa đất…');
  });

  it('stays offline without calling or rendering the land polygon', () => {
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    try {
      expect(isLandParcelFocusOffline()).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: originalOnline,
      });
    }
    expect(isLandParcelFocusOffline()).toBe(false);
    expect(landParcelMapStateForError(new ApiError(0, 'OFFLINE', null))).toBe(
      'offline',
    );

    const map = readSource('../map/MapScreen.tsx');
    // The offline guard runs before the projection request and clears any
    // previous polygon, even when a basemap pack exists.
    const guardAt = map.indexOf('isLandParcelFocusOffline()');
    const requestAt = map.indexOf('getLandParcelMapProjection(focusParcelId)');
    expect(guardAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(guardAt);
    expect(map).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
    expect(map).toContain('Thử lại khi có kết nối');
  });
});

// Review gap 1: the detail action must open the selected parcel, not a blank
// land form. The callback carries the allowlisted parcelCode and LandScreen
// auto-opens the existing scoped read-only summary for it.
describe('T-005 review detail context', () => {
  it('carries the selected parcelCode from MapScreen to LandScreen', () => {
    const map = readSource('../map/MapScreen.tsx');
    expect(map).toContain('onOpenLandDetail?.(landParcel.parcel.parcelCode)');

    const navigatorSource = readSource('../../navigation/AppNavigator.tsx');
    expect(navigatorSource).toContain('openLandParcelDetail');
    expect(navigatorSource).toContain('setLandParcelCode(parcelCode)');
    expect(navigatorSource).toContain("setRoute('Land')");
    expect(navigatorSource).toContain('initialParcelCode={landParcelCode}');

    const land = readSource('../land/LandScreen.tsx');
    expect(land).toContain('initialParcelCode');
    expect(land).toContain("load(1, { mode: 'parcelCode', code })");
    // The auto-open reuses the existing lookup plus scoped reads, so server
    // authorization is preserved; no geometry, PII or token travels along.
    expect(land).toContain('getPublicLandLookup');
    expect(land).toContain('getLandParcelSummary');
    expect(land).not.toMatch(/geometry|policyOverride|token/i);
  });
});

// Review gap 2: the camera follows the focused Polygon bbox and stale generic
// coordinates are dropped when the land focus takes over.
describe('T-005 review camera focus', () => {
  it('centers the bbox over every ring without deriving business area', () => {
    const projection = readLandParcelMapProjection({
      ...parcelBody,
      parcel: {
        ...parcelBody.parcel,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [105.98, 20.95],
              [105.982, 20.95],
              [105.982, 20.952],
              [105.98, 20.952],
              [105.98, 20.95],
            ],
            [
              [105.9805, 20.9505],
              [105.981, 20.9505],
              [105.981, 20.951],
              [105.9805, 20.951],
              [105.9805, 20.9505],
            ],
          ],
        },
      },
    });
    expect(projection).not.toBeNull();
    if (!projection) return;
    // Holes and multiple rings are preserved in the geometry and covered by
    // the same bbox.
    expect(projection.parcel.geometry.coordinates).toHaveLength(2);
    expect(landParcelBoundsCenter(projection.parcel.geometry)).toEqual({
      longitude: (105.98 + 105.982) / 2,
      latitude: (20.95 + 20.952) / 2,
    });
  });

  it('drives the camera from the focused parcel and drops stale coordinates', () => {
    const map = readSource('../map/MapScreen.tsx');
    expect(map).toContain('landParcelBoundsCenter(landParcel.parcel.geometry)');
    expect(map).toContain('center: [cameraCenter.lng, cameraCenter.lat]');

    const navigatorSource = readSource('../../navigation/AppNavigator.tsx');
    const openAt = navigatorSource.indexOf('openLandParcelOnMap');
    const clearAt = navigatorSource.indexOf('setContext({})');
    expect(openAt).toBeGreaterThan(-1);
    expect(clearAt).toBeGreaterThan(openAt);
  });
});

// Review follow-up: the land focus effect defers the request via setTimeout,
// so its cleanup must synchronously retire the previous request. Otherwise a
// late parcel-A response resolving before parcel-B's timer fires would briefly
// commit A under B context (EC-LPM-11), including after unmount.
describe('T-005 review focus cleanup', () => {
  it('invalidates the in-flight land request on focus change and unmount', () => {
    const map = readSource('../map/MapScreen.tsx');
    const scheduleAt = map.indexOf(
      'setTimeout(() => void loadLandParcel(), 0)',
    );
    expect(scheduleAt).toBeGreaterThan(-1);
    const tail = map.slice(scheduleAt);
    // Cleanup clears the pending timer, then retires the request id before
    // the effect closes over this focus.
    const clearAt = tail.indexOf('clearTimeout(timer);');
    const invalidateAt = tail.indexOf('landRequestRef.current += 1');
    const closeAt = tail.indexOf('[loadLandParcel, landReload]');
    expect(clearAt).toBeGreaterThan(-1);
    expect(invalidateAt).toBeGreaterThan(clearAt);
    expect(closeAt).toBeGreaterThan(invalidateAt);
    // Both resolve paths still re-check the request id before committing.
    const guards = map.match(/landRequestRef\.current !== requestId/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });
});
// Review gap 3: client.ts takes ApiError.code from body.error, so the mapper
// must read the stable body.code to honor real shared error bodies.
describe('T-005 review shared error-body shape', () => {
  it('maps a real 503 provider body to provider, not geometry', async () => {
    expect(
      landParcelMapStateForError(
        new ApiError(503, 'Tiles down', {
          code: 'MAP_PROVIDER_UNAVAILABLE',
          error: 'Tiles down',
        }),
      ),
    ).toBe('provider');
    expect(
      landParcelMapStateForError(
        new ApiError(503, 'Layer failed', {
          code: 'MAP_LAYER_FAILED',
          error: 'Layer failed',
        }),
      ),
    ).toBe('geometry');

    const mocked = mockOnlineFetch(
      { code: 'MAP_PROVIDER_UNAVAILABLE', error: 'Tiles down' },
      503,
    );
    try {
      const failure = await getLandParcelMapProjection('parcel-001').then(
        () => null,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(ApiError);
      expect(landParcelMapStateForError(failure)).toBe('provider');
    } finally {
      mocked.restore();
    }
  });
});
