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
        className="h-40 animate-pulse rounded-xl bg-slate-900"
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
            className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void retry()}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
        >
          Thử tải lại
        </button>
      </div>
    );
  }
  if (!incidents.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
        Chưa có Incident trong phạm vi hiển thị.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="divide-y divide-slate-800">
        {incidents.map((incident) => (
          <Link
            key={incident.id}
            href={`/incidents/${incident.id}`}
            className="block p-5 transition hover:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-500">
                {incident.id.slice(0, 8)}
              </span>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                {incident.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              {incident.description}
            </p>
            <p className="mt-3 text-xs text-slate-500">
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
