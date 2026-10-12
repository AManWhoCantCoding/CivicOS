import { describe, expect, it } from 'vitest';

import {
  B7_VERIFICATION_CATALOG,
  createVerificationMatrix,
} from '@/modules/demo/verification-matrix';

describe('T-012 verification redaction', () => {
  it('fails closed without copying unsafe observation fields', () => {
    const result = createVerificationMatrix({
      observations: [
        {
          scenarioId: 'B7-01',
          stepId: 'start',
          status: 'pass',
          reason: 'password=secret raw response lat=20.1',
          payload: { token: 'secret', email: 'person@example.com' },
          durationMs: 9_999_999_999,
        },
      ],
    });

    expect(result.rows[0]).toMatchObject({
      status: 'failed',
      reason: 'UNSAFE_OBSERVATION',
    });
    expect(JSON.stringify(result.rows[0])).not.toMatch(
      /password|secret|token|example|lat=|raw response/i,
    );
    expect(result.rows[0].durationMs).toBe(86_400_000);
  });

  it('maps every B7 scenario to its semantic approved contract owner', () => {
    expect(
      Object.fromEntries(
        B7_VERIFICATION_CATALOG.map((item) => [
          item.scenarioId,
          item.contractRef,
        ]),
      ),
    ).toEqual({
      'B7-01': 'UAD-09',
      'B7-02': 'UAD-10',
      'B7-03': 'UAD-09',
      'B7-04': 'UAD-09',
      'B7-05': 'UAD-09',
      'B7-06': 'UAD-12',
      'B7-07': 'UAD-13',
      'B7-08': 'UAD-11',
      'B7-09': 'UAD-09',
      'B7-10': 'UAD-10',
    });
  });
});
