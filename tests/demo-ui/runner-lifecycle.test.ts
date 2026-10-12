import { describe, expect, it, vi } from 'vitest';

import { DEMO_ACTIONS } from '@/modules/demo/manifest';
import {
  DEMO_REPLAY_REFUSED,
  canTransition,
  createDemoRunner,
  type DemoRunState,
} from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

function makeControllableScheduler() {
  const timers: { delayMs: number; callback: () => void }[] = [];
  const cancelled = new Set<object>();
  return {
    timers,
    scheduler: {
      schedule(delayMs: number, callback: () => void) {
        const handle = {};
        timers.push({
          delayMs,
          callback: () => {
            if (!cancelled.has(handle)) callback();
          },
        });
        return handle;
      },
      cancel(handle: unknown) {
        cancelled.add(handle as object);
      },
    },
    liveCount: () => timers.length - cancelled.size,
  };
}

describe('T-002 AC-3 lifecycle transitions and timer cleanup', () => {
  it('allows the locked transitions and rejects illegal jumps', () => {
    const legal: [DemoRunState, DemoRunState][] = [
      ['idle', 'preflight'],
      ['preflight', 'authenticating'],
      ['authenticating', 'running'],
      ['running', 'paused'],
      ['paused', 'running'],
      ['running', 'blocked'],
      ['running', 'failed'],
      ['running', 'stopping'],
      ['paused', 'stopping'],
      ['stopping', 'cancelled'],
      ['stopping', 'completed-with-cleanup-pending'],
      ['running', 'completed'],
    ];
    for (const [from, to] of legal) {
      expect(canTransition(from, to)).toBe(true);
    }
    const illegal: [DemoRunState, DemoRunState][] = [
      ['idle', 'running'],
      ['running', 'idle'],
      ['paused', 'completed'],
      ['blocked', 'running'],
      ['failed', 'running'],
      ['cancelled', 'running'],
      ['completed', 'running'],
    ];
    for (const [from, to] of illegal) {
      expect(canTransition(from, to)).toBe(false);
    }
  });

  it('pause cancels the pacing timer and resume installs at most one timer', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'submit' },
        ],
      }),
      scheduler: kit.scheduler,
      executor,
    });
    await runner.start();
    expect(runner.getState()).toBe('running');
    expect(kit.liveCount()).toBe(1);

    runner.pause();
    expect(runner.getState()).toBe('paused');
    expect(kit.liveCount()).toBe(0);
    expect(runner.getCursor()).toBe(1);

    runner.resume();
    runner.resume();
    expect(runner.getState()).toBe('running');
    expect(kit.liveCount()).toBe(1);

    kit.timers.at(-1)?.callback();
    await Promise.resolve();
    expect(executor).toHaveBeenCalledTimes(2);
    expect(runner.getState()).toBe('completed');
  });

  it('stop cancels pacing and prevents any further executor call', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'submit' },
        ],
      }),
      scheduler: kit.scheduler,
      executor,
    });
    await runner.start();
    runner.stop();
    expect(runner.getState()).toBe('cancelled');
    for (const timer of kit.timers) timer.callback();
    await Promise.resolve();
    expect(executor).toHaveBeenCalledTimes(1);
    expect(runner.getState()).toBe('cancelled');
  });

  it('replay runs the same manifest once with no stale or duplicate callbacks', async () => {
    const kit = makeControllableScheduler();
    const seen: string[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'submit' },
        ],
      }),
      scheduler: kit.scheduler,
      executor: (step) => {
        seen.push(step.id);
        return 'settled';
      },
    });
    await runner.start();
    const stale = kit.timers[0];
    runner.stop();
    await runner.replay();
    stale?.callback();
    await Promise.resolve();
    kit.timers.at(-1)?.callback();
    await Promise.resolve();
    expect(seen).toEqual(['step-1', 'step-1', 'step-2']);
    expect(runner.getState()).toBe('completed');
  });

  it('replay is rejected outside terminal states', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const runner = createDemoRunner({
      manifest: makeValidManifest(),
      scheduler: kit.scheduler,
      executor,
    });
    await runner.start();
    expect(runner.getState()).toBe('running');
    const timerCount = kit.timers.length;
    const refusal = await runner.replay().then(
      () => {
        throw new Error('DEMO_REPLAY_SHOULD_NOT_RESOLVE');
      },
      (error: unknown) => error,
    );
    expect(refusal).toBeInstanceOf(Error);
    expect((refusal as Error).message).toBe(DEMO_REPLAY_REFUSED);
    expect(runner.getState()).toBe('running');
    expect(executor).toHaveBeenCalledTimes(1);
    expect(kit.timers.length).toBe(timerCount);
    expect(kit.liveCount()).toBe(1);
  });

  it('replay with an invalid manifest stays terminal without running steps', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const events: { action: string; status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'drop-table' }],
      }),
      scheduler: kit.scheduler,
      executor,
      onEvent: (event) =>
        events.push(
          event as { action: string; status: string; reason: string },
        ),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    await runner.replay();
    expect(runner.getState()).toBe('blocked');
    expect(executor).not.toHaveBeenCalled();
    expect(kit.liveCount()).toBe(0);
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.status).toBe('blocked');
      expect(event.reason).toBe('DEMO_MANIFEST_UNKNOWN_ACTION');
      expect(DEMO_ACTIONS as readonly string[]).toContain(event.action);
    }
  });
});
