'use client';

import { useEffect, useState } from 'react';

type QueueItem = {
  id: string;
  commandType: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
};

const queueKey = 'civicos:offline-queue';

export function OfflineQueueStatus() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    const readQueue = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(queueKey) ?? '[]');
        setQueue(Array.isArray(stored) ? stored : []);
      } catch {
        setQueue([]);
      }
    };
    update();
    readQueue();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('storage', readQueue);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('storage', readQueue);
    };
  }, []);
  const pending = queue.filter(
    (item) => item.status === 'pending' || item.status === 'syncing',
  ).length;
  const failed = queue.filter((item) => item.status === 'failed').length;
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
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
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 text-xs">
        <div>
          <dt className="text-slate-500">Chờ gửi</dt>
          <dd className="mt-1 text-lg font-semibold text-amber-200">
            {pending}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Lỗi</dt>
          <dd className="mt-1 text-lg font-semibold text-rose-200">{failed}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Đã xác nhận</dt>
          <dd className="mt-1 text-lg font-semibold text-emerald-200">
            {queue.filter((item) => item.status === 'synced').length}
          </dd>
        </div>
      </dl>
    </section>
  );
}
