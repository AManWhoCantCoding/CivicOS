import { prisma } from '@/lib/prisma';
import {
  createEvidenceRecord,
  LocalEvidenceStorage,
} from '@/modules/platform/evidence';
import type { EvidenceStorageAdapter } from '@/modules/platform/evidence';
import type { IdentityUser } from '@/modules/identity';

import {
  assertLandActor,
  auditLandEvent,
  requireApplicationDetailAccess,
  requireParcelDetailAccess,
  type LandActor,
  type LandDbClient,
} from './access';

export const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export type LandEvidenceResourceType =
  'LandChangeApplication' | 'LandParcel' | 'LandParty';

export type LandEvidence = {
  id: string;
  resourceType: LandEvidenceResourceType;
  resourceId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  originalHash: string;
  immutable: boolean;
  description: string | null;
  createdAt: string;
};

export type UploadEvidenceInput = {
  resourceType: LandEvidenceResourceType;
  resourceId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  description?: string | null;
};

type PartyEvidenceScope = {
  applicationParties: Array<{
    application: { id: string; organizationId: string };
  }>;
  rights: Array<{
    parcel: { id: string; organizationId: string };
  }>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'INVALID_REQUEST';
}

function descriptionFromMetadata(metadata: unknown): string | null {
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return null;
  }
  const description = (metadata as Record<string, unknown>).description;
  return typeof description === 'string' ? description : null;
}

function toLandEvidence(row: {
  id: string;
  resourceType: string;
  resourceId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  originalHash: string;
  immutable: boolean;
  metadata: unknown;
  receivedAt: Date;
}): LandEvidence {
  return {
    id: row.id,
    resourceType: row.resourceType as LandEvidenceResourceType,
    resourceId: row.resourceId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    originalHash: row.originalHash,
    immutable: row.immutable,
    description: descriptionFromMetadata(row.metadata),
    createdAt: row.receivedAt.toISOString(),
  };
}

function validateEvidence(input: UploadEvidenceInput): void {
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(input.mimeType)) {
    throw new Error('EVIDENCE_TYPE_UNSUPPORTED');
  }
  if (input.bytes.byteLength > MAX_EVIDENCE_SIZE_BYTES) {
    throw new Error('EVIDENCE_TOO_LARGE');
  }
  if (!input.bytes.byteLength) throw new Error('INVALID_REQUEST');
}

async function requirePartyEvidenceAccess(
  actor: LandActor,
  party: PartyEvidenceScope,
  client: LandDbClient,
): Promise<void> {
  const applications = party.applicationParties.map(
    ({ application }) => application,
  );
  const parcels = party.rights.map(({ parcel }) => parcel);
  const sameUnit = [
    ...applications.map(({ organizationId }) => organizationId),
    ...parcels.map(({ organizationId }) => organizationId),
  ].some((organizationId) => organizationId === actor.organizationUnitId);

  if (!sameUnit) throw new Error('FORBIDDEN');
  if (actor.roles.includes('commune_leader')) return;

  let assignmentRequired = false;
  for (const application of applications) {
    try {
      await requireApplicationDetailAccess(actor, application, client);
      return;
    } catch (error) {
      if (errorMessage(error) === 'ASSIGNMENT_REQUIRED') {
        assignmentRequired = true;
      }
    }
  }
  for (const parcel of parcels) {
    try {
      await requireParcelDetailAccess(actor, parcel, client);
      return;
    } catch (error) {
      if (errorMessage(error) === 'ASSIGNMENT_REQUIRED') {
        assignmentRequired = true;
      }
    }
  }
  throw new Error(assignmentRequired ? 'ASSIGNMENT_REQUIRED' : 'FORBIDDEN');
}

async function requireEvidenceResourceAccess(
  actor: LandActor,
  resourceType: LandEvidenceResourceType,
  resourceId: string,
  client: LandDbClient,
): Promise<void> {
  if (!resourceId.trim()) throw new Error('INVALID_REQUEST');

  if (resourceType === 'LandChangeApplication') {
    const application = await client.landChangeApplication.findUnique({
      where: { id: resourceId },
      select: { id: true, organizationId: true },
    });
    if (!application) throw new Error('APPLICATION_NOT_FOUND');
    await requireApplicationDetailAccess(actor, application, client);
    return;
  }

  if (resourceType === 'LandParcel') {
    const parcel = await client.landParcel.findUnique({
      where: { id: resourceId },
      select: { id: true, organizationId: true },
    });
    if (!parcel) throw new Error('PARCEL_NOT_FOUND');
    await requireParcelDetailAccess(actor, parcel, client);
    return;
  }

  const party = await client.landParty.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      applicationParties: {
        select: {
          application: { select: { id: true, organizationId: true } },
        },
      },
      rights: {
        select: { parcel: { select: { id: true, organizationId: true } } },
      },
    },
  });
  if (!party) throw new Error('PARTY_NOT_FOUND');
  await requirePartyEvidenceAccess(actor, party, client);
}

export async function uploadEvidence(
  input: UploadEvidenceInput,
  actor: IdentityUser,
  storage: EvidenceStorageAdapter = new LocalEvidenceStorage(),
): Promise<LandEvidence> {
  assertLandActor(actor);
  let storedEvidenceKey: string | undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      await requireEvidenceResourceAccess(
        actor,
        input.resourceType,
        input.resourceId,
        tx,
      );
      validateEvidence(input);
      const created = await createEvidenceRecord(
        storage,
        {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          bytes: input.bytes,
          capturedAt: new Date(),
          actorId: actor.id,
          metadata: { description: input.description ?? null },
        },
        tx,
      );
      if (created.stored) storedEvidenceKey = created.evidence.storageKey;
      await auditLandEvent(
        actor,
        {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          operation: 'land.evidence.uploaded',
          metadata: {
            evidenceId: created.evidence.id,
            originalHash: created.evidence.originalHash,
            idempotent: !created.stored,
          },
        },
        tx,
      );
      return toLandEvidence(created.evidence);
    });
  } catch (error) {
    if (storedEvidenceKey) await storage.remove(storedEvidenceKey);
    throw error;
  }
}

export async function listEvidence(
  resourceType: LandEvidenceResourceType,
  resourceId: string,
  actor: IdentityUser,
): Promise<LandEvidence[]> {
  assertLandActor(actor);
  return prisma.$transaction(async (tx) => {
    await requireEvidenceResourceAccess(actor, resourceType, resourceId, tx);
    const rows = await tx.evidence.findMany({
      where: { resourceType, resourceId },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    });
    await auditLandEvent(
      actor,
      {
        resourceType,
        resourceId,
        operation: 'land.evidence.listed',
        metadata: { count: rows.length },
      },
      tx,
    );
    return rows.map(toLandEvidence);
  });
}
