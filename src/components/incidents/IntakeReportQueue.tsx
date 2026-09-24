'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';

type IntakeQueueItem = {
  id: string;
  sourceChannel: string | null;
  status: string;
  content: string;
  receivedAt: string;
  incidentId: string | null;
  revealed: boolean;
  sourceName: string | null;
  sla: {
    recordingDueAt: string;
    verificationDueAt: string;
    notificationDueAt: string;
    overdue: boolean;
    warning: boolean;
  };
};

class IntakeQueueError extends Error {
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

function parseQueueItem(value: unknown): IntakeQueueItem {
  if (!isRecord(value)) throw new Error('INVALID_INTAKE_RESPONSE');
  if (
    typeof value.id !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.receivedAt !== 'string'
  ) {
    throw new Error('INVALID_INTAKE_RESPONSE');
  }
  const sla = value.sla;
  if (
    !isRecord(sla) ||
    typeof sla.recordingDueAt !== 'string' ||
    typeof sla.verificationDueAt !== 'string' ||
    typeof sla.notificationDueAt !== 'string' ||
    typeof sla.overdue !== 'boolean' ||
    typeof sla.warning !== 'boolean'
  ) {
    throw new Error('INVALID_INTAKE_RESPONSE');
  }
  return {
    id: value.id,
    sourceChannel:
      typeof value.sourceChannel === 'string' ? value.sourceChannel : null,
    status: value.status,
    content: value.content,
    receivedAt: value.receivedAt,
    incidentId: typeof value.incidentId === 'string' ? value.incidentId : null,
    revealed: value.revealed === true,
    sourceName: typeof value.sourceName === 'string' ? value.sourceName : null,
    sla: {
      recordingDueAt: sla.recordingDueAt,
      verificationDueAt: sla.verificationDueAt,
      notificationDueAt: sla.notificationDueAt,
      overdue: sla.overdue,
      warning: sla.warning,
    },
  };
}

async function fetchQueue(query: string): Promise<IntakeQueueItem[]> {
  const response = await fetch(`/api/intake-reports${query}`, {
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new IntakeQueueError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : 'INTAKE_QUEUE_FAILED',
      response.status,
    );
  }
  if (!isRecord(body) || !Array.isArray(body.reports)) {
    throw new Error('INVALID_INTAKE_RESPONSE');
  }
  return body.reports.map(parseQueueItem);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không rõ thời điểm'
    : date.toLocaleString('vi-VN');
}

function slaBadge(item: IntakeQueueItem) {
  if (item.sla.overdue) {
    return (
      <span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs text-rose-200">
        Quá hạn SLA
      </span>
    );
  }
  if (item.sla.warning) {
    return (
      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
        Sắp hạn SLA
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
      Trong hạn
    </span>
  );
}

export function IntakeReportQueue() {
  const [reports, setReports] = useState<IntakeQueueItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    setDenied(false);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (channelFilter) params.set('sourceChannel', channelFilter);
      if (slaFilter) params.set('sla', slaFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      setReports(await fetchQueue(query));
      setState('ready');
    } catch (reason: unknown) {
      setDenied(reason instanceof IntakeQueueError && reason.status === 403);
      setError(
        reason instanceof IntakeQueueError && reason.message === 'FORBIDDEN'
          ? 'Hàng đợi IntakeReport không thuộc phạm vi tài khoản hiện tại.'
          : 'Không thể tải hàng đợi IntakeReport.',
      );
      setState('error');
    }
  }, [statusFilter, channelFilter, slaFilter]);

  useEffect(() => {
    let active = true;
    async function fetchCurrent() {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (channelFilter) params.set('sourceChannel', channelFilter);
      if (slaFilter) params.set('sla', slaFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      try {
        const items = await fetchQueue(query);
        if (!active) return;
        setReports(items);
        setError(null);
        setDenied(false);
        setState('ready');
      } catch (reason: unknown) {
        if (!active) return;
        setDenied(reason instanceof IntakeQueueError && reason.status === 403);
        setError(
          reason instanceof IntakeQueueError && reason.message === 'FORBIDDEN'
            ? 'Hàng đợi IntakeReport không thuộc phạm vi tài khoản hiện tại.'
            : 'Không thể tải hàng đợi IntakeReport.',
        );
        setState('error');
      }
    }
    void fetchCurrent();
    return () => {
      active = false;
    };
  }, [statusFilter, channelFilter, slaFilter]);

  if (state === 'loading') {
    return (
      <div
        className="h-40 rounded-xl bg-slate-900 motion-safe:animate-pulse"
        aria-label="Đang tải hàng đợi IntakeReport"
        role="status"
      />
    );
  }

  return (
    <section aria-label="Hàng đợi IntakeReport" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-slate-300">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          >
            <option value="">Tất cả</option>
            <option value="RECEIVED">Đã tiếp nhận</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="PROCESSED">Đã xử lý</option>
            <option value="CLOSED">Đã đóng</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          Kênh tiếp nhận
          <select
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          >
            <option value="">Tất cả</option>
            <option value="direct">Trực tiếp</option>
            <option value="phone">Điện thoại</option>
            <option value="app">Ứng dụng</option>
            <option value="district_transfer">Chuyển đơn vị</option>
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          Hạn SLA
          <select
            value={slaFilter}
            onChange={(event) => setSlaFilter(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          >
            <option value="">Tất cả</option>
            <option value="warning">Sắp hạn</option>
            <option value="overdue">Quá hạn</option>
          </select>
        </label>
      </div>
      {state === 'error' ? (
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
            onClick={() => void load()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}
      {state === 'ready' && !reports.length ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
          Chưa có IntakeReport trong phạm vi hiển thị.
        </div>
      ) : null}
      {state === 'ready' && reports.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="divide-y divide-slate-800">
            {reports.map((item) => (
              <Link
                key={item.id}
                href={`/intake/${item.id}`}
                className="block p-5 transition hover:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-xs text-slate-500">
                    {item.id.slice(0, 8)} · {item.sourceChannel ?? '—'}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {slaBadge(item)}
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                      {item.status}
                    </span>
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  {item.content}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Nguồn tin: {item.sourceName ?? 'Không ghi nhận'} ·{' '}
                  {item.incidentId ? 'Đã chuyển Incident' : 'Chưa tạo Incident'}{' '}
                  · {formatDate(item.receivedAt)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
