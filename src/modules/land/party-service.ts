import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';
import {
  blindIndex,
  decryptSensitive,
  encryptSensitive,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { appendEvent } from '@/modules/eventing';
import type { LandDbClient } from './access';

import {
  assertCanViewPartySensitive,
  assertLandActor,
  auditLandEvent,
} from './access';
import type { LandActor } from './access';
import { findPartiesByOrganization, insertParty } from './party-repository';
import type { PartyRow } from './party-repository';
import { decodeCursor, encodeCursor } from './schemas';
import type { LandListQuery, PartyInput } from './schemas';

// Locked Party response shape without ciphertext internals.
export type PartyResponse = {
  id: string;
  referenceCode: string;
  partyType: string;
  displayName: string;
  identityNumberMasked: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// Mask an identity number keeping the last four characters.
export function maskIdentityNumber(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

// Map a stored row to the locked Party response.
export function toPartyResponse(
  row: PartyRow,
  displayName: string,
  identityNumberMasked: string | null,
): PartyResponse {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    partyType: row.partyType,
    displayName,
    identityNumberMasked,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function decryptIdentityMasked(ciphertext: string | null): string | null {
  if (!ciphertext) return null;
  return maskIdentityNumber(decryptSensitive(ciphertext));
}

// Decrypt displayName only when the sensitive-read gate passes.
export async function resolveDisplayName(
  row: PartyRow,
  actor: LandActor,
): Promise<string> {
  await assertCanViewPartySensitive(actor, actor.organizationUnitId);
  return decryptSensitive(row.displayNameCiphertext);
}

// Insert an inline Party and its D-68 event/audit in the caller's transaction.
export async function createPartyInTransaction(
  input: PartyInput,
  actor: IdentityUser,
  tx: LandDbClient,
): Promise<PartyRow> {
  assertLandActor(actor);
  const created = await insertParty(
    {
      referenceCode: input.referenceCode,
      partyType: input.partyType,
      displayNameCiphertext: encryptSensitive(input.displayName),
      identityNumberCiphertext: input.identityNumber
        ? encryptSensitive(input.identityNumber)
        : null,
      identityNumberIndex: input.identityNumber
        ? blindIndex(input.identityNumber)
        : null,
    },
    tx,
  );
  await appendEvent(tx, {
    eventId: randomUUID(),
    eventType: 'LandPartyCreated',
    eventVersion: 1,
    aggregateType: 'LandParty',
    aggregateId: created.id,
    aggregateVersion: 1,
    occurredAt: created.createdAt,
    actor: {
      id: actor.id,
      name: actor.name,
      role: actor.roles[0],
      organizationId: actor.organizationUnitId,
    },
    payload: {
      referenceCode: created.referenceCode,
      partyType: created.partyType,
      status: created.status,
    },
    metadata: {},
  });
  await auditLandEvent(
    actor,
    {
      resourceType: 'LandParty',
      resourceId: created.id,
      operation: 'land.party.created',
      metadata: { referenceCode: created.referenceCode },
    },
    tx,
  );
  return created;
}

// List parties scoped to the actor organization with masked identity.
export async function listParties(
  query: LandListQuery,
  actor: IdentityUser,
): Promise<{ items: PartyResponse[]; nextCursor: string | null }> {
  assertLandActor(actor);
  await assertCanViewPartySensitive(actor, actor.organizationUnitId);
  const { rows, nextCursor } = await prisma.$transaction(async (tx) => {
    const found = await findPartiesByOrganization(
      actor.organizationUnitId,
      {
        ...(query.status ? { status: query.status } : {}),
        ...(query.partyType ? { partyType: query.partyType } : {}),
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
        resourceType: 'LandParty',
        resourceId: '*',
        operation: 'land.party.listed',
        metadata: { count: found.rows.length },
      },
      tx,
    );
    return found;
  });
  const items = rows.map((row) =>
    toPartyResponse(
      row,
      decryptSensitive(row.displayNameCiphertext),
      decryptIdentityMasked(row.identityNumberCiphertext),
    ),
  );
  return { items, nextCursor: nextCursor ? encodeCursor(nextCursor) : null };
}
