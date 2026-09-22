'use client';

import { useEffect, useState } from 'react';

import { AccessDenied } from './AccessDenied';

export type IdentityDirectoryUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  organizationUnitId: string | null;
};

class DirectoryError extends Error {
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

function parseUser(value: unknown): IdentityDirectoryUser {
  if (!isRecord(value)) throw new Error('INVALID_USERS_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === 'string')
  ) {
    throw new Error('INVALID_USERS_RESPONSE');
  }
  return {
    id: value.id,
    email: value.email,
    name: value.name,
    roles: value.roles,
    organizationUnitId:
      typeof value.organizationUnitId === 'string'
        ? value.organizationUnitId
        : null,
  };
}

async function fetchUsers(): Promise<IdentityDirectoryUser[]> {
  const response = await fetch('/api/identity/users', { cache: 'no-store' });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new DirectoryError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'USERS_FAILED',
      response.status,
    );
  }
  if (!isRecord(body) || !Array.isArray(body.users)) {
    throw new Error('INVALID_USERS_RESPONSE');
  }
  return body.users.map(parseUser);
}

export function UserPicker({
  value,
  onChange,
  label = 'Cán bộ được giao',
  disabled = false,
}: {
  value: string[];
  onChange: (nextValue: string[]) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [users, setUsers] = useState<IdentityDirectoryUser[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then((nextUsers) => {
        if (!active) return;
        setUsers(nextUsers);
        setState('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setErrorStatus(reason instanceof DirectoryError ? reason.status : null);
        setError(
          reason instanceof DirectoryError && reason.message === 'FORBIDDEN'
            ? 'Tài khoản hiện tại không được xem danh sách cán bộ.'
            : 'Không thể tải danh sách cán bộ.',
        );
        setState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  async function retry() {
    setState('loading');
    setError(null);
    setErrorStatus(null);
    try {
      setUsers(await fetchUsers());
      setState('ready');
    } catch (reason: unknown) {
      setErrorStatus(reason instanceof DirectoryError ? reason.status : null);
      setError(
        reason instanceof DirectoryError && reason.message === 'FORBIDDEN'
          ? 'Tài khoản hiện tại không được xem danh sách cán bộ.'
          : 'Không thể tải danh sách cán bộ.',
      );
      setState('error');
    }
  }

  function toggleUser(userId: string) {
    onChange(
      value.includes(userId)
        ? value.filter((selectedId) => selectedId !== userId)
        : [...value, userId],
    );
  }

  return (
    <fieldset
      disabled={disabled}
      aria-busy={state === 'loading'}
      className="min-w-0"
    >
      <legend className="text-sm text-slate-200">{label}</legend>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Chọn một hoặc nhiều cán bộ trong cùng OrganizationUnit.
      </p>
      {state === 'loading' ? (
        <p className="mt-3 text-sm text-slate-500" role="status">
          Đang tải danh sách cán bộ…
        </p>
      ) : null}
      {state === 'error' ? (
        <div className="mt-3 space-y-3">
          {errorStatus === 403 ? (
            <AccessDenied message={error ?? undefined} />
          ) : (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void retry()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}
      {state === 'ready' && !users.length ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
          Chưa có cán bộ hoạt động trong danh bạ.
        </p>
      ) : null}
      {state === 'ready' && users.length ? (
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          {users.map((user) => (
            <label
              key={user.id}
              className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition hover:bg-slate-900"
            >
              <input
                type="checkbox"
                checked={value.includes(user.id)}
                onChange={() => toggleUser(user.id)}
                className="mt-1 h-4 w-4 accent-cyan-300"
              />
              <span className="min-w-0 text-sm text-slate-200">
                <span className="block truncate font-medium">{user.name}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {user.email} · Role: {user.roles.join(' · ')}
                  {user.organizationUnitId
                    ? ` · Unit: ${user.organizationUnitId}`
                    : ''}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
