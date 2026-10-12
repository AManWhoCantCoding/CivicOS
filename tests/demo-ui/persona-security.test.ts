import { describe, expect, it, vi } from 'vitest';

import {
  switchDemoPersona,
  type PersonaBrokerDeps,
  type PersonaBrokerRequest,
} from '@/modules/demo/persona-broker';

const BASE: PersonaBrokerRequest = {
  alias: 'commander',
  mode: 'LIVE_DEMO',
  guardState: 'ready',
  target: 'civicos_demo',
};

function makeDeps(
  overrides: Partial<PersonaBrokerDeps> = {},
): PersonaBrokerDeps {
  return {
    providerAvailable: true,
    endCurrentSession: vi.fn(),
    authenticate: vi.fn(async () => ({
      displayName: 'Commander demo',
      roleLabel: 'commander',
      organizationUnitId: 'unit-nghia-tru',
    })),
    establishSession: vi.fn(async () => ({
      expiresAt: new Date('2026-10-20T00:00:00.000Z'),
    })),
    reloadScope: vi.fn(async () => ({
      organizationUnitId: 'unit-nghia-tru',
      assignmentCount: 1,
    })),
    ...overrides,
  };
}

describe('T-003 AC-2 persona broker fail-closed rejections', () => {
  it.each([[''], ['   '], ['root'], ['admin'], ['commander;DROP']])(
    'rejects unknown alias %j without touching the provider',
    async (alias) => {
      const deps = makeDeps();
      const result = await switchDemoPersona({ ...BASE, alias }, deps);
      expect(result).toEqual({ status: 'rejected', reason: 'UNKNOWN_ALIAS' });
      expect(deps.endCurrentSession).not.toHaveBeenCalled();
      expect(deps.authenticate).not.toHaveBeenCalled();
      expect(deps.establishSession).not.toHaveBeenCalled();
      expect(deps.reloadScope).not.toHaveBeenCalled();
    },
  );

  it.each([[null], [undefined], [42], [{ alias: 'commander' }]])(
    'rejects non-string alias %j without throwing or provider work',
    async (alias) => {
      const deps = makeDeps();
      const result = await switchDemoPersona(
        { ...BASE, alias: alias as unknown as string },
        deps,
      );
      expect(result).toEqual({ status: 'rejected', reason: 'UNKNOWN_ALIAS' });
      expect(deps.endCurrentSession).not.toHaveBeenCalled();
      expect(deps.authenticate).not.toHaveBeenCalled();
      expect(deps.establishSession).not.toHaveBeenCalled();
      expect(deps.reloadScope).not.toHaveBeenCalled();
    },
  );
  it.each([[''], ['live_demo'], ['LIVE'], ['REPLAY']])(
    'rejects non-LIVE_DEMO mode %j before any session work',
    async (mode) => {
      const deps = makeDeps();
      const result = await switchDemoPersona({ ...BASE, mode }, deps);
      expect(result).toEqual({ status: 'rejected', reason: 'INVALID_MODE' });
      expect(deps.endCurrentSession).not.toHaveBeenCalled();
      expect(deps.authenticate).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ guardState: 'blocked' as const, target: 'civicos_demo' as const }],
    [{ guardState: 'ready' as const, target: 'forbidden' as const }],
    [{ guardState: 'ready' as const, target: 'unknown' as const }],
    [{ guardState: 'blocked' as const, target: 'forbidden' as const }],
  ])('blocks non-ready target %j before any session work', async (guard) => {
    const deps = makeDeps();
    const result = await switchDemoPersona({ ...BASE, ...guard }, deps);
    expect(result).toEqual({ status: 'blocked', reason: 'TARGET_NOT_READY' });
    expect(deps.endCurrentSession).not.toHaveBeenCalled();
    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  it('blocks when the local/demo provider is unavailable', async () => {
    const deps = makeDeps({ providerAvailable: false });
    const result = await switchDemoPersona(BASE, deps);
    expect(result).toEqual({
      status: 'blocked',
      reason: 'PROVIDER_UNAVAILABLE',
    });
    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  it.each([
    ['number result', 42],
    ['string result', 'ok'],
    ['missing display name', { roleLabel: 'commander' }],
    ['missing role label', { displayName: 'Commander demo' }],
    ['empty role label', { displayName: 'Commander demo', roleLabel: '' }],
  ])(
    'rejects malformed provider %s without establishing a session',
    async (_, value) => {
      const deps = makeDeps({
        authenticate: vi.fn(async () => value as unknown as null),
      });
      const result = await switchDemoPersona(BASE, deps);
      expect(result).toEqual({
        status: 'rejected',
        reason: 'PROVIDER_INVALID',
      });
      expect(deps.establishSession).not.toHaveBeenCalled();
      expect(deps.reloadScope).not.toHaveBeenCalled();
    },
  );

  it('maps a thrown provider error to safe blocked without raw detail', async () => {
    const deps = makeDeps({
      authenticate: async () => {
        throw new Error('scrypt failed: raw-provider-secret');
      },
    });
    const result = await switchDemoPersona(BASE, deps);
    expect(result).toEqual({ status: 'blocked', reason: 'PROVIDER_FAILED' });
    expect(JSON.stringify(result)).not.toContain('raw-provider-secret');
    expect(deps.establishSession).not.toHaveBeenCalled();
  });

  it('never discloses password, token, cookie, email or raw errors', async () => {
    const evil = {
      displayName: 'Commander demo',
      roleLabel: 'commander',
      organizationUnitId: 'unit-nghia-tru',
      password: 'civicos-dev',
      token: 'tok-secret',
      cookie: 'civicos_session=abc',
      email: 'commander@civicos.local',
    };
    const deps = makeDeps({
      authenticate: async () => evil as unknown as never,
    });
    const result = await switchDemoPersona(BASE, deps);
    const serialized = JSON.stringify(result);
    for (const secret of [
      'civicos-dev',
      'tok-secret',
      'civicos_session',
      'civicos.local',
      'password',
      'token',
      'cookie',
      'email',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
