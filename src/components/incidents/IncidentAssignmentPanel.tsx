'use client';

import { useEffect, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { UserPicker } from '@/components/identity/UserPicker';

import { holdsCommandRole, useIncidentSession } from './useIncidentSession';

type IncidentAssignment = {
  id: string;
  resourceType: string;
  resourceId: string;
  task: string;
  assigneeUserId: string;
  status: string;
  grantedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
};

class AssignmentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | null {
  return value === null || value === undefined
    ? null
    : typeof value === 'string'
      ? value
      : null;
}

function parseAssignment(value: unknown): IncidentAssignment {
  if (!isRecord(value)) throw new Error('INVALID_ASSIGNMENTS_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    typeof value.resourceType !== 'string' ||
    typeof value.resourceId !== 'string' ||
    typeof value.task !== 'string' ||
    typeof value.assigneeUserId !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.grantedAt !== 'string'
  ) {
    throw new Error('INVALID_ASSIGNMENTS_RESPONSE');
  }
  return {
    id: value.id,
    resourceType: value.resourceType,
    resourceId: value.resourceId,
    task: value.task,
    assigneeUserId: value.assigneeUserId,
    status: value.status,
    grantedAt: value.grantedAt,
    revokedAt: optionalString(value.revokedAt),
    revokeReason: optionalString(value.revokeReason),
  };
}

async function fetchIncidentAssignments(
  incidentId: string,
): Promise<IncidentAssignment[]> {
  const response = await fetch(
    `/api/identity/assignments?resourceType=Incident&resourceId=${encodeURIComponent(incidentId)}&includeRevoked=true`,
    { cache: 'no-store' },
  );
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new AssignmentApiError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'ASSIGNMENTS_FAILED',
      response.status,
    );
  }
  if (!isRecord(body) || !Array.isArray(body.assignments)) {
    throw new Error('INVALID_ASSIGNMENTS_RESPONSE');
  }
  return body.assignments.map(parseAssignment);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không rõ thời điểm'
    : date.toLocaleString('vi-VN');
}

export function IncidentAssignmentPanel({
  incidentId,
  onChanged,
}: {
  incidentId: string;
  onChanged?: () => Promise<void> | void;
}) {
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<IncidentAssignment[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { session, loaded: sessionLoaded } = useIncidentSession();
  const canAssign =
    !sessionLoaded || (session ? holdsCommandRole(session.roles) : false);

  useEffect(() => {
    let active = true;
    fetchIncidentAssignments(incidentId)
      .then((nextAssignments) => {
        if (!active) return;
        setAssignments(nextAssignments);
        setState('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setDenied(
          reason instanceof AssignmentApiError && reason.status === 403,
        );
        setError(
          reason instanceof AssignmentApiError && reason.message === 'FORBIDDEN'
            ? 'Assignment này không thuộc phạm vi tài khoản hiện tại.'
            : 'Không thể tải Assignment của Incident.',
        );
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [incidentId]);

  async function refreshAssignments() {
    setState('loading');
    setError(null);
    try {
      setAssignments(await fetchIncidentAssignments(incidentId));
      setState('ready');
    } catch (reason: unknown) {
      setDenied(reason instanceof AssignmentApiError && reason.status === 403);
      setError(
        reason instanceof AssignmentApiError && reason.message === 'FORBIDDEN'
          ? 'Assignment này không thuộc phạm vi tài khoản hiện tại.'
          : 'Không thể tải Assignment của Incident.',
      );
      setState('error');
    }
  }

  async function assign() {
    if (!assigneeUserIds.length) {
      setMessage('Chọn ít nhất một cán bộ được giao.');
      return;
    }
    setLoading(true);
    setError(null);
    setDenied(false);
    setMessage(null);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/commands`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          command: 'assign',
          assigneeUserIds,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        if (response.status === 403) setDenied(true);
        throw new Error(
          isRecord(body) && typeof body.error === 'string'
            ? body.error
            : 'ASSIGNMENT_FAILED',
        );
      }
      if (!isRecord(body) || !isRecord(body.result)) {
        throw new Error('INVALID_API_RESPONSE');
      }
      setAssigneeUserIds([]);
      setMessage('Đã gửi phân công.');
      await refreshAssignments();
      await onChanged?.();
    } catch (reason: unknown) {
      const code =
        reason instanceof Error ? reason.message : 'ASSIGNMENT_FAILED';
      setError(
        code === 'FORBIDDEN'
          ? 'Tài khoản hiện tại không có quyền phân công Incident.'
          : 'Không thể phân công Incident. Kiểm tra quyền và cán bộ được chọn.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
            Phân công
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
            Chỉ huy cấp quyền theo Incident; người được giao mới có thể xác
            minh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAssignments()}
          disabled={state === 'loading'}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-2.5 py-1.5 text-xs text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)] disabled:opacity-50"
        >
          Làm mới
        </button>
      </div>
      {state === 'loading' ? (
        <p
          className="mt-5 text-sm text-[var(--civicos-text-muted)]"
          role="status"
        >
          Đang tải Assignment…
        </p>
      ) : null}
      {state === 'error' ? (
        <div className="mt-5 space-y-3">
          {denied ? (
            <AccessDenied message={error ?? undefined} />
          ) : (
            <p className="text-sm text-[var(--civicos-danger)]" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void refreshAssignments()}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}
      {state === 'ready' ? (
        <div className="mt-5 space-y-5">
          {assignments.length ? (
            <div className="space-y-2" aria-label="Danh sách Assignment">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm text-[var(--civicos-text)]">
                      {assignment.assigneeUserId}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${
                        assignment.status === 'active'
                          ? 'bg-[var(--civicos-surface)] text-[var(--civicos-success)]'
                          : 'bg-[var(--civicos-surface-muted)] text-[var(--civicos-text-muted)]'
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--civicos-text-muted)]">
                    {assignment.task} · {formatDate(assignment.grantedAt)}
                  </p>
                  {assignment.revokeReason ? (
                    <p className="mt-2 text-xs text-[var(--civicos-text-muted)]">
                      Lý do thu hồi: {assignment.revokeReason}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text-muted)]">
              Chưa có Assignment cho Incident này.
            </p>
          )}
          <div className="border-t border-[var(--civicos-border)] pt-5">
            {canAssign ? (
              <>
                <UserPicker
                  value={assigneeUserIds}
                  onChange={setAssigneeUserIds}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => void assign()}
                  disabled={loading || !assigneeUserIds.length}
                  className="mt-4 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] px-3 py-2.5 text-sm font-semibold text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Đang gửi…' : 'Gửi phân công'}
                </button>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text-muted)]">
                Chỉ Commander trong cùng OrganizationUnit được tạo hoặc thu hồi
                phân công.
              </p>
            )}
          </div>
        </div>
      ) : null}
      {denied && state !== 'error' ? <AccessDenied /> : null}
      {error && state !== 'error' ? (
        <p className="mt-3 text-sm text-[var(--civicos-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="mt-3 text-xs text-[var(--civicos-text)]"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
