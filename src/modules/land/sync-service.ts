import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';

import {
  assertLandActor,
  auditLandEvent,
  requireLandReviewAccess,
} from './access';
import {
  toApplicationSummary,
  type ApplicationSummary,
} from './application-service';
import type { ApplicationRowWithLinks } from './application-repository';
import {
  MockNationalLandAdapter,
  toNationalLandFailure,
  type NationalLandAdapter,
} from './national-land-adapter';
import {
  buildSyncRequestKey,
  createSync,
  findSyncByApplication,
  SYNC_OPERATION,
  toSyncResponse,
  type SyncResponse,
} from './sync-repository';

export type { SyncResponse };
export { buildSyncRequestKey, SYNC_OPERATION };

function assertSyncBody(body: unknown): void {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('INVALID_REQUEST');
  }
  if (Object.keys(body as Record<string, unknown>).length !== 0) {
    throw new Error('INVALID_REQUEST');
  }
}

function assertSyncVersion(expectedVersion: number): void {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error('INVALID_REQUEST');
  }
}

function actorSnapshot(actor: IdentityUser): {
  id: string;
  name: string;
  role: string | undefined;
  organizationId: string;
} {
  return {
    id: actor.id,
    name: actor.name,
    role: (actor.roles as readonly string[])[0],
    organizationId: actor.organizationUnitId as string,
  };
}

function resolveDefaultAdapter(): NationalLandAdapter {
  // Fixture comes from server/test configuration, never from client request
  // (integration-contracts mock adapter). Client body is always {}.
  const outcome =
    process.env.LAND_MOCK_SYNC_OUTCOME === 'failure' ? 'failure' : 'success';
  return new MockNationalLandAdapter({ outcome });
}

type SyncOutcome = {
  nextStatus: string;
  syncStatus: string;
  remoteReference: string | null;
  failureCode: string | null;
  responsePayload: Record<string, unknown>;
};

// Sync an in_review application via the mock national adapter (LND-11).
// Only in_review transitions; success -> pending_approval, failure ->
// sync_failed (api-contract POST sync, DR-16). Never mutates LandRight,
// LandParcel, LandEncumbrance or Approval. Domain, sync, event and audit
// share one transaction (DR-19).
export async function syncApplication(
  applicationId: string,
  actor: IdentityUser,
  expectedVersion: number,
  body: unknown = {},
  adapter?: NationalLandAdapter,
): Promise<{ application: ApplicationSummary; sync: SyncResponse }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  assertSyncVersion(expectedVersion);
  assertSyncBody(body);
  assertLandActor(actor);
  const activeAdapter = adapter ?? resolveDefaultAdapter();

  return prisma.$transaction(async (tx) => {
    const row = await tx.landChangeApplication.findUnique({
      where: { id: applicationId },
      include: { applicationParties: true, applicationParcels: true },
    });
    if (!row) throw new Error('APPLICATION_NOT_FOUND');
    await requireLandReviewAccess(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        organizationId: row.organizationId,
      },
      tx,
    );
    if (row.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    if (row.status !== 'in_review') throw new Error('INVALID_TRANSITION');

    const requestKey = buildSyncRequestKey(row.id, SYNC_OPERATION);
    const existing = await findSyncByApplication(row.id, SYNC_OPERATION, tx);
    if (existing) throw new Error('INVALID_TRANSITION');

    const parcelLinks = await tx.landApplicationParcel.findMany({
      where: { applicationId: row.id },
      select: { parcelId: true },
    });
    const parcelIds = parcelLinks.map((link) => link.parcelId);
    let parcelCodes: string[] = [];
    if (parcelIds.length) {
      const parcels = await tx.landParcel.findMany({
        where: { id: { in: parcelIds } },
        select: { parcelCode: true },
      });
      parcelCodes = parcels.map((parcel) => parcel.parcelCode);
    }
    if (!parcelCodes.length) throw new Error('INVALID_REQUEST');

    const requestPayload = {
      requestKey,
      applicationCode: row.applicationCode,
      changeType: row.changeType,
      parcelCodes,
      mode: 'mock' as const,
    };

    let response;
    try {
      response = await activeAdapter.registerChange(requestPayload);
    } catch (error) {
      response = toNationalLandFailure(error);
    }

    const now = new Date();
    const outcome: SyncOutcome =
      response.status === 'succeeded'
        ? {
            nextStatus: 'pending_approval',
            syncStatus: 'succeeded',
            remoteReference: response.remoteReference,
            failureCode: null,
            responsePayload: response.responsePayload as Record<
              string,
              unknown
            >,
          }
        : {
            nextStatus: 'sync_failed',
            syncStatus: 'failed',
            remoteReference: null,
            failureCode: response.failureCode,
            responsePayload: response.responsePayload as Record<
              string,
              unknown
            >,
          };

    let created;
    try {
      created = await createSync(
        {
          applicationId: row.id,
          operation: SYNC_OPERATION,
          requestKey,
          status: outcome.syncStatus,
          remoteReference: outcome.remoteReference,
          requestPayload: requestPayload as Prisma.InputJsonValue,
          responsePayload: outcome.responsePayload as Prisma.InputJsonValue,
          failureCode: outcome.failureCode,
          attempts: 1,
          requestedAt: now,
          completedAt: now,
        },
        tx,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('P2002') ||
          (error as { code?: string }).code === 'P2002')
      ) {
        throw new Error('VERSION_CONFLICT');
      }
      throw error;
    }
    // Prisma unique violations surface as known request errors; map
    // concurrent duplicate operation rows to version conflict.

    const updated = await tx.landChangeApplication.updateMany({
      where: { id: row.id, version: expectedVersion },
      data: { status: outcome.nextStatus, version: expectedVersion + 1 },
    });
    if (updated.count !== 1) throw new Error('VERSION_CONFLICT');

    const refreshed = (await tx.landChangeApplication.findUniqueOrThrow({
      where: { id: row.id },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks;

    const occurredAt = new Date();
    const isSuccess = outcome.syncStatus === 'succeeded';
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: isSuccess
        ? 'LandChangeApplicationSyncSucceeded'
        : 'LandChangeApplicationSyncFailed',
      eventVersion: 1,
      aggregateType: 'LandChangeApplication',
      aggregateId: row.id,
      aggregateVersion: refreshed.version,
      occurredAt,
      actor: actorSnapshot(actor),
      payload: {
        applicationCode: row.applicationCode,
        changeType: row.changeType,
        organizationId: row.organizationId,
        beforeStatus: 'in_review',
        afterStatus: outcome.nextStatus,
        beforeVersion: expectedVersion,
        afterVersion: expectedVersion + 1,
        version: expectedVersion + 1,
        requestKey,
        operation: SYNC_OPERATION,
        attempts: 1,
        ...(isSuccess
          ? { remoteReference: outcome.remoteReference }
          : { failureCode: outcome.failureCode }),
      },
      metadata: {},
    });
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: isSuccess
          ? 'land.application.synced'
          : 'land.application.sync.failed',
        metadata: {
          beforeStatus: 'in_review',
          afterStatus: outcome.nextStatus,
          beforeVersion: expectedVersion,
          afterVersion: expectedVersion + 1,
          requestKey,
          attempts: 1,
          ...(isSuccess
            ? { remoteReference: outcome.remoteReference }
            : { failureCode: outcome.failureCode }),
        },
      },
      tx,
    );

    return {
      application: toApplicationSummary(refreshed),
      sync: toSyncResponse({
        ...created,
        requestPayload: created.requestPayload,
        responsePayload: created.responsePayload,
      }),
    };
  });
}

// Retry a sync_failed application with the same stable request key (LND-11).
// Only sync_failed transitions; success -> pending_approval, failure stays
// sync_failed (api-contract POST sync/retry, DR-17). One operation row;
// attempts increments atomically, never duplicates the operation.
export async function retryApplicationSync(
  applicationId: string,
  actor: IdentityUser,
  expectedVersion: number,
  body: unknown = {},
  adapter?: NationalLandAdapter,
): Promise<{ application: ApplicationSummary; sync: SyncResponse }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  assertSyncVersion(expectedVersion);
  assertSyncBody(body);
  assertLandActor(actor);
  const activeAdapter = adapter ?? resolveDefaultAdapter();

  return prisma.$transaction(async (tx) => {
    const row = await tx.landChangeApplication.findUnique({
      where: { id: applicationId },
      include: { applicationParties: true, applicationParcels: true },
    });
    if (!row) throw new Error('APPLICATION_NOT_FOUND');
    await requireLandReviewAccess(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        organizationId: row.organizationId,
      },
      tx,
    );
    if (row.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    if (row.status !== 'sync_failed') throw new Error('INVALID_TRANSITION');

    const existing = await findSyncByApplication(row.id, SYNC_OPERATION, tx);
    if (!existing) throw new Error('INVALID_TRANSITION');
    const requestKey = existing.requestKey;

    const parcelLinks = await tx.landApplicationParcel.findMany({
      where: { applicationId: row.id },
      select: { parcelId: true },
    });
    const parcelIds = parcelLinks.map((link) => link.parcelId);
    let parcelCodes: string[] = [];
    if (parcelIds.length) {
      const parcels = await tx.landParcel.findMany({
        where: { id: { in: parcelIds } },
        select: { parcelCode: true },
      });
      parcelCodes = parcels.map((parcel) => parcel.parcelCode);
    }
    if (!parcelCodes.length) throw new Error('INVALID_REQUEST');

    const requestPayload = {
      requestKey,
      applicationCode: row.applicationCode,
      changeType: row.changeType,
      parcelCodes,
      mode: 'mock' as const,
    };

    let response;
    try {
      response = await activeAdapter.registerChange(requestPayload);
    } catch (error) {
      response = toNationalLandFailure(error);
    }

    const now = new Date();
    const outcome: SyncOutcome =
      response.status === 'succeeded'
        ? {
            nextStatus: 'pending_approval',
            syncStatus: 'succeeded',
            remoteReference: response.remoteReference,
            failureCode: null,
            responsePayload: response.responsePayload as Record<
              string,
              unknown
            >,
          }
        : {
            nextStatus: 'sync_failed',
            syncStatus: 'failed',
            remoteReference: null,
            failureCode: response.failureCode,
            responsePayload: response.responsePayload as Record<
              string,
              unknown
            >,
          };

    const updatedSync = (await tx.landNationalSync.update({
      where: { id: existing.id },
      data: {
        status: outcome.syncStatus,
        remoteReference: outcome.remoteReference,
        requestPayload: requestPayload as Prisma.InputJsonValue,
        responsePayload: outcome.responsePayload as Prisma.InputJsonValue,
        failureCode: outcome.failureCode,
        attempts: { increment: 1 },
        completedAt: now,
      },
    })) as unknown as {
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

    const updated = await tx.landChangeApplication.updateMany({
      where: { id: row.id, version: expectedVersion },
      data: { status: outcome.nextStatus, version: expectedVersion + 1 },
    });
    if (updated.count !== 1) throw new Error('VERSION_CONFLICT');

    const refreshed = (await tx.landChangeApplication.findUniqueOrThrow({
      where: { id: row.id },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks;

    const occurredAt = new Date();
    const isSuccess = outcome.syncStatus === 'succeeded';
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: isSuccess
        ? 'LandChangeApplicationSyncSucceeded'
        : 'LandChangeApplicationSyncFailed',
      eventVersion: 1,
      aggregateType: 'LandChangeApplication',
      aggregateId: row.id,
      aggregateVersion: refreshed.version,
      occurredAt,
      actor: actorSnapshot(actor),
      payload: {
        applicationCode: row.applicationCode,
        changeType: row.changeType,
        organizationId: row.organizationId,
        beforeStatus: 'sync_failed',
        afterStatus: outcome.nextStatus,
        beforeVersion: expectedVersion,
        afterVersion: expectedVersion + 1,
        version: expectedVersion + 1,
        requestKey,
        operation: SYNC_OPERATION,
        attempts: updatedSync.attempts,
        ...(isSuccess
          ? { remoteReference: outcome.remoteReference }
          : { failureCode: outcome.failureCode }),
      },
      metadata: { retry: true },
    });
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: isSuccess
          ? 'land.application.synced'
          : 'land.application.sync.failed',
        metadata: {
          beforeStatus: 'sync_failed',
          afterStatus: outcome.nextStatus,
          beforeVersion: expectedVersion,
          afterVersion: expectedVersion + 1,
          requestKey,
          attempts: updatedSync.attempts,
          retry: true,
          ...(isSuccess
            ? { remoteReference: outcome.remoteReference }
            : { failureCode: outcome.failureCode }),
        },
      },
      tx,
    );

    return {
      application: toApplicationSummary(refreshed),
      sync: toSyncResponse(updatedSync),
    };
  });
}
