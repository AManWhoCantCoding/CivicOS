import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ApiError } from '../client';
import {
  getLandParcelMapProjection,
  isLandParcelFocusOffline,
  landParcelBoundsCenter,
  landParcelMapStateForError,
  landParcelMapUrl,
  readLandParcelMapProjection,
} from '../land-map';

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
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
  [105.9805, 20.9505],
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

// T-007 AC-2: shared projection matrix on the mobile seam.
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
])('T-007 mobile projection safety $name', ({ geometry, accepted, rings }) => {
  it(
    accepted ? 'renders every ring as-is' : 'fails closed without geometry',
    () => {
      const projection = readLandParcelMapProjection(parcelBody(geometry));
      if (!accepted) {
        expect(projection).toBeNull();
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

describe('T-007 mobile actor and error matrix', () => {
  it.each([
    [401, 'LAND_UNAUTHENTICATED', 'forbidden'],
    [403, 'LAND_FORBIDDEN', 'forbidden'],
    [403, 'LAND_ASSIGNMENT_REQUIRED', 'forbidden'],
    [404, 'LAND_PARCEL_NOT_FOUND', 'not-found'],
    [503, 'MAP_PROVIDER_UNAVAILABLE', 'provider'],
    [503, 'MAP_LAYER_FAILED', 'geometry'],
  ])('hides geometry for %s %s', (status, code, expected) => {
    expect(landParcelMapStateForError(new ApiError(status, code, null))).toBe(
      expected,
    );
  });

  it('maps real shared 503 bodies through body.code', async () => {
    expect(
      landParcelMapStateForError(
        new ApiError(503, 'Tiles down', {
          code: 'MAP_PROVIDER_UNAVAILABLE',
          error: 'Tiles down',
        }),
      ),
    ).toBe('provider');

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

  it('calls the shared P0 route with parcelId only and keeps the allowlist', async () => {
    const mocked = mockOnlineFetch(
      parcelBody({ type: 'Polygon', coordinates: [EXTERIOR] }),
    );
    try {
      expect(landParcelMapUrl('parcel-001')).toBe(
        '/api/map/land-parcels/parcel-001',
      );
      const projection = await getLandParcelMapProjection('parcel-001');
      expect(mocked.fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/map/land-parcels/parcel-001'),
        expect.objectContaining({ credentials: 'include' }),
      );
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
    } finally {
      mocked.restore();
    }
  });

  it('fails closed on malformed geometry without rendering PII', async () => {
    expect(
      readLandParcelMapProjection(parcelBody({ type: 'Point' })),
    ).toBeNull();
    expect(
      readLandParcelMapProjection(
        parcelBody(
          { type: 'Polygon', coordinates: [EXTERIOR] },
          { simulated: false },
        ),
      ),
    ).toBeNull();

    const mocked = mockOnlineFetch(
      parcelBody(
        { type: 'Polygon', coordinates: [EXTERIOR] },
        { simulated: false },
      ),
    );
    try {
      await expect(
        getLandParcelMapProjection('parcel-001'),
      ).rejects.toMatchObject({ code: 'MAP_LAYER_FAILED' });
    } finally {
      mocked.restore();
    }
  });
});

describe('T-007 mobile offline and privacy boundary', () => {
  it('stays offline without calling or storing the land polygon', () => {
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

    const landMap = readSource('../land-map.ts');
    for (const forbidden of [
      'AsyncStorage',
      'localStorage',
      'OfflineManager',
      'createPack',
      'submitOffline',
      'organizationId',
      'Evidence',
    ]) {
      expect(landMap).not.toContain(forbidden);
    }
    expect(landMap).toContain('navigator.onLine === false');
  });

  it('centers every ring without deriving business area', () => {
    const projection = readLandParcelMapProjection(
      parcelBody({ type: 'Polygon', coordinates: [EXTERIOR, HOLE] }),
    );
    expect(projection).not.toBeNull();
    if (!projection) return;
    expect(projection.parcel.geometry.coordinates).toHaveLength(2);
    expect(landParcelBoundsCenter(projection.parcel.geometry)).toEqual({
      longitude: (105.98 + 105.982) / 2,
      latitude: (20.95 + 20.952) / 2,
    });
  });
});
