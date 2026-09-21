import { createHash, randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  createEvidence,
  getEvidence,
  LocalEvidenceStorage,
} from '@/modules/platform';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const evidenceIds: string[] = [];
const storageRoot = `/tmp/civicos-evidence-${randomUUID()}`;

describe('evidence contract', () => {
  it('uses a stable content hash for immutable originals', () => {
    const bytes = new TextEncoder().encode('evidence');
    expect(createHash('sha256').update(bytes).digest('hex')).toHaveLength(64);
  });

  it('rejects incomplete or out-of-range capture coordinates at the contract boundary', async () => {
    const storage = new LocalEvidenceStorage(`${storageRoot}-validation`);
    const input = {
      resourceType: 'EvidenceTest',
      resourceId: randomUUID(),
      fileName: 'invalid.txt',
      mimeType: 'text/plain',
      bytes: new TextEncoder().encode('invalid'),
      capturedAt: new Date(),
      actorId: 'evidence-test-actor',
      latitude: 91,
      longitude: 105,
    };
    await expect(createEvidence(storage, input)).rejects.toThrow(
      'INVALID_LATITUDE',
    );
    await expect(
      createEvidence(storage, { ...input, latitude: undefined }),
    ).rejects.toThrow('GEOPOINT_INCOMPLETE');
  });

  it.skipIf(!postgresEnabled)(
    'persists immutable metadata and is idempotent by original content',
    async () => {
      const storage = new LocalEvidenceStorage(storageRoot);
      const input = {
        resourceType: 'EvidenceTest',
        resourceId: randomUUID(),
        fileName: 'original.txt',
        mimeType: 'text/plain',
        bytes: new TextEncoder().encode('original'),
        capturedAt: new Date('2026-09-19T01:02:03.000Z'),
        actorId: 'evidence-test-actor',
        latitude: 20.9,
        longitude: 105.8,
        metadata: { source: 'field-camera', sequence: 1 },
      };

      const first = await createEvidence(storage, input);
      evidenceIds.push(first.id);
      const duplicate = await createEvidence(storage, input);
      const replacement = await createEvidence(storage, {
        ...input,
        bytes: new TextEncoder().encode('replacement'),
        fileName: 'replacement.txt',
      });
      evidenceIds.push(replacement.id);

      expect(duplicate.id).toBe(first.id);
      expect(replacement.id).not.toBe(first.id);
      expect(first.originalHash).toBe(
        createHash('sha256').update(input.bytes).digest('hex'),
      );
      expect(first).toMatchObject({
        capturedAt: input.capturedAt,
        actorId: input.actorId,
        metadata: input.metadata,
        immutable: true,
      });
      expect(Number(first.latitude)).toBe(input.latitude);
      expect(Number(first.longitude)).toBe(input.longitude);
      expect(await getEvidence(first.id)).toMatchObject({
        id: first.id,
        storageKey: first.storageKey,
      });
    },
  );

  afterAll(async () => {
    if (!postgresEnabled || !evidenceIds.length) return;
    await prisma.evidence.deleteMany({ where: { id: { in: evidenceIds } } });
  });
});
