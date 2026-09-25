import { assertEstablishmentRisk, isInspectionResult } from './domain';

export type EstablishmentInput = {
  name: string;
  ownerName: string;
  address: string;
  type: string;
  licenseRef?: string;
  latitude?: number;
  longitude?: number;
  risk?: 'low' | 'medium' | 'high';
  status?: 'active' | 'archived';
};

export type ScheduleInput = {
  establishmentId: string;
  assignedUserId?: string;
  scheduledAt: string;
  cadenceMonths: number;
};

export type InspectionCommandInput =
  | { command: 'start' }
  | {
      command: 'save_checklist';
      responses: Array<{ key: string; value: string }>;
    }
  | { command: 'complete'; result: string }
  | {
      command: 'finding';
      checklistKey: string;
      description: string;
      result: string;
      evidenceIds: string[];
      severity?: string;
      category?: string;
    }
  | {
      command: 'recommend' | 'submit_recommendation';
      findingIds: string[];
      action: string;
      reason: string;
    }
  | { command: 'approve'; recommendationId: string }
  | { command: 'reject'; recommendationId: string; reason: string }
  | { command: 'transfer'; recommendationId: string; organizationId: string };

export type ApiError = {
  code: string;
  message: string;
  status: number;
};

export type ScheduleRow = {
  id: string;
  scheduledAt: string;
  status: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalTrimmed(value: unknown): string | undefined {
  const text = trimmed(value);
  return text ? text : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export function parseEstablishmentInput(value: unknown): EstablishmentInput {
  const input = asRecord(value);
  const name = trimmed(input.name);
  const ownerName = trimmed(input.ownerName);
  const address = trimmed(input.address);
  const type = trimmed(input.type);
  if (!name || !ownerName || !address || !type) {
    throw new Error('ESTABLISHMENT_FIELDS_REQUIRED');
  }
  const hasLatitude =
    input.latitude !== undefined && String(input.latitude).trim() !== '';
  const hasLongitude =
    input.longitude !== undefined && String(input.longitude).trim() !== '';
  if (hasLatitude !== hasLongitude) throw new Error('GEOPOINT_INCOMPLETE');
  const latitude = hasLatitude ? toNumber(input.latitude) : undefined;
  const longitude = hasLongitude ? toNumber(input.longitude) : undefined;
  if (hasLatitude && (latitude === undefined || longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  const riskValue = optionalTrimmed(input.risk) ?? 'medium';
  assertEstablishmentRisk(riskValue);
  const risk =
    riskValue === 'low' || riskValue === 'medium' || riskValue === 'high'
      ? riskValue
      : undefined;
  if (!risk) throw new Error('INVALID_ESTABLISHMENT_RISK');
  const status = optionalTrimmed(input.status) ?? 'active';
  if (status !== 'active' && status !== 'archived')
    throw new Error('INVALID_ESTABLISHMENT_STATUS');
  return {
    name,
    ownerName,
    address,
    type,
    ...(optionalTrimmed(input.licenseRef) !== undefined
      ? { licenseRef: optionalTrimmed(input.licenseRef) as string }
      : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    risk,
    status,
  };
}

export function parseScheduleInput(value: unknown): ScheduleInput {
  const input = asRecord(value);
  const establishmentId = trimmed(input.establishmentId);
  if (!establishmentId) throw new Error('ESTABLISHMENT_NOT_FOUND');
  const scheduledAt = new Date(trimmed(input.scheduledAt));
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('INVALID_SCHEDULE');
  const cadenceMonths =
    input.cadenceMonths === undefined ? 6 : toNumber(input.cadenceMonths);
  if (
    cadenceMonths === undefined ||
    !Number.isInteger(cadenceMonths) ||
    cadenceMonths < 1 ||
    cadenceMonths > 6
  ) {
    throw new Error('INVALID_INSPECTION_CADENCE');
  }
  const assignedUserId = optionalTrimmed(input.assignedUserId);
  return {
    establishmentId,
    scheduledAt: scheduledAt.toISOString(),
    cadenceMonths,
    ...(assignedUserId ? { assignedUserId } : {}),
  };
}

export function parseInspectionCommand(value: unknown): InspectionCommandInput {
  const input = asRecord(value);
  const command = trimmed(input.command);
  if (command === 'start') return { command: 'start' };
  if (command === 'save_checklist') {
    const raw = asRecord(input).responses;
    const responses = Array.isArray(raw)
      ? raw.map((entry) => {
          const response = asRecord(entry);
          return {
            key: String(response.key ?? ''),
            value: String(response.value ?? ''),
          };
        })
      : [];
    return { command: 'save_checklist', responses };
  }
  if (command === 'complete') {
    const result = trimmed(input.result);
    if (!isInspectionResult(result))
      throw new Error('INVALID_INSPECTION_RESULT');
    return { command: 'complete', result };
  }
  if (command === 'finding') {
    const checklistKey = trimmed(input.checklistKey);
    const description = trimmed(input.description);
    const result = trimmed(input.result);
    if (!checklistKey || !description)
      throw new Error('FINDING_FIELDS_REQUIRED');
    if (!isInspectionResult(result)) throw new Error('INVALID_FINDING_RESULT');
    return {
      command: 'finding',
      checklistKey,
      description,
      result,
      evidenceIds: stringList(input.evidenceIds),
      ...(optionalTrimmed(input.severity)
        ? { severity: optionalTrimmed(input.severity) }
        : {}),
      ...(optionalTrimmed(input.category)
        ? { category: optionalTrimmed(input.category) }
        : {}),
    };
  }
  if (command === 'recommend' || command === 'submit_recommendation') {
    const findingIds = stringList(input.findingIds);
    const action = trimmed(input.action);
    const reason = trimmed(input.reason);
    if (!findingIds.length || !action || !reason) {
      throw new Error('RECOMMENDATION_FIELDS_REQUIRED');
    }
    return {
      command: command === 'submit_recommendation' ? command : 'recommend',
      findingIds,
      action,
      reason,
    };
  }
  if (command === 'approve') {
    const recommendationId = trimmed(input.recommendationId);
    if (!recommendationId) throw new Error('RECOMMENDATION_NOT_FOUND');
    return { command: 'approve', recommendationId };
  }
  if (command === 'reject') {
    const recommendationId = trimmed(input.recommendationId);
    const reason = trimmed(input.reason);
    if (!recommendationId) throw new Error('RECOMMENDATION_NOT_FOUND');
    if (!reason) throw new Error('REJECTION_REASON_REQUIRED');
    return { command: 'reject', recommendationId, reason };
  }
  if (command === 'transfer') {
    const recommendationId = trimmed(input.recommendationId);
    const organizationId = trimmed(input.organizationId);
    if (!recommendationId || !organizationId)
      throw new Error('TRANSFER_TARGET_REQUIRED');
    return { command: 'transfer', recommendationId, organizationId };
  }
  throw new Error('UNKNOWN_COMMAND');
}

export function parseEstablishmentPatch(
  value: unknown,
): Record<string, unknown> {
  const input = asRecord(value);
  const patch: Record<string, unknown> = {};
  for (const key of ['name', 'ownerName', 'address', 'type'] as const) {
    if (input[key] !== undefined) {
      const text = trimmed(input[key]);
      if (!text) throw new Error('ESTABLISHMENT_FIELDS_REQUIRED');
      patch[key] = text;
    }
  }
  if (input.licenseRef !== undefined) {
    patch.licenseRef = trimmed(input.licenseRef);
  }
  if (input.risk !== undefined) {
    const risk = trimmed(input.risk);
    assertEstablishmentRisk(risk);
    patch.risk = risk;
  }
  if (input.status !== undefined) {
    const status = trimmed(input.status);
    if (status !== 'active' && status !== 'archived')
      throw new Error('INVALID_ESTABLISHMENT_STATUS');
    patch.status = status;
  }
  const hasLatitude =
    input.latitude !== undefined && String(input.latitude).trim() !== '';
  const hasLongitude =
    input.longitude !== undefined && String(input.longitude).trim() !== '';
  if (hasLatitude !== hasLongitude) throw new Error('GEOPOINT_INCOMPLETE');
  if (hasLatitude) {
    const latitude = toNumber(input.latitude);
    const longitude = toNumber(input.longitude);
    if (latitude === undefined || longitude === undefined) {
      throw new Error('GEOPOINT_INCOMPLETE');
    }
    patch.latitude = latitude;
    patch.longitude = longitude;
  }
  return patch;
}

export function toApiError(error: unknown): ApiError {
  const message =
    error instanceof Error ? error.message : 'INSPECTION_COMMAND_FAILED';
  const code = message.includes(':') ? message.split(':')[0] : message;
  if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') {
    return {
      code,
      message,
      status: code === 'FORBIDDEN' ? 403 : 401,
    };
  }
  if (
    code.includes('NOT_FOUND') ||
    code === 'CHECKLIST_TEMPLATE_NOT_FOUND' ||
    code === 'EVIDENCE_NOT_FOUND' ||
    code === 'FINDING_NOT_FOUND' ||
    code === 'RECOMMENDATION_NOT_FOUND'
  ) {
    return { code, message, status: 404 };
  }
  if (
    code.startsWith('DUPLICATE_') ||
    code === 'CLIENT_COMMAND_ID_CONFLICT' ||
    code === 'STALE_OFFLINE_COMMAND' ||
    code === 'OFFLINE_COMMAND_NOT_PENDING' ||
    code === 'OFFLINE_COMMAND_NOT_SYNCING' ||
    code === 'RECOMMENDATION_ALREADY_DECIDED' ||
    code === 'RECOMMENDATION_RESOURCE_MISMATCH' ||
    code === 'RECOMMENDATION_REQUIRED' ||
    code === 'RECOMMENDATION_PENDING_APPROVAL' ||
    code === 'RECOMMENDATION_REJECTED'
  ) {
    return { code, message, status: 409 };
  }
  return { code, message, status: 400 };
}

export function selectDueInspections<T extends ScheduleRow>(
  rows: T[],
  now: Date = new Date(),
): Array<T & { scheduleState: 'overdue' }> {
  return rows
    .filter(
      (row) =>
        row.status === 'scheduled' &&
        !Number.isNaN(new Date(row.scheduledAt).getTime()) &&
        new Date(row.scheduledAt).getTime() <= now.getTime(),
    )
    .map((row) => ({ ...row, scheduleState: 'overdue' as const }));
}
