import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const coverage = readFileSync(
  join(process.cwd(), 'docs/runbooks/ui-auto-demo/coverage.md'),
  'utf8',
);

describe('T-013 explicit B7 coverage report', () => {
  it('contains exactly one explicit status row for every B7 scenario', () => {
    for (let index = 1; index <= 10; index += 1) {
      const id = `B7-${String(index).padStart(2, '0')}`;
      expect(coverage).toMatch(
        new RegExp(
          `\\|\\s*${id}\\s*\\|[^\\n]*\\|\\s*(pass|blocked|deferred)\\s*\\|`,
        ),
      );
    }
    expect(coverage).toContain('surface');
    expect(coverage).toContain('persona');
    expect(coverage).toContain('dependency');
    expect(coverage).toContain('evidence');
    expect(coverage).toContain('limitation/next action');
  });

  it('records mobile write as forbidden and provider/runtime gaps as deferred', () => {
    expect(coverage).toContain('UAD-14 mobile write');
    expect(coverage).toContain(
      'mobile/src/demo/__tests__/native-runner.test.ts',
    );
    expect(coverage).toContain(
      'tests/mobile-readonly/read-only-guard.regression.test.ts',
    );
    expect(coverage).toContain('Stitch');
    expect(coverage).toContain('native runtime');
    expect(coverage).toContain('deferred');
    expect(coverage).not.toContain('status `pass` cho UAD-14');
  });
});
