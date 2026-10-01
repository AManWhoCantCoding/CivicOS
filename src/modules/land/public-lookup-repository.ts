import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { LandDbClient } from './access';

export type PublicLandLookupRow = {
  applicationCode: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  submittedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

const PUBLIC_LOOKUP_COLUMNS = Prisma.sql`
  application."applicationCode" AS "applicationCode",
  parcel."parcelCode" AS "parcelCode",
  parcel."mapSheetNumber" AS "mapSheetNumber",
  parcel."parcelNumber" AS "parcelNumber",
  application."status" AS "status",
  application."submittedAt" AS "submittedAt",
  application."updatedAt" AS "updatedAt",
  application."completedAt" AS "completedAt"
`;

// Read only the public projection; no party, geometry, sync, approval or
// evidence columns are selected.
export async function findPublicLookupByApplicationCode(
  applicationCode: string,
  client: LandDbClient = prisma,
): Promise<PublicLandLookupRow | null> {
  const rows = await client.$queryRaw<PublicLandLookupRow[]>`
    SELECT ${PUBLIC_LOOKUP_COLUMNS}
    FROM "LandChangeApplication" AS application
    JOIN "LandApplicationParcel" AS applicationParcel
      ON applicationParcel."applicationId" = application."id"
    JOIN "LandParcel" AS parcel
      ON parcel."id" = applicationParcel."parcelId"
    WHERE application."applicationCode" = ${applicationCode}
    ORDER BY CASE applicationParcel."parcelRole"
      WHEN 'subject' THEN 0
      WHEN 'source' THEN 1
      WHEN 'result' THEN 2
      ELSE 3
    END, parcel."parcelCode" ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findPublicLookupByParcelCode(
  parcelCode: string,
  client: LandDbClient = prisma,
): Promise<PublicLandLookupRow | null> {
  const rows = await client.$queryRaw<PublicLandLookupRow[]>`
    SELECT ${PUBLIC_LOOKUP_COLUMNS}
    FROM "LandParcel" AS parcel
    JOIN "LandApplicationParcel" AS applicationParcel
      ON applicationParcel."parcelId" = parcel."id"
    JOIN "LandChangeApplication" AS application
      ON application."id" = applicationParcel."applicationId"
    WHERE parcel."parcelCode" = ${parcelCode}
    ORDER BY application."updatedAt" DESC, application."id" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
