'use client';

import { useEffect, useState } from 'react';

import { AccessDenied } from './AccessDenied';

type OrganizationUnit = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
};

class OrganizationUnitError extends Error {
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

function parseOrganizationUnit(value: unknown): OrganizationUnit {
  if (!isRecord(value)) throw new Error('INVALID_ORGANIZATION_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.level !== 'string' ||
    (value.parentId !== null && typeof value.parentId !== 'string')
  ) {
    throw new Error('INVALID_ORGANIZATION_RESPONSE');
  }
  return {
    id: value.id,
    name: value.name,
    level: value.level,
    parentId: value.parentId,
  };
}

async function fetchOrganizationUnits(): Promise<OrganizationUnit[]> {
  const response = await fetch('/api/identity/organization-units', {
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new OrganizationUnitError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'ORGANIZATION_UNITS_FAILED',
      response.status,
    );
  }
  if (!isRecord(body) || !Array.isArray(body.organizationUnits)) {
    throw new Error('INVALID_ORGANIZATION_RESPONSE');
  }
  return body.organizationUnits.map(parseOrganizationUnit);
}

export function OrganizationUnitPicker({
  value,
  onChange,
  label = 'Đơn vị nhận',
  required = true,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrganizationUnits()
      .then((nextUnits) => {
        if (!active) return;
        setUnits(nextUnits);
        setState('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setErrorStatus(
          reason instanceof OrganizationUnitError ? reason.status : null,
        );
        setError(
          reason instanceof OrganizationUnitError &&
            reason.message === 'FORBIDDEN'
            ? 'Tài khoản hiện tại không được xem OrganizationUnit.'
            : 'Không thể tải danh sách OrganizationUnit.',
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
      setUnits(await fetchOrganizationUnits());
      setState('ready');
    } catch (reason: unknown) {
      setErrorStatus(
        reason instanceof OrganizationUnitError ? reason.status : null,
      );
      setError(
        reason instanceof OrganizationUnitError &&
          reason.message === 'FORBIDDEN'
          ? 'Tài khoản hiện tại không được xem OrganizationUnit.'
          : 'Không thể tải danh sách OrganizationUnit.',
      );
      setState('error');
    }
  }

  return (
    <div>
      <label
        className="block text-sm break-words text-[var(--civicos-text)]"
        htmlFor="organization-unit"
      >
        {label}
        <select
          id="organization-unit"
          name="organizationId"
          value={value}
          required={required}
          disabled={state !== 'ready'}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] focus:ring-2 focus:ring-[var(--civicos-focus)] disabled:cursor-wait disabled:opacity-60"
        >
          <option value="">
            {state === 'loading' ? 'Đang tải đơn vị…' : 'Chọn OrganizationUnit'}
          </option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name} · {unit.id}
            </option>
          ))}
        </select>
      </label>
      {state === 'error' ? (
        <div className="mt-3 space-y-3">
          {errorStatus === 403 ? (
            <AccessDenied message={error ?? undefined} />
          ) : (
            <p
              className="text-sm break-words text-[var(--civicos-danger)]"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void retry()}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}
    </div>
  );
}
