import { createHash } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { createGeoPoint } from '../geo';
import type { EvidenceStorageAdapter } from './storage-adapter';

export type EvidenceInput = {
  resourceType: string;
  resourceId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  capturedAt: Date;
  actorId: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
};

export async function createEvidence(
  storage: EvidenceStorageAdapter,
  input: EvidenceInput,
) {
  if (!input.bytes.byteLength) throw new Error('EMPTY_EVIDENCE');
  if (Number.isNaN(input.capturedAt.getTime()))
    throw new Error('INVALID_CAPTURE_TIME');
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }
  const hash = createHash('sha256').update(input.bytes).digest('hex');
  const existing = await prisma.evidence.findFirst({
    where: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      originalHash: hash,
    },
  });
  if (existing) return existing;

  const stored = await storage.store({
    resourceId: input.resourceId,
    fileName: input.fileName,
    bytes: input.bytes,
  });
  try {
    return await prisma.evidence.create({
      data: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        storageKey: stored.storageKey,
        originalHash: stored.originalHash,
        mimeType: input.mimeType,
        fileName: input.fileName,
        sizeBytes: stored.sizeBytes,
        capturedAt: input.capturedAt,
        actorId: input.actorId,
        latitude: input.latitude,
        longitude: input.longitude,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const duplicate = await prisma.evidence.findFirst({
        where: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          originalHash: hash,
        },
      });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

export function getEvidence(evidenceId: string) {
  return prisma.evidence.findUnique({ where: { id: evidenceId } });
}
