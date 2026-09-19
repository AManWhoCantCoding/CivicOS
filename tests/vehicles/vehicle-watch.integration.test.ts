import { describe, expect, it } from 'vitest';

import { isRegistryActive, normalizePlate } from '@/modules/vehicles';

describe('vehicle watch', () => {
  it('normalizes a plate without deciding suspicion', () => {
    expect(normalizePlate(' 89A-123.45 ')).toBe('89A12345');
  });

  it('does not match an expired registry entry', () => {
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-01-01'),
          validUntil: new Date('2026-01-02'),
        },
        new Date('2026-02-01'),
      ),
    ).toBe(false);
  });
});
