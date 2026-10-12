import { describe, expect, it, vi } from 'vitest';

import { createDemoRunner } from '@/modules/demo/runner';
import { createWebActionExecutor } from '@/modules/demo/web-actions';
import { makeValidManifest } from './demo-manifest-fixture';

const detail = (value: unknown): string => JSON.stringify(value);

function statusOf(outcome: unknown): string {
  return typeof outcome === 'string'
    ? outcome
    : (outcome as { status: string }).status;
}

function reasonOf(outcome: unknown): string {
  return typeof outcome === 'string'
    ? ''
    : ((outcome as { reason?: string }).reason ?? '');
}

function makeEnv(extra: Record<string, unknown> = {}) {
  return {
    getDocument: () => ({
      querySelectorAll: () => [],
      activeElement: null,
    }),
    getPath: () => '/demo',
    ...extra,
  };
}

describe('T-005 AC-3 readiness settles before pacing', () => {
  it('waits for observable route state through the injected waiter', async () => {
    let seenTimeout = -1;
    const waitForExpectation = vi.fn(
      async (_expectation: unknown, timeoutMs: number) => {
        seenTimeout = timeoutMs;
        return true;
      },
    );
    const executor = createWebActionExecutor(makeEnv({ waitForExpectation }));
    const outcome = await executor({
      id: 'step-1',
      action: 'wait-ready',
      index: 0,
      detail: detail({
        path: '/ho-so',
        text: 'Ho so san sang',
        timeoutMs: 2000,
      }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(waitForExpectation).toHaveBeenCalledTimes(1);
    expect(seenTimeout).toBeGreaterThan(0);
    expect(seenTimeout).toBeLessThanOrEqual(10000);
  });

  it('bounds readiness timeout as a safe blocked outcome', async () => {
    let seenTimeout = -1;
    const waitForExpectation = vi.fn(
      async (_expectation: unknown, timeoutMs: number) => {
        seenTimeout = timeoutMs;
        return false;
      },
    );
    const executor = createWebActionExecutor(makeEnv({ waitForExpectation }));
    const outcome = await executor({
      id: 'step-1',
      action: 'wait-ready',
      index: 0,
      detail: detail({ path: '/ho-so', timeoutMs: 500 }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_READINESS_TIMEOUT');
    expect(JSON.stringify(outcome)).not.toContain('/ho-so-raw');
    expect(seenTimeout).toBeLessThanOrEqual(10000);
  });

  it('observes default browser readiness without an injected waiter', async () => {
    const ready = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [],
        activeElement: null,
        getBodyText: () => 'Trang Ho so san sang de demo',
      }),
      getPath: () => '/ho-so',
    });
    const settled = await ready({
      id: 'step-1',
      action: 'wait-ready',
      index: 0,
      detail: detail({ path: '/ho-so', text: 'Ho so san sang' }),
    });
    expect(statusOf(settled)).toBe('settled');

    const stale = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [],
        activeElement: null,
        getBodyText: () => 'Trang khac',
      }),
      getPath: () => '/demo',
    });
    const blocked = await stale({
      id: 'step-1',
      action: 'wait-ready',
      index: 0,
      detail: detail({ path: '/ho-so', text: 'Ho so san sang' }),
    });
    expect(statusOf(blocked)).toBe('blocked');
    expect(reasonOf(blocked)).toBe('DEMO_STEP_READINESS_TIMEOUT');
  });

  it('resolves default readiness promptly even with an oversized timeout', async () => {
    const executor = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [],
        activeElement: null,
      }),
      getPath: () => '/demo',
    });
    const outcome = await executor({
      id: 'step-1',
      action: 'wait-ready',
      index: 0,
      detail: detail({ path: '/khac', timeoutMs: 60000 }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_READINESS_TIMEOUT');
  });

  it('rejects wait-ready and assert-state without a declared expectation', async () => {
    const executor = createWebActionExecutor(
      makeEnv({ waitForExpectation: async () => true }),
    );
    for (const action of ['wait-ready', 'assert-state']) {
      const outcome = await executor({
        id: 'step-1',
        action,
        index: 0,
        detail: detail({}),
      });
      expect(statusOf(outcome)).toBe('blocked');
      expect(reasonOf(outcome)).toBe('DEMO_STEP_INVALID_DESCRIPTOR');
    }
  });

  it('uses the injected monotonic clock for the default readiness deadline', async () => {
    let current = 0;
    const stamps: number[] = [];
    const executor = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [],
        activeElement: null,
      }),
      getPath: () => '/demo',
      now: () => {
        stamps.push(current);
        return current;
      },
    });
    const frames: Array<() => void> = [];
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      frames.push(callback);
      return frames.length;
    });
    try {
      const pending = executor({
        id: 'step-1',
        action: 'wait-ready',
        index: 0,
        detail: detail({ path: '/khac', timeoutMs: 1000 }),
      });
      for (let i = 0; i < 5 && frames.length > 0; i += 1) {
        current += 500;
        frames.shift()?.();
      }
      const outcome = await pending;
      expect(statusOf(outcome)).toBe('blocked');
      expect(reasonOf(outcome)).toBe('DEMO_STEP_READINESS_TIMEOUT');
      expect(stamps.length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('asserts only safe observable state without raw payloads', async () => {
    const matching = createWebActionExecutor(
      makeEnv({ waitForExpectation: async () => true }),
    );
    const settled = await matching({
      id: 'step-1',
      action: 'assert-state',
      index: 0,
      detail: detail({ text: 'Ho so san sang' }),
      expectedState: 'running',
    });
    expect(statusOf(settled)).toBe('settled');

    const mismatching = createWebActionExecutor(
      makeEnv({ waitForExpectation: async () => false }),
    );
    const blocked = await mismatching({
      id: 'step-1',
      action: 'assert-state',
      index: 0,
      detail: detail({ text: 'Ho so san sang' }),
      expectedState: 'running',
    });
    expect(statusOf(blocked)).toBe('blocked');
    expect(reasonOf(blocked)).toBe('DEMO_STEP_ASSERT_MISMATCH');
    expect(JSON.stringify(blocked)).not.toContain('Ho so san sang chi tiet');
  });

  it('creates no pacing timer inside the adapter; pacing stays runner-owned', async () => {
    const schedule = vi.fn(() => ({}));
    const waitForExpectation = vi.fn(async () => true);
    const executor = createWebActionExecutor(makeEnv({ waitForExpectation }));
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          {
            id: 'step-1',
            action: 'wait-ready',
            detail: detail({ path: '/demo', timeoutMs: 500 }),
          },
          {
            id: 'step-2',
            action: 'assert-state',
            detail: detail({ path: '/demo' }),
          },
        ],
      }),
      scheduler: { schedule: schedule as never, cancel: () => {} },
      executor: (step) => executor(step),
    });
    await runner.start();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(waitForExpectation).toHaveBeenCalled();
  });
});
