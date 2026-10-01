import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import { createAssignments } from '@/modules/identity';
import { createEvidence, LocalEvidenceStorage } from '@/modules/platform';
import {
  closeIntakeReport,
  confirmIntakeReport,
  convertIntakeToIncident,
  getIntakeReport,
  listIntakeReports,
  processIntakeReport,
  registerIncident,
  registerIntakeReport,
  rejectIntakeReport,
  transferIntakeReport,
  approveIntakeTransfer,
  verifyIntakeReport,
} from '@/modules/incidents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = `unit-intake-${stamp}`;
const UPPER = `unit-intake-upper-${stamp}`;

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

const duty = userRef(`intake-duty-${stamp}`, ['duty_officer'], ORG);
const commander = userRef(`intake-commander-${stamp}`, ['commander'], ORG);
const approver = userRef(`intake-approver-${stamp}`, ['commander'], ORG);
const fieldOfficer = userRef(`intake-field-${stamp}`, ['field_officer'], ORG);
const crossCommander = userRef(`intake-cross-${stamp}`, ['commander'], UPPER);

const trackedReportIds: string[] = [];
const trackedIncidentIds: string[] = [];
const trackedEvidenceIds: string[] = [];

const validIntake = (overrides: Record<string, unknown> = {}) => ({
  sourceChannel: 'direct' as const,
  receivedAt: new Date().toISOString(),
  content: `Intake separation probe ${stamp}`,
  ...overrides,
});

async function cleanupTracked(): Promise<void> {
  if (
    !trackedReportIds.length &&
    !trackedIncidentIds.length &&
    !trackedEvidenceIds.length
  )
    return;
  const evidence = await prisma.evidence.findMany({
    where: { id: { in: trackedEvidenceIds } },
    select: { id: true, storageKey: true },
  });
  const storage = new LocalEvidenceStorage();
  for (const item of evidence) await storage.remove(item.storageKey);
  if (trackedEvidenceIds.length) {
    await prisma.evidence.deleteMany({
      where: { id: { in: trackedEvidenceIds } },
    });
  }
  const audits = await prisma.auditEvent.findMany({
    where: {
      OR: [
        ...trackedReportIds.map((resourceId) => ({
          resourceType: 'IntakeReport',
          resourceId,
        })),
        ...trackedIncidentIds.map((resourceId) => ({
          resourceType: 'Incident',
          resourceId,
        })),
      ],
    },
    select: { id: true },
  });
  const auditIds = audits.map(({ id }) => id);
  const slas = await prisma.slaInstance.findMany({
    where: {
      OR: [
        ...trackedReportIds.map((resourceId) => ({
          resourceType: 'IntakeReport',
          resourceId,
        })),
        ...trackedIncidentIds.map((resourceId) => ({
          resourceType: 'Incident',
          resourceId,
        })),
      ],
    },
    select: { id: true },
  });
  const slaIds = slas.map(({ id }) => id);
  const events = await prisma.eventRecord.findMany({
    where: {
      OR: [
        ...trackedReportIds.map((aggregateId) => ({
          aggregateType: 'IntakeReport',
          aggregateId,
        })),
        ...trackedIncidentIds.map((aggregateId) => ({
          aggregateType: 'Incident',
          aggregateId,
        })),
        ...(auditIds.length
          ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
          : []),
        ...(slaIds.length
          ? [{ aggregateType: 'SlaInstance', aggregateId: { in: slaIds } }]
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
    await prisma.auditEvent.deleteMany({
      where: { id: { in: auditIds } },
    });
  }
  if (slaIds.length) {
    await prisma.slaInstance.deleteMany({
      where: { id: { in: slaIds } },
    });
  }
  await prisma.notification.deleteMany({
    where: {
      OR: [
        ...trackedReportIds.map((resourceId) => ({
          resourceType: 'IntakeReport',
          resourceId,
        })),
        ...trackedIncidentIds.map((resourceId) => ({
          resourceType: 'Incident',
          resourceId,
        })),
      ],
    },
  });
  await prisma.approval.deleteMany({
    where: {
      OR: [
        ...trackedReportIds.map((resourceId) => ({
          resourceType: 'IntakeReport',
          resourceId,
        })),
        ...trackedIncidentIds.map((resourceId) => ({
          resourceType: 'Incident',
          resourceId,
        })),
      ],
    },
  });
  await prisma.assignment.deleteMany({
    where: {
      OR: [
        ...trackedIncidentIds.map((resourceId) => ({
          resourceType: 'Incident',
          resourceId,
        })),
        ...trackedReportIds.map((resourceId) => ({
          resourceType: 'IntakeReport',
          resourceId,
        })),
      ],
    },
  });
  if (trackedIncidentIds.length) {
    await prisma.projectionRecord.deleteMany({
      where: { aggregateId: { in: trackedIncidentIds } },
    });
    await prisma.incident.deleteMany({
      where: { id: { in: trackedIncidentIds } },
    });
  }
  if (trackedReportIds.length) {
    await prisma.intakeReport.deleteMany({
      where: { id: { in: trackedReportIds } },
    });
  }
  trackedReportIds.length = 0;
  trackedIncidentIds.length = 0;
  trackedEvidenceIds.length = 0;
}

async function registerProbe(
  actor: IdentityUser,
  overrides: Record<string, unknown> = {},
) {
  const registered = await registerIntakeReport(
    {
      ...validIntake(),
      idempotencyKey: `intake-sep:${stamp}:${randomUUID()}`,
      ...overrides,
    },
    actor,
  );
  trackedReportIds.push(registered.reportId);
  if (registered.incidentId) {
    trackedIncidentIds.push(registered.incidentId);
  }
  return registered;
}

describe.skipIf(!postgresEnabled)(
  'IntakeReport separation PostgreSQL seam',
  () => {
    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ORG, name: 'Intake test unit', level: 'commune' },
          { id: UPPER, name: 'Intake upper unit', level: 'district' },
        ],
      });
      const roles = ['duty_officer', 'commander', 'field_officer'] as const;
      const roleIds: Record<string, string> = {};
      for (const name of roles) {
        const role = await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        roleIds[name] = role.id;
      }
      const seeds = [
        { user: duty, role: 'duty_officer' },
        { user: commander, role: 'commander' },
        { user: approver, role: 'commander' },
        { user: fieldOfficer, role: 'field_officer' },
        { user: crossCommander, role: 'commander' },
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
              duty.id,
              commander.id,
              approver.id,
              fieldOfficer.id,
              crossCommander.id,
            ],
          },
        },
      });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [ORG, UPPER] } },
      });
    });

    it('creates only an IntakeReport on intake with RECEIVED status and no Incident', async () => {
      const { reportId, incidentId } = await registerProbe(duty, {
        sourceName: 'Nguyen Van A',
        sourceContact: '0900000001',
        sensitiveRef: `INTAKE-SECRET-${stamp}`,
      });
      expect(incidentId).toBeNull();

      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.status).toBe('RECEIVED');
      expect(stored.sourceChannel).toBe('direct');
      expect(stored.incidentId).toBeNull();
      expect(await prisma.incident.count({ where: { id: reportId } })).toBe(0);

      const events = await prisma.eventRecord.findMany({
        where: { aggregateType: 'IntakeReport', aggregateId: reportId },
        orderBy: { aggregateVersion: 'asc' },
      });
      expect(events.map(({ eventType }) => eventType)).toEqual([
        'IntakeReportReceived',
      ]);

      const slas = await prisma.slaInstance.findMany({
        where: { resourceType: 'IntakeReport', resourceId: reportId },
      });
      expect(slas.map(({ kind }) => kind).sort()).toEqual(
        [
          'intake_recording_24h',
          'intake_result_notification_20d',
          'intake_verification_48h',
        ].sort(),
      );
      const receivedAt = stored.receivedAt.getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      for (const sla of slas) {
        if (sla.kind === 'intake_recording_24h') {
          expect(sla.dueAt.getTime()).toBe(receivedAt + dayMs);
        }
        if (sla.kind === 'intake_verification_48h') {
          expect(sla.dueAt.getTime()).toBe(receivedAt + 2 * dayMs);
        }
        if (sla.kind === 'intake_result_notification_20d') {
          expect(sla.dueAt.getTime()).toBe(receivedAt + 20 * dayMs);
        }
      }

      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: reportId,
            operation: 'intake.created',
          },
        }),
      ).resolves.toBe(1);
    });

    it('creates a minimal IntakeReport with all intake side effects', async () => {
      const registered = await registerIntakeReport(
        {
          sourceChannel: 'direct',
          receivedAt: new Date().toISOString(),
          content: `Minimal intake ${stamp}`,
        },
        duty,
      );
      trackedReportIds.push(registered.reportId);

      expect(registered.incidentId).toBeNull();
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'IntakeReport',
            aggregateId: registered.reportId,
            eventType: 'IntakeReportReceived',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: registered.reportId,
            operation: 'intake.created',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.slaInstance.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: registered.reportId,
          },
        }),
      ).toBe(3);
      expect(
        await prisma.notification.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: registered.reportId,
            type: 'intake_received',
          },
        }),
      ).toBe(1);
    });

    it('maps legacy channel input at the boundary without persisting legacy values', async () => {
      const { reportId } = await registerProbe(duty, {
        channel: 'in_person',
        sourceChannel: undefined,
      });
      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.channel).toBeNull();
      expect(stored.sourceChannel).toBe('direct');
    });

    it('creates a standalone Incident through the source-compatible direct path', async () => {
      const marker = `Direct incident probe ${stamp}`;
      const { incidentId } = await registerIncident(
        { description: marker },
        duty,
      );
      trackedIncidentIds.push(incidentId);
      const stored = await prisma.incident.findUniqueOrThrow({
        where: { id: incidentId },
      });
      expect(stored.status).toBe('received');
      expect(stored.intakeReportId).toBeNull();
      expect(stored.description).toBe(marker);
      const events = await prisma.eventRecord.findMany({
        where: { aggregateType: 'Incident', aggregateId: incidentId },
        orderBy: { aggregateVersion: 'asc' },
      });
      expect(events.map(({ eventType }) => eventType)).toEqual([
        'IncidentRegistered',
      ]);
      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'Incident',
            resourceId: incidentId,
            operation: 'incident.created',
          },
        }),
      ).resolves.toBe(1);
      await expect(
        prisma.slaInstance.count({
          where: {
            resourceType: 'Incident',
            resourceId: incidentId,
            kind: 'incident_classification_24h',
          },
        }),
      ).resolves.toBe(1);
      await expect(
        prisma.notification.count({
          where: {
            resourceType: 'Incident',
            resourceId: incidentId,
            type: 'incident_created',
          },
        }),
      ).resolves.toBe(1);
      await expect(
        registerIncident({ description: marker }, fieldOfficer),
      ).rejects.toThrow('FORBIDDEN');
    });

    it('rejects intake from roles outside the intake boundary', async () => {
      await expect(registerProbe(fieldOfficer)).rejects.toThrow('FORBIDDEN');
    });

    it('creates exactly one Incident only after explicit confirmation', async () => {
      const { reportId } = await registerProbe(duty);
      await expect(convertIntakeToIncident(reportId, duty)).rejects.toThrow(
        'INTAKE_CONFIRMATION_REQUIRED',
      );
      await verifyIntakeReport(reportId, duty, {
        classification: 'sufficient',
        verificationNote: 'Da xuong hien truong xac minh.',
      });

      await expect(convertIntakeToIncident(reportId, duty)).rejects.toThrow(
        'INTAKE_CONFIRMATION_REQUIRED',
      );
      const confirmed = await confirmIntakeReport(reportId, duty, {
        idempotencyKey: `confirm:${reportId}`,
      });
      expect(confirmed.report.incidentId).toBeNull();
      await expect(
        confirmIntakeReport(reportId, duty, {
          idempotencyKey: `confirm:${reportId}`,
        }),
      ).resolves.toMatchObject({ report: { incidentId: null } });
      const converted = await convertIntakeToIncident(reportId, duty, {
        idempotencyKey: `convert:${reportId}`,
      });
      expect(converted.incidentId).toBeTruthy();
      if (converted.incidentId) {
        trackedIncidentIds.push(converted.incidentId);
      }

      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.status).toBe('PROCESSED');
      expect(stored.incidentId).toBe(converted.incidentId);
      const incidents = await prisma.incident.findMany({
        where: { id: converted.incidentId },
      });
      expect(incidents).toHaveLength(1);
      expect(incidents[0].intakeReportId).toBe(reportId);

      const reportEvents = await prisma.eventRecord.findMany({
        where: { aggregateType: 'IntakeReport', aggregateId: reportId },
        orderBy: { aggregateVersion: 'asc' },
      });
      expect(reportEvents.map(({ eventType }) => eventType)).toEqual([
        'IntakeReportReceived',
        'IntakeReportVerified',
        'IntakeReportConvertedToIncident',
      ]);
      const incidentEvents = await prisma.eventRecord.findMany({
        where: { aggregateType: 'Incident', aggregateId: converted.incidentId },
      });
      expect(incidentEvents.map(({ eventType }) => eventType)).toEqual([
        'IncidentRegistered',
      ]);
    });

    it('persists IntakeReport Evidence and returns the linkage in detail', async () => {
      const { reportId } = await registerProbe(duty);
      const evidence = await createEvidence(new LocalEvidenceStorage(), {
        resourceType: 'IntakeReport',
        resourceId: reportId,
        fileName: 'intake-proof.txt',
        mimeType: 'text/plain',
        bytes: new TextEncoder().encode(`Evidence probe ${stamp}`),
        capturedAt: new Date(),
        actorId: duty.id,
      });
      trackedEvidenceIds.push(evidence.id);

      await expect(
        prisma.evidence.findUnique({ where: { id: evidence.id } }),
      ).resolves.toMatchObject({
        id: evidence.id,
        resourceType: 'IntakeReport',
        resourceId: reportId,
      });

      const detail = await getIntakeReport(reportId, duty);
      expect(detail.evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: evidence.id,
            resourceType: 'IntakeReport',
            resourceId: reportId,
          }),
        ]),
      );
    });

    it('returns the same Incident without duplicate events on repeated convert', async () => {
      const { reportId } = await registerProbe(duty);
      await verifyIntakeReport(reportId, duty, {
        classification: 'needs_verification',
      });
      await confirmIntakeReport(reportId, duty);
      const first = await convertIntakeToIncident(reportId, commander);
      if (first.incidentId) trackedIncidentIds.push(first.incidentId);
      const before = await prisma.eventRecord.count({
        where: {
          OR: [
            { aggregateType: 'IntakeReport', aggregateId: reportId },
            { aggregateType: 'Incident', aggregateId: first.incidentId },
          ],
        },
      });
      const second = await convertIntakeToIncident(reportId, commander);
      expect(second.incidentId).toBe(first.incidentId);
      await expect(
        prisma.eventRecord.count({
          where: {
            OR: [
              { aggregateType: 'IntakeReport', aggregateId: reportId },
              { aggregateType: 'Incident', aggregateId: first.incidentId },
            ],
          },
        }),
      ).resolves.toBe(before);
    });

    it('serializes concurrent converts with different keys to one authoritative result', async () => {
      const { reportId } = await registerProbe(duty);
      await verifyIntakeReport(reportId, duty, {
        classification: 'sufficient',
      });
      await confirmIntakeReport(reportId, duty);
      const results = await Promise.all([
        convertIntakeToIncident(reportId, duty, {
          idempotencyKey: `convert-race-a:${reportId}`,
        }),
        convertIntakeToIncident(reportId, commander, {
          idempotencyKey: `convert-race-b:${reportId}`,
        }),
      ]);
      const incidentId = results[0].incidentId;
      expect(incidentId).toBeTruthy();
      expect(results[1].incidentId).toBe(incidentId);
      if (incidentId) trackedIncidentIds.push(incidentId);
      expect(
        await prisma.incident.count({ where: { intakeReportId: reportId } }),
      ).toBe(1);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'IntakeReport',
            aggregateId: reportId,
            eventType: 'IntakeReportConvertedToIncident',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: reportId,
            operation: 'intake.converted',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.intakeCommand.count({
          where: { reportId, command: 'convert_to_incident' },
        }),
      ).toBe(2);
      expect(
        (
          await prisma.intakeReport.findUniqueOrThrow({
            where: { id: reportId },
          })
        ).incidentId,
      ).toBe(incidentId);
    });

    it('serializes concurrent confirms and replays the authoritative result', async () => {
      const sameKey = await registerProbe(duty);
      await verifyIntakeReport(sameKey.reportId, duty, {
        classification: 'sufficient',
      });
      const sameKeyIdempotencyKey = `confirm-race-same:${sameKey.reportId}`;
      const sameKeyResults = await Promise.all([
        confirmIntakeReport(sameKey.reportId, duty, {
          idempotencyKey: sameKeyIdempotencyKey,
        }),
        confirmIntakeReport(sameKey.reportId, duty, {
          idempotencyKey: sameKeyIdempotencyKey,
        }),
      ]);
      expect(sameKeyResults[1]).toEqual(sameKeyResults[0]);
      expect(
        await prisma.intakeCommand.count({
          where: { reportId: sameKey.reportId, command: 'confirm' },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: sameKey.reportId,
            operation: 'intake.confirmed',
          },
        }),
      ).toBe(1);
      const sameKeyAudits = await prisma.auditEvent.findMany({
        where: {
          resourceType: 'IntakeReport',
          resourceId: sameKey.reportId,
          operation: 'intake.confirmed',
        },
        select: { id: true },
      });
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'AuditEvent',
            aggregateId: { in: sameKeyAudits.map(({ id }) => id) },
          },
        }),
      ).toBe(1);

      const differentKey = await registerProbe(duty);
      await verifyIntakeReport(differentKey.reportId, duty, {
        classification: 'sufficient',
      });
      const differentKeyResults = await Promise.all([
        confirmIntakeReport(differentKey.reportId, duty, {
          idempotencyKey: `confirm-race-a:${differentKey.reportId}`,
        }),
        confirmIntakeReport(differentKey.reportId, commander, {
          idempotencyKey: `confirm-race-b:${differentKey.reportId}`,
        }),
      ]);
      expect(differentKeyResults[1].report).toEqual(
        differentKeyResults[0].report,
      );
      expect(
        await prisma.intakeCommand.count({
          where: { reportId: differentKey.reportId, command: 'confirm' },
        }),
      ).toBe(2);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: differentKey.reportId,
            operation: 'intake.confirmed',
          },
        }),
      ).toBe(1);
      const differentKeyAudits = await prisma.auditEvent.findMany({
        where: {
          resourceType: 'IntakeReport',
          resourceId: differentKey.reportId,
          operation: 'intake.confirmed',
        },
        select: { id: true },
      });
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'AuditEvent',
            aggregateId: { in: differentKeyAudits.map(({ id }) => id) },
          },
        }),
      ).toBe(1);
    });

    it('returns the same IntakeReport on idempotency retry without duplicates', async () => {
      const key = `intake-sep-idempotent:${stamp}`;
      const first = await registerProbe(duty, { idempotencyKey: key });
      const before = await Promise.all([
        prisma.intakeReport.count({ where: { idempotencyKey: key } }),
        prisma.eventRecord.count({
          where: { aggregateType: 'IntakeReport', aggregateId: first.reportId },
        }),
      ]);
      const second = await registerIntakeReport(
        { ...validIntake(), idempotencyKey: key },
        duty,
      );
      expect(second.reportId).toBe(first.reportId);
      expect(second.incidentId).toBeNull();
      await expect(
        Promise.all([
          prisma.intakeReport.count({ where: { idempotencyKey: key } }),
          prisma.eventRecord.count({
            where: {
              aggregateType: 'IntakeReport',
              aggregateId: first.reportId,
            },
          }),
        ]),
      ).resolves.toEqual(before);
    });

    it('rejects invalid lifecycle moves with stable error codes', async () => {
      const { reportId } = await registerProbe(duty);
      await expect(closeIntakeReport(reportId, duty)).rejects.toThrow(
        'INVALID_INTAKE_TRANSITION',
      );
      await expect(
        processIntakeReport(reportId, duty, { processedNote: 'Som.' }),
      ).rejects.toThrow('INVALID_INTAKE_TRANSITION');
      await verifyIntakeReport(reportId, duty, {
        classification: 'sufficient',
      });
      await processIntakeReport(reportId, duty, {
        processedNote: 'Da xu ly.',
      });
      await expect(
        rejectIntakeReport(reportId, duty, { reason: 'Muon.' }),
      ).rejects.toThrow('INVALID_INTAKE_TRANSITION');
      await closeIntakeReport(reportId, duty, { resultNote: 'Xong.' });
      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.status).toBe('CLOSED');
    });

    it('keeps transfer pending until an independent approver decides', async () => {
      const { reportId } = await registerProbe(duty);
      await expect(
        transferIntakeReport(reportId, duty, { organizationId: UPPER }),
      ).rejects.toThrow('FORBIDDEN');
      const requested = await transferIntakeReport(reportId, commander, {
        organizationId: UPPER,
        reason: 'Vuot tham quyen xa.',
      });
      expect(requested.approval.status).toBe('pending');
      await expect(
        approveIntakeTransfer(reportId, requested.approval.id, commander),
      ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
      const transferred = await approveIntakeTransfer(
        reportId,
        requested.approval.id,
        approver,
      );
      expect(transferred.approval.status).toBe('approved');
      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.transferToId).toBe(UPPER);
      const events = await prisma.eventRecord.findMany({
        where: { aggregateType: 'IntakeReport', aggregateId: reportId },
        orderBy: { aggregateVersion: 'asc' },
      });
      expect(events.map(({ eventType }) => eventType)).toContain(
        'IntakeReportTransferred',
      );
      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: reportId,
            operation: 'intake.transferred',
          },
        }),
      ).resolves.toBe(1);
      await expect(
        transferIntakeReport(reportId, commander, { organizationId: ORG }),
      ).rejects.toThrow('RECEIVING_ORGANIZATION_INVALID');
    });

    it('denies reveal to a commander without a read_sensitive grant', async () => {
      const marker = `INTAKE-PII-${stamp}`;
      const { reportId } = await registerProbe(duty, {
        sourceName: marker,
        sourceContact: '0900000002',
        sensitiveRef: marker,
      });

      const asCommander = await getIntakeReport(reportId, commander);
      expect(asCommander.report.revealed).toBe(false);
      expect(asCommander.report.sourceName).not.toContain(marker);
      expect(JSON.stringify(asCommander)).not.toContain(marker);

      const asDuty = await getIntakeReport(reportId, duty);
      expect(asDuty.report.revealed).toBe(false);
      expect(asDuty.report.sourceName).not.toContain(marker);
      expect(JSON.stringify(asDuty)).not.toContain(marker);

      const listed = await listIntakeReports(duty, {});
      const match = listed.find(({ id }) => id === reportId);
      expect(match).toBeDefined();
      expect(match?.revealed).toBe(false);
      expect(JSON.stringify(match)).not.toContain(marker);

      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(String(stored.sourceName)).not.toContain(marker);
    });

    it('reveals only through a policy read_sensitive grant with audit', async () => {
      const marker = `INTAKE-GRANT-${stamp}`;
      const { reportId } = await registerProbe(duty, {
        sourceName: marker,
        sourceContact: '0900000003',
        sensitiveRef: marker,
      });
      await createAssignments(
        {
          resourceType: 'IntakeReport',
          resourceId: reportId,
          task: 'incident_verification',
          assigneeUserIds: [commander.id],
          organizationId: ORG,
        },
        commander,
      );

      const asCommander = await getIntakeReport(reportId, commander);
      expect(asCommander.report.revealed).toBe(true);
      expect(asCommander.report.sourceName).toBe(marker);
      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'IntakeReport',
            resourceId: reportId,
            operation: 'intake.sensitive_reveal',
          },
        }),
      ).resolves.toBe(1);

      const asDuty = await getIntakeReport(reportId, duty);
      expect(asDuty.report.revealed).toBe(false);
      expect(JSON.stringify(asDuty)).not.toContain(marker);
    });

    it('denies cross-unit intake reads', async () => {
      const { reportId } = await registerProbe(duty);
      await expect(getIntakeReport(reportId, crossCommander)).rejects.toThrow(
        'FORBIDDEN',
      );
    });
  },
);
