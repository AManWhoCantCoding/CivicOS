'use client';

import { useEffect, useState } from 'react';

type Establishment = {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  type: string;
};

export function EstablishmentList() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch('/api/establishments')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setItems((await response.json()).establishments);
      })
      .catch(() => setError(true));
  }, []);
  if (error)
    return (
      <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5 text-rose-200">
        Không thể tải danh mục.
      </p>
    );
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
        Chưa có cơ sở kinh doanh trong danh mục.
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
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
