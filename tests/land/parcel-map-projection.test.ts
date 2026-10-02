import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { IdentityUser } from '@/modules/identity';
import { toLandApiError } from '@/modules/land/errors';
import {
  findMapParcelRow,
  getLandParcelMapProjection,
  toLandParcelMapResponse,
  type MapParcelRow,
} from '@/modules/land/parcel-map-projection';

const IMPL_SOURCE = readFileSync(
  new URL('../../src/modules/land/parcel-map-projection.ts', import.meta.url),
  'utf8',
);

const EXTERIOR = [
  [105.98, 20.95],
  [105.981, 20.95],
  [105.981, 20.951],
  [105.98, 20.951],
  [105.98, 20.95],
];

const HOLE_1 = [
  [105.9802, 20.9502],
  [105.9805, 20.9502],
  [105.9805, 20.9505],
  [105.9802, 20.9505],
  [105.9802, 20.9502],
];

const HOLE_2 = [
  [105.9806, 20.9506],
  [105.9808, 20.9506],
  [105.9808, 20.9508],
  [105.9806, 20.9508],
  [105.9806, 20.9506],
];

const POLYGON_WITH_HOLES = {
  type: 'Polygon' as const,
  coordinates: [EXTERIOR, HOLE_1, HOLE_2],
};

function mapRow(overrides?: Partial<MapParcelRow>): MapParcelRow {
  return {
    id: 'DEMO-PARCEL-001',
    parcelCode: 'DEMO-PARCEL-001',
    mapSheetNumber: '12',
    parcelNumber: '34',
    status: 'active',
    geometryGeoJson: JSON.stringify(POLYGON_WITH_HOLES),
    updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    organizationId: 'ou-land-a',
    ...overrides,
  };
}

function landLeader(overrides?: Partial<IdentityUser>): IdentityUser {
  return {
    id: 'map-leader',
    email: 'map-leader@demo.local',
    name: 'Map Leader',
    roles: ['commune_leader'] as unknown as IdentityUser['roles'],
    organizationUnitId: 'ou-land-a',
    ...overrides,
  };
}

function fakeClient(current: MapParcelRow | null) {
  const calls = { queryRaw: 0, executeRaw: 0 };
  const seen: unknown[][] = [];
  const client = {
    $queryRaw: async (...args: unknown[]) => {
      calls.queryRaw += 1;
      seen.push(args);
      return current ? [current] : [];
    },
    $executeRaw: async () => {
      calls.executeRaw += 1;
      throw new Error('WRITE_BLOCKED');
    },
    assignment: { findMany: async () => [] },
    landApplicationParcel: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  } as never;
  return { calls, seen, client };
}

describe('land map projection allowlist', () => {
  it('excludes internal and sensitive fields', () => {
    const response = toLandParcelMapResponse(mapRow());
    expect(Object.keys(response).sort()).toEqual(
      ['parcel', 'projection', 'simulated'].sort(),
    );
    expect(Object.keys(response.parcel).sort()).toEqual(
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
    expect(response).toMatchObject({
      parcel: {
        id: 'DEMO-PARCEL-001',
        parcelCode: 'DEMO-PARCEL-001',
        mapSheetNumber: '12',
        parcelNumber: '34',
        status: 'active',
        updatedAt: '2026-10-02T00:00:00.000Z',
      },
      simulated: true,
      projection: 'land-parcel-map',
    });
    const raw = JSON.stringify(response);
    for (const leaked of [
      'organizationId',
      'ou-land-a',
      'communeCode',
      'landUseType',
      'nationalRecordRef',
      'party',
      'rights',
      'Evidence',
      'audit',
      'version',
    ]) {
      expect(raw).not.toContain(leaked);
    }
  });

  it('queries only the allowlist plus organizationId via ST_AsGeoJSON', () => {
    expect(IMPL_SOURCE).toContain('ST_AsGeoJSON');
    for (const column of [
      '"parcelCode"',
      '"mapSheetNumber"',
      '"parcelNumber"',
      '"status"',
      '"updatedAt"',
      '"organizationId"',
    ]) {
      expect(IMPL_SOURCE).toContain(column);
    }
    for (const forbidden of [
      '"address"',
      '"landUseType"',
      '"communeCode"',
      '"areaSqm"',
      '"nationalRecordRef"',
      '"version"',
      '"createdAt"',
      'findParcelById',
      'getParcelDetail',
      'toParcelResponse',
      'toMapAreaGeoJson',
    ]) {
      expect(IMPL_SOURCE).not.toContain(forbidden);
    }
  });

  it('serves DEMO-PARCEL-001 to a scoped land actor through one query', async () => {
    const { calls, seen, client } = fakeClient(mapRow());
    const found = await findMapParcelRow('DEMO-PARCEL-001', client);
    expect(found?.parcelCode).toBe('DEMO-PARCEL-001');
    expect(calls.queryRaw).toBe(1);
    expect(calls.executeRaw).toBe(0);
    expect(JSON.stringify(seen)).toContain('DEMO-PARCEL-001');

    const { calls: serviceCalls, client: serviceClient } = fakeClient(mapRow());
    const response = await getLandParcelMapProjection(
      'DEMO-PARCEL-001',
      landLeader(),
      serviceClient,
    );
    expect(response.parcel.geometry).toEqual(POLYGON_WITH_HOLES);
    expect(response.simulated).toBe(true);
    expect(response.projection).toBe('land-parcel-map');
    expect(serviceCalls.queryRaw).toBe(1);
    expect(serviceCalls.executeRaw).toBe(0);
  });
});

describe('land map Polygon serializer', () => {
  it('keeps holes', () => {
    const { geometry } = toLandParcelMapResponse(mapRow()).parcel;
    expect(geometry.type).toBe('Polygon');
    expect(geometry.coordinates).toHaveLength(3);
    expect(geometry.coordinates).toEqual(POLYGON_WITH_HOLES.coordinates);
  });

  it('rejects invalid geometry', () => {
    const badValues = [
      'not-json{{{',
      JSON.stringify({ type: 'Point', coordinates: [105.98, 20.95] }),
      // Open ring: first position differs from last.
      JSON.stringify({
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
      // Ring with fewer than four positions.
      JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [105.98, 20.95],
            [105.981, 20.95],
            [105.98, 20.95],
          ],
        ],
      }),
      // Non-finite position serializes to null and must fail closed.
      JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [105.98, 20.95],
            [null, 20.95],
            [105.981, 20.951],
            [105.98, 20.95],
          ],
        ],
      }),
    ];
    for (const geometryGeoJson of badValues) {
      expect(() =>
        toLandParcelMapResponse(mapRow({ geometryGeoJson })),
      ).toThrow('GEOMETRY_INVALID');
    }
  });

  it('fails closed through the service without a partial polygon', async () => {
    const { client } = fakeClient(mapRow({ geometryGeoJson: 'not-json{{{' }));
    try {
      await getLandParcelMapProjection('DEMO-PARCEL-001', landLeader(), client);
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toBe('GEOMETRY_INVALID');
      expect(toLandApiError(error)).toMatchObject({
        status: 400,
        code: 'LAND_GEOMETRY_INVALID',
      });
    }
  });

  it('checks access before serializing geometry', async () => {
    const { client } = fakeClient(mapRow({ geometryGeoJson: 'not-json{{{' }));
    await expect(
      getLandParcelMapProjection(
        'DEMO-PARCEL-001',
        landLeader({ organizationUnitId: 'ou-land-b' }),
        client,
      ),
    ).rejects.toThrow('FORBIDDEN');
  });
});

describe('land map no-persistence boundary', () => {
  it('does not require or alter migration/schema files', async () => {
    for (const token of [
      'INSERT INTO',
      '$executeRaw',
      '.create(',
      '.update(',
      '.deleteMany',
      'MATERIALIZED',
      'CREATE INDEX',
      'CREATE TABLE',
      'OfflineCommand',
      'ProjectionRecord',
    ]) {
      expect(IMPL_SOURCE).not.toContain(token);
    }
    expect(IMPL_SOURCE).toContain('$queryRaw');
    expect(IMPL_SOURCE).toContain('SELECT');

    const { calls, client } = fakeClient(mapRow());
    await getLandParcelMapProjection('DEMO-PARCEL-001', landLeader(), client);
    expect(calls.queryRaw).toBe(1);
    expect(calls.executeRaw).toBe(0);
  });
});
