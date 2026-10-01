import { prisma } from '@/lib/prisma';

import type { LandDbClient } from './access';
import {
  findPublicLookupByApplicationCode,
  findPublicLookupByParcelCode,
  type PublicLandLookupRow,
} from './public-lookup-repository';
import type { PublicLandLookupQuery } from './schemas';

const PUBLIC_LOOKUP_RATE_LIMIT = 60;
const PUBLIC_LOOKUP_WINDOW_MS = 60_000;

type RateLimitBucket = {
  startedAt: number;
  count: number;
};

// ponytail: process-local fixed window; use a shared store when API instances
// scale horizontally.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function isRateLimited(ip: string, now: number): boolean {
  const current = rateLimitBuckets.get(ip);
  if (!current || now - current.startedAt >= PUBLIC_LOOKUP_WINDOW_MS) {
    rateLimitBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  if (current.count >= PUBLIC_LOOKUP_RATE_LIMIT) return true;
  current.count += 1;
  return false;
}

export type PublicLandLookupProjection = {
  applicationCode: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type PublicLandLookupResponse = {
  lookup: PublicLandLookupProjection;
  simulated: true;
};

function toPublicLandLookup(
  row: PublicLandLookupRow,
): PublicLandLookupProjection {
  return {
    applicationCode: row.applicationCode,
    parcelCode: row.parcelCode,
    mapSheetNumber: row.mapSheetNumber,
    parcelNumber: row.parcelNumber,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export async function lookupPublicLand(
  query: PublicLandLookupQuery,
  ip: string,
  client: LandDbClient = prisma,
  now = Date.now(),
): Promise<PublicLandLookupResponse> {
  if (isRateLimited(ip, now)) throw new Error('RATE_LIMITED');
  const row =
    'applicationCode' in query
      ? await findPublicLookupByApplicationCode(query.applicationCode, client)
      : await findPublicLookupByParcelCode(query.parcelCode, client);
  if (!row) throw new Error('LOOKUP_NOT_FOUND');
  return { lookup: toPublicLandLookup(row), simulated: true };
}
