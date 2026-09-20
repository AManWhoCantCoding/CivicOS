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
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-white">
          {initial ? 'Cập nhật registry' : 'Thêm vào registry'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
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
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-3 font-mono text-lg text-white">
          {initial.plate}
        </div>
      ) : (
        <label className="block text-sm text-slate-200">
          Biển số
          <input
            name="plate"
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-lg text-slate-100 uppercase outline-none focus:border-cyan-300"
          />
        </label>
      )}
      {!initial ? (
        <>
          <label className="block text-sm text-slate-200">
            Nguồn
            <input
              name="source"
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Có hiệu lực từ
            <input
              name="validFrom"
              required
              type="datetime-local"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
            />
          </label>
        </>
      ) : (
        <label className="block text-sm text-slate-200">
          Trạng thái
          <select
            name="status"
            defaultValue={initial.status}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
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
      <label className="block text-sm text-slate-200">
        Lý do
        <textarea
          name="reason"
          required
          defaultValue={initial?.reason}
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
        />
      </label>
      <label className="block text-sm text-slate-200">
        Hết hạn <span className="text-slate-500">(tuỳ chọn)</span>
        <input
          name="validUntil"
          type="datetime-local"
          defaultValue={toLocalDateTime(initial?.validUntil)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
        />
      </label>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={loading || !online}
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : initial ? 'Lưu registry' : 'Thêm registry'}
      </button>
    </form>
  );
}
