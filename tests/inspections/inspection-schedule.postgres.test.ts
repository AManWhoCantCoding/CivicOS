import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { processOutboxUntilIdle } from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  completeInspection,
  listInspections,
  registerEstablishment,
  saveChecklistResponses,
  scheduleInspection,
  startInspection,
} from '@/modules/inspections';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

const actor: IdentityUser = {
  id: 'inspection-schedule-test-actor',
  email: 'inspection-schedule-test@civicos.local',
  name: 'Inspection schedule test actor',
  roles: ['commander'],
  organizationUnitId: 'unit-nghia-tru',
};

let establishmentId: string | undefined;

describe.skipIf(!postgresEnabled)('Inspection schedule PostgreSQL seam', () => {
  afterEach(async () => {
    if (!establishmentId) return;
    const inspections = await prisma.inspection.findMany({
      where: { establishmentId },
      select: { id: true },
    });
    const inspectionIds = inspections.map(({ id }) => id);
    const [audits, slas] = await Promise.all([
      prisma.auditEvent.findMany({
        where: {
          OR: [
            { resourceType: 'Establishment', resourceId: establishmentId },
            { resourceType: 'Inspection', resourceId: { in: inspectionIds } },
          ],
        },
        select: { id: true },
      }),
      prisma.slaInstance.findMany({
        where: {
          resourceType: 'Inspection',
          resourceId: { in: inspectionIds },
        },
        select: { id: true },
      }),
    ]);
    const eventRecords = await prisma.eventRecord.findMany({
      where: {
        OR: [
          { aggregateType: 'Establishment', aggregateId: establishmentId },
          { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
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
      where: { eventId: { in: eventRecords.map(({ eventId }) => eventId) } },
    });
    await prisma.projectionRecord.deleteMany({
      where: {
        OR: [
          { aggregateType: 'Establishment', aggregateId: establishmentId },
          { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
        ],
      },
    });
    await prisma.inspectionFinding.deleteMany({
      where: { inspectionId: { in: inspectionIds } },
    });
    await prisma.enforcementRecommendation.deleteMany({
      where: { inspectionId: { in: inspectionIds } },
    });
    await prisma.auditEvent.deleteMany({
      where: { id: { in: audits.map(({ id }) => id) } },
    });
    await prisma.slaInstance.deleteMany({
      where: { id: { in: slas.map(({ id }) => id) } },
    });
    await prisma.inspection.deleteMany({
      where: { id: { in: inspectionIds } },
    });
    await prisma.checklistTemplate.deleteMany({
      where: { establishmentType: 'nhà nghỉ' },
    });
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    establishmentId = undefined;
  });

  it('creates the next configured occurrence after completion', async () => {
    const establishment = await registerEstablishment(
      {
        name: 'Nhà nghỉ lịch định kỳ',
        ownerName: 'Chủ cơ sở',
        address: 'Địa chỉ kiểm tra lịch định kỳ',
        type: 'nhà nghỉ',
      },
      actor,
    );
    establishmentId = establishment.id;

    const first = await scheduleInspection(
      {
        establishmentId,
        scheduledAt: '2026-01-01T08:00:00.000Z',
        cadenceMonths: 6,
      },
      actor,
    );
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: first.templateId },
    });
    expect(template?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'security',
          label: expect.stringContaining('lưu trú'),
        }),
      ]),
    );

    await startInspection(first.id, actor);
    await saveChecklistResponses(
      {
        inspectionId: first.id,
        responses: [
          { key: 'license', value: 'valid' },
          { key: 'security', value: 'valid' },
        ],
      },
      actor,
    );
    await completeInspection({ inspectionId: first.id, result: 'pass' }, actor);
    await processOutboxUntilIdle();

    const next = await prisma.inspection.findUnique({
      where: {
        establishmentId_scheduledAt: {
          establishmentId,
          scheduledAt: new Date('2026-07-01T08:00:00.000Z'),
        },
      },
    });
    expect(next).toMatchObject({
      status: 'scheduled',
      cadenceMonths: 6,
      templateVersion: first.templateVersion,
    });
    expect(
      (await listInspections(actor)).find(({ id }) => id === next?.id),
    ).toMatchObject({ scheduleState: 'overdue' });
  });
});
