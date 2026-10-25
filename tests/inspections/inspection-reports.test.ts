import { describe, expect, it } from 'vitest';

import { passRateLabel } from '@/components/inspections/InspectionReports';
import {
  inspectionRatesByType,
  recommendationSlaSummary,
} from '@/modules/inspections/projection';

describe('inspection report rate display', () => {
  it('formats a pass rate as a percentage', () => {
    expect(passRateLabel(0.5)).toBe('50.0%');
    expect(passRateLabel(0)).toBe('0.0%');
  });

  it('uses completed inspections, not scheduled rows, as rate denominator', () => {
    const rates = inspectionRatesByType(
      [
        { establishmentId: 'one', status: 'completed', result: 'pass' },
        { establishmentId: 'one', status: 'completed', result: 'needs_action' },
        { establishmentId: 'one', status: 'scheduled', result: null },
      ],
      new Map([['one', 'Karaoke']]),
    );
    expect(rates.Karaoke).toMatchObject({
      total: 3,
      completed: 2,
      passRate: 0.5,
      needsActionRate: 0.5,
    });
  });

  it('classifies product SLA using completion and due time, ignoring unknown states', () => {
    const now = new Date('2026-10-24T12:00:00Z');
    expect(
      recommendationSlaSummary(
        [
          {
            status: 'active',
            dueAt: '2026-10-25T12:00:00Z',
            completedAt: null,
          },
          {
            status: 'active',
            dueAt: '2026-10-23T12:00:00Z',
            completedAt: null,
          },
          {
            status: 'overdue',
            dueAt: '2026-10-25T12:00:00Z',
            completedAt: null,
          },
          {
            status: 'completed',
            dueAt: '2026-10-20T12:00:00Z',
            completedAt: now,
          },
          {
            status: 'unknown',
            dueAt: '2026-10-20T12:00:00Z',
            completedAt: null,
          },
        ],
        now,
      ),
    ).toEqual({ active: 1, overdue: 2, completed: 1 });
  });
});
