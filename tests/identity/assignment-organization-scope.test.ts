import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    assignment: { findMany: mocks.findMany },
  },
}));

import {
  grantAssignments,
  listAssignments,
  revokeAssignment,
} from '@/modules/identity/assignments';
import type { IdentityUser } from '@/modules/identity/contracts';

const actor = (organizationUnitId?: string): IdentityUser => ({
  id: 'actor',
  email: 'actor@example.test',
  name: 'Actor',
  roles: ['commander'],
  organizationUnitId,
});

beforeEach(() => vi.clearAllMocks());

describe('assignment organization scope', () => {
  it.each(['', '  \t'])(
    'rejects explicitly blank assignment scope %j before tx operations',
    async (organizationId) => {
      await expect(
        grantAssignments(
          {
            user: { findUnique: mocks.findUnique },
            assignment: { create: mocks.create },
          } as never,
          {
            resourceType: 'Incident',
            resourceId: 'incident',
            task: 'incident_command',
            assigneeUserIds: ['user'],
            organizationId,
          },
          actor('unit'),
        ),
      ).rejects.toThrow('ORGANIZATION_SCOPE_FORBIDDEN');
      expect(mocks.findUnique).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '  \t'])(
    'rejects grant actor scope %s before tx operations',
    async (unit) => {
      await expect(
        grantAssignments(
          {
            user: { findUnique: mocks.findUnique },
            assignment: { create: mocks.create },
          } as never,
          {
            resourceType: 'Incident',
            resourceId: 'incident',
            task: 'incident_command',
            assigneeUserIds: ['user'],
            organizationId: 'other',
          },
          actor(unit),
        ),
      ).rejects.toThrow('FORBIDDEN');
      expect(mocks.findUnique).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it.each([null, '', '  \t'])(
    'rejects revoke of assignment with unscoped organization %j before update',
    async (organizationId) => {
      mocks.findUnique.mockResolvedValue({
        id: 'assignment',
        organizationId,
        resourceType: 'Incident',
        task: 'incident_command',
        status: 'active',
      });
      mocks.transaction.mockImplementation((callback) =>
        callback({
          assignment: {
            findUnique: mocks.findUnique,
            update: mocks.update,
          },
        }),
      );

      await expect(
        revokeAssignment('assignment', actor('unit'), 'reason'),
      ).rejects.toThrow('FORBIDDEN');
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '  \t'])(
    'rejects revoke actor scope %s before transaction',
    async (unit) => {
      await expect(
        revokeAssignment('assignment', actor(unit), 'reason'),
      ).rejects.toThrow('FORBIDDEN');
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '  \t'])(
    'rejects list actor scope %s before read',
    async (unit) => {
      await expect(listAssignments({ actor: actor(unit) })).rejects.toThrow(
        'FORBIDDEN',
      );
      expect(mocks.findMany).not.toHaveBeenCalled();
    },
  );
});
