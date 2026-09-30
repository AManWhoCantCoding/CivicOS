import { describe, expect, it } from 'vitest';

import { fixedClock } from '@/modules/platform/clock';

describe('parallel fixed-clock isolation', () => {
  it('keeps independent instants isolated during concurrent runs', async () => {
    const [first, second] = await Promise.all([
      Promise.resolve(fixedClock(new Date('2026-09-28T08:00:00.000Z')).now()),
      Promise.resolve(fixedClock(new Date('2027-01-01T00:00:00.000Z')).now()),
    ]);

    expect(first.toISOString()).toBe('2026-09-28T08:00:00.000Z');
    expect(second.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
