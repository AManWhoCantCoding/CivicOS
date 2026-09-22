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
  const toneStyle = {
    info: {
      borderColor: 'var(--civicos-border)',
      backgroundColor: 'var(--civicos-surface)',
      color: 'var(--civicos-text-muted)',
    },
    success: {
      borderColor: 'var(--civicos-success)',
      backgroundColor: 'var(--civicos-surface)',
      color: 'var(--civicos-text)',
    },
    error: {
      borderColor: 'var(--civicos-danger)',
      backgroundColor: 'var(--civicos-surface)',
      color: 'var(--civicos-text)',
    },
    warning: {
      borderColor: 'var(--civicos-warning)',
      backgroundColor: 'var(--civicos-surface)',
      color: 'var(--civicos-text)',
    },
  }[tone];

  return (
    <p
      className="civicos-feedback px-3 py-2 text-sm"
      style={toneStyle}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {message}
    </p>
  );
}
