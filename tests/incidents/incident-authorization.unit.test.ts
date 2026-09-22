import { describe, expect, it } from 'vitest';

import {
  assertNoSelfApproval,
  assertTransferDecisionScope,
} from '@/modules/incidents';

function actor(roles: string[], organizationUnitId?: string) {
  return { id: 'actor-1', roles, organizationUnitId };
}

describe('incident approval separation of duties', () => {
  it('rejects self-approval before any transaction succeeds', () => {
    expect(() => assertNoSelfApproval('actor-1', 'actor-1')).toThrow(
      'SELF_APPROVAL_FORBIDDEN',
    );
    expect(() => assertNoSelfApproval('actor-1', 'actor-2')).not.toThrow();
    expect(() => assertNoSelfApproval('', 'actor-1')).not.toThrow();
  });

  it('allows the same-unit commander decision scope', () => {
    expect(() =>
      assertTransferDecisionScope({
        action: 'transfer',
        approvalOrganizationId: 'unit-nghia-tru',
        receivingOrganizationId: 'unit-cap-tren',
        actor: actor(['commander'], 'unit-nghia-tru'),
      }),
    ).not.toThrow();
  });

  it('allows the superior commander decision scope at the receiving unit', () => {
    expect(() =>
      assertTransferDecisionScope({
        action: 'transfer',
        approvalOrganizationId: 'unit-nghia-tru',
        receivingOrganizationId: 'unit-cap-tren',
        actor: actor(['superior_commander'], 'unit-cap-tren'),
      }),
    ).not.toThrow();
  });

  it('denies superior officer approval even at the receiving unit', () => {
    expect(() =>
      assertTransferDecisionScope({
        action: 'transfer',
        approvalOrganizationId: 'unit-nghia-tru',
        receivingOrganizationId: 'unit-cap-tren',
        actor: actor(['superior_officer'], 'unit-cap-tren'),
      }),
    ).toThrow('FORBIDDEN');
  });

  it('denies cross-unit commander approval for transfer decisions', () => {
    expect(() =>
      assertTransferDecisionScope({
        action: 'transfer',
        approvalOrganizationId: 'unit-nghia-tru',
        receivingOrganizationId: 'unit-cap-tren',
        actor: actor(['commander'], 'unit-cap-tren'),
      }),
    ).toThrow('FORBIDDEN');
  });

  it('denies transfer decisions without a receiving organization', () => {
    expect(() =>
      assertTransferDecisionScope({
        action: 'transfer',
        approvalOrganizationId: 'unit-nghia-tru',
        receivingOrganizationId: undefined,
        actor: actor(['superior_commander'], 'unit-cap-tren'),
      }),
    ).toThrow('FORBIDDEN');
  });

  it('denies field officers in every transfer decision scope', () => {
    expect(() =>
      assertTransferDecisionScope({
        action: 'transfer',
        approvalOrganizationId: 'unit-nghia-tru',
        receivingOrganizationId: 'unit-cap-tren',
        actor: actor(['field_officer'], 'unit-nghia-tru'),
      }),
    ).toThrow('FORBIDDEN');
  });
});
