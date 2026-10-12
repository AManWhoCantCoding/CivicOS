import { describe, expect, it } from 'vitest';

import { createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

describe('T-010 recovery lifecycle', () => {
  it('keeps blocked terminal state deterministic and replay-owned by runner', async () => {
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'click' }],
      }),
      executor: () => ({
        status: 'blocked' as const,
        reason: 'DEMO_STEP_BLOCKED',
      }),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    await runner.replay();
    expect(runner.getState()).toBe('blocked');
  });

  it('does not retry a failed step or schedule recovery work', async () => {
    let calls = 0;
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'click' }],
      }),
      scheduler: { schedule: () => ({}), cancel: () => {} },
      executor: () => {
        calls += 1;
        return 'failed';
      },
    });
    await runner.start();
    expect(runner.getState()).toBe('failed');
    expect(calls).toBe(1);
  });
});
