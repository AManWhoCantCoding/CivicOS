'use client';

import { FormEvent, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

export type EstablishmentRecord = {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  type: string;
  licenseRef?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
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
    const form = new FormData(event.currentTarget);
    const latitudeValue = String(form.get('latitude') ?? '').trim();
    const longitudeValue = String(form.get('longitude') ?? '').trim();
    const payload: Record<string, unknown> = {
      name: String(form.get('name') ?? ''),
      ownerName: String(form.get('ownerName') ?? ''),
      address: String(form.get('address') ?? ''),
      type: String(form.get('type') ?? ''),
      licenseRef: initial
        ? String(form.get('licenseRef') ?? '').trim()
        : String(form.get('licenseRef') ?? '').trim() || undefined,
    };
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
      if (!initial) event.currentTarget.reset();
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
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-white">
          {initial ? 'Chỉnh sửa cơ sở' : 'Thêm cơ sở kinh doanh'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
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
        <label className="block text-sm text-slate-200">
          Tên cơ sở
          <input
            id="establishment-name"
            name="name"
            required
            defaultValue={initial?.name}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Chủ cơ sở
          <input
            id="establishment-owner"
            name="ownerName"
            required
            defaultValue={initial?.ownerName}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
      </div>
      <label className="block text-sm text-slate-200">
        Địa chỉ
        <input
          id="establishment-address"
          name="address"
          required
          defaultValue={initial?.address}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-200">
          Loại hình
          <input
            id="establishment-type"
            name="type"
            required
            defaultValue={initial?.type}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Mã giấy phép <span className="text-slate-500">(tuỳ chọn)</span>
          <input
            id="establishment-license"
            name="licenseRef"
            defaultValue={initial?.licenseRef ?? ''}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
      </div>
      <div>
        <p className="text-sm text-slate-200">
          Tọa độ{' '}
          <span className="text-slate-500">
            (cần nhập cả hai hoặc để trống)
          </span>
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Vĩ độ
            <input
              name="latitude"
              type="number"
              step="any"
              defaultValue={initial?.latitude ?? ''}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Kinh độ
            <input
              name="longitude"
              type="number"
              step="any"
              defaultValue={initial?.longitude ?? ''}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
            />
          </label>
        </div>
      </div>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={loading || !online}
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Tạo cơ sở'}
      </button>
    </form>
  );
}
