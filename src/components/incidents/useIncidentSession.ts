'use client';

import { useEffect, useState } from 'react';

export type IncidentSession = {
  userId: string;
  roles: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Session roles for action visibility; the API remains the security boundary. */
export function useIncidentSession() {
  const [session, setSession] = useState<IncidentSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as unknown;
        if (!active) return;
        if (
          response.ok &&
          isRecord(body) &&
          isRecord(body.user) &&
          typeof body.user.id === 'string' &&
          Array.isArray(body.user.roles) &&
          body.user.roles.every((role) => typeof role === 'string')
        ) {
          setSession({ userId: body.user.id, roles: body.user.roles });
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { session, loaded };
}

/** Command-role check shared by incident action surfaces. */
export function holdsCommandRole(roles: readonly string[]): boolean {
  return (
    roles.includes('commander') || roles.includes('superior_commander')
  );
}
