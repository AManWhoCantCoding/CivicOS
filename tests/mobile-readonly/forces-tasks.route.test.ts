import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity';

const { prisma, assignmentLookup, getCurrentUser } = vi.hoisted(() => {
  const assignmentLookup = vi.fn();
  const prisma = {
    assignment: { findMany: assignmentLookup },
    incident: { findMany: vi.fn().mockResolvedValue([]) },
    subjectManagementRecord: { findMany: vi.fn().mockResolvedValue([]) },
    vehicleObservation: { findMany: vi.fn().mockResolvedValue([]) },
    inspectionFinding: { findMany: vi.fn().mockResolvedValue([]) },
    inspection: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    establishment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
  };
  return {
    prisma,
    assignmentLookup,
    getCurrentUser: vi.fn<() => Promise<IdentityUser | null>>(),
  };
});

// Fake in-memory Prisma only: the real hasActiveAssignmentForRead resolver in
// the identity barrel keeps running through this shared client.
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/modules/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/identity')>();
  return {
    ...actual,
    getCurrentUser,
  };
});

import { GET } from '@/app/api/forces/tasks/route';
import { listTasks } from '@/modules/mobile-readonly';

const actor: IdentityUser = {
  id: 'field-user-1',
  email: 'field.officer@example.test',
  name: 'Field Officer',
  roles: ['field_officer'],
  organizationUnitId: 'unit-a',
};

describe('GET /api/forces/tasks (Inspection via Establishment resolver)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // activeAssignments then hasActiveAssignmentForRead.
    assignmentLookup.mockResolvedValue([]);
    prisma.inspection.findMany.mockResolvedValue([]);
  });

  it('returns the active Inspection fieldwork task with baseVersion through the real route and service', async () => {
    const row = {
      id: 'a1',
      resourceType: 'Inspection',
      resourceId: 'i1',
      task: 'inspection_fieldwork',
      status: 'active',
      organizationId: 'unit-a',
      createdAt: new Date('2026-01-02T03:04:05Z'),
    };
    getCurrentUser.mockResolvedValue(actor);
    assignmentLookup.mockResolvedValueOnce([row]);
    // Second assignment lookup: the real read-boundary helper's roles check.
    assignmentLookup.mockResolvedValueOnce([{ task: 'inspection_fieldwork' }]);
    // Inspection → Establishment → organization resolution chain.
    prisma.inspection.findUnique.mockResolvedValueOnce({
      establishmentId: 'e1',
    });
    prisma.establishment.findUnique.mockResolvedValueOnce({
      organizationId: 'unit-a',
    });
    // resourceLinks(includeResidentVersion) projection for baseVersion; the
    // follow-up inspections-by-findings read stays empty.
    prisma.inspection.findMany.mockResolvedValueOnce([{ id: 'i1', version: 3 }]);

    const response = await GET(
      new Request('http://localhost/api/forces/tasks?page=1&pageSize=20'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      data: [
        {
          id: 'task:a1',
          dispatchId: 'dispatch:a1',
          title: 'inspection fieldwork',
          status: 'active',
          resourceType: 'Inspection',
          resourceId: 'i1',
          assignmentSummary: {
            assignmentId: 'a1',
            task: 'inspection_fieldwork',
            status: 'active',
          },
          baseVersion: 3,
        },
      ],
    });

    // The real resolver walked Inspection through its Establishment.
    expect(prisma.inspection.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.inspection.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' } }),
    );
    expect(prisma.establishment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.establishment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } }),
    );
    // listTasks from the real module barrel handled the route.
    expect(vi.isMockFunction(listTasks)).toBe(false);
  });
});
