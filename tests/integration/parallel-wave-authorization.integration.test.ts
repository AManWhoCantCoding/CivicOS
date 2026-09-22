import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { processOutboxUntilIdle } from '@/modules/eventing';
import {
  assertAccess,
  createAssignments,
  recordAudit,
  revokeAssignment,
  type IdentityUser,
} from '@/modules/identity';
import {
  approveIncident,
  assignIncident,
  classifyIncident,
  getIncident,
  listIncidents,
  registerIntakeReport,
  startVerification,
  transferIncident,
} from '@/modules/incidents';
import {
  approveRecommendation,
  getEstablishment,
  getInspection,
  listInspections,
  recordFinding,
  registerEstablishment,
  scheduleInspection,
  startInspection,
  submitRecommendation,
} from '@/modules/inspections';
import {
  createEvidenceRecord,
  getEvidence,
  LocalEvidenceStorage,
} from '@/modules/platform';
import {
  confirmVehicleMatch,
  createRegistryEntry,
  escalateVehicleObservation,
  getObservation,
  listObservations,
  listRegistry,
  normalizePlate,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from '@/modules/vehicles';

const enabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = 'unit-nghia-tru';
const UPPER = 'unit-cap-tren';

const CONTENT_MARKER = `AUTHMATRIX-CONTENT-${stamp}`;
const SENSITIVE_MARKER = `AUTHMATRIX-SENSITIVE-${stamp}`;
const EVIDENCE_MARKER = `authmatrix-evidence-${stamp}-bytes`;

function matrixUser(
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

const commander = matrixUser(
  `authmatrix-commander-${stamp}`,
  ['commander'],
  ORG,
);
const duty = matrixUser(`authmatrix-duty-${stamp}`, ['duty_officer'], ORG);
const field = matrixUser(`authmatrix-field-${stamp}`, ['field_officer'], ORG);
const unassigned = matrixUser(
  `authmatrix-unassigned-${stamp}`,
  ['field_officer'],
  ORG,
);
const crossCommander = matrixUser(
  `authmatrix-cross-commander-${stamp}`,
  ['commander'],
  UPPER,
);
const crossField = matrixUser(
  `authmatrix-cross-field-${stamp}`,
  ['field_officer'],
  UPPER,
);
const dbUsers = [commander, duty, field, unassigned, crossCommander, crossField];
const scopeActorIds = dbUsers.map(({ id }) => id);

const storageRoot = `/tmp/civicos-authmatrix-${stamp}`;
const storage = new LocalEvidenceStorage(storageRoot);

const incidentIds: string[] = [];
const reportIds: string[] = [];
const establishmentIds: string[] = [];
const inspectionIds: string[] = [];
const templateTypes: string[] = [];
const registryIds: string[] = [];
const observationIds: string[] = [];
const evidenceIds: string[] = [];
let plateCounter = 0;

function nextPlate(): string {
  plateCounter += 1;
  return normalizePlate(
    `89VA${stamp.slice(0, 2).toUpperCase()}${String(plateCounter).padStart(3, '0')}`,
  );
}

function establishmentType(): string {
  const type = `karaoke-authmatrix-${stamp}`;
  if (!templateTypes.includes(type)) templateTypes.push(type);
  return type;
}

async function cleanupScope(): Promise<void> {
  const auditRows = await prisma.auditEvent.findMany({
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
        ...establishmentIds.map((resourceId) => ({
          resourceType: 'Establishment',
          resourceId,
        })),
        ...inspectionIds.map((resourceId) => ({
          resourceType: 'Inspection',
          resourceId,
        })),
        ...registryIds.map((resourceId) => ({
          resourceType: 'SuspiciousVehicleRegistry',
          resourceId,
        })),
        ...observationIds.map((resourceId) => ({
          resourceType: 'VehicleObservation',
          resourceId,
        })),
        { resourceId: '*', actorId: { in: scopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const auditIds = auditRows.map(({ id }) => id);
  const assignmentRows = await prisma.assignment.findMany({
    where: {
      OR: [
        ...incidentIds.map((resourceId) => ({
          resourceType: 'Incident',
          resourceId,
        })),
        ...inspectionIds.map((resourceId) => ({
          resourceType: 'Inspection',
          resourceId,
        })),
        ...observationIds.map((resourceId) => ({
          resourceType: 'VehicleObservation',
          resourceId,
        })),
        { assigneeUserId: { in: scopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const assignmentIds = assignmentRows.map(({ id }) => id);
  const slaRows = await prisma.slaInstance.findMany({
    where: {
      OR: [
        { resourceId: { in: incidentIds } },
        { resourceId: { in: inspectionIds } },
        { resourceId: { in: observationIds } },
      ],
    },
    select: { id: true },
  });
  const slaIds = slaRows.map(({ id }) => id);
  const recommendationRows = await prisma.enforcementRecommendation.findMany({
    where: { inspectionId: { in: inspectionIds } },
    select: { id: true },
  });
  const recommendationIds = recommendationRows.map(({ id }) => id);
  const evidenceRows = await prisma.evidence.findMany({
    where: {
      OR: [
        { resourceId: { in: incidentIds } },
        { resourceId: { in: inspectionIds } },
        { resourceId: { in: observationIds } },
      ],
    },
    select: { id: true, storageKey: true },
  });
  for (const { storageKey } of evidenceRows) {
    await storage.remove(storageKey);
  }
  const eventRows = await prisma.eventRecord.findMany({
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
        ...establishmentIds.map((aggregateId) => ({
          aggregateType: 'Establishment',
          aggregateId,
        })),
        ...inspectionIds.map((aggregateId) => ({
          aggregateType: 'Inspection',
          aggregateId,
        })),
        ...registryIds.map((aggregateId) => ({
          aggregateType: 'SuspiciousVehicleRegistry',
          aggregateId,
        })),
        ...observationIds.map((aggregateId) => ({
          aggregateType: 'VehicleObservation',
          aggregateId,
        })),
        ...(auditIds.length
          ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
          : []),
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
      ],
    },
    select: { eventId: true },
  });
  const eventIds = eventRows.map(({ eventId }) => eventId);
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
        { aggregateId: { in: incidentIds } },
        { aggregateId: { in: establishmentIds } },
        { aggregateId: { in: inspectionIds } },
        { aggregateId: { in: registryIds } },
        { aggregateId: { in: observationIds } },
      ],
    },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { resourceId: { in: incidentIds } },
        { resourceId: { in: inspectionIds } },
        { resourceId: { in: observationIds } },
        { userId: { in: scopeActorIds } },
      ],
    },
  });
  await prisma.approval.deleteMany({
    where: { resourceId: { in: incidentIds } },
  });
  await prisma.vehicleVerification.deleteMany({
    where: { observationId: { in: observationIds } },
  });
  await prisma.inspectionFinding.deleteMany({
    where: { inspectionId: { in: inspectionIds } },
  });
  await prisma.enforcementRecommendation.deleteMany({
    where: { inspectionId: { in: inspectionIds } },
  });
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
  if (observationIds.length) {
    await prisma.vehicleObservation.deleteMany({
      where: { id: { in: observationIds } },
    });
    observationIds.length = 0;
  }
  if (registryIds.length) {
    await prisma.suspiciousVehicleEntry.deleteMany({
      where: { id: { in: registryIds } },
    });
    registryIds.length = 0;
  }
  if (inspectionIds.length) {
    await prisma.inspection.deleteMany({
      where: { id: { in: inspectionIds } },
    });
    inspectionIds.length = 0;
  }
  if (templateTypes.length) {
    await prisma.checklistTemplate.deleteMany({
      where: { establishmentType: { in: templateTypes } },
    });
  }
  if (establishmentIds.length) {
    await prisma.establishment.deleteMany({
      where: { id: { in: establishmentIds } },
    });
    establishmentIds.length = 0;
  }
  if (incidentIds.length) {
    await prisma.incident.deleteMany({ where: { id: { in: incidentIds } } });
    incidentIds.length = 0;
  }
  if (reportIds.length) {
    await prisma.intakeReport.deleteMany({ where: { id: { in: reportIds } } });
    reportIds.length = 0;
  }
  void recommendationIds;
}

async function uploadModuleEvidence(
  resourceType: string,
  resourceId: string,
  actor: IdentityUser,
  tag: string,
): Promise<string> {
  await assertAccess(actor, { resourceType, resourceId }, 'mutate');
  const { evidence } = await createEvidenceRecord(storage, {
    resourceType,
    resourceId,
    fileName: `${tag}.jpg`,
    mimeType: 'image/jpeg',
    bytes: new TextEncoder().encode(`${EVIDENCE_MARKER}-${tag}`),
    capturedAt: new Date('2026-09-19T01:00:00.000Z'),
    actorId: actor.id,
    latitude: 20.96,
    longitude: 105.93,
  });
  evidenceIds.push(evidence.id);
  await recordAudit({
    actor,
    resourceType,
    resourceId,
    operation: 'evidence.uploaded',
    metadata: { evidenceId: evidence.id },
  });
  return evidence.id;
}

async function downloadModuleEvidence(
  resourceType: string,
  resourceId: string,
  evidenceId: string,
  actor: IdentityUser,
): Promise<number> {
  await assertAccess(actor, { resourceType, resourceId }, 'read_sensitive');
  const stored = await getEvidence(evidenceId);
  expect(stored?.resourceId).toBe(resourceId);
  const bytes = await storage.read(stored!.storageKey);
  await recordAudit({
    actor,
    resourceType,
    resourceId,
    operation: 'evidence.downloaded',
    metadata: { evidenceId },
  });
  return bytes.byteLength;
}

describe.skipIf(!enabled)(
  'parallel wave authorization and audit matrix',
  () => {
    let incidentId = '';
    let reportId = '';
    let inspectionId = '';
    let establishmentId = '';
    let observationId = '';

    beforeAll(async () => {
      for (const [id, name, parentId] of [
        [UPPER, 'Cap tren', null],
        [ORG, 'Nghia Tru', UPPER],
      ] as const) {
        await prisma.organizationUnit.upsert({
          where: { id },
          update: { active: true },
          create: { id, name, level: 'unit', parentId },
        });
      }
      for (const user of dbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `authmatrix-hash-${stamp}`,
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
      await cleanupScope();
      await prisma.session.deleteMany({
        where: { userId: { in: scopeActorIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: scopeActorIds } } });
      await rm(storageRoot, { recursive: true, force: true });
    });

    it(
      'gates Incident and IntakeReport by commander, assignment, revocation and organization',
      { timeout: 90000 },
      async () => {
        const registered = await registerIntakeReport(
          {
            channel: 'in_person',
            receivedAt: new Date('2026-09-19T01:00:00.000Z').toISOString(),
            content: CONTENT_MARKER,
            sourceName: 'Nguyen Van A',
            sensitiveRef: SENSITIVE_MARKER,
            idempotencyKey: `authmatrix:${stamp}`,
          },
          duty,
        );
        incidentId = registered.incidentId;
        reportId = registered.reportId;
        incidentIds.push(incidentId);
        reportIds.push(reportId);

        await expect(getIncident(incidentId, commander)).resolves.toMatchObject(
          {
            incident: expect.objectContaining({ id: incidentId }),
          },
        );
        await assignIncident(incidentId, commander, [commander.id]);
        await classifyIncident(incidentId, commander, 'public_order', 'high');

        await expect(getIncident(incidentId, unassigned)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          startVerification(incidentId, unassigned, 'tu y xac minh'),
        ).rejects.toThrow('FORBIDDEN');
        await expect(getIncident(incidentId, crossField)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(getIncident(incidentId, crossCommander)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          startVerification(incidentId, crossCommander, 'can thiep ngoai'),
        ).rejects.toThrow('FORBIDDEN');

        const { assignments } = await assignIncident(incidentId, commander, [
          field.id,
        ]);
        expect(assignments).toHaveLength(1);

        await expect(getIncident(incidentId, field)).resolves.toMatchObject({
          incident: expect.objectContaining({ id: incidentId }),
        });
        await startVerification(incidentId, field, 'duoc phan cong xac minh');
        await expect(
          prisma.incident.findUniqueOrThrow({ where: { id: incidentId } }),
        ).resolves.toMatchObject({ status: 'verifying' });

        await expect(
          assignIncident(incidentId, field, [unassigned.id]),
        ).rejects.toThrow('FORBIDDEN');

        const transfer = await transferIncident(incidentId, field, UPPER);
        expect(transfer.approval.status).toBe('pending');
        await expect(
          approveIncident(incidentId, transfer.approval.id, field),
        ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
        await expect(
          approveIncident(incidentId, transfer.approval.id, crossCommander),
        ).rejects.toThrow('FORBIDDEN');
        const approved = await approveIncident(
          incidentId,
          transfer.approval.id,
          commander,
        );
        expect(approved.incident.status).toBe('transferred');

        await revokeAssignment(
          assignments[0].id,
          commander,
          'Ket thuc nhiem vu.',
        );
        await expect(getIncident(incidentId, field)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          startVerification(incidentId, field, 'sau thu hoi'),
        ).rejects.toThrow('FORBIDDEN');
        await expect(getIncident(incidentId, commander)).resolves.toMatchObject(
          {
            incident: expect.objectContaining({ id: incidentId }),
          },
        );

        const listed = await listIncidents(unassigned);
        expect(
          listed.map((entry) => String((entry as { id: string }).id ?? entry)),
        ).not.toContain(incidentId);

        const evidenceId = await uploadModuleEvidence(
          'Incident',
          incidentId,
          commander,
          'incident-proof',
        );
        await expect(
          downloadModuleEvidence('Incident', incidentId, evidenceId, commander),
        ).resolves.toBeGreaterThan(0);
        await expect(
          assertAccess(
            unassigned,
            { resourceType: 'Incident', resourceId: incidentId },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          assertAccess(
            crossCommander,
            { resourceType: 'Incident', resourceId: incidentId },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
      },
    );

    it(
      'gates Establishment, Inspection, Finding and Recommendation by assignment, revocation and organization',
      { timeout: 90000 },
      async () => {
        const establishment = await registerEstablishment(
          {
            name: `Co so authmatrix ${stamp}`,
            ownerName: 'Chu co so',
            address: `Dia chi authmatrix ${stamp}`,
            type: establishmentType(),
          },
          commander,
        );
        establishmentId = establishment.id;
        establishmentIds.push(establishmentId);

        await expect(
          getEstablishment(establishmentId, commander),
        ).resolves.toMatchObject({ id: establishmentId });
        await expect(
          getEstablishment(establishmentId, crossCommander),
        ).rejects.toThrow('FORBIDDEN');

        const inspection = await scheduleInspection(
          {
            establishmentId,
            assignedUserId: field.id,
            scheduledAt: '2026-11-10T08:00:00.000Z',
          },
          commander,
        );
        inspectionId = inspection.id;
        inspectionIds.push(inspectionId);
        await createAssignments(
          {
            resourceType: 'Inspection',
            resourceId: inspectionId,
            task: 'inspection_fieldwork',
            assigneeUserIds: [commander.id],
            organizationId: ORG,
          },
          commander,
        );

        await expect(getInspection(inspectionId, field)).resolves.toMatchObject(
          {
            inspection: expect.objectContaining({ id: inspectionId }),
          },
        );
        await expect(getInspection(inspectionId, unassigned)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(getInspection(inspectionId, crossField)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          getInspection(inspectionId, crossCommander),
        ).rejects.toThrow('FORBIDDEN');

        await startInspection(inspectionId, field);
        await expect(startInspection(inspectionId, unassigned)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          prisma.inspection.findUniqueOrThrow({ where: { id: inspectionId } }),
        ).resolves.toMatchObject({ status: 'in_progress' });

        const finding = await recordFinding(
          {
            inspectionId,
            checklistKey: 'security',
            description: `Phat hien can xac minh ${stamp}`,
            result: 'needs_action',
          },
          field,
        );
        expect(finding.inspectionId).toBe(inspectionId);
        await expect(
          recordFinding(
            {
              inspectionId,
              checklistKey: 'security',
              description: 'Tu y ghi nhan',
              result: 'reminder',
            },
            crossCommander,
          ),
        ).rejects.toThrow('FORBIDDEN');

        const recommendation = await submitRecommendation(
          {
            inspectionId,
            findingIds: [finding.id],
            action: 'Tam dinh chi',
            reason: 'Can bo sung dieu kien an toan.',
          },
          field,
        );
        await expect(
          approveRecommendation(inspectionId, recommendation.id, field),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          approveRecommendation(
            inspectionId,
            recommendation.id,
            crossCommander,
          ),
        ).rejects.toThrow('FORBIDDEN');
        const approved = await approveRecommendation(
          inspectionId,
          recommendation.id,
          commander,
        );
        expect(approved).toMatchObject({ status: 'approved' });

        const assignment = await prisma.assignment.findFirstOrThrow({
          where: {
            resourceType: 'Inspection',
            resourceId: inspectionId,
            assigneeUserId: field.id,
            status: 'active',
          },
        });
        await revokeAssignment(assignment.id, commander, 'Ket thuc nhiem vu.');
        await expect(getInspection(inspectionId, field)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          recordFinding(
            {
              inspectionId,
              checklistKey: 'safety',
              description: 'Ghi nhan sau thu hoi',
              result: 'reminder',
            },
            field,
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getInspection(inspectionId, commander),
        ).resolves.toMatchObject({
          inspection: expect.objectContaining({ id: inspectionId }),
        });

        const listed = await listInspections(unassigned);
        expect(listed.map((entry) => String(entry.id))).not.toContain(
          inspectionId,
        );

        const evidenceId = await uploadModuleEvidence(
          'Inspection',
          inspectionId,
          commander,
          'inspection-proof',
        );
        await expect(
          downloadModuleEvidence(
            'Inspection',
            inspectionId,
            evidenceId,
            commander,
          ),
        ).resolves.toBeGreaterThan(0);
        await expect(
          assertAccess(
            unassigned,
            { resourceType: 'Inspection', resourceId: inspectionId },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          assertAccess(
            crossCommander,
            { resourceType: 'Inspection', resourceId: inspectionId },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
      },
    );

    it(
      'gates Vehicle registry, observation, Evidence, verification and escalation by assignment, revocation and organization',
      { timeout: 120000 },
      async () => {
        const matchPlate = nextPlate();
        const guardPlate = nextPlate();
        const matchEntry = await createRegistryEntry(
          {
            plate: matchPlate,
            source: 'To dan pho',
            reason: 'Lien quan vu viec can chu y.',
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          commander,
        );
        registryIds.push(matchEntry.id);
        const guardEntry = await createRegistryEntry(
          {
            plate: guardPlate,
            source: 'To dan pho',
            reason: 'Muc bao ve kiem thu phan quyen.',
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          commander,
        );
        registryIds.push(guardEntry.id);

        await expect(
          createRegistryEntry(
            {
              plate: nextPlate(),
              source: 'To dan pho',
              reason: 'Truong khong co tham quyen.',
              validFrom: '2026-01-01T00:00:00.000Z',
            },
            field,
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          updateRegistryEntry(
            {
              entryId: guardEntry.id,
              validUntil: '2027-01-01T00:00:00.000Z',
            },
            crossCommander,
          ),
        ).rejects.toThrow('FORBIDDEN');

        await processOutboxUntilIdle();
        const registry = await listRegistry(commander);
        expect(
          registry.map((entry: unknown) =>
            String((entry as { id: string }).id),
          ),
        ).toContain(matchEntry.id);
        const crossRegistry = await listRegistry(crossCommander);
        expect(
          crossRegistry.map((entry: unknown) =>
            String((entry as { id: string }).id),
          ),
        ).not.toContain(matchEntry.id);

        const { observation } = await recordVehicleObservation(
          {
            plate: matchPlate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
            description: `Quan sat kiem thu phan quyen ${stamp}`,
          },
          field,
        );
        observationId = observation.id;
        observationIds.push(observationId);
        expect(observation.status).toBe('match_suggested');
        await createAssignments(
          {
            resourceType: 'VehicleObservation',
            resourceId: observationId,
            task: 'vehicle_verification',
            assigneeUserIds: [commander.id],
            organizationId: ORG,
          },
          commander,
        );

        await expect(
          getObservation(observationId, field),
        ).resolves.toMatchObject({
          observation: expect.objectContaining({ id: observationId }),
        });
        await expect(getObservation(observationId, unassigned)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(getObservation(observationId, crossField)).rejects.toThrow(
          'FORBIDDEN',
        );
        await expect(
          getObservation(observationId, crossCommander),
        ).rejects.toThrow('FORBIDDEN');

        await expect(
          confirmVehicleMatch(observationId, unassigned),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          confirmVehicleMatch(observationId, crossCommander),
        ).rejects.toThrow('FORBIDDEN');
        const confirmed = await confirmVehicleMatch(observationId, field);
        expect(confirmed.status).toBe('match_confirmed');

        const { evidence: proof } = await createEvidenceRecord(storage, {
          resourceType: 'VehicleObservation',
          resourceId: observationId,
          fileName: 'verify.jpg',
          mimeType: 'image/jpeg',
          bytes: new TextEncoder().encode(`${EVIDENCE_MARKER}-verify`),
          capturedAt: new Date('2026-09-19T02:00:00.000Z'),
          actorId: commander.id,
          latitude: 20.961,
          longitude: 105.931,
        });
        evidenceIds.push(proof.id);
        const verified = await verifyVehicleObservation(
          {
            observationId,
            result: 'Chu xe: Tran Thi B.',
            notes: 'Doi chieu so dang ky, khong ket luan vi pham.',
            ownerLookup: 'Tra cuu dang ky: Tran Thi B, dia chi X.',
            evidenceIds: [proof.id],
          },
          commander,
        );
        expect(verified.verification).toMatchObject({
          verifiedById: commander.id,
        });
        await expect(
          escalateVehicleObservation(observationId, crossCommander, UPPER),
        ).rejects.toThrow('FORBIDDEN');
        const escalated = await escalateVehicleObservation(
          observationId,
          commander,
          UPPER,
        );
        expect(escalated.status).toBe('escalated');

        const revokeTarget = await recordVehicleObservation(
          {
            plate: nextPlate(),
            observedAt: '2026-09-19T04:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          field,
        );
        observationIds.push(revokeTarget.observation.id);
        const revokeAssignmentRow = await prisma.assignment.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: revokeTarget.observation.id,
            assigneeUserId: field.id,
            status: 'active',
          },
        });
        await revokeAssignment(
          revokeAssignmentRow.id,
          commander,
          'Ket thuc nhiem vu.',
        );
        await expect(
          getObservation(revokeTarget.observation.id, field),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getObservation(revokeTarget.observation.id, commander),
        ).resolves.toMatchObject({
          observation: expect.objectContaining({
            id: revokeTarget.observation.id,
          }),
        });

        const listed = await listObservations(unassigned);
        expect(
          listed.map((entry: unknown) => String((entry as { id: string }).id)),
        ).not.toContain(observationId);

        const downloadId = await uploadModuleEvidence(
          'VehicleObservation',
          observationId,
          commander,
          'vehicle-proof',
        );
        await expect(
          downloadModuleEvidence(
            'VehicleObservation',
            observationId,
            downloadId,
            commander,
          ),
        ).resolves.toBeGreaterThan(0);
        await expect(
          assertAccess(
            unassigned,
            { resourceType: 'VehicleObservation', resourceId: observationId },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          assertAccess(
            crossCommander,
            { resourceType: 'VehicleObservation', resourceId: observationId },
            'read_sensitive',
          ),
        ).rejects.toThrow('FORBIDDEN');
      },
    );

    it(
      'records AuditEvent for sensitive reads, downloads and mutations without leaking content or bypassing assignment',
      { timeout: 60000 },
      async () => {
        expect(incidentId).toBeTruthy();
        expect(inspectionId).toBeTruthy();
        expect(observationId).toBeTruthy();

        for (const [resourceType, resourceId, operations] of [
          [
            'Incident',
            incidentId,
            [
              'incident.read',
              'incident.mutated',
              'incident.assigned',
              'incident.transfer_approval_requested',
              'evidence.downloaded',
            ],
          ],
          [
            'Inspection',
            inspectionId,
            [
              'inspection.read',
              'inspection.recommendation_approved',
              'evidence.downloaded',
            ],
          ],
          [
            'VehicleObservation',
            observationId,
            [
              'vehicle_observation.read',
              'vehicle_match.confirmed',
              'vehicle_verification.recorded',
              'vehicle_observation.escalated',
              'evidence.downloaded',
            ],
          ],
        ] as const) {
          for (const operation of operations) {
            await expect(
              prisma.auditEvent.count({
                where: { resourceType, resourceId, operation },
              }),
            ).resolves.toBeGreaterThan(0);
          }
        }

        const deniedAuditCount = await prisma.auditEvent.count({
          where: {
            OR: [
              { resourceType: 'Incident', resourceId: incidentId },
              { resourceType: 'IntakeReport', resourceId: reportId },
              { resourceType: 'Establishment', resourceId: establishmentId },
              { resourceType: 'Inspection', resourceId: inspectionId },
              { resourceType: 'VehicleObservation', resourceId: observationId },
            ],
            actorId: { in: [unassigned.id, crossCommander.id, crossField.id] },
          },
        });
        expect(deniedAuditCount).toBe(0);

        const audits = await prisma.auditEvent.findMany({
          where: {
            OR: [
              { resourceType: 'Incident', resourceId: incidentId },
              { resourceType: 'IntakeReport', resourceId: reportId },
              { resourceType: 'Inspection', resourceId: inspectionId },
              { resourceType: 'VehicleObservation', resourceId: observationId },
            ],
          },
          select: { operation: true, metadata: true, reason: true },
        });
        expect(audits.length).toBeGreaterThan(0);
        const dump = JSON.stringify(audits);
        expect(dump).not.toContain(CONTENT_MARKER);
        expect(dump).not.toContain(SENSITIVE_MARKER);
        expect(dump).not.toContain(EVIDENCE_MARKER);
      },
    );
  },
);
