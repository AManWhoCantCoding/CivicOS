import { describe, expect, it } from 'vitest';

import {
  mapDemoTerminalEvidence,
  serializeDemoEvidence,
} from '@/modules/demo/safe-evidence';
import { createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

describe('T-011 safe evidence', () => {
  it('keeps only the six safe fields and redacts untrusted values', () => {
    const evidence = serializeDemoEvidence({
      runId: 'run-1',
      sceneId: 'scene-1',
      stepId: 'step-1',
      status: 'completed',
      durationMs: 12.8,
      reason: 'password=secret',
      payload: 'postgresql://user:password@host/db',
      geometry: { lat: 20, lng: 105 },
    });

    expect(evidence).toEqual({
      runId: 'run-1',
      sceneId: 'scene-1',
      stepId: 'step-1',
      status: 'completed',
      durationMs: 12,
      reason: 'DEMO_STATE_UNKNOWN',
    });
    expect(Object.keys(evidence)).toHaveLength(6);
  });

  it('bounds duration and preserves an opaque run identity', () => {
    expect(
      serializeDemoEvidence({
        runId: 'demo-run-1',
        sceneId: 'scene',
        stepId: 'step',
        status: 'failed',
        durationMs: Number.POSITIVE_INFINITY,
        reason: 'DEMO_STEP_FAILED',
      }).durationMs,
    ).toBe(86_400_000);
    expect(
      serializeDemoEvidence({
        runId: 'secret token',
        sceneId: 'scene',
        stepId: 'step',
        status: 'failed',
        durationMs: -4,
        reason: 'DEMO_STEP_FAILED',
      }).runId,
    ).toBe('demo-run-unknown');
  });

  it('maps mutation and read-only terminal outcomes distinctly', () => {
    expect(
      mapDemoTerminalEvidence({
        runId: 'run-1',
        sceneId: 'scene',
        stepId: 'step',
        terminalState: 'completed',
        committedMutation: true,
        durationMs: 1,
      }),
    ).toMatchObject({
      status: 'completed-with-cleanup-pending',
      reason: 'DEMO_CLEANUP_OPERATOR_HANDOFF',
    });
    expect(
      mapDemoTerminalEvidence({
        runId: 'run-1',
        sceneId: 'scene',
        stepId: 'step',
        terminalState: 'completed',
        committedMutation: false,
        durationMs: 1,
      }),
    ).toMatchObject({
      status: 'completed',
      reason: 'DEMO_COMPLETED_NO_MUTATION',
    });
  });

  it('provides bounded run identity and deterministic duration metadata', async () => {
    let time = 0;
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'click' }],
      }),
      executor: () => 'settled',
      now: () => time,
    });

    await runner.start();
    time = 250;

    expect(runner.getRunId()).toMatch(/^demo-run-[0-9]+$/);
    expect(runner.getDurationMs()).toBe(250);
  });
});
