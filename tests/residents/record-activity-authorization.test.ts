import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity/contracts';
import { recordActivity } from '@/modules/residents/commands';

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  recordAudit: vi.fn(),
  appendEvent: vi.fn(),
  getAggregateVersion: vi.fn(),
  transactionClient: {
    subjectManagementRecord: { findUnique: vi.fn() },
    assignment: { findFirst: vi.fn(), findUnique: vi.fn() },
    subjectManagementActivity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/modules/eventing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/eventing')>()),
  appendEvent: mocks.appendEvent,
  getAggregateVersion: mocks.getAggregateVersion,
}));
vi.mock('@/modules/identity', () => ({
  ROLE_BASE_CAPABILITIES: {},
  blindIndex: vi.fn(),
  decryptSensitive: vi.fn(),
  encryptSensitive: vi.fn(),
  recordAudit: mocks.recordAudit,
  requireRole: vi.fn(),
}));

const record = {
  id: 'record-1',
  status: 'active',
  assignedOrganizationId: 'unit-a',
  purpose: 'reintegration',
  version: 1,
};
const recordAccess = {
  id: record.id,
  assignedOrganizationId: record.assignedOrganizationId,
};

const replayedActivity = {
  id: 'activity-1',
  recordId: 'record-1',
  content: 'existing activity payload',
};

const activeAssignment = {
  id: 'assignment-1',
  assigneeUserId: 'actor-1',
  task: 'resident_followup',
  resourceType: 'SubjectManagementRecord',
  resourceId: 'record-1',
  status: 'active',
  organizationId: 'unit-a',
};

const actor: IdentityUser = {
  id: 'actor-1',
  email: 'actor@civicos.local',
  name: 'actor',
  roles: ['village_officer'],
  organizationUnitId: 'unit-a',
};

const input = {
  recordId: 'record-1',
  activityType: 'checkup',
  occurredAt: '2026-10-22T12:00:00.000Z',
  content: 'new activity payload',
  assignmentId: 'assignment-1',
  idempotencyKey: 'request-key-1',
};

describe('FR-004-03 / D-63 resident.record_activity authorization before idempotency replay', () => {
  let callOrder: string[];
  let recordLookupCount: number;
  let replayMetadata: { id: string; recordId: string } | null;
  let activityToReplay: typeof replayedActivity | null;

  beforeEach(() => {
    vi.clearAllMocks();
    callOrder = [];
    recordLookupCount = 0;
    replayMetadata = {
      id: replayedActivity.id,
      recordId: replayedActivity.recordId,
    };
    activityToReplay = replayedActivity;
    mocks.recordAudit.mockImplementation(async () => {
      callOrder.push('audit');
    });
    mocks.appendEvent.mockImplementation(async () => {
      callOrder.push('event');
    });
    mocks.getAggregateVersion.mockImplementation(async () => {
      callOrder.push('aggregate-version');
      return 0;
    });
    mocks.prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof mocks.transactionClient) => Promise<unknown>,
      ) => callback(mocks.transactionClient),
    );
    mocks.transactionClient.subjectManagementRecord.findUnique.mockImplementation(
      async () => {
        const isAccessLookup = recordLookupCount++ === 0;
        callOrder.push(isAccessLookup ? 'record-access' : 'record-state');
        return isAccessLookup ? recordAccess : record;
      },
    );
    mocks.transactionClient.assignment.findUnique.mockImplementation(
      async () => {
        callOrder.push('assignment');
        return activeAssignment;
      },
    );
    mocks.transactionClient.assignment.findFirst.mockImplementation(
      async () => {
        callOrder.push('assignment');
        return activeAssignment;
      },
    );
    mocks.transactionClient.subjectManagementActivity.findUnique.mockImplementation(
      async () => {
        callOrder.push('metadata');
        return replayMetadata;
      },
    );
    mocks.transactionClient.subjectManagementActivity.findFirst.mockImplementation(
      async () => {
        callOrder.push('payload');
        return activityToReplay;
      },
    );
  });

  it('rejects an unauthorized replay before reading the existing activity', async () => {
    mocks.transactionClient.assignment.findUnique.mockImplementation(
      async () => {
        callOrder.push('assignment');
        return null;
      },
    );

    await expect(recordActivity(input, actor)).rejects.toThrow('FORBIDDEN');

    expect(callOrder).toEqual(['record-access', 'assignment']);
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenNthCalledWith(1, {
      where: { id: input.recordId },
      select: { id: true, assignedOrganizationId: true },
    });
    expect(
      mocks.transactionClient.subjectManagementActivity.findUnique,
    ).not.toHaveBeenCalled();
    expect(
      mocks.transactionClient.subjectManagementActivity.findFirst,
    ).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it('rejects roles outside D-63 before opening a transaction or querying the record', async () => {
    const outsideD63Actor: IdentityUser = {
      ...actor,
      roles: ['superior_officer'],
    };

    await expect(recordActivity(input, outsideD63Actor)).rejects.toThrow(
      'FORBIDDEN',
    );

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).not.toHaveBeenCalled();
    expect(mocks.transactionClient.assignment.findFirst).not.toHaveBeenCalled();
    expect(
      mocks.transactionClient.assignment.findUnique,
    ).not.toHaveBeenCalled();
    expect(
      mocks.transactionClient.subjectManagementActivity.findUnique,
    ).not.toHaveBeenCalled();
    expect(
      mocks.transactionClient.subjectManagementActivity.findFirst,
    ).not.toHaveBeenCalled();
  });

  it.each([
    {
      scenario: 'record organization unit is missing',
      recordOrganizationId: null,
      requestActor: actor,
    },
    {
      scenario: 'actor and record organization units differ',
      recordOrganizationId: record.assignedOrganizationId,
      requestActor: { ...actor, organizationUnitId: 'unit-b' },
    },
  ])(
    'rejects before Assignment or activity lookup when $scenario',
    async ({ recordOrganizationId, requestActor }) => {
      mocks.transactionClient.subjectManagementRecord.findUnique.mockImplementation(
        async () => {
          callOrder.push('record-access');
          return {
            ...recordAccess,
            assignedOrganizationId: recordOrganizationId,
          };
        },
      );

      await expect(recordActivity(input, requestActor)).rejects.toThrow(
        'FORBIDDEN',
      );

      expect(callOrder).toEqual(['record-access']);
      expect(
        mocks.transactionClient.subjectManagementRecord.findUnique,
      ).toHaveBeenCalledTimes(1);
      expect(
        mocks.transactionClient.subjectManagementRecord.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: input.recordId },
        select: { id: true, assignedOrganizationId: true },
      });
      expect(
        mocks.transactionClient.assignment.findFirst,
      ).not.toHaveBeenCalled();
      expect(
        mocks.transactionClient.assignment.findUnique,
      ).not.toHaveBeenCalled();
      expect(
        mocks.transactionClient.subjectManagementActivity.findUnique,
      ).not.toHaveBeenCalled();
      expect(
        mocks.transactionClient.subjectManagementActivity.findFirst,
      ).not.toHaveBeenCalled();
    },
  );

  it('returns an authorized replay after checking the record Assignment', async () => {
    await expect(recordActivity(input, actor)).resolves.toBe(replayedActivity);

    expect(callOrder).toEqual([
      'record-access',
      'assignment',
      'metadata',
      'audit',
      'payload',
    ]);
    expect(
      mocks.transactionClient.subjectManagementActivity.findUnique,
    ).toHaveBeenCalledWith({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, recordId: true },
    });
    expect(
      mocks.transactionClient.subjectManagementActivity.findFirst,
    ).toHaveBeenCalledWith({
      where: { id: replayedActivity.id, recordId: record.id },
    });
    expect(
      mocks.transactionClient.subjectManagementActivity.create,
    ).not.toHaveBeenCalled();
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenNthCalledWith(1, {
      where: { id: input.recordId },
      select: { id: true, assignedOrganizationId: true },
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      {
        actor,
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_activity.idempotency_replayed',
        metadata: { activityId: replayedActivity.id },
      },
      mocks.transactionClient,
    );
    expect(JSON.stringify(mocks.recordAudit.mock.calls[0])).not.toContain(
      replayedActivity.content,
    );
  });

  it('resolves an active Assignment server-side when the optional id is omitted', async () => {
    await expect(
      recordActivity({ ...input, assignmentId: undefined }, actor),
    ).resolves.toBe(replayedActivity);

    expect(callOrder).toEqual([
      'record-access',
      'assignment',
      'metadata',
      'audit',
      'payload',
    ]);
    expect(mocks.transactionClient.assignment.findFirst).toHaveBeenCalledWith({
      where: {
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        task: 'resident_followup',
        assigneeUserId: actor.id,
        status: 'active',
        organizationId: record.assignedOrganizationId,
      },
      select: {
        id: true,
        assigneeUserId: true,
        task: true,
        resourceType: true,
        resourceId: true,
        status: true,
        organizationId: true,
      },
    });
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1);
  });

  it('does not replay an activity from a different authorized record', async () => {
    replayMetadata = { id: replayedActivity.id, recordId: 'record-2' };
    activityToReplay = {
      ...replayedActivity,
      recordId: 'record-2',
      content: 'foreign sensitive payload',
    };

    await expect(recordActivity(input, actor)).rejects.toThrow('FORBIDDEN');

    expect(callOrder).toEqual(['record-access', 'assignment', 'metadata']);
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenNthCalledWith(1, {
      where: { id: input.recordId },
      select: { id: true, assignedOrganizationId: true },
    });
    expect(
      mocks.transactionClient.subjectManagementActivity.findUnique,
    ).toHaveBeenCalledWith({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, recordId: true },
    });
    expect(
      mocks.transactionClient.subjectManagementActivity.findFirst,
    ).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it('fails closed if the scoped activity disappears after audit', async () => {
    activityToReplay = null;

    await expect(recordActivity(input, actor)).rejects.toThrow('FORBIDDEN');

    expect(callOrder).toEqual([
      'record-access',
      'assignment',
      'metadata',
      'audit',
      'payload',
    ]);
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1);
  });

  it('loads activity state only after authorizing a new activity', async () => {
    const createdActivity = { id: 'activity-new', recordId: record.id };
    mocks.transactionClient.subjectManagementActivity.create.mockImplementation(
      async () => {
        callOrder.push('create');
        return createdActivity;
      },
    );

    await expect(
      recordActivity(
        { ...input, activityType: 'visit', idempotencyKey: undefined },
        actor,
      ),
    ).resolves.toBe(createdActivity);

    expect(callOrder).toEqual([
      'record-access',
      'assignment',
      'record-state',
      'create',
      'aggregate-version',
      'event',
      'audit',
    ]);
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenNthCalledWith(1, {
      where: { id: input.recordId },
      select: { id: true, assignedOrganizationId: true },
    });
    expect(
      mocks.transactionClient.subjectManagementRecord.findUnique,
    ).toHaveBeenNthCalledWith(2, {
      where: { id: input.recordId },
      select: { id: true, status: true, purpose: true, version: true },
    });
  });
});
