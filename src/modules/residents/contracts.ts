import type { IdentityUser } from '@/modules/identity';

export type ResidentSubjectType =
  'temporary_resident' | 'foreign_resident' | 'reintegration';

export type ResidentActor = IdentityUser;

export const RESIDENT_SUBJECT_TYPES: readonly ResidentSubjectType[] = [
  'temporary_resident',
  'foreign_resident',
  'reintegration',
];

export const RESIDENT_FOLLOWUP_TASK = 'resident_followup';

export const RESIDENT_EVENTS: readonly string[] = [
  'SubjectRegistered',
  'SubjectManagementRecordCreated',
  'SubjectAssigned',
  'SubjectActivityRecorded',
  'SubjectRiskRaised',
  'SubjectTransferred',
  'PeriodicReportGenerated',
  'PeriodicReportApproved',
];

export type ResidentSlaKind = 'registration' | 'checkup' | 'same_day';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isResidentSubjectType(
  value: unknown,
): value is ResidentSubjectType {
  return (RESIDENT_SUBJECT_TYPES as readonly string[]).includes(
    value as string,
  );
}

export function slaRuleForPurpose(
  purpose: ResidentSubjectType,
  kind: ResidentSlaKind,
): { kind: string; durationMs: number } {
  if (kind === 'checkup' && purpose === 'reintegration') {
    return { kind: 'resident_monthly_checkup', durationMs: 30 * DAY_MS };
  }
  if (kind === 'same_day' && purpose === 'foreign_resident') {
    return { kind: 'foreign_same_day_report', durationMs: DAY_MS };
  }
  return { kind: 'resident_registration_24h', durationMs: DAY_MS };
}

export function nextCheckForPurpose(
  purpose: ResidentSubjectType,
  from: Date,
): Date {
  return nextCheck(purpose, from, 0);
}

export function nextCheckAfterActivityForPurpose(
  purpose: ResidentSubjectType,
  occurredAt: Date,
): Date {
  return nextCheck(purpose, occurredAt, 1);
}

function nextCheck(
  purpose: ResidentSubjectType,
  from: Date,
  monthsAfterCurrent: number,
): Date {
  const rule = slaRuleForPurpose(
    purpose,
    purpose === 'reintegration' ? 'checkup' : 'registration',
  );
  if (purpose !== 'reintegration')
    return new Date(from.getTime() + rule.durationMs);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(from);
  const year = Number(parts.find((part) => part.type === 'year')!.value);
  const month = Number(parts.find((part) => part.type === 'month')!.value);
  return new Date(
    Date.UTC(year, month + monthsAfterCurrent, 1) - 7 * 60 * 60 * 1000,
  );
}

export function maskDisplayName(name: string): string {
  if (!name) return '***';
  return `${name.slice(0, 1)}***`;
}

export function slaBadge(
  now: Date,
  nextCheckAt: Date | string | null,
): 'overdue' | 'due_soon' | 'on_time' | 'unknown' {
  if (!nextCheckAt) return 'unknown';
  const due = new Date(nextCheckAt).getTime();
  if (Number.isNaN(due)) return 'unknown';
  if (now.getTime() >= due) return 'overdue';
  if (due - now.getTime() <= 2 * DAY_MS) return 'due_soon';
  return 'on_time';
}

export function reportPeriod(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`;
}

export function toApiError(error: unknown): {
  status: number;
  message: string;
  code: string;
} {
  const message = error instanceof Error ? error.message : 'RESIDENT_FAILED';
  if (message === 'FORBIDDEN') {
    return { status: 403, message, code: 'FORBIDDEN' };
  }
  if (message === 'UNAUTHENTICATED') {
    return { status: 401, message, code: 'UNAUTHENTICATED' };
  }
  if (message.includes('NOT_FOUND')) {
    return { status: 404, message, code: message };
  }
  if (message === 'STALE_RECORD' || message === 'IDEMPOTENCY_CONFLICT') {
    return { status: 409, message, code: message };
  }
  return { status: 400, message, code: message };
}
