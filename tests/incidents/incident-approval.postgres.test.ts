import { randomUUID } from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { prisma } from '@/lib/prisma';
import { processOutboxUntilIdle } from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  approveIncident,
  assignIncident,
  closeIncident,
  classifyIncident,
  convertIntakeToIncident,
  getIncident,
  registerIntakeReport,
  resolveIncident,
  startVerification,
  transferIncident,
  verifyIntakeReport,
  confirmIntakeReport,
} from '@/modules/incidents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

const stamp = randomUUID().slice(0, 8);
const ORG = `approval-org-${stamp}`;
const UPPER = `approval-upper-${stamp}`;

function testUser(
  id: string,
  roles: IdentityUser['roles'],
  organizationUnitId: string,
): IdentityUser {
  return {
    id,
    email: `${id}@civicos.local`,
    name: id,
    roles,
    organizationUnitId,
  };
}

/** Duty creates intake, field verifies, commander assigns and decides approvals. */
const duty = testUser(`approval-duty-${stamp}`, ['duty_officer'], ORG);
const field = testUser(`approval-field-${stamp}`, ['field_officer'], ORG);
const commander = testUser(`approval-commander-${stamp}`, ['commander'], ORG);
const crossCommander = testUser(
  `approval-cross-${stamp}`,
  ['commander'],
  UPPER,
);
const seededUsers = [duty, field, commander];

let intakeReportId: string | undefined;
let incidentId: string | undefined;
const createdRoleIds: string[] = [];
type Checkpoint = {
  name: string;
  updatedAt: Date;
  lastRecordedAt: Date | null;
  processedEventIds: unknown;
};
let checkpointBaseline: Checkpoint[] | undefined;
let dispatchedEvents: Array<{ eventId: string; recordedAt: Date }> = [];

async function seedTestUsers(): Promise<void> {
  await prisma.organizationUnit.upsert({
    where: { id: UPPER },
    update: {},
    create: { id: UPPER, name: 'Approval upper unit', level: 'district' },
  });
  await prisma.organizationUnit.upsert({
    where: { id: ORG },
    update: {},
    create: {
      id: ORG,
      name: 'Approval test unit',
      level: 'commune',
      parentId: UPPER,
    },
  });
  for (const roleName of ['commander', 'duty_officer', 'field_officer']) {
    const existing = await prisma.role.findUnique({
      where: { name: roleName },
    });
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    if (!existing)
      createdRoleIds.push(
        (await prisma.role.findUniqueOrThrow({ where: { name: roleName } })).id,
      );
  }
  for (const user of seededUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        passwordHash: 'approval-test-hash',
        organizationUnitId: user.organizationUnitId,
        active: true,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: 'approval-test-hash',
        organizationUnitId: user.organizationUnitId,
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: user.roles[0] },
    });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
  }
}

async function cleanupIncident(): Promise<void> {
  if (!intakeReportId && !incidentId) return;
  const currentReportId = intakeReportId;
  const currentIncidentId = incidentId;
  intakeReportId = undefined;
  incidentId = undefined;
  const resourceIds = [currentReportId, currentIncidentId].filter(
    (id): id is string => Boolean(id),
  );
  const [audits, slas, assignments] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        OR: [
          ...(resourceIds.length
            ? [
                {
                  resourceType: { in: ['Incident', 'IntakeReport'] },
                  resourceId: { in: resourceIds },
                },
              ]
            : []),
          { actorId: { in: seededUsers.map(({ id }) => id) } },
        ],
      },
      select: { id: true },
    }),
    prisma.slaInstance.findMany({
      where: { resourceId: { in: resourceIds } },
      select: { id: true },
    }),
    currentIncidentId
      ? prisma.assignment.findMany({
          where: { resourceType: 'Incident', resourceId: currentIncidentId },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);
  const eventRecords = await prisma.eventRecord.findMany({
    where: {
      OR: [
        ...(currentIncidentId
          ? [{ aggregateType: 'Incident', aggregateId: currentIncidentId }]
          : []),
        ...(currentReportId
          ? [{ aggregateType: 'IntakeReport', aggregateId: currentReportId }]
          : []),
        { actorId: { in: seededUsers.map(({ id }) => id) } },
        ...(assignments.length
          ? [
              {
                aggregateType: 'Assignment',
                aggregateId: { in: assignments.map(({ id }) => id) },
              },
            ]
          : []),
        {
          aggregateType: 'AuditEvent',
          aggregateId: { in: audits.map(({ id }) => id) },
        },
        {
          aggregateType: 'SlaInstance',
          aggregateId: { in: slas.map(({ id }) => id) },
        },
      ],
    },
    select: { eventId: true, aggregateType: true, aggregateId: true },
  });
  await prisma.outboxMessage.deleteMany({
    where: { eventId: { in: eventRecords.map(({ eventId }) => eventId) } },
  });
  await prisma.eventRecord.deleteMany({
    where: {
      eventId: { in: eventRecords.map(({ eventId }) => eventId) },
    },
  });
  await prisma.projectionRecord.deleteMany({
    where: {
      OR: eventRecords.map(({ aggregateType, aggregateId }) => ({
        aggregateType,
        aggregateId,
      })),
    },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        ...seededUsers.map(({ id }) => ({ userId: id })),
        ...(resourceIds.length ? [{ resourceId: { in: resourceIds } }] : []),
        ...(eventRecords.length
          ? [
              {
                sourceEventId: {
                  in: eventRecords.map(({ eventId }) => eventId),
                },
              },
            ]
          : []),
      ],
    },
  });
  if (currentIncidentId)
    await prisma.approval.deleteMany({
      where: { resourceType: 'Incident', resourceId: currentIncidentId },
    });
  await prisma.assignment.deleteMany({
    where: { id: { in: assignments.map(({ id }) => id) } },
  });
  await prisma.auditEvent.deleteMany({
    where: { id: { in: audits.map(({ id }) => id) } },
  });
  await prisma.slaInstance.deleteMany({
    where: { id: { in: slas.map(({ id }) => id) } },
  });
  if (currentIncidentId)
    await prisma.incident.deleteMany({ where: { id: currentIncidentId } });
  if (currentReportId)
    await prisma.intakeReport.deleteMany({ where: { id: currentReportId } });
}

async function processIncidentOutbox(registered: {
  reportId: string;
  incidentId: string;
}): Promise<void> {
  const eventRecords = await prisma.eventRecord.findMany({
    where: { aggregateType: 'Incident', aggregateId: registered.incidentId },
    select: { eventId: true, recordedAt: true },
    orderBy: [{ recordedAt: 'asc' }, { eventId: 'asc' }],
  });
  for (const { eventId } of eventRecords) {
    const count = await processOutboxUntilIdle({ eventId });
    if (count > 0)
      dispatchedEvents.push(
        eventRecords.find((event) => event.eventId === eventId)!,
      );
  }
}

async function restoreCheckpoints(): Promise<void> {
  if (!checkpointBaseline) return;
  const ids = new Set(dispatchedEvents.map(({ eventId }) => eventId));
  const baselineByName = new Map(
    checkpointBaseline.map((row) => [row.name, row]),
  );
  const current = await prisma.projectionCheckpoint.findMany();
  if (
    current.length < checkpointBaseline.length ||
    checkpointBaseline.some(
      (row) => !current.some((candidate) => candidate.name === row.name),
    )
  )
    throw new Error('Missing baseline checkpoint');
  for (const row of current) {
    const baseline = baselineByName.get(row.name);
    const before = Array.isArray(baseline?.processedEventIds)
      ? baseline.processedEventIds
      : [];
    const now = Array.isArray(row.processedEventIds)
      ? row.processedEventIds
      : [];
    const filteredBefore = before.filter(
      (id): id is string => typeof id === 'string',
    );
    const prefix = now.slice(0, filteredBefore.length);
    const appended = now.slice(filteredBefore.length);
    const baselineUnchanged =
      JSON.stringify(row.processedEventIds) ===
      JSON.stringify(baseline?.processedEventIds);
    if (
      prefix.length !== filteredBefore.length ||
      prefix.some((id, i) => id !== filteredBefore[i]) ||
      appended.some((id) => typeof id !== 'string' || !ids.has(id)) ||
      now.length !== filteredBefore.length + appended.length
    )
      throw new Error(`Unexpected checkpoint drift: ${row.name}`);
    const owned = dispatchedEvents.filter(({ eventId }) =>
      appended.includes(eventId),
    );
    if (owned.length !== appended.length)
      throw new Error(`Unowned checkpoint events: ${row.name}`);
    if (
      baseline &&
      appended.length === 0 &&
      (!baselineUnchanged ||
        row.lastRecordedAt?.getTime() !== baseline.lastRecordedAt?.getTime() ||
        row.updatedAt.getTime() !== baseline.updatedAt.getTime())
    )
      throw new Error(`Unexpected checkpoint drift: ${row.name}`);
    const expectedLast =
      [
        ...owned.map(({ recordedAt }) => recordedAt),
        ...(baseline?.lastRecordedAt ? [baseline.lastRecordedAt] : []),
      ].sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    if (row.lastRecordedAt?.getTime() !== expectedLast?.getTime())
      throw new Error(`Unexpected checkpoint timestamp: ${row.name}`);
    const changed =
      !baseline ||
      !baselineUnchanged ||
      row.lastRecordedAt?.getTime() !== baseline.lastRecordedAt?.getTime();
    if (baseline && changed && row.updatedAt < baseline.updatedAt)
      throw new Error(`Unexpected checkpoint updatedAt: ${row.name}`);
    if (
      baseline &&
      !changed &&
      row.updatedAt.getTime() !== baseline.updatedAt.getTime()
    )
      throw new Error(`Unexpected checkpoint updatedAt: ${row.name}`);
    if (
      !baseline &&
      (appended.length === 0 ||
        !appended.some((id) => typeof id === 'string' && ids.has(id)))
    )
      throw new Error(`Unowned new checkpoint: ${row.name}`);
  }
  const changedNames = current.filter(
    (row) =>
      !baselineByName.has(row.name) ||
      JSON.stringify(row.processedEventIds) !==
        JSON.stringify(baselineByName.get(row.name)?.processedEventIds) ||
      row.lastRecordedAt?.getTime() !==
        baselineByName.get(row.name)?.lastRecordedAt?.getTime() ||
      row.updatedAt.getTime() !==
        baselineByName.get(row.name)?.updatedAt.getTime(),
  );
  for (const row of changedNames) {
    const baseline = baselineByName.get(row.name);
    if (baseline)
      await prisma.projectionCheckpoint.update({
        where: { name: row.name },
        data: {
          lastRecordedAt: baseline.lastRecordedAt,
          processedEventIds: baseline.processedEventIds as never,
          updatedAt: baseline.updatedAt,
        },
      });
    else {
      const now = Array.isArray(row.processedEventIds)
        ? row.processedEventIds
        : [];
      if (!now.some((id) => typeof id === 'string' && ids.has(id)))
        throw new Error(`Refusing to delete unowned checkpoint: ${row.name}`);
      await prisma.projectionCheckpoint.delete({ where: { name: row.name } });
    }
  }
  const restored = await prisma.projectionCheckpoint.findMany();
  if (
    JSON.stringify(
      restored
        .map((r) => [
          r.name,
          r.updatedAt.toISOString(),
          r.lastRecordedAt?.toISOString() ?? null,
          r.processedEventIds,
        ])
        .sort(),
    ) !==
    JSON.stringify(
      checkpointBaseline
        .map((r) => [
          r.name,
          r.updatedAt.toISOString(),
          r.lastRecordedAt?.toISOString() ?? null,
          r.processedEventIds,
        ])
        .sort(),
    )
  )
    throw new Error('Checkpoint baseline restore mismatch');
}

async function registerProbe(tag: string) {
  const registered = await registerIntakeReport(
    {
      sourceChannel: 'direct',
      receivedAt: new Date().toISOString(),
      content: `Approval workflow ${tag}`,
      idempotencyKey: `approval-test:${tag}:${Date.now()}`,
    },
    duty,
  );
  intakeReportId = registered.reportId;
  await verifyIntakeReport(registered.reportId, duty, {
    classification: 'sufficient',
    verificationNote: 'Approval test verification.',
  });
  await confirmIntakeReport(registered.reportId, duty);
  const converted = await convertIntakeToIncident(registered.reportId, duty);
  if (!converted.incidentId) throw new Error('APPROVAL_CONVERT_FAILED');
  incidentId = converted.incidentId;
  return { reportId: registered.reportId, incidentId: converted.incidentId };
}

async function prepareVerifyingIncident(tag: string) {
  const registered = await registerProbe(tag);
  await assignIncident(registered.incidentId, commander, [duty.id]);
  await classifyIncident(registered.incidentId, duty, 'test', 'medium');
  await assignIncident(registered.incidentId, commander, [field.id]);
  await startVerification(registered.incidentId, field, 'ready for review');
  return registered;
}

describe.skipIf(!postgresEnabled)('Incident Approval PostgreSQL seam', () => {
  beforeAll(async () => {
    await seedTestUsers();
  });

  beforeEach(async () => {
    checkpointBaseline = undefined;
    dispatchedEvents = [];
    checkpointBaseline = await prisma.projectionCheckpoint.findMany();
  });

  afterEach(async () => {
    try {
      await cleanupIncident();
    } finally {
      try {
        await restoreCheckpoints();
      } finally {
        checkpointBaseline = undefined;
        dispatchedEvents = [];
      }
    }
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { userId: { in: seededUsers.map(({ id }) => id) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: seededUsers.map(({ id }) => id) } },
    });
    await prisma.role.deleteMany({
      where: { id: { in: createdRoleIds }, users: { none: {} } },
    });
    await prisma.organizationUnit.deleteMany({
      where: { id: { in: [ORG, UPPER] } },
    });
  });

  it(
    'requires and records approval for transfer, resolution, and closure',
    { timeout: 30000 },
    async () => {
      const registered = await prepareVerifyingIncident('full-lifecycle');

      const transfer = await transferIncident(
        registered.incidentId,
        field,
        UPPER,
      );
      expect(transfer.approval.status).toBe('pending');
      expect(transfer.incident.status).toBe('verifying');

      const transferred = await approveIncident(
        registered.incidentId,
        transfer.approval.id,
        commander,
      );
      expect(transferred.incident.status).toBe('transferred');

      const resolution = await resolveIncident(
        registered.incidentId,
        field,
        'Đã hoàn tất xác minh.',
      );
      const resolved = await approveIncident(
        registered.incidentId,
        resolution.approval.id,
        commander,
      );
      expect(resolved.incident.status).toBe('resolved');

      const closure = await closeIncident(registered.incidentId, field);
      const closed = await approveIncident(
        registered.incidentId,
        closure.approval.id,
        commander,
      );
      expect(closed.incident.status).toBe('closed');

      const events = await prisma.eventRecord.findMany({
        where: {
          aggregateType: 'Incident',
          aggregateId: registered.incidentId,
        },
        orderBy: { aggregateVersion: 'asc' },
        select: { eventType: true },
      });
      expect(events.map(({ eventType }) => eventType)).toEqual(
        expect.arrayContaining([
          'IncidentTransferRequested',
          'IncidentTransferred',
          'IncidentResolutionRequested',
          'IncidentResolved',
          'IncidentClosureRequested',
          'IncidentClosed',
        ]),
      );

      await processIncidentOutbox(registered);
      const detail = await getIncident(registered.incidentId, commander);
      expect(detail.incident).toMatchObject({
        id: registered.incidentId,
        status: 'closed',
        description: 'Approval workflow full-lifecycle',
      });
      await expect(
        getIncident(registered.incidentId, {
          ...commander,
          organizationUnitId: UPPER,
        }),
      ).rejects.toThrow('FORBIDDEN');
    },
  );

  it(
    'returns authoritative detail immediately after close approval',
    { timeout: 30000 },
    async () => {
      const registered = await prepareVerifyingIncident('close-consistency');

      const resolution = await resolveIncident(
        registered.incidentId,
        field,
        'Đã hoàn tất xác minh.',
      );
      await approveIncident(
        registered.incidentId,
        resolution.approval.id,
        commander,
      );
      await processIncidentOutbox(registered);

      const closure = await closeIncident(registered.incidentId, field);
      const closed = await approveIncident(
        registered.incidentId,
        closure.approval.id,
        commander,
      );
      expect(closed.incident.status).toBe('closed');

      const detail = await getIncident(registered.incidentId, commander);
      const eventTypes = detail.events.map((event) => event.eventType);
      expect(eventTypes).toContain('IncidentClosed');
      expect(detail.incident.status).toBe('closed');
      const lastVersion =
        detail.events[detail.events.length - 1]?.aggregateVersion;
      expect(detail.incident.version).toBe(lastVersion);
    },
  );

  it('binds approval decisions to the incident and organization scope', async () => {
    const registered = await prepareVerifyingIncident('decision-scope');
    const transfer = await transferIncident(
      registered.incidentId,
      field,
      UPPER,
    );

    await expect(
      approveIncident('another-incident', transfer.approval.id, commander),
    ).rejects.toThrow('APPROVAL_RESOURCE_MISMATCH');
    await expect(
      approveIncident(registered.incidentId, transfer.approval.id, field),
    ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
    await expect(
      approveIncident(
        registered.incidentId,
        transfer.approval.id,
        crossCommander,
      ),
    ).rejects.toThrow('FORBIDDEN');

    const pending = await prisma.approval.findUnique({
      where: { id: transfer.approval.id },
    });
    expect(pending?.status).toBe('pending');
  });
});
