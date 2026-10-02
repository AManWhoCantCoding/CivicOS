import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity';
import {
  DISCOVERY_LIMIT_DEFAULT,
  DISCOVERY_LIMIT_MAX,
  findMapDiscoveryRows,
  getLandParcelMapDiscovery,
  parseDiscoveryQuery,
} from '@/modules/land/parcel-map-discovery';
import { encodeCursor } from '@/modules/land/schemas';

const routeMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  assignmentFindMany: vi.fn(),
  linksFindMany: vi.fn(),
  requireLandActor: vi.fn(),
  auditLandEvent: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: routeMocks.queryRaw,
    assignment: { findMany: routeMocks.assignmentFindMany },
    landApplicationParcel: { findMany: routeMocks.linksFindMany },
  },
}));

vi.mock('@/modules/land/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/land/access')>();
  return {
    ...actual,
    requireLandActor: routeMocks.requireLandActor,
    auditLandEvent: routeMocks.auditLandEvent,
  };
});

import { GET } from '@/app/api/map/land-parcels/route';

const IMPL_SOURCE = readFileSync(
  new URL('../../src/modules/land/parcel-map-discovery.ts', import.meta.url),
  'utf8',
);

const OU_A = 'ou-land-a';
const OU_B = 'ou-land-b';

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

const BBOX = '105.93,20.91,106.03,20.99';

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    parcelCode: `PARCEL-${id.slice(-3)}`,
    mapSheetNumber: '12',
    parcelNumber: '34',
    communeCode: 'CM-01',
    status: 'active',
    geometryGeoJson: JSON.stringify(POLYGON),
    updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    organizationId: OU_A,
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

// Expand nested Prisma Sql fragments the way the real client flattens them
// for the wire: fragment text is inlined, scalar leaves stay parameterized.
function expandSql(value: unknown): { text: string; leaves: unknown[] } {
  if (
    value !== null &&
    typeof value === 'object' &&
    'strings' in value &&
    'values' in value
  ) {
    const fragment = value as {
      strings: readonly string[];
      values: unknown[];
    };
    let text = '';
    const leaves: unknown[] = [];
    fragment.strings.forEach((part, index) => {
      text += part;
      if (index < fragment.values.length) {
        const inner = expandSql(fragment.values[index]);
        text += inner.text === '?' ? '?' : inner.text;
        leaves.push(...inner.leaves);
      }
    });
    return { text, leaves };
  }
  return { text: '?', leaves: [value] };
}

// Fake LandDbClient: canned LandParcel rows plus assignment seams for the
// parcel access policy. List queries page in id order like the real SQL.
function fakeClient(
  allRows: Record<string, unknown>[],
  assignments: unknown[] = [],
) {
  const seen: { sql: string; values: unknown[] }[] = [];
  const client = {
    $queryRaw: async (...args: unknown[]) => {
      const [first, ...rest] = args;
      const outer = expandSql({ strings: first, values: rest });
      const sql = outer.text;
      const values = outer.leaves;
      seen.push({ sql, values });
      if (sql.includes('ORDER BY')) {
        const ordered = [...allRows].sort((a, b) =>
          String(a.id) < String(b.id) ? -1 : 1,
        );
        const limitPlusOne = Number(values[values.length - 1]);
        const scoped = sql.includes('"id" >')
          ? ordered.filter(
              (entry) => String(entry.id) > String(values[values.length - 2]),
            )
          : ordered;
        return Number.isInteger(limitPlusOne)
          ? scoped.slice(0, limitPlusOne)
          : scoped;
      }
      if (sql.includes('ST_Intersects')) return [{ hit: 1 }];
      const wanted = values[0];
      return allRows.filter((entry) => entry.id === wanted);
    },
    assignment: { findMany: async () => assignments },
    landApplicationParcel: { findMany: async () => [] },
  } as never;
  return { seen, client };
}

describe('T-008 AC-1 bounded scoped query parsing', () => {
  it('returns bounded scoped items with cursor and allowlist', async () => {
    const { client } = fakeClient([
      row('parcel-001'),
      row('parcel-002'),
      row('parcel-003'),
    ]);
    const query = parseDiscoveryQuery({
      parcelCode: '  PARCEL-001 ',
      limit: '2',
    });
    expect(query.parcelCode).toBe('PARCEL-001');
    expect(query.limit).toBe(2);
    const response = await getLandParcelMapDiscovery(
      leader(),
      { parcelCode: 'PARCEL-001', limit: '2' },
      client,
    );
    expect(response.items).toHaveLength(2);
    expect(response.nextCursor).toBe(encodeCursor('parcel-002'));
    expect(response).toMatchObject({
      simulated: true,
      projection: 'land-parcel-map',
    });
    expect(Object.keys(response.items[0] as object).sort()).toEqual(
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
    expect(JSON.stringify(response)).not.toContain(OU_A);
    expect(JSON.stringify(response)).not.toContain('CM-01');
  });

  it('applies default 50 and max 100 limits', () => {
    expect(parseDiscoveryQuery({ parcelCode: 'P-1' }).limit).toBe(
      DISCOVERY_LIMIT_DEFAULT,
    );
    expect(DISCOVERY_LIMIT_DEFAULT).toBe(50);
    expect(DISCOVERY_LIMIT_MAX).toBe(100);
    expect(parseDiscoveryQuery({ parcelCode: 'P-1', limit: '100' }).limit).toBe(
      100,
    );
  });

  it('accepts the P1 status subset and a bounded bbox', () => {
    for (const status of ['proposed', 'active', 'retired']) {
      expect(parseDiscoveryQuery({ status }).status).toBe(status);
    }
    const query = parseDiscoveryQuery({ bbox: BBOX });
    expect(query.bbox).toEqual({
      minLng: 105.93,
      minLat: 20.91,
      maxLng: 106.03,
      maxLat: 20.99,
    });
  });
});

describe('T-008 AC-2 spatial and query-plan safety fails closed', () => {
  it.each([['invalid bbox'], ['wide bbox'], ['payload overflow']])(
    'fails closed for %s',
    async (kind) => {
      if (kind === 'invalid bbox') {
        expect(() =>
          parseDiscoveryQuery({ bbox: '106.03,20.99,105.93,20.91' }),
        ).toThrow('INVALID_REQUEST');
        expect(() => parseDiscoveryQuery({ bbox: '105.93,20.91' })).toThrow(
          'INVALID_REQUEST',
        );
        expect(() => parseDiscoveryQuery({ bbox: 'a,b,c,d' })).toThrow(
          'INVALID_REQUEST',
        );
      }
      if (kind === 'wide bbox') {
        expect(() =>
          parseDiscoveryQuery({ bbox: '100.0,10.0,110.0,25.0' }),
        ).toThrow('INVALID_REQUEST');
        expect(() =>
          parseDiscoveryQuery({ bbox: '105.0,20.0,107.0,22.0' }),
        ).toThrow('INVALID_REQUEST');
      }
      if (kind === 'payload overflow') {
        expect(() =>
          parseDiscoveryQuery({ parcelCode: 'P-1', limit: '101' }),
        ).toThrow('INVALID_REQUEST');
        expect(() =>
          parseDiscoveryQuery({ parcelCode: 'P-1', limit: '0' }),
        ).toThrow('INVALID_REQUEST');
        // limit+1 paging never silently truncates: an over-limit page keeps
        // a nextCursor instead of dropping rows.
        const rows = [row('parcel-001'), row('parcel-002')];
        const { client } = fakeClient(rows);
        const response = await getLandParcelMapDiscovery(
          leader(),
          { parcelCode: 'PARCEL-001', limit: '1' },
          client,
        );
        expect(response.items).toHaveLength(1);
        expect(response.nextCursor).toBe(encodeCursor('parcel-001'));
      }
    },
  );

  it('rejects empty unbounded queries and non-P1 statuses', () => {
    expect(() => parseDiscoveryQuery({})).toThrow('INVALID_REQUEST');
    expect(() => parseDiscoveryQuery({ limit: '10' })).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseDiscoveryQuery({ status: 'archived' })).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseDiscoveryQuery({ cursor: '!!!' })).toThrow(
      'INVALID_REQUEST',
    );
  });

  it('rejects invalid or mismatched cursors without returning items', async () => {
    const { client } = fakeClient([row('parcel-001')]);
    await expect(
      getLandParcelMapDiscovery(
        leader(),
        { parcelCode: 'PARCEL-001', cursor: encodeCursor('parcel-999') },
        client,
      ),
    ).rejects.toThrow('INVALID_REQUEST');
    await expect(
      getLandParcelMapDiscovery(
        leader(),
        { parcelCode: 'PARCEL-OTHER', cursor: encodeCursor('parcel-001') },
        client,
      ),
    ).rejects.toThrow('INVALID_REQUEST');
  });

  it('requires approved migration for new index (no schema change)', () => {
    expect(IMPL_SOURCE).not.toMatch(/CREATE\s+(UNIQUE\s+)?INDEX/i);
    expect(IMPL_SOURCE).not.toMatch(/\$executeRaw|executeRaw/);
    expect(IMPL_SOURCE).toContain('ST_MakeEnvelope');
    expect(IMPL_SOURCE).toContain('ST_Intersects');
    expect(IMPL_SOURCE).toContain('ORDER BY "id" ASC');
  });

  it('uses parameterized SQL with the envelope operator', async () => {
    const { seen, client } = fakeClient([row('parcel-001')]);
    await findMapDiscoveryRows(
      OU_A,
      parseDiscoveryQuery({ parcelCode: 'PARCEL-001', bbox: BBOX }),
      client,
    );
    expect(seen).toHaveLength(1);
    const { sql, values } = seen[0] as { sql: string; values: unknown[] };
    expect(sql).toContain('"geometry" &&');
    expect(sql).toContain('ST_Intersects');
    expect(sql).toContain('ORDER BY "id" ASC');
    expect(sql).not.toContain('PARCEL-001');
    expect(values).toContain('PARCEL-001');
    expect(values).toContain(OU_A);
  });
});

describe('T-008 AC-3 privacy boundary', () => {
  it('denies public and cross-unit discovery without leakage', async () => {
    const { client } = fakeClient([row('parcel-001')]);
    await expect(
      getLandParcelMapDiscovery(null, { parcelCode: 'PARCEL-001' }, client),
    ).rejects.toThrow('UNAUTHENTICATED');
    await expect(
      getLandParcelMapDiscovery(
        { ...leader(), roles: ['citizen'] } as unknown as IdentityUser,
        { parcelCode: 'PARCEL-001' },
        client,
      ),
    ).rejects.toThrow('FORBIDDEN');
    const crossUnit = leader({ organizationUnitId: OU_B });
    await expect(
      getLandParcelMapDiscovery(
        crossUnit,
        { parcelCode: 'PARCEL-001' },
        client,
      ),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('rechecks selection access per returned parcel for officers', async () => {
    const { client: deniedClient } = fakeClient([row('parcel-001')]);
    await expect(
      getLandParcelMapDiscovery(
        officer(),
        { parcelCode: 'PARCEL-001' },
        deniedClient,
      ),
    ).rejects.toThrow('ASSIGNMENT_REQUIRED');
    const assignment = {
      task: 'land_review',
      resourceType: 'LandParcel',
      resourceId: 'parcel-001',
      status: 'active',
      organizationId: OU_A,
    };
    const { client: allowedClient } = fakeClient(
      [row('parcel-001')],
      [assignment],
    );
    const response = await getLandParcelMapDiscovery(
      officer(),
      { parcelCode: 'PARCEL-001' },
      allowedClient,
    );
    expect(response.items).toHaveLength(1);
  });

  it('fails closed on unserializable geometry', async () => {
    const { client } = fakeClient([
      row('parcel-001', { geometryGeoJson: '{"type":"Point"}' }),
    ]);
    await expect(
      getLandParcelMapDiscovery(leader(), { parcelCode: 'PARCEL-001' }, client),
    ).rejects.toThrow('GEOMETRY_INVALID');
  });
});

describe('T-008 discovery route contract', () => {
  const ROUTE_SOURCE = readFileSync(
    new URL('../../src/app/api/map/land-parcels/route.ts', import.meta.url),
    'utf8',
  );

  beforeEach(() => {
    routeMocks.queryRaw.mockReset();
    routeMocks.assignmentFindMany.mockReset();
    routeMocks.linksFindMany.mockReset();
    routeMocks.requireLandActor.mockReset();
    routeMocks.auditLandEvent.mockReset();
    routeMocks.assignmentFindMany.mockResolvedValue([]);
    routeMocks.linksFindMany.mockResolvedValue([]);
    routeMocks.auditLandEvent.mockResolvedValue(undefined);
  });

  function request(query: string): Request {
    return new Request(`http://localhost/api/map/land-parcels${query}`);
  }

  it('serves a bounded allowlist page with no-store and minimal audit', async () => {
    routeMocks.requireLandActor.mockResolvedValue(leader());
    routeMocks.queryRaw.mockResolvedValue([
      row('parcel-001'),
      row('parcel-002'),
    ]);
    const response = await GET(request('?parcelCode=PARCEL-001&limit=1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as {
      items: Record<string, unknown>[];
      nextCursor: string | null;
      simulated: boolean;
      projection: string;
    };
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBe(encodeCursor('parcel-001'));
    expect(body.simulated).toBe(true);
    expect(body.projection).toBe('land-parcel-map');
    expect(Object.keys(body.items[0] as object).sort()).toEqual(
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
    expect(JSON.stringify(body)).not.toContain(OU_A);
    expect(routeMocks.auditLandEvent).toHaveBeenCalledTimes(1);
    const auditArg = routeMocks.auditLandEvent.mock.calls[0]?.[1] as {
      operation: string;
      resourceId: string;
      metadata: Record<string, unknown>;
    };
    expect(auditArg.operation).toBe('land.parcel.map.discovery');
    expect(auditArg.resourceId).toBe(OU_A);
    expect(auditArg.metadata).toEqual({
      outcome: 'allowed',
      returnedCount: 1,
      hasNextPage: true,
    });
    expect(JSON.stringify(routeMocks.auditLandEvent.mock.calls)).not.toContain(
      'coordinates',
    );
  });

  it('rejects empty unbounded queries without auditing', async () => {
    routeMocks.requireLandActor.mockResolvedValue(leader());
    const response = await GET(request(''));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe('LAND_INVALID_REQUEST');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(routeMocks.queryRaw).not.toHaveBeenCalled();
    expect(routeMocks.auditLandEvent).not.toHaveBeenCalled();
  });

  it('maps auth, policy and geometry failures to the safe envelope', async () => {
    routeMocks.requireLandActor.mockRejectedValueOnce(
      new Error('UNAUTHENTICATED'),
    );
    const unauthenticated = await GET(request('?parcelCode=PARCEL-001'));
    expect(unauthenticated.status).toBe(401);
    expect(((await unauthenticated.json()) as { code: string }).code).toBe(
      'LAND_UNAUTHENTICATED',
    );

    routeMocks.requireLandActor.mockResolvedValue(
      leader({ organizationUnitId: OU_B }),
    );
    routeMocks.queryRaw.mockResolvedValue([row('parcel-001')]);
    const crossUnit = await GET(request('?parcelCode=PARCEL-001'));
    expect(crossUnit.status).toBe(403);
    expect(((await crossUnit.json()) as { code: string }).code).toBe(
      'LAND_FORBIDDEN',
    );

    routeMocks.requireLandActor.mockResolvedValue(leader());
    routeMocks.queryRaw.mockResolvedValue([
      row('parcel-001', { geometryGeoJson: '{"type":"Point"}' }),
    ]);
    const broken = await GET(request('?parcelCode=PARCEL-001'));
    expect(broken.status).toBe(503);
    expect(((await broken.json()) as { code: string }).code).toBe(
      'MAP_LAYER_FAILED',
    );
    for (const response of [unauthenticated, crossUnit, broken]) {
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });

  it('keeps the route free of shape detail and write seams', () => {
    expect(ROUTE_SOURCE).toContain("'Cache-Control': 'no-store'");
    expect(ROUTE_SOURCE).toContain('land.parcel.map.discovery');
    expect(ROUTE_SOURCE).not.toContain('coordinates');
    expect(ROUTE_SOURCE).not.toContain('$executeRaw');
  });
});
