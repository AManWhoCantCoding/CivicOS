import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { createAssignments, revokeAssignment } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { requireLandReviewAccess } from '@/modules/land/access';
import { toLandApiError } from '@/modules/land/errors';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const orgA = `lnd04-ou-a-${stamp}`;
const orgB = `lnd04-ou-b-${stamp}`;
const appA = `lnd04-app-a-${stamp}`;

function userRef(
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

describe.skipIf(!postgresEnabled)(
  'LND-04 land assignment grant and review seam',
  () => {
    const leaderA = userRef(
      `lnd04-leader-a-${stamp}`,
      ['commune_leader'],
      orgA,
    );
    const officerA = userRef(
      `lnd04-officer-a-${stamp}`,
      ['land_officer'],
      orgA,
    );
    const officerB = userRef(
      `lnd04-officer-b-${stamp}`,
      ['land_officer'],
      orgB,
    );
    const leaderB = userRef(
      `lnd04-leader-b-${stamp}`,
      ['commune_leader'],
      orgB,
    );
    let assignmentId = '';

    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: orgA, name: 'LND04 unit A', level: 'commune' },
          { id: orgB, name: 'LND04 unit B', level: 'commune' },
        ],
      });
      for (const name of ['land_officer', 'commune_leader'] as const) {
        await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name },
        });
      }
      for (const user of [leaderA, officerA, officerB, leaderB]) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `lnd04-hash-${stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
        const role = await prisma.role.findUniqueOrThrow({
          where: { name: user.roles[0] },
        });
        await prisma.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
      }
      await prisma.landChangeApplication.create({
        data: {
          id: appA,
          applicationCode: `LND04-APP-${stamp}`,
          organizationId: orgA,
          changeType: 'transfer',
          status: 'submitted',
          changePayload: {},
          createdById: officerA.id,
        },
      });
    });

    afterAll(async () => {
      const assignments = await prisma.assignment.findMany({
        where: { resourceId: appA },
        select: { id: true },
      });
      const assignmentIds = assignments.map(({ id }) => id);
      if (assignmentIds.length) {
        const events = await prisma.eventRecord.findMany({
          where: {
            aggregateType: 'Assignment',
            aggregateId: {
              in: [...assignmentIds, assignmentId].filter(Boolean),
            },
          },
          select: { eventId: true },
        });
        const eventIds = events.map(({ eventId }) => eventId);
        if (eventIds.length) {
          await prisma.outboxMessage.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.eventRecord.deleteMany({
            where: { eventId: { in: eventIds } },
          });
        }
        const audits = await prisma.auditEvent.findMany({
          where: { resourceId: appA },
          select: { id: true },
        });
        const auditIds = audits.map(({ id }) => id);
        if (auditIds.length) {
          const auditEvents = await prisma.eventRecord.findMany({
            where: {
              aggregateType: 'AuditEvent',
              aggregateId: { in: auditIds },
            },
            select: { eventId: true },
          });
          const auditEventIds = auditEvents.map(({ eventId }) => eventId);
          if (auditEventIds.length) {
            await prisma.outboxMessage.deleteMany({
              where: { eventId: { in: auditEventIds } },
            });
            await prisma.eventRecord.deleteMany({
              where: { eventId: { in: auditEventIds } },
            });
          }
          await prisma.auditEvent.deleteMany({
            where: { id: { in: auditIds } },
          });
        }
        await prisma.assignment.deleteMany({ where: { resourceId: appA } });
      }
      await prisma.landNationalSync.deleteMany({
        where: { applicationId: appA },
      });
      await prisma.landApplicationParcel.deleteMany({
        where: { applicationId: appA },
      });
      await prisma.landApplicationParty.deleteMany({
        where: { applicationId: appA },
      });
      await prisma.landChangeApplication.deleteMany({ where: { id: appA } });
      await prisma.session.deleteMany({
        where: {
          userId: { in: [leaderA.id, officerA.id, officerB.id, leaderB.id] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [leaderA.id, officerA.id, officerB.id, leaderB.id] },
        },
      });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [orgA, orgB] } },
      });
    });

    it('lets the same-unit leader grant land_review to the same-unit officer', async () => {
      const granted = await createAssignments(
        {
          resourceType: 'LandChangeApplication',
          resourceId: appA,
          task: 'land_review',
          assigneeUserIds: [officerA.id],
          organizationId: orgA,
        },
        leaderA,
      );
      expect(granted).toHaveLength(1);
      expect(granted[0]).toMatchObject({
        resourceType: 'LandChangeApplication',
        resourceId: appA,
        task: 'land_review',
        status: 'active',
        organizationId: orgA,
      });
      assignmentId = granted[0].id;
      await expect(
        requireLandReviewAccess(officerA, {
          resourceType: 'LandChangeApplication',
          resourceId: appA,
        }),
      ).resolves.toBeUndefined();
    });

    it('maps a missing assignment to LAND_ASSIGNMENT_REQUIRED', async () => {
      const freshApp = `lnd04-app-missing-${stamp}`;
      await prisma.landChangeApplication.create({
        data: {
          id: freshApp,
          applicationCode: `LND04-MISSING-${stamp}`,
          organizationId: orgA,
          changeType: 'transfer',
          status: 'submitted',
          changePayload: {},
          createdById: officerA.id,
        },
      });
      try {
        await expect(
          requireLandReviewAccess(officerA, {
            resourceType: 'LandChangeApplication',
            resourceId: freshApp,
          }),
        ).rejects.toThrow('ASSIGNMENT_REQUIRED');
        try {
          await requireLandReviewAccess(officerA, {
            resourceType: 'LandChangeApplication',
            resourceId: freshApp,
          });
        } catch (error) {
          expect(toLandApiError(error)).toMatchObject({
            status: 403,
            code: 'LAND_ASSIGNMENT_REQUIRED',
          });
        }
        const count = await prisma.assignment.count({
          where: { resourceId: freshApp },
        });
        expect(count).toBe(0);
      } finally {
        await prisma.landChangeApplication.delete({ where: { id: freshApp } });
      }
    });

    it('rejects officer self-grant without a new row', async () => {
      const before = await prisma.assignment.count({
        where: { resourceId: appA },
      });
      await expect(
        createAssignments(
          {
            resourceType: 'LandChangeApplication',
            resourceId: appA,
            task: 'land_review',
            assigneeUserIds: [officerA.id],
            organizationId: orgA,
          },
          officerA,
        ),
      ).rejects.toThrow('FORBIDDEN');
      const after = await prisma.assignment.count({
        where: { resourceId: appA },
      });
      expect(after).toBe(before);
    });

    it('rejects a cross-unit leader grant without a new row', async () => {
      const before = await prisma.assignment.count({
        where: { resourceId: appA },
      });
      await expect(
        createAssignments(
          {
            resourceType: 'LandChangeApplication',
            resourceId: appA,
            task: 'land_review',
            assigneeUserIds: [officerA.id],
            organizationId: orgA,
          },
          leaderB,
        ),
      ).rejects.toThrow();
      const after = await prisma.assignment.count({
        where: { resourceId: appA },
      });
      expect(after).toBe(before);
      try {
        await requireLandReviewAccess(officerB, {
          resourceType: 'LandChangeApplication',
          resourceId: appA,
        });
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toMatch(
          /FORBIDDEN|ASSIGNMENT_REQUIRED/,
        );
        expect(toLandApiError(error).code).toMatch(
          /LAND_FORBIDDEN|LAND_ASSIGNMENT_REQUIRED/,
        );
      }
    });

    it('denies the privileged leader at the review boundary even with compatibility', async () => {
      await expect(
        requireLandReviewAccess(leaderA, {
          resourceType: 'LandChangeApplication',
          resourceId: appA,
        }),
      ).rejects.toThrow('FORBIDDEN');
      try {
        await requireLandReviewAccess(leaderA, {
          resourceType: 'LandChangeApplication',
          resourceId: appA,
        });
      } catch (error) {
        expect(toLandApiError(error)).toMatchObject({
          status: 403,
          code: 'LAND_FORBIDDEN',
        });
      }
    });

    it('lets the same-unit leader revoke and cuts officer access', async () => {
      const revoked = await revokeAssignment(
        assignmentId,
        leaderA,
        'LND04 review finished',
      );
      expect(revoked.status).toBe('revoked');
      await expect(
        requireLandReviewAccess(officerA, {
          resourceType: 'LandChangeApplication',
          resourceId: appA,
        }),
      ).rejects.toThrow('ASSIGNMENT_REQUIRED');
      const stored = await prisma.assignment.findUniqueOrThrow({
        where: { id: assignmentId },
      });
      expect(stored.status).toBe('revoked');
      expect(stored.revokeReason).toBe('LND04 review finished');
    });
  },
);
