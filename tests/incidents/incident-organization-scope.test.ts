import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assignmentFindMany: vi.fn(),
  incidentFindMany: vi.fn(),
  intakeFindMany: vi.fn(),
  intakeFindUnique: vi.fn(),
  readModels: vi.fn(),
  recordAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    assignment: { findMany: mocks.assignmentFindMany },
    incident: { findMany: mocks.incidentFindMany },
    intakeReport: {
      findMany: mocks.intakeFindMany,
      findUnique: mocks.intakeFindUnique,
    },
  },
}));
vi.mock('@/modules/eventing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/eventing')>()),
  readModels: mocks.readModels,
}));
vi.mock('@/modules/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/identity')>()),
  recordAudit: mocks.recordAudit,
}));

import {
  confirmIntakeReport,
  getIntakeReport,
  listIntakeReports,
} from '@/modules/incidents/commands';
import { listIncidents } from '@/modules/incidents/projection';

const actor = (organizationUnitId?: string) => ({
  id: 'actor-1',
  email: 'actor@example.test',
  name: 'Actor',
  roles: ['commander' as const],
  organizationUnitId,
});

describe('incident list organization scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, '', '  \t'])(
    'denies incident list without OU (%s) before reads/audit',
    async (ou) => {
      await expect(listIncidents(actor(ou))).rejects.toThrow('FORBIDDEN');
      expect(mocks.assignmentFindMany).not.toHaveBeenCalled();
      expect(mocks.readModels).not.toHaveBeenCalled();
      expect(mocks.incidentFindMany).not.toHaveBeenCalled();
      expect(mocks.recordAudit).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '  \t'])(
    'denies intake list without OU (%s) before reads/audit',
    async (ou) => {
      await expect(listIntakeReports(actor(ou))).rejects.toThrow('FORBIDDEN');
      expect(mocks.intakeFindMany).not.toHaveBeenCalled();
      expect(mocks.recordAudit).not.toHaveBeenCalled();
    },
  );

  it('preserves valid-OU intake filtering including null-organization reports', async () => {
    mocks.intakeFindMany.mockResolvedValue([]);
    await listIntakeReports(actor('unit-a'));
    expect(mocks.intakeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ organizationId: 'unit-a' }, { organizationId: null }] },
      }),
    );
  });

  it.each([undefined, '', '  \t'])(
    'denies intake detail without OU (%s) before reads/audit',
    async (ou) => {
      await expect(getIntakeReport('report-1', actor(ou))).rejects.toThrow(
        'FORBIDDEN',
      );
      expect(mocks.intakeFindUnique).not.toHaveBeenCalled();
      expect(mocks.recordAudit).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '  \t'])(
    'denies intake confirmation without OU on unassigned report (%s) before writes',
    async (ou) => {
      const tx = {
        $queryRaw: vi.fn(),
        intakeReport: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'report-1',
            organizationId: null,
            status: 'VERIFIED',
            confirmedAt: null,
            version: 1,
          }),
          update: vi.fn(),
        },
      };
      mocks.transaction.mockImplementationOnce(
        (callback) => callback(tx as never) as never,
      );

      await expect(confirmIntakeReport('report-1', actor(ou))).rejects.toThrow(
        'FORBIDDEN',
      );
      expect(tx.intakeReport.update).not.toHaveBeenCalled();
      expect(mocks.recordAudit).not.toHaveBeenCalled();
    },
  );
});
