'use client';

import { FormEvent, useState } from 'react';

import { EvidenceCapture } from '@/components/field/EvidenceCapture';
import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import { describeVehicleCommandError } from './vehicle-status-text';

export function VehicleVerificationForm({
  observationId,
  status,
  onSaved,
}: {
  observationId: string;
  status: string;
  onSaved?: (result: {
    observation: Record<string, unknown>;
    verification: Record<string, unknown>;
  }) => void;
}) {
  const online = useOnlineStatus();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationMessage, setLocationMessage] = useState('Không bắt buộc');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evidenceCaptureKey, setEvidenceCaptureKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error' | 'warning'>('success');
  const enabled = status !== 'match_suggested' && status !== 'verified';

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
      () => setLocationMessage('Chưa lấy được vị trí; có thể nhập thủ công.'),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setTone('warning');
      setMessage(
        status === 'match_suggested'
          ? 'Cần xác nhận match trước khi xác minh.'
          : 'Quan sát đã xác minh.',
      );
      return;
    }
    if (!online) {
      setTone('warning');
      setMessage('Đang ngoại tuyến. Kết nối mạng để gửi xác minh.');
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const latitudeValue = String(form.get('latitude') ?? '').trim();
    const longitudeValue = String(form.get('longitude') ?? '').trim();
    if (Boolean(latitudeValue) !== Boolean(longitudeValue)) {
      setTone('error');
      setMessage('Nhập cả vĩ độ và kinh độ hoặc để trống cả hai.');
      return;
    }
    if (
      (latitudeValue || longitudeValue) &&
      (!Number.isFinite(Number(latitudeValue)) ||
        !Number.isFinite(Number(longitudeValue)))
    ) {
      setTone('error');
      setMessage('Vĩ độ và kinh độ phải là số hợp lệ.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/vehicles/observations/${observationId}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            command: 'verify',
            result: String(form.get('result') ?? ''),
            notes: String(form.get('notes') ?? ''),
            ownerLookup: String(form.get('ownerLookup') ?? '').trim()
              ? String(form.get('ownerLookup') ?? '').trim()
              : undefined,
            ...(latitudeValue && longitudeValue
              ? {
                  latitude: Number(latitudeValue),
                  longitude: Number(longitudeValue),
                }
              : {}),
            evidenceIds,
          }),
        },
      );
      if (!response.ok) {
        const error = await readResponseError(response, 'VERIFICATION_FAILED');
        setTone(
          response.status === 401 || response.status === 403
            ? 'warning'
            : 'error',
        );
        setMessage(describeVehicleCommandError(error, response.status));
        return;
      }
      const body = (await response.json()) as {
        result?: {
          observation?: Record<string, unknown>;
          verification?: Record<string, unknown>;
        };
      };
      if (!body.result?.observation || !body.result.verification) {
        setTone('error');
        setMessage('Máy chủ không trả về kết quả xác minh.');
        return;
      }
      setTone('success');
      setMessage('Đã ghi nhận xác minh.');
      onSaved?.(
        body.result as {
          observation: Record<string, unknown>;
          verification: Record<string, unknown>;
        },
      );
      formElement.reset();
      setLatitude('');
      setLongitude('');
      setEvidenceIds([]);
      setEvidenceCaptureKey((value) => value + 1);
    } catch {
      setTone('error');
      setMessage('Không thể kết nối để gửi xác minh.');
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
        <h2 className="text-sm font-semibold text-white">Xác minh quan sát</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Ghi kết quả, ghi chú, vị trí xác minh và bằng chứng nếu có.
        </p>
      </div>
      {!online ? (
        <FeedbackMessage
          message="Offline: xác minh cần mạng và chưa được gửi."
          tone="warning"
        />
      ) : null}
      {!enabled ? (
        <p className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-500">
          {status === 'match_suggested'
            ? 'Xác nhận match trước khi mở xác minh.'
            : 'Quan sát này đã xác minh.'}
        </p>
      ) : null}
      <label className="block text-sm text-slate-200">
        Kết quả xác minh
        <input
          name="result"
          required
          disabled={!enabled || loading}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
        />
      </label>
      <label className="block text-sm text-slate-200">
        Tra cứu chủ xe (không bắt buộc)
        <input
          name="ownerLookup"
          disabled={!enabled || loading}
          placeholder="Kết quả tra cứu chủ xe"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
        />
      </label>
      <label className="block text-sm text-slate-200">
        Ghi chú
        <textarea
          name="notes"
          required
          rows={4}
          disabled={!enabled || loading}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
        />
      </label>
      <div>
        <p className="text-sm text-slate-200">Vị trí xác minh</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Vĩ độ
            <input
              name="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              disabled={!enabled || loading}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Kinh độ
            <input
              name="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              disabled={!enabled || loading}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={getLocation}
            disabled={!enabled || loading}
            className="min-h-[44px] rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-300 disabled:opacity-50"
          >
            Lấy vị trí hiện tại
          </button>
          <span className="text-xs text-slate-500" role="status">
            {locationMessage}
          </span>
        </div>
      </div>
      <EvidenceCapture
        key={evidenceCaptureKey}
        resourceType="VehicleObservation"
        resourceId={observationId}
        disabled={!enabled || loading}
        onUploadStateChange={setUploading}
        onUploaded={(evidence) =>
          setEvidenceIds((current) =>
            current.includes(evidence.id) ? current : [...current, evidence.id],
          )
        }
      />
      {message ? <FeedbackMessage message={message} tone={tone} /> : null}
      <button
        type="submit"
        disabled={!enabled || loading || uploading || !online}
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang gửi…' : 'Lưu xác minh'}
      </button>
    </form>
  );
}
