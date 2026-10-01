import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { processOutboxUntilIdle } from '@/modules/eventing';
import {
  assertAccess,
  createAssignments,
  revokeAssignment,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { createEvidenceRecord, LocalEvidenceStorage } from '@/modules/platform';
import {
  attachVehicleObservationEvidence,
  confirmVehicleMatch,
  createRegistryEntry,
  createVehicleObservationEvidence,
  escalateVehicleObservation,
  getObservation,
  isVehicleTaskCompatible,
  listObservations,
  listRegistry,
  recordVehicleObservation,
  updateRegistryEntry,
  verifyVehicleObservation,
} from '@/modules/vehicles';

const enabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = 'unit-nghia-tru';
const UPPER = 'unit-cap-tren';
const storageRoot = `/tmp/civicos-vehicle-auth-${stamp}`;
const storage = new LocalEvidenceStorage(storageRoot);

function vehicleUser(
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

const commander = vehicleUser(
  `vehicle-auth-commander-${stamp}`,
  ['commander'],
  ORG,
);
const field = vehicleUser(
  `vehicle-auth-field-${stamp}`,
  ['field_officer'],
  ORG,
);
const village = vehicleUser(
  `vehicle-auth-village-${stamp}`,
  ['village_officer'],
  ORG,
);
const office = vehicleUser(
  `vehicle-auth-office-${stamp}`,
  ['office_officer'],
  ORG,
);
const superior = vehicleUser(
  `vehicle-auth-superior-${stamp}`,
  ['superior_officer'],
  ORG,
);
const superiorCommander = vehicleUser(
  `vehicle-auth-superior-commander-${stamp}`,
  ['superior_commander'],
  ORG,
);
const operator = vehicleUser(
  `vehicle-auth-operator-${stamp}`,
  ['system_operator'],
  ORG,
);
const unassigned = vehicleUser(
  `vehicle-auth-unassigned-${stamp}`,
  ['field_officer'],
  ORG,
);
const crossField = vehicleUser(
  `vehicle-auth-cross-field-${stamp}`,
  ['field_officer'],
  UPPER,
);
const crossCommander = vehicleUser(
  `vehicle-auth-cross-commander-${stamp}`,
  ['commander'],
  UPPER,
);
const dbUsers = [
  commander,
  field,
  village,
  office,
  superior,
  superiorCommander,
  operator,
  unassigned,
  crossField,
  crossCommander,
];
const scopeActorIds = dbUsers.map(({ id }) => id);

const registryIds: string[] = [];
const observationIds: string[] = [];
const evidenceIds: string[] = [];
let plateCounter = 0;

function nextPlate(): string {
  plateCounter += 1;
  const suffix = `${stamp.slice(0, 2).toUpperCase()}${String(plateCounter).padStart(4, '0')}`;
  return `89T${suffix}`.slice(0, 12);
}

async function countVehicleEvents(observationId: string): Promise<number> {
  return prisma.eventRecord.count({
    where: { aggregateType: 'VehicleObservation', aggregateId: observationId },
  });
}

async function countMutationAudits(
  resourceId: string,
  actorId: string,
): Promise<number> {
  return prisma.auditEvent.count({
    where: { resourceType: 'VehicleObservation', resourceId, actorId },
  });
}

async function uploadVehicleEvidence(
  observationId: string,
  actor: IdentityUser,
  tag: string,
) {
  const { evidence } = await createEvidenceRecord(storage, {
    resourceType: 'VehicleObservation',
    resourceId: observationId,
    fileName: `${tag}.jpg`,
    mimeType: 'image/jpeg',
    bytes: new TextEncoder().encode(`vehicle-auth-${stamp}-${tag}`),
    capturedAt: new Date('2026-09-19T02:00:00.000Z'),
    actorId: actor.id,
    latitude: 20.961,
    longitude: 105.931,
  });
  evidenceIds.push(evidence.id);
  return evidence;
}

describe('vehicle role-task compatibility map', () => {
  it('keeps report work with village/field and verification work with field only', () => {
    expect(isVehicleTaskCompatible('vehicle_report', ['village_officer'])).toBe(
      true,
    );
    expect(isVehicleTaskCompatible('vehicle_report', ['field_officer'])).toBe(
      true,
    );
    expect(isVehicleTaskCompatible('vehicle_report', ['office_officer'])).toBe(
      false,
    );
    expect(isVehicleTaskCompatible('vehicle_report', ['commander'])).toBe(
      false,
    );
    expect(
      isVehicleTaskCompatible('vehicle_verification', ['field_officer']),
    ).toBe(true);
    expect(
      isVehicleTaskCompatible('vehicle_verification', ['village_officer']),
    ).toBe(false);
    expect(isVehicleTaskCompatible('vehicle_verification', ['commander'])).toBe(
      false,
    );
    expect(
      isVehicleTaskCompatible('vehicle_verification', ['office_officer']),
    ).toBe(false);
    expect(
      isVehicleTaskCompatible('vehicle_verification', ['system_operator']),
    ).toBe(false);
    expect(
      isVehicleTaskCompatible('not-a-vehicle-task', ['field_officer']),
    ).toBe(false);
  });
});

describe.skipIf(!enabled)('ticket 05 vehicle authorization matrix', () => {
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
          passwordHash: `vehicle-auth-hash-${stamp}`,
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
    const eventRows = await prisma.eventRecord.findMany({
      where: {
        OR: [
          ...observationIds.map((aggregateId) => ({
            aggregateType: 'VehicleObservation',
            aggregateId,
          })),
          ...registryIds.map((aggregateId) => ({
            aggregateType: 'SuspiciousVehicleRegistry',
            aggregateId,
          })),
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
      where: { aggregateId: { in: [...observationIds, ...registryIds] } },
    });
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { resourceId: { in: observationIds } },
          { userId: { in: scopeActorIds } },
        ],
      },
    });
    await prisma.vehicleVerification.deleteMany({
      where: { observationId: { in: observationIds } },
    });
    await prisma.slaInstance.deleteMany({
      where: { resourceId: { in: observationIds } },
    });
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          ...observationIds.map((resourceId) => ({
            resourceType: 'VehicleObservation',
            resourceId,
          })),
          ...registryIds.map((resourceId) => ({
            resourceType: 'SuspiciousVehicleRegistry',
            resourceId,
          })),
          { actorId: { in: scopeActorIds } },
        ],
      },
    });
    await prisma.assignment.deleteMany({
      where: {
        OR: [
          ...observationIds.map((resourceId) => ({
            resourceType: 'VehicleObservation',
            resourceId,
          })),
          { assigneeUserId: { in: scopeActorIds } },
        ],
      },
    });
    const evidenceRows = await prisma.evidence.findMany({
      where: { id: { in: evidenceIds } },
      select: { id: true, storageKey: true },
    });
    for (const { storageKey } of evidenceRows) {
      await storage.remove(storageKey).catch(() => undefined);
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
    await prisma.session.deleteMany({
      where: { userId: { in: scopeActorIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: scopeActorIds } } });
    await rm(storageRoot, { recursive: true, force: true });
  });

  it(
    'lets field officers report with time, GeoPoint and Evidence',
    { timeout: 60000 },
    async () => {
      const plate = nextPlate();
      const entry = await createRegistryEntry(
        {
          plate,
          source: 'To dan pho',
          reason: 'Phuc vu kiem thu field report.',
          validFrom: '2026-01-01T00:00:00.000Z',
        },
        commander,
      );
      registryIds.push(entry.id);
      const { observation } = await recordVehicleObservation(
        {
          plate: nextPlate(),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
          description: `Field report ${stamp}`,
        },
        field,
      );
      observationIds.push(observation.id);
      expect(observation.status).toBe('recorded');
      const proof = await uploadVehicleEvidence(
        observation.id,
        field,
        'field-initial',
      );
      const attached = await attachVehicleObservationEvidence(
        observation.id,
        [proof.id],
        field,
      );
      expect(attached.evidenceIds).toContain(proof.id);
      await expect(
        prisma.slaInstance.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
          },
        }),
      ).resolves.toBeGreaterThan(0);
      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            operation: 'vehicle_observation.created',
          },
        }),
      ).resolves.toBeGreaterThan(0);
    },
  );

  it(
    'lets field officers confirm, verify and escalate inside their scope',
    { timeout: 90000 },
    async () => {
      const plate = nextPlate();
      const entry = await createRegistryEntry(
        {
          plate,
          source: 'To dan pho',
          reason: 'Phuc vu lifecycle field.',
          validFrom: '2026-01-01T00:00:00.000Z',
        },
        commander,
      );
      registryIds.push(entry.id);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
          description: `Field lifecycle ${stamp}`,
        },
        field,
      );
      observationIds.push(observation.id);
      expect(observation.status).toBe('match_suggested');
      const confirmed = await confirmVehicleMatch(observation.id, field);
      expect(confirmed.status).toBe('match_confirmed');
      const proof = await uploadVehicleEvidence(
        observation.id,
        field,
        'field-verify',
      );
      const verified = await verifyVehicleObservation(
        {
          observationId: observation.id,
          result: 'Chu xe: Tran Thi B.',
          notes: 'Doi chieu so dang ky.',
          ownerLookup: 'Tra cuu dang ky.',
          evidenceIds: [proof.id],
        },
        field,
      );
      expect(verified.observation.status).toBe('verified');
      const escalated = await escalateVehicleObservation(
        observation.id,
        field,
        UPPER,
      );
      expect(escalated.status).toBe('escalated');
      for (const operation of [
        'vehicle_match.confirmed',
        'vehicle_verification.recorded',
        'vehicle_observation.escalated',
      ]) {
        await expect(
          prisma.auditEvent.count({
            where: {
              resourceType: 'VehicleObservation',
              resourceId: observation.id,
              operation,
            },
          }),
        ).resolves.toBeGreaterThan(0);
      }
    },
  );

  it(
    'lets village officers report with initial Evidence but denies match, verification and escalation',
    { timeout: 90000 },
    async () => {
      const plate = nextPlate();
      const entry = await createRegistryEntry(
        {
          plate,
          source: 'To dan pho',
          reason: 'Phuc vu kiem thu village.',
          validFrom: '2026-01-01T00:00:00.000Z',
        },
        commander,
      );
      registryIds.push(entry.id);
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.961,
          longitude: 105.931,
          description: `Village report ${stamp}`,
        },
        village,
      );
      observationIds.push(observation.id);
      expect(observation.status).toBe('match_suggested');
      const proof = await uploadVehicleEvidence(
        observation.id,
        village,
        'village-initial',
      );
      const attached = await attachVehicleObservationEvidence(
        observation.id,
        [proof.id],
        village,
      );
      expect(attached.evidenceIds).toContain(proof.id);
      const eventsBefore = await countVehicleEvents(observation.id);
      await expect(
        confirmVehicleMatch(observation.id, village),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Tu y',
            notes: 'Tu y xac minh',
          },
          village,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        escalateVehicleObservation(observation.id, village, UPPER),
      ).rejects.toThrow('FORBIDDEN');
      await expect(countVehicleEvents(observation.id)).resolves.toBe(
        eventsBefore,
      );
      await expect(
        countMutationAudits(observation.id, village.id),
      ).resolves.toBeGreaterThan(0);
      await expect(
        prisma.vehicleObservation.findUniqueOrThrow({
          where: { id: observation.id },
        }),
      ).resolves.toMatchObject({ status: 'match_suggested' });
    },
  );

  it(
    'denies office officers every registry and observation mutation',
    { timeout: 60000 },
    async () => {
      const guard = await createRegistryEntry(
        {
          plate: nextPlate(),
          source: 'To dan pho',
          reason: 'Muc bao ve kiem thu office.',
          validFrom: '2026-01-01T00:00:00.000Z',
        },
        commander,
      );
      registryIds.push(guard.id);
      const officeRegistryCountBefore =
        await prisma.suspiciousVehicleEntry.count({
          where: { source: 'Van phong' },
        });
      await expect(
        createRegistryEntry(
          {
            plate: nextPlate(),
            source: 'Van phong',
            reason: 'Office tu y tao registry.',
            validFrom: '2026-01-01T00:00:00.000Z',
          },
          office,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        updateRegistryEntry(
          { entryId: guard.id, reason: 'Office tu y sua.' },
          office,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(listRegistry(office)).rejects.toThrow('FORBIDDEN');
      await expect(
        recordVehicleObservation(
          {
            plate: nextPlate(),
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          office,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        prisma.suspiciousVehicleEntry.count({ where: { source: 'Van phong' } }),
      ).resolves.toBe(officeRegistryCountBefore);
    },
  );

  it(
    'denies commander fieldwork while keeping assignment-free command-scope read',
    { timeout: 90000 },
    async () => {
      const plate = nextPlate();
      const entry = await createRegistryEntry(
        {
          plate,
          source: 'To dan pho',
          reason: 'Phuc vu kiem thu commander.',
          validFrom: '2026-01-01T00:00:00.000Z',
        },
        commander,
      );
      registryIds.push(entry.id);
      await expect(
        recordVehicleObservation(
          {
            plate: nextPlate(),
            observedAt: '2026-09-19T01:00:00.000Z',
            latitude: 20.96,
            longitude: 105.93,
          },
          commander,
        ),
      ).rejects.toThrow('FORBIDDEN');
      const { observation } = await recordVehicleObservation(
        {
          plate,
          observedAt: '2026-12-01T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
          description: `Commander scope ${stamp}`,
        },
        field,
      );
      observationIds.push(observation.id);
      await createAssignments(
        {
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          task: 'vehicle_verification',
          assigneeUserIds: [commander.id],
          organizationId: ORG,
        },
        commander,
      );
      const eventsBefore = await countVehicleEvents(observation.id);
      await expect(
        confirmVehicleMatch(observation.id, commander),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Tu y',
            notes: 'Ch commander tu y',
          },
          commander,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        escalateVehicleObservation(observation.id, commander, UPPER),
      ).rejects.toThrow('FORBIDDEN');
      const proof = await uploadVehicleEvidence(
        observation.id,
        commander,
        'commander-proof',
      );
      await expect(
        attachVehicleObservationEvidence(observation.id, [proof.id], commander),
      ).rejects.toThrow('FORBIDDEN');
      await expect(countVehicleEvents(observation.id)).resolves.toBe(
        eventsBefore,
      );
      await expect(
        getObservation(observation.id, commander),
      ).resolves.toMatchObject({
        observation: expect.objectContaining({ id: observation.id }),
      });
      await expect(listRegistry(commander)).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: entry.id })]),
      );
      await processOutboxUntilIdle();
      const listed = await listObservations(commander);
      expect(
        listed.map((item) => String((item as { id: string }).id)),
      ).toContain(observation.id);
    },
  );

  it(
    'denies superior roles and system operators every vehicle mutation',
    { timeout: 60000 },
    async () => {
      const guard = await createRegistryEntry(
        {
          plate: nextPlate(),
          source: 'To dan pho',
          reason: 'Muc bao ve kiem thu superior.',
          validFrom: '2026-01-01T00:00:00.000Z',
        },
        commander,
      );
      registryIds.push(guard.id);
      const { observation } = await recordVehicleObservation(
        {
          plate: nextPlate(),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        field,
      );
      observationIds.push(observation.id);
      for (const actor of [superior, superiorCommander, operator]) {
        await expect(
          recordVehicleObservation(
            {
              plate: nextPlate(),
              observedAt: '2026-09-19T01:00:00.000Z',
              latitude: 20.96,
              longitude: 105.93,
            },
            actor,
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          createRegistryEntry(
            {
              plate: nextPlate(),
              source: 'Tu y',
              reason: 'Tu y tao registry.',
              validFrom: '2026-01-01T00:00:00.000Z',
            },
            actor,
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          confirmVehicleMatch(observation.id, actor),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          verifyVehicleObservation(
            { observationId: observation.id, result: 'Tu y', notes: 'Tu y' },
            actor,
          ),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          escalateVehicleObservation(observation.id, actor, UPPER),
        ).rejects.toThrow('FORBIDDEN');
      }
      await expect(
        countMutationAudits(observation.id, operator.id),
      ).resolves.toBe(0);
    },
  );

  it(
    'rejects revoked assignments, cross-unit access and invalid tasks without mutation',
    { timeout: 90000 },
    async () => {
      const { observation } = await recordVehicleObservation(
        {
          plate: nextPlate(),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        field,
      );
      observationIds.push(observation.id);
      const assignments = await prisma.assignment.findMany({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          assigneeUserId: field.id,
          status: 'active',
        },
      });
      for (const assignment of assignments)
        await revokeAssignment(assignment.id, commander, 'Ket thuc nhiem vu.');
      const eventsBefore = await countVehicleEvents(observation.id);
      await expect(getObservation(observation.id, field)).rejects.toThrow(
        'FORBIDDEN',
      );
      await expect(confirmVehicleMatch(observation.id, field)).rejects.toThrow(
        'FORBIDDEN',
      );
      await expect(
        verifyVehicleObservation(
          {
            observationId: observation.id,
            result: 'Sau thu hoi',
            notes: 'Sau thu hoi',
          },
          field,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(countVehicleEvents(observation.id)).resolves.toBe(
        eventsBefore,
      );
      await expect(getObservation(observation.id, crossField)).rejects.toThrow(
        'FORBIDDEN',
      );
      await expect(
        confirmVehicleMatch(observation.id, crossField),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        getObservation(observation.id, crossCommander),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        updateRegistryEntry(
          {
            entryId: registryIds[registryIds.length - 1],
            reason: 'Cross unit tu y sua.',
          },
          crossCommander,
        ),
      ).rejects.toThrow('FORBIDDEN');
      const assignmentCountBefore = await prisma.assignment.count({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
        },
      });
      await expect(
        createAssignments(
          {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            task: 'not-a-vehicle-task',
            assigneeUserIds: [field.id],
            organizationId: ORG,
          },
          commander,
        ),
      ).rejects.toThrow('INCOMPATIBLE_TASK');
      await expect(
        prisma.assignment.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
          },
        }),
      ).resolves.toBe(assignmentCountBefore);
      await expect(countVehicleEvents(observation.id)).resolves.toBe(
        eventsBefore,
      );
    },
  );

  it(
    'keeps Evidence scoped to its resource, actor and unit with full audit',
    { timeout: 90000 },
    async () => {
      const first = await recordVehicleObservation(
        {
          plate: nextPlate(),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        field,
      );
      observationIds.push(first.observation.id);
      const second = await recordVehicleObservation(
        {
          plate: nextPlate(),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        field,
      );
      observationIds.push(second.observation.id);
      const foreign = await uploadVehicleEvidence(
        second.observation.id,
        field,
        'foreign-proof',
      );
      await expect(
        attachVehicleObservationEvidence(
          first.observation.id,
          [foreign.id],
          field,
        ),
      ).rejects.toThrow('EVIDENCE_SCOPE_FORBIDDEN');
      const own = await uploadVehicleEvidence(
        first.observation.id,
        field,
        'own-proof',
      );
      await expect(
        attachVehicleObservationEvidence(
          first.observation.id,
          [own.id],
          unassigned,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        assertAccess(
          unassigned,
          {
            resourceType: 'VehicleObservation',
            resourceId: first.observation.id,
          },
          'read_sensitive',
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        assertAccess(
          crossCommander,
          {
            resourceType: 'VehicleObservation',
            resourceId: first.observation.id,
          },
          'read_sensitive',
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: first.observation.id,
            actorId: unassigned.id,
          },
        }),
      ).resolves.toBe(0);
    },
  );

  it(
    'binds created Evidence to the actual VehicleObservation and actor',
    { timeout: 90000 },
    async () => {
      const { observation } = await recordVehicleObservation(
        {
          plate: nextPlate(),
          observedAt: '2026-09-19T01:00:00.000Z',
          latitude: 20.96,
          longitude: 105.93,
        },
        field,
      );
      observationIds.push(observation.id);
      const bytes = new TextEncoder().encode(`bound-${stamp}`);
      const input = {
        resourceType: 'VehicleObservation',
        resourceId: observation.id,
        fileName: 'bound.jpg',
        mimeType: 'image/jpeg',
        bytes,
        capturedAt: new Date('2026-09-19T02:00:00.000Z'),
        actorId: field.id,
      };
      const evidenceBefore = await prisma.evidence.count({
        where: { resourceId: observation.id },
      });
      await expect(
        createVehicleObservationEvidence(
          storage,
          { ...input, resourceType: 'OtherResource' },
          field,
        ),
      ).rejects.toThrow('EVIDENCE_RESOURCE_TYPE_FORBIDDEN');
      await expect(
        createVehicleObservationEvidence(
          storage,
          { ...input, actorId: village.id },
          field,
        ),
      ).rejects.toThrow('EVIDENCE_ACTOR_MISMATCH');
      await expect(
        createVehicleObservationEvidence(
          storage,
          { ...input, actorId: crossField.id },
          crossField,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        prisma.evidence.count({ where: { resourceId: observation.id } }),
      ).resolves.toBe(evidenceBefore);
      const created = await createVehicleObservationEvidence(
        storage,
        input,
        field,
      );
      evidenceIds.push(created.id);
      expect(created.resourceType).toBe('VehicleObservation');
      expect(created.resourceId).toBe(observation.id);
      expect(created.actorId).toBe(field.id);
      await expect(
        prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            operation: 'evidence.uploaded',
            actorId: field.id,
          },
        }),
      ).resolves.toBe(1);
    },
  );
});
