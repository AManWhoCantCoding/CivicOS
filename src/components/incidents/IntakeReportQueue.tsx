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
      <span className="rounded-full border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-3 py-1 text-xs font-medium text-[var(--civicos-danger)]">
        <span aria-hidden="true">⚠ </span>Quá hạn SLA
      </span>
    );
  }
  if (item.sla.warning) {
    return (
      <span className="rounded-full border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] px-3 py-1 text-xs font-medium text-[var(--civicos-warning)]">
        <span aria-hidden="true">◷ </span>Sắp hạn SLA
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[var(--civicos-success)] bg-[var(--civicos-surface)] px-3 py-1 text-xs font-medium text-[var(--civicos-success)]">
      <span aria-hidden="true">● </span>Trong hạn
    </span>
  );
}

// Presentation-only status tone mapping: state stays text, color only
// reinforces the same meaning per the shared Light/Blue semantic contract.
function statusBadgeClass(status: string): string {
  if (status === 'REJECTED')
    return 'border-[var(--civicos-danger)] text-[var(--civicos-danger)]';
  if (status === 'CLOSED')
    return 'border-[var(--civicos-success)] text-[var(--civicos-success)]';
  if (status === 'PROCESSED')
    return 'border-[var(--civicos-warning)] text-[var(--civicos-warning)]';
  if (status === 'RECEIVED' || status === 'VERIFIED')
    return 'border-[var(--civicos-info)] text-[var(--civicos-info)]';
  return 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]';
}

function statusIcon(status: string): string {
  if (status === 'REJECTED') return '⚠';
  if (status === 'CLOSED') return '●';
  if (status === 'PROCESSED') return '▲';
  return '○';
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
        className="h-40 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse"
        aria-label="Đang tải hàng đợi IntakeReport"
        role="status"
      />
    );
  }

  return (
    <section aria-label="Hàng đợi IntakeReport" className="space-y-4">
      <fieldset className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--civicos-text)]">
          Bộ lọc
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-[var(--civicos-text)]">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          >
            <option value="">Tất cả</option>
            <option value="RECEIVED">Đã tiếp nhận</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="PROCESSED">Đã xử lý</option>
            <option value="CLOSED">Đã đóng</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Kênh tiếp nhận
          <select
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          >
            <option value="">Tất cả</option>
            <option value="direct">Trực tiếp</option>
            <option value="phone">Điện thoại</option>
            <option value="app">Ứng dụng</option>
            <option value="district_transfer">Chuyển đơn vị</option>
          </select>
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Hạn SLA
          <select
            value={slaFilter}
            onChange={(event) => setSlaFilter(event.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          >
            <option value="">Tất cả</option>
            <option value="warning">Sắp hạn</option>
            <option value="overdue">Quá hạn</option>
          </select>
        </label>
        </div>
      </fieldset>
      {state === 'error' ? (
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
            onClick={() => void load()}
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}
      {state === 'ready' && !reports.length ? (
        <div className="rounded-xl border border-dashed border-[var(--civicos-border)] p-8 text-sm text-[var(--civicos-text-muted)]">
          Chưa có IntakeReport trong phạm vi hiển thị.
        </div>
      ) : null}
      {state === 'ready' && reports.length ? (
        <div className="overflow-hidden rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]">
          <div className="divide-y divide-[var(--civicos-border)]">
            {reports.map((item) => (
              <Link
                key={item.id}
                href={`/intake/${item.id}`}
                className="block min-h-[44px] p-5 motion-safe:transition-colors hover:bg-[var(--civicos-surface-muted)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--civicos-text-muted)]">
                    {item.id.slice(0, 8)} · {item.sourceChannel ?? '—'}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {slaBadge(item)}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(item.status)}`}
                    >
                      <span aria-hidden="true">{statusIcon(item.status)} </span>
                      {item.status}
                    </span>
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--civicos-text)]">
                  {item.content}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--civicos-text-muted)]">
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
