import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { LandDbClient } from './access';

// Stored LandChangeApplication row with its logical links.
export type ApplicationRow = {
  id: string;
  applicationCode: string;
  organizationId: string;
  changeType: string;
  status: string;
  changePayload: unknown;
  createdById: string;
  idempotencyKey: string | null;
  version: number;
  submittedAt: Date;
  completedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ApplicationPartyLink = {
  applicationId: string;
  partyId: string;
  partyRole: string;
  sharePercent: unknown;
};

export type ApplicationParcelLink = {
  applicationId: string;
  parcelId: string;
  parcelRole: string;
};

export type ApplicationRowWithLinks = ApplicationRow & {
  applicationParties: ApplicationPartyLink[];
  applicationParcels: ApplicationParcelLink[];
};

const WITH_LINKS = {
  applicationParties: true,
  applicationParcels: true,
} as const;

// Insert input carrying server-owned identity and scope only.
export type InsertApplicationInput = {
  applicationCode: string;
  organizationId: string;
  changeType: string;
  changePayload: Prisma.InputJsonValue;
  createdById: string;
  idempotencyKey: string;
  parties: Array<{
    partyId: string;
    partyRole: string;
    sharePercent: string | null;
  }>;
  parcels: Array<{ parcelId: string; parcelRole: string }>;
};

// Insert an application aggregate with its party/parcel links in one call.
// The caller owns the surrounding transaction (DR-19).
export async function insertApplication(
  input: InsertApplicationInput,
  client: LandDbClient = prisma,
): Promise<ApplicationRowWithLinks> {
  try {
    return (await client.landChangeApplication.create({
      data: {
        applicationCode: input.applicationCode,
        organizationId: input.organizationId,
        changeType: input.changeType,
        status: 'submitted',
        changePayload: input.changePayload,
        createdById: input.createdById,
        idempotencyKey: input.idempotencyKey,
        version: 1,
        applicationParties: {
          create: input.parties.map((party) => ({
            partyId: party.partyId,
            partyRole: party.partyRole,
            ...(party.sharePercent === null
              ? { sharePercent: null }
              : { sharePercent: party.sharePercent }),
          })),
        },
        applicationParcels: {
          create: input.parcels.map((parcel) => ({
            parcelId: parcel.parcelId,
            parcelRole: parcel.parcelRole,
          })),
        },
      },
      include: WITH_LINKS,
    })) as ApplicationRowWithLinks;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = String(
          (error.meta as { target?: unknown } | undefined)?.target ?? '',
        );
        if (target.includes('idempotencyKey'))
          throw new Error(`IDEMPOTENCY_CONFLICT:${input.idempotencyKey}`);
        throw new Error('DUPLICATE_CODE');
      }
      if (error.code === 'P2003') {
        const field = String(
          (error.meta as { field_name?: unknown } | undefined)?.field_name ??
            '',
        );
        if (field.includes('partyId')) throw new Error('PARTY_NOT_FOUND');
        if (field.includes('parcelId')) throw new Error('PARCEL_NOT_FOUND');
        throw new Error('INVALID_REQUEST');
      }
    }
    throw error;
  }
}

// Read one application with links by id.
export async function findApplicationById(
  id: string,
  client: LandDbClient = prisma,
): Promise<ApplicationRowWithLinks | null> {
  return (await client.landChangeApplication.findUnique({
    where: { id },
    include: WITH_LINKS,
  })) as ApplicationRowWithLinks | null;
}

// Read one application with links by idempotency key.
export async function findApplicationByIdempotencyKey(
  idempotencyKey: string,
  client: LandDbClient = prisma,
): Promise<ApplicationRowWithLinks | null> {
  return (await client.landChangeApplication.findUnique({
    where: { idempotencyKey },
    include: WITH_LINKS,
  })) as ApplicationRowWithLinks | null;
}

// List applications in an organization with cursor pagination.
export async function findApplicationsByOrganization(
  organizationId: string,
  filters: {
    status?: string;
    changeType?: string;
    applicationIds?: string[];
  } = {},
  paging: { limit: number; cursorId?: string } = { limit: 50 },
  client: LandDbClient = prisma,
): Promise<{ rows: ApplicationRow[]; nextCursor: string | null }> {
  const rows = (await client.landChangeApplication.findMany({
    where: {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.changeType ? { changeType: filters.changeType } : {}),
      ...(filters.applicationIds ? { id: { in: filters.applicationIds } } : {}),
    },
    orderBy: { id: 'asc' },
    ...(paging.cursorId ? { cursor: { id: paging.cursorId }, skip: 1 } : {}),
    take: paging.limit + 1,
  })) as ApplicationRow[];
  const page = rows.slice(0, paging.limit);
  return {
    rows: page,
    nextCursor: rows.length > paging.limit ? page[page.length - 1].id : null,
  };
}

// List active LandChangeApplication assignment targets for a user in scope.
// Task is filtered exactly to land_review (DR-10): other tasks never grant
// land list visibility, and revoked rows are excluded by status.
export async function findAssignedApplicationIds(
  userId: string,
  organizationId: string,
  client: LandDbClient = prisma,
): Promise<string[]> {
  const rows = await client.assignment.findMany({
    where: {
      resourceType: 'LandChangeApplication',
      task: 'land_review',
      assigneeUserId: userId,
      status: 'active',
      organizationId,
    },
    select: { resourceId: true },
  });
  return [...new Set(rows.map((row) => row.resourceId))];
}
