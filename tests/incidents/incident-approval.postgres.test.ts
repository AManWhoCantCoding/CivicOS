import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

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

const ORG = 'unit-nghia-tru';
const UPPER = 'unit-cap-tren';

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
const duty = testUser('approval-test-duty', ['duty_officer'], ORG);
const field = testUser('approval-test-field', ['field_officer'], ORG);
const commander = testUser('approval-test-commander', ['commander'], ORG);
const crossCommander = testUser('approval-test-cross', ['commander'], UPPER);
const seededUsers = [duty, field, commander];

let intakeReportId: string | undefined;
let incidentId: string | undefined;

async function seedTestUsers(): Promise<void> {
  await prisma.organizationUnit.upsert({
    where: { id: UPPER },
    update: { active: true },
    create: { id: UPPER, name: 'Approval upper unit', level: 'district' },
  });
  await prisma.organizationUnit.upsert({
    where: { id: ORG },
    update: { active: true, parentId: UPPER },
    create: {
      id: ORG,
      name: 'Approval test unit',
      level: 'commune',
      parentId: UPPER,
    },
  });
  for (const roleName of ['commander', 'duty_officer', 'field_officer']) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
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
  if (!intakeReportId || !incidentId) return;
  const currentReportId = intakeReportId;
  const currentIncidentId = incidentId;
  intakeReportId = undefined;
  incidentId = undefined;
  const [audits, slas] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        OR: [
          { resourceType: 'Incident', resourceId: currentIncidentId },
          { resourceType: 'IntakeReport', resourceId: currentReportId },
        ],
      },
      select: { id: true },
    }),
    prisma.slaInstance.findMany({
      where: { resourceType: 'Incident', resourceId: currentIncidentId },
      select: { id: true },
    }),
  ]);
  const eventRecords = await prisma.eventRecord.findMany({
    where: {
      OR: [
        { aggregateType: 'Incident', aggregateId: currentIncidentId },
        { aggregateType: 'IntakeReport', aggregateId: currentReportId },
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
    select: { eventId: true },
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
    where: { aggregateType: 'Incident', aggregateId: currentIncidentId },
  });
  await prisma.approval.deleteMany({
    where: { resourceType: 'Incident', resourceId: currentIncidentId },
  });
  await prisma.assignment.deleteMany({
    where: { resourceType: 'Incident', resourceId: currentIncidentId },
  });
  await prisma.auditEvent.deleteMany({
    where: { id: { in: audits.map(({ id }) => id) } },
  });
  await prisma.slaInstance.deleteMany({
    where: { id: { in: slas.map(({ id }) => id) } },
  });
  await prisma.incident.deleteMany({ where: { id: currentIncidentId } });
  await prisma.intakeReport.deleteMany({ where: { id: currentReportId } });
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
  await verifyIntakeReport(registered.reportId, duty, {
    classification: 'sufficient',
    verificationNote: 'Approval test verification.',
  });
  await confirmIntakeReport(registered.reportId, duty);
  const converted = await convertIntakeToIncident(registered.reportId, duty);
  if (!converted.incidentId) throw new Error('APPROVAL_CONVERT_FAILED');
  intakeReportId = registered.reportId;
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

  afterEach(async () => {
    await cleanupIncident();
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { userId: { in: seededUsers.map(({ id }) => id) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: seededUsers.map(({ id }) => id) } },
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

      await processOutboxUntilIdle();
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
      await processOutboxUntilIdle();

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
