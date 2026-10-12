import { describe, expect, it, vi } from 'vitest';

import { DEMO_PACING_MS, createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

function makeFakeScheduler() {
  const pending: { delayMs: number; callback: () => void; done: boolean }[] =
    [];
  const cancelled = new Set<object>();
  return {
    delays: () => pending.map((entry) => entry.delayMs),
    scheduler: {
      schedule(delayMs: number, callback: () => void) {
        const handle = {};
        pending.push({
          delayMs,
          callback: () => {
            if (!cancelled.has(handle)) callback();
          },
          done: false,
        });
        (pending[pending.length - 1] as { handle?: object }).handle = handle;
        return handle;
      },
      cancel(handle: unknown) {
        cancelled.add(handle as object);
      },
    },
    async flush() {
      for (const entry of pending) {
        if (entry.done) continue;
        entry.done = true;
        entry.callback();
        await Promise.resolve();
      }
    },
  };
}

describe('T-002 AC-2 runner pacing clock', () => {
  it('uses exactly 3000ms between settled actions', async () => {
    expect(DEMO_PACING_MS).toBe(3000);
    const fake = makeFakeScheduler();
    const order: string[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'navigate' },
          { id: 'step-2', action: 'click' },
          { id: 'step-3', action: 'submit' },
        ],
      }),
      scheduler: fake.scheduler,
      executor: (step) => {
        order.push(step.id);
        return 'settled';
      },
    });
    await runner.start();
    await fake.flush();
    expect(order).toEqual(['step-1', 'step-2', 'step-3']);
    expect(fake.delays()).toEqual([3000, 3000]);
    expect(runner.getState()).toBe('completed');
  });

  it('creates exactly one timer per settled step and never sleeps for readiness', async () => {
    const fake = makeFakeScheduler();
    const scheduleSpy = vi.spyOn(fake.scheduler, 'schedule');
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'submit' },
        ],
      }),
      scheduler: fake.scheduler,
      executor: () => 'settled',
    });
    await runner.start();
    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    expect(scheduleSpy).toHaveBeenCalledWith(3000, expect.any(Function));
    await fake.flush();
    expect(runner.getState()).toBe('completed');
  });
});
