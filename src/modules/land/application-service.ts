import { randomBytes, randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';

import {
  assertLandActor,
  auditLandEvent,
  requireApplicationDetailAccess,
  requireLandReviewAccess,
} from './access';
import {
  findApplicationById,
  findApplicationByIdempotencyKey,
  findApplicationsByOrganization,
  findAssignedApplicationIds,
  insertApplication,
  type ApplicationRow,
  type ApplicationRowWithLinks,
} from './application-repository';
import { findParcelById } from './parcel-repository';
import { findPartyById } from './party-repository';
import {
  canonicalizeChangePayload,
  validateApplicationChange,
} from './change-validation';
import { toDecimalString } from './parcel-service';
import { decodeCursor, encodeCursor } from './schemas';
import type { ApplicationInput, ApplicationListQuery } from './schemas';

// Locked ApplicationSummary shape: no changePayload, no links.
export type ApplicationSummary = {
  id: string;
  applicationCode: string;
  organizationId: string;
  changeType: string;
  status: string;
  createdById: string;
  version: number;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
  rejectionReason: string | null;
};

export type ApplicationParty = {
  partyId: string;
  partyRole: string;
  sharePercent: string | null;
};

export type ApplicationParcel = {
  parcelId: string;
  parcelRole: string;
};

// Locked ApplicationDetail shape: summary plus payload and links.
export type ApplicationDetail = ApplicationSummary & {
  changePayload: Record<string, unknown>;
  parties: ApplicationParty[];
  parcels: ApplicationParcel[];
};

// Normalize stored numeric output to DecimalString.
function toShareString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toDecimalString(value);
}

// Map a stored row to the locked ApplicationSummary response.
export function toApplicationSummary(row: ApplicationRow): ApplicationSummary {
  return {
    id: row.id,
    applicationCode: row.applicationCode,
    organizationId: row.organizationId,
    changeType: row.changeType,
    status: row.status,
    createdById: row.createdById,
    version: row.version,
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    rejectionReason: row.rejectionReason,
  };
}

// Map a stored row with links to the locked ApplicationDetail response.
export function toApplicationDetail(
  row: ApplicationRowWithLinks,
): ApplicationDetail {
  return {
    ...toApplicationSummary(row),
    changePayload: (row.changePayload ?? {}) as Record<string, unknown>,
    parties: [...row.applicationParties]
      .sort((a, b) =>
        `${a.partyId}${a.partyRole}`.localeCompare(
          `${b.partyId}${b.partyRole}`,
        ),
      )
      .map((link) => ({
        partyId: link.partyId,
        partyRole: link.partyRole,
        sharePercent: toShareString(link.sharePercent),
      })),
    parcels: [...row.applicationParcels]
      .sort((a, b) =>
        `${a.parcelId}${a.parcelRole}`.localeCompare(
          `${b.parcelId}${b.parcelRole}`,
        ),
      )
      .map((link) => ({
        parcelId: link.parcelId,
        parcelRole: link.parcelRole,
      })),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

type FingerprintParties = Array<{
  partyId: string;
  partyRole: string;
  sharePercent: string | null;
}>;

type FingerprintParcels = Array<{ parcelId: string; parcelRole: string }>;

// Canonical fingerprint of the create payload for idempotency comparison
// (DR-07, EC-04, EC-05). Shares normalize to DecimalString; payload transfer
// shares canonicalize via change-validation so 100 and "100.00" match;
// ordering is canonical so link order never causes a false conflict (LND-07).
function fingerprintOf(input: {
  changeType: string;
  changePayload: unknown;
  parties: FingerprintParties;
  parcels: FingerprintParcels;
}): string {
  const parties = [...input.parties]
    .map((party) => ({
      partyId: party.partyId,
      partyRole: party.partyRole,
      sharePercent:
        party.sharePercent === null
          ? null
          : toDecimalString(party.sharePercent),
    }))
    .sort((a, b) =>
      `${a.partyId}${a.partyRole}`.localeCompare(`${b.partyId}${b.partyRole}`),
    );
  const parcels = [...input.parcels]
    .map((parcel) => ({
      parcelId: parcel.parcelId,
      parcelRole: parcel.parcelRole,
    }))
    .sort((a, b) =>
      `${a.parcelId}${a.parcelRole}`.localeCompare(
        `${b.parcelId}${b.parcelRole}`,
      ),
    );
  return stableStringify({
    changeType: input.changeType,
    changePayload: canonicalizeChangePayload(
      input.changeType,
      input.changePayload,
    ),
    parties,
    parcels,
  });
}

function fingerprintOfRow(row: ApplicationRowWithLinks): string {
  return fingerprintOf({
    changeType: row.changeType,
    changePayload: row.changePayload,
    parties: row.applicationParties.map((link) => ({
      partyId: link.partyId,
      partyRole: link.partyRole,
      sharePercent: toShareString(link.sharePercent),
    })),
    parcels: row.applicationParcels.map((link) => ({
      parcelId: link.parcelId,
      parcelRole: link.parcelRole,
    })),
  });
}

// Create a public application code without new dependencies.
function generateApplicationCode(): string {
  return `APP-${randomBytes(6).toString('hex').toUpperCase()}`;
}

// Create an application aggregate at submitted/version 1 (LND-06).
// Actor, organization, code, status and version come from the session and
// server, never from the client (DR-06, DR-09). Domain insert, domain event
// and audit share one transaction: any failure rolls back (DR-19).
// Idempotency: the key is required; same key with the same canonical
// payload/links replays the stored application, same key with a different
// payload conflicts (DR-07, EC-04, EC-05). Per-changeType validation
// (LND-07, DR-12–DR-15, EC-10–EC-12) rejects invalid before any row.
export async function createApplication(
  input: ApplicationInput,
  actor: IdentityUser,
  idempotencyKey: string,
): Promise<{ application: ApplicationDetail; replayed: boolean }> {
  assertLandActor(actor);
  if (!(actor.roles as readonly string[]).includes('land_officer')) {
    throw new Error('FORBIDDEN');
  }
  const key = idempotencyKey?.trim();
  if (!key) throw new Error('INVALID_REQUEST');
  if (input.parties.length < 1 || input.parcels.length < 1)
    throw new Error('INVALID_REQUEST');

  // LND-06 existence/scope boundary stays before LND-07 shape validation so
  // unknown party/parcel maps to 404 and cross-OU stays 403 (DR-06, DR-09).
  for (const party of input.parties) {
    const stored = await findPartyById(party.partyId);
    if (!stored) throw new Error('PARTY_NOT_FOUND');
  }
  for (const parcel of input.parcels) {
    const stored = await findParcelById(parcel.parcelId);
    if (!stored) throw new Error('PARCEL_NOT_FOUND');
    if (stored.organizationId !== actor.organizationUnitId)
      throw new Error('FORBIDDEN');
  }

  const wanted = fingerprintOf(input);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const applicationCode = generateApplicationCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await findApplicationByIdempotencyKey(key, tx);
        if (existing) {
          if (existing.organizationId !== actor.organizationUnitId)
            throw new Error('FORBIDDEN');
          if (fingerprintOfRow(existing) !== wanted)
            throw new Error(`IDEMPOTENCY_CONFLICT:${key}`);
          return {
            application: toApplicationDetail(existing),
            replayed: true,
          };
        }
        // LND-07 per-changeType validation (DR-12–DR-15, EC-10–EC-12)
        // runs after the idempotency replay/conflict check so the same
        // key with a different payload stays 409 (EC-05) and invalid fresh
        // payloads are rejected before any row/transition with 400.
        validateApplicationChange(input);
        // Mortgage release prerequisite (DR-14, EC-11): each subject parcel
        // must have an active LandEncumbrance in the current domain source.
        // Uses the existing encumbrance table via the transaction client;
        // no new table/route, no geometry/result mutation here (DR-15).
        if (input.changeType === 'mortgage') {
          const payload = input.changePayload as Record<string, unknown>;
          if (payload['action'] === 'release') {
            const subjectIds = input.parcels
              .filter((parcel) => parcel.parcelRole === 'subject')
              .map((parcel) => parcel.parcelId);
            for (const parcelId of subjectIds) {
              const active = await tx.landEncumbrance.findFirst({
                where: { parcelId, status: 'active' },
                select: { id: true },
              });
              if (!active) throw new Error('INVALID_REQUEST');
            }
          }
        }
        const created = await insertApplication(
          {
            applicationCode,
            organizationId: actor.organizationUnitId,
            changeType: input.changeType,
            changePayload: input.changePayload as Prisma.InputJsonValue,
            createdById: actor.id,
            idempotencyKey: key,
            parties: input.parties,
            parcels: input.parcels,
          },
          tx,
        );
        await appendEvent(tx, {
          eventId: randomUUID(),
          eventType: 'LandChangeApplicationSubmitted',
          eventVersion: 1,
          aggregateType: 'LandChangeApplication',
          aggregateId: created.id,
          aggregateVersion: 1,
          occurredAt: created.submittedAt,
          actor: {
            id: actor.id,
            name: actor.name,
            role: actor.roles[0],
            organizationId: actor.organizationUnitId,
          },
          payload: {
            applicationCode: created.applicationCode,
            changeType: created.changeType,
            organizationId: created.organizationId,
            status: 'submitted',
            partyCount: input.parties.length,
            parcelCount: input.parcels.length,
          },
          metadata: { idempotencyReplayed: false },
        });
        await auditLandEvent(
          actor,
          {
            resourceType: 'LandChangeApplication',
            resourceId: created.id,
            operation: 'land.application.created',
            metadata: {
              applicationCode: created.applicationCode,
              changeType: created.changeType,
            },
          },
          tx,
        );
        return { application: toApplicationDetail(created), replayed: false };
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_CODE') {
        if (attempt === 0) continue;
      }
      if (
        error instanceof Error &&
        error.message.startsWith('IDEMPOTENCY_CONFLICT')
      ) {
        const existing = await findApplicationByIdempotencyKey(key);
        if (
          existing &&
          existing.organizationId === actor.organizationUnitId &&
          fingerprintOfRow(existing) === wanted
        ) {
          return {
            application: toApplicationDetail(existing),
            replayed: true,
          };
        }
      }
      throw error;
    }
  }
  throw new Error('DUPLICATE_CODE');
}

// List applications in the actor organization (LND-06).
// commune_leader reads the whole unit; the optional assignedTo filter narrows
// to active land_review assignments for that user in scope. land_officer only
// sees applications with an active land_review assignment for the current
// actor; any assignedTo filter intersects with the officer own scope and never
// broadens it. Summaries never carry changePayload or links.
export async function listApplications(
  query: ApplicationListQuery,
  actor: IdentityUser,
): Promise<{ items: ApplicationSummary[]; nextCursor: string | null }> {
  assertLandActor(actor);
  const roles = actor.roles as readonly string[];
  const isLeader = roles.includes('commune_leader');
  let applicationIds: string[] | undefined;
  if (isLeader) {
    if (query.assignedTo) {
      applicationIds = await findAssignedApplicationIds(
        query.assignedTo,
        actor.organizationUnitId,
      );
      if (applicationIds.length < 1) return { items: [], nextCursor: null };
    }
  } else {
    const ownIds = await findAssignedApplicationIds(
      actor.id,
      actor.organizationUnitId,
    );
    if (ownIds.length < 1) return { items: [], nextCursor: null };
    if (query.assignedTo) {
      if (query.assignedTo === actor.id) {
        applicationIds = ownIds;
      } else {
        const requestedIds = await findAssignedApplicationIds(
          query.assignedTo,
          actor.organizationUnitId,
        );
        const allowed = new Set(ownIds);
        applicationIds = requestedIds.filter((id) => allowed.has(id));
        if (applicationIds.length < 1) return { items: [], nextCursor: null };
      }
    } else {
      applicationIds = ownIds;
    }
  }
  const { rows, nextCursor } = await prisma.$transaction(async (tx) => {
    const found = await findApplicationsByOrganization(
      actor.organizationUnitId,
      {
        ...(query.status ? { status: query.status } : {}),
        ...(query.changeType ? { changeType: query.changeType } : {}),
        ...(applicationIds ? { applicationIds } : {}),
      },
      {
        limit: query.limit,
        ...(query.cursor ? { cursorId: decodeCursor(query.cursor) } : {}),
      },
      tx,
    );
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: '*',
        operation: 'land.application.listed',
        metadata: { count: found.rows.length },
      },
      tx,
    );
    return found;
  });
  return {
    items: rows.map((row) => toApplicationSummary(row)),
    nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
  };
}

// Read one application detail with links and payload in scope (LND-06).
// Fail-closed: unknown id -> APPLICATION_NOT_FOUND; out-of-scope ->
// FORBIDDEN without data; officer without assignment ->
// ASSIGNMENT_REQUIRED. Errors never carry changePayload.
export async function getApplicationDetail(
  applicationId: string,
  actor: IdentityUser,
): Promise<{ application: ApplicationDetail }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  assertLandActor(actor);
  const row = await findApplicationById(applicationId);
  if (!row) throw new Error('APPLICATION_NOT_FOUND');
  await requireApplicationDetailAccess(actor, {
    id: row.id,
    organizationId: row.organizationId,
  });
  await prisma.$transaction(async (tx) => {
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: 'land.application.viewed',
        metadata: {
          partyCount: row.applicationParties.length,
          parcelCount: row.applicationParcels.length,
        },
      },
      tx,
    );
  });
  return { application: toApplicationDetail(row) };
}

// Locked TimelineEvent shape for GET timeline (LND-08, api-contract).
export type TimelineEvent = {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  actor: {
    id: string;
    name: string;
    role: string | null;
    organizationId: string | null;
  } | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

type TimelineRecord = {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  organizationId: string | null;
  payload: unknown;
  metadata: unknown;
  occurredAt: Date;
};

// Strip forbidden keys recursively so timeline never leaks changePayload,
// ciphertext, storage internals or raw DB fields, even when nested inside
// arbitrary JSON objects/arrays. Safe fields are preserved as-is.
const FORBIDDEN_TIMELINE_KEYS: ReadonlySet<string> = new Set([
  'changePayload',
  'displayNameCiphertext',
  'identityNumberCiphertext',
  'ciphertext',
  'storageKey',
  'storageInternals',
]);

function sanitizeTimelineValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeTimelineValue);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (FORBIDDEN_TIMELINE_KEYS.has(key)) continue;
      out[key] = sanitizeTimelineValue(nested);
    }
    return out;
  }
  return value;
}

function sanitizeTimelineData(value: unknown): Record<string, unknown> {
  const cleaned = sanitizeTimelineValue(value);
  if (
    typeof cleaned === 'object' &&
    cleaned !== null &&
    !Array.isArray(cleaned)
  ) {
    return cleaned as Record<string, unknown>;
  }
  return {};
}

// Map one EventRecord row to the locked TimelineEvent response.
function toTimelineEvent(row: TimelineRecord): TimelineEvent {
  const hasActor = Boolean(row.actorId ?? row.actorName);
  return {
    eventId: row.eventId,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    aggregateVersion: row.aggregateVersion,
    actor: hasActor
      ? {
          id: row.actorId ?? '',
          name: row.actorName ?? '',
          role: row.actorRole ?? null,
          organizationId: row.organizationId ?? null,
        }
      : null,
    payload: sanitizeTimelineData(row.payload),
    metadata: sanitizeTimelineData(row.metadata),
    occurredAt: row.occurredAt.toISOString(),
  };
}

// Review an application submitted -> in_review (LND-08, DR-08, DR-10).
// Only land_officer with an active land_review Assignment in the same OU via
// the existing requireLandReviewAccess seam; no bypass or new policy.
// Body must be exactly {}; version must be a positive integer. Only
// submitted transitions; stale version is VERSION_CONFLICT with no
// update/event/audit. Domain update, event and audit share one transaction.
export async function reviewApplication(
  applicationId: string,
  actor: IdentityUser,
  expectedVersion: number,
  body: unknown = {},
): Promise<{ application: ApplicationDetail }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1)
    throw new Error('INVALID_REQUEST');
  if (body !== undefined) {
    if (typeof body !== 'object' || body === null || Array.isArray(body))
      throw new Error('INVALID_REQUEST');
    if (Object.keys(body as Record<string, unknown>).length !== 0)
      throw new Error('INVALID_REQUEST');
  }
  assertLandActor(actor);
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
    // Version precedes status so a replay with an old version always maps to
    // VERSION_CONFLICT (api-contract idempotency), while a current version on
    // a non-submitted row maps to INVALID_TRANSITION (DR-08, EC-07).
    if (row.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    if (row.status !== 'submitted') throw new Error('INVALID_TRANSITION');
    const updated = await tx.landChangeApplication.updateMany({
      where: { id: row.id, version: expectedVersion },
      data: { status: 'in_review', version: expectedVersion + 1 },
    });
    if (updated.count !== 1) throw new Error('VERSION_CONFLICT');
    const refreshed = (await tx.landChangeApplication.findUniqueOrThrow({
      where: { id: row.id },
      include: { applicationParties: true, applicationParcels: true },
    })) as ApplicationRowWithLinks;
    const occurredAt = new Date();
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'LandChangeApplicationReviewStarted',
      eventVersion: 1,
      aggregateType: 'LandChangeApplication',
      aggregateId: row.id,
      aggregateVersion: refreshed.version,
      occurredAt,
      actor: {
        id: actor.id,
        name: actor.name,
        role: (actor.roles as readonly string[])[0],
        organizationId: actor.organizationUnitId,
      },
      payload: {
        applicationCode: row.applicationCode,
        changeType: row.changeType,
        organizationId: row.organizationId,
        status: 'in_review',
        beforeStatus: 'submitted',
        afterStatus: 'in_review',
        beforeVersion: expectedVersion,
        afterVersion: expectedVersion + 1,
        version: expectedVersion + 1,
      },
      metadata: {},
    });
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: 'land.application.reviewed',
        metadata: {
          beforeStatus: 'submitted',
          afterStatus: 'in_review',
          beforeVersion: expectedVersion,
          afterVersion: expectedVersion + 1,
        },
      },
      tx,
    );
    return { application: toApplicationDetail(refreshed) };
  });
}

// Read the safe event timeline for one application (LND-08, F-02/F-06).
// Auth reuses the existing detail-access seam: scoped land_officer with an
// active assignment or same-OU commune_leader; unknown/cross-OU fails closed
// without detail. Queries only EventRecord for aggregateType
// LandChangeApplication with the exact aggregate id, ascending occurredAt
// with aggregateVersion/eventId tie-breakers. Audit
// land.application.timeline.listed shares the same read transaction; GET
// never mutates the domain row.
export async function listApplicationTimeline(
  applicationId: string,
  actor: IdentityUser,
): Promise<{ events: TimelineEvent[] }> {
  if (!applicationId?.trim()) throw new Error('INVALID_REQUEST');
  assertLandActor(actor);
  return prisma.$transaction(async (tx) => {
    const row = await tx.landChangeApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, organizationId: true },
    });
    if (!row) throw new Error('APPLICATION_NOT_FOUND');
    await requireApplicationDetailAccess(
      actor,
      { id: row.id, organizationId: row.organizationId },
      tx,
    );
    const records = (await tx.eventRecord.findMany({
      where: {
        aggregateType: 'LandChangeApplication',
        aggregateId: row.id,
      },
      orderBy: [
        { occurredAt: 'asc' },
        { aggregateVersion: 'asc' },
        { eventId: 'asc' },
      ],
    })) as TimelineRecord[];
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandChangeApplication',
        resourceId: row.id,
        operation: 'land.application.timeline.listed',
        metadata: { eventCount: records.length },
      },
      tx,
    );
    return { events: records.map(toTimelineEvent) };
  });
}
