'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import {
  registryChangedEventName,
  RegistryForm,
  type RegistryEntry,
} from './RegistryForm';

type LoadState = 'loading' | 'ready' | 'error' | 'denied' | 'offline';

export function RegistryList() {
  const online = useOnlineStatus();
  const [items, setItems] = useState<RegistryEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!online) return;
    fetch('/api/vehicles/registry')
      .then(async (response) => {
        setError(null);
        if (!response.ok) {
          const message = await readResponseError(response, 'REGISTRY_FAILED');
          throw Object.assign(new Error(message), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        return response.json() as Promise<{ registry?: RegistryEntry[] }>;
      })
      .then((body) => {
        setItems(body.registry ?? []);
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
          reason instanceof Error ? reason.message : 'Không thể tải registry.',
        );
      });
  }, [online, reloadToken]);
  useEffect(() => {
    const refresh = () => setReloadToken((value) => value + 1);
    window.addEventListener(registryChangedEventName, refresh);
    return () => window.removeEventListener(registryChangedEventName, refresh);
  }, []);

  if (!online && !items.length)
    return (
      <FeedbackMessage
        message="Offline: registry cần kết nối để tải dữ liệu."
        tone="warning"
      />
    );
  if (online && loadState === 'loading')
    return (
      <p className="text-sm text-slate-400" role="status">
        Đang tải registry…
      </p>
    );
  if (loadState === 'denied' || loadState === 'error')
    return (
      <div className="space-y-3">
        <FeedbackMessage
          message={
            loadState === 'denied'
              ? `Không có quyền xem registry: ${error ?? 'FORBIDDEN'}`
              : (error ?? 'Không thể tải registry.')
          }
          tone={loadState === 'denied' ? 'warning' : 'error'}
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
        Chưa có biển số trong registry.
      </div>
    );

  return (
    <div className="space-y-4">
      {!online ? (
        <FeedbackMessage
          message="Offline: đang hiển thị registry đã tải trước đó."
          tone="warning"
        />
      ) : null}
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-lg text-white">{item.plate}</p>
              <p className="mt-1 text-xs text-slate-500">
                Nguồn: {item.source} · Có hiệu lực:{' '}
                {new Date(item.validFrom).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
              {item.status}
            </span>
          </div>
          <p className="mt-4 text-sm text-slate-300">{item.reason}</p>
          <p className="mt-2 text-xs text-slate-500">
            Hết hạn:{' '}
            {item.validUntil
              ? new Date(item.validUntil).toLocaleString('vi-VN')
              : 'chưa đặt'}
          </p>
          <details className="mt-5 border-t border-slate-800 pt-4">
            <summary className="cursor-pointer text-sm text-cyan-200 hover:text-white">
              Chỉnh sửa trạng thái
            </summary>
            <div className="mt-4">
              <RegistryForm
                initial={item}
                onSaved={(entry) =>
                  setItems((current) =>
                    current.map((currentEntry) =>
                      currentEntry.id === entry.id ? entry : currentEntry,
                    ),
                  )
                }
              />
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}
