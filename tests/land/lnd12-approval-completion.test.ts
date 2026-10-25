import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import { blindIndex, encryptSensitive } from '@/modules/identity';
import { createAssignments } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { createApplication } from '@/modules/land/application-service';
import { reviewApplication } from '@/modules/land/application-service';
import {
  approveApplication,
  rejectApplication,
} from '@/modules/land/approval-service';
import { toLandApiError } from '@/modules/land/errors';
import { MockNationalLandAdapter } from '@/modules/land/national-land-adapter';
import { toGeometryParam } from '@/modules/land/parcel-geometry';
import { insertParcel } from '@/modules/land/parcel-repository';
import { insertParty } from '@/modules/land/party-repository';
import { parseApplicationInput } from '@/modules/land/schemas';
import { syncApplication } from '@/modules/land/sync-service';

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
  'LND-12 approval/completion transaction',
  () => {
    const stamp = randomUUID().replace(/-/g, '');
    const ouA = `lnd12-ou-a-${stamp}`;
    const ouB = `lnd12-ou-b-${stamp}`;
    const officerId = `lnd12-officer-${stamp}`;
    const leaderId = `lnd12-leader-${stamp}`;
    const outsiderId = `lnd12-outsider-${stamp}`;

    const officerA = () => actor(officerId, ['land_officer'], ouA);
    const leaderA = () => actor(leaderId, ['commune_leader'], ouA);
    const outsiderLeader = () =>
      actor(`lnd12-out-leader-${stamp}`, ['commune_leader'], ouB);

    let partyCurrent = '';
    let partyNew = '';
    let partySecured = '';
    let parcelSubject = '';
    let parcelSource = '';
    let parcelResult = '';
    let keySeq = 0;
    const createdAppIds: string[] = [];
    const createdRightIds: string[] = [];
    const createdEncumbranceIds: string[] = [];
    const createdRoleIds: string[] = [];

    function nextKey(prefix: string): string {
      keySeq += 1;
      return `lnd12-${prefix}-${stamp}-${keySeq}`;
    }

    function transferInput() {
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

    async function toPendingApproval(
      input: ReturnType<typeof parseApplicationInput>,
      assigneeId: string = officerId,
    ): Promise<string> {
      const { application } = await createApplication(
        input,
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
      await reviewApplication(application.id, officerA(), 1, {});
      const success = new MockNationalLandAdapter({ outcome: 'success' });
      const synced = await syncApplication(
        application.id,
        officerA(),
        2,
        {},
        success,
      );
      expect(synced.application.status).toBe('pending_approval');
      return application.id;
    }

    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ouA, name: 'LND12 unit A', level: 'commune' },
          { id: ouB, name: 'LND12 unit B', level: 'commune' },
        ],
      });
      for (const name of ['land_officer', 'commune_leader'] as const) {
        const priorRole = await prisma.role.findUnique({ where: { name } });
        await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        if (!priorRole) {
          const role = await prisma.role.findUniqueOrThrow({ where: { name } });
          createdRoleIds.push(role.id);
        }
      }
      const outLeaderId = `lnd12-out-leader-${stamp}`;
      for (const [id, role, ou] of [
        [officerId, 'land_officer', ouA],
        [leaderId, 'commune_leader', ouA],
        [outsiderId, 'land_officer', ouB],
        [outLeaderId, 'commune_leader', ouB],
      ] as const) {
        await prisma.user.create({
          data: {
            id,
            email: `${id}@civicos.local`,
            name: id,
            passwordHash: `lnd12-hash-${stamp}`,
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
        referenceCode: `LND12-PARTY-CUR-${stamp}`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Current Holder'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd12-cur-${stamp}`),
      });
      const incoming = await insertParty({
        referenceCode: `LND12-PARTY-NEW-${stamp}`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Proposed Holder'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd12-new-${stamp}`),
      });
      const secured = await insertParty({
        referenceCode: `LND12-PARTY-SEC-${stamp}`,
        partyType: 'organization',
        displayNameCiphertext: encryptSensitive('Secured Party'),
        identityNumberCiphertext: null,
        identityNumberIndex: blindIndex(`lnd12-sec-${stamp}`),
      });
      partyCurrent = current.id;
      partyNew = incoming.id;
      partySecured = secured.id;
      const subject = await insertParcel(
        {
          parcelCode: `LND12-PARCEL-${stamp}`,
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
      parcelSubject = subject.id;
      const seedParcelHistory = (parcel: typeof subject) =>
        appendEvent(prisma, {
          eventId: randomUUID(),
          eventType: 'LandParcelCreated',
          eventVersion: 1,
          aggregateType: 'LandParcel',
          aggregateId: parcel.id,
          aggregateVersion: 1,
          occurredAt: parcel.createdAt,
          actor: {
            id: officerId,
            name: officerId,
            role: 'land_officer',
            organizationId: ouA,
          },
          payload: {
            parcelCode: parcel.parcelCode,
            organizationId: parcel.organizationId,
            status: parcel.status,
            version: parcel.version,
          },
          metadata: {},
        });
      await seedParcelHistory(subject);
      const source = await insertParcel(
        {
          parcelCode: `LND12-SOURCE-${stamp}`,
          mapSheetNumber: `SHEET-S-${stamp}`,
          parcelNumber: `NUM-S-${stamp}`,
          areaSqm: '200.00',
          landUseType: 'residential',
          address: 'Dia chi source',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(SQUARE),
      );
      parcelSource = source.id;
      await seedParcelHistory(source);
      const result = await insertParcel(
        {
          parcelCode: `LND12-RESULT-${stamp}`,
          mapSheetNumber: `SHEET-R-${stamp}`,
          parcelNumber: `NUM-R-${stamp}`,
          areaSqm: '200.00',
          landUseType: 'residential',
          address: 'Dia chi result',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(SQUARE),
      );
      parcelResult = result.id;
      await seedParcelHistory(result);
      await prisma.landParcel.update({
        where: { id: parcelResult },
        data: { status: 'proposed' },
      });
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
      if (createdRightIds.length) {
        await prisma.landRight.deleteMany({
          where: { id: { in: createdRightIds } },
        });
      }
      // Rights created by approve carry sourceApplicationId in createdAppIds.
      await prisma.landRight.deleteMany({
        where: { sourceApplicationId: { in: createdAppIds } },
      });
      if (createdEncumbranceIds.length) {
        await prisma.landEncumbrance.deleteMany({
          where: { id: { in: createdEncumbranceIds } },
        });
      }
      await prisma.landEncumbrance.deleteMany({
        where: { sourceApplicationId: { in: createdAppIds } },
      });
      await prisma.approval.deleteMany({
        where: {
          resourceType: 'LandChangeApplication',
          resourceId: { in: createdAppIds },
        },
      });
      const actorIds = [
        officerId,
        leaderId,
        outsiderId,
        `lnd12-out-leader-${stamp}`,
      ];
      const auditRows =
        createdAppIds.length || actorIds.length
          ? await prisma.auditEvent.findMany({
              where: {
                OR: [
                  ...(createdAppIds.length
                    ? [{ resourceId: { in: createdAppIds } }]
                    : []),
                  ...(actorIds.length ? [{ actorId: { in: actorIds } }] : []),
                ],
              },
              select: { id: true },
            })
          : [];
      const auditIds = auditRows.map(({ id }) => id);
      const applicationAssignments = createdAppIds.length
        ? await prisma.assignment.findMany({
            where: {
              resourceType: 'LandChangeApplication',
              resourceId: { in: createdAppIds },
            },
            select: { id: true },
          })
        : [];
      const assignmentIds = applicationAssignments.map(({ id }) => id);
      const fixtureParcelIds = [
        parcelSubject,
        parcelSource,
        parcelResult,
      ].filter((id): id is string => Boolean(id));
      const eventRows =
        createdAppIds.length ||
        auditIds.length ||
        fixtureParcelIds.length ||
        assignmentIds.length
          ? await prisma.eventRecord.findMany({
              where: {
                OR: [
                  ...(createdAppIds.length
                    ? [
                        {
                          aggregateType: 'LandChangeApplication',
                          aggregateId: { in: createdAppIds },
                        },
                      ]
                    : []),
                  ...(fixtureParcelIds.length
                    ? [
                        {
                          aggregateType: 'LandParcel',
                          aggregateId: { in: fixtureParcelIds },
                        },
                      ]
                    : []),
                  ...(assignmentIds.length
                    ? [
                        {
                          aggregateType: 'Assignment',
                          aggregateId: { in: assignmentIds },
                        },
                      ]
                    : []),
                  ...(auditIds.length
                    ? [
                        {
                          aggregateType: 'AuditEvent',
                          aggregateId: { in: auditIds },
                        },
                      ]
                    : []),
                ],
              },
              select: { eventId: true, aggregateType: true, aggregateId: true },
            })
          : [];
      const outboxIds = eventRows.map(({ eventId }) => eventId);
      if (outboxIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: outboxIds } },
        });
      }
      if (outboxIds.length)
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: outboxIds } },
        });
      if (outboxIds.length)
        await prisma.projectionRecord.deleteMany({
          where: {
            OR: eventRows.map(({ aggregateType, aggregateId }) => ({
              aggregateType,
              aggregateId,
            })),
          },
        });
      if (auditIds.length) {
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      }
      if (createdAppIds.length) {
        await prisma.notification.deleteMany({
          where: { resourceId: { in: createdAppIds } },
        });
        await prisma.assignment.deleteMany({
          where: {
            resourceType: 'LandChangeApplication',
            resourceId: { in: createdAppIds },
          },
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
      for (const pid of [parcelSubject, parcelSource, parcelResult]) {
        if (pid)
          await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${pid}`;
      }
      if (partyCurrent) {
        await prisma.landParty.deleteMany({
          where: { id: { in: [partyCurrent, partyNew, partySecured] } },
        });
      }
      const outLeaderId = `lnd12-out-leader-${stamp}`;
      await prisma.session.deleteMany({
        where: {
          userId: { in: [officerId, leaderId, outsiderId, outLeaderId] },
        },
      });
      await prisma.userRole.deleteMany({
        where: {
          userId: { in: [officerId, leaderId, outsiderId, outLeaderId] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [officerId, leaderId, outsiderId, outLeaderId] },
        },
      });
      if (createdRoleIds.length)
        await prisma.role.deleteMany({
          where: { id: { in: createdRoleIds }, users: { none: {} } },
        });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [ouA, ouB] } },
      });
      await prisma.$disconnect();
    });

    it('AC-01: pending_approval transfer approve -> completed, rights ended/new total 100, approval/event/audit committed', async () => {
      const seed = await prisma.landRight.create({
        data: {
          parcelId: parcelSubject,
          partyId: partyCurrent,
          rightType: 'land_use_right',
          sharePercent: '100.00',
          status: 'active',
          validFrom: new Date(),
          sourceApplicationId: `seed-${stamp}`,
        },
      });
      createdRightIds.push(seed.id);
      const appId = await toPendingApproval(transferInput());
      const approvalsBefore = await prisma.approval.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      expect(approvalsBefore).toBe(0);

      const { application, approval } = await approveApplication(
        appId,
        leaderA(),
        3,
        { reason: null },
      );

      expect(application.id).toBe(appId);
      expect(application.status).toBe('completed');
      expect(application.version).toBe(4);
      expect(application.completedAt).not.toBeNull();
      expect(application.rejectionReason).toBeNull();
      expect(approval.status).toBe('approved');
      expect(approval.resourceId).toBe(appId);

      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('completed');
      expect(stored.version).toBe(4);
      expect(stored.completedAt).not.toBeNull();

      const ended = await prisma.landRight.findUniqueOrThrow({
        where: { id: seed.id },
      });
      expect(ended.status).toBe('ended');
      expect(ended.validTo).not.toBeNull();

      const actives = await prisma.landRight.findMany({
        where: { parcelId: parcelSubject, status: 'active' },
      });
      const total = actives.reduce(
        (sum, row) => sum + Number(String(row.sharePercent)),
        0,
      );
      expect(actives.length).toBeGreaterThan(0);
      expect(total).toBeCloseTo(100, 5);
      expect(
        actives.some(
          (row) =>
            row.partyId === partyNew && row.sourceApplicationId === appId,
        ),
      ).toBe(true);

      const parcel = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelSubject },
      });
      expect(parcel.status).toBe('active');

      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(1);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'LandChangeApplication',
            aggregateId: appId,
            eventType: 'LandChangeApplicationCompleted',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'LandChangeApplication',
            resourceId: appId,
            operation: 'land.application.approved',
          },
        }),
      ).toBe(1);
    });

    it('approve information_update mutates parcel field atomically', async () => {
      const input = parseApplicationInput({
        changeType: 'information_update',
        changePayload: { field: 'address', newValue: 'Dia chi moi LND12' },
        parties: [
          { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
      const appId = await toPendingApproval(input);
      const { application } = await approveApplication(appId, leaderA(), 3, {
        reason: null,
      });
      expect(application.status).toBe('completed');
      const parcel = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelSubject },
      });
      expect(parcel.address).toBe('Dia chi moi LND12');
      const parcelEvent = await prisma.eventRecord.findFirstOrThrow({
        where: {
          aggregateType: 'LandParcel',
          aggregateId: parcelSubject,
          eventType: 'LandParcelUpdated',
        },
      });
      expect(parcelEvent.aggregateVersion).toBe(parcel.version);
      expect(parcelEvent.actorId).toBe(leaderId);
      expect(parcelEvent.payload).toMatchObject({
        parcelCode: parcel.parcelCode,
        organizationId: ouA,
        applicationId: appId,
        changeType: 'information_update',
        changedField: 'address',
        beforeStatus: 'active',
        afterStatus: 'active',
        beforeVersion: parcel.version - 1,
        afterVersion: parcel.version,
      });
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'LandParcel',
            resourceId: parcelSubject,
            operation: 'land.parcel.updated',
          },
        }),
      ).toBe(1);
    });

    it('approve mortgage register creates active encumbrance', async () => {
      const input = parseApplicationInput({
        changeType: 'mortgage',
        changePayload: { action: 'register' },
        parties: [
          {
            partyId: partySecured,
            partyRole: 'secured_party',
            sharePercent: null,
          },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
      const appId = await toPendingApproval(input);
      await approveApplication(appId, leaderA(), 3, { reason: null });
      const rows = await prisma.landEncumbrance.findMany({
        where: { sourceApplicationId: appId },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe('active');
      expect(rows[0]?.parcelId).toBe(parcelSubject);
    });

    it('approve mortgage release releases active encumbrance without hard-delete', async () => {
      const enc = await prisma.landEncumbrance.create({
        data: {
          parcelId: parcelSubject,
          securedPartyId: partySecured,
          encumbranceType: 'mortgage',
          status: 'active',
          registeredAt: new Date(),
          sourceApplicationId: `seed-rel-${stamp}-${keySeq}`,
        },
      });
      createdEncumbranceIds.push(enc.id);
      const input = parseApplicationInput({
        changeType: 'mortgage',
        changePayload: { action: 'release' },
        parties: [
          {
            partyId: partyCurrent,
            partyRole: 'applicant',
            sharePercent: null,
          },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
      const appId = await toPendingApproval(input);
      await approveApplication(appId, leaderA(), 3, { reason: null });
      const released = await prisma.landRight.findMany({
        where: { parcelId: parcelSubject },
      });
      expect(Array.isArray(released)).toBe(true);
      const updated = await prisma.landEncumbrance.findUniqueOrThrow({
        where: { id: enc.id },
      });
      expect(updated.status).toBe('released');
      expect(updated.releasedAt).not.toBeNull();
    });

    it('approve parcel_split_merge retires source and activates result', async () => {
      await prisma.landParcel.update({
        where: { id: parcelSource },
        data: { status: 'active' },
      });
      await prisma.landParcel.update({
        where: { id: parcelResult },
        data: { status: 'proposed' },
      });
      const input = parseApplicationInput({
        changeType: 'parcel_split_merge',
        changePayload: { operation: 'split' },
        parties: [
          { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
        ],
        parcels: [
          { parcelId: parcelSource, parcelRole: 'source' },
          { parcelId: parcelResult, parcelRole: 'result' },
        ],
      });
      const appId = await toPendingApproval(input);
      await approveApplication(appId, leaderA(), 3, { reason: null });
      const source = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelSource },
      });
      const result = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelResult },
      });
      expect(source.status).toBe('retired');
      expect(result.status).toBe('active');
      for (const [parcel, beforeStatus, afterStatus] of [
        [source, 'active', 'retired'],
        [result, 'proposed', 'active'],
      ] as const) {
        const event = await prisma.eventRecord.findFirstOrThrow({
          where: {
            aggregateType: 'LandParcel',
            aggregateId: parcel.id,
            eventType: 'LandParcelStatusChanged',
          },
        });
        expect(event.aggregateVersion).toBe(parcel.version);
        expect(event.actorId).toBe(leaderId);
        expect(event.payload).toMatchObject({
          parcelCode: parcel.parcelCode,
          organizationId: ouA,
          applicationId: appId,
          changeType: 'parcel_split_merge',
          beforeStatus,
          afterStatus,
          beforeVersion: parcel.version - 1,
          afterVersion: parcel.version,
        });
        expect(
          await prisma.auditEvent.count({
            where: {
              resourceType: 'LandParcel',
              resourceId: parcel.id,
              operation: 'land.parcel.status_changed',
            },
          }),
        ).toBe(1);
      }
    });

    it('AC-02: reject reason whitespace -> 400, app remains pending_approval, no domain rows changed', async () => {
      const appId = await toPendingApproval(transferInput());
      const rightsBefore = await prisma.landRight.count({
        where: { parcelId: parcelSubject },
      });
      const approvalsBefore = await prisma.approval.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      const parcelsBefore = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelSubject },
      });

      await expect(
        rejectApplication(appId, leaderA(), 3, { reason: '   ' }),
      ).rejects.toThrow('INVALID_REQUEST');
      try {
        await rejectApplication(appId, leaderA(), 3, { reason: '' });
        expect.unreachable();
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 400,
          code: 'LAND_INVALID_REQUEST',
        });
      }

      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('pending_approval');
      expect(stored.version).toBe(3);
      expect(stored.rejectionReason).toBeNull();
      expect(
        await prisma.landRight.count({ where: { parcelId: parcelSubject } }),
      ).toBe(rightsBefore);
      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(approvalsBefore);
      const parcelsAfter = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelSubject },
      });
      expect(parcelsAfter.address).toBe(parcelsBefore.address);
    });

    it('valid reject -> rejected with approval/event/audit and no land mutation', async () => {
      const appId = await toPendingApproval(transferInput());
      const rightsBefore = await prisma.landRight.count({
        where: { parcelId: parcelSubject },
      });
      const { application, approval } = await rejectApplication(
        appId,
        leaderA(),
        3,
        { reason: 'Ho so chua du dieu kien' },
      );
      expect(application.status).toBe('rejected');
      expect(application.version).toBe(4);
      expect(application.rejectionReason).toBe('Ho so chua du dieu kien');
      expect(application.completedAt).toBeNull();
      expect(approval.status).toBe('rejected');
      expect(
        await prisma.landRight.count({ where: { parcelId: parcelSubject } }),
      ).toBe(rightsBefore);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'LandChangeApplication',
            aggregateId: appId,
            eventType: 'LandChangeApplicationRejected',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'LandChangeApplication',
            resourceId: appId,
            operation: 'land.application.rejected',
          },
        }),
      ).toBe(1);
    });

    it.each(['submitted', 'in_review', 'sync_failed'] as const)(
      'reject from %s has no persisted side effects',
      async (status) => {
        const appId = await toPendingApproval(transferInput());
        const version =
          status === 'submitted' ? 1 : status === 'in_review' ? 2 : 4;
        await prisma.landChangeApplication.update({
          where: { id: appId },
          data: { status, version },
        });
        const approvalsBefore = await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        });
        const eventsBefore = await prisma.eventRecord.count({
          where: { aggregateType: 'LandChangeApplication', aggregateId: appId },
        });
        const auditsBefore = await prisma.auditEvent.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        });

        await expect(
          rejectApplication(appId, leaderA(), version, { reason: 'Reject' }),
        ).rejects.toThrow('INVALID_TRANSITION');

        const stored = await prisma.landChangeApplication.findUniqueOrThrow({
          where: { id: appId },
        });
        expect(stored).toMatchObject({ status, version });
        expect(
          await prisma.approval.count({
            where: {
              resourceType: 'LandChangeApplication',
              resourceId: appId,
            },
          }),
        ).toBe(approvalsBefore);
        expect(
          await prisma.eventRecord.count({
            where: {
              aggregateType: 'LandChangeApplication',
              aggregateId: appId,
            },
          }),
        ).toBe(eventsBefore);
        expect(
          await prisma.auditEvent.count({
            where: {
              resourceType: 'LandChangeApplication',
              resourceId: appId,
            },
          }),
        ).toBe(auditsBefore);
      },
    );

    it('AC-03: injected event failure rolls back application, land mutation and Approval', async () => {
      const appId = await toPendingApproval(transferInput());
      const failingAppend = async () => {
        throw new Error('EVENT_SINK_FAILED');
      };
      await expect(
        approveApplication(
          appId,
          leaderA(),
          3,
          { reason: null },
          {
            appendEventFn: failingAppend as never,
          },
        ),
      ).rejects.toThrow('EVENT_SINK_FAILED');
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('pending_approval');
      expect(stored.version).toBe(3);
      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(0);
      expect(
        await prisma.landRight.count({
          where: { sourceApplicationId: appId },
        }),
      ).toBe(0);
    });

    it('AC-03: injected audit failure rolls back application, land mutation and Approval', async () => {
      const appId = await toPendingApproval(transferInput());
      const failingAudit = async () => {
        throw new Error('AUDIT_SINK_FAILED');
      };
      await expect(
        approveApplication(
          appId,
          leaderA(),
          3,
          { reason: null },
          {
            auditFn: failingAudit as never,
          },
        ),
      ).rejects.toThrow('AUDIT_SINK_FAILED');
      const stored = await prisma.landChangeApplication.findUniqueOrThrow({
        where: { id: appId },
      });
      expect(stored.status).toBe('pending_approval');
      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(0);
    });

    it('REPAIR: unexpected landParcel persistence failure bubbles without INVALID_REQUEST mapping', async () => {
      const MAX_INT32 = 2147483647;
      const input = parseApplicationInput({
        changeType: 'information_update',
        changePayload: { field: 'address', newValue: 'Dia chi repair check' },
        parties: [
          {
            partyId: partyCurrent,
            partyRole: 'applicant',
            sharePercent: null,
          },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
      const appId = await toPendingApproval(input);
      const parcelBefore = await prisma.landParcel.findUniqueOrThrow({
        where: { id: parcelSubject },
      });
      // Force a genuine unexpected persistence failure: push the parcel
      // version to INT32_MAX so the completed-effect `version increment`
      // overflows in the database (`integer out of range`). No request
      // validation can foresee this; the provider error must bubble with its
      // evidence intact instead of being misclassified as
      // LAND_INVALID_REQUEST/400 at service level.
      await prisma.landParcel.update({
        where: { id: parcelSubject },
        data: { version: MAX_INT32 },
      });
      try {
        const error = await approveApplication(appId, leaderA(), 3, {
          reason: null,
        }).then(
          () => null,
          (cause: unknown) => cause,
        );
        expect(error).toBeInstanceOf(Error);
        // Exact misclassification signature from the bug was
        // `throw new Error('INVALID_REQUEST')`; the provider failure must
        // surface with its own evidence instead.
        expect((error as Error).message).not.toBe('INVALID_REQUEST');
        expect((error as Error).message).toContain('integer out of range');
        // Rollback evidence: application, land row and Approval untouched.
        const stored = await prisma.landChangeApplication.findUniqueOrThrow({
          where: { id: appId },
        });
        expect(stored.status).toBe('pending_approval');
        expect(stored.version).toBe(3);
        const parcelAfter = await prisma.landParcel.findUniqueOrThrow({
          where: { id: parcelSubject },
        });
        expect(parcelAfter.address).toBe(parcelBefore.address);
        expect(
          await prisma.approval.count({
            where: {
              resourceType: 'LandChangeApplication',
              resourceId: appId,
            },
          }),
        ).toBe(0);
      } finally {
        await prisma.landParcel.update({
          where: { id: parcelSubject },
          data: { version: parcelBefore.version },
        });
      }
    });

    it('non-leader, cross-OU and terminal applications map to 403/409 without new Approval', async () => {
      const appId = await toPendingApproval(transferInput());

      await expect(
        approveApplication(appId, officerA(), 3, { reason: null }),
      ).rejects.toThrow('FORBIDDEN');
      expect(toLandApiError(new Error('FORBIDDEN'))).toMatchObject({
        status: 403,
        code: 'LAND_FORBIDDEN',
      });

      await expect(
        approveApplication(appId, outsiderLeader(), 3, { reason: null }),
      ).rejects.toThrow('FORBIDDEN');
      await expect(
        rejectApplication(appId, outsiderLeader(), 3, {
          reason: 'Ly do hop le',
        }),
      ).rejects.toThrow('FORBIDDEN');

      await expect(
        approveApplication(appId, leaderA(), 1, { reason: null }),
      ).rejects.toThrow('VERSION_CONFLICT');

      const { application } = await approveApplication(appId, leaderA(), 3, {
        reason: null,
      });
      expect(application.status).toBe('completed');
      const approvalsAfterApprove = await prisma.approval.count({
        where: { resourceType: 'LandChangeApplication', resourceId: appId },
      });
      expect(approvalsAfterApprove).toBe(1);

      await expect(
        approveApplication(appId, leaderA(), 4, { reason: null }),
      ).rejects.toThrow('INVALID_TRANSITION');
      await expect(
        rejectApplication(appId, leaderA(), 4, { reason: 'Muon reject' }),
      ).rejects.toThrow('INVALID_TRANSITION');
      expect(
        await prisma.approval.count({
          where: { resourceType: 'LandChangeApplication', resourceId: appId },
        }),
      ).toBe(approvalsAfterApprove);

      const rejectable = await toPendingApproval(transferInput());
      await rejectApplication(rejectable, leaderA(), 3, {
        reason: 'Khong dat',
      });
      await expect(
        approveApplication(rejectable, leaderA(), 4, { reason: null }),
      ).rejects.toThrow('INVALID_TRANSITION');
    });
  },
);
