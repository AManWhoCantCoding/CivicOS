import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
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
  createVehicleObservationEvidence,
  createRegistryEntry,
  escalateVehicleObservation,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from '@/modules/vehicles';
import { attachVehicleObservationEvidence } from '@/modules/vehicles';
import { normalizePlate } from '@/modules/vehicles';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const databaseTestTimeoutMs = 15_000;
const stamp = randomUUID().slice(0, 8);
const orgId = 'unit-nghia-tru';
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

function trackRegistry(id: string): string {
  registryIds.push(id);
  return id;
}

function trackObservation(id: string): string {
  observationIds.push(id);
  return id;
}

function plateFor(marker: string): string {
  return `89${marker}${stamp.slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
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
        ['unit-cap-tren', 'Cap tren', null],
        [orgId, 'Nghia Tru', 'unit-cap-tren'],
        ['unit-peer', 'Don vi ngang cap', 'unit-cap-tren'],
      ] as const) {
        await prisma.organizationUnit.upsert({
          where: { id },
          update: { active: true },
          create: { id, name, level: 'unit', parentId },
        });
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
      }
    });

    afterAll(async () => {
      await prisma.assignment.deleteMany({
        where: {
          assigneeUserId: {
            in: [commander.id, fieldOfficer.id, unassignedOfficer.id],
          },
        },
      });
      await prisma.notification.deleteMany({
        where: {
          userId: { in: [commander.id, fieldOfficer.id, unassignedOfficer.id] },
        },
      });
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
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [orgId, 'unit-cap-tren', 'unit-peer'] } },
      });
    });

    afterEach(async () => {
      const events = observationIds.length
        ? await prisma.eventRecord.findMany({
            where: {
              OR: [
                {
                  aggregateType: 'VehicleObservation',
                  aggregateId: { in: observationIds },
                },
                {
                  aggregateType: 'SuspiciousVehicleRegistry',
                  aggregateId: { in: registryIds },
                },
              ],
            },
            select: { eventId: true },
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
      await prisma.projectionRecord.deleteMany({
        where: {
          OR: [
            { aggregateType: 'VehicleObservation' },
            { aggregateType: 'SuspiciousVehicleRegistry' },
          ],
        },
      });
      if (observationIds.length) {
        await prisma.notification.deleteMany({
          where: { resourceId: { in: observationIds } },
        });
        await prisma.notification.deleteMany({
          where: {
            userId: {
              in: [commander.id, fieldOfficer.id, unassignedOfficer.id],
            },
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
      await prisma.assignment.deleteMany({
        where: {
          assigneeUserId: {
            in: [commander.id, fieldOfficer.id, unassignedOfficer.id],
          },
        },
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
    });

    it('validates plates without over-normalizing local conventions', () => {
      expect(normalizePlate(' 89A-123.45 ')).toBe('89A12345');
      expect(normalizePlate('29a 456.78')).toBe('29A45678');
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
      expect(raced.filter(({ status }) => status === 'fulfilled')).toHaveLength(
        1,
      );
      expect(raced.filter(({ status }) => status === 'rejected')).toHaveLength(
        1,
      );
      for (const outcome of raced) {
        if (outcome.status === 'fulfilled') trackRegistry(outcome.value.id);
      }

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
          commander,
        ),
      ).rejects.toThrow('MATCH_CONFIRMATION_REQUIRED');
      await expect(
        escalateVehicleObservation(observation.id, commander, orgId),
      ).rejects.toThrow('MATCH_CONFIRMATION_REQUIRED');

      const raced = await Promise.allSettled([
        confirmVehicleMatch(observation.id, commander),
        confirmVehicleMatch(observation.id, commander),
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
        confirmVehicleMatch(observation.id, commander),
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
      await confirmVehicleMatch(observation.id, commander);

      const foreign = await photoEvidence(`foreign-${stamp}`, 'foreign');
      await expect(
        verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Chu xe: Tran Thi B.',
            notes: 'Kiem tra ngoai pham vi.',
            evidenceIds: [foreign.id],
          },
          commander,
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
        commander,
      );
      expect(verified.verification).toMatchObject({
        verifiedById: commander.id,
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
      await confirmVehicleMatch(observation.id, commander);
      const verified = await verifyVehicleObservation(
        {
          observationId: observation.id,
          result: 'Chu xe: chua tra cuu.',
          notes: 'Ghi nhan hien truong, khong ket luan vi pham.',
        },
        commander,
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
        confirmVehicleMatch(observation.id, commander, {
          baseVersion: current.version - 1,
        }),
      ).rejects.toThrow('STALE_OBSERVATION');
      await expect(
        confirmVehicleMatch(observation.id, unassignedOfficer, {
          baseVersion: current.version,
        }),
      ).rejects.toThrow('FORBIDDEN');

      const confirmed = await confirmVehicleMatch(observation.id, commander, {
        baseVersion: current.version,
      });
      expect(confirmed.status).toBe('match_confirmed');

      await expect(
        confirmVehicleMatch(observation.id, commander, {
          baseVersion: current.version,
        }),
      ).rejects.toThrow(/MATCH_NOT_PENDING|STALE_OBSERVATION/);
    });

    it(
      'holds a continuous two-hour SLA with overdue, retry and duplicate safety',
      async () => {
        const saturday = new Date('2026-09-19T01:00:00.000Z');
        expect(saturday.getUTCDay()).toBe(6);
        const { observation } = await recordVehicleObservation(
          {
            plate: plateFor('S'),
            observedAt: saturday.toISOString(),
            latitude: 20.96,
            longitude: 105.93,
          },
          fieldOfficer,
        );
        trackObservation(observation.id);

        const sla = await prisma.slaInstance.findFirstOrThrow({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            kind: 'vehicle_escalation_2h',
          },
        });
        expect(sla.dueAt.toISOString()).toBe('2026-09-19T03:00:00.000Z');
        expect(sla.dueAt.getUTCDay()).toBe(6);

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

        await processOutboxUntilIdle();
        await processOutboxUntilIdle();
        const overdueEvent = await prisma.eventRecord.findFirstOrThrow({
          where: {
            aggregateType: 'SlaInstance',
            aggregateId: sla.id,
            eventType: 'SlaOverdue',
          },
        });
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
      await confirmVehicleMatch(observation.id, commander);

      await expect(
        escalateVehicleObservation(observation.id, commander, 'unit-peer'),
      ).rejects.toThrow('ORGANIZATION_SCOPE_FORBIDDEN');

      const first = await escalateVehicleObservation(
        observation.id,
        commander,
        'unit-cap-tren',
      );
      const second = await escalateVehicleObservation(
        observation.id,
        commander,
        'unit-cap-tren',
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
