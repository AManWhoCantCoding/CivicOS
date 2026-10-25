import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { residentMonthlyReport: { findMany } },
}));

import { listReportPreviews } from '@/modules/residents/projection';
import type { ResidentActor } from '@/modules/residents/contracts';

const actor = (
  organizationUnitId?: string,
  roles: string[] = ['commander'],
): ResidentActor => ({
  id: 'actor-1',
  email: 'commander@example.test',
  name: 'Commander',
  roles: roles as ResidentActor['roles'],
  organizationUnitId,
});

describe('resident report preview OU scope', () => {
  beforeEach(() => findMany.mockReset().mockResolvedValue([]));

  it.each([undefined, '', '   '])(
    'rejects missing or blank actor OU (%s) before querying reports',
    async (organizationUnitId) => {
      await expect(
        listReportPreviews('ou-target', actor(organizationUnitId)),
      ).rejects.toThrow('FORBIDDEN');
      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it('allows matching OU and scopes the query to it', async () => {
    await expect(listReportPreviews('ou-a', actor('ou-a'))).resolves.toEqual(
      [],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'ou-a' },
      orderBy: { period: 'desc' },
      take: 24,
    });
  });

  it('preserves valid-OU superior commander cross-OU access', async () => {
    await expect(
      listReportPreviews('ou-b', actor('ou-a', ['superior_commander'])),
    ).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'ou-b' },
      orderBy: { period: 'desc' },
      take: 24,
    });
  });
});
