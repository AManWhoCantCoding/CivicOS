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
        className="text-sm text-slate-500"
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
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void retry()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
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
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300 hover:text-white"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-slate-200">{user.name}</p>
        <p className="text-xs text-slate-500">
          {user.roles.join(' · ')} · {user.email}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loggingOut}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
      {error ? (
        <p className="basis-full text-right text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
