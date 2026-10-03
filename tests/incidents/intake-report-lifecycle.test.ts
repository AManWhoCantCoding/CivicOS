import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EVENT_CATALOG } from '@/modules/eventing';
import { encryptSensitive } from '@/modules/identity';
import * as incidentsDomain from '@/modules/incidents/domain';
import * as incidentsEntry from '@/modules/incidents/index';
import {
  INTAKE_DOMAIN_EVENTS,
  INTAKE_SLA,
  INTAKE_SOURCE_CHANNELS,
  MASKED_IDENTITY,
  assertIntakeTransition,
  isIntakeStatus,
  normalizeSourceChannel,
} from '@/modules/incidents/domain';
import {
  intakeSlaSummary,
  maskIntakeReport,
} from '@/modules/incidents/commands';
import { MockIntakeResultNotificationAdapter } from '@/modules/incidents/notification-adapter';
import { dueAt } from '@/modules/platform';
import {
  parseIncident,
  parseIntakeClassification,
  parseIntakeReport,
} from '@/modules/incidents/schemas';

const validIntake = (overrides: Record<string, unknown> = {}) => ({
  sourceChannel: 'direct',
  receivedAt: new Date('2026-09-24T08:00:00.000Z').toISOString(),
  content: 'Tin bao kiem thu lifecycle',
  ...overrides,
});

describe('IntakeReport channel seam', () => {
  it.each(INTAKE_SOURCE_CHANNELS)(
    'accepts canonical channel %s',
    (sourceChannel) => {
      expect(
        parseIntakeReport(validIntake({ sourceChannel })).sourceChannel,
      ).toBe(sourceChannel);
    },
  );

  it('maps legacy in_person to direct at the boundary', () => {
    expect(
      parseIntakeReport(
        validIntake({ sourceChannel: undefined, channel: 'in_person' }),
      ).sourceChannel,
    ).toBe('direct');
  });

  it('maps legacy telephone to phone at the boundary', () => {
    expect(
      parseIntakeReport(
        validIntake({ sourceChannel: undefined, channel: 'telephone' }),
      ).sourceChannel,
    ).toBe('phone');
  });

  it('normalizes legacy channel names at the boundary', () => {
    expect(normalizeSourceChannel('in_person')).toBe('direct');
    expect(normalizeSourceChannel('telephone')).toBe('phone');
  });

  it('rejects unknown channels in canonical and legacy inputs', () => {
    expect(() =>
      parseIntakeReport(validIntake({ sourceChannel: 'sms' })),
    ).toThrow('INVALID_CHANNEL');
    expect(() =>
      parseIntakeReport(
        validIntake({ sourceChannel: undefined, channel: 'sms' }),
      ),
    ).toThrow('INVALID_CHANNEL');
  });

  it('rejects manual_other in every channel input', () => {
    expect(() =>
      parseIntakeReport(validIntake({ sourceChannel: 'manual_other' })),
    ).toThrow('INVALID_CHANNEL');
    expect(() =>
      parseIntakeReport(
        validIntake({ sourceChannel: undefined, channel: 'manual_other' }),
      ),
    ).toThrow('INVALID_CHANNEL');
    expect(() => normalizeSourceChannel('manual_other')).toThrow(
      'INVALID_CHANNEL',
    );
  });

  it('rejects missing content', () => {
    expect(() =>
      parseIntakeReport(validIntake({ content: undefined })),
    ).toThrow('INVALID_INTAKE');
  });

  it('rejects half geopoints', () => {
    expect(() => parseIntakeReport(validIntake({ latitude: 21.0 }))).toThrow(
      'GEOPOINT_INCOMPLETE',
    );
  });

  it('rejects non-numeric locations', () => {
    expect(() =>
      parseIntakeReport(validIntake({ latitude: 'north', longitude: 106.0 })),
    ).toThrow('INVALID_LOCATION');
  });

  it('accepts a sufficient classification with a note', () => {
    expect(
      parseIntakeClassification({
        classification: 'sufficient',
        verificationNote: 'Da xuong hien truong.',
      }),
    ).toMatchObject({ classification: 'sufficient' });
  });

  it('rejects verification without a classification', () => {
    expect(() => parseIntakeClassification({})).toThrow(
      'CLASSIFICATION_REQUIRED',
    );
  });

  it('rejects unknown classifications', () => {
    expect(() =>
      parseIntakeClassification({ classification: 'random' }),
    ).toThrow('INVALID_CLASSIFICATION');
  });
});

describe('IntakeReport transition seam', () => {
  it.each([
    ['RECEIVED', 'VERIFIED'],
    ['RECEIVED', 'REJECTED'],
    ['VERIFIED', 'PROCESSED'],
    ['VERIFIED', 'REJECTED'],
    ['PROCESSED', 'CLOSED'],
  ] as Array<[string, string]>)(
    'allows transition %s to %s',
    (current, next) => {
      expect(() =>
        assertIntakeTransition(current as never, next as never),
      ).not.toThrow();
    },
  );

  it('rejects every non-listed transition pair', () => {
    const valid: Record<string, string[]> = {
      RECEIVED: ['VERIFIED', 'REJECTED'],
      VERIFIED: ['PROCESSED', 'REJECTED'],
      PROCESSED: ['CLOSED'],
      CLOSED: [],
      REJECTED: [],
    };
    for (const current of Object.keys(valid)) {
      for (const next of Object.keys(valid)) {
        if (current === next) continue;
        if (valid[current].includes(next)) continue;
        expect(() =>
          assertIntakeTransition(current as never, next as never),
        ).toThrow('INVALID_INTAKE_TRANSITION');
      }
    }
  });

  it('matches intake statuses case-sensitively', () => {
    expect(isIntakeStatus('RECEIVED')).toBe(true);
    expect(isIntakeStatus('received')).toBe(false);
  });

  it('keeps intake statuses apart from incident statuses', () => {
    expect(isIntakeStatus('VERIFIED')).toBe(true);
    expect(isIntakeStatus('verifying')).toBe(false);
  });
});

describe('IntakeReport event and SLA contract seam', () => {
  it('declares the seven intake lifecycle events', () => {
    expect(Object.keys(INTAKE_DOMAIN_EVENTS).sort()).toEqual(
      [
        'IntakeReportClosed',
        'IntakeReportConvertedToIncident',
        'IntakeReportProcessed',
        'IntakeReportReceived',
        'IntakeReportRejected',
        'IntakeReportTransferred',
        'IntakeReportVerified',
      ].sort(),
    );
  });

  it('registers all seven intake events in the event catalog', () => {
    const catalogued = EVENT_CATALOG.filter(
      (entry) => entry.aggregateType === 'IntakeReport',
    );
    expect(catalogued.map((entry) => entry.eventType).sort()).toEqual(
      [
        'IntakeReportClosed',
        'IntakeReportConvertedToIncident',
        'IntakeReportProcessed',
        'IntakeReportReceived',
        'IntakeReportRejected',
        'IntakeReportTransferred',
        'IntakeReportVerified',
      ].sort(),
    );
    for (const entry of catalogued) {
      expect(entry.eventVersion).toBe(1);
      expect(entry.owningModule).toBe('incidents');
    }
  });

  it('runs the recording deadline on a continuous clock', () => {
    expect(INTAKE_SLA.recording.kind).toBe('intake_recording_24h');
    const receivedAt = new Date('2026-09-24T08:00:00.000Z');
    expect(dueAt(receivedAt, INTAKE_SLA.recording).toISOString()).toBe(
      '2026-09-25T08:00:00.000Z',
    );
  });

  it('runs the verification deadline on a continuous clock', () => {
    expect(INTAKE_SLA.verification.kind).toBe('intake_verification_48h');
    const receivedAt = new Date('2026-09-24T08:00:00.000Z');
    expect(dueAt(receivedAt, INTAKE_SLA.verification).toISOString()).toBe(
      '2026-09-26T08:00:00.000Z',
    );
  });

  it('runs the result notification deadline on a continuous clock', () => {
    expect(INTAKE_SLA.result.kind).toBe('intake_result_notification_20d');
    const receivedAt = new Date('2026-09-24T08:00:00.000Z');
    expect(dueAt(receivedAt, INTAKE_SLA.result).toISOString()).toBe(
      '2026-10-14T08:00:00.000Z',
    );
  });

  it('flags overdue only after the result deadline', () => {
    const receivedAt = new Date('2026-09-24T08:00:00.000Z');
    const summary = intakeSlaSummary(
      receivedAt,
      new Date('2026-09-24T09:00:00.000Z'),
    );
    expect(summary.overdue).toBe(false);
    expect(
      intakeSlaSummary(receivedAt, new Date('2026-10-15T00:00:00.000Z'))
        .overdue,
    ).toBe(true);
  });

  it('keeps completed SLA items from becoming overdue after their deadline', () => {
    const receivedAt = new Date('2026-09-24T08:00:00.000Z');
    const now = new Date('2026-10-15T00:00:00.000Z');
    expect(
      intakeSlaSummary(receivedAt, now, {
        recording: true,
        verification: true,
        notification: true,
      }),
    ).toMatchObject({ overdue: false, warning: false });
  });

  it('keeps all SLA deadlines anchored to receivedAt when processing is late', () => {
    const receivedAt = new Date('2026-09-24T08:00:00.000Z');
    const late = new Date('2026-09-28T08:00:00.000Z');
    expect(intakeSlaSummary(receivedAt, late)).toMatchObject({
      recordingDueAt: '2026-09-25T08:00:00.000Z',
      verificationDueAt: '2026-09-26T08:00:00.000Z',
      notificationDueAt: '2026-10-14T08:00:00.000Z',
      overdue: true,
    });
  });
});

describe('Intake result notification adapter contract', () => {
  it('dispatches and retries masked payloads at the requested availability time', () => {
    const adapter = new MockIntakeResultNotificationAdapter();
    const availableAt = new Date('2026-10-14T08:00:00.000Z');
    const input = {
      reportId: 'report-1',
      recipientId: 'recipient-1',
      body: 'Kết quả xử lý tin báo report-1',
      availableAt,
    };
    expect(adapter.dispatch(input)).toMatchObject({ attempt: 1, availableAt });
    expect(adapter.retry(input)).toMatchObject({ attempt: 2, availableAt });
    expect(adapter.attempts).toHaveLength(2);
    expect(JSON.stringify(adapter.attempts)).not.toContain('Nguyen Van A');
    expect(JSON.stringify(adapter.attempts)).not.toContain('0900000001');
    expect(JSON.stringify(adapter.attempts)).not.toContain('REF-001');
  });
});

describe('IntakeReport secrecy seam', () => {
  const row = (
    overrides: Record<string, unknown> = {},
  ): Parameters<typeof maskIntakeReport>[0] => ({
    id: 'report-1',
    channel: null,
    sourceChannel: 'direct',
    status: 'RECEIVED',
    receivedAt: new Date('2026-09-24T08:00:00.000Z'),
    content: 'Tin bao kiem thu',
    sourceName: encryptSensitive('Nguyen Van A'),
    sourceContact: encryptSensitive('0900000001'),
    latitude: null,
    longitude: null,
    sensitiveRef: encryptSensitive('REF-001'),
    createdById: 'duty-1',
    organizationId: 'unit-nghia-tru',
    incidentId: null,
    classification: null,
    verificationNote: null,
    verificationResult: null,
    processedNote: null,
    confirmedAt: null,
    confirmedById: null,
    transferToId: null,
    version: 1,
    createdAt: new Date('2026-09-24T08:00:00.000Z'),
    updatedAt: new Date('2026-09-24T08:00:00.000Z'),
    ...overrides,
  });

  it('masks every sensitive field without the reveal capability', () => {
    const masked = maskIntakeReport(row(), false);
    expect(masked.revealed).toBe(false);
    expect(masked.sourceName).toBe(MASKED_IDENTITY);
    expect(masked.sourceContact).toBe(MASKED_IDENTITY);
    expect(masked.sensitiveRef).toBe(MASKED_IDENTITY);
    expect(JSON.stringify(masked)).not.toContain('Nguyen Van A');
    expect(JSON.stringify(masked)).not.toContain('0900000001');
    expect(JSON.stringify(masked)).not.toContain('REF-001');
  });

  it('reveals plaintext only through the explicit reveal path', () => {
    const revealed = maskIntakeReport(row(), true);
    expect(revealed.revealed).toBe(true);
    expect(revealed.sourceName).toBe('Nguyen Van A');
    expect(revealed.sourceContact).toBe('0900000001');
    expect(revealed.sensitiveRef).toBe('REF-001');
  });

  it('reads legacy channel rows through the canonical mapping', () => {
    const legacy = maskIntakeReport(
      row({ channel: 'in_person', sourceChannel: null }),
      false,
    );
    expect(legacy.sourceChannel).toBe('direct');
    expect(legacy.sourceName).toBe(MASKED_IDENTITY);
  });

  it('exposes no role-name reveal shortcut in the incidents module', () => {
    expect(
      (incidentsDomain as Record<string, unknown>).canRevealIntakeIdentity,
    ).toBeUndefined();
    expect(
      (incidentsEntry as Record<string, unknown>).canRevealIntakeIdentity,
    ).toBeUndefined();
    expect(JSON.stringify(Object.keys(incidentsDomain))).not.toContain(
      'Reveal',
    );
  });

  it('keeps the canonical migration free of non-contract channels', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260924100000_ps_e1005_canonical_channel',
        'migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain('in_person');
    expect(migration).toContain('telephone');
    expect(migration).not.toContain('manual_other');
  });

  it('keeps legacy manual_other outside the write model', () => {
    const legacy = maskIntakeReport(
      row({ channel: 'manual_other', sourceChannel: null }),
      false,
    );
    expect(legacy.sourceChannel).toBeNull();
    expect(legacy.sourceName).toBe(MASKED_IDENTITY);
    expect(() => normalizeSourceChannel('manual_other')).toThrow(
      'INVALID_CHANNEL',
    );
  });
});

describe('Direct incident payload seam', () => {
  it('trims a minimal description payload', () => {
    expect(parseIncident({ description: '  Mat trat tu  ' })).toMatchObject({
      description: 'Mat trat tu',
    });
  });

  it('accepts a full incident payload', () => {
    expect(
      parseIncident({
        description: 'Probe',
        category: 'public_order',
        severity: 'high',
        latitude: 21.0,
        longitude: 106.0,
      }),
    ).toMatchObject({
      description: 'Probe',
      category: 'public_order',
      severity: 'high',
      latitude: 21.0,
      longitude: 106.0,
    });
  });

  it('rejects missing descriptions', () => {
    expect(() => parseIncident(null)).toThrow('INVALID_INCIDENT');
    expect(() => parseIncident({})).toThrow('DESCRIPTION_REQUIRED');
    expect(() => parseIncident({ description: '   ' })).toThrow(
      'DESCRIPTION_REQUIRED',
    );
  });

  it('rejects half locations', () => {
    expect(() => parseIncident({ description: 'x', latitude: 21.0 })).toThrow(
      'GEOPOINT_INCOMPLETE',
    );
  });

  it('rejects non-numeric locations', () => {
    expect(() =>
      parseIncident({ description: 'x', latitude: 'north', longitude: 106.0 }),
    ).toThrow('INVALID_LOCATION');
  });

  it('keeps Residents and Intake fields masked and actions policy/state-driven while applying shared presentation tokens', () => {
    const queue = readFileSync(
      join(
        process.cwd(),
        'src',
        'components',
        'incidents',
        'IntakeReportQueue.tsx',
      ),
      'utf8',
    );
    const intakeDetail = readFileSync(
      join(
        process.cwd(),
        'src',
        'components',
        'incidents',
        'IntakeReportDetail.tsx',
      ),
      'utf8',
    );
    for (const source of [queue, intakeDetail]) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(
        /slate-(950|900|800|700)|cyan-(300|200)|amber-(400|300|200|100)|emerald-(400|300|200)|rose-(400|300|200|100)/,
      );
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).toContain('min-h-[44px]');
      expect(source).toContain('aria-hidden');
    }
    expect(intakeDetail).toContain('Danh tính đã che theo vai trò');
    expect(intakeDetail).toContain('revealed');
    expect(intakeDetail).toContain('convert_to_incident');
    expect(queue).toContain('Chưa tạo Incident');
  });
});
