'use client';

import { FormEvent, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';
import {
  INSPECTION_CATEGORIES,
  SECURITY_VARIANTS,
} from '@/modules/inspections/checklist-catalog';

export type EstablishmentRecord = {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  type: string;
  licenseRef?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  risk?: string | null;
  status?: string | null;
};

export const establishmentChangedEventName = 'civicos:establishment-changed';

export function EstablishmentForm({
  initial,
  onSaved,
}: {
  initial?: EstablishmentRecord;
  onSaved?: (establishment: EstablishmentRecord) => void;
}) {
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để lưu cơ sở.');
      return;
    }
    setLoading(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const latitudeValue = String(form.get('latitude') ?? '').trim();
    const longitudeValue = String(form.get('longitude') ?? '').trim();
    const payload: Record<string, unknown> = {
      name: String(form.get('name') ?? ''),
      ownerName: String(form.get('ownerName') ?? ''),
      address: String(form.get('address') ?? ''),
      type: String(form.get('type') ?? ''),
      risk: String(form.get('risk') ?? 'medium'),
      status: String(form.get('status') ?? 'active'),
      licenseRef: initial
        ? String(form.get('licenseRef') ?? '').trim()
        : String(form.get('licenseRef') ?? '').trim() || undefined,
    };
    if (!String(payload.type).trim()) {
      setTone('error');
      setMessage('Chọn loại hình cơ sở trước khi lưu.');
      setLoading(false);
      return;
    }
    if (latitudeValue || longitudeValue) {
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setTone('error');
        setMessage('Nhập cả vĩ độ và kinh độ hợp lệ hoặc để trống cả hai.');
        setLoading(false);
        return;
      }
      payload.latitude = latitude;
      payload.longitude = longitude;
    }

    try {
      const response = await fetch(
        initial ? `/api/establishments/${initial.id}` : '/api/establishments',
        {
          method: initial ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const error = await readResponseError(response, 'ESTABLISHMENT_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(
          response.status === 401 || response.status === 403
            ? `Không được phép lưu cơ sở: ${error}`
            : `Không thể lưu cơ sở: ${error}`,
        );
        return;
      }
      const body = (await response.json()) as {
        establishment?: EstablishmentRecord;
      };
      if (!body.establishment) {
        setTone('error');
        setMessage('Máy chủ không trả về cơ sở đã lưu.');
        return;
      }
      setTone('success');
      setMessage(initial ? 'Đã cập nhật cơ sở.' : 'Đã tạo cơ sở.');
      if (!initial) formElement.reset();
      onSaved?.(body.establishment);
      window.dispatchEvent(new Event(establishmentChangedEventName));
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để lưu cơ sở.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="civicos-surface space-y-5 rounded-2xl p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-[var(--civicos-text)]">
          {initial ? 'Chỉnh sửa cơ sở' : 'Thêm cơ sở kinh doanh'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--civicos-text-muted)]">
          Thông tin này là nguồn cho checklist và lịch kiểm tra.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: biểu mẫu vẫn có thể xem và nhập, nhưng cần mạng để lưu."
          tone="warning"
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-[var(--civicos-text)]">
          Tên cơ sở
          <input
            id="establishment-name"
            name="name"
            required
            defaultValue={initial?.name}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          />
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Chủ cơ sở
          <input
            id="establishment-owner"
            name="ownerName"
            required
            defaultValue={initial?.ownerName}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          />
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Risk
          <select
            name="risk"
            defaultValue={initial?.risk ?? 'medium'}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          >
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>
        </label>
        {initial ? (
          <label className="block text-sm text-[var(--civicos-text)]">
            Trạng thái
            <select
              name="status"
              defaultValue={initial.status ?? 'active'}
              className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
            >
              <option value="active">Đang hoạt động</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </label>
        ) : null}
      </div>
      <label className="block text-sm text-[var(--civicos-text)]">
        Địa chỉ
        <input
          id="establishment-address"
          name="address"
          required
          defaultValue={initial?.address}
          className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-[var(--civicos-text)]">
          Loại hình
          <select
            id="establishment-type"
            name="type"
            required
            defaultValue={initial?.type ?? ''}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          >
            <option value="" disabled>
              Chọn loại hình cơ sở
            </option>
            {initial &&
            !INSPECTION_CATEGORIES.some(
              ({ label }) =>
                initial.type === label || initial.type.startsWith(`${label} —`),
            ) &&
            !SECURITY_VARIANTS.some(({ value }) => value === initial.type) ? (
              <option value={initial.type}>
                Lưu loại hình hiện có: {initial.type}
              </option>
            ) : null}
            {INSPECTION_CATEGORIES.map((category) =>
              category.id === 'security' && !initial ? null : (
                <option key={category.id} value={category.label}>
                  {category.label}
                </option>
              ),
            )}
            {SECURITY_VARIANTS.map((variant) => (
              <option key={variant.value} value={variant.value}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[var(--civicos-text)]">
          Mã giấy phép{' '}
          <span className="text-[var(--civicos-text-muted)]">(tuỳ chọn)</span>
          <input
            id="establishment-license"
            name="licenseRef"
            defaultValue={initial?.licenseRef ?? ''}
            className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
          />
        </label>
      </div>
      <p className="text-sm text-[var(--civicos-text-muted)]">
        LOCAL/DEMO: chỉ nhập dữ liệu giả lập. Checklist là bản nháp một phần,
        không đầy đủ; không phải checklist chính thức hay đánh giá tuân thủ pháp
        luật.
      </p>
      <div>
        <p className="text-sm text-[var(--civicos-text)]">
          Tọa độ{' '}
          <span className="text-[var(--civicos-text-muted)]">
            (cần nhập cả hai hoặc để trống)
          </span>
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[var(--civicos-text-muted)]">
            Vĩ độ
            <input
              name="latitude"
              type="number"
              step="any"
              defaultValue={initial?.latitude ?? ''}
              className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
            />
          </label>
          <label className="block text-xs text-[var(--civicos-text-muted)]">
            Kinh độ
            <input
              name="longitude"
              type="number"
              step="any"
              defaultValue={initial?.longitude ?? ''}
              className="civicos-control mt-2 w-full border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-3 text-[var(--civicos-text)] outline-none focus:border-[var(--civicos-accent)]"
            />
          </label>
        </div>
      </div>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={loading || !online}
        className="civicos-control w-full bg-[var(--civicos-accent)] px-4 py-3 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Tạo cơ sở'}
      </button>
    </form>
  );
}
