import { describe, expect, it } from 'vitest';

import {
  assertChecklistComplete,
  assertChecklistEvidence,
  assertInspectionTransition,
} from '@/modules/inspections';
import { INSPECTION_SLA } from '@/modules/inspections';
import { dueAt, isOverdue } from '@/modules/platform';

describe('Inspection lifecycle', () => {
  it('requires an in-progress step before completion', () => {
    expect(() =>
      assertInspectionTransition('scheduled', 'in_progress'),
    ).not.toThrow();
    expect(() =>
      assertInspectionTransition('in_progress', 'completed'),
    ).not.toThrow();
    expect(() => assertInspectionTransition('scheduled', 'completed')).toThrow(
      'INVALID_INSPECTION_TRANSITION',
    );
  });

  it('requires every mandatory checklist item before completion', () => {
    expect(() =>
      assertChecklistComplete(
        [
          { key: 'license', required: true },
          { key: 'security', required: true },
        ],
        [{ key: 'license', value: 'valid' }],
      ),
    ).toThrow('CHECKLIST_ITEM_REQUIRED:security');
    expect(() =>
      assertChecklistComplete(
        [{ key: 'license', required: true }],
        [{ key: 'license', value: 'valid' }],
      ),
    ).not.toThrow();
    expect(() =>
      assertChecklistComplete(
        [{ key: 'license', required: true }],
        [{ key: 'license', value: '  ' }],
      ),
    ).toThrow('CHECKLIST_ITEM_REQUIRED:license');
    expect(() =>
      assertChecklistComplete(
        [
          { key: 'license', required: true },
          { key: 'security', required: true },
        ],
        [
          { key: 'license', value: 'valid' },
          { key: 'security', value: ' \t' },
        ],
      ),
    ).toThrow('CHECKLIST_ITEM_REQUIRED:security');
  });

  it('requires Evidence for answered items flagged by the template', () => {
    const items = [
      { key: 'license', required: true },
      { key: 'security', required: true, evidenceRequired: true },
    ];
    const responses = [
      { key: 'license', value: 'valid' },
      { key: 'security', value: 'needs_action' },
    ];
    expect(() => assertChecklistEvidence(items, responses, [])).toThrow(
      'CHECKLIST_EVIDENCE_REQUIRED:security',
    );
    expect(() =>
      assertChecklistEvidence(items, responses, [
        { checklistKey: 'security', evidenceIds: ['evidence-1'] },
      ]),
    ).not.toThrow();
    expect(() =>
      assertChecklistEvidence(items, [{ key: 'license', value: 'valid' }], []),
    ).not.toThrow();
  });

  it('runs the seven-day completion SLA continuously across weekends', () => {
    const startedAt = new Date('2026-09-19T08:00:00.000Z');
    expect(startedAt.getUTCDay()).toBe(6);
    const due = dueAt(startedAt, {
      ...INSPECTION_SLA.completion,
    });
    expect(due.toISOString()).toBe('2026-09-26T08:00:00.000Z');
    expect(due.getUTCDay()).toBe(6);
    expect(isOverdue(new Date('2026-09-25T08:00:00.000Z'), due)).toBe(false);
    expect(isOverdue(new Date('2026-09-26T08:00:00.000Z'), due)).toBe(true);
    const holidayStart = new Date('2026-04-30T08:00:00.000Z');
    expect(dueAt(holidayStart, INSPECTION_SLA.completion).toISOString()).toBe(
      '2026-05-07T08:00:00.000Z',
    );
  });
});
