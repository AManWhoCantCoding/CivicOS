import { describe, expect, it, vi } from 'vitest';

import { DEMO_ACTIONS, validateDemoManifest } from '@/modules/demo/manifest';
import { createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

describe('T-002 AC-1 manifest validation', () => {
  it('accepts every closed-vocabulary action with the current version', () => {
    for (const action of DEMO_ACTIONS) {
      const manifest = makeValidManifest({
        steps: [{ id: 'only-step', action }],
      });
      expect(validateDemoManifest(manifest)).toEqual({ ok: true });
    }
  });

  it('rejects an unknown action with a safe reason code', () => {
    const result = validateDemoManifest(
      makeValidManifest({
        steps: [{ id: 'step-1', action: 'delete-database' }],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('DEMO_MANIFEST_UNKNOWN_ACTION');
      expect(JSON.stringify(result)).not.toContain('delete-database');
    }
  });

  it('rejects unknown and malformed expected states', () => {
    const unknownState = validateDemoManifest(
      makeValidManifest({ expectedState: 'hyperdrive' }),
    );
    expect(unknownState.ok).toBe(false);
    if (!unknownState.ok) {
      expect(unknownState.reason).toBe('DEMO_MANIFEST_UNKNOWN_EXPECTED_STATE');
    }

    const malformedState = validateDemoManifest(
      makeValidManifest({
        steps: [{ id: 'step-1', action: 'click', expectedState: '  ' }],
      }),
    );
    expect(malformedState.ok).toBe(false);
  });

  it('rejects stale/unsupported and missing/blank version or ids', () => {
    expect(validateDemoManifest(makeValidManifest({ version: '0' })).ok).toBe(
      false,
    );
    expect(validateDemoManifest(makeValidManifest({ version: '   ' })).ok).toBe(
      false,
    );
    expect(validateDemoManifest(makeValidManifest({ scenarioId: '' })).ok).toBe(
      false,
    );
    expect(validateDemoManifest(makeValidManifest({ sceneId: '' })).ok).toBe(
      false,
    );
    const stale = validateDemoManifest(makeValidManifest({ version: '0' }));
    if (!stale.ok) {
      expect(stale.reason).toBe('DEMO_MANIFEST_VERSION_UNSUPPORTED');
    }
  });

  it('rejects empty steps and duplicate step ids', () => {
    expect(validateDemoManifest(makeValidManifest({ steps: [] })).ok).toBe(
      false,
    );
    const duplicated = validateDemoManifest(
      makeValidManifest({
        steps: [
          { id: 'step-1', action: 'click' },
          { id: 'step-1', action: 'submit' },
        ],
      }),
    );
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) {
      expect(duplicated.reason).toBe('DEMO_MANIFEST_DUPLICATE_STEP_ID');
    }
  });

  it('rejects unsafe explanation or payload content with a safe reason', () => {
    const unsafe = validateDemoManifest(
      makeValidManifest({
        explanation: 'Mat khau la password: s3cret, <script>alert(1)</script>',
      }),
    );
    expect(unsafe.ok).toBe(false);
    if (!unsafe.ok) {
      expect(unsafe.reason).toBe('DEMO_MANIFEST_UNSAFE_CONTENT');
      expect(JSON.stringify(unsafe)).not.toContain('s3cret');
    }
  });

  it('never throws on non-string surface, mutation class or step action', () => {
    const cases = [
      makeValidManifest({ surface: 42 as unknown as string }),
      makeValidManifest({ surface: null as unknown as string }),
      makeValidManifest({ mutationClass: 7 as unknown as string }),
      makeValidManifest({ mutationClass: {} as unknown as string }),
      makeValidManifest({
        steps: [{ id: 'step-1', action: 99 as unknown as string }],
      }),
      makeValidManifest({
        steps: [{ id: 'step-1', action: null as unknown as string }],
      }),
      makeValidManifest({ surface: 'WEb' }),
    ];
    for (const malformed of cases) {
      let result;
      expect(() => {
        result = validateDemoManifest(malformed);
      }).not.toThrow();
      expect(result!.ok).toBe(false);
    }
    expect(
      validateDemoManifest(makeValidManifest({ surface: 42 as never })),
    ).toEqual({ ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_SURFACE' });
    expect(
      validateDemoManifest(makeValidManifest({ mutationClass: 7 as never })),
    ).toEqual({ ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_MUTATION_CLASS' });
    expect(
      validateDemoManifest(
        makeValidManifest({
          steps: [{ id: 'step-1', action: 99 as never }],
        }),
      ),
    ).toEqual({ ok: false, reason: 'DEMO_MANIFEST_UNKNOWN_ACTION' });
  });

  it('invalid manifests never invoke the executor', async () => {
    const executor = vi.fn().mockReturnValue('settled');
    const events: { action: string; status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'drop-table' }],
      }),
      executor,
      onEvent: (event) =>
        events.push(
          event as { action: string; status: string; reason: string },
        ),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    expect(executor).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe('blocked');
    expect(DEMO_ACTIONS as readonly string[]).toContain(events[0]?.action);
    expect(events[0]?.reason).toBe('DEMO_MANIFEST_UNKNOWN_ACTION');
  });
});
