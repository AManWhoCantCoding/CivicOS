'use client';

import { FormEvent, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

type Finding = {
  id: string;
  checklistKey: string;
  description: string;
  result: string;
};

export function RecommendationForm({
  inspectionId,
  findings,
  disabled = false,
  onSaved,
}: {
  inspectionId: string;
  findings: Finding[];
  disabled?: boolean;
  onSaved?: () => void;
}) {
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      setTone('warning');
      setMessage('Inspection hiện không cho phép gửi đề xuất.');
      return;
    }
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để gửi đề xuất.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const findingIds = form.getAll('findingIds').map(String);
    if (!findingIds.length) {
      setTone('error');
      setMessage('Chọn ít nhất một phát hiện.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          command: 'recommend',
          findingIds,
          action: String(form.get('action') ?? ''),
          reason: String(form.get('reason') ?? ''),
        }),
      });
      if (!response.ok) {
        const error = await readResponseError(
          response,
          'RECOMMENDATION_FAILED',
        );
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không được phép gửi đề xuất: ${error}`
            : `Không thể gửi đề xuất: ${error}`,
        );
        return;
      }
      setTone('success');
      setMessage('Đã gửi đề xuất, chờ phê duyệt.');
      event.currentTarget.reset();
      onSaved?.();
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để gửi đề xuất.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">Gửi đề xuất xử lý</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Chọn các phát hiện làm căn cứ, sau đó ghi hành động và lý do.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: đề xuất không được gửi cho đến khi có mạng."
          tone="warning"
        />
      ) : null}
      {!findings.length ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-500">
          Chưa có phát hiện để làm căn cứ.
        </p>
      ) : (
        <fieldset disabled={disabled || loading}>
          <legend className="text-sm text-slate-200">
            Phát hiện liên quan
          </legend>
          <div className="mt-3 space-y-2">
            {findings.map((finding) => (
              <label
                key={finding.id}
                className="flex gap-3 rounded-lg border border-slate-800 px-3 py-3 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  name="findingIds"
                  value={finding.id}
                  className="mt-0.5 accent-cyan-300"
                />
                <span>
                  <span className="block text-slate-200">
                    {finding.checklistKey}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {finding.description} · {finding.result}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="block text-sm text-slate-200">
        Hành động đề xuất
        <input
          name="action"
          required
          disabled={disabled || loading || !findings.length}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
        />
      </label>
      <label className="block text-sm text-slate-200">
        Lý do
        <textarea
          name="reason"
          required
          rows={4}
          disabled={disabled || loading || !findings.length}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
        />
      </label>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={disabled || loading || !online || !findings.length}
        className="w-full rounded-lg border border-cyan-300/60 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Đang gửi…' : 'Gửi đề xuất'}
      </button>
    </form>
  );
}
