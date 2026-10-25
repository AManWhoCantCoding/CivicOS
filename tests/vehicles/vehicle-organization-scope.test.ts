import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    projectionRecord: { findUnique: vi.fn() },
    vehicleObservation: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    assignment: { findFirst: vi.fn(), findMany: vi.fn() },
  },
  readModels: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/modules/eventing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/eventing')>()),
  readModels: mocks.readModels,
}));
vi.mock('@/modules/identity', () => ({
  recordAudit: mocks.recordAudit,
  requireRole: (actor: { roles: string[] }, ...roles: string[]) => {
    if (!roles.some((role) => actor.roles.includes(role)))
      throw new Error('FORBIDDEN');
  },
}));
vi.mock('@/modules/platform', () => ({}));

import { assertVehicleObservationAccess } from '@/modules/vehicles/commands';
import {
  getObservation,
  listObservations,
  listRegistry,
} from '@/modules/vehicles/projection';

const actor = (organizationUnitId?: string) => ({
  id: 'actor',
  name: 'Actor',
  email: 'actor@example.test',
  roles: ['commander' as const],
  organizationUnitId,
});

describe('vehicle organization scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, '', '   '])(
    'rejects registry and observation lists without OU (%s)',
    async (ou) => {
      await expect(listRegistry(actor(ou))).rejects.toThrow('FORBIDDEN');
      await expect(listObservations(actor(ou))).rejects.toThrow('FORBIDDEN');
      expect(mocks.readModels).not.toHaveBeenCalled();
      expect(mocks.prisma.assignment.findMany).not.toHaveBeenCalled();
    },
  );

  it('rejects observation details without actor OU before reading', async () => {
    await expect(getObservation('obs', actor())).rejects.toThrow('FORBIDDEN');
    expect(mocks.prisma.projectionRecord.findUnique).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'other'])(
    'denies evidence boundary for absent or different observer OU (%s)',
    async (observerOU) => {
      mocks.prisma.vehicleObservation.findUnique.mockResolvedValue({
        observedById: 'observer',
      });
      mocks.prisma.user.findUnique.mockResolvedValue({
        organizationUnitId: observerOU,
      });
      await expect(
        assertVehicleObservationAccess('obs', actor('unit-a'), 'read'),
      ).rejects.toThrow('FORBIDDEN');
      expect(mocks.prisma.assignment.findFirst).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '   '])(
    'denies evidence boundary before observation lookup without actor OU (%s)',
    async (ou) => {
      await expect(
        assertVehicleObservationAccess('obs', actor(ou), 'read'),
      ).rejects.toThrow('FORBIDDEN');
      expect(mocks.prisma.vehicleObservation.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '   ', 'unit-b'])(
    'denies detail before assignment lookup for invalid observer OU (%s)',
    async (observerOU) => {
      mocks.prisma.projectionRecord.findUnique.mockResolvedValue({
        state: { id: 'obs' },
      });
      mocks.prisma.vehicleObservation.findUnique.mockResolvedValue({
        observedById: 'observer',
      });
      mocks.prisma.user.findUnique.mockResolvedValue({
        organizationUnitId: observerOU,
      });
      await expect(getObservation('obs', actor('unit-a'))).rejects.toThrow(
        'FORBIDDEN',
      );
      expect(mocks.prisma.assignment.findFirst).not.toHaveBeenCalled();
    },
  );

  it('allows matching observer OU through assignment boundary', async () => {
    mocks.prisma.vehicleObservation.findUnique.mockResolvedValue({
      observedById: 'observer',
    });
    mocks.prisma.user.findUnique.mockResolvedValue({
      organizationUnitId: 'unit-a',
    });
    mocks.prisma.assignment.findFirst.mockResolvedValue({ id: 'assignment' });
    await expect(
      assertVehicleObservationAccess('obs', actor('unit-a'), 'read'),
    ).resolves.toBeUndefined();
  });
});
