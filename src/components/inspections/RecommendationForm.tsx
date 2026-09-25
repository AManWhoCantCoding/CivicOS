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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const findingIds = form.getAll('findingIds').map(String);
    if (!findingIds.length) {
      setTone('error');
      setMessage('Chọn ít nhất một phát hiện.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/inspections/${inspectionId}/commands`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            command: 'submit_recommendation',
            findingIds,
            action: String(form.get('action') ?? ''),
            reason: String(form.get('reason') ?? ''),
          }),
        },
      );
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
      formElement.reset();
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
      className="civicos-surface space-y-5 rounded-xl p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-[var(--civicos-text)]">
          Gửi đề xuất xử lý
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
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
        <p className="civicos-feedback rounded-lg border-dashed px-3 py-4 text-sm text-[var(--civicos-text-muted)]">
          Chưa có phát hiện để làm căn cứ.
        </p>
      ) : (
        <fieldset disabled={disabled || loading}>
          <legend className="text-sm text-[var(--civicos-text)]">
            Phát hiện liên quan
          </legend>
          <div className="mt-3 space-y-2">
            {findings.map((finding) => (
              <label
                key={finding.id}
                className="flex gap-3 rounded-lg border border-[var(--civicos-border)] px-3 py-3 text-sm text-[var(--civicos-text-muted)]"
              >
                <input
                  type="checkbox"
                  name="findingIds"
                  value={finding.id}
                  className="mt-0.5 accent-[var(--civicos-accent)]"
                />
                <span>
                  <span className="block text-[var(--civicos-text)]">
                    {finding.checklistKey}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--civicos-text-muted)]">
                    {finding.description} · {finding.result}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="block text-sm text-[var(--civicos-text)]">
        Hành động đề xuất
        <input
          name="action"
          required
          disabled={disabled || loading || !findings.length}
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
        />
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Lý do
        <textarea
          name="reason"
          required
          rows={4}
          disabled={disabled || loading || !findings.length}
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)] disabled:opacity-60"
        />
      </label>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={disabled || loading || !online || !findings.length}
        className="civicos-control w-full border border-[var(--civicos-accent)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent)] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Đang gửi…' : 'Gửi đề xuất'}
      </button>
    </form>
  );
}
