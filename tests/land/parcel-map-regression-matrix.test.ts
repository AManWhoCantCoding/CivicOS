import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  assignmentFindMany: vi.fn(),
  linksFindMany: vi.fn(),
  requireLandActor: vi.fn(),
  auditLandEvent: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: dbMocks.queryRaw,
    assignment: { findMany: dbMocks.assignmentFindMany },
    landApplicationParcel: { findMany: dbMocks.linksFindMany },
  },
}));

vi.mock('@/modules/land/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/land/access')>();
  return {
    ...actual,
    requireLandActor: dbMocks.requireLandActor,
    auditLandEvent: dbMocks.auditLandEvent,
  };
});

import { readFileSync } from 'node:fs';

import { GET } from '@/app/api/map/land-parcels/[parcelId]/route';
import type { IdentityUser } from '@/modules/identity';
import { toLandApiError } from '@/modules/land/errors';

const ACCESS_SOURCE = readFileSync(
  new URL('../../src/modules/land/access.ts', import.meta.url),
  'utf8',
);

const OU_A = 'ou-land-a';
const OU_B = 'ou-land-b';
const PARCEL_ID = 'parcel-map-001';
const APP_ID = 'app-map-001';

const EXTERIOR = [
  [105.98, 20.95],
  [105.981, 20.95],
  [105.981, 20.951],
  [105.98, 20.951],
  [105.98, 20.95],
];

const HOLE = [
  [105.9802, 20.9502],
  [105.9805, 20.9502],
  [105.9805, 20.9505],
  [105.9802, 20.9505],
  [105.9802, 20.9502],
];

const POLYGON = { type: 'Polygon', coordinates: [EXTERIOR] };
const POLYGON_WITH_HOLE = { type: 'Polygon', coordinates: [EXTERIOR, HOLE] };

function mapRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PARCEL_ID,
    parcelCode: 'PARCEL-001',
    mapSheetNumber: '12',
    parcelNumber: '34',
    status: 'active',
    geometryGeoJson: JSON.stringify(POLYGON),
    updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    organizationId: OU_A,
    ...overrides,
  };
}

function officer(overrides: Partial<IdentityUser> = {}): IdentityUser {
  return {
    id: 'map-officer',
    email: 'map-officer@demo.local',
    name: 'Map Officer',
    roles: ['land_officer'] as unknown as IdentityUser['roles'],
    organizationUnitId: OU_A,
    ...overrides,
  };
}

function leader(overrides: Partial<IdentityUser> = {}): IdentityUser {
  return {
    id: 'map-leader',
    email: 'map-leader@demo.local',
    name: 'Map Leader',
    roles: ['commune_leader'] as unknown as IdentityUser['roles'],
    organizationUnitId: OU_A,
    ...overrides,
  };
}

function directAssignment() {
  return {
    task: 'land_review',
    resourceType: 'LandParcel',
    resourceId: PARCEL_ID,
    status: 'active',
    organizationId: OU_A,
  };
}

function linkedAppAssignment() {
  return {
    task: 'land_review',
    resourceType: 'LandChangeApplication',
    resourceId: APP_ID,
    status: 'active',
    organizationId: OU_A,
  };
}

function context(parcelId: string = PARCEL_ID) {
  return { params: Promise.resolve({ parcelId }) } as never;
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function expectSealed(
  payload: Record<string, unknown>,
  response: Response,
  status: number,
) {
  expect(response.status).toBe(status);
  expect(Object.keys(payload).sort()).toEqual(['code', 'error']);
  expect(JSON.stringify(payload)).not.toMatch(
    /polygon|coordinates|organizationId|ou-land|address|party|rights|evidence|105\.98|token/i,
  );
  expect(response.headers.get('Cache-Control')).toBe('no-store');
}

function mockAssignments(direct: unknown[], linked: unknown[]) {
  dbMocks.assignmentFindMany.mockImplementation(async (args: unknown) => {
    const resourceType = (args as { where?: { resourceType?: string } }).where
      ?.resourceType;
    return (resourceType === 'LandParcel' ? direct : linked) as never;
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.queryRaw.mockResolvedValue([mapRow()]);
  dbMocks.assignmentFindMany.mockResolvedValue([]);
  dbMocks.linksFindMany.mockResolvedValue([]);
  dbMocks.auditLandEvent.mockResolvedValue(undefined);
});

// T-007 AC-1: full actor matrix through the locked P0 route.
// EC-LPM-01..EC-LPM-05, DR-LPM-02/DR-LPM-09.
type ActorCase = {
  name: string;
  arrange: () => void;
  status: number;
  code:
    | 'LAND_UNAUTHENTICATED'
    | 'LAND_FORBIDDEN'
    | 'LAND_ASSIGNMENT_REQUIRED'
    | null;
  touchesReadSeam: boolean;
  audits: boolean;
};

const actorMatrix: ActorCase[] = [
  {
    name: 'unauthenticated',
    arrange: () =>
      dbMocks.requireLandActor.mockRejectedValue(new Error('UNAUTHENTICATED')),
    status: 401,
    code: 'LAND_UNAUTHENTICATED',
    touchesReadSeam: false,
    audits: false,
  },
  {
    name: 'citizen',
    arrange: () =>
      dbMocks.requireLandActor.mockRejectedValue(new Error('FORBIDDEN')),
    status: 403,
    code: 'LAND_FORBIDDEN',
    touchesReadSeam: false,
    audits: false,
  },
  {
    name: 'legacy map role',
    arrange: () =>
      dbMocks.requireLandActor.mockRejectedValue(new Error('FORBIDDEN')),
    status: 403,
    code: 'LAND_FORBIDDEN',
    touchesReadSeam: false,
    audits: false,
  },
  {
    name: 'leader same unit',
    arrange: () => dbMocks.requireLandActor.mockResolvedValue(leader()),
    status: 200,
    code: null,
    touchesReadSeam: true,
    audits: true,
  },
  {
    name: 'officer direct assignment',
    arrange: () => {
      dbMocks.requireLandActor.mockResolvedValue(officer());
      mockAssignments([directAssignment()], []);
    },
    status: 200,
    code: null,
    touchesReadSeam: true,
    audits: true,
  },
  {
    name: 'officer linked application assignment',
    arrange: () => {
      dbMocks.requireLandActor.mockResolvedValue(officer());
      mockAssignments([], [linkedAppAssignment()]);
      dbMocks.linksFindMany.mockResolvedValue([{ applicationId: APP_ID }]);
    },
    status: 200,
    code: null,
    touchesReadSeam: true,
    audits: true,
  },
  {
    name: 'cross-unit officer',
    arrange: () => {
      dbMocks.requireLandActor.mockResolvedValue(
        officer({ organizationUnitId: OU_B }),
      );
      mockAssignments([directAssignment()], []);
    },
    status: 403,
    code: 'LAND_FORBIDDEN',
    touchesReadSeam: true,
    audits: false,
  },
  {
    name: 'revoked officer assignment',
    arrange: () => {
      // Revoked/cancelled rows are filtered by status:'active' in both
      // assignment lookups, so no qualifying assignment remains.
      dbMocks.requireLandActor.mockResolvedValue(officer());
      mockAssignments([], []);
      dbMocks.linksFindMany.mockResolvedValue([]);
    },
    status: 403,
    code: 'LAND_ASSIGNMENT_REQUIRED',
    touchesReadSeam: true,
    audits: false,
  },
];

describe.each(actorMatrix)('T-007 AC-1 authorization $name', (actorCase) => {
  it('enforces the locked contract without leaking existence or geometry', async () => {
    actorCase.arrange();

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    if (actorCase.code) {
      expectSealed(payload, response, actorCase.status);
      expect(payload.code).toBe(actorCase.code);
    } else {
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(payload).toEqual({
        parcel: {
          id: PARCEL_ID,
          parcelCode: 'PARCEL-001',
          mapSheetNumber: '12',
          parcelNumber: '34',
          status: 'active',
          geometry: POLYGON,
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
        simulated: true,
        projection: 'land-parcel-map',
      });
    }
    if (actorCase.touchesReadSeam) {
      expect(dbMocks.queryRaw).toHaveBeenCalled();
    } else {
      expect(dbMocks.queryRaw).not.toHaveBeenCalled();
    }
    if (actorCase.audits) {
      expect(dbMocks.auditLandEvent).toHaveBeenCalledTimes(1);
    } else {
      expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
    }
  });
});

describe('T-007 AC-1 revocation boundary', () => {
  it('filters both assignment lookups by active status', () => {
    const parcelAccess = ACCESS_SOURCE.slice(
      ACCESS_SOURCE.indexOf('export async function requireParcelDetailAccess'),
      ACCESS_SOURCE.indexOf(
        'export async function requireApplicationDetailAccess',
      ),
    );
    const activeFilters = parcelAccess.match(/status: 'active'/g) ?? [];
    // Direct LandParcel lookup plus linked LandChangeApplication lookup.
    expect(activeFilters.length).toBeGreaterThanOrEqual(2);
  });

  it('denies a same-unit officer with an assignment on an unrelated application', async () => {
    dbMocks.requireLandActor.mockResolvedValue(officer());
    mockAssignments(
      [],
      [{ ...linkedAppAssignment(), resourceId: 'app-unrelated' }],
    );
    dbMocks.linksFindMany.mockResolvedValue([]);

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    expectSealed(payload, response, 403);
    expect(payload.code).toBe('LAND_ASSIGNMENT_REQUIRED');
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });
});

describe('T-007 AC-2 projection safety on the P0 route', () => {
  it.each([
    { name: 'valid Polygon', geometry: POLYGON, rings: 1 },
    { name: 'Polygon with holes', geometry: POLYGON_WITH_HOLE, rings: 2 },
  ])(
    'serves $name without repair or extra fields',
    async ({ geometry, rings }) => {
      dbMocks.requireLandActor.mockResolvedValue(leader());
      dbMocks.queryRaw.mockResolvedValueOnce([
        mapRow({ geometryGeoJson: JSON.stringify(geometry) }),
      ]);

      const response = await GET(new Request('http://localhost'), context());
      const payload = await body(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const parcel = payload.parcel as { geometry: { coordinates: unknown[] } };
      expect(parcel.geometry.coordinates).toHaveLength(rings);
      expect(parcel.geometry.coordinates).toEqual(geometry.coordinates);
      expect(Object.keys(payload).sort()).toEqual(
        ['parcel', 'projection', 'simulated'].sort(),
      );
      expect(Object.keys(parcel).sort()).toEqual(
        [
          'id',
          'parcelCode',
          'mapSheetNumber',
          'parcelNumber',
          'status',
          'geometry',
          'updatedAt',
        ].sort(),
      );
    },
  );

  it('fails closed on an open ring without a partial polygon', async () => {
    dbMocks.requireLandActor.mockResolvedValue(leader());
    dbMocks.queryRaw.mockResolvedValueOnce([
      mapRow({
        geometryGeoJson: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [105.98, 20.95],
              [105.981, 20.95],
              [105.981, 20.951],
              [105.98, 20.951],
            ],
          ],
        }),
      }),
    ]);

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    expectSealed(payload, response, 503);
    expect(payload).toEqual({
      code: 'MAP_LAYER_FAILED',
      error: 'Không thể hiển thị hình học thửa đất.',
    });
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('keeps land domain geometry rejections at 400 outside the map boundary', () => {
    expect(toLandApiError(new Error('GEOMETRY_INVALID'))).toEqual({
      status: 400,
      code: 'LAND_GEOMETRY_INVALID',
      error: 'Hình học thửa đất không hợp lệ.',
    });
    expect(toLandApiError(new Error('MAP_LAYER_FAILED'))).toEqual({
      status: 503,
      code: 'MAP_LAYER_FAILED',
      error: 'Không thể hiển thị hình học thửa đất.',
    });
  });

  it('reflects the current row freshness so stale responses are detectable', async () => {
    dbMocks.requireLandActor.mockResolvedValue(leader());
    dbMocks.queryRaw
      .mockResolvedValueOnce([
        mapRow({ updatedAt: new Date('2026-10-02T00:00:00.000Z') }),
      ])
      .mockResolvedValueOnce([
        mapRow({ updatedAt: new Date('2026-10-03T00:00:00.000Z') }),
      ]);

    const first = (await (
      await GET(new Request('http://localhost'), context())
    ).json()) as { parcel: { updatedAt: string } };
    const second = (await (
      await GET(new Request('http://localhost'), context())
    ).json()) as { parcel: { updatedAt: string } };

    expect(first.parcel.updatedAt).toBe('2026-10-02T00:00:00.000Z');
    expect(second.parcel.updatedAt).toBe('2026-10-03T00:00:00.000Z');
    expect(first.parcel.updatedAt).not.toBe(second.parcel.updatedAt);
  });

  it('audits allowed reads with minimal metadata and never raw geometry or PII', async () => {
    const actor = leader();
    dbMocks.requireLandActor.mockResolvedValue(actor);

    const response = await GET(new Request('http://localhost'), context());

    expect(response.status).toBe(200);
    expect(dbMocks.auditLandEvent).toHaveBeenCalledTimes(1);
    expect(dbMocks.auditLandEvent).toHaveBeenCalledWith(actor, {
      resourceType: 'LandParcel',
      resourceId: PARCEL_ID,
      operation: 'land.parcel.map.viewed',
      metadata: { outcome: 'allowed' },
    });
    expect(JSON.stringify(dbMocks.auditLandEvent.mock.calls)).not.toMatch(
      /Polygon|coordinates|105\.98|20\.95|address|party|token|citizen@/i,
    );
  });
});
