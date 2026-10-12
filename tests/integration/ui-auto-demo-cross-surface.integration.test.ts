import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { evaluateBridgeReadiness } from '@/modules/demo/readiness';
import {
  createVerificationMatrix,
  evaluateVerificationGate,
} from '@/modules/demo/verification-matrix';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';
import { makeValidManifest } from '../demo-ui/demo-manifest-fixture';

describe('T-012 cross-surface readiness boundary', () => {
  it('maps wrong target and missing dependency safely without starting infrastructure', async () => {
    const bridgeProbe = vi.fn(() => 'unavailable' as const);
    const wrongTarget = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: 'postgresql://localhost/civicos_demo_shadow',
    });
    const readiness = await evaluateBridgeReadiness({
      bridge: bridgeProbe,
      device: 'ready',
      api: 'ready',
      worker: 'ready',
      map: 'ready',
      target: wrongTarget,
      mode: 'LIVE_DEMO',
      manifest: makeValidManifest({ surface: 'mobile' }),
    });
    const matrix = createVerificationMatrix({
      observations: [
        { scenarioId: 'B7-02', stepId: 'target', status: 'blocked' },
        { scenarioId: 'B7-07', stepId: 'readiness', status: 'deferred' },
      ],
    });

    expect(wrongTarget.state).toBe('blocked');
    expect(readiness.state).toBe('blocked');
    expect(bridgeProbe).toHaveBeenCalledTimes(1);
    expect(evaluateVerificationGate(matrix.rows).decision).toBe('deferred');
  });

  it('keeps the native read-only and WriteGuard boundary without reset or spawn primitives', () => {
    const source = readFileSync(
      join(process.cwd(), 'mobile/src/demo/native-runner.ts'),
      'utf8',
    );
    expect(source).toContain('../components/WriteGuard');
    expect(source).toContain('assertReadOnly');
    expect(source).not.toMatch(/\b(reset|spawn|child_process)\b/);
  });
});
