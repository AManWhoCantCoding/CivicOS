'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

export async function readResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === 'string' ? body.error : fallback;
}

export function FeedbackMessage({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: 'info' | 'success' | 'error' | 'warning';
}) {
  const toneClass = {
    info: 'border-slate-700 bg-slate-950/70 text-slate-300',
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    error: 'border-rose-400/30 bg-rose-950/30 text-rose-200',
    warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  }[tone];

  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {message}
    </p>
  );
}
