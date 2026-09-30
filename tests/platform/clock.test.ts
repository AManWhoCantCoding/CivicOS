import { describe, expect, it } from 'vitest';

import {
  fixedClock,
  parseDemoNow,
  resolveDemoClock,
  systemClock,
} from '@/modules/platform/clock';

const DEMO_NOW = '2026-09-28T08:00:00.000Z';

describe('demo clock', () => {
  it('parses a timezone-qualified ISO instant', () => {
    expect(parseDemoNow(DEMO_NOW).toISOString()).toBe(DEMO_NOW);
    expect(resolveDemoClock({ DEMO_NOW }).now().toISOString()).toBe(DEMO_NOW);
  });

  it.each([undefined, '', '2026-09-28T08:00:00.000', 'not-a-date'])(
    'rejects invalid DEMO_NOW input %s',
    (value) => {
      expect(() => parseDemoNow(value)).toThrow('DEMO_NOW_INVALID');
      expect(() => resolveDemoClock({ DEMO_NOW: value })).toThrow(
        'DEMO_NOW_INVALID',
      );
    },
  );

  it('returns an immutable copy for each fixed-clock read', () => {
    const clock = fixedClock(new Date(DEMO_NOW));
    const first = clock.now();
    first.setUTCDate(first.getUTCDate() + 1);

    expect(clock.now().toISOString()).toBe(DEMO_NOW);
  });

  it('keeps system time as the production fallback seam', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});
