import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import { blindIndex, encryptSensitive } from '@/modules/identity';
import { createAssignments } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import {
  listApplicationTimeline,
  reviewApplication,
} from '@/modules/land/application-service';
import { toLandApiError } from '@/modules/land/errors';
import { toGeometryParam } from '@/modules/land/parcel-geometry';
import { insertParcel } from '@/modules/land/parcel-repository';
import { insertParty } from '@/modules/land/party-repository';
import {
  parseApplicationInput,
  parseReviewBody,
  parseReviewVersion,
} from '@/modules/land/schemas';
import { createApplication } from '@/modules/land/application-service';

function actor(
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

describe('LND-08 review/timeline request parsing follows locked contract', () => {
  it('requires integer If-Match-Version header', () => {
    expect(parseReviewVersion('1')).toBe(1);
    expect(() => parseReviewVersion('')).toThrow('INVALID_REQUEST');
    expect(() => parseReviewVersion(null)).toThrow('INVALID_REQUEST');
    expect(() => parseReviewVersion('abc')).toThrow('INVALID_REQUEST');
    expect(() => parseReviewVersion('1.5')).toThrow('INVALID_REQUEST');
    expect(() => parseReviewVersion('0')).toThrow('INVALID_REQUEST');
  });

  it('requires empty object review body', () => {
    expect(parseReviewBody({})).toBeUndefined();
    expect(() => parseReviewBody(null)).toThrow('INVALID_REQUEST');
    expect(() => parseReviewBody([])).toThrow('INVALID_REQUEST');
    expect(() => parseReviewBody({ status: 'in_review' })).toThrow(
      'INVALID_REQUEST',
    );
  });

  it('maps review errors to stable LAND_* codes', () => {
    expect(toLandApiError(new Error('VERSION_CONFLICT'))).toMatchObject({
      status: 409,
      code: 'LAND_VERSION_CONFLICT',
    });
    expect(toLandApiError(new Error('INVALID_TRANSITION'))).toMatchObject({
      status: 409,
      code: 'LAND_INVALID_TRANSITION',
    });
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const SQUARE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [105, 20],
      [105.001, 20],
      [105.001, 20.001],
      [105, 20.001],
      [105, 20],
    ],
  ],
};

describe.skipIf(!postgresEnabled)(
  'LND-08 review transition and timeline',
  () => {
    const stamp = randomUUID().slice(0, 8);
    const ouA = `lnd08-ou-a-${stamp}`;
    const ouB = `lnd08-ou-b-${stamp}`;
    const officerId = `lnd08-officer-${stamp}`;
    const leaderId = `lnd08-leader-${stamp}`;
    const outsiderId = `lnd08-outsider-${stamp}`;

    const officerA = () => actor(officerId, ['land_officer'], ouA);
    const leaderA = () => actor(leaderId, ['commune_leader'], ouA);
    const outsider = () => actor(outsiderId, ['land_officer'], ouB);

    let partyCurrent = '';
    let partyNew = '';
    let parcelSubject = '';
    let keySeq = 0;
    const createdAppIds: string[] = [];

    function nextKey(prefix: string): string {
      keySeq += 1;
      return `lnd08-${prefix}-${stamp}-${keySeq}`;
    }

    function validInput() {
      return parseApplicationInput({
        changeType: 'transfer',
        changePayload: {
          shareChanges: [{ partyRole: 'proposed_holder', sharePercent: 100 }],
        },
        parties: [
          {
            partyId: partyCurrent,
            partyRole: 'current_holder',
            sharePercent: null,
          },
          {
            partyId: partyNew,
            partyRole: 'proposed_holder',
            sharePercent: '100.00',
          },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
    }

    async function createSubmittedWithAssignment(
      assigneeId: string,
    ): Promise<string> {
      const { application } = await createApplication(
        validInput(),
        officerA(),
        nextKey('app'),
      );
      createdAppIds.push(application.id);
      await createAssignments(
        {
          resourceType: 'LandChangeApplication',
          resourceId: application.id,
          task: 'land_review',
          assigneeUserIds: [assigneeId],
          organizationId: ouA,
        },
        leaderA(),
      );
      return application.id;
    }

    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ouA, name: 'LND08 unit A', level: 'commune' },
          { id: ouB, name: 'LND08 unit B', level: 'commune' },
        ],
      });
      for (const name of ['land_officer', 'commune_leader'] as const) {
        await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name },
        });
      }
      for (const [id, role, ou] of [
        [officerId, 'land_officer', ouA],
        [leaderId, 'commune_leader', ouA],
        [outsiderId, 'land_officer', ouB],
      ] as const) {
        await prisma.user.create({
          data: {
            id,
            email: `${id}@civicos.local`,
            name: id,
            passwordHash: `lnd08-hash-${stamp}`,
            organizationUnitId: ou,
          },
        });
        const roleRow = await prisma.role.findUniqueOrThrow({
          where: { name: role },
        });
        await prisma.userRole.create({
          data: { userId: id, roleId: roleRow.id },
        });
      }
      const current = await insertParty({
        referenceCode: `LND08-PARTY-CUR-${stamp}`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Current Holder'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd08-cur-${stamp}`),
      });
      const incoming = await insertParty({
        referenceCode: `LND08-PARTY-NEW-${stamp}`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Proposed Holder'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd08-new-${stamp}`),
      });
      partyCurrent = current.id;
      partyNew = incoming.id;
      const parcel = await insertParcel(
        {
          parcelCode: `LND08-PARCEL-${stamp}`,
          mapSheetNumber: `SHEET-${stamp}`,
          parcelNumber: `NUM-${stamp}`,
          areaSqm: '125.50',
          landUseType: 'residential',
          address: 'Dia chi demo',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(SQUARE),
      );
      parcelSubject = parcel.id;
    });

    afterAll(async () => {
      const eventRows = await prisma.eventRecord.findMany({
        where: {
          OR: [
            {
              aggregateType: 'LandChangeApplication',
              aggregateId: { in: createdAppIds },
            },
            { aggregateType: 'AuditEvent' },
          ],
        },
        select: { eventId: true, aggregateId: true },
      });
      const auditIds = (
        await prisma.auditEvent.findMany({
          where: { resourceId: { in: [...createdAppIds, '*'] } },
          select: { id: true },
        })
      ).map(({ id }) => id);
      const auditEventIds = eventRows
        .filter(({ aggregateId }) => auditIds.includes(aggregateId))
        .map(({ eventId }) => eventId);
      const appEventIds = eventRows
        .filter(({ aggregateId }) => createdAppIds.includes(aggregateId))
        .map(({ eventId }) => eventId);
      const outboxIds = [...new Set([...auditEventIds, ...appEventIds])];
      if (outboxIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: outboxIds } },
        });
      }
      if (appEventIds.length) {
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: appEventIds } },
        });
      }
      if (auditEventIds.length) {
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: auditEventIds } },
        });
      }
      if (auditIds.length) {
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      }
      if (createdAppIds.length) {
        await prisma.assignment.deleteMany({
          where: { resourceId: { in: createdAppIds } },
        });
        await prisma.landApplicationParcel.deleteMany({
          where: { applicationId: { in: createdAppIds } },
        });
        await prisma.landApplicationParty.deleteMany({
          where: { applicationId: { in: createdAppIds } },
        });
        await prisma.landChangeApplication.deleteMany({
          where: { id: { in: createdAppIds } },
        });
      }
      if (parcelSubject) {
        await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${parcelSubject}`;
      }
      if (partyCurrent) {
        await prisma.landParty.deleteMany({
          where: { id: { in: [partyCurrent, partyNew] } },
        });
      }
      await prisma.session.deleteMany({
        where: { userId: { in: [officerId, leaderId, outsiderId] } },
      });
      await prisma.userRole.deleteMany({
        where: { userId: { in: [officerId, leaderId, outsiderId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [officerId, leaderId, outsiderId] } },
      });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [ouA, ouB] } },
      });
      await prisma.$disconnect();
    });

    it('AC-01 assigned officer v1 + If-Match 1 -> v2/in_review with event+audit', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      const beforeEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      const beforeAudits = await prisma.auditEvent.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      const { application } = await reviewApplication(
        appId,
        officerA(),
        parseReviewVersion('1'),
        parseReviewBody({}),
      );
      expect(application.id).toBe(appId);
      expect(application.status).toBe('in_review');
      expect(application.version).toBe(2);
      const afterEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      const afterAudits = await prisma.auditEvent.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      expect(afterEvents).toBe(beforeEvents + 1);
      expect(afterAudits).toBe(beforeAudits + 1);
      const reviewEvent = await prisma.eventRecord.findFirst({
        where: {
          aggregateType: 'LandChangeApplication',
          aggregateId: appId,
          aggregateVersion: 2,
        },
      });
      expect(reviewEvent).not.toBeNull();
      const payload = reviewEvent!.payload as Record<string, unknown>;
      expect(payload).toMatchObject({ status: 'in_review' });
      expect(payload).toHaveProperty('beforeStatus', 'submitted');
      expect(payload).toHaveProperty('afterStatus', 'in_review');
      expect(JSON.stringify(payload)).not.toContain('changePayload');
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('in_review');
      expect(stored.version).toBe(2);
    });

    it('no assignment -> 403 ASSIGNMENT_REQUIRED and no mutation', async () => {
      const { application } = await createApplication(
        validInput(),
        officerA(),
        nextKey('noassign'),
      );
      createdAppIds.push(application.id);
      const beforeEvents = await prisma.eventRecord.count({
        where: {
          aggregateType: 'LandChangeApplication',
          aggregateId: application.id,
        },
      });
      await expect(
        reviewApplication(application.id, officerA(), 1, {}),
      ).rejects.toThrow('ASSIGNMENT_REQUIRED');
      try {
        await reviewApplication(application.id, officerA(), 1, {});
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 403,
          code: 'LAND_ASSIGNMENT_REQUIRED',
        });
      }
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: application.id },
      });
      expect(stored.status).toBe('submitted');
      expect(stored.version).toBe(1);
      const afterEvents = await prisma.eventRecord.count({
        where: {
          aggregateType: 'LandChangeApplication',
          aggregateId: application.id,
        },
      });
      expect(afterEvents).toBe(beforeEvents);
    });

    it('wrong OU -> FORBIDDEN without detail leak', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      await expect(reviewApplication(appId, outsider(), 1, {})).rejects.toThrow(
        'FORBIDDEN',
      );
      try {
        await reviewApplication(appId, outsider(), 1, {});
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 403,
          code: 'LAND_FORBIDDEN',
        });
        expect(toLandApiError(error)).not.toHaveProperty('application');
        expect(toLandApiError(error)).not.toHaveProperty('changePayload');
      }
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('submitted');
      expect(stored.version).toBe(1);
    });

    it('missing/invalid/stale version -> expected errors and no new event', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      const beforeEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      await expect(reviewApplication(appId, officerA(), 0, {})).rejects.toThrow(
        'INVALID_REQUEST',
      );
      await expect(
        reviewApplication(appId, officerA(), Number.NaN, {}),
      ).rejects.toThrow('INVALID_REQUEST');
      await expect(
        reviewApplication(appId, officerA(), 0, {}),
      ).rejects.toThrow();
      // Stale: first succeed to v2, then retry with old version 1.
      await reviewApplication(appId, officerA(), 1, {});
      const midEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      expect(midEvents).toBe(beforeEvents + 1);
      await expect(reviewApplication(appId, officerA(), 1, {})).rejects.toThrow(
        'VERSION_CONFLICT',
      );
      try {
        await reviewApplication(appId, officerA(), 1, {});
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 409,
          code: 'LAND_VERSION_CONFLICT',
        });
      }
      const afterEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      expect(afterEvents).toBe(midEvents);
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('in_review');
      expect(stored.version).toBe(2);
    });

    it('rejected/invalid status -> INVALID_TRANSITION with no mutation', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      await reviewApplication(appId, officerA(), 1, {});
      const beforeEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      await expect(reviewApplication(appId, officerA(), 2, {})).rejects.toThrow(
        'INVALID_TRANSITION',
      );
      try {
        await reviewApplication(appId, officerA(), 2, {});
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 409,
          code: 'LAND_INVALID_TRANSITION',
        });
      }
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('in_review');
      expect(stored.version).toBe(2);
      const afterEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      expect(afterEvents).toBe(beforeEvents);
    });

    it('timeline returns two events ordered by occurredAt with safe projection', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      await reviewApplication(appId, officerA(), 1, {});
      const { events } = await listApplicationTimeline(appId, officerA());
      expect(events.length).toBeGreaterThanOrEqual(2);
      const occurred = events.map((e) => e.occurredAt);
      expect([...occurred].sort()).toEqual(occurred);
      for (const event of events) {
        expect(event).toEqual({
          eventId: expect.any(String),
          eventType: expect.any(String),
          aggregateType: 'LandChangeApplication',
          aggregateId: appId,
          aggregateVersion: expect.any(Number),
          actor: expect.anything(),
          payload: expect.any(Object),
          metadata: expect.any(Object),
          occurredAt: expect.any(String),
        });
        expect(event).not.toHaveProperty('changePayload');
        expect(event.payload).not.toHaveProperty('changePayload');
        expect(JSON.stringify(event)).not.toContain('displayNameCiphertext');
        expect(JSON.stringify(event)).not.toContain('changePayload');
        expect(event).not.toHaveProperty('storageKey');
        expect(event).not.toHaveProperty('ciphertext');
      }
      // No mutation from GET.
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('in_review');
      expect(stored.version).toBe(2);
    });

    it('leader same OU can read timeline; unknown/cross-OU stays private', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      const { events } = await listApplicationTimeline(appId, leaderA());
      expect(events.length).toBeGreaterThanOrEqual(1);
      await expect(
        listApplicationTimeline('missing-app', leaderA()),
      ).rejects.toThrow('APPLICATION_NOT_FOUND');
      await expect(listApplicationTimeline(appId, outsider())).rejects.toThrow(
        'FORBIDDEN',
      );
      try {
        await listApplicationTimeline(appId, outsider());
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 403,
          code: 'LAND_FORBIDDEN',
        });
        expect(toLandApiError(error)).not.toHaveProperty('events');
      }
    });

    it('timeline strips nested forbidden keys recursively while keeping safe fields', async () => {
      const appId = await createSubmittedWithAssignment(officerId);
      await reviewApplication(appId, officerA(), 1, {});
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      const nextVersion = stored.version + 1;
      await appendEvent(prisma, {
        eventId: randomUUID(),
        eventType: 'LandChangeApplicationNoteAdded',
        eventVersion: 1,
        aggregateType: 'LandChangeApplication',
        aggregateId: appId,
        aggregateVersion: nextVersion,
        occurredAt: new Date(Date.now() + 1000),
        actor: {
          id: officerId,
          name: officerId,
          role: 'land_officer',
          organizationId: ouA,
        },
        payload: {
          applicationCode: stored.applicationCode,
          status: 'in_review',
          version: nextVersion,
          keepTop: 'safe-top',
          nested: {
            keepNested: 'safe-nested',
            changePayload: { secret: 'nested-leak' },
            displayNameCiphertext: 'nested-cipher',
            deep: {
              keepDeep: 'safe-deep',
              storageKey: 'nested-storage-key',
              storageInternals: { bucket: 'nested-bucket' },
            },
          },
          items: [
            { keepItem: 'safe-array-1', ciphertext: 'nested-ciphertext' },
            {
              inner: {
                keepInner: 'safe-array-2',
                identityNumberCiphertext: 'nested-id-cipher',
                changePayload: 'nested-payload-string',
              },
            },
          ],
        },
        metadata: {
          keepMeta: 'safe-meta',
          nestedMeta: {
            storageKey: 'meta-storage-key',
            keepMetaNested: 'safe-meta-nested',
          },
        },
      });
      const { events } = await listApplicationTimeline(appId, officerA());
      const probe = events.find(
        (e) => e.eventType === 'LandChangeApplicationNoteAdded',
      );
      expect(probe).toBeDefined();
      const payload = probe!.payload as Record<string, unknown>;
      expect(payload['keepTop']).toBe('safe-top');
      expect((payload['nested'] as Record<string, unknown>)['keepNested']).toBe(
        'safe-nested',
      );
      expect(
        (
          (payload['nested'] as Record<string, unknown>)['deep'] as Record<
            string,
            unknown
          >
        )['keepDeep'],
      ).toBe('safe-deep');
      expect((payload['items'] as Array<unknown>)[0]).toEqual({
        keepItem: 'safe-array-1',
      });
      expect(
        (
          ((payload['items'] as Array<unknown>)[1] as Record<string, unknown>)[
            'inner'
          ] as Record<string, unknown>
        )['keepInner'],
      ).toBe('safe-array-2');
      const metadata = probe!.metadata as Record<string, unknown>;
      expect(metadata['keepMeta']).toBe('safe-meta');
      expect(
        (metadata['nestedMeta'] as Record<string, unknown>)['keepMetaNested'],
      ).toBe('safe-meta-nested');
      const serialized = JSON.stringify(probe);
      for (const key of [
        'changePayload',
        'ciphertext',
        'displayNameCiphertext',
        'identityNumberCiphertext',
        'storageKey',
        'storageInternals',
        'nested-leak',
        'nested-cipher',
        'nested-storage-key',
        'nested-bucket',
        'nested-ciphertext',
        'nested-id-cipher',
        'meta-storage-key',
      ]) {
        expect(serialized).not.toContain(key);
      }
    });
  },
);
