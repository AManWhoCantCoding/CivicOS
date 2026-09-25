'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import {
  establishmentChangedEventName,
  type EstablishmentRecord,
} from './EstablishmentForm';
import { InspectionScheduleForm } from './InspectionScheduleForm';

type InspectionSummary = {
  id: string;
  establishmentId: string;
  assignedUserId?: string | null;
  scheduledAt: string;
  cadenceMonths: number;
  status: string;
  result?: string | null;
  scheduleState?: string;
};

type LoadState = 'loading' | 'ready' | 'error' | 'denied' | 'offline';

function statusLabel(value: string) {
  return (
    {
      upcoming: 'Sắp tới',
      overdue: 'Quá hạn',
      scheduled: 'Đã lập lịch',
      in_progress: 'Đang kiểm tra',
      completed: 'Đã hoàn tất',
    }[value] ?? value
  );
}

export function InspectionScheduleBoard() {
  const online = useOnlineStatus();
  const [establishments, setEstablishments] = useState<EstablishmentRecord[]>(
    [],
  );
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    Promise.all([fetch('/api/establishments'), fetch('/api/inspections')])
      .then(async ([establishmentResponse, inspectionResponse]) => {
        if (!cancelled) setError(null);
        if (!establishmentResponse.ok) {
          const message = await readResponseError(
            establishmentResponse,
            'ESTABLISHMENTS_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied:
              establishmentResponse.status === 401 ||
              establishmentResponse.status === 403,
          });
        }
        if (!inspectionResponse.ok) {
          const message = await readResponseError(
            inspectionResponse,
            'INSPECTIONS_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied:
              inspectionResponse.status === 401 ||
              inspectionResponse.status === 403,
          });
        }
        return Promise.all([
          establishmentResponse.json(),
          inspectionResponse.json(),
        ]);
      })
      .then(([establishmentBody, inspectionBody]) => {
        if (cancelled) return;
        setEstablishments(establishmentBody.establishments ?? []);
        setInspections(inspectionBody.inspections ?? []);
        setLoadState('ready');
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setLoadState(
          reason instanceof Error && 'denied' in reason && reason.denied
            ? 'denied'
            : 'error',
        );
        setError(
          reason instanceof Error
            ? reason.message
            : 'Không thể tải lịch kiểm tra.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [online, reloadToken]);
  useEffect(() => {
    const refresh = () => setReloadToken((value) => value + 1);
    window.addEventListener(establishmentChangedEventName, refresh);
    return () =>
      window.removeEventListener(establishmentChangedEventName, refresh);
  }, []);

  return (
    <div className="space-y-6">
      <InspectionScheduleForm
        establishments={establishments}
        onScheduled={() => setReloadToken((value) => value + 1)}
      />
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
              Schedule
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--civicos-text)]">
              Lịch kiểm tra
            </h2>
          </div>
          <label className="block text-xs text-[var(--civicos-text-muted)]">
            Lọc lịch
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as 'all' | 'overdue' | 'upcoming')
              }
              className="civicos-control mt-2 min-h-[44px] border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-sm text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
            >
              <option value="all">Tất cả</option>
              <option value="overdue">Quá hạn</option>
              <option value="upcoming">Sắp tới</option>
            </select>
          </label>
        </div>
        {!online ? (
          <FeedbackMessage
            message="Offline: lịch cần kết nối để tải dữ liệu mới."
            tone="warning"
          />
        ) : null}
        {online && loadState === 'loading' ? (
          <p className="text-sm text-[var(--civicos-text-muted)]" role="status">
            Đang tải lịch kiểm tra…
          </p>
        ) : null}
        {loadState === 'denied' ? (
          <FeedbackMessage
            message={`Không có quyền xem lịch kiểm tra${error ? `: ${error}` : '.'}`}
            tone="warning"
          />
        ) : null}
        {loadState === 'error' ? (
          <div className="space-y-3">
            <FeedbackMessage
              message={error ?? 'Không thể tải lịch kiểm tra.'}
              tone="error"
            />
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="civicos-control border-[var(--civicos-border)] px-3 py-2 text-xs text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]"
            >
              Thử lại
            </button>
          </div>
        ) : null}
        {loadState === 'ready' && !inspections.length ? (
          <div className="civicos-feedback rounded-xl border-dashed p-6 text-sm text-[var(--civicos-text-muted)]">
            Chưa có lịch kiểm tra.
          </div>
        ) : null}
        {loadState === 'ready' && inspections.length ? (
          <div className="space-y-3">
            {inspections
              .filter((inspection) => {
                const scheduleState =
                  inspection.scheduleState ?? inspection.status;
                if (filter === 'overdue') return scheduleState === 'overdue';
                if (filter === 'upcoming') return scheduleState === 'upcoming';
                return true;
              })
              .map((inspection) => {
                const establishment = establishments.find(
                  (item) => item.id === inspection.establishmentId,
                );
                const scheduleState =
                  inspection.scheduleState ?? inspection.status;
                return (
                  <article
                    key={inspection.id}
                    className="civicos-surface rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/inspections/${inspection.id}`}
                          className="font-medium text-[var(--civicos-text)] hover:text-[var(--civicos-accent)]"
                        >
                          {establishment?.name ?? inspection.establishmentId}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--civicos-text-muted)]">
                          {new Date(inspection.scheduledAt).toLocaleString(
                            'vi-VN',
                          )}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--civicos-surface-raised)] px-3 py-1 text-xs text-[var(--civicos-accent)]">
                        {statusLabel(scheduleState)}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs text-[var(--civicos-text-muted)] sm:grid-cols-3">
                      <div>
                        <dt className="text-[var(--civicos-text-muted)]">
                          Trạng thái nghiệp vụ
                        </dt>
                        <dd className="mt-1 text-[var(--civicos-text)]">
                          {statusLabel(inspection.status)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--civicos-text-muted)]">
                          Chu kỳ
                        </dt>
                        <dd className="mt-1 text-[var(--civicos-text)]">
                          {inspection.cadenceMonths} tháng
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--civicos-text-muted)]">
                          Người được giao
                        </dt>
                        <dd className="mt-1 break-all text-[var(--civicos-text)]">
                          {inspection.assignedUserId ?? 'Chưa giao'}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
