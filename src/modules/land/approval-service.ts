import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import type { AppendEventInput } from '@/modules/eventing/contracts';
import type { IdentityUser } from '@/modules/identity';

import {
  assertLandActor,
  auditLandEvent,
  type LandActor,
  type LandDbClient,
} from './access';
import {
  toApplicationDetail,
  type ApplicationDetail,
} from './application-service';
import type { ApplicationRowWithLinks } from './application-repository';

// Locked Approval response shape for approve/reject (api-contract F-04).
// Prisma Approval row mapped to JSON-safe output; no new table/column.
export type ApprovalResponse = {
  id: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: string;
  organizationId: string | null;
  requestedById: string;
  decidedById: string | null;
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
};

type ApprovalRow = {
  id: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: string;
  organizationId: string | null;
  requestedById: string;
  decidedById: string | null;
  reason: string | null;
  requestedAt: Date;
  decidedAt: Date | null;
};

export function toApprovalResponse(row: ApprovalRow): ApprovalResponse {
  return {
    id: row.id,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    action: row.action,
    status: row.status,
    organizationId: row.organizationId,
    requestedById: row.requestedById,
    decidedById: row.decidedById,
    reason: row.reason,
    requestedAt: row.requestedAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}

// Test seam for rollback proof (LND-12 AC-03): routes omit deps and use the
// real event/audit sinks; tests inject a failing sink to force rollback.
// Mirrors the adapter-injection pattern in sync-service.
export type ApprovalDeps = {
  appendEventFn?: (
    client: LandDbClient,
    input: AppendEventInput,
  ) => Promise<unknown>;
  auditFn?: (
    actor: LandActor,
    input: {
      resourceType: string;
      resourceId: string;
      operation: string;
      metadata?: Record<string, unknown>;
    },
    client: LandDbClient,
  ) => Promise<void>;
};

function assertVersion(expectedVersion: number): void {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error('INVALID_REQUEST');
  }
}

// Leader-only gate for approve/reject (DR-18, api-contract F-04).
// commune_leader in the exact application OrganizationUnit; no Assignment
// indirection. Fail-closed to FORBIDDEN without data leak.
function requireLeaderApprovalAccess(
  actor: IdentityUser,
  organizationId: string,
): void {
  if (!(actor.roles as readonly string[]).includes('commune_leader')) {
    throw new Error('FORBIDDEN');
  }
  if (
    !actor.organizationUnitId?.trim() ||
    actor.organizationUnitId !== organizationId
  ) {
    throw new Error('FORBIDDEN');
  }
}

function parseApproveReason(body: unknown): string | null {
  if (body === undefined) return null;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('INVALID_REQUEST');
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length > 1 || (keys.length === 1 && keys[0] !== 'reason')) {
    throw new Error('INVALID_REQUEST');
  }
  if (!('reason' in record) || record['reason'] === undefined) return null;
  const reason = record['reason'];
  if (reason === null) return null;
  if (typeof reason !== 'string') throw new Error('INVALID_REQUEST');
  const trimmed = reason.trim();
  return trimmed ? trimmed : null;
}

function parseRejectReason(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('INVALID_REQUEST');
  }
  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).length !== 1 ||
    !('reason' in record) ||
    typeof record['reason'] !== 'string' ||
    !record['reason'].trim()
  ) {
    throw new Error('INVALID_REQUEST');
  }
  return (record['reason'] as string).trim();
}

function asPayloadRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('INVALID_REQUEST');
  }
  return value as Record<string, unknown>;
}

function shareToCents(value: unknown): number {
  const numeric = Number(String(value));
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) {
    throw new Error('INVALID_REQUEST');
  }
  const cents = Math.round(numeric * 100);
  if (Math.abs(numeric * 100 - cents) > 1e-6)
    throw new Error('INVALID_REQUEST');
  return cents;
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

// Completed land effects for the four change types (DR-18, data-model 5.2,
// ADR-0001). Only completed mutates LandRight/LandParcel/LandEncumbrance;
// no hard-delete: ended/released/retired statuses preserve history (DR-22).
async function applyCompletedEffects(
  tx: LandDbClient,
  row: ApplicationRowWithLinks,
  now: Date,
  actor: IdentityUser,
  appendEventFn: NonNullable<ApprovalDeps['appendEventFn']>,
  auditFn: NonNullable<ApprovalDeps['auditFn']>,
): Promise<void> {
  const partyLinks = row.applicationParties as Array<{
    partyId: string;
    partyRole: string;
    sharePercent: unknown;
  }>;
  const parcelLinks = row.applicationParcels as Array<{
    parcelId: string;
    parcelRole: string;
  }>;

  switch (row.changeType) {
    case 'transfer': {
      const subjects = parcelLinks.filter((l) => l.parcelRole === 'subject');
      if (subjects.length !== 1 || !subjects[0]) {
        throw new Error('INVALID_REQUEST');
      }
      const subjectId = subjects[0].parcelId;
      const proposed = partyLinks.filter(
        (l) => l.partyRole === 'proposed_holder',
      );
      if (proposed.length < 1) throw new Error('INVALID_REQUEST');
      const cents = proposed.map((l) => shareToCents(l.sharePercent));
      if (cents.reduce((sum, c) => sum + c, 0) !== 10000) {
        throw new Error('INVALID_REQUEST');
      }
      await tx.landRight.updateMany({
        where: { parcelId: subjectId, status: 'active' },
        data: { status: 'ended', validTo: now },
      });
      for (let i = 0; i < proposed.length; i += 1) {
        const link = proposed[i];
        if (!link) throw new Error('INVALID_REQUEST');
        await tx.landRight.create({
          data: {
            parcelId: subjectId,
            partyId: link.partyId,
            rightType: 'land_use_right',
            sharePercent: String(link.sharePercent),
            status: 'active',
            validFrom: now,
            validTo: null,
            sourceApplicationId: row.id,
          },
        });
      }
      return;
    }
    case 'information_update': {
      const payload = asPayloadRecord(row.changePayload);
      const field = payload['field'];
      const newValue = payload['newValue'];
      if (
        (field !== 'address' && field !== 'landUseType') ||
        typeof newValue !== 'string' ||
        !newValue.trim()
      ) {
        throw new Error('INVALID_REQUEST');
      }
      const subjects = parcelLinks.filter((l) => l.parcelRole === 'subject');
      if (subjects.length !== 1 || !subjects[0]) {
        throw new Error('INVALID_REQUEST');
      }
      const trimmed = newValue.trim();
      // No error mapping here: inputs are server-validated above and the
      // parcel row is guaranteed by the application link (FK RESTRICT), so
      // any persistence failure is unexpected and must bubble with its
      // provider evidence intact instead of being misclassified as a
      // client input error.
      const before = await tx.landParcel.findUniqueOrThrow({
        where: { id: subjects[0].parcelId },
      });
      const after = await tx.landParcel.update({
        where: { id: subjects[0].parcelId },
        data: {
          ...(field === 'address'
            ? { address: trimmed }
            : { landUseType: trimmed }),
          version: { increment: 1 },
        },
      });
      const eventType = 'LandParcelUpdated';
      await appendEventFn(tx, {
        eventId: randomUUID(),
        eventType,
        eventVersion: 1,
        aggregateType: 'LandParcel',
        aggregateId: after.id,
        aggregateVersion: after.version,
        occurredAt: now,
        actor: actorSnapshot(actor),
        payload: {
          parcelCode: after.parcelCode,
          organizationId: after.organizationId,
          applicationId: row.id,
          changeType: row.changeType,
          changedField: field,
          beforeStatus: before.status,
          afterStatus: after.status,
          beforeVersion: before.version,
          afterVersion: after.version,
        },
        metadata: {},
      });
      await auditFn(
        actor as LandActor,
        {
          resourceType: 'LandParcel',
          resourceId: after.id,
          operation: 'land.parcel.updated',
          metadata: {
            parcelCode: after.parcelCode,
            organizationId: after.organizationId,
            applicationId: row.id,
            changeType: row.changeType,
            changedField: field,
            beforeStatus: before.status,
            afterStatus: after.status,
            beforeVersion: before.version,
            afterVersion: after.version,
          },
        },
        tx,
      );
      return;
    }
    case 'mortgage': {
      const payload = asPayloadRecord(row.changePayload);
      const action = payload['action'];
      if (action !== 'register' && action !== 'release') {
        throw new Error('INVALID_REQUEST');
      }
      const subjects = parcelLinks.filter((l) => l.parcelRole === 'subject');
      if (subjects.length !== 1 || !subjects[0]) {
        throw new Error('INVALID_REQUEST');
      }
      const subjectId = subjects[0].parcelId;
      if (action === 'register') {
        const secured = partyLinks.filter(
          (l) => l.partyRole === 'secured_party',
        );
        if (secured.length < 1 || !secured[0]) {
          throw new Error('INVALID_REQUEST');
        }
        await tx.landEncumbrance.create({
          data: {
            parcelId: subjectId,
            securedPartyId: secured[0].partyId,
            encumbranceType: 'mortgage',
            status: 'active',
            externalReference: null,
            registeredAt: now,
            releasedAt: null,
            sourceApplicationId: row.id,
          },
        });
        return;
      }
      const actives = await tx.landEncumbrance.findMany({
        where: { parcelId: subjectId, status: 'active' },
        select: { id: true },
      });
      if (actives.length < 1) throw new Error('INVALID_REQUEST');
      await tx.landEncumbrance.updateMany({
        where: { parcelId: subjectId, status: 'active' },
        data: { status: 'released', releasedAt: now },
      });
      return;
    }
    case 'parcel_split_merge': {
      const payload = asPayloadRecord(row.changePayload);
      const operation = payload['operation'];
      if (operation !== 'split' && operation !== 'merge') {
        throw new Error('INVALID_REQUEST');
      }
      const sources = parcelLinks.filter((l) => l.parcelRole === 'source');
      const results = parcelLinks.filter((l) => l.parcelRole === 'result');
      if (sources.length < 1 || results.length < 1) {
        throw new Error('INVALID_REQUEST');
      }
      const parcelIds = [...sources, ...results].map((link) => link.parcelId);
      const beforeParcels = await tx.landParcel.findMany({
        where: { id: { in: parcelIds } },
      });
      const retired = await tx.landParcel.updateMany({
        where: {
          id: { in: sources.map((l) => l.parcelId) },
          status: 'active',
        },
        data: { status: 'retired', version: { increment: 1 } },
      });
      if (retired.count !== sources.length) {
        throw new Error('INVALID_REQUEST');
      }
      const activated = await tx.landParcel.updateMany({
        where: {
          id: { in: results.map((l) => l.parcelId) },
          status: 'proposed',
        },
        data: { status: 'active', version: { increment: 1 } },
      });
      if (activated.count !== results.length) {
        throw new Error('INVALID_REQUEST');
      }
      const afterParcels = await tx.landParcel.findMany({
        where: { id: { in: parcelIds } },
      });
      for (const after of afterParcels) {
        const before = beforeParcels.find((parcel) => parcel.id === after.id);
        if (!before) throw new Error('INVALID_REQUEST');
        const metadata = {
          parcelCode: after.parcelCode,
          organizationId: after.organizationId,
          applicationId: row.id,
          changeType: row.changeType,
          beforeStatus: before.status,
          afterStatus: after.status,
          beforeVersion: before.version,
          afterVersion: after.version,
        };
        await appendEventFn(tx, {
          eventId: randomUUID(),
          eventType: 'LandParcelStatusChanged',
          eventVersion: 1,
          aggregateType: 'LandParcel',
          aggregateId: after.id,
          aggregateVersion: after.version,
          occurredAt: now,
          actor: actorSnapshot(actor),
          payload: metadata,
          metadata: {},
        });
        await auditFn(
          actor as LandActor,
          {
            resourceType: 'LandParcel',
            resourceId: after.id,
            operation: 'land.parcel.status_changed',
            metadata,
          },
          tx,
        );
      }
      return;
    }
    default:
      throw new Error('INVALID_REQUEST');
  }
}

async function createDecisionApproval(
  tx: LandDbClient,
  input: {
    row: ApplicationRowWithLinks;
    actor: IdentityUser;
    status: string;
    reason: string | null;
    beforeStatus: string;
    afterStatus: string;
    beforeVersion: number;
    afterVersion: number;
    decidedAt: Date;
  },
): Promise<ApprovalRow> {
  try {
    return (await tx.approval.create({
      data: {
        resourceType: 'LandChangeApplication',
        resourceId: input.row.id,
        action: 'approve',
        status: input.status,
        organizationId: input.row.organizationId,
        requestedById: input.row.createdById,
        decidedById: input.actor.id,
        reason: input.reason,
        payload: {
          applicationCode: input.row.applicationCode,
          changeType: input.row.changeType,
          beforeStatus: input.beforeStatus,
          afterStatus: input.afterStatus,
          beforeVersion: input.beforeVersion,
          afterVersion: input.afterVersion,
        } as Prisma.InputJsonValue,
        decidedAt: input.decidedAt,
      },
    })) as ApprovalRow;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new Error('INVALID_TRANSITION');
    }
    throw error;
  }
}

// Leader approve: pending_approval -> completed with land effects (LND-12).
// Optimistic concurrency via updateMany on version; stale version is
// VERSION_CONFLICT with no mutation. Domain, land, approval, event and
// audit share one transaction (DR-18, DR-19, ADR-0001).
export async function approveApplication(
  applicationId: string,
  actor: IdentityUser,
  expectedVersion: number,
  body: unknown = {},
  deps: ApprovalDeps = {},
): Promise<{ application: ApplicationDetail; approval: ApprovalResponse }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  assertVersion(expectedVersion);
  const reason = parseApproveReason(body);
  assertLandActor(actor);
  const appendEventFn = deps.appendEventFn ?? appendEvent;
  const auditFn = deps.auditFn ?? auditLandEvent;

  return prisma.$transaction(async (tx) => {
    const row = (await tx.landChangeApplication.findUnique({
      where: { id: applicationId },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks | null;
    if (!row) throw new Error('APPLICATION_NOT_FOUND');
    requireLeaderApprovalAccess(actor, row.organizationId);
    if (row.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    if (row.status !== 'pending_approval')
      throw new Error('INVALID_TRANSITION');

    const now = new Date();
    await applyCompletedEffects(tx, row, now, actor, appendEventFn, auditFn);

    const approval = await createDecisionApproval(tx, {
      row,
      actor,
      status: 'approved',
      reason,
      beforeStatus: 'pending_approval',
      afterStatus: 'completed',
      beforeVersion: expectedVersion,
      afterVersion: expectedVersion + 1,
      decidedAt: now,
    });

    const updated = await tx.landChangeApplication.updateMany({
      where: { id: row.id, version: expectedVersion },
      data: {
        status: 'completed',
        version: expectedVersion + 1,
        completedAt: now,
        rejectionReason: null,
      },
    });
    if (updated.count !== 1) throw new Error('VERSION_CONFLICT');

    const refreshed = (await tx.landChangeApplication.findUniqueOrThrow({
      where: { id: row.id },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks;

    await appendEventFn(tx, {
      eventId: randomUUID(),
      eventType: 'LandChangeApplicationCompleted',
      eventVersion: 1,
      aggregateType: 'LandChangeApplication',
      aggregateId: row.id,
      aggregateVersion: refreshed.version,
      occurredAt: now,
      actor: actorSnapshot(actor),
      payload: {
        applicationCode: row.applicationCode,
        changeType: row.changeType,
        organizationId: row.organizationId,
        beforeStatus: 'pending_approval',
        afterStatus: 'completed',
        beforeVersion: expectedVersion,
        afterVersion: expectedVersion + 1,
        version: expectedVersion + 1,
        approvalId: approval.id,
      },
      metadata: {},
    });
    await auditFn(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: 'land.application.approved',
        metadata: {
          beforeStatus: 'pending_approval',
          afterStatus: 'completed',
          beforeVersion: expectedVersion,
          afterVersion: expectedVersion + 1,
          approvalId: approval.id,
        },
      },
      tx,
    );

    return {
      application: toApplicationDetail(refreshed),
      approval: toApprovalResponse(approval),
    };
  });
}

const REJECTABLE_STATUSES: readonly string[] = ['pending_approval'];

// Leader reject: pending_approval -> rejected (LND-12).
// Reason is mandatory trimmed non-empty (400); rejected never mutates
// LandRight/LandParcel/LandEncumbrance (data-model 5.1). Approval, event
// and audit share the status transaction (DR-18, DR-19).
export async function rejectApplication(
  applicationId: string,
  actor: IdentityUser,
  expectedVersion: number,
  body: unknown = {},
  deps: ApprovalDeps = {},
): Promise<{ application: ApplicationDetail; approval: ApprovalResponse }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  assertVersion(expectedVersion);
  const reason = parseRejectReason(body);
  assertLandActor(actor);
  const appendEventFn = deps.appendEventFn ?? appendEvent;
  const auditFn = deps.auditFn ?? auditLandEvent;

  return prisma.$transaction(async (tx) => {
    const row = (await tx.landChangeApplication.findUnique({
      where: { id: applicationId },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks | null;
    if (!row) throw new Error('APPLICATION_NOT_FOUND');
    requireLeaderApprovalAccess(actor, row.organizationId);
    if (row.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    if (!REJECTABLE_STATUSES.includes(row.status)) {
      throw new Error('INVALID_TRANSITION');
    }

    const now = new Date();
    const approval = await createDecisionApproval(tx, {
      row,
      actor,
      status: 'rejected',
      reason,
      beforeStatus: row.status,
      afterStatus: 'rejected',
      beforeVersion: expectedVersion,
      afterVersion: expectedVersion + 1,
      decidedAt: now,
    });

    const updated = await tx.landChangeApplication.updateMany({
      where: { id: row.id, version: expectedVersion },
      data: {
        status: 'rejected',
        version: expectedVersion + 1,
        completedAt: null,
        rejectionReason: reason,
      },
    });
    if (updated.count !== 1) throw new Error('VERSION_CONFLICT');

    const refreshed = (await tx.landChangeApplication.findUniqueOrThrow({
      where: { id: row.id },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks;

    await appendEventFn(tx, {
      eventId: randomUUID(),
      eventType: 'LandChangeApplicationRejected',
      eventVersion: 1,
      aggregateType: 'LandChangeApplication',
      aggregateId: row.id,
      aggregateVersion: refreshed.version,
      occurredAt: now,
      actor: actorSnapshot(actor),
      payload: {
        applicationCode: row.applicationCode,
        changeType: row.changeType,
        organizationId: row.organizationId,
        beforeStatus: row.status,
        afterStatus: 'rejected',
        beforeVersion: expectedVersion,
        afterVersion: expectedVersion + 1,
        version: expectedVersion + 1,
        approvalId: approval.id,
      },
      metadata: {},
    });
    await auditFn(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: 'land.application.rejected',
        metadata: {
          beforeStatus: row.status,
          afterStatus: 'rejected',
          beforeVersion: expectedVersion,
          afterVersion: expectedVersion + 1,
          approvalId: approval.id,
        },
      },
      tx,
    );

    return {
      application: toApplicationDetail(refreshed),
      approval: toApprovalResponse(approval),
    };
  });
}
