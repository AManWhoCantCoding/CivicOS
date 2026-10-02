import { readFileSync } from 'node:fs';

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

import { GET } from '@/app/api/map/land-parcels/[parcelId]/route';
import type { IdentityUser } from '@/modules/identity';
import { assertLandActor } from '@/modules/land/access';

const ROUTE_SOURCE = readFileSync(
  new URL(
    '../../src/app/api/map/land-parcels/[parcelId]/route.ts',
    import.meta.url,
  ),
  'utf8',
);

const OU_A = 'ou-land-a';
const PARCEL_ID = 'parcel-map-001';

const POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [105.98, 20.95],
      [105.981, 20.95],
      [105.981, 20.951],
      [105.98, 20.951],
      [105.98, 20.95],
    ],
  ],
};

const EXPECTED_BODY = {
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
};

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

function directLandReviewAssignment() {
  return {
    task: 'land_review',
    resourceType: 'LandParcel',
    resourceId: PARCEL_ID,
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

function expectSealedError(
  payload: Record<string, unknown>,
  response: Response,
) {
  expect(Object.keys(payload).sort()).toEqual(['code', 'error']);
  expect(JSON.stringify(payload)).not.toMatch(
    /polygon|coordinates|organizationId|ou-land|address|party|rights|evidence|105\.98|token/i,
  );
  expect(response.headers.get('Cache-Control')).toBe('no-store');
}

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.queryRaw.mockResolvedValue([mapRow()]);
  dbMocks.assignmentFindMany.mockResolvedValue([]);
  dbMocks.linksFindMany.mockResolvedValue([]);
  dbMocks.auditLandEvent.mockResolvedValue(undefined);
});

describe('GET /api/map/land-parcels/:parcelId authorization', () => {
  it('returns 401 LAND_UNAUTHENTICATED without touching the read seam', async () => {
    dbMocks.requireLandActor.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    expect(response.status).toBe(401);
    expectSealedError(payload, response);
    expect(payload).toEqual({
      code: 'LAND_UNAUTHENTICATED',
      error: 'Bạn cần đăng nhập để thực hiện thao tác này.',
    });
    expect(dbMocks.queryRaw).not.toHaveBeenCalled();
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('denies citizen and legacy map roles with 403 LAND_FORBIDDEN', async () => {
    for (const roles of [['citizen'], ['duty_officer']] as const) {
      const deniedActor = {
        id: 'map-denied',
        email: 'map-denied@demo.local',
        name: 'Denied Map Actor',
        roles: roles as unknown as IdentityUser['roles'],
        organizationUnitId: OU_A,
      };
      expect(() => assertLandActor(deniedActor)).toThrow('FORBIDDEN');
      dbMocks.requireLandActor.mockRejectedValueOnce(new Error('FORBIDDEN'));
      const response = await GET(new Request('http://localhost'), context());
      const payload = await body(response);

      expect(response.status).toBe(403);
      expect(payload).toEqual({
        code: 'LAND_FORBIDDEN',
        error: 'Bạn không có quyền thực hiện thao tác này.',
      });
      expectSealedError(payload, response);
    }
    expect(dbMocks.queryRaw).not.toHaveBeenCalled();
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('denies cross-unit reads without leaking existence', async () => {
    dbMocks.requireLandActor.mockResolvedValue(
      officer({ organizationUnitId: 'ou-land-b' }),
    );

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      code: 'LAND_FORBIDDEN',
      error: 'Bạn không có quyền thực hiện thao tác này.',
    });
    expectSealedError(payload, response);
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('requires officer assignment with 403 LAND_ASSIGNMENT_REQUIRED', async () => {
    const actor = officer();
    dbMocks.requireLandActor.mockResolvedValue(actor);

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      code: 'LAND_ASSIGNMENT_REQUIRED',
      error: 'Bạn chưa được phân công xử lý hồ sơ này.',
    });
    expectSealedError(payload, response);
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });
});

describe('GET /api/map/land-parcels/:parcelId success contract', () => {
  it('returns the minimal simulated Polygon projection for an officer with access', async () => {
    const actor = officer();
    dbMocks.requireLandActor.mockResolvedValue(actor);
    dbMocks.assignmentFindMany.mockImplementation(async (args: unknown) => {
      const resourceType = (args as { where?: { resourceType?: string } }).where
        ?.resourceType;
      return (
        resourceType === 'LandParcel' ? [directLandReviewAssignment()] : []
      ) as never;
    });

    const response = await GET(new Request('http://localhost'), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(EXPECTED_BODY);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(dbMocks.auditLandEvent).toHaveBeenCalledTimes(1);
    expect(dbMocks.auditLandEvent).toHaveBeenCalledWith(actor, {
      resourceType: 'LandParcel',
      resourceId: PARCEL_ID,
      operation: 'land.parcel.map.viewed',
      metadata: { outcome: 'allowed' },
    });
  });

  it('returns the projection for a same-unit commune leader without assignment', async () => {
    const actor = leader();
    dbMocks.requireLandActor.mockResolvedValue(actor);

    const response = await GET(new Request('http://localhost'), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(EXPECTED_BODY);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(dbMocks.auditLandEvent).toHaveBeenCalledTimes(1);
    expect(dbMocks.auditLandEvent).toHaveBeenCalledWith(actor, {
      resourceType: 'LandParcel',
      resourceId: PARCEL_ID,
      operation: 'land.parcel.map.viewed',
      metadata: { outcome: 'allowed' },
    });
  });
});

describe('GET /api/map/land-parcels/:parcelId safety', () => {
  it('maps a blank parcel id to sealed LAND_INVALID_REQUEST', async () => {
    dbMocks.requireLandActor.mockResolvedValue(leader());

    const response = await GET(new Request('http://localhost'), context('   '));
    const payload = await body(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      code: 'LAND_INVALID_REQUEST',
      error: 'Dữ liệu yêu cầu không hợp lệ.',
    });
    expectSealedError(payload, response);
    expect(dbMocks.queryRaw).not.toHaveBeenCalled();
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('returns generic not-found without geometry for unknown parcels', async () => {
    dbMocks.requireLandActor.mockResolvedValue(leader());
    dbMocks.queryRaw.mockResolvedValueOnce([]);

    const response = await GET(
      new Request('http://localhost'),
      context('missing-parcel'),
    );
    const payload = await body(response);

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      code: 'LAND_PARCEL_NOT_FOUND',
      error: 'Thửa đất không tồn tại.',
    });
    expectSealedError(payload, response);
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('fails closed on invalid geometry without a partial response', async () => {
    dbMocks.requireLandActor.mockResolvedValue(leader());
    dbMocks.queryRaw.mockResolvedValueOnce([
      mapRow({ geometryGeoJson: 'not-json{{{' }),
    ]);

    const response = await GET(new Request('http://localhost'), context());
    const payload = await body(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      code: 'LAND_GEOMETRY_INVALID',
      error: 'Hình học thửa đất không hợp lệ.',
    });
    expectSealedError(payload, response);
    expect(dbMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('audits with minimal metadata and never raw geometry or PII', async () => {
    const actor = leader();
    dbMocks.requireLandActor.mockResolvedValue(actor);

    const response = await GET(new Request('http://localhost'), context());

    expect(response.status).toBe(200);
    const metadata = dbMocks.auditLandEvent.mock.calls[0][1].metadata as Record<
      string,
      unknown
    >;
    expect(metadata).toEqual({ outcome: 'allowed' });
    expect(JSON.stringify(dbMocks.auditLandEvent.mock.calls[0])).not.toMatch(
      /Polygon|coordinates|105\.98|20\.95|address|party|token|citizen@/i,
    );
  });

  it('uses the land policy seam and never public lookup or legacy map capability', () => {
    for (const required of [
      'requireLandActor',
      'getLandParcelMapProjection',
      'auditLandEvent',
      'toLandApiError',
      'Cache-Control',
      'no-store',
      'land.parcel.map.viewed',
    ]) {
      expect(ROUTE_SOURCE).toContain(required);
    }
    for (const forbidden of [
      'public/land',
      'publicLookup',
      'lookupPublicLand',
      'hasBusinessCapability',
      'businessCapability',
      'toMapAreaGeoJson',
      'projectionRecord',
      'ProjectionRecord',
      'markers',
    ]) {
      expect(ROUTE_SOURCE).not.toContain(forbidden);
    }
  });
});
