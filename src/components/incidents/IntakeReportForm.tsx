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
          sourceChannel: form.get('sourceChannel'),
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
      if (typeof result.reportId !== 'string' || !result.reportId) {
        throw new Error('INVALID_API_RESPONSE');
      }
      setSuccess(
        'Đã ghi nhận tin báo. Hồ sơ chờ phân loại, chưa tạo Incident.',
      );
      router.push(`/intake/${result.reportId}`);
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
      className="space-y-6 rounded-2xl border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-5 sm:p-7"
    >
      <p className="rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] p-4 text-xs leading-5 text-[var(--civicos-text-muted)]">
        Biểu mẫu tiếp nhận thuộc trách nhiệm cán bộ trực ban. Tin mới chỉ tạo
        IntakeReport chờ phân loại; Incident chỉ tạo khi cán bộ xác nhận chuyển.
        Tài khoản khác gửi tin sẽ nhận trạng thái từ chối từ API.
      </p>
      <label className="block text-sm text-[var(--civicos-text)]">
        Kênh tiếp nhận
        <select
          name="sourceChannel"
          defaultValue="direct"
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
        >
          <option value="direct">Trực tiếp</option>
          <option value="phone">Điện thoại</option>
          <option value="app">Ứng dụng</option>
          <option value="district_transfer">Chuyển đơn vị</option>
        </select>
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Thời điểm tiếp nhận
        <input
          name="receivedAt"
          type="datetime-local"
          defaultValue={new Date().toISOString().slice(0, 16)}
          required
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
        />
      </label>
      <label className="block text-sm text-[var(--civicos-text)]">
        Nội dung tin báo
        <textarea
          name="content"
          required
          rows={6}
          className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
        />
      </label>
      <fieldset className="rounded-xl border border-[var(--civicos-border)] p-4">
        <legend className="px-1 text-sm text-[var(--civicos-text)]">
          Địa điểm / Location
        </legend>
        <p className="mb-4 text-xs leading-5 text-[var(--civicos-text-muted)]">
          Nhập cả vĩ độ và kinh độ nếu tin báo có vị trí xác định.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-[var(--civicos-text)]">
            Vĩ độ
            <input
              name="latitude"
              type="number"
              step="any"
              inputMode="decimal"
              className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
            />
          </label>
          <label className="block text-sm text-[var(--civicos-text)]">
            Kinh độ
            <input
              name="longitude"
              type="number"
              step="any"
              inputMode="decimal"
              className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
            />
          </label>
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-[var(--civicos-text)]">
          Tên nguồn tin
          <input
            name="sourceName"
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          />
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Liên hệ nguồn tin
          <input
            name="sourceContact"
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          />
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Mã tham chiếu nhạy cảm / Sensitive ref
          <input
            name="sensitiveRef"
            autoComplete="off"
            className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-focus)] focus:ring-2 focus:ring-[var(--civicos-focus)]"
          />
          <span className="mt-2 block text-xs leading-5 text-[var(--civicos-text-muted)]">
            Giá trị được bảo vệ ở tầng ứng dụng, không hiển thị trong danh sách.
          </span>
        </label>
      </div>
      {denied ? <AccessDenied /> : null}
      {error ? (
        <p className="text-sm text-[var(--civicos-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="text-sm text-[var(--civicos-success)]"
          role="status"
          aria-live="polite"
        >
          {success}
        </p>
      ) : null}
      <button
        disabled={loading}
        className="min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-5 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] transition hover:bg-[var(--civicos-accent-hover)] active:translate-y-px disabled:opacity-60"
        type="submit"
      >
        {loading ? 'Đang lưu…' : 'Ghi nhận tin báo'}
      </button>
    </form>
  );
}
