import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prisma,
  resourceLookup,
  assignmentLookup,
  recordAudit,
  readAuthorization,
} = vi.hoisted(() => ({
  prisma: {
    assignment: { findMany: vi.fn() },
    notification: { findMany: vi.fn().mockResolvedValue([]) },
    incident: { findMany: vi.fn().mockResolvedValue([]) },
    eventRecord: { findMany: vi.fn().mockResolvedValue([]) },
    projectionRecord: { findMany: vi.fn().mockResolvedValue([]) },
    inspection: { findMany: vi.fn().mockResolvedValue([]) },
    subjectManagementRecord: { findMany: vi.fn().mockResolvedValue([]) },
    vehicle: { findMany: vi.fn().mockResolvedValue([]) },
    inspectionFinding: { findMany: vi.fn().mockResolvedValue([]) },
    vehicleObservation: { findMany: vi.fn().mockResolvedValue([]) },
    establishment: { findMany: vi.fn().mockResolvedValue([]) },
  },
  resourceLookup: vi.fn(),
  assignmentLookup: vi.fn(),
  recordAudit: vi.fn(),
  readAuthorization: vi.fn(async () => true),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/modules/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/identity')>();
  return {
    ...actual,
    hasActiveAssignmentForRead: readAuthorization,
    requireMobileReadAccess: vi.fn(),
    recordAudit,
  };
});
import { hasActiveAssignmentForRead } from '@/modules/identity/authorization';
import { listAlarms, listDispatches } from '@/modules/mobile-readonly/forces';
import { resolveMobileLayers } from '@/modules/mobile-readonly/layers';
import {
  countRelatedInfo,
  searchRelatedInfo,
} from '@/modules/mobile-readonly/related-info';

const actor = (organizationUnitId?: string) => ({
  id: 'actor',
  email: 'a@x',
  name: 'Actor',
  roles: ['field_officer' as const],
  organizationUnitId,
});

describe('mobile organization scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resourceLookup.mockResolvedValue({ organizationId: 'unit-a' });
    assignmentLookup.mockResolvedValue([]);
  });

  it.each([undefined, '', '  \t'])(
    'rejects invalid actor unit %j before lookups',
    async (unit) => {
      const client = {
        establishment: { findUnique: resourceLookup },
        assignment: { findMany: assignmentLookup },
      };
      expect(
        await hasActiveAssignmentForRead(
          actor(unit),
          {
            resourceType: 'Establishment',
            resourceId: 'e1',
          },
          client as never,
        ),
      ).toBe(false);
      expect(resourceLookup).not.toHaveBeenCalled();
      expect(assignmentLookup).not.toHaveBeenCalled();
    },
  );

  it('rejects blank resource unit before assignment lookup and preserves valid-unit matching', async () => {
    const client = {
      establishment: { findUnique: resourceLookup },
      assignment: { findMany: assignmentLookup },
    };
    resourceLookup.mockResolvedValueOnce({ organizationId: '  ' });
    expect(
      await hasActiveAssignmentForRead(
        actor('unit-a'),
        {
          resourceType: 'Establishment',
          resourceId: 'e1',
        },
        client as never,
      ),
    ).toBe(false);
    expect(assignmentLookup).not.toHaveBeenCalled();
    resourceLookup.mockResolvedValueOnce({ organizationId: 'unit-a' });
    assignmentLookup.mockResolvedValueOnce([{ task: 'mobile_read' }]);
    expect(
      await hasActiveAssignmentForRead(
        actor('unit-a'),
        {
          resourceType: 'Establishment',
          resourceId: 'e1',
        },
        client as never,
      ),
    ).toBe(true);
  });

  it('returns empty mobile list without querying assignments for whitespace unit', async () => {
    expect(await listDispatches(actor(' \t'), {})).toMatchObject({
      data: [],
      total: 0,
    });
    expect(prisma.assignment.findMany).not.toHaveBeenCalled();
  });

  it('returns empty alarms without notification or resource reads for whitespace unit', async () => {
    expect(await listAlarms(actor(' \t'))).toEqual({ alarms: [] });
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
    for (const model of [
      prisma.incident,
      prisma.inspection,
      prisma.subjectManagementRecord,
      prisma.inspectionFinding,
      prisma.vehicleObservation,
      prisma.establishment,
    ]) {
      expect(model.findMany).not.toHaveBeenCalled();
    }
  });

  it('does not read alarm resource links when assignment authorization fails', async () => {
    prisma.notification.findMany.mockResolvedValueOnce([
      {
        id: 'n1',
        readAt: null,
        resourceType: 'Incident',
        resourceId: 'i1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    readAuthorization.mockResolvedValueOnce(false);

    expect(await listAlarms(actor('unit-a'))).toEqual({ alarms: [] });
    expect(prisma.incident.findMany).not.toHaveBeenCalled();
    for (const model of [
      prisma.inspection,
      prisma.subjectManagementRecord,
      prisma.inspectionFinding,
      prisma.vehicleObservation,
      prisma.establishment,
    ]) {
      expect(model.findMany).not.toHaveBeenCalled();
    }
  });

  it('rejects whitespace unit before mobile layer entity reads', async () => {
    await expect(resolveMobileLayers(actor(' \t'))).rejects.toThrow(
      'FORBIDDEN',
    );
    for (const model of [
      prisma.eventRecord,
      prisma.inspection,
      prisma.subjectManagementRecord,
      prisma.inspectionFinding,
      prisma.establishment,
    ]) {
      expect(model.findMany).not.toHaveBeenCalled();
    }
  });

  it('returns empty related-info results for whitespace unit without entity reads', async () => {
    expect(await searchRelatedInfo(actor(' \t'), {})).toMatchObject({
      data: [],
      total: 0,
    });
    expect(await countRelatedInfo(actor(' \t'), {})).toEqual({
      ALL: 0,
      RESIDENT: 0,
      BUSINESS: 0,
      HOTSPOT: 0,
      VIOLATION: 0,
    });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { count: 0 } }),
    );
    for (const model of [
      prisma.incident,
      prisma.eventRecord,
      prisma.projectionRecord,
      prisma.inspection,
      prisma.subjectManagementRecord,
      prisma.inspectionFinding,
      prisma.establishment,
    ]) {
      expect(model.findMany).not.toHaveBeenCalled();
    }
  });
});
