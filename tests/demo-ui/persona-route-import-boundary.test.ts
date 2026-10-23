import { afterEach, describe, expect, it, vi } from 'vitest';

const identityModule = vi.hoisted(() => ({ loaded: false }));

vi.mock('@/modules/identity', () => {
  identityModule.loaded = true;
  return {
    authenticateLocal: vi.fn(),
    createSession: vi.fn(),
    deleteCurrentSession: vi.fn(),
    ensureDevelopmentUsers: vi.fn(),
    listAssignments: vi.fn(),
    sessionCookieName: 'civicos_session',
  };
});

const DEMO_URL =
  'postgresql://demo:placeholder@localhost:5432/civicos_demo?schema=public';
const OTHER_URL =
  'postgresql://app:placeholder@localhost:5432/civicos?schema=public';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('T-001 persona route import boundary', () => {
  // Ticket ref UAD-08 / T-001 AC-2: a non-demo target fails closed before
  // persona identity loads.
  it('blocks a non-demo runtime without loading the identity module', async () => {
    identityModule.loaded = false;
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATABASE_URL', OTHER_URL);
    vi.stubEnv('DEMO_DATABASE_URL', DEMO_URL);
    vi.stubEnv('CIVICOS_DEMO_PASSWORD', '');
    vi.resetModules();

    const { POST } = await import('@/app/api/demo/persona/route');
    const response = await POST(
      new Request('http://localhost/api/demo/persona', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alias: 'commander', mode: 'LIVE_DEMO' }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      status: 'blocked',
      reason: 'TARGET_NOT_READY',
    });
    expect(identityModule.loaded).toBe(false);
  });
});
