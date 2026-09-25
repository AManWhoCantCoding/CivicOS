import { prisma } from '@/lib/prisma';
import {
  hasActiveAssignmentForRead,
  canViewSensitive,
  requireMobileReadAccess,
  type IdentityUser,
} from '@/modules/identity';
import { recordAudit } from '@/modules/identity';

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MOBILE_READ_ENTITY_TYPES,
  MOBILE_RESOURCE_TYPES,
  type RelatedInfoCounts,
  type RelatedInfoEntityType,
  type RelatedInfoItem,
  type RelatedInfoSearchEnvelope,
  type RelatedInfoSearchQuery,
} from './contracts';

type Candidate = RelatedInfoItem & {
  resourceType: string;
  resourceId: string;
  organizationId: string;
};

function numberValue(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integerValue(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function itemForUser(
  user: IdentityUser,
  entityType: RelatedInfoEntityType,
  input: Omit<RelatedInfoItem, 'entityType' | 'masked'> & {
    resourceId: string;
    organizationId: string;
  },
): Promise<Candidate> {
  const masked = !(await canViewSensitive(user, {
    resourceType: MOBILE_RESOURCE_TYPES[entityType],
    resourceId: input.resourceId,
    organizationId: input.organizationId,
  }));
  return {
    entityType,
    id: input.id,
    title: masked
      ? entityType === 'RESIDENT'
        ? 'Đối tượng đã che'
        : entityType === 'BUSINESS'
          ? 'Cơ sở đã che'
          : entityType === 'VIOLATION'
            ? 'Phát hiện cần xử lý'
            : 'Khu vực cần chú ý'
      : input.title,
    status: input.status,
    ...(input.address ? { address: input.address } : {}),
    ...(input.lat === undefined ? {} : { lat: input.lat }),
    ...(input.lng === undefined ? {} : { lng: input.lng }),
    ...(input.geometry === undefined ? {} : { geometry: input.geometry }),
    updatedAt: input.updatedAt,
    masked,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    resourceType: MOBILE_RESOURCE_TYPES[entityType],
    resourceId: input.resourceId,
    organizationId: input.organizationId,
  };
}

function numeric(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCandidate(value: Candidate): RelatedInfoItem {
  return {
    entityType: value.entityType,
    id: value.id,
    title: value.title,
    status: value.status,
    ...(value.address ? { address: value.address } : {}),
    ...(value.lat === undefined ? {} : { lat: value.lat }),
    ...(value.lng === undefined ? {} : { lng: value.lng }),
    ...(value.geometry === undefined ? {} : { geometry: value.geometry }),
    updatedAt: value.updatedAt,
    masked: value.masked,
    ...(value.metadata ? { metadata: value.metadata } : {}),
  };
}

/** Normalize related-info query input at the HTTP trust boundary. */
export function parseRelatedInfoQuery(
  input: URLSearchParams | Record<string, string | undefined>,
): RelatedInfoSearchQuery {
  const get = (key: string) =>
    input instanceof URLSearchParams
      ? (input.get(key) ?? undefined)
      : input[key];
  const entityType = get('entityType')?.toUpperCase();
  if (
    entityType &&
    !(MOBILE_READ_ENTITY_TYPES as readonly string[]).includes(entityType)
  ) {
    throw new Error('INVALID_ENTITY_TYPE');
  }
  const query: RelatedInfoSearchQuery = {
    q: get('q') || undefined,
    entityType: entityType as RelatedInfoEntityType | undefined,
    status: get('status') || undefined,
    type: get('type') || undefined,
    category: get('category') || undefined,
    riskLevel: get('riskLevel') || undefined,
    tag: get('tag') || undefined,
    dateFrom: get('dateFrom') || undefined,
    dateTo: get('dateTo') || undefined,
    lat: numberValue(get('lat') ?? null),
    lng: numberValue(get('lng') ?? null),
    radiusKm: numberValue(get('radiusKm') ?? null),
    geoLatMin: numberValue(get('geoLatMin') ?? null),
    geoLatMax: numberValue(get('geoLatMax') ?? null),
    geoLngMin: numberValue(get('geoLngMin') ?? null),
    geoLngMax: numberValue(get('geoLngMax') ?? null),
    page: integerValue(get('page'), DEFAULT_PAGE),
    pageSize: Math.min(
      integerValue(get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    ),
  };
  return query;
}

async function candidatesForType(
  user: IdentityUser,
  entityType: RelatedInfoEntityType,
): Promise<Candidate[]> {
  const organizationId = user.organizationUnitId;
  if (!organizationId) return [];
  if (entityType === 'RESIDENT') {
    const records = await prisma.subjectManagementRecord.findMany({
      where: { assignedOrganizationId: organizationId },
      include: { subject: true },
    });
    const result: Candidate[] = [];
    for (const record of records) {
      if (
        !(await hasActiveAssignmentForRead(user, {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          organizationId,
        }))
      )
        continue;
      result.push(
        await itemForUser(user, 'RESIDENT', {
          id: record.subject.id,
          resourceId: record.id,
          organizationId,
          title: 'Đối tượng đã che',
          status: record.status,
          address: undefined,
          lat: numeric(record.subject.latitude),
          lng: numeric(record.subject.longitude),
          updatedAt: record.updatedAt.toISOString(),
        }),
      );
    }
    return result;
  }
  if (entityType === 'BUSINESS') {
    const rows = await prisma.establishment.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
    const result: Candidate[] = [];
    for (const row of rows) {
      if (
        !(await hasActiveAssignmentForRead(user, {
          resourceType: 'Establishment',
          resourceId: row.id,
          organizationId,
        }))
      )
        continue;
      result.push(
        await itemForUser(user, 'BUSINESS', {
          id: row.id,
          resourceId: row.id,
          organizationId,
          title: row.name,
          status: row.status,
          address: row.address,
          lat: numeric(row.latitude),
          lng: numeric(row.longitude),
          updatedAt: row.updatedAt.toISOString(),
        }),
      );
    }
    return result;
  }
  if (entityType === 'HOTSPOT') {
    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'Incident', organizationId },
      distinct: ['aggregateId'],
      select: { aggregateId: true },
    });
    const incidents = await prisma.incident.findMany({
      where: { id: { in: events.map(({ aggregateId }) => aggregateId) } },
      orderBy: { updatedAt: 'desc' },
    });
    const projections = await prisma.projectionRecord.findMany({
      where: {
        aggregateType: 'Incident',
        aggregateId: { in: incidents.map(({ id }) => id) },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const projectionMap = new Map<string, unknown>();
    for (const projection of projections) {
      if (!projectionMap.has(projection.aggregateId)) {
        const state = projection.state;
        if (
          state &&
          typeof state === 'object' &&
          !Array.isArray(state) &&
          'geometry' in state
        ) {
          projectionMap.set(
            projection.aggregateId,
            (state as { geometry?: unknown }).geometry,
          );
        }
      }
    }
    const result: Candidate[] = [];
    for (const row of incidents) {
      if (
        !(await hasActiveAssignmentForRead(user, {
          resourceType: 'Incident',
          resourceId: row.id,
          organizationId,
        }))
      )
        continue;
      result.push(
        await itemForUser(user, 'HOTSPOT', {
          id: row.id,
          resourceId: row.id,
          organizationId,
          title: row.category ?? 'Khu vực cần chú ý',
          status: row.status,
          lat: numeric(row.latitude),
          lng: numeric(row.longitude),
          geometry: projectionMap.get(row.id),
          updatedAt: row.updatedAt.toISOString(),
        }),
      );
    }
    return result;
  }
  const establishments = await prisma.establishment.findMany({
    where: { organizationId },
  });
  const establishmentIds = establishments.map(({ id }) => id);
  if (!establishmentIds.length) return [];
  const inspections = await prisma.inspection.findMany({
    where: {
      establishmentId: { in: establishmentIds },
    },
  });
  const findings = await prisma.inspectionFinding.findMany({
    where: { inspectionId: { in: inspections.map(({ id }) => id) } },
    orderBy: { createdAt: 'desc' },
  });
  const establishmentMap = new Map(establishments.map((row) => [row.id, row]));
  const inspectionMap = new Map(inspections.map((row) => [row.id, row]));
  const result: Candidate[] = [];
  for (const finding of findings) {
    const inspection = inspectionMap.get(finding.inspectionId);
    const establishment = inspection
      ? establishmentMap.get(inspection.establishmentId)
      : undefined;
    if (
      !establishment ||
      !(await hasActiveAssignmentForRead(user, {
        resourceType: 'InspectionFinding',
        resourceId: finding.id,
        organizationId,
      }))
    )
      continue;
    result.push(
      await itemForUser(user, 'VIOLATION', {
        id: finding.id,
        resourceId: finding.id,
        organizationId,
        title: finding.category ?? 'Phát hiện cần xử lý',
        status: finding.result,
        address: establishment.address,
        lat: numeric(establishment.latitude),
        lng: numeric(establishment.longitude),
        updatedAt: finding.createdAt.toISOString(),
        metadata: {
          result: finding.result,
          checklistKey: finding.checklistKey,
          evidenceIds: Array.isArray(finding.evidenceIds)
            ? finding.evidenceIds.filter(
                (evidenceId): evidenceId is string =>
                  typeof evidenceId === 'string',
              )
            : [],
        },
      }),
    );
  }
  return result;
}

async function allCandidates(
  user: IdentityUser,
  query: RelatedInfoSearchQuery,
) {
  const types = query.entityType
    ? [query.entityType]
    : [...MOBILE_READ_ENTITY_TYPES];
  const rows = (
    await Promise.all(types.map((type) => candidatesForType(user, type)))
  ).flat();
  const q = query.q?.toLowerCase();
  return rows
    .filter(
      (row) =>
        !q || `${row.id} ${row.title} ${row.status}`.toLowerCase().includes(q),
    )
    .filter((row) => !query.status || row.status === query.status)
    .filter(
      (row) =>
        !query.type ||
        row.title.toLowerCase().includes(query.type.toLowerCase()),
    )
    .filter(
      (row) =>
        !query.category ||
        row.title.toLowerCase().includes(query.category.toLowerCase()),
    )
    .filter(
      (row) =>
        !query.riskLevel ||
        row.status.toLowerCase() === query.riskLevel.toLowerCase(),
    )
    .filter(
      (row) =>
        !query.tag ||
        `${row.title} ${row.status}`
          .toLowerCase()
          .includes(query.tag.toLowerCase()),
    )
    .filter((row) => !query.dateFrom || row.updatedAt >= query.dateFrom)
    .filter((row) => !query.dateTo || row.updatedAt <= query.dateTo)
    .filter(
      (row) =>
        query.lat === undefined ||
        query.lng === undefined ||
        query.radiusKm === undefined ||
        (row.lat !== undefined &&
          row.lng !== undefined &&
          Math.hypot(
            (row.lat - query.lat) * 111,
            (row.lng - query.lng) * 104,
          ) <= query.radiusKm),
    )
    .filter(
      (row) =>
        query.geoLatMin === undefined ||
        (row.lat !== undefined && row.lat >= query.geoLatMin),
    )
    .filter(
      (row) =>
        query.geoLatMax === undefined ||
        (row.lat !== undefined && row.lat <= query.geoLatMax),
    )
    .filter(
      (row) =>
        query.geoLngMin === undefined ||
        (row.lng !== undefined && row.lng >= query.geoLngMin),
    )
    .filter(
      (row) =>
        query.geoLngMax === undefined ||
        (row.lng !== undefined && row.lng <= query.geoLngMax),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

/** Search only records that pass the server-side OU and Assignment boundary. */
export async function searchRelatedInfo(
  user: IdentityUser,
  query: RelatedInfoSearchQuery,
): Promise<RelatedInfoSearchEnvelope> {
  const page = query.page ?? DEFAULT_PAGE;
  const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const rows = await allCandidates(user, query);
  await recordAudit({
    actor: user,
    resourceType: 'RelatedInfo',
    resourceId: '*',
    operation: 'mobile.related_info.listed',
    metadata: { count: rows.length },
  });
  return {
    data: rows
      .slice((page - 1) * pageSize, page * pageSize)
      .map(parseCandidate),
    total: rows.length,
    page,
    pageSize,
  };
}

/** Count the same boundary-filtered set used by search. */
export async function countRelatedInfo(
  user: IdentityUser,
  query: RelatedInfoSearchQuery,
): Promise<RelatedInfoCounts> {
  const rows = await allCandidates(user, query);
  const counts: RelatedInfoCounts = {
    ALL: rows.length,
    RESIDENT: 0,
    BUSINESS: 0,
    HOTSPOT: 0,
    VIOLATION: 0,
  };
  for (const row of rows) counts[row.entityType] += 1;
  return counts;
}

/** Resolve one detail and enforce the same Assignment boundary as list views. */
export async function getRelatedInfoDetail(
  user: IdentityUser,
  entityType: RelatedInfoEntityType,
  id: string,
): Promise<{ entityType: RelatedInfoEntityType; data: RelatedInfoItem }> {
  if (!(MOBILE_READ_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    throw new Error('INVALID_ENTITY_TYPE');
  }
  const rows = await candidatesForType(user, entityType);
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error('FORBIDDEN');
  await requireMobileReadAccess(user, {
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    organizationId: row.organizationId,
  });
  return { entityType, data: parseCandidate(row) };
}
