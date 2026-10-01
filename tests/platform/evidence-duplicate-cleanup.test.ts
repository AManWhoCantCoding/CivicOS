import { createHash } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  prisma: {
    evidence: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: testState.prisma }));

import type { EvidenceStorageAdapter } from '@/modules/platform/evidence/storage-adapter';
import { createEvidenceRecord } from '@/modules/platform/evidence/evidence-service';

describe('Evidence duplicate cleanup', () => {
  beforeEach(() => {
    testState.prisma.evidence.findFirst.mockReset();
  });

  it('removes the newly stored artifact before returning a unique-conflict duplicate', async () => {
    const bytes = new TextEncoder().encode('duplicate');
    const originalHash = createHash('sha256').update(bytes).digest('hex');
    const duplicate = {
      id: 'existing-evidence',
      storageKey: 'existing/duplicate.pdf',
      originalHash,
    };
    const storage: EvidenceStorageAdapter = {
      store: vi.fn().mockResolvedValue({
        storageKey: 'new/duplicate.pdf',
        originalHash,
        sizeBytes: bytes.byteLength,
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue(new Uint8Array()),
    };
    const client = {
      evidence: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        ),
      },
    } as unknown as Prisma.TransactionClient;
    testState.prisma.evidence.findFirst.mockResolvedValue(duplicate);

    await expect(
      createEvidenceRecord(
        storage,
        {
          resourceType: 'LandParcel',
          resourceId: 'parcel-a',
          fileName: 'duplicate.pdf',
          mimeType: 'application/pdf',
          bytes,
          capturedAt: new Date('2026-10-01T00:00:00.000Z'),
          actorId: 'actor-a',
        },
        client,
      ),
    ).resolves.toEqual({ evidence: duplicate, stored: false });

    expect(storage.remove).toHaveBeenCalledWith('new/duplicate.pdf');
  });
});
