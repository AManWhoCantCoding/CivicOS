import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  blindIndex,
  decryptSensitive,
  encryptSensitive,
} from '@/modules/identity';
import { evaluatePolicy } from '@/modules/identity/authorization';
import {
  assertCanViewPartySensitive,
  assertLandActor,
} from '@/modules/land/access';
import { toLandApiError } from '@/modules/land/errors';
import {
  fromGeometryJson,
  toGeometryParam,
  validateParcelPolygon,
} from '@/modules/land/parcel-geometry';
import {
  createParcel,
  listParcels,
  toDecimalString,
  toParcelResponse,
} from '@/modules/land/parcel-service';
import {
  findParcelsByOrganization,
  insertParcel,
} from '@/modules/land/parcel-repository';
import {
  createParty,
  listParties,
  maskIdentityNumber,
  toPartyResponse,
} from '@/modules/land/party-service';
import {
  findPartiesByOrganization,
  insertParty,
} from '@/modules/land/party-repository';
import {
  decodeCursor,
  encodeCursor,
  isDecimalString,
  parseLandListQuery,
  parseParcelInput,
  parsePartyInput,
} from '@/modules/land/schemas';
import type { IdentityUser } from '@/modules/identity';
import type { ParcelRow } from '@/modules/land/parcel-repository';
import type { PartyRow } from '@/modules/land/party-repository';

// Controllable audit failure seam for DR-19 rollback regression tests.
// recordAudit is wrapped, never replaced: flag off preserves every seam.
const auditControl = vi.hoisted(() => ({ fail: false }));

vi.mock('@/modules/identity', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/modules/identity')>();
  return {
    ...mod,
    recordAudit: async (
      input: Parameters<typeof mod.recordAudit>[0],
      client?: Parameters<typeof mod.recordAudit>[1],
    ) => {
      if (auditControl.fail) throw new Error('AUDIT_UNAVAILABLE');
      return mod.recordAudit(input, client);
    },
  };
});

function officer(overrides?: Partial<IdentityUser>): IdentityUser {
  return {
    id: 'lnd02-officer',
    email: 'officer@demo.local',
    name: 'Demo Officer',
    roles: ['land_officer'] as unknown as IdentityUser['roles'],
    organizationUnitId: 'lnd02-ou-a',
    ...overrides,
  };
}

const SQUARE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [105, 20],
      [105.001, 20],
      [105.001, 20.001],
      [105, 20.001],
      [105, 20],
    ],
  ],
};

function parcelBody(code: string): Record<string, unknown> {
  return {
    parcelCode: code,
    mapSheetNumber: 'SHEET-01',
    parcelNumber: 'NUM-01',
    areaSqm: '125.50',
    landUseType: 'residential',
    address: 'Dia chi demo',
    communeCode: 'COMMUNE-01',
    geometry: SQUARE,
  };
}

describe('LND-02 party privacy helpers', () => {
  it('masks identity numbers keeping four trailing characters', () => {
    expect(maskIdentityNumber('0000000001')).toBe('******0001');
    expect(maskIdentityNumber('1234')).toBe('****');
    expect(maskIdentityNumber(null)).toBeNull();
  });

  it('maps stored rows without ciphertext internals', () => {
    const row: PartyRow = {
      id: 'party-001',
      referenceCode: 'PARTY-001',
      partyType: 'individual',
      displayNameCiphertext: 'cipher',
      identityNumberCiphertext: null,
      identityNumberIndex: null,
      status: 'active',
      createdAt: new Date('2026-09-30T00:00:00.000Z'),
      updatedAt: new Date('2026-09-30T00:00:00.000Z'),
    };
    const response = toPartyResponse(row, 'Demo Citizen', '******0001');
    expect(Object.keys(response).sort()).toEqual(
      [
        'createdAt',
        'displayName',
        'id',
        'identityNumberMasked',
        'partyType',
        'referenceCode',
        'status',
        'updatedAt',
      ].sort(),
    );
    expect(JSON.stringify(response)).not.toContain('cipher');
  });
});

describe('LND-02 input schemas', () => {
  it('parses valid party input with nullable identity number', () => {
    expect(
      parsePartyInput({
        referenceCode: 'PARTY-001',
        partyType: 'individual',
        displayName: 'Demo Citizen',
        identityNumber: null,
      }),
    ).toEqual({
      referenceCode: 'PARTY-001',
      partyType: 'individual',
      displayName: 'Demo Citizen',
      identityNumber: null,
    });
  });

  it('rejects party input with missing name or unknown type', () => {
    expect(() =>
      parsePartyInput({
        referenceCode: 'PARTY-001',
        partyType: 'individual',
        displayName: '  ',
      }),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parsePartyInput({
        referenceCode: 'PARTY-001',
        partyType: 'alien',
        displayName: 'Demo',
      }),
    ).toThrow('INVALID_REQUEST');
  });

  it('parses valid parcel input with DecimalString area', () => {
    const parsed = parseParcelInput(parcelBody('PARCEL-001'));
    expect(parsed.areaSqm).toBe('125.50');
    expect(parsed.geometry).toEqual(SQUARE);
  });

  it('rejects parcel input with bad area or geometry', () => {
    expect(() =>
      parseParcelInput({ ...parcelBody('P'), areaSqm: '0' }),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseParcelInput({ ...parcelBody('P'), areaSqm: '12.345' }),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseParcelInput({ ...parcelBody('P'), geometry: undefined }),
    ).toThrow('GEOMETRY_INVALID');
  });

  it('checks DecimalString and list query bounds', () => {
    expect(isDecimalString('125.50')).toBe(true);
    expect(isDecimalString('12.345')).toBe(false);
    expect(parseLandListQuery({}).limit).toBe(50);
    expect(parseLandListQuery({ limit: '20' }).limit).toBe(20);
    expect(() => parseLandListQuery({ limit: '200' })).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseLandListQuery({ status: 'bogus' })).toThrow(
      'INVALID_REQUEST',
    );
  });

  it('round-trips opaque cursors and rejects garbage', () => {
    expect(decodeCursor(encodeCursor('abc'))).toBe('abc');
    expect(() => decodeCursor('bogus!!')).toThrow('INVALID_REQUEST');
  });
});

describe('LND-02 geometry seam', () => {
  it('accepts closed polygons and rejects points', () => {
    expect(() => validateParcelPolygon(SQUARE)).not.toThrow();
    expect(() =>
      validateParcelPolygon({ type: 'Point', coordinates: [105, 20] }),
    ).toThrow('GEOMETRY_INVALID');
    expect(() =>
      validateParcelPolygon({
        type: 'Polygon',
        coordinates: [
          [
            [105, 20],
            [105.001, 20],
            [105, 20],
          ],
        ],
      }),
    ).toThrow('GEOMETRY_INVALID');
    expect(() =>
      validateParcelPolygon({
        type: 'Polygon',
        coordinates: [
          [
            [105, 20],
            [105.001, 20],
            [105.001, 20.001],
            [105, 20.001],
            [105.002, 20.002],
          ],
        ],
      }),
    ).toThrow('GEOMETRY_INVALID');
  });

  it('round-trips ST_AsGeoJSON payloads', () => {
    expect(fromGeometryJson(toGeometryParam(SQUARE))).toEqual(SQUARE);
    expect(() => fromGeometryJson('not-json')).toThrow('GEOMETRY_INVALID');
  });

  it('normalizes numeric output to DecimalString', () => {
    expect(toDecimalString('125.50')).toBe('125.50');
    expect(toDecimalString('125.5')).toBe('125.50');
    expect(() => toDecimalString('abc')).toThrow('INVALID_REQUEST');
  });

  it('maps stored parcel rows without storage internals', () => {
    const row: ParcelRow = {
      id: 'parcel-001',
      parcelCode: 'PARCEL-001',
      mapSheetNumber: '12',
      parcelNumber: '34',
      areaSqm: '125.5',
      landUseType: 'residential',
      address: 'Demo address',
      communeCode: 'DEMO-COMMUNE',
      organizationId: 'ou-demo',
      geometryGeoJson: toGeometryParam(SQUARE),
      nationalRecordRef: null,
      status: 'active',
      version: 1,
      createdAt: new Date('2026-09-30T00:00:00.000Z'),
      updatedAt: new Date('2026-09-30T00:00:00.000Z'),
    };
    const response = toParcelResponse(row);
    expect(response.areaSqm).toBe('125.50');
    expect(response.version).toBe(1);
    expect(response.nationalRecordRef).toBeNull();
    expect(response.geometry).toEqual(SQUARE);
  });
});

describe('LND-02 error mapping', () => {
  it('maps internal codes to Vietnamese LAND_* errors', () => {
    expect(toLandApiError(new Error('FORBIDDEN'))).toEqual({
      status: 403,
      code: 'LAND_FORBIDDEN',
      error: 'Bạn không có quyền thực hiện thao tác này.',
    });
    expect(toLandApiError(new Error('UNAUTHENTICATED'))).toEqual({
      status: 401,
      code: 'LAND_UNAUTHENTICATED',
      error: 'Bạn cần đăng nhập để thực hiện thao tác này.',
    });
    expect(toLandApiError(new Error('GEOMETRY_INVALID'))).toEqual({
      status: 400,
      code: 'LAND_GEOMETRY_INVALID',
      error: 'Hình học thửa đất không hợp lệ.',
    });
    expect(toLandApiError(new Error('DUPLICATE_CODE'))).toEqual({
      status: 409,
      code: 'LAND_DUPLICATE_CODE',
      error: 'Mã dữ liệu đã tồn tại.',
    });
    expect(toLandApiError(new Error('SOMETHING_ELSE'))).toEqual({
      status: 400,
      code: 'LAND_INVALID_REQUEST',
      error: 'Dữ liệu yêu cầu không hợp lệ.',
    });
    expect(
      toLandApiError(Object.assign(new Error('exists'), { code: 'P2002' })),
    ).toMatchObject({ status: 409, code: 'LAND_DUPLICATE_CODE' });
  });
});

describe('LND-02 scope and sensitive gates', () => {
  it('enforces land role and organization presence', () => {
    expect(() => assertLandActor(null)).toThrow('UNAUTHENTICATED');
    expect(() =>
      assertLandActor({ ...officer(), roles: ['commander'] }),
    ).toThrow('FORBIDDEN');
    expect(() =>
      assertLandActor({ ...officer(), organizationUnitId: undefined }),
    ).toThrow('FORBIDDEN');
    expect(() => assertLandActor(officer())).not.toThrow();
  });

  it('allows same-OU land sensitive reads, denies cross-OU/outsider/citizen', async () => {
    expect(
      evaluatePolicy({
        user: officer(),
        resource: {
          resourceType: 'LandParty',
          resourceId: '*',
          organizationId: 'lnd02-ou-a',
        },
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: true, reason: 'ALLOWED' });
    expect(
      evaluatePolicy({
        user: {
          ...officer(),
          id: 'lnd02-leader',
          roles: ['commune_leader'] as unknown as IdentityUser['roles'],
        },
        resource: {
          resourceType: 'LandParty',
          resourceId: '*',
          organizationId: 'lnd02-ou-a',
        },
        action: 'read_sensitive',
        assignments: [],
      }),
    ).toMatchObject({ allowed: true, reason: 'ALLOWED' });
    expect(
      evaluatePolicy({
        user: officer(),
        resource: {
          resourceType: 'LandParty',
          resourceId: '*',
          organizationId: 'lnd02-other',
        },
        action: 'read_sensitive',
        assignments: [],
      }).allowed,
    ).toBe(false);
    await expect(
      assertCanViewPartySensitive(
        { ...officer(), roles: ['commander'] },
        'lnd02-ou-a',
      ),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      assertCanViewPartySensitive(
        {
          ...officer(),
          id: 'lnd02-citizen',
          roles: ['citizen'] as unknown as IdentityUser['roles'],
        },
        'lnd02-ou-a',
      ),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      assertCanViewPartySensitive(officer(), 'lnd02-other'),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('rejects service calls from actors outside scope', async () => {
    const outsider: IdentityUser = { ...officer(), roles: ['commander'] };
    await expect(
      createParty(
        {
          referenceCode: 'X',
          partyType: 'individual',
          displayName: 'Y',
          identityNumber: null,
        },
        outsider,
      ),
    ).rejects.toThrow('FORBIDDEN');
    await expect(listParties({ limit: 50 }, outsider)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      createParcel(parseParcelInput(parcelBody('X')), outsider),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      listParcels(
        { limit: 50 },
        { ...officer(), organizationUnitId: undefined },
      ),
    ).rejects.toThrow('FORBIDDEN');
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!postgresEnabled)('LND-02 party/parcel database seam', () => {
  const stamp = randomUUID().slice(0, 8);
  const ouA = `lnd02-ou-a-${stamp}`;
  const ouB = `lnd02-ou-b-${stamp}`;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores ciphertext and blind index without plaintext', async () => {
    const code = `LND02-PARTY-${stamp}-C1`;
    const displayName = 'Nguyen Van Demo';
    const identityNumber = '0000000001';
    const row = await insertParty({
      referenceCode: code,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive(displayName),
      identityNumberCiphertext: encryptSensitive(identityNumber),
      identityNumberIndex: blindIndex(identityNumber),
    });
    try {
      const stored = await prisma.$queryRawUnsafe<
        Array<{
          displayNameCiphertext: string;
          identityNumberCiphertext: string | null;
          identityNumberIndex: string | null;
        }>
      >(
        `SELECT "displayNameCiphertext", "identityNumberCiphertext",
          "identityNumberIndex" FROM "LandParty" WHERE "id" = $1`,
        row.id,
      );
      expect(stored[0]?.displayNameCiphertext).not.toContain(displayName);
      expect(decryptSensitive(stored[0]?.displayNameCiphertext ?? '')).toBe(
        displayName,
      );
      expect(stored[0]?.identityNumberCiphertext).not.toContain(identityNumber);
      expect(stored[0]?.identityNumberIndex).toBe(blindIndex(identityNumber));
      expect(row.status).toBe('active');
    } finally {
      await prisma.landParty.delete({ where: { id: row.id } });
    }
  });

  it('rejects duplicate party reference codes', async () => {
    const code = `LND02-PARTY-${stamp}-DUP`;
    const row = await insertParty({
      referenceCode: code,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive('Demo'),
      identityNumberCiphertext: null,
      identityNumberIndex: null,
    });
    try {
      await expect(
        insertParty({
          referenceCode: code,
          partyType: 'individual',
          displayNameCiphertext: encryptSensitive('Demo'),
          identityNumberCiphertext: null,
          identityNumberIndex: null,
        }),
      ).rejects.toThrow('DUPLICATE_CODE');
    } finally {
      await prisma.landParty.delete({ where: { id: row.id } });
    }
  });

  it('scopes party lists to linked organizations only', async () => {
    const partyCode = `LND02-PARTY-${stamp}-S1`;
    const parcelCode = `LND02-PARCEL-${stamp}-S1`;
    const party = await insertParty({
      referenceCode: partyCode,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive('Demo'),
      identityNumberCiphertext: null,
      identityNumberIndex: null,
    });
    const parcel = await insertParcel(
      {
        parcelCode,
        mapSheetNumber: `SHEET-${stamp}`,
        parcelNumber: `NUM-${stamp}`,
        areaSqm: '125.50',
        landUseType: 'residential',
        address: 'Dia chi demo',
        communeCode: 'COMMUNE-01',
        organizationId: ouA,
      },
      toGeometryParam(SQUARE),
    );
    const right = await prisma.landRight.create({
      data: { parcelId: parcel.id, partyId: party.id, validFrom: new Date() },
    });
    try {
      const inside = await findPartiesByOrganization(ouA, {}, { limit: 50 });
      expect(inside.rows.map((item) => item.referenceCode)).toContain(
        partyCode,
      );
      const outside = await findPartiesByOrganization(ouB, {}, { limit: 50 });
      expect(outside.rows.map((item) => item.referenceCode)).not.toContain(
        partyCode,
      );
    } finally {
      await prisma.landRight.delete({ where: { id: right.id } });
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${parcel.id}`;
      await prisma.landParty.delete({ where: { id: party.id } });
    }
  });

  it('writes and reads valid polygons at version 1', async () => {
    const code = `LND02-PARCEL-${stamp}-V1`;
    const actor = officer({ organizationUnitId: ouA });
    const created = await createParcel(
      parseParcelInput({ ...parcelBody(code), communeCode: 'COMMUNE-01' }),
      actor,
    );
    try {
      expect(created.version).toBe(1);
      expect(created.status).toBe('active');
      expect(created.nationalRecordRef).toBeNull();
      expect(created.areaSqm).toBe('125.50');
      expect(created.organizationId).toBe(ouA);
      expect(created.geometry).toEqual(SQUARE);
      const listed = await findParcelsByOrganization(
        ouA,
        { parcelCode: code },
        { limit: 50 },
      );
      expect(listed.rows).toHaveLength(1);
      expect(fromGeometryJson(listed.rows[0].geometryGeoJson)).toEqual(SQUARE);
    } finally {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "parcelCode" = ${code}`;
    }
  });

  it('creates parcel ids in Cuid contract format', async () => {
    const code = `LND02-PARCEL-${stamp}-CUID`;
    const created = await insertParcel(
      {
        parcelCode: code,
        mapSheetNumber: `SHEET-${stamp}-CUID`,
        parcelNumber: `NUM-${stamp}-CUID`,
        areaSqm: '10.00',
        landUseType: 'residential',
        address: 'Dia chi demo',
        communeCode: 'COMMUNE-01',
        organizationId: ouA,
      },
      toGeometryParam(SQUARE),
    );
    try {
      expect(created.id).toMatch(/^c[a-z0-9]+$/);
      expect(created.id).not.toContain('-');
    } finally {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${created.id}`;
    }
  });

  it('rejects self-intersecting polygons without new rows', async () => {
    const code = `LND02-PARCEL-${stamp}-BAD`;
    const bowtie = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [2, 2],
          [2, 0],
          [0, 2],
          [0, 0],
        ],
      ],
    };
    validateParcelPolygon(bowtie);
    await expect(
      insertParcel(
        {
          parcelCode: code,
          mapSheetNumber: `SHEET-${stamp}`,
          parcelNumber: `NUM-${stamp}-BAD`,
          areaSqm: '10.00',
          landUseType: 'residential',
          address: 'Dia chi demo',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(bowtie),
      ),
    ).rejects.toThrow('GEOMETRY_INVALID');
    const missing = await findParcelsByOrganization(
      ouA,
      { parcelCode: code },
      { limit: 50 },
    );
    expect(missing.rows).toHaveLength(0);
  });

  it('rejects duplicate parcel codes and sheet-number pairs', async () => {
    const code = `LND02-PARCEL-${stamp}-DUP`;
    const sheet = `SHEET-${stamp}-DUP`;
    const number = `NUM-${stamp}-DUP`;
    const base = {
      mapSheetNumber: sheet,
      parcelNumber: number,
      areaSqm: '10.00',
      landUseType: 'residential',
      address: 'Dia chi demo',
      communeCode: 'COMMUNE-01',
      organizationId: ouA,
    };
    const created = await insertParcel(
      { ...base, parcelCode: code },
      toGeometryParam(SQUARE),
    );
    try {
      await expect(
        insertParcel({ ...base, parcelCode: code }, toGeometryParam(SQUARE)),
      ).rejects.toThrow('DUPLICATE_CODE');
      await expect(
        insertParcel(
          { ...base, parcelCode: `${code}-OTHER` },
          toGeometryParam(SQUARE),
        ),
      ).rejects.toThrow('DUPLICATE_CODE');
    } finally {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${created.id}`;
    }
  });

  it('paginates parcel lists with opaque cursors', async () => {
    const first = `LND02-PARCEL-${stamp}-P1`;
    const second = `LND02-PARCEL-${stamp}-P2`;
    const actor = officer({ organizationUnitId: ouA });
    const make = (code: string, number: string) =>
      insertParcel(
        {
          parcelCode: code,
          mapSheetNumber: `SHEET-${stamp}-PAGE`,
          parcelNumber: number,
          areaSqm: '10.00',
          landUseType: 'residential',
          address: 'Dia chi demo',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(SQUARE),
      );
    const rowA = await make(first, `NUM-${stamp}-P1`);
    const rowB = await make(second, `NUM-${stamp}-P2`);
    try {
      const pageOne = await listParcels({ limit: 1 }, actor);
      expect(pageOne.items).toHaveLength(1);
      expect(pageOne.nextCursor).not.toBeNull();
      const pageTwo = await listParcels(
        { limit: 1, cursor: pageOne.nextCursor ?? undefined },
        actor,
      );
      expect(pageTwo.items).toHaveLength(1);
      expect(pageTwo.items[0].id).not.toBe(pageOne.items[0].id);
      expect(pageTwo.nextCursor).toBeNull();
    } finally {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${rowA.id}`;
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${rowB.id}`;
    }
  });

  it('hides organization parcels from other units', async () => {
    const code = `LND02-PARCEL-${stamp}-OU`;
    const created = await insertParcel(
      {
        parcelCode: code,
        mapSheetNumber: `SHEET-${stamp}-OU`,
        parcelNumber: `NUM-${stamp}-OU`,
        areaSqm: '10.00',
        landUseType: 'residential',
        address: 'Dia chi demo',
        communeCode: 'COMMUNE-01',
        organizationId: ouA,
      },
      toGeometryParam(SQUARE),
    );
    try {
      const outside = await listParcels(
        { limit: 50 },
        officer({ organizationUnitId: ouB }),
      );
      expect(outside.items.map((item) => item.parcelCode)).not.toContain(code);
    } finally {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${created.id}`;
    }
  });

  it('allows same-OU party creates with masked response and no PII leakage', async () => {
    const code = `LND02-PARTY-${stamp}-GATE`;
    const actor = officer({ organizationUnitId: ouA });
    const created = await createParty(
      {
        referenceCode: code,
        partyType: 'individual',
        displayName: 'Demo Citizen',
        identityNumber: '0000000001',
      },
      actor,
    );
    try {
      expect(created.referenceCode).toBe(code);
      expect(created.displayName).toBe('Demo Citizen');
      expect(created.identityNumberMasked).toBe('******0001');
      expect(created.status).toBe('active');
      expect(Object.keys(created).sort()).toEqual(
        [
          'createdAt',
          'displayName',
          'id',
          'identityNumberMasked',
          'partyType',
          'referenceCode',
          'status',
          'updatedAt',
        ].sort(),
      );
      expect(JSON.stringify(created)).not.toContain('ciphertext');
      expect(JSON.stringify(created)).not.toContain('Ciphertext');
      const stored = await prisma.$queryRawUnsafe<
        Array<{
          displayNameCiphertext: string;
          identityNumberCiphertext: string | null;
        }>
      >(
        `SELECT "displayNameCiphertext", "identityNumberCiphertext" FROM "LandParty" WHERE "id" = $1`,
        created.id,
      );
      expect(stored[0]?.displayNameCiphertext).not.toContain('Demo Citizen');
      expect(decryptSensitive(stored[0]?.displayNameCiphertext ?? '')).toBe(
        'Demo Citizen',
      );
      expect(stored[0]?.identityNumberCiphertext).not.toContain('0000000001');
      const linkParcel = await insertParcel(
        {
          parcelCode: `${code}-PARCEL`,
          mapSheetNumber: `SHEET-${stamp}-GATE`,
          parcelNumber: `NUM-${stamp}-GATE`,
          areaSqm: '10.00',
          landUseType: 'residential',
          address: 'Dia chi demo',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(SQUARE),
      );
      const linkRight = await prisma.landRight.create({
        data: {
          parcelId: linkParcel.id,
          partyId: created.id,
          validFrom: new Date(),
        },
      });
      const listed = await listParties({ limit: 50 }, actor);
      expect(listed.items.map((item) => item.referenceCode)).toContain(code);
      const listedItem = listed.items.find(
        (item) => item.referenceCode === code,
      );
      expect(listedItem?.displayName).toBe('Demo Citizen');
      expect(listedItem?.identityNumberMasked).toBe('******0001');
      expect(JSON.stringify(listed)).not.toContain('ciphertext');
      await prisma.landRight.delete({ where: { id: linkRight.id } });
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${linkParcel.id}`;
      const outsider: IdentityUser = {
        ...officer(),
        id: `lnd02-outsider-${stamp}`,
        roles: ['commander'] as unknown as IdentityUser['roles'],
        organizationUnitId: ouA,
      };
      await expect(
        createParty(
          {
            referenceCode: `${code}-OUT`,
            partyType: 'individual',
            displayName: 'Outsider',
            identityNumber: null,
          },
          outsider,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(listParties({ limit: 50 }, outsider)).rejects.toThrow(
        'FORBIDDEN',
      );
      const citizen: IdentityUser = {
        ...officer(),
        id: `lnd02-citizen-${stamp}`,
        roles: ['citizen'] as unknown as IdentityUser['roles'],
        organizationUnitId: ouA,
      };
      await expect(
        createParty(
          {
            referenceCode: `${code}-CIT`,
            partyType: 'individual',
            displayName: 'Citizen',
            identityNumber: null,
          },
          citizen,
        ),
      ).rejects.toThrow('FORBIDDEN');
      expect(toLandApiError(new Error('FORBIDDEN'))).toMatchObject({
        status: 403,
        code: 'LAND_FORBIDDEN',
      });
    } finally {
      await prisma.landParty.deleteMany({
        where: { referenceCode: { in: [code, `${code}-OUT`, `${code}-CIT`] } },
      });
    }
  });

  it('rolls back parcel creates when audit fails (DR-19)', async () => {
    const code = `LND02-PARCEL-${stamp}-AUDIT`;
    const actor = officer({ organizationUnitId: ouA });
    auditControl.fail = true;
    try {
      await expect(
        createParcel(
          parseParcelInput({
            ...parcelBody(code),
            mapSheetNumber: `SHEET-${stamp}-AUDIT`,
            parcelNumber: `NUM-${stamp}-AUDIT`,
          }),
          actor,
        ),
      ).rejects.toThrow('AUDIT_UNAVAILABLE');
    } finally {
      auditControl.fail = false;
    }
    const leaked = await findParcelsByOrganization(
      ouA,
      { parcelCode: code },
      { limit: 50 },
    );
    expect(leaked.rows).toHaveLength(0);
    await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "parcelCode" = ${code}`;
  });

  it('propagates audit failures on parcel lists instead of swallowing', async () => {
    const actor = officer({ organizationUnitId: ouA });
    auditControl.fail = true;
    try {
      await expect(listParcels({ limit: 50 }, actor)).rejects.toThrow(
        'AUDIT_UNAVAILABLE',
      );
    } finally {
      auditControl.fail = false;
    }
  });

  it('writes audit evidence for parcel create and list', async () => {
    const code = `LND02-PARCEL-${stamp}-EVT`;
    const actor = officer({ organizationUnitId: ouA });
    const created = await createParcel(
      parseParcelInput({
        ...parcelBody(code),
        mapSheetNumber: `SHEET-${stamp}-EVT`,
        parcelNumber: `NUM-${stamp}-EVT`,
      }),
      actor,
    );
    try {
      const createdAudits = await prisma.auditEvent.findMany({
        where: { operation: 'land.parcel.created', resourceId: created.id },
      });
      expect(createdAudits.length).toBeGreaterThan(0);
      await listParcels({ limit: 50 }, actor);
      const listedAudits = await prisma.auditEvent.findMany({
        where: { operation: 'land.parcel.listed', resourceId: '*' },
      });
      expect(listedAudits.length).toBeGreaterThan(0);
    } finally {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${created.id}`;
    }
  });
});
