import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import { rebuildIncidentProjection } from '@/modules/incidents';
import { rebuildInspectionProjection } from '@/modules/inspections';
import { rebuildVehicleProjection } from '@/modules/vehicles';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!postgresEnabled)('module projection replay', () => {
  beforeEach(async () => {
    await prisma.projectionRecord.deleteMany();
    await prisma.projectionCheckpoint.deleteMany();
    await prisma.outboxMessage.deleteMany();
    await prisma.eventRecord.deleteMany();
  });

  it('rebuilds read models from event snapshots without aggregate rows', async () => {
    const incidentId = randomUUID();
    const establishmentId = randomUUID();
    const inspectionId = randomUUID();
    const registryId = randomUUID();
    const observationId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'IncidentRegistered',
        eventVersion: 1,
        aggregateType: 'Incident',
        aggregateId: incidentId,
        aggregateVersion: 1,
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        actor: { id: 'actor-1', organizationId: 'unit-1' },
        payload: {
          state: {
            id: incidentId,
            status: 'received',
            category: null,
            severity: null,
            description: 'snapshot incident',
            latitude: null,
            longitude: null,
            assignedAt: null,
            resolvedAt: null,
            closedAt: null,
            version: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
        metadata: {},
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'EstablishmentRegistered',
        eventVersion: 1,
        aggregateType: 'Establishment',
        aggregateId: establishmentId,
        aggregateVersion: 1,
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        actor: { id: 'actor-1', organizationId: 'unit-1' },
        payload: {
          state: {
            id: establishmentId,
            name: 'Snapshot establishment',
            ownerName: 'Owner',
            address: 'Address',
            type: 'karaoke',
            licenseRef: null,
            latitude: null,
            longitude: null,
            active: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
        metadata: {},
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'InspectionScheduled',
        eventVersion: 1,
        aggregateType: 'Inspection',
        aggregateId: inspectionId,
        aggregateVersion: 1,
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        actor: { id: 'actor-1', organizationId: 'unit-1' },
        payload: {
          state: {
            id: inspectionId,
            establishmentId,
            assignedUserId: null,
            templateId: 'template-1',
            templateVersion: 1,
            scheduledAt: '2026-02-01T00:00:00.000Z',
            cadenceMonths: 6,
            startedAt: null,
            completedAt: null,
            status: 'scheduled',
            result: null,
            version: 1,
            checklistResponses: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
        metadata: {},
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SuspiciousVehicleRegistered',
        eventVersion: 1,
        aggregateType: 'SuspiciousVehicleRegistry',
        aggregateId: registryId,
        aggregateVersion: 1,
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        actor: { id: 'actor-1', organizationId: 'unit-1' },
        payload: {
          state: {
            id: registryId,
            plate: '89A12345',
            source: 'snapshot',
            reason: 'snapshot reason',
            validFrom: '2026-01-01T00:00:00.000Z',
            validUntil: null,
            status: 'active',
            createdById: 'actor-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
        metadata: {},
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'VehicleObservationRecorded',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: observationId,
        aggregateVersion: 1,
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        actor: { id: 'actor-1', organizationId: 'unit-1' },
        payload: {
          state: {
            id: observationId,
            plate: '89A12345',
            observedAt: '2026-01-01T00:00:00.000Z',
            latitude: '20.9',
            longitude: '105.8',
            description: 'snapshot observation',
            status: 'recorded',
            observedById: 'actor-1',
            clientCommandId: null,
            version: 1,
            evidenceIds: [],
            matchedRegistryId: null,
            matchConfirmedAt: null,
            matchConfirmedById: null,
            escalatedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        },
        metadata: {},
      });
    });

    await rebuildIncidentProjection(prisma);
    await rebuildInspectionProjection(prisma);
    await rebuildVehicleProjection(prisma);

    const projections = await prisma.projectionRecord.findMany({
      orderBy: { projectionName: 'asc' },
    });
    expect(projections).toHaveLength(5);
    expect(
      projections.find(({ aggregateId }) => aggregateId === incidentId)?.state,
    ).toMatchObject({ description: 'snapshot incident', status: 'received' });
    expect(
      projections.find(({ aggregateId }) => aggregateId === inspectionId)
        ?.state,
    ).toMatchObject({ establishmentId, status: 'scheduled' });
    expect(
      projections.find(({ aggregateId }) => aggregateId === observationId)
        ?.state,
    ).toMatchObject({ plate: '89A12345', status: 'recorded' });
  });
});
