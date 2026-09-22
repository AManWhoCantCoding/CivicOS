import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  canAccess,
  createAssignments,
  requireRole,
  revokeAssignment,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { getIncident, registerIntakeReport } from '@/modules/incidents';

describe('identity authorization matrix', () => {
  it('allows only the commander role to perform command-only actions', () => {
    expect(() =>
      requireRole(
        { id: '1', email: 'a', name: 'A', roles: ['commander'] },
        'commander',
      ),
    ).not.toThrow();
    expect(() =>
      requireRole(
        { id: '2', email: 'b', name: 'B', roles: ['field_officer'] },
        'commander',
      ),
    ).toThrow('FORBIDDEN');
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const orgA = `t02-org-a-${stamp}`;
const orgB = `t02-org-b-${stamp}`;
const recordId = `t02-record-${stamp}`;

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
  'identity authorization matrix PostgreSQL seam',
  () => {
    const commander = userRef(`t02-commander-${stamp}`, ['commander'], orgA);
    const duty = userRef(`t02-duty-${stamp}`, ['duty_officer'], orgA);
    const assigned = userRef(`t02-assigned-${stamp}`, ['field_officer'], orgA);
    const unassigned = userRef(
      `t02-unassigned-${stamp}`,
      ['field_officer'],
      orgA,
    );
    const crossUnit = userRef(`t02-cross-${stamp}`, ['field_officer'], orgB);
    const crossCommander = userRef(
      `t02-cross-commander-${stamp}`,
      ['commander'],
      orgB,
    );
    const resource = {
      resourceType: 'T02Record',
      resourceId: recordId,
      organizationId: orgA,
    };
    let assignmentId = '';
    let incidentId = '';
    let intakeReportId = '';

    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: orgA, name: 'T02 unit A', level: 'commune' },
          { id: orgB, name: 'T02 unit B', level: 'commune' },
        ],
      });
      await prisma.role.upsert({
        where: { name: 'commander' },
        update: {},
        create: { name: 'commander' },
      });
      await prisma.role.upsert({
        where: { name: 'duty_officer' },
        update: {},
        create: { name: 'duty_officer' },
      });
      await prisma.role.upsert({
        where: { name: 'field_officer' },
        update: {},
        create: { name: 'field_officer' },
      });
      for (const user of [
        commander,
        duty,
        assigned,
        unassigned,
        crossUnit,
        crossCommander,
      ]) {
        const created = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `t02-hash-${stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
        const role = await prisma.role.findUniqueOrThrow({
          where: { name: user.roles[0] },
        });
        await prisma.userRole.create({
          data: { userId: created.id, roleId: role.id },
        });
      }
      const granted = await createAssignments(
        {
          resourceType: resource.resourceType,
          resourceId: resource.resourceId,
          task: 'incident_verification',
          assigneeUserIds: [assigned.id],
          organizationId: orgA,
        },
        commander,
      );
      assignmentId = granted[0].id;
    });

    afterAll(async () => {
      const auditRows = await prisma.auditEvent.findMany({
        where: {
          OR: [
            { resourceId: recordId },
            ...(incidentId
              ? [
                  { resourceType: 'Incident', resourceId: incidentId },
                  { resourceType: 'IntakeReport', resourceId: intakeReportId },
                ]
              : []),
          ],
        },
        select: { id: true },
      });
      const auditIds = auditRows.map(({ id }) => id);
      const assignmentEvents = await prisma.eventRecord.findMany({
        where: {
          OR: [
            { aggregateType: 'Assignment', aggregateId: assignmentId },
            ...(auditIds.length
              ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
              : []),
            ...(incidentId
              ? [
                  { aggregateType: 'Incident', aggregateId: incidentId },
                  {
                    aggregateType: 'IntakeReport',
                    aggregateId: intakeReportId,
                  },
                ]
              : []),
          ],
        },
        select: { eventId: true },
      });
      const eventIds = assignmentEvents.map(({ eventId }) => eventId);
      if (eventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: eventIds } },
        });
      }
      if (auditIds.length) {
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      }
      await prisma.assignment.deleteMany({
        where: {
          OR: [
            { id: assignmentId },
            { resourceId: recordId },
            ...(incidentId ? [{ resourceId: incidentId }] : []),
          ],
        },
      });
      if (incidentId) {
        await prisma.approval.deleteMany({
          where: { resourceType: 'Incident', resourceId: incidentId },
        });
        await prisma.slaInstance.deleteMany({
          where: { resourceType: 'Incident', resourceId: incidentId },
        });
        await prisma.projectionRecord.deleteMany({
          where: { aggregateType: 'Incident', aggregateId: incidentId },
        });
        await prisma.incident.deleteMany({ where: { id: incidentId } });
        await prisma.intakeReport.deleteMany({ where: { id: intakeReportId } });
      }
      await prisma.session.deleteMany({
        where: {
          userId: {
            in: [
              commander,
              duty,
              assigned,
              unassigned,
              crossUnit,
              crossCommander,
            ].map(({ id }) => id),
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [
              commander,
              duty,
              assigned,
              unassigned,
              crossUnit,
              crossCommander,
            ].map(({ id }) => id),
          },
        },
      });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [orgA, orgB] } },
      });
    });

    it('grants the commander assignment-free command scope but requires an assignment for mutate and read_sensitive', async () => {
      await expect(canAccess(commander, resource, 'read')).resolves.toBe(true);
      await expect(canAccess(commander, resource, 'assign')).resolves.toBe(
        true,
      );
      await expect(canAccess(commander, resource, 'approve')).resolves.toBe(
        true,
      );
      await expect(canAccess(commander, resource, 'mutate')).resolves.toBe(
        false,
      );
      await expect(
        canAccess(commander, resource, 'read_sensitive'),
      ).resolves.toBe(false);
    });

    it('grants the assigned user task capabilities without command powers', async () => {
      await expect(canAccess(assigned, resource, 'read')).resolves.toBe(true);
      await expect(canAccess(assigned, resource, 'mutate')).resolves.toBe(true);
      await expect(
        canAccess(assigned, resource, 'read_sensitive'),
      ).resolves.toBe(true);
      await expect(canAccess(assigned, resource, 'assign')).resolves.toBe(
        false,
      );
      await expect(canAccess(assigned, resource, 'approve')).resolves.toBe(
        false,
      );
    });

    it('denies the same-unit user without an assignment', async () => {
      await expect(canAccess(unassigned, resource, 'read')).resolves.toBe(
        false,
      );
      await expect(canAccess(unassigned, resource, 'mutate')).resolves.toBe(
        false,
      );
      await expect(
        canAccess(unassigned, resource, 'read_sensitive'),
      ).resolves.toBe(false);
    });

    it('denies users from an unrelated organization unit', async () => {
      await expect(canAccess(crossUnit, resource, 'read')).resolves.toBe(false);
      await expect(canAccess(crossUnit, resource, 'mutate')).resolves.toBe(
        false,
      );
      await expect(canAccess(crossCommander, resource, 'read')).resolves.toBe(
        false,
      );
    });

    it('enforces the domain read boundary on a real incident record', async () => {
      const registered = await registerIntakeReport(
        {
          channel: 'manual_other',
          receivedAt: new Date().toISOString(),
          content: 'T02 authorization boundary probe',
          idempotencyKey: `t02-authz:${stamp}`,
        },
        duty,
      );
      intakeReportId = registered.reportId;
      incidentId = registered.incidentId;
      await createAssignments(
        {
          resourceType: 'Incident',
          resourceId: incidentId,
          task: 'incident_verification',
          assigneeUserIds: [assigned.id],
          organizationId: orgA,
        },
        commander,
      );

      await expect(getIncident(incidentId, assigned)).resolves.toMatchObject({
        incident: expect.anything(),
      });
      await expect(getIncident(incidentId, unassigned)).rejects.toThrow(
        'FORBIDDEN',
      );
      await expect(getIncident(incidentId, crossUnit)).rejects.toThrow(
        'FORBIDDEN',
      );
      const readAudits = await prisma.auditEvent.count({
        where: {
          resourceType: 'Incident',
          resourceId: incidentId,
          operation: 'incident.read',
          actorId: assigned.id,
        },
      });
      expect(readAudits).toBeGreaterThan(0);
    });

    it('cuts new access on revocation while preserving assignment and audit history', async () => {
      await expect(canAccess(assigned, resource, 'read')).resolves.toBe(true);
      const revoked = await revokeAssignment(
        assignmentId,
        commander,
        'T02 task finished',
      );
      expect(revoked.status).toBe('revoked');
      await expect(canAccess(assigned, resource, 'read')).resolves.toBe(false);
      await expect(canAccess(assigned, resource, 'mutate')).resolves.toBe(
        false,
      );

      const stored = await prisma.assignment.findUniqueOrThrow({
        where: { id: assignmentId },
      });
      expect(stored.status).toBe('revoked');
      expect(stored.revokedById).toBe(commander.id);
      expect(stored.revokeReason).toBe('T02 task finished');
      expect(stored.revokedAt).toBeInstanceOf(Date);

      const history = await prisma.assignment.count({
        where: { resourceId: recordId },
      });
      expect(history).toBeGreaterThan(0);
      const grantAudits = await prisma.auditEvent.count({
        where: {
          resourceId: recordId,
          operation: 'assignment.granted',
        },
      });
      const revokeAudits = await prisma.auditEvent.count({
        where: {
          resourceId: recordId,
          operation: 'assignment.revoked',
        },
      });
      expect(grantAudits).toBeGreaterThan(0);
      expect(revokeAudits).toBeGreaterThan(0);
      const revokeEvents = await prisma.eventRecord.count({
        where: { aggregateType: 'Assignment', aggregateId: assignmentId },
      });
      expect(revokeEvents).toBeGreaterThan(0);
    });
  },
);
