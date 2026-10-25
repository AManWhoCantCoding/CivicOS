import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentUser, recordAudit, findMany } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  recordAudit: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/modules/identity', () => ({ getCurrentUser, recordAudit }));
vi.mock('@/lib/prisma', () => ({
  prisma: { projectionRecord: { findMany } },
}));

import { GET } from '@/app/api/map/markers/route';

describe('GET /api/map/markers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    recordAudit.mockResolvedValue(undefined);
  });

  it.each([undefined, '', '   '])(
    'denies an actor with unusable OU %s before reading',
    async (organizationUnitId) => {
      getCurrentUser.mockResolvedValue({
        id: 'user-1',
        roles: ['field_officer'],
        organizationUnitId,
      });

      const response = await GET();

      expect(response.status).toBe(403);
      expect(findMany).not.toHaveBeenCalled();
      expect(recordAudit).not.toHaveBeenCalled();
    },
  );

  it('keeps the read scoped to the actor OU and audits success', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'user-1',
      roles: ['field_officer'],
      organizationUnitId: 'unit-7',
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: { path: ['organizationId'], equals: 'unit-7' },
        }),
      }),
    );
    expect(recordAudit).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      markers: [],
      organizationUnitId: 'unit-7',
      official: false,
    });
  });
});
