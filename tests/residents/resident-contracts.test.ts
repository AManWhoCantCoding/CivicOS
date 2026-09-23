import { describe, expect, it } from 'vitest';

import {
  RESIDENT_FOLLOWUP_TASK,
  RESIDENT_SUBJECT_TYPES,
  isResidentSubjectType,
  maskDisplayName,
  nextCheckForPurpose,
  reportPeriod,
  slaBadge,
  slaRuleForPurpose,
  toApiError,
} from '@/modules/residents/contracts';

describe('resident contracts seam', () => {
  it('exposes exactly the three managed resident types', () => {
    expect([...RESIDENT_SUBJECT_TYPES].sort()).toEqual(
      ['temporary_resident', 'foreign_resident', 'reintegration'].sort(),
    );
  });

  it('rejects place names as subject types', () => {
    expect(isResidentSubjectType('nghia_tru')).toBe(false);
    expect(isResidentSubjectType('temporary_resident')).toBe(true);
  });

  it('requires registration within 24h for every purpose', () => {
    for (const purpose of RESIDENT_SUBJECT_TYPES) {
      expect(slaRuleForPurpose(purpose, 'registration').durationMs).toBe(
        24 * 60 * 60 * 1000,
      );
    }
  });

  it('requires a monthly checkup for reintegration records', () => {
    expect(slaRuleForPurpose('reintegration', 'checkup').durationMs).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
  });

  it('requires same-day reporting for foreign residents', () => {
    expect(slaRuleForPurpose('foreign_resident', 'same_day').durationMs).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it('advances nextCheck from the activity time', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    expect(nextCheckForPurpose('reintegration', from).toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('masks display names without leaking the full value', () => {
    const masked = maskDisplayName('Nguyen Van Tam');
    expect(masked).not.toContain('Nguyen Van Tam');
    expect(masked.startsWith('N')).toBe(true);
  });

  it('flags overdue records past nextCheck', () => {
    expect(
      slaBadge(
        new Date('2026-09-10T00:00:00.000Z'),
        new Date('2026-09-01T00:00:00.000Z'),
      ),
    ).toBe('overdue');
    expect(
      slaBadge(
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-10T00:00:00.000Z'),
      ),
    ).toBe('on_time');
    expect(slaBadge(new Date(), null)).toBe('unknown');
  });

  it('keys monthly reports by calendar period', () => {
    expect(reportPeriod(new Date('2026-09-23T00:00:00.000Z'))).toBe('2026-09');
  });

  it('maps domain errors to HTTP statuses', () => {
    expect(toApiError(new Error('FORBIDDEN')).status).toBe(403);
    expect(toApiError(new Error('RECORD_NOT_FOUND')).status).toBe(404);
    expect(toApiError(new Error('STALE_RECORD')).status).toBe(409);
    expect(toApiError(new Error('CONTENT_REQUIRED')).status).toBe(400);
  });

  it('uses a dedicated followup task for resident assignments', () => {
    expect(RESIDENT_FOLLOWUP_TASK).toBe('resident_followup');
  });
});
