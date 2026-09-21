'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import {
  FeedbackMessage,
  useOnlineStatus,
} from '@/components/field/client-state';
import { EvidenceCapture } from '@/components/field/EvidenceCapture';
import { EvidenceList } from '@/components/field/EvidenceList';
import { submitOfflineCommand } from '@/components/field/offline-queue';

import { describeOfflineQueueStatus } from './vehicle-status-text';

export function VehicleObservationForm({ onSaved }: { onSaved?: () => void }) {
  const online = useOnlineStatus();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationMessage, setLocationMessage] = useState('Chưa lấy vị trí');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');
  const [observationId, setObservationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  function getLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('Thiết bị không cung cấp GPS.');
      return;
    }
    setLocationMessage('Đang lấy vị trí…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(String(coords.latitude));
        setLongitude(String(coords.longitude));
        setLocationMessage('Đã lấy vị trí từ thiết bị.');
      },
      () => setLocationMessage('Chưa lấy được vị trí. Nhập thủ công nếu cần.'),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const latitudeRaw = String(form.get('latitude') ?? '').trim();
    const longitudeRaw = String(form.get('longitude') ?? '').trim();
    const latitudeValue = Number(latitudeRaw);
    const longitudeValue = Number(longitudeRaw);
    if (
      !latitudeRaw ||
      !longitudeRaw ||
      !Number.isFinite(latitudeValue) ||
      !Number.isFinite(longitudeValue)
    ) {
      setTone('error');
      setMessage('Cần nhập cả vĩ độ và kinh độ hợp lệ.');
      return;
    }
    setLoading(true);
    setMessage(null);
    setObservationId(null);
    try {
      const item = await submitOfflineCommand({
        id: globalThis.crypto.randomUUID(),
        commandType: 'vehicle.record_observation',
        resourceType: 'VehicleObservation',
        occurredAt: new Date().toISOString(),
        payloadVersion: 1,
        payload: {
          plate: String(form.get('plate') ?? ''),
          observedAt: new Date().toISOString(),
          latitude: latitudeValue,
          longitude: longitudeValue,
          description: String(form.get('description') ?? ''),
        },
      });
      const result = item.response?.result as
        { matchId?: string | null; observationId?: string } | undefined;
      const accepted = item.status === 'synced' || item.status === 'pending';
      if (result?.observationId) setObservationId(result.observationId);
      if (accepted) onSaved?.();
      setTone(accepted ? 'success' : 'error');
      setMessage(
        item.status === 'synced'
          ? result?.matchId
            ? 'Đã ghi nhận. Có match cần xác nhận.'
            : 'Đã ghi nhận quan sát. Chưa hoàn tất: cần tải ảnh bằng chứng.'
          : item.status === 'pending' || item.status === 'syncing'
            ? describeOfflineQueueStatus(item.status)
            : (item.error ?? 'Không thể lưu quan sát.'),
      );
      if (accepted) {
        formElement.reset();
        setLatitude('');
        setLongitude('');
        setLocationMessage('Chưa lấy vị trí');
      }
    } catch {
      setTone('error');
      setMessage('Không thể lưu quan sát vào hàng đợi cục bộ.');
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
          Ghi nhận phương tiện
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Thao tác được gửi ngay khi có mạng hoặc giữ cục bộ trong hàng đợi
          offline.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: quan sát sẽ được lưu cục bộ và đồng bộ khi có mạng."
          tone="warning"
        />
      ) : null}
      <label className="block text-sm text-slate-200">
        Biển số
        <input
          name="plate"
          required
          autoCapitalize="characters"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-lg text-slate-100 uppercase outline-none focus:border-cyan-300"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-200">
          Vĩ độ
          <input
            name="latitude"
            required
            type="number"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Kinh độ
          <input
            name="longitude"
            required
            type="number"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={getLocation}
          className="min-h-[44px] rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300"
        >
          Lấy vị trí hiện tại
        </button>
        <span className="text-xs text-slate-500" role="status">
          {locationMessage}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500" role="status">
        GPS chỉ hỗ trợ điền nhanh; nếu không có GPS, luôn nhập tay được tọa độ.
      </p>
      <p
        className="rounded-lg border border-slate-800 px-3 py-2 text-xs leading-5 text-slate-500"
        role="status"
      >
        Quan sát chỉ được coi là hoàn tất sau khi ảnh bằng chứng được tải lên.
        Khi offline, quan sát chỉ ở trạng thái chờ đồng bộ.
      </p>
      <label className="block text-sm text-slate-200">
        Mô tả
        <textarea
          name="description"
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
        />
      </label>
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      {observationId ? (
        <>
          <Link
            href={`/field/vehicles/${observationId}`}
            className="block text-sm text-cyan-200 hover:text-white"
          >
            Mở chi tiết quan sát →
          </Link>
          <EvidenceCapture
            resourceType="VehicleObservation"
            resourceId={observationId}
            disabled={loading}
            onUploadStateChange={setEvidenceUploading}
            onUploaded={(evidence) =>
              setEvidenceIds((current) =>
                current.includes(evidence.id)
                  ? current
                  : [...current, evidence.id],
              )
            }
          />
          <EvidenceList evidenceIds={evidenceIds} label="Ảnh quan sát đã gắn" />
        </>
      ) : null}
      <button
        disabled={loading || evidenceUploading}
        type="submit"
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        {loading ? 'Đang lưu…' : 'Ghi nhận phương tiện'}
      </button>
    </form>
  );
}
