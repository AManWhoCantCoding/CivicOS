'use client';

import { FormEvent, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

export type RegistryEntry = {
  id: string;
  plate: string;
  source: string;
  reason: string;
  status: string;
  validFrom: string;
  validUntil: string | null;
};

export const registryChangedEventName = 'civicos:registry-changed';

const statusChoices = ['active', 'inactive'];

function toLocalDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function RegistryForm({
  initial,
  onSaved,
}: {
  initial?: RegistryEntry;
  onSaved?: (entry: RegistryEntry) => void;
}) {
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để lưu registry.');
      return;
    }
    setLoading(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload: Record<string, unknown> = initial
      ? {
          entryId: initial.id,
          status: String(form.get('status') ?? ''),
          reason: String(form.get('reason') ?? ''),
        }
      : {
          plate: String(form.get('plate') ?? ''),
          source: String(form.get('source') ?? ''),
          reason: String(form.get('reason') ?? ''),
          validFrom: toIso(String(form.get('validFrom') ?? '')),
        };
    const validUntilValue = String(form.get('validUntil') ?? '').trim();
    if (validUntilValue) payload.validUntil = toIso(validUntilValue);
    if (!initial && !payload.validFrom) {
      setTone('error');
      setMessage('Thời điểm bắt đầu không hợp lệ.');
      setLoading(false);
      return;
    }
    if (validUntilValue && !payload.validUntil) {
      setTone('error');
      setMessage('Thời điểm hết hạn không hợp lệ.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/vehicles/registry', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await readResponseError(response, 'REGISTRY_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không được phép cập nhật registry: ${error}`
            : `Không thể cập nhật registry: ${error}`,
        );
        return;
      }
      const body = (await response.json()) as { entry?: RegistryEntry };
      if (!body.entry) {
        setTone('error');
        setMessage('Máy chủ không trả về registry đã lưu.');
        return;
      }
      setTone('success');
      setMessage(
        initial ? 'Đã cập nhật registry.' : 'Đã thêm biển số vào registry.',
      );
      if (!initial) formElement.reset();
      onSaved?.(body.entry);
      window.dispatchEvent(new Event(registryChangedEventName));
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để lưu registry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="civicos-surface space-y-5 rounded-xl p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-[var(--civicos-text)]">
          {initial ? 'Cập nhật registry' : 'Thêm vào registry'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
          Chỉ các trường mà API hỗ trợ sẽ được gửi khi cập nhật.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: registry vẫn hiển thị dữ liệu đã tải, nhưng không thể lưu thay đổi."
          tone="warning"
        />
      ) : null}
      {initial ? (
        <div className="min-w-0 rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-3 font-mono text-lg break-all text-[var(--civicos-text)]">
          {initial.plate}
        </div>
      ) : (
        <label className="block text-sm text-[var(--civicos-text)]">
          Biển số
          <input
            name="plate"
            required
            className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 font-mono text-lg uppercase text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          />
        </label>
      )}
      {!initial ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[var(--civicos-text)]">
            Nguồn
            <input
              name="source"
              required
              className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
            />
          </label>
          <label className="block text-sm text-[var(--civicos-text)]">
            Có hiệu lực từ
            <input
              name="validFrom"
              required
              type="datetime-local"
              className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
            />
          </label>
        </div>
      ) : (
        <label className="block text-sm text-[var(--civicos-text)]">
          Trạng thái
          <select
            name="status"
            defaultValue={initial.status}
            className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          >
            {Array.from(new Set([...statusChoices, initial.status])).map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>
      )}
      <label className="block text-sm text-[var(--civicos-text)]">
        Lý do
        <textarea
          name="reason"
          required
          defaultValue={initial?.reason}
          rows={4}
          className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
        />
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Hết hạn{' '}
        <span className="text-[var(--civicos-text-muted)]">(tuỳ chọn)</span>
        <input
          name="validUntil"
          type="datetime-local"
          defaultValue={toLocalDateTime(initial?.validUntil)}
          className="civicos-control mt-2 w-full border border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2.5 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
        />
      </label>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={loading || !online}
        className="min-h-[44px] w-full rounded-lg bg-[var(--civicos-accent)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Đang lưu…' : initial ? 'Lưu registry' : 'Thêm registry'}
      </button>
    </form>
  );
}
