import { describe, expect, it } from 'vitest';

import { dueAt, isOverdue } from '@/modules/platform';

describe('continuous SLA clock', () => {
  it('continues through weekends and holidays', () => {
    const started = new Date('2026-09-18T23:00:00.000Z');
    const due = dueAt(started, {
      kind: 'two-hours',
      durationMs: 2 * 60 * 60 * 1000,
    });
    expect(due.toISOString()).toBe('2026-09-19T01:00:00.000Z');
    expect(isOverdue(new Date('2026-09-19T01:00:00.000Z'), due)).toBe(true);
  });
});
