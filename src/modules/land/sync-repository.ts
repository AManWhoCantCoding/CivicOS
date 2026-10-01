import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { LandDbClient } from './access';

// Stored LandNationalSync row (data-model 3.8, prisma LandNationalSync).
export type SyncRow = {
  id: string;
  applicationId: string;
  operation: string;
  requestKey: string;
  status: string;
  remoteReference: string | null;
  requestPayload: unknown;
  responsePayload: unknown | null;
  failureCode: string | null;
  attempts: number;
  requestedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const SYNC_OPERATION = 'register_change';

// Locked Sync response shape (api-contract Sync).
export type SyncResponse = {
  id: string;
  applicationId: string;
  operation: string;
  requestKey: string;
  status: string;
  remoteReference: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
  failureCode: string | null;
  attempts: number;
  requestedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// Stable request key per application/operation (DR-17, data-model 3.8).
// Deterministic so retry reuses the same operation row; unique per app.
export function buildSyncRequestKey(
  applicationId: string,
  operation: string = SYNC_OPERATION,
): string {
  return `land-sync:${applicationId}:${operation}`;
}

// Map a stored row to the locked Sync response.
export function toSyncResponse(row: SyncRow): SyncResponse {
  return {
    id: row.id,
    applicationId: row.applicationId,
    operation: row.operation,
    requestKey: row.requestKey,
    status: row.status,
    remoteReference: row.remoteReference,
    requestPayload: asRecord(row.requestPayload),
    responsePayload:
      row.responsePayload === null || row.responsePayload === undefined
        ? null
        : asRecord(row.responsePayload),
    failureCode: row.failureCode,
    attempts: row.attempts,
    requestedAt: row.requestedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Read one sync row by application + operation (one logical operation).
export async function findSyncByApplication(
  applicationId: string,
  operation: string = SYNC_OPERATION,
  client: LandDbClient = prisma,
): Promise<SyncRow | null> {
  return (await client.landNationalSync.findUnique({
    where: { applicationId_operation: { applicationId, operation } },
  })) as SyncRow | null;
}

// Read one sync row by stable request key.
export async function findSyncByRequestKey(
  requestKey: string,
  client: LandDbClient = prisma,
): Promise<SyncRow | null> {
  return (await client.landNationalSync.findUnique({
    where: { requestKey },
  })) as SyncRow | null;
}

export type CreateSyncInput = {
  applicationId: string;
  operation?: string;
  requestKey: string;
  status: string;
  remoteReference: string | null;
  requestPayload: Prisma.InputJsonValue;
  responsePayload: Prisma.InputJsonValue | null;
  failureCode: string | null;
  attempts: number;
  requestedAt: Date;
  completedAt: Date | null;
};

// Create one sync operation row; caller owns the transaction (DR-19).
export async function createSync(
  input: CreateSyncInput,
  client: LandDbClient = prisma,
): Promise<SyncRow> {
  return (await client.landNationalSync.create({
    data: {
      applicationId: input.applicationId,
      operation: input.operation ?? SYNC_OPERATION,
      requestKey: input.requestKey,
      status: input.status,
      remoteReference: input.remoteReference,
      requestPayload: input.requestPayload,
      responsePayload: input.responsePayload ?? undefined,
      failureCode: input.failureCode,
      attempts: input.attempts,
      requestedAt: input.requestedAt,
      completedAt: input.completedAt,
    },
  })) as SyncRow;
}
