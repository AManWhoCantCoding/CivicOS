import { describe, expect, it } from 'vitest';

import {
  RESIDENT_FOLLOWUP_TASK,
  RESIDENT_SUBJECT_TYPES,
  isResidentSubjectType,
  maskDisplayName,
  nextCheckForPurpose,
  nextCheckAfterActivityForPurpose,
  reportPeriod,
  slaBadge,
  slaRuleForPurpose,
  toApiError,
} from '@/modules/residents/contracts';
import { createManagementRecord } from '@/modules/residents/commands';

describe('resident contracts seam', () => {
  it.each([undefined, 'not-a-date'])(
    'rejects invalid foreign arrivalAt %s',
    async (arrivalAt) => {
      await expect(
        createManagementRecord(
          { subjectId: 'not-used', purpose: 'foreign_resident', arrivalAt },
          {
            id: 'officer',
            email: 'officer@example.test',
            name: 'Officer',
            roles: ['duty_officer'],
            organizationUnitId: 'unit',
          },
        ),
      ).rejects.toThrow('INVALID_ARRIVAL_AT');
    },
  );
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

  it.each([
    ['month end', '2026-09-30T16:00:00.000Z', '2026-10-31T17:00:00.000Z'],
    [
      'year rollover in a short month',
      '2026-12-31T16:00:00.000Z',
      '2027-01-31T17:00:00.000Z',
    ],
  ])(
    'sets an activity deadline at the end of the following local month (%s)',
    (_label, occurredAt, expected) => {
      expect(
        nextCheckAfterActivityForPurpose(
          'reintegration',
          new Date(occurredAt),
        ).toISOString(),
      ).toBe(expected);
    },
  );

  it.each([
    [
      'Vietnam-local month boundary',
      '2026-09-30T16:59:59.000Z',
      '2026-09-30T17:00:00.000Z',
      '2026-09',
      '2026-10',
      '2026-10-31T17:00:00.000Z',
    ],
    [
      'year rollover',
      '2026-12-31T16:59:59.000Z',
      '2026-12-31T17:00:00.000Z',
      '2026-12',
      '2027-01',
      '2027-01-31T17:00:00.000Z',
    ],
    [
      'short month boundary',
      '2026-02-28T16:59:59.000Z',
      '2026-02-28T17:00:00.000Z',
      '2026-02',
      '2026-03',
      '2026-03-31T17:00:00.000Z',
    ],
  ])(
    'uses Vietnam-local calendar months for %s',
    (_label, before, after, beforePeriod, afterPeriod, expected) => {
      expect(reportPeriod(new Date(before))).toBe(beforePeriod);
      expect(reportPeriod(new Date(after))).toBe(afterPeriod);
      expect(
        nextCheckForPurpose('reintegration', new Date(after)).toISOString(),
      ).toBe(expected);
    },
  );

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
