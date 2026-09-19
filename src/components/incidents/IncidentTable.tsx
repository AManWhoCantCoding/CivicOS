'use client';

import { useEffect, useState } from 'react';

type Incident = {
  id: string;
  status: string;
  category: string | null;
  severity: string | null;
  description: string;
  updatedAt: string;
};

export function IncidentTable() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    fetch('/api/incidents')
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED');
        const result = (await response.json()) as { incidents: Incident[] };
        setIncidents(result.incidents);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);
  if (state === 'loading')
    return (
      <div
        className="h-40 animate-pulse rounded-xl bg-slate-900"
        aria-label="Đang tải"
      />
    );
  if (state === 'error')
    return (
      <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5 text-sm text-rose-200">
        Không thể tải hàng đợi Incident.
      </p>
    );
  if (!incidents.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
        Chưa có Incident trong phạm vi hiển thị.
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="divide-y divide-slate-800">
        {incidents.map((incident) => (
          <a
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
              {new Date(incident.updatedAt).toLocaleString('vi-VN')}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
