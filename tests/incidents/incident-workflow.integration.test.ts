import { describe, expect, it } from 'vitest';

import { assertIncidentTransition } from '@/modules/incidents';

describe('Incident lifecycle', () => {
  it('allows the approved verification path', () => {
    expect(() =>
      assertIncidentTransition('received', 'classified'),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition('classified', 'verifying'),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition('verifying', 'resolved'),
    ).not.toThrow();
    expect(() => assertIncidentTransition('resolved', 'closed')).not.toThrow();
  });

  it('rejects skipping classification', () => {
    expect(() => assertIncidentTransition('received', 'resolved')).toThrow(
      'INVALID_INCIDENT_TRANSITION',
    );
  });
});
