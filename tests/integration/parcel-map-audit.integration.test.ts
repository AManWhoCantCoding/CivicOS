import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const resourceId = `parcel-map-audit-${stamp}`;
const actor: IdentityUser = {
  id: `parcel-map-audit-actor-${stamp}`,
  email: `parcel-map-audit-actor-${stamp}@civicos.local`,
  name: 'Parcel Map Audit Actor',
  roles: ['land_officer'],
  organizationUnitId: `parcel-map-audit-org-${stamp}`,
};

const auditIds: string[] = [];

describe.skipIf(!postgresEnabled)('land parcel map audit persistence', () => {
  afterAll(async () => {
    if (!auditIds.length) return;

    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'AuditEvent', aggregateId: { in: auditIds } },
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
    await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
  });

  it('persists the locked map read audit without geometry or PII metadata', async () => {
    const audit = await recordAudit({
      actor,
      resourceType: 'LandParcel',
      resourceId,
      operation: 'land.parcel.map.viewed',
      metadata: { outcome: 'allowed' },
    });
    auditIds.push(audit.id);

    expect(audit.resourceType).toBe('LandParcel');
    expect(audit.resourceId).toBe(resourceId);
    expect(audit.operation).toBe('land.parcel.map.viewed');
    expect(audit.metadata).toEqual({ outcome: 'allowed' });
    expect(JSON.stringify(audit.metadata)).not.toMatch(
      /Polygon|coordinates|address|party|identity|token|105\.98/i,
    );

    const event = await prisma.eventRecord.findFirstOrThrow({
      where: {
        aggregateType: 'AuditEvent',
        aggregateId: audit.id,
      },
    });
    expect(event.eventType).toBe('AuditEventRecorded');
    expect(event.metadata).toEqual({ outcome: 'allowed' });
    expect(event.payload).toEqual({
      resourceType: 'LandParcel',
      resourceId,
      operation: 'land.parcel.map.viewed',
    });
  });
});
