'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

type Observation = {
  id: string;
  plate: string;
  observedAt: string;
  latitude: string | number;
  longitude: string | number;
  description: string | null;
  status: string;
  matchedRegistryId: string | null;
};

type LoadState = 'loading' | 'ready' | 'error' | 'denied' | 'offline';

function statusLabel(status: string) {
  return (
    {
      recorded: 'Đã ghi nhận',
      match_suggested: 'Chờ xác nhận match',
      match_confirmed: 'Đã xác nhận match',
      verified: 'Đã xác minh',
      escalated: 'Đã chuyển đơn vị',
    }[status] ?? status
  );
}

// Presentation-only status tone mapping: the Vietnamese label above stays the
// source of truth and the icon keeps state readable without color alone.
// Unknown status values stay neutral (muted) — no success styling by default.
function statusBadgeClass(status: string): string {
  if (status === 'verified')
    return 'border-[var(--civicos-success)] text-[var(--civicos-success)]';
  if (status === 'match_suggested')
    return 'border-[var(--civicos-warning)] text-[var(--civicos-warning)]';
  if (status === 'match_confirmed' || status === 'escalated')
    return 'border-[var(--civicos-info)] text-[var(--civicos-info)]';
  return 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]';
}

function statusIcon(status: string): string {
  if (status === 'verified') return '●';
  if (status === 'match_suggested') return '▲';
  if (status === 'escalated') return '↗';
  return '○';
}

export function VehicleObservationList({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const online = useOnlineStatus();
  const [items, setItems] = useState<Observation[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!online) return;
    fetch('/api/vehicles/observations')
      .then(async (response) => {
        setError(null);
        if (!response.ok) {
          const message = await readResponseError(
            response,
            'OBSERVATIONS_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        return response.json() as Promise<{ observations?: Observation[] }>;
      })
      .then((body) => {
        setItems(body.observations ?? []);
        setLoadState('ready');
      })
      .catch((reason: unknown) => {
        setLoadState(
          reason instanceof Error &&
            'denied' in reason &&
            Boolean(reason.denied)
            ? 'denied'
            : 'error',
        );
        setError(
          reason instanceof Error ? reason.message : 'Không thể tải quan sát.',
        );
      });
  }, [online, refreshKey]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase">
            Quan sát gần đây
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--civicos-text)]">
            Danh sách hiện trường
          </h2>
        </div>
        <Link
          href="/field/offline"
          className="inline-flex min-h-[44px] items-center text-xs text-[var(--civicos-text-muted)] underline-offset-4 hover:text-[var(--civicos-accent)] hover:underline"
        >
          Xem hàng đợi offline
        </Link>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: danh sách cần kết nối; biểu mẫu ghi nhận vẫn hoạt động."
          tone="warning"
        />
      ) : null}
      {online && loadState === 'loading' ? (
        <p className="text-sm text-[var(--civicos-info)]" role="status">
          Đang tải quan sát…
        </p>
      ) : null}
      {loadState === 'denied' ? (
        <FeedbackMessage
          message={`Không có quyền xem danh sách quan sát: ${error ?? 'FORBIDDEN'}`}
          tone="warning"
        />
      ) : null}
      {loadState === 'error' ? (
        <FeedbackMessage
          message={error ?? 'Không thể tải quan sát.'}
          tone="error"
        />
      ) : null}
      {loadState === 'ready' && !items.length ? (
        <div className="rounded-xl border border-dashed border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-8 text-sm leading-6 text-[var(--civicos-text-muted)]">
          Chưa có quan sát phương tiện.
        </div>
      ) : null}
      {loadState === 'ready' && items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="civicos-surface rounded-xl p-4"
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/field/vehicles/${item.id}`}
                    className="inline-flex min-h-[44px] min-w-0 items-center font-mono text-lg text-[var(--civicos-accent)] underline-offset-4 hover:underline"
                  >
                    <span className="break-all">{item.plate}</span>
                  </Link>
                  <p className="mt-1 text-xs leading-5 text-[var(--civicos-text-muted)]">
                    {new Date(item.observedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-[var(--civicos-surface)] px-3 py-1 text-xs font-medium ${statusBadgeClass(item.status)}`}
                >
                  <span aria-hidden="true">{statusIcon(item.status)} </span>
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--civicos-text)]">
                {item.description ?? 'Không có mô tả.'}
              </p>
              <p className="mt-3 text-xs leading-5 text-[var(--civicos-text-muted)]">
                Vị trí:{' '}
                <span className="font-mono break-all">
                  {item.latitude}, {item.longitude}
                </span>
              </p>
              {item.matchedRegistryId ? (
                <p className="mt-2 text-xs leading-5 text-[var(--civicos-text-muted)]">
                  Match registry:{' '}
                  <span className="font-mono break-all">
                    {item.matchedRegistryId}
                  </span>
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
