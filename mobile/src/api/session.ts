import { ApiError, requestJson } from './client';

export type SessionStatus =
  'loading' | 'authenticated' | 'unauthenticated' | 'expired';
export type SessionUser = {
  id: string;
  name?: string;
  roles: string[];
  organizationUnitId?: string;
};
export type SessionState = {
  status: SessionStatus;
  user?: SessionUser;
};

export function sessionStateFromResponse(
  status: number,
  body: unknown,
): SessionState {
  if (status === 401) return { status: 'expired' };
  if (typeof body === 'object' && body && 'user' in body && body.user) {
    const user = body.user as {
      id?: unknown;
      name?: unknown;
      roles?: unknown;
      organizationUnitId?: unknown;
    };
    if (typeof user.id === 'string')
      return {
        status: 'authenticated',
        user: {
          id: user.id,
          name: typeof user.name === 'string' ? user.name : undefined,
          roles: Array.isArray(user.roles)
            ? user.roles.filter(
                (role): role is string => typeof role === 'string',
              )
            : [],
          organizationUnitId:
            typeof user.organizationUnitId === 'string'
              ? user.organizationUnitId
              : undefined,
        },
      };
  }
  return { status: 'unauthenticated' };
}

export async function getSession(): Promise<SessionState> {
  try {
    const body = await requestJson<unknown>('/api/auth/session');
    return sessionStateFromResponse(200, body);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return { status: 'expired' };
    throw error;
  }
}

export function login(email: string, password: string) {
  return requestJson('/api/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return requestJson('/api/auth/session', { method: 'DELETE' });
}
