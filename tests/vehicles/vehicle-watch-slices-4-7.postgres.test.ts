import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  getEventConsumers,
  processOutboxUntilIdle,
  readAggregateEvents,
} from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  acceptOfflineCommand,
  createEvidence,
  createInAppNotification,
  LocalEvidenceStorage,
  markOverdue,
} from '@/modules/platform';
import {
  confirmVehicleMatch,
  confirmVehicleParkingWatch,
  createVehicleObservationEvidence,
  createRegistryEntry,
  escalateVehicleObservation,
  getObservation,
  getVehicleStatistics,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from '@/modules/vehicles';
import { attachVehicleObservationEvidence } from '@/modules/vehicles';
import { normalizePlate } from '@/modules/vehicles';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const databaseTestTimeoutMs = 15_000;
const stamp = randomUUID().replace(/-/g, '');
const orgId = `ps009-s47-${stamp}-org`;
const parentOrgId = `ps009-s47-${stamp}-parent`;
const peerOrgId = `ps009-s47-${stamp}-peer`;
const storageRoot = `/tmp/civicos-vehicle-s47-${stamp}`;

class TrackingStorage {
  readonly removed: string[] = [];

  async store(input: {
    resourceId: string;
    fileName: string;
    bytes: Uint8Array;
  }) {
    return {
      storageKey: `${input.resourceId}/${input.fileName}`,
      originalHash: `${stamp}-${input.fileName}`,
      sizeBytes: input.bytes.byteLength,
    };
  }

  async remove(storageKey: string) {
    this.removed.push(storageKey);
  }

  async read() {
    return new Uint8Array();
  }
}

const commander: IdentityUser = {
  id: `ps009-s47-${stamp}-commander`,
  email: `ps009-s47-${stamp}-commander@civicos.local`,
  name: 'PS009 slice 4-7 commander',
  roles: ['commander'],
  organizationUnitId: orgId,
};

const fieldOfficer: IdentityUser = {
  id: `ps009-s47-${stamp}-field`,
  email: `ps009-s47-${stamp}-field@civicos.local`,
  name: 'PS009 slice 4-7 field officer',
  roles: ['field_officer'],
  organizationUnitId: orgId,
};

const unassignedOfficer: IdentityUser = {
  id: `ps009-s47-${stamp}-unassigned`,
  email: `ps009-s47-${stamp}-unassigned@civicos.local`,
  name: 'PS009 slice 4-7 unassigned officer',
  roles: ['field_officer'],
  organizationUnitId: orgId,
};

const registryIds: string[] = [];
const observationIds: string[] = [];
const evidenceIds: string[] = [];
const clientCommandIds: string[] = [];
const slaIds: string[] = [];
const organizationUnitIds: string[] = [];
const createdUserIds: string[] = [];
const checkpointSnapshots: {
  name: string;
  existed: boolean;
  processedEventIds: string[];
  lastRecordedAt: Date | null;
  updatedAt?: Date;
}[] = [];

function trackRegistry(id: string): string {
  registryIds.push(id);
  return id;
}

function trackObservation(id: string): string {
  observationIds.push(id);
  return id;
}

function plateFor(marker: string): string {
  return `89${marker}${stamp.slice(0, 12).toUpperCase()}`;
}

async function createRegistry(
  plate: string,
  overrides: Record<string, string> = {},
  actor: IdentityUser = commander,
) {
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
  return trackRegistry(entry.id);
}

async function photoEvidence(resourceId: string, tag: string) {
  const storage = new LocalEvidenceStorage(storageRoot);
  const evidence = await createEvidence(storage, {
    resourceType: 'VehicleObservation',
    resourceId,
    fileName: `${tag}.jpg`,
    mimeType: 'image/jpeg',
    bytes: new TextEncoder().encode(`vehicle-photo-${stamp}-${tag}`),
    capturedAt: new Date('2026-09-19T01:00:00.000Z'),
    actorId: fieldOfficer.id,
    latitude: 20.96,
    longitude: 105.93,
  });
  evidenceIds.push(evidence.id);
  return evidence;
}

describe.skipIf(!postgresEnabled)(
  'PS-E1-009 slices 4-7 PostgreSQL seam',
  () => {
    beforeAll(async () => {
      for (const [id, name, parentId] of [
        [parentOrgId, 'Cap tren', null],
        [orgId, 'Nghia Tru', parentOrgId],
        [peerOrgId, 'Don vi ngang cap', parentOrgId],
      ] as const) {
        await prisma.organizationUnit.create({
          data: { id, name, level: 'unit', parentId },
        });
        organizationUnitIds.push(id);
      }
      for (const user of [commander, fieldOfficer, unassignedOfficer]) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `s47-hash-${stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
        createdUserIds.push(user.id);
      }
    });

    afterAll(async () => {
      if (createdUserIds.length) {
        await prisma.assignment.deleteMany({
          where: { assigneeUserId: { in: createdUserIds } },
        });
        await prisma.notification.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.session.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
      if (organizationUnitIds.length)
        await prisma.organizationUnit.deleteMany({
          where: { id: { in: organizationUnitIds } },
        });
    });

    afterEach(async () => {
      const parkingWatches = observationIds.length
        ? await prisma.vehicleParkingWatch.findMany({
            where: { observationId: { in: observationIds } },
            select: { id: true },
          })
        : [];
      const parkingWatchIds = parkingWatches.map(({ id }) => id);
      const eventAggregateScopes = [
        ...(observationIds.length
          ? [
              {
                aggregateType: 'VehicleObservation',
                aggregateId: { in: observationIds },
              },
            ]
          : []),
        ...(registryIds.length
          ? [
              {
                aggregateType: 'SuspiciousVehicleRegistry',
                aggregateId: { in: registryIds },
              },
            ]
          : []),
        ...(parkingWatchIds.length
          ? [
              {
                aggregateType: 'VehicleParkingWatch',
                aggregateId: { in: parkingWatchIds },
              },
            ]
          : []),
      ];
      const eventScopes = [
        ...eventAggregateScopes,
        ...(createdUserIds.length ? [{ actorId: { in: createdUserIds } }] : []),
      ];
      const events = eventScopes.length
        ? await prisma.eventRecord.findMany({
            where: { OR: eventScopes },
            select: { eventId: true, aggregateType: true, aggregateId: true },
          })
        : [];
      const eventIds = events.map(({ eventId }) => eventId);
      if (eventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: eventIds } },
        });
      }
      const slas =
        observationIds.length || slaIds.length
          ? await prisma.slaInstance.findMany({
              where: {
                OR: [
                  {
                    resourceType: 'VehicleObservation',
                    resourceId: { in: observationIds },
                  },
                  ...(parkingWatchIds.length
                    ? [
                        {
                          resourceType: 'VehicleParkingWatch',
                          resourceId: { in: parkingWatchIds },
                        },
                      ]
                    : []),
                  ...(slaIds.length ? [{ id: { in: slaIds } }] : []),
                ],
              },
              select: { id: true },
            })
          : [];
      const slaEventIds =
        slas.length > 0
          ? (
              await prisma.eventRecord.findMany({
                where: {
                  aggregateType: 'SlaInstance',
                  aggregateId: { in: slas.map(({ id }) => id) },
                },
                select: { eventId: true },
              })
            ).map(({ eventId }) => eventId)
          : [];
      const ownedEventIds = [...new Set([...eventIds, ...slaEventIds])];
      if (ownedEventIds.length) {
        const checkpoints = await prisma.projectionCheckpoint.findMany({
          select: { name: true, processedEventIds: true },
        });
        for (const checkpoint of checkpoints) {
          const processedEventIds = Array.isArray(checkpoint.processedEventIds)
            ? checkpoint.processedEventIds.filter(
                (eventId): eventId is string => typeof eventId === 'string',
              )
            : [];
          const remainingEventIds = processedEventIds.filter(
            (eventId) => !ownedEventIds.includes(eventId),
          );
          if (remainingEventIds.length !== processedEventIds.length)
            await prisma.projectionCheckpoint.update({
              where: { name: checkpoint.name },
              data: { processedEventIds: remainingEventIds },
            });
        }
      }
      for (const snapshot of checkpointSnapshots) {
        const current = await prisma.projectionCheckpoint.findUnique({
          where: { name: snapshot.name },
          select: { processedEventIds: true },
        });
        if (!snapshot.existed) {
          if (!current) continue;
          const remaining = Array.isArray(current.processedEventIds)
            ? current.processedEventIds.filter(
                (eventId): eventId is string =>
                  typeof eventId === 'string' &&
                  !ownedEventIds.includes(eventId),
              )
            : [];
          expect(remaining).toEqual([]);
          await prisma.projectionCheckpoint.delete({
            where: { name: snapshot.name },
          });
          continue;
        }
        expect(current).not.toBeNull();
        const currentIds = Array.isArray(current?.processedEventIds)
          ? current.processedEventIds.filter(
              (eventId): eventId is string => typeof eventId === 'string',
            )
          : [];
        const withoutOwned = currentIds.filter(
          (eventId) => !ownedEventIds.includes(eventId),
        );
        expect(withoutOwned).toEqual(snapshot.processedEventIds);
        await prisma.projectionCheckpoint.update({
          where: { name: snapshot.name },
          data: {
            processedEventIds: snapshot.processedEventIds,
            lastRecordedAt: snapshot.lastRecordedAt,
            updatedAt: snapshot.updatedAt,
          },
        });
      }
      checkpointSnapshots.length = 0;
      const slaProjectionScopes = slas.length
        ? [
            {
              aggregateType: 'SlaInstance',
              aggregateId: { in: slas.map(({ id }) => id) },
            },
          ]
        : [];
      if (slaEventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: slaEventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: slaEventIds } },
        });
      }
      if (slas.length) {
        await prisma.slaInstance.deleteMany({
          where: { id: { in: slas.map(({ id }) => id) } },
        });
        slaIds.length = 0;
      }
      const auditCleanupScopes = [
        ...(registryIds.length
          ? [
              {
                resourceType: 'SuspiciousVehicleRegistry',
                resourceId: { in: registryIds },
              },
            ]
          : []),
        ...(observationIds.length
          ? [
              {
                resourceType: 'VehicleObservation',
                resourceId: { in: observationIds },
              },
            ]
          : []),
        ...(parkingWatchIds.length
          ? [
              {
                resourceType: 'VehicleParkingWatch',
                resourceId: { in: parkingWatchIds },
              },
            ]
          : []),
        ...(createdUserIds.length
          ? [
              {
                resourceType: 'VehicleObservation',
                resourceId: '*',
                operation: 'vehicle_observation.statistics_read',
                actorId: { in: createdUserIds },
              },
            ]
          : []),
        ...(slas.length
          ? [
              {
                resourceType: 'SlaInstance',
                resourceId: { in: slas.map(({ id }) => id) },
              },
            ]
          : []),
      ];
      if (auditCleanupScopes.length)
        await prisma.auditEvent.deleteMany({
          where: { OR: auditCleanupScopes },
        });
      if (parkingWatchIds.length) {
        await prisma.vehicleParkingWatch.deleteMany({
          where: { id: { in: parkingWatchIds } },
        });
      }
      const projectionScopes = [
        ...events.map(({ aggregateType, aggregateId }) => ({
          aggregateType,
          aggregateId,
        })),
        ...(observationIds.length
          ? [
              {
                aggregateType: 'VehicleObservation',
                aggregateId: { in: observationIds },
              },
            ]
          : []),
        ...(registryIds.length
          ? [
              {
                aggregateType: 'SuspiciousVehicleRegistry',
                aggregateId: { in: registryIds },
              },
            ]
          : []),
        ...(parkingWatchIds.length
          ? [
              {
                aggregateType: 'VehicleParkingWatch',
                aggregateId: { in: parkingWatchIds },
              },
            ]
          : []),
        ...slaProjectionScopes,
      ];
      if (projectionScopes.length)
        await prisma.projectionRecord.deleteMany({
          where: { OR: projectionScopes },
        });
      if (observationIds.length) {
        await prisma.notification.deleteMany({
          where: { resourceId: { in: observationIds } },
        });
        await prisma.notification.deleteMany({
          where: {
            userId: { in: createdUserIds },
          },
        });
        await prisma.vehicleVerification.deleteMany({
          where: { observationId: { in: observationIds } },
        });
        await prisma.assignment.deleteMany({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: { in: observationIds },
          },
        });
        await prisma.vehicleObservation.deleteMany({
          where: { id: { in: observationIds } },
        });
        observationIds.length = 0;
      }
      if (createdUserIds.length)
        await prisma.assignment.deleteMany({
          where: { assigneeUserId: { in: createdUserIds } },
        });
      if (registryIds.length) {
        await prisma.suspiciousVehicleEntry.deleteMany({
          where: { id: { in: registryIds } },
        });
        registryIds.length = 0;
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
      await rm(storageRoot, { recursive: true, force: true });
    });

    it('validates plates without over-normalizing local conventions', () => {
      expect(normalizePlate(' 89A-123.45 ')).toBe('89A12345');
      expect(normalizePlate('29a 456.78')).toBe('29A45678');
    });

    it('confirms one parking watch concurrently, atomically, and completes only its SLA on verification', async () => {
      const { observation } = await recordVehicleObservation(
        {
          plate: plateFor('W'),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      await expect(
        confirmVehicleParkingWatch(observation.id, unassignedOfficer),
      ).rejects.toThrow('FORBIDDEN');
      const [watch, replay] = await Promise.all([
        confirmVehicleParkingWatch(observation.id, fieldOfficer),
        confirmVehicleParkingWatch(observation.id, fieldOfficer),
      ]);
      expect(replay.id).toBe(watch.id);
      expect(
        await prisma.vehicleParkingWatch.count({
          where: { observationId: observation.id },
        }),
      ).toBe(1);
      expect(watch.confirmedAt.getTime()).toBeGreaterThan(Date.now() - 30_000);
      expect(watch.confirmedAt.getTime()).toBeLessThanOrEqual(Date.now());
      const sla = await prisma.slaInstance.findUniqueOrThrow({
        where: {
          resourceType_resourceId_kind: {
            resourceType: 'VehicleParkingWatch',
            resourceId: watch.id,
            kind: 'vehicle_parking_inspection_4h',
          },
        },
      });
      expect(
        await prisma.slaInstance.count({
          where: {
            resourceType: 'VehicleParkingWatch',
            resourceId: watch.id,
            kind: 'vehicle_parking_inspection_4h',
          },
        }),
      ).toBe(1);
      expect(sla.dueAt.getTime() - watch.confirmedAt.getTime()).toBe(
        4 * 60 * 60 * 1000,
      );
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'VehicleParkingWatch',
            aggregateId: watch.id,
            eventType: 'VehicleParkingWatchStarted',
          },
        }),
      ).toBe(1);
      const startEvent = await prisma.eventRecord.findFirstOrThrow({
        where: {
          aggregateType: 'VehicleParkingWatch',
          aggregateId: watch.id,
          eventType: 'VehicleParkingWatchStarted',
        },
      });
      expect(startEvent.payload).toMatchObject({
        continuousParkingOver48Hours: true,
        declarationOrRegistrationMissing: true,
      });
      expect(startEvent.payload).not.toHaveProperty('plate');
      expect(startEvent.payload).not.toHaveProperty('latitude');
      const detail = await getObservation(observation.id, fieldOfficer);
      expect(detail.parkingWatch).toMatchObject({
        status: 'active',
        confirmedAt: watch.confirmedAt.toISOString(),
        completedAt: null,
      });
      expect(Object.keys(detail.parkingWatch ?? {}).sort()).toEqual([
        'completedAt',
        'confirmedAt',
        'status',
      ]);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleParkingWatch',
            resourceId: watch.id,
            operation: 'vehicle_parking_watch.confirmed',
          },
        }),
      ).toBe(1);

      await verifyVehicleObservation(
        {
          observationId: observation.id,
          result: 'Inspected',
          notes: 'Inspection complete.',
        },
        fieldOfficer,
      );
      await expect(
        prisma.vehicleParkingWatch.findUniqueOrThrow({
          where: { id: watch.id },
        }),
      ).resolves.toMatchObject({ status: 'completed' });
      await expect(
        prisma.slaInstance.findUniqueOrThrow({ where: { id: sla.id } }),
      ).resolves.toMatchObject({ status: 'completed' });
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'VehicleParkingWatch',
            aggregateId: watch.id,
            eventType: 'VehicleParkingWatchCompleted',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleParkingWatch',
            resourceId: watch.id,
            operation: 'vehicle_parking_watch.completed',
          },
        }),
      ).toBe(1);
      expect(
        (await confirmVehicleParkingWatch(observation.id, fieldOfficer)).id,
      ).toBe(watch.id);
    });

    it('rejects parking-watch starts for match-suggested, verified, or escalated observations', async () => {
      const { observation } = await recordVehicleObservation(
        {
          plate: plateFor('Q'),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      for (const status of ['match_suggested', 'verified', 'escalated']) {
        await prisma.vehicleObservation.update({
          where: { id: observation.id },
          data: { status },
        });
        await expect(
          confirmVehicleParkingWatch(observation.id, fieldOfficer),
        ).rejects.toThrow('PARKING_WATCH_NOT_ALLOWED');
      }
    });

    it('scopes statistics to active vehicle assignments or the commander organization', async () => {
      const { observation } = await recordVehicleObservation(
        {
          plate: plateFor('Z'),
          observedAt: '2026-01-31T17:30:00.000Z',
          latitude: 20.9602,
          longitude: 105.9304,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);

      const assignedStats = await getVehicleStatistics(fieldOfficer);
      expect(assignedStats.monthlyFrequency).toEqual([
        { month: '2026-02', count: 1 },
      ]);
      expect(assignedStats.locationFrequency).toEqual([
        { cellId: '20960:105930', count: 1 },
      ]);
      expect(Object.keys(assignedStats.locationFrequency[0]).sort()).toEqual([
        'cellId',
        'count',
      ]);
      await expect(getVehicleStatistics(unassignedOfficer)).resolves.toEqual({
        monthlyFrequency: [],
        locationFrequency: [],
      });

      const commanderStats = await getVehicleStatistics(commander);
      expect(commanderStats.monthlyFrequency).toContainEqual({
        month: '2026-02',
        count: expect.any(Number),
      });
      const audit = await prisma.auditEvent.findFirstOrThrow({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: '*',
          operation: 'vehicle_observation.statistics_read',
          actorId: fieldOfficer.id,
        },
      });
      expect(audit.metadata).toMatchObject({
        observationCount: 1,
        monthGroupCount: 1,
        locationGroupCount: 1,
      });
      expect(audit.metadata).not.toHaveProperty('latitude');
      expect(audit.metadata).not.toHaveProperty('cellId');
    });

    it('runs the registry lifecycle with history and single active identity', async () => {
      const plate = plateFor('L');
      const entryId = await createRegistry(
        ` ${plate.slice(0, 3)}-${plate.slice(3)} `,
      );
      const stored = await prisma.suspiciousVehicleEntry.findUniqueOrThrow({
        where: { id: entryId },
      });
      expect(stored.plate).toBe(normalizePlate(plate));
      expect(stored).toMatchObject({ source: 'To dan pho', status: 'active' });

      await expect(
        createRegistryEntry(
          {
            plate: `89A@${stamp.slice(0, 4)}`,
            source: 'To dan pho',
            reason: 'Ly do.',
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          commander,
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
          commander,
        ),
      ).rejects.toThrow('DUPLICATE_ACTIVE_REGISTRY');

      const racePlate = plateFor('R');
      const raced = await Promise.allSettled([
        createRegistryEntry(
          {
            plate: racePlate,
            source: 'To dan pho',
            reason: 'Dua 1.',
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          commander,
        ),
        createRegistryEntry(
          {
            plate: racePlate,
            source: 'To dan pho',
            reason: 'Dua 2.',
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          commander,
        ),
      ]);
      for (const outcome of raced) {
        if (outcome.status === 'fulfilled') trackRegistry(outcome.value.id);
      }
      expect(raced.filter(({ status }) => status === 'fulfilled')).toHaveLength(
        1,
      );
      expect(raced.filter(({ status }) => status === 'rejected')).toHaveLength(
        1,
      );
      await expect(
        updateRegistryEntry({ entryId, status: 'archived' }, commander),
      ).rejects.toThrow('INVALID_REGISTRY_STATUS');

      const expired = await updateRegistryEntry(
        { entryId, status: 'expired' },
        commander,
      );
      expect(expired.status).toBe('expired');
      const renewedId = await createRegistry(plate, {
        validFrom: '2026-07-01T00:00:00.000Z',
      });
      expect(renewedId).not.toBe(entryId);

      const history = await prisma.eventRecord.findMany({
        where: {
          aggregateType: 'SuspiciousVehicleRegistry',
          aggregateId: entryId,
        },
        orderBy: { aggregateVersion: 'asc' },
      });
      expect(history.map(({ eventType }) => eventType)).toEqual([
        'SuspiciousVehicleRegistered',
        'SuspiciousVehicleRegistryUpdated',
      ]);
      const states = history.map(
        (event) =>
          (event.payload as { state: { reason: string } }).state.reason,
      );
      expect(states[0]).toContain('Lien quan');
    });

    it('records manual observations with GeoPoint and photo Evidence only', async () => {
      const plate = plateFor('M');
      const invalidPlate = `89A@${stamp.slice(4, 8)}`;
      await expect(
        recordVehicleObservation(
          {
            plate: invalidPlate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('INVALID_PLATE');
      await expect(
        recordVehicleObservation(
          {
            plate,
            observedAt: 'not-a-time',
            latitude: 20.96,
            longitude: 105.93,
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('OBSERVATION_FIELDS_REQUIRED');
      await expect(
        recordVehicleObservation(
          {
            plate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 91,
            longitude: 105.93,
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('INVALID_LATITUDE');
      await expect(
        recordVehicleObservation(
          {
            plate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
            evidenceIds: [randomUUID()],
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('EVIDENCE_NOT_FOUND');

      const storage = new LocalEvidenceStorage(storageRoot);
      const document = await createEvidence(storage, {
        resourceType: 'VehicleObservation',
        resourceId: `pending-${stamp}`,
        fileName: 'ghi-chu.txt',
        mimeType: 'text/plain',
        bytes: new TextEncoder().encode(`not-a-photo-${stamp}`),
        capturedAt: new Date('2026-09-19T01:00:00.000Z'),
        actorId: fieldOfficer.id,
      });
      evidenceIds.push(document.id);
      await expect(
        recordVehicleObservation(
          {
            plate,
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
            evidenceIds: [document.id],
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('EVIDENCE_SCOPE_FORBIDDEN');

      const pendingCommandId = `s47-pending-${stamp}-m`;
      const photo = await photoEvidence(
        `pending-${pendingCommandId}`,
        'sighting',
      );
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
          evidenceIds: [photo.id],
          clientCommandId: pendingCommandId,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      expect(observation).toMatchObject({
        status: 'recorded',
        plate: normalizePlate(plate),
      });
      expect(observation.evidenceIds).toEqual([photo.id]);
      await expect(
        prisma.auditEvent.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            operation: 'vehicle_observation.created',
          },
        }),
      ).resolves.toMatchObject({ metadata: { evidenceIds: [photo.id] } });
      await expect(
        attachVehicleObservationEvidence(
          observation.id,
          [photo.id],
          unassignedOfficer,
        ),
      ).rejects.toThrow('FORBIDDEN');
      const events = await readAggregateEvents(
        prisma,
        'VehicleObservation',
        observation.id,
      );
      expect(events.map(({ eventType }) => eventType)).toEqual([
        'VehicleObservationRecorded',
      ]);
      expect(events[0].aggregateVersion).toBe(1);
    });

    it('rolls back vehicle evidence and audit rows when attachment validation fails', async () => {
      const storage = new TrackingStorage();
      const { observation } = await recordVehicleObservation(
        {
          plate: plateFor('T'),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);

      await expect(
        createVehicleObservationEvidence(
          storage,
          {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            fileName: 'not-an-image.txt',
            mimeType: 'text/plain',
            bytes: new TextEncoder().encode('attachment failure'),
            capturedAt: new Date('2026-09-19T01:00:00.000Z'),
            actorId: fieldOfficer.id,
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('EVIDENCE_NOT_IMAGE');

      expect(storage.removed).toHaveLength(1);
      expect(
        await prisma.evidence.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
          },
        }),
      ).toBe(0);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            operation: 'evidence.uploaded',
          },
        }),
      ).toBe(0);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'VehicleObservation',
            aggregateId: observation.id,
            eventType: 'VehicleObservationEvidenceAttached',
          },
        }),
      ).toBe(0);
      await expect(
        prisma.vehicleObservation.findUniqueOrThrow({
          where: { id: observation.id },
        }),
      ).resolves.toMatchObject({ evidenceIds: [] });
    });

    it('matches only active entries and keeps expired history without matches', async () => {
      const activePlate = plateFor('A');
      const expiredPlate = plateFor('X');
      await createRegistry(activePlate);
      const expiredId = await createRegistry(expiredPlate, {
        validUntil: '2026-02-01T00:00:00.000Z',
      });
      await updateRegistryEntry(
        { entryId: expiredId, status: 'expired' },
        commander,
      );

      const matched = await recordVehicleObservation(
        {
          plate: activePlate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(matched.observation.id);
      expect(matched.observation.status).toBe('match_suggested');
      expect(matched.match?.id).toBeDefined();

      const stale = await recordVehicleObservation(
        {
          plate: expiredPlate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(stale.observation.id);
      expect(stale).toMatchObject({ match: null });
      expect(stale.observation.status).toBe('recorded');

      const unknown = await recordVehicleObservation(
        {
          plate: plateFor('U'),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(unknown.observation.id);
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
        matched.observation.id,
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
          resourceId: matched.observation.id,
        },
      });
      expect(suggestion).toMatchObject({ type: 'vehicle_match_suggested' });
    });

    it('requires authorized confirmation and rejects stale match transitions', async () => {
      const plate = plateFor('C');
      await createRegistry(plate);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);

      await expect(
        confirmVehicleMatch(observation.id, unassignedOfficer),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Chu xe: Nguyen Van A.',
            notes: 'Doi chieu.',
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('MATCH_CONFIRMATION_REQUIRED');
      await expect(
        escalateVehicleObservation(observation.id, fieldOfficer, orgId),
      ).rejects.toThrow('MATCH_CONFIRMATION_REQUIRED');

      const raced = await Promise.allSettled([
        confirmVehicleMatch(observation.id, fieldOfficer),
        confirmVehicleMatch(observation.id, fieldOfficer),
      ]);
      expect(raced.filter(({ status }) => status === 'fulfilled')).toHaveLength(
        1,
      );
      const failures = raced.filter(
        ({ status }) => status === 'rejected',
      ) as PromiseRejectedResult[];
      expect(failures).toHaveLength(1);
      expect(String(failures[0].reason?.message)).toMatch(
        /MATCH_NOT_PENDING|STALE_OBSERVATION/,
      );

      const confirmed = await prisma.vehicleObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      expect(confirmed.status).toBe('match_confirmed');
      await expect(
        confirmVehicleMatch(observation.id, fieldOfficer),
      ).rejects.toThrow('MATCH_NOT_PENDING');
    });

    it('verifies without mutating the observation and keeps event order', async () => {
      const plate = plateFor('V');
      await createRegistry(plate);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      await confirmVehicleMatch(observation.id, fieldOfficer);

      const foreign = await photoEvidence(`foreign-${stamp}`, 'foreign');
      await expect(
        verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Chu xe: Tran Thi B.',
            notes: 'Kiem tra ngoai pham vi.',
            evidenceIds: [foreign.id],
          },
          fieldOfficer,
        ),
      ).rejects.toThrow('EVIDENCE_SCOPE_FORBIDDEN');

      const proof = await photoEvidence(observation.id, 'verify');
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
        fieldOfficer,
      );
      expect(verified.verification).toMatchObject({
        verifiedById: fieldOfficer.id,
        result: 'Chu xe: Tran Thi B.',
        ownerLookup: 'Tra cuu dang ky: Tran Thi B, dia chi X.',
      });
      const storedVerification =
        await prisma.vehicleVerification.findUniqueOrThrow({
          where: { id: verified.verification.id },
        });
      expect(storedVerification.ownerLookup).toBe(
        'Tra cuu dang ky: Tran Thi B, dia chi X.',
      );
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
      const versions = events.map(({ aggregateVersion }) => aggregateVersion);
      expect(versions).toEqual([1, 2, 3, 4]);
      const verificationEvent = events.find(
        ({ eventType }) => eventType === 'VehicleVerificationRecorded',
      );
      expect(
        (verificationEvent?.payload as { ownerLookup?: string }).ownerLookup,
      ).toBe('Tra cuu dang ky: Tran Thi B, dia chi X.');
    });

    it('keeps owner lookup nullable when verification has no lookup', async () => {
      const plate = plateFor('N');
      await createRegistry(plate);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      await confirmVehicleMatch(observation.id, fieldOfficer);
      const verified = await verifyVehicleObservation(
        {
          observationId: observation.id,
          result: 'Chu xe: chua tra cuu.',
          notes: 'Ghi nhan hien truong, khong ket luan vi pham.',
        },
        fieldOfficer,
      );
      expect(verified.verification.ownerLookup).toBeNull();
      const stored = await prisma.vehicleVerification.findUniqueOrThrow({
        where: { id: verified.verification.id },
      });
      expect(stored.ownerLookup).toBeNull();
    });

    it('rejects stale confirmations through an explicit baseVersion', async () => {
      const plate = plateFor('B');
      await createRegistry(plate);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      const current = await prisma.vehicleObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });

      await expect(
        confirmVehicleMatch(observation.id, fieldOfficer, {
          baseVersion: current.version - 1,
        }),
      ).rejects.toThrow('STALE_OBSERVATION');
      await expect(
        confirmVehicleMatch(observation.id, unassignedOfficer, {
          baseVersion: current.version,
        }),
      ).rejects.toThrow('FORBIDDEN');

      const confirmed = await confirmVehicleMatch(
        observation.id,
        fieldOfficer,
        {
          baseVersion: current.version,
        },
      );
      expect(confirmed.status).toBe('match_confirmed');

      await expect(
        confirmVehicleMatch(observation.id, fieldOfficer, {
          baseVersion: current.version,
        }),
      ).rejects.toThrow(/MATCH_NOT_PENDING|STALE_OBSERVATION/);
    });

    it(
      'holds a continuous two-hour SLA with overdue, retry and duplicate safety',
      async () => {
        const saturday = new Date('2026-09-19T01:00:00.000Z');
        expect(saturday.getUTCDay()).toBe(6);
        const suspiciousPlate = plateFor('S');
        await createRegistry(suspiciousPlate);
        const { observation } = await recordVehicleObservation(
          {
            plate: suspiciousPlate,
            observedAt: saturday.toISOString(),
            latitude: 20.96,
            longitude: 105.93,
          },
          fieldOfficer,
        );
        trackObservation(observation.id);

        const nonMatch = await recordVehicleObservation(
          {
            plate: plateFor('N'),
            observedAt: saturday.toISOString(),
            latitude: 20.96,
            longitude: 105.93,
          },
          fieldOfficer,
        );
        trackObservation(nonMatch.observation.id);
        expect(
          await prisma.slaInstance.count({
            where: {
              resourceType: 'VehicleObservation',
              resourceId: nonMatch.observation.id,
              kind: 'vehicle_escalation_2h',
            },
          }),
        ).toBe(0);

        const sla = await prisma.slaInstance.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            kind: 'vehicle_escalation_2h',
          },
        });
        expect(sla.dueAt.toISOString()).toBe('2026-09-19T03:00:00.000Z');
        expect(sla.dueAt.getUTCDay()).toBe(6);

        await confirmVehicleMatch(observation.id, fieldOfficer);
        await verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Verified',
            notes: 'Registry match checked.',
          },
          fieldOfficer,
        );
        await expect(
          prisma.slaInstance.findUniqueOrThrow({ where: { id: sla.id } }),
        ).resolves.toMatchObject({ status: 'active', completedAt: null });

        await markOverdue(new Date('2026-09-19T03:00:01.000Z'));
        await markOverdue(new Date('2026-09-19T03:00:01.000Z'));
        expect(
          await prisma.slaInstance.findUniqueOrThrow({ where: { id: sla.id } }),
        ).toMatchObject({
          status: 'overdue',
        });
        expect(
          await prisma.eventRecord.count({
            where: {
              aggregateType: 'SlaInstance',
              aggregateId: sla.id,
              eventType: 'SlaOverdue',
            },
          }),
        ).toBe(1);

        const overdueEvent = await prisma.eventRecord.findFirstOrThrow({
          where: {
            aggregateType: 'SlaInstance',
            aggregateId: sla.id,
            eventType: 'SlaOverdue',
          },
        });
        const unrelatedStaleClaims = await prisma.outboxMessage.count({
          where: {
            status: 'processing',
            claimedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
            eventId: { not: overdueEvent.eventId },
          },
        });
        expect(unrelatedStaleClaims).toBe(0);
        for (const consumer of getEventConsumers(overdueEvent.eventType)) {
          const name = `${overdueEvent.eventType}:${consumer.name}`;
          const checkpoint = await prisma.projectionCheckpoint.findUnique({
            where: { name },
            select: {
              processedEventIds: true,
              lastRecordedAt: true,
              updatedAt: true,
            },
          });
          checkpointSnapshots.push({
            name,
            existed: checkpoint !== null,
            processedEventIds: Array.isArray(checkpoint?.processedEventIds)
              ? checkpoint.processedEventIds.filter(
                  (eventId): eventId is string => typeof eventId === 'string',
                )
              : [],
            lastRecordedAt: checkpoint?.lastRecordedAt ?? null,
            ...(checkpoint ? { updatedAt: checkpoint.updatedAt } : {}),
          });
        }
        await processOutboxUntilIdle({ eventId: overdueEvent.eventId });
        await processOutboxUntilIdle({ eventId: overdueEvent.eventId });
        await expect(
          prisma.auditEvent.findFirst({
            where: {
              resourceType: 'VehicleObservation',
              resourceId: observation.id,
              operation: 'vehicle_observation.created',
            },
          }),
        ).resolves.toMatchObject({
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          operation: 'vehicle_observation.created',
        });
        const replayed = await createInAppNotification({
          userId: fieldOfficer.id,
          type: 'sla_overdue',
          title: 'SLA qua han',
          body: 'Thu lai.',
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          sourceEventId: overdueEvent.eventId,
        });
        const duplicate = await createInAppNotification({
          userId: fieldOfficer.id,
          type: 'sla_overdue',
          title: 'SLA qua han',
          body: 'Thu lai.',
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          sourceEventId: overdueEvent.eventId,
        });
        expect(duplicate.id).toBe(replayed.id);

        const escalated = await escalateVehicleObservation(
          observation.id,
          fieldOfficer,
          parentOrgId,
        );
        const completedSla = await prisma.slaInstance.findUniqueOrThrow({
          where: { id: sla.id },
        });
        expect(completedSla.status).toBe('completed');
        expect(completedSla.completedAt?.toISOString()).toBe(
          escalated.escalatedAt?.toISOString(),
        );

        const clientCommandId = `s47-${stamp}-${randomUUID().slice(0, 8)}`;
        clientCommandIds.push(clientCommandId);
        const payload = {
          clientCommandId,
          actorId: commander.id,
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

        const duplicatePlate = plateFor('D');
        const duplicateCommandId = `s47-${stamp}-${randomUUID().slice(0, 8)}`;
        clientCommandIds.push(duplicateCommandId);
        const attempts = await Promise.allSettled([
          recordVehicleObservation(
            {
              plate: duplicatePlate,
              observedAt: '2026-09-19T04:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
              clientCommandId: duplicateCommandId,
            },
            fieldOfficer,
          ),
          recordVehicleObservation(
            {
              plate: duplicatePlate,
              observedAt: '2026-09-19T04:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
              clientCommandId: duplicateCommandId,
            },
            fieldOfficer,
          ),
        ]);
        const succeeded = attempts.filter(
          ({ status }) => status === 'fulfilled',
        );
        expect(succeeded).toHaveLength(2);
        const ids = succeeded.map(
          (outcome) =>
            (outcome as PromiseFulfilledResult<{ observation: { id: string } }>)
              .value.observation.id,
        );
        expect(ids[0]).toBe(ids[1]);
        trackObservation(ids[0]);
        expect(
          await prisma.eventRecord.count({
            where: {
              aggregateType: 'VehicleObservation',
              aggregateId: ids[0],
              eventType: 'VehicleObservationRecorded',
            },
          }),
        ).toBe(1);
      },
      databaseTestTimeoutMs,
    );

    it('keeps escalation retry idempotent after confirmation', async () => {
      const plate = plateFor('E');
      await createRegistry(plate);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        fieldOfficer,
      );
      trackObservation(observation.id);
      await confirmVehicleMatch(observation.id, fieldOfficer);

      await expect(
        escalateVehicleObservation(observation.id, fieldOfficer, peerOrgId),
      ).rejects.toThrow('ORGANIZATION_SCOPE_FORBIDDEN');

      const first = await escalateVehicleObservation(
        observation.id,
        fieldOfficer,
        parentOrgId,
      );
      const second = await escalateVehicleObservation(
        observation.id,
        fieldOfficer,
        parentOrgId,
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
    });
  },
  databaseTestTimeoutMs,
);
