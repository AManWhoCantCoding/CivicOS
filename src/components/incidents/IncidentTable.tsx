'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';

type Incident = {
  id: string;
  status: string;
  category: string | null;
  severity: string | null;
  description: string;
  updatedAt: string;
};

class IncidentListError extends Error {
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

function parseIncident(value: unknown): Incident {
  if (!isRecord(value)) throw new Error('INVALID_INCIDENTS_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    typeof value.status !== 'string' ||
    (value.category !== null && typeof value.category !== 'string') ||
    (value.severity !== null && typeof value.severity !== 'string') ||
    typeof value.description !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new Error('INVALID_INCIDENTS_RESPONSE');
  }
  return {
    id: value.id,
    status: value.status,
    category: value.category,
    severity: value.severity,
    description: value.description,
    updatedAt: value.updatedAt,
  };
}

async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch('/api/incidents', { cache: 'no-store' });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new IncidentListError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'INCIDENTS_FAILED',
      response.status,
    );
  }
  if (!isRecord(body) || !Array.isArray(body.incidents)) {
    throw new Error('INVALID_INCIDENTS_RESPONSE');
  }
  return body.incidents.map(parseIncident);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không rõ thời điểm'
    : date.toLocaleString('vi-VN');
}

export function IncidentTable() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    fetchIncidents()
      .then((nextIncidents) => {
        if (!active) return;
        setIncidents(nextIncidents);
        setState('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setDenied(reason instanceof IncidentListError && reason.status === 403);
        setError(
          reason instanceof IncidentListError && reason.message === 'FORBIDDEN'
            ? 'Danh sách Incident không thuộc phạm vi tài khoản hiện tại.'
            : 'Không thể tải hàng đợi Incident.',
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
    setDenied(false);
    try {
      setIncidents(await fetchIncidents());
      setState('ready');
    } catch (reason: unknown) {
      setDenied(reason instanceof IncidentListError && reason.status === 403);
      setError(
        reason instanceof IncidentListError && reason.message === 'FORBIDDEN'
          ? 'Danh sách Incident không thuộc phạm vi tài khoản hiện tại.'
          : 'Không thể tải hàng đợi Incident.',
      );
      setState('error');
    }
  }

  if (state === 'loading') {
    return (
      <div
        className="h-40 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse"
        aria-label="Đang tải hàng đợi Incident"
        role="status"
      />
    );
  }
  if (state === 'error') {
    return (
      <div className="space-y-4">
        {denied ? (
          <AccessDenied message={error ?? undefined} />
        ) : (
          <p
            className="rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-5 text-sm text-[var(--civicos-danger)]"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void retry()}
          className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
        >
          Thử tải lại
        </button>
      </div>
    );
  }
  if (!incidents.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--civicos-border)] p-8 text-sm text-[var(--civicos-text-muted)]">
        Chưa có Incident trong phạm vi hiển thị.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--civicos-border)]">
      <div className="divide-y divide-[var(--civicos-border)]">
        {incidents.map((incident) => (
          <Link
            key={incident.id}
            href={`/incidents/${incident.id}`}
            className="block p-5 transition hover:bg-[var(--civicos-surface-muted)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-[var(--civicos-text-muted)]">
                {incident.id.slice(0, 8)}
              </span>
              <span className="rounded-full border border-[var(--civicos-accent)] bg-[var(--civicos-surface)] px-3 py-1 text-xs text-[var(--civicos-accent)]">
                {incident.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--civicos-text)]">
              {incident.description}
            </p>
            <p className="mt-3 text-xs text-[var(--civicos-text-muted)]">
              {incident.category ?? 'Chưa phân loại'} ·{' '}
              {incident.severity ?? 'Chưa đánh giá'} ·{' '}
              {formatDate(incident.updatedAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
