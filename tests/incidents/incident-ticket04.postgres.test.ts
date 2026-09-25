import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import * as incidents from '@/modules/incidents';
import {
  approveIncident,
  assignIncident,
  assertIncidentTransition,
  closeIncident,
  classifyIncident,
  convertIntakeToIncident,
  getIncident,
  isIncidentStatus,
  listIncidents,
  parseIntakeReport,
  rebuildIncidentProjection,
  registerIntakeReport,
  rejectIncidentApproval,
  resolveIncident,
  startVerification,
  transferIncident,
  verifyIntakeReport,
  confirmIntakeReport,
} from '@/modules/incidents';
import { createSla, dueAt, isOverdue, markOverdue } from '@/modules/platform';

const stamp = randomUUID().slice(0, 8);
const ORG = 'unit-nghia-tru';
const UPPER = 'unit-cap-tren';

function userRef(
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

const commander = userRef(`t04-commander-${stamp}`, ['commander'], ORG);
const duty = userRef(`t04-duty-${stamp}`, ['duty_officer'], ORG);
const fieldOfficer = userRef(`t04-field-${stamp}`, ['field_officer'], ORG);
const unassigned = userRef(`t04-unassigned-${stamp}`, ['field_officer'], ORG);
const crossCommander = userRef(`t04-cross-${stamp}`, ['commander'], UPPER);
const seededAssignee: IdentityUser = {
  id: 'dev-field',
  email: 'field@civicos.local',
  name: 'Field workflow fixture',
  roles: ['field_officer'],
  organizationUnitId: ORG,
};

const validIntake = (overrides: Record<string, unknown> = {}) => ({
  channel: 'in_person' as const,
  receivedAt: new Date().toISOString(),
  content: `T04 intake probe ${stamp}`,
  ...overrides,
});

describe('Ticket 04 intake validation seam', () => {
  it('accepts a complete channel/time/content/location/source payload', () => {
    expect(
      parseIntakeReport(
        validIntake({
          sourceName: 'Nguyen Van A',
          sourceContact: '0900000000',
          latitude: 21.0,
          longitude: 106.0,
          sensitiveRef: 'T04-SENSITIVE',
        }),
      ),
    ).toMatchObject({
      channel: 'in_person',
      content: `T04 intake probe ${stamp}`,
      sourceName: 'Nguyen Van A',
      latitude: 21.0,
      longitude: 106.0,
    });
  });

  it('rejects unknown channels, missing content, and half/invalid locations', () => {
    expect(() => parseIntakeReport(validIntake({ channel: 'sms' }))).toThrow(
      'INVALID_CHANNEL',
    );
    expect(() =>
      parseIntakeReport(validIntake({ content: undefined })),
    ).toThrow('INVALID_INTAKE');
    expect(() => parseIntakeReport(validIntake({ latitude: 21.0 }))).toThrow(
      'GEOPOINT_INCOMPLETE',
    );
    expect(() =>
      parseIntakeReport(validIntake({ latitude: 'north', longitude: 106.0 })),
    ).toThrow('INVALID_LOCATION');
  });
});

describe('Ticket 04 incident transition matrix', () => {
  const valid: Record<string, string[]> = {
    received: ['classified'],
    classified: ['verifying'],
    verifying: ['transferred', 'resolved'],
    transferred: ['resolved'],
    resolved: ['closed'],
    closed: [],
  };
  const statuses = Object.keys(valid);

  it('accepts exactly the specified transitions and rejects every other pair', () => {
    for (const current of statuses) {
      for (const next of statuses) {
        if (current === next) continue;
        if (valid[current].includes(next)) {
          expect(() =>
            assertIncidentTransition(current as never, next as never),
          ).not.toThrow();
        } else {
          expect(() =>
            assertIncidentTransition(current as never, next as never),
          ).toThrow('INVALID_INCIDENT_TRANSITION');
        }
      }
    }
    expect(isIncidentStatus('received')).toBe(true);
    expect(isIncidentStatus('bogus')).toBe(false);
  });
});

describe('Ticket 04 public incident module boundary', () => {
  it('exposes only the agreed incident contract without persistence symbols', () => {
    expect(Object.keys(incidents)).toEqual(
      expect.arrayContaining([
        'registerIntakeReport',
        'classifyIncident',
        'assignIncident',
        'startVerification',
        'transferIncident',
        'resolveIncident',
        'closeIncident',
        'approveIncident',
        'rejectIncidentApproval',
        'getIncident',
        'listIncidents',
        'getIncidentReadModel',
        'rebuildIncidentProjection',
        'parseIntakeReport',
        'assertIncidentTransition',
        'isIncidentStatus',
      ]),
    );
    for (const name of Object.keys(incidents)) {
      expect(name).not.toMatch(/prisma/i);
    }
  });

  it('keeps citizen, camera/LPR, and field-update work outside the slice', () => {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const roots = [
      'src/modules/incidents',
      'src/app/api/intake-reports',
      'src/app/api/incidents',
      'src/app/intake',
      'src/app/incidents',
      'src/components/incidents',
    ];
    const violations: string[] = [];
    for (const root of roots) {
      const absolute = path.join(repoRoot, root);
      for (const entry of readdirSync(absolute, { withFileTypes: true })) {
        const candidate = entry.isDirectory()
          ? readdirSync(path.join(absolute, entry.name)).map((file) =>
              path.join(absolute, entry.name, file),
            )
          : [path.join(absolute, entry.name)];
        for (const file of candidate) {
          if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
          const source = readFileSync(file, 'utf8');
          if (
            /citizen|Camera\/LPR|LPR|FieldUpdate|PS-E1-008|PeriodicReport|SuspiciousVehicle/i.test(
              source,
            )
          ) {
            violations.push(path.relative(repoRoot, file));
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('persists through the shared event, assignment, audit, and SLA boundaries', () => {
    const moduleRoot = path.resolve(
      __dirname,
      '..',
      '..',
      'src',
      'modules',
      'incidents',
    );
    const sources = readdirSync(moduleRoot)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(path.join(moduleRoot, file), 'utf8'))
      .join('\n');
    expect(sources).toContain('grantAssignments');
    expect(sources).toContain('recordAudit');
    expect(sources).toContain('createSla');
    expect(sources).toContain('appendEvent');
    expect(sources).toContain('assertAccess');
    expect(sources).not.toContain('prisma.assignment.create');
    expect(sources).not.toContain('slaInstance.create');
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const tracked: Array<{ incidentId: string; reportId: string }> = [];
const trackedAssignmentIds: string[] = [];
const fixtureIds = [
  commander.id,
  duty.id,
  fieldOfficer.id,
  unassigned.id,
  crossCommander.id,
];

async function cleanupTracked(): Promise<void> {
  for (const { incidentId, reportId } of tracked) {
    const [audits, slas] = await Promise.all([
      prisma.auditEvent.findMany({
        where: {
          OR: [
            { resourceType: 'Incident', resourceId: incidentId },
            { resourceType: 'IntakeReport', resourceId: reportId },
          ],
        },
        select: { id: true },
      }),
      prisma.slaInstance.findMany({
        where: { resourceType: 'Incident', resourceId: incidentId },
        select: { id: true },
      }),
    ]);
    const events = await prisma.eventRecord.findMany({
      where: {
        OR: [
          { aggregateType: 'Incident', aggregateId: incidentId },
          { aggregateType: 'IntakeReport', aggregateId: reportId },
          ...(trackedAssignmentIds.length
            ? [
                {
                  aggregateType: 'Assignment',
                  aggregateId: { in: trackedAssignmentIds },
                },
              ]
            : []),
          ...(audits.length
            ? [
                {
                  aggregateType: 'AuditEvent',
                  aggregateId: { in: audits.map(({ id }) => id) },
                },
              ]
            : []),
          ...(slas.length
            ? [
                {
                  aggregateType: 'SlaInstance',
                  aggregateId: { in: slas.map(({ id }) => id) },
                },
              ]
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
    await prisma.projectionRecord.deleteMany({
      where: { aggregateType: 'Incident', aggregateId: incidentId },
    });
    await prisma.approval.deleteMany({
      where: { resourceType: 'Incident', resourceId: incidentId },
    });
    if (audits.length) {
      await prisma.auditEvent.deleteMany({
        where: { id: { in: audits.map(({ id }) => id) } },
      });
    }
    if (slas.length) {
      await prisma.slaInstance.deleteMany({
        where: { id: { in: slas.map(({ id }) => id) } },
      });
    }
    await prisma.assignment.deleteMany({
      where: { resourceType: 'Incident', resourceId: incidentId },
    });
    await prisma.incident.deleteMany({ where: { id: incidentId } });
    await prisma.intakeReport.deleteMany({ where: { id: reportId } });
  }
  await prisma.auditEvent.deleteMany({
    where: {
      resourceType: 'Incident',
      resourceId: '*',
      actorId: { in: fixtureIds },
    },
  });
  tracked.length = 0;
  trackedAssignmentIds.length = 0;
}

async function registerProbe(
  actor: IdentityUser,
  overrides: Record<string, unknown> = {},
) {
  const registered = await registerIntakeReport(
    {
      ...validIntake(),
      idempotencyKey: `t04:${stamp}:${randomUUID()}`,
      ...overrides,
    },
    actor,
  );
  await verifyIntakeReport(registered.reportId, actor, {
    classification: 'sufficient',
    verificationNote: 'T04 probe verification.',
  });
  await confirmIntakeReport(registered.reportId, actor);
  const converted = await convertIntakeToIncident(registered.reportId, actor);
  if (!converted.incidentId) throw new Error('T04_CONVERT_FAILED');
  tracked.push({
    incidentId: converted.incidentId,
    reportId: registered.reportId,
  });
  return { reportId: registered.reportId, incidentId: converted.incidentId };
}

describe.skipIf(!postgresEnabled)('Ticket 04 PostgreSQL seam', () => {
  beforeAll(async () => {
    await prisma.organizationUnit.upsert({
      where: { id: ORG },
      update: {},
      create: { id: ORG, name: 'Ticket 04 unit', level: 'commune' },
    });
    await prisma.organizationUnit.upsert({
      where: { id: UPPER },
      update: {},
      create: { id: UPPER, name: 'Ticket 04 upper unit', level: 'district' },
    });
    const roleNames = ['commander', 'duty_officer', 'field_officer'] as const;
    const roleIds: Record<string, string> = {};
    for (const name of roleNames) {
      const role = await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      roleIds[name] = role.id;
    }
    const seeds = [
      { user: commander, role: 'commander' },
      { user: duty, role: 'duty_officer' },
      { user: fieldOfficer, role: 'field_officer' },
      { user: unassigned, role: 'field_officer' },
      { user: crossCommander, role: 'commander' },
      { user: seededAssignee, role: 'field_officer' },
    ] as const;
    for (const { user, role } of seeds) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: { organizationUnitId: user.organizationUnitId },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationUnitId: user.organizationUnitId,
        },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleIds[role] } },
        update: {},
        create: { userId: user.id, roleId: roleIds[role] },
      });
    }
  });

  afterAll(async () => {
    await cleanupTracked();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            commander.id,
            duty.id,
            fieldOfficer.id,
            unassigned.id,
            crossCommander.id,
          ],
        },
      },
    });
  });

  it('validates channel, time, content, location, and role server-side', async () => {
    await expect(registerProbe(commander, { content: '   ' })).rejects.toThrow(
      'CONTENT_REQUIRED',
    );
    await expect(
      registerProbe(commander, { receivedAt: 'not-a-date' }),
    ).rejects.toThrow('INVALID_RECEIVED_AT');
    await expect(registerProbe(commander, { channel: 'sms' })).rejects.toThrow(
      'INVALID_CHANNEL',
    );
    await expect(registerProbe(commander, { latitude: 21.0 })).rejects.toThrow(
      'GEOPOINT_INCOMPLETE',
    );
    await expect(
      registerProbe(commander, { latitude: 999, longitude: 106.0 }),
    ).rejects.toThrow('INVALID_LATITUDE');
    await expect(registerProbe(fieldOfficer)).rejects.toThrow('FORBIDDEN');
    expect(tracked).toEqual([]);
  });

  it('creates exactly one report and one incident with both events atomically', async () => {
    const { reportId, incidentId } = await registerProbe(commander, {
      sourceName: 'Nguyen Van A',
      sourceContact: '0900000000',
      latitude: 21.01,
      longitude: 106.02,
      sensitiveRef: 'T04-SENSITIVE',
    });

    const [reports, incidents] = await Promise.all([
      prisma.intakeReport.findMany({ where: { id: reportId } }),
      prisma.incident.findMany({ where: { id: incidentId } }),
    ]);
    expect(reports).toHaveLength(1);
    expect(incidents).toHaveLength(1);
    expect(reports[0].incidentId).toBe(incidentId);
    expect(reports[0].status).toBe('PROCESSED');
    expect(incidents[0].intakeReportId).toBe(reportId);
    expect(incidents[0].status).toBe('received');

    const events = await prisma.eventRecord.findMany({
      where: {
        OR: [
          { aggregateType: 'IntakeReport', aggregateId: reportId },
          { aggregateType: 'Incident', aggregateId: incidentId },
        ],
      },
      orderBy: { aggregateVersion: 'asc' },
    });
    expect(
      events
        .filter(({ aggregateType }) => aggregateType === 'IntakeReport')
        .map(({ eventType }) => eventType),
    ).toEqual([
      'IntakeReportReceived',
      'IntakeReportVerified',
      'IntakeReportConvertedToIncident',
    ]);
    expect(
      events
        .filter(({ aggregateType }) => aggregateType === 'Incident')
        .map(({ eventType }) => eventType),
    ).toEqual(['IncidentRegistered']);

    const sla = await prisma.slaInstance.findMany({
      where: { resourceType: 'Incident', resourceId: incidentId },
    });
    expect(sla.map(({ kind }) => kind)).toEqual([
      'incident_classification_24h',
    ]);

    const audit = await prisma.auditEvent.count({
      where: {
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.created',
      },
    });
    expect(audit).toBe(1);
  });

  it('rolls back the convert operation atomically on mid-transaction failure', async () => {
    const sentinel = `T04 rollback sentinel ${stamp}`;
    const created = await registerIntakeReport(
      {
        ...validIntake({ content: sentinel }),
        idempotencyKey: `t04-rollback:${stamp}:${randomUUID()}`,
      },
      commander,
    );
    tracked.push({ incidentId: '', reportId: created.reportId });
    await verifyIntakeReport(created.reportId, commander, {
      classification: 'sufficient',
      verificationNote: 'T04 rollback verification.',
    });
    await prisma.$executeRawUnsafe(
      "CREATE OR REPLACE FUNCTION t04_abort_sentinel() RETURNS trigger AS $$ BEGIN IF NEW.description = '" +
        sentinel +
        "' THEN RAISE EXCEPTION 'T04_INJECTED_FAILURE'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;",
    );
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS t04_abort_incident ON "Incident";',
    );
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER t04_abort_incident BEFORE INSERT ON "Incident" FOR EACH ROW EXECUTE FUNCTION t04_abort_sentinel();',
    );
    try {
      await expect(
        convertIntakeToIncident(created.reportId, commander),
      ).rejects.toThrow('T04_INJECTED_FAILURE');
      await expect(
        prisma.incident.findFirst({ where: { description: sentinel } }),
      ).resolves.toBeNull();
      const report = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: created.reportId },
      });
      expect(report.incidentId).toBeNull();
      expect(report.status).toBe('VERIFIED');
      await expect(
        prisma.eventRecord.count({
          where: {
            aggregateType: 'IntakeReport',
            aggregateId: created.reportId,
            eventType: 'IntakeReportConvertedToIncident',
          },
        }),
      ).resolves.toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS t04_abort_incident ON "Incident";',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS t04_abort_sentinel();',
      );
    }
  });

  it('returns the original result on duplicate idempotency keys', async () => {
    const key = `t04-duplicate:${stamp}`;
    const first = await registerProbe(commander, { idempotencyKey: key });
    const before = await Promise.all([
      prisma.intakeReport.count({ where: { idempotencyKey: key } }),
      prisma.incident.count({ where: { id: first.incidentId } }),
      prisma.eventRecord.count({
        where: { aggregateType: 'Incident', aggregateId: first.incidentId },
      }),
    ]);
    const second = await registerIntakeReport(
      { ...validIntake(), idempotencyKey: key },
      commander,
    );
    expect(second.reportId).toBe(first.reportId);
    expect(second.incidentId).toBe(first.incidentId);
    const after = await Promise.all([
      prisma.intakeReport.count({ where: { idempotencyKey: key } }),
      prisma.incident.count({ where: { id: first.incidentId } }),
      prisma.eventRecord.count({
        where: { aggregateType: 'Incident', aggregateId: first.incidentId },
      }),
    ]);
    expect(after).toEqual(before);
  });

  it('enforces assignment scope on classify and verification', async () => {
    const { incidentId } = await registerProbe(commander);

    await expect(
      classifyIncident(incidentId, duty, 'public_order', 'high'),
    ).rejects.toThrow('FORBIDDEN');
    const { assignments: commanderAssignments } = await assignIncident(
      incidentId,
      commander,
      [commander.id],
    );
    trackedAssignmentIds.push(...commanderAssignments.map(({ id }) => id));
    await classifyIncident(incidentId, commander, 'public_order', 'high');

    await expect(startVerification(incidentId, unassigned)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      assignIncident(incidentId, duty, [seededAssignee.id]),
    ).rejects.toThrow('FORBIDDEN');
    await expect(assignIncident(incidentId, commander, [])).rejects.toThrow(
      'ASSIGNEE_REQUIRED',
    );

    const { assignments } = await assignIncident(incidentId, commander, [
      seededAssignee.id,
    ]);
    trackedAssignmentIds.push(...assignments.map(({ id }) => id));
    await startVerification(incidentId, seededAssignee, 'assignee verifies');

    const incident = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    expect(incident.status).toBe('verifying');
  });

  it('denies unassigned and cross-unit reads and writes', async () => {
    const { incidentId } = await registerProbe(commander);
    const { assignments: commanderAssignments } = await assignIncident(
      incidentId,
      commander,
      [commander.id],
    );
    trackedAssignmentIds.push(...commanderAssignments.map(({ id }) => id));
    await classifyIncident(incidentId, commander, 'residential', 'medium');

    await expect(getIncident(incidentId, unassigned)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(getIncident(incidentId, crossCommander)).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      classifyIncident(incidentId, crossCommander, 'residential', 'medium'),
    ).rejects.toThrow('FORBIDDEN');
    await expect(startVerification(incidentId, crossCommander)).rejects.toThrow(
      'FORBIDDEN',
    );

    await expect(getIncident(incidentId, commander)).resolves.toMatchObject({
      incident: expect.objectContaining({ id: incidentId }),
    });
  });

  it('requires approval for transfer, resolve, and close with full history', async () => {
    const { incidentId } = await registerProbe(commander);
    const { assignments: ownerAssignments } = await assignIncident(
      incidentId,
      commander,
      [commander.id],
    );
    trackedAssignmentIds.push(...ownerAssignments.map(({ id }) => id));
    await classifyIncident(incidentId, commander, 'property', 'low');
    const { assignments } = await assignIncident(incidentId, commander, [
      seededAssignee.id,
    ]);
    trackedAssignmentIds.push(...assignments.map(({ id }) => id));
    await startVerification(incidentId, seededAssignee);

    await expect(
      approveIncident(incidentId, 'missing-approval', fieldOfficer),
    ).rejects.toThrow('FORBIDDEN');
    await expect(resolveIncident(incidentId, commander, '  ')).rejects.toThrow(
      'RESOLUTION_REQUIRED',
    );
    await expect(closeIncident(incidentId, commander)).rejects.toThrow(
      'INVALID_INCIDENT_TRANSITION',
    );

    const transfer = await transferIncident(incidentId, commander, UPPER);
    expect(transfer.approval.status).toBe('pending');
    const stillVerifying = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    expect(stillVerifying.status).toBe('verifying');

    const duplicate = await transferIncident(incidentId, commander, UPPER);
    expect(duplicate.approval.id).toBe(transfer.approval.id);

    await expect(
      rejectIncidentApproval(incidentId, transfer.approval.id, commander, '  '),
    ).rejects.toThrow('REJECTION_REASON_REQUIRED');
    const rejected = await rejectIncidentApproval(
      incidentId,
      transfer.approval.id,
      commander,
      'Chua du can cu chuyen cap.',
    );
    expect(rejected.approval.status).toBe('rejected');
    const afterReject = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    expect(afterReject.status).toBe('verifying');
    await expect(
      approveIncident(incidentId, transfer.approval.id, commander),
    ).rejects.toThrow('APPROVAL_ALREADY_DECIDED');

    const retry = await transferIncident(incidentId, commander, UPPER);
    expect(retry.approval.id).not.toBe(transfer.approval.id);
    const approved = await approveIncident(
      incidentId,
      retry.approval.id,
      commander,
    );
    expect(approved.incident.status).toBe('transferred');
    expect(approved.approval.status).toBe('approved');

    const resolution = await resolveIncident(
      incidentId,
      commander,
      'Da hoan tat xac minh.',
    );
    await approveIncident(incidentId, resolution.approval.id, commander);
    const closure = await closeIncident(incidentId, commander);
    const closed = await approveIncident(
      incidentId,
      closure.approval.id,
      commander,
    );
    expect(closed.incident.status).toBe('closed');

    const approvals = await prisma.approval.findMany({
      where: { resourceType: 'Incident', resourceId: incidentId },
    });
    expect(approvals.map(({ status }) => status).sort()).toEqual([
      'approved',
      'approved',
      'approved',
      'rejected',
    ]);

    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'Incident', aggregateId: incidentId },
      orderBy: { aggregateVersion: 'asc' },
      select: { eventType: true },
    });
    expect(events.map(({ eventType }) => eventType)).toEqual([
      'IncidentRegistered',
      'IncidentAssigned',
      'IncidentClassified',
      'IncidentAssigned',
      'IncidentVerifying',
      'IncidentTransferRequested',
      'IncidentApprovalRejected',
      'IncidentTransferRequested',
      'IncidentTransferred',
      'IncidentResolutionRequested',
      'IncidentResolved',
      'IncidentClosureRequested',
      'IncidentClosed',
    ]);
  });

  it(
    'builds timeline, filters, and redaction only from domain events',
    { timeout: 30000 },
    async () => {
      const { incidentId, reportId } = await registerProbe(commander, {
        content: `T04 timeline ${stamp}`,
        sourceName: 'Nguyen Van A',
        sensitiveRef: 'T04-SENSITIVE',
      });
      const { assignments: timelineAssignments } = await assignIncident(
        incidentId,
        commander,
        [commander.id],
      );
      trackedAssignmentIds.push(...timelineAssignments.map(({ id }) => id));
      await classifyIncident(incidentId, commander, 't04-timeline-cat', 'high');

      const detail = await getIncident(incidentId, commander);
      const versions = detail.events.map(
        ({ aggregateVersion }) => aggregateVersion,
      );
      expect(versions).toEqual([...versions].sort((a, b) => a - b));
      expect(detail.events.map(({ eventType }) => eventType)).toEqual([
        'IncidentRegistered',
        'IncidentAssigned',
        'IncidentClassified',
      ]);

      const rebuilt = await rebuildIncidentProjection();
      expect(rebuilt).toBeGreaterThan(0);

      const open = await listIncidents(commander, { status: 'classified' });
      expect(open.map(({ id }) => id)).toContain(incidentId);
      const closed = await listIncidents(commander, { status: 'closed' });
      expect(closed.map(({ id }) => id)).not.toContain(incidentId);
      const byCategory = await listIncidents(commander, {
        category: 't04-timeline-cat',
      });
      expect(byCategory.map(({ id }) => id)).toContain(incidentId);

      const listed = await listIncidents(commander, { status: 'classified' });
      const match = listed.find(({ id }) => id === incidentId);
      expect(match).toBeDefined();
      expect(match).not.toHaveProperty('sourceName');
      expect(match).not.toHaveProperty('sourceContact');
      expect(match).not.toHaveProperty('sensitiveRef');
      expect(JSON.stringify([match, detail])).not.toContain('Nguyen Van A');
      expect(JSON.stringify([match, detail])).not.toContain('T04-SENSITIVE');

      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.sourceName).not.toContain('Nguyen Van A');
    },
  );

  it('records audit for sensitive reads and every mutation', async () => {
    const { incidentId, reportId } = await registerProbe(commander);
    const { assignments: auditAssignments } = await assignIncident(
      incidentId,
      commander,
      [commander.id],
    );
    trackedAssignmentIds.push(...auditAssignments.map(({ id }) => id));
    await classifyIncident(incidentId, commander, 'violence', 'critical');
    const { assignments } = await assignIncident(incidentId, commander, [
      seededAssignee.id,
    ]);
    trackedAssignmentIds.push(...assignments.map(({ id }) => id));
    await startVerification(incidentId, seededAssignee);
    await transferIncident(incidentId, commander, UPPER);
    await getIncident(incidentId, commander);
    await listIncidents(commander);

    for (const operation of [
      'incident.classified',
      'incident.assigned',
      'incident.mutated',
      'incident.transfer_approval_requested',
      'incident.read',
    ]) {
      const count = await prisma.auditEvent.count({
        where: {
          resourceType: 'Incident',
          resourceId: incidentId,
          operation,
        },
      });
      expect(count).toBeGreaterThan(0);
    }
    const intakeAudits = await prisma.auditEvent.count({
      where: {
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.created',
      },
    });
    expect(intakeAudits).toBe(1);
    const listedAudits = await prisma.auditEvent.count({
      where: {
        resourceType: 'Incident',
        resourceId: '*',
        operation: 'incident.listed',
        actorId: commander.id,
      },
    });
    expect(listedAudits).toBeGreaterThan(0);
  });

  it('advances SLA kinds and emits overdue events past thresholds', async () => {
    const { incidentId } = await registerProbe(commander);
    const { assignments: slaAssignments } = await assignIncident(
      incidentId,
      commander,
      [commander.id],
    );
    trackedAssignmentIds.push(...slaAssignments.map(({ id }) => id));
    const activeKind = () =>
      prisma.slaInstance.findFirst({
        where: {
          resourceType: 'Incident',
          resourceId: incidentId,
          status: 'active',
        },
        select: { kind: true, dueAt: true },
      });

    expect((await activeKind())?.kind).toBe('incident_classification_24h');
    await classifyIncident(incidentId, commander, 'other', 'medium');
    expect((await activeKind())?.kind).toBe('incident_verification_24h');
    const { assignments } = await assignIncident(incidentId, commander, [
      seededAssignee.id,
    ]);
    trackedAssignmentIds.push(...assignments.map(({ id }) => id));
    await startVerification(incidentId, seededAssignee);
    expect((await activeKind())?.kind).toBe('incident_transfer_24h');
    const transfer = await transferIncident(incidentId, commander, UPPER);
    await approveIncident(incidentId, transfer.approval.id, commander);
    expect((await activeKind())?.kind).toBe('incident_resolution_7d');

    const active = await prisma.slaInstance.findFirstOrThrow({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        status: 'active',
      },
    });
    const dayMs = 24 * 60 * 60 * 1000;
    expect(active.dueAt.getTime() - Date.now()).toBeGreaterThan(6 * dayMs);

    await prisma.slaInstance.update({
      where: { id: active.id },
      data: { dueAt: new Date(Date.now() - 60_000) },
    });
    await markOverdue(new Date());
    const overdue = await prisma.slaInstance.findUniqueOrThrow({
      where: { id: active.id },
    });
    expect(overdue.status).toBe('overdue');
    expect(overdue.overdueAt).toBeInstanceOf(Date);
    expect(overdue.overdueEventId).toEqual(expect.any(String));
    const overdueEvents = await prisma.eventRecord.count({
      where: {
        aggregateType: 'SlaInstance',
        aggregateId: active.id,
        eventType: 'SlaOverdue',
      },
    });
    expect(overdueEvents).toBe(1);

    const resolution = await resolveIncident(
      incidentId,
      commander,
      'Da xu ly xong.',
    );
    await approveIncident(incidentId, resolution.approval.id, commander);
    const remaining = await prisma.slaInstance.count({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        status: 'active',
      },
    });
    expect(remaining).toBe(0);
  });

  it('marks configured incident SLA thresholds overdue on the elapsed clock', async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const startedAt = new Date('2026-01-01T00:00:00.000Z');
    const classificationDue = dueAt(startedAt, {
      kind: 'incident_classification_24h',
      durationMs: dayMs,
    });
    expect(classificationDue.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(
      dueAt(startedAt, {
        kind: 'incident_resolution_7d',
        durationMs: 7 * dayMs,
      }).toISOString(),
    ).toBe('2026-01-08T00:00:00.000Z');
    expect(
      isOverdue(new Date(classificationDue.getTime() - 1), classificationDue),
    ).toBe(false);
    expect(isOverdue(classificationDue, classificationDue)).toBe(true);

    const resourceId = `t04-clock-${stamp}-${randomUUID()}`;
    const elapsedStart = new Date(Date.now() - (dayMs + 60_000));
    const sla = await createSla({
      resourceType: 'T04Clock',
      resourceId,
      rule: { kind: 'incident_classification_24h', durationMs: dayMs },
      startedAt: elapsedStart,
      assigneeUserId: commander.id,
    });
    expect(sla.dueAt.getTime()).toBe(elapsedStart.getTime() + dayMs);
    try {
      await markOverdue(new Date());
      const overdue = await prisma.slaInstance.findUniqueOrThrow({
        where: { id: sla.id },
      });
      expect(overdue.status).toBe('overdue');
      expect(overdue.overdueAt).toBeInstanceOf(Date);
      expect(overdue.overdueEventId).toEqual(expect.any(String));
      const overdueEvents = await prisma.eventRecord.count({
        where: {
          aggregateType: 'SlaInstance',
          aggregateId: sla.id,
          eventType: 'SlaOverdue',
        },
      });
      expect(overdueEvents).toBe(1);
    } finally {
      const events = await prisma.eventRecord.findMany({
        where: { aggregateType: 'SlaInstance', aggregateId: sla.id },
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
      await prisma.slaInstance.deleteMany({ where: { id: sla.id } });
    }
  });
});
