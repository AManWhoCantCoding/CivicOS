import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { processOutboxUntilIdle } from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  approveIncident,
  closeIncident,
  classifyIncident,
  getIncident,
  registerIntakeReport,
  resolveIncident,
  startVerification,
  transferIncident,
} from '@/modules/incidents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

const actor: IdentityUser = {
  id: 'approval-test-actor',
  email: 'approval-test@civicos.local',
  name: 'Approval test actor',
  roles: ['commander'],
  organizationUnitId: 'unit-nghia-tru',
};

let intakeReportId: string | undefined;
let incidentId: string | undefined;

describe.skipIf(!postgresEnabled)('Incident Approval PostgreSQL seam', () => {
  afterEach(async () => {
    if (!intakeReportId || !incidentId) return;
    const [audits, slas] = await Promise.all([
      prisma.auditEvent.findMany({
        where: {
          OR: [
            { resourceType: 'Incident', resourceId: incidentId },
            { resourceType: 'IntakeReport', resourceId: intakeReportId },
          ],
        },
        select: { id: true },
      }),
      prisma.slaInstance.findMany({
        where: { resourceType: 'Incident', resourceId: incidentId },
        select: { id: true },
      }),
    ]);
    const eventRecords = await prisma.eventRecord.findMany({
      where: {
        OR: [
          { aggregateType: 'Incident', aggregateId: incidentId },
          { aggregateType: 'IntakeReport', aggregateId: intakeReportId },
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
      where: { aggregateType: 'Incident', aggregateId: incidentId },
    });
    await prisma.approval.deleteMany({
      where: { resourceType: 'Incident', resourceId: incidentId },
    });
    await prisma.auditEvent.deleteMany({
      where: { id: { in: audits.map(({ id }) => id) } },
    });
    await prisma.slaInstance.deleteMany({
      where: { id: { in: slas.map(({ id }) => id) } },
    });
    await prisma.incident.deleteMany({ where: { id: incidentId } });
    await prisma.intakeReport.deleteMany({ where: { id: intakeReportId } });
    intakeReportId = undefined;
    incidentId = undefined;
  });

  it(
    'requires and records approval for transfer, resolution, and closure',
    { timeout: 30000 },
    async () => {
      const registered = await registerIntakeReport(
        {
          channel: 'manual_other',
          receivedAt: new Date().toISOString(),
          content: 'Approval workflow test',
          idempotencyKey: `approval-test:${Date.now()}`,
        },
        actor,
      );
      intakeReportId = registered.reportId;
      incidentId = registered.incidentId;

      await classifyIncident(incidentId, actor, 'test', 'medium');
      await startVerification(incidentId, actor, 'ready for review');

      const transfer = await transferIncident(
        incidentId,
        actor,
        'unit-cap-tren',
      );
      expect(transfer.approval.status).toBe('pending');
      expect(transfer.incident.status).toBe('verifying');

      const transferred = await approveIncident(
        incidentId,
        transfer.approval.id,
        actor,
      );
      expect(transferred.incident.status).toBe('transferred');

      const resolution = await resolveIncident(
        incidentId,
        actor,
        'Đã hoàn tất xác minh.',
      );
      const resolved = await approveIncident(
        incidentId,
        resolution.approval.id,
        actor,
      );
      expect(resolved.incident.status).toBe('resolved');

      const closure = await closeIncident(incidentId, actor);
      const closed = await approveIncident(
        incidentId,
        closure.approval.id,
        actor,
      );
      expect(closed.incident.status).toBe('closed');

      const events = await prisma.eventRecord.findMany({
        where: { aggregateType: 'Incident', aggregateId: incidentId },
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
      const detail = await getIncident(incidentId, actor);
      expect(detail.incident).toMatchObject({
        id: incidentId,
        status: 'closed',
        description: 'Approval workflow test',
      });
      await expect(
        getIncident(incidentId, {
          ...actor,
          organizationUnitId: 'unit-cap-tren',
        }),
      ).rejects.toThrow('FORBIDDEN');
    },
  );

  it('binds approval decisions to the incident and organization scope', async () => {
    const registered = await registerIntakeReport(
      {
        channel: 'manual_other',
        receivedAt: new Date().toISOString(),
        content: 'Approval scope test',
        idempotencyKey: `approval-scope-test:${Date.now()}`,
      },
      actor,
    );
    intakeReportId = registered.reportId;
    incidentId = registered.incidentId;

    await classifyIncident(incidentId, actor, 'test', 'medium');
    await startVerification(incidentId, actor);
    const transfer = await transferIncident(incidentId, actor, 'unit-cap-tren');

    await expect(
      approveIncident('another-incident', transfer.approval.id, actor),
    ).rejects.toThrow('APPROVAL_RESOURCE_MISMATCH');
    await expect(
      approveIncident(incidentId, transfer.approval.id, {
        ...actor,
        organizationUnitId: 'unit-cap-tren',
      }),
    ).rejects.toThrow('FORBIDDEN');

    const pending = await prisma.approval.findUnique({
      where: { id: transfer.approval.id },
    });
    expect(pending?.status).toBe('pending');
  });
});
