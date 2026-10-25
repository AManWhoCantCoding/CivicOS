// LND-05 client seam cho screen-04 + LND-09 cho screen-01/02: chỉ gọi các
// endpoint nội bộ đã lock trong api-contract (GET parties, GET parcels,
// GET parcels/{parcelId}, GET/POST applications) và public lookup projection.
// Authorization do server policy quyết định; public lookup không yêu cầu session.

import type {
  EncumbranceView,
  ParcelView,
  PartyView,
  RightView,
} from './workspace-view';
import type {
  ApplicationSummaryView,
  ApplicationDetailView,
  TimelineEventView,
} from './application-view';

export const LAND_PARCELS_URL = '/api/land/parcels';
export const LAND_PARTIES_URL = '/api/land/parties';
export const LAND_APPLICATIONS_URL = '/api/land/applications';
export const LAND_PUBLIC_LOOKUP_URL = '/api/public/land/lookup';
export const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type EvidenceResourceType = 'application' | 'parcel' | 'party';

export type EvidenceView = {
  id: string;
  resourceType: string;
  resourceId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  originalHash: string;
  immutable: boolean;
  description: string | null;
  createdAt: string;
};

const EVIDENCE_COLLECTIONS: Record<EvidenceResourceType, string> = {
  application: 'applications',
  parcel: 'parcels',
  party: 'parties',
};

export function evidenceUrl(
  resourceType: EvidenceResourceType,
  resourceId: string,
): string {
  return `/api/land/${EVIDENCE_COLLECTIONS[resourceType]}/${encodeURIComponent(resourceId)}/evidence`;
}

export function isSupportedEvidenceMime(mimeType: string): boolean {
  return (EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function parcelDetailUrl(parcelId: string): string {
  return `/api/land/parcels/${encodeURIComponent(parcelId)}`;
}

export type LandApiError = {
  status: number | null;
  code: string | null;
};

function readErrorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

async function readJson(response: Response): Promise<{
  status: number;
  body: unknown;
}> {
  const body = (await response.json().catch(() => null)) as unknown;
  return { status: response.status, body };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readEvidence(value: unknown): EvidenceView | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.resourceType !== 'string' ||
    typeof value.resourceId !== 'string' ||
    typeof value.fileName !== 'string' ||
    typeof value.mimeType !== 'string' ||
    typeof value.sizeBytes !== 'number' ||
    !Number.isInteger(value.sizeBytes) ||
    value.sizeBytes < 0 ||
    typeof value.originalHash !== 'string' ||
    typeof value.immutable !== 'boolean' ||
    (value.description !== null &&
      value.description !== undefined &&
      typeof value.description !== 'string') ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }
  return {
    id: value.id,
    resourceType: value.resourceType,
    resourceId: value.resourceId,
    fileName: value.fileName,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    originalHash: value.originalHash,
    immutable: value.immutable,
    description:
      typeof value.description === 'string' ? value.description : null,
    createdAt: value.createdAt,
  };
}

export type PublicLandLookupMode = 'applicationCode' | 'parcelCode';

export type PublicLandLookup = {
  applicationCode: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function buildPublicLandLookupQuery(
  mode: PublicLandLookupMode,
  code: string,
): string | null {
  const trimmed = code.trim();
  if (!trimmed || (mode !== 'applicationCode' && mode !== 'parcelCode')) {
    return null;
  }
  const params = new URLSearchParams();
  params.set(mode, trimmed);
  return `${LAND_PUBLIC_LOOKUP_URL}?${params.toString()}`;
}

function readPublicLandLookup(value: unknown): PublicLandLookup | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.applicationCode !== 'string' ||
    typeof value.parcelCode !== 'string' ||
    typeof value.mapSheetNumber !== 'string' ||
    typeof value.parcelNumber !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.submittedAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    (value.completedAt !== null && typeof value.completedAt !== 'string')
  ) {
    return null;
  }
  return {
    applicationCode: value.applicationCode,
    parcelCode: value.parcelCode,
    mapSheetNumber: value.mapSheetNumber,
    parcelNumber: value.parcelNumber,
    status: value.status,
    submittedAt: value.submittedAt,
    updatedAt: value.updatedAt,
    completedAt: value.completedAt,
  };
}

export async function fetchPublicLandLookup(
  mode: PublicLandLookupMode,
  code: string,
): Promise<{
  status: number;
  lookup: PublicLandLookup | null;
  simulated: boolean;
  error: LandApiError | null;
}> {
  const url = buildPublicLandLookupQuery(mode, code);
  if (!url) {
    return {
      status: 400,
      lookup: null,
      simulated: false,
      error: { status: 400, code: 'LAND_LOOKUP_QUERY_INVALID' },
    };
  }
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body)) {
      return {
        status,
        lookup: null,
        simulated: false,
        error: { status, code: readErrorCode(body) },
      };
    }
    const lookup = readPublicLandLookup(body.lookup);
    if (body.simulated !== true || !lookup) {
      return {
        status,
        lookup: null,
        simulated: false,
        error: { status, code: readErrorCode(body) },
      };
    }
    return { status, lookup, simulated: true, error: null };
  } catch {
    return {
      status: 0,
      lookup: null,
      simulated: false,
      error: { status: null, code: null },
    };
  }
}

export async function fetchParcelList(query: string): Promise<{
  status: number;
  items: ParcelView[];
  nextCursor: string | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(`${LAND_PARCELS_URL}${query}`, {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !Array.isArray(body.items)) {
      return {
        status,
        items: [],
        nextCursor: null,
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      items: body.items as ParcelView[],
      nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
      error: null,
    };
  } catch {
    return {
      status: 0,
      items: [],
      nextCursor: null,
      error: { status: null, code: null },
    };
  }
}

export async function fetchPartyList(query: string): Promise<{
  status: number;
  items: PartyView[];
  nextCursor: string | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(`${LAND_PARTIES_URL}${query}`, {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !Array.isArray(body.items)) {
      return {
        status,
        items: [],
        nextCursor: null,
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      items: body.items as PartyView[],
      nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
      error: null,
    };
  } catch {
    return {
      status: 0,
      items: [],
      nextCursor: null,
      error: { status: null, code: null },
    };
  }
}

export async function fetchParcelDetail(parcelId: string): Promise<{
  status: number;
  detail: {
    parcel: ParcelView;
    rights: RightView[];
    encumbrances: EncumbranceView[];
  } | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(parcelDetailUrl(parcelId), {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !isRecord(body.parcel)) {
      return {
        status,
        detail: null,
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      detail: {
        parcel: body.parcel as ParcelView,
        rights: Array.isArray(body.rights) ? (body.rights as RightView[]) : [],
        encumbrances: Array.isArray(body.encumbrances)
          ? (body.encumbrances as EncumbranceView[])
          : [],
      },
      error: null,
    };
  } catch {
    return { status: 0, detail: null, error: { status: null, code: null } };
  }
}

export async function fetchEvidence(
  resourceType: EvidenceResourceType,
  resourceId: string,
): Promise<{
  status: number;
  evidence: EvidenceView[];
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(evidenceUrl(resourceType, resourceId), {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !Array.isArray(body.evidence)) {
      return {
        status,
        evidence: [],
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      evidence: body.evidence.flatMap((item) => {
        const projection = readEvidence(item);
        return projection ? [projection] : [];
      }),
      error: null,
    };
  } catch {
    return { status: 0, evidence: [], error: { status: null, code: null } };
  }
}

export async function postEvidence(
  resourceType: EvidenceResourceType,
  resourceId: string,
  file: File,
  description?: string | null,
): Promise<{
  status: number;
  evidence: EvidenceView | null;
  error: LandApiError | null;
}> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (description?.trim()) form.append('description', description.trim());
    const response = await fetch(evidenceUrl(resourceType, resourceId), {
      method: 'POST',
      body: form,
    });
    const { status, body } = await readJson(response);
    const evidence = isRecord(body) ? readEvidence(body.evidence) : null;
    if (!response.ok || !evidence) {
      return {
        status,
        evidence: null,
        error: { status, code: readErrorCode(body) },
      };
    }
    return { status, evidence, error: null };
  } catch {
    return { status: 0, evidence: null, error: { status: null, code: null } };
  }
}

export function applicationDetailUrl(applicationId: string): string {
  return `/api/land/applications/${encodeURIComponent(applicationId)}`;
}

// LND-09: GET list applications theo contract đã lock
// (items ApplicationSummary, nextCursor). Không lộ changePayload.
export async function fetchApplicationList(query: string): Promise<{
  status: number;
  items: ApplicationSummaryView[];
  nextCursor: string | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(`${LAND_APPLICATIONS_URL}${query}`, {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !Array.isArray(body.items)) {
      return {
        status,
        items: [],
        nextCursor: null,
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      items: body.items as ApplicationSummaryView[],
      nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
      error: null,
    };
  } catch {
    return {
      status: 0,
      items: [],
      nextCursor: null,
      error: { status: null, code: null },
    };
  }
}

// LND-09: POST create application với Idempotency-Key đã tạo ở form.
// 201 là tạo mới, 200 là replay cùng key+cùng payload; cả hai đều success.
export async function createLandApplication(input: {
  changeType: string;
  changePayload: Record<string, unknown>;
  parties: Array<{
    partyId?: string;
    newParty?: {
      referenceCode: string;
      partyType: 'individual' | 'organization';
      displayName: string;
      identityNumber: string | null;
    };
    partyRole: string;
    sharePercent: string | null;
  }>;
  parcels: Array<{ parcelId: string; parcelRole: string }>;
  idempotencyKey: string;
}): Promise<{
  status: number;
  application: {
    id: string;
    applicationCode: string;
    status: string;
  } | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(LAND_APPLICATIONS_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        changeType: input.changeType,
        changePayload: input.changePayload,
        parties: input.parties,
        parcels: input.parcels,
      }),
    });
    const { status, body } = await readJson(response);
    if (
      (status === 201 || status === 200) &&
      isRecord(body) &&
      isRecord(body.application)
    ) {
      const application = body.application as {
        id: unknown;
        applicationCode: unknown;
        status: unknown;
      };
      if (
        typeof application.id === 'string' &&
        typeof application.applicationCode === 'string' &&
        typeof application.status === 'string'
      ) {
        return {
          status,
          application: {
            id: application.id,
            applicationCode: application.applicationCode,
            status: application.status,
          },
          error: null,
        };
      }
    }
    return {
      status,
      application: null,
      error: { status, code: readErrorCode(body) },
    };
  } catch {
    return {
      status: 0,
      application: null,
      error: { status: null, code: null },
    };
  }
}

// LND-13: GET application detail projection theo contract đã lock
// (ApplicationDetail + links + changePayload cho scoped actor).
export function applicationTimelineUrl(applicationId: string): string {
  return `${applicationDetailUrl(applicationId)}/timeline`;
}

export async function fetchApplicationDetail(applicationId: string): Promise<{
  status: number;
  detail: ApplicationDetailView | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(applicationDetailUrl(applicationId), {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !isRecord(body.application)) {
      return {
        status,
        detail: null,
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      detail: body.application as ApplicationDetailView,
      error: null,
    };
  } catch {
    return { status: 0, detail: null, error: { status: null, code: null } };
  }
}

// LND-13: GET timeline events đã lock (occurredAt tăng dần ở server).
export async function fetchApplicationTimeline(applicationId: string): Promise<{
  status: number;
  events: TimelineEventView[];
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(applicationTimelineUrl(applicationId), {
      cache: 'no-store',
    });
    const { status, body } = await readJson(response);
    if (!response.ok || !isRecord(body) || !Array.isArray(body.events)) {
      return {
        status,
        events: [],
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      events: body.events as TimelineEventView[],
      error: null,
    };
  } catch {
    return { status: 0, events: [], error: { status: null, code: null } };
  }
}

export type ApplicationMutationTarget = {
  id: string;
  status: string;
  version: number;
};

export type SyncResultView = {
  status: string;
  failureCode: string | null;
  attempts: number;
} | null;

function readMutationApplication(
  body: unknown,
): ApplicationMutationTarget | null {
  if (!isRecord(body) || !isRecord(body.application)) return null;
  const application = body.application as {
    id: unknown;
    status: unknown;
    version: unknown;
  };
  if (
    typeof application.id !== 'string' ||
    typeof application.status !== 'string' ||
    typeof application.version !== 'number'
  ) {
    return null;
  }
  return {
    id: application.id,
    status: application.status,
    version: application.version,
  };
}

function readSyncResult(body: unknown): SyncResultView {
  if (!isRecord(body) || !isRecord(body.sync)) return null;
  const sync = body.sync as {
    status: unknown;
    failureCode: unknown;
    attempts: unknown;
  };
  if (typeof sync.status !== 'string') return null;
  return {
    status: sync.status,
    failureCode: typeof sync.failureCode === 'string' ? sync.failureCode : null,
    attempts: typeof sync.attempts === 'number' ? sync.attempts : 0,
  };
}

function readApprovalStatus(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.approval)) return null;
  const approval = body.approval as { status: unknown };
  return typeof approval.status === 'string' ? approval.status : null;
}

function versionHeaders(version: number): Record<string, string> {
  return {
    'content-type': 'application/json',
    'If-Match-Version': String(version),
  };
}

// LND-13: POST sync in_review -> pending_approval/sync_failed.
// Body luôn {}; fixture outcome do server/test config quyết định,
// client không gửi outcome mô phỏng. 502 LAND_SYNC_FAILED vẫn kèm
// application + sync (failureCode an toàn) để UI phản ánh đúng state.
export async function postApplicationSync(
  applicationId: string,
  version: number,
): Promise<{
  status: number;
  application: ApplicationMutationTarget | null;
  sync: SyncResultView;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(
      applicationDetailUrl(applicationId) + '/sync',
      {
        method: 'POST',
        headers: versionHeaders(version),
        body: JSON.stringify({}),
      },
    );
    const { status, body } = await readJson(response);
    if (!response.ok) {
      return {
        status,
        application: readMutationApplication(body),
        sync: readSyncResult(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    const application = readMutationApplication(body);
    if (!application) {
      return {
        status,
        application: null,
        sync: readSyncResult(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    return { status, application, sync: readSyncResult(body), error: null };
  } catch {
    return {
      status: 0,
      application: null,
      sync: null,
      error: { status: null, code: null },
    };
  }
}

// LND-13: POST sync retry sync_failed -> pending_approval/sync_failed.
// Cùng stable requestKey ở server; attempts tăng, không duplicate operation.
export async function postApplicationSyncRetry(
  applicationId: string,
  version: number,
): Promise<{
  status: number;
  application: ApplicationMutationTarget | null;
  sync: SyncResultView;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(
      applicationDetailUrl(applicationId) + '/sync/retry',
      {
        method: 'POST',
        headers: versionHeaders(version),
        body: JSON.stringify({}),
      },
    );
    const { status, body } = await readJson(response);
    if (!response.ok) {
      return {
        status,
        application: readMutationApplication(body),
        sync: readSyncResult(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    const application = readMutationApplication(body);
    if (!application) {
      return {
        status,
        application: null,
        sync: readSyncResult(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    return { status, application, sync: readSyncResult(body), error: null };
  } catch {
    return {
      status: 0,
      application: null,
      sync: null,
      error: { status: null, code: null },
    };
  }
}

// LND-13: POST approve pending_approval -> completed.
// Body {} hoặc { reason }; blank reason chuẩn hóa null ở server.
export async function postApplicationApprove(
  applicationId: string,
  version: number,
  reason: string | null,
): Promise<{
  status: number;
  application: ApplicationMutationTarget | null;
  approvalStatus: string | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(
      applicationDetailUrl(applicationId) + '/approve',
      {
        method: 'POST',
        headers: versionHeaders(version),
        body: JSON.stringify(reason ? { reason } : {}),
      },
    );
    const { status, body } = await readJson(response);
    if (!response.ok) {
      return {
        status,
        application: readMutationApplication(body),
        approvalStatus: readApprovalStatus(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    const application = readMutationApplication(body);
    if (!application) {
      return {
        status,
        application: null,
        approvalStatus: readApprovalStatus(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      application,
      approvalStatus: readApprovalStatus(body),
      error: null,
    };
  } catch {
    return {
      status: 0,
      application: null,
      approvalStatus: null,
      error: { status: null, code: null },
    };
  }
}

// LND-13: POST reject -> rejected. Reason bắt buộc trimmed non-empty;
// client validate trước, server trả 400 nếu blank mà không đổi state.
export async function postApplicationReject(
  applicationId: string,
  version: number,
  reason: string,
): Promise<{
  status: number;
  application: ApplicationMutationTarget | null;
  approvalStatus: string | null;
  error: LandApiError | null;
}> {
  try {
    const response = await fetch(
      applicationDetailUrl(applicationId) + '/reject',
      {
        method: 'POST',
        headers: versionHeaders(version),
        body: JSON.stringify({ reason: reason.trim() }),
      },
    );
    const { status, body } = await readJson(response);
    if (!response.ok) {
      return {
        status,
        application: readMutationApplication(body),
        approvalStatus: readApprovalStatus(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    const application = readMutationApplication(body);
    if (!application) {
      return {
        status,
        application: null,
        approvalStatus: readApprovalStatus(body),
        error: { status, code: readErrorCode(body) },
      };
    }
    return {
      status,
      application,
      approvalStatus: readApprovalStatus(body),
      error: null,
    };
  } catch {
    return {
      status: 0,
      application: null,
      approvalStatus: null,
      error: { status: null, code: null },
    };
  }
}
