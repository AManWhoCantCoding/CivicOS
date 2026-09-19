'use client';

import { FormEvent, useState } from 'react';

export function VehicleObservationForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/vehicles/observations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientCommandId: globalThis.crypto.randomUUID(),
        payloadVersion: 1,
        plate: form.get('plate'),
        observedAt: new Date().toISOString(),
        latitude: Number(form.get('latitude')),
        longitude: Number(form.get('longitude')),
        description: form.get('description'),
      }),
    });
    const result = await response.json();
    setLoading(false);
    setMessage(
      response.ok
        ? result.result?.match
          ? 'Đã ghi nhận. Có match cần xác minh.'
          : 'Đã lưu quan sát.'
        : (result.error ?? 'Không thể lưu quan sát.'),
    );
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <label className="block text-sm text-slate-200">
        Biển số
        <input
          name="plate"
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-lg text-slate-100 uppercase outline-none focus:border-cyan-300"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-200">
          Vĩ độ
          <input
            name="latitude"
            required
            type="number"
            step="any"
            defaultValue="20.96"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Kinh độ
          <input
            name="longitude"
            required
            type="number"
            step="any"
            defaultValue="105.93"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
      </div>
      <label className="block text-sm text-slate-200">
        Mô tả
        <textarea
          name="description"
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
        />
      </label>
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
      <button
        disabled={loading}
        type="submit"
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : 'Ghi nhận phương tiện'}
      </button>
    </form>
  );
}
