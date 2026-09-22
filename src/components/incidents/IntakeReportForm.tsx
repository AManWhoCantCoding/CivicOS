'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { AccessDenied } from '@/components/identity/AccessDenied';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readOptionalCoordinate(
  value: FormDataEntryValue | null,
): number | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const coordinate = Number(text);
  return Number.isFinite(coordinate) ? coordinate : Number.NaN;
}

export function IntakeReportForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDenied(false);
    setSuccess(null);
    try {
      const form = new FormData(event.currentTarget);
      const receivedAt = new Date(String(form.get('receivedAt')));
      if (Number.isNaN(receivedAt.getTime())) {
        throw new Error('INVALID_RECEIVED_AT');
      }
      const latitude = readOptionalCoordinate(form.get('latitude'));
      const longitude = readOptionalCoordinate(form.get('longitude'));
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('INVALID_LOCATION');
      }
      if ((latitude === null) !== (longitude === null)) {
        throw new Error('GEOPOINT_INCOMPLETE');
      }
      const response = await fetch('/api/intake-reports', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': globalThis.crypto.randomUUID(),
        },
        body: JSON.stringify({
          channel: form.get('channel'),
          receivedAt: receivedAt.toISOString(),
          content: form.get('content'),
          sourceName: form.get('sourceName'),
          sourceContact: form.get('sourceContact'),
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          sensitiveRef: form.get('sensitiveRef'),
        }),
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!isRecord(result)) throw new Error('INVALID_API_RESPONSE');
      if (!response.ok) {
        if (response.status === 403) setDenied(true);
        throw new Error(
          typeof result.error === 'string' ? result.error : 'INTAKE_FAILED',
        );
      }
      if (typeof result.incidentId !== 'string' || !result.incidentId) {
        throw new Error('INVALID_API_RESPONSE');
      }
      setSuccess('Đã ghi nhận tin báo. Đang mở hồ sơ Incident…');
      router.push(`/incidents/${result.incidentId}`);
    } catch (reason: unknown) {
      const code = reason instanceof Error ? reason.message : 'INTAKE_FAILED';
      const messages: Record<string, string> = {
        CONTENT_REQUIRED: 'Cần nhập nội dung tin báo.',
        GEOPOINT_INCOMPLETE: 'Cần nhập đủ vĩ độ và kinh độ.',
        INVALID_LOCATION: 'Vĩ độ và kinh độ phải là số hợp lệ.',
        INVALID_RECEIVED_AT: 'Thời điểm tiếp nhận không hợp lệ.',
        UNAUTHENTICATED: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.',
      };
      setError(messages[code] ?? 'Không thể ghi nhận tin báo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
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
      <fieldset className="rounded-xl border border-slate-800 p-4">
        <legend className="px-1 text-sm text-slate-200">
          Địa điểm / Location
        </legend>
        <p className="mb-4 text-xs leading-5 text-slate-500">
          Nhập cả vĩ độ và kinh độ nếu tin báo có vị trí xác định.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-slate-200">
            Vĩ độ
            <input
              name="latitude"
              type="number"
              step="any"
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Kinh độ
            <input
              name="longitude"
              type="number"
              step="any"
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            />
          </label>
        </div>
      </fieldset>
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
        <label className="block text-sm text-slate-200">
          Mã tham chiếu nhạy cảm / Sensitive ref
          <input
            name="sensitiveRef"
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
          <span className="mt-2 block text-xs leading-5 text-slate-500">
            Giá trị được bảo vệ ở tầng ứng dụng, không hiển thị trong danh sách.
          </span>
        </label>
      </div>
      {denied ? <AccessDenied /> : null}
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="text-sm text-emerald-300"
          role="status"
          aria-live="polite"
        >
          {success}
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
