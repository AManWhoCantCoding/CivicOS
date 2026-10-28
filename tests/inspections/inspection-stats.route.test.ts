import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity';

const { getCurrentUser, inspectionStats } = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<IdentityUser | null>>(),
  inspectionStats: vi.fn(),
}));

vi.mock('@/modules/identity', () => ({ getCurrentUser }));
vi.mock('@/modules/inspections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/inspections')>()),
  inspectionStats,
}));

import { GET } from '@/app/api/inspections/stats/route';

const actor: IdentityUser = {
  id: 'user-1',
  email: 'commander@civicos.local',
  name: 'Commander',
  roles: ['office_officer'],
  organizationUnitId: 'unit-7',
};

function request(query = ''): Request {
  return new Request(`http://localhost/api/inspections/stats${query}`);
}

describe('GET /api/inspections/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 and skips the service when no session user exists', async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await GET(request('?from=2026-01-01'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'UNAUTHENTICATED',
    });
    expect(inspectionStats).not.toHaveBeenCalled();
  });

  it('forwards URL filters to the service and returns its stats payload', async () => {
    const stats = {
      generatedAt: '2026-10-26T00:00:00.000Z',
      from: '2026-01-01',
      to: '2026-12-31',
      totalEstablishments: 3,
      totalInspections: 7,
      results: { pass: 4, reminder: 2, needs_action: 1 },
      recommendations: {
        pending_approval: 1,
        approved: 2,
        rejected: 0,
        transferred: 0,
      },
      recommendationSla: { active: 1, overdue: 0, completed: 2 },
    };
    getCurrentUser.mockResolvedValue(actor);
    inspectionStats.mockResolvedValue(stats);

    const response = await GET(
      request(
        '?from=2026-01-01&to=2026-12-31&establishmentType=' +
          encodeURIComponent('Dịch vụ bảo vệ'),
      ),
    );

    expect(response.status).toBe(200);
    expect(inspectionStats).toHaveBeenCalledOnce();
    expect(inspectionStats.mock.calls[0][0]).toMatchObject({
      id: actor.id,
      organizationUnitId: actor.organizationUnitId,
    });
    expect(inspectionStats.mock.calls[0][1]).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
      establishmentType: 'Dịch vụ bảo vệ',
    });
    await expect(response.json()).resolves.toEqual({ stats });
  });

  it('maps a service FORBIDDEN error to a 403 error response', async () => {
    getCurrentUser.mockResolvedValue(actor);
    inspectionStats.mockRejectedValue(new Error('FORBIDDEN'));

    const response = await GET(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'FORBIDDEN',
      code: 'FORBIDDEN',
    });
  });
});
