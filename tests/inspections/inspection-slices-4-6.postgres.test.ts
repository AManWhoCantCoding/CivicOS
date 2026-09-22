import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { processOutboxUntilIdle } from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  acceptOfflineCommand,
  createEvidence,
  LocalEvidenceStorage,
  markOverdue,
} from '@/modules/platform';
import { createAssignments } from '@/modules/identity';
import {
  approveRecommendation,
  completeInspection,
  getInspection,
  listInspections,
  recordFinding,
  registerEstablishment,
  rejectRecommendation,
  saveChecklistResponses,
  scheduleInspection,
  startInspection,
  submitRecommendation,
} from '@/modules/inspections';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const databaseTestTimeoutMs = 15_000;
const stamp = randomUUID().slice(0, 8);
const orgId = 'unit-nghia-tru';
const storageRoot = `/tmp/civicos-inspection-s46-${stamp}`;

const commander: IdentityUser = {
  id: `ps007-s46-${stamp}-commander`,
  email: `ps007-s46-${stamp}-commander@civicos.local`,
  name: 'PS007 slice 4-6 commander',
  roles: ['commander', 'field_officer'],
  organizationUnitId: orgId,
};

const fieldOfficer: IdentityUser = {
  id: `ps007-s46-${stamp}-field`,
  email: `ps007-s46-${stamp}-field@civicos.local`,
  name: 'PS007 slice 4-6 field officer',
  roles: ['field_officer'],
  organizationUnitId: orgId,
};

const unassignedOfficer: IdentityUser = {
  id: `ps007-s46-${stamp}-unassigned`,
  email: `ps007-s46-${stamp}-unassigned@civicos.local`,
  name: 'PS007 slice 4-6 unassigned officer',
  roles: ['field_officer'],
  organizationUnitId: orgId,
};

const otherOrgOfficer: IdentityUser = {
  id: `ps007-s46-${stamp}-other`,
  email: `ps007-s46-${stamp}-other@civicos.local`,
  name: 'PS007 slice 4-6 other org officer',
  roles: ['field_officer'],
  organizationUnitId: 'unit-other',
};

const establishmentIds: string[] = [];
const clientCommandIds: string[] = [];
const evidenceIds: string[] = [];
const templateTypes: string[] = [];

function trackEstablishment(id: string): string {
  establishmentIds.push(id);
  return id;
}

function karaokeType(): string {
  const type = `karaoke-kinh-doanh-${stamp}`;
  if (!templateTypes.includes(type)) templateTypes.push(type);
  return type;
}

async function registerCatalog(
  overrides: Record<string, unknown> = {},
  actor: IdentityUser = commander,
) {
  const marker = randomUUID().slice(0, 8);
  const establishment = await registerEstablishment(
    {
      name: `Co so s46 ${stamp} ${marker}`,
      ownerName: 'Chu co so',
      address: `Dia chi s46 ${stamp} ${marker}`,
      type: karaokeType(),
      ...(overrides as object),
    },
    actor,
  );
  return trackEstablishment(establishment.id);
}

async function scheduleAt(establishmentId: string, scheduledAt: string) {
  const inspection = await scheduleInspection(
    { establishmentId, assignedUserId: fieldOfficer.id, scheduledAt },
    commander,
  );
  await createAssignments(
    {
      resourceType: 'Inspection',
      resourceId: inspection.id,
      task: 'inspection_fieldwork',
      assigneeUserIds: [commander.id],
      organizationId: orgId,
    },
    commander,
  );
  return inspection;
}

describe.skipIf(!postgresEnabled)(
  'PS-E1-007 slices 4-6 PostgreSQL seam',
  () => {
    beforeAll(async () => {
      for (const user of [commander, fieldOfficer, unassignedOfficer]) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `s46-hash-${stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
        for (const roleName of user.roles) {
          const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
          });
          await prisma.userRole.create({
            data: { userId: user.id, roleId: role.id },
          });
        }
      }
    });

    afterAll(async () => {
      await prisma.session.deleteMany({
        where: {
          userId: { in: [commander.id, fieldOfficer.id, unassignedOfficer.id] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [commander.id, fieldOfficer.id, unassignedOfficer.id] },
        },
      });
    });

    afterEach(async () => {
      if (!establishmentIds.length) return;
      const inspections = await prisma.inspection.findMany({
        where: { establishmentId: { in: establishmentIds } },
        select: { id: true },
      });
      const inspectionIds = inspections.map(({ id }) => id);
      const recommendations = inspectionIds.length
        ? await prisma.enforcementRecommendation.findMany({
            where: { inspectionId: { in: inspectionIds } },
            select: { id: true },
          })
        : [];
      const recommendationIds = recommendations.map(({ id }) => id);
      const [audits, assignments, slas] = await Promise.all([
        prisma.auditEvent.findMany({
          where: {
            OR: [
              {
                resourceType: 'Establishment',
                resourceId: { in: establishmentIds },
              },
              { resourceType: 'Inspection', resourceId: { in: inspectionIds } },
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
              aggregateId: { in: establishmentIds },
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
              aggregateId: { in: establishmentIds },
            },
            { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
          ],
        },
      });
      if (inspectionIds.length) {
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
      if (clientCommandIds.length) {
        await prisma.offlineCommand.deleteMany({
          where: { clientCommandId: { in: clientCommandIds } },
        });
        clientCommandIds.length = 0;
      }
      if (evidenceIds.length) {
        await prisma.evidence.deleteMany({
          where: { id: { in: evidenceIds } },
        });
        evidenceIds.length = 0;
      }
      if (inspectionIds.length) {
        await prisma.inspection.deleteMany({
          where: { id: { in: inspectionIds } },
        });
      }
      if (templateTypes.length) {
        await prisma.checklistTemplate.deleteMany({
          where: { establishmentType: { in: templateTypes } },
        });
      }
      await prisma.establishment.deleteMany({
        where: { id: { in: establishmentIds } },
      });
      establishmentIds.length = 0;
    });

    it('validates catalog fields and GeoPoint, blocking duplicate active records', async () => {
      const establishmentId = await registerCatalog();
      const source = await prisma.establishment.findUniqueOrThrow({
        where: { id: establishmentId },
      });
      expect(source).toMatchObject({ active: true });

      await expect(
        registerEstablishment(
          {
            name: source.name,
            ownerName: 'Chu co so khac',
            address: source.address,
            type: karaokeType(),
          },
          commander,
        ),
      ).rejects.toThrow('DUPLICATE_ESTABLISHMENT');

      await expect(
        registerEstablishment(
          {
            name: ' ',
            ownerName: 'Chu',
            address: 'Dia chi',
            type: karaokeType(),
          },
          commander,
        ),
      ).rejects.toThrow('ESTABLISHMENT_FIELDS_REQUIRED');

      await expect(
        registerEstablishment(
          {
            name: `Co so le ${stamp}`,
            ownerName: 'Chu',
            address: `Dia chi le ${stamp}`,
            type: karaokeType(),
            latitude: 20.9,
          },
          commander,
        ),
      ).rejects.toThrow('GEOPOINT_INCOMPLETE');

      await expect(
        registerEstablishment(
          {
            name: `Co so le ${stamp}`,
            ownerName: 'Chu',
            address: `Dia chi le ${stamp}`,
            type: karaokeType(),
            latitude: 91,
            longitude: 105,
          },
          commander,
        ),
      ).rejects.toThrow('INVALID_LATITUDE');
    });

    it('rejects duplicate schedule commands and emits InspectionScheduled exactly once', async () => {
      const establishmentId = await registerCatalog();
      const scheduledAt = '2026-10-01T08:00:00.000Z';

      const first = await scheduleAt(establishmentId, scheduledAt);
      await expect(scheduleAt(establishmentId, scheduledAt)).rejects.toThrow(
        'DUPLICATE_SCHEDULE',
      );

      const raced = await Promise.allSettled([
        scheduleAt(establishmentId, '2026-10-02T08:00:00.000Z'),
        scheduleAt(establishmentId, '2026-10-02T08:00:00.000Z'),
      ]);
      const fulfilled = raced.filter(({ status }) => status === 'fulfilled');
      const rejected = raced.filter(({ status }) => status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason?.message).toContain(
        'DUPLICATE_SCHEDULE',
      );

      expect(
        await prisma.inspection.count({
          where: { establishmentId, scheduledAt: new Date(scheduledAt) },
        }),
      ).toBe(1);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'Inspection',
            aggregateId: first.id,
            eventType: 'InspectionScheduled',
          },
        }),
      ).toBe(1);
    });

    it(
      'runs a continuous seven-day SLA and surfaces due/overdue schedules',
      async () => {
        const establishmentId = await registerCatalog();
        const scheduledAt = new Date('2026-09-19T08:00:00.000Z');
        expect(scheduledAt.getUTCDay()).toBe(6);

        const inspection = await scheduleAt(
          establishmentId,
          scheduledAt.toISOString(),
        );
        const sla = await prisma.slaInstance.findFirstOrThrow({
          where: {
            resourceType: 'Inspection',
            resourceId: inspection.id,
            kind: 'inspection_completion_7d',
          },
        });
        expect(sla.dueAt.toISOString()).toBe('2026-09-26T08:00:00.000Z');
        expect(sla.dueAt.getUTCDay()).toBe(6);

        const future = await scheduleAt(
          establishmentId,
          '2099-01-01T08:00:00.000Z',
        );
        const past = await scheduleAt(
          establishmentId,
          '2026-01-05T08:00:00.000Z',
        );
        await processOutboxUntilIdle();
        const view = await listInspections(commander);
        expect(view.find(({ id }) => id === future.id)).toMatchObject({
          scheduleState: 'upcoming',
        });
        expect(view.find(({ id }) => id === past.id)).toMatchObject({
          scheduleState: 'overdue',
        });

        await markOverdue(new Date('2026-09-27T08:00:01.000Z'));
        expect(
          await prisma.slaInstance.findUniqueOrThrow({ where: { id: sla.id } }),
        ).toMatchObject({ status: 'overdue' });

        await startInspection(inspection.id, commander);
        await saveChecklistResponses(
          {
            inspectionId: inspection.id,
            responses: [
              { key: 'license', value: 'valid' },
              { key: 'security', value: 'valid' },
            ],
          },
          commander,
        );
        await completeInspection(
          { inspectionId: inspection.id, result: 'pass' },
          commander,
        );
        expect(
          await prisma.slaInstance.findUniqueOrThrow({ where: { id: sla.id } }),
        ).toMatchObject({ status: 'completed' });
      },
      databaseTestTimeoutMs,
    );

    it('picks type-specific templates and snapshots the version', async () => {
      const karaokeId = await registerCatalog({ type: karaokeType() });
      const nghiType = `nhà nghỉ lưu trú-${stamp}`;
      templateTypes.push(nghiType);
      const nghiMarker = randomUUID().slice(0, 8);
      const nghi = await registerEstablishment(
        {
          name: `Nha nghi s46 ${stamp} ${nghiMarker}`,
          ownerName: 'Chu nha nghi',
          address: `Dia chi nghi ${stamp} ${nghiMarker}`,
          type: nghiType,
        },
        commander,
      );
      trackEstablishment(nghi.id);
      const defaultType = `cam do dich vu-${stamp}`;
      templateTypes.push(defaultType);
      const defaultMarker = randomUUID().slice(0, 8);
      const generic = await registerEstablishment(
        {
          name: `Cam do s46 ${stamp} ${defaultMarker}`,
          ownerName: 'Chu tiem',
          address: `Dia chi tiem ${stamp} ${defaultMarker}`,
          type: defaultType,
        },
        commander,
      );
      trackEstablishment(generic.id);

      const [karaoke, nghiStay, genericStay] = await Promise.all([
        scheduleAt(karaokeId, '2026-11-01T08:00:00.000Z'),
        scheduleAt(nghi.id, '2026-11-01T08:00:00.000Z'),
        scheduleAt(generic.id, '2026-11-01T08:00:00.000Z'),
      ]);
      const templates = await prisma.checklistTemplate.findMany({
        where: {
          id: {
            in: [
              karaoke.templateId,
              nghiStay.templateId,
              genericStay.templateId,
            ],
          },
        },
      });
      const byId = new Map(
        templates.map((template) => [template.id, template]),
      );
      const karaokeItems = JSON.stringify(byId.get(karaoke.templateId)?.items);
      const nghiItems = JSON.stringify(byId.get(nghiStay.templateId)?.items);
      const genericItems = JSON.stringify(
        byId.get(genericStay.templateId)?.items,
      );
      expect(karaokeItems).not.toBe(nghiItems);
      expect(karaokeItems).not.toBe(genericItems);
      expect(nghiItems).toContain('lưu trú');

      await prisma.checklistTemplate.create({
        data: {
          establishmentType: karaokeType(),
          version: 2,
          title: `Checklist ${karaokeType()} v2`,
          items: [{ key: 'license', label: 'Giay phep v2', required: true }],
        },
      });
      const later = await scheduleAt(karaokeId, '2026-12-01T08:00:00.000Z');
      expect(later.templateVersion).toBe(1);
      expect(later.templateId).toBe(karaoke.templateId);
    });

    it('requires mandatory checklist items and configured Evidence before completion', async () => {
      const establishmentId = await registerCatalog();
      const inspection = await scheduleAt(
        establishmentId,
        '2026-11-05T08:00:00.000Z',
      );
      await startInspection(inspection.id, commander);

      await expect(
        completeInspection(
          { inspectionId: inspection.id, result: 'pass' },
          commander,
        ),
      ).rejects.toThrow('CHECKLIST_ITEM_REQUIRED');

      await expect(
        saveChecklistResponses(
          {
            inspectionId: inspection.id,
            responses: [
              { key: 'license', value: 'valid' },
              { key: 'security', value: ' ' },
            ],
          },
          commander,
        ),
      ).rejects.toThrow('CHECKLIST_ITEM_REQUIRED:security');
      await expect(
        completeInspection(
          { inspectionId: inspection.id, result: 'pass' },
          commander,
        ),
      ).rejects.toThrow('CHECKLIST_ITEM_REQUIRED:license');

      const template = await prisma.checklistTemplate.findUniqueOrThrow({
        where: { id: inspection.templateId },
      });
      const items = (
        template.items as unknown as Array<Record<string, unknown>>
      ).map((item) =>
        item.key === 'security' ? { ...item, evidenceRequired: true } : item,
      );
      await prisma.checklistTemplate.update({
        where: { id: template.id },
        data: { items: items as unknown as never },
      });
      await saveChecklistResponses(
        {
          inspectionId: inspection.id,
          responses: [
            { key: 'license', value: 'valid' },
            { key: 'security', value: 'needs_action' },
          ],
        },
        commander,
      );
      const evidenceFindingWithEvidence = await recordFinding(
        {
          inspectionId: inspection.id,
          checklistKey: 'security',
          description: 'Thieu so theo doi khach luu tru.',
          result: 'needs_action',
        },
        commander,
      );
      await expect(
        completeInspection(
          { inspectionId: inspection.id, result: 'needs_action' },
          commander,
        ),
      ).rejects.toThrow('CHECKLIST_EVIDENCE_REQUIRED:security');

      const storage = new LocalEvidenceStorage(storageRoot);
      const evidence = await createEvidence(storage, {
        resourceType: 'Inspection',
        resourceId: inspection.id,
        fileName: 'bien-ban.jpg',
        mimeType: 'image/jpeg',
        bytes: new TextEncoder().encode(`finding-proof-${stamp}`),
        capturedAt: new Date('2026-11-05T09:00:00.000Z'),
        actorId: commander.id,
        latitude: 20.9,
        longitude: 105.8,
      });
      evidenceIds.push(evidence.id);
      const evidenceFinding = await recordFinding(
        {
          inspectionId: inspection.id,
          checklistKey: 'security',
          description: 'Thieu so theo doi khach luu tru, co anh GPS.',
          result: 'needs_action',
          evidenceIds: [evidence.id],
        },
        commander,
      );
      const pending = await submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: [evidenceFinding.id, evidenceFindingWithEvidence.id],
          action: 'Theo doi bo sung',
          reason: 'Can phe duyet truoc khi hoan tat.',
        },
        commander,
      );
      await expect(
        completeInspection(
          { inspectionId: inspection.id, result: 'needs_action' },
          commander,
        ),
      ).rejects.toThrow('RECOMMENDATION_PENDING_APPROVAL');
      await rejectRecommendation(
        inspection.id,
        pending.id,
        commander,
        'Chua du can cu.',
      );
      await expect(
        completeInspection(
          { inspectionId: inspection.id, result: 'needs_action' },
          commander,
        ),
      ).rejects.toThrow('RECOMMENDATION_REJECTED');
      const approved = await submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: pending.findingIds as unknown as string[],
          action: 'Theo doi sau khac phuc',
          reason: 'Da bo sung can cu.',
        },
        commander,
      );
      await approveRecommendation(inspection.id, approved.id, commander);
      const completed = await completeInspection(
        { inspectionId: inspection.id, result: 'needs_action' },
        commander,
      );
      expect(completed).toMatchObject({
        status: 'completed',
        result: 'needs_action',
      });
    });

    it('saves checklist safely under offline races and dedupes offline commands', async () => {
      const establishmentId = await registerCatalog();
      const inspection = await scheduleAt(
        establishmentId,
        '2026-11-06T08:00:00.000Z',
      );
      await startInspection(inspection.id, commander);
      const started = await prisma.inspection.findUniqueOrThrow({
        where: { id: inspection.id },
      });

      await saveChecklistResponses(
        {
          inspectionId: inspection.id,
          responses: [
            { key: 'license', value: 'valid' },
            { key: 'security', value: 'valid' },
          ],
          baseVersion: started.version,
        },
        commander,
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
          commander,
        ),
      ).rejects.toThrow('STALE_OFFLINE_COMMAND');

      const clientCommandId = `s46-${stamp}-${randomUUID().slice(0, 8)}`;
      clientCommandIds.push(clientCommandId);
      const payload = {
        clientCommandId,
        actorId: commander.id,
        commandType: 'inspection.save_checklist',
        resourceType: 'Inspection',
        resourceId: inspection.id,
        occurredAt: new Date(),
        payload: {},
      };
      const first = await acceptOfflineCommand(payload);
      const replayed = await acceptOfflineCommand(payload);
      expect(replayed.id).toBe(first.id);
      expect(
        await prisma.offlineCommand.count({ where: { clientCommandId } }),
      ).toBe(1);
      await expect(
        acceptOfflineCommand({ ...payload, commandType: 'inspection.start' }),
      ).rejects.toThrow('CLIENT_COMMAND_ID_CONFLICT');
    });

    it('records findings with checklist reference and keeps finding/event order', async () => {
      const establishmentId = await registerCatalog();
      const inspection = await scheduleAt(
        establishmentId,
        '2026-11-07T08:00:00.000Z',
      );

      await expect(
        recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'security',
            description: 'Phat hien som.',
            result: 'needs_action',
          },
          commander,
        ),
      ).rejects.toThrow('INSPECTION_NOT_IN_PROGRESS');

      await startInspection(inspection.id, commander);
      await expect(
        recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'unknown-key',
            description: 'Sai muc checklist.',
            result: 'reminder',
          },
          commander,
        ),
      ).rejects.toThrow('CHECKLIST_KEY_INVALID');
      await expect(
        recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'security',
            description: 'Ket qua khong hop le.',
            result: 'sanction',
          },
          commander,
        ),
      ).rejects.toThrow('INVALID_FINDING_RESULT');

      await saveChecklistResponses(
        {
          inspectionId: inspection.id,
          responses: [
            { key: 'license', value: 'valid' },
            { key: 'security', value: 'reminder' },
          ],
        },
        commander,
      );
      const storage = new LocalEvidenceStorage(storageRoot);
      const evidence = await createEvidence(storage, {
        resourceType: 'Inspection',
        resourceId: inspection.id,
        fileName: 'hien-truong.jpg',
        mimeType: 'image/jpeg',
        bytes: new TextEncoder().encode(`order-proof-${stamp}`),
        capturedAt: new Date('2026-11-07T09:00:00.000Z'),
        actorId: commander.id,
        latitude: 20.9,
        longitude: 105.8,
      });
      evidenceIds.push(evidence.id);
      const finding = await recordFinding(
        {
          inspectionId: inspection.id,
          checklistKey: 'security',
          description: 'So theo doi thieu thong tin.',
          result: 'reminder',
          evidenceIds: [evidence.id],
        },
        commander,
      );
      expect(finding).toMatchObject({
        checklistKey: 'security',
        result: 'reminder',
      });
      expect(finding.evidenceIds as unknown as string[]).toEqual([evidence.id]);

      await expect(
        recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'security',
            description: 'Chung cu ngoai pham vi.',
            result: 'reminder',
            evidenceIds: [randomUUID()],
          },
          commander,
        ),
      ).rejects.toThrow('EVIDENCE_NOT_FOUND');

      const recommendation = await submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: [finding.id],
          action: 'Nhac nho bo sung so theo doi',
          reason: 'Thieu thong tin khach luu tru.',
        },
        commander,
      );
      await approveRecommendation(inspection.id, recommendation.id, commander);

      const events = await prisma.eventRecord.findMany({
        where: { aggregateType: 'Inspection', aggregateId: inspection.id },
        orderBy: { aggregateVersion: 'asc' },
        select: { eventType: true, aggregateVersion: true },
      });
      expect(events.map(({ eventType }) => eventType)).toEqual([
        'InspectionScheduled',
        'InspectionStarted',
        'InspectionChecklistSaved',
        'InspectionFindingRecorded',
        'EnforcementRecommendationSubmitted',
        'EnforcementApproved',
      ]);
      const versions = events.map(({ aggregateVersion }) => aggregateVersion);
      expect([...versions].sort((a, b) => a - b)).toEqual(versions);
      expect(new Set(versions).size).toBe(versions.length);

      await expect(
        completeInspection(
          { inspectionId: inspection.id, result: 'sanction' },
          commander,
        ),
      ).rejects.toThrow('INVALID_INSPECTION_RESULT');
    });

    it('restricts fieldwork to assignees and approval to commanders', async () => {
      const establishmentId = await registerCatalog();
      const inspection = await scheduleInspection(
        {
          establishmentId,
          assignedUserId: fieldOfficer.id,
          scheduledAt: '2026-11-08T08:00:00.000Z',
        },
        commander,
      );

      await expect(
        startInspection(inspection.id, unassignedOfficer),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        getInspection(inspection.id, unassignedOfficer),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        getInspection(inspection.id, otherOrgOfficer),
      ).rejects.toThrow('FORBIDDEN');

      await startInspection(inspection.id, fieldOfficer);
      await saveChecklistResponses(
        {
          inspectionId: inspection.id,
          responses: [
            { key: 'license', value: 'valid' },
            { key: 'security', value: 'valid' },
          ],
        },
        fieldOfficer,
      );
      const finding = await recordFinding(
        {
          inspectionId: inspection.id,
          checklistKey: 'security',
          description: 'Can bo hien truong ghi nhan.',
          result: 'reminder',
        },
        fieldOfficer,
      );
      const recommendation = await submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: [finding.id],
          action: 'Nhac nho',
          reason: 'Can bo hien truong de xuat.',
        },
        fieldOfficer,
      );
      await expect(
        approveRecommendation(inspection.id, recommendation.id, fieldOfficer),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        rejectRecommendation(
          inspection.id,
          recommendation.id,
          fieldOfficer,
          'Ly do',
        ),
      ).rejects.toThrow('FORBIDDEN');
      const decided = await approveRecommendation(
        inspection.id,
        recommendation.id,
        commander,
      );
      expect(decided).toMatchObject({ status: 'approved' });
    });

    it('preserves rejected and revised recommendation history', async () => {
      const establishmentId = await registerCatalog();
      const inspection = await scheduleAt(
        establishmentId,
        '2026-11-09T08:00:00.000Z',
      );
      await startInspection(inspection.id, commander);
      await saveChecklistResponses(
        {
          inspectionId: inspection.id,
          responses: [
            { key: 'license', value: 'valid' },
            { key: 'security', value: 'needs_action' },
          ],
        },
        commander,
      );
      const finding = await recordFinding(
        {
          inspectionId: inspection.id,
          checklistKey: 'security',
          description: 'Khong dam bao dieu kien an ninh.',
          result: 'needs_action',
        },
        commander,
      );
      const first = await submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: [finding.id],
          action: 'Tam dinh chi',
          reason: 'Can bo sung dieu kien an toan.',
        },
        commander,
      );

      await expect(
        rejectRecommendation(inspection.id, first.id, commander, '  '),
      ).rejects.toThrow('REJECTION_REASON_REQUIRED');
      const rejected = await rejectRecommendation(
        inspection.id,
        first.id,
        commander,
        'Chua du can cu de phe duyet.',
      );
      expect(rejected).toMatchObject({ status: 'rejected' });

      const rejectionEvents = await prisma.eventRecord.findMany({
        where: {
          aggregateType: 'Inspection',
          aggregateId: inspection.id,
          eventType: 'EnforcementRejected',
        },
      });
      expect(rejectionEvents).toHaveLength(1);
      const firstSla = await prisma.slaInstance.findFirstOrThrow({
        where: {
          resourceType: 'EnforcementRecommendation',
          resourceId: first.id,
        },
      });
      expect(firstSla).toMatchObject({ status: 'completed' });

      const revised = await submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: [finding.id],
          action: 'Theo doi bo sung',
          reason: 'Can kiem tra lai sau khac phuc.',
        },
        commander,
      );
      expect(revised.id).not.toBe(first.id);
      const approved = await approveRecommendation(
        inspection.id,
        revised.id,
        commander,
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

      await expect(
        approveRecommendation(inspection.id, first.id, commander),
      ).rejects.toThrow('RECOMMENDATION_ALREADY_DECIDED');
    });
  },
);
