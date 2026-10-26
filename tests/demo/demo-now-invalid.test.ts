import { describe, expect, it } from 'vitest';

import { seedDemo } from '../../scripts/demo/seed';

const DEMO_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos?schema=public';

describe('demo clock preflight', () => {
  it.each([undefined, '2026-09-28T08:00:00.000', 'invalid'])(
    'rejects %s before importing or mutating demo modules',
    async (demoNow) => {
      await expect(
        seedDemo({
          DATABASE_URL: DEMO_URL,
          DEMO_DATABASE_URL: DEMO_URL,
          DEMO_NOW: demoNow,
        }),
      ).rejects.toThrow('DEMO_NOW_INVALID');
    },
  );
});
