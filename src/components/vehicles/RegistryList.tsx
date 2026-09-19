'use client';

import { useEffect, useState } from 'react';

type Entry = {
  id: string;
  plate: string;
  source: string;
  reason: string;
  status: string;
  validUntil: string | null;
};

export function RegistryList() {
  const [items, setItems] = useState<Entry[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch('/api/vehicles/registry')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setItems((await response.json()).registry);
      })
      .catch(() => setError(true));
  }, []);
  if (error)
    return (
      <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5 text-rose-200">
        Không thể tải registry.
      </p>
    );
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
        Chưa có biển số trong registry.
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-lg text-white">{item.plate}</p>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
              {item.status}
            </span>
          </div>
          <p className="mt-4 text-sm text-slate-300">{item.reason}</p>
          <p className="mt-2 text-xs text-slate-500">
            Nguồn: {item.source} · Hết hạn:{' '}
            {item.validUntil
              ? new Date(item.validUntil).toLocaleDateString('vi-VN')
              : 'chưa đặt'}
          </p>
        </article>
      ))}
    </div>
  );
}
