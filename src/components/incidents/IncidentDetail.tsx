'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { SessionControls } from '@/components/identity/SessionControls';

import { IncidentAssignmentPanel } from './IncidentAssignmentPanel';
import { IncidentStatusActions } from './IncidentStatusActions';
import { IncidentTimeline } from './IncidentTimeline';

type IncidentState = {
  id: string;
  status: string;
  description: string;
  category: string | null;
  severity: string | null;
  latitude: string | null;
  longitude: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type Detail = {
  incident: {
    incident: IncidentState;
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

class IncidentApiError extends Error {
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

function parseDetail(value: unknown): Detail {
  if (!isRecord(value) || !isRecord(value.incident)) {
    throw new Error('INVALID_INCIDENT_RESPONSE');
  }
  const outerIncident = value.incident;
  if (
    !isRecord(outerIncident.incident) ||
    !Array.isArray(outerIncident.events) ||
    !Array.isArray(outerIncident.approvals)
  ) {
    throw new Error('INVALID_INCIDENT_RESPONSE');
  }
  const incident = outerIncident.incident;
  if (
    typeof incident.id !== 'string' ||
    typeof incident.status !== 'string' ||
    typeof incident.description !== 'string' ||
    (incident.category !== null && typeof incident.category !== 'string') ||
    (incident.severity !== null && typeof incident.severity !== 'string') ||
    typeof incident.version !== 'number' ||
    typeof incident.createdAt !== 'string' ||
    typeof incident.updatedAt !== 'string'
  ) {
    throw new Error('INVALID_INCIDENT_RESPONSE');
  }
  const events = outerIncident.events.map((event) => {
    if (
      !isRecord(event) ||
      typeof event.eventId !== 'string' ||
      typeof event.eventType !== 'string' ||
      typeof event.aggregateVersion !== 'number' ||
      typeof event.occurredAt !== 'string'
    ) {
      throw new Error('INVALID_INCIDENT_RESPONSE');
    }
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateVersion: event.aggregateVersion,
      occurredAt: event.occurredAt,
    };
  });
  const approvals = outerIncident.approvals.map((approval) => {
    if (
      !isRecord(approval) ||
      typeof approval.id !== 'string' ||
      typeof approval.action !== 'string' ||
      typeof approval.requestedAt !== 'string'
    ) {
      throw new Error('INVALID_INCIDENT_RESPONSE');
    }
    return {
      id: approval.id,
      action: approval.action,
      requestedAt: approval.requestedAt,
    };
  });
  return {
    incident: {
      incident: {
        id: incident.id,
        status: incident.status,
        description: incident.description,
        category: incident.category,
        severity: incident.severity,
        latitude: optionalString(incident.latitude),
        longitude: optionalString(incident.longitude),
        version: incident.version,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
      },
      events,
      approvals,
    },
  };
}

async function fetchIncidentDetail(incidentId: string): Promise<Detail> {
  const response = await fetch(`/api/incidents/${incidentId}`, {
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new IncidentApiError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'INCIDENT_FAILED',
      response.status,
    );
  }
  return parseDetail(body);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không rõ thời điểm'
    : date.toLocaleString('vi-VN');
}

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorIncidentId, setErrorIncidentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchIncidentDetail(incidentId)
      .then((nextDetail) => {
        if (!active) return;
        setDetail(nextDetail);
        setError(null);
        setErrorStatus(null);
        setErrorIncidentId(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setErrorStatus(
          reason instanceof IncidentApiError ? reason.status : null,
        );
        setError(
          reason instanceof IncidentApiError && reason.message === 'FORBIDDEN'
            ? 'Incident này không thuộc phạm vi tài khoản hiện tại.'
            : 'Không thể mở hồ sơ Incident.',
        );
        setErrorIncidentId(incidentId);
      });
    return () => {
      active = false;
    };
  }, [incidentId]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    setErrorStatus(null);
    try {
      setDetail(await fetchIncidentDetail(incidentId));
      setErrorIncidentId(null);
    } catch (reason: unknown) {
      setErrorStatus(reason instanceof IncidentApiError ? reason.status : null);
      setError(
        reason instanceof IncidentApiError && reason.message === 'FORBIDDEN'
          ? 'Incident này không thuộc phạm vi tài khoản hiện tại.'
          : 'Không thể làm mới hồ sơ Incident.',
      );
      setErrorIncidentId(incidentId);
    } finally {
      setRefreshing(false);
    }
  }

  const currentDetail =
    detail?.incident.incident.id === incidentId ? detail : null;
  const currentError = errorIncidentId === incidentId ? error : null;
  const currentErrorStatus =
    errorIncidentId === incidentId ? errorStatus : null;

  if (!currentDetail && !currentError) {
    return (
      <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-end">
            <SessionControls />
          </div>
          <p className="mt-10 text-sm text-slate-400" role="status">
            Đang tải hồ sơ Incident…
          </p>
        </div>
      </main>
    );
  }

  if (!currentDetail) {
    return (
      <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-end">
            <SessionControls />
          </div>
          <div className="mt-10 space-y-4">
            {currentErrorStatus === 403 ? (
              <AccessDenied message={currentError ?? undefined} />
            ) : (
              <p className="text-rose-200" role="alert">
                {currentError ?? 'Không thể mở hồ sơ Incident.'}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
              >
                Thử lại
              </button>
              <Link
                href="/incidents"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
              >
                Về hàng đợi
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const incident = currentDetail.incident.incident;
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            href="/incidents"
          >
            ← Hàng đợi
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/assignments"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
            >
              Assignment
            </Link>
            <SessionControls />
          </div>
        </header>
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300 hover:text-white disabled:opacity-50"
            >
              {refreshing ? 'Đang làm mới…' : 'Làm mới'}
            </button>
            <span className="rounded-full bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">
              {incident.status}
            </span>
          </div>
        </div>
        <section
          className="mt-8 grid gap-3 sm:grid-cols-4"
          aria-label="Tóm tắt Incident"
        >
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Category</p>
            <p className="mt-2 text-sm text-slate-200">
              {incident.category ?? 'Chưa phân loại'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Severity</p>
            <p className="mt-2 text-sm text-slate-200">
              {incident.severity ?? 'Chưa đánh giá'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Địa điểm</p>
            <p className="mt-2 text-sm text-slate-200">
              {incident.latitude && incident.longitude
                ? `${incident.latitude}, ${incident.longitude}`
                : 'Chưa có tọa độ'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Cập nhật</p>
            <p className="mt-2 text-sm text-slate-200">
              {formatDate(incident.updatedAt)}
            </p>
          </div>
        </section>
        {error ? (
          <p className="mt-5 text-sm text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="space-y-6">
            <IncidentTimeline events={currentDetail.incident.events} />
            <IncidentStatusActions
              incidentId={incident.id}
              status={incident.status}
              pendingApprovals={currentDetail.incident.approvals}
              onChanged={refresh}
            />
          </section>
          <IncidentAssignmentPanel
            incidentId={incident.id}
            onChanged={refresh}
          />
        </div>
      </div>
    </main>
  );
}
