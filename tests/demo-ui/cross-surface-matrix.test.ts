import { describe, expect, it } from 'vitest';

import {
  B7_VERIFICATION_CATALOG,
  createVerificationMatrix,
  evaluateVerificationGate,
} from '@/modules/demo/verification-matrix';

describe('T-012 cross-surface verification matrix', () => {
  it('emits one terminal row per ordered B7 scenario', () => {
    const result = createVerificationMatrix({
      observations: B7_VERIFICATION_CATALOG.map((item) => ({
        scenarioId: item.scenarioId,
        stepId: item.stepId,
        status: item.expectedOutcome,
        durationMs: 12.8,
      })),
    });

    expect(result.rows.map((row) => row.scenarioId)).toEqual(
      B7_VERIFICATION_CATALOG.map((item) => item.scenarioId),
    );
    expect(result.rows).toHaveLength(B7_VERIFICATION_CATALOG.length);
    expect(result.rows.every((row) => row.durationMs === 12)).toBe(true);
    expect(
      result.rows.every((row) =>
        ['pass', 'blocked', 'deferred', 'failed'].includes(row.status),
      ),
    ).toBe(true);
    expect(evaluateVerificationGate(result.rows)).toMatchObject({
      decision: 'pass',
      handoff: true,
    });
  });

  it('accepts expected negative states but rejects unexpected blocked or failed rows', () => {
    const result = createVerificationMatrix({
      observations: [
        { scenarioId: 'B7-02', stepId: 'target', status: 'blocked' },
        { scenarioId: 'B7-01', stepId: 'start', status: 'blocked' },
      ],
    });

    expect(result.rows.find((row) => row.scenarioId === 'B7-02')?.status).toBe(
      'blocked',
    );
    expect(
      evaluateVerificationGate(
        result.rows.filter((row) => row.scenarioId === 'B7-01'),
      ).decision,
    ).toBe('blocked');
    expect(
      evaluateVerificationGate(
        result.rows.filter((row) => row.scenarioId === 'B7-01'),
      ).handoff,
    ).toBe(false);
  });

  it('keeps explicit coverage counts and defers missing operator evidence', () => {
    const result = createVerificationMatrix({ observations: [] });
    const gate = evaluateVerificationGate(result.rows);

    expect(gate.counts).toEqual({
      pass: 0,
      blocked: 0,
      deferred: 10,
      failed: 0,
    });
    expect(gate.decision).toBe('deferred');
    expect(gate.handoff).toBe(false);
  });

  it('does not pass forged, duplicate, or out-of-order rows', () => {
    const complete = createVerificationMatrix({
      observations: B7_VERIFICATION_CATALOG.map((item) => ({
        scenarioId: item.scenarioId,
        stepId: item.stepId,
        status: item.expectedOutcome,
      })),
    }).rows;

    expect(evaluateVerificationGate([...complete].reverse()).decision).toBe(
      'blocked',
    );
    expect(evaluateVerificationGate([...complete, complete[0]]).decision).toBe(
      'blocked',
    );
    expect(
      evaluateVerificationGate([
        ...complete.slice(0, -1),
        { ...complete[complete.length - 1], contractRef: 'UAD-99' as never },
      ]).decision,
    ).toBe('blocked');
  });
});
