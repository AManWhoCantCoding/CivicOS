import { NextResponse } from 'next/server';

import type { IdentityUser } from '@/modules/identity';
import {
  switchDemoPersona,
  type PersonaBrokerRequest,
} from '@/modules/demo/persona-broker';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';
import { dbNameFromUrl } from '../../../../../scripts/demo/demo-db';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Prisma connects with DATABASE_URL at runtime. The demo guard resolver
 * prefers DEMO_DATABASE_URL, so verify the actual runtime database here and
 * fail closed when it is not exactly civicos_demo. Read-only; never mutates env.
 */
function isRuntimeDemoDatabase(): boolean {
  const raw = process.env.DATABASE_URL;
  if (!raw) return false;
  try {
    return dbNameFromUrl(raw) === 'civicos_demo';
  } catch {
    return false;
  }
}

function statusFor(reason: string): number {
  if (reason === 'AUTH_FAILED') return 401;
  if (reason === 'TARGET_NOT_READY') return 403;
  if (
    reason === 'PROVIDER_UNAVAILABLE' ||
    reason === 'PROVIDER_FAILED' ||
    reason === 'SESSION_FAILED' ||
    reason === 'SCOPE_FAILED'
  ) {
    return 503;
  }
  return 400;
}

/**
 * Local/demo-only persona broker. Disabled in production, guarded by explicit
 * LIVE_DEMO mode and the exact runtime civicos_demo target before any
 * identity call. Composes the existing auth boundary and sets the same
 * httpOnly session cookie as /api/auth/session.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const nodeEnv: string = process.env.NODE_ENV ?? '';
  if (nodeEnv === 'production') {
    return NextResponse.json(
      { status: 'blocked', reason: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const alias =
    isRecord(body) && typeof body.alias === 'string' ? body.alias : '';
  const mode = isRecord(body) && typeof body.mode === 'string' ? body.mode : '';

  const guard = evaluateDemoTargetGuard({
    demoModeEnabled: mode === 'LIVE_DEMO',
    demoDatabaseUrl: process.env.DEMO_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
  });

  // A stale DEMO_DATABASE_URL must never authenticate against a non-demo
  // runtime: force the guard closed unless the live DATABASE_URL is demo.
  const runtimeIsDemo = isRuntimeDemoDatabase();
  const brokerRequest: PersonaBrokerRequest = {
    alias,
    mode,
    guardState: runtimeIsDemo ? guard.state : 'blocked',
    target: runtimeIsDemo ? guard.target : 'forbidden',
  };

  // Server-only development credential; never leaves the server boundary.
  const demoPassword =
    process.env.CIVICOS_DEMO_PASSWORD ??
    (nodeEnv === 'production' ? '' : 'civicos-dev');

  let authedUser: IdentityUser | null = null;
  let sessionToken = '';
  let identityModule: typeof import('@/modules/identity') | undefined;
  const loadIdentity = async () => {
    identityModule ??= await import('@/modules/identity');
    return identityModule;
  };

  const result = await switchDemoPersona(brokerRequest, {
    providerAvailable: demoPassword.length > 0,
    endCurrentSession: async () =>
      (await loadIdentity()).deleteCurrentSession(),
    authenticate: async (email: string) => {
      const identity = await loadIdentity();
      if (nodeEnv !== 'production') await identity.ensureDevelopmentUsers();
      const user = await identity.authenticateLocal(email, demoPassword);
      if (!user) return null;
      authedUser = user;
      return {
        displayName: user.name,
        roleLabel: user.roles[0] ?? 'field_officer',
        ...(user.organizationUnitId
          ? { organizationUnitId: user.organizationUnitId }
          : {}),
      };
    },
    establishSession: async () => {
      if (!authedUser) throw new Error('SESSION_FAILED');
      const identity = await loadIdentity();
      const session = await identity.createSession(authedUser.id);
      sessionToken = session.token;
      return { expiresAt: session.expiresAt };
    },
    reloadScope: async () => {
      if (!authedUser) throw new Error('SCOPE_FAILED');
      const identity = await loadIdentity();
      const assignments = await identity.listAssignments({ actor: authedUser });
      return {
        ...(authedUser.organizationUnitId
          ? { organizationUnitId: authedUser.organizationUnitId }
          : {}),
        assignmentCount: assignments.length,
      };
    },
  }).catch(() => ({
    status: 'blocked' as const,
    reason: 'PERSONA_UNAVAILABLE',
  }));

  if (result.status !== 'authenticated') {
    return NextResponse.json(result, { status: statusFor(result.reason) });
  }
  const response = NextResponse.json(result);
  response.cookies.set(identityModule!.sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    expires: new Date(result.expiresAt),
    path: '/',
  });
  return response;
}
