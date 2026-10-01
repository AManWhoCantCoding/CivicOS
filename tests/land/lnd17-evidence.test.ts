import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EvidenceStorageAdapter } from '@/modules/platform/evidence';

const testState = vi.hoisted(() => {
  const evidenceRows: Array<Record<string, unknown>> = [];
  const prisma = {
    $transaction: vi.fn(),
    evidence: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    landChangeApplication: { findUnique: vi.fn() },
    landParcel: { findUnique: vi.fn() },
    landParty: { findUnique: vi.fn() },
    assignment: { findMany: vi.fn() },
    landApplicationParcel: { findMany: vi.fn() },
  };
  return {
    evidenceRows,
    prisma,
    recordAudit: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: testState.prisma }));
vi.mock('@/modules/identity', () => ({
  canViewSensitive: vi.fn(),
  getCurrentUser: vi.fn(),
  recordAudit: testState.recordAudit,
}));

import type { IdentityUser } from '@/modules/identity';
import {
  listEvidence,
  MAX_EVIDENCE_SIZE_BYTES,
  uploadEvidence,
} from '@/modules/land/evidence-service';

class MemoryEvidenceStorage implements EvidenceStorageAdapter {
  readonly keys = new Set<string>();
  readonly store = vi.fn(
    async (input: {
      resourceId: string;
      fileName: string;
      bytes: Uint8Array;
    }) => {
      const originalHash = createHash('sha256')
        .update(input.bytes)
        .digest('hex');
      const storageKey = `${input.resourceId}/${originalHash}-${input.fileName}`;
      this.keys.add(storageKey);
      return {
        storageKey,
        originalHash,
        sizeBytes: input.bytes.byteLength,
      };
    },
  );
  readonly remove = vi.fn(async (storageKey: string) => {
    this.keys.delete(storageKey);
  });
  readonly read = vi.fn(async () => new Uint8Array());
}

function actor(
  role: 'land_officer' | 'commune_leader',
  organizationUnitId = 'ou-a',
): IdentityUser {
  return {
    id: `lnd17-${role}`,
    email: `${role}@demo.local`,
    name: role,
    roles: [role] as unknown as IdentityUser['roles'],
    organizationUnitId,
  };
}

function bytes(text = 'evidence') {
  return new TextEncoder().encode(text);
}

function input(
  resourceType: 'LandChangeApplication' | 'LandParcel' | 'LandParty',
  resourceId: string,
  overrides?: Partial<{
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
    description: string | null;
  }>,
) {
  return {
    resourceType,
    resourceId,
    fileName: 'proof.pdf',
    mimeType: 'application/pdf',
    bytes: bytes(),
    description: 'Hồ sơ gốc',
    ...overrides,
  };
}

beforeEach(() => {
  testState.evidenceRows.length = 0;
  testState.recordAudit.mockReset();
  testState.recordAudit.mockResolvedValue({});
  testState.prisma.assignment.findMany.mockReset();
  testState.prisma.assignment.findMany.mockResolvedValue([]);
  testState.prisma.landApplicationParcel.findMany.mockReset();
  testState.prisma.landApplicationParcel.findMany.mockResolvedValue([]);
  testState.prisma.landChangeApplication.findUnique.mockReset();
  testState.prisma.landChangeApplication.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) =>
      where.id === 'missing' ? null : { id: where.id, organizationId: 'ou-a' },
  );
  testState.prisma.landParcel.findUnique.mockReset();
  testState.prisma.landParcel.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) =>
      where.id === 'missing' ? null : { id: where.id, organizationId: 'ou-a' },
  );
  testState.prisma.landParty.findUnique.mockReset();
  testState.prisma.landParty.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) =>
      where.id === 'missing'
        ? null
        : {
            id: where.id,
            applicationParties: [
              { application: { id: 'application-a', organizationId: 'ou-a' } },
            ],
            rights: [{ parcel: { id: 'parcel-a', organizationId: 'ou-a' } }],
          },
  );
  testState.prisma.evidence.findFirst.mockImplementation(
    async ({ where }: { where: Record<string, string> }) =>
      testState.evidenceRows.find(
        (row) =>
          row.resourceType === where.resourceType &&
          row.resourceId === where.resourceId &&
          row.originalHash === where.originalHash,
      ) ?? null,
  );
  testState.prisma.evidence.findMany.mockImplementation(
    async ({ where }: { where: Record<string, string> }) =>
      testState.evidenceRows.filter(
        (row) =>
          row.resourceType === where.resourceType &&
          row.resourceId === where.resourceId,
      ),
  );
  testState.prisma.evidence.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        id: `evidence-${testState.evidenceRows.length + 1}`,
        ...data,
        immutable: true,
        receivedAt: new Date('2026-10-01T00:00:00.000Z'),
      };
      testState.evidenceRows.push(row);
      return row;
    },
  );
  testState.prisma.$transaction.mockImplementation(
    async (callback: (client: typeof testState.prisma) => Promise<unknown>) => {
      const before = [...testState.evidenceRows];
      try {
        return await callback(testState.prisma);
      } catch (error) {
        testState.evidenceRows.splice(
          0,
          testState.evidenceRows.length,
          ...before,
        );
        throw error;
      }
    },
  );
});

describe('LND-17 Evidence service', () => {
  it.each([
    ['LandChangeApplication', 'application-a'],
    ['LandParcel', 'parcel-a'],
    ['LandParty', 'party-a'],
  ] as const)(
    'uploads and lists metadata for %s',
    async (resourceType, resourceId) => {
      const storage = new MemoryEvidenceStorage();
      const created = await uploadEvidence(
        input(resourceType, resourceId),
        actor('commune_leader'),
        storage,
      );
      const listed = await listEvidence(
        resourceType,
        resourceId,
        actor('commune_leader'),
      );

      expect(created).toMatchObject({
        resourceType,
        resourceId,
        mimeType: 'application/pdf',
        sizeBytes: bytes().byteLength,
        originalHash: createHash('sha256').update(bytes()).digest('hex'),
        immutable: true,
        description: 'Hồ sơ gốc',
        createdAt: '2026-10-01T00:00:00.000Z',
      });
      expect(created).not.toHaveProperty('storageKey');
      expect(created).not.toHaveProperty('metadata');
      expect(created).not.toHaveProperty('bytes');
      expect(listed).toEqual([created]);
      expect(
        testState.recordAudit.mock.calls.some(
          ([audit]) => audit.operation === 'land.evidence.uploaded',
        ),
      ).toBe(true);
      expect(
        testState.recordAudit.mock.calls.some(
          ([audit]) => audit.operation === 'land.evidence.listed',
        ),
      ).toBe(true);
    },
  );

  it('rejects unsupported MIME and oversized bytes before storage or row creation', async () => {
    const storage = new MemoryEvidenceStorage();
    await expect(
      uploadEvidence(
        input('LandParcel', 'parcel-a', { mimeType: 'text/plain' }),
        actor('commune_leader'),
        storage,
      ),
    ).rejects.toThrow('EVIDENCE_TYPE_UNSUPPORTED');
    await expect(
      uploadEvidence(
        input('LandParcel', 'parcel-a', {
          bytes: new Uint8Array(MAX_EVIDENCE_SIZE_BYTES + 1),
        }),
        actor('commune_leader'),
        storage,
      ),
    ).rejects.toThrow('EVIDENCE_TOO_LARGE');
    expect(storage.store).not.toHaveBeenCalled();
    expect(testState.evidenceRows).toHaveLength(0);
  });

  it.each(['application/pdf', 'image/jpeg', 'image/png'])(
    'accepts allowlisted MIME %s',
    async (mimeType) => {
      const storage = new MemoryEvidenceStorage();
      await expect(
        uploadEvidence(
          input('LandParcel', 'parcel-a', { mimeType }),
          actor('commune_leader'),
          storage,
        ),
      ).resolves.toMatchObject({ mimeType });
      expect(storage.store).toHaveBeenCalledTimes(1);
    },
  );

  it('is idempotent for the same resource and content hash', async () => {
    const storage = new MemoryEvidenceStorage();
    const first = await uploadEvidence(
      input('LandChangeApplication', 'application-a'),
      actor('commune_leader'),
      storage,
    );
    const duplicate = await uploadEvidence(
      input('LandChangeApplication', 'application-a', {
        fileName: 'renamed.pdf',
        description: 'Không thay đổi metadata bất biến',
      }),
      actor('commune_leader'),
      storage,
    );

    expect(duplicate).toEqual(first);
    expect(storage.store).toHaveBeenCalledTimes(1);
    expect(testState.evidenceRows).toHaveLength(1);
  });

  it('enforces organization scope and officer assignment', async () => {
    const storage = new MemoryEvidenceStorage();
    await expect(
      uploadEvidence(
        input('LandChangeApplication', 'application-a'),
        actor('land_officer'),
        storage,
      ),
    ).rejects.toThrow('ASSIGNMENT_REQUIRED');
    await expect(
      uploadEvidence(
        input('LandParcel', 'parcel-a'),
        actor('commune_leader', 'ou-b'),
        storage,
      ),
    ).rejects.toThrow('FORBIDDEN');
    expect(storage.store).not.toHaveBeenCalled();

    testState.prisma.assignment.findMany.mockResolvedValue([
      {
        task: 'land_review',
        resourceType: 'LandChangeApplication',
        resourceId: 'application-a',
        status: 'active',
        organizationId: 'ou-a',
      },
    ]);
    await expect(
      uploadEvidence(
        input('LandChangeApplication', 'application-a'),
        actor('land_officer'),
        storage,
      ),
    ).resolves.toMatchObject({ resourceId: 'application-a' });
  });

  it('removes stored bytes when the transaction fails after storage', async () => {
    const storage = new MemoryEvidenceStorage();
    testState.recordAudit.mockRejectedValueOnce(new Error('AUDIT_UNAVAILABLE'));

    await expect(
      uploadEvidence(
        input('LandParty', 'party-a'),
        actor('commune_leader'),
        storage,
      ),
    ).rejects.toThrow('AUDIT_UNAVAILABLE');
    expect(storage.store).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.keys).toHaveLength(0);
    expect(testState.evidenceRows).toHaveLength(0);
  });
});
