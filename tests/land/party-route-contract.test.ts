import { describe, expect, it } from 'vitest';

import * as partiesRoute from '@/app/api/land/parties/route';

describe('Land party route contract', () => {
  it('supports linked-party listing without standalone creation', () => {
    expect(partiesRoute.GET).toBeTypeOf('function');
    expect('POST' in partiesRoute).toBe(false);
  });
});
