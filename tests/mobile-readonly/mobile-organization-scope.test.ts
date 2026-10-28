import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prisma,
  resourceLookup,
  assignmentLookup,
  recordAudit,
  readAuthorization,
} = vi.hoisted(() => {
  const assignmentLookup = vi.fn();
  const prisma = {
    assignment: { findMany: assignmentLookup },
    notification: { findMany: vi.fn().mockResolvedValue([]) },
    incident: { findMany: vi.fn().mockResolvedValue([]) },
    eventRecord: { findMany: vi.fn().mockResolvedValue([]) },
    projectionRecord: { findMany: vi.fn().mockResolvedValue([]) },
    inspection: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    subjectManagementRecord: { findMany: vi.fn().mockResolvedValue([]) },
    vehicle: { findMany: vi.fn().mockResolvedValue([]) },
    inspectionFinding: { findMany: vi.fn().mockResolvedValue([]) },
    vehicleObservation: { findMany: vi.fn().mockResolvedValue([]) },
    establishment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
  };
  return {
    prisma,
    resourceLookup: vi.fn(),
    assignmentLookup,
    recordAudit: vi.fn(),
    readAuthorization: vi.fn(async () => true),
  };
});

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
import {
  listAlarms,
  listDispatches,
  listTasks,
} from '@/modules/mobile-readonly/forces';
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

  it('allows Inspection read when establishment organization matches an active compatible assignment', async () => {
    const inspectionFindUnique = vi.fn().mockResolvedValue({
      establishmentId: 'e1',
    });
    const establishmentFindUnique = vi
      .fn()
      .mockResolvedValue({ organizationId: 'unit-a' });
    const client = {
      inspection: { findUnique: inspectionFindUnique },
      establishment: { findUnique: establishmentFindUnique },
      assignment: { findMany: assignmentLookup },
    };
    assignmentLookup.mockResolvedValue([{ task: 'inspection_fieldwork' }]);
    expect(
      await hasActiveAssignmentForRead(
        actor('unit-a'),
        { resourceType: 'Inspection', resourceId: 'i1' },
        client as never,
      ),
    ).toBe(true);
    expect(inspectionFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' } }),
    );
    expect(establishmentFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } }),
    );
  });

  it('denies Inspection read on organization mismatch', async () => {
    const client = {
      inspection: {
        findUnique: vi.fn().mockResolvedValue({ establishmentId: 'e1' }),
      },
      establishment: {
        findUnique: vi.fn().mockResolvedValue({ organizationId: 'unit-b' }),
      },
      assignment: { findMany: assignmentLookup },
    };
    assignmentLookup.mockResolvedValue([{ task: 'inspection_fieldwork' }]);
    expect(
      await hasActiveAssignmentForRead(
        actor('unit-a'),
        { resourceType: 'Inspection', resourceId: 'i1' },
        client as never,
      ),
    ).toBe(false);
    expect(assignmentLookup).not.toHaveBeenCalled();
  });

  it.each([
    'inspection missing',
    'establishment missing',
  ] as const)(
    'denies Inspection read when %s',
    async (missing) => {
      const client = {
        inspection: {
          findUnique: vi
            .fn()
            .mockResolvedValue(missing === 'inspection missing' ? null : { establishmentId: 'e1' }),
        },
        establishment: {
          findUnique: vi
            .fn()
            .mockResolvedValue(missing === 'establishment missing' ? null : { organizationId: 'unit-a' }),
        },
        assignment: { findMany: assignmentLookup },
      };
      assignmentLookup.mockResolvedValue([{ task: 'inspection_fieldwork' }]);
      expect(
        await hasActiveAssignmentForRead(
          actor('unit-a'),
          { resourceType: 'Inspection', resourceId: 'i1' },
          client as never,
        ),
      ).toBe(false);
      expect(assignmentLookup).not.toHaveBeenCalled();
    },
  );

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

  it('projects an active Inspection assignment into listTasks with baseVersion via the establishment organization resolver', async () => {
    const row = {
      id: 'a1',
      resourceType: 'Inspection',
      resourceId: 'i1',
      task: 'inspection_fieldwork',
      status: 'active',
      organizationId: 'unit-a',
      createdAt: new Date('2026-01-02T03:04:05Z'),
    };
    // Keep the real resolver in the assertion path: the barrel mock delegates
    // to hasActiveAssignmentForRead with the shared fake Prisma client, using
    // the known actor/resource for this scenario.
    readAuthorization.mockImplementationOnce(() =>
      hasActiveAssignmentForRead(
        actor('unit-a'),
        { resourceType: 'Inspection', resourceId: 'i1' },
        prisma as never,
      ),
    );
    assignmentLookup.mockResolvedValueOnce([row]);
    assignmentLookup.mockResolvedValueOnce([{ task: 'inspection_fieldwork' }]);
    prisma.inspection.findUnique.mockResolvedValueOnce({
      establishmentId: 'e1',
    });
    prisma.establishment.findUnique.mockResolvedValueOnce({
      organizationId: 'unit-a',
    });
    prisma.inspection.findMany.mockResolvedValueOnce([
      { id: 'i1', version: 3 },
    ]);

    const result = await listTasks(actor('unit-a'), {});

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
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
    });
    expect(prisma.inspection.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' } }),
    );
    expect(prisma.establishment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } }),
    );
    expect(prisma.inspection.findUnique).toHaveBeenCalledTimes(1);
  });
});
