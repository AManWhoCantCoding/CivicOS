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
      className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--civicos-text)]">
            Kết nối
          </p>
          <p className="mt-2 text-sm text-[var(--civicos-text-muted)]">
            {online
              ? 'Đang kết nối máy chủ.'
              : 'Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs text-[var(--civicos-text)]">
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-[var(--civicos-border)] pt-4 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-[var(--civicos-text-muted)]">Chờ gửi</dt>
          <dd
            data-testid="queue-pending-count"
            className="mt-1 text-lg font-semibold text-[var(--civicos-text)]"
          >
            {pending}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--civicos-text-muted)]">Lỗi/từ chối</dt>
          <dd
            data-testid="queue-failed-count"
            className="mt-1 text-lg font-semibold text-[var(--civicos-danger)]"
          >
            {failed}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--civicos-text-muted)]">Đã xác nhận</dt>
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
          className="mt-3 rounded-lg border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] px-3 py-2 text-xs text-[var(--civicos-danger)]"
        >
          Lỗi đồng bộ: {failedError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={retrySync}
        className="mt-4 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm font-semibold text-[var(--civicos-accent)] hover:border-[var(--civicos-accent)]"
      >
        Đồng bộ ngay
      </button>
    </section>
  );
}
