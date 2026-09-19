'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function EstablishmentDetail({
  establishmentId,
}: {
  establishmentId: string;
}) {
  const [item, setItem] = useState<{
    name: string;
    ownerName: string;
    address: string;
    type: string;
  } | null>(null);
  useEffect(() => {
    fetch(`/api/establishments/${establishmentId}`)
      .then((response) => response.json())
      .then((result) => setItem(result.establishment));
  }, [establishmentId]);
  if (!item)
    return (
      <main className="min-h-dvh bg-slate-950 p-8 text-slate-400">
        Đang tải cơ sở…
      </main>
    );
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          className="text-sm text-slate-400 hover:text-white"
          href="/inspections/establishments"
        >
          ← Danh mục
        </Link>
        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Cơ sở
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {item.name}
          </h1>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Loại hình</dt>
              <dd className="mt-1 text-slate-200">{item.type}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Chủ cơ sở</dt>
              <dd className="mt-1 text-slate-200">{item.ownerName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Địa chỉ</dt>
              <dd className="mt-1 text-slate-200">{item.address}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
