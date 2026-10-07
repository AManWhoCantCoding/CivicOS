'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { AccessDenied } from './AccessDenied';
import { UserPicker } from './UserPicker';

type Assignment = {
  id: string;
  resourceType: string;
  resourceId: string;
  task: string;
  assigneeUserId: string;
  organizationId: string | null;
  status: string;
  grantedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
};

type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  organizationUnitId: string | null;
};

type DirectoryUnit = {
  id: string;
  name: string;
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

function parseAssignment(value: unknown): Assignment {
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
    organizationId: optionalString(value.organizationId),
    status: value.status,
    grantedAt: value.grantedAt,
    revokedAt: optionalString(value.revokedAt),
    revokeReason: optionalString(value.revokeReason),
  };
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => null)) as unknown;
  if (!isRecord(body)) throw new Error('INVALID_API_RESPONSE');
  return body;
}

async function fetchAssignments(): Promise<Assignment[]> {
  const response = await fetch(
    '/api/identity/assignments?includeRevoked=true',
    {
      cache: 'no-store',
    },
  );
  const body = await readBody(response);
  if (!response.ok) {
    throw new AssignmentApiError(
      typeof body.error === 'string' ? body.error : 'ASSIGNMENTS_FAILED',
      response.status,
    );
  }
  if (!Array.isArray(body.assignments)) {
    throw new Error('INVALID_ASSIGNMENTS_RESPONSE');
  }
  return body.assignments.map(parseAssignment);
}

async function fetchDirectoryUsers(): Promise<DirectoryUser[]> {
  const response = await fetch('/api/identity/users', { cache: 'no-store' });
  if (!response.ok) return [];
  const body = await readBody(response);
  if (!isRecord(body) || !Array.isArray(body.users)) return [];
  const users: DirectoryUser[] = [];
  for (const entry of body.users) {
    if (!isRecord(entry)) continue;
    if (
      typeof entry.id !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.email !== 'string' ||
      !Array.isArray(entry.roles)
    ) {
      continue;
    }
    users.push({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      roles: entry.roles.filter(
        (role): role is string => typeof role === 'string',
      ),
      organizationUnitId:
        typeof entry.organizationUnitId === 'string'
          ? entry.organizationUnitId
          : null,
    });
  }
  return users;
}

async function fetchDirectoryUnits(): Promise<DirectoryUnit[]> {
  const response = await fetch('/api/identity/organization-units', {
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const body = await readBody(response);
  if (!isRecord(body) || !Array.isArray(body.organizationUnits)) return [];
  const units: DirectoryUnit[] = [];
  for (const entry of body.organizationUnits) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      continue;
    }
    units.push({ id: entry.id, name: entry.name });
  }
  return units;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không rõ thời điểm'
    : date.toLocaleString('vi-VN');
}

export function AssignmentWorkspace() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [directoryUnits, setDirectoryUnits] = useState<DirectoryUnit[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [resourceType, setResourceType] = useState('Incident');
  const [resourceId, setResourceId] = useState('');
  const [task, setTask] = useState('incident_verification');
  const [organizationId, setOrganizationId] = useState('');
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [mutation, setMutation] = useState<'create' | 'revoke' | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAssignments(),
      fetchDirectoryUsers(),
      fetchDirectoryUnits(),
    ])
      .then(([nextAssignments, nextUsers, nextUnits]) => {
        if (!active) return;
        setAssignments(nextAssignments);
        setDirectoryUsers(nextUsers);
        setDirectoryUnits(nextUnits);
        setLoadState('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setDenied(
          reason instanceof AssignmentApiError && reason.status === 403,
        );
        setLoadError(
          reason instanceof AssignmentApiError && reason.message === 'FORBIDDEN'
            ? 'Tài khoản hiện tại không được quản lý Assignment.'
            : 'Không thể tải danh sách Assignment.',
        );
        setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshAssignments() {
    setLoadState('loading');
    setLoadError(null);
    try {
      const [nextAssignments, nextUsers, nextUnits] = await Promise.all([
        fetchAssignments(),
        fetchDirectoryUsers(),
        fetchDirectoryUnits(),
      ]);
      setAssignments(nextAssignments);
      setDirectoryUsers(nextUsers);
      setDirectoryUnits(nextUnits);
      setLoadState('ready');
    } catch (reason: unknown) {
      setDenied(reason instanceof AssignmentApiError && reason.status === 403);
      setLoadError(
        reason instanceof AssignmentApiError && reason.message === 'FORBIDDEN'
          ? 'Tài khoản hiện tại không được quản lý Assignment.'
          : 'Không thể tải danh sách Assignment.',
      );
      setLoadState('error');
    }
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resourceType.trim() || !resourceId.trim() || !task.trim()) {
      setMessage('Cần nhập resource type, resource ID và task.');
      return;
    }
    if (!assigneeUserIds.length) {
      setMessage('Chọn ít nhất một cán bộ được giao.');
      return;
    }
    setMutation('create');
    setMessage(null);
    try {
      const response = await fetch('/api/identity/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resourceType: resourceType.trim(),
          resourceId: resourceId.trim(),
          task: task.trim(),
          assigneeUserIds,
          organizationId: organizationId.trim() || undefined,
        }),
      });
      const body = await readBody(response);
      if (!response.ok || !Array.isArray(body.assignments)) {
        throw new AssignmentApiError(
          typeof body.error === 'string'
            ? body.error
            : 'Không thể tạo Assignment.',
          response.status,
        );
      }
      setMessage('Đã tạo Assignment.');
      setAssigneeUserIds([]);
      await refreshAssignments();
    } catch (reason: unknown) {
      setMessage(
        reason instanceof AssignmentApiError && reason.status === 403
          ? 'Thao tác bị từ chối: tài khoản không có quyền tạo Assignment.'
          : 'Không thể tạo Assignment. Kiểm tra dữ liệu và thử lại.',
      );
    } finally {
      setMutation(null);
    }
  }

  async function revokeAssignment(
    event: FormEvent<HTMLFormElement>,
    assignmentId: string,
  ) {
    event.preventDefault();
    if (!revokeReason.trim()) {
      setMessage('Cần nhập lý do thu hồi Assignment.');
      return;
    }
    setMutation('revoke');
    setMessage(null);
    try {
      const response = await fetch('/api/identity/assignments', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          reason: revokeReason.trim(),
        }),
      });
      const body = await readBody(response);
      if (!response.ok || !isRecord(body.assignment)) {
        throw new AssignmentApiError(
          typeof body.error === 'string'
            ? body.error
            : 'Không thể thu hồi Assignment.',
          response.status,
        );
      }
      setMessage('Đã thu hồi Assignment.');
      setRevokeId(null);
      setRevokeReason('');
      await refreshAssignments();
    } catch (reason: unknown) {
      setMessage(
        reason instanceof AssignmentApiError && reason.status === 403
          ? 'Thao tác bị từ chối: tài khoản không có quyền thu hồi Assignment.'
          : 'Không thể thu hồi Assignment. Thử lại sau.',
      );
    } finally {
      setMutation(null);
    }
  }

  return (
    <div className="space-y-8">
      {denied ? <AccessDenied message={loadError ?? undefined} /> : null}
      {loadState === 'error' && !denied ? (
        <section className="rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-5">
          <p
            className="text-sm break-words text-[var(--civicos-danger)]"
            role="alert"
          >
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void refreshAssignments()}
            className="mt-4 min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)]"
          >
            Thử tải lại
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5 sm:p-7">
        <div>
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Assignment lifecycle
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--civicos-text)]">
            Tạo phân công
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 break-words text-[var(--civicos-text-muted)]">
            Cấp quyền theo đúng hồ sơ và task. Thu hồi chỉ đổi trạng thái, không
            xoá lịch sử.
          </p>
        </div>
        <form
          onSubmit={(event) => void createAssignment(event)}
          className="mt-6 space-y-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-[var(--civicos-text)]">
              Resource type
              <input
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value)}
                required
                className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
              />
            </label>
            <label className="block text-sm text-[var(--civicos-text)]">
              Resource ID
              <input
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
                required
                className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                placeholder="Ví dụ: Incident ID"
              />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-[var(--civicos-text)]">
              Task
              <input
                value={task}
                onChange={(event) => setTask(event.target.value)}
                required
                className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
              />
            </label>
            <label className="block text-sm text-[var(--civicos-text)]">
              OrganizationUnit (tuỳ chọn)
              <input
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                placeholder="Mặc định theo phiên hiện tại"
              />
            </label>
          </div>
          <UserPicker
            value={assigneeUserIds}
            onChange={setAssigneeUserIds}
            disabled={mutation !== null}
          />
          <button
            type="submit"
            disabled={mutation !== null || !assigneeUserIds.length}
            className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-5 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] transition hover:bg-[var(--civicos-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation === 'create' ? 'Đang tạo…' : 'Tạo Assignment'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-text-muted)] uppercase">
              Registry
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--civicos-text)]">
              Assignment hiện tại
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void refreshAssignments()}
            disabled={loadState === 'loading'}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] disabled:opacity-50"
          >
            {loadState === 'loading' ? 'Đang tải…' : 'Làm mới'}
          </button>
        </div>
        {loadState === 'loading' ? (
          <p
            className="mt-6 text-sm text-[var(--civicos-text-muted)]"
            role="status"
          >
            Đang tải Assignment…
          </p>
        ) : null}
        {loadState === 'ready' && !assignments.length ? (
          <p className="mt-6 rounded-lg border border-dashed border-[var(--civicos-border)] p-5 text-sm break-words text-[var(--civicos-text-muted)]">
            Chưa có Assignment nào.
          </p>
        ) : null}
        {loadState === 'ready' && assignments.length ? (
          <ol className="mt-6 space-y-3">
            {assignments.map((assignment) => {
              const assignee = directoryUsers.find(
                (candidate) => candidate.id === assignment.assigneeUserId,
              );
              const unitName =
                directoryUnits.find(
                  (candidate) => candidate.id === assignment.organizationId,
                )?.name ?? assignment.organizationId;
              return (
                <li
                  key={assignment.id}
                  className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words text-[var(--civicos-text)]">
                        {assignment.resourceType} · {assignment.resourceId}
                      </p>
                      <p className="mt-1 text-xs break-words text-[var(--civicos-text-muted)]">
                        Task: {assignment.task} ·{' '}
                        {assignee
                          ? `${assignee.name} · Role: ${assignee.roles.join(' · ')}`
                          : `User: ${assignment.assigneeUserId}`}
                      </p>
                      <p className="mt-1 text-xs break-words text-[var(--civicos-text-muted)]">
                        OrganizationUnit: {unitName ?? '—'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        assignment.status === 'active'
                          ? 'border-[var(--civicos-success)] text-[var(--civicos-success)]'
                          : 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]'
                      }`}
                    >
                      {assignment.status === 'revoked'
                        ? 'revoked · đã thu hồi'
                        : assignment.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs break-words text-[var(--civicos-text-muted)]">
                    Cấp lúc {formatDate(assignment.grantedAt)}
                    {assignment.revokedAt
                      ? ` · Thu hồi lúc ${formatDate(assignment.revokedAt)}`
                      : ''}
                  </p>
                  {assignment.revokeReason ? (
                    <p className="mt-2 text-sm break-words text-[var(--civicos-text-muted)]">
                      Lý do thu hồi: {assignment.revokeReason}
                    </p>
                  ) : null}
                  {assignment.status === 'active' &&
                  revokeId !== assignment.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRevokeId(assignment.id);
                        setRevokeReason('');
                      }}
                      className="mt-4 min-h-[44px] rounded-lg border border-[var(--civicos-danger)] px-3 py-2 text-sm text-[var(--civicos-danger)] hover:border-[var(--civicos-danger)]"
                    >
                      Thu hồi Assignment
                    </button>
                  ) : null}
                  {revokeId === assignment.id ? (
                    <form
                      onSubmit={(event) =>
                        void revokeAssignment(event, assignment.id)
                      }
                      className="mt-4 space-y-3 border-t border-[var(--civicos-border)] pt-4"
                    >
                      <label className="block text-sm text-[var(--civicos-text)]">
                        Lý do thu hồi
                        <textarea
                          value={revokeReason}
                          onChange={(event) =>
                            setRevokeReason(event.target.value)
                          }
                          required
                          rows={3}
                          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={mutation !== null}
                          className="min-h-[44px] rounded-lg bg-[var(--civicos-danger)] px-3 py-2 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:opacity-50"
                        >
                          {mutation === 'revoke'
                            ? 'Đang thu hồi…'
                            : 'Xác nhận thu hồi'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokeId(null)}
                          className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
                        >
                          Huỷ
                        </button>
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>

      {message ? (
        <p
          className="text-sm break-words text-[var(--civicos-text)]"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
