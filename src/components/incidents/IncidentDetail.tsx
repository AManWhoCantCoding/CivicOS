'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { IncidentAssignmentPanel } from './IncidentAssignmentPanel';
import { IncidentStatusActions } from './IncidentStatusActions';
import { IncidentTimeline } from './IncidentTimeline';

type Detail = {
  incident: {
    incident: {
      id: string;
      status: string;
      description: string;
      category: string | null;
      severity: string | null;
    };
    events: Array<{
      eventId: string;
      eventType: string;
      aggregateVersion: number;
      occurredAt: string;
    }>;
    approvals: Array<{
      id: string;
      action: string;
      requestedAt: string;
    }>;
  };
};

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/incidents/${incidentId}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setDetail(result);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [incidentId]);
  if (error)
    return (
      <main className="min-h-dvh bg-slate-950 px-4 py-10 text-rose-200">
        <div className="mx-auto max-w-3xl">Không thể mở Incident: {error}</div>
      </main>
    );
  if (!detail)
    return (
      <main className="min-h-dvh bg-slate-950 px-4 py-10 text-slate-400">
        <div className="mx-auto max-w-3xl">Đang tải hồ sơ…</div>
      </main>
    );
  const incident = detail.incident.incident;
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link
          className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
          href="/incidents"
        >
          ← Hàng đợi
        </Link>
        <div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
              Incident
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {incident.id}
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-300">
              {incident.description}
            </p>
          </div>
          <span className="rounded-full bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">
            {incident.status}
          </span>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="space-y-6">
            <IncidentTimeline events={detail.incident.events} />
            <IncidentStatusActions
              incidentId={incident.id}
              status={incident.status}
              pendingApprovals={detail.incident.approvals}
            />
          </section>
          <IncidentAssignmentPanel incidentId={incident.id} />
        </div>
      </div>
    </main>
  );
}
