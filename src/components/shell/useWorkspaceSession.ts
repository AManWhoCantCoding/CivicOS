'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  AssignmentScope,
  SessionScope,
} from '@/components/navigation/feature-registry';

export type WorkspaceSessionState = {
  session: SessionScope;
  assignments: AssignmentScope[];
  sessionState: 'loading' | 'ready' | 'error';
  assignmentState: 'loading' | 'ready' | 'error';
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

// Same existing assignment read as useModuleSession, but a failed read is a
// fail-closed navigation error instead of silent empty assignments.
async function readOwnAssignments(): Promise<AssignmentScope[]> {
  const response = await fetch('/api/identity/assignments', {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('ASSIGNMENTS_FAILED');
  const body = (await response.json().catch(() => null)) as unknown;
  if (!isRecord(body) || !Array.isArray(body.assignments)) {
    throw new Error('INVALID_ASSIGNMENTS_RESPONSE');
  }
  const parsed: AssignmentScope[] = [];
  for (const entry of body.assignments) {
    const assignment = parseAssignment(entry);
    if (assignment) parsed.push(assignment);
  }
  return parsed;
}

export function useWorkspaceSession(): WorkspaceSessionState {
  const [session, setSession] = useState<SessionScope>(null);
  const [assignments, setAssignments] = useState<AssignmentScope[]>([]);
  const [sessionState, setSessionState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [assignmentState, setAssignmentState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
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
    readSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAssignments([]);
        setSessionState('ready');
        // Without a session there is no assignment read; stay ready without
        // rendering any navigation inventory.
        if (!nextSession) setAssignmentState('ready');
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setAssignments([]);
        setSessionState('error');
        setAssignmentState('ready');
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (sessionState !== 'ready' || !session) return;
    let active = true;
    readOwnAssignments()
      .then((nextAssignments) => {
        if (!active) return;
        setAssignments(nextAssignments);
        setAssignmentState('ready');
      })
      .catch(() => {
        if (!active) return;
        // Fail closed: keep no assignments so task-gated navigation stays
        // hidden until the existing read succeeds.
        setAssignments([]);
        setAssignmentState('error');
      });
    return () => {
      active = false;
    };
  }, [sessionState, session, reloadToken]);

  const retry = useCallback(() => {
    setSessionState('loading');
    setAssignmentState('loading');
    setReloadToken((value) => value + 1);
  }, []);

  return { session, assignments, sessionState, assignmentState, online, retry };
}
