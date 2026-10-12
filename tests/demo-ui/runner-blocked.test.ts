import { describe, expect, it, vi } from 'vitest';

import { createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

function makeManualScheduler() {
  const timers: { delayMs: number; callback: () => void }[] = [];
  return {
    timers,
    scheduler: {
      schedule: (delayMs: number, callback: () => void) => {
        const handle = { delayMs, callback };
        timers.push(handle);
        return handle;
      },
      cancel: (handle: unknown) => {
        const index = timers.indexOf(handle as (typeof timers)[number]);
        if (index >= 0) timers.splice(index, 1);
      },
    },
  };
}

describe('T-002 AC-4 blocked and failed steps stay safe', () => {
  it('a blocked step emits a safe event and stops without running on', async () => {
    const kit = makeManualScheduler();
    const executor = vi
      .fn()
      .mockReturnValueOnce('settled')
      .mockReturnValueOnce('blocked');
    const events: unknown[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'choose-option' },
          { id: 'step-3', action: 'submit' },
        ],
      }),
      scheduler: kit.scheduler,
      executor: (step) => executor(step),
      onEvent: (event) => events.push(event),
    });
    await runner.start();
    expect(kit.timers).toHaveLength(1);
    kit.timers[0]?.callback();
    await Promise.resolve();
    expect(runner.getState()).toBe('blocked');
    expect(executor).toHaveBeenCalledTimes(2);
    const blockedEvents = events.filter(
      (event) =>
        (event as { status: string }).status === 'blocked' &&
        (event as { stepId: string }).stepId === 'step-2',
    );
    expect(blockedEvents).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain('step-3');
  });

  it('a thrown executor error becomes a safe failed event without raw secrets', async () => {
    const executor = vi.fn().mockImplementation(() => {
      throw new Error('postgres password s3cret-token exploded');
    });
    const events: unknown[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'submit' }],
      }),
      executor,
      onEvent: (event) => events.push(event),
    });
    await runner.start();
    expect(runner.getState()).toBe('failed');
    expect(events).toHaveLength(1);
    const serialized = JSON.stringify(events);
    expect(serialized).toContain('DEMO_STEP_FAILED');
    expect(serialized).not.toContain('s3cret-token');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('exploded');
    expect(serialized).not.toContain('Error');
  });

  it('an unknown executor return value fails safe instead of advancing', async () => {
    const kit = makeManualScheduler();
    const executor = vi
      .fn()
      .mockReturnValue('mystery-status' as unknown as 'settled');
    const events: { stepId: string; status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'submit' },
        ],
      }),
      scheduler: kit.scheduler,
      executor: (step) => executor(step),
      onEvent: (event) =>
        events.push(
          event as { stepId: string; status: string; reason: string },
        ),
    });
    await runner.start();
    expect(runner.getState()).toBe('failed');
    expect(executor).toHaveBeenCalledTimes(1);
    expect(kit.timers).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      stepId: 'step-1',
      status: 'failed',
      reason: 'DEMO_STEP_FAILED',
    });
    expect(JSON.stringify(events)).not.toContain('mystery-status');
  });

  it('no pacing timer is created for a blocked or failed step', async () => {
    const delays: number[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'click' }],
      }),
      scheduler: {
        schedule: (delayMs: number) => {
          delays.push(delayMs);
          return {};
        },
        cancel: () => {},
      },
      executor: () => 'blocked',
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    expect(delays).toEqual([]);
  });
});
