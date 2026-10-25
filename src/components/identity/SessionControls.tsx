'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SessionUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSessionUser(value: unknown): SessionUser | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('INVALID_SESSION_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === 'string')
  ) {
    throw new Error('INVALID_SESSION_RESPONSE');
  }
  return {
    id: value.id,
    email: value.email,
    name: value.name,
    roles: value.roles,
  };
}

async function readSession(): Promise<SessionUser | null> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !isRecord(body) || !('user' in body)) {
    throw new Error(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'SESSION_FAILED',
    );
  }
  return parseSessionUser(body.user);
}

export function SessionControls() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    readSession()
      .then((nextUser) => {
        if (!active) return;
        setUser(nextUser);
        setState('ready');
      })
      .catch(() => {
        if (!active) return;
        setError('Không thể kiểm tra phiên đăng nhập.');
        setState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  async function retry() {
    setState('loading');
    setError(null);
    try {
      setUser(await readSession());
      setState('ready');
    } catch {
      setError('Không thể kiểm tra phiên đăng nhập.');
      setState('error');
    }
  }

  async function logout() {
    setLoggingOut(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/session', { method: 'DELETE' });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !isRecord(body) || body.ok !== true) {
        throw new Error('LOGOUT_FAILED');
      }
      setUser(null);
      setState('ready');
      router.push('/login');
      router.refresh();
    } catch {
      setError('Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setLoggingOut(false);
    }
  }

  if (state === 'loading') {
    return (
      <span
        className="text-sm text-[var(--civicos-text-muted)]"
        aria-live="polite"
        aria-busy="true"
      >
        Đang kiểm tra phiên…
      </span>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p
          className="text-sm break-words text-[var(--civicos-danger)]"
          role="alert"
        >
          {error}
        </p>
        <button
          type="button"
          onClick={() => void retry()}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] transition hover:border-[var(--civicos-accent)]"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
          style={{
            borderColor: 'var(--civicos-border)',
            background: 'var(--civicos-surface-muted)',
            color: 'var(--civicos-text)',
          }}
        >
          {user.name.trim().charAt(0) || '?'}
        </span>
        <div className="text-right">
          <p className="text-sm font-medium break-words text-[var(--civicos-text)]">
            {user.name}
          </p>
          <p className="text-xs break-words text-[var(--civicos-text-muted)]">
            {user.roles.join(' · ')} · {user.email}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loggingOut}
        className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] transition hover:border-[var(--civicos-accent)] disabled:cursor-wait disabled:opacity-60"
      >
        {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
      {error ? (
        <p
          className="basis-full text-right text-xs break-words text-[var(--civicos-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
