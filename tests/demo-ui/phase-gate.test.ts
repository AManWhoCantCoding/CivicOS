import { describe, expect, it } from 'vitest';

import {
  B7_VERIFICATION_CATALOG,
  createVerificationMatrix,
  evaluateVerificationGate,
} from '@/modules/demo/verification-matrix';

describe('T-012 phase gate', () => {
  it('reports explicit coverage counts and blocks handoff for deferred evidence', () => {
    const complete = createVerificationMatrix({
      observations: B7_VERIFICATION_CATALOG.map((item) => ({
        scenarioId: item.scenarioId,
        stepId: item.stepId,
        status: item.expectedOutcome,
      })),
    });
    const completeGate = evaluateVerificationGate(complete.rows);

    expect(completeGate).toEqual({
      counts: { pass: 5, blocked: 5, deferred: 0, failed: 0 },
      decision: 'pass',
      handoff: true,
    });

    const deferredGate = evaluateVerificationGate(
      createVerificationMatrix({ observations: [] }).rows,
    );
    expect(deferredGate).toEqual({
      counts: { pass: 0, blocked: 0, deferred: 10, failed: 0 },
      decision: 'deferred',
      handoff: false,
    });
  });
});
