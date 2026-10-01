import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  getEventProjection,
  processOutboxUntilIdle,
  readAggregateEvents,
  rebuildEventProjection,
} from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  assignIncident,
  classifyIncident,
  confirmIntakeReport,
  convertIntakeToIncident,
  getIncident,
  getIncidentReadModel,
  listIncidents,
  rebuildIncidentProjection,
  registerIntakeReport,
  verifyIntakeReport,
} from '@/modules/incidents';
import {
  approveRecommendation,
  getEstablishment,
  getInspection,
  rebuildInspectionProjection,
  recordFinding,
  registerEstablishment,
  scheduleInspection,
  startInspection,
  submitRecommendation,
} from '@/modules/inspections';
import {
  confirmVehicleMatch,
  createRegistryEntry,
  getObservation,
  listObservations,
  listRegistry,
  rebuildVehicleProjection,
  recordVehicleObservation,
} from '@/modules/vehicles';

export const REPLAY_DB_PREFIX = 'civicos_ticket07_replay_';

export function replayDatabaseName(url: string): string {
  const afterSlash = url.split('/').pop() ?? '';
  return afterSlash.split('?')[0];
}

export function isReplayDatabaseAllowed(
  url: string | undefined,
  flag: string | undefined,
): boolean {
  if (flag !== '1' || !url) return false;
  const name = replayDatabaseName(url);
  if (name === 'civicos' || !name.startsWith(REPLAY_DB_PREFIX)) return false;
  return true;
}

describe('cross-module replay safety guard', () => {
  it('refuses the shared civicos database even with the flag set', () => {
    expect(
      isReplayDatabaseAllowed(
        'postgresql://civicos:civicos@localhost:5432/civicos?schema=public',
        '1',
      ),
    ).toBe(false);
  });

  it('refuses a replay database name without the opt-in flag', () => {
    expect(
      isReplayDatabaseAllowed(
        'postgresql://civicos:civicos@localhost:5432/civicos_ticket07_replay_probe?schema=public',
        undefined,
      ),
    ).toBe(false);
    expect(
      isReplayDatabaseAllowed(
        'postgresql://civicos:civicos@localhost:5432/civicos_ticket07_replay_probe?schema=public',
        '0',
      ),
    ).toBe(false);
  });

  it('rejects lookalike database names', () => {
    expect(
      isReplayDatabaseAllowed(
        'postgresql://civicos:civicos@localhost:5432/civicos_ticket07_replay?schema=public',
        '1',
      ),
    ).toBe(false);
    expect(
      isReplayDatabaseAllowed(
        'postgresql://civicos:civicos@localhost:5432/other?schema=public',
        '1',
      ),
    ).toBe(false);
  });

  it('allows only the disposable replay database with the opt-in flag', () => {
    expect(
      isReplayDatabaseAllowed(
        'postgresql://civicos:civicos@localhost:5432/civicos_ticket07_replay_probe?schema=public',
        '1',
      ),
    ).toBe(true);
  });
});

const replayEnabled = isReplayDatabaseAllowed(
  process.env.DATABASE_URL,
  process.env.PARALLEL_WAVE_REPLAY_DB,
);

const replayStamp = randomUUID().replace(/-/g, '').slice(0, 8);
const REPLAY_ORG = 'unit-nghia-tru';
const REPLAY_UPPER = 'unit-cap-tren';

function replayUser(
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

const replayCommander = replayUser(
  `replay-commander-${replayStamp}`,
  ['commander'],
  REPLAY_ORG,
);
const replayField = replayUser(
  `replay-field-${replayStamp}`,
  ['field_officer'],
  REPLAY_ORG,
);
const replayUnassigned = replayUser(
  `replay-unassigned-${replayStamp}`,
  ['field_officer'],
  REPLAY_ORG,
);
const replayCrossCommander = replayUser(
  `replay-cross-${replayStamp}`,
  ['commander'],
  REPLAY_UPPER,
);
const replayCrossField = replayUser(
  `replay-cross-field-${replayStamp}`,
  ['field_officer'],
  REPLAY_UPPER,
);
const replayDbUsers = [
  replayCommander,
  replayField,
  replayUnassigned,
  replayCrossCommander,
  replayCrossField,
];
const replayScopeActorIds = replayDbUsers.map(({ id }) => id);
const replayEstablishmentType = `karaoke-replay-${replayStamp}`;
const replayPlate = `89R${replayStamp.toUpperCase()}01`;

const replayIds = {
  reportId: '',
  incidentId: '',
  establishmentId: '',
  inspectionId: '',
  registryId: '',
  observationId: '',
};

function freeze(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function projectionFingerprint(
  row:
    | {
        projectionName: string;
        aggregateType: string;
        aggregateId: string;
        aggregateVersion: number;
        state: unknown;
      }
    | null
    | undefined,
): unknown {
  if (!row) return null;
  return {
    projectionName: row.projectionName,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    aggregateVersion: row.aggregateVersion,
    state: row.state,
  };
}

async function replaySourceCounts(): Promise<Record<string, number>> {
  const [
    incident,
    intakeReport,
    establishment,
    inspection,
    inspectionFinding,
    enforcementRecommendation,
    suspiciousVehicleEntry,
    vehicleObservation,
    vehicleVerification,
    checklistTemplate,
    assignment,
    auditEvent,
    slaInstance,
    approval,
    evidence,
    notification,
    offlineCommand,
    eventRecord,
    outboxMessage,
  ] = await Promise.all([
    prisma.incident.count(),
    prisma.intakeReport.count(),
    prisma.establishment.count(),
    prisma.inspection.count(),
    prisma.inspectionFinding.count(),
    prisma.enforcementRecommendation.count(),
    prisma.suspiciousVehicleEntry.count(),
    prisma.vehicleObservation.count(),
    prisma.vehicleVerification.count(),
    prisma.checklistTemplate.count({
      where: { establishmentType: replayEstablishmentType },
    }),
    prisma.assignment.count(),
    prisma.auditEvent.count(),
    prisma.slaInstance.count(),
    prisma.approval.count(),
    prisma.evidence.count(),
    prisma.notification.count(),
    prisma.offlineCommand.count(),
    prisma.eventRecord.count(),
    prisma.outboxMessage.count(),
  ]);
  return {
    incident,
    intakeReport,
    establishment,
    inspection,
    inspectionFinding,
    enforcementRecommendation,
    suspiciousVehicleEntry,
    vehicleObservation,
    vehicleVerification,
    checklistTemplate,
    assignment,
    auditEvent,
    slaInstance,
    approval,
    evidence,
    notification,
    offlineCommand,
    eventRecord,
    outboxMessage,
  };
}

async function replayTimelines(): Promise<Record<string, unknown>> {
  const pairs: Array<[string, string]> = [
    ['IntakeReport', replayIds.reportId],
    ['Incident', replayIds.incidentId],
    ['Establishment', replayIds.establishmentId],
    ['Inspection', replayIds.inspectionId],
    ['SuspiciousVehicleRegistry', replayIds.registryId],
    ['VehicleObservation', replayIds.observationId],
  ];
  const timelines: Record<string, unknown> = {};
  for (const [aggregateType, aggregateId] of pairs) {
    const events = await readAggregateEvents(
      prisma,
      aggregateType,
      aggregateId,
    );
    timelines[`${aggregateType}:${aggregateId}`] = events.map((event) => ({
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      aggregateVersion: event.aggregateVersion,
    }));
  }
  return timelines;
}

async function replayHistoryProjections(): Promise<Record<string, unknown>> {
  const pairs: Array<[string, string]> = [
    ['IntakeReport', replayIds.reportId],
    ['Incident', replayIds.incidentId],
    ['Establishment', replayIds.establishmentId],
    ['Inspection', replayIds.inspectionId],
    ['SuspiciousVehicleRegistry', replayIds.registryId],
    ['VehicleObservation', replayIds.observationId],
  ];
  const projections: Record<string, unknown> = {};
  for (const [aggregateType, aggregateId] of pairs) {
    const row = await getEventProjection(aggregateType, aggregateId);
    projections[`${aggregateType}:${aggregateId}`] = projectionFingerprint(row);
  }
  return projections;
}

async function replayDetailSnapshot(): Promise<Record<string, unknown>> {
  const incidentRead = await getIncidentReadModel(replayIds.incidentId);
  const incidentDetail = await getIncident(
    replayIds.incidentId,
    replayCommander,
  );
  const incidentList = await listIncidents(replayCommander);
  const establishmentDetail = await getEstablishment(
    replayIds.establishmentId,
    replayCommander,
  );
  const inspectionDetail = await getInspection(
    replayIds.inspectionId,
    replayCommander,
  );
  const observationDetail = await getObservation(
    replayIds.observationId,
    replayCommander,
  );
  const observationList = await listObservations(replayCommander);
  const registryList = await listRegistry(replayCommander);
  return {
    incidentRead: incidentRead ? freeze(incidentRead.state) : null,
    incidentDetail: freeze(incidentDetail),
    incidentList: freeze(
      incidentList.filter(
        (item) =>
          (item as unknown as Record<string, unknown>).id ===
          replayIds.incidentId,
      ),
    ),
    establishmentDetail: freeze(establishmentDetail),
    inspectionDetail: freeze(inspectionDetail),
    observationDetail: freeze(observationDetail),
    observationList: freeze(
      observationList.filter(
        (item) =>
          (item as unknown as Record<string, unknown>).id ===
          replayIds.observationId,
      ),
    ),
    registryList: freeze(
      registryList.filter(
        (item) =>
          (item as unknown as Record<string, unknown>).id ===
          replayIds.registryId,
      ),
    ),
  };
}

async function replayCleanupScope(): Promise<void> {
  const trackedIds = [
    replayIds.reportId,
    replayIds.incidentId,
    replayIds.establishmentId,
    replayIds.inspectionId,
    replayIds.registryId,
    replayIds.observationId,
  ].filter(Boolean);
  if (!trackedIds.length) return;
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { resourceId: { in: trackedIds } },
        { userId: { in: replayScopeActorIds } },
      ],
    },
  });
  const audits = await prisma.auditEvent.findMany({
    where: {
      OR: [
        { resourceId: { in: trackedIds } },
        { resourceId: '*', actorId: { in: replayScopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { resourceId: { in: trackedIds } },
        { assigneeUserId: { in: replayScopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const slas = await prisma.slaInstance.findMany({
    where: { resourceId: { in: trackedIds } },
    select: { id: true },
  });
  const auditIds = audits.map(({ id }) => id);
  const assignmentIds = assignments.map(({ id }) => id);
  const slaIds = slas.map(({ id }) => id);
  const eventRows = await prisma.eventRecord.findMany({
    where: {
      OR: [
        { aggregateId: { in: trackedIds } },
        ...(auditIds.length ? [{ aggregateId: { in: auditIds } }] : []),
        ...(assignmentIds.length
          ? [{ aggregateId: { in: assignmentIds } }]
          : []),
        ...(slaIds.length ? [{ aggregateId: { in: slaIds } }] : []),
      ],
    },
    select: { eventId: true },
  });
  const eventIds = eventRows.map(({ eventId }) => eventId);
  if (eventIds.length) {
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.eventRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }
  await prisma.projectionRecord.deleteMany({
    where: { aggregateId: { in: trackedIds } },
  });
  await prisma.vehicleVerification.deleteMany({
    where: { observationId: replayIds.observationId },
  });
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
  await prisma.vehicleObservation.deleteMany({
    where: { id: replayIds.observationId },
  });
  await prisma.suspiciousVehicleEntry.deleteMany({
    where: { id: replayIds.registryId },
  });
  await prisma.inspectionFinding.deleteMany({
    where: { inspectionId: replayIds.inspectionId },
  });
  await prisma.enforcementRecommendation.deleteMany({
    where: { inspectionId: replayIds.inspectionId },
  });
  await prisma.inspection.deleteMany({
    where: { id: replayIds.inspectionId },
  });
  await prisma.checklistTemplate.deleteMany({
    where: { establishmentType: replayEstablishmentType },
  });
  await prisma.establishment.deleteMany({
    where: { id: replayIds.establishmentId },
  });
  await prisma.incident.deleteMany({ where: { id: replayIds.incidentId } });
  await prisma.intakeReport.deleteMany({
    where: { id: replayIds.reportId },
  });
}

let replayBefore: {
  details: Record<string, unknown>;
  timelines: Record<string, unknown>;
  history: Record<string, unknown>;
  counts: Record<string, number>;
} | null = null;
let replayAfterCounts: Record<string, number> | null = null;

describe.skipIf(!replayEnabled)(
  'cross-module replay on the disposable database',
  () => {
    beforeAll(async () => {
      const dbName = replayDatabaseName(process.env.DATABASE_URL ?? '');
      if (!dbName.startsWith(REPLAY_DB_PREFIX)) {
        throw new Error(
          `REPLAY_SAFETY_GUARD: refusing database "${dbName}", expected prefix "${REPLAY_DB_PREFIX}" with PARALLEL_WAVE_REPLAY_DB=1`,
        );
      }
      for (const [id, name, parentId] of [
        [REPLAY_UPPER, 'Cap tren', null],
        [REPLAY_ORG, 'Nghia Tru', REPLAY_UPPER],
      ] as const) {
        await prisma.organizationUnit.upsert({
          where: { id },
          update: { active: true },
          create: { id, name, level: 'unit', parentId },
        });
      }
      for (const user of replayDbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `replay-hash-${replayStamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
      }
    });

    afterAll(async () => {
      await replayCleanupScope();
      await prisma.session.deleteMany({
        where: { userId: { in: replayScopeActorIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: replayScopeActorIds } },
      });
    });

    it(
      'builds unique Incident, Inspection and Vehicle flows through public entrypoints',
      { timeout: 120000 },
      async () => {
        const created = await registerIntakeReport(
          {
            channel: 'in_person',
            receivedAt: new Date().toISOString(),
            content: `Ticket07 replay probe ${replayStamp}`,
            sourceName: 'Nguyen Van A',
            latitude: 21.01,
            longitude: 106.02,
            idempotencyKey: `replay07:${replayStamp}:${randomUUID()}`,
          },
          replayCommander,
        );
        await verifyIntakeReport(created.reportId, replayCommander, {
          classification: 'sufficient',
          verificationNote: 'Replay verification.',
        });
        await confirmIntakeReport(created.reportId, replayCommander);
        const converted = await convertIntakeToIncident(
          created.reportId,
          replayCommander,
        );
        if (!converted.incidentId) throw new Error('REPLAY_CONVERT_FAILED');
        replayIds.reportId = created.reportId;
        replayIds.incidentId = converted.incidentId;
        await assignIncident(replayIds.incidentId, replayCommander, [
          replayCommander.id,
        ]);
        await classifyIncident(
          replayIds.incidentId,
          replayCommander,
          'public_order',
          'high',
        );

        const establishment = await registerEstablishment(
          {
            name: `Co so replay07 ${replayStamp}`,
            ownerName: 'Chu co so',
            address: `Dia chi replay07 ${replayStamp}`,
            type: replayEstablishmentType,
          },
          replayCommander,
        );
        replayIds.establishmentId = establishment.id;
        const inspection = await scheduleInspection(
          {
            establishmentId: establishment.id,
            assignedUserId: replayField.id,
            scheduledAt: '2026-11-10T08:00:00.000Z',
          },
          replayCommander,
        );
        replayIds.inspectionId = inspection.id;
        await startInspection(inspection.id, replayField);
        const finding = await recordFinding(
          {
            inspectionId: inspection.id,
            checklistKey: 'security',
            description: `Thieu so theo doi replay07 ${replayStamp}.`,
            result: 'needs_action',
          },
          replayField,
        );
        const recommendation = await submitRecommendation(
          {
            inspectionId: inspection.id,
            findingIds: [finding.id],
            action: 'Theo doi bo sung',
            reason: 'Can kiem tra lai sau khac phuc.',
          },
          replayField,
        );
        await approveRecommendation(
          inspection.id,
          recommendation.id,
          replayCommander,
        );

        const registry = await createRegistryEntry(
          {
            plate: replayPlate,
            source: 'To dan pho',
            reason: `Lien quan replay07 ${replayStamp}.`,
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          replayCommander,
        );
        replayIds.registryId = registry.id;
        const { observation } = await recordVehicleObservation(
          {
            plate: replayPlate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
            description: `Quan sat replay07 ${replayStamp}`,
          },
          replayField,
        );
        replayIds.observationId = observation.id;
        expect(observation.status).toBe('match_suggested');
        const confirmed = await confirmVehicleMatch(
          observation.id,
          replayCommander,
        );
        expect(confirmed.status).toBe('match_confirmed');
      },
    );

    it(
      'snapshots projections, details and timelines before rebuild',
      { timeout: 120000 },
      async () => {
        expect(replayIds.incidentId).toBeTruthy();
        await processOutboxUntilIdle();
        const details = await replayDetailSnapshot();
        const timelines = await replayTimelines();
        const history = await replayHistoryProjections();
        const counts = await replaySourceCounts();
        expect(
          (timelines[`Incident:${replayIds.incidentId}`] as unknown[]).length,
        ).toBeGreaterThan(0);
        expect(
          (timelines[`Inspection:${replayIds.inspectionId}`] as unknown[])
            .length,
        ).toBeGreaterThan(0);
        expect(
          (
            timelines[
              `VehicleObservation:${replayIds.observationId}`
            ] as unknown[]
          ).length,
        ).toBeGreaterThan(0);
        for (const key of Object.keys(history)) {
          expect(history[key]).not.toBeNull();
        }
        replayBefore = { details, timelines, history, counts };
      },
    );

    it(
      'rebuilds event-history plus Incident, Inspection and Vehicle projections',
      { timeout: 120000 },
      async () => {
        expect(replayBefore).not.toBeNull();
        const rebuiltEvent = await rebuildEventProjection();
        const rebuiltIncident = await rebuildIncidentProjection();
        const rebuiltInspection = await rebuildInspectionProjection();
        const rebuiltVehicle = await rebuildVehicleProjection();
        expect(rebuiltEvent).toBeGreaterThan(0);
        expect(rebuiltIncident).toBeGreaterThan(0);
        expect(rebuiltInspection).toBeGreaterThan(0);
        expect(rebuiltVehicle).toBeGreaterThan(0);
        replayAfterCounts = await replaySourceCounts();
      },
    );

    it(
      'keeps event history and source tables identical across rebuild',
      { timeout: 120000 },
      async () => {
        expect(replayBefore).not.toBeNull();
        expect(replayAfterCounts).not.toBeNull();
        expect(replayAfterCounts).toEqual(replayBefore!.counts);
        const timelinesAfter = await replayTimelines();
        expect(timelinesAfter).toEqual(replayBefore!.timelines);
        const historyAfter = await replayHistoryProjections();
        expect(historyAfter).toEqual(replayBefore!.history);
      },
    );

    it(
      'keeps projections, details and access control identical with no foreign writes',
      { timeout: 120000 },
      async () => {
        expect(replayBefore).not.toBeNull();
        const detailsAfter = await replayDetailSnapshot();
        expect(detailsAfter).toEqual(replayBefore!.details);

        await expect(
          getIncident(replayIds.incidentId, replayUnassigned),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getIncident(replayIds.incidentId, replayCrossCommander),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getInspection(replayIds.inspectionId, replayUnassigned),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getInspection(replayIds.inspectionId, replayCrossField),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getObservation(replayIds.observationId, replayUnassigned),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getObservation(replayIds.observationId, replayCrossField),
        ).rejects.toThrow('FORBIDDEN');

        const counts = await replaySourceCounts();
        expect(counts.incident).toBe(1);
        expect(counts.intakeReport).toBe(1);
        expect(counts.establishment).toBe(1);
        expect(counts.inspection).toBe(1);
        expect(counts.inspectionFinding).toBe(1);
        expect(counts.enforcementRecommendation).toBe(1);
        expect(counts.suspiciousVehicleEntry).toBe(1);
        expect(counts.vehicleObservation).toBe(1);
        expect(counts.evidence).toBe(0);
        expect(counts.offlineCommand).toBe(0);
        expect(counts.approval).toBe(0);

        const trackedIds = [
          replayIds.reportId,
          replayIds.incidentId,
          replayIds.establishmentId,
          replayIds.inspectionId,
          replayIds.registryId,
          replayIds.observationId,
        ];
        const trackedEvents = await prisma.eventRecord.findMany({
          where: { aggregateId: { in: trackedIds } },
          select: { aggregateType: true, eventType: true },
        });
        expect(trackedEvents.length).toBeGreaterThan(0);
        expect(
          trackedEvents
            .map(({ aggregateType }) => aggregateType)
            .filter(
              (aggregateType) =>
                ![
                  'IntakeReport',
                  'Incident',
                  'Establishment',
                  'Inspection',
                  'SuspiciousVehicleRegistry',
                  'VehicleObservation',
                ].includes(aggregateType),
            ),
        ).toEqual([]);
      },
    );
  },
);
