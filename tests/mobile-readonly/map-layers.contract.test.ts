import { describe, expect, it } from 'vitest';

import { mobileUsers } from './fixtures';
import { resolveMobileLayers } from '@/modules/mobile-readonly/layers';
import { useMobileReadonlyFixture } from './helpers';

describe('mobile map layer contract', () => {
  useMobileReadonlyFixture();
  it('publishes the allow-listed layer envelope', async () => {
    const result = await resolveMobileLayers(mobileUsers.inScope);
    expect(result).toEqual(
      expect.objectContaining({ layers: expect.any(Array) }),
    );
  });
});
