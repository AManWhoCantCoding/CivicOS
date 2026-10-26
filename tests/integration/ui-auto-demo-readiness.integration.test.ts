import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { evaluateBridgeReadiness } from '@/modules/demo/readiness';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';
import { makeValidManifest } from '../demo-ui/demo-manifest-fixture';

const DEMO_URL =
  'postgresql://demo-user@localhost:5432/civicos?schema=public';

function readyTarget() {
  return evaluateDemoTargetGuard({
    demoModeEnabled: true,
    demoDatabaseUrl: DEMO_URL,
    databaseUrl: DEMO_URL,
  });
}

function readyInput() {
  return {
    bridge: 'ready' as const,
    device: 'ready' as const,
    api: 'ready' as const,
    worker: 'ready' as const,
    map: 'ready' as const,
    target: readyTarget(),
    mode: 'LIVE_DEMO',
    manifest: makeValidManifest({ surface: 'mobile' }),
  };
}

describe('T-008 AC-1 readiness ready matrix', () => {
  it('reports every dependency ready without raw URLs or secrets', async () => {
    const readiness = await evaluateBridgeReadiness(readyInput());
    expect(readiness.state).toBe('ready');
    expect(readiness.canStart).toBe(true);
    expect(readiness.dependencies).toEqual({
      bridge: 'ready',
      device: 'ready',
      api: 'ready',
      worker: 'ready',
      map: 'ready',
      target: 'ready',
      mode: 'ready',
      manifest: 'ready',
    });
    expect(readiness.reasons).toEqual([]);
    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('s3cret');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('token');
  });

  it('resolves injected async probes without owning them', async () => {
    const probes = {
      bridge: vi.fn(async () => 'ready' as const),
      device: vi.fn(() => 'ready' as const),
      api: vi.fn(async () => ({ status: 'ready' as const })),
    };
    const readiness = await evaluateBridgeReadiness({
      ...readyInput(),
      ...probes,
    });
    expect(readiness.state).toBe('ready');
    for (const probe of Object.values(probes)) {
      expect(probe).toHaveBeenCalledTimes(1);
    }
  });

  it('blocks safely when a readiness probe throws or rejects', async () => {
    const syncFailure = await evaluateBridgeReadiness({
      ...readyInput(),
      bridge: () => {
        throw new Error('private probe detail');
      },
    });
    const asyncFailure = await evaluateBridgeReadiness({
      ...readyInput(),
      device: Promise.reject(new Error('private async detail')),
    });

    expect(syncFailure.state).toBe('blocked');
    expect(syncFailure.dependencies.bridge).toBe('unknown');
    expect(asyncFailure.state).toBe('blocked');
    expect(asyncFailure.dependencies.device).toBe('unknown');
    expect(JSON.stringify(syncFailure)).not.toContain('private probe detail');
    expect(JSON.stringify(asyncFailure)).not.toContain('private async detail');
  });
});

describe('T-008 AC-2 missing dependency blocks with prerequisite', () => {
  it.each(['bridge', 'device', 'api', 'worker', 'map'] as const)(
    'blocks when %s is unavailable',
    async (key) => {
      const readiness = await evaluateBridgeReadiness({
        ...readyInput(),
        [key]: 'unavailable' as const,
      });
      expect(readiness.state).toBe('blocked');
      expect(readiness.canStart).toBe(false);
      expect(readiness.dependencies[key]).toBe('unavailable');
      expect(readiness.reasons.length).toBeGreaterThan(0);
      expect(readiness.reasons.join(' ')).toContain('operator');
      expect(JSON.stringify(readiness)).not.toContain('postgresql://');
    },
  );

  it.each(['bridge', 'device', 'api', 'worker', 'map'] as const)(
    'blocks when %s is unknown or missing',
    async (key) => {
      for (const value of ['unknown' as const, undefined]) {
        const readiness = await evaluateBridgeReadiness({
          ...readyInput(),
          [key]: value,
        });
        expect(readiness.state).toBe('blocked');
        expect(readiness.canStart).toBe(false);
        expect(readiness.reasons.length).toBeGreaterThan(0);
      }
    },
  );

  it('blocks when target, mode or manifest prerequisites fail', async () => {
    const blockedTarget = await evaluateBridgeReadiness({
      ...readyInput(),
      target: evaluateDemoTargetGuard({ demoModeEnabled: false }),
    });
    expect(blockedTarget.state).toBe('blocked');
    expect(blockedTarget.dependencies.target).toBe('unavailable');

    const staleMode = await evaluateBridgeReadiness({
      ...readyInput(),
      mode: 'LIVE_PROD',
    });
    expect(staleMode.state).toBe('blocked');
    expect(staleMode.dependencies.mode).toBe('unavailable');

    const badManifest = await evaluateBridgeReadiness({
      ...readyInput(),
      manifest: { version: '0' },
    });
    expect(badManifest.state).toBe('blocked');
    expect(badManifest.dependencies.manifest).toBe('unavailable');
  });

  it.each([
    { state: 'ready', target: 'civicos_demo' as const, canStart: true },
    {
      state: 'ready',
      target: 'civicos_demo_shadow' as const,
      canStart: true,
    },
    { state: 'ready', target: 'civicos' as const, canStart: false },
    'ready',
  ] as const)('rejects forged target readiness: %j', async (target) => {
    const readiness = await evaluateBridgeReadiness({
      ...readyInput(),
      target,
    });

    expect(readiness.state).toBe('blocked');
    expect(readiness.canStart).toBe(false);
    expect(['unavailable', 'unknown']).toContain(readiness.dependencies.target);
    expect(readiness.message).not.toContain('private');
  });

  it('requires a valid mobile manifest for bridge readiness', async () => {
    const webManifest = await evaluateBridgeReadiness({
      ...readyInput(),
      manifest: makeValidManifest({ surface: 'web' }),
    });

    expect(webManifest.state).toBe('blocked');
    expect(webManifest.canStart).toBe(false);
    expect(webManifest.dependencies.manifest).toBe('unavailable');
  });

  it('never owns process or infrastructure lifecycle', async () => {
    for (const file of [
      'src/modules/demo/bridge.ts',
      'src/modules/demo/readiness.ts',
    ]) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      for (const forbidden of [
        'spawn',
        'child_process',
        'execSync',
        'Metro',
        'TileServer',
        'demo:reset',
        'fetch(',
        'WebSocket',
        'setTimeout',
        'setInterval',
      ]) {
        expect(source).not.toContain(forbidden);
      }
    }
    const starter = vi.fn(() => 'ready' as const);
    await evaluateBridgeReadiness({ ...readyInput(), bridge: starter });
    expect(starter).toHaveBeenCalledTimes(1);
  });
});
