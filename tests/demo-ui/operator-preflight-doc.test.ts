import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runbook = readFileSync(
  join(process.cwd(), 'docs/runbooks/ui-auto-demo/README.md'),
  'utf8',
);

describe('T-013 operator preflight documentation', () => {
  it('names the operator-owned infrastructure, readiness, provider, target, and start sequence', () => {
    expect(runbook).toContain('civicos_demo');
    expect(runbook).toContain('demo:bootstrap');
    expect(runbook).toContain('seed-land.ts');
    for (const dependency of [
      'PostgreSQL',
      'Next.js',
      'worker',
      'TileServer',
      'Metro',
      'emulator/device',
    ]) {
      expect(runbook).toContain(dependency);
    }
    expect(runbook).toContain('LIVE_DEMO');
    expect(runbook).toContain('ready');
    expect(runbook).toContain('Start');
  });

  it('uses placeholders rather than embedding secrets', () => {
    expect(runbook).toContain('<DEMO_DATABASE_URL>');
    expect(runbook).not.toMatch(/civicos-dev|password|token|cookie|secret/i);
  });
});
