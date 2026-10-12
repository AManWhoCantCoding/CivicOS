import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/identity', () => ({
  authenticateLocal: vi.fn(),
  createSession: vi.fn(),
  deleteCurrentSession: vi.fn(),
  ensureDevelopmentUsers: vi.fn(),
  listAssignments: vi.fn(),
  sessionCookieName: 'civicos_session',
}));

import { POST } from '@/app/api/demo/persona/route';
import {
  authenticateLocal,
  createSession,
  deleteCurrentSession,
  ensureDevelopmentUsers,
  listAssignments,
} from '@/modules/identity';

const DEMO_URL =
  'postgresql://demo-user:pw@localhost:5432/civicos_demo?schema=public';
const PROD_URL =
  'postgresql://app-user:pw@localhost:5432/civicos?schema=public';

const mocked = {
  authenticateLocal: vi.mocked(authenticateLocal),
  createSession: vi.mocked(createSession),
  deleteCurrentSession: vi.mocked(deleteCurrentSession),
  ensureDevelopmentUsers: vi.mocked(ensureDevelopmentUsers),
  listAssignments: vi.mocked(listAssignments),
};

function post(body: unknown): Request {
  return new Request('http://localhost/api/demo/persona', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('T-003 demo persona route guard boundary', () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    process.env = { ...env } as typeof process.env;
    vi.stubEnv('NODE_ENV', 'test');
    process.env.DATABASE_URL = DEMO_URL;
    delete process.env.DEMO_DATABASE_URL;
    delete process.env.CIVICOS_DEMO_PASSWORD;
    mocked.authenticateLocal.mockResolvedValue(null);
  });

  it('is disabled in production before any identity call', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await POST(
      post({ alias: 'commander', mode: 'LIVE_DEMO' }),
    );
    expect(response.status).toBe(404);
    expect(mocked.deleteCurrentSession).not.toHaveBeenCalled();
    expect(mocked.authenticateLocal).not.toHaveBeenCalled();
    expect(mocked.createSession).not.toHaveBeenCalled();
    const body = (await response.json()) as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('civicos-dev');
  });

  it('rejects non-LIVE_DEMO mode before any identity call', async () => {
    const response = await POST(post({ alias: 'commander', mode: 'REPLAY' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      status: 'rejected',
      reason: 'INVALID_MODE',
    });
    expect(mocked.deleteCurrentSession).not.toHaveBeenCalled();
    expect(mocked.authenticateLocal).not.toHaveBeenCalled();
  });

  it('blocks a production target before any identity call', async () => {
    process.env.DATABASE_URL = PROD_URL;
    const response = await POST(
      post({ alias: 'commander', mode: 'LIVE_DEMO' }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      status: 'blocked',
      reason: 'TARGET_NOT_READY',
    });
    expect(mocked.deleteCurrentSession).not.toHaveBeenCalled();
    expect(mocked.authenticateLocal).not.toHaveBeenCalled();
  });

  it('blocks when the runtime DATABASE_URL is not demo even if DEMO_DATABASE_URL is', async () => {
    process.env.DATABASE_URL = PROD_URL;
    process.env.DEMO_DATABASE_URL = DEMO_URL;
    const response = await POST(
      post({ alias: 'commander', mode: 'LIVE_DEMO' }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      status: 'blocked',
      reason: 'TARGET_NOT_READY',
    });
    expect(mocked.deleteCurrentSession).not.toHaveBeenCalled();
    expect(mocked.authenticateLocal).not.toHaveBeenCalled();
    expect(mocked.createSession).not.toHaveBeenCalled();
    expect(mocked.listAssignments).not.toHaveBeenCalled();
    expect(process.env.DATABASE_URL).toBe(PROD_URL);
    expect(process.env.DEMO_DATABASE_URL).toBe(DEMO_URL);
  });

  it('rejects an unknown alias before any identity call', async () => {
    const response = await POST(post({ alias: 'root', mode: 'LIVE_DEMO' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      status: 'rejected',
      reason: 'UNKNOWN_ALIAS',
    });
    expect(mocked.authenticateLocal).not.toHaveBeenCalled();
  });

  it('switches persona with old-session end first and httpOnly cookie semantics', async () => {
    mocked.authenticateLocal.mockResolvedValue({
      id: 'dev-commander',
      email: 'commander@civicos.local',
      name: 'Commander workflow fixture',
      roles: ['commander'],
      organizationUnitId: 'unit-nghia-tru',
    });
    mocked.createSession.mockResolvedValue({
      token: 'opaque-token',
      expiresAt: new Date('2026-10-20T00:00:00.000Z'),
    });
    mocked.listAssignments.mockResolvedValue([
      { task: 'incident_verification', status: 'active' },
    ] as never);

    const response = await POST(
      post({ alias: 'commander', mode: 'LIVE_DEMO' }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      status: 'authenticated',
      alias: 'commander',
      displayName: 'Commander workflow fixture',
      roleLabel: 'commander',
      expiresAt: '2026-10-20T00:00:00.000Z',
      scope: {
        organizationUnitId: 'unit-nghia-tru',
        assignmentCount: 1,
        assignmentState: 'ready',
      },
    });
    const serialized = JSON.stringify(body);
    for (const secret of [
      'civicos.local',
      'civicos-dev',
      'opaque-token',
      'civicos_session',
    ]) {
      expect(serialized).not.toContain(secret);
    }

    const cookie = response.cookies.get('civicos_session');
    expect(cookie?.value).toBe('opaque-token');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');

    const order = [
      mocked.deleteCurrentSession.mock.invocationCallOrder[0],
      mocked.authenticateLocal.mock.invocationCallOrder[0],
      mocked.createSession.mock.invocationCallOrder[0],
      mocked.listAssignments.mock.invocationCallOrder[0],
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(mocked.ensureDevelopmentUsers).toHaveBeenCalled();
  });

  it('returns safe 401 without cookie when credentials are invalid', async () => {
    mocked.authenticateLocal.mockResolvedValue(null);
    const response = await POST(post({ alias: 'field', mode: 'LIVE_DEMO' }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      status: 'rejected',
      reason: 'AUTH_FAILED',
    });
    expect(response.cookies.get('civicos_session')).toBeUndefined();
    expect(mocked.createSession).not.toHaveBeenCalled();
  });
});
