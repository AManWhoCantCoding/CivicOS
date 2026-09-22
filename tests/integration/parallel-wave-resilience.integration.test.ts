import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  appendEvent,
  createEventWorker,
  getOutboxHealth,
  processOutboxUntilIdle,
  readAggregateEvents,
  registerEventConsumer,
  replayAggregate,
} from '@/modules/eventing';
import type { IdentityUser } from '@/modules/identity';
import {
  registerIntakeReport,
  rebuildIncidentProjection,
} from '@/modules/incidents';
import {
  rebuildInspectionProjection,
  registerEstablishment,
} from '@/modules/inspections';
import {
  normalizePlate,
  recordVehicleObservation,
  rebuildVehicleProjection,
} from '@/modules/vehicles';

const enabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = 'unit-nghia-tru';
const UPPER = 'unit-cap-tren';
const MAX_ATTEMPTS = Number(process.env.EVENT_MAX_ATTEMPTS ?? 5);
const FRESHNESS_SAMPLE_SIZE = 9;
const FRESHNESS_P95_THRESHOLD_MS = 10_000;

function resilienceUser(
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

const commander = resilienceUser(
  `resil-commander-${stamp}`,
  ['commander'],
  ORG,
);
const scopeActorIds = [commander.id];

const incidentIds: string[] = [];
const reportIds: string[] = [];
const establishmentIds: string[] = [];
const observationIds: string[] = [];
const syntheticEventIds: string[] = [];
const syntheticAggregateIds: string[] = [];
const checkpointNames: string[] = [];
const templateTypes: string[] = [`karaoke-resil-${stamp}`];
const unregisters: Array<() => void> = [];

function trackCheckpoint(eventType: string, consumerName: string): string {
  const name = `${eventType}:${consumerName}`;
  if (!checkpointNames.includes(name)) checkpointNames.push(name);
  return name;
}

function trackUnregister(unregister: () => void): () => void {
  unregisters.push(unregister);
  return unregister;
}

async function drainWithWorker(
  worker: { tick: () => Promise<void> },
  eventIds: string[],
  deadlineMs = 60000,
): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    await worker.tick();
    if (!eventIds.length) return;
    const rows = await prisma.outboxMessage.findMany({
      where: { eventId: { in: eventIds } },
    });
    const byId = new Map(rows.map((row) => [row.eventId, row]));
    const dead = [...byId.values()].filter(
      (row) => row.status === 'dead_letter',
    );
    if (dead.length) {
      throw new Error(
        `RESILIENCE_UNEXPECTED_DEAD_LETTER:${dead.map((row) => `${row.eventId}:${row.lastError ?? ''}`).join(',')}`,
      );
    }
    const unfinished = eventIds.filter((eventId) => {
      const row = byId.get(eventId);
      return !row || row.status === 'pending' || row.status === 'processing';
    });
    if (!unfinished.length) return;
    if (Date.now() > deadline) {
      throw new Error(`RESILIENCE_DRAIN_TIMEOUT:${unfinished.join(',')}`);
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function waitForProjection(
  worker: { tick: () => Promise<void> },
  projectionName: string,
  aggregateType: string,
  aggregateId: string,
  deadlineMs = 60000,
): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    const row = await prisma.projectionRecord.findUnique({
      where: {
        projectionName_aggregateType_aggregateId: {
          projectionName,
          aggregateType,
          aggregateId,
        },
      },
    });
    if (row) return;
    if (Date.now() > deadline) {
      throw new Error(
        `RESILIENCE_PROJECTION_TIMEOUT:${projectionName}:${aggregateId}`,
      );
    }
    await worker.tick();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function cleanupSynthetic(
  eventIds: string[],
  checkpoints: string[],
): Promise<void> {
  if (eventIds.length) {
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.eventRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }
  if (checkpoints.length) {
    await prisma.projectionCheckpoint.deleteMany({
      where: { name: { in: checkpoints } },
    });
  }
  if (syntheticAggregateIds.length) {
    await prisma.projectionRecord.deleteMany({
      where: { aggregateId: { in: [...syntheticAggregateIds] } },
    });
  }
  await prisma.projectionCheckpoint.deleteMany({
    where: { name: { startsWith: `ResilienceRestart-${stamp}` } },
  });
  await prisma.projectionCheckpoint.deleteMany({
    where: { name: { startsWith: `ResilienceExactlyOnce-${stamp}` } },
  });
  await prisma.projectionCheckpoint.deleteMany({
    where: { name: { startsWith: `ResilienceTerminal-${stamp}` } },
  });
}

async function cleanupScope(): Promise<void> {
  const trackedIds = [
    ...incidentIds,
    ...reportIds,
    ...establishmentIds,
    ...observationIds,
  ];
  const audits = await prisma.auditEvent.findMany({
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
        ...observationIds.map((resourceId) => ({
          resourceType: 'VehicleObservation',
          resourceId,
        })),
        { resourceId: '*', actorId: { in: scopeActorIds } },
      ],
    },
    select: { id: true },
  });
  const auditIds = audits.map(({ id }) => id);
  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        ...incidentIds.map((resourceId) => ({
          resourceType: 'Incident',
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
  const assignmentIds = assignments.map(({ id }) => id);
  const slas = await prisma.slaInstance.findMany({
    where: { resourceId: { in: trackedIds } },
    select: { id: true },
  });
  const slaIds = slas.map(({ id }) => id);
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
    where: { aggregateId: { in: trackedIds } },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { resourceId: { in: trackedIds } },
        { userId: { in: scopeActorIds } },
      ],
    },
  });
  await prisma.vehicleVerification.deleteMany({
    where: { observationId: { in: observationIds } },
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
  if (observationIds.length) {
    await prisma.vehicleObservation.deleteMany({
      where: { id: { in: observationIds } },
    });
  }
  if (establishmentIds.length) {
    await prisma.establishment.deleteMany({
      where: { id: { in: establishmentIds } },
    });
  }
  if (templateTypes.length) {
    await prisma.checklistTemplate.deleteMany({
      where: { establishmentType: { in: templateTypes } },
    });
  }
  if (incidentIds.length) {
    await prisma.incident.deleteMany({ where: { id: { in: incidentIds } } });
  }
  if (reportIds.length) {
    await prisma.intakeReport.deleteMany({ where: { id: { in: reportIds } } });
  }
  await cleanupSynthetic([...syntheticEventIds], [...checkpointNames]);
  incidentIds.length = 0;
  reportIds.length = 0;
  establishmentIds.length = 0;
  observationIds.length = 0;
  syntheticEventIds.length = 0;
  syntheticAggregateIds.length = 0;
  checkpointNames.length = 0;
}

describe.skipIf(!enabled)(
  'parallel wave resilience and projection freshness',
  () => {
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
      await prisma.user.create({
        data: {
          id: commander.id,
          email: commander.email,
          name: commander.name,
          passwordHash: `resil-hash-${stamp}`,
          organizationUnitId: commander.organizationUnitId,
        },
      });
    });

    afterAll(async () => {
      for (const unregister of unregisters.splice(0)) {
        try {
          unregister();
        } catch {
          continue;
        }
      }
      await cleanupScope();
      await prisma.session.deleteMany({
        where: { userId: { in: scopeActorIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: scopeActorIds } } });
    });

    it(
      'resumes pending outbox work after a local worker restart with no dead letters',
      { timeout: 60000 },
      async () => {
        const stopped = createEventWorker();
        stopped.stop();
        const eventType = `ResilienceRestart-${stamp}`;
        const aggregateId = `resil-restart-${stamp}`;
        const eventId = randomUUID();
        syntheticEventIds.push(eventId);
        syntheticAggregateIds.push(aggregateId);
        let deliveries = 0;
        const consumerName = `resil-restart-consumer-${stamp}`;
        trackCheckpoint(eventType, consumerName);
        const unregister = trackUnregister(
          registerEventConsumer(
            eventType,
            async () => {
              deliveries += 1;
            },
            consumerName,
          ),
        );
        try {
          await prisma.$transaction((tx) =>
            appendEvent(tx, {
              eventId,
              eventType,
              eventVersion: 1,
              aggregateType: 'ResilienceProbe',
              aggregateId,
              aggregateVersion: 1,
              occurredAt: new Date(),
              actor: { id: commander.id },
              payload: { stamp },
              metadata: {},
            }),
          );
          const pendingWhileStopped =
            await prisma.outboxMessage.findUniqueOrThrow({
              where: { eventId },
            });
          expect(pendingWhileStopped.status).toBe('pending');
          expect(deliveries).toBe(0);
          const fresh = createEventWorker();
          try {
            await drainWithWorker(fresh, [eventId]);
          } finally {
            fresh.stop();
          }
          expect(deliveries).toBe(1);
          await expect(
            prisma.outboxMessage.findUniqueOrThrow({ where: { eventId } }),
          ).resolves.toMatchObject({ status: 'processed' });
          const health = await getOutboxHealth();
          expect(health.deadLetterCount).toBe(0);
          const scopedDead = await prisma.outboxMessage.count({
            where: { eventId, status: 'dead_letter' },
          });
          expect(scopedDead).toBe(0);
        } finally {
          unregister();
          await cleanupSynthetic([eventId], [`${eventType}:${consumerName}`]);
          syntheticEventIds.splice(
            0,
            syntheticEventIds.length,
            ...syntheticEventIds.filter((id) => id !== eventId),
          );
        }
      },
    );

    it(
      'keeps exactly-once checkpoints across duplicate delivery and failing consumers',
      { timeout: 90000 },
      async () => {
        const eventType = `ResilienceExactlyOnce-${stamp}`;
        const consumerName = `resil-once-${stamp}`;
        const checkpointName = trackCheckpoint(eventType, consumerName);
        const aggregateId = `resil-once-${stamp}`;
        const eventId = randomUUID();
        syntheticEventIds.push(eventId);
        syntheticAggregateIds.push(aggregateId);
        let deliveries = 0;
        const unregister = trackUnregister(
          registerEventConsumer(
            eventType,
            async () => {
              deliveries += 1;
            },
            consumerName,
          ),
        );
        try {
          const input = {
            eventId,
            eventType,
            eventVersion: 1,
            aggregateType: 'ResilienceProbe',
            aggregateId,
            aggregateVersion: 1,
            occurredAt: new Date(),
            actor: { id: commander.id },
            payload: { stamp },
            metadata: {},
          };
          await prisma.$transaction((tx) => appendEvent(tx, input));
          const duplicate = await prisma.$transaction((tx) =>
            appendEvent(tx, input),
          );
          expect(duplicate.eventId).toBe(eventId);
          expect(await prisma.eventRecord.count({ where: { eventId } })).toBe(
            1,
          );
          expect(await prisma.outboxMessage.count({ where: { eventId } })).toBe(
            1,
          );
          expect(await processOutboxUntilIdle()).toBeGreaterThan(0);
          expect(deliveries).toBe(1);
          expect(await processOutboxUntilIdle()).toBe(0);
          expect(deliveries).toBe(1);
          const checkpoint = await prisma.projectionCheckpoint.findUnique({
            where: { name: checkpointName },
          });
          expect(checkpoint?.processedEventIds).toEqual([eventId]);
        } finally {
          unregister();
          await cleanupSynthetic([eventId], [checkpointName]);
          syntheticEventIds.splice(
            0,
            syntheticEventIds.length,
            ...syntheticEventIds.filter((id) => id !== eventId),
          );
        }

        const failType = `ResilienceTerminal-${stamp}`;
        const failConsumer = `resil-terminal-${stamp}`;
        const failCheckpoint = trackCheckpoint(failType, failConsumer);
        const failEventId = randomUUID();
        syntheticEventIds.push(failEventId);
        syntheticAggregateIds.push(`resil-terminal-${stamp}`);
        let attempts = 0;
        const unregisterFail = trackUnregister(
          registerEventConsumer(
            failType,
            async () => {
              attempts += 1;
              throw new Error(`Resilience consumer boom ${stamp}`);
            },
            failConsumer,
          ),
        );
        try {
          await prisma.$transaction((tx) =>
            appendEvent(tx, {
              eventId: failEventId,
              eventType: failType,
              eventVersion: 1,
              aggregateType: 'ResilienceProbe',
              aggregateId: `resil-terminal-${stamp}`,
              aggregateVersion: 1,
              occurredAt: new Date(),
              actor: { id: commander.id },
              payload: { stamp },
              metadata: {},
            }),
          );
          const observed: number[] = [];
          for (let cycle = 0; cycle < MAX_ATTEMPTS; cycle += 1) {
            expect(await processOutboxUntilIdle()).toBeGreaterThan(0);
            const message = await prisma.outboxMessage.findUniqueOrThrow({
              where: { eventId: failEventId },
            });
            observed.push(message.attempts);
            if (message.status === 'dead_letter') break;
            expect(message.status).toBe('pending');
            expect(message.availableAt.getTime()).toBeGreaterThan(Date.now());
            expect(message.lastError).toContain('Resilience consumer boom');
            await prisma.outboxMessage.update({
              where: { eventId: failEventId },
              data: { availableAt: new Date(Date.now() - 1000) },
            });
          }
          const terminal = await prisma.outboxMessage.findUniqueOrThrow({
            where: { eventId: failEventId },
          });
          expect(terminal.status).toBe('dead_letter');
          expect(terminal.attempts).toBe(MAX_ATTEMPTS);
          expect(observed).toEqual(
            Array.from({ length: MAX_ATTEMPTS }, (_, index) => index + 1),
          );
          expect(terminal.deadLetterAt).not.toBeNull();
          const frozen = attempts;
          expect(await processOutboxUntilIdle()).toBe(0);
          expect(attempts).toBe(frozen);
        } finally {
          unregisterFail();
          await cleanupSynthetic([failEventId], [failCheckpoint]);
          syntheticEventIds.splice(
            0,
            syntheticEventIds.length,
            ...syntheticEventIds.filter((id) => id !== failEventId),
          );
          checkpointNames.splice(
            0,
            checkpointNames.length,
            ...checkpointNames.filter(
              (name) => name !== failCheckpoint && name !== checkpointName,
            ),
          );
        }
        expect(
          await prisma.outboxMessage.count({ where: { eventId: failEventId } }),
        ).toBe(0);
      },
    );

    it(
      'replays after failure without duplicating notifications or audit side effects',
      { timeout: 90000 },
      async () => {
        const registered = await registerIntakeReport(
          {
            channel: 'in_person',
            receivedAt: new Date().toISOString(),
            content: `Resilience replay probe ${stamp}`,
            idempotencyKey: `resil-replay:${stamp}:${randomUUID()}`,
          },
          commander,
        );
        incidentIds.push(registered.incidentId);
        reportIds.push(registered.reportId);
        const establishment = await registerEstablishment(
          {
            name: `Co so resil replay ${stamp}`,
            ownerName: 'Chu co so',
            address: `Dia chi resil replay ${stamp}`,
            type: templateTypes[0],
          },
          commander,
        );
        establishmentIds.push(establishment.id);
        const plate = normalizePlate(
          `89R${stamp.slice(0, 4).toUpperCase()}901`,
        );
        const { observation } = await recordVehicleObservation(
          {
            plate,
            observedAt: new Date().toISOString(),
            latitude: 20.96,
            longitude: 105.93,
            description: `Quan sat resil replay ${stamp}`,
            clientCommandId: `resil-replay-${stamp}`,
          },
          commander,
        );
        observationIds.push(observation.id);
        await processOutboxUntilIdle();
        const incidentHistory = await readAggregateEvents(
          prisma,
          'Incident',
          registered.incidentId,
        );
        const inspectionHistory = await readAggregateEvents(
          prisma,
          'Establishment',
          establishment.id,
        );
        const vehicleHistory = await readAggregateEvents(
          prisma,
          'VehicleObservation',
          observation.id,
        );
        const beforeNotifications = await prisma.notification.count({
          where: {
            OR: [{ resourceId: { in: [...incidentIds, ...observationIds] } }],
          },
        });
        const beforeAudits = await prisma.auditEvent.count({
          where: {
            resourceId: {
              in: [
                ...incidentIds,
                ...reportIds,
                ...establishmentIds,
                ...observationIds,
              ],
            },
          },
        });
        const beforeIncident = await prisma.projectionRecord.findUnique({
          where: {
            projectionName_aggregateType_aggregateId: {
              projectionName: 'incident-read-model',
              aggregateType: 'Incident',
              aggregateId: registered.incidentId,
            },
          },
        });
        expect(beforeIncident).not.toBeNull();
        for (const [aggregateType, aggregateId, history] of [
          ['Incident', registered.incidentId, incidentHistory],
          ['Establishment', establishment.id, inspectionHistory],
          ['VehicleObservation', observation.id, vehicleHistory],
        ] as const) {
          const seen: string[] = [];
          const replayed = await replayAggregate(
            prisma,
            aggregateType,
            aggregateId,
            async (event) => {
              seen.push(event.eventId);
            },
          );
          expect(replayed).toBe(history.length);
          expect(seen).toEqual(history.map(({ eventId }) => eventId));
        }
        expect(await rebuildIncidentProjection()).toBeGreaterThan(0);
        expect(await rebuildInspectionProjection()).toBeGreaterThan(0);
        expect(await rebuildVehicleProjection()).toBeGreaterThan(0);
        const afterIncident = await prisma.projectionRecord.findUnique({
          where: {
            projectionName_aggregateType_aggregateId: {
              projectionName: 'incident-read-model',
              aggregateType: 'Incident',
              aggregateId: registered.incidentId,
            },
          },
        });
        expect(afterIncident?.state).toEqual(beforeIncident?.state);
        await expect(
          prisma.notification.count({
            where: {
              OR: [{ resourceId: { in: [...incidentIds, ...observationIds] } }],
            },
          }),
        ).resolves.toBe(beforeNotifications);
        await expect(
          prisma.auditEvent.count({
            where: {
              resourceId: {
                in: [
                  ...incidentIds,
                  ...reportIds,
                  ...establishmentIds,
                  ...observationIds,
                ],
              },
            },
          }),
        ).resolves.toBe(beforeAudits);
      },
    );

    it(
      'keeps append-to-projection p95 within 10 seconds across three module paths',
      { timeout: 120000 },
      async () => {
        const worker = createEventWorker();
        try {
          type Sample = {
            kind: string;
            projectionName: string;
            aggregateType: string;
            aggregateId: string;
            startedAt: number;
          };
          const samples: Sample[] = [];
          for (let index = 0; index < 3; index += 1) {
            const startedAt = Date.now();
            const registered = await registerIntakeReport(
              {
                channel: 'in_person',
                receivedAt: new Date().toISOString(),
                content: `Resilience freshness incident ${stamp} ${index}`,
                idempotencyKey: `resil-fresh-incident:${stamp}:${index}:${randomUUID()}`,
              },
              commander,
            );
            incidentIds.push(registered.incidentId);
            reportIds.push(registered.reportId);
            samples.push({
              kind: 'incident',
              projectionName: 'incident-read-model',
              aggregateType: 'Incident',
              aggregateId: registered.incidentId,
              startedAt,
            });
          }
          for (let index = 0; index < 3; index += 1) {
            const startedAt = Date.now();
            const establishment = await registerEstablishment(
              {
                name: `Co so resil fresh ${stamp} ${index}`,
                ownerName: 'Chu co so',
                address: `Dia chi resil fresh ${stamp} ${index}`,
                type: templateTypes[0],
              },
              commander,
            );
            establishmentIds.push(establishment.id);
            samples.push({
              kind: 'establishment',
              projectionName: 'establishment-read-model',
              aggregateType: 'Establishment',
              aggregateId: establishment.id,
              startedAt,
            });
          }
          for (let index = 0; index < 3; index += 1) {
            const startedAt = Date.now();
            const plate = normalizePlate(
              `89R${stamp.slice(0, 4).toUpperCase()}${index}11`,
            );
            const { observation } = await recordVehicleObservation(
              {
                plate,
                observedAt: new Date().toISOString(),
                latitude: 20.96,
                longitude: 105.93,
                description: `Quan sat resil fresh ${stamp} ${index}`,
                clientCommandId: `resil-fresh-${stamp}-${index}`,
              },
              commander,
            );
            observationIds.push(observation.id);
            samples.push({
              kind: 'vehicle',
              projectionName: 'vehicle-observation-read-model',
              aggregateType: 'VehicleObservation',
              aggregateId: observation.id,
              startedAt,
            });
          }
          expect(samples).toHaveLength(FRESHNESS_SAMPLE_SIZE);
          const latencies: number[] = [];
          for (const sample of samples) {
            await waitForProjection(
              worker,
              sample.projectionName,
              sample.aggregateType,
              sample.aggregateId,
            );
            latencies.push(Date.now() - sample.startedAt);
          }
          await drainWithWorker(worker, []);
          await processOutboxUntilIdle();
          const sorted = [...latencies].sort((left, right) => left - right);
          const p95 = sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)];
          const max = sorted[sorted.length - 1] ?? 0;
          console.log(
            `RESILIENCE_FRESHNESS sample=${sorted.length} threshold_ms=${FRESHNESS_P95_THRESHOLD_MS} p95_ms=${p95} max_ms=${max} latencies_ms=${sorted.join(',')}`,
          );
          expect(sorted).toHaveLength(FRESHNESS_SAMPLE_SIZE);
          expect(p95).toBeLessThanOrEqual(FRESHNESS_P95_THRESHOLD_MS);
          expect(max).toBeLessThanOrEqual(FRESHNESS_P95_THRESHOLD_MS);
          expect(
            sorted.filter((kind) => kind <= FRESHNESS_P95_THRESHOLD_MS).length,
          ).toBe(FRESHNESS_SAMPLE_SIZE);
        } finally {
          worker.stop();
        }
      },
    );
  },
);
