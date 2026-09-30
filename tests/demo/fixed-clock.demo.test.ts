import { describe, expect, it } from 'vitest';

import { fixedClock } from '@/modules/platform/clock';
import { dueAt } from '@/modules/platform/sla';
import { intakeSlaSummary } from '@/modules/incidents';
import { nextCheckForPurpose, slaBadge } from '@/modules/residents';

const DEMO_NOW = new Date('2026-09-28T08:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('fixed demo timestamps and derived SLA state', () => {
  it('uses one instant for offsets and SLA badges', () => {
    const clock = fixedClock(DEMO_NOW);
    const now = clock.now();
    const temporaryNextCheck = new Date(now.getTime() + 6 * DAY_MS);
    const foreignNextCheck = new Date(now.getTime() + DAY_MS);
    const reintegrationNextCheck = new Date(now.getTime() - 14 * DAY_MS);

    expect(temporaryNextCheck.toISOString()).toBe('2026-10-04T08:00:00.000Z');
    expect(foreignNextCheck.toISOString()).toBe('2026-09-29T08:00:00.000Z');
    expect(reintegrationNextCheck.toISOString()).toBe(
      '2026-09-14T08:00:00.000Z',
    );
    expect(slaBadge(now, temporaryNextCheck)).toBe('on_time');
    expect(slaBadge(now, foreignNextCheck)).toBe('due_soon');
    expect(slaBadge(now, reintegrationNextCheck)).toBe('overdue');
    expect(dueAt(now, { kind: 'demo', durationMs: DAY_MS }).toISOString()).toBe(
      '2026-09-29T08:00:00.000Z',
    );
  });

  it('passes the fixed instant to intake SLA calculations', () => {
    const receivedAt = new Date('2026-09-27T08:00:00.000Z');

    expect(intakeSlaSummary(receivedAt, DEMO_NOW).overdue).toBe(true);
    expect(intakeSlaSummary(receivedAt, DEMO_NOW).warning).toBe(false);
  });

  it('keeps existing resident date arithmetic explicit', () => {
    expect(
      nextCheckForPurpose('foreign_resident', DEMO_NOW).toISOString(),
    ).toBe('2026-09-29T08:00:00.000Z');
  });
});
