import { describe, expect, it } from 'vitest';

import {
  assertChecklistComplete,
  assertInspectionTransition,
} from '@/modules/inspections';

describe('Inspection lifecycle', () => {
  it('requires an in-progress step before completion', () => {
    expect(() =>
      assertInspectionTransition('scheduled', 'in_progress'),
    ).not.toThrow();
    expect(() =>
      assertInspectionTransition('in_progress', 'completed'),
    ).not.toThrow();
    expect(() => assertInspectionTransition('scheduled', 'completed')).toThrow(
      'INVALID_INSPECTION_TRANSITION',
    );
  });

  it('requires every mandatory checklist item before completion', () => {
    expect(() =>
      assertChecklistComplete(
        [
          { key: 'license', required: true },
          { key: 'security', required: true },
        ],
        [{ key: 'license', value: 'valid' }],
      ),
    ).toThrow('CHECKLIST_ITEM_REQUIRED:security');
    expect(() =>
      assertChecklistComplete(
        [{ key: 'license', required: true }],
        [{ key: 'license', value: 'valid' }],
      ),
    ).not.toThrow();
  });
});
