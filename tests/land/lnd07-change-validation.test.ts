import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { blindIndex, encryptSensitive } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { createApplication } from '@/modules/land/application-service';
import { toLandApiError } from '@/modules/land/errors';
import { toGeometryParam } from '@/modules/land/parcel-geometry';
import { insertParcel } from '@/modules/land/parcel-repository';
import { insertParty } from '@/modules/land/party-repository';
import {
  parseApplicationInput,
  type ApplicationInput,
} from '@/modules/land/schemas';
// LND-07 validation seam.
import {
  canonicalizeChangePayload,
  validateApplicationChange,
} from '@/modules/land/change-validation';

function baseTransfer(
  partyCurrent: string,
  partyNew: string,
  parcelSubject: string,
): ApplicationInput {
  return parseApplicationInput({
    changeType: 'transfer',
    changePayload: {
      shareChanges: [{ partyRole: 'proposed_holder', sharePercent: '100.00' }],
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

describe('LND-07 change-type sync validation (DR-12–DR-15, EC-10–EC-12)', () => {
  const pc = 'parcel-x';
  const p1 = 'party-a';
  const p2 = 'party-b';

  it('accepts a minimal valid transfer', () => {
    expect(() =>
      validateApplicationChange(baseTransfer(p1, p2, pc)),
    ).not.toThrow();
  });

  it('rejects transfer missing current_holder (EC-10)', () => {
    const input = baseTransfer(p1, p2, pc);
    input.parties = input.parties.filter(
      (p) => p.partyRole !== 'current_holder',
    );
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects transfer missing proposed_holder (EC-10)', () => {
    const input = baseTransfer(p1, p2, pc);
    input.parties = input.parties.filter(
      (p) => p.partyRole !== 'proposed_holder',
    );
    input.changePayload = { shareChanges: [] };
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects transfer missing subject parcel (EC-10)', () => {
    const input = baseTransfer(p1, p2, pc);
    input.parcels = [{ parcelId: pc, parcelRole: 'source' }];
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects transfer when proposed shares do not total 100.00 (EC-10)', () => {
    const input = baseTransfer(p1, p2, pc);
    input.parties = [
      { partyId: p1, partyRole: 'current_holder', sharePercent: null },
      { partyId: p2, partyRole: 'proposed_holder', sharePercent: '60.00' },
    ];
    input.changePayload = {
      shareChanges: [{ partyRole: 'proposed_holder', sharePercent: '60.00' }],
    };
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects transfer with invalid DecimalString share', () => {
    const input = parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [{ partyRole: 'proposed_holder', sharePercent: 'abc' }],
      },
      parties: [
        { partyId: p1, partyRole: 'current_holder', sharePercent: null },
        { partyId: p2, partyRole: 'proposed_holder', sharePercent: '100.00' },
      ],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    // parse allows string payload through; change validation must reject.
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects duplicate party links', () => {
    const input = baseTransfer(p1, p2, pc);
    input.parties = [
      { partyId: p1, partyRole: 'current_holder', sharePercent: null },
      { partyId: p1, partyRole: 'current_holder', sharePercent: null },
      { partyId: p2, partyRole: 'proposed_holder', sharePercent: '100.00' },
    ];
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('accepts a minimal valid information_update for address', () => {
    const input = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'address', newValue: 'Dia chi moi' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('accepts a minimal valid information_update for landUseType', () => {
    const input = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'landUseType', newValue: 'residential' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('rejects information_update with disallowed field (DR-13)', () => {
    const input = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'areaSqm', newValue: '999' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects information_update with empty newValue', () => {
    const input = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'address', newValue: '   ' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects information_update without subject parcel', () => {
    const input = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'address', newValue: 'Dia chi moi' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: pc, parcelRole: 'result' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('accepts mortgage register with subject and secured_party', () => {
    const input = parseApplicationInput({
      changeType: 'mortgage',
      changePayload: { action: 'register' },
      parties: [
        { partyId: p2, partyRole: 'secured_party', sharePercent: null },
      ],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('rejects mortgage register missing secured_party (DR-14)', () => {
    const input = parseApplicationInput({
      changeType: 'mortgage',
      changePayload: { action: 'register' },
      parties: [
        { partyId: p1, partyRole: 'current_holder', sharePercent: null },
      ],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects mortgage with invalid action', () => {
    const input = parseApplicationInput({
      changeType: 'mortgage',
      changePayload: { action: 'cancel' },
      parties: [
        { partyId: p2, partyRole: 'secured_party', sharePercent: null },
      ],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('accepts mortgage release shape with subject (active check is DB-level)', () => {
    const input = parseApplicationInput({
      changeType: 'mortgage',
      changePayload: { action: 'release' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('accepts parcel_split_merge split with source and result', () => {
    const input = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'split' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [
        { parcelId: 'parcel-src', parcelRole: 'source' },
        { parcelId: 'parcel-res', parcelRole: 'result' },
      ],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('accepts parcel_split_merge merge with source and result', () => {
    const input = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'merge' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [
        { parcelId: 'parcel-src', parcelRole: 'source' },
        { parcelId: 'parcel-res', parcelRole: 'result' },
      ],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('rejects split_merge missing result (EC-12)', () => {
    const input = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'split' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: 'parcel-src', parcelRole: 'source' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects split_merge missing source (EC-12)', () => {
    const input = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'merge' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [{ parcelId: 'parcel-res', parcelRole: 'result' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects split_merge with invalid operation', () => {
    const input = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'divide' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [
        { parcelId: 'parcel-src', parcelRole: 'source' },
        { parcelId: 'parcel-res', parcelRole: 'result' },
      ],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects transfer with two distinct subject parcels (single-subject)', () => {
    const input = baseTransfer(p1, p2, pc);
    input.parcels = [
      { parcelId: 'parcel-a', parcelRole: 'subject' },
      { parcelId: 'parcel-b', parcelRole: 'subject' },
    ];
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects information_update with two distinct subject parcels', () => {
    const input = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'address', newValue: 'Dia chi moi' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [
        { parcelId: 'parcel-a', parcelRole: 'subject' },
        { parcelId: 'parcel-b', parcelRole: 'subject' },
      ],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('rejects mortgage register with two distinct subject parcels', () => {
    const input = parseApplicationInput({
      changeType: 'mortgage',
      changePayload: { action: 'register' },
      parties: [
        { partyId: p2, partyRole: 'secured_party', sharePercent: null },
      ],
      parcels: [
        { parcelId: 'parcel-a', parcelRole: 'subject' },
        { parcelId: 'parcel-b', parcelRole: 'subject' },
      ],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('accepts split_merge with many sources and results', () => {
    const input = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'split' },
      parties: [{ partyId: p1, partyRole: 'applicant', sharePercent: null }],
      parcels: [
        { parcelId: 'parcel-s1', parcelRole: 'source' },
        { parcelId: 'parcel-s2', parcelRole: 'source' },
        { parcelId: 'parcel-r1', parcelRole: 'result' },
        { parcelId: 'parcel-r2', parcelRole: 'result' },
      ],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('accepts transfer with two proposed holders splitting 50/50', () => {
    const input = parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [
          { partyRole: 'proposed_holder', sharePercent: '50.00' },
          { partyRole: 'proposed_holder', sharePercent: '50.00' },
        ],
      },
      parties: [
        { partyId: p1, partyRole: 'current_holder', sharePercent: null },
        { partyId: p2, partyRole: 'proposed_holder', sharePercent: '50.00' },
        {
          partyId: 'party-c',
          partyRole: 'proposed_holder',
          sharePercent: '50.00',
        },
      ],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).not.toThrow();
  });

  it('rejects transfer when payload shares differ from link shares (multiset)', () => {
    const input = parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [
          { partyRole: 'proposed_holder', sharePercent: '100.00' },
        ],
      },
      parties: [
        { partyId: p1, partyRole: 'current_holder', sharePercent: null },
        { partyId: p2, partyRole: 'proposed_holder', sharePercent: '50.00' },
        {
          partyId: 'party-c',
          partyRole: 'proposed_holder',
          sharePercent: '50.00',
        },
      ],
      parcels: [{ parcelId: pc, parcelRole: 'subject' }],
    });
    expect(() => validateApplicationChange(input)).toThrow('INVALID_REQUEST');
  });

  it('canonicalizes reordered multi-holder shareChanges deterministically', () => {
    const a = canonicalizeChangePayload('transfer', {
      shareChanges: [
        { partyRole: 'proposed_holder', sharePercent: '60.00' },
        { partyRole: 'proposed_holder', sharePercent: 40 },
      ],
    });
    const b = canonicalizeChangePayload('transfer', {
      shareChanges: [
        { partyRole: 'proposed_holder', sharePercent: '40.00' },
        { partyRole: 'proposed_holder', sharePercent: '60.00' },
      ],
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('maps validation failures to LAND_INVALID_REQUEST', () => {
    expect(toLandApiError(new Error('INVALID_REQUEST'))).toMatchObject({
      status: 400,
      code: 'LAND_INVALID_REQUEST',
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

describe.skipIf(!postgresEnabled)('LND-07 application database slice', () => {
  const stamp = randomUUID().slice(0, 8);
  const ou = `lnd07-ou-${stamp}`;
  const officerId = `lnd07-officer-${stamp}`;
  const leaderId = `lnd07-leader-${stamp}`;

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
  const officerA = () => actor(officerId, ['land_officer'], ou);

  let partyCurrent = '';
  let partyNew = '';
  let partySecured = '';
  let parcelSubject = '';
  let parcelSource = '';
  let parcelResult = '';
  let keySeq = 0;
  const createdAppIds: string[] = [];

  function nextKey(prefix: string): string {
    keySeq += 1;
    return `lnd07-${prefix}-${stamp}-${keySeq}`;
  }

  function transferInput() {
    return parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [
          { partyRole: 'proposed_holder', sharePercent: '100.00' },
        ],
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
    await prisma.organizationUnit.create({
      data: { id: ou, name: 'LND07 unit', level: 'commune' },
    });
    for (const name of ['land_officer', 'commune_leader'] as const) {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    for (const [id, role] of [
      [officerId, 'land_officer'],
      [leaderId, 'commune_leader'],
    ] as const) {
      await prisma.user.create({
        data: {
          id,
          email: `${id}@civicos.local`,
          name: id,
          passwordHash: `hash-${stamp}`,
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
    const cur = await insertParty({
      referenceCode: `LND07-CUR-${stamp}`,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive('Current'),
      identityNumberCiphertext: null,
      identityNumberIndex: blindIndex(`lnd07-cur-${stamp}`),
    });
    const nxt = await insertParty({
      referenceCode: `LND07-NEW-${stamp}`,
      partyType: 'individual',
      displayNameCiphertext: encryptSensitive('New'),
      identityNumberCiphertext: null,
      identityNumberIndex: blindIndex(`lnd07-new-${stamp}`),
    });
    const sec = await insertParty({
      referenceCode: `LND07-SEC-${stamp}`,
      partyType: 'organization',
      displayNameCiphertext: encryptSensitive('Bank'),
      identityNumberCiphertext: null,
      identityNumberIndex: blindIndex(`lnd07-sec-${stamp}`),
    });
    partyCurrent = cur.id;
    partyNew = nxt.id;
    partySecured = sec.id;
    const mkParcel = async (code: string) =>
      insertParcel(
        {
          parcelCode: code,
          mapSheetNumber: `SHEET-${code}`,
          parcelNumber: `NUM-${code}`,
          areaSqm: '100.00',
          landUseType: 'residential',
          address: 'Dia chi demo',
          communeCode: 'COMMUNE-01',
          organizationId: ou,
        },
        toGeometryParam(SQUARE),
      );
    parcelSubject = (await mkParcel(`LND07-SUB-${stamp}`)).id;
    parcelSource = (await mkParcel(`LND07-SRC-${stamp}`)).id;
    parcelResult = (await mkParcel(`LND07-RES-${stamp}`)).id;
  });

  afterAll(async () => {
    const eventRows = await prisma.eventRecord.findMany({
      where: {
        aggregateType: 'LandChangeApplication',
        aggregateId: { in: createdAppIds },
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
    if (outboxIds.length)
      await prisma.outboxMessage.deleteMany({
        where: { eventId: { in: outboxIds } },
      });
    if (appEventIds.length)
      await prisma.eventRecord.deleteMany({
        where: { eventId: { in: appEventIds } },
      });
    if (auditEventIds.length)
      await prisma.eventRecord.deleteMany({
        where: { eventId: { in: auditEventIds } },
      });
    if (auditIds.length)
      await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
    if (createdAppIds.length) {
      await prisma.landApplicationParcel.deleteMany({
        where: { applicationId: { in: createdAppIds } },
      });
      await prisma.landApplicationParty.deleteMany({
        where: { applicationId: { in: createdAppIds } },
      });
      await prisma.landEncumbrance.deleteMany({
        where: { sourceApplicationId: { in: createdAppIds } },
      });
      await prisma.landChangeApplication.deleteMany({
        where: { id: { in: createdAppIds } },
      });
    }
    for (const pid of [parcelSubject, parcelSource, parcelResult]) {
      if (pid)
        await prisma.$executeRaw`DELETE FROM "LandParcel" WHERE "id" = ${pid}`;
    }
    if (partyCurrent)
      await prisma.landParty.deleteMany({
        where: { id: { in: [partyCurrent, partyNew, partySecured] } },
      });
    await prisma.user.deleteMany({
      where: { id: { in: [officerId, leaderId] } },
    });
    await prisma.organizationUnit.deleteMany({ where: { id: ou } });
    await prisma.$disconnect();
  });

  it('creates each valid change type (AC-01)', async () => {
    const transfer = await createApplication(
      transferInput(),
      officerA(),
      nextKey('valid-transfer'),
    );
    createdAppIds.push(transfer.application.id);
    expect(transfer.application.status).toBe('submitted');

    const info = await createApplication(
      parseApplicationInput({
        changeType: 'information_update',
        changePayload: { field: 'address', newValue: 'Dia chi moi' },
        parties: [
          { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      }),
      officerA(),
      nextKey('valid-info'),
    );
    createdAppIds.push(info.application.id);
    expect(info.application.status).toBe('submitted');

    const mortgageReg = await createApplication(
      parseApplicationInput({
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
      }),
      officerA(),
      nextKey('valid-mort-reg'),
    );
    createdAppIds.push(mortgageReg.application.id);
    expect(mortgageReg.application.status).toBe('submitted');

    const split = await createApplication(
      parseApplicationInput({
        changeType: 'parcel_split_merge',
        changePayload: { operation: 'split' },
        parties: [
          { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
        ],
        parcels: [
          { parcelId: parcelSource, parcelRole: 'source' },
          { parcelId: parcelResult, parcelRole: 'result' },
        ],
      }),
      officerA(),
      nextKey('valid-split'),
    );
    createdAppIds.push(split.application.id);
    expect(split.application.status).toBe('submitted');
  });

  it('rejects transfer with share total != 100.00 and creates no row (EC-10)', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    const bad = parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [{ partyRole: 'proposed_holder', sharePercent: '60.00' }],
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
          sharePercent: '60.00',
        },
      ],
      parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
    });
    await expect(
      createApplication(bad, officerA(), nextKey('bad-share')),
    ).rejects.toThrow('INVALID_REQUEST');
    try {
      await createApplication(bad, officerA(), nextKey('bad-share-2'));
      expect.unreachable();
    } catch (error) {
      expect(toLandApiError(error)).toMatchObject({
        status: 400,
        code: 'LAND_INVALID_REQUEST',
      });
    }
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    expect(after).toBe(before);
  });

  it('rejects mortgage release without active encumbrance (EC-11)', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    const release = parseApplicationInput({
      changeType: 'mortgage',
      changePayload: { action: 'release' },
      parties: [
        { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
      ],
      parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
    });
    await expect(
      createApplication(release, officerA(), nextKey('release-noenc')),
    ).rejects.toThrow('INVALID_REQUEST');
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    expect(after).toBe(before);
  });

  it('accepts mortgage release with an active encumbrance', async () => {
    const enc = await prisma.landEncumbrance.create({
      data: {
        parcelId: parcelSubject,
        securedPartyId: partySecured,
        encumbranceType: 'mortgage',
        status: 'active',
        registeredAt: new Date(),
        sourceApplicationId: 'seed-release-check',
      },
    });
    try {
      const release = parseApplicationInput({
        changeType: 'mortgage',
        changePayload: { action: 'release' },
        parties: [
          { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
      const { application } = await createApplication(
        release,
        officerA(),
        nextKey('release-ok'),
      );
      createdAppIds.push(application.id);
      expect(application.status).toBe('submitted');
    } finally {
      await prisma.landEncumbrance.delete({ where: { id: enc.id } });
    }
  });

  it('rejects split_merge missing result and creates no row (EC-12)', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    const bad = parseApplicationInput({
      changeType: 'parcel_split_merge',
      changePayload: { operation: 'split' },
      parties: [
        { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
      ],
      parcels: [{ parcelId: parcelSource, parcelRole: 'source' }],
    });
    await expect(
      createApplication(bad, officerA(), nextKey('bad-split')),
    ).rejects.toThrow('INVALID_REQUEST');
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    expect(after).toBe(before);
  });

  it('replays same key+same payload without duplicate (EC-04)', async () => {
    const key = nextKey('replay');
    const first = await createApplication(transferInput(), officerA(), key);
    createdAppIds.push(first.application.id);
    const before = await prisma.landChangeApplication.count({
      where: { idempotencyKey: key },
    });
    const second = await createApplication(transferInput(), officerA(), key);
    expect(second.application.id).toBe(first.application.id);
    expect(second.replayed).toBe(true);
    const after = await prisma.landChangeApplication.count({
      where: { idempotencyKey: key },
    });
    expect(after).toBe(before);
  });

  it('conflicts on same key+different payload and keeps original (EC-05)', async () => {
    const key = nextKey('conflict');
    const first = await createApplication(transferInput(), officerA(), key);
    createdAppIds.push(first.application.id);
    const altered = parseApplicationInput({
      changeType: 'information_update',
      changePayload: { field: 'address', newValue: 'Dia chi khac' },
      parties: [
        { partyId: partyCurrent, partyRole: 'applicant', sharePercent: null },
      ],
      parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
    });
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
    });
    expect(stored.version).toBe(1);
    expect(stored.status).toBe('submitted');
    expect(stored.changeType).toBe('transfer');
  });

  it('keeps canonical fingerprint stable across link order', async () => {
    const key = nextKey('canonical');
    const first = await createApplication(transferInput(), officerA(), key);
    createdAppIds.push(first.application.id);
    const reordered = transferInput();
    reordered.parties = [...reordered.parties].reverse();
    const second = await createApplication(reordered, officerA(), key);
    expect(second.application.id).toBe(first.application.id);
    expect(second.replayed).toBe(true);
  });

  it('rejects transfer with two subject parcels and creates no row', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    const bad = parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [
          { partyRole: 'proposed_holder', sharePercent: '100.00' },
        ],
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
      parcels: [
        { parcelId: parcelSubject, parcelRole: 'subject' },
        { parcelId: parcelSource, parcelRole: 'subject' },
      ],
    });
    await expect(
      createApplication(bad, officerA(), nextKey('two-subject')),
    ).rejects.toThrow('INVALID_REQUEST');
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    expect(after).toBe(before);
  });

  it('replays reordered multi-holder shareChanges rather than conflict', async () => {
    const multiInput = (firstShare: string, secondShare: string) =>
      parseApplicationInput({
        changeType: 'transfer',
        changePayload: {
          shareChanges: [
            { partyRole: 'proposed_holder', sharePercent: firstShare },
            { partyRole: 'proposed_holder', sharePercent: secondShare },
          ],
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
            sharePercent: '60.00',
          },
          {
            partyId: partySecured,
            partyRole: 'proposed_holder',
            sharePercent: '40.00',
          },
        ],
        parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
      });
    const key = nextKey('reordered-shares');
    const first = await createApplication(
      multiInput('60.00', '40.00'),
      officerA(),
      key,
    );
    createdAppIds.push(first.application.id);
    const second = await createApplication(
      multiInput('40.00', '60.00'),
      officerA(),
      key,
    );
    expect(second.application.id).toBe(first.application.id);
    expect(second.replayed).toBe(true);
  });

  it('rejects transfer payload/link share mismatch and creates no row', async () => {
    const before = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    const bad = parseApplicationInput({
      changeType: 'transfer',
      changePayload: {
        shareChanges: [
          { partyRole: 'proposed_holder', sharePercent: '100.00' },
        ],
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
          sharePercent: '50.00',
        },
        {
          partyId: partySecured,
          partyRole: 'proposed_holder',
          sharePercent: '50.00',
        },
      ],
      parcels: [{ parcelId: parcelSubject, parcelRole: 'subject' }],
    });
    await expect(
      createApplication(bad, officerA(), nextKey('mismatch')),
    ).rejects.toThrow('INVALID_REQUEST');
    const after = await prisma.landChangeApplication.count({
      where: { organizationId: ou },
    });
    expect(after).toBe(before);
  });

  it('does not replay transfer with extra payload keys (DR-07/EC-05)', async () => {
    const key = nextKey('extra-keys');
    const first = await createApplication(transferInput(), officerA(), key);
    createdAppIds.push(first.application.id);
    const tampered = transferInput();
    tampered.changePayload = {
      ...transferInput().changePayload,
      extraTop: 'injected',
      shareChanges: [
        {
          partyRole: 'proposed_holder',
          sharePercent: '100.00',
          extraEntry: 'injected',
        },
      ],
    };
    await expect(createApplication(tampered, officerA(), key)).rejects.toThrow(
      'IDEMPOTENCY_CONFLICT',
    );
    try {
      await createApplication(tampered, officerA(), key);
      expect.unreachable();
    } catch (error) {
      expect(toLandApiError(error)).toMatchObject({
        status: 409,
        code: 'LAND_IDEMPOTENCY_CONFLICT',
      });
    }
    const stored = await prisma.landChangeApplication.findUniqueOrThrow({
      where: { id: first.application.id },
    });
    expect(stored.version).toBe(1);
    expect(stored.status).toBe('submitted');
    expect(stored.changeType).toBe('transfer');
    const count = await prisma.landChangeApplication.count({
      where: { idempotencyKey: key },
    });
    expect(count).toBe(1);
  });
});
