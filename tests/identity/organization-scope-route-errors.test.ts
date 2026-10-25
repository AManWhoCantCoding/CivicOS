import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listRegistry: vi.fn(),
  listObservations: vi.fn(),
  listIncidents: vi.fn(),
  listAssignments: vi.fn(),
}));

vi.mock('@/modules/identity', () => ({
  getCurrentUser: mocks.getCurrentUser,
  listAssignments: mocks.listAssignments,
}));
vi.mock('@/modules/vehicles', () => ({
  listRegistry: mocks.listRegistry,
  listObservations: mocks.listObservations,
}));
vi.mock('@/modules/incidents', () => ({ listIncidents: mocks.listIncidents }));

import { GET as getRegistry } from '@/app/api/vehicles/registry/route';
import { GET as getObservations } from '@/app/api/vehicles/observations/route';
import { GET as getIncidents } from '@/app/api/incidents/route';
import { GET as getAssignments } from '@/app/api/identity/assignments/route';

const actor = {
  id: 'user-1',
  email: 'user@example.test',
  name: 'User',
  roles: ['field_officer'],
  organizationUnitId: 'unit-1',
};

const cases = [
  ['vehicle registry', getRegistry, mocks.listRegistry, 'registry'],
  [
    'vehicle observations',
    getObservations,
    mocks.listObservations,
    'observations',
  ],
  ['incidents', getIncidents, mocks.listIncidents, 'incidents'],
  [
    'identity assignments',
    getAssignments,
    mocks.listAssignments,
    'assignments',
  ],
] as const;

describe('organization-scope list route errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(actor);
  });

  it.each(cases)(
    '%s returns 403 without list data',
    async (_name, handler, service, payloadKey) => {
      service.mockRejectedValue(new Error('FORBIDDEN'));

      const response = await handler(new Request('http://localhost/api/list'));

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'FORBIDDEN' });
      expect(body).not.toHaveProperty(payloadKey);
    },
  );

  it.each(cases)(
    '%s returns 401 before calling its list service when unauthenticated',
    async (_name, handler, service) => {
      mocks.getCurrentUser.mockResolvedValue(null);

      const response = await handler(new Request('http://localhost/api/list'));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
      expect(service).not.toHaveBeenCalled();
    },
  );

  it.each(cases)(
    '%s returns its list payload and forwards the actor',
    async (name, handler, service, payloadKey) => {
      const rows = [{ id: 'row-1' }];
      service.mockResolvedValue(rows);
      const url =
        name === 'incidents'
          ? 'http://localhost/api/list?status=open&category=fire'
          : name === 'identity assignments'
            ? 'http://localhost/api/list?resourceType=Incident&resourceId=inc-1&includeRevoked=true'
            : 'http://localhost/api/list';

      const response = await handler(new Request(url));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ [payloadKey]: rows });
      if (name === 'identity assignments') {
        expect(service).toHaveBeenCalledWith({
          actor,
          resourceType: 'Incident',
          resourceId: 'inc-1',
          includeRevoked: true,
        });
      } else if (name === 'incidents') {
        expect(service).toHaveBeenCalledWith(actor, {
          status: 'open',
          category: 'fire',
        });
      } else {
        expect(service).toHaveBeenCalledWith(actor);
      }
    },
  );

  it.each(cases)(
    '%s returns 500 for unexpected list service errors',
    async (_name, handler, service) => {
      service.mockRejectedValue(new Error('unexpected service failure'));

      const response = await handler(new Request('http://localhost/api/list'));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'unexpected service failure',
      });
    },
  );
});
