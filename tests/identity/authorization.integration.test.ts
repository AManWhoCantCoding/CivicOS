import { describe, expect, it } from 'vitest';

import { requireRole } from '@/modules/identity';

describe('identity authorization matrix', () => {
  it('allows only the commander role to perform command-only actions', () => {
    expect(() =>
      requireRole(
        { id: '1', email: 'a', name: 'A', roles: ['commander'] },
        'commander',
      ),
    ).not.toThrow();
    expect(() =>
      requireRole(
        { id: '2', email: 'b', name: 'B', roles: ['field_officer'] },
        'commander',
      ),
    ).toThrow('FORBIDDEN');
  });
});
