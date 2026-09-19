import { describe, expect, it } from 'vitest';

import { assertIncidentTransition } from '@/modules/incidents';
import { assertInspectionTransition } from '@/modules/inspections';
import { isRegistryActive, normalizePlate } from '@/modules/vehicles';

describe('parallel wave public seams', () => {
  it('keeps each module lifecycle independent while using shared vocabulary', () => {
    expect(() =>
      assertIncidentTransition('received', 'classified'),
    ).not.toThrow();
    expect(() =>
      assertInspectionTransition('scheduled', 'in_progress'),
    ).not.toThrow();
    expect(normalizePlate('89a-123.45')).toBe('89A12345');
    expect(
      isRegistryActive(
        {
          status: 'active',
          validFrom: new Date('2026-01-01'),
          validUntil: null,
        },
        new Date('2026-09-19'),
      ),
    ).toBe(true);
  });
});
