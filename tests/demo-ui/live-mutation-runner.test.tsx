import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  DEMO_DEFAULT_MANIFEST,
  DemoCenter,
  describeDemoNarrator,
} from '@/components/demo/DemoCenter';
import { DEMO_MANIFEST_VERSION } from '@/modules/demo/manifest';
import { createDemoRunner } from '@/modules/demo/runner';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';
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
  };
}

function mutationManifest(
  overrides: Record<string, unknown> = {},
  steps: { id: string; action: string }[] = [
    { id: 'submit-1', action: 'submit' },
  ],
) {
  return makeValidManifest({
    mutationClass: 'create',
    liveMutationPolicy: {
      fixtureRef: 'demo-incident-01',
      idempotencyStrategy: 'existing-idempotency-key',
      replay: 'safe',
      cleanup: 'operator',
    },
    steps,
    ...overrides,
  });
}

const liveContext = {
  demoModeEnabled: true,
  targetName: 'civicos',
};

const readyTarget = () =>
  evaluateDemoTargetGuard({
    demoModeEnabled: true,
    demoDatabaseUrl:
      'postgresql://demo-user:s3cret-token@localhost:5432/civicos?schema=public',
    databaseUrl:
      'postgresql://demo-user:s3cret-token@localhost:5432/civicos?schema=public',
  });

describe('T-007 AC-3 committed stop exposes cleanup-pending without rollback', () => {
  it('stop after a settled mutation ends completed-with-cleanup-pending', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const events: { status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: mutationManifest({}, [
        { id: 'submit-1', action: 'submit' },
        { id: 'ready-1', action: 'wait-ready' },
      ]),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
      onEvent: (event) => events.push(event),
    });
    await runner.start();
    expect(runner.hasCommittedMutation()).toBe(true);
    runner.stop();
    expect(runner.getState()).toBe('completed-with-cleanup-pending');
    expect(executor).toHaveBeenCalledTimes(1);
    expect(events[0]).toMatchObject({
      status: 'settled',
      reason: 'DEMO_STEP_SETTLED',
    });
    // Pending pacing callbacks never run a second mutation step.
    for (const timer of kit.timers) timer.callback();
    await Promise.resolve();
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('stop without a settled mutation still cancels', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'click' },
        ],
      }),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
    });
    await runner.start();
    expect(runner.hasCommittedMutation()).toBe(false);
    runner.stop();
    expect(runner.getState()).toBe('cancelled');
  });

  it('stop during an in-flight gated submit waits, then cleanup-pending on settle', async () => {
    const kit = makeControllableScheduler();
    let resolveSubmit!: (
      value: 'settled' | { status: 'blocked'; reason: string },
    ) => void;
    const executor = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const events: { status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: mutationManifest({}, [
        { id: 'submit-1', action: 'submit' },
        { id: 'ready-1', action: 'wait-ready' },
      ]),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
      onEvent: (event) => events.push(event),
    });
    const started = runner.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(executor).toHaveBeenCalledTimes(1);
    runner.stop();
    // The gated submit is still awaiting the component: no false cancel.
    expect(runner.getState()).toBe('stopping');
    resolveSubmit('settled');
    await started;
    expect(runner.getState()).toBe('completed-with-cleanup-pending');
    expect(runner.hasCommittedMutation()).toBe(true);
    // No next action ran after Stop.
    expect(executor).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ status: 'settled' });
  });

  it('stop during an in-flight gated submit that blocks ends cancelled', async () => {
    const kit = makeControllableScheduler();
    let resolveSubmit!: (
      value: 'settled' | { status: 'blocked'; reason: string },
    ) => void;
    const executor = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const runner = createDemoRunner({
      manifest: mutationManifest({}, [
        { id: 'submit-1', action: 'submit' },
        { id: 'ready-1', action: 'wait-ready' },
      ]),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
    });
    const started = runner.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    runner.stop();
    expect(runner.getState()).toBe('stopping');
    resolveSubmit({
      status: 'blocked',
      reason: 'DEMO_STEP_READINESS_TIMEOUT',
    });
    await started;
    expect(runner.getState()).toBe('cancelled');
    expect(runner.hasCommittedMutation()).toBe(false);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('stop during a non-mutation in-flight action still cancels synchronously', async () => {
    const kit = makeControllableScheduler();
    let resolveClick!: (value: 'settled') => void;
    const executor = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveClick = resolve;
        }),
    );
    const events: { status: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-2', action: 'click' },
        ],
      }),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
      onEvent: (event) => events.push(event),
    });
    const started = runner.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    runner.stop();
    expect(runner.getState()).toBe('cancelled');
    resolveClick('settled');
    await started;
    expect(runner.getState()).toBe('cancelled');
    expect(executor).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(0);
  });

  it('pause during an in-flight gated submit blocks resume until it settles, with no duplicate', async () => {
    const kit = makeControllableScheduler();
    let resolveSubmit!: (value: 'settled') => void;
    const seen: string[] = [];
    const events: { stepId: string; status: string }[] = [];
    const executor = vi.fn().mockImplementation((step: { id: string }) => {
      seen.push(step.id);
      if (step.id === 'submit-1') {
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      }
      return 'settled';
    });
    const runner = createDemoRunner({
      manifest: mutationManifest({}, [
        { id: 'submit-1', action: 'submit' },
        { id: 'ready-1', action: 'wait-ready' },
      ]),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
      onEvent: (event) => events.push(event),
    });
    const started = runner.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    runner.pause();
    expect(runner.getState()).toBe('paused');
    // Resume while the gated submit is still awaiting must not schedule:
    // state stays paused, no timer, no second executor call.
    runner.resume();
    expect(runner.getState()).toBe('paused');
    expect(kit.timers).toHaveLength(0);
    expect(executor).toHaveBeenCalledTimes(1);
    resolveSubmit('settled');
    await started;
    // The late settled result is not lost and the cursor advanced past it.
    expect(runner.hasCommittedMutation()).toBe(true);
    expect(runner.getCursor()).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ stepId: 'submit-1', status: 'settled' });
    // Resume now proceeds with the next step only: no duplicate submit.
    runner.resume();
    expect(runner.getState()).toBe('running');
    kit.timers.at(-1)?.callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toEqual(['submit-1', 'ready-1']);
    expect(executor).toHaveBeenCalledTimes(2);
    expect(runner.getState()).toBe('completed');
  });

  it('blocks a mutation submit when prerequisites are absent, before any executor call', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const events: { status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: mutationManifest(),
      scheduler: kit.scheduler,
      executor,
      onEvent: (event) => events.push(event),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    expect(executor).not.toHaveBeenCalled();
    expect(runner.hasCommittedMutation()).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: 'blocked',
      reason: 'LIVE_MUTATION_BLOCKED_MODE',
    });
  });
});

describe('T-007 AC-4 safe replay reuses the dedupe contract; unsafe replay never mutates', () => {
  it('refuses unsafe replay before any executor call and stays terminal', async () => {
    const kit = makeControllableScheduler();
    const executor = vi.fn().mockReturnValue('settled');
    const events: { status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: mutationManifest({
        liveMutationPolicy: {
          fixtureRef: 'demo-incident-01',
          idempotencyStrategy: 'existing-idempotency-key',
          replay: 'blocked',
          cleanup: 'operator',
        },
      }),
      scheduler: kit.scheduler,
      executor,
      liveMutation: liveContext,
      onEvent: (event) => events.push(event),
    });
    await runner.start();
    expect(runner.getState()).toBe('completed');
    const callsAfterFirstRun = executor.mock.calls.length;
    await runner.replay();
    expect(runner.getState()).toBe('completed');
    expect(executor).toHaveBeenCalledTimes(callsAfterFirstRun);
    expect(events.at(-1)).toMatchObject({
      status: 'blocked',
      reason: 'LIVE_MUTATION_BLOCKED_REPLAY',
    });
  });

  it('allows safe replay exactly once through the existing contract', async () => {
    const kit = makeControllableScheduler();
    const seen: string[] = [];
    const runner = createDemoRunner({
      manifest: mutationManifest(),
      scheduler: kit.scheduler,
      executor: (step) => {
        seen.push(step.id);
        return 'settled';
      },
      liveMutation: liveContext,
    });
    await runner.start();
    expect(runner.getState()).toBe('completed');
    await runner.replay();
    expect(runner.getState()).toBe('completed');
    expect(seen).toEqual(['submit-1', 'submit-1']);
  });
});

describe('T-007 AC-3/AC-5 DemoCenter cleanup-pending and read-only default', () => {
  it('keeps the default manifest read-only with no policy or cleanup state', () => {
    expect(DEMO_DEFAULT_MANIFEST.mutationClass).toBe('none');
    expect(DEMO_DEFAULT_MANIFEST.liveMutationPolicy).toBeUndefined();
    expect(DEMO_DEFAULT_MANIFEST.version).toBe(DEMO_MANIFEST_VERSION);
    const html = renderToStaticMarkup(<DemoCenter target={readyTarget()} />);
    expect(html).toContain('Demo Center');
    expect(html).not.toContain('demo-cleanup-pending');
  });

  it('narrates cleanup-pending with Vietnamese operator handoff copy', () => {
    const narration = describeDemoNarrator({
      runState: 'completed-with-cleanup-pending',
      cursor: 1,
      total: 1,
      currentStepId: 'submit-1',
      lastStatus: 'settled',
      lastReason: 'DEMO_STEP_SETTLED',
      personaAlias: 'commander',
    });
    expect(narration).toContain('dọn dẹp');
    expect(narration).toContain('operator');
    const source = readFileSync(
      join(process.cwd(), 'src/components/demo/DemoCenter.tsx'),
      'utf8',
    );
    expect(source).toContain('demo-cleanup-pending');
    expect(source).toContain('createLiveMutationExecutor');
    expect(source).not.toContain('resetDemo');
    expect(source).not.toContain('scripts/demo/reset');
  });
});
