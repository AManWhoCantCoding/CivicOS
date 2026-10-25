'use client';

import { useEffect, useState } from 'react';

import {
  offlineQueueEventName,
  readOfflineQueue,
  syncOfflineQueue,
  type OfflineQueueItem,
} from './offline-queue';

export function OfflineQueueStatus() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    const read = () => {
      setQueue(readOfflineQueue());
    };
    update();
    read();
    const resume = () => {
      update();
      void syncOfflineQueue().then(read);
    };
    window.addEventListener('online', resume);
    window.addEventListener('offline', update);
    window.addEventListener('storage', read);
    window.addEventListener(offlineQueueEventName, read);
    void syncOfflineQueue().then(read);
    return () => {
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', update);
      window.removeEventListener('storage', read);
      window.removeEventListener(offlineQueueEventName, read);
    };
  }, []);
  const pending = queue.filter(
    (item) => item.status === 'pending' || item.status === 'syncing',
  ).length;
  const failed = queue.filter(
    (item) => item.status === 'failed' || item.status === 'rejected',
  ).length;
  const synced = queue.filter((item) => item.status === 'synced').length;
  const failedError = queue.find(
    (item) =>
      (item.status === 'failed' || item.status === 'rejected') && item.error,
  )?.error;
  function retrySync() {
    void syncOfflineQueue().then(() => {
      setQueue(readOfflineQueue());
    });
  }
  return (
    <section
      aria-label="Trạng thái đồng bộ"
      aria-live="polite"
      className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold tracking-[0.14em] text-[var(--civicos-text-muted)] uppercase">
            Kết nối
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
            {online
              ? 'Đang kết nối máy chủ.'
              : 'Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.'}
          </p>
        </div>
        <span
          data-online={online ? 'true' : 'false'}
          className={`inline-flex min-h-[28px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            online
              ? 'border-[var(--civicos-success)] text-[var(--civicos-success)]'
              : 'border-[var(--civicos-info)] text-[var(--civicos-info)]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${
              online
                ? 'bg-[var(--civicos-success)]'
                : 'bg-[var(--civicos-info)]'
            }`}
          />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--civicos-border)] pt-4 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2">
          <dt className="flex items-center gap-2 text-[var(--civicos-text-muted)]">
            <span aria-hidden="true" className="font-semibold text-[var(--civicos-info)]">
              ⇄
            </span>
            Chờ gửi
          </dt>
          <dd
            data-testid="queue-pending-count"
            className="mt-1 text-lg font-semibold text-[var(--civicos-text)]"
          >
            {pending}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2">
          <dt className="flex items-center gap-2 text-[var(--civicos-text-muted)]">
            <span aria-hidden="true" className="font-semibold text-[var(--civicos-danger)]">
              ⚠
            </span>
            Lỗi/từ chối
          </dt>
          <dd
            data-testid="queue-failed-count"
            className="mt-1 text-lg font-semibold text-[var(--civicos-danger)]"
          >
            {failed}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2">
          <dt className="flex items-center gap-2 text-[var(--civicos-text-muted)]">
            <span aria-hidden="true" className="font-semibold text-[var(--civicos-success)]">
              ✓
            </span>
            Đã xác nhận
          </dt>
          <dd
            data-testid="queue-synced-count"
            className="mt-1 text-lg font-semibold text-[var(--civicos-success)]"
          >
            {synced}
          </dd>
        </div>
      </dl>
      {failedError ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-3 py-2 text-xs leading-5 text-[var(--civicos-danger)]"
        >
          <span aria-hidden="true" className="font-semibold">
            ⚠
          </span>
          <span>
            Lỗi đồng bộ: {failedError}
          </span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={retrySync}
        className="civicos-control mt-4 min-h-[44px] w-full border border-[var(--civicos-accent)] bg-[var(--civicos-surface)] px-4 py-2 text-sm font-semibold text-[var(--civicos-accent)] hover:bg-[var(--civicos-surface-muted)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)] motion-safe:transition-colors disabled:opacity-50"
      >
        <span aria-hidden="true" className="mr-2">
          ↻
        </span>
        Đồng bộ ngay
      </button>
    </section>
  );
}
