import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  assertAccess,
  canAccess,
  createAssignments,
  revokeAssignment,
  type IdentityUser,
} from '@/modules/identity';
import {
  approveIncident,
  assignIncident,
  classifyIncident,
  closeIncident,
  getIncident,
  registerIntakeReport,
  rejectIncidentApproval,
  resolveIncident,
  startVerification,
  transferIncident,
} from '@/modules/incidents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = `t03-org-${stamp}`;
const UPPER = `t03-upper-${stamp}`;

function userRef(
  id: string,
  roles: IdentityUser['roles'],
  organizationUnitId: string,
): IdentityUser {
  return { id, email: `${id}@civicos.local`, name: id, organizationUnitId, roles };
}

const duty = userRef(`t03-duty-${stamp}`, ['duty_officer'], ORG);
const commander = userRef(`t03-commander-${stamp}`, ['commander'], ORG);
const field = userRef(`t03-field-${stamp}`, ['field_officer'], ORG);
const office = userRef(`t03-office-${stamp}`, ['office_officer'], ORG);
const village = userRef(`t03-village-${stamp}`, ['village_officer'], ORG);
const sysop = userRef(`t03-sysop-${stamp}`, ['system_operator'], ORG);
const unassigned = userRef(`t03-unassigned-${stamp}`, ['field_officer'], ORG);
const superiorOfficer = userRef(
  `t03-superior-${stamp}`,
  ['superior_officer'],
  UPPER,
);
const superiorCommander = userRef(
  `t03-superior-commander-${stamp}`,
  ['superior_commander'],
  UPPER,
);
const crossCommander = userRef(`t03-cross-${stamp}`, ['commander'], UPPER);
const dbUsers = [
  duty,
  commander,
  field,
  office,
  village,
  sysop,
  unassigned,
  superiorOfficer,
  superiorCommander,
  crossCommander,
];

const intakeInput = (tag: string) => ({
  channel: 'in_person' as const,
  receivedAt: new Date().toISOString(),
  content: `T03 matrix probe ${tag} ${stamp}`,
  idempotencyKey: `t03:${stamp}:${tag}:${randomUUID()}`,
});

const trackedIncidents: string[] = [];
const trackedReports: string[] = [];

async function registerProbe(actor: IdentityUser, tag: string) {
  const registered = await registerIntakeReport(intakeInput(tag), actor);
  trackedIncidents.push(registered.incidentId);
  trackedReports.push(registered.reportId);
  return registered;
}

async function assignTask(incidentId: string, assignee: IdentityUser) {
  const { assignments } = await assignIncident(incidentId, commander, [
    assignee.id,
  ]);
  return assignments;
}

describe.skipIf(!postgresEnabled)('Ticket 03 incident authorization matrix', () => {
  beforeAll(async () => {
    await prisma.organizationUnit.createMany({
      data: [
        { id: ORG, name: 'T03 unit', level: 'commune', parentId: UPPER },
        { id: UPPER, name: 'T03 upper unit', level: 'district' },
      ],
    });
    for (const roleName of [
      'commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
      'superior_commander',
      'system_operator',
    ]) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }
    for (const user of dbUsers) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: `t03-hash-${stamp}`,
          organizationUnitId: user.organizationUnitId,
        },
      });
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: user.roles[0] },
      });
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }
  });

  afterAll(async () => {
    const audits = await prisma.auditEvent.findMany({
      where: {
        OR: [
          ...trackedIncidents.map((resourceId) => ({
            resourceType: 'Incident',
            resourceId,
          })),
          ...trackedReports.map((resourceId) => ({
            resourceType: 'IntakeReport',
            resourceId,
          })),
        ],
      },
      select: { id: true },
    });
    const auditIds = audits.map(({ id }) => id);
    const events = await prisma.eventRecord.findMany({
      where: {
        OR: [
          ...trackedIncidents.map((aggregateId) => ({
            aggregateType: 'Incident',
            aggregateId,
          })),
          ...trackedReports.map((aggregateId) => ({
            aggregateType: 'IntakeReport',
            aggregateId,
          })),
          ...(auditIds.length
            ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
            : []),
        ],
      },
      select: { eventId: true },
    });
    const eventIds = events.map(({ eventId }) => eventId);
    if (eventIds.length) {
      await prisma.outboxMessage.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventRecord.deleteMany({
        where: { eventId: { in: eventIds } },
      });
    }
    if (auditIds.length) {
      await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
    }
    await prisma.assignment.deleteMany({
      where: { resourceId: { in: trackedIncidents } },
    });
    await prisma.approval.deleteMany({
      where: { resourceId: { in: trackedIncidents } },
    });
    await prisma.slaInstance.deleteMany({
      where: { resourceId: { in: trackedIncidents } },
    });
    await prisma.projectionRecord.deleteMany({
      where: { aggregateId: { in: trackedIncidents } },
    });
    if (trackedIncidents.length) {
      await prisma.incident.deleteMany({
        where: { id: { in: trackedIncidents } },
      });
    }
    if (trackedReports.length) {
      await prisma.intakeReport.deleteMany({
        where: { id: { in: trackedReports } },
      });
    }
    await prisma.session.deleteMany({
      where: { userId: { in: dbUsers.map(({ id }) => id) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: dbUsers.map(({ id }) => id) } },
    });
    await prisma.organizationUnit.deleteMany({
      where: { id: { in: [ORG, UPPER] } },
    });
    trackedIncidents.length = 0;
    trackedReports.length = 0;
  });

  it('lets only duty officers create IntakeReport entries', async () => {
    const { incidentId } = await registerProbe(duty, 'intake-duty');
    expect(incidentId).toBeTruthy();
    for (const actor of [commander, field, office, village, sysop]) {
      await expect(registerProbe(actor, `intake-denied-${actor.id}`)).rejects.toThrow(
        'FORBIDDEN',
      );
    }
    expect(trackedIncidents).toHaveLength(1);
  });

  it('requires an active compatible assignment for classification', async () => {
    const { incidentId } = await registerProbe(duty, 'classify');
    await expect(
      classifyIncident(incidentId, duty, 'public_order', 'high'),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      classifyIncident(incidentId, crossCommander, 'public_order', 'high'),
    ).rejects.toThrow('FORBIDDEN');
    const assignments = await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    await revokeAssignment(assignments[0].id, commander, 'T03 done.');
    await expect(startVerification(incidentId, duty)).rejects.toThrow(
      'FORBIDDEN',
    );
    const retry = await registerProbe(duty, 'classify-revoked');
    await expect(
      classifyIncident(retry.incidentId, duty, 'public_order', 'high'),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('lets only assigned field officers verify with a compatible task', async () => {
    const { incidentId } = await registerProbe(duty, 'verify');
    const dutyAssignments = await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    await expect(startVerification(incidentId, unassigned)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      createAssignments(
        {
          resourceType: 'Incident',
          resourceId: incidentId,
          task: 'inspection_fieldwork',
          assigneeUserIds: [unassigned.id],
          organizationId: ORG,
        },
        commander,
      ),
    ).resolves.toBeTruthy();
    const fieldAssignments = await assignTask(incidentId, field);
    await startVerification(incidentId, field, 'field verifies');
    await revokeAssignment(fieldAssignments[0].id, commander, 'T03 done.');
    await expect(
      startVerification(incidentId, field, 'after revoke'),
    ).rejects.toThrow();
    void dutyAssignments;
  });

  it('keeps commander assignment management inside the same unit', async () => {
    const { incidentId } = await registerProbe(duty, 'assign');
    await expect(assignIncident(incidentId, field, [field.id])).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      assignIncident(incidentId, crossCommander, [field.id]),
    ).rejects.toThrow('FORBIDDEN');
    const { assignments } = await assignIncident(incidentId, commander, [
      field.id,
    ]);
    expect(assignments).toHaveLength(1);
    await expect(
      assignIncident(incidentId, commander, [superiorOfficer.id]),
    ).rejects.toThrow();
  });

  it('holds approval requests pending and rejects self-approval', async () => {
    const { incidentId } = await registerProbe(duty, 'approval');
    const dutyAssignments = await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    const fieldAssignments = await assignTask(incidentId, field);
    await startVerification(incidentId, field);
    const requested = await transferIncident(incidentId, field, UPPER);
    expect(requested.approval.status).toBe('pending');
    const stored = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    expect(stored.status).toBe('verifying');
    await expect(
      approveIncident(incidentId, requested.approval.id, field),
    ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
    await expect(
      rejectIncidentApproval(incidentId, requested.approval.id, field, 'No.'),
    ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
    const stillPending = await prisma.approval.findUniqueOrThrow({
      where: { id: requested.approval.id },
    });
    expect(stillPending.status).toBe('pending');
    await assignTask(incidentId, commander);
    const commanderRequested = await resolveIncident(
      incidentId,
      commander,
      'Commander resolution.',
    );
    expect(commanderRequested.approval.status).toBe('pending');
    await expect(
      approveIncident(incidentId, commanderRequested.approval.id, commander),
    ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
    await expect(
      rejectIncidentApproval(
        incidentId,
        commanderRequested.approval.id,
        commander,
        'No.',
      ),
    ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
    void dutyAssignments;
    void fieldAssignments;
  });

  it('hands transferred incidents to the superior unit scope', async () => {
    const { incidentId } = await registerProbe(duty, 'handoff');
    await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    await assignTask(incidentId, field);
    await startVerification(incidentId, field);
    await expect(transferIncident(incidentId, field, '')).rejects.toThrow(
      'ORGANIZATION_REQUIRED',
    );
    await expect(
      transferIncident(incidentId, field, 'unit-no-such-unit'),
    ).rejects.toThrow('RECEIVING_ORGANIZATION_INVALID');
    const requested = await transferIncident(incidentId, field, UPPER);
    await expect(
      approveIncident(incidentId, requested.approval.id, crossCommander),
    ).rejects.toThrow('FORBIDDEN');
    const decided = await approveIncident(
      incidentId,
      requested.approval.id,
      superiorCommander,
    );
    expect(decided.incident.status).toBe('transferred');
    await expect(getIncident(incidentId, superiorOfficer)).resolves.toMatchObject(
      {
        incident: expect.objectContaining({ id: incidentId }),
      },
    );
    await expect(getIncident(incidentId, unassigned)).rejects.toThrow(
      'FORBIDDEN',
    );
  });

  it('gates sensitive reads on resource and organization authorization', async () => {
    const { incidentId } = await registerProbe(duty, 'sensitive');
    await assignTask(incidentId, field);
    await expect(
      canAccess(field, { resourceType: 'Incident', resourceId: incidentId }, 'read'),
    ).resolves.toBe(true);
    await expect(
      canAccess(
        field,
        { resourceType: 'Incident', resourceId: incidentId },
        'read_sensitive',
      ),
    ).resolves.toBe(true);
    await expect(
      canAccess(
        unassigned,
        { resourceType: 'Incident', resourceId: incidentId },
        'read_sensitive',
      ),
    ).resolves.toBe(false);
    await expect(
      canAccess(
        sysop,
        { resourceType: 'Incident', resourceId: incidentId },
        'read_sensitive',
      ),
    ).resolves.toBe(false);
    await expect(
      canAccess(
        crossCommander,
        { resourceType: 'Incident', resourceId: incidentId },
        'read_sensitive',
      ),
    ).resolves.toBe(false);
    await expect(
      assertAccess(
        unassigned,
        { resourceType: 'Incident', resourceId: incidentId },
        'read_sensitive',
      ),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('discloses informant identity only through the authorized detail', async () => {
    const registered = await registerIntakeReport(
      {
        ...intakeInput('informant'),
        sourceName: 'Nguyen Van Mat T03',
        sourceContact: '0900000001',
        sensitiveRef: 'REF-T03-MAT',
      },
      duty,
    );
    trackedIncidents.push(registered.incidentId);
    trackedReports.push(registered.reportId);
    await assignTask(registered.incidentId, field);
    const detail = await getIncident(registered.incidentId, field);
    expect(detail.informant).toMatchObject({
      name: 'Nguyen Van Mat T03',
      contact: '0900000001',
    });
    await expect(
      getIncident(registered.incidentId, unassigned),
    ).rejects.toThrow('FORBIDDEN');
    await expect(getIncident(registered.incidentId, sysop)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      prisma.auditEvent.count({
        where: {
          resourceType: 'Incident',
          resourceId: registered.incidentId,
          operation: 'incident.sensitive_read',
        },
      }),
    ).resolves.toBeGreaterThan(0);
    const events = await prisma.eventRecord.findMany({
      where: {
        OR: [
          { aggregateType: 'Incident', aggregateId: registered.incidentId },
          { aggregateType: 'IntakeReport', aggregateId: registered.reportId },
        ],
      },
    });
    const dumped = JSON.stringify(events);
    expect(dumped).not.toContain('Nguyen Van Mat T03');
    expect(dumped).not.toContain('0900000001');
    expect(dumped).not.toContain('REF-T03-MAT');
  });

  it('denies commander field verification even with an active assignment', async () => {
    const { incidentId } = await registerProbe(duty, 'commander-verify');
    await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    await assignIncident(incidentId, commander, [commander.id]);
    const eventsBefore = await prisma.eventRecord.count({
      where: { aggregateType: 'Incident', aggregateId: incidentId },
    });
    const auditsBefore = await prisma.auditEvent.count({
      where: { resourceType: 'Incident', resourceId: incidentId },
    });
    await expect(
      startVerification(incidentId, commander, 'commander verifies'),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      prisma.eventRecord.count({
        where: { aggregateType: 'Incident', aggregateId: incidentId },
      }),
    ).resolves.toBe(eventsBefore);
    await expect(
      prisma.auditEvent.count({
        where: { resourceType: 'Incident', resourceId: incidentId },
      }),
    ).resolves.toBe(auditsBefore);
    const stored = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    expect(stored.status).toBe('classified');
  });

  it('denies cross-unit, revoked, and invalid-task access without domain events', async () => {
    const { incidentId } = await registerProbe(duty, 'denied-events');
    const eventsBefore = await prisma.eventRecord.count({
      where: { aggregateType: 'Incident', aggregateId: incidentId },
    });
    await expect(getIncident(incidentId, crossCommander)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      classifyIncident(incidentId, crossCommander, 'public_order', 'high'),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      createAssignments(
        {
          resourceType: 'Incident',
          resourceId: incidentId,
          task: 'unknown_task',
          assigneeUserIds: [field.id],
          organizationId: ORG,
        },
        commander,
      ),
    ).rejects.toThrow('INCOMPATIBLE_TASK');
    const eventsAfter = await prisma.eventRecord.count({
      where: { aggregateType: 'Incident', aggregateId: incidentId },
    });
    expect(eventsAfter).toBe(eventsBefore);
  });

  it('records audit events for intake, classification, assignment, approval, and reads', async () => {
    const { incidentId, reportId } = await registerProbe(duty, 'audit');
    await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    await assignTask(incidentId, field);
    await startVerification(incidentId, field);
    await transferIncident(incidentId, field, UPPER);
    await getIncident(incidentId, commander);
    for (const operation of [
      'incident.classified',
      'incident.assigned',
      'incident.mutated',
      'incident.transfer_approval_requested',
      'incident.read',
    ]) {
      await expect(
        prisma.auditEvent.count({
          where: { resourceType: 'Incident', resourceId: incidentId, operation },
        }),
      ).resolves.toBeGreaterThan(0);
    }
    await expect(
      prisma.auditEvent.count({
        where: {
          resourceType: 'IntakeReport',
          resourceId: reportId,
          operation: 'intake.created',
        },
      }),
    ).resolves.toBeGreaterThan(0);
  });

  it('closes the loop with resolve and close approvals by another commander', async () => {
    const { incidentId } = await registerProbe(duty, 'close-loop');
    await assignTask(incidentId, duty);
    await classifyIncident(incidentId, duty, 'public_order', 'high');
    await assignTask(incidentId, field);
    await startVerification(incidentId, field);
    const resolution = await resolveIncident(
      incidentId,
      field,
      'Da hoan tat xac minh.',
    );
    expect(resolution.approval.status).toBe('pending');
    const resolved = await approveIncident(
      incidentId,
      resolution.approval.id,
      commander,
    );
    expect(resolved.incident.status).toBe('resolved');
    const closure = await closeIncident(incidentId, field);
    const closed = await approveIncident(
      incidentId,
      closure.approval.id,
      commander,
    );
    expect(closed.incident.status).toBe('closed');
  });
});
