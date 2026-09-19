import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

describe('evidence contract', () => {
  it('uses a stable content hash for immutable originals', () => {
    const bytes = new TextEncoder().encode('evidence');
    expect(createHash('sha256').update(bytes).digest('hex')).toHaveLength(64);
  });
});
