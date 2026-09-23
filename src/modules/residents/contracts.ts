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
  const rule = slaRuleForPurpose(
    purpose,
    purpose === 'reintegration' ? 'checkup' : 'registration',
  );
  return new Date(from.getTime() + rule.durationMs);
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
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
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
  if (message === 'STALE_RECORD') {
    return { status: 409, message, code: message };
  }
  return { status: 400, message, code: message };
}
