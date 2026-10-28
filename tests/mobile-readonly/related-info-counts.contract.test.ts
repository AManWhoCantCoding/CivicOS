import { describe, expect, it } from 'vitest';

import { countRelatedInfo } from '@/modules/mobile-readonly/related-info';
import { mobileUsers } from './fixtures';
import { useMobileReadonlyFixture } from './helpers';

const describeWithDatabase = describe.skipIf(process.env.RUN_DB_TESTS !== '1');

describeWithDatabase('mobile related-info counts contract', () => {
  useMobileReadonlyFixture();
  it('returns exactly the five entity counters', async () => {
    const result = await countRelatedInfo(mobileUsers.inScope, {});
    expect(Object.keys(result).sort()).toEqual([
      'ALL',
      'BUSINESS',
      'HOTSPOT',
      'RESIDENT',
      'VIOLATION',
    ]);
    expect(result).toEqual({
      ALL: 4,
      RESIDENT: 1,
      BUSINESS: 1,
      HOTSPOT: 1,
      VIOLATION: 1,
    });
    for (const entityType of [
      'RESIDENT',
      'BUSINESS',
      'HOTSPOT',
      'VIOLATION',
    ] as const) {
      expect(result[entityType]).toBeGreaterThan(0);
    }
  });
});
