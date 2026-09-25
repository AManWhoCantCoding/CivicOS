import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';

const suffix = randomUUID();
const ouA = `mobile-ou-a-${suffix}`;
const ouB = `mobile-ou-b-${suffix}`;
const residentId = `mobile-resident-${suffix}`;
const crossResidentId = `mobile-cross-resident-${suffix}`;
const unassignedResidentId = `mobile-unassigned-resident-${suffix}`;
const businessId = `mobile-business-${suffix}`;
const crossBusinessId = `mobile-cross-business-${suffix}`;
const unassignedBusinessId = `mobile-unassigned-business-${suffix}`;
const hotspotId = `mobile-hotspot-${suffix}`;
const crossHotspotId = `mobile-cross-hotspot-${suffix}`;
const unassignedHotspotId = `mobile-unassigned-hotspot-${suffix}`;
const violationId = `mobile-violation-${suffix}`;
const crossViolationId = `mobile-cross-violation-${suffix}`;
const unassignedViolationId = `mobile-unassigned-violation-${suffix}`;
const inspectionId = `mobile-inspection-${suffix}`;
const crossInspectionId = `mobile-cross-inspection-${suffix}`;
const unassignedInspectionId = `mobile-unassigned-inspection-${suffix}`;
const establishmentType = `licensed-${suffix}`;
let templateId = '';

export const mobileUsers = {
  inScope: {
    id: `mobile-in-${suffix}`,
    email: `mobile-in-${suffix}@example.test`,
    name: 'In scope',
    roles: ['field_officer'],
    organizationUnitId: ouA,
  },
  commanderWithoutAssignment: {
    id: `mobile-commander-noassign-${suffix}`,
    email: `mobile-commander-${suffix}@example.test`,
    name: 'Commander',
    roles: ['commander'],
    organizationUnitId: ouA,
  },
  commanderWithAssignment: {
    id: `mobile-commander-active-${suffix}`,
    email: `mobile-commander-active-${suffix}@example.test`,
    name: 'Commander active',
    roles: ['commander'],
    organizationUnitId: ouA,
  },
  crossUnit: {
    id: `mobile-cross-${suffix}`,
    email: `mobile-cross-${suffix}@example.test`,
    name: 'Cross unit',
    roles: ['field_officer'],
    organizationUnitId: ouB,
  },
  revoked: {
    id: `mobile-revoked-${suffix}`,
    email: `mobile-revoked-${suffix}@example.test`,
    name: 'Revoked assignment',
    roles: ['field_officer'],
    organizationUnitId: ouA,
  },
} satisfies Record<string, IdentityUser>;

export const mobileResource = {
  resourceType: 'Incident',
  resourceId: hotspotId,
  organizationId: ouA,
} as const;

export const mobileEntityIds = {
  residentId,
  crossResidentId,
  unassignedResidentId,
  businessId,
  crossBusinessId,
  unassignedBusinessId,
  hotspotId,
  crossHotspotId,
  unassignedHotspotId,
  violationId,
  crossViolationId,
  unassignedViolationId,
};
export const mobileDispatchId = `dispatch:mobile-assignment-${suffix}-0`;
export const mobileOutsideDispatchId = `dispatch:mobile-assignment-${suffix}-outside`;
export const mobileOutsideTaskId = `task:mobile-assignment-${suffix}-outside`;
export const mobileForgedDispatchId = `dispatch:mobile-forged-cross-hotspot-assignment-${suffix}`;
export const mobileForgedTaskId = `task:mobile-forged-cross-hotspot-assignment-${suffix}`;

async function createMobileReadonlyFixture(): Promise<void> {
  await prisma.organizationUnit.createMany({
    data: [
      { id: ouA, name: `Mobile A ${suffix}`, level: 'commune' },
      { id: ouB, name: `Mobile B ${suffix}`, level: 'commune' },
    ],
  });
  const roleNames = ['field_officer', 'commander'];
  const roles = await Promise.all(
    roleNames.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, description: `Mobile test ${name}` },
      }),
    ),
  );
  await prisma.user.createMany({
    data: Object.values(mobileUsers).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      organizationUnitId: user.organizationUnitId,
      active: true,
    })),
  });
  await prisma.userRole.createMany({
    data: Object.values(mobileUsers).map((user) => ({
      userId: user.id,
      roleId: roles.find((role) => role.name === user.roles[0])!.id,
    })),
  });
  await prisma.subject.create({
    data: {
      id: residentId,
      displayName: 'Synthetic resident PII',
      subjectType: 'temporary_resident',
      sensitiveProfile: 'synthetic-sensitive-profile',
      latitude: 20.9,
      longitude: 105.8,
    },
  });
  await prisma.subject.createMany({
    data: [
      {
        id: crossResidentId,
        displayName: 'Cross resident PII',
        subjectType: 'temporary_resident',
        sensitiveProfile: 'cross-sensitive-profile',
        latitude: 20.95,
        longitude: 105.85,
      },
      {
        id: unassignedResidentId,
        displayName: 'Unassigned resident PII',
        subjectType: 'temporary_resident',
        sensitiveProfile: 'unassigned-sensitive-profile',
        latitude: 20.96,
        longitude: 105.86,
      },
    ],
  });
  await prisma.subjectManagementRecord.create({
    data: {
      id: residentId,
      subjectId: residentId,
      purpose: 'temporary_resident',
      assignedOrganizationId: ouA,
    },
  });
  await prisma.subjectManagementRecord.createMany({
    data: [
      {
        id: crossResidentId,
        subjectId: crossResidentId,
        purpose: 'temporary_resident',
        assignedOrganizationId: ouB,
      },
      {
        id: unassignedResidentId,
        subjectId: unassignedResidentId,
        purpose: 'temporary_resident',
        assignedOrganizationId: ouA,
      },
    ],
  });
  await prisma.establishment.create({
    data: {
      id: businessId,
      name: 'Synthetic business',
      ownerName: 'Synthetic owner PII',
      address: 'Synthetic address',
      type: establishmentType,
      latitude: 20.92,
      longitude: 105.82,
      organizationId: ouA,
    },
  });
  await prisma.establishment.createMany({
    data: [
      {
        id: crossBusinessId,
        name: 'Cross unit business',
        ownerName: 'Cross owner PII',
        address: 'Cross address',
        type: establishmentType,
        latitude: 20.93,
        longitude: 105.83,
        organizationId: ouB,
      },
      {
        id: unassignedBusinessId,
        name: 'Unassigned business',
        ownerName: 'Unassigned owner PII',
        address: 'Unassigned address',
        type: establishmentType,
        latitude: 20.94,
        longitude: 105.84,
        organizationId: ouA,
      },
      {
        id: `mobile-cross-violation-business-${suffix}`,
        name: 'Cross violation business',
        ownerName: 'Cross violation owner PII',
        address: 'Cross violation address',
        type: establishmentType,
        latitude: 20.99,
        longitude: 105.89,
        organizationId: ouB,
      },
      {
        id: `mobile-unassigned-violation-business-${suffix}`,
        name: 'Unassigned violation business',
        ownerName: 'Unassigned violation owner PII',
        address: 'Unassigned violation address',
        type: establishmentType,
        latitude: 21,
        longitude: 105.9,
        organizationId: ouA,
      },
    ],
  });
  await prisma.incident.create({
    data: {
      id: hotspotId,
      category: 'synthetic-hotspot',
      description: 'Synthetic incident free text PII',
      latitude: 20.91,
      longitude: 105.81,
    },
  });
  await prisma.incident.createMany({
    data: [
      {
        id: crossHotspotId,
        category: 'cross-hotspot',
        description: 'Cross incident free text PII',
        latitude: 20.97,
        longitude: 105.87,
      },
      {
        id: unassignedHotspotId,
        category: 'unassigned-hotspot',
        description: 'Unassigned incident free text PII',
        latitude: 20.98,
        longitude: 105.88,
      },
    ],
  });
  await prisma.eventRecord.create({
    data: {
      id: `mobile-event-${suffix}`,
      eventId: `mobile-event-${suffix}`,
      eventType: 'IncidentCreated',
      aggregateType: 'Incident',
      aggregateId: hotspotId,
      aggregateVersion: 1,
      occurredAt: new Date(),
      organizationId: ouA,
      payload: {},
      metadata: {},
    },
  });
  await prisma.eventRecord.createMany({
    data: [
      {
        id: `mobile-cross-event-${suffix}`,
        eventId: `mobile-cross-event-${suffix}`,
        eventType: 'IncidentCreated',
        aggregateType: 'Incident',
        aggregateId: crossHotspotId,
        aggregateVersion: 1,
        occurredAt: new Date(),
        organizationId: ouB,
        payload: {},
        metadata: {},
      },
      {
        id: `mobile-unassigned-event-${suffix}`,
        eventId: `mobile-unassigned-event-${suffix}`,
        eventType: 'IncidentCreated',
        aggregateType: 'Incident',
        aggregateId: unassignedHotspotId,
        aggregateVersion: 1,
        occurredAt: new Date(),
        organizationId: ouA,
        payload: {},
        metadata: {},
      },
    ],
  });
  const template = await prisma.checklistTemplate.create({
    data: {
      establishmentType,
      version: 1,
      title: `Mobile template ${suffix}`,
      items: [{ key: 'safety', label: 'Safety' }],
    },
  });
  templateId = template.id;
  const inspection = await prisma.inspection.create({
    data: {
      id: inspectionId,
      establishmentId: businessId,
      templateId: template.id,
      templateVersion: 1,
      scheduledAt: new Date(),
    },
  });
  await prisma.inspectionFinding.create({
    data: {
      id: violationId,
      inspectionId: inspection.id,
      checklistKey: 'safety',
      description: 'Synthetic violation free text PII',
      result: 'needs_action',
      category: 'safety',
      evidenceIds: [`synthetic-evidence-${suffix}`],
    },
  });
  await prisma.inspection.createMany({
    data: [
      {
        id: crossInspectionId,
        establishmentId: `mobile-cross-violation-business-${suffix}`,
        templateId: template.id,
        templateVersion: 1,
        scheduledAt: new Date(Date.now() + 1000),
      },
      {
        id: unassignedInspectionId,
        establishmentId: `mobile-unassigned-violation-business-${suffix}`,
        templateId: template.id,
        templateVersion: 1,
        scheduledAt: new Date(Date.now() + 2000),
      },
    ],
  });
  await prisma.inspectionFinding.createMany({
    data: [
      {
        id: crossViolationId,
        inspectionId: crossInspectionId,
        checklistKey: 'safety',
        description: 'Cross violation free text PII',
        result: 'needs_action',
        category: 'safety',
        evidenceIds: [`cross-evidence-${suffix}`],
      },
      {
        id: unassignedViolationId,
        inspectionId: unassignedInspectionId,
        checklistKey: 'safety',
        description: 'Unassigned violation free text PII',
        result: 'needs_action',
        category: 'safety',
        evidenceIds: [`unassigned-evidence-${suffix}`],
      },
    ],
  });
  const assignments = [
    ['SubjectManagementRecord', residentId, 'resident_followup'],
    ['Establishment', businessId, 'mobile_read'],
    ['Incident', hotspotId, 'mobile_read'],
    ['InspectionFinding', violationId, 'mobile_read'],
  ];
  await prisma.assignment.createMany({
    data: assignments.map(([resourceType, resourceId, task], index) => ({
      id: `mobile-assignment-${suffix}-${index}`,
      resourceType,
      resourceId,
      task,
      assigneeUserId: mobileUsers.inScope.id,
      grantedById: mobileUsers.commanderWithAssignment.id,
      organizationId: ouA,
    })),
  });
  await prisma.assignment.create({
    data: {
      id: `mobile-commander-assignment-${suffix}`,
      resourceType: 'Incident',
      resourceId: hotspotId,
      task: 'mobile_read',
      assigneeUserId: mobileUsers.commanderWithAssignment.id,
      grantedById: mobileUsers.commanderWithAssignment.id,
      organizationId: ouA,
    },
  });
  await prisma.assignment.create({
    data: {
      id: `mobile-revoked-assignment-${suffix}`,
      resourceType: 'Incident',
      resourceId: hotspotId,
      task: 'mobile_read',
      assigneeUserId: mobileUsers.revoked.id,
      grantedById: mobileUsers.commanderWithAssignment.id,
      organizationId: ouA,
      status: 'revoked',
      revokedAt: new Date(),
    },
  });
  await prisma.assignment.create({
    data: {
      id: `mobile-assignment-${suffix}-outside`,
      resourceType: 'Establishment',
      resourceId: crossBusinessId,
      task: 'mobile_read',
      assigneeUserId: mobileUsers.inScope.id,
      grantedById: mobileUsers.commanderWithAssignment.id,
      organizationId: ouB,
    },
  });
  await prisma.assignment.create({
    data: {
      id: `mobile-forged-cross-hotspot-assignment-${suffix}`,
      resourceType: 'Incident',
      resourceId: crossHotspotId,
      task: 'mobile_read',
      assigneeUserId: mobileUsers.inScope.id,
      grantedById: mobileUsers.commanderWithAssignment.id,
      organizationId: ouA,
    },
  });
  await prisma.notification.create({
    data: {
      id: `mobile-notification-${suffix}`,
      userId: mobileUsers.inScope.id,
      type: 'incident_attention',
      title: 'Synthetic notification PII',
      body: 'Synthetic notification body PII',
      resourceType: 'Incident',
      resourceId: hotspotId,
    },
  });
  await prisma.notification.createMany({
    data: [
      {
        id: `mobile-cross-notification-${suffix}`,
        userId: mobileUsers.inScope.id,
        type: 'incident_attention',
        title: 'Cross notification PII',
        body: 'Cross notification body PII',
        resourceType: 'Incident',
        resourceId: crossHotspotId,
      },
      {
        id: `mobile-unassigned-notification-${suffix}`,
        userId: mobileUsers.inScope.id,
        type: 'incident_attention',
        title: 'Unassigned notification PII',
        body: 'Unassigned notification body PII',
        resourceType: 'Incident',
        resourceId: unassignedHotspotId,
      },
    ],
  });
}

export async function seedMobileReadonlyFixture(): Promise<void> {
  try {
    await createMobileReadonlyFixture();
  } catch (error) {
    await cleanupMobileReadonlyFixture();
    throw error;
  }
}

export async function cleanupMobileReadonlyFixture(): Promise<void> {
  const userIds = Object.values(mobileUsers).map((user) => user.id);
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.assignment.deleteMany({
    where: { id: { startsWith: `mobile-assignment-${suffix}` } },
  });
  await prisma.assignment.deleteMany({
    where: { id: `mobile-revoked-assignment-${suffix}` },
  });
  await prisma.assignment.deleteMany({
    where: { id: `mobile-commander-assignment-${suffix}` },
  });
  await prisma.assignment.deleteMany({
    where: { id: `mobile-forged-cross-hotspot-assignment-${suffix}` },
  });
  await prisma.inspectionFinding.deleteMany({
    where: {
      id: { in: [violationId, crossViolationId, unassignedViolationId] },
    },
  });
  await prisma.inspection.deleteMany({
    where: {
      id: { in: [inspectionId, crossInspectionId, unassignedInspectionId] },
    },
  });
  if (templateId)
    await prisma.checklistTemplate.deleteMany({ where: { id: templateId } });
  await prisma.eventRecord.deleteMany({
    where: {
      eventId: {
        in: [
          `mobile-event-${suffix}`,
          `mobile-cross-event-${suffix}`,
          `mobile-unassigned-event-${suffix}`,
        ],
      },
    },
  });
  await prisma.incident.deleteMany({
    where: { id: { in: [hotspotId, crossHotspotId, unassignedHotspotId] } },
  });
  await prisma.establishment.deleteMany({
    where: {
      id: {
        in: [
          businessId,
          crossBusinessId,
          unassignedBusinessId,
          `mobile-cross-violation-business-${suffix}`,
          `mobile-unassigned-violation-business-${suffix}`,
        ],
      },
    },
  });
  await prisma.subjectManagementRecord.deleteMany({
    where: { id: { in: [residentId, crossResidentId, unassignedResidentId] } },
  });
  await prisma.subject.deleteMany({
    where: { id: { in: [residentId, crossResidentId, unassignedResidentId] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organizationUnit.deleteMany({
    where: { id: { in: [ouA, ouB] } },
  });
}
