import { apiBaseUrl } from '../config';
import { assertReadOnly } from '../components/WriteGuard';

const sessionExpiryListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiryListeners.add(listener);
  return () => sessionExpiryListeners.delete(listener);
}

function notifySessionExpired() {
  for (const listener of sessionExpiryListeners) {
    try {
      listener();
    } catch {
      continue;
    }
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: unknown,
  ) {
    super(code);
  }
}

export async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof body === 'object' &&
      body &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `HTTP_${response.status}`;
    throw new ApiError(response.status, code, body);
  }
  return body as T;
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const offline =
    typeof navigator !== 'undefined' && navigator.onLine === false;
  const blocked = assertReadOnly(method, offline, path, init?.body);
  if (blocked) throw new ApiError(0, blocked.reason, blocked);
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: { accept: 'application/json', ...init?.headers },
    });
    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) notifySessionExpired();
      throw error;
    }
    throw new ApiError(0, 'OFFLINE', error);
  }
}
