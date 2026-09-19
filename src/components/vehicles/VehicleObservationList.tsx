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
          <p className="font-mono text-xs tracking-[0.16em] text-amber-200 uppercase">
            Quan sát gần đây
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Danh sách hiện trường
          </h2>
        </div>
        <Link
          href="/field/offline"
          className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline"
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
        <p className="text-sm text-slate-400" role="status">
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
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          Chưa có quan sát phương tiện.
        </div>
      ) : null}
      {loadState === 'ready' && items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/field/vehicles/${item.id}`}
                    className="font-mono text-lg text-white hover:text-cyan-200"
                  >
                    {item.plate}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.observedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                {item.description ?? 'Không có mô tả.'}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Vị trí: {item.latitude}, {item.longitude}
              </p>
              {item.matchedRegistryId ? (
                <p className="mt-2 text-xs text-amber-200">
                  Match registry: {item.matchedRegistryId}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
