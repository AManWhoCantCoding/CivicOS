import { validateParcelPolygon, type PolygonGeometry } from './parcel-geometry';

// Parse/validate POST /api/land/parties request body.
export type PartyInput = {
  referenceCode: string;
  partyType: 'individual' | 'organization';
  displayName: string;
  identityNumber: string | null;
};

// Parse/validate POST /api/land/parcels request body.
export type ParcelInput = {
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  areaSqm: string;
  landUseType: string;
  address: string;
  communeCode: string;
  geometry: PolygonGeometry;
};

// Parse/validate GET cursor list query for parties and parcels.
export type LandListQuery = {
  status?: string;
  partyType?: string;
  communeCode?: string;
  parcelCode?: string;
  limit: number;
  cursor?: string;
};

export type PublicLandLookupQuery =
  { applicationCode: string } | { parcelCode: string };

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    throw new Error('INVALID_REQUEST');
  return value as Record<string, unknown>;
}

function requiredText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('INVALID_REQUEST');
  return value.trim();
}

function optionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !value.trim())
    throw new Error('INVALID_REQUEST');
  return value.trim();
}

// Check DecimalString with at most two fraction digits.
export function isDecimalString(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value);
}

// Parse/validate party create input against the locked contract.
export function parsePartyInput(value: unknown): PartyInput {
  const input = asRecord(value);
  const partyType = requiredText(input.partyType);
  if (partyType !== 'individual' && partyType !== 'organization')
    throw new Error('INVALID_REQUEST');
  const identityNumber =
    input.identityNumber === undefined || input.identityNumber === null
      ? null
      : requiredText(input.identityNumber);
  return {
    referenceCode: requiredText(input.referenceCode),
    partyType,
    displayName: requiredText(input.displayName),
    identityNumber,
  };
}

// Parse/validate parcel create input against the locked contract.
export function parseParcelInput(value: unknown): ParcelInput {
  const input = asRecord(value);
  const areaSqm = requiredText(input.areaSqm);
  if (!isDecimalString(areaSqm) || Number(areaSqm) <= 0)
    throw new Error('INVALID_REQUEST');
  const geometry = input.geometry;
  validateParcelPolygon(geometry);
  return {
    parcelCode: requiredText(input.parcelCode),
    mapSheetNumber: requiredText(input.mapSheetNumber),
    parcelNumber: requiredText(input.parcelNumber),
    areaSqm,
    landUseType: requiredText(input.landUseType),
    address: requiredText(input.address),
    communeCode: requiredText(input.communeCode),
    geometry,
  };
}

// Parse/validate cursor list query with default 50 and max 100.
export function parseLandListQuery(value: unknown): LandListQuery {
  const input = asRecord(value);
  const status = optionalText(input.status);
  if (
    status !== undefined &&
    status !== 'active' &&
    status !== 'archived' &&
    status !== 'proposed' &&
    status !== 'retired'
  )
    throw new Error('INVALID_REQUEST');
  const partyType = optionalText(input.partyType);
  if (
    partyType !== undefined &&
    partyType !== 'individual' &&
    partyType !== 'organization'
  )
    throw new Error('INVALID_REQUEST');
  let limit = 50;
  const rawLimit = optionalText(input.limit);
  if (rawLimit !== undefined) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('INVALID_REQUEST');
  }
  const cursor = optionalText(input.cursor);
  const communeCode = optionalText(input.communeCode);
  const parcelCode = optionalText(input.parcelCode);
  return {
    ...(status ? { status } : {}),
    ...(partyType ? { partyType } : {}),
    ...(communeCode ? { communeCode } : {}),
    ...(parcelCode ? { parcelCode } : {}),
    limit,
    ...(cursor ? { cursor } : {}),
  };
}

// Parse the public lookup query before any resource lookup is attempted.
export function parsePublicLandLookupQuery(
  value: URLSearchParams | Record<string, unknown>,
): PublicLandLookupQuery {
  const entries =
    value instanceof URLSearchParams
      ? [...value.entries()]
      : Object.entries(asRecord(value));
  if (entries.length !== 1) throw new Error('LOOKUP_QUERY_INVALID');
  const [key, rawValue] = entries[0] ?? [];
  if (
    (key !== 'applicationCode' && key !== 'parcelCode') ||
    typeof rawValue !== 'string' ||
    !rawValue.trim()
  ) {
    throw new Error('LOOKUP_QUERY_INVALID');
  }
  return key === 'applicationCode'
    ? { applicationCode: rawValue.trim() }
    : { parcelCode: rawValue.trim() };
}

// Encode a row id as an opaque list cursor.
export function encodeCursor(id: string): string {
  return Buffer.from(`land:${id}`, 'utf8').toString('base64url');
}

// Decode an opaque list cursor back to a row id.
export function decodeCursor(cursor: string): string {
  let decoded = '';
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new Error('INVALID_REQUEST');
  }
  if (!decoded.startsWith('land:') || decoded.length <= 5)
    throw new Error('INVALID_REQUEST');
  return decoded.slice(5);
}

// Locked change types for LandChangeApplication (data-model 3.5).
export const APPLICATION_CHANGE_TYPES: readonly string[] = [
  'transfer',
  'information_update',
  'mortgage',
  'parcel_split_merge',
];

// Locked application statuses (data-model 5.1).
export const APPLICATION_STATUSES: readonly string[] = [
  'submitted',
  'in_review',
  'sync_pending',
  'sync_succeeded',
  'sync_failed',
  'pending_approval',
  'rejected',
  'completed',
];

// Locked link roles (data-model 3.6, 3.7). LND-06 enforces set membership
// only; per-changeType relation rules belong to LND-07 (DR-12–DR-15).
export const APPLICATION_PARTY_ROLES: readonly string[] = [
  'applicant',
  'current_holder',
  'proposed_holder',
  'secured_party',
  'representative',
];

export const APPLICATION_PARCEL_ROLES: readonly string[] = [
  'subject',
  'source',
  'result',
];

// Parse/validate POST /api/land/applications request body (LND-06).
// Actor, organization, code, status and version always come from the
// session/server, never from the client payload.
export type ApplicationPartyInput = {
  partyId?: string;
  newParty?: PartyInput;
  partyRole: string;
  sharePercent: string | null;
};

export type ApplicationParcelInput = {
  parcelId: string;
  parcelRole: string;
};

export type ApplicationInput = {
  changeType: string;
  changePayload: Record<string, unknown>;
  parties: ApplicationPartyInput[];
  parcels: ApplicationParcelInput[];
};

function requiredId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('INVALID_REQUEST');
  return value.trim();
}

function optionalSharePercent(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !isDecimalString(value))
    throw new Error('INVALID_REQUEST');
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100)
    throw new Error('INVALID_REQUEST');
  return value;
}

function parseApplicationParty(value: unknown): ApplicationPartyInput {
  const input = asRecord(value);
  const partyRole = requiredText(input.partyRole);
  if (!APPLICATION_PARTY_ROLES.includes(partyRole))
    throw new Error('INVALID_REQUEST');
  const partyId =
    input.partyId === undefined ? undefined : requiredId(input.partyId);
  const newParty =
    input.newParty === undefined ? undefined : parsePartyInput(input.newParty);
  if (Boolean(partyId) === Boolean(newParty))
    throw new Error('INVALID_REQUEST');
  return {
    ...(partyId ? { partyId } : {}),
    ...(newParty ? { newParty } : {}),
    partyRole,
    sharePercent: optionalSharePercent(input.sharePercent),
  };
}

function parseApplicationParcel(value: unknown): ApplicationParcelInput {
  const input = asRecord(value);
  const parcelRole = requiredText(input.parcelRole);
  if (!APPLICATION_PARCEL_ROLES.includes(parcelRole))
    throw new Error('INVALID_REQUEST');
  return {
    parcelId: requiredId(input.parcelId),
    parcelRole,
  };
}

// Parse/validate application create input against the locked contract.
export function parseApplicationInput(value: unknown): ApplicationInput {
  const input = asRecord(value);
  const changeType = requiredText(input.changeType);
  if (!APPLICATION_CHANGE_TYPES.includes(changeType))
    throw new Error('INVALID_REQUEST');
  const payload = input.changePayload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
    throw new Error('INVALID_REQUEST');
  if (!Array.isArray(input.parties) || input.parties.length < 1)
    throw new Error('INVALID_REQUEST');
  if (!Array.isArray(input.parcels) || input.parcels.length < 1)
    throw new Error('INVALID_REQUEST');
  return {
    changeType,
    changePayload: payload as Record<string, unknown>,
    parties: input.parties.map(parseApplicationParty),
    parcels: input.parcels.map(parseApplicationParcel),
  };
}

// Parse/validate POST review If-Match-Version header (LND-08).
// Header is required and must be a positive integer; missing/invalid maps to
// 400 LAND_INVALID_REQUEST without inventing a new code.
export function parseReviewVersion(value: unknown): number {
  if (typeof value !== 'string') throw new Error('INVALID_REQUEST');
  const trimmed = value.trim();
  if (!trimmed) throw new Error('INVALID_REQUEST');
  if (!/^\d+$/.test(trimmed)) throw new Error('INVALID_REQUEST');
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error('INVALID_REQUEST');
  return parsed;
}

// Parse/validate POST review body (LND-08).
// Body is exactly {}; any field or non-object shape is 400 and guarantees no
// client-owned mutation fields reach the service.
export function parseReviewBody(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('INVALID_REQUEST');
  if (Object.keys(value as Record<string, unknown>).length !== 0)
    throw new Error('INVALID_REQUEST');
}

// Parse/validate POST approve body (LND-12, api-contract F-04).
// Body is {} or { reason: string | null }; extra keys are 400. A blank
// string normalizes to null so approve never fails on an empty reason.
export function parseApproveBody(value: unknown): { reason: string | null } {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('INVALID_REQUEST');
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length > 1 || (keys.length === 1 && keys[0] !== 'reason'))
    throw new Error('INVALID_REQUEST');
  if (!('reason' in record) || record['reason'] === undefined)
    return { reason: null };
  const reason = record['reason'];
  if (reason === null) return { reason: null };
  if (typeof reason !== 'string') throw new Error('INVALID_REQUEST');
  const trimmed = reason.trim();
  return { reason: trimmed ? trimmed : null };
}

// Parse/validate POST reject body (LND-12, api-contract F-04).
// Body is exactly { reason: string } with trimmed non-empty text; anything
// else is 400 LAND_INVALID_REQUEST with no state change.
export function parseRejectBody(value: unknown): { reason: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('INVALID_REQUEST');
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== 1 ||
    typeof record['reason'] !== 'string' ||
    !record['reason'].trim()
  )
    throw new Error('INVALID_REQUEST');
  return { reason: (record['reason'] as string).trim() };
}

// Parse/validate GET /api/land/applications query (LND-06).
export type ApplicationListQuery = {
  status?: string;
  changeType?: string;
  assignedTo?: string;
  limit: number;
  cursor?: string;
};

// Parse/validate application list query with default 50 and max 100.
export function parseApplicationListQuery(
  value: unknown,
): ApplicationListQuery {
  const input = asRecord(value);
  const status = optionalText(input.status);
  if (status !== undefined && !APPLICATION_STATUSES.includes(status))
    throw new Error('INVALID_REQUEST');
  const changeType = optionalText(input.changeType);
  if (
    changeType !== undefined &&
    !APPLICATION_CHANGE_TYPES.includes(changeType)
  )
    throw new Error('INVALID_REQUEST');
  const assignedTo = optionalText(input.assignedTo);
  let limit = 50;
  const rawLimit = optionalText(input.limit);
  if (rawLimit !== undefined) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('INVALID_REQUEST');
  }
  const cursor = optionalText(input.cursor);
  return {
    ...(status ? { status } : {}),
    ...(changeType ? { changeType } : {}),
    ...(assignedTo ? { assignedTo } : {}),
    limit,
    ...(cursor ? { cursor } : {}),
  };
}
