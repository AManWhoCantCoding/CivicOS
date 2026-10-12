import { describe, expect, it } from 'vitest';

import { createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

describe('T-005 adapter reason propagation through the runner', () => {
  it('lets the allowlisted SELECT_NOT_OPEN reason reach the step event', async () => {
    const events: { stepId: string; status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'choose-option' }],
      }),
      executor: () => ({ status: 'blocked', reason: 'SELECT_NOT_OPEN' }),
      onEvent: (event) =>
        events.push(
          event as { stepId: string; status: string; reason: string },
        ),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      stepId: 'step-1',
      status: 'blocked',
      reason: 'SELECT_NOT_OPEN',
    });
  });

  it('maps a bare blocked choose-option to the locked SELECT_NOT_OPEN vocabulary', async () => {
    const events: { stepId: string; status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'choose-option' }],
      }),
      executor: () => 'blocked',
      onEvent: (event) =>
        events.push(
          event as { stepId: string; status: string; reason: string },
        ),
    });
    await runner.start();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      stepId: 'step-1',
      status: 'blocked',
      reason: 'SELECT_NOT_OPEN',
    });
  });

  it('propagates explicit descriptor and interaction reasons', async () => {
    for (const reason of [
      'DEMO_STEP_INVALID_DESCRIPTOR',
      'DEMO_STEP_INTERACTION_UNAVAILABLE',
    ]) {
      const events: { status: string; reason: string }[] = [];
      const runner = createDemoRunner({
        manifest: makeValidManifest({
          steps: [{ id: 'step-1', action: 'click' }],
        }),
        executor: () => ({ status: 'blocked', reason }),
        onEvent: (event) =>
          events.push(event as { status: string; reason: string }),
      });
      await runner.start();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ status: 'blocked', reason });
    }
  });

  it('falls back to a safe reason when the executor reason is not allowlisted', async () => {
    const events: { status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'click' }],
      }),
      executor: () => ({
        status: 'blocked',
        reason: 'postgres password s3cret exploded',
      }),
      onEvent: (event) =>
        events.push(event as { status: string; reason: string }),
    });
    await runner.start();
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe('blocked');
    expect(events[0]?.reason).toBe('DEMO_STEP_BLOCKED');
    expect(JSON.stringify(events)).not.toContain('s3cret');
    expect(JSON.stringify(events)).not.toContain('password');
  });

  it('passes detail and expected-state metadata to the executor', async () => {
    const seen: unknown[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          {
            id: 'step-1',
            action: 'click',
            detail: '{"role":"button","name":"Bat dau"}',
            expectedState: 'running',
          },
        ],
      }),
      executor: (step) => {
        seen.push(step);
        return 'settled';
      },
    });
    await runner.start();
    expect(runner.getState()).toBe('completed');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      id: 'step-1',
      action: 'click',
      detail: '{"role":"button","name":"Bat dau"}',
      expectedState: 'running',
    });
  });
});
