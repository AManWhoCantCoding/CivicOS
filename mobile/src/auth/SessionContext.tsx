import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { onSessionExpired } from '../api/client';
import { getSession, logout } from '../api/session';
import type { SessionState } from '../api/session';

type SessionContextValue = {
  session: SessionState;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const refresh = useCallback(async () => {
    try {
      setSession(await getSession());
    } catch {
      setSession({ status: 'unauthenticated' });
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(
    () => onSessionExpired(() => setSession({ status: 'expired' })),
    [onSessionExpired],
  );
  const signOut = useCallback(async () => {
    await logout();
    setSession({ status: 'unauthenticated' });
  }, []);
  return (
    <SessionContext.Provider value={{ session, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SESSION_PROVIDER_REQUIRED');
  return value;
}
