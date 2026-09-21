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
    if (window.navigator.onLine) void syncOfflineQueue().then(read);
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
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Kết nối</p>
          <p className="mt-2 text-sm text-slate-400">
            {online
              ? 'Đang kết nối máy chủ.'
              : 'Đang ngoại tuyến. Thao tác mới sẽ chờ đồng bộ.'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${online ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'}`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Chờ gửi</dt>
          <dd
            data-testid="queue-pending-count"
            className="mt-1 text-lg font-semibold text-amber-200"
          >
            {pending}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Lỗi/từ chối</dt>
          <dd
            data-testid="queue-failed-count"
            className="mt-1 text-lg font-semibold text-rose-200"
          >
            {failed}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Đã xác nhận</dt>
          <dd
            data-testid="queue-synced-count"
            className="mt-1 text-lg font-semibold text-emerald-200"
          >
            {synced}
          </dd>
        </div>
      </dl>
      {failedError ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200"
        >
          Lỗi đồng bộ: {failedError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={retrySync}
        className="mt-4 min-h-[44px] w-full rounded-lg border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-200 hover:border-cyan-200 hover:text-white"
      >
        Đồng bộ ngay
      </button>
    </section>
  );
}
