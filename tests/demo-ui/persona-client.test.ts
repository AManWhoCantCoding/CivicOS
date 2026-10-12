import { afterEach, describe, expect, it, vi } from 'vitest';

import { switchDemoPersonaClient } from '@/components/demo/demo-persona-client';

function okResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe('T-003 demo persona client fail-closed scope', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reloads scope after a well-formed authenticated payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        okResponse({
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
        }),
      ),
    );
    const reloadScope = vi.fn();
    const result = await switchDemoPersonaClient('commander', { reloadScope });
    expect(result.status).toBe('authenticated');
    expect(reloadScope).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing count', { assignmentState: 'ready' }],
    ['negative count', { assignmentCount: -1, assignmentState: 'empty' }],
    ['non-integer count', { assignmentCount: 1.5, assignmentState: 'ready' }],
    ['string count', { assignmentCount: '2', assignmentState: 'ready' }],
    ['bad state', { assignmentCount: 1, assignmentState: 'settled' }],
    [
      'non-string unit',
      { assignmentCount: 0, assignmentState: 'empty', organizationUnitId: 7 },
    ],
  ])(
    'rejects malformed scope %s without reload or authenticated state',
    async (_, scope) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          okResponse({
            status: 'authenticated',
            alias: 'commander',
            displayName: 'Commander demo',
            roleLabel: 'commander',
            expiresAt: '2026-10-20T00:00:00.000Z',
            scope,
          }),
        ),
      );
      const reloadScope = vi.fn();
      const result = await switchDemoPersonaClient('commander', {
        reloadScope,
      });
      expect(result).toEqual({
        status: 'blocked',
        reason: 'PERSONA_UNAVAILABLE',
      });
      expect(reloadScope).not.toHaveBeenCalled();
    },
  );

  it('passes through server rejection without reload and without secrets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: false,
            json: async () => ({ status: 'rejected', reason: 'UNKNOWN_ALIAS' }),
          }) as Response,
      ),
    );
    const reloadScope = vi.fn();
    const result = await switchDemoPersonaClient('root', { reloadScope });
    expect(result).toEqual({ status: 'rejected', reason: 'UNKNOWN_ALIAS' });
    expect(reloadScope).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('civicos-dev');
  });
});
