import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity';

const { getCurrentUser, getIncident } = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<IdentityUser | null>>(),
  getIncident: vi.fn(),
}));

vi.mock('@/modules/identity', () => ({ getCurrentUser }));
vi.mock('@/modules/incidents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/incidents')>()),
  getIncident,
}));

import { GET } from '@/app/api/incidents/[incidentId]/route';

const actor: IdentityUser = {
  id: 'synthetic-user-1',
  email: 'synthetic@example.test',
  name: 'Synthetic User',
  roles: ['office_officer'],
  organizationUnitId: 'synthetic-unit-1',
};

const context = (incidentId: string) => ({
  params: Promise.resolve({ incidentId }),
});

describe('GET /api/incidents/[incidentId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 and skips the service without a session user', async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost'),
      context('incident-1'),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'UNAUTHENTICATED',
    });
    expect(getIncident).not.toHaveBeenCalled();
  });

  it('forwards the incident ID and actor and returns the exact service payload', async () => {
    const incident = {
      incident: { state: { status: 'OPEN' } },
      events: [{ id: 'event-1', type: 'incident.created' }],
      approvals: [],
      informant: null,
    };
    getCurrentUser.mockResolvedValue(actor);
    getIncident.mockResolvedValue(incident);

    const response = await GET(
      new Request('http://localhost'),
      context('incident-1'),
    );

    expect(response.status).toBe(200);
    expect(getIncident).toHaveBeenCalledOnce();
    expect(getIncident).toHaveBeenCalledWith('incident-1', actor);
    await expect(response.json()).resolves.toEqual({ incident });
  });

  it('maps FORBIDDEN to 403', async () => {
    getCurrentUser.mockResolvedValue(actor);
    getIncident.mockRejectedValue(new Error('FORBIDDEN'));

    const response = await GET(
      new Request('http://localhost'),
      context('incident-1'),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' });
  });

  it('maps other service errors to 404', async () => {
    getCurrentUser.mockResolvedValue(actor);
    getIncident.mockRejectedValue(new Error('INCIDENT_NOT_FOUND'));

    const response = await GET(
      new Request('http://localhost'),
      context('incident-1'),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'INCIDENT_NOT_FOUND',
    });
  });
});
