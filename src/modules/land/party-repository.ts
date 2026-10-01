import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { LandDbClient } from './access';

// Stored LandParty row without decrypted fields.
export type PartyRow = {
  id: string;
  referenceCode: string;
  partyType: string;
  displayNameCiphertext: string;
  identityNumberCiphertext: string | null;
  identityNumberIndex: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

// Insert input carrying ciphertext and blind index only.
export type InsertPartyInput = {
  referenceCode: string;
  partyType: string;
  displayNameCiphertext: string;
  identityNumberCiphertext: string | null;
  identityNumberIndex: string | null;
};

// Insert a party row holding ciphertext, never plaintext.
export async function insertParty(
  input: InsertPartyInput,
  client: LandDbClient = prisma,
): Promise<PartyRow> {
  try {
    return await client.landParty.create({
      data: { ...input, status: 'active' },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new Error('DUPLICATE_CODE');
    throw error;
  }
}

// List parties linked into an organization via rights or applications.
export async function findPartiesByOrganization(
  organizationId: string,
  filters: { status?: string; partyType?: string } = {},
  paging: { limit: number; cursorId?: string } = { limit: 50 },
  client: LandDbClient = prisma,
): Promise<{ rows: PartyRow[]; nextCursor: string | null }> {
  const rows = await client.landParty.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.partyType ? { partyType: filters.partyType } : {}),
      OR: [
        { rights: { some: { parcel: { organizationId } } } },
        {
          applicationParties: {
            some: { application: { organizationId } },
          },
        },
      ],
    },
    orderBy: { id: 'asc' },
    ...(paging.cursorId ? { cursor: { id: paging.cursorId }, skip: 1 } : {}),
    take: paging.limit + 1,
  });
  const page = rows.slice(0, paging.limit);
  return {
    rows: page,
    nextCursor: rows.length > paging.limit ? page[page.length - 1].id : null,
  };
}

// Read one party row by id.
export async function findPartyById(
  id: string,
  client: LandDbClient = prisma,
): Promise<PartyRow | null> {
  return client.landParty.findUnique({ where: { id } });
}
