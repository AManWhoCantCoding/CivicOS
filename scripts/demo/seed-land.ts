// Upsert role land va seed demo dat dai khong PII that.
import type { PrismaClient } from '@prisma/client';

import type { DemoEnv } from './demo-db';
import {
  applyDemoTargetToEnv,
  assertDemoTarget,
  resolveDemoTarget,
} from './demo-db';

type LandSeedDb = Pick<
  PrismaClient,
  'role' | '$executeRawUnsafe' | '$queryRawUnsafe'
>;

// Ba role land dung chung cho migration va seed.
export const LAND_ROLES = [
  { name: 'land_officer', description: 'Approved role: land_officer' },
  { name: 'commune_leader', description: 'Approved role: commune_leader' },
  { name: 'citizen', description: 'Approved role: citizen' },
] as const;

export const DEMO_PARTY_CODE = 'DEMO-PARTY-001';
export const DEMO_PARCEL_CODE = 'DEMO-PARCEL-001';
const DEMO_PARTY_CIPHERTEXT = 'DEMO_CIPHERTEXT_displayName';
const DEMO_PARTY_BLIND_INDEX = 'DEMO-BLIND-001';
const DEMO_PARCEL_WKT =
  'POLYGON((105.0 20.0, 105.001 20.0, 105.001 20.001, 105.0 20.001, 105.0 20.0))';

// Upsert ba role land, giu nguyen role va UserRole hien co.
export async function upsertLandRoles(db: LandSeedDb): Promise<void> {
  for (const role of LAND_ROLES) {
    await db.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
  }
}

// Seed party/parcel/right demo toi thieu, idempotent, khong PII that.
export async function seedLandDemo(db: LandSeedDb): Promise<void> {
  await db.$executeRawUnsafe(
    `INSERT INTO "LandParty"
      ("id", "referenceCode", "partyType", "displayNameCiphertext",
       "identityNumberCiphertext", "identityNumberIndex", "status",
       "createdAt", "updatedAt")
     VALUES
      (gen_random_uuid()::text, $1, 'individual', $2, NULL, $3,
       'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("referenceCode") DO NOTHING`,
    DEMO_PARTY_CODE,
    DEMO_PARTY_CIPHERTEXT,
    DEMO_PARTY_BLIND_INDEX,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "LandParcel"
      ("id", "parcelCode", "mapSheetNumber", "parcelNumber", "areaSqm",
       "landUseType", "address", "communeCode", "organizationId",
       "geometry", "nationalRecordRef", "status", "version",
       "createdAt", "updatedAt")
     VALUES
      (gen_random_uuid()::text, $1, 'DEMO-SHEET-01', 'DEMO-001', 125.50,
       'residential', 'Dia chi demo, Xa Nghia Tru', 'DEMO-COMMUNE',
       'unit-nghia-tru', ST_SetSRID(ST_GeomFromText($2), 4326), NULL,
       'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("parcelCode") DO NOTHING`,
    DEMO_PARCEL_CODE,
    DEMO_PARCEL_WKT,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "LandRight"
      ("id", "parcelId", "partyId", "rightType", "sharePercent",
       "status", "validFrom", "createdAt", "updatedAt")
     SELECT gen_random_uuid()::text, parcel."id", party."id",
       'land_use_right', 100, 'active',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     FROM "LandParty" party
     CROSS JOIN "LandParcel" parcel
     WHERE party."referenceCode" = $1
       AND parcel."parcelCode" = $2
       AND NOT EXISTS (
         SELECT 1 FROM "LandRight" existing
         WHERE existing."parcelId" = parcel."id"
           AND existing."partyId" = party."id"
           AND existing."status" = 'active'
       )`,
    DEMO_PARTY_CODE,
    DEMO_PARCEL_CODE,
  );
}

// Chay seed land tren target demo da validate.
async function runLandSeed(env: DemoEnv = process.env): Promise<void> {
  const target = resolveDemoTarget(env.DATABASE_URL, env.DEMO_DATABASE_URL);
  assertDemoTarget(target.url);
  console.log(
    `Land seed target database: ${target.displayUrl} (name=${target.dbName})`,
  );
  applyDemoTargetToEnv(target);
  const { prisma } = await import('@/lib/prisma');
  try {
    await upsertLandRoles(prisma);
    await seedLandDemo(prisma);
  } finally {
    await prisma.$disconnect();
  }
  console.log('seeded land roles and demo party/parcel/right');
}

if (
  process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/demo/seed-land.ts')
) {
  void runLandSeed().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
