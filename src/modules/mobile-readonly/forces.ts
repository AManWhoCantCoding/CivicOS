import { prisma } from '@/lib/prisma';
import {
  hasActiveAssignmentForRead,
  requireMobileReadAccess,
  type IdentityUser,
} from '@/modules/identity';

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type AlarmReadItem,
  type DispatchReadItem,
  type MobileListQuery,
  type TaskReadItem,
} from './contracts';

type AssignmentRow = {
  id: string;
  resourceType: string;
  resourceId: string;
  task: string;
  status: string;
  organizationId: string | null;
  createdAt: Date;
};

function page(input: MobileListQuery) {
  return {
    page: input.page && input.page > 0 ? Math.floor(input.page) : DEFAULT_PAGE,
    pageSize: Math.min(
      input.pageSize && input.pageSize > 0
        ? Math.floor(input.pageSize)
        : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    ),
  };
}

function assignmentTitle(row: AssignmentRow): string {
  return row.task.replaceAll('_', ' ');
}

function relatedInfo(row: AssignmentRow) {
  if (row.resourceType === 'Incident') {
    return { entityType: 'HOTSPOT' as const, id: row.resourceId };
  }
  if (row.resourceType === 'Establishment') {
    return { entityType: 'BUSINESS' as const, id: row.resourceId };
  }
  if (row.resourceType === 'SubjectManagementRecord') {
    return { entityType: 'RESIDENT' as const, id: row.resourceId };
  }
  if (row.resourceType === 'InspectionFinding') {
    return { entityType: 'VIOLATION' as const, id: row.resourceId };
  }
  return undefined;
}

type ResourceLink = {
  coordinates?: { lat: number; lng: number };
};

function dispatchItem(
  row: AssignmentRow,
  resourceLink?: ResourceLink,
): DispatchReadItem {
  return {
    id: `dispatch:${row.id}`,
    title: assignmentTitle(row),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    ...(row.resourceType === 'Incident' ? { incidentId: row.resourceId } : {}),
    ...(relatedInfo(row) ? { relatedInfo: relatedInfo(row) } : {}),
    ...(resourceLink?.coordinates
      ? { coordinates: resourceLink.coordinates }
      : {}),
    assignmentSummary: {
      assignmentId: row.id,
      task: row.task,
      status: row.status,
    },
  };
}

function taskItem(
  row: AssignmentRow,
  resourceLink?: ResourceLink,
): TaskReadItem {
  return {
    ...dispatchItem(row, resourceLink),
    id: `task:${row.id}`,
    dispatchId: `dispatch:${row.id}`,
  };
}

async function activeAssignments(user: IdentityUser): Promise<AssignmentRow[]> {
  if (!user.organizationUnitId) return [];
  const rows = await prisma.assignment.findMany({
    where: {
      assigneeUserId: user.id,
      organizationId: user.organizationUnitId,
      status: 'active',
    },
    orderBy: { createdAt: 'desc' },
  });
  const result: AssignmentRow[] = [];
  for (const row of rows) {
    if (
      await hasActiveAssignmentForRead(user, {
        resourceType: row.resourceType,
        resourceId: row.resourceId,
      })
    )
      result.push(row);
  }
  return result;
}

function filterAssignments(rows: AssignmentRow[], query: MobileListQuery) {
  const q = query.q?.toLowerCase();
  return rows.filter(
    (row) =>
      (!q ||
        `${row.id} ${row.task} ${row.resourceId}`.toLowerCase().includes(q)) &&
      (!query.status || row.status === query.status) &&
      (!query.incidentId || row.resourceId === query.incidentId) &&
      (!query.dispatchId ||
        query.dispatchId === `dispatch:${row.id}` ||
        query.dispatchId === row.id),
  );
}

function envelope<T>(rows: T[], input: MobileListQuery) {
  const { page: currentPage, pageSize } = page(input);
  return {
    data: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    total: rows.length,
    page: currentPage,
    pageSize,
  };
}

type AlarmResourceLink = ResourceLink & {
  relatedInfo?: ReturnType<typeof relatedInfo>;
};

async function resourceLinks(
  notifications: Array<{
    resourceType: string | null;
    resourceId: string | null;
  }>,
): Promise<Map<string, AlarmResourceLink>> {
  const links = new Map<string, AlarmResourceLink>();
  const idsByType = new Map<string, string[]>();
  for (const notification of notifications) {
    if (!notification.resourceType || !notification.resourceId) continue;
    const ids = idsByType.get(notification.resourceType) ?? [];
    ids.push(notification.resourceId);
    idsByType.set(notification.resourceType, ids);
  }
  const incidents = await prisma.incident.findMany({
    where: { id: { in: idsByType.get('Incident') ?? [] } },
    select: { id: true, latitude: true, longitude: true },
  });
  for (const incident of incidents) {
    links.set(`Incident:${incident.id}`, {
      relatedInfo: relatedInfo({
        resourceType: 'Incident',
        resourceId: incident.id,
      } as AssignmentRow),
      ...(incident.latitude !== null && incident.longitude !== null
        ? {
            coordinates: {
              lat: Number(incident.latitude),
              lng: Number(incident.longitude),
            },
          }
        : {}),
    });
  }
  const establishments = await prisma.establishment.findMany({
    where: { id: { in: idsByType.get('Establishment') ?? [] } },
    select: { id: true, latitude: true, longitude: true },
  });
  for (const establishment of establishments) {
    links.set(`Establishment:${establishment.id}`, {
      relatedInfo: relatedInfo({
        resourceType: 'Establishment',
        resourceId: establishment.id,
      } as AssignmentRow),
      ...(establishment.latitude !== null && establishment.longitude !== null
        ? {
            coordinates: {
              lat: Number(establishment.latitude),
              lng: Number(establishment.longitude),
            },
          }
        : {}),
    });
  }
  const records = await prisma.subjectManagementRecord.findMany({
    where: { id: { in: idsByType.get('SubjectManagementRecord') ?? [] } },
    select: {
      id: true,
      subject: { select: { latitude: true, longitude: true } },
    },
  });
  for (const record of records) {
    links.set(`SubjectManagementRecord:${record.id}`, {
      relatedInfo: relatedInfo({
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
      } as AssignmentRow),
      ...(record.subject.latitude !== null && record.subject.longitude !== null
        ? {
            coordinates: {
              lat: Number(record.subject.latitude),
              lng: Number(record.subject.longitude),
            },
          }
        : {}),
    });
  }
  const findings = await prisma.inspectionFinding.findMany({
    where: { id: { in: idsByType.get('InspectionFinding') ?? [] } },
    select: {
      id: true,
      inspectionId: true,
    },
  });
  const inspections = await prisma.inspection.findMany({
    where: { id: { in: findings.map((finding) => finding.inspectionId) } },
    select: { id: true, establishmentId: true },
  });
  const inspectionMap = new Map(
    inspections.map((inspection) => [
      inspection.id,
      inspection.establishmentId,
    ]),
  );
  const findingEstablishmentIds = findings
    .map((finding) => inspectionMap.get(finding.inspectionId))
    .filter((id): id is string => Boolean(id));
  const findingEstablishments = await prisma.establishment.findMany({
    where: { id: { in: findingEstablishmentIds } },
    select: { id: true, latitude: true, longitude: true },
  });
  const findingEstablishmentMap = new Map(
    findingEstablishments.map((establishment) => [
      establishment.id,
      establishment,
    ]),
  );
  for (const finding of findings) {
    const establishmentId = inspectionMap.get(finding.inspectionId);
    const establishment = establishmentId
      ? findingEstablishmentMap.get(establishmentId)
      : undefined;
    links.set(`InspectionFinding:${finding.id}`, {
      relatedInfo: relatedInfo({
        resourceType: 'InspectionFinding',
        resourceId: finding.id,
      } as AssignmentRow),
      ...(establishment?.latitude !== null &&
      establishment?.latitude !== undefined &&
      establishment?.longitude !== null &&
      establishment?.longitude !== undefined
        ? {
            coordinates: {
              lat: Number(establishment.latitude),
              lng: Number(establishment.longitude),
            },
          }
        : {}),
    });
  }
  const observations = await prisma.vehicleObservation.findMany({
    where: { id: { in: idsByType.get('VehicleObservation') ?? [] } },
    select: { id: true, latitude: true, longitude: true },
  });
  for (const observation of observations) {
    links.set(`VehicleObservation:${observation.id}`, {
      ...(observation.latitude !== null && observation.longitude !== null
        ? {
            coordinates: {
              lat: Number(observation.latitude),
              lng: Number(observation.longitude),
            },
          }
        : {}),
    });
  }
  return links;
}

/** Read notification projections without exposing notification body/free text. */
export async function listAlarms(
  user: IdentityUser,
): Promise<{ alarms: AlarmReadItem[] }> {
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const links = await resourceLinks(notifications);
  const alarms: AlarmReadItem[] = [];
  for (const notification of notifications) {
    if (
      notification.readAt ||
      !notification.resourceType ||
      !notification.resourceId
    )
      continue;
    if (
      !(await hasActiveAssignmentForRead(user, {
        resourceType: notification.resourceType,
        resourceId: notification.resourceId,
      }))
    )
      continue;
    alarms.push({
      id: notification.id,
      title: 'Cảnh báo cần chú ý',
      status: 'unread',
      createdAt: notification.createdAt.toISOString(),
      resourceType: notification.resourceType,
      resourceId: notification.resourceId,
      ...(notification.resourceType === 'Incident'
        ? { incidentId: notification.resourceId }
        : {}),
      ...(links.get(
        `${notification.resourceType}:${notification.resourceId}`,
      ) ?? {}),
      assignmentSummary: {
        assignmentId: `${notification.resourceType}:${notification.resourceId}`,
        task: 'mobile_read',
        status: 'active',
      },
    });
  }
  return { alarms };
}

/** Build dispatch read views from active assignments, never a new aggregate. */
export async function listDispatches(
  user: IdentityUser,
  query: MobileListQuery,
) {
  const rows = filterAssignments(await activeAssignments(user), query);
  const links = await resourceLinks(rows);
  return envelope(
    rows.map((row) =>
      dispatchItem(row, links.get(`${row.resourceType}:${row.resourceId}`)),
    ),
    query,
  );
}

/** Read one dispatch view and preserve detail-vs-empty boundary semantics. */
export async function getDispatch(user: IdentityUser, id: string) {
  const assignmentId = id.startsWith('dispatch:') ? id.slice(9) : id;
  const row = (await activeAssignments(user)).find(
    (candidate) => candidate.id === assignmentId,
  );
  if (!row) throw new Error('FORBIDDEN');
  await requireMobileReadAccess(user, {
    resourceType: row.resourceType,
    resourceId: row.resourceId,
  });
  const links = await resourceLinks([row]);
  return dispatchItem(row, links.get(`${row.resourceType}:${row.resourceId}`));
}

/** Build task read views from active assignments and retain dispatch links. */
export async function listTasks(user: IdentityUser, query: MobileListQuery) {
  const rows = filterAssignments(await activeAssignments(user), query);
  const links = await resourceLinks(rows);
  return envelope(
    rows.map((row) =>
      taskItem(row, links.get(`${row.resourceType}:${row.resourceId}`)),
    ),
    query,
  );
}

/** Read one task view and require the active Assignment again at detail time. */
export async function getTask(user: IdentityUser, id: string) {
  const taskId = id.startsWith('task:') ? id.slice(5) : id;
  const row = (await activeAssignments(user)).find(
    (candidate) => candidate.id === taskId,
  );
  if (!row) throw new Error('FORBIDDEN');
  await requireMobileReadAccess(user, {
    resourceType: row.resourceType,
    resourceId: row.resourceId,
  });
  const links = await resourceLinks([row]);
  return taskItem(row, links.get(`${row.resourceType}:${row.resourceId}`));
}

/** Source-compatible task-by-dispatch view, empty when the parent is out of scope. */
export async function listTasksByDispatchId(
  user: IdentityUser,
  dispatchId: string,
) {
  const normalized = dispatchId.startsWith('dispatch:')
    ? dispatchId.slice(9)
    : dispatchId;
  const rows = (await activeAssignments(user)).filter(
    (row) => row.id === normalized,
  );
  const links = await resourceLinks(rows);
  return envelope(
    rows.map((row) =>
      taskItem(row, links.get(`${row.resourceType}:${row.resourceId}`)),
    ),
    { dispatchId },
  );
}
