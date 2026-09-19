'use client';

import { useState } from 'react';

export function IncidentStatusActions({
  incidentId,
  status,
  pendingApprovals = [],
}: {
  incidentId: string;
  status: string;
  pendingApprovals?: Array<{ id: string; action: string }>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(
    pendingApprovals[0]?.id ?? null,
  );
  async function send(command: string, extra: Record<string, string> = {}) {
    const response = await fetch(`/api/incidents/${incidentId}/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command, ...extra }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      approval?: { id?: string };
      incident?: { approval?: { id?: string } };
      result?: { approval?: { id?: string } };
    };
    const requestedApproval =
      result.approval ?? result.incident?.approval ?? result.result?.approval;
    if (requestedApproval?.id) setApprovalId(requestedApproval.id);
    setMessage(
      response.ok
        ? requestedApproval
          ? 'Đã gửi yêu cầu Approval.'
          : 'Đã ghi nhận thao tác.'
        : 'Thao tác bị từ chối hoặc chưa hoàn tất.',
    );
    if (response.ok && command === 'approve') window.location.reload();
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
        {status === 'verifying' || status === 'transferred' ? (
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
            {status === 'verifying' ? (
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200"
                onClick={() =>
                  send('transfer', { organizationId: 'unit-cap-tren' })
                }
              >
                Chuyển cấp trên
              </button>
            ) : null}
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
        {approvalId ? (
          <>
            <button
              className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950"
              onClick={() => send('approve', { approvalId })}
            >
              Phê duyệt
            </button>
            <button
              className="rounded-lg border border-rose-400/60 px-3 py-2 text-sm text-rose-200"
              onClick={() =>
                send('reject', { approvalId, reason: 'Cần bổ sung thông tin.' })
              }
            >
              Từ chối
            </button>
          </>
        ) : null}
      </div>
      {message ? (
        <p className="mt-4 text-xs text-slate-400">{message}</p>
      ) : null}
    </section>
  );
}
