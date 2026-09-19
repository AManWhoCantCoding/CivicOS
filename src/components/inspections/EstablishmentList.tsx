'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import { establishmentChangedEventName } from './EstablishmentForm';

type Establishment = {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  type: string;
};

export function EstablishmentList() {
  const online = useOnlineStatus();
  const [items, setItems] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!online) return;
    fetch('/api/establishments')
      .then(async (response) => {
        setError(null);
        setDenied(false);
        if (!response.ok) {
          const message = await readResponseError(
            response,
            'ESTABLISHMENTS_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        setItems((await response.json()).establishments);
      })
      .catch((reason: unknown) => {
        setDenied(
          reason instanceof Error &&
            'denied' in reason &&
            Boolean(reason.denied),
        );
        setError(
          reason instanceof Error ? reason.message : 'Không thể tải danh mục.',
        );
      })
      .finally(() => setLoading(false));
  }, [online, reloadToken]);
  useEffect(() => {
    const refresh = () => setReloadToken((value) => value + 1);
    window.addEventListener(establishmentChangedEventName, refresh);
    return () =>
      window.removeEventListener(establishmentChangedEventName, refresh);
  }, []);
  if (!online && !items.length)
    return (
      <FeedbackMessage
        message="Offline: danh mục cơ sở cần kết nối để tải dữ liệu mới."
        tone="warning"
      />
    );
  if (loading)
    return (
      <p className="text-sm text-slate-400" role="status">
        Đang tải danh mục cơ sở…
      </p>
    );
  if (error)
    return (
      <div className="space-y-3">
        <FeedbackMessage
          message={
            denied ? `Không có quyền xem danh mục cơ sở: ${error}` : error
          }
          tone={denied ? 'warning' : 'error'}
        />
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300 hover:text-white"
        >
          Thử lại
        </button>
      </div>
    );
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
        Chưa có cơ sở kinh doanh trong danh mục.
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {!online ? (
        <div className="md:col-span-2">
          <FeedbackMessage
            message="Offline: đang hiển thị danh mục cơ sở đã tải trước đó."
            tone="warning"
          />
        </div>
      ) : null}
      {items.map((item) => (
        <a
          key={item.id}
          href={`/inspections/establishments/${item.id}`}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/60"
        >
          <p className="text-lg font-semibold text-white">{item.name}</p>
          <p className="mt-2 text-sm text-slate-400">
            {item.type} · {item.ownerName}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {item.address}
          </p>
        </a>
      ))}
    </div>
  );
}
