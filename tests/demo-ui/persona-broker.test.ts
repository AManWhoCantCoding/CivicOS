import { describe, expect, it, vi } from 'vitest';

import {
  DEMO_PERSONA_ALLOWLIST,
  switchDemoPersona,
  type PersonaBrokerDeps,
  type PersonaBrokerRequest,
} from '@/modules/demo/persona-broker';

const READY_REQUEST: PersonaBrokerRequest = {
  alias: 'commander',
  mode: 'LIVE_DEMO',
  guardState: 'ready',
  target: 'civicos',
};

function makeDeps(overrides: Partial<PersonaBrokerDeps> = {}): {
  deps: PersonaBrokerDeps;
  calls: string[];
} {
  const calls: string[] = [];
  const deps: PersonaBrokerDeps = {
    providerAvailable: true,
    endCurrentSession: vi.fn(async () => {
      calls.push('end');
    }),
    authenticate: vi.fn(async () => {
      calls.push('auth');
      return {
        displayName: 'Commander demo',
        roleLabel: 'commander',
        organizationUnitId: 'unit-nghia-tru',
      };
    }),
    establishSession: vi.fn(async () => {
      calls.push('session');
      return { expiresAt: new Date('2026-10-20T00:00:00.000Z') };
    }),
    reloadScope: vi.fn(async () => {
      calls.push('scope');
      return { organizationUnitId: 'unit-nghia-tru', assignmentCount: 2 };
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe('T-003 AC-1 persona broker allowlist and safe summary', () => {
  it('allowlist only maps documented local/demo accounts', () => {
    const aliases = DEMO_PERSONA_ALLOWLIST.map((entry) => entry.alias);
    expect(aliases).toEqual(
      expect.arrayContaining([
        'commander',
        'duty',
        'field',
        'office',
        'unassigned',
      ]),
    );
    for (const entry of DEMO_PERSONA_ALLOWLIST) {
      expect(entry.email).toMatch(/@civicos\.local$/);
    }
  });

  it('authenticates an allowlisted alias with safe summary only', async () => {
    const { deps } = makeDeps();
    const result = await switchDemoPersona(READY_REQUEST, deps);
    expect(result).toEqual({
      status: 'authenticated',
      alias: 'commander',
      displayName: 'Commander demo',
      roleLabel: 'commander',
      expiresAt: '2026-10-20T00:00:00.000Z',
      scope: {
        organizationUnitId: 'unit-nghia-tru',
        assignmentCount: 2,
        assignmentState: 'ready',
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('civicos.local');
    expect(serialized).not.toContain('civicos-dev');
  });

  it('keeps an assignment-less persona empty without granting scope', async () => {
    const { deps } = makeDeps({
      reloadScope: async () => ({
        organizationUnitId: 'unit-nghia-tru',
        assignmentCount: 0,
      }),
    });
    const result = await switchDemoPersona(
      { ...READY_REQUEST, alias: 'unassigned' },
      deps,
    );
    expect(result.status).toBe('authenticated');
    if (result.status !== 'authenticated') return;
    expect(result.scope.assignmentCount).toBe(0);
    expect(result.scope.assignmentState).toBe('empty');
    expect('grant' in deps).toBe(false);
  });
});

describe('T-003 AC-3 switch ordering and scope reload', () => {
  it('ends old session -> authenticates -> establishes session -> reloads scope', async () => {
    const { deps, calls } = makeDeps();
    const result = await switchDemoPersona(
      { ...READY_REQUEST, alias: 'field' },
      deps,
    );
    expect(result.status).toBe('authenticated');
    expect(calls).toEqual(['end', 'auth', 'session', 'scope']);
    expect(deps.endCurrentSession).toHaveBeenCalledTimes(1);
    expect(deps.reloadScope).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid credentials without fallback or retry loop', async () => {
    const { deps } = makeDeps({
      authenticate: vi.fn(async () => null),
    });
    const result = await switchDemoPersona(READY_REQUEST, deps);
    expect(result).toEqual({ status: 'rejected', reason: 'AUTH_FAILED' });
    expect(deps.authenticate).toHaveBeenCalledTimes(1);
    expect(deps.establishSession).not.toHaveBeenCalled();
    expect(deps.reloadScope).not.toHaveBeenCalled();
  });

  it('maps scope reload failure to safe blocked without raw error', async () => {
    const { deps } = makeDeps({
      reloadScope: async () => {
        throw new Error('SELECT * FROM assignment -- raw detail');
      },
    });
    const result = await switchDemoPersona(READY_REQUEST, deps);
    expect(result).toEqual({ status: 'blocked', reason: 'SCOPE_FAILED' });
    expect(JSON.stringify(result)).not.toContain('SELECT');
  });

  it.each([
    ['non-date string', { expiresAt: 'not-a-date' }],
    ['null session', null],
    ['missing expiry', {}],
    ['numeric expiry', { expiresAt: 123 }],
  ])(
    'blocks malformed session %s instead of minting epoch expiry',
    async (_, session) => {
      const { deps } = makeDeps({
        establishSession: vi.fn(
          async () => session as unknown as { expiresAt: Date },
        ),
      });
      const result = await switchDemoPersona(READY_REQUEST, deps);
      expect(result).toEqual({ status: 'blocked', reason: 'SESSION_FAILED' });
      expect(JSON.stringify(result)).not.toContain('1970');
      expect(deps.reloadScope).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['null scope', null],
    ['negative count', { assignmentCount: -1 }],
    ['non-integer count', { assignmentCount: 1.5 }],
    ['string count', { assignmentCount: '2' }],
    ['missing count', { organizationUnitId: 'unit-nghia-tru' }],
  ])(
    'blocks malformed scope %s instead of coercing to empty',
    async (_, scope) => {
      const { deps } = makeDeps({
        reloadScope: vi.fn(
          async () => scope as unknown as { assignmentCount: number },
        ),
      });
      const result = await switchDemoPersona(READY_REQUEST, deps);
      expect(result).toEqual({ status: 'blocked', reason: 'SCOPE_FAILED' });
    },
  );
});
