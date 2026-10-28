import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  appendEvent: vi.fn(),
  recordAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock('@/modules/eventing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/eventing')>()),
  appendEvent: mocks.appendEvent,
}));
vi.mock('@/modules/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/identity')>()),
  recordAudit: mocks.recordAudit,
}));

import {
  approveReport,
  generateMonthlyReport,
} from '@/modules/residents/commands';
import type { ResidentActor } from '@/modules/residents/contracts';
import { toApiError } from '@/modules/residents/contracts';

const approvedSnapshotPayload = {
  reportId: 'report-1',
  organizationId: 'ou-a',
  period: '2026-09',
  approvedAt: '2026-10-01T08:00:00.000Z',
  sourceRecordIds: ['rec-1', 'rec-2'],
  aggregateCounts: {
    total: 2,
    byPurpose: { checkup: 1, followup: 1 },
    byStatus: { open: 2 },
    overdue: 0,
    highRisk: 1,
  },
};

const approvedReport = {
  id: 'report-1',
  organizationId: 'ou-a',
  period: '2026-09',
  status: 'approved',
  sourceRecordIds: ['rec-1', 'rec-2'],
  aggregateCounts: {
    total: 2,
    byPurpose: { checkup: 1, followup: 1 },
    byStatus: { open: 2 },
    overdue: 0,
    highRisk: 1,
  },
  snapshotPayload: approvedSnapshotPayload,
  snapshotHash: 'stored-snapshot-hash',
  idempotencyKey: 'idem-key-1',
  version: 2,
  approvedById: 'actor-1',
  approvedAt: new Date('2026-10-01T08:00:00.000Z'),
  createdAt: new Date('2026-09-30T08:00:00.000Z'),
  updatedAt: new Date('2026-10-01T08:00:00.000Z'),
};

const actor = (
  roles: ResidentActor['roles'] = ['commander'],
): ResidentActor => ({
  id: 'actor-1',
  email: 'commander@example.test',
  name: 'Commander',
  roles,
  organizationUnitId: 'ou-a',
});

function transactionWith(tx: Record<string, unknown>) {
  mocks.transaction.mockImplementationOnce(
    (callback: (client: unknown) => unknown) => callback(tx as never),
  );
}

describe('resident monthly report snapshot immutability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('regenerating the same OU/period returns the stored approved report unchanged with no record reads, report writes, events, or audit', async () => {
    const tx = {
      residentMonthlyReport: {
        findUnique: vi.fn().mockResolvedValue(approvedReport),
        create: vi.fn(),
        update: vi.fn(),
      },
      subjectManagementRecord: { findMany: vi.fn() },
    };
    transactionWith(tx);

    const result = await generateMonthlyReport(
      { organizationId: 'ou-a', period: '2026-09' },
      actor(),
    );

    expect(result).toEqual(approvedReport);
    expect(result.snapshotHash).toBe('stored-snapshot-hash');
    expect(result.snapshotPayload).toEqual(approvedSnapshotPayload);
    expect(tx.residentMonthlyReport.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_period: {
          organizationId: 'ou-a',
          period: '2026-09',
        },
      },
    });
    expect(tx.subjectManagementRecord.findMany).not.toHaveBeenCalled();
    expect(tx.residentMonthlyReport.create).not.toHaveBeenCalled();
    expect(mocks.appendEvent).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key owned by another OU without disclosing or causing side effects', async () => {
    const tx = {
      residentMonthlyReport: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ ...approvedReport, organizationId: 'ou-b' }),
        create: vi.fn(),
        update: vi.fn(),
      },
      subjectManagementRecord: { findMany: vi.fn() },
    };
    transactionWith(tx);

    const error = await generateMonthlyReport(
      { organizationId: 'ou-a', period: '2026-09', idempotencyKey: 'idem-key-1' },
      actor(),
    ).then(() => null, (caught: Error) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('IDEMPOTENCY_CONFLICT');
    expect(toApiError(error).status).toBe(409);
    expect(tx.subjectManagementRecord.findMany).not.toHaveBeenCalled();
    expect(tx.residentMonthlyReport.create).not.toHaveBeenCalled();
    expect(tx.residentMonthlyReport.update).not.toHaveBeenCalled();
    expect(mocks.appendEvent).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key owned by another period in the same OU without side effects', async () => {
    const tx = {
      residentMonthlyReport: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ ...approvedReport, period: '2026-08' }),
        create: vi.fn(),
        update: vi.fn(),
      },
      subjectManagementRecord: { findMany: vi.fn() },
    };
    transactionWith(tx);

    const error = await generateMonthlyReport(
      { organizationId: 'ou-a', period: '2026-09', idempotencyKey: 'idem-key-1' },
      actor(),
    ).then(() => null, (caught: Error) => caught);

    expect(error?.message).toBe('IDEMPOTENCY_CONFLICT');
    expect(toApiError(error).status).toBe(409);
    expect(tx.subjectManagementRecord.findMany).not.toHaveBeenCalled();
    expect(tx.residentMonthlyReport.create).not.toHaveBeenCalled();
    expect(tx.residentMonthlyReport.update).not.toHaveBeenCalled();
    expect(mocks.appendEvent).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it('approving an already-approved report rejects REPORT_LOCKED with no report update, approval, event, or audit side effects', async () => {
    const tx = {
      residentMonthlyReport: {
        findUnique: vi.fn().mockResolvedValue(approvedReport),
        create: vi.fn(),
        update: vi.fn(),
      },
      approval: { create: vi.fn() },
    };
    transactionWith(tx);

    await expect(approveReport('report-1', actor())).rejects.toThrow(
      'REPORT_LOCKED',
    );

    expect(tx.residentMonthlyReport.findUnique).toHaveBeenCalledWith({
      where: { id: 'report-1' },
    });
    expect(tx.residentMonthlyReport.update).not.toHaveBeenCalled();
    expect(tx.approval.create).not.toHaveBeenCalled();
    expect(mocks.appendEvent).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });
});
