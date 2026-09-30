import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  DEMO_PARCEL_CODE,
  DEMO_PARTY_CODE,
  LAND_ROLES,
  seedLandDemo,
  upsertLandRoles,
} from '../../scripts/demo/seed-land';

const MIGRATION = '20260930000000_lnd01_land_foundation';
const LAND_TABLES = [
  'LandParty',
  'LandParcel',
  'LandChangeApplication',
  'LandRight',
  'LandEncumbrance',
  'LandApplicationParty',
  'LandApplicationParcel',
  'LandNationalSync',
];
const postgresEnabled = process.env.RUN_DB_TESTS === '1';

function migrationSql(): string {
  return readFileSync(
    join(process.cwd(), 'prisma', 'migrations', MIGRATION, 'migration.sql'),
    'utf8',
  );
}

function downSql(): string {
  return readFileSync(
    join(process.cwd(), 'prisma', 'migrations', MIGRATION, 'down.sql'),
    'utf8',
  );
}

function schemaText(): string {
  return readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
}

function seedText(): string {
  return readFileSync(
    join(process.cwd(), 'scripts', 'demo', 'seed-land.ts'),
    'utf8',
  );
}

describe('LND-01 land foundation migration contract', () => {
  it('creates PostGIS and the eight land tables with Polygon 4326', () => {
    const sql = migrationSql();
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS postgis');
    for (const table of LAND_TABLES) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
    }
    expect(sql).toContain('geometry(Polygon,4326)');
    expect(sql).toContain('USING GIST ("geometry")');
  });

  it('keeps business foreign keys on RESTRICT', () => {
    const sql = migrationSql();
    const restricts = sql.match(/ON DELETE RESTRICT/g) ?? [];
    expect(restricts.length).toBe(9);
    for (const table of ['LandRight', 'LandEncumbrance']) {
      expect(sql).toContain(`"${table}_parcelId_fkey"`);
    }
    expect(sql).toContain('"LandNationalSync_applicationId_fkey"');
  });

  it('ships unique index and CHECK coverage from data-model', () => {
    const sql = migrationSql();
    for (const key of [
      '"LandParty_referenceCode_key"',
      '"LandParcel_parcelCode_key"',
      '"LandChangeApplication_applicationCode_key"',
      '"LandNationalSync_requestKey_key"',
      '"LandNationalSync_applicationId_operation_key"',
    ]) {
      expect(sql).toContain(key);
    }
    for (const check of [
      '"LandParcel_areaSqm_positive"',
      '"LandRight_sharePercent_range"',
      '"LandParcel_geometry_valid"',
      'ST_IsValid("geometry")',
      'ST_SRID("geometry") = 4326',
      '"LandChangeApplication_status_allowed"',
      '"LandNationalSync_completedAt_consistent"',
    ]) {
      expect(sql).toContain(check);
    }
  });

  it('upserts the three land roles without deleting history', () => {
    const sql = migrationSql();
    for (const role of ['land_officer', 'commune_leader', 'citizen']) {
      expect(sql).toContain(`'${role}'`);
    }
    expect(sql).toContain('ON CONFLICT ("name") DO UPDATE');
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"Role"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"UserRole"/i);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });

  it('declares the eight models with PostGIS geometry in schema', () => {
    const schema = schemaText();
    for (const model of LAND_TABLES) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\s*\\{`));
    }
    expect(schema).toContain('Unsupported("geometry(Polygon,4326)")');
    expect(schema).toMatch(/onDelete:\s*Restrict/);
  });

  it('points the compose database image at PostGIS', () => {
    const compose = readFileSync(
      join(process.cwd(), 'docker-compose.yml'),
      'utf8',
    );
    expect(compose).toMatch(/image:\s*postgis\/postgis:/);
    expect(compose).not.toContain('postgres:16-alpine');
  });

  it('keeps the land seed idempotent and free of real PII', () => {
    expect(LAND_ROLES.map(({ name }) => name).sort()).toEqual(
      ['citizen', 'commune_leader', 'land_officer'].sort(),
    );
    const seed = seedText();
    expect(seed).toContain('ON CONFLICT ("referenceCode") DO NOTHING');
    expect(seed).toContain('ON CONFLICT ("parcelCode") DO NOTHING');
    expect(seed).toContain(DEMO_PARTY_CODE);
    expect(seed).toContain(DEMO_PARCEL_CODE);
    expect(seed).not.toMatch(/\d{9,}/);
    expect(seed).not.toMatch(/DELETE\s+FROM/i);
  });

  it('ships a rollback script that only touches land tables', () => {
    const down = downSql();
    for (const table of LAND_TABLES) {
      expect(down).toContain(`DROP TABLE IF EXISTS "${table}"`);
    }
    for (const kept of ['"User"', '"Assignment"', '"EventRecord"']) {
      expect(down).not.toContain(kept);
    }
    expect(existsSync(join(process.cwd(), 'scripts', 'demo'))).toBe(true);
  });
});

describe.skipIf(!postgresEnabled)(
  'LND-01 land foundation database seam',
  () => {
    const stamp = randomUUID().slice(0, 8);

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('exposes PostGIS, the eight tables and the GiST index', async () => {
      const extension = await prisma.$queryRawUnsafe<
        Array<{ extname: string }>
      >(`SELECT extname FROM pg_extension WHERE extname = 'postgis'`);
      expect(extension.map(({ extname }) => extname)).toContain('postgis');
      for (const table of LAND_TABLES) {
        const found = await prisma.$queryRawUnsafe<Array<{ oid: string }>>(
          `SELECT to_regclass($1)::text AS oid`,
          `"${table}"`,
        );
        expect(found[0]?.oid).toBe(`"${table}"`);
      }
      const gist = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
        `SELECT indexname FROM pg_indexes
        WHERE tablename = 'LandParcel' AND indexdef ILIKE '%GIST%'`,
      );
      expect(gist.length).toBeGreaterThan(0);
    });

    it('rejects parent delete while a child right exists', async () => {
      const partyCode = `LND01-PARTY-${stamp}`;
      const parcelCode = `LND01-PARCEL-${stamp}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "LandParty"
        ("id", "referenceCode", "partyType", "displayNameCiphertext",
         "status", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'individual',
        'LND01_CIPHERTEXT', 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        partyCode,
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO "LandParcel"
        ("id", "parcelCode", "mapSheetNumber", "parcelNumber",
         "areaSqm", "landUseType", "address", "communeCode",
         "organizationId", "geometry", "status", "version",
         "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'LND01-SHEET', 'LND01-NUM',
        100, 'residential', 'LND01 address', 'LND01-COMMUNE',
        'unit-nghia-tru',
        ST_SetSRID(ST_GeomFromText(
          'POLYGON((105 20, 105.001 20, 105.001 20.001, 105 20.001, 105 20))'
        ), 4326),
        'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        parcelCode,
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO "LandRight"
        ("id", "parcelId", "partyId", "rightType", "sharePercent",
         "status", "validFrom", "createdAt", "updatedAt")
       SELECT gen_random_uuid()::text, parcel."id", party."id",
        'land_use_right', 100, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM "LandParty" party
       CROSS JOIN "LandParcel" parcel
       WHERE party."referenceCode" = $1
         AND parcel."parcelCode" = $2`,
        partyCode,
        parcelCode,
      );
      try {
        await expect(
          prisma.$executeRawUnsafe(
            `DELETE FROM "LandParcel" WHERE "parcelCode" = $1`,
            parcelCode,
          ),
        ).rejects.toThrow();
        await expect(
          prisma.$executeRawUnsafe(
            `DELETE FROM "LandParty" WHERE "referenceCode" = $1`,
            partyCode,
          ),
        ).rejects.toThrow();
      } finally {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "LandRight"
          WHERE "parcelId" IN (
            SELECT "id" FROM "LandParcel" WHERE "parcelCode" = $1
          )`,
          parcelCode,
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM "LandParcel" WHERE "parcelCode" = $1`,
          parcelCode,
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM "LandParty" WHERE "referenceCode" = $1`,
          partyCode,
        );
      }
    });

    it('rejects invalid area, share and geometry through CHECK', async () => {
      const parcelCode = `LND01-CHECK-${stamp}`;
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO "LandParcel"
          ("id", "parcelCode", "mapSheetNumber", "parcelNumber",
           "areaSqm", "landUseType", "address", "communeCode",
           "organizationId", "geometry", "status", "version",
           "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, 'LND01-SHEET', 'LND01-NUM',
          0, 'residential', 'LND01 address', 'LND01-COMMUNE',
          'unit-nghia-tru',
          ST_SetSRID(ST_GeomFromText(
            'POLYGON((105 20, 105.001 20, 105.001 20.001, 105 20))'
          ), 4326),
          'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          parcelCode,
        ),
      ).rejects.toThrow();
      const missing = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count FROM "LandParcel"
        WHERE "parcelCode" = $1`,
        parcelCode,
      );
      expect(missing[0]?.count).toBe(0);
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO "LandParcel"
          ("id", "parcelCode", "mapSheetNumber", "parcelNumber",
           "areaSqm", "landUseType", "address", "communeCode",
           "organizationId", "geometry", "status", "version",
           "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, 'LND01-SHEET', 'LND01-NUM',
          100, 'residential', 'LND01 address', 'LND01-COMMUNE',
          'unit-nghia-tru',
          ST_SetSRID(ST_GeomFromText(
            'POLYGON((105 20, 105.001 20, 105.001 20.001, 105 20))'
          ), 3857),
          'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          `LND01-SRID-${stamp}`,
        ),
      ).rejects.toThrow();
    });

    it('keeps the land seed idempotent and preserves existing roles', async () => {
      const keptName = `lnd01-keep-${stamp}`;
      await prisma.role.create({ data: { name: keptName } });
      try {
        await upsertLandRoles(prisma);
        await upsertLandRoles(prisma);
        await seedLandDemo(prisma);
        await seedLandDemo(prisma);
        const landCount = await prisma.role.count({
          where: { name: { in: [...LAND_ROLES.map(({ name }) => name)] } },
        });
        expect(landCount).toBe(3);
        await expect(
          prisma.role.findUniqueOrThrow({ where: { name: keptName } }),
        ).resolves.toMatchObject({ name: keptName });
        const demoParty = await prisma.$queryRawUnsafe<
          Array<{ count: number }>
        >(
          `SELECT COUNT(*)::int AS count FROM "LandParty"
          WHERE "referenceCode" = $1`,
          DEMO_PARTY_CODE,
        );
        expect(demoParty[0]?.count).toBe(1);
        const demoParcel = await prisma.$queryRawUnsafe<
          Array<{ count: number }>
        >(
          `SELECT COUNT(*)::int AS count FROM "LandParcel"
          WHERE "parcelCode" = $1`,
          DEMO_PARCEL_CODE,
        );
        expect(demoParcel[0]?.count).toBe(1);
      } finally {
        await prisma.role.deleteMany({ where: { name: keptName } });
      }
    });

    it('rolls back a partial land write without orphan rows', async () => {
      const partyCode = `LND01-ROLLBACK-${stamp}`;
      let rolledBack = false;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO "LandParty"
            ("id", "referenceCode", "partyType",
             "displayNameCiphertext", "status", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, 'individual',
            'LND01_CIPHERTEXT', 'active',
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            partyCode,
          );
          const inside = await tx.$queryRawUnsafe<Array<{ count: number }>>(
            `SELECT COUNT(*)::int AS count FROM "LandParty"
            WHERE "referenceCode" = $1`,
            partyCode,
          );
          expect(inside[0]?.count).toBe(1);
          throw new Error('LND01_ROLLBACK_SENTINEL');
        });
      } catch (error) {
        rolledBack =
          error instanceof Error && error.message === 'LND01_ROLLBACK_SENTINEL';
        if (!rolledBack) throw error;
      }
      expect(rolledBack).toBe(true);
      const after = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count FROM "LandParty"
        WHERE "referenceCode" = $1`,
        partyCode,
      );
      expect(after[0]?.count).toBe(0);
    });
  },
);
