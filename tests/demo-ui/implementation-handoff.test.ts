import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const coverage = readFileSync(
  join(process.cwd(), 'docs/runbooks/ui-auto-demo/coverage.md'),
  'utf8',
);

describe('T-013 implementation handoff', () => {
  it('names the completed dependency, next gate, locked references, scope, and prerequisites', () => {
    for (const item of [
      'T-012',
      'gov-phase-verify',
      'docs/design/ui-auto-demo/LOCK.json',
      'overview.md',
      '.scratch/ui-auto-demo/sow.md',
      '.brain/evidence/ui-auto-demo-T-012/review.md',
      'docs/demo-script.md',
      'docs/runbooks/ui-auto-demo/**',
      'tests/demo-ui/**',
      'operator prerequisites',
      'PostgreSQL',
      'Metro',
      'TileServer',
    ]) {
      expect(coverage).toContain(item);
    }
  });
});
