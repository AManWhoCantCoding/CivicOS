import { ApiError, requestJson } from './client';

export type LandLookupMode = 'applicationCode' | 'parcelCode';

export type PublicLandLookup = {
  applicationCode: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
  simulated: true;
};

export type LandApplicationSummary = {
  id: string;
  applicationCode: string;
  changeType: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type LandParcelSummary = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  areaSqm: string;
  status: string;
  updatedAt: string;
};

export type LandTimelineEvent = {
  eventType: string;
  actor: { role: string | null } | null;
  occurredAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function invalidResponse(body: unknown): never {
  throw new ApiError(500, 'LAND_INVALID_RESPONSE', body);
}

function readPublicLookup(value: unknown): Omit<PublicLandLookup, 'simulated'> {
  if (!isRecord(value)) return invalidResponse(value);
  const applicationCode = text(value.applicationCode);
  const parcelCode = text(value.parcelCode);
  const mapSheetNumber = text(value.mapSheetNumber);
  const parcelNumber = text(value.parcelNumber);
  const status = text(value.status);
  const submittedAt = text(value.submittedAt);
  const updatedAt = text(value.updatedAt);
  const completedAt = nullableText(value.completedAt);
  if (
    !applicationCode ||
    !parcelCode ||
    !mapSheetNumber ||
    !parcelNumber ||
    !status ||
    !submittedAt ||
    !updatedAt ||
    (value.completedAt !== null && completedAt === null)
  ) {
    return invalidResponse(value);
  }
  return {
    applicationCode,
    parcelCode,
    mapSheetNumber,
    parcelNumber,
    status,
    submittedAt,
    updatedAt,
    completedAt,
  };
}

export async function getPublicLandLookup(
  mode: LandLookupMode,
  code: string,
): Promise<PublicLandLookup> {
  const queryKey =
    mode === 'applicationCode' ? 'applicationCode' : 'parcelCode';
  const body = await requestJson<unknown>(
    `/api/public/land/lookup?${queryKey}=${encodeURIComponent(code.trim())}`,
  );
  if (!isRecord(body) || body.simulated !== true || !isRecord(body.lookup)) {
    return invalidResponse(body);
  }
  return { ...readPublicLookup(body.lookup), simulated: true };
}

function readApplicationSummary(value: unknown): LandApplicationSummary | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const applicationCode = text(value.applicationCode);
  const changeType = text(value.changeType);
  const status = text(value.status);
  const submittedAt = text(value.submittedAt);
  const updatedAt = text(value.updatedAt);
  const completedAt = nullableText(value.completedAt);
  if (
    !id ||
    !applicationCode ||
    !changeType ||
    !status ||
    !submittedAt ||
    !updatedAt ||
    (value.completedAt !== null && completedAt === null)
  ) {
    return null;
  }
  return {
    id,
    applicationCode,
    changeType,
    status,
    submittedAt,
    updatedAt,
    completedAt,
  };
}

export async function getLandApplicationSummary(
  applicationCode: string,
): Promise<LandApplicationSummary | null> {
  let cursor: string | null = null;
  do {
    const body: unknown = await requestJson<unknown>(
      `/api/land/applications?limit=100${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      }`,
    );
    if (!isRecord(body) || !Array.isArray(body.items))
      return invalidResponse(body);
    for (const item of body.items) {
      const summary = readApplicationSummary(item);
      if (summary?.applicationCode === applicationCode) return summary;
    }
    cursor = typeof body.nextCursor === 'string' ? body.nextCursor : null;
  } while (cursor);
  return null;
}

function readParcelSummary(value: unknown): LandParcelSummary | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const parcelCode = text(value.parcelCode);
  const mapSheetNumber = text(value.mapSheetNumber);
  const parcelNumber = text(value.parcelNumber);
  const areaSqm = text(value.areaSqm);
  const status = text(value.status);
  const updatedAt = text(value.updatedAt);
  if (
    !id ||
    !parcelCode ||
    !mapSheetNumber ||
    !parcelNumber ||
    !areaSqm ||
    !status ||
    !updatedAt
  ) {
    return null;
  }
  return {
    id,
    parcelCode,
    mapSheetNumber,
    parcelNumber,
    areaSqm,
    status,
    updatedAt,
  };
}

export async function getLandParcelSummary(
  parcelCode: string,
): Promise<LandParcelSummary | null> {
  const body = await requestJson<unknown>(
    `/api/land/parcels?limit=100&parcelCode=${encodeURIComponent(parcelCode)}`,
  );
  if (!isRecord(body) || !Array.isArray(body.items))
    return invalidResponse(body);
  for (const item of body.items) {
    const summary = readParcelSummary(item);
    if (summary?.parcelCode === parcelCode) return summary;
  }
  return null;
}

function readTimelineEvent(value: unknown): LandTimelineEvent | null {
  if (!isRecord(value)) return null;
  const eventType = text(value.eventType);
  const occurredAt = text(value.occurredAt);
  if (!eventType || !occurredAt) return null;
  const actor = isRecord(value.actor) ? { role: text(value.actor.role) } : null;
  return { eventType, actor, occurredAt };
}

export async function getLandApplicationTimeline(
  applicationId: string,
): Promise<LandTimelineEvent[]> {
  const body = await requestJson<unknown>(
    `/api/land/applications/${encodeURIComponent(applicationId)}/timeline`,
  );
  if (!isRecord(body) || !Array.isArray(body.events))
    return invalidResponse(body);
  return body.events.flatMap((event) => {
    const safeEvent = readTimelineEvent(event);
    return safeEvent ? [safeEvent] : [];
  });
}
