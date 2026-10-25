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

// Presentation-only status tone mapping: state stays text + icon, color only
// reinforces the same meaning per the shared Light/Blue semantic contract.
function statusBadgeClass(status: string): string {
  if (status === 'resolved' || status === 'closed')
    return 'border-[var(--civicos-success)] text-[var(--civicos-success)]';
  if (status === 'verifying' || status === 'transferred')
    return 'border-[var(--civicos-warning)] text-[var(--civicos-warning)]';
  if (status === 'received' || status === 'classified')
    return 'border-[var(--civicos-info)] text-[var(--civicos-info)]';
  return 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]';
}

function statusIcon(status: string): string {
  if (status === 'resolved' || status === 'closed') return '●';
  if (status === 'verifying' || status === 'transferred') return '▲';
  return '○';
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
        aria-label="Đang tải hàng đợi Incident"
        role="status"
      >
        <div className="space-y-3">
          <div className="h-8 w-52 rounded-lg bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
          <div className="overflow-hidden rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]">
            <div className="divide-y divide-[var(--civicos-border)]">
              <div className="h-28 motion-safe:animate-pulse" />
              <div className="h-28 motion-safe:animate-pulse" />
              <div className="h-28 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="space-y-4">
        {denied ? (
          <AccessDenied message={error ?? undefined} />
        ) : (
          <p
            className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5 text-sm font-medium text-[var(--civicos-danger)]"
            role="alert"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--civicos-danger)',
            }}
          >
            <span aria-hidden="true">⚠ </span>
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
      <div className="rounded-xl border border-dashed border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-8 text-sm text-[var(--civicos-text-muted)]">
        <span aria-hidden="true">○ </span>
        Chưa có Incident trong phạm vi hiển thị.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]">
      <div className="divide-y divide-[var(--civicos-border)]">
        {incidents.map((incident) => (
          <Link
            key={incident.id}
            href={`/incidents/${incident.id}`}
            className="block min-h-[44px] p-5 motion-safe:transition-colors hover:bg-[var(--civicos-surface-muted)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-[var(--civicos-text-muted)]">
                {incident.id.slice(0, 8)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(incident.status)}`}
              >
                <span aria-hidden="true">{statusIcon(incident.status)}</span>
                {incident.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--civicos-text)]">
              {incident.description}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--civicos-text-muted)]">
              Phân loại: {incident.category ?? 'Chưa phân loại'} · Mức độ:{' '}
              {incident.severity ?? 'Chưa đánh giá'} ·{' '}
              {formatDate(incident.updatedAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
