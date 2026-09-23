'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  AssignmentScope,
  ModuleId,
  SessionScope,
} from '@/components/navigation/feature-registry';
import { FEATURES } from '@/components/navigation/feature-registry';

type SessionState = {
  session: SessionScope;
  assignments: AssignmentScope[];
  state: 'loading' | 'ready' | 'error';
  error: string | null;
  online: boolean;
  retry: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSessionUser(value: unknown): SessionScope {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('INVALID_SESSION_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === 'string')
  ) {
    throw new Error('INVALID_SESSION_RESPONSE');
  }
  return {
    id: value.id,
    roles: value.roles,
    organizationUnitId:
      typeof value.organizationUnitId === 'string'
        ? value.organizationUnitId
        : undefined,
  };
}

function parseAssignment(value: unknown): AssignmentScope | null {
  if (!isRecord(value)) return null;
  if (typeof value.task !== 'string' || typeof value.status !== 'string')
    return null;
  return {
    task: value.task,
    status: value.status,
    assigneeUserId:
      typeof value.assigneeUserId === 'string'
        ? value.assigneeUserId
        : undefined,
    organizationId:
      typeof value.organizationId === 'string' ? value.organizationId : null,
  };
}

async function readSession(): Promise<SessionScope> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !isRecord(body) || !('user' in body)) {
    throw new Error('SESSION_FAILED');
  }
  return parseSessionUser(body.user);
}

async function readOwnAssignments(): Promise<AssignmentScope[]> {
  const response = await fetch('/api/identity/assignments', {
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const body = (await response.json().catch(() => null)) as unknown;
  if (!isRecord(body) || !Array.isArray(body.assignments)) return [];
  const parsed: AssignmentScope[] = [];
  for (const entry of body.assignments) {
    const assignment = parseAssignment(entry);
    if (assignment) parsed.push(assignment);
  }
  return parsed;
}

export function useModuleSession(module: ModuleId): SessionState {
  const [session, setSession] = useState<SessionScope>(null);
  const [assignments, setAssignments] = useState<AssignmentScope[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    function sync() {
      setOnline(window.navigator.onLine);
    }
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    let active = true;
    function loadSession() {
      readSession()
        .then((nextSession) => {
          if (!active) return;
          setSession(nextSession);
          setAssignments([]);
          setError(null);
          setState('ready');
        })
        .catch(() => {
          if (!active) return;
          setError('Không thể tải phiên và phạm vi điều hướng.');
          setState('error');
        });
    }
    loadSession();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (state !== 'ready' || !session) return;
    const needsAssignments = FEATURES.some(
      (feature) =>
        feature.moduleId === module &&
        feature.requiresTask &&
        feature.visibleRoles.some((role) => session.roles.includes(role)) &&
        !(feature.bypassTaskRoles ?? []).some((role) =>
          session.roles.includes(role),
        ),
    );
    if (!needsAssignments) return;
    let active = true;
    function loadAssignments() {
      readOwnAssignments().then((nextAssignments) => {
        if (!active) return;
        setAssignments(nextAssignments);
      });
    }
    loadAssignments();
    return () => {
      active = false;
    };
  }, [module, state, session, reloadToken]);

  const retry = useCallback(() => {
    setState('loading');
    setError(null);
    setReloadToken((value) => value + 1);
  }, []);

  return { session, assignments, state, error, online, retry };
}
