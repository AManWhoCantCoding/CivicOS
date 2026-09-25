import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import {
  completeInspection,
  getInspection,
  listInspections,
  registerEstablishment,
  saveChecklistResponses,
  scheduleInspection,
  startInspection,
  rebuildInspectionProjection,
} from '@/modules/inspections';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const databaseTestTimeoutMs = 15_000;
const fixtureStamp = randomUUID().slice(0, 8);
const recurringEstablishmentType = `nhà nghỉ-${fixtureStamp}`;

const actor: IdentityUser = {
  id: 'inspection-schedule-test-actor',
  email: 'inspection-schedule-test@civicos.local',
  name: 'Inspection schedule test actor',
  roles: ['commander'],
  organizationUnitId: 'unit-nghia-tru',
};

const fieldActor: IdentityUser = {
  id: 'inspection-schedule-test-field',
  email: 'inspection-schedule-test-field@civicos.local',
  name: 'Inspection schedule test field officer',
  roles: ['field_officer'],
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
      where: { establishmentType: recurringEstablishmentType },
    });
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    establishmentId = undefined;
  });

  beforeAll(async () => {
    await prisma.assignment.deleteMany({
      where: { assigneeUserId: fieldActor.id },
    });
    await prisma.user.deleteMany({ where: { id: fieldActor.id } });
    await prisma.user.create({
      data: {
        id: fieldActor.id,
        email: fieldActor.email,
        name: fieldActor.name,
        passwordHash: 'inspection-schedule-test-hash',
        organizationUnitId: fieldActor.organizationUnitId,
      },
    });
    const role = await prisma.role.upsert({
      where: { name: 'field_officer' },
      update: {},
      create: { name: 'field_officer' },
    });
    await prisma.userRole.create({
      data: { userId: fieldActor.id, roleId: role.id },
    });
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({
      where: { assigneeUserId: fieldActor.id },
    });
    await prisma.user.delete({ where: { id: fieldActor.id } });
  });

  it(
    'creates the next configured occurrence after completion',
    async () => {
      const establishment = await registerEstablishment(
        {
          name: `Nhà nghỉ lịch định kỳ ${fixtureStamp}`,
          ownerName: 'Chủ cơ sở',
          address: `Địa chỉ kiểm tra lịch định kỳ ${fixtureStamp}`,
          type: recurringEstablishmentType,
        },
        actor,
      );
      establishmentId = establishment.id;

      const first = await scheduleInspection(
        {
          establishmentId,
          assignedUserId: fieldActor.id,
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

      await startInspection(first.id, fieldActor);
      await saveChecklistResponses(
        {
          inspectionId: first.id,
          responses: [
            { key: 'license', value: 'valid' },
            { key: 'security', value: 'valid' },
          ],
        },
        fieldActor,
      );
      await completeInspection(
        { inspectionId: first.id, result: 'pass' },
        fieldActor,
      );
      await rebuildInspectionProjection();
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
    },
    databaseTestTimeoutMs,
  );

  it(
    'allows the assigned field officer to read an active inspection',
    async () => {
      const establishment = await registerEstablishment(
        {
          name: `Nhà nghỉ đọc inspection ${fixtureStamp}`,
          ownerName: 'Chủ cơ sở',
          address: `Địa chỉ đọc inspection ${fixtureStamp}`,
          type: recurringEstablishmentType,
        },
        actor,
      );
      establishmentId = establishment.id;

      const inspection = await scheduleInspection(
        {
          establishmentId,
          assignedUserId: fieldActor.id,
          scheduledAt: '2030-01-15T10:00:00.000Z',
        },
        actor,
      );

      await expect(
        getInspection(inspection.id, fieldActor),
      ).resolves.toMatchObject({
        inspection: expect.objectContaining({ id: inspection.id }),
      });
    },
    databaseTestTimeoutMs,
  );
});
