import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { blindIndex, encryptSensitive } from '@/modules/identity';
import { createAssignments } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import {
  createApplication,
  reviewApplication,
} from '@/modules/land/application-service';
import { toLandApiError } from '@/modules/land/errors';
import {
  MockNationalLandAdapter,
  MOCK_NATIONAL_LAND_FAILURE_CODE,
  MOCK_NATIONAL_LAND_REMOTE_REFERENCE,
} from '@/modules/land/national-land-adapter';
import { toGeometryParam } from '@/modules/land/parcel-geometry';
import { insertParcel } from '@/modules/land/parcel-repository';
import { insertParty } from '@/modules/land/party-repository';
import { parseApplicationInput } from '@/modules/land/schemas';
import {
  buildSyncRequestKey,
  retryApplicationSync,
  syncApplication,
} from '@/modules/land/sync-service';

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
  'LND-11 sync/retry command and persistence',
  () => {
    const stamp = randomUUID().slice(0, 8);
    const ouA = `lnd11-ou-a-${stamp}`;
    const ouB = `lnd11-ou-b-${stamp}`;
    const officerId = `lnd11-officer-${stamp}`;
    const leaderId = `lnd11-leader-${stamp}`;
    const outsiderId = `lnd11-outsider-${stamp}`;

    const officerA = () => actor(officerId, ['land_officer'], ouA);
    const leaderA = () => actor(leaderId, ['commune_leader'], ouA);
    const outsider = () => actor(outsiderId, ['land_officer'], ouB);

    let partyCurrent = '';
    let partyNew = '';
    let parcelSubject = '';
    let parcelCode = '';
    let keySeq = 0;
    const createdAppIds: string[] = [];

    function nextKey(prefix: string): string {
      keySeq += 1;
      return `lnd11-${prefix}-${stamp}-${keySeq}`;
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

    async function createInReviewWithAssignment(
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
      const reviewed = await reviewApplication(
        application.id,
        officerA(),
        1,
        {},
      );
      expect(reviewed.application.status).toBe('in_review');
      return application.id;
    }

    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ouA, name: 'LND11 unit A', level: 'commune' },
          { id: ouB, name: 'LND11 unit B', level: 'commune' },
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
            passwordHash: `lnd11-hash-${stamp}`,
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
        referenceCode: `LND11-PARTY-CUR-${stamp}`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Current Holder'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd11-cur-${stamp}`),
      });
      const incoming = await insertParty({
        referenceCode: `LND11-PARTY-NEW-${stamp}`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Proposed Holder'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd11-new-${stamp}`),
      });
      partyCurrent = current.id;
      partyNew = incoming.id;
      parcelCode = `LND11-PARCEL-${stamp}`;
      const parcel = await insertParcel(
        {
          parcelCode,
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
      const syncRows = await prisma.landNationalSync.findMany({
        where: { applicationId: { in: createdAppIds } },
        select: { id: true },
      });
      if (syncRows.length) {
        await prisma.landNationalSync.deleteMany({
          where: { id: { in: syncRows.map((r) => r.id) } },
        });
      }
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

    it('AC-01: in_review + success -> pending_approval, sync succeeded, no right mutation', async () => {
      const appId = await createInReviewWithAssignment(officerId);
      const rightsBefore = await prisma.landRight.count();
      const approvalsBefore = await prisma.approval.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      const eventsBefore = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      const auditsBefore = await prisma.auditEvent.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });

      const success = new MockNationalLandAdapter({ outcome: 'success' });
      const { application, sync } = await syncApplication(
        appId,
        officerA(),
        2,
        {},
        success,
      );

      expect(application.id).toBe(appId);
      expect(application.status).toBe('pending_approval');
      expect(application.version).toBe(3);
      expect(sync.applicationId).toBe(appId);
      expect(sync.operation).toBe('register_change');
      expect(sync.status).toBe('succeeded');
      expect(sync.remoteReference).toBe(MOCK_NATIONAL_LAND_REMOTE_REFERENCE);
      expect(sync.failureCode).toBeNull();
      expect(sync.attempts).toBe(1);
      expect(sync.requestKey).toBe(buildSyncRequestKey(appId));
      expect(sync.requestPayload).toMatchObject({
        applicationCode: expect.any(String),
        changeType: 'transfer',
        mode: 'mock',
      });
      expect(sync.responsePayload).toEqual({
        accepted: true,
        simulated: true,
      });
      expect(sync.completedAt).not.toBeNull();

      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('pending_approval');
      expect(stored.version).toBe(3);
      const syncRow = await prisma.landNationalSync.findFirstOrThrow({
        where: { applicationId: appId },
      });
      expect(syncRow.status).toBe('succeeded');
      expect(syncRow.attempts).toBe(1);

      // DR-16: no land aggregate mutation and no approval on sync.
      expect(await prisma.landRight.count()).toBe(rightsBefore);
      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(approvalsBefore);
      const afterEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
      });
      const afterAudits = await prisma.auditEvent.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      expect(afterEvents).toBe(eventsBefore + 1);
      expect(afterAudits).toBe(auditsBefore + 1);
    });

    it('AC-02: failure fixture -> sync_failed, 502 mapping, no Approval', async () => {
      const appId = await createInReviewWithAssignment(officerId);
      const failure = new MockNationalLandAdapter({ outcome: 'failure' });
      const { application, sync } = await syncApplication(
        appId,
        officerA(),
        2,
        {},
        failure,
      );

      expect(application.status).toBe('sync_failed');
      expect(application.version).toBe(3);
      expect(sync.status).toBe('failed');
      expect(sync.failureCode).toBe(MOCK_NATIONAL_LAND_FAILURE_CODE);
      expect(sync.remoteReference).toBeNull();
      expect(sync.attempts).toBe(1);
      expect(sync.responsePayload).toEqual({
        accepted: false,
        simulated: true,
      });

      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('sync_failed');
      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(0);

      // Error contract DR-16/DR-17: failure maps to 502 LAND_SYNC_FAILED.
      expect(toLandApiError(new Error('SYNC_FAILED'))).toMatchObject({
        status: 502,
        code: 'LAND_SYNC_FAILED',
      });
    });

    it('AC-03: retry same key twice -> one row, attempts monotonic', async () => {
      const appId = await createInReviewWithAssignment(officerId);
      const failure = new MockNationalLandAdapter({ outcome: 'failure' });
      const success = new MockNationalLandAdapter({ outcome: 'success' });

      const first = await syncApplication(appId, officerA(), 2, {}, failure);
      expect(first.application.status).toBe('sync_failed');
      const keyBefore = first.sync.requestKey;

      const retried = await retryApplicationSync(
        appId,
        officerA(),
        3,
        {},
        success,
      );
      expect(retried.sync.requestKey).toBe(keyBefore);
      expect(retried.sync.attempts).toBe(2);
      expect(retried.application.status).toBe('pending_approval');
      expect(retried.application.version).toBe(4);

      // Second retry from pending_approval must be rejected, row stays one.
      await expect(
        retryApplicationSync(appId, officerA(), 4, {}, success),
      ).rejects.toThrow('INVALID_TRANSITION');

      const rows = await prisma.landNationalSync.findMany({
        where: { applicationId: appId },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].requestKey).toBe(keyBefore);
      expect(rows[0].attempts).toBe(2);
      expect(rows[0].status).toBe('succeeded');
    });

    it('retry failure keeps sync_failed with attempts increment and stable key', async () => {
      const appId = await createInReviewWithAssignment(officerId);
      const failure = new MockNationalLandAdapter({ outcome: 'failure' });
      const first = await syncApplication(appId, officerA(), 2, {}, failure);
      const second = await retryApplicationSync(
        appId,
        officerA(),
        3,
        {},
        failure,
      );
      expect(second.application.status).toBe('sync_failed');
      expect(second.application.version).toBe(4);
      expect(second.sync.requestKey).toBe(first.sync.requestKey);
      expect(second.sync.attempts).toBe(2);
      expect(second.sync.status).toBe('failed');
      const rows = await prisma.landNationalSync.findMany({
        where: { applicationId: appId },
      });
      expect(rows).toHaveLength(1);
    });

    it('rejects sync/retry on wrong status, stale version, missing assignment', async () => {
      const appId = await createInReviewWithAssignment(officerId);
      const success = new MockNationalLandAdapter({ outcome: 'success' });

      // Retry before any failure.
      await expect(
        retryApplicationSync(appId, officerA(), 2, {}, success),
      ).rejects.toThrow('INVALID_TRANSITION');

      // Stale version.
      await expect(
        syncApplication(appId, officerA(), 1, {}, success),
      ).rejects.toThrow('VERSION_CONFLICT');
      expect(toLandApiError(new Error('VERSION_CONFLICT'))).toMatchObject({
        status: 409,
        code: 'LAND_VERSION_CONFLICT',
      });

      // Invalid body.
      await expect(
        syncApplication(appId, officerA(), 2, { outcome: 'success' }, success),
      ).rejects.toThrow('INVALID_REQUEST');

      // No assignment.
      const { application } = await createApplication(
        validInput(),
        officerA(),
        nextKey('noassign'),
      );
      createdAppIds.push(application.id);
      await reviewApplication(application.id, officerA(), 1, {}).catch(
        () => null,
      );
      // Application without assignment stays submitted; sync must require assignment.
      await expect(
        syncApplication(application.id, officerA(), 1, {}, success),
      ).rejects.toThrow();

      // Cross OU.
      await expect(
        syncApplication(appId, outsider(), 2, {}, success),
      ).rejects.toThrow('FORBIDDEN');

      // Sync from non-in_review (submitted) is invalid transition.
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: application.id },
      });
      expect(stored.status).toBe('submitted');
    });
  },
);
