import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import { blindIndex, encryptSensitive } from '@/modules/identity';
import { createAssignments, revokeAssignment } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { requireApplicationDetailAccess } from '@/modules/land/access';
import {
  createApplication,
  getApplicationDetail,
  listApplications,
} from '@/modules/land/application-service';
import { toLandApiError } from '@/modules/land/errors';
import { toGeometryParam } from '@/modules/land/parcel-geometry';
import { insertParcel } from '@/modules/land/parcel-repository';
import { insertParty } from '@/modules/land/party-repository';
import {
  parseApplicationInput,
  parseApplicationListQuery,
} from '@/modules/land/schemas';
import { listParties } from '@/modules/land/party-service';

// Controllable audit failure seam for DR-19 rollback regression tests.
// recordAudit is wrapped, never replaced: flag off preserves every seam.
const auditControl = vi.hoisted(() => ({ fail: false }));

vi.mock('@/modules/identity', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/modules/identity')>();
  return {
    ...mod,
    recordAudit: async (
      input: Parameters<typeof mod.recordAudit>[0],
      client?: Parameters<typeof mod.recordAudit>[1],
    ) => {
      if (auditControl.fail) throw new Error('AUDIT_UNAVAILABLE');
      return mod.recordAudit(input, client);
    },
  };
});

function officer(overrides?: Partial<IdentityUser>): IdentityUser {
  return {
    id: 'lnd06-officer',
    email: 'lnd06-officer@demo.local',
    name: 'LND06 Officer',
    roles: ['land_officer'] as unknown as IdentityUser['roles'],
    organizationUnitId: 'lnd06-ou-a',
    ...overrides,
  };
}

function leader(overrides?: Partial<IdentityUser>): IdentityUser {
  return {
    id: 'lnd06-leader',
    email: 'lnd06-leader@demo.local',
    name: 'LND06 Leader',
    roles: ['commune_leader'] as unknown as IdentityUser['roles'],
    organizationUnitId: 'lnd06-ou-a',
    ...overrides,
  };
}

function transferBody(overrides?: Record<string, unknown>) {
  return {
    changeType: 'transfer',
    changePayload: {
      shareChanges: [{ partyRole: 'proposed_holder', sharePercent: 100 }],
    },
    parties: [
      {
        partyId: 'party-current',
        partyRole: 'current_holder',
        sharePercent: null,
      },
      {
        partyId: 'party-new',
        partyRole: 'proposed_holder',
        sharePercent: '100.00',
      },
    ],
    parcels: [{ parcelId: 'parcel-001', parcelRole: 'subject' }],
    ...overrides,
  };
}

describe('LND-06 application input parsing follows locked contract', () => {
  it('accepts the locked transfer create shape', () => {
    expect(parseApplicationInput(transferBody())).toEqual(transferBody());
  });

  it('accepts a nested inline Party while retaining existing Party-ID links', () => {
    const parsed = parseApplicationInput(
      transferBody({
        parties: [
          {
            partyId: 'party-current',
            partyRole: 'current_holder',
            sharePercent: null,
          },
          {
            newParty: {
              referenceCode: 'NEW-01',
              partyType: 'individual',
              displayName: 'A Name',
              identityNumber: '12345',
            },
            partyRole: 'proposed_holder',
            sharePercent: '100.00',
          },
        ],
      }),
    );
    expect(parsed.parties[0]).toMatchObject({ partyId: 'party-current' });
    expect(parsed.parties[1]).toMatchObject({
      newParty: { referenceCode: 'NEW-01', identityNumber: '12345' },
    });
  });

  it('rejects malformed or ambiguous nested Party input', () => {
    const base = { partyRole: 'applicant', sharePercent: null };
    expect(() =>
      parseApplicationInput(
        transferBody({
          parties: [
            { ...base, partyId: 'p', newParty: { referenceCode: 'x' } },
          ],
        }),
      ),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseApplicationInput(
        transferBody({
          parties: [
            {
              ...base,
              newParty: {
                referenceCode: 'x',
                partyType: 'individual',
                displayName: '   ',
              },
            },
          ],
        }),
      ),
    ).toThrow('INVALID_REQUEST');
  });

  it('rejects unknown change types without inventing new ones', () => {
    expect(() =>
      parseApplicationInput(transferBody({ changeType: 'gift' })),
    ).toThrow('INVALID_REQUEST');
  });

  it('rejects missing party or parcel links (DR-06)', () => {
    expect(() => parseApplicationInput(transferBody({ parties: [] }))).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseApplicationInput(transferBody({ parcels: [] }))).toThrow(
      'INVALID_REQUEST',
    );
    expect(() =>
      parseApplicationInput(transferBody({ parties: undefined })),
    ).toThrow('INVALID_REQUEST');
  });

  it('rejects unknown link roles and malformed share values', () => {
    expect(() =>
      parseApplicationInput(
        transferBody({
          parties: [{ partyId: 'p', partyRole: 'owner', sharePercent: null }],
        }),
      ),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseApplicationInput(
        transferBody({ parcels: [{ parcelId: 'p', parcelRole: 'target' }] }),
      ),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseApplicationInput(
        transferBody({
          parties: [
            {
              partyId: 'p',
              partyRole: 'proposed_holder',
              sharePercent: 'abc',
            },
          ],
        }),
      ),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseApplicationInput(
        transferBody({
          parties: [
            {
              partyId: 'p',
              partyRole: 'proposed_holder',
              sharePercent: '0',
            },
          ],
        }),
      ),
    ).toThrow('INVALID_REQUEST');
  });

  it('rejects non-object change payloads', () => {
    expect(() =>
      parseApplicationInput(transferBody({ changePayload: null })),
    ).toThrow('INVALID_REQUEST');
    expect(() =>
      parseApplicationInput(transferBody({ changePayload: [1] })),
    ).toThrow('INVALID_REQUEST');
  });

  it('never takes actor, organization, code or status from the client', () => {
    const parsed = parseApplicationInput({
      ...transferBody(),
      createdById: 'attacker',
      organizationId: 'other-ou',
      applicationCode: 'APP-FORGED',
      status: 'completed',
    });
    expect(parsed).not.toHaveProperty('createdById');
    expect(parsed).not.toHaveProperty('organizationId');
    expect(parsed).not.toHaveProperty('applicationCode');
    expect(parsed).not.toHaveProperty('status');
  });
});

describe('LND-06 application list query follows locked contract', () => {
  it('defaults limit to 50 without filters', () => {
    expect(parseApplicationListQuery({})).toEqual({ limit: 50 });
  });

  it('accepts status, changeType, assignedTo, limit and cursor', () => {
    expect(
      parseApplicationListQuery({
        status: 'submitted',
        changeType: 'transfer',
        assignedTo: 'officer-1',
        limit: '10',
        cursor: 'Y3Vyc29y',
      }),
    ).toEqual({
      status: 'submitted',
      changeType: 'transfer',
      assignedTo: 'officer-1',
      limit: 10,
      cursor: 'Y3Vyc29y',
    });
  });

  it('rejects unknown status, change type and out-of-range limits', () => {
    expect(() => parseApplicationListQuery({ status: 'draft' })).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseApplicationListQuery({ changeType: 'gift' })).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseApplicationListQuery({ limit: '0' })).toThrow(
      'INVALID_REQUEST',
    );
    expect(() => parseApplicationListQuery({ limit: '101' })).toThrow(
      'INVALID_REQUEST',
    );
  });
});

describe('LND-06 error mapping uses exact LAND_* codes', () => {
  it('maps application errors to stable codes', () => {
    expect(toLandApiError(new Error('APPLICATION_NOT_FOUND'))).toMatchObject({
      status: 404,
      code: 'LAND_APPLICATION_NOT_FOUND',
    });
    expect(toLandApiError(new Error('PARTY_NOT_FOUND'))).toMatchObject({
      status: 404,
      code: 'LAND_PARTY_NOT_FOUND',
    });
    expect(toLandApiError(new Error('IDEMPOTENCY_CONFLICT'))).toMatchObject({
      status: 409,
      code: 'LAND_IDEMPOTENCY_CONFLICT',
    });
    expect(toLandApiError(new Error('UNAUTHENTICATED'))).toMatchObject({
      status: 401,
      code: 'LAND_UNAUTHENTICATED',
    });
    expect(toLandApiError(new Error('FORBIDDEN'))).toMatchObject({
      status: 403,
      code: 'LAND_FORBIDDEN',
    });
    expect(toLandApiError(new Error('ASSIGNMENT_REQUIRED'))).toMatchObject({
      status: 403,
      code: 'LAND_ASSIGNMENT_REQUIRED',
    });
  });

  it('keeps unauthorized bodies free of changePayload', () => {
    for (const token of ['FORBIDDEN', 'ASSIGNMENT_REQUIRED']) {
      const body = toLandApiError(new Error(token));
      expect(body).toEqual({
        status: 403,
        code: expect.stringMatching(/^LAND_/),
        error: expect.any(String),
      });
      expect(body).not.toHaveProperty('changePayload');
      expect(body).not.toHaveProperty('application');
    }
  });
});

describe('LND-06 application detail access boundary', () => {
  const application = { id: 'app-001', organizationId: 'lnd06-ou-a' };

  function fakeClient(
    assignments: Array<{
      resourceType: string;
      resourceId: string;
      task: string;
      status: string;
      organizationId: string | null;
    }>,
  ) {
    return {
      assignment: {
        findMany: async () => assignments,
      },
    };
  }

  function assignedClient() {
    return fakeClient([
      {
        resourceType: 'LandChangeApplication',
        resourceId: 'app-001',
        task: 'land_review',
        status: 'active',
        organizationId: 'lnd06-ou-a',
      },
    ]);
  }

  it('allows the same-unit leader without assignment', async () => {
    await expect(
      requireApplicationDetailAccess(
        leader(),
        application,
        fakeClient([]) as never,
      ),
    ).resolves.toBeUndefined();
  });

  it('allows the assigned officer in the same unit', async () => {
    await expect(
      requireApplicationDetailAccess(
        officer(),
        application,
        assignedClient() as never,
      ),
    ).resolves.toBeUndefined();
  });

  it('denies the cross-unit reader with FORBIDDEN without leaking', async () => {
    for (const actor of [
      officer({ organizationUnitId: 'lnd06-ou-b' }),
      leader({ organizationUnitId: 'lnd06-ou-b' }),
    ]) {
      try {
        await requireApplicationDetailAccess(
          actor,
          application,
          assignedClient() as never,
        );
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toBe('FORBIDDEN');
        expect(toLandApiError(error)).toMatchObject({
          status: 403,
          code: 'LAND_FORBIDDEN',
        });
      }
    }
  });

  it('requires assignment for the same-unit officer without link', async () => {
    try {
      await requireApplicationDetailAccess(
        officer(),
        application,
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

  it('rejects unauthenticated and non-land roles without leaking', async () => {
    await expect(
      requireApplicationDetailAccess(
        null as never,
        application,
        fakeClient([]) as never,
      ),
    ).rejects.toThrow('UNAUTHENTICATED');
    await expect(
      requireApplicationDetailAccess(
        officer({ roles: ['commander'] as never }),
        application,
        fakeClient([]) as never,
      ),
    ).rejects.toThrow('FORBIDDEN');
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

describe.skipIf(!postgresEnabled)('LND-06 application database slice', () => {
  const stamp = randomUUID().replace(/-/g, '');
  const ouA = `lnd06-ou-a-${stamp}`;
  const ouB = `lnd06-ou-b-${stamp}`;
  const officerId = `lnd06-officer-${stamp}`;
  const leaderId = `lnd06-leader-${stamp}`;
  const outsiderId = `lnd06-outsider-${stamp}`;

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

  const officerA = () => actor(officerId, ['land_officer'], ouA);
  const leaderA = () => actor(leaderId, ['commune_leader'], ouA);
  const outsider = () => actor(outsiderId, ['land_officer'], ouB);

  let partyCurrent = '';
  let partyNew = '';
  let parcelSubject = '';
  let keySeq = 0;
  const createdAppIds: string[] = [];
  const createdInlinePartyIds: string[] = [];
  const extraOfficerIds: string[] = [];
  const createdRoleIds: string[] = [];
  let extraOfficerSeq = 0;

  async function createFreshOfficer(prefix: string): Promise<IdentityUser> {
    extraOfficerSeq += 1;
    const id = `lnd06-${prefix}-${stamp}-${extraOfficerSeq}`;
    await prisma.user.create({
      data: {
        id,
        email: `${id}@civicos.local`,
        name: id,
        passwordHash: `lnd06-hash-${stamp}`,
        organizationUnitId: ouA,
      },
    });
    const roleRow = await prisma.role.findUniqueOrThrow({
      where: { name: 'land_officer' },
    });
    await prisma.userRole.create({
      data: { userId: id, roleId: roleRow.id },
    });
    extraOfficerIds.push(id);
    return actor(id, ['land_officer'], ouA);
  }

  function nextKey(prefix: string): string {
    keySeq += 1;
    return `lnd06-${prefix}-${stamp}-${keySeq}`;
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

  beforeAll(async () => {
    await prisma.organizationUnit.createMany({
      data: [
        { id: ouA, name: 'LND06 unit A', level: 'commune' },
        { id: ouB, name: 'LND06 unit B', level: 'commune' },
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
          passwordHash: `lnd06-hash-${stamp}`,
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
      referenceCode: `LND06-PARTY-CUR-${stamp}`,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive('Current Holder'),
      identityNumberCiphertext: null,
      identityNumberIndex: blindIndex(`lnd06-cur-${stamp}`),
    });
    const incoming = await insertParty({
      referenceCode: `LND06-PARTY-NEW-${stamp}`,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive('Proposed Holder'),
      identityNumberCiphertext: null,
      identityNumberIndex: blindIndex(`lnd06-new-${stamp}`),
    });
    partyCurrent = current.id;
    partyNew = incoming.id;
    const parcel = await insertParcel(
      {
        parcelCode: `LND06-PARCEL-${stamp}`,
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
    const applicationPartyLinks = createdAppIds.length
      ? await prisma.landApplicationParty.findMany({
          where: {
            applicationId: { in: createdAppIds },
            partyId: { notIn: [partyCurrent, partyNew] },
          },
          select: { partyId: true },
        })
      : [];
    const inlinePartyIds = [
      ...new Set([
        ...createdInlinePartyIds,
        ...applicationPartyLinks.map(({ partyId }) => partyId),
      ]),
    ];
    const resourceIds = [...createdAppIds, ...inlinePartyIds];
    const actorIds = [officerId, leaderId, outsiderId, ...extraOfficerIds];
    const auditRows =
      resourceIds.length || actorIds.length
        ? await prisma.auditEvent.findMany({
            where: {
              OR: [
                ...(resourceIds.length
                  ? [{ resourceId: { in: resourceIds } }]
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
    const eventRows =
      resourceIds.length || auditIds.length || assignmentIds.length
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
                ...(inlinePartyIds.length
                  ? [
                      {
                        aggregateType: 'LandParty',
                        aggregateId: { in: inlinePartyIds },
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
    if (parcelSubject) {
      await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${parcelSubject}`;
    }
    if (partyCurrent) {
      await prisma.landParty.deleteMany({
        where: { id: { in: [partyCurrent, partyNew] } },
      });
    }
    if (inlinePartyIds.length) {
      await prisma.landParty.deleteMany({
        where: { id: { in: inlinePartyIds } },
      });
    }
    await prisma.session.deleteMany({
      where: { userId: { in: [officerId, leaderId, outsiderId] } },
    });
    if (extraOfficerIds.length) {
      await prisma.session.deleteMany({
        where: { userId: { in: extraOfficerIds } },
      });
      await prisma.userRole.deleteMany({
        where: { userId: { in: extraOfficerIds } },
      });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [officerId, leaderId, outsiderId] } },
    });
    if (createdRoleIds.length)
      await prisma.role.deleteMany({
        where: { id: { in: createdRoleIds }, users: { none: {} } },
      });
    if (extraOfficerIds.length) {
      await prisma.user.deleteMany({
        where: { id: { in: extraOfficerIds } },
      });
    }
    await prisma.organizationUnit.deleteMany({
      where: { id: { in: [ouA, ouB] } },
    });
    await prisma.$disconnect();
  });

  it('AC-01 creates a submitted application with links, event and audit', async () => {
    const key = nextKey('ac01');
    const { application, replayed } = await createApplication(
      validInput(),
      officerA(),
      key,
    );
    createdAppIds.push(application.id);
    expect(replayed).toBe(false);
    expect(application.status).toBe('submitted');
    expect(application.version).toBe(1);
    expect(application.changeType).toBe('transfer');
    expect(application.createdById).toBe(officerId);
    expect(application.organizationId).toBe(ouA);
    expect(application.completedAt).toBeNull();
    expect(application.rejectionReason).toBeNull();
    expect(application.applicationCode).toMatch(/^APP-/);
    expect(application.parties).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(application.parcels).toEqual([
      { parcelId: parcelSubject, parcelRole: 'subject' },
    ]);

    const domainEvents = await prisma.eventRecord.findMany({
      where: {
        aggregateType: 'LandChangeApplication',
        aggregateId: application.id,
      },
    });
    expect(domainEvents).toHaveLength(1);
    expect(domainEvents[0]).toMatchObject({
      eventType: 'LandChangeApplicationSubmitted',
      aggregateVersion: 1,
      organizationId: ouA,
    });
    const payload = domainEvents[0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('changePayload');
    expect(JSON.stringify(payload)).not.toContain('Holder');

    const audits = await prisma.auditEvent.findMany({
      where: {
        resourceType: 'LandChangeApplication',
        resourceId: application.id,
      },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].operation).toBe('land.application.created');
  });

  it('creates an inline Party and application links atomically without a LandRight', async () => {
    const input = parseApplicationInput({
      ...validInput(),
      parties: [
        {
          partyId: partyCurrent,
          partyRole: 'current_holder',
          sharePercent: null,
        },
        {
          newParty: {
            referenceCode: `LND06-INLINE-${stamp}`,
            partyType: 'individual',
            displayName: 'Inline Private Name',
            identityNumber: `inline-${stamp}`,
          },
          partyRole: 'proposed_holder',
          sharePercent: '100.00',
        },
      ],
    });
    const key = nextKey('inline');
    const { application, replayed } = await createApplication(
      input,
      officerA(),
      key,
    );
    createdAppIds.push(application.id);
    expect(replayed).toBe(false);
    const link = await prisma.landApplicationParty.findFirstOrThrow({
      where: { applicationId: application.id, partyRole: 'proposed_holder' },
    });
    createdInlinePartyIds.push(link.partyId);
    const retry = await createApplication(input, officerA(), key);
    expect(retry.replayed).toBe(true);
    expect(retry.application.id).toBe(application.id);
    await expect(
      createApplication(
        {
          ...input,
          parties: input.parties.map((party) =>
            party.newParty
              ? {
                  ...party,
                  newParty: {
                    ...party.newParty,
                    displayName: 'Different Private Name',
                  },
                }
              : party,
          ),
        },
        officerA(),
        key,
      ),
    ).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    expect(
      (await listParties({ limit: 100 }, officerA())).items.map(({ id }) => id),
    ).toContain(link.partyId);
    const party = await prisma.landParty.findUniqueOrThrow({
      where: { id: link.partyId },
    });
    expect(party.displayNameCiphertext).not.toContain('Inline Private Name');
    expect(party.identityNumberCiphertext).not.toContain(`inline-${stamp}`);
    expect(
      await prisma.eventRecord.count({
        where: {
          aggregateType: 'LandParty',
          aggregateId: link.partyId,
          eventType: 'LandPartyCreated',
        },
      }),
    ).toBe(1);
    const partyAudit = await prisma.auditEvent.findFirstOrThrow({
      where: {
        resourceType: 'LandParty',
        resourceId: link.partyId,
        operation: 'land.party.created',
      },
    });
    expect(
      await prisma.auditEvent.count({
        where: {
          resourceType: 'LandParty',
          resourceId: link.partyId,
          operation: 'land.party.created',
        },
      }),
    ).toBe(1);
    const partyEvent = await prisma.eventRecord.findFirstOrThrow({
      where: { aggregateType: 'LandParty', aggregateId: link.partyId },
    });
    expect(JSON.stringify(partyEvent.payload)).not.toContain(
      'Inline Private Name',
    );
    expect(JSON.stringify(partyEvent.payload)).not.toContain(`inline-${stamp}`);
    expect(JSON.stringify(partyAudit.metadata)).not.toContain(
      'Inline Private Name',
    );
    expect(JSON.stringify(partyAudit.metadata)).not.toContain(
      `inline-${stamp}`,
    );
    expect(
      await prisma.landRight.count({ where: { parcelId: parcelSubject } }),
    ).toBe(0);
  });

  it('rolls back an inline Party when its audit append fails', async () => {
    const referenceCode = `LND06-INLINE-ROLLBACK-${stamp}`;
    const input = parseApplicationInput({
      ...validInput(),
      parties: [
        {
          partyId: partyCurrent,
          partyRole: 'current_holder',
          sharePercent: null,
        },
        {
          newParty: {
            referenceCode,
            partyType: 'individual',
            displayName: 'Rollback Private Name',
            identityNumber: null,
          },
          partyRole: 'proposed_holder',
          sharePercent: '100.00',
        },
      ],
    });
    auditControl.fail = true;
    try {
      await expect(
        createApplication(input, officerA(), nextKey('inline-audit-fail')),
      ).rejects.toThrow();
    } finally {
      auditControl.fail = false;
    }
    expect(
      await prisma.landParty.findUnique({ where: { referenceCode } }),
    ).toBeNull();
  });

  it('replays the same key and payload without a duplicate row', async () => {
    const key = nextKey('replay');
    const first = await createApplication(validInput(), officerA(), key);
    createdAppIds.push(first.application.id);
    const before = await prisma.landChangeApplication.count({
      where: { idempotencyKey: key },
    });
    const second = await createApplication(validInput(), officerA(), key);
    expect(second.application.id).toBe(first.application.id);
    expect(second.replayed).toBe(true);
    const after = await prisma.landChangeApplication.count({
      where: { idempotencyKey: key },
    });
    expect(after).toBe(before);
  });

  it('LND-19 coalesces concurrent same-key retries into one audited application', async () => {
    const key = nextKey('concurrent');

    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          createApplication(validInput(), officerA(), key),
        ),
      );
      const created = results.find(({ replayed }) => !replayed);

      expect(created).toBeDefined();
      expect(new Set(results.map(({ application }) => application.id))).toEqual(
        new Set([created!.application.id]),
      );
      expect(results.filter(({ replayed }) => !replayed)).toHaveLength(1);
      expect(results.filter(({ replayed }) => replayed)).toHaveLength(7);

      expect(
        await prisma.landChangeApplication.count({
          where: { idempotencyKey: key },
        }),
      ).toBe(1);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'LandChangeApplication',
            aggregateId: created!.application.id,
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'LandChangeApplication',
            resourceId: created!.application.id,
            operation: 'land.application.created',
          },
        }),
      ).toBe(1);
    } finally {
      const row = await prisma.landChangeApplication.findUnique({
        where: { idempotencyKey: key },
        select: { id: true },
      });
      if (row) createdAppIds.push(row.id);
    }
  });

  it('rejects the same key with a different payload and keeps the original', async () => {
    const key = nextKey('conflict');
    const first = await createApplication(validInput(), officerA(), key);
    createdAppIds.push(first.application.id);
    const altered = {
      ...validInput(),
      parcels: [{ parcelId: parcelSubject, parcelRole: 'source' }],
    };
    await expect(createApplication(altered, officerA(), key)).rejects.toThrow(
      'IDEMPOTENCY_CONFLICT',
    );
    try {
      await createApplication(altered, officerA(), key);
      expect.unreachable();
    } catch (error) {
      expect(toLandApiError(error)).toMatchObject({
        status: 409,
        code: 'LAND_IDEMPOTENCY_CONFLICT',
      });
    }
    const stored = await prisma.landChangeApplication.findUniqueOrThrow({
      where: { id: first.application.id },
      include: { applicationParcels: true },
    });
    expect(stored.version).toBe(1);
    expect(stored.status).toBe('submitted');
    expect(stored.applicationParcels).toHaveLength(1);
    expect(stored.applicationParcels[0].parcelRole).toBe('subject');
  });

  it('requires the Idempotency-Key boundary and a land_officer actor', async () => {
    await expect(
      createApplication(validInput(), officerA(), ''),
    ).rejects.toThrow('INVALID_REQUEST');
    await expect(
      createApplication(validInput(), leaderA(), nextKey('leader')),
    ).rejects.toThrow('FORBIDDEN');
    const count = await prisma.landChangeApplication.count({
      where: { organizationId: ouA, createdById: leaderId },
    });
    expect(count).toBe(0);
  });

  it('rejects missing links and unknown parties or parcels without rows', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ouA },
    });
    await expect(
      createApplication(
        { ...validInput(), parties: [] },
        officerA(),
        nextKey('nolinks'),
      ),
    ).rejects.toThrow('INVALID_REQUEST');
    await expect(
      createApplication(
        {
          ...validInput(),
          parties: [
            {
              partyId: 'missing-party',
              partyRole: 'current_holder',
              sharePercent: null,
            },
          ],
        },
        officerA(),
        nextKey('noparty'),
      ),
    ).rejects.toThrow('PARTY_NOT_FOUND');
    await expect(
      createApplication(
        {
          ...validInput(),
          parcels: [{ parcelId: 'missing-parcel', parcelRole: 'subject' }],
        },
        officerA(),
        nextKey('noparcel'),
      ),
    ).rejects.toThrow('PARCEL_NOT_FOUND');
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ouA },
    });
    expect(after).toBe(before);
  });

  it('rolls back the application when audit fails (DR-19)', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ouA },
    });
    auditControl.fail = true;
    try {
      await expect(
        createApplication(validInput(), officerA(), nextKey('auditfail')),
      ).rejects.toThrow();
    } finally {
      auditControl.fail = false;
    }
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ouA },
    });
    expect(after).toBe(before);
  });

  it('AC-02 lists with filters and cursors without changePayload', async () => {
    const first = await createApplication(
      validInput(),
      officerA(),
      nextKey('list1'),
    );
    createdAppIds.push(first.application.id);
    const second = await createApplication(
      {
        ...validInput(),
        changeType: 'mortgage',
        changePayload: { action: 'register' },
        parties: [
          { partyId: partyNew, partyRole: 'secured_party', sharePercent: null },
        ],
      },
      officerA(),
      nextKey('list2'),
    );
    createdAppIds.push(second.application.id);

    const filtered = await listApplications(
      parseApplicationListQuery({
        status: 'submitted',
        changeType: 'mortgage',
        limit: '50',
      }),
      leaderA(),
    );
    expect(filtered.items.map(({ id }) => id)).toContain(second.application.id);
    expect(filtered.items.map(({ id }) => id)).not.toContain(
      first.application.id,
    );
    for (const item of filtered.items) {
      expect(item).not.toHaveProperty('changePayload');
      expect(item).not.toHaveProperty('parties');
      expect(item).not.toHaveProperty('parcels');
    }

    const pageOne = await listApplications(
      parseApplicationListQuery({ limit: '1' }),
      leaderA(),
    );
    expect(pageOne.items).toHaveLength(1);
    expect(pageOne.nextCursor).not.toBeNull();
    const pageTwo = await listApplications(
      parseApplicationListQuery({
        limit: '1',
        cursor: pageOne.nextCursor ?? undefined,
      }),
      leaderA(),
    );
    expect(pageTwo.items).toHaveLength(1);
    expect(pageTwo.items[0].id).not.toBe(pageOne.items[0].id);

    const outsiderList = await listApplications(
      parseApplicationListQuery({ limit: '50' }),
      outsider(),
    );
    expect(outsiderList.items).toHaveLength(0);
  });

  it('AC-03 hides detail outside scope without changePayload', async () => {
    const { application } = await createApplication(
      validInput(),
      officerA(),
      nextKey('scope'),
    );
    createdAppIds.push(application.id);

    try {
      await getApplicationDetail(application.id, outsider());
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toBe('FORBIDDEN');
      expect(toLandApiError(error)).toMatchObject({
        status: 403,
        code: 'LAND_FORBIDDEN',
      });
    }

    try {
      await getApplicationDetail(application.id, officerA());
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toBe('ASSIGNMENT_REQUIRED');
    }

    const granted = await createAssignments(
      {
        resourceType: 'LandChangeApplication',
        resourceId: application.id,
        task: 'land_review',
        assigneeUserIds: [officerId],
        organizationId: ouA,
      },
      leaderA(),
    );
    expect(granted).toHaveLength(1);

    const assigned = await getApplicationDetail(application.id, officerA());
    expect(assigned.application.id).toBe(application.id);
    expect(assigned.application.changePayload).toEqual(
      validInput().changePayload,
    );

    const scopedLeader = await getApplicationDetail(application.id, leaderA());
    expect(scopedLeader.application.id).toBe(application.id);

    await expect(
      getApplicationDetail('missing-app', leaderA()),
    ).rejects.toThrow('APPLICATION_NOT_FOUND');
  });

  it('officer without assignment sees empty queue (DR-09/DR-10)', async () => {
    const { application } = await createApplication(
      validInput(),
      officerA(),
      nextKey('officer-empty'),
    );
    createdAppIds.push(application.id);
    const fresh = await createFreshOfficer('empty');
    const listed = await listApplications(
      parseApplicationListQuery({ limit: '50' }),
      fresh,
    );
    expect(listed.items).toHaveLength(0);
    expect(listed.nextCursor).toBeNull();
  });

  it('officer sees only own active land_review app, not other officer', async () => {
    const officerX = await createFreshOfficer('ownx');
    const officerY = await createFreshOfficer('owny');
    const appX = await createApplication(
      validInput(),
      officerA(),
      nextKey('ownx'),
    );
    createdAppIds.push(appX.application.id);
    const appY = await createApplication(
      validInput(),
      officerA(),
      nextKey('owny'),
    );
    createdAppIds.push(appY.application.id);
    await createAssignments(
      {
        resourceType: 'LandChangeApplication',
        resourceId: appX.application.id,
        task: 'land_review',
        assigneeUserIds: [officerX.id],
        organizationId: ouA,
      },
      leaderA(),
    );
    await createAssignments(
      {
        resourceType: 'LandChangeApplication',
        resourceId: appY.application.id,
        task: 'land_review',
        assigneeUserIds: [officerY.id],
        organizationId: ouA,
      },
      leaderA(),
    );
    const listed = await listApplications(
      parseApplicationListQuery({ limit: '50' }),
      officerX,
    );
    const ids = listed.items.map(({ id }) => id);
    expect(ids).toContain(appX.application.id);
    expect(ids).not.toContain(appY.application.id);
    for (const item of listed.items) {
      expect(item.organizationId).toBe(ouA);
      expect(item).not.toHaveProperty('changePayload');
      expect(item).not.toHaveProperty('parties');
      expect(item).not.toHaveProperty('parcels');
    }
  });

  it('other task assignment does not grant officer list visibility', async () => {
    const officerT = await createFreshOfficer('othertask');
    const { application } = await createApplication(
      validInput(),
      officerA(),
      nextKey('othertask'),
    );
    createdAppIds.push(application.id);
    await prisma.assignment.create({
      data: {
        resourceType: 'LandChangeApplication',
        resourceId: application.id,
        task: 'incident_verification',
        assigneeUserId: officerT.id,
        grantedById: leaderId,
        organizationId: ouA,
      },
    });
    const listed = await listApplications(
      parseApplicationListQuery({ limit: '50' }),
      officerT,
    );
    expect(listed.items.map(({ id }) => id)).not.toContain(application.id);
    expect(listed.items).toHaveLength(0);
  });

  it('revoked assignment does not grant officer list visibility', async () => {
    const officerR = await createFreshOfficer('revoked');
    const { application } = await createApplication(
      validInput(),
      officerA(),
      nextKey('revoked'),
    );
    createdAppIds.push(application.id);
    const granted = await createAssignments(
      {
        resourceType: 'LandChangeApplication',
        resourceId: application.id,
        task: 'land_review',
        assigneeUserIds: [officerR.id],
        organizationId: ouA,
      },
      leaderA(),
    );
    expect(granted).toHaveLength(1);
    await revokeAssignment(granted[0].id, leaderA(), 'thu hoi de kiem tra');
    const listed = await listApplications(
      parseApplicationListQuery({ limit: '50' }),
      officerR,
    );
    expect(listed.items.map(({ id }) => id)).not.toContain(application.id);
    expect(listed.items).toHaveLength(0);
  });

  it('officer assignedTo filter must not broaden beyond own scope', async () => {
    const officerM = await createFreshOfficer('narrowm');
    const officerN = await createFreshOfficer('narrown');
    const appM = await createApplication(
      validInput(),
      officerA(),
      nextKey('narrowm'),
    );
    createdAppIds.push(appM.application.id);
    const appN = await createApplication(
      validInput(),
      officerA(),
      nextKey('narrown'),
    );
    createdAppIds.push(appN.application.id);
    await createAssignments(
      {
        resourceType: 'LandChangeApplication',
        resourceId: appM.application.id,
        task: 'land_review',
        assigneeUserIds: [officerM.id],
        organizationId: ouA,
      },
      leaderA(),
    );
    await createAssignments(
      {
        resourceType: 'LandChangeApplication',
        resourceId: appN.application.id,
        task: 'land_review',
        assigneeUserIds: [officerN.id],
        organizationId: ouA,
      },
      leaderA(),
    );
    const broadened = await listApplications(
      parseApplicationListQuery({ limit: '50', assignedTo: officerN.id }),
      officerM,
    );
    expect(broadened.items.map(({ id }) => id)).not.toContain(
      appN.application.id,
    );
    expect(broadened.items).toHaveLength(0);
    const narrowed = await listApplications(
      parseApplicationListQuery({ limit: '50', assignedTo: officerM.id }),
      officerM,
    );
    expect(narrowed.items.map(({ id }) => id)).toContain(appM.application.id);
    expect(narrowed.items.map(({ id }) => id)).not.toContain(
      appN.application.id,
    );
  });

  it('leader still sees OU list without assignment', async () => {
    const { application } = await createApplication(
      validInput(),
      officerA(),
      nextKey('leader-sees'),
    );
    createdAppIds.push(application.id);
    const listed = await listApplications(
      parseApplicationListQuery({ limit: '50' }),
      leaderA(),
    );
    expect(listed.items.map(({ id }) => id)).toContain(application.id);
    for (const item of listed.items) {
      expect(item.organizationId).toBe(ouA);
      expect(item).not.toHaveProperty('changePayload');
    }
  });
});
