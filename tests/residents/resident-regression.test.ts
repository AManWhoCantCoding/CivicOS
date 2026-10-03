import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { DomainEvent } from '@/modules/eventing';
import { projectResidentEvent } from '@/modules/residents';

function residentEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: 'evt-regression-1',
    eventType: 'SubjectRegistered',
    eventVersion: 1,
    aggregateType: 'Subject',
    aggregateId: 'subject-regression-1',
    aggregateVersion: 1,
    occurredAt: new Date('2026-09-01T00:00:00.000Z'),
    recordedAt: new Date('2026-09-01T00:00:00.000Z'),
    actor: { organizationId: 'org-regression' },
    payload: {},
    metadata: {},
    ...overrides,
  } as DomainEvent;
}

describe('resident regression seam', () => {
  it('reduces resident events synchronously without returning a Promise', () => {
    const state = projectResidentEvent(
      null,
      residentEvent({
        payload: {
          displayName: 'Nguyen Van A',
          subjectType: 'temporary_resident',
        },
      }),
    );
    expect(state).not.toBeInstanceOf(Promise);
    expect(state).toMatchObject({
      id: 'subject-regression-1',
      displayName: 'Nguyen Van A',
      subjectType: 'temporary_resident',
      status: 'active',
      version: 1,
    });
  });

  it('keeps organization scope and version across events', () => {
    const first = projectResidentEvent(
      { organizationId: 'org-regression' },
      residentEvent({
        eventType: 'SubjectManagementRecordCreated',
        aggregateType: 'SubjectManagementRecord',
        aggregateId: 'record-regression-1',
        aggregateVersion: 1,
        payload: { purpose: 'reintegration' },
      }),
    ) as Record<string, unknown>;
    expect(first['version']).toBe(1);
    expect(first['organizationId']).toBe('org-regression');
  });

  it('does not hard-code the upper-unit target in the report UI', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src',
        'components',
        'residents',
        'ReportPreview.tsx',
      ),
      'utf8',
    );
    expect(source).not.toContain("'upper-unit'");
    expect(source).not.toContain('"upper-unit"');
  });

  it('keeps Residents and Intake fields masked and actions policy/state-driven while applying shared presentation tokens', () => {
    const list = readFileSync(
      join(process.cwd(), 'src', 'components', 'residents', 'ResidentList.tsx'),
      'utf8',
    );
    const detail = readFileSync(
      join(
        process.cwd(),
        'src',
        'components',
        'residents',
        'ResidentDetail.tsx',
      ),
      'utf8',
    );
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
    for (const source of [list, detail, queue]) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(
        /slate-(950|900|800|700)|cyan-(300|200)|amber-(400|300|200|100)|emerald-(400|300|200)|rose-(400|300|200|100)/,
      );
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).toContain('min-h-[44px]');
    }
    expect(detail).toContain('Danh tính đã che theo quyền.');
    expect(detail).toContain('masked');
    expect(queue).toContain('revealed');
    expect(queue).toContain('RECEIVED');
    expect(queue).not.toContain('convert_to_incident');
  });
});
