import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  appendEvent,
  processOutboxUntilIdle,
  readAggregateEvents,
  registerEventConsumer,
  replayAggregate,
} from '@/modules/eventing';
import {
  assertAccess,
  canAccess,
  grantAssignments,
  recordAudit,
  requireRole,
  revokeAssignment,
  type IdentityUser,
} from '@/modules/identity';
import {
  approveIncident,
  assignIncident,
  assertIncidentTransition,
  classifyIncident,
  closeIncident,
  confirmIntakeReport,
  convertIntakeToIncident,
  getIncident,
  getIncidentReadModel,
  listIncidents,
  rebuildIncidentProjection,
  registerIntakeReport,
  resolveIncident,
  startVerification,
  transferIncident,
  verifyIntakeReport,
} from '@/modules/incidents';
import {
  approveRecommendation,
  assertInspectionTransition,
  completeInspection,
  getEstablishment,
  getInspection,
  INSPECTION_DOMAIN_EVENTS,
  rebuildInspectionProjection,
  recordFinding,
  registerEstablishment,
  rejectRecommendation,
  saveChecklistResponses,
  scheduleInspection,
  startInspection,
  submitRecommendation,
} from '@/modules/inspections';
import {
  acceptOfflineCommand,
  assertOfflineCommandFresh,
  createEvidenceRecord,
  createGeoArea,
  createGeoPoint,
  createInAppNotification,
  createSla,
  dueAt,
  getEvidence,
  isOverdue,
  listNotifications,
  LocalEvidenceStorage,
  markOverdue,
} from '@/modules/platform';
import {
  assertVehicleMatchConfirmation,
  confirmVehicleMatch,
  createMockCameraAdapter,
  createRegistryEntry,
  escalateVehicleObservation,
  getMockCameraObservations,
  getObservation,
  isMatchSuggestion,
  isMockCameraAvailable,
  isRegistryActive,
  listObservations,
  listRegistry,
  MOCK_CAMERA_FIXTURES,
  normalizePlate,
  rebuildVehicleProjection,
  recordVehicleObservation,
  updateRegistryEntry,
  vehicleEscalationDueAt,
  VEHICLE_DOMAIN_EVENTS,
  verifyVehicleObservation,
} from '@/modules/vehicles';

describe('parallel wave public seams', () => {
  it('keeps each module lifecycle independent while using shared vocabulary', () => {
    expect(() =>
      assertIncidentTransition('received', 'classified'),
    ).not.toThrow();
    expect(() =>
      assertInspectionTransition('scheduled', 'in_progress'),
    ).not.toThrow();
    expect(normalizePlate('89a-123.45')).toBe('89A12345');
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-01-01'),
          validUntil: null,
        },
        new Date('2026-09-19'),
      ),
    ).toBe(true);
  });

  it('routes eventing only through the public eventing contract', () => {
    expect(typeof appendEvent).toBe('function');
    expect(typeof readAggregateEvents).toBe('function');
    expect(typeof registerEventConsumer).toBe('function');
    expect(typeof processOutboxUntilIdle).toBe('function');
    expect(typeof replayAggregate).toBe('function');
  });

  it('routes identity and authorization only through the public identity contract', () => {
    expect(typeof assertAccess).toBe('function');
    expect(typeof canAccess).toBe('function');
    expect(typeof requireRole).toBe('function');
    expect(typeof recordAudit).toBe('function');
    expect(typeof grantAssignments).toBe('function');
  });

  it('routes Evidence, Geo, SLA, notification and field sync only through the public platform contract', () => {
    expect(typeof createEvidenceRecord).toBe('function');
    expect(typeof createGeoPoint).toBe('function');
    expect(typeof createGeoArea).toBe('function');
    expect(typeof createSla).toBe('function');
    expect(typeof dueAt).toBe('function');
    expect(typeof createInAppNotification).toBe('function');
    expect(typeof acceptOfflineCommand).toBe('function');
  });

  it('pins versioned owners for inspection and vehicle domain events', () => {
    expect(INSPECTION_DOMAIN_EVENTS.EstablishmentRegistered).toEqual({
      aggregateType: 'Establishment',
      eventVersion: 1,
    });
    expect(INSPECTION_DOMAIN_EVENTS.InspectionScheduled).toEqual({
      aggregateType: 'Inspection',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.VehicleObservationRecorded).toEqual({
      aggregateType: 'VehicleObservation',
      eventVersion: 1,
    });
    expect(VEHICLE_DOMAIN_EVENTS.SuspiciousVehicleRegistered).toEqual({
      aggregateType: 'SuspiciousVehicleRegistry',
      eventVersion: 1,
    });
    for (const ownership of Object.values(INSPECTION_DOMAIN_EVENTS)) {
      expect(ownership.eventVersion).toBe(1);
    }
    for (const ownership of Object.values(VEHICLE_DOMAIN_EVENTS)) {
      expect(ownership.eventVersion).toBe(1);
    }
  });
});

describe('PS-E1-005 continuous SLA clock', () => {
  it('advances the 24h classification clock across the weekend without pausing', () => {
    const started = new Date('2026-09-18T23:00:00.000Z');
    const due = dueAt(started, {
      kind: 'incident_classification_24h',
      durationMs: 24 * 60 * 60 * 1000,
    });
    expect(due.toISOString()).toBe('2026-09-19T23:00:00.000Z');
    expect(isOverdue(new Date('2026-09-19T22:59:59.999Z'), due)).toBe(false);
    expect(isOverdue(due, due)).toBe(true);
  });

  it('advances the 7d resolution clock across the National Day holiday without skipping', () => {
    const started = new Date('2026-09-02T00:00:00.000Z');
    const due = dueAt(started, {
      kind: 'incident_resolution_7d',
      durationMs: 7 * 24 * 60 * 60 * 1000,
    });
    expect(due.toISOString()).toBe('2026-09-09T00:00:00.000Z');
    expect(isOverdue(new Date('2026-09-08T23:59:59.999Z'), due)).toBe(false);
    expect(isOverdue(due, due)).toBe(true);
  });
});

const psE1005Enabled = process.env.RUN_DB_TESTS === '1';
const psStamp = randomUUID().slice(0, 8);
const PS_ORG = 'unit-nghia-tru';
const PS_UPPER = 'unit-cap-tren';

function psUser(
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

const psCommander = psUser(`ps005-commander-${psStamp}`, ['commander'], PS_ORG);
const psApprover = psUser(`ps005-approver-${psStamp}`, ['commander'], PS_ORG);
const psUnassigned = psUser(
  `ps005-unassigned-${psStamp}`,
  ['field_officer'],
  PS_ORG,
);
const psCrossCommander = psUser(
  `ps005-cross-${psStamp}`,
  ['commander'],
  PS_UPPER,
);
const psScopeActorIds = [
  psCommander.id,
  psApprover.id,
  psUnassigned.id,
  psCrossCommander.id,
];
let psAssignee: IdentityUser = psUser('dev-field', ['field_officer'], PS_ORG);
const psTracked: Array<{ incidentId: string; reportId: string }> = [];
const psAssignmentIds: string[] = [];
let psMain = { incidentId: '', reportId: '' };
let psModuleCounts: Record<string, number> = {};

async function psModuleTableCounts(): Promise<Record<string, number>> {
  const [
    establishment,
    inspection,
    inspectionFinding,
    enforcementRecommendation,
    suspiciousVehicleEntry,
    vehicleObservation,
    vehicleVerification,
  ] = await Promise.all([
    prisma.establishment.count(),
    prisma.inspection.count(),
    prisma.inspectionFinding.count(),
    prisma.enforcementRecommendation.count(),
    prisma.suspiciousVehicleEntry.count(),
    prisma.vehicleObservation.count(),
    prisma.vehicleVerification.count(),
  ]);
  return {
    establishment,
    inspection,
    inspectionFinding,
    enforcementRecommendation,
    suspiciousVehicleEntry,
    vehicleObservation,
    vehicleVerification,
  };
}

async function psCleanup(): Promise<void> {
  const incidentIds = psTracked.map(({ incidentId }) => incidentId);
  const reportIds = psTracked.map(({ reportId }) => reportId);
  if (!incidentIds.length) return;
  const [audits, slas, assignments] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        OR: [
          ...incidentIds.map((resourceId) => ({
            resourceType: 'Incident',
            resourceId,
          })),
          ...reportIds.map((resourceId) => ({
            resourceType: 'IntakeReport',
            resourceId,
          })),
        ],
      },
      select: { id: true },
    }),
    prisma.slaInstance.findMany({
      where: { resourceId: { in: incidentIds } },
      select: { id: true },
    }),
    prisma.assignment.findMany({
      where: { resourceId: { in: incidentIds } },
      select: { id: true },
    }),
  ]);
  const childIds = [
    ...audits.map(({ id }) => id),
    ...slas.map(({ id }) => id),
    ...assignments.map(({ id }) => id),
  ];
  const events = await prisma.eventRecord.findMany({
    where: {
      OR: [
        ...incidentIds.map((aggregateId) => ({
          aggregateType: 'Incident',
          aggregateId,
        })),
        ...reportIds.map((aggregateId) => ({
          aggregateType: 'IntakeReport',
          aggregateId,
        })),
        ...(childIds.length ? [{ aggregateId: { in: childIds } }] : []),
      ],
    },
    select: { eventId: true },
  });
  const eventIds = events.map(({ eventId }) => eventId);
  if (eventIds.length) {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { sourceEventId: { in: eventIds } },
          { resourceId: { in: incidentIds } },
        ],
      },
    });
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.eventRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }
  await prisma.projectionRecord.deleteMany({
    where: { aggregateType: 'Incident', aggregateId: { in: incidentIds } },
  });
  await prisma.approval.deleteMany({
    where: { resourceType: 'Incident', resourceId: { in: incidentIds } },
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
    where: { resourceId: { in: incidentIds } },
  });
  await prisma.notification.deleteMany({
    where: { resourceId: { in: incidentIds } },
  });
  await prisma.incident.deleteMany({ where: { id: { in: incidentIds } } });
  await prisma.intakeReport.deleteMany({ where: { id: { in: reportIds } } });
  await prisma.auditEvent.deleteMany({
    where: {
      resourceType: 'Incident',
      resourceId: '*',
      actorId: { in: psScopeActorIds },
    },
  });
  psTracked.length = 0;
  psAssignmentIds.length = 0;
}

describe.skipIf(!psE1005Enabled)(
  'PS-E1-005 IntakeReport to Incident path',
  () => {
    beforeAll(async () => {
      const field = await prisma.user.findUnique({
        where: { email: 'field@civicos.local' },
        select: { id: true, organizationUnitId: true },
      });
      if (!field) throw new Error('PS005_SEEDED_FIELD_USER_MISSING');
      psAssignee = {
        id: field.id,
        email: 'field@civicos.local',
        name: 'Field workflow fixture',
        roles: ['field_officer'],
        organizationUnitId: field.organizationUnitId ?? PS_ORG,
      };
      for (const name of ['commander', 'field_officer'] as const) {
        await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name },
        });
      }
      const seeds = [
        { user: psCommander, role: 'commander' },
        { user: psApprover, role: 'commander' },
        { user: psUnassigned, role: 'field_officer' },
        { user: psCrossCommander, role: 'commander' },
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
        const roleRow = await prisma.role.findUniqueOrThrow({
          where: { name: role },
        });
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
          update: {},
          create: { userId: user.id, roleId: roleRow.id },
        });
      }
      psModuleCounts = await psModuleTableCounts();
    });

    afterAll(async () => {
      await psCleanup();
    });

    it(
      'registers one IntakeReport and one Incident with versioned domain events',
      { timeout: 30000 },
      async () => {
        const created = await registerIntakeReport(
          {
            channel: 'in_person',
            receivedAt: new Date().toISOString(),
            content: `PS-E1-005 parallel probe ${psStamp}`,
            sourceName: 'Nguyen Van A',
            latitude: 21.01,
            longitude: 106.02,
            sensitiveRef: 'PS005-SENSITIVE',
            idempotencyKey: `ps005:${psStamp}:${randomUUID()}`,
          },
          psCommander,
        );
        expect(created.incidentId).toBeNull();
        await verifyIntakeReport(created.reportId, psCommander, {
          classification: 'sufficient',
          verificationNote: 'PS-E1-005 parallel verification.',
        });
        await confirmIntakeReport(created.reportId, psCommander);
        const converted = await convertIntakeToIncident(
          created.reportId,
          psCommander,
        );
        if (!converted.incidentId) throw new Error('PS005_CONVERT_FAILED');
        const registered = {
          reportId: created.reportId,
          incidentId: converted.incidentId,
        };
        psMain = { ...registered };
        psTracked.push({ ...registered });

        const [reports, incidents] = await Promise.all([
          prisma.intakeReport.findMany({ where: { id: registered.reportId } }),
          prisma.incident.findMany({ where: { id: registered.incidentId } }),
        ]);
        expect(reports).toHaveLength(1);
        expect(incidents).toHaveLength(1);
        expect(reports[0].incidentId).toBe(registered.incidentId);
        expect(reports[0].status).toBe('PROCESSED');
        expect(incidents[0].status).toBe('received');

        const reportEvents = await readAggregateEvents(
          prisma,
          'IntakeReport',
          registered.reportId,
        );
        expect(reportEvents.map(({ eventType }) => eventType)).toEqual([
          'IntakeReportReceived',
          'IntakeReportVerified',
          'IntakeReportConvertedToIncident',
        ]);
        expect(reportEvents[0].eventVersion).toBe(1);
        const incidentEvents = await readAggregateEvents(
          prisma,
          'Incident',
          registered.incidentId,
        );
        expect(incidentEvents.map(({ eventType }) => eventType)).toEqual([
          'IncidentRegistered',
        ]);
        expect(incidentEvents[0].eventVersion).toBe(1);

        const sla = await prisma.slaInstance.findMany({
          where: {
            resourceType: 'Incident',
            resourceId: registered.incidentId,
          },
        });
        expect(sla.map(({ kind }) => kind)).toEqual([
          'incident_classification_24h',
        ]);
        await expect(
          prisma.auditEvent.count({
            where: {
              resourceType: 'IntakeReport',
              resourceId: registered.reportId,
              operation: 'intake.created',
            },
          }),
        ).resolves.toBe(1);
      },
    );

    it(
      'projects and replays the Incident read model deterministically',
      { timeout: 60000 },
      async () => {
        expect(psMain.incidentId).toBeTruthy();
        await processOutboxUntilIdle();

        const projected = await getIncidentReadModel(psMain.incidentId);
        expect(projected?.state).toMatchObject({
          id: psMain.incidentId,
          status: 'received',
        });

        const history = await readAggregateEvents(
          prisma,
          'Incident',
          psMain.incidentId,
        );
        expect(history.map(({ eventType }) => eventType)).toEqual([
          'IncidentRegistered',
        ]);

        const seen: string[] = [];
        const replayed = await replayAggregate(
          prisma,
          'Incident',
          psMain.incidentId,
          async (event) => {
            seen.push(event.eventId);
          },
        );
        expect(replayed).toBe(history.length);
        expect(seen).toEqual(history.map(({ eventId }) => eventId));

        const before = await getIncidentReadModel(psMain.incidentId);
        await prisma.projectionRecord.deleteMany({
          where: {
            projectionName: 'incident-read-model',
            aggregateType: 'Incident',
            aggregateId: psMain.incidentId,
          },
        });
        expect(await rebuildIncidentProjection()).toBeGreaterThan(0);
        const after = await getIncidentReadModel(psMain.incidentId);
        expect(after?.state).toEqual(before?.state);
      },
    );

    it(
      'gates Incident access through Assignment with revoke',
      { timeout: 30000 },
      async () => {
        expect(psMain.incidentId).toBeTruthy();
        const { assignments: commanderAssignments } = await assignIncident(
          psMain.incidentId,
          psCommander,
          [psCommander.id],
        );
        psAssignmentIds.push(...commanderAssignments.map(({ id }) => id));
        await classifyIncident(
          psMain.incidentId,
          psCommander,
          'public_order',
          'high',
        );

        await expect(
          getIncident(psMain.incidentId, psUnassigned),
        ).rejects.toThrow('FORBIDDEN');

        const { assignments } = await assignIncident(
          psMain.incidentId,
          psCommander,
          [psAssignee.id],
        );
        psAssignmentIds.push(...assignments.map(({ id }) => id));

        await expect(
          getIncident(psMain.incidentId, psAssignee),
        ).resolves.toMatchObject({
          incident: expect.objectContaining({ id: psMain.incidentId }),
        });
        await startVerification(
          psMain.incidentId,
          psAssignee,
          'assignee verifies',
        );
        await expect(
          prisma.incident.findUniqueOrThrow({
            where: { id: psMain.incidentId },
          }),
        ).resolves.toMatchObject({ status: 'verifying' });

        await expect(
          getIncident(psMain.incidentId, psCrossCommander),
        ).rejects.toThrow('FORBIDDEN');

        await revokeAssignment(
          assignments[0].id,
          psCommander,
          'Nhiem vu ket thuc.',
        );
        await expect(
          prisma.assignment.findUniqueOrThrow({
            where: { id: assignments[0].id },
          }),
        ).resolves.toMatchObject({ status: 'revoked' });
        await expect(
          getIncident(psMain.incidentId, psAssignee),
        ).rejects.toThrow('FORBIDDEN');
      },
    );

    it(
      'transitions through Approval to transfer, resolve and close',
      { timeout: 60000 },
      async () => {
        expect(psMain.incidentId).toBeTruthy();
        const transfer = await transferIncident(
          psMain.incidentId,
          psCommander,
          PS_UPPER,
        );
        expect(transfer.approval.status).toBe('pending');
        await expect(
          prisma.incident.findUniqueOrThrow({
            where: { id: psMain.incidentId },
          }),
        ).resolves.toMatchObject({ status: 'verifying' });

        const transferred = await approveIncident(
          psMain.incidentId,
          transfer.approval.id,
          psApprover,
        );
        expect(transferred.incident.status).toBe('transferred');
        await expect(
          prisma.slaInstance.findFirst({
            where: {
              resourceType: 'Incident',
              resourceId: psMain.incidentId,
              status: 'active',
            },
            select: { kind: true },
          }),
        ).resolves.toMatchObject({ kind: 'incident_resolution_7d' });

        const resolution = await resolveIncident(
          psMain.incidentId,
          psCommander,
          'Da hoan tat xac minh.',
        );
        await approveIncident(
          psMain.incidentId,
          resolution.approval.id,
          psApprover,
        );
        await expect(
          prisma.slaInstance.count({
            where: {
              resourceType: 'Incident',
              resourceId: psMain.incidentId,
              status: 'active',
            },
          }),
        ).resolves.toBe(0);

        const closure = await closeIncident(psMain.incidentId, psCommander);
        const closed = await approveIncident(
          psMain.incidentId,
          closure.approval.id,
          psApprover,
        );
        expect(closed.incident.status).toBe('closed');

        const events = await prisma.eventRecord.findMany({
          where: { aggregateType: 'Incident', aggregateId: psMain.incidentId },
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
          'IncidentTransferred',
          'IncidentResolutionRequested',
          'IncidentResolved',
          'IncidentClosureRequested',
          'IncidentClosed',
        ]);
        const approvals = await prisma.approval.findMany({
          where: { resourceType: 'Incident', resourceId: psMain.incidentId },
        });
        expect(approvals.map(({ status }) => status).sort()).toEqual([
          'approved',
          'approved',
          'approved',
        ]);
      },
    );

    it(
      'records AuditEvent for sensitive reads and every mutation',
      { timeout: 30000 },
      async () => {
        expect(psMain.incidentId).toBeTruthy();
        await getIncident(psMain.incidentId, psCommander);
        await listIncidents(psCommander);

        for (const operation of [
          'incident.classified',
          'incident.assigned',
          'incident.mutated',
          'incident.transfer_approval_requested',
          'incident.resolve_approval_requested',
          'incident.close_approval_requested',
          'incident.read',
          'assignment.granted',
          'assignment.revoked',
        ]) {
          await expect(
            prisma.auditEvent.count({
              where: {
                resourceType: { in: ['Incident', 'Assignment'] },
                resourceId: psMain.incidentId,
                operation,
              },
            }),
          ).resolves.toBeGreaterThan(0);
        }
        await expect(
          prisma.auditEvent.count({
            where: {
              resourceType: 'IntakeReport',
              resourceId: psMain.reportId,
              operation: 'intake.created',
            },
          }),
        ).resolves.toBe(1);
        await expect(
          prisma.auditEvent.count({
            where: {
              resourceType: 'Incident',
              resourceId: '*',
              operation: 'incident.listed',
              actorId: psCommander.id,
            },
          }),
        ).resolves.toBeGreaterThan(0);
      },
    );

    it(
      'retries the continuous SLA notification without duplicating side effects',
      { timeout: 60000 },
      async () => {
        const created = await registerIntakeReport(
          {
            channel: 'telephone',
            receivedAt: new Date().toISOString(),
            content: `PS-E1-005 SLA probe ${psStamp}`,
            idempotencyKey: `ps005-sla:${psStamp}:${randomUUID()}`,
          },
          psCommander,
        );
        await verifyIntakeReport(created.reportId, psCommander, {
          classification: 'sufficient',
          verificationNote: 'PS-E1-005 SLA verification.',
        });
        await confirmIntakeReport(created.reportId, psCommander);
        const converted = await convertIntakeToIncident(
          created.reportId,
          psCommander,
        );
        if (!converted.incidentId) throw new Error('PS005_SLA_CONVERT_FAILED');
        const registered = {
          reportId: created.reportId,
          incidentId: converted.incidentId,
        };
        psTracked.push({ ...registered });

        const active = await prisma.slaInstance.findFirstOrThrow({
          where: {
            resourceType: 'Incident',
            resourceId: registered.incidentId,
            status: 'active',
          },
        });
        await prisma.slaInstance.update({
          where: { id: active.id },
          data: { dueAt: new Date(Date.now() - 60_000) },
        });

        expect(await markOverdue(new Date())).toBeGreaterThanOrEqual(1);
        const overdue = await prisma.slaInstance.findUniqueOrThrow({
          where: { id: active.id },
        });
        expect(overdue.status).toBe('overdue');
        expect(overdue.overdueEventId).toEqual(expect.any(String));
        await expect(
          prisma.notification.count({
            where: {
              userId: psCommander.id,
              resourceId: registered.incidentId,
              type: 'sla_overdue',
            },
          }),
        ).resolves.toBe(0);

        await processOutboxUntilIdle();
        const delivered = (await listNotifications(psCommander.id)).filter(
          (notification) => notification.resourceId === registered.incidentId,
        );
        expect(delivered).toHaveLength(1);
        expect(delivered[0].type).toBe('sla_overdue');

        const retried = await createInAppNotification({
          userId: psCommander.id,
          type: delivered[0].type,
          title: delivered[0].title,
          body: delivered[0].body,
          resourceType: delivered[0].resourceType ?? undefined,
          resourceId: delivered[0].resourceId ?? undefined,
          sourceEventId: overdue.overdueEventId ?? undefined,
        });
        expect(retried.id).toBe(delivered[0].id);
        await processOutboxUntilIdle();
        await expect(
          prisma.notification.count({
            where: {
              userId: psCommander.id,
              resourceId: registered.incidentId,
            },
          }),
        ).resolves.toBe(1);
      },
    );

    it(
      'writes no Inspection or Vehicle aggregates, tables or events',
      { timeout: 30000 },
      async () => {
        await expect(psModuleTableCounts()).resolves.toEqual(psModuleCounts);

        const incidentIds = psTracked.map(({ incidentId }) => incidentId);
        const reportIds = psTracked.map(({ reportId }) => reportId);
        const assignments = await prisma.assignment.findMany({
          where: { resourceId: { in: incidentIds } },
          select: { id: true },
        });
        const audits = await prisma.auditEvent.findMany({
          where: {
            OR: [
              { resourceType: 'Incident', resourceId: { in: incidentIds } },
              { resourceType: 'IntakeReport', resourceId: { in: reportIds } },
            ],
          },
          select: { id: true },
        });
        const slas = await prisma.slaInstance.findMany({
          where: { resourceId: { in: incidentIds } },
          select: { id: true },
        });
        const relatedIds = [
          ...incidentIds,
          ...reportIds,
          ...assignments.map(({ id }) => id),
          ...audits.map(({ id }) => id),
          ...slas.map(({ id }) => id),
        ];
        const events = await prisma.eventRecord.findMany({
          where: { aggregateId: { in: relatedIds } },
          select: { aggregateType: true, eventType: true },
        });
        expect(events.length).toBeGreaterThan(0);
        expect(
          events
            .map(({ aggregateType }) => aggregateType)
            .filter((aggregateType) =>
              [
                'Establishment',
                'Inspection',
                'VehicleObservation',
                'SuspiciousVehicleRegistry',
              ].includes(aggregateType),
            ),
        ).toEqual([]);
        expect(
          events
            .map(({ eventType }) => eventType)
            .filter(
              (eventType) =>
                eventType.startsWith('Inspection') ||
                eventType.startsWith('Establishment') ||
                eventType.startsWith('Vehicle') ||
                eventType.startsWith('SuspiciousVehicle') ||
                eventType.startsWith('Enforcement'),
            ),
        ).toEqual([]);
      },
    );
  },
);

const psE1007Enabled = process.env.RUN_DB_TESTS === '1';
const ps007Stamp = randomUUID().slice(0, 8);
const ps007StorageRoot = `/tmp/civicos-parallel-wave-007-${ps007Stamp}`;
const ps007Storage = new LocalEvidenceStorage(ps007StorageRoot);

function ps007User(
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

const ps007Commander = ps007User(
  `pw007-commander-${ps007Stamp}`,
  ['commander'],
  PS_ORG,
);
const ps007Field = ps007User(
  `pw007-field-${ps007Stamp}`,
  ['field_officer'],
  PS_ORG,
);
const ps007Unassigned = ps007User(
  `pw007-unassigned-${ps007Stamp}`,
  ['field_officer'],
  PS_ORG,
);
const ps007Cross = ps007User(
  `pw007-cross-${ps007Stamp}`,
  ['field_officer'],
  PS_UPPER,
);
const ps007DbUsers = [ps007Commander, ps007Field, ps007Unassigned];
const ps007EstablishmentIds: string[] = [];
const ps007TemplateTypes: string[] = [];
let ps007IncidentVehicleCounts: Record<string, number> = {};

function ps007KaraokeType(): string {
  const type = `karaoke-kinh-doanh-${ps007Stamp}`;
  if (!ps007TemplateTypes.includes(type)) ps007TemplateTypes.push(type);
  return type;
}

function ps007TrackEstablishment(id: string): string {
  ps007EstablishmentIds.push(id);
  return id;
}

async function ps007RegisterCatalog(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const marker = randomUUID().slice(0, 8);
  const establishment = await registerEstablishment(
    {
      name: `Co so pw007 ${ps007Stamp} ${marker}`,
      ownerName: 'Chu co so',
      address: `Dia chi pw007 ${ps007Stamp} ${marker}`,
      type: ps007KaraokeType(),
      ...(overrides as object),
    },
    ps007Commander,
  );
  return ps007TrackEstablishment(establishment.id);
}

async function ps007InspectionIds(): Promise<string[]> {
  if (!ps007EstablishmentIds.length) return [];
  const inspections = await prisma.inspection.findMany({
    where: { establishmentId: { in: ps007EstablishmentIds } },
    select: { id: true },
  });
  return inspections.map(({ id }) => id);
}

async function ps007IncidentVehicleTableCounts(): Promise<
  Record<string, number>
> {
  const [incident, intakeReport, suspiciousVehicleEntry, vehicleObservation] =
    await Promise.all([
      prisma.incident.count(),
      prisma.intakeReport.count(),
      prisma.suspiciousVehicleEntry.count(),
      prisma.vehicleObservation.count(),
    ]);
  return { incident, intakeReport, suspiciousVehicleEntry, vehicleObservation };
}

async function ps007CleanupScope(): Promise<void> {
  if (!ps007EstablishmentIds.length) return;
  const inspectionIds = await ps007InspectionIds();
  const recommendations = inspectionIds.length
    ? await prisma.enforcementRecommendation.findMany({
        where: { inspectionId: { in: inspectionIds } },
        select: { id: true },
      })
    : [];
  const recommendationIds = recommendations.map(({ id }) => id);
  const evidenceRows = inspectionIds.length
    ? await prisma.evidence.findMany({
        where: {
          resourceType: 'Inspection',
          resourceId: { in: inspectionIds },
        },
        select: { id: true, storageKey: true },
      })
    : [];
  for (const { storageKey } of evidenceRows) {
    await ps007Storage.remove(storageKey);
  }
  const [audits, assignments, slas] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        OR: [
          {
            resourceType: 'Establishment',
            resourceId: { in: ps007EstablishmentIds },
          },
          {
            resourceType: 'Inspection',
            resourceId: { in: inspectionIds },
          },
        ],
      },
      select: { id: true },
    }),
    inspectionIds.length
      ? prisma.assignment.findMany({
          where: {
            resourceType: 'Inspection',
            resourceId: { in: inspectionIds },
          },
          select: { id: true },
        })
      : [],
    inspectionIds.length || recommendationIds.length
      ? prisma.slaInstance.findMany({
          where: {
            OR: [
              {
                resourceType: 'Inspection',
                resourceId: { in: inspectionIds },
              },
              {
                resourceType: 'EnforcementRecommendation',
                resourceId: { in: recommendationIds },
              },
            ],
          },
          select: { id: true },
        })
      : [],
  ]);
  const auditIds = audits.map(({ id }) => id);
  const assignmentIds = assignments.map(({ id }) => id);
  const slaIds = slas.map(({ id }) => id);
  const eventRecords = await prisma.eventRecord.findMany({
    where: {
      OR: [
        {
          aggregateType: 'Establishment',
          aggregateId: { in: ps007EstablishmentIds },
        },
        { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
        ...(assignmentIds.length
          ? [
              {
                aggregateType: 'Assignment',
                aggregateId: { in: assignmentIds },
              },
            ]
          : []),
        ...(slaIds.length
          ? [{ aggregateType: 'SlaInstance', aggregateId: { in: slaIds } }]
          : []),
        ...(auditIds.length
          ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
          : []),
      ],
    },
    select: { eventId: true },
  });
  const eventIds = eventRecords.map(({ eventId }) => eventId);
  if (eventIds.length) {
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.eventRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }
  await prisma.projectionRecord.deleteMany({
    where: {
      OR: [
        {
          aggregateType: 'Establishment',
          aggregateId: { in: ps007EstablishmentIds },
        },
        { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
      ],
    },
  });
  if (inspectionIds.length) {
    await prisma.notification.deleteMany({
      where: { resourceId: { in: inspectionIds } },
    });
    await prisma.inspectionFinding.deleteMany({
      where: { inspectionId: { in: inspectionIds } },
    });
    await prisma.enforcementRecommendation.deleteMany({
      where: { inspectionId: { in: inspectionIds } },
    });
  }
  if (slaIds.length) {
    await prisma.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
  }
  if (auditIds.length) {
    await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
  }
  if (assignmentIds.length) {
    await prisma.assignment.deleteMany({
      where: { id: { in: assignmentIds } },
    });
  }
  if (evidenceRows.length) {
    await prisma.evidence.deleteMany({
      where: { id: { in: evidenceRows.map(({ id }) => id) } },
    });
  }
  if (inspectionIds.length) {
    await prisma.inspection.deleteMany({
      where: { id: { in: inspectionIds } },
    });
  }
  if (ps007TemplateTypes.length) {
    await prisma.checklistTemplate.deleteMany({
      where: { establishmentType: { in: ps007TemplateTypes } },
    });
  }
  await prisma.establishment.deleteMany({
    where: { id: { in: ps007EstablishmentIds } },
  });
  ps007EstablishmentIds.length = 0;
}

describe.skipIf(!psE1007Enabled)(
  'PS-E1-007 Establishment and Inspection integration',
  () => {
    beforeAll(async () => {
      for (const [id, name, parentId] of [
        [PS_UPPER, 'Cap tren', null],
        [PS_ORG, 'Nghia Tru', PS_UPPER],
      ] as const) {
        await prisma.organizationUnit.upsert({
          where: { id },
          update: { active: true },
          create: { id, name, level: 'unit', parentId },
        });
      }
      for (const roleName of ['commander', 'field_officer'] as const) {
        await prisma.role.upsert({
          where: { name: roleName },
          update: {},
          create: { name: roleName },
        });
      }
      for (const user of ps007DbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `pw007-hash-${ps007Stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
        for (const roleName of user.roles) {
          const roleRow = await prisma.role.findUniqueOrThrow({
            where: { name: roleName },
          });
          await prisma.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
            update: {},
            create: { userId: user.id, roleId: roleRow.id },
          });
        }
      }
      ps007IncidentVehicleCounts = await ps007IncidentVehicleTableCounts();
    });

    afterAll(async () => {
      await ps007CleanupScope();
      await prisma.session.deleteMany({
        where: { userId: { in: ps007DbUsers.map(({ id }) => id) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ps007DbUsers.map(({ id }) => id) } },
      });
      await rm(ps007StorageRoot, { recursive: true, force: true });
    });

    it(
      'runs the Establishment to Inspection lifecycle with versioned events and projections',
      { timeout: 60000 },
      async () => {
        const establishmentId = await ps007RegisterCatalog();
        const establishmentEvents = await readAggregateEvents(
          prisma,
          'Establishment',
          establishmentId,
        );
        expect(establishmentEvents.map(({ eventType }) => eventType)).toEqual([
          'EstablishmentRegistered',
        ]);
        expect(establishmentEvents[0].eventVersion).toBe(1);

        const inspection = await scheduleInspection(
          {
            establishmentId,
            assignedUserId: ps007Field.id,
            scheduledAt: '2026-10-01T08:00:00.000Z',
          },
          ps007Commander,
        );
        expect(inspection.templateVersion).toBe(1);
        const inspectionEvents = await readAggregateEvents(
          prisma,
          'Inspection',
          inspection.id,
        );
        expect(inspectionEvents.map(({ eventType }) => eventType)).toEqual([
          'InspectionScheduled',
        ]);
        expect(inspectionEvents[0].eventVersion).toBe(1);

        await expect(
          startInspection(inspection.id, ps007Commander),
        ).rejects.toThrow('FORBIDDEN');
        await startInspection(inspection.id, ps007Field);
        await saveChecklistResponses(
          {
            inspectionId: inspection.id,
            responses: [
              { key: 'license', value: 'valid' },
              { key: 'security', value: 'valid' },
            ],
          },
          ps007Field,
        );
        const completed = await completeInspection(
          { inspectionId: inspection.id, result: 'pass' },
          ps007Field,
        );
        expect(completed).toMatchObject({
          status: 'completed',
          result: 'pass',
        });

        const history = await readAggregateEvents(
          prisma,
          'Inspection',
          inspection.id,
        );
        expect(history.map(({ eventType }) => eventType)).toEqual([
          'InspectionScheduled',
          'InspectionStarted',
          'InspectionChecklistSaved',
          'InspectionCompleted',
        ]);
        const versions = history.map(
          ({ aggregateVersion }) => aggregateVersion,
        );
        expect([...versions].sort((left, right) => left - right)).toEqual(
          versions,
        );
        expect(new Set(versions).size).toBe(versions.length);

        await processOutboxUntilIdle();
        await expect(
          prisma.projectionRecord.count({
            where: {
              aggregateType: 'Establishment',
              aggregateId: establishmentId,
            },
          }),
        ).resolves.toBeGreaterThan(0);
        await expect(
          prisma.projectionRecord.count({
            where: {
              aggregateType: 'Inspection',
              aggregateId: inspection.id,
            },
          }),
        ).resolves.toBeGreaterThan(0);
        await expect(
          getEstablishment(establishmentId, ps007Commander),
        ).resolves.toMatchObject({ id: establishmentId });
        await expect(
          getInspection(inspection.id, ps007Commander),
        ).resolves.toMatchObject({
          inspection: expect.objectContaining({ id: inspection.id }),
        });

        await ps007CleanupScope();
      },
    );

    it(
      'snapshots type-specific checklist templates and versions per schedule',
      { timeout: 30000 },
      async () => {
        const karaokeId = await ps007RegisterCatalog();
        const nghiType = `nhà nghỉ lưu trú-${ps007Stamp}`;
        ps007TemplateTypes.push(nghiType);
        const nghiMarker = randomUUID().slice(0, 8);
        const nghi = await registerEstablishment(
          {
            name: `Nha nghi pw007 ${ps007Stamp} ${nghiMarker}`,
            ownerName: 'Chu nha nghi',
            address: `Dia chi nghi ${ps007Stamp} ${nghiMarker}`,
            type: nghiType,
          },
          ps007Commander,
        );
        ps007TrackEstablishment(nghi.id);

        const [karaoke, nghiStay] = await Promise.all([
          scheduleInspection(
            {
              establishmentId: karaokeId,
              scheduledAt: '2026-11-01T08:00:00.000Z',
            },
            ps007Commander,
          ),
          scheduleInspection(
            {
              establishmentId: nghi.id,
              scheduledAt: '2026-11-01T08:00:00.000Z',
            },
            ps007Commander,
          ),
        ]);
        expect(karaoke.templateId).not.toBe(nghiStay.templateId);
        const templates = await prisma.checklistTemplate.findMany({
          where: { id: { in: [karaoke.templateId, nghiStay.templateId] } },
        });
        expect(JSON.stringify(templates[0].items)).not.toBe(
          JSON.stringify(templates[1].items),
        );

        await prisma.checklistTemplate.create({
          data: {
            establishmentType: ps007KaraokeType(),
            version: 2,
            title: `Checklist ${ps007KaraokeType()} v2`,
            items: [{ key: 'license', label: 'Giay phep v2', required: true }],
          },
        });
        const later = await scheduleInspection(
          {
            establishmentId: karaokeId,
            scheduledAt: '2026-12-01T08:00:00.000Z',
          },
          ps007Commander,
        );
        expect(later.templateVersion).toBe(1);
        expect(later.templateId).toBe(karaoke.templateId);

        await ps007CleanupScope();
      },
    );

    it(
      'creates Evidence and gates sensitive download with audit',
      { timeout: 60000 },
      async () => {
        const establishmentId = await ps007RegisterCatalog();
        const inspection = await scheduleInspection(
          {
            establishmentId,
            assignedUserId: ps007Field.id,
            scheduledAt: '2026-11-10T08:00:00.000Z',
          },
          ps007Commander,
        );
        await startInspection(inspection.id, ps007Field);

        const { evidence } = await createEvidenceRecord(ps007Storage, {
          resourceType: 'Inspection',
          resourceId: inspection.id,
          fileName: 'bien-ban.jpg',
          mimeType: 'image/jpeg',
          bytes: new TextEncoder().encode(`pw007-proof-${ps007Stamp}`),
          capturedAt: new Date('2026-11-10T09:00:00.000Z'),
          actorId: ps007Field.id,
          latitude: 20.9,
          longitude: 105.8,
        });
        await recordAudit({
          actor: ps007Field,
          resourceType: 'Inspection',
          resourceId: inspection.id,
          operation: 'evidence.uploaded',
          metadata: { evidenceId: evidence.id },
        });
        const finding = await recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'security',
            description: 'Thieu so theo doi khach luu tru, co anh GPS.',
            result: 'reminder',
            evidenceIds: [evidence.id],
          },
          ps007Field,
        );
        expect(finding.evidenceIds as unknown as string[]).toEqual([
          evidence.id,
        ]);

        const stored = await getEvidence(evidence.id);
        expect(stored?.resourceId).toBe(inspection.id);
        await assertAccess(
          ps007Field,
          { resourceType: 'Inspection', resourceId: inspection.id },
          'read_sensitive',
        );
        const bytes = await ps007Storage.read(stored!.storageKey);
        expect(bytes.byteLength).toBeGreaterThan(0);
        await recordAudit({
          actor: ps007Field,
          resourceType: 'Inspection',
          resourceId: inspection.id,
          operation: 'evidence.downloaded',
          metadata: { evidenceId: evidence.id },
        });
        await expect(
          prisma.auditEvent.count({
            where: {
              resourceType: 'Inspection',
              resourceId: inspection.id,
              operation: 'evidence.downloaded',
            },
          }),
        ).resolves.toBe(1);
        await expect(
          assertAccess(
            ps007Unassigned,
            { resourceType: 'Inspection', resourceId: inspection.id },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          assertAccess(
            ps007Cross,
            { resourceType: 'Inspection', resourceId: inspection.id },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');

        await ps007CleanupScope();
      },
    );

    it(
      'runs Finding to Recommendation approval and rejection with stale version behavior',
      { timeout: 60000 },
      async () => {
        const establishmentId = await ps007RegisterCatalog();
        const inspection = await scheduleInspection(
          {
            establishmentId,
            assignedUserId: ps007Field.id,
            scheduledAt: '2026-11-11T08:00:00.000Z',
          },
          ps007Commander,
        );
        await startInspection(inspection.id, ps007Field);
        const started = await prisma.inspection.findUniqueOrThrow({
          where: { id: inspection.id },
        });
        await saveChecklistResponses(
          {
            inspectionId: inspection.id,
            responses: [
              { key: 'license', value: 'valid' },
              { key: 'security', value: 'needs_action' },
            ],
            baseVersion: started.version,
          },
          ps007Field,
        );
        await expect(
          saveChecklistResponses(
            {
              inspectionId: inspection.id,
              responses: [
                { key: 'license', value: 'stale' },
                { key: 'security', value: 'stale' },
              ],
              baseVersion: started.version,
            },
            ps007Field,
          ),
        ).rejects.toThrow('STALE_OFFLINE_COMMAND');

        const finding = await recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'security',
            description: 'Khong dam bao dieu kien an ninh.',
            result: 'needs_action',
          },
          ps007Field,
        );
        const first = await submitRecommendation(
          {
            inspectionId: inspection.id,
            findingIds: [finding.id],
            action: 'Tam dinh chi',
            reason: 'Can bo sung dieu kien an toan.',
          },
          ps007Field,
        );
        await expect(
          rejectRecommendation(inspection.id, first.id, ps007Commander, '  '),
        ).rejects.toThrow('REJECTION_REASON_REQUIRED');
        const rejected = await rejectRecommendation(
          inspection.id,
          first.id,
          ps007Commander,
          'Chua du can cu de phe duyet.',
        );
        expect(rejected).toMatchObject({ status: 'rejected' });
        await expect(
          approveRecommendation(inspection.id, first.id, ps007Commander),
        ).rejects.toThrow('RECOMMENDATION_ALREADY_DECIDED');

        const revised = await submitRecommendation(
          {
            inspectionId: inspection.id,
            findingIds: [finding.id],
            action: 'Theo doi bo sung',
            reason: 'Can kiem tra lai sau khac phuc.',
          },
          ps007Field,
        );
        expect(revised.id).not.toBe(first.id);
        const approved = await approveRecommendation(
          inspection.id,
          revised.id,
          ps007Commander,
        );
        expect(approved).toMatchObject({ status: 'approved' });
        const history = await prisma.enforcementRecommendation.findMany({
          where: { inspectionId: inspection.id },
          orderBy: { createdAt: 'asc' },
        });
        expect(history.map(({ status }) => status)).toEqual([
          'rejected',
          'approved',
        ]);
        const events = await prisma.eventRecord.findMany({
          where: { aggregateType: 'Inspection', aggregateId: inspection.id },
          orderBy: { aggregateVersion: 'asc' },
          select: { eventType: true },
        });
        expect(events.map(({ eventType }) => eventType)).toContain(
          'EnforcementRecommendationSubmitted',
        );
        expect(events.map(({ eventType }) => eventType)).toContain(
          'EnforcementRejected',
        );
        expect(events.map(({ eventType }) => eventType)).toContain(
          'EnforcementApproved',
        );

        await ps007CleanupScope();
      },
    );

    it(
      'gates Inspection access for assigned, unassigned, revoked and cross-organization users',
      { timeout: 30000 },
      async () => {
        const establishmentId = await ps007RegisterCatalog();
        const inspection = await scheduleInspection(
          {
            establishmentId,
            assignedUserId: ps007Field.id,
            scheduledAt: '2026-11-12T08:00:00.000Z',
          },
          ps007Commander,
        );

        await expect(
          getInspection(inspection.id, ps007Unassigned),
        ).rejects.toThrow('FORBIDDEN');
        await expect(getInspection(inspection.id, ps007Cross)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          getInspection(inspection.id, ps007Field),
        ).resolves.toMatchObject({
          inspection: expect.objectContaining({ id: inspection.id }),
        });

        await startInspection(inspection.id, ps007Field);
        const assignment = await prisma.assignment.findFirstOrThrow({
          where: {
            resourceType: 'Inspection',
            resourceId: inspection.id,
            assigneeUserId: ps007Field.id,
            status: 'active',
          },
        });
        await revokeAssignment(
          assignment.id,
          ps007Commander,
          'Nhiem vu ket thuc.',
        );
        await expect(
          prisma.assignment.findUniqueOrThrow({
            where: { id: assignment.id },
          }),
        ).resolves.toMatchObject({ status: 'revoked' });
        await expect(getInspection(inspection.id, ps007Field)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          getInspection(inspection.id, ps007Commander),
        ).resolves.toMatchObject({
          inspection: expect.objectContaining({ id: inspection.id }),
        });

        await ps007CleanupScope();
      },
    );

    it(
      'replays and rebuilds identical inspection and establishment read models',
      { timeout: 60000 },
      async () => {
        const establishmentId = await ps007RegisterCatalog();
        const inspection = await scheduleInspection(
          {
            establishmentId,
            assignedUserId: ps007Field.id,
            scheduledAt: '2026-11-13T08:00:00.000Z',
          },
          ps007Commander,
        );
        await expect(
          startInspection(inspection.id, ps007Commander),
        ).rejects.toThrow('FORBIDDEN');
        await startInspection(inspection.id, ps007Field);
        await processOutboxUntilIdle();

        const history = await readAggregateEvents(
          prisma,
          'Inspection',
          inspection.id,
        );
        const seen: string[] = [];
        const replayed = await replayAggregate(
          prisma,
          'Inspection',
          inspection.id,
          async (event) => {
            seen.push(event.eventId);
          },
        );
        expect(replayed).toBe(history.length);
        expect(seen).toEqual(history.map(({ eventId }) => eventId));

        const beforeInspection = await getInspection(
          inspection.id,
          ps007Commander,
        );
        const beforeEstablishment = await getEstablishment(
          establishmentId,
          ps007Commander,
        );
        await prisma.projectionRecord.deleteMany({
          where: {
            OR: [
              {
                aggregateType: 'Inspection',
                aggregateId: inspection.id,
              },
              {
                aggregateType: 'Establishment',
                aggregateId: establishmentId,
              },
            ],
          },
        });
        expect(await rebuildInspectionProjection()).toBeGreaterThan(0);
        const afterInspection = await getInspection(
          inspection.id,
          ps007Commander,
        );
        const afterEstablishment = await getEstablishment(
          establishmentId,
          ps007Commander,
        );
        expect(afterInspection.inspection).toEqual(beforeInspection.inspection);
        expect(afterEstablishment).toEqual(beforeEstablishment);

        await ps007CleanupScope();
      },
    );

    it(
      'writes no Incident, IntakeReport or Vehicle aggregates, tables or events',
      { timeout: 30000 },
      async () => {
        await expect(ps007IncidentVehicleTableCounts()).resolves.toEqual(
          ps007IncidentVehicleCounts,
        );

        const inspectionIds = await ps007InspectionIds();
        const relatedIds = [...ps007EstablishmentIds, ...inspectionIds];
        if (!relatedIds.length) return;
        const events = await prisma.eventRecord.findMany({
          where: { aggregateId: { in: relatedIds } },
          select: { aggregateType: true, eventType: true },
        });
        expect(
          events
            .map(({ aggregateType }) => aggregateType)
            .filter((aggregateType) =>
              [
                'Incident',
                'IntakeReport',
                'VehicleObservation',
                'SuspiciousVehicleRegistry',
              ].includes(aggregateType),
            ),
        ).toEqual([]);
        expect(
          events
            .map(({ eventType }) => eventType)
            .filter(
              (eventType) =>
                eventType.startsWith('Incident') ||
                eventType.startsWith('IntakeReport') ||
                eventType.startsWith('Vehicle') ||
                eventType.startsWith('SuspiciousVehicle'),
            ),
        ).toEqual([]);
      },
    );
  },
);

const psE1009Enabled = process.env.RUN_DB_TESTS === '1';
const ps009Stamp = randomUUID().slice(0, 8);
const ps009StorageRoot = `/tmp/civicos-parallel-wave-009-${ps009Stamp}`;
const ps009Storage = new LocalEvidenceStorage(ps009StorageRoot);

function ps009User(
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

const ps009Commander = ps009User(
  `pw009-commander-${ps009Stamp}`,
  ['commander'],
  PS_ORG,
);
const ps009Field = ps009User(
  `pw009-field-${ps009Stamp}`,
  ['field_officer'],
  PS_ORG,
);
const ps009Unassigned = ps009User(
  `pw009-unassigned-${ps009Stamp}`,
  ['field_officer'],
  PS_ORG,
);
const ps009Cross = ps009User(
  `pw009-cross-${ps009Stamp}`,
  ['field_officer'],
  PS_UPPER,
);
const ps009DbUsers = [ps009Commander, ps009Field, ps009Unassigned, ps009Cross];
const ps009ScopeActorIds = ps009DbUsers.map(({ id }) => id);
const ps009RegistryIds: string[] = [];
const ps009ObservationIds: string[] = [];
const ps009EvidenceIds: string[] = [];
const ps009ClientCommandIds: string[] = [];
let ps009PlateCounter = 0;
let ps009ModuleCounts: Record<string, number> = {};
let ps009VerifiedObservationId = '';

function ps009Plate(marker: string): string {
  ps009PlateCounter += 1;
  return `89${marker}${ps009Stamp.slice(0, 2).toUpperCase()}${String(ps009PlateCounter).padStart(2, '0')}`;
}

function ps009TrackRegistry(id: string): string {
  ps009RegistryIds.push(id);
  return id;
}

function ps009TrackObservation(id: string): string {
  ps009ObservationIds.push(id);
  return id;
}

async function ps009CreateRegistry(
  plate: string,
  overrides: { validFrom?: string; validUntil?: string } = {},
  actor: IdentityUser = ps009Commander,
): Promise<string> {
  const entry = await createRegistryEntry(
    {
      plate,
      source: 'To dan pho',
      reason: 'Lien quan vu viec can chu y.',
      validFrom: '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
    actor,
  );
  return ps009TrackRegistry(entry.id);
}

async function ps009PendingPhoto(tag: string, clientCommandId: string) {
  const { evidence } = await createEvidenceRecord(ps009Storage, {
    resourceType: 'VehicleObservation',
    resourceId: `pending-${clientCommandId}`,
    fileName: `${tag}.jpg`,
    mimeType: 'image/jpeg',
    bytes: new TextEncoder().encode(`pw009-photo-${ps009Stamp}-${tag}`),
    capturedAt: new Date('2026-09-19T01:00:00.000Z'),
    actorId: ps009Field.id,
    latitude: 20.96,
    longitude: 105.93,
  });
  ps009EvidenceIds.push(evidence.id);
  return evidence;
}

async function ps009ForbiddenModuleCounts(): Promise<Record<string, number>> {
  const [
    incident,
    intakeReport,
    establishment,
    inspection,
    inspectionFinding,
    enforcementRecommendation,
  ] = await Promise.all([
    prisma.incident.count(),
    prisma.intakeReport.count(),
    prisma.establishment.count(),
    prisma.inspection.count(),
    prisma.inspectionFinding.count(),
    prisma.enforcementRecommendation.count(),
  ]);
  return {
    incident,
    intakeReport,
    establishment,
    inspection,
    inspectionFinding,
    enforcementRecommendation,
  };
}

async function ps009CleanupScope(): Promise<void> {
  const vehicleEvents =
    ps009ObservationIds.length || ps009RegistryIds.length
      ? await prisma.eventRecord.findMany({
          where: {
            OR: [
              {
                aggregateType: 'VehicleObservation',
                aggregateId: { in: ps009ObservationIds },
              },
              {
                aggregateType: 'SuspiciousVehicleRegistry',
                aggregateId: { in: ps009RegistryIds },
              },
            ],
          },
          select: { eventId: true },
        })
      : [];
  const slaRows = ps009ObservationIds.length
    ? await prisma.slaInstance.findMany({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: { in: ps009ObservationIds },
        },
        select: { id: true },
      })
    : [];
  const slaIds = slaRows.map(({ id }) => id);
  const slaEvents = slaIds.length
    ? await prisma.eventRecord.findMany({
        where: { aggregateType: 'SlaInstance', aggregateId: { in: slaIds } },
        select: { eventId: true },
      })
    : [];
  const assignmentRows = await prisma.assignment.findMany({
    where: {
      OR: [
        {
          resourceType: 'VehicleObservation',
          resourceId: { in: ps009ObservationIds },
        },
        { assigneeUserId: { in: ps009ScopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const assignmentIds = assignmentRows.map(({ id }) => id);
  const assignmentEvents = assignmentIds.length
    ? await prisma.eventRecord.findMany({
        where: {
          aggregateType: 'Assignment',
          aggregateId: { in: assignmentIds },
        },
        select: { eventId: true },
      })
    : [];
  const auditRows = await prisma.auditEvent.findMany({
    where: {
      OR: [
        {
          resourceType: 'VehicleObservation',
          resourceId: { in: ps009ObservationIds },
        },
        {
          resourceType: 'SuspiciousVehicleRegistry',
          resourceId: { in: ps009RegistryIds },
        },
        { resourceId: '*', actorId: { in: ps009ScopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const auditIds = auditRows.map(({ id }) => id);
  const auditEvents = auditIds.length
    ? await prisma.eventRecord.findMany({
        where: { aggregateType: 'AuditEvent', aggregateId: { in: auditIds } },
        select: { eventId: true },
      })
    : [];
  const eventIds = [
    ...vehicleEvents.map(({ eventId }) => eventId),
    ...slaEvents.map(({ eventId }) => eventId),
    ...assignmentEvents.map(({ eventId }) => eventId),
    ...auditEvents.map(({ eventId }) => eventId),
  ];
  if (eventIds.length) {
    await prisma.notification.deleteMany({
      where: { sourceEventId: { in: eventIds } },
    });
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.eventRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }
  await prisma.projectionRecord.deleteMany({
    where: {
      OR: [
        {
          aggregateType: 'VehicleObservation',
          aggregateId: { in: ps009ObservationIds },
        },
        {
          aggregateType: 'SuspiciousVehicleRegistry',
          aggregateId: { in: ps009RegistryIds },
        },
      ],
    },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        {
          resourceType: 'VehicleObservation',
          resourceId: { in: ps009ObservationIds },
        },
        { userId: { in: ps009ScopeActorIds } },
      ],
    },
  });
  if (ps009ObservationIds.length) {
    await prisma.vehicleVerification.deleteMany({
      where: { observationId: { in: ps009ObservationIds } },
    });
  }
  if (assignmentIds.length) {
    await prisma.assignment.deleteMany({
      where: { id: { in: assignmentIds } },
    });
  }
  if (slaIds.length) {
    await prisma.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
  }
  if (auditIds.length) {
    await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
  }
  if (ps009ObservationIds.length) {
    await prisma.vehicleObservation.deleteMany({
      where: { id: { in: ps009ObservationIds } },
    });
    ps009ObservationIds.length = 0;
  }
  if (ps009RegistryIds.length) {
    await prisma.suspiciousVehicleEntry.deleteMany({
      where: { id: { in: ps009RegistryIds } },
    });
    ps009RegistryIds.length = 0;
  }
  if (ps009ClientCommandIds.length) {
    await prisma.offlineCommand.deleteMany({
      where: { clientCommandId: { in: ps009ClientCommandIds } },
    });
    ps009ClientCommandIds.length = 0;
  }
  if (ps009EvidenceIds.length) {
    const rows = await prisma.evidence.findMany({
      where: { id: { in: ps009EvidenceIds } },
      select: { id: true, storageKey: true },
    });
    for (const { storageKey } of rows) {
      await ps009Storage.remove(storageKey);
    }
    await prisma.evidence.deleteMany({
      where: { id: { in: ps009EvidenceIds } },
    });
    ps009EvidenceIds.length = 0;
  }
}

describe.skipIf(!psE1009Enabled)(
  'PS-E1-009 VehicleObservation and registry integration',
  () => {
    beforeAll(async () => {
      for (const [id, name, parentId] of [
        ['unit-cap-tren', 'Cap tren', null],
        [PS_ORG, 'Nghia Tru', 'unit-cap-tren'],
        ['unit-peer', 'Don vi ngang cap', 'unit-cap-tren'],
      ] as const) {
        await prisma.organizationUnit.upsert({
          where: { id },
          update: { active: true },
          create: { id, name, level: 'unit', parentId },
        });
      }
      for (const user of ps009DbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `pw009-hash-${ps009Stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
      }
      ps009ModuleCounts = await ps009ForbiddenModuleCounts();
    });

    afterAll(async () => {
      await ps009CleanupScope();
      await prisma.session.deleteMany({
        where: { userId: { in: ps009ScopeActorIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ps009ScopeActorIds } },
      });
      await rm(ps009StorageRoot, { recursive: true, force: true });
    });

    it(
      'runs the registry lifecycle with validity windows and single active identity',
      { timeout: 30000 },
      async () => {
        const plate = ps009Plate('L');
        const entryId = await ps009CreateRegistry(
          ` ${plate.slice(0, 3)}-${plate.slice(3)} `,
        );
        const stored = await prisma.suspiciousVehicleEntry.findUniqueOrThrow({
          where: { id: entryId },
        });
        expect(stored.plate).toBe(normalizePlate(plate));
        expect(stored).toMatchObject({
          source: 'To dan pho',
          status: 'active',
        });

        await expect(
          createRegistryEntry(
            {
              plate: `89A@${ps009Stamp.slice(0, 4)}`,
              source: 'To dan pho',
              reason: 'Ly do.',
              validFrom: '2026-01-01T00:00:00.000Z',
            },
            ps009Commander,
          ),
        ).rejects.toThrow('INVALID_PLATE');
        await expect(
          createRegistryEntry(
            {
              plate,
              source: 'To dan pho',
              reason: 'Trung lap.',
              validFrom: '2026-06-01T00:00:00.000Z',
            },
            ps009Commander,
          ),
        ).rejects.toThrow('DUPLICATE_ACTIVE_REGISTRY');
        await expect(
          updateRegistryEntry({ entryId, status: 'archived' }, ps009Commander),
        ).rejects.toThrow('INVALID_REGISTRY_STATUS');

        const expired = await updateRegistryEntry(
          { entryId, status: 'expired' },
          ps009Commander,
        );
        expect(expired.status).toBe('expired');
        const renewedId = await ps009CreateRegistry(plate, {
          validFrom: '2026-07-01T00:00:00.000Z',
        });
        expect(renewedId).not.toBe(entryId);

        const at = new Date('2026-09-19T01:00:00.000Z');
        expect(
          isRegistryActive(
            {
              status: 'active',
              validFrom: new Date('2026-01-01'),
              validUntil: null,
            },
            at,
          ),
        ).toBe(true);
        expect(
          isRegistryActive(
            {
              status: 'expired',
              validFrom: new Date('2026-01-01'),
              validUntil: null,
            },
            at,
          ),
        ).toBe(false);
        expect(
          isRegistryActive(
            {
              status: 'revoked',
              validFrom: new Date('2026-01-01'),
              validUntil: null,
            },
            at,
          ),
        ).toBe(false);
        expect(
          isRegistryActive(
            {
              status: 'active',
              validFrom: new Date('2026-09-20'),
              validUntil: null,
            },
            at,
          ),
        ).toBe(false);

        const history = await readAggregateEvents(
          prisma,
          'SuspiciousVehicleRegistry',
          entryId,
        );
        expect(history.map(({ eventType }) => eventType)).toEqual([
          'SuspiciousVehicleRegistered',
          'SuspiciousVehicleRegistryUpdated',
        ]);
      },
    );

    it(
      'records manual observations with GeoPoint and photo Evidence and suggests matches only for active entries',
      { timeout: 60000 },
      async () => {
        const activePlate = ps009Plate('A');
        const expiredPlate = ps009Plate('X');
        await ps009CreateRegistry(activePlate);
        const expiredId = await ps009CreateRegistry(expiredPlate, {
          validUntil: '2026-02-01T00:00:00.000Z',
        });
        await updateRegistryEntry(
          { entryId: expiredId, status: 'expired' },
          ps009Commander,
        );

        const probePlate = ps009Plate('M');
        await expect(
          recordVehicleObservation(
            {
              plate: `89A@${ps009Stamp.slice(0, 4)}`,
              observedAt: '2026-09-19T01:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
            },
            ps009Field,
          ),
        ).rejects.toThrow('INVALID_PLATE');
        await expect(
          recordVehicleObservation(
            {
              plate: probePlate,
              observedAt: 'not-a-time',
              latitude: 20.96,
              longitude: 105.93,
            },
            ps009Field,
          ),
        ).rejects.toThrow('OBSERVATION_FIELDS_REQUIRED');
        await expect(
          recordVehicleObservation(
            {
              plate: probePlate,
              observedAt: '2026-09-19T01:00:00.000Z',
              latitude: 91,
              longitude: 105.93,
            },
            ps009Field,
          ),
        ).rejects.toThrow('INVALID_LATITUDE');
        await expect(
          recordVehicleObservation(
            {
              plate: probePlate,
              observedAt: '2026-09-19T01:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
              evidenceIds: [randomUUID()],
            },
            ps009Field,
          ),
        ).rejects.toThrow('EVIDENCE_NOT_FOUND');

        const { evidence: document } = await createEvidenceRecord(
          ps009Storage,
          {
            resourceType: 'VehicleObservation',
            resourceId: `pending-${ps009Stamp}-text`,
            fileName: 'ghi-chu.txt',
            mimeType: 'text/plain',
            bytes: new TextEncoder().encode(`not-a-photo-${ps009Stamp}`),
            capturedAt: new Date('2026-09-19T01:00:00.000Z'),
            actorId: ps009Field.id,
          },
        );
        ps009EvidenceIds.push(document.id);
        await expect(
          recordVehicleObservation(
            {
              plate: probePlate,
              observedAt: '2026-09-19T01:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
              evidenceIds: [document.id],
            },
            ps009Field,
          ),
        ).rejects.toThrow('EVIDENCE_SCOPE_FORBIDDEN');

        const pendingCommandId = `pw009-${ps009Stamp}-m`;
        ps009ClientCommandIds.push(pendingCommandId);
        const photo = await ps009PendingPhoto('sighting', pendingCommandId);
        const { observation } = await recordVehicleObservation(
          {
            plate: activePlate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
            description: `Quan sat hien truong ${ps009Stamp}`,
            evidenceIds: [photo.id],
            clientCommandId: pendingCommandId,
          },
          ps009Field,
        );
        ps009TrackObservation(observation.id);
        expect(observation).toMatchObject({
          status: 'match_suggested',
          plate: normalizePlate(activePlate),
        });
        expect(isMatchSuggestion(observation.status)).toBe(true);
        expect(observation.matchedRegistryId).toBeTruthy();
        expect(observation.evidenceIds).toEqual([photo.id]);
        await expect(
          prisma.auditEvent.findFirstOrThrow({
            where: {
              resourceType: 'VehicleObservation',
              resourceId: observation.id,
              operation: 'vehicle_observation.created',
            },
          }),
        ).resolves.toMatchObject({
          metadata: { evidenceIds: [photo.id] },
        });

        const stale = await recordVehicleObservation(
          {
            plate: expiredPlate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(stale.observation.id);
        expect(stale).toMatchObject({ match: null });
        expect(stale.observation.status).toBe('recorded');

        const unknown = await recordVehicleObservation(
          {
            plate: ps009Plate('U'),
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(unknown.observation.id);
        expect(unknown.observation.status).toBe('recorded');

        const staleEvents = await readAggregateEvents(
          prisma,
          'VehicleObservation',
          stale.observation.id,
        );
        expect(staleEvents.map(({ eventType }) => eventType)).toEqual([
          'VehicleObservationRecorded',
        ]);
        const matchedEvents = await readAggregateEvents(
          prisma,
          'VehicleObservation',
          observation.id,
        );
        expect(matchedEvents.map(({ eventType }) => eventType)).toEqual([
          'VehicleObservationRecorded',
          'SuspiciousVehicleMatched',
        ]);
        expect(
          matchedEvents.map(({ aggregateVersion }) => aggregateVersion),
        ).toEqual([1, 2]);

        const suggestion = await prisma.notification.findFirst({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
          },
        });
        expect(suggestion).toMatchObject({ type: 'vehicle_match_suggested' });
      },
    );

    it(
      'requires authorized confirmation before verification or escalation and rejects stale transitions',
      { timeout: 30000 },
      async () => {
        const plate = ps009Plate('C');
        await ps009CreateRegistry(plate);
        const { observation } = await recordVehicleObservation(
          {
            plate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(observation.id);

        expect(() => assertVehicleMatchConfirmation('match_suggested')).toThrow(
          'MATCH_CONFIRMATION_REQUIRED',
        );
        expect(() =>
          assertVehicleMatchConfirmation('match_confirmed'),
        ).not.toThrow();

        await expect(
          confirmVehicleMatch(observation.id, ps009Unassigned),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          verifyVehicleObservation(
            {
              observationId: observation.id,
              result: 'Chu xe: Nguyen Van A.',
              notes: 'Doi chieu.',
            },
            ps009Field,
          ),
        ).rejects.toThrow('MATCH_CONFIRMATION_REQUIRED');
        await expect(
          escalateVehicleObservation(observation.id, ps009Field, PS_UPPER),
        ).rejects.toThrow('MATCH_CONFIRMATION_REQUIRED');

        const current = await prisma.vehicleObservation.findUniqueOrThrow({
          where: { id: observation.id },
        });
        await expect(
          confirmVehicleMatch(observation.id, ps009Field, {
            baseVersion: current.version - 1,
          }),
        ).rejects.toThrow('STALE_OBSERVATION');
        const confirmed = await confirmVehicleMatch(
          observation.id,
          ps009Field,
          { baseVersion: current.version },
        );
        expect(confirmed.status).toBe('match_confirmed');
        await expect(
          confirmVehicleMatch(observation.id, ps009Field),
        ).rejects.toThrow('MATCH_NOT_PENDING');
      },
    );

    it(
      'verifies with owner lookup and photo Evidence without mutating the observation',
      { timeout: 60000 },
      async () => {
        const plate = ps009Plate('V');
        await ps009CreateRegistry(plate);
        const { observation } = await recordVehicleObservation(
          {
            plate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(observation.id);
        await confirmVehicleMatch(observation.id, ps009Field);
        ps009VerifiedObservationId = observation.id;

        const sla = await prisma.slaInstance.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            kind: 'vehicle_escalation_2h',
          },
        });
        expect(sla.dueAt.toISOString()).toBe(
          vehicleEscalationDueAt(
            new Date('2026-09-19T01:00:00.000Z'),
          ).toISOString(),
        );

        const foreign = await ps009PendingPhoto(
          'foreign-verify',
          `pw009-${ps009Stamp}-foreign`,
        );
        await expect(
          verifyVehicleObservation(
            {
              observationId: observation.id,
              result: 'Chu xe: Tran Thi B.',
              notes: 'Kiem tra ngoai pham vi.',
              evidenceIds: [foreign.id],
            },
            ps009Field,
          ),
        ).rejects.toThrow('EVIDENCE_SCOPE_FORBIDDEN');

        const { evidence: proof } = await createEvidenceRecord(ps009Storage, {
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          fileName: 'verify.jpg',
          mimeType: 'image/jpeg',
          bytes: new TextEncoder().encode(`pw009-verify-${ps009Stamp}`),
          capturedAt: new Date('2026-09-19T02:00:00.000Z'),
          actorId: ps009Commander.id,
          latitude: 20.961,
          longitude: 105.931,
        });
        ps009EvidenceIds.push(proof.id);
        const verified = await verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Chu xe: Tran Thi B.',
            notes: 'Doi chieu so dang ky, khong ket luan vi pham.',
            ownerLookup: 'Tra cuu dang ky: Tran Thi B, dia chi X.',
            latitude: 20.961,
            longitude: 105.931,
            evidenceIds: [proof.id],
          },
          ps009Field,
        );
        expect(verified.verification).toMatchObject({
          verifiedById: ps009Field.id,
          result: 'Chu xe: Tran Thi B.',
          ownerLookup: 'Tra cuu dang ky: Tran Thi B, dia chi X.',
        });
        const stored = await prisma.vehicleObservation.findUniqueOrThrow({
          where: { id: observation.id },
        });
        expect(stored).toMatchObject({
          status: 'verified',
          plate: observation.plate,
          observedAt: observation.observedAt,
        });
        expect(stored.evidenceIds).toEqual(observation.evidenceIds);
        const verificationAudit = await prisma.auditEvent.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            operation: 'vehicle_verification.recorded',
          },
        });
        expect(verificationAudit.metadata).toMatchObject({
          evidenceIds: [proof.id],
        });

        const events = await readAggregateEvents(
          prisma,
          'VehicleObservation',
          observation.id,
        );
        expect(events.map(({ eventType }) => eventType)).toEqual([
          'VehicleObservationRecorded',
          'SuspiciousVehicleMatched',
          'SuspiciousVehicleMatchConfirmed',
          'VehicleVerificationRecorded',
        ]);
        expect(events.map(({ aggregateVersion }) => aggregateVersion)).toEqual([
          1, 2, 3, 4,
        ]);

        const nullablePlate = ps009Plate('N');
        await ps009CreateRegistry(nullablePlate);
        const second = await recordVehicleObservation(
          {
            plate: nullablePlate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(second.observation.id);
        await confirmVehicleMatch(second.observation.id, ps009Field);
        const verifiedNull = await verifyVehicleObservation(
          {
            observationId: second.observation.id,
            result: 'Chu xe: chua tra cuu.',
            notes: 'Ghi nhan hien truong, khong ket luan vi pham.',
          },
          ps009Field,
        );
        expect(verifiedNull.verification.ownerLookup).toBeNull();
      },
    );

    it(
      'escalates with organization scope and holds the continuous two-hour SLA without duplicating side effects',
      { timeout: 60000 },
      async () => {
        const plate = ps009Plate('E');
        await ps009CreateRegistry(plate);
        const { observation } = await recordVehicleObservation(
          {
            plate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(observation.id);
        await confirmVehicleMatch(observation.id, ps009Field);

        await expect(
          escalateVehicleObservation(observation.id, ps009Field, 'unit-peer'),
        ).rejects.toThrow('ORGANIZATION_SCOPE_FORBIDDEN');
        const first = await escalateVehicleObservation(
          observation.id,
          ps009Field,
          PS_UPPER,
        );
        expect(first.status).toBe('escalated');
        const second = await escalateVehicleObservation(
          observation.id,
          ps009Field,
          PS_UPPER,
        );
        expect(second.id).toBe(first.id);
        expect(
          await prisma.eventRecord.count({
            where: {
              aggregateType: 'VehicleObservation',
              aggregateId: observation.id,
              eventType: 'VehicleEscalated',
            },
          }),
        ).toBe(1);

        const saturday = new Date('2026-09-19T01:00:00.000Z');
        expect(saturday.getUTCDay()).toBe(6);
        const weekend = await recordVehicleObservation(
          {
            plate: ps009Plate('S'),
            observedAt: saturday.toISOString(),
            latitude: 20.96,
            longitude: 105.93,
          },
          ps009Field,
        );
        ps009TrackObservation(weekend.observation.id);
        const weekendSla = await prisma.slaInstance.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: weekend.observation.id,
            kind: 'vehicle_escalation_2h',
          },
        });
        expect(weekendSla.dueAt.toISOString()).toBe('2026-09-19T03:00:00.000Z');

        await markOverdue(new Date('2026-09-19T03:00:01.000Z'));
        await markOverdue(new Date('2026-09-19T03:00:01.000Z'));
        expect(
          await prisma.slaInstance.findUniqueOrThrow({
            where: { id: weekendSla.id },
          }),
        ).toMatchObject({ status: 'overdue' });
        expect(
          await prisma.eventRecord.count({
            where: {
              aggregateType: 'SlaInstance',
              aggregateId: weekendSla.id,
              eventType: 'SlaOverdue',
            },
          }),
        ).toBe(1);

        await processOutboxUntilIdle();
        await processOutboxUntilIdle();
        const overdueEvent = await prisma.eventRecord.findFirstOrThrow({
          where: {
            aggregateType: 'SlaInstance',
            aggregateId: weekendSla.id,
            eventType: 'SlaOverdue',
          },
        });
        const replayed = await createInAppNotification({
          userId: ps009Field.id,
          type: 'sla_overdue',
          title: 'SLA qua han',
          body: 'Thu lai.',
          resourceType: 'VehicleObservation',
          resourceId: weekend.observation.id,
          sourceEventId: overdueEvent.eventId,
        });
        const duplicate = await createInAppNotification({
          userId: ps009Field.id,
          type: 'sla_overdue',
          title: 'SLA qua han',
          body: 'Thu lai.',
          resourceType: 'VehicleObservation',
          resourceId: weekend.observation.id,
          sourceEventId: overdueEvent.eventId,
        });
        expect(duplicate.id).toBe(replayed.id);
      },
    );

    it(
      'keeps offline sync idempotent with stale protection and assignment-scoped access',
      { timeout: 60000 },
      async () => {
        const clientCommandId = `pw009-${ps009Stamp}-offline`;
        ps009ClientCommandIds.push(clientCommandId);
        const payload = {
          clientCommandId,
          actorId: ps009Commander.id,
          commandType: 'vehicle.record_observation',
          resourceType: 'VehicleObservation',
          occurredAt: new Date(),
          payload: {},
        };
        const first = await acceptOfflineCommand(payload);
        expect((await acceptOfflineCommand(payload)).id).toBe(first.id);
        await expect(
          acceptOfflineCommand({
            ...payload,
            commandType: 'vehicle.verify_observation',
          }),
        ).rejects.toThrow('CLIENT_COMMAND_ID_CONFLICT');

        expect(() => assertOfflineCommandFresh(3, 4)).toThrow(
          'STALE_OFFLINE_COMMAND',
        );
        expect(() => assertOfflineCommandFresh(3, 3)).not.toThrow();

        const duplicateCommandId = `pw009-${ps009Stamp}-dup`;
        ps009ClientCommandIds.push(duplicateCommandId);
        const duplicatePlate = ps009Plate('D');
        const attempts = await Promise.allSettled([
          recordVehicleObservation(
            {
              plate: duplicatePlate,
              observedAt: '2026-09-19T04:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
              clientCommandId: duplicateCommandId,
            },
            ps009Field,
          ),
          recordVehicleObservation(
            {
              plate: duplicatePlate,
              observedAt: '2026-09-19T04:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
              clientCommandId: duplicateCommandId,
            },
            ps009Field,
          ),
        ]);
        const succeeded = attempts.filter(
          ({ status }) => status === 'fulfilled',
        );
        expect(succeeded).toHaveLength(2);
        const ids = succeeded.map(
          (outcome) =>
            (
              outcome as PromiseFulfilledResult<{
                observation: { id: string };
              }>
            ).value.observation.id,
        );
        expect(ids[0]).toBe(ids[1]);
        ps009TrackObservation(ids[0]);
        expect(
          await prisma.eventRecord.count({
            where: {
              aggregateType: 'VehicleObservation',
              aggregateId: ids[0],
              eventType: 'VehicleObservationRecorded',
            },
          }),
        ).toBe(1);

        await expect(getObservation(ids[0], ps009Unassigned)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(getObservation(ids[0], ps009Cross)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(getObservation(ids[0], ps009Field)).resolves.toMatchObject(
          {
            observation: expect.objectContaining({ id: ids[0] }),
          },
        );

        const assignmentRows = await prisma.assignment.findMany({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: ids[0],
            assigneeUserId: ps009Field.id,
            status: 'active',
          },
        });
        expect(assignmentRows.length).toBeGreaterThan(0);
        for (const row of assignmentRows) {
          await revokeAssignment(row.id, ps009Commander, 'Nhiem vu ket thuc.');
        }
        await expect(
          prisma.assignment.count({
            where: {
              resourceType: 'VehicleObservation',
              resourceId: ids[0],
              assigneeUserId: ps009Field.id,
              status: 'active',
            },
          }),
        ).resolves.toBe(0);
        await expect(getObservation(ids[0], ps009Field)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          getObservation(ids[0], ps009Commander),
        ).resolves.toMatchObject({
          observation: expect.objectContaining({ id: ids[0] }),
        });
      },
    );

    it(
      'keeps the mock camera adapter deterministic with no external Camera, LPR or network calls',
      { timeout: 30000 },
      async () => {
        const first = getMockCameraObservations();
        const second = getMockCameraObservations();
        expect(second).toEqual(first);
        expect(first.length).toBeGreaterThan(0);
        expect(MOCK_CAMERA_FIXTURES.map(({ plate }) => plate)).toEqual(
          first.map(({ plate }) => plate),
        );
        expect(isMockCameraAvailable({ available: false })).toBe(false);
        const unavailable = createMockCameraAdapter({ available: false });
        expect(unavailable).toMatchObject({
          available: false,
          manualInputAvailable: true,
        });
        expect(unavailable.observations).toEqual([]);
        const available = createMockCameraAdapter({ available: true });
        expect(available).toMatchObject({
          available: true,
          manualInputAvailable: true,
        });
        expect(available.observations).toEqual(getMockCameraObservations());

        const adapterSource = readFileSync(
          path.join(
            process.cwd(),
            'src',
            'modules',
            'vehicles',
            'mock-camera-adapter.ts',
          ),
          'utf8',
        );
        expect(adapterSource).not.toMatch(/fetch\s*\(/);
        expect(adapterSource).not.toMatch(/XMLHttpRequest/);
        expect(adapterSource).not.toMatch(/WebSocket/);
        expect(adapterSource).not.toMatch(/node:(https?|net|http)/);
        expect(adapterSource).not.toMatch(/from ['"]https?:/);
        expect(adapterSource).not.toMatch(/LPR/);

        const commandSource = readFileSync(
          path.join(process.cwd(), 'src', 'modules', 'vehicles', 'commands.ts'),
          'utf8',
        );
        expect(commandSource).not.toMatch(/mock-camera/);
        expect(commandSource).not.toMatch(/MockCamera/);
        expect(commandSource).not.toMatch(/fetch\s*\(/);
        expect(commandSource).not.toMatch(/LPR/);
      },
    );

    it(
      'projects and replays the vehicle read models deterministically',
      { timeout: 60000 },
      async () => {
        expect(ps009VerifiedObservationId).toBeTruthy();
        await processOutboxUntilIdle();

        const projected = await getObservation(
          ps009VerifiedObservationId,
          ps009Commander,
        );
        expect(projected.observation).toMatchObject({
          id: ps009VerifiedObservationId,
          status: 'verified',
        });

        const history = await readAggregateEvents(
          prisma,
          'VehicleObservation',
          ps009VerifiedObservationId,
        );
        expect(history.map(({ eventType }) => eventType)).toEqual([
          'VehicleObservationRecorded',
          'SuspiciousVehicleMatched',
          'SuspiciousVehicleMatchConfirmed',
          'VehicleVerificationRecorded',
        ]);

        const seen: string[] = [];
        const replayed = await replayAggregate(
          prisma,
          'VehicleObservation',
          ps009VerifiedObservationId,
          async (event) => {
            seen.push(event.eventId);
          },
        );
        expect(replayed).toBe(history.length);
        expect(seen).toEqual(history.map(({ eventId }) => eventId));

        const before = await getObservation(
          ps009VerifiedObservationId,
          ps009Commander,
        );
        const observationsBefore = await listObservations(ps009Commander);
        expect(JSON.stringify(observationsBefore)).toContain(
          ps009VerifiedObservationId,
        );
        const registryBefore = await listRegistry(ps009Commander);
        expect(registryBefore.length).toBeGreaterThan(0);

        await prisma.projectionRecord.deleteMany({
          where: {
            OR: [
              { aggregateType: 'VehicleObservation' },
              { aggregateType: 'SuspiciousVehicleRegistry' },
            ],
          },
        });
        expect(await rebuildVehicleProjection()).toBeGreaterThan(0);

        const after = await getObservation(
          ps009VerifiedObservationId,
          ps009Commander,
        );
        expect(after).toEqual(before);
        const observationsAfter = await listObservations(ps009Commander);
        expect(JSON.stringify(observationsAfter)).toContain(
          ps009VerifiedObservationId,
        );
        const registryAfter = await listRegistry(ps009Commander);
        const registryBeforeById = new Map(
          registryBefore.map((entry) => [
            String((entry as { id: unknown }).id),
            entry,
          ]),
        );
        const registryAfterById = new Map(
          registryAfter.map((entry) => [
            String((entry as { id: unknown }).id),
            entry,
          ]),
        );
        for (const trackedId of ps009RegistryIds) {
          expect(registryAfterById.has(trackedId)).toBe(true);
          if (registryBeforeById.has(trackedId)) {
            expect(registryAfterById.get(trackedId)).toEqual(
              registryBeforeById.get(trackedId),
            );
          }
        }
      },
    );

    it(
      'writes no Incident, IntakeReport, Establishment, Inspection, Finding or Recommendation aggregates, tables or events',
      { timeout: 30000 },
      async () => {
        await expect(ps009ForbiddenModuleCounts()).resolves.toEqual(
          ps009ModuleCounts,
        );

        const assignmentRows = await prisma.assignment.findMany({
          where: { resourceId: { in: ps009ObservationIds } },
          select: { id: true },
        });
        const auditRows = await prisma.auditEvent.findMany({
          where: {
            OR: [
              {
                resourceType: 'VehicleObservation',
                resourceId: { in: ps009ObservationIds },
              },
              {
                resourceType: 'SuspiciousVehicleRegistry',
                resourceId: { in: ps009RegistryIds },
              },
            ],
          },
          select: { id: true },
        });
        const slaRows = await prisma.slaInstance.findMany({
          where: { resourceId: { in: ps009ObservationIds } },
          select: { id: true },
        });
        const relatedIds = [
          ...ps009ObservationIds,
          ...ps009RegistryIds,
          ...assignmentRows.map(({ id }) => id),
          ...auditRows.map(({ id }) => id),
          ...slaRows.map(({ id }) => id),
        ];
        const events = await prisma.eventRecord.findMany({
          where: { aggregateId: { in: relatedIds } },
          select: { aggregateType: true, eventType: true },
        });
        expect(events.length).toBeGreaterThan(0);
        expect(
          events
            .map(({ aggregateType }) => aggregateType)
            .filter((aggregateType) =>
              [
                'Incident',
                'IntakeReport',
                'Establishment',
                'Inspection',
              ].includes(aggregateType),
            ),
        ).toEqual([]);
        expect(
          events
            .map(({ eventType }) => eventType)
            .filter(
              (eventType) =>
                eventType.startsWith('Incident') ||
                eventType.startsWith('IntakeReport') ||
                eventType.startsWith('Establishment') ||
                eventType.startsWith('Inspection') ||
                eventType.startsWith('Enforcement'),
            ),
        ).toEqual([]);
      },
    );
  },
);
