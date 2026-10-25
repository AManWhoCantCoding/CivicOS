import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import { prisma } from '@/lib/prisma';
import {
  createSession,
  sessionCookieName,
  type IdentityUser,
} from '@/modules/identity';
import { requireParcelDetailAccess } from '@/modules/land/access';
import { toLandApiError } from '@/modules/land/errors';
import { toGeometryParam } from '@/modules/land/parcel-geometry';
import { getParcelDetail } from '@/modules/land/parcel-detail-service';
import { insertParcel } from '@/modules/land/parcel-repository';
import { insertParty } from '@/modules/land/party-repository';
import {
  toEncumbranceSummary,
  toRightSummary,
} from '@/modules/land/projection-mappers';
import { encryptSensitive } from '@/modules/identity';

function officer(overrides?: Partial<IdentityUser>): IdentityUser {
  return {
    id: 'lnd03-officer',
    email: 'lnd03-officer@demo.local',
    name: 'LND03 Officer',
    roles: ['land_officer'] as unknown as IdentityUser['roles'],
    organizationUnitId: 'lnd03-ou-a',
    ...overrides,
  };
}

function leader(overrides?: Partial<IdentityUser>): IdentityUser {
  return {
    id: 'lnd03-leader',
    email: 'lnd03-leader@demo.local',
    name: 'LND03 Leader',
    roles: ['commune_leader'] as unknown as IdentityUser['roles'],
    organizationUnitId: 'lnd03-ou-a',
    ...overrides,
  };
}

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

describe('LND-03 projection mappers follow locked contract', () => {
  it('maps active rights with nullable validTo/sourceApplicationId', () => {
    const summary = toRightSummary({
      id: 'right-001',
      parcelId: 'parcel-001',
      partyId: 'party-001',
      rightType: 'land_use_right',
      sharePercent: '100',
      status: 'active',
      validFrom: new Date('2026-09-30T00:00:00.000Z'),
      validTo: null,
      sourceApplicationId: null,
    });
    expect(summary).toEqual({
      id: 'right-001',
      parcelId: 'parcel-001',
      partyId: 'party-001',
      rightType: 'land_use_right',
      sharePercent: '100.00',
      status: 'active',
      validFrom: '2026-09-30T00:00:00.000Z',
      validTo: null,
      sourceApplicationId: null,
    });
    expect(Object.keys(summary).sort()).toEqual(
      [
        'id',
        'parcelId',
        'partyId',
        'rightType',
        'sharePercent',
        'status',
        'validFrom',
        'validTo',
        'sourceApplicationId',
      ].sort(),
    );
  });

  it('maps released encumbrances with nullable fields per contract', () => {
    const summary = toEncumbranceSummary({
      id: 'enc-001',
      parcelId: 'parcel-001',
      securedPartyId: null,
      encumbranceType: 'mortgage',
      status: 'released',
      externalReference: null,
      registeredAt: new Date('2026-09-30T00:00:00.000Z'),
      releasedAt: new Date('2026-10-01T00:00:00.000Z'),
      sourceApplicationId: 'app-001',
    });
    expect(summary).toEqual({
      id: 'enc-001',
      parcelId: 'parcel-001',
      securedPartyId: null,
      encumbranceType: 'mortgage',
      status: 'released',
      externalReference: null,
      registeredAt: '2026-09-30T00:00:00.000Z',
      releasedAt: '2026-10-01T00:00:00.000Z',
      sourceApplicationId: 'app-001',
    });
    expect(Object.keys(summary).sort()).toEqual(
      [
        'id',
        'parcelId',
        'securedPartyId',
        'encumbranceType',
        'status',
        'externalReference',
        'registeredAt',
        'releasedAt',
        'sourceApplicationId',
      ].sort(),
    );
  });

  it('keeps DecimalString shape for numeric storage output', () => {
    expect(
      toRightSummary({
        id: 'r',
        parcelId: 'p',
        partyId: 'pt',
        rightType: 'land_use_right',
        sharePercent: '100.5',
        status: 'ended',
        validFrom: new Date('2026-09-30T00:00:00.000Z'),
        validTo: new Date('2026-10-01T00:00:00.000Z'),
        sourceApplicationId: 'app-1',
      }).sharePercent,
    ).toBe('100.50');
  });
});

describe('LND-03 parcel detail access boundary', () => {
  const parcel = { id: 'parcel-001', organizationId: 'lnd03-ou-a' };

  function fakeClient(
    assignments: Array<{
      resourceType: string;
      resourceId: string;
      task: string;
      status: string;
      organizationId: string | null;
    }>,
    links: Array<{ applicationId: string; parcelId: string }> = [],
  ) {
    return {
      assignment: {
        findMany: async () => assignments,
      },
      landApplicationParcel: {
        findMany: async (args: {
          where: { parcelId: string; applicationId?: { in: string[] } };
        }) =>
          links.filter(
            (link) =>
              link.parcelId === args.where.parcelId &&
              (!args.where.applicationId ||
                args.where.applicationId.in.includes(link.applicationId)),
          ),
        findFirst: async (args: {
          where: { parcelId: string; applicationId?: { in: string[] } };
        }) =>
          links.find(
            (link) =>
              link.parcelId === args.where.parcelId &&
              (!args.where.applicationId ||
                args.where.applicationId.in.includes(link.applicationId)),
          ) ?? null,
      },
      landChangeApplication: {
        findMany: async () => [],
      },
    };
  }

  it('allows same-unit leader without assignment', async () => {
    await expect(
      requireParcelDetailAccess(leader(), parcel, fakeClient([]) as never),
    ).resolves.toBeUndefined();
  });

  it('denies cross-unit leader with FORBIDDEN', async () => {
    await expect(
      requireParcelDetailAccess(
        leader({ organizationUnitId: 'lnd03-ou-b' }),
        parcel,
        fakeClient([]) as never,
      ),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('denies cross-unit officer with FORBIDDEN without leaking', async () => {
    const actor = officer({ organizationUnitId: 'lnd03-ou-b' });
    try {
      await requireParcelDetailAccess(actor, parcel, fakeClient([]) as never);
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toBe('FORBIDDEN');
      expect(toLandApiError(error)).toMatchObject({
        status: 403,
        code: 'LAND_FORBIDDEN',
      });
    }
  });

  it('requires assignment for same-unit officer without link', async () => {
    try {
      await requireParcelDetailAccess(
        officer(),
        parcel,
        fakeClient([]) as never,
      );
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toBe('ASSIGNMENT_REQUIRED');
      expect(toLandApiError(error)).toMatchObject({
        status: 403,
        code: 'LAND_ASSIGNMENT_REQUIRED',
      });
    }
  });

  it('allows officer with related application assignment linked to parcel', async () => {
    const client = fakeClient(
      [
        {
          resourceType: 'LandChangeApplication',
          resourceId: 'app-001',
          task: 'land_review',
          status: 'active',
          organizationId: 'lnd03-ou-a',
        },
      ],
      [{ applicationId: 'app-001', parcelId: 'parcel-001' }],
    );
    await expect(
      requireParcelDetailAccess(officer(), parcel, client as never),
    ).resolves.toBeUndefined();
  });

  it('denies officer with assignment on unrelated application', async () => {
    const client = fakeClient(
      [
        {
          resourceType: 'LandChangeApplication',
          resourceId: 'app-other',
          task: 'land_review',
          status: 'active',
          organizationId: 'lnd03-ou-a',
        },
      ],
      [{ applicationId: 'app-001', parcelId: 'parcel-001' }],
    );
    await expect(
      requireParcelDetailAccess(officer(), parcel, client as never),
    ).rejects.toThrow('ASSIGNMENT_REQUIRED');
  });

  it('denies revoked assignment for officer', async () => {
    const client = fakeClient(
      [
        {
          resourceType: 'LandChangeApplication',
          resourceId: 'app-001',
          task: 'land_review',
          status: 'revoked',
          organizationId: 'lnd03-ou-a',
        },
      ],
      [{ applicationId: 'app-001', parcelId: 'parcel-001' }],
    );
    await expect(
      requireParcelDetailAccess(officer(), parcel, client as never),
    ).rejects.toThrow('ASSIGNMENT_REQUIRED');
  });

  it('rejects unauthenticated and non-land roles without leaking', async () => {
    await expect(
      requireParcelDetailAccess(null as never, parcel, fakeClient([]) as never),
    ).rejects.toThrow('UNAUTHENTICATED');
    await expect(
      requireParcelDetailAccess(
        officer({ roles: ['commander'] as never }),
        parcel,
        fakeClient([]) as never,
      ),
    ).rejects.toThrow('FORBIDDEN');
  });
});

describe('LND-03 error mapping', () => {
  it('maps parcel detail errors to stable LAND_* codes', () => {
    expect(toLandApiError(new Error('PARCEL_NOT_FOUND'))).toMatchObject({
      status: 404,
      code: 'LAND_PARCEL_NOT_FOUND',
    });
    expect(toLandApiError(new Error('ASSIGNMENT_REQUIRED'))).toMatchObject({
      status: 403,
      code: 'LAND_ASSIGNMENT_REQUIRED',
    });
    expect(toLandApiError(new Error('FORBIDDEN'))).toMatchObject({
      status: 403,
      code: 'LAND_FORBIDDEN',
    });
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!postgresEnabled)(
  'LND-03 parcel detail database projection',
  () => {
    const stamp = randomUUID().slice(0, 8);
    const ouA = `lnd03-ou-a-${stamp}`;
    const ouB = `lnd03-ou-b-${stamp}`;
    const leaderId = `lnd03-leader-${stamp}`;
    const officerId = `lnd03-officer-${stamp}`;
    const outsiderId = `lnd03-outsider-${stamp}`;
    const createdRoleIds: string[] = [];

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

    afterAll(async () => {
      try {
        const [parcels, parties, application, assignments] = await Promise.all([
          prisma.landParcel.findMany({
            where: { parcelCode: { startsWith: `LND03-PARCEL-${stamp}-` } },
            select: { id: true },
          }),
          prisma.landParty.findMany({
            where: { referenceCode: { startsWith: `LND03-PARTY-${stamp}-` } },
            select: { id: true },
          }),
          prisma.landChangeApplication.findMany({
            where: { id: `lnd03-app-${stamp}-D1` },
            select: { id: true },
          }),
          prisma.assignment.findMany({
            where: {
              resourceType: 'LandChangeApplication',
              resourceId: `lnd03-app-${stamp}-D1`,
            },
            select: { id: true },
          }),
        ]);
        const parcelIds = parcels.map(({ id }) => id);
        const partyIds = parties.map(({ id }) => id);
        const appIds = application.map(({ id }) => id);
        const assignmentIds = assignments.map(({ id }) => id);
        const auditEvents = await prisma.auditEvent.findMany({
          where: {
            OR: [
              { actorId: { in: [leaderId, officerId, outsiderId] } },
              { resourceType: 'LandParcel', resourceId: { in: parcelIds } },
              { resourceType: 'LandParty', resourceId: { in: partyIds } },
              {
                resourceType: 'LandChangeApplication',
                resourceId: { in: appIds },
              },
            ],
          },
          select: { id: true },
        });
        const auditIds = auditEvents.map(({ id }) => id);
        const eventWhere = {
          OR: [
            ...parcelIds.map((aggregateId) => ({
              aggregateType: 'LandParcel',
              aggregateId,
            })),
            ...appIds.map((aggregateId) => ({
              aggregateType: 'LandChangeApplication',
              aggregateId,
            })),
            ...assignmentIds.map((aggregateId) => ({
              aggregateType: 'Assignment',
              aggregateId,
            })),
            ...auditIds.map((aggregateId) => ({
              aggregateType: 'AuditEvent',
              aggregateId,
            })),
            { actorId: { in: [leaderId, officerId, outsiderId] } },
          ],
        };
        const events = await prisma.eventRecord.findMany({
          where: eventWhere,
          select: {
            id: true,
            eventId: true,
            aggregateType: true,
            aggregateId: true,
          },
        });
        const eventIds = events.map(({ id }) => id);
        const eventIdsForOutbox = events.map(({ eventId }) => eventId);
        const aggregateTuples = [
          ...new Map(
            events.map(({ aggregateType, aggregateId }) => [
              `${aggregateType}\0${aggregateId}`,
              { aggregateType, aggregateId },
            ]),
          ).values(),
        ];
        await prisma.notification.deleteMany({
          where: {
            OR: [
              { userId: { in: [leaderId, officerId, outsiderId] } },
              { resourceId: { in: [...parcelIds, ...partyIds, ...appIds] } },
              { sourceEventId: { in: eventIdsForOutbox } },
            ],
          },
        });
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: eventIdsForOutbox } },
        });
        await prisma.landEncumbrance.deleteMany({
          where: {
            OR: [
              { parcelId: { in: parcelIds } },
              { sourceApplicationId: { in: appIds } },
            ],
          },
        });
        await prisma.landRight.deleteMany({
          where: {
            OR: [
              { parcelId: { in: parcelIds } },
              { partyId: { in: partyIds } },
            ],
          },
        });
        await prisma.landApplicationParcel.deleteMany({
          where: {
            OR: [
              { parcelId: { in: parcelIds } },
              { applicationId: { in: appIds } },
            ],
          },
        });
        await prisma.assignment.deleteMany({
          where: { id: { in: assignmentIds } },
        });
        await prisma.landChangeApplication.deleteMany({
          where: { id: { in: appIds } },
        });
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
        await prisma.eventRecord.deleteMany({
          where: { id: { in: eventIds } },
        });
        for (const tuple of aggregateTuples) {
          await prisma.projectionRecord.deleteMany({ where: tuple });
        }
        await prisma.session.deleteMany({
          where: { userId: { in: [leaderId, officerId, outsiderId] } },
        });
        await prisma.userRole.deleteMany({
          where: { userId: { in: [leaderId, officerId, outsiderId] } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [leaderId, officerId, outsiderId] } },
        });
        await prisma.landParty.deleteMany({ where: { id: { in: partyIds } } });
        await prisma.landParcel.deleteMany({
          where: { id: { in: parcelIds } },
        });
        await prisma.role.deleteMany({
          where: { id: { in: createdRoleIds }, users: { none: {} } },
        });
        await prisma.organizationUnit.deleteMany({
          where: { id: { in: [ouA, ouB] } },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    it('returns parcel with full rights/encumbrance history for scoped leader', async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ouA, name: 'LND03 unit A', level: 'commune' },
          { id: ouB, name: 'LND03 unit B', level: 'commune' },
        ],
      });
      for (const name of ['land_officer', 'commune_leader'] as const) {
        const existingRole = await prisma.role.findUnique({
          where: { name },
          select: { id: true },
        });
        await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        if (!existingRole) {
          const role = await prisma.role.findUniqueOrThrow({
            where: { name },
            select: { id: true },
          });
          createdRoleIds.push(role.id);
        }
      }
      for (const [id, role, ou] of [
        [leaderId, 'commune_leader', ouA],
        [officerId, 'land_officer', ouA],
        [outsiderId, 'land_officer', ouB],
      ] as const) {
        await prisma.user.create({
          data: {
            id,
            email: `${id}@civicos.local`,
            name: id,
            passwordHash: `lnd03-hash-${stamp}`,
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

      const parcelCode = `LND03-PARCEL-${stamp}-D1`;
      const parcel = await insertParcel(
        {
          parcelCode,
          mapSheetNumber: `SHEET-${stamp}-D1`,
          parcelNumber: `NUM-${stamp}-D1`,
          areaSqm: '125.50',
          landUseType: 'residential',
          address: 'Dia chi demo',
          communeCode: 'COMMUNE-01',
          organizationId: ouA,
        },
        toGeometryParam(SQUARE),
      );
      const party = await insertParty({
        referenceCode: `LND03-PARTY-${stamp}-D1`,
        partyType: 'individual',
        displayNameCiphertext: encryptSensitive('Demo Citizen'),
        identityNumberCiphertext: null,
        identityNumberIndex: null,
      });
      const rightActive = await prisma.landRight.create({
        data: {
          parcelId: parcel.id,
          partyId: party.id,
          rightType: 'land_use_right',
          sharePercent: '100.00',
          status: 'active',
          validFrom: new Date('2026-09-30T00:00:00.000Z'),
          validTo: null,
          sourceApplicationId: null,
        },
      });
      const rightEnded = await prisma.landRight.create({
        data: {
          parcelId: parcel.id,
          partyId: party.id,
          rightType: 'land_use_right',
          sharePercent: '50.00',
          status: 'ended',
          validFrom: new Date('2026-09-29T00:00:00.000Z'),
          validTo: new Date('2026-09-30T00:00:00.000Z'),
          sourceApplicationId: null,
        },
      });
      const appId = `lnd03-app-${stamp}-D1`;
      await prisma.landChangeApplication.create({
        data: {
          id: appId,
          applicationCode: `LND03-APP-${stamp}-D1`,
          organizationId: ouA,
          changeType: 'mortgage',
          status: 'submitted',
          changePayload: {},
          createdById: officerId,
        },
      });
      await prisma.landApplicationParcel.create({
        data: {
          applicationId: appId,
          parcelId: parcel.id,
          parcelRole: 'subject',
        },
      });
      const encActive = await prisma.landEncumbrance.create({
        data: {
          parcelId: parcel.id,
          securedPartyId: null,
          encumbranceType: 'mortgage',
          status: 'active',
          externalReference: null,
          registeredAt: new Date('2026-09-30T00:00:00.000Z'),
          releasedAt: null,
          sourceApplicationId: appId,
        },
      });
      const encReleased = await prisma.landEncumbrance.create({
        data: {
          parcelId: parcel.id,
          securedPartyId: null,
          encumbranceType: 'mortgage',
          status: 'released',
          externalReference: null,
          registeredAt: new Date('2026-09-29T00:00:00.000Z'),
          releasedAt: new Date('2026-09-30T00:00:00.000Z'),
          sourceApplicationId: appId,
        },
      });

      {
        const leaderSession = await createSession(leaderId);
        const outsiderSession = await createSession(outsiderId);
        const leaderActor = actor(leaderId, ['commune_leader'], ouA);
        const detail = await getParcelDetail(parcel.id, leaderActor);
        expect(detail.parcel.id).toBe(parcel.id);
        expect(detail.parcel.parcelCode).toBe(parcelCode);
        expect(detail.parcel.geometry).toEqual(SQUARE);
        expect(detail.parcel.nationalRecordRef).toBeNull();
        expect(detail.parcel.version).toBe(1);
        expect(detail.rights).toHaveLength(2);
        expect(detail.rights.map((item) => item.status).sort()).toEqual([
          'active',
          'ended',
        ]);
        const activeRight = detail.rights.find(
          (item) => item.id === rightActive.id,
        );
        expect(activeRight).toMatchObject({
          parcelId: parcel.id,
          partyId: party.id,
          rightType: 'land_use_right',
          sharePercent: '100.00',
          status: 'active',
          validTo: null,
          sourceApplicationId: null,
        });
        expect(detail.rights.some((item) => item.id === rightEnded.id)).toBe(
          true,
        );
        expect(detail.encumbrances).toHaveLength(2);
        const released = detail.encumbrances.find(
          (item) => item.id === encReleased.id,
        );
        expect(released?.status).toBe('released');
        expect(released?.releasedAt).toBe('2026-09-30T00:00:00.000Z');
        expect(encActive.id).toBeDefined();

        const raw = JSON.stringify(detail);
        expect(raw).not.toContain('ciphertext');
        expect(raw).not.toContain('Ciphertext');
        expect(Object.keys(detail).sort()).toEqual(
          ['parcel', 'rights', 'encumbrances'].sort(),
        );
        expect(raw).not.toMatch(/directMutation|mutateRight|mutateEncumbrance/);

        // Officer without assignment is denied with assignment code.
        const officerActor = actor(officerId, ['land_officer'], ouA);
        await expect(getParcelDetail(parcel.id, officerActor)).rejects.toThrow(
          'ASSIGNMENT_REQUIRED',
        );

        // Grant related assignment, officer can read.
        const grantor = actor(leaderId, ['commune_leader'], ouA);
        await prisma.assignment.create({
          data: {
            resourceType: 'LandChangeApplication',
            resourceId: appId,
            task: 'land_review',
            assigneeUserId: officerId,
            grantedById: grantor.id,
            organizationId: ouA,
            status: 'active',
          },
        });
        const officerDetail = await getParcelDetail(parcel.id, officerActor);
        expect(officerDetail.rights).toHaveLength(2);
        expect(officerDetail.encumbrances).toHaveLength(2);

        // Other OU is forbidden without parcel leak.
        const outsider = actor(outsiderId, ['land_officer'], ouB);
        try {
          await getParcelDetail(parcel.id, outsider);
          expect.unreachable();
        } catch (error) {
          expect((error as Error).message).toBe('FORBIDDEN');
          expect(toLandApiError(error)).toMatchObject({
            status: 403,
            code: 'LAND_FORBIDDEN',
          });
        }

        // Missing parcel maps to 404.
        await expect(
          getParcelDetail(`missing-${stamp}`, leaderActor),
        ).rejects.toThrow('PARCEL_NOT_FOUND');

        // Audit read was recorded inside the existing boundary.
        const audits = await prisma.auditEvent.findMany({
          where: { resourceType: 'LandParcel', resourceId: parcel.id },
        });
        expect(
          audits.some((item) => item.operation === 'land.parcel.viewed'),
        ).toBe(true);

        const countReadAudits = (userId: string) =>
          prisma.auditEvent.count({
            where: {
              actorId: userId,
              resourceType: 'LandParcel',
              resourceId: parcel.id,
              operation: 'land.parcel.viewed',
            },
          });
        const { cookies } = await import('next/headers');
        const { GET } = await import('@/app/api/land/parcels/[parcelId]/route');
        const leaderAuditCount = await countReadAudits(leaderId);
        vi.mocked(cookies).mockResolvedValue({
          get: (name: string) =>
            name === sessionCookieName
              ? { value: leaderSession.token }
              : undefined,
        } as never);
        const authorizedResponse = await GET(
          new Request(`http://localhost/api/land/parcels/${parcel.id}`),
          { params: Promise.resolve({ parcelId: parcel.id }) },
        );
        expect(authorizedResponse.status).toBe(200);
        expect((await authorizedResponse.json()).parcel.id).toBe(parcel.id);
        expect(await countReadAudits(leaderId)).toBe(leaderAuditCount + 1);

        const outsiderAuditCount = await countReadAudits(outsiderId);
        vi.mocked(cookies).mockResolvedValue({
          get: (name: string) =>
            name === sessionCookieName
              ? { value: outsiderSession.token }
              : undefined,
        } as never);
        const forbiddenResponse = await GET(
          new Request(`http://localhost/api/land/parcels/${parcel.id}`),
          { params: Promise.resolve({ parcelId: parcel.id }) },
        );
        expect(forbiddenResponse.status).toBe(403);
        expect(await countReadAudits(outsiderId)).toBe(outsiderAuditCount);
      }
    });
  },
);
