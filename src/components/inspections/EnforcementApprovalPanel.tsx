'use client';

import { useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

export function EnforcementApprovalPanel({
  inspectionId,
  recommendations,
  onChanged,
}: {
  inspectionId: string;
  recommendations: Array<{
    id: string;
    action: string;
    reason?: string;
    status: string;
  }>;
  onChanged?: () => void;
}) {
  const online = useOnlineStatus();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  async function decide(
    recommendationId: string,
    command: 'approve' | 'reject',
  ) {
    const reason = rejectReasons[recommendationId]?.trim() ?? '';
    if (command === 'reject' && !reason) {
      setTone('error');
      setMessage('Cần ghi lý do khi từ chối đề xuất.');
      return;
    }
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để phê duyệt.');
      return;
    }
    setLoadingId(recommendationId);
    setMessage(null);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          command,
          recommendationId,
          ...(command === 'reject' ? { reason } : {}),
        }),
      });
      if (!response.ok) {
        const error = await readResponseError(response, 'APPROVAL_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không có quyền phê duyệt: ${error}`
            : `Không thể cập nhật đề xuất: ${error}`,
        );
        return;
      }
      setTone('success');
      setMessage(
        command === 'approve' ? 'Đã duyệt đề xuất.' : 'Đã từ chối đề xuất.',
      );
      onChanged?.();
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để cập nhật đề xuất.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Phê duyệt đề xuất</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Duyệt hoặc từ chối với lý do rõ ràng. Quyền phê duyệt được máy chủ
          kiểm tra.
        </p>
      </div>
      {!online ? (
        <div className="mt-4">
          <FeedbackMessage
            message="Offline: quyết định phê duyệt chưa được gửi."
            tone="warning"
          />
        </div>
      ) : null}
      {recommendations.length ? (
        <div className="mt-4 space-y-3">
          {recommendations.map((recommendation) => {
            const actionable =
              recommendation.status === 'pending_approval' ||
              recommendation.status === 'pending';
            return (
              <div
                key={recommendation.id}
                className="rounded-lg border border-slate-800 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200">
                      {recommendation.action}
                    </p>
                    {recommendation.reason ? (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {recommendation.reason}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {recommendation.status}
                  </span>
                </div>
                {actionable ? (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs text-slate-400">
                      Lý do từ chối
                      <textarea
                        rows={2}
                        value={rejectReasons[recommendation.id] ?? ''}
                        onChange={(event) =>
                          setRejectReasons((current) => ({
                            ...current,
                            [recommendation.id]: event.target.value,
                          }))
                        }
                        disabled={loadingId === recommendation.id}
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void decide(recommendation.id, 'approve')
                        }
                        disabled={loadingId === recommendation.id || !online}
                        className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200 disabled:opacity-50"
                      >
                        {loadingId === recommendation.id
                          ? 'Đang xử lý…'
                          : 'Duyệt'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void decide(recommendation.id, 'reject')}
                        disabled={loadingId === recommendation.id || !online}
                        className="rounded-lg border border-rose-300/60 px-3 py-2 text-xs text-rose-200 hover:border-rose-200 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Chưa có đề xuất.</p>
      )}
      {message ? (
        <div className="mt-4">
          <FeedbackMessage message={message} tone={tone} />
        </div>
      ) : null}
    </section>
  );
}
