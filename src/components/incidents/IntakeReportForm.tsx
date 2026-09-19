'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function IntakeReportForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/intake-reports', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Idempotency-Key': globalThis.crypto.randomUUID(),
      },
      body: JSON.stringify({
        channel: form.get('channel'),
        receivedAt: new Date(String(form.get('receivedAt'))).toISOString(),
        content: form.get('content'),
        sourceName: form.get('sourceName'),
        sourceContact: form.get('sourceContact'),
      }),
    });
    const result = (await response.json()) as {
      incidentId?: string;
      error?: string;
    };
    setLoading(false);
    if (!response.ok || !result.incidentId) {
      setError(result.error ?? 'Không thể ghi nhận tin báo.');
      return;
    }
    router.push(`/incidents/${result.incidentId}`);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7"
    >
      <label className="block text-sm text-slate-200">
        Kênh tiếp nhận
        <select
          name="channel"
          defaultValue="in_person"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
        >
          <option value="in_person">Trực tiếp</option>
          <option value="telephone">Điện thoại</option>
          <option value="manual_other">Kênh khác</option>
        </select>
      </label>
      <label className="block text-sm text-slate-200">
        Thời điểm tiếp nhận
        <input
          name="receivedAt"
          type="datetime-local"
          defaultValue={new Date().toISOString().slice(0, 16)}
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
        />
      </label>
      <label className="block text-sm text-slate-200">
        Nội dung tin báo
        <textarea
          name="content"
          required
          rows={6}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-slate-200">
          Tên nguồn tin
          <input
            name="sourceName"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Liên hệ nguồn tin
          <input
            name="sourceContact"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
        </label>
      </div>
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        disabled={loading}
        className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 active:translate-y-px disabled:opacity-60"
        type="submit"
      >
        {loading ? 'Đang lưu…' : 'Tạo Incident'}
      </button>
    </form>
  );
}
