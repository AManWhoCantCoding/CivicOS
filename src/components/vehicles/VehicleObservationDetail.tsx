'use client';

import { useEffect, useState } from 'react';

type ObservationData = {
  observation: {
    plate: string;
    status: string;
    description: string | null;
    latitude: number;
    longitude: number;
  } | null;
  verifications: Array<{ id: string; result: string; notes: string }>;
};

export function VehicleObservationDetail({
  observationId,
}: {
  observationId: string;
}) {
  const [data, setData] = useState<ObservationData | null>(null);
  useEffect(() => {
    fetch(`/api/vehicles/observations/${observationId}`)
      .then((response) => response.json())
      .then(setData);
  }, [observationId]);
  if (!data?.observation)
    return (
      <section className="text-sm text-slate-400">Đang tải quan sát…</section>
    );
  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
          VehicleObservation
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {data.observation.plate}
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Trạng thái: {data.observation.status}
        </p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-300">
          {data.observation.description ?? 'Không có mô tả.'}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          {data.observation.latitude}, {data.observation.longitude}
        </p>
      </div>
    </section>
  );
}
