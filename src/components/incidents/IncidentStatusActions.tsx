'use client';

import { useState } from 'react';

export function IncidentStatusActions({
  incidentId,
  status,
}: {
  incidentId: string;
  status: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  async function send(command: string, extra: Record<string, string> = {}) {
    const response = await fetch(`/api/incidents/${incidentId}/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command, ...extra }),
    });
    setMessage(
      response.ok
        ? 'Đã ghi nhận thao tác.'
        : 'Thao tác bị từ chối hoặc chưa hoàn tất.',
    );
  }
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-white">Thao tác</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {status === 'received' ? (
          <button
            className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"
            onClick={() =>
              send('classify', { category: 'other', severity: 'medium' })
            }
          >
            Phân loại
          </button>
        ) : null}
        {status === 'classified' ? (
          <button
            className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"
            onClick={() => send('verify')}
          >
            Bắt đầu xác minh
          </button>
        ) : null}
        {status === 'verifying' ? (
          <>
            <button
              className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"
              onClick={() =>
                send('resolve', {
                  resolution: 'Đã xử lý theo xác minh ban đầu.',
                })
              }
            >
              Đề xuất kết quả
            </button>
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200"
              onClick={() =>
                send('transfer', { organizationId: 'unit-cap-tren' })
              }
            >
              Chuyển cấp trên
            </button>
          </>
        ) : null}
        {status === 'resolved' ? (
          <button
            className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"
            onClick={() => send('close')}
          >
            Đóng Incident
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="mt-4 text-xs text-slate-400">{message}</p>
      ) : null}
    </section>
  );
}
