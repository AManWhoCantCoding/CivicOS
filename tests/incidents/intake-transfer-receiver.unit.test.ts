import { describe, expect, it } from 'vitest';

import { isDirectParentReceiver } from '@/modules/incidents/commands';

type OwningUnit = { id: string; parentId: string | null };
type ReceiverUnit = { id: string; active: boolean };

function source(id: string, parentId: string | null): OwningUnit {
  return { id, parentId };
}

function receiver(id: string, active = true): ReceiverUnit {
  return { id, active };
}

describe('intake transfer receiver rule (D-02)', () => {
  // OrganizationUnit.parentId is the child's pointer to its own parent, so
  // the source OU 'commune' has parent 'upper' via source.parentId.
  it('accepts an active direct parent of the source OU regardless of level', () => {
    expect(
      isDirectParentReceiver(
        receiver('unit-cap-tren-huyen'),
        source('unit-xa', 'unit-cap-tren-huyen'),
      ),
    ).toBe(true);
    expect(
      isDirectParentReceiver(
        receiver('unit-tinh-cap-tren'),
        source('unit-xa', 'unit-tinh-cap-tren'),
      ),
    ).toBe(true);
  });

  it('rejects an active OU that is not the source OU direct parent', () => {
    expect(
      isDirectParentReceiver(
        receiver('unit-lien-quan'),
        source('unit-xa', 'unit-cap-tren'),
      ),
    ).toBe(false);
    expect(
      isDirectParentReceiver(
        receiver('unit-don-vi-khac'),
        source('unit-xa', null),
      ),
    ).toBe(false);
  });

  it('rejects a child OU even though its parentId points back at the source', () => {
    expect(
      isDirectParentReceiver(
        receiver('unit-con'),
        source('unit-xa', 'unit-cap-tren'),
      ),
    ).toBe(false);
  });

  it('rejects the source OU itself and inactive receivers', () => {
    expect(
      isDirectParentReceiver(receiver('unit-xa'), source('unit-xa', 'unit-xa')),
    ).toBe(false);
    expect(
      isDirectParentReceiver(
        receiver('unit-cap-tren', false),
        source('unit-xa', 'unit-cap-tren'),
      ),
    ).toBe(false);
  });

  it('rejects any receiver when the source OU is unknown', () => {
    expect(isDirectParentReceiver(receiver('unit-cap-tren'), null)).toBe(false);
    expect(
      isDirectParentReceiver(null, source('unit-xa', 'unit-cap-tren')),
    ).toBe(false);
  });
});
